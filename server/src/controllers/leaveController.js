import Leave from '../models/Leave.js';

export const applyLeave = async (req, res, next) => {
  try {
    const { employeeId, startDate, endDate, leaveType, reason, lateMark } = req.body;
    if (!employeeId || !startDate || !endDate || !leaveType || !reason) {
      return res.status(400).json({ message: 'Complete all required leave fields.' });
    }

    // RBAC: Employees can ONLY submit leave requests for their own account
    if (req.user && req.user.role === 'employee') {
      const userEmpId = (req.user.employeeId || '').toUpperCase();
      if (!userEmpId || employeeId.toUpperCase() !== userEmpId) {
        return res.status(403).json({ message: 'You are not authorized to submit leave requests for other employees.' });
      }
    }

    if (new Date(endDate) < new Date(startDate)) {
      return res.status(400).json({ message: 'End date cannot be before the start date.' });
    }
    const leave = await Leave.create({
      employeeId: employeeId.toUpperCase(),
      startDate,
      endDate,
      leaveType,
      reason,
      lateMark
    });
    res.status(201).json(leave);
  } catch (error) { next(error); }
};

export const getLeaves = async (req, res, next) => {
  try {
    // RBAC: Admins view all leaves; Employees view only their own records
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
