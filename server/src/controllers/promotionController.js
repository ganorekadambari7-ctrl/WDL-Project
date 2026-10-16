import Designation from '../models/Designation.js';
import Employee from '../models/Employee.js';
import Promotion from '../models/Promotion.js';
import Department from '../models/Department.js';
import { ensureDefaultDepartments } from './departmentController.js';

// Multi-department default designations with numeric levels (ranks)
const DEFAULT_DESIGNATIONS = [
  // IT & Engineering
  { title: 'Intern', department: 'IT', grade: 'L0', level: 0, baseSalary: 25000, description: 'Entry-level internship position' },
  { title: 'Junior Software Engineer', department: 'IT', grade: 'L1', level: 1, baseSalary: 40000, description: 'Associate engineer' },
  { title: 'Software Engineer', department: 'IT', grade: 'L2', level: 2, baseSalary: 65000, description: 'Core software developer' },
  { title: 'Senior Software Engineer', department: 'IT', grade: 'L3', level: 3, baseSalary: 95000, description: 'Senior developer / mentor' },
  { title: 'Lead Engineer', department: 'IT', grade: 'L4', level: 4, baseSalary: 140000, description: 'Technical lead / architect' },
  { title: 'Engineering Manager', department: 'IT', grade: 'M1', level: 5, baseSalary: 180000, description: 'People & technical manager' },

  // Human Resources
  { title: 'HR Intern', department: 'HR', grade: 'H0', level: 0, baseSalary: 20000, description: 'HR internship' },
  { title: 'HR Associate', department: 'HR', grade: 'H1', level: 1, baseSalary: 35000, description: 'HR operations associate' },
  { title: 'HR Generalist', department: 'HR', grade: 'H2', level: 2, baseSalary: 55000, description: 'Recruitment & employee engagement' },
  { title: 'Senior HR Manager', department: 'HR', grade: 'H3', level: 3, baseSalary: 85000, description: 'HR strategy & compliance lead' },
  { title: 'Director of HR', department: 'HR', grade: 'H4', level: 4, baseSalary: 135000, description: 'Head of human resources' },

  // Finance & Accounting
  { title: 'Finance Intern', department: 'Finance', grade: 'F0', level: 0, baseSalary: 22000, description: 'Finance & accounts internship' },
  { title: 'Junior Accountant', department: 'Finance', grade: 'F1', level: 1, baseSalary: 38000, description: 'Accounts payable/receivable associate' },
  { title: 'Senior Accountant', department: 'Finance', grade: 'F2', level: 2, baseSalary: 62000, description: 'Ledger management & audit lead' },
  { title: 'Financial Analyst', department: 'Finance', grade: 'F3', level: 3, baseSalary: 92000, description: 'Budget forecasting & financial analysis' },
  { title: 'Finance Director', department: 'Finance', grade: 'F4', level: 4, baseSalary: 150000, description: 'Head of financial operations' },

  // Sales & Business Development
  { title: 'Sales Trainee', department: 'Sales', grade: 'S0', level: 0, baseSalary: 22000, description: 'Sales onboarding & training' },
  { title: 'Sales Executive', department: 'Sales', grade: 'S1', level: 1, baseSalary: 36000, description: 'Field / Inside sales representative' },
  { title: 'Senior Sales Executive', department: 'Sales', grade: 'S2', level: 2, baseSalary: 60000, description: 'Key accounts management' },
  { title: 'Sales Manager', department: 'Sales', grade: 'S3', level: 3, baseSalary: 95000, description: 'Regional sales manager' },
  { title: 'VP of Sales', department: 'Sales', grade: 'S4', level: 4, baseSalary: 160000, description: 'Head of commercial sales' },

  // Marketing & Growth
  { title: 'Marketing Intern', department: 'Marketing', grade: 'M0', level: 0, baseSalary: 20000, description: 'Marketing intern' },
  { title: 'Marketing Associate', department: 'Marketing', grade: 'M1', level: 1, baseSalary: 35000, description: 'Digital & social media associate' },
  { title: 'Marketing Specialist', department: 'Marketing', grade: 'M2', level: 2, baseSalary: 58000, description: 'Performance & brand campaigns' },
  { title: 'Marketing Director', department: 'Marketing', grade: 'M3', level: 3, baseSalary: 110000, description: 'Head of marketing & brand' },

  // Operations
  { title: 'Operations Associate', department: 'Operations', grade: 'O1', level: 1, baseSalary: 34000, description: 'Process operations support' },
  { title: 'Operations Lead', department: 'Operations', grade: 'O2', level: 2, baseSalary: 60000, description: 'Daily operations & workflow supervisor' },
  { title: 'Operations Manager', department: 'Operations', grade: 'O3', level: 3, baseSalary: 95000, description: 'Operations department head' },

  // Administration
  { title: 'Admin Assistant', department: 'Administration', grade: 'A1', level: 1, baseSalary: 30000, description: 'Front desk & facility support' },
  { title: 'Office Administrator', department: 'Administration', grade: 'A2', level: 2, baseSalary: 50000, description: 'Workplace & vendor coordinator' },
  { title: 'Facilities Manager', department: 'Administration', grade: 'A3', level: 3, baseSalary: 80000, description: 'Head of administrative operations' },
];

/** Seed default multi-department designations if none exist, or backfill department/level */
async function ensureDefaultDesignations() {
  await ensureDefaultDepartments();
  const count = await Designation.countDocuments();
  if (count === 0) {
    await Designation.insertMany(DEFAULT_DESIGNATIONS);
    return;
  }

  // Backfill department and level on any existing legacy designations
  const legacyWithoutDept = await Designation.find({ $or: [{ department: { $exists: false } }, { department: '' }] });
  for (const d of legacyWithoutDept) {
    d.department = 'IT';
    await d.save();
  }

  const legacyWithoutLevel = await Designation.find({ $or: [{ level: { $exists: false } }, { level: null }] });
  for (const d of legacyWithoutLevel) {
    const g = (d.grade || '').toUpperCase();
    if (g.includes('0')) d.level = 0;
    else if (g.includes('1')) d.level = 1;
    else if (g.includes('2')) d.level = 2;
    else if (g.includes('3')) d.level = 3;
    else if (g.includes('4')) d.level = 4;
    else if (g.includes('M')) d.level = 5;
    else d.level = 1;
    await d.save();
  }

  // If only IT was seeded previously, seed the other departments safely without duplicates
  const deptCount = await Designation.distinct('department');
  if (deptCount.length <= 1) {
    for (const d of DEFAULT_DESIGNATIONS) {
      if (d.department !== 'IT') {
        const exists = await Designation.findOne({ title: d.title, department: d.department });
        if (!exists) {
          await Designation.create(d);
        }
      }
    }
  }
}

/** GET /api/promotions/designations */
export const getDesignations = async (req, res, next) => {
  try {
    await ensureDefaultDesignations();
    const filter = { active: true };
    if (req.query.department) {
      filter.department = req.query.department;
    }
    const designations = await Designation.find(filter).sort({ department: 1, level: 1, baseSalary: 1 });
    res.json(designations);
  } catch (error) { next(error); }
};

/** POST /api/promotions/designations — Admin only */
export const createDesignation = async (req, res, next) => {
  try {
    const { title, department = 'IT', grade, level = 1, baseSalary, description } = req.body;
    if (!title || !grade || baseSalary === undefined || Number(baseSalary) < 0) {
      return res.status(400).json({ message: 'Title, grade, and non-negative base salary are required.' });
    }

    const trimmedTitle = title.trim();
    const trimmedDept = (department || 'IT').trim();
    const trimmedGrade = grade.trim().toUpperCase();

    const exists = await Designation.findOne({
      title: new RegExp(`^${trimmedTitle}$`, 'i'),
      department: new RegExp(`^${trimmedDept}$`, 'i'),
      grade: trimmedGrade,
    });
    if (exists) {
      return res.status(409).json({
        message: `Designation "${trimmedTitle}" in department "${trimmedDept}" with grade "${trimmedGrade}" already exists.`,
      });
    }

    const desig = await Designation.create({
      title: trimmedTitle,
      department: trimmedDept,
      grade: trimmedGrade,
      level: Math.max(0, Number(level) || 1),
      baseSalary: Number(baseSalary),
      description: description?.trim() || '',
    });
    res.status(201).json(desig);
  } catch (error) { next(error); }
};

/** PUT /api/promotions/designations/:id — Admin only */
export const updateDesignation = async (req, res, next) => {
  try {
    const { title, department, grade, level, baseSalary, description, active } = req.body;
    const updates = {};
    if (title) updates.title = title.trim();
    if (department) updates.department = department.trim();
    if (grade) updates.grade = grade.trim().toUpperCase();
    if (level !== undefined) updates.level = Math.max(0, Number(level) || 0);
    if (baseSalary !== undefined) {
      if (Number(baseSalary) < 0) return res.status(400).json({ message: 'Base salary cannot be negative.' });
      updates.baseSalary = Number(baseSalary);
    }
    if (description !== undefined) updates.description = description.trim();
    if (active !== undefined) updates.active = Boolean(active);

    const updated = await Designation.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!updated) return res.status(404).json({ message: 'Designation not found.' });
    res.json(updated);
  } catch (error) { next(error); }
};

/**
 * GET /api/promotions/eligible/:employeeId
 * Returns eligible promotion designations strictly for this employee:
 * - Same department only
 * - Strictly higher numeric level (level > currentLevel)
 * - Excludes Intern or equal/lower positions
 * - Prevents negative increments (baseSalary >= employee.basicSalary)
 */
export const getEligiblePromotions = async (req, res, next) => {
  try {
    await ensureDefaultDesignations();
    const employee = await Employee.findOne({ employeeId: req.params.employeeId.toUpperCase() });
    if (!employee) return res.status(404).json({ message: 'Employee record not found.' });

    const dept = employee.department || 'IT';

    // Determine current employee level
    let currentLevel = 0;
    if (employee.designationRef) {
      const currentDesig = await Designation.findById(employee.designationRef);
      if (currentDesig && currentDesig.level !== undefined) {
        currentLevel = currentDesig.level;
      }
    }
    if (currentLevel === 0 && employee.designation && employee.designation !== 'Unassigned') {
      const currentDesig = await Designation.findOne({
        title: new RegExp(`^${employee.designation.trim()}$`, 'i'),
        department: dept,
      });
      if (currentDesig && currentDesig.level !== undefined) {
        currentLevel = currentDesig.level;
      }
    }

    // Filter eligible designations:
    // 1. Same department
    // 2. Active
    // 3. Level strictly greater than currentLevel (excludes lower & equal grades, excludes Intern/L0)
    // 4. Base salary >= current basic salary (prevents negative increment)
    // 5. Excludes exact current designation
    const eligible = await Designation.find({
      department: dept,
      active: true,
      level: { $gt: currentLevel },
      baseSalary: { $gte: Number(employee.basicSalary || 0) },
      title: { $ne: employee.designation },
    }).sort({ level: 1, baseSalary: 1 });

    res.json({
      employee: {
        employeeId: employee.employeeId,
        name: employee.name,
        department: dept,
        designation: employee.designation,
        grade: employee.grade,
        basicSalary: employee.basicSalary,
        currentLevel,
      },
      eligible,
    });
  } catch (error) { next(error); }
};

/**
 * POST /api/promotions — Admin only
 * Promotes an employee to a new designation.
 */
export const createPromotion = async (req, res, next) => {
  try {
    const { employeeId, newDesignationId, effectiveDate, remarks } = req.body;
    if (!employeeId || !newDesignationId || !effectiveDate) {
      return res.status(400).json({ message: 'Employee, new designation, and effective date are required.' });
    }

    const employee = await Employee.findOne({ employeeId: employeeId.toUpperCase() });
    if (!employee) return res.status(404).json({ message: 'Employee record not found.' });

    const designation = await Designation.findById(newDesignationId);
    if (!designation || !designation.active) {
      return res.status(404).json({ message: 'Selected designation is invalid or inactive.' });
    }

    const employeeDept = employee.department || 'IT';

    // Enforce same department promotion rule
    if (designation.department !== employeeDept) {
      return res.status(400).json({
        message: `Promotion must be within the employee's current department (${employeeDept}). For cross-department transfers, please use the Edit Employee action.`,
      });
    }

    // Determine current level
    let currentLevel = 0;
    if (employee.designationRef) {
      const currentDesig = await Designation.findById(employee.designationRef);
      if (currentDesig && currentDesig.level !== undefined) {
        currentLevel = currentDesig.level;
      }
    }
    if (currentLevel === 0 && employee.designation && employee.designation !== 'Unassigned') {
      const currentDesig = await Designation.findOne({
        title: new RegExp(`^${employee.designation.trim()}$`, 'i'),
        department: employeeDept,
      });
      if (currentDesig && currentDesig.level !== undefined) {
        currentLevel = currentDesig.level;
      }
    }

    // Enforce higher numeric level / rank (prevents intern / demotion)
    if (designation.level <= currentLevel && employee.designation !== 'Unassigned') {
      return res.status(400).json({
        message: `A promotion must be to a higher-ranked position. Selected position rank (Level ${designation.level}) is not higher than current rank (Level ${currentLevel}).`,
      });
    }

    // Enforce non-negative increment
    const previousSalary = employee.basicSalary || 0;
    const newSalary = designation.baseSalary;
    if (newSalary < previousSalary) {
      return res.status(400).json({
        message: `Promotion cannot result in a salary reduction (current: ₹${previousSalary}, new: ₹${newSalary}).`,
      });
    }

    const effDate = new Date(effectiveDate);
    if (isNaN(effDate.getTime())) {
      return res.status(400).json({ message: 'Invalid effective date format.' });
    }

    // Check for duplicate pending promotion on identical date
    const conflict = await Promotion.findOne({
      employeeId: employee.employeeId,
      effectiveDate: effDate,
      newDesignation: designation.title,
    });
    if (conflict) {
      return res.status(409).json({ message: 'A promotion for this employee with the same designation and effective date already exists.' });
    }

    const incrementPercentage = previousSalary > 0
      ? Number((((newSalary - previousSalary) / previousSalary) * 100).toFixed(2))
      : 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const effDay = new Date(effDate);
    effDay.setHours(0, 0, 0, 0);

    const isEffectiveNow = effDay <= today;

    const promotion = await Promotion.create({
      employeeId: employee.employeeId,
      employeeRef: employee._id,
      employeeName: employee.name,
      department: designation.department,
      previousDesignation: employee.designation || 'Unassigned',
      previousGrade: employee.grade || '',
      previousSalary,
      newDesignation: designation.title,
      newGrade: designation.grade,
      newSalary,
      incrementPercentage,
      effectiveDate: effDate,
      approvalDate: new Date(),
      approvedBy: req.user._id,
      approvedByName: req.user.name || 'Administrator',
      remarks: remarks || '',
      status: isEffectiveNow ? 'applied' : 'scheduled',
    });

    // If effective immediately, update current employee record
    if (isEffectiveNow) {
      employee.department = designation.department;
      employee.designation = designation.title;
      employee.grade = designation.grade;
      employee.designationRef = designation._id;
      employee.basicSalary = newSalary;
      await employee.save();
    }

    res.status(201).json({
      message: `Promotion successfully ${isEffectiveNow ? 'applied' : 'scheduled for ' + effDate.toISOString().slice(0, 10)}.`,
      promotion,
      isEffectiveNow,
    });
  } catch (error) { next(error); }
};

/** GET /api/promotions — Admin sees all; employee sees own */
export const getPromotions = async (req, res, next) => {
  try {
    const filter = req.user.role === 'admin'
      ? (req.query.employeeId ? { employeeId: req.query.employeeId.toUpperCase() } : {})
      : { employeeId: (req.user.employeeId || '').toUpperCase() };

    const promotions = await Promotion.find(filter).sort({ effectiveDate: -1, createdAt: -1 });
    res.json(promotions);
  } catch (error) { next(error); }
};

/** GET /api/promotions/history/:employeeId */
export const getEmployeePromotionHistory = async (req, res, next) => {
  try {
    const targetEmpId = req.params.employeeId.toUpperCase();
    if (req.user.role === 'employee') {
      const userEmpId = (req.user.employeeId || '').toUpperCase();
      if (!userEmpId || userEmpId !== targetEmpId) {
        return res.status(403).json({ message: "You are not authorized to view other employees' promotion history." });
      }
    }

    const history = await Promotion.find({ employeeId: targetEmpId }).sort({ effectiveDate: -1, createdAt: -1 });
    res.json(history);
  } catch (error) { next(error); }
};

/**
 * GET /api/promotions/applicable-rate/:employeeId?month=YYYY-MM
 */
export const getApplicableSalary = async (req, res, next) => {
  try {
    const targetEmpId = req.params.employeeId.toUpperCase();
    if (req.user.role === 'employee') {
      const userEmpId = (req.user.employeeId || '').toUpperCase();
      if (!userEmpId || userEmpId !== targetEmpId) {
        return res.status(403).json({ message: "You are not authorized to check other employees' salary rates." });
      }
    }

    const employee = await Employee.findOne({ employeeId: targetEmpId });
    if (!employee) return res.status(404).json({ message: 'Employee not found.' });

    const monthStr = req.query.month || new Date().toISOString().slice(0, 7);
    const [year, monthVal] = monthStr.split('-').map(Number);
    const daysInMonth = new Date(year, monthVal, 0).getDate();
    const startOfMonth = new Date(Date.UTC(year, monthVal - 1, 1));
    const endOfMonth = new Date(Date.UTC(year, monthVal, 1));

    const promotions = await Promotion.find({
      employeeId: targetEmpId,
      effectiveDate: { $lt: endOfMonth }
    }).sort({ effectiveDate: 1 });

    const midMonthPromo = promotions.find(p => p.effectiveDate >= startOfMonth && p.effectiveDate < endOfMonth);

    if (midMonthPromo) {
      const promoDay = new Date(midMonthPromo.effectiveDate).getUTCDate();
      if (promoDay > 1) {
        const daysOld = promoDay - 1;
        const daysNew = daysInMonth - promoDay + 1;
        const oldSal = midMonthPromo.previousSalary;
        const newSal = midMonthPromo.newSalary;

        const proratedBasicSalary = Math.round((daysOld / daysInMonth * oldSal) + (daysNew / daysInMonth * newSal));

        return res.json({
          employeeId: targetEmpId,
          month: monthStr,
          baseSalary: proratedBasicSalary,
          isProrated: true,
          proration: {
            promotionId: midMonthPromo._id,
            effectiveDate: midMonthPromo.effectiveDate,
            promoDay,
            totalDaysInMonth: daysInMonth,
            daysOld,
            daysNew,
            oldSalary: oldSal,
            newSalary: newSal,
            formula: `(${daysOld}/${daysInMonth} * ${oldSal}) + (${daysNew}/${daysInMonth} * ${newSal}) = ${proratedBasicSalary}`,
          },
          currentEmployeeDesignation: employee.designation,
          currentEmployeeGrade: employee.grade,
        });
      }
    }

    const effectivePromos = promotions.filter(p => p.effectiveDate < endOfMonth);
    if (effectivePromos.length > 0) {
      const latestPromo = effectivePromos[effectivePromos.length - 1];
      return res.json({
        employeeId: targetEmpId,
        month: monthStr,
        baseSalary: latestPromo.newSalary,
        isProrated: false,
        appliedPromotion: {
          promotionId: latestPromo._id,
          effectiveDate: latestPromo.effectiveDate,
          designation: latestPromo.newDesignation,
          grade: latestPromo.newGrade,
        },
        currentEmployeeDesignation: employee.designation,
        currentEmployeeGrade: employee.grade,
      });
    }

    res.json({
      employeeId: targetEmpId,
      month: monthStr,
      baseSalary: employee.basicSalary || 0,
      isProrated: false,
      currentEmployeeDesignation: employee.designation,
      currentEmployeeGrade: employee.grade,
    });
  } catch (error) { next(error); }
};
