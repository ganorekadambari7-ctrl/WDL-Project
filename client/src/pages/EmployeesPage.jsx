import { useEffect, useState } from 'react';
import { Edit3, Plus, Search, Trash2, Users } from 'lucide-react';
import EmployeeForm from '../components/EmployeeForm';
import { employeeApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

const INR = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

const AVATAR_COLORS = [
  'bg-indigo-100 text-indigo-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-blue-100 text-blue-700',
  'bg-rose-100 text-rose-700',
  'bg-violet-100 text-violet-700',
];
function avatarColor(name) {
  return AVATAR_COLORS[(name?.charCodeAt(0) ?? 0) % AVATAR_COLORS.length];
}
function getInitials(name = '') {
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
}

function SkeletonRow({ cols }) {
  return (
    <tr>
      {[...Array(cols)].map((_, i) => (
        <td key={i} className="px-5 py-4 first:pl-6">
          <div className="sp-skeleton h-4 w-full max-w-[120px] rounded" />
        </td>
      ))}
    </tr>
  );
}

export default function EmployeesPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [query, setQuery]         = useState('');
  const [selected, setSelected]   = useState(null);
  const [open, setOpen]           = useState(false);
  const [saving, setSaving]       = useState(false);
  const [confirmId, setConfirmId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      setEmployees(await employeeApi.list());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const save = async (form) => {
    if (!isAdmin) return;
    setSaving(true);
    setError('');
    try {
      const result = selected
        ? await employeeApi.update(selected._id, form)
        : await employeeApi.create(form);
      setEmployees((cur) =>
        selected
          ? cur.map((e) => (e._id === result._id ? result : e))
          : [result, ...cur]
      );
      setOpen(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (emp) => {
    if (!isAdmin) return;
    if (confirmId !== emp._id) {
      setConfirmId(emp._id);
      setTimeout(() => setConfirmId(null), 3000);
      return;
    }
    setConfirmId(null);
    try {
      await employeeApi.remove(emp._id);
      setEmployees((cur) => cur.filter((e) => e._id !== emp._id));
    } catch (e) {
      setError(e.message);
    }
  };

  const shown = employees.filter((e) =>
    `${e.name} ${e.employeeId} ${e.education}`.toLowerCase().includes(query.toLowerCase())
  );

  // Number of table columns depends on role
  const colCount = isAdmin ? 6 : 5;

  return (
    <div className="sp-page">

      {/* ── Page header ── */}
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">Team Directory</p>
          <h1 className="mt-1.5 text-[1.6rem] font-semibold tracking-tight text-slate-900">Employees</h1>
          <p className="mt-1 text-sm text-slate-500">
            {isAdmin
              ? 'Manage employee profiles, salary structures, and records.'
              : 'View the company employee directory.'}
          </p>
        </div>
        {/* Add employee button — admin only */}
        {isAdmin && (
          <button
            onClick={() => { setSelected(null); setOpen(true); }}
            className="sp-btn-primary"
          >
            <Plus size={16} />
            Add employee
          </button>
        )}
      </div>

      {error && (
        <div className="mb-5">
          <p className="sp-notice-error">{error}</p>
        </div>
      )}

      {/* ── Table card ── */}
      <div className="sp-card overflow-hidden">

        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <Users size={18} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">Employee directory</p>
              <p className="text-xs text-slate-500">
                {loading ? 'Loading…' : `${employees.length} total employee${employees.length !== 1 ? 's' : ''}`}
              </p>
            </div>
          </div>

          {/* Search */}
          <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2 transition focus-within:border-indigo-300 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-100">
            <Search size={14} className="shrink-0 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-44 bg-transparent text-sm text-slate-700 placeholder:text-slate-400 outline-none"
              placeholder="Search employees…"
            />
          </label>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="sp-table min-w-[820px]">
            <thead>
              <tr>
                {['Employee', 'Employee ID', 'Education', 'Experience', 'Basic Salary',
                  ...(isAdmin ? ['Actions'] : [])
                ].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => <SkeletonRow key={i} cols={colCount} />)
              ) : shown.length ? (
                shown.map((emp) => (
                  <tr key={emp._id}>
                    {/* Employee name + DOB */}
                    <td>
                      <div className="flex items-center gap-3">
                        <div className={`flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${avatarColor(emp.name)}`}>
                          {getInitials(emp.name)}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">{emp.name}</p>
                          <p className="text-xs text-slate-400">
                            DOB: {new Date(emp.dob).toLocaleDateString('en-IN')}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Employee ID */}
                    <td>
                      <span className="sp-badge-indigo font-mono tracking-wider">{emp.employeeId}</span>
                    </td>

                    <td className="text-slate-600">{emp.education}</td>
                    <td className="text-slate-600">{emp.experience} yrs</td>
                    <td className="font-semibold text-slate-800">{INR.format(emp.basicSalary)}</td>

                    {/* Actions — admin only */}
                    {isAdmin && (
                      <td>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => { setSelected(emp); setOpen(true); }}
                            title="Edit"
                            className="rounded-lg p-2 text-slate-400 transition hover:bg-indigo-50 hover:text-indigo-600"
                          >
                            <Edit3 size={15} />
                          </button>
                          <button
                            onClick={() => remove(emp)}
                            title={confirmId === emp._id ? 'Click again to confirm delete' : 'Delete'}
                            className={`rounded-lg p-2 transition ${
                              confirmId === emp._id
                                ? 'bg-rose-100 text-rose-600'
                                : 'text-slate-400 hover:bg-rose-50 hover:text-rose-600'
                            }`}
                          >
                            <Trash2 size={15} />
                          </button>
                          {confirmId === emp._id && (
                            <span className="text-xs font-medium text-rose-500">Confirm?</span>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={colCount}>
                    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                      <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                        <Users size={24} />
                      </div>
                      <p className="text-sm font-semibold text-slate-700">No employees found</p>
                      <p className="mt-1 text-xs text-slate-400">
                        {query
                          ? 'Try a different search term.'
                          : isAdmin
                            ? 'Add your first employee to get started.'
                            : 'No employee records available.'}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal — admin only */}
      {isAdmin && open && (
        <EmployeeForm
          employee={selected}
          onSave={save}
          onClose={() => setOpen(false)}
          saving={saving}
        />
      )}
    </div>
  );
}
