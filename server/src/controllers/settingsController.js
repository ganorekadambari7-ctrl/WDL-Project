import bcrypt from 'bcryptjs';
import User from '../models/User.js';

const publicUser = (user) => ({ id: user._id, name: user.name, username: user.username, email: user.email, role: user.role, department: user.department, employeeId: user.employeeId, phone: user.phone, jobTitle: user.jobTitle, dateOfJoining: user.dateOfJoining, address: user.address, profilePicture: user.profilePicture });

export const updateProfile = async (req, res, next) => {
  try {
    const { name, email, phone, department, jobTitle, employeeId, dateOfJoining, address, profilePicture } = req.body;
    if (!name || !email || !phone) return res.status(400).json({ message: 'Name, email, and phone number are required.' });
    if (!/^\d{10}$/.test(phone)) return res.status(400).json({ message: 'Phone number must contain exactly 10 digits.' });
    const duplicate = await User.findOne({ email: email.toLowerCase(), _id: { $ne: req.user._id } });
    if (duplicate) return res.status(409).json({ message: 'That email is already in use.' });
    req.user.name = name.trim(); req.user.email = email.toLowerCase().trim(); req.user.phone = phone; req.user.department = department || ''; req.user.jobTitle = jobTitle || ''; req.user.employeeId = employeeId || req.user.employeeId || `EMP-${String(req.user._id).slice(-6).toUpperCase()}`; req.user.dateOfJoining = dateOfJoining || undefined; req.user.address = address || ''; if (profilePicture !== undefined) req.user.profilePicture = profilePicture;
    await req.user.save(); res.json(publicUser(req.user));
  } catch (error) { next(error); }
};

export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword || newPassword.length < 8) return res.status(400).json({ message: 'Provide your current password and a new password of at least 8 characters.' });
    const user = await User.findById(req.user._id).select('+password');
    if (!(await bcrypt.compare(currentPassword, user.password))) return res.status(400).json({ message: 'Your current password is incorrect.' });
    user.password = await bcrypt.hash(newPassword, 12); await user.save(); res.json({ message: 'Password changed successfully.' });
  } catch (error) { next(error); }
};

export const removeProfilePicture = async (req, res, next) => {
  try {
    req.user.profilePicture = '';
    await req.user.save();
    res.json(publicUser(req.user));
  } catch (error) { next(error); }
};

export const listUsers = async (_req, res, next) => { try { res.json(await User.find().sort({ name: 1 })); } catch (error) { next(error); } };
export const updateRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!['admin', 'employee'].includes(role)) return res.status(400).json({ message: 'Choose admin or employee.' });
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true });
    if (!user) return res.status(404).json({ message: 'User not found.' });
    res.json(publicUser(user));
  } catch (error) { next(error); }
};
