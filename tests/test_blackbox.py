"""
Salary Pro — Experiment 10: Black-Box Test Cases BB01–BB05
=============================================================
Tests target the ISOLATED test server on PORT 5001 using the
`salary-pro-test` MongoDB database. The production `salary-pro`
database is never touched.

All test users/passwords are randomly generated per session.
"""

import uuid
import random
import string
import pytest

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _unique_user(role: str = "admin") -> dict:
    """
    Generate a unique test user payload that cannot collide with production data.
    Follows server-side validation rules:
      name     → ^[A-Za-z ]{1,20}$    (letters + spaces, max 20 chars)
      username → ^[A-Za-z0-9._-]{4,20}$ (4-20 alphanumeric/._- chars)
      email    → standard email pattern
      password → ≥6 chars
    """
    # 4 random uppercase letters guaranteed (no digits)
    suffix = ''.join(random.choices(string.ascii_uppercase, k=4))
    # 8-char alphanumeric tag for uniqueness
    tag = uuid.uuid4().hex[:8]
    return {
        "name": f"Test {suffix}",                    # e.g. "Test BFAK" — letters+space, ≤20
        "username": f"tst{tag}",                      # 11 chars, all alphanumeric — valid
        "email": f"test.{tag}@salarypro-test.local",
        "password": f"Pass@{tag}",                    # ≥6 chars
        "role": role,
    }


# ---------------------------------------------------------------------------
# BB01 — Valid Login
# ---------------------------------------------------------------------------

class TestBB01ValidLogin:
    """
    BB01: A registered user can log in with correct credentials.
    Expected: HTTP 200, response body contains 'token' and 'user'.
    """

    def test_valid_login_returns_token(self, auth_api_client):
        # 1. Register a fresh test admin
        user = _unique_user("admin")
        reg_resp = auth_api_client.post("/api/auth/register", json=user)
        assert reg_resp.status_code == 201, (
            f"[BB01 setup] Registration failed: {reg_resp.status_code} — {reg_resp.text}"
        )

        # 2. Log in with the same credentials
        login_resp = auth_api_client.post("/api/auth/login", json={
            "email": user["email"],
            "password": user["password"],
            "role": user["role"],
        })

        assert login_resp.status_code == 200, (
            f"[BB01] Expected 200, got {login_resp.status_code}: {login_resp.text}"
        )
        body = login_resp.json()
        assert "token" in body, "[BB01] Response missing 'token'"
        assert "user" in body, "[BB01] Response missing 'user'"
        assert body["user"]["email"] == user["email"], (
            "[BB01] Returned user email does not match registered email"
        )
        assert body["user"]["role"] == "admin", "[BB01] Returned role should be 'admin'"


# ---------------------------------------------------------------------------
# BB02 — Incorrect Password
# ---------------------------------------------------------------------------

class TestBB02IncorrectPassword:
    """
    BB02: Logging in with the wrong password must be rejected.
    Expected: HTTP 401, no token in response.
    """

    def test_wrong_password_rejected(self, auth_api_client):
        # Register a fresh user
        user = _unique_user("admin")
        reg_resp = auth_api_client.post("/api/auth/register", json=user)
        assert reg_resp.status_code == 201, (
            f"[BB02 setup] Registration failed: {reg_resp.status_code} — {reg_resp.text}"
        )

        # Attempt login with deliberately wrong password
        login_resp = auth_api_client.post("/api/auth/login", json={
            "email": user["email"],
            "password": "WrongPass999!",
            "role": user["role"],
        })

        assert login_resp.status_code == 401, (
            f"[BB02] Expected 401, got {login_resp.status_code}: {login_resp.text}"
        )
        body = login_resp.json()
        assert "token" not in body, "[BB02] Token must NOT be returned on failed login"


# ---------------------------------------------------------------------------
# BB03 — Empty Login Fields
# ---------------------------------------------------------------------------

class TestBB03EmptyLoginFields:
    """
    BB03: Submitting an empty login request must be rejected.
    Expected: HTTP 401 (auth guard fires before business logic).
    """

    def test_empty_body_rejected(self, auth_api_client):
        login_resp = auth_api_client.post("/api/auth/login", json={})

        assert login_resp.status_code == 401, (
            f"[BB03] Expected 401, got {login_resp.status_code}: {login_resp.text}"
        )
        body = login_resp.json()
        assert "token" not in body, "[BB03] Token must NOT be returned for empty login"

    def test_missing_password_rejected(self, auth_api_client):
        login_resp = auth_api_client.post("/api/auth/login", json={
            "email": "someone@example.com",
            "role": "admin",
            # password intentionally omitted
        })

        assert login_resp.status_code == 401, (
            f"[BB03b] Expected 401, got {login_resp.status_code}: {login_resp.text}"
        )

    def test_missing_role_rejected(self, auth_api_client):
        login_resp = auth_api_client.post("/api/auth/login", json={
            "email": "someone@example.com",
            "password": "Pass@1234",
            # role intentionally omitted
        })

        assert login_resp.status_code == 401, (
            f"[BB03c] Expected 401, got {login_resp.status_code}: {login_resp.text}"
        )


# ---------------------------------------------------------------------------
# BB04 — Invalid Email Format
# ---------------------------------------------------------------------------

class TestBB04InvalidEmailFormat:
    """
    BB04: Registration with a malformed email must be rejected.
    Expected: HTTP 400, message about invalid email.
    """

    @pytest.mark.parametrize("bad_email", [
        "notanemail",
        "missing@",
        "@nodomain.com",
        "spaces in@email.com",
        "double@@domain.com",
    ])
    def test_invalid_email_rejected(self, auth_api_client, bad_email):
        uid = uuid.uuid4().hex[:6]
        payload = {
            "name": "Test User",
            "username": f"inv{uid}",
            "email": bad_email,
            "password": "Pass@1234",
            "role": "admin",
        }
        resp = auth_api_client.post("/api/auth/register", json=payload)

        assert resp.status_code == 400, (
            f"[BB04] Email '{bad_email}' should be rejected with 400, "
            f"got {resp.status_code}: {resp.text}"
        )
        body = resp.json()
        assert "token" not in body, (
            f"[BB04] Token must NOT be returned for invalid email '{bad_email}'"
        )


# ---------------------------------------------------------------------------
# BB05 — Valid Registration
# ---------------------------------------------------------------------------

class TestBB05ValidRegistration:
    """
    BB05: A new user with valid data should register successfully.
    Expected: HTTP 201, response contains 'token' and 'user' with correct fields.
    """

    def test_valid_admin_registration(self, auth_api_client):
        user = _unique_user("admin")
        resp = auth_api_client.post("/api/auth/register", json=user)

        assert resp.status_code == 201, (
            f"[BB05] Expected 201, got {resp.status_code}: {resp.text}"
        )
        body = resp.json()
        assert "token" in body, "[BB05] Response missing 'token'"
        assert "user" in body, "[BB05] Response missing 'user'"
        assert body["user"]["email"] == user["email"], "[BB05] Email mismatch"
        assert body["user"]["role"] == "admin", "[BB05] Role should be 'admin'"
        assert body["user"]["name"] == user["name"], "[BB05] Name mismatch"

    def test_valid_employee_registration(self, auth_api_client):
        user = _unique_user("employee")
        resp = auth_api_client.post("/api/auth/register", json=user)

        assert resp.status_code == 201, (
            f"[BB05b] Expected 201, got {resp.status_code}: {resp.text}"
        )
        body = resp.json()
        assert body["user"]["role"] == "employee", "[BB05b] Role should be 'employee'"


# ---------------------------------------------------------------------------
# BB06 — Duplicate Email Registration
# ---------------------------------------------------------------------------

class TestBB06DuplicateEmail:
    """
    BB06: Registering the same email twice must be rejected with HTTP 409.
    Verifies the uniqueness constraint on the users collection.
    """

    def test_duplicate_email_rejected(self, auth_api_client):
        # Register once — must succeed
        user = _unique_user("admin")
        first = auth_api_client.post("/api/auth/register", json=user)
        assert first.status_code == 201, (
            f"[BB06 setup] First registration failed: {first.status_code} — {first.text}"
        )

        # Attempt to register the exact same email again (different username)
        duplicate = _unique_user("admin")
        duplicate["email"] = user["email"]   # reuse same email
        second = auth_api_client.post("/api/auth/register", json=duplicate)

        assert second.status_code == 409, (
            f"[BB06] Expected 409 for duplicate email, got {second.status_code}: {second.text}"
        )
        body = second.json()
        assert "token" not in body, "[BB06] Token must NOT be returned on duplicate registration"

    def test_duplicate_username_rejected(self, auth_api_client):
        # Register once — must succeed
        user = _unique_user("admin")
        first = auth_api_client.post("/api/auth/register", json=user)
        assert first.status_code == 201, (
            f"[BB06b setup] First registration failed: {first.status_code} — {first.text}"
        )

        # Attempt to register with the exact same username (different email)
        duplicate = _unique_user("admin")
        duplicate["username"] = user["username"]   # reuse same username
        second = auth_api_client.post("/api/auth/register", json=duplicate)

        assert second.status_code == 409, (
            f"[BB06b] Expected 409 for duplicate username, got {second.status_code}: {second.text}"
        )
        assert "token" not in second.json(), "[BB06b] Token must NOT be returned"


# ---------------------------------------------------------------------------
# BB07 — Registration With Missing Required Fields
# ---------------------------------------------------------------------------

class TestBB07MissingRegistrationFields:
    """
    BB07: Omitting each required registration field must yield HTTP 400.
    Required fields: name, username, email, password, role.
    """

    @pytest.mark.parametrize("omit_field", ["name", "username", "email", "password", "role"])
    def test_missing_field_rejected(self, auth_api_client, omit_field):
        user = _unique_user("admin")
        del user[omit_field]   # remove one required field

        resp = auth_api_client.post("/api/auth/register", json=user)

        assert resp.status_code == 400, (
            f"[BB07] Omitting '{omit_field}' should give 400, "
            f"got {resp.status_code}: {resp.text}"
        )
        assert "token" not in resp.json(), (
            f"[BB07] Token must NOT be returned when '{omit_field}' is missing"
        )

    def test_invalid_role_rejected(self, auth_api_client):
        """Role must be 'admin' or 'employee' — anything else is 400."""
        user = _unique_user("admin")
        user["role"] = "superuser"

        resp = auth_api_client.post("/api/auth/register", json=user)

        assert resp.status_code == 400, (
            f"[BB07f] Invalid role should give 400, got {resp.status_code}: {resp.text}"
        )


# ---------------------------------------------------------------------------
# BB08 — Access Protected Employee API Without Authentication
# ---------------------------------------------------------------------------

class TestBB08NoAuth:
    """
    BB08: Hitting any /api/employees endpoint without a JWT must return 401.
    Verifies the `protect` middleware is applied correctly.
    """

    def test_get_employees_no_auth(self, auth_api_client):
        resp = auth_api_client.get("/api/employees")
        assert resp.status_code == 401, (
            f"[BB08] GET /api/employees without auth should be 401, got {resp.status_code}"
        )

    def test_post_employee_no_auth(self, auth_api_client):
        resp = auth_api_client.post("/api/employees", json={
            "name": "Ghost User",
            "employeeId": "EMP999",
            "dob": "1990-01-01",
            "education": "BSc",
            "experience": 2,
            "basicSalary": 30000,
        })
        assert resp.status_code == 401, (
            f"[BB08b] POST /api/employees without auth should be 401, got {resp.status_code}"
        )

    def test_wrong_token_rejected(self, auth_api_client):
        resp = auth_api_client.get(
            "/api/employees",
            headers={"Authorization": "Bearer this.is.not.a.valid.jwt"}
        )
        assert resp.status_code == 401, (
            f"[BB08c] Forged token should be 401, got {resp.status_code}"
        )


# ---------------------------------------------------------------------------
# Shared helper — register + login to get an auth token
# ---------------------------------------------------------------------------

def _get_auth_token(client, role: str = "admin") -> str:
    """Register a fresh user and return their JWT for use in authenticated requests."""
    user = _unique_user(role)
    reg = client.post("/api/auth/register", json=user)
    assert reg.status_code == 201, f"Token helper registration failed: {reg.status_code} — {reg.text}"
    return reg.json()["token"]


def _unique_employee() -> dict:
    """
    Generate a valid Employee payload matching the Mongoose schema:
      name        String  required  max 100 chars
      employeeId  String  required  unique (stored uppercase)
      dob         Date    required
      education   String  required
      experience  Number  required  0–70
      basicSalary Number  required  ≥0
    """
    tag = uuid.uuid4().hex[:6].upper()   # e.g. "A3F9C1"
    return {
        "name": f"Emp Test",
        "employeeId": f"TST{tag}",       # unique per call
        "dob": "1995-06-15",
        "education": "Bachelor of Commerce",
        "experience": 3,
        "basicSalary": 45000,
    }


# ---------------------------------------------------------------------------
# BB09 — Add Employee With Valid Data
# ---------------------------------------------------------------------------

class TestBB09AddEmployeeValid:
    """
    BB09: An authenticated user can create a new employee record.
    Expected: HTTP 201, returned document contains all submitted fields.
    """

    def test_create_employee_returns_201(self, auth_api_client):
        token = _get_auth_token(auth_api_client, "admin")
        emp = _unique_employee()

        resp = auth_api_client.post(
            "/api/employees",
            json=emp,
            headers={"Authorization": f"Bearer {token}"},
        )

        assert resp.status_code == 201, (
            f"[BB09] Expected 201, got {resp.status_code}: {resp.text}"
        )
        body = resp.json()
        assert body["employeeId"] == emp["employeeId"], "[BB09] employeeId mismatch"
        assert body["basicSalary"] == emp["basicSalary"], "[BB09] basicSalary mismatch"
        assert body["experience"] == emp["experience"], "[BB09] experience mismatch"
        assert "_id" in body, "[BB09] Response missing '_id' field"

    def test_employeeid_stored_uppercase(self, auth_api_client):
        """Mongoose schema has uppercase: true — verify the stored value is uppercased."""
        token = _get_auth_token(auth_api_client, "admin")
        emp = _unique_employee()
        emp["employeeId"] = emp["employeeId"].lower()   # send lowercase

        resp = auth_api_client.post(
            "/api/employees",
            json=emp,
            headers={"Authorization": f"Bearer {token}"},
        )

        assert resp.status_code == 201, (
            f"[BB09b] Expected 201, got {resp.status_code}: {resp.text}"
        )
        body = resp.json()
        assert body["employeeId"] == emp["employeeId"].upper(), (
            "[BB09b] employeeId should be stored in UPPERCASE"
        )


# ---------------------------------------------------------------------------
# BB10 — Add Employee With Missing Required Fields
# ---------------------------------------------------------------------------

class TestBB10AddEmployeeMissingFields:
    """
    BB10: Omitting required employee fields must be rejected.
    The Employee model uses Mongoose validation — missing required fields
    trigger a ValidationError which the global error handler returns as HTTP 500.
    This is documented as a known application behaviour (not a bug to fix here).
    """

    @pytest.mark.parametrize("omit_field", [
        "name", "employeeId", "dob", "education", "experience", "basicSalary"
    ])
    def test_missing_field_rejected(self, auth_api_client, omit_field):
        token = _get_auth_token(auth_api_client, "admin")
        emp = _unique_employee()
        del emp[omit_field]

        resp = auth_api_client.post(
            "/api/employees",
            json=emp,
            headers={"Authorization": f"Bearer {token}"},
        )

        # Mongoose validation errors bubble through the global error handler as 500.
        # The important assertion is that the employee is NOT created (no 201).
        assert resp.status_code != 201, (
            f"[BB10] Omitting '{omit_field}' must not produce 201, "
            f"got {resp.status_code}: {resp.text}"
        )

    def test_negative_salary_rejected(self, auth_api_client):
        """basicSalary has min: 0 — a negative value must not produce 201."""
        token = _get_auth_token(auth_api_client, "admin")
        emp = _unique_employee()
        emp["basicSalary"] = -5000

        resp = auth_api_client.post(
            "/api/employees",
            json=emp,
            headers={"Authorization": f"Bearer {token}"},
        )

        assert resp.status_code != 201, (
            f"[BB10g] Negative salary must not create employee, got {resp.status_code}: {resp.text}"
        )

    def test_experience_out_of_range_rejected(self, auth_api_client):
        """experience has max: 70 — value > 70 must not produce 201."""
        token = _get_auth_token(auth_api_client, "admin")
        emp = _unique_employee()
        emp["experience"] = 99

        resp = auth_api_client.post(
            "/api/employees",
            json=emp,
            headers={"Authorization": f"Bearer {token}"},
        )

        assert resp.status_code != 201, (
            f"[BB10h] experience > 70 must not create employee, got {resp.status_code}: {resp.text}"
        )


# ===========================================================================
# BB11–BB15 — Employee lookup, Attendance, Leave, Salary, Payslip validation
# ===========================================================================

# ---------------------------------------------------------------------------
# BB11 — Fetch / Search Existing Employee
# ---------------------------------------------------------------------------

class TestBB11FetchEmployees:
    """
    BB11: An authenticated user can retrieve the full employee list and search
    for a specific employee by ID within that list.

    Endpoint: GET /api/employees  → JSON array
    """

    def test_get_employees_returns_200_list(self, auth_api_client):
        token = _get_auth_token(auth_api_client, "admin")

        resp = auth_api_client.get(
            "/api/employees",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert resp.status_code == 200, (
            f"[BB11] Expected 200, got {resp.status_code}: {resp.text}"
        )
        assert isinstance(resp.json(), list), "[BB11] Response should be a JSON array"

    def test_created_employee_appears_in_list(self, auth_api_client):
        """Create a fresh employee then confirm it appears in GET /api/employees."""
        token = _get_auth_token(auth_api_client, "admin")
        headers = {"Authorization": f"Bearer {token}"}

        emp = _unique_employee()
        create_resp = auth_api_client.post("/api/employees", json=emp, headers=headers)
        assert create_resp.status_code == 201, (
            f"[BB11b setup] Employee creation failed: {create_resp.text}"
        )
        created_id = create_resp.json()["employeeId"]

        list_resp = auth_api_client.get("/api/employees", headers=headers)
        assert list_resp.status_code == 200, f"[BB11b] {list_resp.text}"
        ids = [e["employeeId"] for e in list_resp.json()]
        assert created_id in ids, (
            f"[BB11b] Newly created employeeId '{created_id}' not found in employee list"
        )

    def test_each_employee_record_has_required_fields(self, auth_api_client):
        """Every record returned must carry the schema-required fields."""
        token = _get_auth_token(auth_api_client, "admin")
        headers = {"Authorization": f"Bearer {token}"}

        # Ensure at least one employee exists
        auth_api_client.post("/api/employees", json=_unique_employee(), headers=headers)

        resp = auth_api_client.get("/api/employees", headers=headers)
        assert resp.status_code == 200
        for record in resp.json():
            for field in ("_id", "employeeId", "name", "basicSalary", "experience"):
                assert field in record, (
                    f"[BB11c] Employee record missing required field '{field}': {record}"
                )


# ---------------------------------------------------------------------------
# BB12 — Mark Employee Attendance
# ---------------------------------------------------------------------------

class TestBB12MarkAttendance:
    """
    BB12: An authenticated user can mark attendance for an employee.

    Endpoints:
      POST /api/attendance
        body: { employeeId, date, status }   status: 'present' | 'absent'
      GET  /api/attendance/:employeeId?month=YYYY-MM
        returns: { records: [...], summary: { total, present, absent, percentage } }

    Upsert behaviour: posting the same employeeId+date twice updates the record,
    NOT inserts a duplicate (compound unique index on employeeId+date).
    """

    def test_mark_present_returns_201(self, auth_api_client):
        token = _get_auth_token(auth_api_client, "admin")
        emp = _unique_employee()

        resp = auth_api_client.post(
            "/api/attendance",
            json={"employeeId": emp["employeeId"], "date": "2026-09-10", "status": "present"},
            headers={"Authorization": f"Bearer {token}"},
        )

        assert resp.status_code == 201, (
            f"[BB12] Expected 201, got {resp.status_code}: {resp.text}"
        )
        body = resp.json()
        assert body["status"] == "present", "[BB12] Returned status should be 'present'"
        assert body["employeeId"] == emp["employeeId"].upper(), \
            "[BB12] employeeId should be uppercase in response"

    def test_mark_absent_returns_201(self, auth_api_client):
        token = _get_auth_token(auth_api_client, "admin")
        emp = _unique_employee()

        resp = auth_api_client.post(
            "/api/attendance",
            json={"employeeId": emp["employeeId"], "date": "2026-09-11", "status": "absent"},
            headers={"Authorization": f"Bearer {token}"},
        )

        assert resp.status_code == 201, (
            f"[BB12b] Expected 201, got {resp.status_code}: {resp.text}"
        )
        assert resp.json()["status"] == "absent", "[BB12b] Returned status should be 'absent'"

    def test_invalid_status_rejected(self, auth_api_client):
        """Status must be 'present' or 'absent' — anything else is HTTP 400."""
        token = _get_auth_token(auth_api_client, "admin")
        emp = _unique_employee()

        resp = auth_api_client.post(
            "/api/attendance",
            json={"employeeId": emp["employeeId"], "date": "2026-09-12", "status": "late"},
            headers={"Authorization": f"Bearer {token}"},
        )

        assert resp.status_code == 400, (
            f"[BB12c] Invalid status should be 400, got {resp.status_code}: {resp.text}"
        )

    def test_upsert_does_not_duplicate(self, auth_api_client):
        """
        Posting the same employeeId+date twice must update the existing record,
        not insert a new one. The month summary total must be 1, not 2.
        """
        token = _get_auth_token(auth_api_client, "admin")
        emp = _unique_employee()
        headers = {"Authorization": f"Bearer {token}"}

        # Post the same slot twice with different statuses
        auth_api_client.post(
            "/api/attendance",
            json={"employeeId": emp["employeeId"], "date": "2026-09-15", "status": "present"},
            headers=headers,
        )
        auth_api_client.post(
            "/api/attendance",
            json={"employeeId": emp["employeeId"], "date": "2026-09-15", "status": "absent"},
            headers=headers,
        )

        fetch = auth_api_client.get(
            f"/api/attendance/{emp['employeeId']}",
            headers=headers,
            params={"month": "2026-09"},
        )
        assert fetch.status_code == 200, f"[BB12d] Fetch failed: {fetch.text}"
        summary = fetch.json()["summary"]
        assert summary["total"] == 1, (
            f"[BB12d] Upsert should result in 1 record for that date, got {summary['total']}"
        )


# ---------------------------------------------------------------------------
# BB13 — Submit Employee Leave Request
# ---------------------------------------------------------------------------

def _get_linked_employee_token(client):
    admin_token = _get_auth_token(client, "admin")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    emp_doc = _unique_employee()
    created_emp = client.post("/api/employees", json=emp_doc, headers=admin_headers).json()

    user = _unique_user("employee")
    reg = client.post("/api/auth/register", json=user)
    user_data = reg.json()["user"]
    emp_token = reg.json()["token"]

    client.put(
        f"/api/settings/users/{user_data['id']}/link-employee",
        json={"employeeId": created_emp["employeeId"]},
        headers=admin_headers,
    )
    return emp_token, created_emp["employeeId"]


class TestBB13SubmitLeave:
    """
    BB13: Employee accounts can submit leave requests; Admins are forbidden from applying.

    Endpoint: POST /api/leave
      body: { startDate, endDate, leaveType, reason, lateMark? }
      leaveType: 'full-day' | 'half-day'
      New requests default to status='pending'.
    """

    def test_admin_cannot_submit_leave(self, auth_api_client):
        """Admins are forbidden from submitting leave requests (HTTP 403)."""
        token = _get_auth_token(auth_api_client, "admin")
        resp = auth_api_client.post(
            "/api/leave",
            json={
                "startDate": "2026-10-01",
                "endDate": "2026-10-03",
                "leaveType": "full-day",
                "reason": "Admin trying to apply",
            },
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 403, (
            f"[BB13-AdminBlock] Admin must receive 403, got {resp.status_code}: {resp.text}"
        )

    def test_submit_full_day_leave(self, auth_api_client):
        token, emp_id = _get_linked_employee_token(auth_api_client)

        resp = auth_api_client.post(
            "/api/leave",
            json={
                "startDate": "2026-10-01",
                "endDate": "2026-10-03",
                "leaveType": "full-day",
                "reason": "Personal work",
                "lateMark": False,
            },
            headers={"Authorization": f"Bearer {token}"},
        )

        assert resp.status_code == 201, (
            f"[BB13] Expected 201, got {resp.status_code}: {resp.text}"
        )
        body = resp.json()
        assert body["status"] == "pending", "[BB13] New leave should default to 'pending'"
        assert body["leaveType"] == "full-day", "[BB13] leaveType mismatch"
        assert body["employeeId"] == emp_id, "[BB13] employeeId must match linked employee"
        assert "_id" in body, "[BB13] Response missing '_id'"

    def test_submit_half_day_leave(self, auth_api_client):
        token, emp_id = _get_linked_employee_token(auth_api_client)

        resp = auth_api_client.post(
            "/api/leave",
            json={
                "startDate": "2026-10-05",
                "endDate": "2026-10-05",
                "leaveType": "half-day",
                "reason": "Medical appointment",
            },
            headers={"Authorization": f"Bearer {token}"},
        )

        assert resp.status_code == 201, (
            f"[BB13b] Expected 201, got {resp.status_code}: {resp.text}"
        )
        assert resp.json()["leaveType"] == "half-day", "[BB13b] leaveType should be 'half-day'"

    def test_end_before_start_rejected(self, auth_api_client):
        """endDate before startDate must return HTTP 400."""
        token, _ = _get_linked_employee_token(auth_api_client)

        resp = auth_api_client.post(
            "/api/leave",
            json={
                "startDate": "2026-10-10",
                "endDate": "2026-10-05",
                "leaveType": "full-day",
                "reason": "Testing date validation",
            },
            headers={"Authorization": f"Bearer {token}"},
        )

        assert resp.status_code == 400, (
            f"[BB13c] End-before-start should give 400, got {resp.status_code}: {resp.text}"
        )

    def test_missing_reason_rejected(self, auth_api_client):
        """reason is required — omitting it must return 400."""
        token, _ = _get_linked_employee_token(auth_api_client)

        resp = auth_api_client.post(
            "/api/leave",
            json={
                "startDate": "2026-10-01",
                "endDate": "2026-10-02",
                "leaveType": "full-day",
                # reason intentionally omitted
            },
            headers={"Authorization": f"Bearer {token}"},
        )

        assert resp.status_code == 400, (
            f"[BB13d] Missing reason should give 400, got {resp.status_code}: {resp.text}"
        )

    def test_invalid_leave_type_rejected(self, auth_api_client):
        """leaveType must be 'full-day' or 'half-day'. Invalid value must return 400."""
        token, _ = _get_linked_employee_token(auth_api_client)

        resp = auth_api_client.post(
            "/api/leave",
            json={
                "startDate": "2026-10-01",
                "endDate": "2026-10-02",
                "leaveType": "quarterly",
                "reason": "Test",
            },
            headers={"Authorization": f"Bearer {token}"},
        )

        assert resp.status_code == 400, (
            f"[BB13e] Invalid leaveType must produce 400, got {resp.status_code}: {resp.text}"
        )


# ---------------------------------------------------------------------------
# BB14 — Calculate Salary and Verify Net Salary
# ---------------------------------------------------------------------------

class TestBB14CalculateSalary:
    """
    BB14: POST /api/salary/calculate creates a salary record and returns the
    server-computed netSalary.

    Exact formula from salaryController.js line 10:
      netSalary = Math.max(0, basicSalary + bonus - taxDeduction - lateMarkDeduction)

    Deterministic test inputs:
      basicSalary       = 50 000
      bonus             =  5 000
      taxDeduction      =  2 000
      lateMarkDeduction =    500
      ───────────────────────────
      totalDeductions   =  2 500
      netSalary         = 52 500   ← Math.max(0, 50000 + 5000 - 2000 - 500)

    Endpoint: POST /api/salary/calculate
    """

    _INPUTS = {
        "basicSalary": 50_000,
        "bonus": 5_000,
        "taxDeduction": 2_000,
        "lateMarkDeduction": 500,
    }
    _EXPECTED_TOTAL_DEDUCTIONS = 2_500
    _EXPECTED_NET_SALARY = 52_500

    def test_calculate_returns_201(self, auth_api_client):
        token = _get_auth_token(auth_api_client, "admin")
        emp = _unique_employee()

        resp = auth_api_client.post(
            "/api/salary/calculate",
            json={"employeeId": emp["employeeId"], **self._INPUTS},
            headers={"Authorization": f"Bearer {token}"},
        )

        assert resp.status_code == 201, (
            f"[BB14] Expected 201, got {resp.status_code}: {resp.text}"
        )

    def test_net_salary_exact_value(self, auth_api_client):
        """Server must return exactly 52 500 for the deterministic inputs."""
        token = _get_auth_token(auth_api_client, "admin")
        emp = _unique_employee()

        resp = auth_api_client.post(
            "/api/salary/calculate",
            json={"employeeId": emp["employeeId"], **self._INPUTS},
            headers={"Authorization": f"Bearer {token}"},
        )

        assert resp.status_code == 201, f"[BB14b] {resp.text}"
        body = resp.json()
        assert body["netSalary"] == self._EXPECTED_NET_SALARY, (
            f"[BB14b] Expected netSalary={self._EXPECTED_NET_SALARY}, "
            f"got {body.get('netSalary')}"
        )

    def test_total_deductions_exact_value(self, auth_api_client):
        """totalDeductions must equal taxDeduction + lateMarkDeduction = 2 500."""
        token = _get_auth_token(auth_api_client, "admin")
        emp = _unique_employee()

        resp = auth_api_client.post(
            "/api/salary/calculate",
            json={"employeeId": emp["employeeId"], **self._INPUTS},
            headers={"Authorization": f"Bearer {token}"},
        )

        assert resp.status_code == 201, f"[BB14c] {resp.text}"
        body = resp.json()
        assert body["totalDeductions"] == self._EXPECTED_TOTAL_DEDUCTIONS, (
            f"[BB14c] Expected totalDeductions={self._EXPECTED_TOTAL_DEDUCTIONS}, "
            f"got {body.get('totalDeductions')}"
        )

    def test_zero_bonus_and_deductions(self, auth_api_client):
        """With bonus=0, tax=0, late=0 → netSalary must equal basicSalary."""
        token = _get_auth_token(auth_api_client, "admin")
        emp = _unique_employee()
        basic = 40_000

        resp = auth_api_client.post(
            "/api/salary/calculate",
            json={
                "employeeId": emp["employeeId"],
                "basicSalary": basic,
                "bonus": 0,
                "taxDeduction": 0,
                "lateMarkDeduction": 0,
            },
            headers={"Authorization": f"Bearer {token}"},
        )

        assert resp.status_code == 201, f"[BB14d] {resp.text}"
        assert resp.json()["netSalary"] == basic, (
            f"[BB14d] netSalary should equal basicSalary={basic} when no deductions"
        )

    def test_negative_input_rejected(self, auth_api_client):
        """Any negative salary value must return HTTP 400."""
        token = _get_auth_token(auth_api_client, "admin")
        emp = _unique_employee()

        resp = auth_api_client.post(
            "/api/salary/calculate",
            json={
                "employeeId": emp["employeeId"],
                "basicSalary": 50_000,
                "bonus": -100,
                "taxDeduction": 0,
                "lateMarkDeduction": 0,
            },
            headers={"Authorization": f"Bearer {token}"},
        )

        assert resp.status_code == 400, (
            f"[BB14e] Negative bonus should give 400, got {resp.status_code}: {resp.text}"
        )


# ---------------------------------------------------------------------------
# BB15 — Payslip Data Validation
# ---------------------------------------------------------------------------

class TestBB15PayslipDataValidation:
    """
    BB15: Payslip Data Validation

    NOTE: The Salary Pro backend has NO PDF generation endpoint.
    This test validates the salary history data returned by
    GET /api/salary/:employeeId — the exact data the frontend renders
    as a payslip. Claiming to test PDF generation would be dishonest.

    Endpoint: GET /api/salary/:employeeId  → JSON array of salary records

    Assertions:
    - HTTP 200 with a JSON array
    - Each record carries all payslip-relevant fields
    - A record created with BB14's deterministic inputs is retrievable with
      the correct netSalary (52 500), totalDeductions (2 500) and all fields
    - An employee with no salary history returns an empty array (not 404)
    """

    _INPUTS = {
        "basicSalary": 50_000,
        "bonus": 5_000,
        "taxDeduction": 2_000,
        "lateMarkDeduction": 500,
    }
    _EXPECTED_NET = 52_500
    _EXPECTED_DEDUCTIONS = 2_500

    def test_salary_history_returns_200_array(self, auth_api_client):
        token = _get_auth_token(auth_api_client, "admin")
        emp = _unique_employee()
        headers = {"Authorization": f"Bearer {token}"}

        # Create a salary record first
        auth_api_client.post(
            "/api/salary/calculate",
            json={"employeeId": emp["employeeId"], **self._INPUTS},
            headers=headers,
        )

        resp = auth_api_client.get(
            f"/api/salary/{emp['employeeId']}",
            headers=headers,
        )

        assert resp.status_code == 200, (
            f"[BB15] Expected 200, got {resp.status_code}: {resp.text}"
        )
        assert isinstance(resp.json(), list), "[BB15] Salary history should be a JSON array"

    def test_payslip_record_has_all_required_fields(self, auth_api_client):
        """Each salary record must carry the fields needed to render a payslip."""
        token = _get_auth_token(auth_api_client, "admin")
        emp = _unique_employee()
        headers = {"Authorization": f"Bearer {token}"}

        auth_api_client.post(
            "/api/salary/calculate",
            json={"employeeId": emp["employeeId"], **self._INPUTS},
            headers=headers,
        )

        resp = auth_api_client.get(f"/api/salary/{emp['employeeId']}", headers=headers)
        assert resp.status_code == 200, f"[BB15b] {resp.text}"
        records = resp.json()
        assert len(records) >= 1, "[BB15b] Should have at least one salary record"

        required_fields = (
            "_id", "employeeId", "basicSalary", "bonus",
            "taxDeduction", "lateMarkDeduction",
            "totalDeductions", "netSalary", "createdAt",
        )
        for field in required_fields:
            assert field in records[0], (
                f"[BB15b] Payslip record missing required field '{field}': {records[0]}"
            )

    def test_retrieved_net_salary_matches_expected(self, auth_api_client):
        """netSalary stored and retrieved via history must equal 52 500."""
        token = _get_auth_token(auth_api_client, "admin")
        emp = _unique_employee()
        headers = {"Authorization": f"Bearer {token}"}

        create_resp = auth_api_client.post(
            "/api/salary/calculate",
            json={"employeeId": emp["employeeId"], **self._INPUTS},
            headers=headers,
        )
        assert create_resp.status_code == 201, f"[BB15c setup] {create_resp.text}"
        created_id = create_resp.json()["_id"]

        history_resp = auth_api_client.get(
            f"/api/salary/{emp['employeeId']}", headers=headers
        )
        assert history_resp.status_code == 200, f"[BB15c] {history_resp.text}"
        records_by_id = {r["_id"]: r for r in history_resp.json()}

        assert created_id in records_by_id, (
            "[BB15c] Created salary record not found in history"
        )
        record = records_by_id[created_id]
        assert record["netSalary"] == self._EXPECTED_NET, (
            f"[BB15c] Retrieved netSalary={record['netSalary']}, "
            f"expected {self._EXPECTED_NET}"
        )
        assert record["totalDeductions"] == self._EXPECTED_DEDUCTIONS, (
            f"[BB15c] Retrieved totalDeductions={record['totalDeductions']}, "
            f"expected {self._EXPECTED_DEDUCTIONS}"
        )

    def test_no_salary_history_returns_empty_array(self, auth_api_client):
        """GET /api/salary/:id for an employee with no records returns [] not 404."""
        token = _get_auth_token(auth_api_client, "admin")
        emp = _unique_employee()   # salary never calculated

        resp = auth_api_client.get(
            f"/api/salary/{emp['employeeId']}",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert resp.status_code == 200, (
            f"[BB15d] Expected 200 for no-history employee, "
            f"got {resp.status_code}: {resp.text}"
        )
        assert resp.json() == [], (
            f"[BB15d] Expected empty array, got: {resp.json()}"
        )
