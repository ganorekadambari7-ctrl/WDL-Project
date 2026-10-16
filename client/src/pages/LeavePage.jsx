import { useEffect, useMemo, useState } from 'react';
import { Check, Clock, Send, X } from 'lucide-react';
import { employeeApi, leaveApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

const fmt = (v) =>
  new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

const STATUS_BADGE = {
  pending:  'sp-badge-amber',
  approved: 'sp-badge-emerald',
  rejected: 'sp-badge-rose',
};

export default function LeavePage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [employees, setEmployees] = useState([]);
  const [leaves,    setLeaves]    = useState([]);
  const [notice,    setNotice]    = useState({ msg: '', ok: true });
  const [saving,    setSaving]    = useState(false);
  const [form, setForm] = useState({
    employeeId: '',       // only used by admin
    startDate: new Date().toISOString().slice(0, 10),
    endDate:   new Date().toISOString().slice(0, 10),
    leaveType: 'full-day',
    reason:    '',
    lateMark:  false,
  });

  // For employee view: their own linked employee record
  const [myEmployee, setMyEmployee] = useState(null);
  const [linkError,  setLinkError]  = useState('');

  const load = async () => {
    try {
      if (isAdmin) {
        const [empList, leaveList] = await Promise.all([employeeApi.list(), leaveApi.list()]);
        setEmployees(empList);
        setLeaves(leaveList);
        setForm((c) => c.employeeId ? c : { ...c, employeeId: empList[0]?.employeeId ?? '' });
      } else {
        // Employee: load own leaves from backend (server filters automatically)
        const leaveList = await leaveApi.list();
        setLeaves(leaveList);
        // Also try fetching own employee record for display
        try {
          const emp = await employeeApi.me();
          setMyEmployee(emp);
        } catch (e) {
          // Not yet linked — show a message but don't block viewing leaves
          setLinkError(e.message || 'No employee record linked to your account.');
        }
      }
    } catch (e) {
      setNotice({ msg: e.message, ok: false });
    }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const names = useMemo(
    () => Object.fromEntries(employees.map((e) => [e.employeeId, e.name])),
    [employees]
  );

  const submit = async (e) => {
    e.preventDefault();
    if (isAdmin && !form.employeeId) {
      return setNotice({ msg: 'Select an employee before applying for leave.', ok: false });
    }
    setSaving(true);
    setNotice({ msg: '', ok: true });
    try {
      // Backend resolves employeeId for employees automatically — only send it for admin
      const payload = isAdmin
        ? { employeeId: form.employeeId, startDate: form.startDate, endDate: form.endDate, leaveType: form.leaveType, reason: form.reason, lateMark: form.lateMark }
        : { startDate: form.startDate, endDate: form.endDate, leaveType: form.leaveType, reason: form.reason, lateMark: form.lateMark };
      const leave = await leaveApi.apply(payload);
      setLeaves((cur) => [leave, ...cur]);
      setForm((c) => ({ ...c, reason: '', lateMark: false }));
      setNotice({ msg: 'Leave request submitted successfully.', ok: true });
    } catch (err) {
      setNotice({ msg: err.message, ok: false });
    } finally {
      setSaving(false);
    }
  };

  const review = async (id, status) => {
    try {
      const updated = await leaveApi.review(id, status);
      setLeaves((cur) => cur.map((l) => (l._id === id ? updated : l)));
    } catch (err) {
      setNotice({ msg: err.message, ok: false });
    }
  };

  const pendingCount = leaves.filter((l) => l.status === 'pending').length;

  return (
    <div className="sp-page">

      {/* ── Page header ── */}
      <div className="mb-7">
        <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">Time Off</p>
        <h1 className="mt-1.5 text-[1.6rem] font-semibold tracking-tight text-slate-900">
          Leave Management
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {isAdmin
            ? 'Submit leave requests and keep track of team availability.'
            : 'Submit and track your leave requests.'}
        </p>
      </div>

      <div className="sp-form-side">

        {/* ── Apply for leave form ── */}
        <form onSubmit={submit} className="sp-card p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <Send size={18} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-800">Apply for leave</h2>
              <p className="text-xs text-slate-500">Create a new request</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* ── Employee picker (Admin only) ── */}
            {isAdmin && (
              <div>
                <label className="block text-sm font-medium text-slate-700">Employee</label>
                <select
                  value={form.employeeId}
                  onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
                  className="mt-1.5 sp-input"
                >
                  {employees.map((e) => (
                    <option key={e._id} value={e.employeeId}>
                      {e.name} — {e.employeeId}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* ── Employee self-info (Employee role) ── */}
            {!isAdmin && (
              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Applying as</p>
                <p className="mt-1 text-sm font-semibold text-slate-800">{user?.name}</p>
                {myEmployee
                  ? <p className="text-xs text-slate-500 font-mono">{myEmployee.employeeId}</p>
                  : linkError
                    ? <p className="mt-1 text-xs text-amber-600">{linkError}</p>
                    : <p className="text-xs text-slate-400">Loading employee record…</p>
                }
              </div>
            )}

            {/* Date range */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700">From</label>
                <input type="date" value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  className="mt-1.5 sp-input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">To</label>
                <input type="date" value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  className="mt-1.5 sp-input" />
              </div>
            </div>

            {/* Duration */}
            <div>
              <label className="block text-sm font-medium text-slate-700">Duration</label>
              <select
                value={form.leaveType}
                onChange={(e) => setForm({ ...form, leaveType: e.target.value })}
                className="mt-1.5 sp-input"
              >
                <option value="full-day">Full day</option>
                <option value="half-day">Half day</option>
              </select>
            </div>

            {/* Reason */}
            <div>
              <label className="block text-sm font-medium text-slate-700">Reason</label>
              <textarea
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                placeholder="Briefly describe the reason for leave…"
                rows={3}
                className="mt-1.5 sp-input resize-none"
              />
            </div>

            {/* Late mark checkbox */}
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3.5">
              <input
                type="checkbox"
                checked={form.lateMark}
                onChange={(e) => setForm({ ...form, lateMark: e.target.checked })}
                className="mt-0.5 size-4 accent-amber-600"
              />
              <div>
                <p className="text-sm font-semibold text-amber-900">Late mark</p>
                <p className="mt-0.5 text-xs text-amber-700">Flag this as a late arrival request.</p>
              </div>
            </label>

            <button
              type="submit"
              disabled={saving || (isAdmin && !employees.length)}
              className="sp-btn-primary w-full"
            >
              {saving ? 'Submitting…' : 'Submit request'}
            </button>
          </div>

          {/* Notice */}
          {notice.msg && (
            <p className={`mt-4 ${notice.ok ? 'sp-notice-success' : 'sp-notice-error'}`}>
              {notice.msg}
            </p>
          )}
        </form>

        {/* ── Leave requests table ── */}
        <div className="sp-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-800">
                {isAdmin ? 'Leave requests' : 'My leave requests'}
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                {pendingCount > 0
                  ? `${pendingCount} request${pendingCount > 1 ? 's' : ''} awaiting review`
                  : 'No pending requests'}
              </p>
            </div>
            <span className="sp-badge-slate">{leaves.length} total</span>
          </div>

          <div className="overflow-x-auto">
            <table className="sp-table min-w-[740px]">
              <thead>
                <tr>
                  {['Employee', 'Dates', 'Duration', 'Late mark', 'Status', 'Action'].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {leaves.length ? (
                  leaves.map((leave) => (
                    <tr key={leave._id}>
                      <td>
                        <p className="font-semibold text-slate-800">
                          {names[leave.employeeId] || (isAdmin ? leave.employeeId : user?.name)}
                        </p>
                        <p className="text-xs text-slate-400">{leave.employeeId}</p>
                      </td>
                      <td className="text-slate-600">
                        <p>{fmt(leave.startDate)}</p>
                        <p className="text-slate-400">→ {fmt(leave.endDate)}</p>
                      </td>
                      <td>
                        <span className="sp-badge-slate capitalize">
                          {leave.leaveType.replace('-', ' ')}
                        </span>
                      </td>
                      <td>
                        {leave.lateMark
                          ? <span className="sp-badge-amber">Yes</span>
                          : <span className="text-slate-300">—</span>}
                      </td>
                      <td>
                        <span className={STATUS_BADGE[leave.status] ?? 'sp-badge-slate'}>
                          {leave.status}
                        </span>
                      </td>
                      <td>
                        {isAdmin && leave.status === 'pending' ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => review(leave._id, 'approved')}
                              title="Approve"
                              className="flex size-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 transition hover:bg-emerald-100"
                            >
                              <Check size={14} />
                            </button>
                            <button
                              onClick={() => review(leave._id, 'rejected')}
                              title="Reject"
                              className="flex size-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600 transition hover:bg-rose-100"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">
                            {leave.status === 'pending' ? 'Awaiting admin' : 'Reviewed'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6}>
                      <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
                        <Clock size={22} className="mb-2 text-slate-300" />
                        <p className="text-sm text-slate-500">No leave requests yet.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
