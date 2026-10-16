import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Award,
  Bell,
  BookOpen,
  BriefcaseBusiness,
  Building2,
  Calendar,
  CalendarCheck,
  CheckCircle2,
  ClipboardList,
  Clock,
  ExternalLink,
  GraduationCap,
  Layers,
  Lock,
  Plus,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  User,
  Users,
  XCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  attendanceApi,
  courseApi,
  employeeApi,
  leaveApi,
  notificationApi,
  salaryApi,
} from '../services/api';

const INR = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const AVATAR_COLORS = [
  'bg-indigo-100 text-indigo-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-blue-100 text-blue-700',
  'bg-rose-100 text-rose-700',
  'bg-violet-100 text-violet-700',
];

function avatarColor(name = '') {
  return AVATAR_COLORS[(name.charCodeAt(0) || 0) % AVATAR_COLORS.length];
}

function getInitials(name = '') {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'EM'
  );
}

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

/* ═══════════════════════════════════════════════════════════
   ADMIN DASHBOARD COMPONENTS (PRESERVED INTACT)
   ═══════════════════════════════════════════════════════════ */

function WelcomeHeaderGraphic() {
  return (
    <svg width="180" height="90" viewBox="0 0 180 90" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="140" cy="45" r="38" fill="rgba(37, 99, 235, 0.08)" />
      <circle cx="90" cy="20" r="18" fill="rgba(15, 159, 143, 0.06)" />
      <rect x="25" y="18" width="85" height="54" rx="10" fill="white" stroke="#E4E7EC" strokeWidth="1.5" />
      <rect x="35" y="28" width="22" height="6" rx="3" fill="#2563EB" />
      <rect x="35" y="38" width="45" height="4" rx="2" fill="#E4E7EC" />
      <rect x="35" y="46" width="32" height="4" rx="2" fill="#E4E7EC" />
      <circle cx="92" cy="45" r="10" fill="#EAF8F2" />
      <path d="M88 45L91 48L96 42" stroke="#22A06B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="135" cy="52" r="16" fill="#FFF7E3" stroke="#F4B740" strokeWidth="1.5" />
      <text x="135" y="57" textAnchor="middle" fontSize="13" fontWeight="800" fill="#D99B1C">₹</text>
    </svg>
  );
}

function MetricCard({ color, icon: Icon, label, value, sub, trend, trendLabel, loading }) {
  return (
    <div className={`sp-metric-card ${color}`}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{
          width: 42, height: 42, borderRadius: 12,
          background: `var(--sp-${color}-light)`,
          color: `var(--sp-${color})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Icon size={20} />
        </div>
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

const SALARY_BARS = [
  { month: 'Apr', val: 68 },
  { month: 'May', val: 74 },
  { month: 'Jun', val: 71 },
  { month: 'Jul', val: 82 },
  { month: 'Aug', val: 88 },
  { month: 'Sep', val: 100 },
];

function SalaryChart() {
  const maxVal = Math.max(...SALARY_BARS.map((b) => b.val));
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 130, paddingBottom: 8 }}>
        {SALARY_BARS.map((b, i) => {
          const isLatest = i === SALARY_BARS.length - 1;
          const heightPct = Math.round((b.val / maxVal) * 100);
          return (
            <div key={b.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: '100%', height: `${heightPct}%`,
                background: isLatest ? 'var(--sp-blue)' : 'var(--sp-border-lt)',
                borderRadius: '6px 6px 0 0',
                transition: 'height 400ms cubic-bezier(0.16, 1, 0.3, 1)',
              }} />
              <span style={{ fontSize: 11, color: isLatest ? 'var(--sp-blue)' : 'var(--sp-subtle)', fontWeight: isLatest ? 700 : 500 }}>
                {b.month}
              </span>
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--sp-border-lt)' }}>
        <div>
          <p style={{ fontSize: 12, color: 'var(--sp-muted)', margin: 0 }}>Sep 2026 Total</p>
          <p style={{ fontSize: 20, fontWeight: 800, color: 'var(--sp-ink)', margin: '2px 0 0', letterSpacing: '-0.02em' }}>₹18.4L</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'var(--sp-green-light)', border: '1px solid rgba(34, 160, 107, 0.20)', borderRadius: 20, padding: '5px 12px' }}>
          <ArrowUpRight size={14} style={{ color: 'var(--sp-green)' }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--sp-green)' }}>+16.7% vs Aug</span>
        </div>
      </div>
    </div>
  );
}

const BREAKDOWN = [
  { label: 'Basic Salaries', value: '₹14.8L', pct: 80, color: 'var(--sp-blue)' },
  { label: 'Bonuses', value: '₹2.6L', pct: 14, color: 'var(--sp-green)' },
  { label: 'Tax Deductions', value: '₹0.9L', pct: 5, color: 'var(--sp-coral)' },
  { label: 'Late Deductions', value: '₹0.1L', pct: 1, color: 'var(--sp-amber)' },
];

function PayrollBreakdown() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {BREAKDOWN.map(({ label, value, pct, color }) => (
        <div key={label}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 13, color: 'var(--sp-ink)', fontWeight: 500 }}>{label}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--sp-ink)' }}>{value}</span>
          </div>
          <div style={{ height: 7, background: 'var(--sp-border-lt)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 99 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

const STATS = [
  { label: 'Present Today', value: '42', color: 'var(--sp-green)', bg: 'var(--sp-green-light)' },
  { label: 'On Leave', value: '3', color: 'var(--sp-amber)', bg: 'var(--sp-amber-light)' },
  { label: 'Absent', value: '2', color: 'var(--sp-coral)', bg: 'var(--sp-coral-light)' },
];

function QuickStats() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
      {STATS.map(({ label, value, color, bg }) => (
        <div key={label} style={{ background: bg, borderRadius: 12, padding: '12px 14px', textAlign: 'center' }}>
          <p style={{ fontSize: 22, fontWeight: 800, color, margin: 0, letterSpacing: '-0.02em' }}>{value}</p>
          <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--sp-muted)', margin: '3px 0 0' }}>{label}</p>
        </div>
      ))}
    </div>
  );
}

const ACTIVITY = [
  { icon: CheckCircle2, color: 'var(--sp-green)', label: 'September payroll processed', time: '2h ago' },
  { icon: Users, color: 'var(--sp-blue)', label: '2 new employees onboarded', time: '1d ago' },
  { icon: ClipboardList, color: 'var(--sp-amber)', label: '3 leave requests pending', time: '1d ago' },
  { icon: BriefcaseBusiness, color: 'var(--sp-teal)', label: 'Salary report exported', time: '2d ago' },
];

function ActivityFeed() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {ACTIVITY.map(({ icon: Icon, color, label, time }, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0',
          borderBottom: i < ACTIVITY.length - 1 ? '1px solid var(--sp-border-lt)' : 'none',
        }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10, background: `${color}16`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Icon size={16} style={{ color }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--sp-ink)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {label}
            </p>
          </div>
          <span style={{ fontSize: 11, color: 'var(--sp-subtle)', flexShrink: 0 }}>{time}</span>
        </div>
      ))}
    </div>
  );
}

function AdminDashboard({ user }) {
  const [empCount, setEmpCount] = useState(null);
  const [empLoading, setEmpLoading] = useState(true);

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

  const firstName = user?.name?.split(' ')[0] || user?.username || 'there';

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
        <span>Card metrics with &ldquo;Demo&rdquo; tags display illustrative data. Real API endpoints will connect in the next phase.</span>
      </div>

      {/* ── Metric Cards ── */}
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
        <div className="sp-panel" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--sp-ink)', margin: '0 0 2px' }}>
                Salary Trend
              </h3>
              <p style={{ fontSize: 12, color: 'var(--sp-subtle)', margin: 0 }}>Monthly payroll total (demo data)</p>
            </div>
            <span className="sp-badge-blue">Last 6 months</span>
          </div>
          <SalaryChart />
        </div>

        <div className="sp-panel" style={{ padding: 24 }}>
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--sp-ink)', margin: '0 0 2px' }}>
              Payroll Breakdown
            </h3>
            <p style={{ fontSize: 12, color: 'var(--sp-subtle)', margin: 0 }}>September 2026 (demo data)</p>
          </div>
          <PayrollBreakdown />

          <div style={{
            marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--sp-border-lt)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--sp-ink)' }}>Net Payroll</span>
            <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--sp-blue)', letterSpacing: '-0.02em' }}>
              ₹18.4L
            </span>
          </div>
        </div>
      </div>

      {/* ── Bottom Attendance & Activity Grid ── */}
      <div className="sp-two-col">
        <div className="sp-panel" style={{ padding: 24 }}>
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--sp-ink)', margin: '0 0 2px' }}>
              Today&apos;s Attendance
            </h3>
            <p style={{ fontSize: 12, color: 'var(--sp-subtle)', margin: 0 }}>At a glance (demo data)</p>
          </div>
          <QuickStats />
          <div style={{
            marginTop: 16, padding: '12px 16px', background: 'var(--sp-teal-light)',
            borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
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

        <div className="sp-panel" style={{ padding: 24 }}>
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--sp-ink)', margin: '0 0 2px' }}>
              Recent Activity
            </h3>
            <p style={{ fontSize: 12, color: 'var(--sp-subtle)', margin: 0 }}>Latest payroll events (demo data)</p>
          </div>
          <ActivityFeed />
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   EMPLOYEE SELF-SERVICE DASHBOARD
   ═══════════════════════════════════════════════════════════ */

function EmployeeDashboard({ user }) {
  const navigate = useNavigate();

  const [employee, setEmployee] = useState(null);
  const [attendance, setAttendance] = useState(null);
  const [leaves, setLeaves] = useState([]);
  const [salaries, setSalaries] = useState([]);
  const [courses, setCourses] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [unlinked, setUnlinked] = useState(false);
  const [error, setError] = useState('');

  const today = useMemo(() => {
    return new Date().toLocaleDateString('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }, []);

  const loadEmployeeData = async () => {
    setLoading(true);
    setError('');
    setUnlinked(false);
    try {
      // 1. Fetch authenticated employee's linked record
      let emp = null;
      try {
        emp = await employeeApi.me();
        setEmployee(emp);
      } catch (err) {
        if (err.message && err.message.toLowerCase().includes('no employee record')) {
          setUnlinked(true);
          setLoading(false);
          return;
        }
        throw err;
      }

      if (!emp) {
        setUnlinked(true);
        setLoading(false);
        return;
      }

      // 2. Concurrently fetch self-service attendance, leaves, salaries, courses, notifications
      const curMonth = new Date().toISOString().slice(0, 7);
      const [attData, leaveData, salaryData, coursesData, notifData] = await Promise.all([
        attendanceApi.getByEmployee('me', curMonth).catch(() => null),
        leaveApi.list().catch(() => []),
        salaryApi.getByEmployee('me').catch(() => []),
        courseApi.list().catch(() => []),
        notificationApi.list().catch(() => ({ notifications: [], unreadCount: 0 })),
      ]);

      setAttendance(attData);
      setLeaves(Array.isArray(leaveData) ? leaveData : []);
      setSalaries(Array.isArray(salaryData) ? salaryData : []);
      setCourses(Array.isArray(coursesData) ? coursesData : []);
      setNotifications(Array.isArray(notifData?.notifications) ? notifData.notifications : []);
      setUnreadNotifCount(notifData?.unreadCount ?? 0);
    } catch (err) {
      setError(err.message || 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmployeeData();
  }, []);

  const handleMarkNotifRead = async (id) => {
    try {
      await notificationApi.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
      setUnreadNotifCount((cnt) => Math.max(0, cnt - 1));
    } catch {
      // Ignore
    }
  };

  const handleMarkAllNotifsRead = async () => {
    try {
      await notificationApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadNotifCount(0);
    } catch {
      // Ignore
    }
  };

  // Metrics calculations
  const pendingLeaves = useMemo(() => leaves.filter((l) => l.status === 'pending').length, [leaves]);
  const approvedLeaves = useMemo(() => leaves.filter((l) => l.status === 'approved').length, [leaves]);
  const latestSalary = useMemo(() => (salaries && salaries.length > 0 ? salaries[0] : null), [salaries]);

  const completedCourses = useMemo(
    () => courses.filter((c) => c.status === 'completed' || c.progress === 100).length,
    [courses]
  );
  const inProgressCourses = useMemo(
    () => courses.filter((c) => c.status === 'in-progress' || (c.progress > 0 && c.progress < 100)).length,
    [courses]
  );
  const verifiedCerts = useMemo(
    () => courses.filter((c) => c.verificationStatus === 'verified').length,
    [courses]
  );

  const firstName = user?.name?.split(' ')[0] || user?.username || 'there';
  const empName = employee?.name || user?.name || 'Employee';

  return (
    <div className="sp-page space-y-7 anim-fade-up">
      {/* ── Employee Greeting & Hero Profile Card ── */}
      <div
        className="rounded-2xl p-6 sm:p-7 border border-[#D0E1FD]"
        style={{ background: 'linear-gradient(135deg, #EEF5FF 0%, #EAF8F5 100%)' }}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="sp-badge-blue">Employee Self-Service</span>
              <span className="text-xs text-slate-500 font-medium">{today}</span>
            </div>

            <div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                {getGreeting()}, {firstName} 👋
              </h2>
              <p className="text-sm text-slate-600 mt-0.5">
                Welcome to your personal workspace. Track your attendance, leave applications, payroll records, and professional milestones.
              </p>
            </div>

            {/* Employee Record Strip */}
            {employee ? (
              <div className="flex items-center gap-3 pt-2 flex-wrap">
                <div
                  className={`flex size-10 items-center justify-center rounded-xl font-bold text-xs shadow-xs ${avatarColor(
                    empName
                  )}`}
                >
                  {getInitials(empName)}
                </div>
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <span className="font-bold text-slate-900">{empName}</span>
                  <span className="font-mono text-indigo-700 bg-white border border-indigo-200 px-2 py-0.5 rounded font-medium">
                    {employee.employeeId}
                  </span>
                  <span className="rounded-full bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 font-semibold">
                    {employee.department || 'IT'}
                  </span>
                  <span className="text-slate-500 font-medium">
                    • {employee.designation || 'Staff'} {employee.grade ? `(${employee.grade})` : ''}
                  </span>
                  {employee.createdAt && (
                    <span className="text-slate-400">
                      • Joined {formatDate(employee.createdAt)}
                    </span>
                  )}
                </div>
              </div>
            ) : unlinked ? (
              <div className="pt-2 flex items-center gap-2 text-xs font-semibold text-amber-800">
                <AlertCircle size={15} className="text-amber-600" />
                <span>Account pending administrator linkage to an Employee personnel file.</span>
              </div>
            ) : null}
          </div>

          {/* Quick Profile Navigation CTA */}
          <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 flex-shrink-0">
            <Link
              to="/profile"
              className="sp-btn-primary text-xs flex items-center justify-center gap-2 shadow-sm py-2.5 px-4"
            >
              <Award size={15} />
              <span>My Career Profile &amp; Timeline</span>
              <ArrowRight size={14} />
            </Link>
            <button
              onClick={loadEmployeeData}
              className="sp-btn-secondary text-xs flex items-center justify-center gap-1.5"
              title="Refresh dashboard records"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              <span>Refresh Records</span>
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="sp-notice-error">
          <p>{error}</p>
        </div>
      )}

      {/* ── Unlinked Safe Notice Banner ── */}
      {unlinked && (
        <div className="sp-notice-warn flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <AlertCircle size={18} className="text-amber-600 flex-shrink-0" />
            <p className="text-xs text-amber-900 leading-relaxed">
              <strong>Account Pending Linkage:</strong> Your login account is not currently connected to an Employee record. Once an administrator links your account in Settings, your attendance, leave applications, payroll records, and learning progression will appear here.
            </p>
          </div>
          <button
            onClick={() => navigate('/settings')}
            className="text-xs font-semibold text-amber-800 underline hover:text-amber-950 whitespace-nowrap self-start sm:self-auto"
          >
            Check Settings
          </button>
        </div>
      )}

      {/* ── 4 Personal Summary Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Card 1: Attendance */}
        <div className="sp-card p-5 flex flex-col justify-between hover:border-teal-200 transition-colors">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Attendance Rate
              </span>
              <div className="flex size-10 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
                <CalendarCheck size={20} />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
              {attendance?.summary ? `${attendance.summary.percentage}%` : unlinked ? '—' : '0%'}
            </p>
            <p className="mt-0.5 text-xs text-slate-400">
              {attendance?.summary
                ? `${attendance.summary.present} Present / ${attendance.summary.total} days logged`
                : 'Current month log'}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Monthly Status</span>
            <Link
              to="/attendance"
              className="font-semibold text-teal-700 hover:text-teal-900 flex items-center gap-1"
            >
              <span>View Log</span>
              <ArrowRight size={12} />
            </Link>
          </div>
        </div>

        {/* Card 2: Leave Requests */}
        <div className="sp-card p-5 flex flex-col justify-between hover:border-amber-200 transition-colors">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Leave Requests
              </span>
              <div className="flex size-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <ClipboardList size={20} />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold tracking-tight text-amber-700">
              {pendingLeaves > 0 ? `${pendingLeaves} Pending` : `${approvedLeaves} Approved`}
            </p>
            <p className="mt-0.5 text-xs text-slate-400">
              {leaves.length} total application(s) submitted
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Time Off</span>
            <Link
              to="/leaves"
              className="font-semibold text-amber-700 hover:text-amber-900 flex items-center gap-1"
            >
              <span>Apply / View</span>
              <ArrowRight size={12} />
            </Link>
          </div>
        </div>

        {/* Card 3: Latest Salary */}
        <div className="sp-card p-5 flex flex-col justify-between hover:border-emerald-200 transition-colors">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Latest Net Salary
              </span>
              <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <BriefcaseBusiness size={20} />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold tracking-tight text-emerald-700">
              {latestSalary
                ? INR.format(latestSalary.netSalary)
                : employee?.basicSalary
                ? INR.format(employee.basicSalary)
                : '—'}
            </p>
            <p className="mt-0.5 text-xs text-slate-400 truncate">
              {latestSalary
                ? `Processed ${formatDate(latestSalary.createdAt)}`
                : employee?.basicSalary
                ? 'Standard base salary'
                : 'No salary record yet'}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Payroll History</span>
            <Link
              to="/payroll"
              className="font-semibold text-emerald-700 hover:text-emerald-900 flex items-center gap-1"
            >
              <span>View Slips</span>
              <ArrowRight size={12} />
            </Link>
          </div>
        </div>

        {/* Card 4: Learning & Upskilling */}
        <div className="sp-card p-5 flex flex-col justify-between hover:border-purple-200 transition-colors">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Learning &amp; Upskilling
              </span>
              <div className="flex size-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                <GraduationCap size={20} />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold tracking-tight text-purple-700">
              {completedCourses} Completed
            </p>
            <p className="mt-0.5 text-xs text-slate-400">
              {inProgressCourses} in-progress · {verifiedCerts} verified
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Certificates</span>
            <Link
              to="/learning"
              className="font-semibold text-purple-700 hover:text-purple-900 flex items-center gap-1"
            >
              <span>Track Courses</span>
              <ArrowRight size={12} />
            </Link>
          </div>
        </div>
      </div>

      {/* ── Lower Two-Column Layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Recent Leaves & Active Courses */}
        <div className="lg:col-span-7 space-y-6">
          {/* Recent Leave Requests Card */}
          <div className="sp-card overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Recent Leave Requests</h3>
                <p className="text-xs text-slate-400 mt-0.5">Your recently submitted applications</p>
              </div>
              <Link
                to="/leaves"
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
              >
                <span>View All</span>
                <ArrowRight size={13} />
              </Link>
            </div>

            {leaves.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs px-4">
                <ClipboardList size={28} className="mx-auto mb-2 text-slate-300" />
                <p className="font-semibold text-slate-700">No leave requests submitted</p>
                <p className="text-slate-400 mt-0.5">Need time off? Submit a leave application anytime.</p>
                <Link
                  to="/leaves"
                  className="mt-3 inline-flex items-center gap-1 text-indigo-600 font-semibold hover:underline"
                >
                  <Plus size={13} />
                  <span>Apply for Leave</span>
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {leaves.slice(0, 3).map((l) => (
                  <div key={l._id} className="p-4 sm:px-6 hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-slate-800 capitalize">
                            {l.leaveType.replace('-', ' ')}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            ({formatDate(l.startDate)} &ndash; {formatDate(l.endDate)})
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1 line-clamp-1">{l.reason}</p>
                        {l.remarks && (
                          <p className="text-[11px] text-slate-400 italic mt-0.5">
                            Remarks: &ldquo;{l.remarks}&rdquo;
                          </p>
                        )}
                      </div>

                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold capitalize flex-shrink-0 ${
                          l.status === 'approved'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : l.status === 'rejected'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {l.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active Learning Courses Card */}
          <div className="sp-card overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Active Learning Courses</h3>
                <p className="text-xs text-slate-400 mt-0.5">In-progress professional upskilling</p>
              </div>
              <Link
                to="/learning"
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
              >
                <span>View All</span>
                <ArrowRight size={13} />
              </Link>
            </div>

            {courses.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs px-4">
                <GraduationCap size={28} className="mx-auto mb-2 text-slate-300" />
                <p className="font-semibold text-slate-700">No courses enrolled yet</p>
                <p className="text-slate-400 mt-0.5">Add course tracks and submit certifications for verification.</p>
                <Link
                  to="/learning"
                  className="mt-3 inline-flex items-center gap-1 text-indigo-600 font-semibold hover:underline"
                >
                  <Plus size={13} />
                  <span>Add Course</span>
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {courses.slice(0, 3).map((c) => (
                  <div key={c._id} className="p-4 sm:px-6 hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-slate-900 truncate">
                            {c.title}
                          </span>
                          <span className="rounded bg-purple-50 px-1.5 py-0.5 text-[10px] font-semibold text-purple-700 border border-purple-100 flex-shrink-0">
                            {c.platform}
                          </span>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-indigo-600 flex-shrink-0">
                        {c.progress}%
                      </span>
                    </div>

                    <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          c.progress === 100 ? 'bg-emerald-500' : 'bg-indigo-600'
                        }`}
                        style={{ width: `${c.progress}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (5 cols): Notifications & Quick Shortcuts */}
        <div className="lg:col-span-5 space-y-6">
          {/* Notifications Card */}
          <div className="sp-card p-5 sm:p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Bell size={16} className="text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">Recent Notifications</h3>
                {unreadNotifCount > 0 && (
                  <span className="rounded-full bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5">
                    {unreadNotifCount}
                  </span>
                )}
              </div>

              {unreadNotifCount > 0 && (
                <button
                  onClick={handleMarkAllNotifsRead}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                >
                  Mark all read
                </button>
              )}
            </div>

            {notifications.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-xs">
                <Bell size={24} className="mx-auto mb-2 text-slate-300" />
                <p className="font-semibold text-slate-700">You&apos;re all caught up!</p>
                <p className="text-slate-400 mt-0.5">No new notifications at this time.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 mt-2">
                {notifications.slice(0, 4).map((n) => (
                  <div
                    key={n._id}
                    onClick={() => !n.isRead && handleMarkNotifRead(n._id)}
                    className={`py-3 flex items-start gap-3 cursor-pointer group transition-colors ${
                      !n.isRead ? 'bg-indigo-50/40 -mx-3 px-3 rounded-xl' : ''
                    }`}
                  >
                    <div
                      className={`size-2 rounded-full mt-1.5 flex-shrink-0 ${
                        !n.isRead ? 'bg-indigo-600' : 'bg-transparent'
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-slate-800 leading-snug">
                        {n.message}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {formatDate(n.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Shortcuts Panel */}
          <div className="sp-card p-5 sm:p-6 bg-slate-50/50">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              Self-Service Shortcuts
            </h3>
            <div className="grid grid-cols-2 gap-2.5">
              <Link
                to="/attendance"
                className="p-3 bg-white rounded-xl border border-slate-200/80 hover:border-teal-300 hover:shadow-xs transition-all flex items-center gap-2.5 text-xs font-semibold text-slate-700"
              >
                <CalendarCheck size={16} className="text-teal-600" />
                <span>Attendance</span>
              </Link>
              <Link
                to="/leaves"
                className="p-3 bg-white rounded-xl border border-slate-200/80 hover:border-amber-300 hover:shadow-xs transition-all flex items-center gap-2.5 text-xs font-semibold text-slate-700"
              >
                <ClipboardList size={16} className="text-amber-600" />
                <span>Leave Portal</span>
              </Link>
              <Link
                to="/payroll"
                className="p-3 bg-white rounded-xl border border-slate-200/80 hover:border-emerald-300 hover:shadow-xs transition-all flex items-center gap-2.5 text-xs font-semibold text-slate-700"
              >
                <BriefcaseBusiness size={16} className="text-emerald-600" />
                <span>Salary Slips</span>
              </Link>
              <Link
                to="/learning"
                className="p-3 bg-white rounded-xl border border-slate-200/80 hover:border-purple-300 hover:shadow-xs transition-all flex items-center gap-2.5 text-xs font-semibold text-slate-700"
              >
                <GraduationCap size={16} className="text-purple-600" />
                <span>Learning</span>
              </Link>
              <Link
                to="/profile"
                className="col-span-2 p-3 bg-white rounded-xl border border-slate-200/80 hover:border-indigo-300 hover:shadow-xs transition-all flex items-center justify-between text-xs font-semibold text-slate-700"
              >
                <div className="flex items-center gap-2.5">
                  <Award size={16} className="text-indigo-600" />
                  <span>My Profile &amp; Career Milestones</span>
                </div>
                <ArrowRight size={13} className="text-slate-400" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN DASHBOARD EXPORT (ROLE ROUTED)
   ═══════════════════════════════════════════════════════════ */

export default function Dashboard() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  if (isAdmin) {
    return <AdminDashboard user={user} />;
  }

  return <EmployeeDashboard user={user} />;
}
