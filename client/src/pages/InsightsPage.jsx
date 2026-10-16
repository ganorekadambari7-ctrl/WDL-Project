import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Lightbulb,
  RefreshCw,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { insightsApi } from '../services/api';

const INR = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

export default function InsightsPage() {
  const [data,    setData]    = useState(null);
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    setError('');
    insightsApi
      .get()
      .then((d) => { setData(d); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
  };

  useEffect(load, []);

  return (
    <div className="sp-page">

      {/* ── Page header ── */}
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">
            Salary Intelligence
          </p>
          <h1 className="mt-1.5 text-[1.6rem] font-semibold tracking-tight text-slate-900">
            Insights
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Analyze salary records and attendance patterns to spot anomalies and optimize compensation.
          </p>
        </div>
        <button onClick={load} className="sp-btn-secondary gap-2">
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          Refresh insights
        </button>
      </div>

      {/* Error */}
      {error && <p className="mb-6 sp-notice-error">{error}</p>}

      {/* Loading skeleton */}
      {loading && !data && (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="sp-skeleton h-28 w-full rounded-xl" />
          ))}
        </div>
      )}

      {/* Content */}
      {data && (
        <>
          {/* ── Summary stats ── */}
          <div className="sp-metrics-grid">
            {[
              {
                label: 'Average net salary',
                value: INR.format(data.summary.averageSalary),
                sub:   'Latest calculation per employee',
                icon:  TrendingUp,
                iconBg: 'bg-indigo-100 text-indigo-600',
              },
              {
                label: 'Attendance signal',
                value: `${data.summary.attendanceRate}%`,
                sub:   'Recorded attendance rate',
                icon:  CheckCircle2,
                iconBg: 'bg-emerald-100 text-emerald-600',
              },
              {
                label: 'Salary trend',
                value: data.summary.trend.charAt(0).toUpperCase() + data.summary.trend.slice(1),
                sub:   'Based on saved calculations',
                icon:  data.summary.trend === 'downward' ? TrendingDown : TrendingUp,
                iconBg: data.summary.trend === 'downward' ? 'bg-rose-100 text-rose-600' : 'bg-blue-100 text-blue-600',
              },
            ].map(({ label, value, sub, icon: Icon, iconBg }) => (
              <div key={label} className="sp-card p-5">
                <div className={`mb-4 flex size-10 items-center justify-center rounded-xl ${iconBg}`}>
                  <Icon size={18} />
                </div>
                <p className="text-2xl font-bold text-slate-900">{value}</p>
                <p className="mt-1 text-sm font-medium text-slate-700">{label}</p>
                <p className="mt-0.5 text-xs text-slate-400">{sub}</p>
              </div>
            ))}
          </div>

          {/* ── Anomalies + Suggestions ── */}
          <div className="sp-two-col mt-6">

            {/* Anomalies */}
            <div className="sp-card">
              <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-4">
                <div className="flex size-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                  <AlertTriangle size={17} />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-slate-800">Detected anomalies</h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Salaries outside the ±35% band of the average
                  </p>
                </div>
              </div>
              <div className="p-5 space-y-3">
                {data.anomalies.length ? (
                  data.anomalies.map((item) => (
                    <div
                      key={item.employee}
                      className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-4"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{item.employee}</p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {item.type === 'above' ? '▲ Above' : '▼ Below'} the average salary range
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-slate-900">{INR.format(item.amount)}</p>
                        <span className={`text-xs font-medium ${item.type === 'above' ? 'text-indigo-600' : 'text-rose-600'}`}>
                          {item.type}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center rounded-xl bg-emerald-50 px-6 py-8 text-center">
                    <CheckCircle2 size={24} className="mb-2 text-emerald-500" />
                    <p className="text-sm font-semibold text-emerald-800">No anomalies detected</p>
                    <p className="mt-1 text-xs text-emerald-600">
                      Add more salary calculations for a stronger comparison.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Suggestions */}
            <div className="sp-card">
              <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-4">
                <div className="flex size-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <Lightbulb size={17} />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-slate-800">Optimization suggestions</h2>
                  <p className="mt-0.5 text-xs text-slate-500">Actionable prompts from your data</p>
                </div>
              </div>
              <ol className="divide-y divide-slate-50 p-5 space-y-0">
                {data.suggestions.map((s, i) => (
                  <li key={s} className="flex gap-4 py-4 first:pt-0 last:pb-0">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[11px] font-bold text-white">
                      {i + 1}
                    </span>
                    <p className="text-sm leading-6 text-slate-700">{s}</p>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          {/* Footer note */}
          <p className="mt-6 flex items-center gap-2 text-xs text-slate-400">
            <Bot size={14} />
            Insights are computed from your local Salary Pro records. No external AI is used.
          </p>
        </>
      )}
    </div>
  );
}
