import Employee from '../models/Employee.js';

export const getEmployees = async (_req, res, next) => {
  try { res.json(await Employee.find().sort({ createdAt: -1 })); } catch (error) { next(error); }
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
    const employee = await Employee.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!employee) return res.status(404).json({ message: 'Employee not found.' });
    res.json(employee);
  } catch (error) { next(error); }
};

export const deleteEmployee = async (req, res, next) => {
  try {
    const employee = await Employee.findByIdAndDelete(req.params.id);
    if (!employee) return res.status(404).json({ message: 'Employee not found.' });
    res.status(204).send();
  } catch (error) { next(error); }
};
