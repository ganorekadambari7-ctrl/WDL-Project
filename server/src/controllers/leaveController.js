import Leave from '../models/Leave.js';

export const applyLeave = async (req, res, next) => {
  try {
    const { employeeId, startDate, endDate, leaveType, reason, lateMark } = req.body;
    if (!employeeId || !startDate || !endDate || !leaveType || !reason) return res.status(400).json({ message: 'Complete all required leave fields.' });
    if (new Date(endDate) < new Date(startDate)) return res.status(400).json({ message: 'End date cannot be before the start date.' });
    const leave = await Leave.create({ employeeId, startDate, endDate, leaveType, reason, lateMark });
    res.status(201).json(leave);
  } catch (error) { next(error); }
};

export const getLeaves = async (_req, res, next) => {
  try { res.json(await Leave.find().sort({ createdAt: -1 })); } catch (error) { next(error); }
};

export const reviewLeave = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['approved', 'rejected'].includes(status)) return res.status(400).json({ message: 'Status must be approved or rejected.' });
    const leave = await Leave.findByIdAndUpdate(req.params.id, { status, reviewedBy: req.user._id }, { new: true });
    if (!leave) return res.status(404).json({ message: 'Leave request not found.' });
    res.json(leave);
  } catch (error) { next(error); }
};
