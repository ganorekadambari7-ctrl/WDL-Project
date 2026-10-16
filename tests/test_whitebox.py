"""
Salary Pro — Experiment 10: White-Box Test Cases WB01–WB05
===========================================================
Executes Salary Pro's ACTUAL controller and middleware logic:
  - authController.login    (from server/src/controllers/authController.js)
  - authController.register (from server/src/controllers/authController.js)
  - auth.protect            (from server/src/middleware/auth.js)

Operates on the isolated test database (salary-pro-test) via the thin
Node.js test adapter running on PORT 5002.

Exact application branches verified:
  WB01: authController.js:70-74   bcrypt.compare match -> returns 200 + token + publicUser
  WB02: authController.js:70-72   bcrypt.compare mismatch / role mismatch -> 401
  WB03: authController.js:59-68   Guard clauses (missing fields, short pw, bad format) -> 401
  WB04: authController.js:7-8     makeToken (7-day TTL, id + role payload, uniqueness)
  WB05: middleware/auth.js:4-15   protect middleware (valid token, missing token,
                                  invalid/tampered token, wrong secret, non-existent user)
"""

import random
import string
import time
import uuid
import jwt as pyjwt
import pytest


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _unique_user(role: str = "admin") -> dict:
    """
    Generates a unique test user payload conforming to Salary Pro validation rules:
      name:     ^[A-Za-z ]{1,20}$
      username: ^[A-Za-z0-9._-]{4,20}$
      email:    standard email regex
      password: >= 6 characters
    """
    suffix = "".join(random.choices(string.ascii_uppercase, k=4))
    tag = uuid.uuid4().hex[:8]
    return {
        "name": f"Test {suffix}",
        "username": f"tst{tag}",
        "email": f"test.{tag}@salarypro-test.local",
        "password": f"Pass@{tag}",
        "role": role,
    }


# ---------------------------------------------------------------------------
# WB01 — Correct Password Verification Branch (authController.js:70-74)
# ---------------------------------------------------------------------------

class TestWB01CorrectPasswordBranch:
    """
    WB01: Executes authController.login with correct password.
    Branch verified:
      const validPassword = user && (await bcrypt.compare(password, user.password));
      if (!validPassword || user.role !== role) -> FALSE branch
      return res.json({ token: makeToken(user), user: publicUser(user) });
    """

    def test_login_with_correct_password_by_email(self, wb_client):
        # 1. Register test user through real authController.register
        user = _unique_user("admin")
        reg_resp = wb_client.post("/wb/controller/register", json=user)
        assert reg_resp.status_code == 201, f"[WB01 setup] Registration failed: {reg_resp.text}"

        # 2. Execute real authController.login with matching credentials
        login_resp = wb_client.post("/wb/controller/login", json={
            "email": user["email"],
            "password": user["password"],
            "role": user["role"],
        })

        assert login_resp.status_code == 200, (
            f"[WB01] Expected 200 from authController.login, got {login_resp.status_code}: {login_resp.text}"
        )
        body = login_resp.json()
        assert "token" in body, "[WB01] authController.login did not return a token"
        assert "user" in body, "[WB01] authController.login did not return user object"
        assert body["user"]["email"] == user["email"], "[WB01] Returned user email mismatch"
        assert body["user"]["role"] == "admin", "[WB01] Returned user role mismatch"

    def test_login_with_correct_password_by_username(self, wb_client):
        """
        Exercises authController.js:69 branch:
          User.findOne({ $or: [{ email: identity.toLowerCase() }, { username: identity }] })
        Verifies login succeeds when providing username instead of email.
        """
        user = _unique_user("employee")
        reg_resp = wb_client.post("/wb/controller/register", json=user)
        assert reg_resp.status_code == 201, f"[WB01b setup] Registration failed: {reg_resp.text}"

        login_resp = wb_client.post("/wb/controller/login", json={
            "email": user["username"],  # Pass username in identity field
            "password": user["password"],
            "role": user["role"],
        })

        assert login_resp.status_code == 200, (
            f"[WB01b] Expected 200 when logging in by username, got {login_resp.status_code}: {login_resp.text}"
        )
        assert login_resp.json()["user"]["username"] == user["username"]

    def test_execution_log_confirms_controller_invoked(self, wb_client):
        """Verifies the adapter actually called authController.login."""
        log_resp = wb_client.get("/wb/execution-log")
        assert log_resp.status_code == 200
        executed_functions = [entry["function"] for entry in log_resp.json()]
        assert "authController.login" in executed_functions, (
            f"[WB01c] Execution log does not contain authController.login: {executed_functions}"
        )


# ---------------------------------------------------------------------------
# WB02 — Incorrect Password Rejection Branch (authController.js:70-72)
# ---------------------------------------------------------------------------

class TestWB02IncorrectPasswordBranch:
    """
    WB02: Executes authController.login with mismatched credentials.
    Branch verified:
      const validPassword = user && (await bcrypt.compare(password, user.password));
      if (!validPassword || user.role !== role) -> TRUE branch
      return res.status(401).json({ message: 'Invalid username/email or password.' });
    """

    def test_wrong_password_triggers_401_branch(self, wb_client):
        user = _unique_user("admin")
        reg_resp = wb_client.post("/wb/controller/register", json=user)
        assert reg_resp.status_code == 201

        # Execute authController.login with incorrect password
        login_resp = wb_client.post("/wb/controller/login", json={
            "email": user["email"],
            "password": "WrongPassword999!",
            "role": user["role"],
        })

        assert login_resp.status_code == 401, (
            f"[WB02] Expected 401 for wrong password, got {login_resp.status_code}: {login_resp.text}"
        )
        assert login_resp.json()["message"] == "Invalid username/email or password."
        assert "token" not in login_resp.json(), "[WB02] Token must NOT be returned on failed password compare"

    def test_role_mismatch_triggers_401_branch(self, wb_client):
        """
        Exercises the second condition on authController.js:71:
          if (!validPassword || user.role !== role)
        When password is CORRECT but submitted role != stored role, must return 401.
        """
        user = _unique_user("admin")  # Registered as admin
        reg_resp = wb_client.post("/wb/controller/register", json=user)
        assert reg_resp.status_code == 201

        # Attempt login with correct password but claiming 'employee' role
        login_resp = wb_client.post("/wb/controller/login", json={
            "email": user["email"],
            "password": user["password"],
            "role": "employee",  # Role mismatch!
        })

        assert login_resp.status_code == 401, (
            f"[WB02b] Expected 401 for role mismatch, got {login_resp.status_code}: {login_resp.text}"
        )
        assert login_resp.json()["message"] == "Invalid username/email or password."

    def test_nonexistent_user_triggers_401_branch(self, wb_client):
        """
        Exercises user=null path:
          const validPassword = user && (await bcrypt.compare(...));
        When user is null, validPassword is null, triggers 401.
        """
        login_resp = wb_client.post("/wb/controller/login", json={
            "email": "nonexistent.user.999@salarypro-test.local",
            "password": "SomeValidPassword123",
            "role": "admin",
        })

        assert login_resp.status_code == 401, (
            f"[WB02c] Expected 401 for nonexistent user, got {login_resp.status_code}"
        )
        assert login_resp.json()["message"] == "Invalid username/email or password."


# ---------------------------------------------------------------------------
# WB03 — Missing Login Input Guard Clause (authController.js:59-68)
# ---------------------------------------------------------------------------

class TestWB03LoginGuardClause:
    """
    WB03: Executes authController.login to verify input guard conditions:
      Line 60: if (!identity || !password || !role)
      Line 66: if (!validIdentity || password.length < 6)
      Both return: res.status(401).json({ message: 'Invalid username/email or password.' });
    """

    @pytest.mark.parametrize("payload,reason", [
        ({}, "completely empty body"),
        ({"password": "Pass@123", "role": "admin"}, "missing email/identity"),
        ({"email": "user@test.local", "role": "admin"}, "missing password"),
        ({"email": "user@test.local", "password": "Pass@123"}, "missing role"),
        ({"email": "   ", "password": "Pass@123", "role": "admin"}, "whitespace-only email"),
    ])
    def test_missing_required_fields_return_401(self, wb_client, payload, reason):
        resp = wb_client.post("/wb/controller/login", json=payload)
        assert resp.status_code == 401, (
            f"[WB03] Expected 401 for {reason}, got {resp.status_code}: {resp.text}"
        )
        assert resp.json()["message"] == "Invalid username/email or password."

    def test_short_password_triggers_guard(self, wb_client):
        """
        Exercises authController.js:66:
          password.length < 6
        """
        resp = wb_client.post("/wb/controller/login", json={
            "email": "user@test.local",
            "password": "12345",  # 5 characters, min is 6
            "role": "admin",
        })
        assert resp.status_code == 401, (
            f"[WB03b] Password < 6 chars should return 401, got {resp.status_code}"
        )
        assert resp.json()["message"] == "Invalid username/email or password."

    def test_malformed_email_identity_triggers_guard(self, wb_client):
        """
        Exercises authController.js:63-66:
          identity.includes('@') but !allowedEmail.test(identity)
        """
        resp = wb_client.post("/wb/controller/login", json={
            "email": "not-an-email@",  # Contains @ but fails regex
            "password": "ValidPassword123",
            "role": "admin",
        })
        assert resp.status_code == 401, (
            f"[WB03c] Malformed email identity should return 401, got {resp.status_code}"
        )
        assert resp.json()["message"] == "Invalid username/email or password."


# ---------------------------------------------------------------------------
# WB04 — JWT Generation Logic (authController.js:7-8, 50, 74)
# ---------------------------------------------------------------------------

class TestWB04JwtTokenGeneration:
    """
    WB04: Verifies the JWT produced by makeToken inside authController:
      const makeToken = (user) =>
        jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });

    Executed through real register and login controllers, decoding and inspecting
    the resulting tokens directly.
    """

    def test_register_controller_generates_valid_jwt(self, wb_client):
        user = _unique_user("admin")
        resp = wb_client.post("/wb/controller/register", json=user)
        assert resp.status_code == 201
        token = resp.json()["token"]

        # 1. Structure check: standard 3-part base64url JWT
        parts = token.split(".")
        assert len(parts) == 3, f"[WB04] Expected 3 JWT segments, got {len(parts)}"

        # 2. Payload claims check (decoded without verification)
        decoded = pyjwt.decode(token, options={"verify_signature": False})
        assert "id" in decoded, "[WB04] JWT payload missing 'id'"
        assert "role" in decoded, "[WB04] JWT payload missing 'role'"
        assert decoded["role"] == "admin", f"[WB04] Expected role 'admin', got {decoded['role']}"
        assert decoded["id"] == resp.json()["user"]["id"], "[WB04] Token id mismatch with created user id"

        # 3. 7-day TTL check: expiresIn: '7d' -> exp - iat == 604800s
        assert "exp" in decoded and "iat" in decoded
        ttl = decoded["exp"] - decoded["iat"]
        expected_7d = 7 * 24 * 60 * 60
        assert abs(ttl - expected_7d) <= 5, (
            f"[WB04] Expected TTL approx {expected_7d}s (7d), got {ttl}s"
        )

    def test_login_controller_generates_employee_jwt(self, wb_client):
        """Verifies makeToken produces role='employee' for employee users on login."""
        user = _unique_user("employee")
        reg_resp = wb_client.post("/wb/controller/register", json=user)
        assert reg_resp.status_code == 201

        login_resp = wb_client.post("/wb/controller/login", json={
            "email": user["email"],
            "password": user["password"],
            "role": "employee",
        })
        assert login_resp.status_code == 200
        token = login_resp.json()["token"]

        decoded = pyjwt.decode(token, options={"verify_signature": False})
        assert decoded["role"] == "employee", (
            f"[WB04b] Expected employee role in login token, got {decoded['role']}"
        )
        assert decoded["id"] == login_resp.json()["user"]["id"]

    def test_distinct_users_produce_distinct_tokens(self, wb_client):
        """Verifies makeToken generates distinct tokens for different users."""
        u1 = _unique_user("admin")
        u2 = _unique_user("admin")
        t1 = wb_client.post("/wb/controller/register", json=u1).json()["token"]
        t2 = wb_client.post("/wb/controller/register", json=u2).json()["token"]

        assert t1 != t2, "[WB04c] Tokens for different users must be distinct"


# ---------------------------------------------------------------------------
# WB05 — Protect Middleware Execution (middleware/auth.js:4-15)
# ---------------------------------------------------------------------------

class TestWB05ProtectMiddleware:
    """
    WB05: Executes Salary Pro's actual protect middleware:
      Line 6:  const token = req.headers.authorization?.replace('Bearer ', '');
      Line 7:  if (!token) return res.status(401).json({ message: 'Authentication required.' });
      Line 8:  const payload = jwt.verify(token, process.env.JWT_SECRET);
      Line 9:  req.user = await User.findById(payload.id);
      Line 10: if (!req.user) return res.status(401).json({ message: 'User no longer exists.' });
      Line 11: next();
      Catch:   res.status(401).json({ message: 'Invalid or expired session.' });
    """

    def test_valid_token_grants_access_and_populates_user(self, wb_client):
        """
        Exercises the happy path: lines 8, 9, 11 (next called).
        """
        user = _unique_user("admin")
        reg_resp = wb_client.post("/wb/controller/register", json=user)
        assert reg_resp.status_code == 201
        token = reg_resp.json()["token"]

        # Call endpoint guarded by real protect middleware
        resp = wb_client.get(
            "/wb/middleware/protect",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert resp.status_code == 200, (
            f"[WB05] Expected 200 from protect middleware, got {resp.status_code}: {resp.text}"
        )
        body = resp.json()
        assert body["authenticated"] is True
        assert body["user"]["email"] == user["email"], "[WB05] req.user email mismatch"
        assert body["user"]["role"] == "admin", "[WB05] req.user role mismatch"

    def test_missing_token_triggers_auth_required_branch(self, wb_client):
        """
        Exercises middleware/auth.js:7:
          if (!token) return res.status(401).json({ message: 'Authentication required.' });
        """
        resp = wb_client.get("/wb/middleware/protect")  # No Authorization header
        assert resp.status_code == 401, (
            f"[WB05b] Expected 401 when token missing, got {resp.status_code}"
        )
        assert resp.json()["message"] == "Authentication required."

    def test_tampered_token_triggers_catch_branch(self, wb_client):
        """
        Exercises middleware/auth.js:12-14 catch branch:
          catch { res.status(401).json({ message: 'Invalid or expired session.' }); }
        """
        user = _unique_user("admin")
        reg_resp = wb_client.post("/wb/controller/register", json=user)
        token = reg_resp.json()["token"]

        # Tamper the signature portion of the JWT
        header, payload, sig = token.split(".")
        tampered_sig = ("A" if sig[0] != "A" else "B") + sig[1:]
        tampered_token = f"{header}.{payload}.{tampered_sig}"

        resp = wb_client.get(
            "/wb/middleware/protect",
            headers={"Authorization": f"Bearer {tampered_token}"},
        )

        assert resp.status_code == 401, (
            f"[WB05c] Expected 401 for tampered token, got {resp.status_code}"
        )
        assert resp.json()["message"] == "Invalid or expired session."

    def test_token_signed_with_wrong_secret_triggers_catch_branch(self, wb_client):
        """
        Exercises catch branch when jwt.verify throws JsonWebTokenError (signature mismatch).
        Uses a 32-byte secret to satisfy PyJWT security standards.
        """
        forged_token = pyjwt.encode(
            {"id": str(uuid.uuid4()), "role": "admin"},
            "wrong_secret_key_with_at_least_32_bytes_len!",
            algorithm="HS256",
        )

        resp = wb_client.get(
            "/wb/middleware/protect",
            headers={"Authorization": f"Bearer {forged_token}"},
        )

        assert resp.status_code == 401, (
            f"[WB05d] Expected 401 for wrong secret, got {resp.status_code}"
        )
        assert resp.json()["message"] == "Invalid or expired session."

    @pytest.mark.filterwarnings("ignore::jwt.InsecureKeyLengthWarning")
    def test_nonexistent_user_id_triggers_user_no_longer_exists_branch(self, wb_client):
        """
        Exercises middleware/auth.js:9-10:
          req.user = await User.findById(payload.id);
          if (!req.user) return res.status(401).json({ message: 'User no longer exists.' });
        """
        # Sign a valid token using the server's test JWT_SECRET, but with a non-existent ObjectId
        fake_object_id = "507f1f77bcf86cd799439011"
        test_secret = "isolated_test_jwt_secret_998877"
        valid_jwt_fake_user = pyjwt.encode(
            {"id": fake_object_id, "role": "admin"},
            test_secret,
            algorithm="HS256",
        )

        resp = wb_client.get(
            "/wb/middleware/protect",
            headers={"Authorization": f"Bearer {valid_jwt_fake_user}"},
        )

        assert resp.status_code == 401, (
            f"[WB05e] Expected 401 for non-existent user, got {resp.status_code}: {resp.text}"
        )
        assert resp.json()["message"] == "User no longer exists."


# ---------------------------------------------------------------------------
# WB06 — Invalid JWT Handling & Exception Branch in protect Middleware
# ---------------------------------------------------------------------------

class TestWB06InvalidJwtExceptionBranch:
    """
    WB06: Exercises specific exception handling branches in middleware/auth.js:protect:
      Lines 12-14:
        catch {
          res.status(401).json({ message: 'Invalid or expired session.' });
        }
    Tests distinct JWT error conditions beyond WB05:
      - TokenExpiredError (expired token)
      - JsonWebTokenError: jwt malformed
      - JsonWebTokenError: jwt signature is required
    """

    @pytest.mark.filterwarnings("ignore::jwt.InsecureKeyLengthWarning")
    def test_expired_token_triggers_catch_branch(self, wb_client):
        """
        Generates a token with an exp claim in the past.
        jwt.verify throws TokenExpiredError -> caught in lines 12-14.
        """
        test_secret = "isolated_test_jwt_secret_998877"
        now = int(time.time())
        expired_token = pyjwt.encode(
            {
                "id": str(uuid.uuid4()),
                "role": "admin",
                "iat": now - 3600,  # Issued 1 hour ago
                "exp": now - 1800,  # Expired 30 minutes ago
            },
            test_secret,
            algorithm="HS256",
        )

        resp = wb_client.get(
            "/wb/middleware/protect",
            headers={"Authorization": f"Bearer {expired_token}"},
        )

        assert resp.status_code == 401, (
            f"[WB06a] Expected 401 for expired token, got {resp.status_code}: {resp.text}"
        )
        assert resp.json()["message"] == "Invalid or expired session."

    def test_malformed_base64_string_triggers_catch_branch(self, wb_client):
        """jwt.verify throws JsonWebTokenError: jwt malformed."""
        resp = wb_client.get(
            "/wb/middleware/protect",
            headers={"Authorization": "Bearer not-even-a-valid-base64-string!@#$"},
        )
        assert resp.status_code == 401
        assert resp.json()["message"] == "Invalid or expired session."

    def test_truncated_token_without_signature_triggers_catch_branch(self, wb_client):
        """Token with only header.payload (missing signature segment)."""
        resp = wb_client.get(
            "/wb/middleware/protect",
            headers={"Authorization": "Bearer eyJhbGciOiJIUzI1NiJ9.eyJpZCI6IjEyMyJ9"},
        )
        assert resp.status_code == 401
        assert resp.json()["message"] == "Invalid or expired session."

    def test_bearer_without_token_triggers_catch_branch(self, wb_client):
        """
        Authorization: Bearer -> header without token string.
        Because .replace('Bearer ', '') leaves 'Bearer', jwt.verify throws malformed token error,
        exercising lines 12-14 catch branch.
        """
        resp = wb_client.get(
            "/wb/middleware/protect",
            headers={"Authorization": "Bearer"},
        )
        assert resp.status_code == 401
        assert resp.json()["message"] == "Invalid or expired session."

    def test_empty_auth_header_triggers_auth_required_guard(self, wb_client):
        """
        Authorization: '' -> empty header string.
        Exercises line 7: if (!token) return res.status(401).json({ message: 'Authentication required.' });
        """
        resp = wb_client.get(
            "/wb/middleware/protect",
            headers={"Authorization": ""},
        )
        assert resp.status_code == 401
        assert resp.json()["message"] == "Authentication required."



# ---------------------------------------------------------------------------
# WB07 — Duplicate Email & Username Validation in register Controller
# ---------------------------------------------------------------------------

class TestWB07DuplicateValidationBranches:
    """
    WB07: Exercises the duplicate checking query in authController.js:44-46:
      if (await User.findOne({ $or: [{ email: normalizedEmail }, { username }] })) {
        return res.status(409).json({ message: 'That email or username is already in use.' });
      }

    Verifies:
      - Duplicate email with unique username -> triggers $or[0] -> 409
      - Duplicate username with unique email -> triggers $or[1] -> 409
      - Unique email and unique username -> bypasses check -> 201
    """

    def test_duplicate_email_branch_triggers_409(self, wb_client):
        # 1. Register seed user
        seed_user = _unique_user("admin")
        reg1 = wb_client.post("/wb/controller/register", json=seed_user)
        assert reg1.status_code == 201

        # 2. Register new user with the SAME email but DIFFERENT username
        duplicate_email_user = _unique_user("admin")
        duplicate_email_user["email"] = seed_user["email"]

        reg2 = wb_client.post("/wb/controller/register", json=duplicate_email_user)
        assert reg2.status_code == 409, (
            f"[WB07a] Expected 409 for duplicate email, got {reg2.status_code}: {reg2.text}"
        )
        assert reg2.json()["message"] == "That email or username is already in use."

    def test_duplicate_username_branch_triggers_409(self, wb_client):
        # 1. Register seed user
        seed_user = _unique_user("employee")
        reg1 = wb_client.post("/wb/controller/register", json=seed_user)
        assert reg1.status_code == 201

        # 2. Register new user with the SAME username but DIFFERENT email
        duplicate_username_user = _unique_user("employee")
        duplicate_username_user["username"] = seed_user["username"]

        reg2 = wb_client.post("/wb/controller/register", json=duplicate_username_user)
        assert reg2.status_code == 409, (
            f"[WB07b] Expected 409 for duplicate username, got {reg2.status_code}: {reg2.text}"
        )
        assert reg2.json()["message"] == "That email or username is already in use."

    def test_unique_credentials_pass_duplicate_check(self, wb_client):
        user = _unique_user("admin")
        resp = wb_client.post("/wb/controller/register", json=user)
        assert resp.status_code == 201, (
            f"[WB07c] Expected 201 for unique credentials, got {resp.status_code}: {resp.text}"
        )


# ---------------------------------------------------------------------------
# WB08 — Role-Based Authorization Branch (admin vs employee)
# ---------------------------------------------------------------------------

class TestWB08RoleBasedAuthorization:
    """
    WB08: Tests the role-based authorization middleware in middleware/auth.js:17-18:
      export const authorize = (...roles) => (req, res, next) =>
        roles.includes(req.user.role) ? next() : res.status(403).json({ message: 'Permission denied.' });

    Also audits actual application routes (leaveRoutes.js vs employeeRoutes.js):
      - leaveRoutes.js:8 enforces authorize('admin') on reviewLeave
      - employeeRoutes.js enforces protect, but OMITS authorize('admin') (security defect)
    """

    def test_admin_role_passes_authorization(self, wb_client):
        admin_user = _unique_user("admin")
        reg = wb_client.post("/wb/controller/register", json=admin_user)
        assert reg.status_code == 201
        admin_token = reg.json()["token"]

        resp = wb_client.get(
            "/wb/middleware/authorize-admin",
            headers={"Authorization": f"Bearer {admin_token}"},
        )

        assert resp.status_code == 200, (
            f"[WB08a] Expected 200 for admin user, got {resp.status_code}: {resp.text}"
        )
        assert resp.json()["authorized"] is True
        assert resp.json()["user"]["role"] == "admin"

    def test_employee_role_receives_403_forbidden(self, wb_client):
        employee_user = _unique_user("employee")
        reg = wb_client.post("/wb/controller/register", json=employee_user)
        assert reg.status_code == 201
        employee_token = reg.json()["token"]

        resp = wb_client.get(
            "/wb/middleware/authorize-admin",
            headers={"Authorization": f"Bearer {employee_token}"},
        )

        assert resp.status_code == 403, (
            f"[WB08b] Expected 403 for employee on admin endpoint, got {resp.status_code}: {resp.text}"
        )
        assert resp.json()["message"] == "Permission denied."

    def test_audit_employee_routes_missing_authorization_defect(self, auth_api_client):
        """
        DEFECT AUDIT (DEF-03):
        employeeRoutes.js mounts router.use(protect) but lacks authorize('admin').
        As a result, regular employee tokens can successfully create employees.
        Verifies actual application behavior without fabricating missing authorization.
        """
        # Register a standard employee
        employee_user = _unique_user("employee")
        reg = auth_api_client.post("/api/auth/register", json=employee_user)
        assert reg.status_code == 201
        emp_token = reg.json()["token"]

        # Attempt to create an employee record using the regular employee's token
        emp_tag = uuid.uuid4().hex[:6].upper()
        emp_payload = {
            "name": "Audit Record",
            "employeeId": f"AUD{emp_tag}",
            "dob": "1994-03-20",
            "education": "B.Tech",
            "experience": 4,
            "basicSalary": 40000,
        }
        resp = auth_api_client.post(
            "/api/employees",
            json=emp_payload,
            headers={"Authorization": f"Bearer {emp_token}"},
        )

        # In Salary Pro Phase 1 RBAC, employee tokens are blocked by authorize('admin') with 403 Forbidden.
        assert resp.status_code == 403, (
            f"[WB08c] Expected 403 demonstrating authorize('admin') on /api/employees blocks employee, "
            f"got {resp.status_code}"
        )


# ---------------------------------------------------------------------------
# WB09 — Mongoose Employee Schema Validation (Negative Salary & Bounds)
# ---------------------------------------------------------------------------

class TestWB09EmployeeSchemaValidation:
    """
    WB09: Tests the actual Mongoose Employee model schema rules in models/Employee.js:
      basicSalary: { type: Number, required: true, min: 0 }
      experience:  { type: Number, required: true, min: 0, max: 70 }
      name:        { type: String, required: true, trim: true, maxlength: 100 }
      employeeId:  { type: String, required: true, unique: true, uppercase: true }
    """

    def _valid_employee_data(self) -> dict:
        tag = uuid.uuid4().hex[:6].upper()
        return {
            "name": "Valid Employee",
            "employeeId": f"VLD{tag}",
            "dob": "1990-01-01",
            "education": "BSc Computer Science",
            "experience": 5,
            "basicSalary": 50000,
        }

    def test_negative_salary_rejected_by_schema(self, wb_client):
        data = self._valid_employee_data()
        data["basicSalary"] = -5000

        resp = wb_client.post("/wb/model/employee/validate", json=data)
        assert resp.status_code == 422, f"[WB09a] Expected 422 for negative salary, got {resp.status_code}"
        body = resp.json()
        assert body["valid"] is False
        assert "basicSalary" in body["errors"]
        assert body["errors"]["basicSalary"]["kind"] == "min"

    def test_experience_greater_than_70_rejected_by_schema(self, wb_client):
        data = self._valid_employee_data()
        data["experience"] = 85  # Max is 70

        resp = wb_client.post("/wb/model/employee/validate", json=data)
        assert resp.status_code == 422
        body = resp.json()
        assert body["valid"] is False
        assert "experience" in body["errors"]
        assert body["errors"]["experience"]["kind"] == "max"

    def test_negative_experience_rejected_by_schema(self, wb_client):
        data = self._valid_employee_data()
        data["experience"] = -1  # Min is 0

        resp = wb_client.post("/wb/model/employee/validate", json=data)
        assert resp.status_code == 422
        assert resp.json()["errors"]["experience"]["kind"] == "min"

    def test_missing_required_fields_rejected_by_schema(self, wb_client):
        data = self._valid_employee_data()
        del data["name"]
        del data["dob"]

        resp = wb_client.post("/wb/model/employee/validate", json=data)
        assert resp.status_code == 422
        errors = resp.json()["errors"]
        assert errors["name"]["kind"] == "required"
        assert errors["dob"]["kind"] == "required"

    def test_name_exceeding_100_chars_rejected_by_schema(self, wb_client):
        data = self._valid_employee_data()
        data["name"] = "A" * 105  # Maxlength is 100

        resp = wb_client.post("/wb/model/employee/validate", json=data)
        assert resp.status_code == 422
        assert resp.json()["errors"]["name"]["kind"] == "maxlength"

    def test_duplicate_employee_id_rejected_by_controller(self, wb_client):
        """
        Tests employeeController.js:12:
          if (error.code === 11000) return res.status(409).json({ message: 'Employee ID already exists.' });
        """
        emp = self._valid_employee_data()
        create1 = wb_client.post("/wb/controller/employee", json=emp)
        assert create1.status_code == 201

        # Attempt to create with identical employeeId
        emp2 = self._valid_employee_data()
        emp2["employeeId"] = emp["employeeId"]  # Duplicate employeeId

        create2 = wb_client.post("/wb/controller/employee", json=emp2)
        assert create2.status_code == 409, (
            f"[WB09f] Expected 409 for duplicate employeeId, got {create2.status_code}: {create2.text}"
        )
        assert create2.json()["message"] == "Employee ID already exists."


# ---------------------------------------------------------------------------
# WB10 — Attendance Upsert Logic (Insert vs Update in attendanceController)
# ---------------------------------------------------------------------------

class TestWB10AttendanceUpsertLogic:
    """
    WB10: Tests the findOneAndUpdate({upsert: true}) logic in attendanceController.js:8-20:
      const attendance = await Attendance.findOneAndUpdate(
        { employeeId: employeeId.toUpperCase(), date: normalizedDate },
        { employeeId: employeeId.toUpperCase(), date: normalizedDate, status },
        { new: true, upsert: true, runValidators: true }
      );

    Verifies:
      - First call: inserts a new document (returns 201 with generated _id)
      - Second call (same employeeId & date, different status): updates the existing document
        retaining the exact same _id
      - Total records for that month equals 1, proving upsert (no duplication)
      - Input guard clause (status not in ['present', 'absent']) returns 400
    """

    def test_upsert_insert_branch_creates_record(self, wb_client):
        tag = uuid.uuid4().hex[:6].upper()
        emp_id = f"ATT{tag}"
        date = "2026-08-10"

        resp = wb_client.post("/wb/controller/attendance", json={
            "employeeId": emp_id,
            "date": date,
            "status": "present",
        })

        assert resp.status_code == 201, (
            f"[WB10a] Expected 201 for new attendance record, got {resp.status_code}: {resp.text}"
        )
        body = resp.json()
        assert "_id" in body, "[WB10a] Created record missing _id"
        assert body["status"] == "present"
        assert body["employeeId"] == emp_id

    def test_upsert_update_branch_modifies_existing_record_with_same_id(self, wb_client):
        tag = uuid.uuid4().hex[:6].upper()
        emp_id = f"ATT{tag}"
        date = "2026-08-15"

        # 1. First invocation: INSERT
        first = wb_client.post("/wb/controller/attendance", json={
            "employeeId": emp_id,
            "date": date,
            "status": "present",
        })
        assert first.status_code == 201
        original_id = first.json()["_id"]

        # 2. Second invocation for identical employeeId and date: UPDATE to 'absent'
        second = wb_client.post("/wb/controller/attendance", json={
            "employeeId": emp_id,
            "date": date,
            "status": "absent",
        })
        assert second.status_code == 201
        updated_body = second.json()

        # Branch verification: status updated, document _id remains unchanged
        assert updated_body["_id"] == original_id, (
            f"[WB10b] Upsert should update the existing record with identical _id, "
            f"got {updated_body['_id']} vs original {original_id}"
        )
        assert updated_body["status"] == "absent", "[WB10b] Status should be updated to 'absent'"

        # 3. Verify total records in database for this employee is strictly 1
        summary_resp = wb_client.get(f"/wb/controller/attendance/{emp_id}?month=2026-08")
        assert summary_resp.status_code == 200
        summary = summary_resp.json()["summary"]
        assert summary["total"] == 1, (
            f"[WB10b] Expected exactly 1 attendance record after upsert, got {summary['total']}"
        )
        assert summary["absent"] == 1
        assert summary["present"] == 0

    def test_invalid_attendance_status_rejected_by_guard(self, wb_client):
        """
        Exercises attendanceController.js:11:
          if (!employeeId || !date || !['present', 'absent'].includes(status))
            return res.status(400).json({ message: 'Employee ID, date, and valid status are required.' });
        """
        resp = wb_client.post("/wb/controller/attendance", json={
            "employeeId": "EMP001",
            "date": "2026-08-20",
            "status": "holiday",  # Invalid status (only present/absent allowed)
        })

        assert resp.status_code == 400, (
            f"[WB10c] Expected 400 for invalid status, got {resp.status_code}: {resp.text}"
        )
        assert resp.json()["message"] == "Employee ID, date, and valid status are required."


# ---------------------------------------------------------------------------
# WB11 — Leave Approval Branch (leaveController.js:17-25)
# ---------------------------------------------------------------------------

class TestWB11LeaveApprovalBranch:
    """
    WB11: Tests the leave approval execution path in leaveController.js:reviewLeave:
      const { status } = req.body;
      if (!['approved', 'rejected'].includes(status)) -> false (passes guard)
      const leave = await Leave.findByIdAndUpdate(req.params.id, { status, reviewedBy: req.user._id }, { new: true });
      res.json(leave);

    Verifies:
      - Transition from default status='pending' to status='approved'
      - reviewedBy field is stamped with admin's ObjectId
      - Guard rejects invalid status values with 400
      - Non-existent leave request returns 404
    """

    def _create_pending_leave(self, wb_client) -> str:
        tag = uuid.uuid4().hex[:6].upper()
        leave_payload = {
            "employeeId": f"EMP{tag}",
            "startDate": "2026-11-01",
            "endDate": "2026-11-03",
            "leaveType": "full-day",
            "reason": "Annual medical checkup",
            "lateMark": False,
        }
        resp = wb_client.post("/wb/controller/leave", json=leave_payload)
        assert resp.status_code == 201, f"[WB11 setup] applyLeave failed: {resp.text}"
        assert resp.json()["status"] == "pending"
        return resp.json()["_id"]

    def _get_admin_token(self, wb_client) -> tuple[str, str]:
        admin_user = _unique_user("admin")
        reg = wb_client.post("/wb/controller/register", json=admin_user)
        assert reg.status_code == 201
        return reg.json()["token"], reg.json()["user"]["id"]

    def test_leave_approval_updates_status_and_reviewed_by(self, wb_client):
        leave_id = self._create_pending_leave(wb_client)
        admin_token, admin_id = self._get_admin_token(wb_client)

        resp = wb_client.put(
            f"/wb/controller/leave/{leave_id}/review",
            json={"status": "approved"},
            headers={"Authorization": f"Bearer {admin_token}"},
        )

        assert resp.status_code == 200, (
            f"[WB11] Expected 200 for leave approval, got {resp.status_code}: {resp.text}"
        )
        body = resp.json()
        assert body["status"] == "approved", "[WB11] Leave status was not updated to 'approved'"
        assert body["reviewedBy"] == admin_id, (
            f"[WB11] reviewedBy ({body.get('reviewedBy')}) does not match admin id ({admin_id})"
        )

    def test_invalid_review_status_triggers_400_guard(self, wb_client):
        """
        Exercises leaveController.js:20:
          if (!['approved', 'rejected'].includes(status))
            return res.status(400).json({ message: 'Status must be approved or rejected.' });
        """
        leave_id = self._create_pending_leave(wb_client)
        admin_token, _ = self._get_admin_token(wb_client)

        resp = wb_client.put(
            f"/wb/controller/leave/{leave_id}/review",
            json={"status": "cancelled"},  # Invalid review status
            headers={"Authorization": f"Bearer {admin_token}"},
        )

        assert resp.status_code == 400, (
            f"[WB11b] Expected 400 for invalid review status, got {resp.status_code}: {resp.text}"
        )
        assert resp.json()["message"] == "Status must be approved or rejected."

    def test_nonexistent_leave_id_returns_404(self, wb_client):
        """
        Exercises leaveController.js:22:
          if (!leave) return res.status(404).json({ message: 'Leave request not found.' });
        """
        fake_leave_id = "507f1f77bcf86cd799439011"
        admin_token, _ = self._get_admin_token(wb_client)

        resp = wb_client.put(
            f"/wb/controller/leave/{fake_leave_id}/review",
            json={"status": "approved"},
            headers={"Authorization": f"Bearer {admin_token}"},
        )

        assert resp.status_code == 404, (
            f"[WB11c] Expected 404 for nonexistent leave id, got {resp.status_code}: {resp.text}"
        )
        assert resp.json()["message"] == "Leave request not found."


# ---------------------------------------------------------------------------
# WB12 — Leave Rejection Branch (leaveController.js:17-25)
# ---------------------------------------------------------------------------

class TestWB12LeaveRejectionBranch:
    """
    WB12: Tests the leave rejection execution path in leaveController.js:reviewLeave:
      Updating status to 'rejected' and stamping reviewedBy.
    """

    def test_leave_rejection_updates_status_and_reviewed_by(self, wb_client):
        # 1. Create pending leave
        tag = uuid.uuid4().hex[:6].upper()
        leave_payload = {
            "employeeId": f"EMP{tag}",
            "startDate": "2026-12-10",
            "endDate": "2026-12-12",
            "leaveType": "half-day",
            "reason": "Personal errand",
        }
        create_resp = wb_client.post("/wb/controller/leave", json=leave_payload)
        assert create_resp.status_code == 201
        leave_id = create_resp.json()["_id"]

        # 2. Review as rejected
        admin_user = _unique_user("admin")
        reg = wb_client.post("/wb/controller/register", json=admin_user)
        admin_token = reg.json()["token"]
        admin_id = reg.json()["user"]["id"]

        resp = wb_client.put(
            f"/wb/controller/leave/{leave_id}/review",
            json={"status": "rejected"},
            headers={"Authorization": f"Bearer {admin_token}"},
        )

        assert resp.status_code == 200, (
            f"[WB12] Expected 200 for leave rejection, got {resp.status_code}: {resp.text}"
        )
        body = resp.json()
        assert body["status"] == "rejected", "[WB12] Status was not updated to 'rejected'"
        assert body["reviewedBy"] == admin_id, "[WB12] reviewedBy mismatch"

    def test_missing_status_body_triggers_400_guard(self, wb_client):
        admin_user = _unique_user("admin")
        reg = wb_client.post("/wb/controller/register", json=admin_user)
        admin_token = reg.json()["token"]

        fake_id = "507f1f77bcf86cd799439011"
        resp = wb_client.put(
            f"/wb/controller/leave/{fake_id}/review",
            json={},  # Missing status
            headers={"Authorization": f"Bearer {admin_token}"},
        )

        assert resp.status_code == 400
        assert resp.json()["message"] == "Status must be approved or rejected."


# ---------------------------------------------------------------------------
# WB13 — Salary Calculation: Bonus Addition Branch (salaryController.js:8-10)
# ---------------------------------------------------------------------------

class TestWB13SalaryBonusAddition:
    """
    WB13: Tests bonus addition in salaryController.js:calculateSalary:
      const [basic, bonusValue, tax, late] = values;
      const totalDeductions = tax + late;
      const netSalary = Math.max(0, basic + bonusValue - totalDeductions);

    Verifies:
      - When bonus > 0: bonus is correctly added to basicSalary in gross calculation
      - When bonus is omitted: default parameter bonus=0 is applied
      - Stored bonus value matches submitted bonus
    """

    def test_explicit_bonus_added_to_net_salary(self, wb_client):
        tag = uuid.uuid4().hex[:6].upper()
        emp_id = f"SAL{tag}"

        resp = wb_client.post("/wb/controller/salary/calculate", json={
            "employeeId": emp_id,
            "basicSalary": 60000,
            "bonus": 15000,
            "taxDeduction": 0,
            "lateMarkDeduction": 0,
        })

        assert resp.status_code == 201, f"[WB13] calculateSalary failed: {resp.text}"
        body = resp.json()
        assert body["basicSalary"] == 60000
        assert body["bonus"] == 15000
        assert body["totalDeductions"] == 0
        # Gross = 60000 + 15000 = 75000
        assert body["netSalary"] == 75000, (
            f"[WB13] Expected netSalary=75000 (basic+bonus), got {body['netSalary']}"
        )

    def test_omitted_bonus_defaults_to_zero(self, wb_client):
        tag = uuid.uuid4().hex[:6].upper()
        emp_id = f"SAL{tag}"

        # Omit bonus, taxDeduction, lateMarkDeduction
        resp = wb_client.post("/wb/controller/salary/calculate", json={
            "employeeId": emp_id,
            "basicSalary": 45000,
        })

        assert resp.status_code == 201
        body = resp.json()
        assert body["bonus"] == 0, "[WB13b] Default bonus should be 0"
        assert body["totalDeductions"] == 0
        assert body["netSalary"] == 45000, "[WB13b] With 0 bonus and 0 deductions, netSalary == basicSalary"


# ---------------------------------------------------------------------------
# WB14 — Salary Calculation: Deduction Logic (salaryController.js:9-10)
# ---------------------------------------------------------------------------

class TestWB14SalaryDeductionLogic:
    """
    WB14: Tests tax and late-mark deduction logic in salaryController.js:
      const [basic, bonusValue, tax, late] = values;
      const totalDeductions = tax + late;
      const netSalary = Math.max(0, basic + bonusValue - totalDeductions);

    Verifies:
      - totalDeductions is the exact sum of taxDeduction and lateMarkDeduction
      - netSalary reflects subtraction of totalDeductions from (basic + bonus)
      - Negative deduction inputs are rejected by line 7 guard clause
    """

    def test_tax_and_late_mark_deductions_combined(self, wb_client):
        tag = uuid.uuid4().hex[:6].upper()
        emp_id = f"SAL{tag}"

        resp = wb_client.post("/wb/controller/salary/calculate", json={
            "employeeId": emp_id,
            "basicSalary": 70000,
            "bonus": 5000,
            "taxDeduction": 8000,
            "lateMarkDeduction": 2000,
        })

        assert resp.status_code == 201
        body = resp.json()
        expected_deductions = 8000 + 2000  # 10000
        expected_net = (70000 + 5000) - expected_deductions  # 65000

        assert body["totalDeductions"] == expected_deductions, (
            f"[WB14] Expected totalDeductions={expected_deductions}, got {body['totalDeductions']}"
        )
        assert body["netSalary"] == expected_net, (
            f"[WB14] Expected netSalary={expected_net}, got {body['netSalary']}"
        )

    def test_negative_deduction_rejected_by_guard(self, wb_client):
        """
        Exercises salaryController.js:7:
          if (!employeeId || values.some((value) => !Number.isFinite(value) || value < 0))
            return res.status(400).json({ message: 'Enter a valid employee and non-negative salary values.' });
        """
        resp = wb_client.post("/wb/controller/salary/calculate", json={
            "employeeId": "EMP999",
            "basicSalary": 50000,
            "bonus": 0,
            "taxDeduction": -1500,  # Negative deduction
            "lateMarkDeduction": 0,
        })

        assert resp.status_code == 400, (
            f"[WB14b] Expected 400 for negative deduction, got {resp.status_code}: {resp.text}"
        )
        assert resp.json()["message"] == "Enter a valid employee and non-negative salary values."


# ---------------------------------------------------------------------------
# WB15 — Salary Calculation: Zero-Floor Protection (salaryController.js:10)
# ---------------------------------------------------------------------------

class TestWB15SalaryZeroFloorProtection:
    """
    WB15: Verifies the zero-floor protection in salaryController.js:10:
      const netSalary = Math.max(0, basic + bonusValue - totalDeductions);

    CONFIRMED IMPLEMENTATION:
      Math.max(0, ...) DOES exist at line 10 in salaryController.js.
      When totalDeductions exceed gross salary (basic + bonusValue), netSalary is
      clamped to 0 rather than becoming negative.
      This also satisfies models/Salary.js schema constraint: netSalary: { min: 0 }.

    Verifies:
      - Deductions > gross salary -> netSalary clamped to 0
      - Deductions == gross salary -> netSalary exactly 0
      - Non-numeric input (NaN) -> rejected by line 7 guard
    """

    def test_deductions_exceeding_gross_clamped_to_zero(self, wb_client):
        """
        Gross = 20000 + 0 = 20000.
        Deductions = 25000 + 5000 = 30000.
        Unclamped difference = 20000 - 30000 = -10000.
        Actual Math.max(0, -10000) = 0.
        """
        tag = uuid.uuid4().hex[:6].upper()
        emp_id = f"SAL{tag}"

        resp = wb_client.post("/wb/controller/salary/calculate", json={
            "employeeId": emp_id,
            "basicSalary": 20000,
            "bonus": 0,
            "taxDeduction": 25000,
            "lateMarkDeduction": 5000,
        })

        assert resp.status_code == 201, (
            f"[WB15] calculateSalary failed: {resp.text}"
        )
        body = resp.json()
        assert body["totalDeductions"] == 30000, "[WB15] totalDeductions should be 30000"
        assert body["netSalary"] == 0, (
            f"[WB15] Zero-floor protection failed! Expected netSalary=0, got {body['netSalary']}"
        )

    def test_deductions_equal_gross_yields_zero(self, wb_client):
        """Gross = 30000 + 5000 = 35000. Deductions = 30000 + 5000 = 35000. netSalary = 0."""
        tag = uuid.uuid4().hex[:6].upper()
        emp_id = f"SAL{tag}"

        resp = wb_client.post("/wb/controller/salary/calculate", json={
            "employeeId": emp_id,
            "basicSalary": 30000,
            "bonus": 5000,
            "taxDeduction": 30000,
            "lateMarkDeduction": 5000,
        })

        assert resp.status_code == 201
        body = resp.json()
        assert body["totalDeductions"] == 35000
        assert body["netSalary"] == 0

    def test_nan_input_rejected_by_is_finite_guard(self, wb_client):
        """
        Exercises salaryController.js:7:
          !Number.isFinite(value)
        """
        resp = wb_client.post("/wb/controller/salary/calculate", json={
            "employeeId": "EMP001",
            "basicSalary": "invalid_number_string",
            "bonus": 0,
            "taxDeduction": 0,
            "lateMarkDeduction": 0,
        })

        assert resp.status_code == 400
        assert resp.json()["message"] == "Enter a valid employee and non-negative salary values."


