import { useEffect, useState } from 'react';
import { Layers, Plus, Save, X } from 'lucide-react';
import { promotionApi } from '../services/api';

const INR = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

export default function DesignationsModal({ onClose, onUpdated }) {
  const [designations, setDesignations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newForm, setNewForm] = useState({ title: '', grade: '', baseSalary: '', description: '' });
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    promotionApi.designations()
      .then(setDesignations)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newForm.title || !newForm.grade || !newForm.baseSalary) {
      return setError('Title, grade, and base salary are required.');
    }
    setSaving(true);
    setError('');
    try {
      await promotionApi.createDesignation({
        ...newForm,
        baseSalary: Number(newForm.baseSalary),
      });
      setNewForm({ title: '', grade: '', baseSalary: '', description: '' });
      setShowAdd(false);
      load();
      onUpdated?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="sp-modal-backdrop" onClick={onClose}>
      <div className="sp-modal max-w-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <Layers size={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-800">Designations &amp; Salary Grades</h2>
              <p className="text-xs text-slate-500">Configurable company pay structures</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && <p className="sp-notice-error">{error}</p>}

          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Editing or creating a grade updates the standard structure without altering historical employee payroll records.
            </p>
            {!showAdd && (
              <button
                type="button"
                onClick={() => setShowAdd(true)}
                className="sp-btn-primary text-xs py-1.5 px-3 shrink-0"
              >
                <Plus size={14} /> Add Grade
              </button>
            )}
          </div>

          {/* Add form */}
          {showAdd && (
            <form onSubmit={handleCreate} className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-indigo-800">New Salary Grade</p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700">Designation Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Senior QA Engineer"
                    value={newForm.title}
                    onChange={(e) => setNewForm({ ...newForm, title: e.target.value })}
                    className="mt-1 sp-input text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">Grade Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. L3"
                    value={newForm.grade}
                    onChange={(e) => setNewForm({ ...newForm, grade: e.target.value })}
                    className="mt-1 sp-input text-xs uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">Base Monthly Salary (₹)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    placeholder="e.g. 85000"
                    value={newForm.baseSalary}
                    onChange={(e) => setNewForm({ ...newForm, baseSalary: e.target.value })}
                    className="mt-1 sp-input text-xs"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">Description (Optional)</label>
                <input
                  type="text"
                  placeholder="Role responsibilities and experience expectations"
                  value={newForm.description}
                  onChange={(e) => setNewForm({ ...newForm, description: e.target.value })}
                  className="mt-1 sp-input text-xs"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className="sp-btn-secondary text-xs py-1.5 px-3"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="sp-btn-primary text-xs py-1.5 px-3"
                >
                  {saving ? 'Saving…' : 'Save Grade'}
                </button>
              </div>
            </form>
          )}

          {/* Grades Table */}
          <div className="overflow-x-auto">
            <table className="sp-table min-w-[500px]">
              <thead>
                <tr>
                  <th>Designation</th>
                  <th>Grade</th>
                  <th>Base Salary</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(4)].map((_, i) => (
                    <tr key={i}>
                      {[...Array(4)].map((__, j) => (
                        <td key={j}><div className="sp-skeleton h-4 rounded w-20" /></td>
                      ))}
                    </tr>
                  ))
                ) : designations.map((d) => (
                  <tr key={d._id}>
                    <td>
                      <p className="font-semibold text-slate-800">{d.title}</p>
                      {d.description && <p className="text-[11px] text-slate-400">{d.description}</p>}
                    </td>
                    <td>
                      <span className="sp-badge-slate font-mono font-bold text-xs">{d.grade}</span>
                    </td>
                    <td className="font-bold text-slate-800">{INR.format(d.baseSalary)}</td>
                    <td>
                      <span className={`sp-badge-${d.active ? 'emerald' : 'slate'} text-[11px]`}>
                        {d.active ? 'Active' : 'Archived'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
