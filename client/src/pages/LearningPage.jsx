import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  GraduationCap,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Users,
  XCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { courseApi, employeeApi } from '../services/api';
import CourseModal from '../components/CourseModal';
import ReviewCertificateModal from '../components/ReviewCertificateModal';

export default function LearningPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [courses, setCourses] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [verificationFilter, setVerificationFilter] = useState('all');
  const [selectedEmpFilter, setSelectedEmpFilter] = useState('all');

  // Modals
  const [courseModalOpen, setCourseModalOpen] = useState(false);
  const [courseToEdit, setCourseToEdit] = useState(null);
  const [courseToReview, setCourseToReview] = useState(null);

  const fetchCourses = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await courseApi.list();
      setCourses(data);
    } catch (err) {
      setError(err.message || 'Failed to load courses.');
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    if (!isAdmin) return;
    try {
      const list = await employeeApi.list();
      setEmployees(list);
    } catch {
      // Non-critical if fails
    }
  };

  useEffect(() => {
    fetchCourses();
    if (isAdmin) fetchEmployees();
  }, [isAdmin]);

  const handleDelete = async (courseId) => {
    if (!window.confirm('Are you sure you want to delete this course record?')) return;
    try {
      await courseApi.remove(courseId);
      fetchCourses();
    } catch (err) {
      alert(err.message || 'Failed to delete course.');
    }
  };

  // Filtered courses
  const filteredCourses = useMemo(() => {
    return courses.filter((c) => {
      // Search
      const searchLower = search.toLowerCase();
      const titleMatch = c.title?.toLowerCase().includes(searchLower);
      const platMatch = c.platform?.toLowerCase().includes(searchLower);
      const empNameMatch = c.employee?.name?.toLowerCase().includes(searchLower) || c.employeeName?.toLowerCase().includes(searchLower);
      const empIdMatch = (c.employeeId || '').toLowerCase().includes(searchLower);
      const matchesSearch = !search || titleMatch || platMatch || empNameMatch || empIdMatch;

      // Status
      const matchesStatus = statusFilter === 'all' || c.status === statusFilter;

      // Verification
      const matchesVerif =
        verificationFilter === 'all' || c.verificationStatus === verificationFilter;

      // Employee (Admin only)
      const matchesEmp =
        selectedEmpFilter === 'all' ||
        c.employeeId === selectedEmpFilter ||
        String(c.employee?._id || c.employee) === selectedEmpFilter;

      return matchesSearch && matchesStatus && matchesVerif && matchesEmp;
    });
  }, [courses, search, statusFilter, verificationFilter, selectedEmpFilter]);

  // Metrics
  const metrics = useMemo(() => {
    const total = courses.length;
    const inProgress = courses.filter((c) => c.status === 'in-progress' || (c.progress > 0 && c.progress < 100)).length;
    const completed = courses.filter((c) => c.status === 'completed' || c.progress === 100).length;
    const pendingReview = courses.filter((c) => c.verificationStatus === 'pending_review').length;
    const verified = courses.filter((c) => c.verificationStatus === 'verified').length;
    const rejected = courses.filter((c) => c.verificationStatus === 'rejected').length;
    const uniqueEmployees = new Set(courses.map((c) => c.employeeId)).size;

    return { total, inProgress, completed, pendingReview, verified, rejected, uniqueEmployees };
  }, [courses]);

  const renderVerificationBadge = (course) => {
    const status = course.verificationStatus || 'not_submitted';
    switch (status) {
      case 'verified':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 size={13} className="text-emerald-600" />
            Verified
          </span>
        );
      case 'pending_review':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
            <Clock size={13} className="text-amber-600" />
            Pending Review
          </span>
        );
      case 'rejected':
        return (
          <span
            title={course.verificationRemarks ? `Remarks: ${course.verificationRemarks}` : 'Rejected by Admin'}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 cursor-help"
          >
            <XCircle size={13} className="text-rose-600" />
            Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
            No Certificate
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">
              {isAdmin ? 'Learning & Development Oversight' : 'My Learning & Certifications'}
            </h2>
            <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-semibold text-purple-700">
              {isAdmin ? 'Admin View' : 'Employee Portal'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {isAdmin
              ? 'Monitor workforce upskilling, review certificate evidence, and verify course completions.'
              : 'Record courses, track self-reported milestones, and submit certificates for official verification.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchCourses}
            className="sp-btn sp-btn-secondary flex items-center gap-1.5 text-xs"
            title="Refresh list"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>

          {!isAdmin && (
            <button
              onClick={() => {
                setCourseToEdit(null);
                setCourseModalOpen(true);
              }}
              className="sp-btn-primary flex items-center gap-1.5 text-xs"
            >
              <Plus size={15} />
              <span>Add Course</span>
            </button>
          )}
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">
              {isAdmin ? 'Total Enrolled Courses' : 'My Courses'}
            </span>
            <BookOpen size={17} className="text-indigo-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">{metrics.total}</p>
          <p className="mt-0.5 text-[11px] text-slate-400">
            {metrics.inProgress} active / in-progress
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Completed Courses
            </span>
            <GraduationCap size={17} className="text-emerald-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">{metrics.completed}</p>
          <p className="mt-0.5 text-[11px] text-slate-400">Self-reported 100%</p>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 shadow-sm">
          <div className="flex items-center justify-between text-amber-700">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Pending Review
            </span>
            <Clock size={17} className="text-amber-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-amber-800">{metrics.pendingReview}</p>
          <p className="mt-0.5 text-[11px] text-amber-600">Certificates awaiting review</p>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-sm">
          <div className="flex items-center justify-between text-emerald-700">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Verified Certificates
            </span>
            <Award size={17} className="text-emerald-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-800">{metrics.verified}</p>
          <p className="mt-0.5 text-[11px] text-emerald-600">Official company verified</p>
        </div>
      </div>

      {/* Toolbar / Filters */}
      <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={isAdmin ? 'Search by course, platform, or employee...' : 'Search your courses or platform...'}
              className="sp-input pl-9 text-xs"
            />
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {isAdmin && (
              <select
                value={selectedEmpFilter}
                onChange={(e) => setSelectedEmpFilter(e.target.value)}
                className="sp-input text-xs w-44"
              >
                <option value="all">All Employees</option>
                {employees.map((emp) => (
                  <option key={emp._id} value={emp.employeeId}>
                    {emp.name} ({emp.employeeId})
                  </option>
                ))}
              </select>
            )}

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="sp-input text-xs w-36"
            >
              <option value="all">All Statuses</option>
              <option value="enrolled">Enrolled</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="dropped">Dropped</option>
            </select>

            <select
              value={verificationFilter}
              onChange={(e) => setVerificationFilter(e.target.value)}
              className="sp-input text-xs w-40"
            >
              <option value="all">All Verifications</option>
              <option value="pending_review">Pending Review</option>
              <option value="verified">Verified</option>
              <option value="rejected">Rejected</option>
              <option value="not_submitted">Not Submitted</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table / List */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-sm">
            <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-indigo-500" />
            Loading courses...
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-sm">
            <GraduationCap size={36} className="mx-auto mb-2 text-slate-300" />
            <p className="font-semibold text-slate-700">No courses found</p>
            <p className="text-xs text-slate-400 mt-1">
              {isAdmin
                ? 'No employee courses match your current search and filter criteria.'
                : "You haven't added any learning courses yet. Click '+ Add Course' to get started!"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  {isAdmin && <th className="px-4 py-3.5">Employee</th>}
                  <th className="px-4 py-3.5">Course & Platform</th>
                  <th className="px-4 py-3.5">Self-Reported Progress</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5">Certificate</th>
                  <th className="px-4 py-3.5">Verification</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredCourses.map((course) => {
                  const empName = course.employee?.name || course.employeeName || 'Employee';
                  const empDesig = course.employee?.designation || '';

                  return (
                    <tr key={course._id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Employee column for Admin */}
                      {isAdmin && (
                        <td className="px-4 py-3.5">
                          <div className="font-semibold text-slate-900">{empName}</div>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                            <span className="font-mono text-indigo-600 font-medium">{course.employeeId}</span>
                            {empDesig && <span>• {empDesig}</span>}
                          </div>
                        </td>
                      )}

                      {/* Course & Platform */}
                      <td className="px-4 py-3.5 max-w-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-900 truncate">{course.title}</span>
                          {course.courseUrl && (
                            <a
                              href={course.courseUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-slate-400 hover:text-indigo-600 transition-colors"
                              title="Visit course website"
                            >
                              <ExternalLink size={13} />
                            </a>
                          )}
                        </div>
                        <div className="mt-0.5 flex items-center gap-2">
                          <span className="inline-block rounded bg-purple-50 px-1.5 py-0.5 text-[10px] font-semibold text-purple-700 border border-purple-100">
                            {course.platform}
                          </span>
                          {(course.startDate || course.endDate) && (
                            <span className="text-[10px] text-slate-400">
                              {course.startDate ? new Date(course.startDate).toLocaleDateString() : ''}
                              {course.startDate && course.endDate ? ' - ' : ''}
                              {course.endDate ? new Date(course.endDate).toLocaleDateString() : ''}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Progress */}
                      <td className="px-4 py-3.5 w-48">
                        <div className="flex items-center justify-between text-[11px] font-semibold mb-1">
                          <span className="text-slate-600">Progress</span>
                          <span className={course.progress === 100 ? 'text-emerald-600 font-bold' : 'text-indigo-600'}>
                            {course.progress}%
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              course.progress === 100 ? 'bg-emerald-500' : 'bg-indigo-600'
                            }`}
                            style={{ width: `${course.progress}%` }}
                          />
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium capitalize ${
                          course.status === 'completed'
                            ? 'bg-emerald-50 text-emerald-700'
                            : course.status === 'in-progress'
                            ? 'bg-blue-50 text-blue-700'
                            : course.status === 'dropped'
                            ? 'bg-rose-50 text-rose-700'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {course.status}
                        </span>
                      </td>

                      {/* Certificate Evidence Link */}
                      <td className="px-4 py-3.5">
                        {course.certificateUrl ? (
                          <div className="flex items-center gap-1.5">
                            <Award size={14} className="text-indigo-600" />
                            <button
                              type="button"
                              onClick={() => setCourseToReview(course)}
                              className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 hover:underline truncate max-w-[120px]"
                            >
                              {course.certificateFileName || 'View Credential'}
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">None</span>
                        )}
                      </td>

                      {/* Verification Badge */}
                      <td className="px-4 py-3.5">
                        {renderVerificationBadge(course)}
                        {course.verificationRemarks && (
                          <div className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[140px]" title={course.verificationRemarks}>
                            &ldquo;{course.verificationRemarks}&rdquo;
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isAdmin && course.certificateUrl && (
                            <button
                              onClick={() => setCourseToReview(course)}
                              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                                course.verificationStatus === 'pending_review'
                                  ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
                                  : 'border border-slate-200 text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              {course.verificationStatus === 'pending_review' ? 'Review' : 'Audit'}
                            </button>
                          )}

                          {!isAdmin && (
                            <button
                              onClick={() => {
                                setCourseToEdit(course);
                                setCourseModalOpen(true);
                              }}
                              className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                            >
                              Update
                            </button>
                          )}

                          <button
                            onClick={() => handleDelete(course._id)}
                            className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                            title="Delete course"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Course Modal (Add / Edit) - Employee only */}
      {courseModalOpen && !isAdmin && (
        <CourseModal
          course={courseToEdit}
          onClose={() => {
            setCourseModalOpen(false);
            setCourseToEdit(null);
          }}
          onSuccess={fetchCourses}
        />
      )}

      {/* Review Certificate Modal (Admin) */}
      {courseToReview && (
        <ReviewCertificateModal
          course={courseToReview}
          onClose={() => setCourseToReview(null)}
          onSuccess={fetchCourses}
        />
      )}
    </div>
  );
}
