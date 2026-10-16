import { useEffect, useMemo, useState } from 'react';
import {
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  GraduationCap,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Trash2,
  XCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { courseApi, employeeApi } from '../services/api';
import CourseModal from '../components/CourseModal';
import ReviewCertificateModal from '../components/ReviewCertificateModal';

const AVATAR_COLORS = [
  'bg-indigo-100 text-indigo-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-blue-100 text-blue-700',
  'bg-rose-100 text-rose-700',
  'bg-violet-100 text-violet-700',
];

function avatarColor(name = '') {
  return AVATAR_COLORS[(name.charCodeAt(0) || 0) % AVATAR_COLORS.length];
}

function getInitials(name = '') {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'EM'
  );
}

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

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
      const empNameMatch =
        c.employee?.name?.toLowerCase().includes(searchLower) ||
        c.employeeName?.toLowerCase().includes(searchLower);
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
    const inProgress = courses.filter(
      (c) => c.status === 'in-progress' || (c.progress > 0 && c.progress < 100)
    ).length;
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
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 size={13} className="text-emerald-600" />
            Verified
          </span>
        );
      case 'pending_review':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
            <Clock size={13} className="text-amber-600" />
            Pending Review
          </span>
        );
      case 'rejected':
        return (
          <span
            title={course.verificationRemarks ? `Remarks: ${course.verificationRemarks}` : 'Rejected by Admin'}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 cursor-help"
          >
            <XCircle size={13} className="text-rose-600" />
            Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
            No Certificate
          </span>
        );
    }
  };

  return (
    <div className="sp-page space-y-7">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">
              {isAdmin ? 'Workforce Upskilling' : 'Skill Development'}
            </p>
            <span className="rounded-full bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
              {isAdmin ? 'Admin Oversight' : 'Employee Portal'}
            </span>
          </div>
          <h1 className="mt-1.5 text-[1.6rem] font-semibold tracking-tight text-slate-900">
            {isAdmin ? 'Learning & Development Oversight' : 'My Learning & Certifications'}
          </h1>
          <p className="mt-1 text-sm text-slate-500 max-w-3xl">
            {isAdmin
              ? 'Monitor workforce upskilling, review certificate evidence, and verify course completions.'
              : 'Record courses, track self-reported milestones, and submit certificates for official verification.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-shrink-0">
          <button
            onClick={fetchCourses}
            className="sp-btn-secondary flex items-center gap-1.5 text-xs"
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

      {error && (
        <div className="sp-notice-error">
          <p>{error}</p>
        </div>
      )}

      {/* ── Summary Metrics Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Card 1: Total Enrolled */}
        <div className="sp-card flex items-center gap-4 p-5 min-h-[96px]">
          <div className="flex size-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 flex-shrink-0">
            <BookOpen size={22} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-500">
              {isAdmin ? 'Total Enrolled Courses' : 'My Courses'}
            </p>
            <p className="text-2xl font-bold tracking-tight text-slate-900">{metrics.total}</p>
            <p className="text-xs text-slate-400 truncate">{metrics.inProgress} active / in-progress</p>
          </div>
        </div>

        {/* Card 2: Completed Courses */}
        <div className="sp-card flex items-center gap-4 p-5 min-h-[96px]">
          <div className="flex size-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 flex-shrink-0">
            <GraduationCap size={22} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-500">Completed Courses</p>
            <p className="text-2xl font-bold tracking-tight text-emerald-600">{metrics.completed}</p>
            <p className="text-xs text-slate-400 truncate">Self-reported 100%</p>
          </div>
        </div>

        {/* Card 3: Pending Review */}
        <div className="sp-card flex items-center gap-4 p-5 min-h-[96px]">
          <div className="flex size-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600 flex-shrink-0">
            <Clock size={22} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-500">Pending Review</p>
            <p className="text-2xl font-bold tracking-tight text-amber-600">{metrics.pendingReview}</p>
            <p className="text-xs text-slate-400 truncate">Certificates awaiting review</p>
          </div>
        </div>

        {/* Card 4: Verified Certificates */}
        <div className="sp-card flex items-center gap-4 p-5 min-h-[96px]">
          <div className="flex size-12 items-center justify-center rounded-xl bg-purple-50 text-purple-600 flex-shrink-0">
            <Award size={22} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-500">Verified Certificates</p>
            <p className="text-2xl font-bold tracking-tight text-purple-700">{metrics.verified}</p>
            <p className="text-xs text-slate-400 truncate">Official company verified</p>
          </div>
        </div>
      </div>

      {/* ── Search & Filters Toolbar ── */}
      <div className="sp-card p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
          {/* Search Input: flexible, occupies available space */}
          <div className="relative flex-1 min-w-[240px]">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                isAdmin
                  ? 'Search by course title, platform, employee name, or ID...'
                  : 'Search your courses or platform...'
              }
              className="sp-input pl-10 text-xs sm:text-sm h-10 w-full"
            />
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2.5 text-xs sm:text-sm">
            {isAdmin && (
              <div className="w-full sm:w-auto min-w-[170px] flex-1 sm:flex-initial">
                <select
                  value={selectedEmpFilter}
                  onChange={(e) => setSelectedEmpFilter(e.target.value)}
                  className="sp-input text-xs sm:text-sm h-10 w-full"
                  aria-label="Filter by Employee"
                >
                  <option value="all">All Employees ({employees.length})</option>
                  {employees.map((emp) => (
                    <option key={emp._id} value={emp.employeeId}>
                      {emp.name} ({emp.employeeId})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="w-full sm:w-auto min-w-[140px] flex-1 sm:flex-initial">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="sp-input text-xs sm:text-sm h-10 w-full"
                aria-label="Filter by Course Status"
              >
                <option value="all">All Statuses</option>
                <option value="enrolled">Enrolled</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="dropped">Dropped</option>
              </select>
            </div>

            <div className="w-full sm:w-auto min-w-[160px] flex-1 sm:flex-initial">
              <select
                value={verificationFilter}
                onChange={(e) => setVerificationFilter(e.target.value)}
                className="sp-input text-xs sm:text-sm h-10 w-full"
                aria-label="Filter by Verification Status"
              >
                <option value="all">All Verifications</option>
                <option value="pending_review">Pending Review</option>
                <option value="verified">Verified</option>
                <option value="rejected">Rejected</option>
                <option value="not_submitted">Not Submitted</option>
              </select>
            </div>

            {(search ||
              statusFilter !== 'all' ||
              verificationFilter !== 'all' ||
              selectedEmpFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearch('');
                  setStatusFilter('all');
                  setVerificationFilter('all');
                  setSelectedEmpFilter('all');
                }}
                className="h-10 px-3 text-xs font-semibold text-slate-500 hover:text-indigo-600 hover:bg-slate-50 rounded-xl border border-dashed border-slate-300 transition-colors inline-flex items-center gap-1.5"
                title="Reset all filters"
              >
                <RotateCcw size={13} />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Course Records & Table ── */}
      <div className="sp-card overflow-hidden">
        {/* Table Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-4 bg-white">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">
              {isAdmin ? 'Employee Course Records' : 'Enrolled Courses & Certifications'}
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              Showing {filteredCourses.length} of {courses.length} total records
            </p>
          </div>
          {filteredCourses.length > 0 && (
            <div className="text-xs text-slate-400 hidden sm:flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-emerald-500"></span>
              <span>Scroll horizontally for full audit details</span>
            </div>
          )}
        </div>

        {loading ? (
          <div className="py-20 text-center text-slate-400 text-sm">
            <RefreshCw size={26} className="animate-spin mx-auto mb-2.5 text-indigo-500" />
            <p className="font-medium text-slate-600">Loading course records...</p>
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="py-20 text-center text-slate-500 text-sm px-4">
            <div className="size-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-300">
              <GraduationCap size={28} />
            </div>
            <p className="font-semibold text-slate-800 text-base">No courses found</p>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              {isAdmin
                ? 'No employee course records match your current search and filter criteria.'
                : "You haven't added any learning courses yet. Click '+ Add Course' in the top right to start tracking your professional development!"}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop / Tablet Scrollable Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className={`sp-table ${isAdmin ? 'min-w-[1080px]' : 'min-w-[920px]'}`}>
                <thead>
                  <tr>
                    {isAdmin && <th className="min-w-[210px] pl-6">Employee</th>}
                    <th className={`min-w-[260px] ${!isAdmin ? 'pl-6' : ''}`}>Course &amp; Platform</th>
                    <th className="min-w-[190px]">Self-Reported Progress</th>
                    <th className="min-w-[120px]">Status</th>
                    <th className="min-w-[160px]">Certificate</th>
                    <th className="min-w-[160px]">Verification</th>
                    <th className="min-w-[140px] text-right pr-6">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCourses.map((course) => {
                    const empName = course.employee?.name || course.employeeName || 'Employee';
                    const empDesig = course.employee?.designation || '';

                    return (
                      <tr key={course._id}>
                        {/* Employee column for Admin */}
                        {isAdmin && (
                          <td className="pl-6 py-4.5">
                            <div className="flex items-center gap-3">
                              <div
                                className={`flex size-9 items-center justify-center rounded-xl font-bold text-xs flex-shrink-0 ${avatarColor(
                                  empName
                                )}`}
                              >
                                {getInitials(empName)}
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-slate-900 truncate">{empName}</p>
                                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                                  <span className="font-mono text-indigo-600 font-medium">
                                    {course.employeeId}
                                  </span>
                                  {empDesig && (
                                    <span className="truncate max-w-[130px]">• {empDesig}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                        )}

                        {/* Course & Platform */}
                        <td className={`py-4.5 ${!isAdmin ? 'pl-6' : ''}`}>
                          <div className="flex items-start gap-1.5 max-w-[280px]">
                            <span className="font-semibold text-slate-900 leading-snug line-clamp-2">
                              {course.title}
                            </span>
                            {course.courseUrl && (
                              <a
                                href={course.courseUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-slate-400 hover:text-indigo-600 transition-colors mt-0.5 flex-shrink-0"
                                title="Open course website"
                              >
                                <ExternalLink size={13} />
                              </a>
                            )}
                          </div>
                          <div className="mt-1.5 flex flex-wrap items-center gap-2">
                            <span className="inline-block rounded-md bg-purple-50 px-2 py-0.5 text-[11px] font-semibold text-purple-700 border border-purple-100">
                              {course.platform}
                            </span>
                            {(course.startDate || course.endDate) && (
                              <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                                <Calendar size={11} className="text-slate-300" />
                                <span>
                                  {formatDate(course.startDate)}
                                  {course.startDate && course.endDate ? ' – ' : ''}
                                  {formatDate(course.endDate)}
                                </span>
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Progress */}
                        <td className="py-4.5">
                          <div className="w-full max-w-[170px]">
                            <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                              <span className="text-slate-500">Progress</span>
                              <span
                                className={
                                  course.progress === 100
                                    ? 'text-emerald-600 font-bold'
                                    : 'text-indigo-600 font-bold'
                                }
                              >
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
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-4.5">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
                              course.status === 'completed'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : course.status === 'in-progress'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : course.status === 'dropped'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}
                          >
                            {course.status}
                          </span>
                        </td>

                        {/* Certificate Evidence */}
                        <td className="py-4.5">
                          {course.certificateUrl ? (
                            <button
                              type="button"
                              onClick={() => setCourseToReview(course)}
                              className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors group"
                              title={course.certificateFileName || 'View Credential'}
                            >
                              <Award
                                size={14}
                                className="text-indigo-500 group-hover:scale-110 transition-transform"
                              />
                              <span className="truncate max-w-[130px] underline">
                                {course.certificateFileName || 'View Document'}
                              </span>
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400 italic">None submitted</span>
                          )}
                        </td>

                        {/* Verification */}
                        <td className="py-4.5">
                          {renderVerificationBadge(course)}
                          {course.verificationRemarks && (
                            <p
                              className="text-[11px] text-slate-400 mt-1 truncate max-w-[160px]"
                              title={course.verificationRemarks}
                            >
                              &ldquo;{course.verificationRemarks}&rdquo;
                            </p>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-4.5 text-right pr-6">
                          <div className="flex items-center justify-end gap-2">
                            {isAdmin && course.certificateUrl && (
                              <button
                                onClick={() => setCourseToReview(course)}
                                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                                  course.verificationStatus === 'pending_review'
                                    ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
                                    : 'border border-slate-200 text-slate-700 hover:bg-slate-100'
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
                                className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                              >
                                Update
                              </button>
                            )}

                            <button
                              onClick={() => handleDelete(course._id)}
                              className="rounded-xl p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                              title="Delete course record"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile / Narrow Screen Card View */}
            <div className="md:hidden divide-y divide-slate-100">
              {filteredCourses.map((course) => {
                const empName = course.employee?.name || course.employeeName || 'Employee';

                return (
                  <div
                    key={course._id}
                    className="p-4 sm:p-5 space-y-3.5 hover:bg-slate-50/50 transition-colors"
                  >
                    {/* Top Row: Employee or Title & Badge */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        {isAdmin && (
                          <div className="flex items-center gap-2 mb-1.5">
                            <div
                              className={`flex size-6 items-center justify-center rounded-lg font-bold text-[10px] ${avatarColor(
                                empName
                              )}`}
                            >
                              {getInitials(empName)}
                            </div>
                            <span className="font-semibold text-xs text-slate-900 truncate">
                              {empName}
                            </span>
                            <span className="font-mono text-[11px] text-indigo-600">
                              ({course.employeeId})
                            </span>
                          </div>
                        )}
                        <h3 className="font-semibold text-sm text-slate-900 flex items-center gap-1.5 leading-snug">
                          <span>{course.title}</span>
                          {course.courseUrl && (
                            <a
                              href={course.courseUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-slate-400 hover:text-indigo-600 flex-shrink-0"
                            >
                              <ExternalLink size={12} />
                            </a>
                          )}
                        </h3>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span className="rounded bg-purple-50 px-1.5 py-0.5 text-[10px] font-semibold text-purple-700 border border-purple-100">
                            {course.platform}
                          </span>
                          {(course.startDate || course.endDate) && (
                            <span className="text-[10px] text-slate-400">
                              {formatDate(course.startDate)} - {formatDate(course.endDate)}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        {renderVerificationBadge(course)}
                      </div>
                    </div>

                    {/* Progress Bar & Status */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 font-medium">Self-Reported Progress</span>
                        <span
                          className={
                            course.progress === 100
                              ? 'text-emerald-600 font-bold'
                              : 'text-indigo-600 font-bold'
                          }
                        >
                          {course.progress}%
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            course.progress === 100 ? 'bg-emerald-500' : 'bg-indigo-600'
                          }`}
                          style={{ width: `${course.progress}%` }}
                        />
                      </div>
                    </div>

                    {/* Certificate & Actions Footer */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                      <div>
                        {course.certificateUrl ? (
                          <button
                            type="button"
                            onClick={() => setCourseToReview(course)}
                            className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:underline"
                          >
                            <Award size={13} />
                            <span className="truncate max-w-[140px]">
                              {course.certificateFileName || 'View Credential'}
                            </span>
                          </button>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">No certificate</span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {isAdmin && course.certificateUrl && (
                          <button
                            onClick={() => setCourseToReview(course)}
                            className={`rounded-lg px-2.5 py-1 font-semibold text-xs ${
                              course.verificationStatus === 'pending_review'
                                ? 'bg-indigo-600 text-white'
                                : 'border border-slate-200 text-slate-700'
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
                            className="rounded-lg border border-slate-200 px-2.5 py-1 font-semibold text-slate-700 hover:bg-slate-100"
                          >
                            Update
                          </button>
                        )}

                        <button
                          onClick={() => handleDelete(course._id)}
                          className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
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
