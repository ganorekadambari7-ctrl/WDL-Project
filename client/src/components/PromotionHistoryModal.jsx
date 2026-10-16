import { useEffect, useState } from 'react';
import { ArrowRight, History, X } from 'lucide-react';
import { promotionApi } from '../services/api';

const INR = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

export default function PromotionHistoryModal({ employee, onClose }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    promotionApi.getByEmployee(employee.employeeId)
      .then(setHistory)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [employee]);

  return (
    <div className="sp-modal-backdrop" onClick={onClose}>
      <div className="sp-modal max-w-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <History size={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-800">Promotion History</h2>
              <p className="text-xs text-slate-500">Record for {employee.name} ({employee.employeeId})</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>

        <div className="p-6">
          {error && <p className="sp-notice-error mb-4">{error}</p>}

          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => <div key={i} className="sp-skeleton h-14 rounded-xl" />)}
            </div>
          ) : history.length ? (
            <div className="overflow-x-auto">
              <table className="sp-table min-w-[560px]">
                <thead>
                  <tr>
                    <th>Effective Date</th>
                    <th>Role Transition</th>
                    <th>Salary Revision</th>
                    <th>Increment</th>
                    <th>Approved By</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((p) => (
                    <tr key={p._id}>
                      <td className="text-xs text-slate-600">
                        <p className="font-medium text-slate-800">
                          {new Date(p.effectiveDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                        <span className={`text-[10px] font-semibold uppercase tracking-wider ${p.status === 'applied' ? 'text-emerald-600' : 'text-amber-600'}`}>
                          ● {p.status}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="text-slate-500">{p.previousDesignation}</span>
                          <ArrowRight size={12} className="text-slate-400" />
                          <span className="font-semibold text-indigo-700">{p.newDesignation}</span>
                        </div>
                        {p.newGrade && <span className="sp-badge-slate text-[10px]">{p.newGrade}</span>}
                      </td>
                      <td className="text-xs">
                        <span className="text-slate-400">{INR.format(p.previousSalary)}</span>
                        <span className="mx-1 text-slate-400">→</span>
                        <span className="font-bold text-slate-800">{INR.format(p.newSalary)}</span>
                      </td>
                      <td>
                        <span className={`sp-badge-${p.incrementPercentage >= 0 ? 'emerald' : 'rose'} text-xs font-semibold`}>
                          {p.incrementPercentage >= 0 ? `+${p.incrementPercentage}%` : `${p.incrementPercentage}%`}
                        </span>
                      </td>
                      <td className="text-xs text-slate-500">
                        {p.approvedByName || 'Admin'}
                        {p.remarks && <p className="text-[11px] italic text-slate-400 mt-0.5">"{p.remarks}"</p>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-8 text-center">
              <p className="text-sm text-slate-500">No promotion history recorded for this employee.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
