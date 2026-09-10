import Attendance from '../models/Attendance.js';

const monthRange = (month) => {
  const [year, value] = (month || new Date().toISOString().slice(0, 7)).split('-').map(Number);
  return { start: new Date(Date.UTC(year, value - 1, 1)), end: new Date(Date.UTC(year, value, 1)) };
};

export const markAttendance = async (req, res, next) => {
  try {
    const { employeeId, date, status } = req.body;
    if (!employeeId || !date || !['present', 'absent'].includes(status)) return res.status(400).json({ message: 'Employee ID, date, and valid status are required.' });
    const normalizedDate = new Date(`${date.slice(0, 10)}T00:00:00.000Z`);
    const attendance = await Attendance.findOneAndUpdate(
      { employeeId: employeeId.toUpperCase(), date: normalizedDate },
      { employeeId: employeeId.toUpperCase(), date: normalizedDate, status },
      { new: true, upsert: true, runValidators: true }
    );
    res.status(201).json(attendance);
  } catch (error) { next(error); }
};

export const getEmployeeAttendance = async (req, res, next) => {
  try {
    const { start, end } = monthRange(req.query.month);
    const records = await Attendance.find({ employeeId: req.params.employeeId.toUpperCase(), date: { $gte: start, $lt: end } }).sort({ date: 1 });
    const present = records.filter((record) => record.status === 'present').length;
    res.json({ records, summary: { total: records.length, present, absent: records.length - present, percentage: records.length ? Number(((present / records.length) * 100).toFixed(1)) : 0 } });
  } catch (error) { next(error); }
};
