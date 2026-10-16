import Designation from '../models/Designation.js';
import Employee from '../models/Employee.js';
import Promotion from '../models/Promotion.js';

// Default initial designations
const DEFAULT_DESIGNATIONS = [
  { title: 'Intern', grade: 'L0', baseSalary: 25000, description: 'Entry-level internship position' },
  { title: 'Junior Software Engineer', grade: 'L1', baseSalary: 40000, description: 'Associate engineer' },
  { title: 'Software Engineer', grade: 'L2', baseSalary: 65000, description: 'Core software developer' },
  { title: 'Senior Software Engineer', grade: 'L3', baseSalary: 95000, description: 'Senior developer / mentor' },
  { title: 'Lead Engineer', grade: 'L4', baseSalary: 140000, description: 'Technical lead / architect' },
  { title: 'Engineering Manager', grade: 'M1', baseSalary: 180000, description: 'People & technical manager' },
];

/** Seed default designations if none exist */
async function ensureDefaultDesignations() {
  const count = await Designation.countDocuments();
  if (count === 0) {
    await Designation.insertMany(DEFAULT_DESIGNATIONS);
  }
}

/** GET /api/promotions/designations */
export const getDesignations = async (_req, res, next) => {
  try {
    await ensureDefaultDesignations();
    const designations = await Designation.find({ active: true }).sort({ baseSalary: 1 });
    res.json(designations);
  } catch (error) { next(error); }
};

/** POST /api/promotions/designations — Admin only */
export const createDesignation = async (req, res, next) => {
  try {
    const { title, grade, baseSalary, description } = req.body;
    if (!title || !grade || baseSalary === undefined || Number(baseSalary) < 0) {
      return res.status(400).json({ message: 'Title, grade, and non-negative base salary are required.' });
    }
    const exists = await Designation.findOne({
      title: new RegExp(`^${title.trim()}$`, 'i'),
      grade: grade.trim().toUpperCase()
    });
    if (exists) {
      return res.status(409).json({ message: `Designation "${title}" with grade "${grade}" already exists.` });
    }
    const desig = await Designation.create({
      title: title.trim(),
      grade: grade.trim().toUpperCase(),
      baseSalary: Number(baseSalary),
      description: description || ''
    });
    res.status(201).json(desig);
  } catch (error) { next(error); }
};

/** PUT /api/promotions/designations/:id — Admin only */
export const updateDesignation = async (req, res, next) => {
  try {
    const { title, grade, baseSalary, description, active } = req.body;
    const updates = {};
    if (title) updates.title = title.trim();
    if (grade) updates.grade = grade.trim().toUpperCase();
    if (baseSalary !== undefined) {
      if (Number(baseSalary) < 0) return res.status(400).json({ message: 'Base salary cannot be negative.' });
      updates.baseSalary = Number(baseSalary);
    }
    if (description !== undefined) updates.description = description;
    if (active !== undefined) updates.active = Boolean(active);

    const updated = await Designation.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!updated) return res.status(404).json({ message: 'Designation not found.' });
    res.json(updated);
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

    const previousSalary = employee.basicSalary || 0;
    const newSalary = designation.baseSalary;
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

    // If effective immediately (on or before today), update current employee record
    if (isEffectiveNow) {
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
 * Calculates the exact applicable base salary for a given payroll month,
 * applying mid-month proration if a promotion took effect mid-month.
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

    const monthStr = req.query.month || new Date().toISOString().slice(0, 7); // 'YYYY-MM'
    const [year, monthVal] = monthStr.split('-').map(Number);
    const daysInMonth = new Date(year, monthVal, 0).getDate(); // Total days in month
    const startOfMonth = new Date(Date.UTC(year, monthVal - 1, 1));
    const endOfMonth = new Date(Date.UTC(year, monthVal, 1)); // start of next month

    // Find all promotions for this employee up to or during this month
    const promotions = await Promotion.find({
      employeeId: targetEmpId,
      effectiveDate: { $lt: endOfMonth }
    }).sort({ effectiveDate: 1 });

    // Look for a promotion that occurred inside this month
    const midMonthPromo = promotions.find(p => p.effectiveDate >= startOfMonth && p.effectiveDate < endOfMonth);

    if (midMonthPromo) {
      const promoDay = new Date(midMonthPromo.effectiveDate).getUTCDate(); // e.g. 15
      if (promoDay > 1) {
        // Mid-month proration:
        // Days 1 .. (promoDay - 1) at previousSalary
        // Days promoDay .. daysInMonth at newSalary
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

    // If no mid-month promotion, find the latest promotion effective on or before startOfMonth
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

    // Default to employee's stored basicSalary
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
