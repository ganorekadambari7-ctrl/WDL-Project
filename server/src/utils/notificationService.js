import Notification from '../models/Notification.js';
import User from '../models/User.js';
import Employee from '../models/Employee.js';

/**
 * Dispatch notification to all Admins when an employee adds a new course.
 */
export const notifyAdminsOnNewCourse = async (senderUser, course, employeeDoc) => {
  try {
    const admins = await User.find({ role: 'admin' }).select('_id');
    if (!admins.length) return;

    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    const notificationsToCreate = [];

    for (const admin of admins) {
      // Prevent duplicate notification on fast retries
      const exists = await Notification.findOne({
        recipient: admin._id,
        course: course._id,
        type: 'course_submitted',
        createdAt: { $gte: oneMinuteAgo },
      });

      if (!exists) {
        notificationsToCreate.push({
          recipient: admin._id,
          sender: senderUser?._id,
          type: 'course_submitted',
          title: 'New Course Added',
          message: `${employeeDoc?.name || course.employeeName || 'An employee'} (${course.employeeId}) registered for "${course.title}" on ${course.platform}.`,
          course: course._id,
          metadata: {
            employeeName: employeeDoc?.name || course.employeeName,
            courseTitle: course.title,
          },
        });
      }
    }

    if (notificationsToCreate.length) {
      await Notification.insertMany(notificationsToCreate);
    }
  } catch (err) {
    console.error('Error dispatching notifyAdminsOnNewCourse:', err);
  }
};

/**
 * Dispatch notification to all Admins when an employee submits certificate evidence for review.
 */
export const notifyAdminsOnCertificateSubmitted = async (senderUser, course, employeeDoc) => {
  try {
    const admins = await User.find({ role: 'admin' }).select('_id');
    if (!admins.length) return;

    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    const notificationsToCreate = [];

    for (const admin of admins) {
      const exists = await Notification.findOne({
        recipient: admin._id,
        course: course._id,
        type: 'certificate_submitted',
        createdAt: { $gte: oneMinuteAgo },
      });

      if (!exists) {
        notificationsToCreate.push({
          recipient: admin._id,
          sender: senderUser?._id,
          type: 'certificate_submitted',
          title: 'Certificate Submitted for Review',
          message: `${employeeDoc?.name || course.employeeName || 'An employee'} (${course.employeeId}) submitted certificate evidence for "${course.title}".`,
          course: course._id,
          metadata: {
            employeeName: employeeDoc?.name || course.employeeName,
            courseTitle: course.title,
          },
        });
      }
    }

    if (notificationsToCreate.length) {
      await Notification.insertMany(notificationsToCreate);
    }
  } catch (err) {
    console.error('Error dispatching notifyAdminsOnCertificateSubmitted:', err);
  }
};

/**
 * Dispatch notification to the specific Employee user when Admin verifies or rejects their certificate.
 */
export const notifyEmployeeOnCertificateDecision = async (adminUser, course, decision, remarks = '') => {
  try {
    let targetUserId = null;

    const empRef = course.employee?._id || course.employee;

    // 1. Check Employee doc's userId
    if (empRef) {
      const emp = await Employee.findById(empRef).select('userId employeeId');
      if (emp?.userId) {
        targetUserId = emp.userId;
      }
    }

    // 2. Check User with employeeRef
    if (!targetUserId && empRef) {
      const u = await User.findOne({ employeeRef: empRef }).select('_id');
      if (u) targetUserId = u._id;
    }

    // 3. Check User with string employeeId
    if (!targetUserId && course.employeeId) {
      const u = await User.findOne({ employeeId: course.employeeId.toUpperCase() }).select('_id');
      if (u) targetUserId = u._id;
    }

    if (!targetUserId) {
      // No linked user account found; safe exit
      return;
    }

    const isVerified = decision === 'verified';
    const type = isVerified ? 'certificate_verified' : 'certificate_rejected';
    const title = isVerified ? 'Certificate Verified' : 'Certificate Rejected';
    const cleanRemarks = remarks?.trim() || '';

    const message = isVerified
      ? `Your certificate for "${course.title}" was verified by Admin.${cleanRemarks ? ` Note: "${cleanRemarks}"` : ''}`
      : `Your certificate for "${course.title}" was rejected by Admin.${cleanRemarks ? ` Remarks: "${cleanRemarks}"` : ''}`;

    // Prevent duplicate within last minute
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    const exists = await Notification.findOne({
      recipient: targetUserId,
      course: course._id,
      type,
      createdAt: { $gte: oneMinuteAgo },
    });

    if (!exists) {
      await Notification.create({
        recipient: targetUserId,
        sender: adminUser?._id,
        type,
        title,
        message,
        course: course._id,
        metadata: {
          courseTitle: course.title,
          remarks: cleanRemarks,
        },
      });
    }
  } catch (err) {
    console.error('Error dispatching notifyEmployeeOnCertificateDecision:', err);
  }
};
