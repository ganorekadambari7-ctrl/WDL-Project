import { useEffect, useState } from 'react';
import { Building2, Edit2, Layers, Plus, Save, X } from 'lucide-react';
import { departmentApi, promotionApi } from '../services/api';

const INR = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

export default function DesignationsModal({ onClose, onUpdated }) {
  const [activeTab, setActiveTab] = useState('designations'); // 'designations' | 'departments'

  // Data states
  const [designations, setDesignations] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Filters
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('all');

  // Designation form
  const [showAddDesig, setShowAddDesig] = useState(false);
  const [editingDesig, setEditingDesig] = useState(null);
  const [desigForm, setDesigForm] = useState({
    title: '',
    department: 'IT',
    grade: '',
    level: 1,
    baseSalary: '',
    description: '',
  });

  // Department form
  const [showAddDept, setShowAddDept] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [deptForm, setDeptForm] = useState({
    name: '',
    code: '',
    description: '',
  });

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [desigs, depts] = await Promise.all([
        promotionApi.designations(),
        departmentApi.list(true),
      ]);
      setDesignations(desigs);
      setDepartments(depts);
      if (depts.length > 0 && !desigForm.department) {
        setDesigForm((prev) => ({ ...prev, department: depts[0].name }));
      }
    } catch (err) {
      setError(err.message || 'Failed to load configuration data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  /* ── Designation Handlers ── */
  const handleSaveDesignation = async (e) => {
    e.preventDefault();
    if (!desigForm.title || !desigForm.department || !desigForm.grade || desigForm.baseSalary === '') {
      return setError('Title, department, grade, and base salary are required.');
    }
    setSaving(true);
    setError('');
    try {
      const payload = {
        title: desigForm.title.trim(),
        department: desigForm.department.trim(),
        grade: desigForm.grade.trim().toUpperCase(),
        level: Number(desigForm.level) || 0,
        baseSalary: Number(desigForm.baseSalary),
        description: desigForm.description.trim(),
      };

      if (editingDesig) {
        await promotionApi.updateDesignation(editingDesig._id, payload);
      } else {
        await promotionApi.createDesignation(payload);
      }

      setDesigForm({ title: '', department: departments[0]?.name || 'IT', grade: '', level: 1, baseSalary: '', description: '' });
      setShowAddDesig(false);
      setEditingDesig(null);
      await loadData();
      onUpdated?.();
    } catch (err) {
      setError(err.message || 'Failed to save designation.');
    } finally {
      setSaving(false);
    }
  };

  const startEditDesig = (desig) => {
    setEditingDesig(desig);
    setDesigForm({
      title: desig.title,
      department: desig.department || 'IT',
      grade: desig.grade,
      level: desig.level ?? 1,
      baseSalary: String(desig.baseSalary),
      description: desig.description || '',
    });
    setShowAddDesig(true);
  };

  /* ── Department Handlers ── */
  const handleSaveDepartment = async (e) => {
    e.preventDefault();
    if (!deptForm.name.trim()) {
      return setError('Department name is required.');
    }
    setSaving(true);
    setError('');
    try {
      const payload = {
        name: deptForm.name.trim(),
        code: deptForm.code?.trim().toUpperCase(),
        description: deptForm.description?.trim(),
      };

      if (editingDept) {
        await departmentApi.update(editingDept._id, payload);
      } else {
        await departmentApi.create(payload);
      }

      setDeptForm({ name: '', code: '', description: '' });
      setShowAddDept(false);
      setEditingDept(null);
      await loadData();
      onUpdated?.();
    } catch (err) {
      setError(err.message || 'Failed to save department.');
    } finally {
      setSaving(false);
    }
  };

  const startEditDept = (dept) => {
    setEditingDept(dept);
    setDeptForm({
      name: dept.name,
      code: dept.code || '',
      description: dept.description || '',
    });
    setShowAddDept(true);
  };

  const filteredDesignations = designations.filter((d) =>
    selectedDeptFilter === 'all' ? true : d.department === selectedDeptFilter
  );

  return (
    <div className="sp-modal-backdrop" onClick={onClose}>
      <div className="sp-modal max-w-3xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <Layers size={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-800">Department &amp; Designation Management</h2>
              <p className="text-xs text-slate-500">Configure corporate hierarchy, department structures &amp; salary pay scales</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-100 bg-slate-50/60 px-6 pt-2">
          <button
            type="button"
            onClick={() => { setActiveTab('designations'); setError(''); }}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition ${
              activeTab === 'designations'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers size={14} />
            <span>Designations &amp; Salary Grades ({designations.length})</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('departments'); setError(''); }}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition ${
              activeTab === 'departments'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Building2 size={14} />
            <span>Departments ({departments.length})</span>
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs text-rose-700">
            {error}
          </div>
        )}

        {/* Body Content */}
        <div className="p-6">
          {activeTab === 'designations' ? (
            <div className="space-y-4">
              {/* Toolbar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-slate-500">Filter Department:</label>
                  <select
                    value={selectedDeptFilter}
                    onChange={(e) => setSelectedDeptFilter(e.target.value)}
                    className="sp-input text-xs w-44"
                  >
                    <option value="all">All Departments</option>
                    {departments.map((d) => (
                      <option key={d._id} value={d.name}>{d.name}</option>
                    ))}
                  </select>
                </div>

                {!showAddDesig && (
                  <button
                    onClick={() => {
                      setEditingDesig(null);
                      setDesigForm({
                        title: '',
                        department: selectedDeptFilter === 'all' ? (departments[0]?.name || 'IT') : selectedDeptFilter,
                        grade: '',
                        level: 1,
                        baseSalary: '',
                        description: '',
                      });
                      setShowAddDesig(true);
                    }}
                    className="sp-btn-primary flex items-center gap-1.5 text-xs self-start"
                  >
                    <Plus size={14} />
                    <span>Add Designation</span>
                  </button>
                )}
              </div>

              {/* Add / Edit Designation Form */}
              {showAddDesig && (
                <form onSubmit={handleSaveDesignation} className="rounded-xl border border-indigo-100 bg-indigo-50/30 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wider text-indigo-700">
                      {editingDesig ? 'Edit Designation' : 'New Designation Configuration'}
                    </p>
                    <button
                      type="button"
                      onClick={() => { setShowAddDesig(false); setEditingDesig(null); }}
                      className="text-xs text-slate-400 hover:text-slate-600"
                    >
                      Cancel
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700">Title *</label>
                      <input
                        type="text"
                        required
                        value={desigForm.title}
                        onChange={(e) => setDesigForm({ ...desigForm, title: e.target.value })}
                        placeholder="e.g. Senior Accountant"
                        className="mt-1 sp-input text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700">Department *</label>
                      <select
                        value={desigForm.department}
                        onChange={(e) => setDesigForm({ ...desigForm, department: e.target.value })}
                        className="mt-1 sp-input text-xs"
                      >
                        {departments.map((d) => (
                          <option key={d._id} value={d.name}>{d.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700">Grade Code *</label>
                      <input
                        type="text"
                        required
                        value={desigForm.grade}
                        onChange={(e) => setDesigForm({ ...desigForm, grade: e.target.value })}
                        placeholder="e.g. F2, L3, M1"
                        className="mt-1 sp-input text-xs font-mono uppercase"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700">
                        Rank / Level (0=Intern, 1=Assoc, 2=Mid, 3=Sr, 4=Lead, 5=Mgr) *
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="10"
                        required
                        value={desigForm.level}
                        onChange={(e) => setDesigForm({ ...desigForm, level: Number(e.target.value) })}
                        className="mt-1 sp-input text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700">Base Salary (₹) *</label>
                      <input
                        type="number"
                        min="0"
                        required
                        value={desigForm.baseSalary}
                        onChange={(e) => setDesigForm({ ...desigForm, baseSalary: e.target.value })}
                        placeholder="e.g. 75000"
                        className="mt-1 sp-input text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700">Description</label>
                      <input
                        type="text"
                        value={desigForm.description}
                        onChange={(e) => setDesigForm({ ...desigForm, description: e.target.value })}
                        placeholder="e.g. Senior ledger specialist"
                        className="mt-1 sp-input text-xs"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="submit"
                      disabled={saving}
                      className="sp-btn-primary flex items-center gap-1.5 text-xs"
                    >
                      <Save size={13} />
                      <span>{saving ? 'Saving...' : editingDesig ? 'Save Changes' : 'Create Designation'}</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Designations Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">Designation Title</th>
                      <th className="px-4 py-3">Department</th>
                      <th className="px-4 py-3">Grade</th>
                      <th className="px-4 py-3">Numeric Rank</th>
                      <th className="px-4 py-3">Base Salary</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400">Loading designations...</td>
                      </tr>
                    ) : filteredDesignations.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400">
                          No designations configured for this department filter.
                        </td>
                      </tr>
                    ) : (
                      filteredDesignations.map((d) => (
                        <tr key={d._id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-4 py-3 font-semibold text-slate-800">
                            {d.title}
                            {d.description && <span className="block text-[10px] text-slate-400 font-normal">{d.description}</span>}
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-block rounded px-2 py-0.5 text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                              {d.department || 'IT'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-mono text-xs font-semibold text-slate-700">{d.grade}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                              Level {d.level ?? 1}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-900">
                            {INR.format(d.baseSalary)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => startEditDesig(d)}
                              className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 ml-auto"
                            >
                              <Edit2 size={12} />
                              <span>Edit</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Departments Tab */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500">
                  Manage organization business units. Designations and employee roles belong to a department.
                </p>
                {!showAddDept && (
                  <button
                    onClick={() => {
                      setEditingDept(null);
                      setDeptForm({ name: '', code: '', description: '' });
                      setShowAddDept(true);
                    }}
                    className="sp-btn-primary flex items-center gap-1.5 text-xs"
                  >
                    <Plus size={14} />
                    <span>Add Department</span>
                  </button>
                )}
              </div>

              {/* Add / Edit Department Form */}
              {showAddDept && (
                <form onSubmit={handleSaveDepartment} className="rounded-xl border border-indigo-100 bg-indigo-50/30 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wider text-indigo-700">
                      {editingDept ? 'Edit Department' : 'New Department Configuration'}
                    </p>
                    <button
                      type="button"
                      onClick={() => { setShowAddDept(false); setEditingDept(null); }}
                      className="text-xs text-slate-400 hover:text-slate-600"
                    >
                      Cancel
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700">Department Name *</label>
                      <input
                        type="text"
                        required
                        value={deptForm.name}
                        onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                        placeholder="e.g. Legal, Customer Success"
                        className="mt-1 sp-input text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700">Department Code</label>
                      <input
                        type="text"
                        value={deptForm.code}
                        onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value })}
                        placeholder="e.g. LEG, CS"
                        className="mt-1 sp-input text-xs uppercase font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700">Description</label>
                      <input
                        type="text"
                        value={deptForm.description}
                        onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })}
                        placeholder="e.g. Compliance and legal affairs"
                        className="mt-1 sp-input text-xs"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="submit"
                      disabled={saving}
                      className="sp-btn-primary flex items-center gap-1.5 text-xs"
                    >
                      <Save size={13} />
                      <span>{saving ? 'Saving...' : editingDept ? 'Save Changes' : 'Create Department'}</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Department Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">Department Name</th>
                      <th className="px-4 py-3">Code</th>
                      <th className="px-4 py-3">Description</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {departments.map((dept) => (
                      <tr key={dept._id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-3 font-semibold text-slate-800">
                          {dept.name}
                        </td>
                        <td className="px-4 py-3 font-mono text-indigo-600 font-medium">
                          {dept.code || dept.name.slice(0, 4).toUpperCase()}
                        </td>
                        <td className="px-4 py-3 text-slate-500 max-w-xs truncate">
                          {dept.description || '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            dept.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {dept.active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => startEditDept(dept)}
                            className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 ml-auto"
                          >
                            <Edit2 size={12} />
                            <span>Edit</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
