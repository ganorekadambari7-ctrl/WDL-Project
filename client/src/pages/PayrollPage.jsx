import { useEffect, useMemo, useState } from 'react';
import { Calculator, Download, Minus, Plus } from 'lucide-react';
import { employeeApi, salaryApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { downloadPayslip } from '../utils/payslipPdf';

const INR = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const INITIAL = { employeeId: '', basicSalary: 0, bonus: 0, taxDeduction: 0, lateMarkDeduction: 0 };

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
  const [myEmployee, setMyEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        // Resolve own employee record
        let emp = null;
        try { emp = await employeeApi.me(); } catch { /* not linked yet */ }
        setMyEmployee(emp);

        if (emp?.employeeId) {
          const hist = await salaryApi.getByEmployee(emp.employeeId);
          setHistory(hist);
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
        <h1 className="mt-1.5 text-[1.6rem] font-semibold tracking-tight text-slate-900">My Salary</h1>
        <p className="mt-1 text-sm text-slate-500">Your personal salary details and payslip history.</p>
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
              <h2 className="text-sm font-semibold text-slate-800">My Payroll Details</h2>
              <p className="text-xs text-slate-500">Salary information for your account</p>
            </div>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => <div key={i} className="sp-skeleton h-10 rounded-xl" />)}
            </div>
          ) : myEmployee ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Employee</p>
                <p className="mt-1 text-sm font-semibold text-slate-800">{myEmployee.name}</p>
                <p className="text-xs font-mono text-indigo-600">{myEmployee.employeeId}</p>
              </div>

              {latest ? (
                <>
                  <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Latest Basic Salary</p>
                    <p className="mt-1 text-lg font-bold text-slate-900">{INR.format(latest.basicSalary)}</p>
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
                  <p className="text-sm text-slate-500">Salary not available yet.</p>
                  <p className="mt-1 text-xs text-slate-400">Contact your administrator for salary information.</p>
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

        {/* Right: net salary card */}
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

      {/* Salary history */}
      <div className="sp-card mt-6 overflow-hidden">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="text-sm font-semibold text-slate-800">My salary history</h2>
          <p className="mt-0.5 text-xs text-slate-500">All past salary calculations for your account</p>
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
// Admin calculator view (unchanged from original)
// ────────────────────────────────────────────────
function AdminPayrollView() {
  const [employees, setEmployees] = useState([]);
  const [history,   setHistory]   = useState([]);
  const [form,      setForm]      = useState(INITIAL);
  const [notice,    setNotice]    = useState({ msg: '', ok: true });
  const [saving,    setSaving]    = useState(false);

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

  useEffect(() => {
    employeeApi.list()
      .then((list) => {
        setEmployees(list);
        if (list[0])
          setForm((c) =>
            c.employeeId ? c : { ...c, employeeId: list[0].employeeId, basicSalary: list[0].basicSalary }
          );
      })
      .catch((e) => setNotice({ msg: e.message, ok: false }));
  }, []);

  useEffect(() => {
    if (form.employeeId)
      salaryApi
        .getByEmployee(form.employeeId)
        .then(setHistory)
        .catch((e) => setNotice({ msg: e.message, ok: false }));
  }, [form.employeeId]);

  const chooseEmployee = (id) => {
    const emp = employees.find((e) => e.employeeId === id);
    setForm({ ...form, employeeId: id, basicSalary: emp?.basicSalary ?? 0 });
  };

  const change = (key, value) => setForm((c) => ({ ...c, [key]: value }));

  const save = async (e) => {
    e.preventDefault();
    if (!form.employeeId) return setNotice({ msg: 'Select an employee first.', ok: false });
    setSaving(true);
    setNotice({ msg: '', ok: true });
    try {
      const salary = await salaryApi.calculate(form);
      setHistory((cur) => [salary, ...cur]);
      setNotice({ msg: 'Salary calculated and saved.', ok: true });
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
        <p className="mt-1 text-sm text-slate-500">Calculate take-home pay and generate professional payslips.</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <form onSubmit={save} className="sp-card p-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <Calculator size={18} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-800">Salary inputs</h2>
              <p className="text-xs text-slate-500">Earnings + bonuses − deductions</p>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700">Employee</label>
            <select
              value={form.employeeId}
              onChange={(e) => chooseEmployee(e.target.value)}
              className="mt-1.5 sp-input"
            >
              {employees.map((e) => (
                <option key={e._id} value={e.employeeId}>
                  {e.name} — {e.employeeId}
                </option>
              ))}
            </select>
          </div>

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
