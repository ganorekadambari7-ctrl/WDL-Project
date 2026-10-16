"""
Salary Pro — Phase 3: Employee Learning & Certification Tracking Tests
Targeting isolated test server on PORT 5001 using `salary-pro-test` DB.
"""

import pytest
import requests
from tests.conftest import TEST_BASE_URL
from tests.test_blackbox import _unique_user


@pytest.fixture
def test_setup():
    """Create admin, two employees, and link them."""
    # 1. Admin
    admin_payload = _unique_user(role="admin")
    admin_reg = requests.post(f"{TEST_BASE_URL}/api/auth/register", json=admin_payload)
    admin_token = admin_reg.json()["token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # 2. Employee 1
    emp1_payload = _unique_user(role="employee")
    emp1_reg = requests.post(f"{TEST_BASE_URL}/api/auth/register", json=emp1_payload)
    emp1_token = emp1_reg.json()["token"]
    emp1_user = emp1_reg.json()["user"]
    emp1_headers = {"Authorization": f"Bearer {emp1_token}"}

    emp1_doc = {
        "name": emp1_payload["name"],
        "employeeId": f"EMP{str(emp1_user['id'])[-4:].upper()}",
        "dob": "1995-05-15",
        "education": "B.Tech CSE",
        "experience": 3,
        "basicSalary": 60000,
        "designation": "Software Engineer",
        "grade": "L2",
    }
    created_emp1 = requests.post(f"{TEST_BASE_URL}/api/employees", json=emp1_doc, headers=admin_headers).json()
    requests.put(
        f"{TEST_BASE_URL}/api/settings/users/{emp1_user['id']}/link-employee",
        json={"employeeId": created_emp1["employeeId"]},
        headers=admin_headers,
    )

    # 3. Employee 2
    emp2_payload = _unique_user(role="employee")
    emp2_reg = requests.post(f"{TEST_BASE_URL}/api/auth/register", json=emp2_payload)
    emp2_token = emp2_reg.json()["token"]
    emp2_user = emp2_reg.json()["user"]
    emp2_headers = {"Authorization": f"Bearer {emp2_token}"}

    emp2_doc = {
        "name": emp2_payload["name"],
        "employeeId": f"EMP{str(emp2_user['id'])[-4:].upper()}",
        "dob": "1994-08-20",
        "education": "M.Tech",
        "experience": 5,
        "basicSalary": 85000,
        "designation": "Senior Engineer",
        "grade": "L3",
    }
    created_emp2 = requests.post(f"{TEST_BASE_URL}/api/employees", json=emp2_doc, headers=admin_headers).json()
    requests.put(
        f"{TEST_BASE_URL}/api/settings/users/{emp2_user['id']}/link-employee",
        json={"employeeId": created_emp2["employeeId"]},
        headers=admin_headers,
    )

    return {
        "admin": {"headers": admin_headers, "user": admin_reg.json()["user"]},
        "emp1": {"headers": emp1_headers, "user": emp1_user, "emp": created_emp1},
        "emp2": {"headers": emp2_headers, "user": emp2_user, "emp": created_emp2},
    }


def test_employee_create_and_update_course(test_setup):
    """Employee can create a course, update progress, and auto-complete at 100%."""
    emp1 = test_setup["emp1"]

    course_data = {
        "title": "Full-Stack React & Node Masterclass",
        "platform": "Coursera",
        "courseUrl": "https://coursera.org/learn/fullstack",
        "startDate": "2026-01-10",
        "endDate": "2026-03-30",
        "progress": 35,
        "status": "in-progress",
    }

    create_res = requests.post(
        f"{TEST_BASE_URL}/api/courses",
        json=course_data,
        headers=emp1["headers"],
    )
    assert create_res.status_code == 201, f"Expected 201, got {create_res.status_code}: {create_res.text}"
    created = create_res.json()
    assert created["title"] == course_data["title"]
    assert created["progress"] == 35
    assert created["status"] == "in-progress"
    assert created["verificationStatus"] == "not_submitted"
    assert created["employeeId"] == emp1["emp"]["employeeId"]

    course_id = created["_id"]

    # Update progress to 100%
    update_res = requests.put(
        f"{TEST_BASE_URL}/api/courses/{course_id}",
        json={"progress": 100},
        headers=emp1["headers"],
    )
    assert update_res.status_code == 200
    updated = update_res.json()
    assert updated["progress"] == 100
    assert updated["status"] == "completed"


def test_certificate_submission_and_admin_verification(test_setup):
    """Employee submits certificate, admin verifies it; non-admin cannot verify."""
    emp1 = test_setup["emp1"]
    admin = test_setup["admin"]

    # 1. Create completed course with certificate
    course_data = {
        "title": "AWS Certified Solutions Architect",
        "platform": "AWS Training",
        "progress": 100,
        "status": "completed",
        "certificateUrl": "https://aws.amazon.com/verification/AWS-CERT-9988",
        "certificateType": "url",
    }
    create_res = requests.post(
        f"{TEST_BASE_URL}/api/courses",
        json=course_data,
        headers=emp1["headers"],
    )
    assert create_res.status_code == 201
    course = create_res.json()
    course_id = course["_id"]
    assert course["verificationStatus"] == "pending_review"

    # 2. Employee cannot verify their own certificate (403)
    unauth_verify = requests.put(
        f"{TEST_BASE_URL}/api/courses/{course_id}/verify",
        json={"verificationStatus": "verified", "verificationRemarks": "Self verify"},
        headers=emp1["headers"],
    )
    assert unauth_verify.status_code == 403

    # 3. Admin verifies certificate
    admin_verify = requests.put(
        f"{TEST_BASE_URL}/api/courses/{course_id}/verify",
        json={"verificationStatus": "verified", "verificationRemarks": "Verified on AWS credential portal"},
        headers=admin["headers"],
    )
    assert admin_verify.status_code == 200
    verified_data = admin_verify.json()["course"]
    assert verified_data["verificationStatus"] == "verified"
    assert verified_data["verificationRemarks"] == "Verified on AWS credential portal"
    assert "verifiedBy" in verified_data


def test_certificate_rejection_with_remarks(test_setup):
    """Admin can reject a certificate with mandatory remarks."""
    emp2 = test_setup["emp2"]
    admin = test_setup["admin"]

    course_data = {
        "title": "Deep Learning Specialization",
        "platform": "Coursera",
        "progress": 100,
        "status": "completed",
        "certificateUrl": "https://coursera.org/invalid-link-404",
    }
    create_res = requests.post(
        f"{TEST_BASE_URL}/api/courses",
        json=course_data,
        headers=emp2["headers"],
    )
    course_id = create_res.json()["_id"]

    reject_res = requests.put(
        f"{TEST_BASE_URL}/api/courses/{course_id}/verify",
        json={"verificationStatus": "rejected", "verificationRemarks": "Link returned 404, please re-upload valid PDF"},
        headers=admin["headers"],
    )
    assert reject_res.status_code == 200
    rejected_course = reject_res.json()["course"]
    assert rejected_course["verificationStatus"] == "rejected"
    assert "Link returned 404" in rejected_course["verificationRemarks"]


def test_strict_isolation_between_employees(test_setup):
    """Employees can only access and modify their own learning records."""
    emp1 = test_setup["emp1"]
    emp2 = test_setup["emp2"]

    # Emp 1 creates course
    c1 = requests.post(
        f"{TEST_BASE_URL}/api/courses",
        json={"title": "Private Course for Emp 1", "platform": "Udemy"},
        headers=emp1["headers"],
    ).json()

    # Emp 2 creates course
    c2 = requests.post(
        f"{TEST_BASE_URL}/api/courses",
        json={"title": "Private Course for Emp 2", "platform": "LinkedIn Learning"},
        headers=emp2["headers"],
    ).json()

    # Emp 1 GET /api/courses should only see c1
    emp1_list = requests.get(f"{TEST_BASE_URL}/api/courses", headers=emp1["headers"]).json()
    emp1_ids = [x["_id"] for x in emp1_list]
    assert c1["_id"] in emp1_ids
    assert c2["_id"] not in emp1_ids

    # Emp 2 cannot GET Emp 1's course by ID
    c1_by_emp2 = requests.get(f"{TEST_BASE_URL}/api/courses/{c1['_id']}", headers=emp2["headers"])
    assert c1_by_emp2.status_code == 403

    # Emp 2 cannot PUT Emp 1's course
    c1_put_by_emp2 = requests.put(
        f"{TEST_BASE_URL}/api/courses/{c1['_id']}",
        json={"progress": 99},
        headers=emp2["headers"],
    )
    assert c1_put_by_emp2.status_code == 403

    # Emp 2 cannot DELETE Emp 1's course
    c1_del_by_emp2 = requests.delete(f"{TEST_BASE_URL}/api/courses/{c1['_id']}", headers=emp2["headers"])
    assert c1_del_by_emp2.status_code == 403


def test_admin_filters_and_course_deletion(test_setup):
    """Admin can view all courses, filter by employee or verification status, and delete records."""
    emp1 = test_setup["emp1"]
    admin = test_setup["admin"]

    # 1. Emp 1 creates course with file-based certificate
    c = requests.post(
        f"{TEST_BASE_URL}/api/courses",
        json={
            "title": "Machine Learning Specialization",
            "platform": "Coursera",
            "progress": 100,
            "status": "completed",
            "certificateUrl": "data:application/pdf;base64,JVBERi0xLjQKJ...",
            "certificateFileName": "ml_certificate.pdf",
            "certificateType": "file",
        },
        headers=emp1["headers"],
    ).json()

    # 2. Admin filters by verificationStatus = pending_review
    pending_list = requests.get(
        f"{TEST_BASE_URL}/api/courses?verificationStatus=pending_review",
        headers=admin["headers"],
    ).json()
    assert any(x["_id"] == c["_id"] for x in pending_list)

    # 3. Admin filters by employeeId
    emp_list = requests.get(
        f"{TEST_BASE_URL}/api/courses?employeeId={emp1['emp']['employeeId']}",
        headers=admin["headers"],
    ).json()
    assert all(x["employeeId"] == emp1["emp"]["employeeId"] for x in emp_list)

    # 4. Admin deletes course
    del_res = requests.delete(f"{TEST_BASE_URL}/api/courses/{c['_id']}", headers=admin["headers"])
    assert del_res.status_code == 200

    # 5. Course no longer exists
    get_res = requests.get(f"{TEST_BASE_URL}/api/courses/{c['_id']}", headers=admin["headers"])
    assert get_res.status_code == 404
