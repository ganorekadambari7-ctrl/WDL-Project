import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Employee from '../models/Employee.js';

export const getEffectiveEmployeeId = async (user) => {
  if (!user) return null;
  if (user.employeeId) return user.employeeId.toUpperCase();
  const match = await Employee.findOne({ name: new RegExp(`^${user.name}$`, 'i') });
  if (match) {
    user.employeeId = match.employeeId.toUpperCase();
    await user.save().catch(() => {});
    return match.employeeId.toUpperCase();
  }
  const fallback = `EMP-${String(user._id).slice(-6).toUpperCase()}`;
  user.employeeId = fallback;
  await user.save().catch(() => {});
  return fallback;
};

export const protect = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ message: 'Authentication required.' });
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(payload.id);
    if (!req.user) return res.status(401).json({ message: 'User no longer exists.' });
    if (req.user.role === 'employee' && !req.user.employeeId) {
      req.user.employeeId = await getEffectiveEmployeeId(req.user);
    }
    next();
  } catch {
    res.status(401).json({ message: 'Invalid or expired session.' });
  }
};

export const authorize = (...roles) => (req, res, next) =>
  roles.includes(req.user?.role) ? next() : res.status(403).json({ message: 'Permission denied.' });
