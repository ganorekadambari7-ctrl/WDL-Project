import { useEffect, useState } from 'react';
import { ArrowUpRight, Award, Calendar, CheckCircle2, TrendingUp, X } from 'lucide-react';
import { promotionApi } from '../services/api';

const INR = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

export default function PromotionModal({ employee, onClose, onSuccess }) {
  const [eligibleList, setEligibleList] = useState([]);
  const [selectedDesigId, setSelectedDesigId] = useState('');
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().slice(0, 10));
  const [remarks, setRemarks] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [employeeMeta, setEmployeeMeta] = useState(null);

  useEffect(() => {
    setLoading(true);
    promotionApi.getEligible(employee.employeeId)
      .then((res) => {
        setEmployeeMeta(res.employee);
        setEligibleList(res.eligible || []);
        if (res.eligible && res.eligible.length > 0) {
          setSelectedDesigId(res.eligible[0]._id);
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [employee]);

  const selectedDesig = eligibleList.find((d) => d._id === selectedDesigId);
  const oldSalary = Number(employee.basicSalary || 0);
  const newSalary = Number(selectedDesig?.baseSalary || 0);
  const diffSalary = newSalary - oldSalary;
  const incrementPct = oldSalary > 0
    ? Number(((diffSalary / oldSalary) * 100).toFixed(2))
    : 0;

  const currentLevel = employeeMeta?.currentLevel ?? 0;
  const newLevel = selectedDesig?.level ?? currentLevel;

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
      return setError('Please select an eligible higher-grade designation.');
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

  const empDept = employeeMeta?.department || employee.department || 'IT';

  return (
    <div className="sp-modal-backdrop" onClick={onClose}>
      <div className="sp-modal max-w-lg" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <TrendingUp size={20} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-800">Promote Employee</h2>
              <p className="text-xs text-slate-500">
                Departmental promotion &amp; automatic salary revision
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs text-rose-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Employee Current Details Card */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-500 uppercase">Employee</span>
              <span className="font-bold text-slate-800">
                {employee.name} <span className="font-mono text-indigo-600">({employee.employeeId})</span>
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-500 uppercase">Department</span>
              <span className="inline-block rounded px-2 py-0.5 text-[11px] font-semibold bg-indigo-100 text-indigo-800">
                {empDept}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-500 uppercase">Current Role &amp; Grade</span>
              <span className="font-medium text-slate-800">
                {employee.designation || 'Unassigned'}
                {employee.grade && <span className="ml-1 text-slate-500 font-mono">(Grade {employee.grade})</span>}
                <span className="ml-1.5 rounded bg-slate-200 px-1.5 py-0.2 text-[10px] font-bold text-slate-700">
                  Level {currentLevel}
                </span>
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-500 uppercase">Current Basic Salary</span>
              <span className="font-bold text-slate-900">{INR.format(oldSalary)}</span>
            </div>
          </div>

          {/* Designation Dropdown */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
              Promote To Higher Designation ({empDept} Department) *
            </label>

            {loading ? (
              <div className="sp-input text-xs text-slate-400 py-2">Loading eligible positions...</div>
            ) : eligibleList.length === 0 ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-800 space-y-1">
                <p className="font-semibold flex items-center gap-1.5">
                  <Award size={15} className="text-amber-600" />
                  Top Rank Reached in {empDept}
                </p>
                <p className="text-[11px] text-amber-700 leading-relaxed">
                  No higher-ranked positions are currently configured for the <strong>{empDept}</strong> department above Level {currentLevel}.
                </p>
                <p className="text-[10px] text-amber-600 pt-1">
                  Note: For cross-department transfers or title adjustments, please use the <strong>Edit Employee</strong> action.
                </p>
              </div>
            ) : (
              <select
                value={selectedDesigId}
                onChange={(e) => setSelectedDesigId(e.target.value)}
                className="sp-input text-xs w-full font-medium"
              >
                {eligibleList.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.title} (Grade {d.grade} • Level {d.level} • {INR.format(d.baseSalary)})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Effective Date Picker */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Effective Date *
            </label>
            <input
              type="date"
              required
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
              className="sp-input text-xs"
            />
            <p className="mt-1 text-[11px] text-slate-400">
              {isImmediate
                ? 'Effective immediately: updates current basic salary upon confirmation.'
                : 'Future-dated: current salary remains unchanged until this effective date.'}
            </p>
          </div>

          {/* Salary Revision Comparison Card */}
          {selectedDesig && (
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-indigo-700">Salary Revision Preview</p>
                <span className="text-[10px] font-bold text-indigo-600 bg-white px-2 py-0.5 rounded border border-indigo-200">
                  Rank: Level {currentLevel} → Level {newLevel}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-white p-2.5 shadow-xs border border-slate-100">
                  <p className="text-[10px] text-slate-400 uppercase">Old Salary</p>
                  <p className="mt-0.5 text-xs font-semibold text-slate-700">{INR.format(oldSalary)}</p>
                </div>
                <div className="rounded-lg bg-white p-2.5 shadow-xs border border-slate-100">
                  <p className="text-[10px] text-slate-400 uppercase">New Salary</p>
                  <p className="mt-0.5 text-xs font-bold text-indigo-700">{INR.format(newSalary)}</p>
                </div>
                <div className="rounded-lg bg-white p-2.5 shadow-xs border border-slate-100">
                  <p className="text-[10px] text-slate-400 uppercase">Increment</p>
                  <p className="mt-0.5 text-xs font-bold flex items-center justify-center gap-0.5 text-emerald-600">
                    <ArrowUpRight size={13} />
                    +{INR.format(diffSalary)}
                  </p>
                  <p className="text-[10px] text-slate-400">(+{incrementPct}%)</p>
                </div>
              </div>

              {isMidMonth && (
                <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50/70 p-2 text-xs text-amber-800">
                  <strong>Mid-month proration note:</strong> Effective on day {effDay}. Payroll for this month will be automatically prorated between old and new rates.
                </div>
              )}
            </div>
          )}

          {/* Remarks */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
              Promotion Remarks / Justification
            </label>
            <textarea
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Annual appraisal recommendation, outstanding performance..."
              className="mt-1 sp-input resize-none text-xs"
            />
          </div>

          {/* Confirmation Checkbox */}
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <input
              type="checkbox"
              checked={confirmed}
              disabled={eligibleList.length === 0}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-0.5 size-4 accent-indigo-600"
            />
            <span className="text-xs text-slate-700 leading-relaxed">
              I confirm the promotion of <strong>{employee.name}</strong> to{' '}
              <strong>{selectedDesig ? selectedDesig.title : 'the selected designation'}</strong> in the{' '}
              <strong>{empDept}</strong> department with new basic salary{' '}
              <strong>{selectedDesig ? INR.format(newSalary) : ''}</strong>.
            </span>
          </label>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="sp-btn-secondary text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !confirmed || eligibleList.length === 0}
              className="sp-btn-primary text-xs"
            >
              {saving ? 'Processing...' : 'Approve Promotion'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
