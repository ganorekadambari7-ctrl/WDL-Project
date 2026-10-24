import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Employee from '../models/Employee.js';

const publicUser = (user) => ({ id: user._id, name: user.name, username: user.username, email: user.email, role: user.role, department: user.department, employeeId: user.employeeId, employeeRef: user.employeeRef, phone: user.phone, jobTitle: user.jobTitle, dateOfJoining: user.dateOfJoining, address: user.address, profilePicture: user.profilePicture });

export const updateProfile = async (req, res, next) => {
  try {
    const { name, email, phone, department, jobTitle, employeeId, dateOfJoining, address, profilePicture } = req.body;
    if (!name || !email || !phone) return res.status(400).json({ message: 'Name, email, and phone number are required.' });
    if (!/^\d{10}$/.test(phone)) return res.status(400).json({ message: 'Phone number must contain exactly 10 digits.' });
    const duplicate = await User.findOne({ email: email.toLowerCase(), _id: { $ne: req.user._id } });
    if (duplicate) return res.status(409).json({ message: 'That email is already in use.' });
    req.user.name = name.trim();
    req.user.email = email.toLowerCase().trim();
    req.user.phone = phone;
    req.user.department = department || '';
    req.user.jobTitle = jobTitle || '';
    if (!req.user.employeeId) {
      req.user.employeeId = `EMP-${String(req.user._id).slice(-6).toUpperCase()}`;
    }
    req.user.dateOfJoining = dateOfJoining || undefined;
    req.user.address = address || '';
    if (profilePicture !== undefined) req.user.profilePicture = profilePicture;
    await req.user.save();

    // If user is linked to an Employee record, keep name synchronized
    if (req.user.employeeRef) {
      await Employee.findByIdAndUpdate(req.user.employeeRef, { name: req.user.name }).catch(() => {});
    }

    res.json(publicUser(req.user));
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

export const listUsers = async (_req, res, next) => {
  try {
    const users = await User.find().sort({ name: 1 });
    // Attach linked employee info for admin display
    const employees = await Employee.find().select('employeeId name userId department designation');
    const empById = Object.fromEntries(employees.map((e) => [String(e._id), e]));
    const empByUserId = Object.fromEntries(employees.filter((e) => e.userId).map((e) => [String(e.userId), e]));
    const empByEid = Object.fromEntries(employees.map((e) => [e.employeeId.toUpperCase(), e]));

    const result = users.map((u) => {
      let linked = null;
      if (u.employeeRef && empById[String(u.employeeRef)]) {
        linked = empById[String(u.employeeRef)];
      } else if (empByUserId[String(u._id)]) {
        linked = empByUserId[String(u._id)];
      } else if (u.employeeId && empByEid[u.employeeId.toUpperCase()]) {
        linked = empByEid[u.employeeId.toUpperCase()];
      }

      return {
        ...publicUser(u),
        isLinked: Boolean(linked),
        linkedEmployee: linked
          ? {
              _id: linked._id,
              employeeId: linked.employeeId,
              name: linked.name,
              department: linked.department,
              designation: linked.designation,
            }
          : null,
      };
    });
    res.json(result);
  } catch (error) { next(error); }
};

export const updateRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!['admin', 'employee'].includes(role)) return res.status(400).json({ message: 'Choose admin or employee.' });
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true });
    if (!user) return res.status(404).json({ message: 'User not found.' });
    res.json(publicUser(user));
  } catch (error) { next(error); }
};

/**
 * Admin-only: explicitly link a User account to an Employee record.
 * Body: { employeeId: "EMP-108" }   OR   { employeeObjectId: "<mongo _id>" }
 * This is the safe, explicit mechanism — no name guessing.
 */
export const linkEmployeeToUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });
    if (user.role !== 'employee') {
      return res.status(400).json({ message: 'Only employee-role users can be linked to an Employee record.' });
    }

    const { employeeId, employeeObjectId } = req.body;
    let emp = null;
    if (employeeObjectId) {
      emp = await Employee.findById(employeeObjectId);
    } else if (employeeId) {
      emp = await Employee.findOne({ employeeId: employeeId.toUpperCase() });
    }
    if (!emp) return res.status(404).json({ message: 'Employee record not found. Check the Employee ID.' });

    // Prevent duplicate or conflicting links
    const existingLinkedUser = await User.findOne({
      $or: [{ employeeRef: emp._id }, { employeeId: emp.employeeId.toUpperCase() }],
      _id: { $ne: user._id },
    });
    if (existingLinkedUser) {
      return res.status(409).json({
        message: `Employee "${emp.name}" (${emp.employeeId}) is already linked to user "${existingLinkedUser.name}" (${existingLinkedUser.email}). Unlink first to prevent duplicate assignments.`,
      });
    }

    const previousEmpForUser = await Employee.findOne({
      userId: user._id,
      _id: { $ne: emp._id },
    });
    if (previousEmpForUser) {
      previousEmpForUser.userId = undefined;
      await previousEmpForUser.save();
    }

    // Update User
    user.employeeId = emp.employeeId.toUpperCase();
    user.employeeRef = emp._id;
    await user.save();

    // Update Employee so userId is also set
    emp.userId = user._id;
    await emp.save();

    res.json({
      message: `User "${user.name}" successfully linked to Employee "${emp.name}" (${emp.employeeId}).`,
      user: publicUser(user),
      employee: emp,
    });
  } catch (error) { next(error); }
};

