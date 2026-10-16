import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Filter,
  MessageSquare,
  RotateCcw,
  Send,
  X,
  XCircle,
} from 'lucide-react';
import { employeeApi, leaveApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

const fmt = (v) => {
  if (!v) return '—';
  return new Date(v).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const fmtDateTime = (v) => {
  if (!v) return '—';
  return new Date(v).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const STATUS_BADGE = {
  pending: 'sp-badge-amber',
  approved: 'sp-badge-emerald',
  rejected: 'sp-badge-rose',
};

export default function LeavePage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  // Common state
  const [leaves, setLeaves] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState({ msg: '', ok: true });

  // Admin filter state
  const [statusFilter, setStatusFilter] = useState('all');
  const [employeeFilter, setEmployeeFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState({ start: '', end: '' });

  // Admin review modal state
  const [reviewModal, setReviewModal] = useState({
    isOpen: false,
    leave: null,
    action: 'approved', // 'approved' | 'rejected'
    remarks: '',
    confirmed: false,
    submitting: false,
  });

  // Employee form state
  const [saving, setSaving] = useState(false);
  const [myEmployee, setMyEmployee] = useState(null);
  const [linkError, setLinkError] = useState('');
  const [form, setForm] = useState({
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date().toISOString().slice(0, 10),
    leaveType: 'full-day',
    reason: '',
    lateMark: false,
  });

  const loadData = async () => {
    setLoading(true);
    try {
      if (isAdmin) {
        const [empList, leaveList] = await Promise.all([
          employeeApi.list(),
          leaveApi.list(),
        ]);
        setEmployees(empList || []);
        setLeaves(leaveList || []);
      } else {
        const leaveList = await leaveApi.list();
        setLeaves(leaveList || []);
        try {
          const emp = await employeeApi.me();
          setMyEmployee(emp);
        } catch (e) {
          setLinkError(e.message || 'No employee record linked to your account.');
        }
      }
    } catch (err) {
      setNotice({ msg: err.message, ok: false });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [isAdmin]); // eslint-disable-line react-hooks/exhaustive-deps

  const names = useMemo(
    () => Object.fromEntries(employees.map((e) => [e.employeeId, e.name])),
    [employees]
  );

  // Filtered leaves for Admin Dashboard
  const filteredLeaves = useMemo(() => {
    if (!isAdmin) return leaves;
    return leaves.filter((l) => {
      if (statusFilter !== 'all' && l.status !== statusFilter) return false;
      if (employeeFilter !== 'all' && l.employeeId !== employeeFilter) return false;
      if (dateFilter.start && new Date(l.startDate) < new Date(dateFilter.start)) return false;
      if (dateFilter.end && new Date(l.endDate) > new Date(dateFilter.end)) return false;
      return true;
    });
  }, [isAdmin, leaves, statusFilter, employeeFilter, dateFilter]);

  // Counts for summary cards
  const counts = useMemo(() => {
    return {
      total: leaves.length,
      pending: leaves.filter((l) => l.status === 'pending').length,
      approved: leaves.filter((l) => l.status === 'approved').length,
      rejected: leaves.filter((l) => l.status === 'rejected').length,
    };
  }, [leaves]);

  // Employee: Submit Leave Request
  const handleEmployeeSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setNotice({ msg: '', ok: true });
    try {
      const payload = {
        startDate: form.startDate,
        endDate: form.endDate,
        leaveType: form.leaveType,
        reason: form.reason,
        lateMark: form.lateMark,
      };
      const newLeave = await leaveApi.apply(payload);
      setLeaves((cur) => [newLeave, ...cur]);
      setForm((c) => ({ ...c, reason: '', lateMark: false }));
      setNotice({ msg: 'Leave request submitted successfully.', ok: true });
    } catch (err) {
      setNotice({ msg: err.message, ok: false });
    } finally {
      setSaving(false);
    }
  };

  // Admin: Open Review Modal
  const openReviewModal = (leave, defaultAction = 'approved') => {
    setReviewModal({
      isOpen: true,
      leave,
      action: defaultAction,
      remarks: '',
      confirmed: false,
      submitting: false,
    });
  };

  // Admin: Confirm and Submit Review
  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!reviewModal.confirmed) {
      return alert('Please check the confirmation box before submitting the review.');
    }
    setReviewModal((cur) => ({ ...cur, submitting: true }));
    try {
      const updated = await leaveApi.review(reviewModal.leave._id, {
        status: reviewModal.action,
        remarks: reviewModal.remarks,
      });
      setLeaves((cur) => cur.map((l) => (l._id === updated._id ? updated : l)));
      setNotice({
        msg: `Leave request for ${updated.employeeName || updated.employeeId} has been ${updated.status}.`,
        ok: true,
      });
      setReviewModal({
        isOpen: false,
        leave: null,
        action: 'approved',
        remarks: '',
        confirmed: false,
        submitting: false,
      });
    } catch (err) {
      alert(`Error reviewing leave: ${err.message}`);
      setReviewModal((cur) => ({ ...cur, submitting: false }));
    }
  };

  const resetFilters = () => {
    setStatusFilter('all');
    setEmployeeFilter('all');
    setDateFilter({ start: '', end: '' });
  };

  return (
    <div className="sp-page">
      {/* ── Page Header ── */}
      <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">
            {isAdmin ? 'Administration & Approvals' : 'Time Off & Attendance'}
          </p>
          <h1 className="mt-1.5 text-[1.6rem] font-semibold tracking-tight text-slate-900">
            {isAdmin ? 'Leave Approval Dashboard' : 'Leave Management'}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {isAdmin
              ? 'Review and manage employee leave requests, approve or reject applications, and track history.'
              : 'Submit and track your leave applications and review administrator feedback.'}
          </p>
        </div>
      </div>

      {/* ── Global Alert Banner ── */}
      {notice.msg && (
        <div
          className={`mb-6 flex items-center justify-between rounded-xl px-4 py-3 text-sm font-medium ${
            notice.ok ? 'sp-notice-success' : 'sp-notice-error'
          }`}
        >
          <span>{notice.msg}</span>
          <button
            onClick={() => setNotice({ msg: '', ok: true })}
            className="text-xs font-semibold underline hover:opacity-75"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          ADMIN VIEW: LEAVE APPROVAL DASHBOARD (NO APPLY FORM)
         ══════════════════════════════════════════════════════════ */}
      {isAdmin && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="sp-card flex items-center gap-4 p-5">
              <div className="flex size-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Calendar size={22} />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Total Requests</p>
                <p className="text-2xl font-bold tracking-tight text-slate-900">{counts.total}</p>
                <p className="text-xs text-slate-400">All submitted applications</p>
              </div>
            </div>

            <div className="sp-card flex items-center gap-4 p-5">
              <div className="flex size-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <Clock size={22} />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Pending Review</p>
                <p className="text-2xl font-bold tracking-tight text-amber-600">{counts.pending}</p>
                <p className="text-xs text-slate-400">Requires administrator action</p>
              </div>
            </div>

            <div className="sp-card flex items-center gap-4 p-5">
              <div className="flex size-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <CheckCircle2 size={22} />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Approved Requests</p>
                <p className="text-2xl font-bold tracking-tight text-emerald-600">{counts.approved}</p>
                <p className="text-xs text-slate-400">Granted time-off</p>
              </div>
            </div>

            <div className="sp-card flex items-center gap-4 p-5">
              <div className="flex size-12 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                <XCircle size={22} />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Rejected Requests</p>
                <p className="text-2xl font-bold tracking-tight text-rose-600">{counts.rejected}</p>
                <p className="text-xs text-slate-400">Declined applications</p>
              </div>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="sp-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Filter size={16} className="text-slate-400" />
                <span className="text-sm font-semibold text-slate-700">Filter Requests</span>
              </div>
              {(statusFilter !== 'all' || employeeFilter !== 'all' || dateFilter.start || dateFilter.end) && (
                <button
                  onClick={resetFilters}
                  className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-indigo-600"
                >
                  <RotateCcw size={12} />
                  Reset all filters
                </button>
              )}
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {/* Status Filter */}
              <div>
                <label className="block text-xs font-medium text-slate-500">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="mt-1 sp-input text-sm py-2"
                >
                  <option value="all">All Statuses ({counts.total})</option>
                  <option value="pending">Pending ({counts.pending})</option>
                  <option value="approved">Approved ({counts.approved})</option>
                  <option value="rejected">Rejected ({counts.rejected})</option>
                </select>
              </div>

              {/* Employee Filter */}
              <div>
                <label className="block text-xs font-medium text-slate-500">Employee</label>
                <select
                  value={employeeFilter}
                  onChange={(e) => setEmployeeFilter(e.target.value)}
                  className="mt-1 sp-input text-sm py-2"
                >
                  <option value="all">All Employees</option>
                  {employees.map((e) => (
                    <option key={e._id} value={e.employeeId}>
                      {e.name} ({e.employeeId})
                    </option>
                  ))}
                </select>
              </div>

              {/* Date From */}
              <div>
                <label className="block text-xs font-medium text-slate-500">From Date</label>
                <input
                  type="date"
                  value={dateFilter.start}
                  onChange={(e) => setDateFilter((c) => ({ ...c, start: e.target.value }))}
                  className="mt-1 sp-input text-sm py-2"
                />
              </div>

              {/* Date To */}
              <div>
                <label className="block text-xs font-medium text-slate-500">To Date</label>
                <input
                  type="date"
                  value={dateFilter.end}
                  onChange={(e) => setDateFilter((c) => ({ ...c, end: e.target.value }))}
                  className="mt-1 sp-input text-sm py-2"
                />
              </div>
            </div>
          </div>

          {/* Leave Requests Table */}
          <div className="sp-card overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-800">Leave Requests</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Showing {filteredLeaves.length} of {leaves.length} records
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="sp-table min-w-[950px]">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Date Range</th>
                    <th>Duration</th>
                    <th>Reason</th>
                    <th>Late Mark</th>
                    <th>Submitted</th>
                    <th>Status</th>
                    <th>Remarks</th>
                    <th className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeaves.length ? (
                    filteredLeaves.map((leave) => {
                      const empName = leave.employeeName || names[leave.employeeId] || leave.employeeId;
                      return (
                        <tr key={leave._id}>
                          <td>
                            <p className="font-semibold text-slate-800">{empName}</p>
                            <p className="text-xs font-mono text-slate-400">{leave.employeeId}</p>
                          </td>
                          <td className="text-slate-700 whitespace-nowrap">
                            <p className="font-medium">{fmt(leave.startDate)}</p>
                            <p className="text-xs text-slate-400">to {fmt(leave.endDate)}</p>
                          </td>
                          <td>
                            <span className="sp-badge-slate capitalize">
                              {leave.leaveType.replace('-', ' ')}
                            </span>
                          </td>
                          <td className="max-w-[200px]">
                            <p className="truncate text-xs text-slate-600" title={leave.reason}>
                              {leave.reason}
                            </p>
                          </td>
                          <td>
                            {leave.lateMark ? (
                              <span className="sp-badge-amber">Late Mark</span>
                            ) : (
                              <span className="text-xs text-slate-300">—</span>
                            )}
                          </td>
                          <td className="text-xs text-slate-500 whitespace-nowrap">
                            {fmtDateTime(leave.createdAt)}
                          </td>
                          <td>
                            <span className={STATUS_BADGE[leave.status] ?? 'sp-badge-slate'}>
                              {leave.status}
                            </span>
                          </td>
                          <td className="max-w-[180px]">
                            {leave.remarks ? (
                              <p className="truncate text-xs italic text-slate-600" title={leave.remarks}>
                                "{leave.remarks}"
                              </p>
                            ) : (
                              <span className="text-xs text-slate-300">—</span>
                            )}
                          </td>
                          <td className="text-right whitespace-nowrap">
                            {leave.status === 'pending' ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => openReviewModal(leave, 'approved')}
                                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition"
                                  title="Approve Leave"
                                >
                                  <Check size={13} />
                                  Approve
                                </button>
                                <button
                                  onClick={() => openReviewModal(leave, 'rejected')}
                                  className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition"
                                  title="Reject Leave"
                                >
                                  <X size={13} />
                                  Reject
                                </button>
                              </div>
                            ) : (
                              <span className="text-xs font-medium text-slate-400">
                                {leave.reviewedAt ? `Reviewed ${fmt(leave.reviewedAt)}` : 'Decided'}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={9}>
                        <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
                          <Clock size={24} className="mb-2 text-slate-300" />
                          <p className="text-sm font-medium text-slate-600">No leave requests found</p>
                          <p className="text-xs text-slate-400 mt-1">
                            {statusFilter !== 'all' || employeeFilter !== 'all' || dateFilter.start || dateFilter.end
                              ? 'Try adjusting your filters.'
                              : 'Employees have not submitted any leave requests yet.'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          EMPLOYEE VIEW: APPLY FORM + MY LEAVE HISTORY
         ══════════════════════════════════════════════════════════ */}
      {!isAdmin && (
        <div className="sp-form-side">
          {/* Apply For Leave Card */}
          <form onSubmit={handleEmployeeSubmit} className="sp-card p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <Send size={18} />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-800">Apply for Leave</h2>
                <p className="text-xs text-slate-500">Submit a new time-off request</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Authenticated Employee Badge */}
              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Applying as</p>
                <p className="mt-1 text-sm font-semibold text-slate-800">{user?.name}</p>
                {myEmployee ? (
                  <div className="mt-1 flex items-center gap-2">
                    <span className="font-mono text-xs text-slate-600">{myEmployee.employeeId}</span>
                    <span className="text-xs text-slate-400">•</span>
                    <span className="text-xs text-slate-600">{myEmployee.designation || 'Staff'}</span>
                  </div>
                ) : linkError ? (
                  <p className="mt-1 text-xs text-amber-600">{linkError}</p>
                ) : (
                  <p className="text-xs text-slate-400">Loading employee details…</p>
                )}
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700">From Date</label>
                  <input
                    type="date"
                    required
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    className="mt-1.5 sp-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">To Date</label>
                  <input
                    type="date"
                    required
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    className="mt-1.5 sp-input"
                  />
                </div>
              </div>

              {/* Duration / Leave Type */}
              <div>
                <label className="block text-sm font-medium text-slate-700">Duration</label>
                <select
                  value={form.leaveType}
                  onChange={(e) => setForm({ ...form, leaveType: e.target.value })}
                  className="mt-1.5 sp-input"
                >
                  <option value="full-day">Full Day</option>
                  <option value="half-day">Half Day</option>
                </select>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-sm font-medium text-slate-700">Reason</label>
                <textarea
                  required
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  placeholder="State the reason for taking leave (medical, personal, travel, etc.)"
                  rows={3}
                  className="mt-1.5 sp-input resize-none"
                />
              </div>

              {/* Late Mark Checkbox */}
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3.5">
                <input
                  type="checkbox"
                  checked={form.lateMark}
                  onChange={(e) => setForm({ ...form, lateMark: e.target.checked })}
                  className="mt-0.5 size-4 accent-amber-600"
                />
                <div>
                  <p className="text-sm font-semibold text-amber-900">Late Mark Arrival</p>
                  <p className="mt-0.5 text-xs text-amber-700">Check this box if this request is for a late arrival notice.</p>
                </div>
              </label>

              <button
                type="submit"
                disabled={saving}
                className="sp-btn-primary w-full"
              >
                {saving ? 'Submitting…' : 'Submit Leave Request'}
              </button>
            </div>
          </form>

          {/* Employee's Own Leave History */}
          <div className="sp-card overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-800">My Leave Applications</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  {leaves.filter((l) => l.status === 'pending').length} pending review
                </p>
              </div>
              <span className="sp-badge-slate">{leaves.length} total</span>
            </div>

            <div className="overflow-x-auto">
              <table className="sp-table min-w-[650px]">
                <thead>
                  <tr>
                    <th>Dates</th>
                    <th>Type</th>
                    <th>Reason</th>
                    <th>Late Mark</th>
                    <th>Status</th>
                    <th>Admin Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {leaves.length ? (
                    leaves.map((leave) => (
                      <tr key={leave._id}>
                        <td className="text-slate-700 whitespace-nowrap">
                          <p className="font-semibold text-slate-800">{fmt(leave.startDate)}</p>
                          <p className="text-xs text-slate-400">to {fmt(leave.endDate)}</p>
                        </td>
                        <td>
                          <span className="sp-badge-slate capitalize">
                            {leave.leaveType.replace('-', ' ')}
                          </span>
                        </td>
                        <td className="max-w-[180px]">
                          <p className="text-xs text-slate-600 truncate" title={leave.reason}>
                            {leave.reason}
                          </p>
                        </td>
                        <td>
                          {leave.lateMark ? (
                            <span className="sp-badge-amber">Late</span>
                          ) : (
                            <span className="text-xs text-slate-300">—</span>
                          )}
                        </td>
                        <td>
                          <span className={STATUS_BADGE[leave.status] ?? 'sp-badge-slate'}>
                            {leave.status}
                          </span>
                        </td>
                        <td className="max-w-[200px]">
                          {leave.remarks ? (
                            <div className="flex items-start gap-1 text-xs text-slate-600">
                              <MessageSquare size={13} className="mt-0.5 shrink-0 text-slate-400" />
                              <span className="italic" title={leave.remarks}>
                                {leave.remarks}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-300">No remarks</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6}>
                        <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
                          <Clock size={22} className="mb-2 text-slate-300" />
                          <p className="text-sm font-medium text-slate-600">No leave requests yet</p>
                          <p className="text-xs text-slate-400 mt-1">Submit your first request using the form.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          ADMIN REVIEW MODAL (CONFIRMATION & REMARKS)
         ══════════════════════════════════════════════════════════ */}
      {reviewModal.isOpen && reviewModal.leave && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div
                  className={`flex size-10 items-center justify-center rounded-xl ${
                    reviewModal.action === 'approved'
                      ? 'bg-emerald-50 text-emerald-600'
                      : 'bg-rose-50 text-rose-600'
                  }`}
                >
                  {reviewModal.action === 'approved' ? <Check size={20} /> : <X size={20} />}
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900">
                    Review Leave Request
                  </h3>
                  <p className="text-xs text-slate-500">
                    {reviewModal.leave.employeeName || reviewModal.leave.employeeId} • {reviewModal.leave.employeeId}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setReviewModal({ isOpen: false, leave: null, action: 'approved', remarks: '', confirmed: false, submitting: false })}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleReviewSubmit} className="mt-5 space-y-4">
              {/* Leave summary snapshot */}
              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 text-xs text-slate-600 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">Duration:</span>
                  <span className="font-semibold text-slate-800 capitalize">
                    {reviewModal.leave.leaveType.replace('-', ' ')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Dates:</span>
                  <span className="font-medium text-slate-800">
                    {fmt(reviewModal.leave.startDate)} to {fmt(reviewModal.leave.endDate)}
                  </span>
                </div>
                {reviewModal.leave.lateMark && (
                  <div className="flex justify-between text-amber-600 font-medium">
                    <span>Note:</span>
                    <span>Late mark arrival flagged</span>
                  </div>
                )}
                <div>
                  <span className="text-slate-400">Reason:</span>
                  <p className="mt-0.5 rounded bg-white p-2 border border-slate-200 text-slate-700">
                    {reviewModal.leave.reason}
                  </p>
                </div>
              </div>

              {/* Action selection */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Decision
                </label>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setReviewModal((c) => ({ ...c, action: 'approved' }))}
                    className={`flex items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-semibold transition ${
                      reviewModal.action === 'approved'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Check size={16} />
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewModal((c) => ({ ...c, action: 'rejected' }))}
                    className={`flex items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-semibold transition ${
                      reviewModal.action === 'rejected'
                        ? 'border-rose-500 bg-rose-50 text-rose-700 ring-2 ring-rose-500/20'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <X size={16} />
                    Reject
                  </button>
                </div>
              </div>

              {/* Review Remarks */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Review Remarks (Optional)
                </label>
                <textarea
                  value={reviewModal.remarks}
                  onChange={(e) => setReviewModal((c) => ({ ...c, remarks: e.target.value }))}
                  placeholder={`Reason for ${reviewModal.action === 'approved' ? 'approving' : 'rejecting'} or special notes for the employee...`}
                  rows={3}
                  className="mt-1.5 sp-input resize-none text-sm"
                />
              </div>

              {/* Explicit Confirmation */}
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <input
                  type="checkbox"
                  required
                  checked={reviewModal.confirmed}
                  onChange={(e) => setReviewModal((c) => ({ ...c, confirmed: e.target.checked }))}
                  className="mt-0.5 size-4 accent-indigo-600"
                />
                <div className="text-xs text-slate-600">
                  <p className="font-semibold text-slate-800">
                    Confirm {reviewModal.action === 'approved' ? 'Approval' : 'Rejection'}
                  </p>
                  <p className="mt-0.5 text-slate-500">
                    I confirm that I want to mark this request as {reviewModal.action}. This decision will be recorded in the employee's history.
                  </p>
                </div>
              </label>

              {/* Modal Actions */}
              <div className="mt-6 flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setReviewModal({ isOpen: false, leave: null, action: 'approved', remarks: '', confirmed: false, submitting: false })}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reviewModal.submitting || !reviewModal.confirmed}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition disabled:opacity-50 ${
                    reviewModal.action === 'approved'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {reviewModal.submitting ? 'Recording…' : `Confirm & ${reviewModal.action === 'approved' ? 'Approve' : 'Reject'}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
