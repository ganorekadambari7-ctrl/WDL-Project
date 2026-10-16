import { useEffect, useState } from 'react';
import { Edit3, History, Layers, Plus, Search, Trash2, TrendingUp, Users } from 'lucide-react';
import EmployeeForm from '../components/EmployeeForm';
import PromotionModal from '../components/PromotionModal';
import PromotionHistoryModal from '../components/PromotionHistoryModal';
import DesignationsModal from '../components/DesignationsModal';
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

  // Promotion modals state
  const [promoteEmp, setPromoteEmp] = useState(null);
  const [historyEmp, setHistoryEmp] = useState(null);
  const [showDesignations, setShowDesignations] = useState(false);

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

  const handlePromotionSuccess = () => {
    load(); // Refresh employees so updated designation/salary shows immediately
  };

  const shown = employees.filter((e) =>
    `${e.name} ${e.employeeId} ${e.designation || ''} ${e.education}`.toLowerCase().includes(query.toLowerCase())
  );

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
              ? 'Manage employee profiles, designations, promotions, and salary structures.'
              : 'View the company employee directory.'}
          </p>
        </div>

        {/* Admin toolbar buttons */}
        {isAdmin && (
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setShowDesignations(true)}
              className="sp-btn-secondary"
              title="Configure salary grades & designations"
            >
              <Layers size={16} />
              Salary Grades
            </button>
            <button
              onClick={() => { setSelected(null); setOpen(true); }}
              className="sp-btn-primary"
            >
              <Plus size={16} />
              Add employee
            </button>
          </div>
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
              className="w-52 bg-transparent text-sm text-slate-700 placeholder:text-slate-400 outline-none"
              placeholder="Search by name, ID, role…"
            />
          </label>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="sp-table min-w-[860px]">
            <thead>
              <tr>
                {['Employee', 'Employee ID', 'Designation & Grade', 'Experience', 'Basic Salary',
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

                    {/* Designation & Grade */}
                    <td>
                      <div>
                        <p className="font-medium text-slate-800 text-xs">{emp.designation || 'Unassigned'}</p>
                        {emp.grade ? (
                          <span className="sp-badge-slate text-[10px] font-mono mt-0.5 inline-block">
                            Grade {emp.grade}
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">Standard</span>
                        )}
                      </div>
                    </td>

                    <td className="text-slate-600">{emp.experience} yrs</td>
                    <td className="font-semibold text-slate-800">{INR.format(emp.basicSalary)}</td>

                    {/* Actions — admin only */}
                    {isAdmin && (
                      <td>
                        <div className="flex items-center gap-1">
                          {/* Promote Button */}
                          <button
                            onClick={() => setPromoteEmp(emp)}
                            title="Promote & revise salary"
                            className="rounded-lg p-1.5 text-indigo-600 transition hover:bg-indigo-50"
                          >
                            <TrendingUp size={15} />
                          </button>
                          {/* Promotion History Button */}
                          <button
                            onClick={() => setHistoryEmp(emp)}
                            title="View promotion history"
                            className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                          >
                            <History size={15} />
                          </button>
                          {/* Edit Button */}
                          <button
                            onClick={() => { setSelected(emp); setOpen(true); }}
                            title="Edit"
                            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-indigo-50 hover:text-indigo-600"
                          >
                            <Edit3 size={15} />
                          </button>
                          {/* Delete Button */}
                          <button
                            onClick={() => remove(emp)}
                            title={confirmId === emp._id ? 'Click again to confirm delete' : 'Delete'}
                            className={`rounded-lg p-1.5 transition ${
                              confirmId === emp._id
                                ? 'bg-rose-100 text-rose-600'
                                : 'text-slate-400 hover:bg-rose-50 hover:text-rose-600'
                            }`}
                          >
                            <Trash2 size={15} />
                          </button>
                          {confirmId === emp._id && (
                            <span className="text-[11px] font-medium text-rose-500 ml-1">Confirm?</span>
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

      {/* Edit / Add Modal */}
      {isAdmin && open && (
        <EmployeeForm
          employee={selected}
          onSave={save}
          onClose={() => setOpen(false)}
          saving={saving}
        />
      )}

      {/* Promote Modal */}
      {isAdmin && promoteEmp && (
        <PromotionModal
          employee={promoteEmp}
          onClose={() => setPromoteEmp(null)}
          onSuccess={handlePromotionSuccess}
        />
      )}

      {/* Promotion History Modal */}
      {historyEmp && (
        <PromotionHistoryModal
          employee={historyEmp}
          onClose={() => setHistoryEmp(null)}
        />
      )}

      {/* Designations Management Modal */}
      {isAdmin && showDesignations && (
        <DesignationsModal
          onClose={() => setShowDesignations(false)}
          onUpdated={load}
        />
      )}
    </div>
  );
}
