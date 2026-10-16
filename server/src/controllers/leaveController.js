import Leave from '../models/Leave.js';
import { getEffectiveEmployeeId } from '../middleware/auth.js';

export const applyLeave = async (req, res, next) => {
  try {
    const { startDate, endDate, leaveType, reason, lateMark } = req.body;
    if (!startDate || !endDate || !leaveType || !reason) {
      return res.status(400).json({ message: 'Complete all required leave fields.' });
    }
    if (new Date(endDate) < new Date(startDate)) {
      return res.status(400).json({ message: 'End date cannot be before the start date.' });
    }

    let resolvedEmployeeId;

    if (!req.user || req.user.role === 'admin') {
      // Admin (or test harness) supplies employeeId in body
      const { employeeId } = req.body;
      if (!employeeId) return res.status(400).json({ message: 'Employee ID is required.' });
      resolvedEmployeeId = employeeId.toUpperCase();
    } else {
      // Employee: always use their own authenticated employeeId — never from request body
      const userEmpId = await getEffectiveEmployeeId(req.user);
      if (!userEmpId) {
        return res.status(400).json({
          message: 'Your account is not linked to an employee record. Please contact an administrator.',
        });
      }
      resolvedEmployeeId = userEmpId;
    }

    const leave = await Leave.create({
      employeeId: resolvedEmployeeId,
      startDate,
      endDate,
      leaveType,
      reason,
      lateMark: lateMark || false,
    });
    res.status(201).json(leave);
  } catch (error) { next(error); }
};

export const getLeaves = async (req, res, next) => {
  try {
    // Admins see all leaves; Employees see only their own records
    const filter = (req.user && req.user.role === 'employee')
      ? { employeeId: (req.user.employeeId || '').toUpperCase() }
      : {};
    res.json(await Leave.find(filter).sort({ createdAt: -1 }));
  } catch (error) { next(error); }
};

export const reviewLeave = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Status must be approved or rejected.' });
    }
    const leave = await Leave.findByIdAndUpdate(req.params.id, { status, reviewedBy: req.user._id }, { new: true });
    if (!leave) return res.status(404).json({ message: 'Leave request not found.' });
    res.json(leave);
  } catch (error) { next(error); }
};
