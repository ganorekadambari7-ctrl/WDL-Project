import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, CircleX, Users } from 'lucide-react';
import { attendanceApi, employeeApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

const today        = new Date().toISOString().slice(0, 10);
const currentMonth = today.slice(0, 7);

function getInitials(name = '') {
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
}

export default function AttendancePage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [employees, setEmployees] = useState([]);
  const [records,   setRecords]   = useState({});
  const [month,     setMonth]     = useState(currentMonth);
  const [form,      setForm]      = useState({ employeeId: '', date: today, status: 'present' });
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [notice,    setNotice]    = useState({ msg: '', ok: true });

  const load = async () => {
    setLoading(true);
    setNotice({ msg: '', ok: true });
    try {
      if (isAdmin) {
        const list = await employeeApi.list();
        setEmployees(list);
        if (!form.employeeId && list[0])
          setForm((c) => ({ ...c, employeeId: list[0].employeeId }));
        const responses = await Promise.all(
          list.map((e) => attendanceApi.getByEmployee(e.employeeId, month))
        );
        setRecords(Object.fromEntries(list.map((e, i) => [e.employeeId, responses[i]])));
      } else {
        const selfEmpId = user?.employeeId || (user?.id ? `EMP-${String(user.id).slice(-6).toUpperCase()}` : (user?._id ? `EMP-${String(user._id).slice(-6).toUpperCase()}` : ''));
        const selfEmployee = {
          _id: user?.id || user?._id || 'self',
          name: user?.name || 'Employee',
          employeeId: selfEmpId,
        };
        setEmployees([selfEmployee]);
        if (selfEmpId) {
          try {
            const selfRecord = await attendanceApi.getByEmployee(selfEmpId, month);
            setRecords({ [selfEmpId]: selfRecord });
          } catch {
            setRecords({ [selfEmpId]: { records: [], summary: { total: 0, present: 0, absent: 0, percentage: 0 } } });
          }
        }
      }
    } catch (e) {
      setNotice({ msg: e.message, ok: false });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [month, isAdmin, user?.employeeId]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async (e) => {
    e.preventDefault();
    if (!isAdmin) return;
    if (!form.employeeId) return setNotice({ msg: 'Add an employee before marking attendance.', ok: false });
    setSaving(true);
    setNotice({ msg: '', ok: true });
    try {
      await attendanceApi.mark(form);
      setNotice({ msg: 'Attendance saved successfully.', ok: true });
      await load();
    } catch (err) {
      setNotice({ msg: err.message, ok: false });
    } finally {
      setSaving(false);
    }
  };

  const totals = useMemo(
    () =>
      Object.values(records).reduce(
        (sum, r) => ({
          present: sum.present + (r?.summary?.present || 0),
          absent: sum.absent + (r?.summary?.absent || 0)
        }),
        { present: 0, absent: 0 }
      ),
    [records]
  );

  return (
    <div className="sp-page">

      {/* ── Page header ── */}
      <div className="mb-7">
        <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">
          Time &amp; Attendance
        </p>
        <h1 className="mt-1.5 text-[1.6rem] font-semibold tracking-tight text-slate-900">
          Attendance
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {isAdmin
            ? "Mark daily status and review your team's monthly attendance records."
            : "Review your personal monthly attendance records."}
        </p>
      </div>

      <div className="sp-form-side">

        {/* ── Left column: Mark Attendance (Admin) OR Profile (Employee) ── */}
        {isAdmin ? (
          <form onSubmit={save} className="sp-card p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <CalendarDays size={18} />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-800">Mark attendance</h2>
                <p className="text-xs text-slate-500">Update a daily record</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Employee picker */}
              <div>
                <label className="block text-sm font-medium text-slate-700">Employee</label>
                <select
                  value={form.employeeId}
                  onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
                  className="mt-1.5 sp-input"
                >
                  {employees.length
                    ? employees.map((e) => (
                        <option key={e._id} value={e.employeeId}>
                          {e.name} — {e.employeeId}
                        </option>
                      ))
                    : <option value="">No employees available</option>}
                </select>
              </div>

              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-slate-700">Date</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="mt-1.5 sp-input"
                />
              </div>

              {/* Status toggle */}
              <div>
                <p className="text-sm font-medium text-slate-700">Status</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {(['present', 'absent']).map((s) => {
                    const active = form.status === s;
                    const cls = s === 'present'
                      ? active ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-500 hover:border-emerald-300'
                      : active ? 'border-rose-500 bg-rose-50 text-rose-700'         : 'border-slate-200 text-slate-500 hover:border-rose-300';
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setForm({ ...form, status: s })}
                        className={`rounded-xl border py-3 text-sm font-semibold capitalize transition-all ${cls}`}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                disabled={saving || !employees.length}
                className="sp-btn-primary w-full"
              >
                {saving ? 'Saving…' : 'Save attendance'}
              </button>
            </div>

            {/* Notice */}
            {notice.msg && (
              <p className={`mt-4 ${notice.ok ? 'sp-notice-success' : 'sp-notice-error'}`}>
                {notice.msg}
              </p>
            )}
          </form>
        ) : (
          <div className="sp-card p-6 flex flex-col justify-between">
            <div>
              <div className="mb-5 flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <CalendarDays size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-slate-800">My Attendance</h2>
                  <p className="text-xs text-slate-500">Personal attendance status</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Employee Name</p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">{user?.name || 'Employee'}</p>
                  <p className="text-xs text-slate-500">{user?.email}</p>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Employee ID</p>
                  <p className="mt-1 text-sm font-mono font-semibold text-indigo-600">
                    {user?.employeeId || (user?.id ? `EMP-${String(user.id).slice(-6).toUpperCase()}` : 'Assigned by Admin')}
                  </p>
                </div>

                <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
                  <p className="text-xs font-medium text-indigo-900 leading-relaxed">
                    Attendance is marked and maintained by company administration. Contact HR or your manager for any attendance corrections.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Monthly summary table ── */}
        <div className="sp-card overflow-hidden">

          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 px-6 py-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-800">
                {isAdmin ? 'Monthly attendance' : 'My monthly attendance'}
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                {isAdmin ? 'Employee summary by month' : 'Your attendance summary for this month'}
              </p>
            </div>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
            />
          </div>

          {/* Totals strip */}
          <div className="grid grid-cols-2 divide-x divide-slate-100 border-b border-slate-100">
            <div className="p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Present entries</p>
              <p className="mt-1 text-2xl font-bold text-emerald-600">{totals.present}</p>
            </div>
            <div className="p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Absent entries</p>
              <p className="mt-1 text-2xl font-bold text-rose-500">{totals.absent}</p>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="sp-table min-w-[580px]">
              <thead>
                <tr>
                  {['Employee', 'Present', 'Absent', 'Rate', 'Last status'].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(4)].map((_, i) => (
                    <tr key={i}>
                      {[...Array(5)].map((__, j) => (
                        <td key={j}>
                          <div className="sp-skeleton h-4 w-20 rounded" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : employees.length ? (
                  employees.map((emp) => {
                    const s   = records[emp.employeeId]?.summary ?? { present: 0, absent: 0, percentage: 0 };
                    const last = records[emp.employeeId]?.records?.at(-1);
                    return (
                      <tr key={emp._id}>
                        <td>
                          <div className="flex items-center gap-2.5">
                            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                              {getInitials(emp.name)}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-800">{emp.name}</p>
                              <p className="text-[11px] text-slate-400">{emp.employeeId}</p>
                            </div>
                          </div>
                        </td>
                        <td className="font-semibold text-emerald-600">{s.present}</td>
                        <td className="font-semibold text-rose-500">{s.absent}</td>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className="h-full rounded-full bg-indigo-500 sp-progress-fill"
                                style={{ width: `${s.percentage}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium text-slate-700">{s.percentage}%</span>
                          </div>
                        </td>
                        <td>
                          {last ? (
                            <span className={`sp-badge-${last.status === 'present' ? 'emerald' : 'rose'} inline-flex items-center gap-1`}>
                              {last.status === 'present'
                                ? <CheckCircle2 size={11} />
                                : <CircleX size={11} />}
                              {last.status}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">No records</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5}>
                      <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
                        <Users size={22} className="mb-2 text-slate-300" />
                        <p className="text-sm text-slate-500">
                          {isAdmin ? 'Add employees to start tracking attendance.' : 'No attendance records found for this month.'}
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
    </div>
  );
}
