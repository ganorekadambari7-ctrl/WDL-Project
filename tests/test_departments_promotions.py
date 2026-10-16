"""
Salary Pro — Multi-Department & Promotion Rank Tests
Targeting isolated test server on PORT 5001 using `salary-pro-test` DB.
"""

import pytest
import requests
from tests.conftest import TEST_BASE_URL
from tests.test_blackbox import _unique_user


@pytest.fixture
def dept_promo_setup():
    # Admin
    admin_payload = _unique_user(role="admin")
    admin_reg = requests.post(f"{TEST_BASE_URL}/api/auth/register", json=admin_payload).json()
    admin_headers = {"Authorization": f"Bearer {admin_reg['token']}"}

    # Employee in HR
    hr_emp_payload = _unique_user(role="employee")
    hr_emp_reg = requests.post(f"{TEST_BASE_URL}/api/auth/register", json=hr_emp_payload).json()
    hr_emp_headers = {"Authorization": f"Bearer {hr_emp_reg['token']}"}

    hr_emp_doc = {
        "name": hr_emp_payload["name"],
        "employeeId": f"HR{str(hr_emp_reg['user']['id'])[-4:].upper()}",
        "department": "HR",
        "designation": "HR Associate",
        "grade": "H1",
        "dob": "1994-04-10",
        "education": "MBA HR",
        "experience": 3,
        "basicSalary": 35000,
    }
    created_hr_emp = requests.post(f"{TEST_BASE_URL}/api/employees", json=hr_emp_doc, headers=admin_headers).json()
    requests.put(
        f"{TEST_BASE_URL}/api/settings/users/{hr_emp_reg['user']['id']}/link-employee",
        json={"employeeId": created_hr_emp["employeeId"]},
        headers=admin_headers,
    )

    # Employee in Finance
    fin_emp_payload = _unique_user(role="employee")
    fin_emp_reg = requests.post(f"{TEST_BASE_URL}/api/auth/register", json=fin_emp_payload).json()
    fin_emp_headers = {"Authorization": f"Bearer {fin_emp_reg['token']}"}

    fin_emp_doc = {
        "name": fin_emp_payload["name"],
        "employeeId": f"FN{str(fin_emp_reg['user']['id'])[-4:].upper()}",
        "department": "Finance",
        "designation": "Junior Accountant",
        "grade": "F1",
        "dob": "1995-11-20",
        "education": "B.Com",
        "experience": 2,
        "basicSalary": 38000,
    }
    created_fin_emp = requests.post(f"{TEST_BASE_URL}/api/employees", json=fin_emp_doc, headers=admin_headers).json()
    requests.put(
        f"{TEST_BASE_URL}/api/settings/users/{fin_emp_reg['user']['id']}/link-employee",
        json={"employeeId": created_fin_emp["employeeId"]},
        headers=admin_headers,
    )

    return {
        "admin": {"headers": admin_headers},
        "hr_emp": {"headers": hr_emp_headers, "emp": created_hr_emp},
        "fin_emp": {"headers": fin_emp_headers, "emp": created_fin_emp},
    }


def test_department_management_crud_and_rbac(dept_promo_setup):
    """Admin can create and manage departments; employee is blocked."""
    admin = dept_promo_setup["admin"]
    employee = dept_promo_setup["hr_emp"]

    # 1. Employee cannot create department (403)
    unauth_create = requests.post(
        f"{TEST_BASE_URL}/api/departments",
        json={"name": "Research & Development", "code": "RND"},
        headers=employee["headers"],
    )
    assert unauth_create.status_code == 403

    # 2. Admin creates department
    create_res = requests.post(
        f"{TEST_BASE_URL}/api/departments",
        json={"name": "Research & Development", "code": "RND", "description": "Core innovation lab"},
        headers=admin["headers"],
    )
    assert create_res.status_code == 201
    created_dept = create_res.json()
    assert created_dept["name"] == "Research & Development"

    # 3. Duplicate department name returns 409
    dup_res = requests.post(
        f"{TEST_BASE_URL}/api/departments",
        json={"name": "Research & Development"},
        headers=admin["headers"],
    )
    assert dup_res.status_code == 409

    # 4. Admin updates department
    update_res = requests.put(
        f"{TEST_BASE_URL}/api/departments/{created_dept['_id']}",
        json={"description": "Updated R&D lab description"},
        headers=admin["headers"],
    )
    assert update_res.status_code == 200
    assert update_res.json()["description"] == "Updated R&D lab description"

    # 5. Get departments list
    depts = requests.get(f"{TEST_BASE_URL}/api/departments", headers=employee["headers"]).json()
    names = [d["name"] for d in depts]
    assert "IT" in names
    assert "HR" in names
    assert "Finance" in names
    assert "Research & Development" in names


def test_designations_multi_department_support(dept_promo_setup):
    """Designations exist across multiple departments with distinct numeric ranks."""
    admin = dept_promo_setup["admin"]

    desigs = requests.get(f"{TEST_BASE_URL}/api/promotions/designations", headers=admin["headers"]).json()
    depts_present = set(d.get("department") for d in desigs)
    assert "IT" in depts_present
    assert "HR" in depts_present
    assert "Finance" in depts_present

    # Create a custom designation in Finance
    custom_desig = requests.post(
        f"{TEST_BASE_URL}/api/promotions/designations",
        json={
            "title": "Lead Financial Controller",
            "department": "Finance",
            "grade": "F5",
            "level": 5,
            "baseSalary": 175000,
            "description": "Head controller",
        },
        headers=admin["headers"],
    )
    assert custom_desig.status_code == 201
    created = custom_desig.json()
    assert created["department"] == "Finance"
    assert created["level"] == 5


def test_eligible_promotions_department_scoping_and_rank_filter(dept_promo_setup):
    """Eligible promotions return strictly higher-ranked positions within employee's department."""
    admin = dept_promo_setup["admin"]
    hr_emp = dept_promo_setup["hr_emp"]

    # HR Associate has grade H1, level 1, salary 35000 in HR department
    res = requests.get(
        f"{TEST_BASE_URL}/api/promotions/eligible/{hr_emp['emp']['employeeId']}",
        headers=admin["headers"],
    )
    assert res.status_code == 200
    data = res.json()
    eligible = data["eligible"]

    assert len(eligible) > 0

    # 1. All eligible roles must be in HR department
    for d in eligible:
      assert d["department"] == "HR", f"Expected HR, got {d['department']}"
      assert d["level"] > 1, f"Expected level > 1 (higher rank), got {d['level']}"
      assert d["baseSalary"] >= 35000, f"Expected baseSalary >= 35000, got {d['baseSalary']}"
      assert "Intern" not in d["title"], "Intern position should never be an eligible promotion"


def test_promotion_enforces_department_and_non_negative_increment(dept_promo_setup):
    """Promotion cannot be across departments, to a lower rank, or cause a negative increment."""
    admin = dept_promo_setup["admin"]
    fin_emp = dept_promo_setup["fin_emp"]

    desigs = requests.get(f"{TEST_BASE_URL}/api/promotions/designations", headers=admin["headers"]).json()

    it_desig = next(d for d in desigs if d.get("department") == "IT" and d.get("level", 0) > 2)
    fin_intern = next(d for d in desigs if d.get("department") == "Finance" and d.get("level") == 0)
    fin_senior = next(d for d in desigs if d.get("department") == "Finance" and d.get("level", 0) == 2)

    # 1. Attempting to promote Finance employee to an IT designation must fail
    cross_dept = requests.post(
        f"{TEST_BASE_URL}/api/promotions",
        json={
            "employeeId": fin_emp["emp"]["employeeId"],
            "newDesignationId": it_desig["_id"],
            "effectiveDate": "2026-11-01",
        },
        headers=admin["headers"],
    )
    assert cross_dept.status_code == 400
    assert "department" in cross_dept.json()["message"].lower()

    # 2. Attempting to promote to Intern (lower rank) must fail
    demote_res = requests.post(
        f"{TEST_BASE_URL}/api/promotions",
        json={
            "employeeId": fin_emp["emp"]["employeeId"],
            "newDesignationId": fin_intern["_id"],
            "effectiveDate": "2026-11-01",
        },
        headers=admin["headers"],
    )
    assert demote_res.status_code == 400
    assert "higher-ranked" in demote_res.json()["message"].lower()

    # 3. Valid promotion to Senior Accountant in Finance succeeds
    valid_promo = requests.post(
        f"{TEST_BASE_URL}/api/promotions",
        json={
            "employeeId": fin_emp["emp"]["employeeId"],
            "newDesignationId": fin_senior["_id"],
            "effectiveDate": "2026-10-15",
            "remarks": "Promoted based on excellent annual audit performance",
        },
        headers=admin["headers"],
    )
    assert valid_promo.status_code == 201
    promo_data = valid_promo.json()["promotion"]
    assert promo_data["newDesignation"] == fin_senior["title"]
    assert promo_data["department"] == "Finance"
    assert promo_data["newSalary"] == fin_senior["baseSalary"]
    assert promo_data["newSalary"] > promo_data["previousSalary"]
