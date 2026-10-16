"""
Salary Pro — Leave Management Module Tests
Verifies strict separation of Admin & Employee leave workflows,
RBAC enforcement, remarks handling, and status transition guards.
Targeting isolated test server on PORT 5001 using `salary-pro-test` DB.
"""

import pytest
import requests
from tests.conftest import TEST_BASE_URL
from tests.test_blackbox import _unique_user, _unique_employee


@pytest.fixture
def leave_test_setup():
    """Create admin and two employees linked to employee records."""
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

    emp1_doc = _unique_employee()
    emp1_doc["name"] = emp1_payload["name"]
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

    emp2_doc = _unique_employee()
    emp2_doc["name"] = emp2_payload["name"]
    created_emp2 = requests.post(f"{TEST_BASE_URL}/api/employees", json=emp2_doc, headers=admin_headers).json()
    requests.put(
        f"{TEST_BASE_URL}/api/settings/users/{emp2_user['id']}/link-employee",
        json={"employeeId": created_emp2["employeeId"]},
        headers=admin_headers,
    )

    return {
        "admin_token": admin_token,
        "admin_headers": admin_headers,
        "emp1_token": emp1_token,
        "emp1_headers": emp1_headers,
        "emp1_id": created_emp1["employeeId"],
        "emp1_name": emp1_payload["name"],
        "emp2_token": emp2_token,
        "emp2_headers": emp2_headers,
        "emp2_id": created_emp2["employeeId"],
    }


def test_employee_submit_leave_success(leave_test_setup):
    """Employee can submit a leave request for themselves."""
    headers = leave_test_setup["emp1_headers"]
    payload = {
        "startDate": "2026-11-10",
        "endDate": "2026-11-12",
        "leaveType": "full-day",
        "reason": "Family vacation",
        "lateMark": False,
    }
    resp = requests.post(f"{TEST_BASE_URL}/api/leave", json=payload, headers=headers)
    assert resp.status_code == 201, resp.text
    data = resp.json()
    assert data["status"] == "pending"
    assert data["leaveType"] == "full-day"
    assert data["employeeId"] == leave_test_setup["emp1_id"]
    assert data["employeeName"] == leave_test_setup["emp1_name"]
    assert data["reason"] == "Family vacation"


def test_admin_cannot_submit_leave(leave_test_setup):
    """Admin cannot submit leave requests (HTTP 403)."""
    headers = leave_test_setup["admin_headers"]
    payload = {
        "startDate": "2026-11-10",
        "endDate": "2026-11-12",
        "leaveType": "full-day",
        "reason": "Admin trying to apply",
    }
    resp = requests.post(f"{TEST_BASE_URL}/api/leave", json=payload, headers=headers)
    assert resp.status_code == 403, f"Expected 403 Forbidden for admin, got {resp.status_code}: {resp.text}"


def test_unlinked_employee_cannot_submit_leave():
    """An unlinked employee user gets 400 when attempting to submit leave."""
    user = _unique_user(role="employee")
    reg = requests.post(f"{TEST_BASE_URL}/api/auth/register", json=user)
    token = reg.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "startDate": "2026-11-10",
        "endDate": "2026-11-12",
        "leaveType": "full-day",
        "reason": "Vacation",
    }
    resp = requests.post(f"{TEST_BASE_URL}/api/leave", json=payload, headers=headers)
    assert resp.status_code == 400
    assert "not linked" in resp.json()["message"].lower()


def test_employee_identity_resolved_from_authenticated_session(leave_test_setup):
    """Employee cannot forge employeeId in request body; system resolves authenticated identity."""
    headers = leave_test_setup["emp1_headers"]
    payload = {
        "employeeId": leave_test_setup["emp2_id"],  # deliberate forgery attempt
        "startDate": "2026-11-15",
        "endDate": "2026-11-16",
        "leaveType": "half-day",
        "reason": "Doctor appointment",
    }
    resp = requests.post(f"{TEST_BASE_URL}/api/leave", json=payload, headers=headers)
    assert resp.status_code == 201
    data = resp.json()
    assert data["employeeId"] == leave_test_setup["emp1_id"], (
        "Server must enforce authenticated employeeId and ignore client-supplied employeeId"
    )


def test_date_and_field_validations(leave_test_setup):
    """Server enforces start/end date logic and required fields."""
    headers = leave_test_setup["emp1_headers"]

    # End date before start date
    resp1 = requests.post(
        f"{TEST_BASE_URL}/api/leave",
        json={"startDate": "2026-11-20", "endDate": "2026-11-18", "leaveType": "full-day", "reason": "Test"},
        headers=headers,
    )
    assert resp1.status_code == 400
    assert "end date cannot be before" in resp1.json()["message"].lower()

    # Invalid leave type
    resp2 = requests.post(
        f"{TEST_BASE_URL}/api/leave",
        json={"startDate": "2026-11-20", "endDate": "2026-11-22", "leaveType": "annual", "reason": "Test"},
        headers=headers,
    )
    assert resp2.status_code == 400

    # Missing reason
    resp3 = requests.post(
        f"{TEST_BASE_URL}/api/leave",
        json={"startDate": "2026-11-20", "endDate": "2026-11-22", "leaveType": "full-day"},
        headers=headers,
    )
    assert resp3.status_code == 400


def test_employee_cannot_review_leave(leave_test_setup):
    """Employee receives 403 when trying to review a leave request."""
    # First employee submits leave
    create_resp = requests.post(
        f"{TEST_BASE_URL}/api/leave",
        json={"startDate": "2026-12-01", "endDate": "2026-12-02", "leaveType": "full-day", "reason": "Test"},
        headers=leave_test_setup["emp1_headers"],
    )
    leave_id = create_resp.json()["_id"]

    # Employee 2 tries to review
    review_resp = requests.put(
        f"{TEST_BASE_URL}/api/leave/{leave_id}",
        json={"status": "approved", "remarks": "Looks good"},
        headers=leave_test_setup["emp2_headers"],
    )
    assert review_resp.status_code == 403


def test_admin_approve_leave_with_remarks(leave_test_setup):
    """Admin can approve pending leave with review remarks."""
    create_resp = requests.post(
        f"{TEST_BASE_URL}/api/leave",
        json={"startDate": "2026-12-05", "endDate": "2026-12-06", "leaveType": "full-day", "reason": "Conference"},
        headers=leave_test_setup["emp1_headers"],
    )
    leave_id = create_resp.json()["_id"]

    review_resp = requests.put(
        f"{TEST_BASE_URL}/api/leave/{leave_id}",
        json={"status": "approved", "remarks": "Approved. Have a great conference!"},
        headers=leave_test_setup["admin_headers"],
    )
    assert review_resp.status_code == 200
    data = review_resp.json()
    assert data["status"] == "approved"
    assert data["remarks"] == "Approved. Have a great conference!"
    assert data.get("reviewedBy") is not None
    assert data.get("reviewedAt") is not None


def test_admin_reject_leave_with_remarks(leave_test_setup):
    """Admin can reject pending leave with review remarks."""
    create_resp = requests.post(
        f"{TEST_BASE_URL}/api/leave",
        json={"startDate": "2026-12-10", "endDate": "2026-12-15", "leaveType": "full-day", "reason": "Trip"},
        headers=leave_test_setup["emp1_headers"],
    )
    leave_id = create_resp.json()["_id"]

    review_resp = requests.put(
        f"{TEST_BASE_URL}/api/leave/{leave_id}",
        json={"status": "rejected", "remarks": "Sprint freeze during this period."},
        headers=leave_test_setup["admin_headers"],
    )
    assert review_resp.status_code == 200
    data = review_resp.json()
    assert data["status"] == "rejected"
    assert data["remarks"] == "Sprint freeze during this period."


def test_cannot_re_review_already_decided_leave(leave_test_setup):
    """Once approved or rejected, a leave request cannot be re-reviewed."""
    create_resp = requests.post(
        f"{TEST_BASE_URL}/api/leave",
        json={"startDate": "2026-12-20", "endDate": "2026-12-21", "leaveType": "half-day", "reason": "Errand"},
        headers=leave_test_setup["emp1_headers"],
    )
    leave_id = create_resp.json()["_id"]

    # First review: approve
    resp1 = requests.put(
        f"{TEST_BASE_URL}/api/leave/{leave_id}",
        json={"status": "approved", "remarks": "OK"},
        headers=leave_test_setup["admin_headers"],
    )
    assert resp1.status_code == 200

    # Second review attempt: should be rejected
    resp2 = requests.put(
        f"{TEST_BASE_URL}/api/leave/{leave_id}",
        json={"status": "rejected", "remarks": "Changed mind"},
        headers=leave_test_setup["admin_headers"],
    )
    assert resp2.status_code == 400
    assert "already been reviewed" in resp2.json()["message"].lower()


def test_employee_and_admin_leave_isolation(leave_test_setup):
    """Employee sees only their own leaves; Admin sees all leaves and can filter."""
    # Emp1 submits a leave
    requests.post(
        f"{TEST_BASE_URL}/api/leave",
        json={"startDate": "2026-12-25", "endDate": "2026-12-26", "leaveType": "full-day", "reason": "Emp1 leave"},
        headers=leave_test_setup["emp1_headers"],
    )

    # Emp2 submits a leave
    requests.post(
        f"{TEST_BASE_URL}/api/leave",
        json={"startDate": "2026-12-27", "endDate": "2026-12-28", "leaveType": "full-day", "reason": "Emp2 leave"},
        headers=leave_test_setup["emp2_headers"],
    )

    # Emp1 fetches leaves -> only emp1's leaves returned
    emp1_leaves = requests.get(f"{TEST_BASE_URL}/api/leave", headers=leave_test_setup["emp1_headers"]).json()
    assert all(l["employeeId"] == leave_test_setup["emp1_id"] for l in emp1_leaves)

    # Emp2 fetches leaves -> only emp2's leaves returned
    emp2_leaves = requests.get(f"{TEST_BASE_URL}/api/leave", headers=leave_test_setup["emp2_headers"]).json()
    assert all(l["employeeId"] == leave_test_setup["emp2_id"] for l in emp2_leaves)

    # Admin fetches leaves -> sees both
    admin_leaves = requests.get(f"{TEST_BASE_URL}/api/leave", headers=leave_test_setup["admin_headers"]).json()
    emp_ids_in_admin = {l["employeeId"] for l in admin_leaves}
    assert leave_test_setup["emp1_id"] in emp_ids_in_admin
    assert leave_test_setup["emp2_id"] in emp_ids_in_admin

    # Admin filter by employeeId
    filtered = requests.get(
        f"{TEST_BASE_URL}/api/leave?employeeId={leave_test_setup['emp1_id']}",
        headers=leave_test_setup["admin_headers"],
    ).json()
    assert all(l["employeeId"] == leave_test_setup["emp1_id"] for l in filtered)
