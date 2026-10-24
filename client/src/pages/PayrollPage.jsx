import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Calendar, Calculator, Download, History, Info, Minus, Plus, TrendingUp } from 'lucide-react';
import { employeeApi, promotionApi, salaryApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { downloadPayslip } from '../utils/payslipPdf';

const INR = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const INITIAL = { employeeId: '', basicSalary: 0, bonus: 0, taxDeduction: 0, lateMarkDeduction: 0 };

const currentMonthStr = new Date().toISOString().slice(0, 7);

// Salary inputs config (admin calculator)
const INPUTS = [
  { key: 'basicSalary',       label: 'Basic salary',        hint: 'Base monthly pay',         positive: true },
  { key: 'bonus',             label: 'Bonus',               hint: 'Extra work / performance', positive: true },
  { key: 'taxDeduction',      label: 'Tax deduction',       hint: 'Income tax withheld',      positive: false },
  { key: 'lateMarkDeduction', label: 'Late mark deduction', hint: 'Deduction for late marks', positive: false },
];

// ────────────────────────────────────────────────
// Employee-only read-only payslip view
// ────────────────────────────────────────────────
function EmployeePayrollView() {
  const { user } = useAuth();
  const [history, setHistory] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [myEmployee, setMyEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        let emp = null;
        try { emp = await employeeApi.me(); } catch { /* not linked yet */ }
        setMyEmployee(emp);

        if (emp?.employeeId) {
          const [hist, promos] = await Promise.all([
            salaryApi.getByEmployee(emp.employeeId),
            promotionApi.getByEmployee(emp.employeeId).catch(() => []),
          ]);
          setHistory(hist);
          setPromotions(promos);
        }
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const latest = history[0] ?? null;

  return (
    <div className="sp-page">
      {/* Header */}
      <div className="mb-7">
        <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">Payroll Studio</p>
        <h1 className="mt-1.5 text-[1.6rem] font-semibold tracking-tight text-slate-900">My Salary &amp; Payslips</h1>
        <p className="mt-1 text-sm text-slate-500">Your personal salary details, designation, and payslip history.</p>
      </div>

      {error && <p className="sp-notice-error mb-5">{error}</p>}

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        {/* Left: employee profile card */}
        <div className="sp-card p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <Calculator size={18} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-800">My Payroll Profile</h2>
              <p className="text-xs text-slate-500">Current designation and salary configuration</p>
            </div>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => <div key={i} className="sp-skeleton h-10 rounded-xl" />)}
            </div>
          ) : myEmployee ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Employee Details</p>
                    <p className="mt-1 text-base font-semibold text-slate-800">{myEmployee.name}</p>
                    <p className="text-xs font-mono text-indigo-600">{myEmployee.employeeId}</p>
                  </div>
                  <div className="text-right">
                    <span className="sp-badge-indigo text-xs">
                      {myEmployee.designation || 'Standard Employee'}
                    </span>
                    {myEmployee.grade && (
                      <p className="text-[11px] font-mono font-semibold text-slate-500 mt-1">
                        Grade {myEmployee.grade}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {latest ? (
                <>
                  <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Latest Basic Salary</p>
                    <p className="mt-1 text-xl font-bold text-slate-900">{INR.format(latest.basicSalary)}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">Bonus</p>
                      <p className="mt-1 text-base font-bold text-emerald-700">+{INR.format(latest.bonus)}</p>
                    </div>
                    <div className="rounded-xl border border-rose-100 bg-rose-50/50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-rose-600">Deductions</p>
                      <p className="mt-1 text-base font-bold text-rose-600">−{INR.format(latest.totalDeductions)}</p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-6 text-center">
                  <Calculator size={24} className="mx-auto mb-2 text-slate-300" />
                  <p className="text-sm font-semibold text-slate-700">Salary not available yet.</p>
                  <p className="mt-1 text-xs text-slate-400">Your payroll has not been generated yet for this period. Contact your administrator for assistance.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-amber-100 bg-amber-50 p-6 text-center">
              <p className="text-sm font-semibold text-amber-800">Account not linked to an employee record</p>
              <p className="mt-1 text-xs text-amber-600">Please contact your administrator to link your account.</p>
            </div>
          )}
        </div>

        {/* Right: net salary breakdown */}
        {latest && (
          <div className="flex flex-col gap-5">
            <div className="sp-card overflow-hidden">
              <div className="bg-slate-900 px-6 py-5">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Take-home pay</p>
                <p className="mt-3 text-4xl font-bold tracking-tight text-white">{INR.format(latest.netSalary)}</p>
                <p className="mt-1 text-sm text-slate-400">for {myEmployee?.name || user?.name}</p>
              </div>
              <div className="divide-y divide-slate-100 px-6 py-4">
                {[
                  { label: 'Basic salary',       val: INR.format(latest.basicSalary),       cls: 'text-slate-800' },
                  { label: '+ Bonus',            val: INR.format(latest.bonus),             cls: 'text-emerald-700' },
                  { label: '− Total deductions', val: INR.format(latest.totalDeductions),   cls: 'text-rose-600' },
                  { label: 'Net salary',         val: INR.format(latest.netSalary),         cls: 'font-bold text-indigo-700' },
                ].map(({ label, val, cls }) => (
                  <div key={label} className="flex items-center justify-between py-3">
                    <span className="text-sm text-slate-500">{label}</span>
                    <span className={`text-sm ${cls}`}>{val}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="sp-notice-info text-xs leading-5">
              <strong>Formula:</strong> Basic + Bonus − Tax − Late Mark = Net Salary
            </div>
          </div>
        )}
      </div>

      {/* Download payslip banner */}
      {latest && myEmployee && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-indigo-200 bg-indigo-50 px-6 py-5">
          <div>
            <p className="font-semibold text-indigo-900">Latest payslip is ready</p>
            <p className="mt-0.5 text-sm text-indigo-700">Includes your salary breakdown, deductions, and net salary.</p>
          </div>
          <button
            onClick={() => downloadPayslip(myEmployee, latest)}
            className="sp-btn-primary"
          >
            <Download size={16} />
            Download payslip PDF
          </button>
        </div>
      )}

      {/* My Promotion History */}
      {promotions.length > 0 && (
        <div className="sp-card mt-6 overflow-hidden">
          <div className="border-b border-slate-100 px-6 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-800">My Promotion &amp; Grade History</h2>
              <p className="mt-0.5 text-xs text-slate-500">Official record of approved designations and salary revisions</p>
            </div>
            <span className="sp-badge-indigo">{promotions.length} total</span>
          </div>
          <div className="overflow-x-auto">
            <table className="sp-table min-w-[620px]">
              <thead>
                <tr>
                  <th>Effective Date</th>
                  <th>Designation Transition</th>
                  <th>Salary Revision</th>
                  <th>Increment</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {promotions.map((p) => (
                  <tr key={p._id}>
                    <td className="text-xs font-medium text-slate-700">
                      {new Date(p.effectiveDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="text-slate-500">{p.previousDesignation}</span>
                        <ArrowRight size={11} className="text-slate-400" />
                        <span className="font-semibold text-indigo-700">{p.newDesignation}</span>
                        {p.newGrade && <span className="sp-badge-slate text-[10px]">{p.newGrade}</span>}
                      </div>
                    </td>
                    <td className="text-xs">
                      <span className="text-slate-400">{INR.format(p.previousSalary)}</span>
                      <span className="mx-1 text-slate-400">→</span>
                      <span className="font-semibold text-slate-800">{INR.format(p.newSalary)}</span>
                    </td>
                    <td>
                      <span className={`sp-badge-${p.incrementPercentage >= 0 ? 'emerald' : 'rose'} text-xs font-semibold`}>
                        {p.incrementPercentage >= 0 ? `+${p.incrementPercentage}%` : `${p.incrementPercentage}%`}
                      </span>
                    </td>
                    <td>
                      <span className={`text-xs font-semibold capitalize ${p.status === 'applied' ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Salary history */}
      <div className="sp-card mt-6 overflow-hidden">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="text-sm font-semibold text-slate-800">My Salary History</h2>
          <p className="mt-0.5 text-xs text-slate-500">Historical payroll records calculated for your profile</p>
        </div>
        <div className="overflow-x-auto">
          <table className="sp-table min-w-[680px]">
            <thead>
              <tr>
                {['Period / Date', 'Basic', 'Bonus', 'Deductions', 'Net salary'].map((h) => (
                  <th key={h}>{h}</th>
                ))}
                <th className="text-right">Payslip</th>
              </tr>
            </thead>
            <tbody>
              {history.length ? (
                history.map((rec) => (
                  <tr key={rec._id}>
                    <td className="text-slate-500 font-medium">
                      <div>
                        {rec.month ? (
                          <span className="font-semibold text-slate-800">{rec.month}</span>
                        ) : null}
                        <p className="text-xs text-slate-400">
                          {new Date(rec.createdAt).toLocaleDateString('en-IN', {
                            day: '2-digit', month: 'short', year: 'numeric',
                          })}
                        </p>
                      </div>
                    </td>
                    <td className="font-medium text-slate-800">{INR.format(rec.basicSalary)}</td>
                    <td className="text-emerald-600">+{INR.format(rec.bonus)}</td>
                    <td className="text-rose-600">−{INR.format(rec.totalDeductions)}</td>
                    <td className="font-bold text-indigo-700">{INR.format(rec.netSalary)}</td>
                    <td className="text-right">
                      <button
                        onClick={() => downloadPayslip(myEmployee || { name: user?.name, employeeId: user?.employeeId }, rec)}
                        className="sp-btn-secondary text-xs py-1 px-2.5 flex items-center gap-1.5 ml-auto text-indigo-600 hover:text-indigo-800 font-medium"
                        title="Download payslip PDF for this period"
                      >
                        <Download size={13} />
                        <span>PDF</span>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6}>
                    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
                      <Calculator size={22} className="mb-2 text-slate-300" />
                      <p className="text-sm text-slate-500">No salary records found.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────
// Admin calculator view with Promotion Awareness
// ────────────────────────────────────────────────
function AdminPayrollView() {
  const [employees, setEmployees] = useState([]);
  const [history,   setHistory]   = useState([]);
  const [month,     setMonth]     = useState(currentMonthStr);
  const [form,      setForm]      = useState(INITIAL);
  const [notice,    setNotice]    = useState({ msg: '', ok: true });
  const [saving,    setSaving]    = useState(false);
  const [prorationInfo, setProrationInfo] = useState(null);

  const selected = employees.find((e) => e.employeeId === form.employeeId);

  const net = useMemo(
    () =>
      Math.max(
        0,
        Number(form.basicSalary   || 0) +
        Number(form.bonus          || 0) -
        Number(form.taxDeduction   || 0) -
        Number(form.lateMarkDeduction || 0)
      ),
    [form]
  );

  // Load employees
  useEffect(() => {
    employeeApi.list()
      .then((list) => {
        setEmployees(list);
        if (list[0]) {
          const firstId = list[0].employeeId;
          setForm((c) => ({ ...c, employeeId: firstId }));
          fetchApplicableRate(firstId, month);
        }
      })
      .catch((e) => setNotice({ msg: e.message, ok: false }));
  }, []);

  // Fetch applicable rate based on promotion & effective date
  const fetchApplicableRate = async (empId, targetMonth) => {
    if (!empId) return;
    try {
      const data = await promotionApi.getApplicableSalary(empId, targetMonth);
      setForm((c) => ({ ...c, basicSalary: data.baseSalary }));
      setProrationInfo(data.isProrated ? data.proration : null);
    } catch {
      // Fallback to employee's stored basicSalary if promotion rate lookup fails
      const emp = employees.find((e) => e.employeeId === empId);
      if (emp) setForm((c) => ({ ...c, basicSalary: emp.basicSalary ?? 0 }));
      setProrationInfo(null);
    }
  };

  // When employee or month changes, update history & applicable rate
  useEffect(() => {
    if (form.employeeId) {
      salaryApi
        .getByEmployee(form.employeeId)
        .then(setHistory)
        .catch((e) => setNotice({ msg: e.message, ok: false }));

      fetchApplicableRate(form.employeeId, month);
    }
  }, [form.employeeId, month]);

  const chooseEmployee = (id) => {
    setForm({ ...form, employeeId: id });
    fetchApplicableRate(id, month);
  };

  const change = (key, value) => setForm((c) => ({ ...c, [key]: value }));

  const save = async (e) => {
    e.preventDefault();
    if (!form.employeeId) return setNotice({ msg: 'Select an employee first.', ok: false });
    setSaving(true);
    setNotice({ msg: '', ok: true });
    try {
      const salary = await salaryApi.calculate({ ...form, month });
      setHistory((cur) => [salary, ...cur]);
      setNotice({ msg: 'Salary calculated and saved successfully.', ok: true });
    } catch (err) {
      setNotice({ msg: err.message, ok: false });
    } finally {
      setSaving(false);
    }
  };

  const earnings   = Number(form.basicSalary || 0) + Number(form.bonus || 0);
  const deductions = Number(form.taxDeduction || 0) + Number(form.lateMarkDeduction || 0);

  return (
    <div className="sp-page">
      <div className="mb-7">
        <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">Payroll Studio</p>
        <h1 className="mt-1.5 text-[1.6rem] font-semibold tracking-tight text-slate-900">Salary Calculation</h1>
        <p className="mt-1 text-sm text-slate-500">Calculate take-home pay, apply promotions, and generate professional payslips.</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <form onSubmit={save} className="sp-card p-6">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <Calculator size={18} />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-800">Salary inputs</h2>
                <p className="text-xs text-slate-500">Earnings + bonuses − deductions</p>
              </div>
            </div>
            {/* Payroll Month Selector */}
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-slate-400" />
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-indigo-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Employee picker & Designation strip */}
          <div className="mb-6 space-y-2">
            <label className="block text-sm font-medium text-slate-700">Select Employee</label>
            <select
              value={form.employeeId}
              onChange={(e) => chooseEmployee(e.target.value)}
              className="sp-input"
            >
              {employees.map((e) => (
                <option key={e._id} value={e.employeeId}>
                  {e.name} — {e.employeeId} {e.designation ? `(${e.designation})` : ''}
                </option>
              ))}
            </select>
            {selected && (
              <div className="flex items-center justify-between text-xs text-slate-500 px-1 pt-1">
                <span>Designation: <strong className="text-slate-700">{selected.designation || 'Standard'}</strong></span>
                <span>Grade: <strong className="text-slate-700">{selected.grade || '—'}</strong></span>
              </div>
            )}
          </div>

          {/* Mid-Month Proration Notice */}
          {prorationInfo && (
            <div className="mb-5 rounded-xl border border-indigo-200 bg-indigo-50/70 p-4 text-xs text-indigo-900 leading-relaxed">
              <div className="flex items-center gap-2 font-semibold text-indigo-800 mb-1">
                <TrendingUp size={14} />
                <span>Automated Mid-Month Proration Applied</span>
              </div>
              <p>
                Promotion takes effect on <strong>day {prorationInfo.promoDay}</strong> of this month.
                Basic salary is automatically calculated for {prorationInfo.daysOld} days at {INR.format(prorationInfo.oldSalary)} and {prorationInfo.daysNew} days at {INR.format(prorationInfo.newSalary)}.
              </p>
              <p className="mt-1 font-mono text-[11px] text-indigo-700 bg-white/70 p-1.5 rounded border border-indigo-100">
                Formula: {prorationInfo.formula}
              </p>
            </div>
          )}

          {/* Earnings section */}
          <div className="mb-4">
            <div className="mb-3 flex items-center gap-2">
              <Plus size={13} className="text-emerald-600" />
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Earnings</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {INPUTS.filter((f) => f.positive).map(({ key, label, hint }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-slate-700">{label}</label>
                  <p className="mt-0.5 text-xs text-slate-400">{hint}</p>
                  <input
                    type="number" min="0"
                    value={form[key]}
                    onChange={(e) => change(key, e.target.value)}
                    className="mt-2 sp-input"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Deductions section */}
          <div className="rounded-xl border border-rose-100 bg-rose-50/40 p-4">
            <div className="mb-3 flex items-center gap-2">
              <Minus size={13} className="text-rose-600" />
              <p className="text-xs font-semibold uppercase tracking-wide text-rose-700">Deductions</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {INPUTS.filter((f) => !f.positive).map(({ key, label, hint }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-slate-700">{label}</label>
                  <p className="mt-0.5 text-xs text-slate-400">{hint}</p>
                  <input
                    type="number" min="0"
                    value={form[key]}
                    onChange={(e) => change(key, e.target.value)}
                    className="mt-2 sp-input"
                  />
                </div>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={saving || !employees.length}
            className="sp-btn-primary mt-6 w-full"
          >
            {saving ? 'Calculating…' : 'Calculate & save salary'}
          </button>

          {notice.msg && (
            <p className={`mt-4 ${notice.ok ? 'sp-notice-success' : 'sp-notice-error'}`}>
              {notice.msg}
            </p>
          )}
        </form>

        <div className="flex flex-col gap-5">
          <div className="sp-card overflow-hidden">
            <div className="bg-slate-900 px-6 py-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Take-home pay</p>
              <p className="mt-3 text-4xl font-bold tracking-tight text-white">{INR.format(net)}</p>
              <p className="mt-1 text-sm text-slate-400">for {selected?.name || 'selected employee'}</p>
            </div>
            <div className="divide-y divide-slate-100 px-6 py-4">
              <div className="flex items-center justify-between py-3">
                <span className="text-sm text-slate-500">Basic salary</span>
                <span className="text-sm font-semibold text-slate-800">{INR.format(form.basicSalary || 0)}</span>
              </div>
              <div className="flex items-center justify-between py-3">
                <span className="flex items-center gap-1.5 text-sm text-emerald-600"><Plus size={13} /> Bonus</span>
                <span className="text-sm font-semibold text-emerald-700">{INR.format(form.bonus || 0)}</span>
              </div>
              <div className="flex items-center justify-between py-3">
                <span className="flex items-center gap-1.5 text-sm text-rose-600"><Minus size={13} /> Total deductions</span>
                <span className="text-sm font-semibold text-rose-600">{INR.format(deductions)}</span>
              </div>
              <div className="flex items-center justify-between py-3">
                <span className="text-sm font-semibold text-slate-700">Net salary</span>
                <span className="text-base font-bold text-indigo-700">{INR.format(net)}</span>
              </div>
            </div>
          </div>
          <div className="sp-notice-info text-xs leading-5">
            <strong>Formula:</strong> Basic + Bonus − Tax − Late Mark = Net Salary
          </div>
        </div>
      </div>

      {history[0] && selected && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-indigo-200 bg-indigo-50 px-6 py-5">
          <div>
            <p className="font-semibold text-indigo-900">Latest payslip is ready</p>
            <p className="mt-0.5 text-sm text-indigo-700">Includes employee details, salary breakdown, deductions, and net salary.</p>
          </div>
          <button onClick={() => downloadPayslip(selected, history[0])} className="sp-btn-primary">
            <Download size={16} />
            Download payslip PDF
          </button>
        </div>
      )}

      <div className="sp-card mt-6 overflow-hidden">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="text-sm font-semibold text-slate-800">Calculation history</h2>
          <p className="mt-0.5 text-xs text-slate-500">Saved salary calculations for {selected?.name ?? 'the selected employee'}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="sp-table min-w-[680px]">
            <thead>
              <tr>
                {['Calculated on', 'Basic', 'Bonus', 'Deductions', 'Net salary'].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {history.length ? (
                history.map((rec) => (
                  <tr key={rec._id}>
                    <td className="text-slate-500">
                      {new Date(rec.createdAt).toLocaleDateString('en-IN', {
                        day: '2-digit', month: 'short', year: 'numeric',
                      })}
                    </td>
                    <td className="font-medium text-slate-800">{INR.format(rec.basicSalary)}</td>
                    <td className="text-emerald-600">+{INR.format(rec.bonus)}</td>
                    <td className="text-rose-600">−{INR.format(rec.totalDeductions)}</td>
                    <td className="font-bold text-indigo-700">{INR.format(rec.netSalary)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5}>
                    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
                      <Calculator size={22} className="mb-2 text-slate-300" />
                      <p className="text-sm text-slate-500">No calculations saved for this employee.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────
// Default export — role gate
// ────────────────────────────────────────────────
export default function PayrollPage() {
  const { user } = useAuth();
  return user?.role === 'admin' ? <AdminPayrollView /> : <EmployeePayrollView />;
}
