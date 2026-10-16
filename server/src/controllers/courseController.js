import Course from '../models/Course.js';
import Employee from '../models/Employee.js';
import { getLinkedEmployee } from '../middleware/auth.js';

/**
 * GET /api/courses
 * Employee: Get own courses only.
 * Admin: Get all courses with optional filters (employeeId, status, verificationStatus).
 */
export const getCourses = async (req, res) => {
  try {
    const isEmployee = req.user.role === 'employee';
    const filter = {};

    if (isEmployee) {
      const linked = await getLinkedEmployee(req.user);
      const userEmpId = (req.user.employeeId || linked?.employeeId || '').toUpperCase();

      if (!userEmpId && !linked) {
        return res.json([]);
      }

      // Query by employee ObjectId or string employeeId
      if (linked) {
        filter.$or = [{ employee: linked._id }, { employeeId: userEmpId }];
      } else {
        filter.employeeId = userEmpId;
      }
    } else {
      // Admin filters
      if (req.query.employeeId) {
        filter.employeeId = req.query.employeeId.toUpperCase();
      }
      if (req.query.employee) {
        filter.employee = req.query.employee;
      }
    }

    if (req.query.status) {
      filter.status = req.query.status;
    }
    if (req.query.verificationStatus) {
      filter.verificationStatus = req.query.verificationStatus;
    }

    const courses = await Course.find(filter)
      .populate('employee', 'name employeeId designation grade')
      .populate('verifiedBy', 'name username')
      .sort({ createdAt: -1 });

    res.json(courses);
  } catch (err) {
    console.error('getCourses error:', err);
    res.status(500).json({ message: 'Failed to fetch courses.' });
  }
};

/**
 * GET /api/courses/:id
 * Employee: Can only view their own course.
 * Admin: Can view any course.
 */
export const getCourseById = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate('employee', 'name employeeId designation grade')
      .populate('verifiedBy', 'name username');

    if (!course) {
      return res.status(404).json({ message: 'Course not found.' });
    }

    if (req.user.role === 'employee') {
      const linked = await getLinkedEmployee(req.user);
      const userEmpId = (req.user.employeeId || linked?.employeeId || '').toUpperCase();
      const courseEmpId = (course.employeeId || '').toUpperCase();
      const isOwner =
        (linked && String(course.employee?._id || course.employee) === String(linked._id)) ||
        (userEmpId && courseEmpId === userEmpId);

      if (!isOwner) {
        return res.status(403).json({ message: 'Access denied. You can only view your own course records.' });
      }
    }

    res.json(course);
  } catch (err) {
    console.error('getCourseById error:', err);
    res.status(500).json({ message: 'Failed to retrieve course.' });
  }
};

/**
 * POST /api/courses
 * Employee: Submit course for themselves.
 * Admin: Can submit course for any specified employee.
 */
export const createCourse = async (req, res) => {
  try {
    const {
      title,
      platform,
      courseUrl,
      startDate,
      endDate,
      progress = 0,
      status,
      certificateType = 'none',
      certificateUrl,
      certificateFileName,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Course title is required.' });
    }
    if (!platform || !platform.trim()) {
      return res.status(400).json({ message: 'Platform / provider is required.' });
    }

    const numericProgress = Math.max(0, Math.min(100, Number(progress) || 0));

    let targetEmployee = null;

    if (req.user.role === 'employee') {
      targetEmployee = await getLinkedEmployee(req.user);
      if (!targetEmployee && req.user.employeeId) {
        targetEmployee = await Employee.findOne({ employeeId: req.user.employeeId.toUpperCase() });
      }
      if (!targetEmployee) {
        return res.status(400).json({
          message: 'Your user account is not securely linked to an employee record. Please contact Admin.',
        });
      }
    } else {
      // Admin creating
      if (req.body.employeeId) {
        targetEmployee = await Employee.findOne({ employeeId: req.body.employeeId.toUpperCase() });
      } else if (req.body.employee) {
        targetEmployee = await Employee.findById(req.body.employee);
      } else {
        targetEmployee = await getLinkedEmployee(req.user);
      }

      if (!targetEmployee) {
        return res.status(400).json({ message: 'Target employee could not be resolved.' });
      }
    }

    // Determine status
    let courseStatus = status || (numericProgress === 100 ? 'completed' : numericProgress > 0 ? 'in-progress' : 'enrolled');
    if (numericProgress === 100) {
      courseStatus = 'completed';
    }

    const hasCert = Boolean(certificateUrl && certificateUrl.trim());
    const certSubmittedAt = hasCert ? new Date() : undefined;
    const certVerification = hasCert ? 'pending_review' : 'not_submitted';

    const newCourse = new Course({
      employee: targetEmployee._id,
      employeeId: targetEmployee.employeeId.toUpperCase(),
      employeeName: targetEmployee.name,
      title: title.trim(),
      platform: platform.trim(),
      courseUrl: courseUrl?.trim() || '',
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      progress: numericProgress,
      status: courseStatus,
      certificateType: hasCert ? (certificateType || 'url') : 'none',
      certificateUrl: hasCert ? certificateUrl.trim() : '',
      certificateFileName: hasCert ? (certificateFileName?.trim() || '') : '',
      certificateSubmittedAt: certSubmittedAt,
      verificationStatus: certVerification,
    });

    await newCourse.save();

    const populated = await Course.findById(newCourse._id)
      .populate('employee', 'name employeeId designation grade');

    res.status(201).json(populated);
  } catch (err) {
    console.error('createCourse error:', err);
    res.status(500).json({ message: err.message || 'Failed to create course.' });
  }
};

/**
 * PUT /api/courses/:id
 * Employee: Can update own course details, progress, or submit certificate.
 * Admin: Can update course details.
 * (Verification status can only be modified via the dedicated verify endpoint by Admin)
 */
export const updateCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ message: 'Course not found.' });
    }

    const isEmployee = req.user.role === 'employee';
    if (isEmployee) {
      const linked = await getLinkedEmployee(req.user);
      const userEmpId = (req.user.employeeId || linked?.employeeId || '').toUpperCase();
      const courseEmpId = (course.employeeId || '').toUpperCase();
      const isOwner =
        (linked && String(course.employee) === String(linked._id)) ||
        (userEmpId && courseEmpId === userEmpId);

      if (!isOwner) {
        return res.status(403).json({ message: 'Access denied. You can only update your own courses.' });
      }
    }

    const {
      title,
      platform,
      courseUrl,
      startDate,
      endDate,
      progress,
      status,
      certificateType,
      certificateUrl,
      certificateFileName,
    } = req.body;

    if (title !== undefined) course.title = title.trim();
    if (platform !== undefined) course.platform = platform.trim();
    if (courseUrl !== undefined) course.courseUrl = courseUrl.trim();
    if (startDate !== undefined) course.startDate = startDate;
    if (endDate !== undefined) course.endDate = endDate;

    if (progress !== undefined) {
      const numProg = Math.max(0, Math.min(100, Number(progress) || 0));
      course.progress = numProg;
      if (numProg === 100) {
        course.status = 'completed';
      }
    }

    if (status !== undefined) {
      course.status = status;
      if (status === 'completed' && course.progress < 100) {
        course.progress = 100;
      }
    }

    // Check certificate submission
    if (certificateUrl !== undefined && certificateUrl.trim() !== '') {
      const isNewCert = certificateUrl.trim() !== course.certificateUrl;
      course.certificateUrl = certificateUrl.trim();
      course.certificateType = certificateType || (certificateUrl.startsWith('data:') ? 'file' : 'url');
      if (certificateFileName !== undefined) {
        course.certificateFileName = certificateFileName.trim();
      }

      if (isNewCert || course.verificationStatus === 'not_submitted' || course.verificationStatus === 'rejected') {
        course.certificateSubmittedAt = new Date();
        course.verificationStatus = 'pending_review';
        course.verifiedBy = undefined;
        course.verifiedAt = undefined;
        course.verificationRemarks = '';
      }
    }

    // Security: Do NOT let non-admin set verification status directly
    if (req.user.role === 'admin' && req.body.verificationStatus && ['verified', 'rejected', 'pending_review', 'not_submitted'].includes(req.body.verificationStatus)) {
      course.verificationStatus = req.body.verificationStatus;
      if (req.body.verificationStatus === 'verified' || req.body.verificationStatus === 'rejected') {
        course.verifiedBy = req.user._id;
        course.verifiedAt = new Date();
      }
      if (req.body.verificationRemarks !== undefined) {
        course.verificationRemarks = req.body.verificationRemarks;
      }
    }

    await course.save();

    const populated = await Course.findById(course._id)
      .populate('employee', 'name employeeId designation grade')
      .populate('verifiedBy', 'name username');

    res.json(populated);
  } catch (err) {
    console.error('updateCourse error:', err);
    res.status(500).json({ message: err.message || 'Failed to update course.' });
  }
};

/**
 * PUT /api/courses/:id/verify
 * Admin only: Verify or reject certificate with remarks.
 */
export const verifyCertificate = async (req, res) => {
  try {
    const { verificationStatus, verificationRemarks = '' } = req.body;

    if (!['verified', 'rejected'].includes(verificationStatus)) {
      return res.status(400).json({
        message: 'Invalid verification status. Must be "verified" or "rejected".',
      });
    }

    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ message: 'Course not found.' });
    }

    if (!course.certificateUrl) {
      return res.status(400).json({
        message: 'No certificate has been submitted for this course yet.',
      });
    }

    course.verificationStatus = verificationStatus;
    course.verifiedBy = req.user._id;
    course.verifiedAt = new Date();
    course.verificationRemarks = verificationRemarks.trim();

    await course.save();

    const populated = await Course.findById(course._id)
      .populate('employee', 'name employeeId designation grade')
      .populate('verifiedBy', 'name username');

    res.json({
      message: `Certificate has been ${verificationStatus === 'verified' ? 'verified' : 'rejected'}.`,
      course: populated,
    });
  } catch (err) {
    console.error('verifyCertificate error:', err);
    res.status(500).json({ message: 'Failed to verify certificate.' });
  }
};

/**
 * DELETE /api/courses/:id
 * Employee: Can delete own unverified course.
 * Admin: Can delete any course.
 */
export const deleteCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ message: 'Course not found.' });
    }

    if (req.user.role === 'employee') {
      const linked = await getLinkedEmployee(req.user);
      const userEmpId = (req.user.employeeId || linked?.employeeId || '').toUpperCase();
      const courseEmpId = (course.employeeId || '').toUpperCase();
      const isOwner =
        (linked && String(course.employee) === String(linked._id)) ||
        (userEmpId && courseEmpId === userEmpId);

      if (!isOwner) {
        return res.status(403).json({ message: 'Access denied. You can only delete your own courses.' });
      }
    }

    await Course.findByIdAndDelete(req.params.id);
    res.json({ message: 'Course record deleted successfully.' });
  } catch (err) {
    console.error('deleteCourse error:', err);
    res.status(500).json({ message: 'Failed to delete course.' });
  }
};
