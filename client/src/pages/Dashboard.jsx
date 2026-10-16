import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownRight, ArrowUpRight, BriefcaseBusiness, CalendarCheck,
  CheckCircle2, ClipboardList, Clock, TrendingUp, Users,
} from 'lucide-react';
import { employeeApi } from '../services/api';

/* ── Greeting helper ───────────────────────────────────── */
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

/* ── Small Welcome Header SVG Graphic ────────────────── */
function WelcomeHeaderGraphic() {
  return (
    <svg width="180" height="90" viewBox="0 0 180 90" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="140" cy="45" r="38" fill="rgba(37, 99, 235, 0.08)" />
      <circle cx="90"  cy="20" r="18" fill="rgba(15, 159, 143, 0.06)" />
      {/* Floating Mini Payslip Card */}
      <rect x="25" y="18" width="85" height="54" rx="10" fill="white" stroke="#E4E7EC" strokeWidth="1.5" boxShadow="0 4px 12px rgba(0,0,0,0.05)" />
      <rect x="35" y="28" width="22" height="6" rx="3" fill="#2563EB" />
      <rect x="35" y="38" width="45" height="4" rx="2" fill="#E4E7EC" />
      <rect x="35" y="46" width="32" height="4" rx="2" fill="#E4E7EC" />
      <circle cx="92" cy="45" r="10" fill="#EAF8F2" />
      <path d="M88 45L91 48L96 42" stroke="#22A06B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      {/* Floating Rupees Coin */}
      <circle cx="135" cy="52" r="16" fill="#FFF7E3" stroke="#F4B740" strokeWidth="1.5" />
      <text x="135" y="57" textAnchor="middle" fontSize="13" fontWeight="800" fill="#D99B1C">₹</text>
    </svg>
  );
}

/* ── Metric Card Component ────────────────────────────── */
function MetricCard({ color, icon: Icon, label, value, sub, trend, trendLabel, loading }) {
  return (
    <div className={`sp-metric-card ${color}`}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        {/* Icon square */}
        <div style={{
          width: 42, height: 42, borderRadius: 12,
          background: `var(--sp-${color}-light)`,
          color: `var(--sp-${color})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Icon size={20} />
        </div>

        {/* Trend percentage */}
        {trend !== undefined && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 3,
            fontSize: 12, fontWeight: 600,
            color: trend >= 0 ? 'var(--sp-green)' : 'var(--sp-coral)',
            background: trend >= 0 ? 'var(--sp-green-light)' : 'var(--sp-coral-light)',
            padding: '3px 8px', borderRadius: 20,
          }}>
            {trend >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>

      {/* Metric value & labels */}
      <div style={{ marginTop: 14 }}>
        {loading ? (
          <div className="sp-skeleton" style={{ height: 32, width: 80, borderRadius: 8 }} />
        ) : (
          <p style={{
            fontSize: 28, fontWeight: 800, color: 'var(--sp-ink)',
            letterSpacing: '-0.03em', margin: 0, lineHeight: 1,
          }}>
            {value}
          </p>
        )}
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--sp-muted)', margin: '6px 0 2px' }}>
          {label}
        </p>
        {sub && (
          <p style={{ fontSize: 11.5, color: 'var(--sp-subtle)', margin: 0 }}>{sub}</p>
        )}
        {trendLabel && (
          <p style={{ fontSize: 11, color: 'var(--sp-subtle)', margin: '4px 0 0' }}>
            {trendLabel}
          </p>
        )}
      </div>
    </div>
  );
}

/* ── Salary Bar Chart (Demo Data) ─────────────────────── */
const SALARY_BARS = [
  { month: 'Apr', val: 68 },
  { month: 'May', val: 74 },
  { month: 'Jun', val: 71 },
  { month: 'Jul', val: 82 },
  { month: 'Aug', val: 78 },
  { month: 'Sep', val: 91 },
];
const BAR_MAX = Math.max(...SALARY_BARS.map((b) => b.val));

function SalaryChart() {
  return (
    <div>
      <div style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: 12,
        height: 130,
        paddingBottom: 4,
      }}>
        {SALARY_BARS.map((b, i) => {
          const isLast = i === SALARY_BARS.length - 1;
          return (
            <div key={b.month} style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 6,
              height: '100%',
              justifyContent: 'flex-end',
            }}>
              <div
                className="sp-bar"
                title={`₹${b.val}L`}
                style={{
                  width: '100%',
                  height: `${(b.val / BAR_MAX) * 100}%`,
                  borderRadius: '6px 6px 0 0',
                  background: isLast ? 'var(--sp-blue)' : 'var(--sp-blue-light)',
                  transition: 'height 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              />
              <span style={{ fontSize: 11, color: 'var(--sp-muted)', fontWeight: 500 }}>
                {b.month}
              </span>
            </div>
          );
        })}
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 16,
        paddingTop: 14,
        borderTop: '1px solid var(--sp-border-lt)',
      }}>
        <div>
          <p style={{ fontSize: 12, color: 'var(--sp-muted)', margin: 0 }}>Sep 2026 Total</p>
          <p style={{ fontSize: 20, fontWeight: 800, color: 'var(--sp-ink)', margin: '2px 0 0', letterSpacing: '-0.02em' }}>
            ₹18.4L
          </p>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5,
          background: 'var(--sp-green-light)',
          border: '1px solid rgba(34, 160, 107, 0.20)',
          borderRadius: 20, padding: '5px 12px',
        }}>
          <ArrowUpRight size={14} style={{ color: 'var(--sp-green)' }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--sp-green)' }}>
            +16.7% vs Aug
          </span>
        </div>
      </div>
    </div>
  );
}

/* ── Payroll Breakdown Component (Demo Data) ─────────── */
const BREAKDOWN = [
  { label: 'Basic Salaries',  value: '₹14.8L', pct: 80, color: 'var(--sp-blue)' },
  { label: 'Bonuses',         value: '₹2.6L',  pct: 14, color: 'var(--sp-green)' },
  { label: 'Tax Deductions',  value: '₹0.9L',  pct: 5,  color: 'var(--sp-coral)' },
  { label: 'Late Deductions', value: '₹0.1L',  pct: 1,  color: 'var(--sp-amber)' },
];

function PayrollBreakdown() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {BREAKDOWN.map(({ label, value, pct, color }) => (
        <div key={label}>
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', marginBottom: 6,
          }}>
            <span style={{ fontSize: 13, color: 'var(--sp-ink)', fontWeight: 500 }}>
              {label}
            </span>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--sp-ink)' }}>
              {value}
            </span>
          </div>
          <div style={{
            height: 7, background: 'var(--sp-border-lt)',
            borderRadius: 99, overflow: 'hidden',
          }}>
            <div
              className="sp-progress-fill"
              style={{
                height: '100%',
                width: `${pct}%`,
                background: color,
                borderRadius: 99,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Quick Attendance Stats (Demo Data) ───────────────── */
const QUICK_STATS = [
  { label: 'On time',  value: '38', color: 'var(--sp-green)' },
  { label: 'Late',     value: '3',  color: 'var(--sp-amber)' },
  { label: 'Absent',   value: '1',  color: 'var(--sp-coral)' },
  { label: 'On leave', value: '2',  color: 'var(--sp-blue)' },
];

function QuickStats() {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: 10,
    }}>
      {QUICK_STATS.map(({ label, value, color }) => (
        <div key={label} style={{
          background: 'var(--sp-border-lt)',
          borderRadius: 12,
          padding: '12px 10px',
          textAlign: 'center',
        }}>
          <p style={{ fontSize: 20, fontWeight: 800, color, margin: 0, letterSpacing: '-0.02em' }}>
            {value}
          </p>
          <p style={{ fontSize: 11, color: 'var(--sp-muted)', margin: '4px 0 0' }}>{label}</p>
        </div>
      ))}
    </div>
  );
}

/* ── Activity Feed Component (Demo Data) ─────────────── */
const ACTIVITY = [
  { icon: CheckCircle2,     color: 'var(--sp-green)', label: 'September payroll processed', time: '2h ago' },
  { icon: Users,            color: 'var(--sp-blue)',  label: '2 new employees onboarded',   time: '1d ago' },
  { icon: ClipboardList,    color: 'var(--sp-amber)', label: '3 leave requests pending',    time: '1d ago' },
  { icon: BriefcaseBusiness,color: 'var(--sp-teal)',  label: 'Salary report exported',      time: '2d ago' },
];

function ActivityFeed() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {ACTIVITY.map(({ icon: Icon, color, label, time }, i) => (
        <div key={i} style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '10px 0',
          borderBottom: i < ACTIVITY.length - 1 ? '1px solid var(--sp-border-lt)' : 'none',
        }}>
          <div style={{
            width: 34, height: 34,
            borderRadius: 10,
            background: `${color}16`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Icon size={16} style={{ color }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{
              fontSize: 13, fontWeight: 500, color: 'var(--sp-ink)',
              margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {label}
            </p>
          </div>
          <span style={{ fontSize: 11, color: 'var(--sp-subtle)', flexShrink: 0 }}>{time}</span>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN DASHBOARD VIEW
═══════════════════════════════════════════════════════════ */
export default function Dashboard() {
  const [empCount, setEmpCount] = useState(null);
  const [empLoading, setEmpLoading] = useState(true);

  /* Real employee count from API */
  useEffect(() => {
    employeeApi.list()
      .then((data) => setEmpCount(Array.isArray(data) ? data.length : data?.length ?? '—'))
      .catch(() => setEmpCount('—'))
      .finally(() => setEmpLoading(false));
  }, []);

  const today = useMemo(() => {
    return new Date().toLocaleDateString('en-IN', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });
  }, []);

  const storedUser = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('salary-pro-user') ?? '{}'); }
    catch { return {}; }
  }, []);
  const firstName = storedUser?.name?.split(' ')[0] || storedUser?.username || 'there';

  return (
    <div className="sp-page anim-fade-up">

      {/* ── Editorial Welcome Banner ── */}
      <div style={{
        background: 'linear-gradient(135deg, #EEF5FF 0%, #EAF8F5 100%)',
        border: '1px solid #D0E1FD',
        borderRadius: 20,
        padding: '24px 28px',
        marginBottom: 28,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 20,
      }}>
        <div style={{ maxWidth: 520 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span className="sp-badge-blue">Payroll Overview</span>
            <span style={{ fontSize: 12, color: 'var(--sp-muted)' }}>{today}</span>
          </div>
          <h2 style={{
            fontSize: 22, fontWeight: 800, color: 'var(--sp-ink)',
            letterSpacing: '-0.025em', margin: '0 0 6px',
          }}>
            {getGreeting()}, {firstName} 👋
          </h2>
          <p style={{ fontSize: 13.5, color: 'var(--sp-muted)', margin: 0, lineHeight: 1.5 }}>
            Here is your monthly workforce and salary activity summary.
          </p>
        </div>

        {/* Right side SVG visual graphic */}
        <div className="hidden sm:block">
          <WelcomeHeaderGraphic />
        </div>
      </div>

      {/* ── Demo Data Notice Banner (Intact) ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: 'var(--sp-amber-light)',
        border: '1px solid rgba(244, 183, 64, 0.30)',
        borderRadius: 12, padding: '10px 16px',
        fontSize: 12.5, color: 'var(--sp-amber-dark)',
        fontWeight: 500, marginBottom: 24,
      }}>
        <Clock size={15} style={{ flexShrink: 0 }} />
        <span>Card metrics with "Demo" tags display illustrative data. Real API endpoints will connect in the next phase.</span>
      </div>

      {/* ── Controlled Variation Metric Cards ── */}
      <div className="sp-metrics-grid" style={{ marginBottom: 24 }}>
        <MetricCard
          color="blue"
          icon={Users}
          label="Total Employees"
          value={empLoading ? '…' : String(empCount)}
          sub="Active team members (Real API)"
          loading={empLoading}
          trend={7}
          trendLabel="vs last month"
        />
        <MetricCard
          color="green"
          icon={BriefcaseBusiness}
          label="Monthly Payroll"
          value="₹18.4L"
          sub="September 2026 · Demo"
          trend={17}
          trendLabel="vs August"
        />
        <MetricCard
          color="teal"
          icon={CalendarCheck}
          label="Attendance Rate"
          value="93.5%"
          sub="Today's present rate · Demo"
          trend={2}
          trendLabel="vs yesterday"
        />
        <MetricCard
          color="coral"
          icon={ClipboardList}
          label="Pending Leaves"
          value="8"
          sub="Awaiting approval · Demo"
          trend={-12}
          trendLabel="vs last week"
        />
      </div>

      {/* ── Middle Charts & Breakdown Grid ── */}
      <div className="sp-two-col" style={{ marginBottom: 24 }}>

        {/* Salary trend chart */}
        <div className="sp-panel" style={{ padding: 24 }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', marginBottom: 20,
          }}>
            <div>
              <h3 style={{
                fontSize: 15, fontWeight: 700, color: 'var(--sp-ink)',
                margin: '0 0 2px',
              }}>
                Salary Trend
              </h3>
              <p style={{ fontSize: 12, color: 'var(--sp-subtle)', margin: 0 }}>
                Monthly payroll total (demo data)
              </p>
            </div>
            <span className="sp-badge-blue">Last 6 months</span>
          </div>
          <SalaryChart />
        </div>

        {/* Payroll breakdown */}
        <div className="sp-panel" style={{ padding: 24 }}>
          <div style={{ marginBottom: 20 }}>
            <h3 style={{
              fontSize: 15, fontWeight: 700, color: 'var(--sp-ink)',
              margin: '0 0 2px',
            }}>
              Payroll Breakdown
            </h3>
            <p style={{ fontSize: 12, color: 'var(--sp-subtle)', margin: 0 }}>
              September 2026 (demo data)
            </p>
          </div>
          <PayrollBreakdown />

          {/* Net total */}
          <div style={{
            marginTop: 20,
            paddingTop: 16,
            borderTop: '1px solid var(--sp-border-lt)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--sp-ink)' }}>
              Net Payroll
            </span>
            <span style={{
              fontSize: 18, fontWeight: 800, color: 'var(--sp-blue)',
              letterSpacing: '-0.02em',
            }}>
              ₹18.4L
            </span>
          </div>
        </div>
      </div>

      {/* ── Bottom Attendance & Activity Grid ── */}
      <div className="sp-two-col">

        {/* Today's attendance quick view */}
        <div className="sp-panel" style={{ padding: 24 }}>
          <div style={{ marginBottom: 16 }}>
            <h3 style={{
              fontSize: 15, fontWeight: 700, color: 'var(--sp-ink)',
              margin: '0 0 2px',
            }}>
              Today's Attendance
            </h3>
            <p style={{ fontSize: 12, color: 'var(--sp-subtle)', margin: 0 }}>
              At a glance (demo data)
            </p>
          </div>
          <QuickStats />
          <div style={{
            marginTop: 16, padding: '12px 16px',
            background: 'var(--sp-teal-light)',
            borderRadius: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <TrendingUp size={15} style={{ color: 'var(--sp-teal)' }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--sp-teal-dark)' }}>
                Overall: 93.5% present
              </span>
            </div>
            <span className="sp-badge-teal">Good</span>
          </div>
        </div>

        {/* Recent activity */}
        <div className="sp-panel" style={{ padding: 24 }}>
          <div style={{ marginBottom: 16 }}>
            <h3 style={{
              fontSize: 15, fontWeight: 700, color: 'var(--sp-ink)',
              margin: '0 0 2px',
            }}>
              Recent Activity
            </h3>
            <p style={{ fontSize: 12, color: 'var(--sp-subtle)', margin: 0 }}>
              Latest payroll events (demo data)
            </p>
          </div>
          <ActivityFeed />
        </div>
      </div>
    </div>
  );
}
