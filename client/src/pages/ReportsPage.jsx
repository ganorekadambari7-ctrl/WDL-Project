import { useState } from 'react';
import { BarChart3, Info, TrendingUp, Users } from 'lucide-react';

// ── ALL DATA IS DEMO / MOCK ───────────────────────────────────────────────
// Real reports integration is a separate development phase.
// Replace these with aggregation API calls when ready.
const DATA = {
  monthly: {
    labels:      ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'],
    performance: [64, 71, 68, 79, 83, 91],
    salary:      [18, 21, 20, 23, 22, 25],
  },
  yearly: {
    labels:      ['2021', '2022', '2023', '2024', '2025', '2026'],
    performance: [58, 63, 69, 76, 82, 89],
    salary:      [13, 16, 19, 22, 25, 29],
  },
};
// ─────────────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const [period, setPeriod] = useState('monthly');
  const data = DATA[period];
  const maxPerf   = Math.max(...data.performance);
  const maxSalary = Math.max(...data.salary);

  // SVG line chart points
  const W = 380, H = 150;
  const points = data.performance
    .map((v, i) => `${(i * (W / (data.labels.length - 1))).toFixed(1)},${(H - (v / maxPerf) * H).toFixed(1)}`)
    .join(' ');
  const polyFill = `0,${H} ${points} ${W},${H}`;

  return (
    <div className="sp-page">

      {/* ── Page header ── */}
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">Analytics</p>
          <h1 className="mt-1.5 text-[1.6rem] font-semibold tracking-tight text-slate-900">
            Reports
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Overview of workforce metrics and payroll trends.
          </p>
        </div>

        {/* Period toggle */}
        <div className="flex items-center rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
          {(['monthly', 'yearly']).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded-lg px-4 py-2 text-sm font-medium capitalize transition-all ${
                period === p
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* ── Demo data notice ── */}
      <div className="mb-6 sp-notice-info flex items-start gap-2">
        <Info size={15} className="mt-0.5 shrink-0" />
        <span>
          <strong>Demo data only.</strong> These charts display static placeholder values.
          Real report integration (live DB aggregation) is planned for a later phase.
        </span>
      </div>

      {/* ── Stat cards ── */}
      <div className="sp-metrics-grid">
        {[
          { label: 'Avg. performance',  value: `${data.performance.at(-1)}%`,         sub: '+7.2% from last period', icon: TrendingUp, iconBg: 'bg-indigo-100 text-indigo-600' },
          { label: 'Avg. attendance',   value: '93.5%',                               sub: '124 employees tracked', icon: Users,      iconBg: 'bg-emerald-100 text-emerald-600' },
          { label: 'Salary spend',      value: `₹${data.salary.reduce((a,b)=>a+b,0)}L`, sub: `+12.4% from last period`, icon: BarChart3,  iconBg: 'bg-blue-100 text-blue-600' },
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

      {/* ── Charts row ── */}
      <div className="sp-two-col mt-6">

        {/* Performance trend (SVG line chart) */}
        <div className="sp-card">
          <div className="flex items-start justify-between border-b border-slate-100 px-6 py-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-800">Performance trend</h2>
              <p className="mt-0.5 text-xs text-slate-500">Average team performance score</p>
            </div>
            <span className="sp-badge-indigo">+12%</span>
          </div>
          <div className="overflow-x-auto px-6 py-5">
            <svg
              viewBox={`0 0 ${W} ${H + 30}`}
              className="h-48 min-w-[300px] w-full"
              aria-label="Performance trend line chart"
            >
              {/* Grid lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((t) => (
                <line
                  key={t}
                  x1="0" y1={H - t * H} x2={W} y2={H - t * H}
                  stroke="#f1f5f9" strokeWidth="1"
                />
              ))}
              {/* Area fill */}
              <defs>
                <linearGradient id="perf-area" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="#4f46e5" stopOpacity="0" />
                </linearGradient>
              </defs>
              <polygon points={polyFill} fill="url(#perf-area)" />
              {/* Line */}
              <polyline
                points={points}
                fill="none" stroke="#4f46e5" strokeWidth="2.5"
                strokeLinecap="round" strokeLinejoin="round"
              />
              {/* Dots + labels */}
              {data.performance.map((v, i) => {
                const x = (i * (W / (data.labels.length - 1))).toFixed(1);
                const y = (H - (v / maxPerf) * H).toFixed(1);
                return (
                  <g key={i}>
                    <circle cx={x} cy={y} r="4" fill="white" stroke="#4f46e5" strokeWidth="2.5" />
                    <text x={x} y={H + 18} textAnchor="middle" fill="#94a3b8" fontSize="11">
                      {data.labels[i]}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Attendance donut */}
        <div className="sp-card">
          <div className="border-b border-slate-100 px-6 py-4">
            <h2 className="text-sm font-semibold text-slate-800">Attendance analytics</h2>
            <p className="mt-0.5 text-xs text-slate-500">Current team status</p>
          </div>
          <div className="flex flex-col items-center gap-5 px-6 py-6">
            <div
              className="grid size-36 place-items-center rounded-full"
              style={{ background: 'conic-gradient(#4f46e5 0 93.5%, #f59e0b 93.5% 97%, #e2e8f0 97% 100%)' }}
            >
              <div className="grid size-24 place-items-center rounded-full bg-white text-center shadow-sm">
                <span className="text-xl font-bold text-slate-900">93.5%</span>
                <span className="text-[10px] text-slate-400">present</span>
              </div>
            </div>
            <div className="grid w-full grid-cols-3 gap-2 text-center">
              {[
                { label: 'Present', val: 116, dot: 'bg-indigo-500' },
                { label: 'Late',    val: 5,   dot: 'bg-amber-400' },
                { label: 'Absent',  val: 3,   dot: 'bg-slate-200' },
              ].map(({ label, val, dot }) => (
                <div key={label} className="rounded-xl bg-slate-50 p-3">
                  <div className={`mx-auto mb-1.5 size-2.5 rounded-full ${dot}`} />
                  <p className="text-base font-bold text-slate-800">{val}</p>
                  <p className="text-[10px] text-slate-500">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Salary bar chart ── */}
      <div className="sp-card mt-6">
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Salary expenditure</h2>
            <p className="mt-0.5 text-xs text-slate-500">Payroll spend in ₹ Lakhs</p>
          </div>
          <span className="font-semibold text-sm text-indigo-700">
            ₹{data.salary.reduce((a, b) => a + b, 0)}L total
          </span>
        </div>
        <div className="px-6 py-5">
          <div className="flex h-48 items-end gap-3">
            {data.salary.map((v, i) => {
              const isLast = i === data.salary.length - 1;
              const pct    = (v / maxSalary) * 100;
              return (
                <div key={data.labels[i]} className="group flex flex-1 flex-col items-center gap-1.5">
                  <div className="relative flex w-full flex-1 items-end">
                    <span className="absolute -top-7 left-1/2 hidden -translate-x-1/2 rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-white group-hover:block">
                      ₹{v}L
                    </span>
                    <div
                      className={`sp-bar w-full rounded-t-md ${isLast ? 'bg-indigo-500' : 'bg-slate-200 group-hover:bg-indigo-300'}`}
                      style={{ height: `${pct}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-400">{data.labels[i]}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
