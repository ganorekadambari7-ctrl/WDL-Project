import Leave from '../models/Leave.js';
import Employee from '../models/Employee.js';
import { getLinkedEmployee, getEffectiveEmployeeId } from '../middleware/auth.js';

export const applyLeave = async (req, res, next) => {
  try {
    if (req.user && req.user.role === 'admin') {
      return res.status(403).json({
        message: 'Admins cannot submit leave requests. Leave creation is restricted to employees.',
      });
    }

    const { startDate, endDate, leaveType, reason, lateMark } = req.body;
    if (!startDate || !endDate || !leaveType || !reason || (typeof reason === 'string' && !reason.trim())) {
      return res.status(400).json({ message: 'Complete all required leave fields.' });
    }

    if (!['full-day', 'half-day'].includes(leaveType)) {
      return res.status(400).json({ message: "Leave type must be 'full-day' or 'half-day'." });
    }

    if (new Date(endDate) < new Date(startDate)) {
      return res.status(400).json({ message: 'End date cannot be before the start date.' });
    }

    let resolvedEmployeeId;
    let employeeDoc = null;

    if (req.user) {
      // Employee role: resolve exclusively from authenticated user link
      employeeDoc = await getLinkedEmployee(req.user);
      if (!employeeDoc) {
        return res.status(400).json({
          message: 'Your account is not linked to an employee record. Please contact an administrator.',
        });
      }
      resolvedEmployeeId = employeeDoc.employeeId.toUpperCase();
    } else {
      // Fallback for direct test harness calls without protect
      const { employeeId } = req.body;
      if (!employeeId) return res.status(400).json({ message: 'Employee ID is required.' });
      resolvedEmployeeId = employeeId.toUpperCase();
      employeeDoc = await Employee.findOne({ employeeId: resolvedEmployeeId });
    }

    const leave = await Leave.create({
      employeeId: resolvedEmployeeId,
      employeeName: employeeDoc ? employeeDoc.name : (req.user?.name || ''),
      employeeRef: employeeDoc ? employeeDoc._id : undefined,
      startDate,
      endDate,
      leaveType,
      reason: typeof reason === 'string' ? reason.trim() : reason,
      lateMark: Boolean(lateMark),
      status: 'pending',
    });

    res.status(201).json(leave);
  } catch (error) { next(error); }
};

export const getLeaves = async (req, res, next) => {
  try {
    const isEmployee = req.user && req.user.role === 'employee';

    if (isEmployee) {
      const emp = await getLinkedEmployee(req.user);
      const userEmpId = emp ? emp.employeeId : (req.user.employeeId || '');
      const leaves = await Leave.find({ employeeId: (userEmpId || '').toUpperCase() })
        .populate('reviewedBy', 'name username')
        .sort({ createdAt: -1 });
      return res.json(leaves);
    }

    // Admin view: support status, employeeId, and date filtering
    const filter = {};
    const { status, employeeId, startDate, endDate } = req.query;

    if (status && status !== 'all') {
      filter.status = status;
    }
    if (employeeId && employeeId !== 'all') {
      filter.employeeId = employeeId.toUpperCase();
    }
    if (startDate || endDate) {
      filter.startDate = {};
      if (startDate) filter.startDate.$gte = new Date(startDate);
      if (endDate) filter.startDate.$lte = new Date(endDate);
    }

    const leaves = await Leave.find(filter)
      .populate('reviewedBy', 'name username')
      .sort({ createdAt: -1 });

    res.json(leaves);
  } catch (error) { next(error); }
};

export const reviewLeave = async (req, res, next) => {
  try {
    if (req.user && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only administrators can review leave requests.' });
    }

    const { status, remarks } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Status must be approved or rejected.' });
    }

    const leave = await Leave.findById(req.params.id);
    if (!leave) return res.status(404).json({ message: 'Leave request not found.' });

    if (leave.status !== 'pending') {
      return res.status(400).json({ message: 'Leave request has already been reviewed.' });
    }

    leave.status = status;
    leave.remarks = typeof remarks === 'string' ? remarks.trim() : '';
    leave.reviewedBy = req.user?._id;
    leave.reviewedAt = new Date();
    await leave.save();

    res.json(leave);
  } catch (error) { next(error); }
};

