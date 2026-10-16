import { useEffect, useState } from 'react';
import { ArrowUpRight, Calendar, CheckCircle2, TrendingUp, X } from 'lucide-react';
import { promotionApi } from '../services/api';

const INR = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

export default function PromotionModal({ employee, onClose, onSuccess }) {
  const [designations, setDesignations] = useState([]);
  const [selectedDesigId, setSelectedDesigId] = useState('');
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().slice(0, 10));
  const [remarks, setRemarks] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [loadingDesigs, setLoadingDesigs] = useState(true);

  useEffect(() => {
    promotionApi.designations()
      .then((list) => {
        setDesignations(list);
        if (list.length > 0) {
          // Select first designation that is different from current
          const diff = list.find((d) => d.title !== employee.designation) || list[0];
          setSelectedDesigId(diff._id);
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoadingDesigs(false));
  }, [employee]);

  const selectedDesig = designations.find((d) => d._id === selectedDesigId);
  const oldSalary = Number(employee.basicSalary || 0);
  const newSalary = Number(selectedDesig?.baseSalary || 0);
  const diffSalary = newSalary - oldSalary;
  const incrementPct = oldSalary > 0
    ? Number(((diffSalary / oldSalary) * 100).toFixed(2))
    : 0;

  // Check if effective date is today/past vs future
  const isImmediate = new Date(effectiveDate) <= new Date(new Date().toISOString().slice(0, 10));

  // Check for mid-month effective date
  const effDay = new Date(effectiveDate).getDate();
  const isMidMonth = effDay > 1;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!confirmed) {
      return setError('Please confirm the promotion checkbox to proceed.');
    }
    if (!selectedDesigId) {
      return setError('Please select a new designation.');
    }
    setSaving(true);
    setError('');
    try {
      const res = await promotionApi.promote({
        employeeId: employee.employeeId,
        newDesignationId: selectedDesigId,
        effectiveDate,
        remarks,
      });
      onSuccess?.(res);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to apply promotion.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="sp-modal-backdrop" onClick={onClose}>
      <div className="sp-modal max-w-lg" onClick={(e) => e.stopPropagation()}>

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <TrendingUp size={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-800">Promote Employee</h2>
              <p className="text-xs text-slate-500">Assign new designation and salary grade</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <p className="sp-notice-error">{error}</p>}

          {/* Current profile strip */}
          <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-800">{employee.name}</p>
                <p className="text-xs font-mono text-indigo-600">{employee.employeeId}</p>
              </div>
              <div className="text-right">
                <span className="sp-badge-indigo text-[11px] font-medium">
                  {employee.designation || 'Unassigned'} {employee.grade ? `(${employee.grade})` : ''}
                </span>
                <p className="mt-1 text-xs text-slate-500">Current: {INR.format(oldSalary)}</p>
              </div>
            </div>
          </div>

          {/* New Designation Selector */}
          <div>
            <label className="block text-sm font-medium text-slate-700">New Designation &amp; Grade</label>
            {loadingDesigs ? (
              <div className="sp-skeleton mt-1.5 h-10 w-full rounded-lg" />
            ) : (
              <select
                value={selectedDesigId}
                onChange={(e) => setSelectedDesigId(e.target.value)}
                className="mt-1.5 sp-input"
              >
                {designations.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.title} — Grade {d.grade} ({INR.format(d.baseSalary)})
                  </option>
                ))}
              </select>
            )}
            {selectedDesig?.description && (
              <p className="mt-1 text-xs text-slate-400">{selectedDesig.description}</p>
            )}
          </div>

          {/* Effective Date */}
          <div>
            <label className="block text-sm font-medium text-slate-700">Effective Date</label>
            <div className="relative mt-1.5">
              <input
                type="date"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                className="sp-input"
              />
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {isImmediate
                ? '⚡ Effective immediately: Employee salary will be revised today.'
                : `📅 Scheduled: Promotion will take effect on ${new Date(effectiveDate).toLocaleDateString('en-IN')}.`}
            </p>
          </div>

          {/* Salary Comparison Card */}
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-700">Salary Revision Preview</p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-white p-2.5 shadow-sm border border-slate-100">
                <p className="text-[11px] text-slate-400 uppercase">Old Salary</p>
                <p className="mt-0.5 text-sm font-semibold text-slate-700">{INR.format(oldSalary)}</p>
              </div>
              <div className="rounded-lg bg-white p-2.5 shadow-sm border border-slate-100">
                <p className="text-[11px] text-slate-400 uppercase">New Salary</p>
                <p className="mt-0.5 text-sm font-bold text-indigo-700">{INR.format(newSalary)}</p>
              </div>
              <div className="rounded-lg bg-white p-2.5 shadow-sm border border-slate-100">
                <p className="text-[11px] text-slate-400 uppercase">Increment</p>
                <p className={`mt-0.5 text-sm font-bold flex items-center justify-center gap-0.5 ${diffSalary >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {diffSalary >= 0 ? <ArrowUpRight size={13} /> : null}
                  {diffSalary >= 0 ? `+${INR.format(diffSalary)}` : INR.format(diffSalary)}
                </p>
                <p className="text-[10px] text-slate-400">({incrementPct >= 0 ? `+${incrementPct}%` : `${incrementPct}%`})</p>
              </div>
            </div>

            {isMidMonth && (
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50/70 p-2.5 text-xs text-amber-800">
                <strong>Mid-month proration note:</strong> Since promotion takes effect on day {effDay}, the payroll for this month will be automatically prorated between old and new rates.
              </div>
            )}
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-sm font-medium text-slate-700">Promotion Remarks / Justification</label>
            <textarea
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Annual appraisal performance rating, role expansion…"
              className="mt-1.5 sp-input resize-none"
            />
          </div>

          {/* Confirmation Checkbox */}
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-0.5 size-4 accent-indigo-600"
            />
            <span className="text-xs text-slate-700">
              <strong>Admin Confirmation:</strong> I confirm this designation change and authorize the automated salary revision for {employee.name}.
            </span>
          </label>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="sp-btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !confirmed}
              className="sp-btn-primary"
            >
              {saving ? 'Processing…' : 'Confirm Promotion'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
