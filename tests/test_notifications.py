"""
Salary Pro — Phase 4: In-App Notifications Tests
Targeting isolated test server on PORT 5001 using `salary-pro-test` DB.
"""

import pytest
import requests
from tests.conftest import TEST_BASE_URL
from tests.test_blackbox import _unique_user


@pytest.fixture
def notif_setup():
    """Create admin and linked employee."""
    # Admin
    admin_payload = _unique_user(role="admin")
    admin_reg = requests.post(f"{TEST_BASE_URL}/api/auth/register", json=admin_payload).json()
    admin_token = admin_reg["token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    admin_user = admin_reg["user"]

    # Employee 1
    emp1_payload = _unique_user(role="employee")
    emp1_reg = requests.post(f"{TEST_BASE_URL}/api/auth/register", json=emp1_payload).json()
    emp1_token = emp1_reg["token"]
    emp1_user = emp1_reg["user"]
    emp1_headers = {"Authorization": f"Bearer {emp1_token}"}

    emp1_doc = {
        "name": emp1_payload["name"],
        "employeeId": f"EMP{str(emp1_user['id'])[-4:].upper()}",
        "dob": "1996-03-12",
        "education": "B.Sc IT",
        "experience": 2,
        "basicSalary": 50000,
        "designation": "Associate Engineer",
        "grade": "L1",
    }
    created_emp1 = requests.post(f"{TEST_BASE_URL}/api/employees", json=emp1_doc, headers=admin_headers).json()
    requests.put(
        f"{TEST_BASE_URL}/api/settings/users/{emp1_user['id']}/link-employee",
        json={"employeeId": created_emp1["employeeId"]},
        headers=admin_headers,
    )

    # Employee 2
    emp2_payload = _unique_user(role="employee")
    emp2_reg = requests.post(f"{TEST_BASE_URL}/api/auth/register", json=emp2_payload).json()
    emp2_token = emp2_reg["token"]
    emp2_user = emp2_reg["user"]
    emp2_headers = {"Authorization": f"Bearer {emp2_token}"}

    emp2_doc = {
        "name": emp2_payload["name"],
        "employeeId": f"EMP{str(emp2_user['id'])[-4:].upper()}",
        "dob": "1993-07-25",
        "education": "MCA",
        "experience": 4,
        "basicSalary": 75000,
        "designation": "Software Engineer",
        "grade": "L2",
    }
    created_emp2 = requests.post(f"{TEST_BASE_URL}/api/employees", json=emp2_doc, headers=admin_headers).json()
    requests.put(
        f"{TEST_BASE_URL}/api/settings/users/{emp2_user['id']}/link-employee",
        json={"employeeId": created_emp2["employeeId"]},
        headers=admin_headers,
    )

    return {
        "admin": {"headers": admin_headers, "user": admin_user},
        "emp1": {"headers": emp1_headers, "user": emp1_user, "emp": created_emp1},
        "emp2": {"headers": emp2_headers, "user": emp2_user, "emp": created_emp2},
    }


def test_course_submission_triggers_admin_notification(notif_setup):
    """When an employee submits a new course, all Admins receive a course_submitted notification."""
    emp1 = notif_setup["emp1"]
    admin = notif_setup["admin"]

    # 1. Emp 1 submits course
    course_res = requests.post(
        f"{TEST_BASE_URL}/api/courses",
        json={
            "title": "Cloud Computing Fundamentals",
            "platform": "edX",
            "progress": 20,
            "status": "in-progress",
        },
        headers=emp1["headers"],
    )
    assert course_res.status_code == 201

    # 2. Admin checks notifications
    admin_notifs = requests.get(f"{TEST_BASE_URL}/api/notifications", headers=admin["headers"]).json()
    assert admin_notifs["unreadCount"] >= 1
    found = any(
        n["type"] == "course_submitted" and "Cloud Computing Fundamentals" in n["message"]
        for n in admin_notifs["notifications"]
    )
    assert found, "Admin should receive notification for newly submitted course"


def test_certificate_submission_and_verification_notifications(notif_setup):
    """Certificate submission notifies Admin; Admin verification notifies Employee."""
    emp1 = notif_setup["emp1"]
    admin = notif_setup["admin"]

    # 1. Emp 1 creates course with certificate
    course_res = requests.post(
        f"{TEST_BASE_URL}/api/courses",
        json={
            "title": "Python for Data Science",
            "platform": "Coursera",
            "progress": 100,
            "status": "completed",
            "certificateUrl": "https://coursera.org/verify/PY-1234",
            "certificateType": "url",
        },
        headers=emp1["headers"],
    )
    assert course_res.status_code == 201
    course_id = course_res.json()["_id"]

    # 2. Admin should receive certificate_submitted notification
    admin_notifs = requests.get(f"{TEST_BASE_URL}/api/notifications", headers=admin["headers"]).json()
    cert_submitted = any(
        n["type"] == "certificate_submitted" and "Python for Data Science" in n["message"]
        for n in admin_notifs["notifications"]
    )
    assert cert_submitted, "Admin should receive certificate_submitted notification"

    # 3. Admin verifies certificate
    verify_res = requests.put(
        f"{TEST_BASE_URL}/api/courses/{course_id}/verify",
        json={"verificationStatus": "verified", "verificationRemarks": "Verified official signature"},
        headers=admin["headers"],
    )
    assert verify_res.status_code == 200

    # 4. Employee 1 receives certificate_verified notification
    emp1_notifs = requests.get(f"{TEST_BASE_URL}/api/notifications", headers=emp1["headers"]).json()
    assert emp1_notifs["unreadCount"] >= 1
    verified_notif = next(
        (n for n in emp1_notifs["notifications"] if n["type"] == "certificate_verified"),
        None,
    )
    assert verified_notif is not None, "Employee should receive certificate_verified notification"
    assert "Verified official signature" in verified_notif["message"]


def test_certificate_rejection_notification(notif_setup):
    """When Admin rejects certificate, the Employee receives certificate_rejected with remarks."""
    emp2 = notif_setup["emp2"]
    admin = notif_setup["admin"]

    # 1. Emp 2 submits course with invalid certificate
    course_res = requests.post(
        f"{TEST_BASE_URL}/api/courses",
        json={
            "title": "Docker & Kubernetes DevOps",
            "platform": "Udemy",
            "progress": 100,
            "certificateUrl": "https://invalid-cert-link.com",
        },
        headers=emp2["headers"],
    )
    assert course_res.status_code == 201
    course_id = course_res.json()["_id"]

    # 2. Admin rejects with remarks
    reject_res = requests.put(
        f"{TEST_BASE_URL}/api/courses/{course_id}/verify",
        json={"verificationStatus": "rejected", "verificationRemarks": "Link returned certificate expired"},
        headers=admin["headers"],
    )
    assert reject_res.status_code == 200

    # 3. Employee 2 receives certificate_rejected notification
    emp2_notifs = requests.get(f"{TEST_BASE_URL}/api/notifications", headers=emp2["headers"]).json()
    rejected_notif = next(
        (n for n in emp2_notifs["notifications"] if n["type"] == "certificate_rejected"),
        None,
    )
    assert rejected_notif is not None
    assert "Link returned certificate expired" in rejected_notif["message"]


def test_notification_read_unread_and_mark_all(notif_setup):
    """User can mark individual notifications as read or mark all as read."""
    emp1 = notif_setup["emp1"]
    admin = notif_setup["admin"]

    # 1. Emp 1 creates course, Admin verifies it to generate notifications
    c = requests.post(
        f"{TEST_BASE_URL}/api/courses",
        json={"title": "Golang Microservices", "platform": "Coursera", "progress": 100, "certificateUrl": "https://coursera.org/cert1"},
        headers=emp1["headers"],
    ).json()

    requests.put(
        f"{TEST_BASE_URL}/api/courses/{c['_id']}/verify",
        json={"verificationStatus": "verified", "verificationRemarks": "Good job"},
        headers=admin["headers"],
    )

    notifs = requests.get(f"{TEST_BASE_URL}/api/notifications", headers=emp1["headers"]).json()
    unread_list = [n for n in notifs["notifications"] if not n["isRead"]]
    assert len(unread_list) > 0, "Should have unread notifications from prior actions"

    first_notif_id = unread_list[0]["_id"]

    # Mark single as read
    mark_res = requests.put(
        f"{TEST_BASE_URL}/api/notifications/{first_notif_id}/read",
        headers=emp1["headers"],
    )
    assert mark_res.status_code == 200
    assert mark_res.json()["notification"]["isRead"] is True

    # Mark all as read
    mark_all_res = requests.put(
        f"{TEST_BASE_URL}/api/notifications/read-all",
        headers=emp1["headers"],
    )
    assert mark_all_res.status_code == 200

    # Unread count should now be 0
    updated_notifs = requests.get(f"{TEST_BASE_URL}/api/notifications", headers=emp1["headers"]).json()
    assert updated_notifs["unreadCount"] == 0


def test_cross_user_notification_isolation(notif_setup):
    """Users cannot access or modify another user's notifications."""
    emp1 = notif_setup["emp1"]
    emp2 = notif_setup["emp2"]
    admin = notif_setup["admin"]

    # Emp 1 gets a notification via admin verification
    c = requests.post(
        f"{TEST_BASE_URL}/api/courses",
        json={"title": "Rust Programming", "platform": "Udemy", "progress": 100, "certificateUrl": "https://udemy.com/cert2"},
        headers=emp1["headers"],
    ).json()

    requests.put(
        f"{TEST_BASE_URL}/api/courses/{c['_id']}/verify",
        json={"verificationStatus": "verified"},
        headers=admin["headers"],
    )

    emp1_notifs = requests.get(f"{TEST_BASE_URL}/api/notifications", headers=emp1["headers"]).json()
    assert len(emp1_notifs["notifications"]) > 0
    emp1_notif_id = emp1_notifs["notifications"][0]["_id"]

    # Emp 2 attempts to mark Emp 1's notification as read
    unauth_mark = requests.put(
        f"{TEST_BASE_URL}/api/notifications/{emp1_notif_id}/read",
        headers=emp2["headers"],
    )
    assert unauth_mark.status_code == 404, "Should return 404 when attempting to access another user's notification"

    # Emp 2 attempts to delete Emp 1's notification
    unauth_del = requests.delete(
        f"{TEST_BASE_URL}/api/notifications/{emp1_notif_id}",
        headers=emp2["headers"],
    )
    assert unauth_del.status_code == 404
