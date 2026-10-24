import Department from '../models/Department.js';
import Designation from '../models/Designation.js';
import Employee from '../models/Employee.js';
import User from '../models/User.js';

const DEFAULT_DEPARTMENTS = [
  { name: 'IT', code: 'IT', description: 'Information Technology & Engineering' },
  { name: 'HR', code: 'HR', description: 'Human Resources & Talent Management' },
  { name: 'Finance', code: 'FIN', description: 'Financial Operations & Accounting' },
  { name: 'Sales', code: 'SALES', description: 'Sales & Business Development' },
  { name: 'Marketing', code: 'MKT', description: 'Brand, Content & Digital Marketing' },
  { name: 'Operations', code: 'OPS', description: 'Operations & Business Processes' },
  { name: 'Administration', code: 'ADMIN', description: 'General Facilities & Administration' },
];

export async function ensureDefaultDepartments() {
  for (const dept of DEFAULT_DEPARTMENTS) {
    const exists = await Department.findOne({ name: dept.name });
    if (!exists) {
      await Department.create(dept).catch(() => {});
    }
  }
}

/**
 * GET /api/departments
 * Returns all active departments (or all if admin)
 */
export const getDepartments = async (req, res, next) => {
  try {
    await ensureDefaultDepartments();
    const filter = req.user?.role === 'admin' && req.query.all === 'true'
      ? {}
      : { active: true };
    const departments = await Department.find(filter).sort({ name: 1 });
    res.json(departments);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/departments (Admin only)
 * Create a new department.
 */
export const createDepartment = async (req, res, next) => {
  try {
    await ensureDefaultDepartments();
    const { name, code, description } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Department name is required.' });
    }

    const trimmedName = name.trim();
    const exists = await Department.findOne({
      name: new RegExp(`^${trimmedName}$`, 'i'),
    });
    if (exists) {
      return res.status(409).json({ message: `Department "${trimmedName}" already exists.` });
    }

    const dept = await Department.create({
      name: trimmedName,
      code: code?.trim().toUpperCase() || trimmedName.slice(0, 4).toUpperCase(),
      description: description?.trim() || '',
      active: true,
    });

    res.status(201).json(dept);
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/departments/:id (Admin only)
 * Update a department.
 */
export const updateDepartment = async (req, res, next) => {
  try {
    const { name, code, description, active } = req.body;
    const dept = await Department.findById(req.params.id);
    if (!dept) {
      return res.status(404).json({ message: 'Department not found.' });
    }

    const oldName = dept.name;

    if (name && name.trim()) {
      const newName = name.trim();
      if (newName.toLowerCase() !== oldName.toLowerCase()) {
        const conflict = await Department.findOne({
          name: new RegExp(`^${newName}$`, 'i'),
          _id: { $ne: dept._id },
        });
        if (conflict) {
          return res.status(409).json({ message: `Department "${newName}" already exists.` });
        }
      }
      dept.name = newName;

      // Also cascade update designations, employees, and users if department name is renamed
      if (newName !== oldName) {
        await Designation.updateMany({ department: oldName }, { department: newName });
        await Employee.updateMany({ department: oldName }, { department: newName });
        await User.updateMany({ department: oldName }, { department: newName }).catch(() => {});
      }
    }

    if (code !== undefined) dept.code = code.trim().toUpperCase();
    if (description !== undefined) dept.description = description.trim();
    if (active !== undefined) dept.active = Boolean(active);

    await dept.save();
    res.json(dept);
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/departments/:id (Admin only)
 */
export const deleteDepartment = async (req, res, next) => {
  try {
    const dept = await Department.findById(req.params.id);
    if (!dept) {
      return res.status(404).json({ message: 'Department not found.' });
    }

    // Check if any employees belong to this department
    const empCount = await Employee.countDocuments({ department: dept.name });
    if (empCount > 0) {
      return res.status(400).json({
        message: `Cannot delete department "${dept.name}" because ${empCount} employee(s) are assigned to it.`,
      });
    }

    // Soft delete / deactivate or remove
    dept.active = false;
    await dept.save();
    res.json({ message: `Department "${dept.name}" has been deactivated.` });
  } catch (error) {
    next(error);
  }
};
