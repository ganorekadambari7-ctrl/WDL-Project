import Employee from '../models/Employee.js';
import User from '../models/User.js';
import { getLinkedEmployee } from '../middleware/auth.js';

export const getEmployees = async (_req, res, next) => {
  try { res.json(await Employee.find().sort({ createdAt: -1 })); } catch (error) { next(error); }
};

/** Employee self-view: returns their own linked Employee record or 404 */
export const getMyEmployee = async (req, res, next) => {
  try {
    if (req.user.role === 'admin') return res.status(403).json({ message: 'Admins should use GET /api/employees.' });
    const emp = await getLinkedEmployee(req.user);
    if (!emp) {
      return res.status(404).json({
        message: 'No employee record is linked to your account. Please contact an administrator.',
        linked: false,
      });
    }
    res.json({ ...emp.toObject(), linked: true });
  } catch (error) { next(error); }
};

export const createEmployee = async (req, res, next) => {
  try {
    const employee = await Employee.create(req.body);
    res.status(201).json(employee);
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'Employee ID already exists.' });
    next(error);
  }
};

export const updateEmployee = async (req, res, next) => {
  try {
    const { _id, createdAt, updatedAt, __v, ...updates } = req.body;
    const employee = await Employee.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!employee) return res.status(404).json({ message: 'Employee not found.' });
    res.json(employee);
  } catch (error) { next(error); }
};

export const deleteEmployee = async (req, res, next) => {
  try {
    const employee = await Employee.findByIdAndDelete(req.params.id);
    if (!employee) return res.status(404).json({ message: 'Employee not found.' });

    // Clean up references in User accounts
    await User.updateMany(
      { employeeRef: employee._id },
      { $unset: { employeeRef: 1 } }
    ).catch(() => {});

    res.status(204).send();
  } catch (error) { next(error); }
};
