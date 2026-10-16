"""
Salary Pro — Employee Self-Service Dashboard & Profile Security Tests
Verifies self-service identity resolution, isolation guards, unlinked accounts handling,
and career timeline promotion data integrity.
Targeting isolated test server on PORT 5001 using `salary-pro-test` DB.
"""

import pytest
import requests
from tests.conftest import TEST_BASE_URL
from tests.test_blackbox import _unique_user, _unique_employee


@pytest.fixture
def self_service_setup():
    """Create admin, linked employee 1, linked employee 2, and an unlinked employee."""
    # 1. Admin
    admin_payload = _unique_user(role="admin")
    admin_reg = requests.post(f"{TEST_BASE_URL}/api/auth/register", json=admin_payload)
    admin_token = admin_reg.json()["token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # 2. Linked Employee 1
    emp1_payload = _unique_user(role="employee")
    emp1_reg = requests.post(f"{TEST_BASE_URL}/api/auth/register", json=emp1_payload)
    emp1_token = emp1_reg.json()["token"]
    emp1_user = emp1_reg.json()["user"]
    emp1_headers = {"Authorization": f"Bearer {emp1_token}"}

    emp1_doc = _unique_employee()
    emp1_doc["name"] = emp1_payload["name"]
    emp1_doc["department"] = "IT"
    emp1_doc["designation"] = "Junior Software Engineer"
    emp1_doc["basicSalary"] = 40000
    created_emp1 = requests.post(f"{TEST_BASE_URL}/api/employees", json=emp1_doc, headers=admin_headers).json()
    requests.put(
        f"{TEST_BASE_URL}/api/settings/users/{emp1_user['id']}/link-employee",
        json={"employeeId": created_emp1["employeeId"]},
        headers=admin_headers,
    )

    # 3. Linked Employee 2
    emp2_payload = _unique_user(role="employee")
    emp2_reg = requests.post(f"{TEST_BASE_URL}/api/auth/register", json=emp2_payload)
    emp2_token = emp2_reg.json()["token"]
    emp2_user = emp2_reg.json()["user"]
    emp2_headers = {"Authorization": f"Bearer {emp2_token}"}

    emp2_doc = _unique_employee()
    emp2_doc["name"] = emp2_payload["name"]
    emp2_doc["department"] = "IT"
    emp2_doc["designation"] = "Software Engineer"
    emp2_doc["basicSalary"] = 65000
    created_emp2 = requests.post(f"{TEST_BASE_URL}/api/employees", json=emp2_doc, headers=admin_headers).json()
    requests.put(
        f"{TEST_BASE_URL}/api/settings/users/{emp2_user['id']}/link-employee",
        json={"employeeId": created_emp2["employeeId"]},
        headers=admin_headers,
    )

    # 4. Unlinked Employee (registered without link step)
    unlinked_payload = _unique_user(role="employee")
    unlinked_reg = requests.post(f"{TEST_BASE_URL}/api/auth/register", json=unlinked_payload)
    unlinked_token = unlinked_reg.json()["token"]
    unlinked_headers = {"Authorization": f"Bearer {unlinked_token}"}

    return {
        "admin_headers": admin_headers,
        "emp1_headers": emp1_headers,
        "emp1_id": created_emp1["employeeId"],
        "emp2_headers": emp2_headers,
        "emp2_id": created_emp2["employeeId"],
        "unlinked_headers": unlinked_headers,
    }


def test_employee_self_service_attendance_and_salary_endpoints(self_service_setup):
    """Employee can securely retrieve personal attendance and salary using 'ME' or their linked ID."""
    s = self_service_setup
    today = "2026-10-15"

    # Admin marks attendance for Emp1
    mark_res = requests.post(
        f"{TEST_BASE_URL}/api/attendance",
        json={"employeeId": s["emp1_id"], "date": today, "status": "present"},
        headers=s["admin_headers"],
    )
    assert mark_res.status_code == 201

    # Admin calculates salary for Emp1
    sal_res = requests.post(
        f"{TEST_BASE_URL}/api/salary/calculate",
        json={"employeeId": s["emp1_id"], "basicSalary": 40000, "bonus": 5000, "taxDeduction": 1000},
        headers=s["admin_headers"],
    )
    assert sal_res.status_code == 201

    # Employee 1 queries attendance via ME
    att_me = requests.get(f"{TEST_BASE_URL}/api/attendance/ME", headers=s["emp1_headers"])
    assert att_me.status_code == 200
    assert att_me.json()["summary"]["total"] >= 1
    assert att_me.json()["summary"]["present"] >= 1

    # Employee 1 queries attendance via emp1_id
    att_id = requests.get(f"{TEST_BASE_URL}/api/attendance/{s['emp1_id']}", headers=s["emp1_headers"])
    assert att_id.status_code == 200
    assert att_id.json()["summary"]["total"] >= 1

    # Employee 1 queries salary via ME
    sal_me = requests.get(f"{TEST_BASE_URL}/api/salary/ME", headers=s["emp1_headers"])
    assert sal_me.status_code == 200
    assert len(sal_me.json()) >= 1
    assert sal_me.json()[0]["netSalary"] == 44000


def test_employee_cannot_view_other_employee_attendance_or_salary(self_service_setup):
    """Employee must be strictly prohibited from accessing another employee's records."""
    s = self_service_setup

    # Employee 1 attempts to query Employee 2's attendance
    att_forbidden = requests.get(f"{TEST_BASE_URL}/api/attendance/{s['emp2_id']}", headers=s["emp1_headers"])
    assert att_forbidden.status_code == 403

    # Employee 1 attempts to query Employee 2's salary history
    sal_forbidden = requests.get(f"{TEST_BASE_URL}/api/salary/{s['emp2_id']}", headers=s["emp1_headers"])
    assert sal_forbidden.status_code == 403

    # Employee 1 attempts to query Employee 2's promotion history
    promo_forbidden = requests.get(f"{TEST_BASE_URL}/api/promotions/history/{s['emp2_id']}", headers=s["emp1_headers"])
    assert promo_forbidden.status_code == 403


def test_unlinked_employee_safe_responses(self_service_setup):
    """Unlinked accounts must receive safe fallback responses without 500 crashes or data exposure."""
    s = self_service_setup

    # 1. /api/employees/me returns 404 with linked: false
    me_res = requests.get(f"{TEST_BASE_URL}/api/employees/me", headers=s["unlinked_headers"])
    assert me_res.status_code == 404
    assert me_res.json().get("linked") is False

    # 2. Attendance via ME returns empty summary with unlinked flag
    att_res = requests.get(f"{TEST_BASE_URL}/api/attendance/ME", headers=s["unlinked_headers"])
    assert att_res.status_code == 200
    assert att_res.json()["records"] == []
    assert att_res.json()["unlinked"] is True

    # 3. Salary via ME returns empty array
    sal_res = requests.get(f"{TEST_BASE_URL}/api/salary/ME", headers=s["unlinked_headers"])
    assert sal_res.status_code == 200
    assert sal_res.json() == []

    # 4. Promotions via ME returns empty array
    promo_res = requests.get(f"{TEST_BASE_URL}/api/promotions/history/ME", headers=s["unlinked_headers"])
    assert promo_res.status_code == 200
    assert promo_res.json() == []


def test_employee_promotion_history_and_admin_only_governance(self_service_setup):
    """Admin promotes an employee; employee views own timeline, but cannot promote themselves."""
    s = self_service_setup

    # 1. Admin gets eligible designations for Emp 1
    elig_res = requests.get(f"{TEST_BASE_URL}/api/promotions/eligible/{s['emp1_id']}", headers=s["admin_headers"])
    assert elig_res.status_code == 200
    eligible = elig_res.json()["eligible"]
    assert len(eligible) > 0
    target_desig = eligible[0]

    # 2. Employee cannot create a promotion (Admin only)
    emp_promo_attempt = requests.post(
        f"{TEST_BASE_URL}/api/promotions",
        json={
            "employeeId": s["emp1_id"],
            "newDesignationId": target_desig["_id"],
            "effectiveDate": "2026-11-01",
        },
        headers=s["emp1_headers"],
    )
    assert emp_promo_attempt.status_code == 403

    # 3. Admin successfully promotes Employee 1
    admin_promo = requests.post(
        f"{TEST_BASE_URL}/api/promotions",
        json={
            "employeeId": s["emp1_id"],
            "newDesignationId": target_desig["_id"],
            "effectiveDate": "2026-11-01",
            "remarks": "Excellent technical performance and milestone achievements",
        },
        headers=s["admin_headers"],
    )
    assert admin_promo.status_code == 201

    # 4. Employee views their own career timeline / history via ME
    history_me = requests.get(f"{TEST_BASE_URL}/api/promotions/history/ME", headers=s["emp1_headers"])
    assert history_me.status_code == 200
    history = history_me.json()
    assert len(history) >= 1
    assert history[0]["newDesignation"] == target_desig["title"]
    assert "milestone achievements" in history[0]["remarks"]
