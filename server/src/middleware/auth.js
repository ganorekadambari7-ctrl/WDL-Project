import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Employee from '../models/Employee.js';

/**
 * Resolve the canonical employeeId for a user — using stable references first.
 *
 * Priority:
 *   1. user.employeeRef (ObjectId → Employee doc)  — most stable
 *   2. user.employeeId  (string already stored)
 *   3. Employee.userId match                        — admin-linked record
 *   4. fallback: EMP-{last6 of _id}
 *
 * Name-based matching has been removed; it caused false links.
 * Admins must use the /api/settings/link-employee endpoint to create explicit links.
 */
export const getEffectiveEmployeeId = async (user) => {
  if (!user) return null;

  // 1. Stable ObjectId reference already set
  if (user.employeeRef) {
    const emp = await Employee.findById(user.employeeRef).select('employeeId');
    if (emp) {
      const eid = emp.employeeId.toUpperCase();
      if (user.employeeId !== eid) {
        user.employeeId = eid;
        await user.save().catch(() => {});
      }
      return eid;
    }
  }

  // 2. String employeeId already stored on User
  if (user.employeeId) return user.employeeId.toUpperCase();

  // 3. Employee doc has userId pointing to this user
  const byUserId = await Employee.findOne({ userId: user._id }).select('employeeId');
  if (byUserId) {
    const eid = byUserId.employeeId.toUpperCase();
    user.employeeId = eid;
    user.employeeRef = byUserId._id;
    await user.save().catch(() => {});
    return eid;
  }

  // 4. Fallback — unique but not linked to an Employee record
  const fallback = `EMP-${String(user._id).slice(-6).toUpperCase()}`;
  user.employeeId = fallback;
  await user.save().catch(() => {});
  return fallback;
};

/**
 * Resolve the linked Employee document for a user.
 * Returns null if the user has no explicit Employee record link.
 */
export const getLinkedEmployee = async (user) => {
  if (!user) return null;
  if (user.employeeRef) {
    const emp = await Employee.findById(user.employeeRef);
    if (emp) return emp;
  }
  if (user.employeeId) {
    const emp = await Employee.findOne({ employeeId: user.employeeId.toUpperCase() });
    if (emp) return emp;
  }
  const emp = await Employee.findOne({ userId: user._id });
  return emp || null;
};

export const protect = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ message: 'Authentication required.' });
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(payload.id);
    if (!req.user) return res.status(401).json({ message: 'User no longer exists.' });
    if (req.user.role === 'employee') {
      const eid = await getEffectiveEmployeeId(req.user);
      if (eid) req.user.employeeId = eid;
    }
    next();
  } catch {
    res.status(401).json({ message: 'Invalid or expired session.' });
  }
};

export const authorize = (...roles) => (req, res, next) =>
  roles.includes(req.user?.role) ? next() : res.status(403).json({ message: 'Permission denied.' });
