import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { getEffectiveEmployeeId } from '../middleware/auth.js';

const allowedEmail = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

const makeToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });

const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  username: user.username,
  email: user.email,
  role: user.role,
  department: user.department,
  employeeId: user.employeeId || (user.role === 'employee' ? `EMP-${String(user._id).slice(-6).toUpperCase()}` : undefined),
  phone: user.phone,
  jobTitle: user.jobTitle,
  dateOfJoining: user.dateOfJoining,
  address: user.address,
  profilePicture: user.profilePicture
});

export const register = async (req, res, next) => {
  try {
    const { name, username, email, password, role } = req.body;
    const normalizedEmail = email?.trim().toLowerCase();
    if (!name || !username || !normalizedEmail || !password || !role) {
      return res.status(400).json({ message: 'Name, username, email, password, and role are required.' });
    }
    if (!['admin', 'employee'].includes(role)) {
      return res.status(400).json({ message: 'Please select a valid role.' });
    }
    if (!/^[A-Za-z .'-]{1,60}$/.test(name) || !/^[A-Za-z0-9._-]{4,20}$/.test(username)) {
      return res.status(400).json({ message: 'Please enter a valid name and username.' });
    }
    if (!allowedEmail.test(normalizedEmail)) {
      return res.status(400).json({ message: 'Please enter a valid email address.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must contain at least 6 characters.' });
    }
    if (await User.findOne({ $or: [{ email: normalizedEmail }, { username }] })) {
      return res.status(409).json({ message: 'That email or username is already in use.' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await User.create({ name, username, email: normalizedEmail, password: hashedPassword, role });
    if (user.role === 'employee' && !user.employeeId) {
      user.employeeId = await getEffectiveEmployeeId(user);
    }
    return res.status(201).json({ token: makeToken(user), user: publicUser(user) });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password, role } = req.body;
    const identity = email?.trim();
    if (!identity || !password || !role) {
      return res.status(401).json({ message: 'Invalid username/email or password.' });
    }
    const validIdentity = identity.includes('@')
      ? allowedEmail.test(identity)
      : /^[A-Za-z0-9._-]{4,20}$/.test(identity);
    if (!validIdentity || password.length < 6) {
      return res.status(401).json({ message: 'Invalid username/email or password.' });
    }
    const user = await User.findOne({ $or: [{ email: identity.toLowerCase() }, { username: identity }] }).select('+password');
    const validPassword = user && (await bcrypt.compare(password, user.password));
    if (!validPassword || user.role !== role) {
      return res.status(401).json({ message: 'Invalid username/email or password.' });
    }
    if (user.role === 'employee' && !user.employeeId) {
      user.employeeId = await getEffectiveEmployeeId(user);
    }
    return res.json({ token: makeToken(user), user: publicUser(user) });
  } catch (error) {
    next(error);
  }
};
