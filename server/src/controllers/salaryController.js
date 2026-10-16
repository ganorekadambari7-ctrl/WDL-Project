import Salary from '../models/Salary.js';

export const calculateSalary = async (req, res, next) => {
  try {
    const { employeeId, basicSalary, bonus = 0, taxDeduction = 0, lateMarkDeduction = 0 } = req.body;
    const values = [basicSalary, bonus, taxDeduction, lateMarkDeduction].map(Number);
    if (!employeeId || values.some((value) => !Number.isFinite(value) || value < 0)) {
      return res.status(400).json({ message: 'Enter a valid employee and non-negative salary values.' });
    }
    const [basic, bonusValue, tax, late] = values;
    const totalDeductions = tax + late;
    const netSalary = Math.max(0, basic + bonusValue - totalDeductions);
    const salary = await Salary.create({
      employeeId: employeeId.toUpperCase(),
      basicSalary: basic,
      bonus: bonusValue,
      taxDeduction: tax,
      lateMarkDeduction: late,
      totalDeductions,
      netSalary
    });
    res.status(201).json(salary);
  } catch (error) { next(error); }
};

export const getSalaries = async (req, res, next) => {
  try {
    const targetEmployeeId = req.params.employeeId.toUpperCase();

    // RBAC: Employees can ONLY view their own salary history
    if (req.user && req.user.role === 'employee') {
      const userEmpId = (req.user.employeeId || '').toUpperCase();
      if (!userEmpId || targetEmployeeId !== userEmpId) {
        return res.status(403).json({ message: "You are not authorized to view other employees' salary records." });
      }
    }

    res.json(await Salary.find({ employeeId: targetEmployeeId }).sort({ createdAt: -1 }));
  } catch (error) { next(error); }
};
