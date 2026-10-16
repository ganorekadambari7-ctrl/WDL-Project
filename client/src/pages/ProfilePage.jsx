import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  Award,
  BookOpen,
  BriefcaseBusiness,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  GraduationCap,
  Layers,
  Lock,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  User,
  Users,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { courseApi, employeeApi, promotionApi } from '../services/api';

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

export default function ProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [employee, setEmployee] = useState(null);
  const [promotions, setPromotions] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unlinked, setUnlinked] = useState(false);
  const [error, setError] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError('');
    setUnlinked(false);
    try {
      // 1. Fetch own linked employee record
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

      // 2. Fetch own promotion history & verified certificates concurrently
      const [promosData, coursesData] = await Promise.all([
        promotionApi.getByEmployee('me').catch(() => []),
        courseApi.list().catch(() => []),
      ]);

      setPromotions(Array.isArray(promosData) ? promosData : []);
      setCourses(Array.isArray(coursesData) ? coursesData : []);
    } catch (err) {
      setError(err.message || 'Failed to load profile data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Build unified chronological career timeline
  const careerTimeline = useMemo(() => {
    if (!employee) return [];

    const milestones = [];

    // Milestone: Initial Joining
    if (employee.createdAt) {
      milestones.push({
        id: 'hire-' + employee._id,
        type: 'hire',
        title: 'Joined Salary Pro',
        subtitle: `Appointed to ${employee.department || 'IT'} as ${employee.designation || 'Team Member'}`,
        date: new Date(employee.createdAt),
        badgeText: 'Initial Appointment',
        badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
        details: [
          { label: 'Initial Department', value: employee.department || 'IT' },
          { label: 'Initial Designation', value: employee.designation || 'Team Member' },
        ],
      });
    }

    // Milestones: Promotions
    promotions.forEach((p) => {
      const effDate = p.effectiveDate ? new Date(p.effectiveDate) : new Date(p.createdAt);
      milestones.push({
        id: 'promo-' + p._id,
        type: 'promotion',
        title: `Promoted to ${p.newDesignation}`,
        subtitle: `${p.previousDesignation} → ${p.newDesignation}`,
        date: effDate,
        badgeText: `Grade ${p.newGrade || 'Rank Up'}`,
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        details: [
          { label: 'Increment', value: `+${p.incrementPercentage || 0}%` },
          {
            label: 'Salary Transition',
            value: `${INR.format(p.previousSalary || 0)} → ${INR.format(p.newSalary || 0)}`,
          },
          { label: 'Approved By', value: p.approvedByName || 'HR Administrator' },
          ...(p.remarks ? [{ label: 'Remarks', value: p.remarks }] : []),
        ],
      });
    });

    // Milestones: Verified Certifications
    courses
      .filter((c) => c.verificationStatus === 'verified')
      .forEach((c) => {
        const certDate = c.verifiedAt
          ? new Date(c.verifiedAt)
          : c.endDate
          ? new Date(c.endDate)
          : new Date(c.createdAt);

        milestones.push({
          id: 'cert-' + c._id,
          type: 'certification',
          title: `Verified Certification: ${c.title}`,
          subtitle: `Platform: ${c.platform || 'Online Provider'}`,
          date: certDate,
          badgeText: 'Official Verified',
          badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
          details: [
            { label: 'Credential Provider', value: c.platform },
            ...(c.verifiedBy?.name ? [{ label: 'Verified By', value: c.verifiedBy.name }] : []),
            ...(c.verificationRemarks
              ? [{ label: 'Verification Remarks', value: c.verificationRemarks }]
              : []),
          ],
        });
      });

    // Sort chronologically descending (newest first)
    return milestones.sort((a, b) => b.date - a.date);
  }, [employee, promotions, courses]);

  if (loading) {
    return (
      <div className="sp-page flex flex-col items-center justify-center py-24 text-center">
        <RefreshCw size={28} className="animate-spin text-indigo-600 mb-3" />
        <p className="text-sm font-semibold text-slate-700">Loading career profile...</p>
        <p className="text-xs text-slate-400 mt-1">Retrieving official employment records</p>
      </div>
    );
  }

  if (unlinked) {
    return (
      <div className="sp-page space-y-6">
        <div className="sp-card p-8 text-center max-w-xl mx-auto">
          <div className="size-16 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center mx-auto mb-4 text-amber-600">
            <AlertCircle size={32} />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Personnel Record Pending Linkage</h2>
          <p className="text-sm text-slate-500 mt-2 leading-relaxed">
            Your user account is not currently linked to an official Employee personnel file.
            Employment profiles, designation ranks, and promotion milestones are administered by HR.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <button onClick={loadData} className="sp-btn-secondary text-xs flex items-center gap-1.5">
              <RefreshCw size={14} />
              <span>Retry Synchronization</span>
            </button>
            <button
              onClick={() => navigate('/settings')}
              className="sp-btn-primary text-xs flex items-center gap-1.5"
            >
              <span>Go to Settings</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  const empName = employee?.name || user?.name || 'Employee';

  return (
    <div className="sp-page space-y-7 anim-fade-up">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">
              Employment Records
            </p>
            <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 flex items-center gap-1">
              <ShieldCheck size={12} />
              Verified Personnel File
            </span>
          </div>
          <h1 className="mt-1.5 text-[1.6rem] font-semibold tracking-tight text-slate-900">
            My Profile &amp; Career Timeline
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Official employment credentials, designation ranks, and chronological career progression.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadData}
            className="sp-btn-secondary text-xs flex items-center gap-1.5"
            title="Refresh profile"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="sp-notice-error">
          <p>{error}</p>
        </div>
      )}

      {/* ── Employee Profile Hero Card ── */}
      <div className="sp-card p-6 sm:p-7">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <div
              className={`flex size-16 items-center justify-center rounded-2xl font-bold text-xl flex-shrink-0 shadow-sm ${avatarColor(
                empName
              )}`}
            >
              {getInitials(empName)}
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl font-bold text-slate-900">{empName}</h2>
                <span className="font-mono text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-lg">
                  {employee?.employeeId}
                </span>
                <span className="rounded-full bg-purple-50 border border-purple-200 px-2.5 py-0.5 text-xs font-semibold text-purple-700">
                  {employee?.department || 'IT'}
                </span>
              </div>
              <p className="text-sm font-medium text-slate-600 mt-1">
                {employee?.designation || 'Unassigned'}
                {employee?.grade && (
                  <span className="ml-2 text-xs font-semibold text-slate-400">
                    (Grade {employee.grade})
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-2.5 text-right">
              <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                Current Basic Salary
              </p>
              <p className="text-lg font-bold text-emerald-700">
                {INR.format(employee?.basicSalary || 0)}
              </p>
            </div>
          </div>
        </div>

        {/* ── Employment Specification Grid (Read-Only) ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 pt-6 text-xs">
          <div className="space-y-1">
            <span className="text-slate-400 font-medium">Department</span>
            <p className="font-semibold text-slate-800 text-sm flex items-center gap-1.5">
              <Building2 size={15} className="text-indigo-600" />
              <span>{employee?.department || 'IT'}</span>
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-slate-400 font-medium">Current Designation</span>
            <p className="font-semibold text-slate-800 text-sm flex items-center gap-1.5">
              <BriefcaseBusiness size={15} className="text-indigo-600" />
              <span>{employee?.designation || 'Unassigned'}</span>
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-slate-400 font-medium">Grade / Rank</span>
            <p className="font-semibold text-slate-800 text-sm flex items-center gap-1.5">
              <Layers size={15} className="text-indigo-600" />
              <span>{employee?.grade ? `Level / Grade ${employee.grade}` : 'Unranked'}</span>
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-slate-400 font-medium">Date of Joining</span>
            <p className="font-semibold text-slate-800 text-sm flex items-center gap-1.5">
              <Calendar size={15} className="text-indigo-600" />
              <span>{formatDate(employee?.createdAt)}</span>
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-slate-400 font-medium">Education</span>
            <p className="font-semibold text-slate-800 text-sm flex items-center gap-1.5">
              <GraduationCap size={15} className="text-indigo-600" />
              <span>{employee?.education || 'Graduate'}</span>
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-slate-400 font-medium">Work Experience</span>
            <p className="font-semibold text-slate-800 text-sm flex items-center gap-1.5">
              <Clock size={15} className="text-indigo-600" />
              <span>{employee?.experience ?? 0} Year(s)</span>
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-slate-400 font-medium">Date of Birth</span>
            <p className="font-semibold text-slate-800 text-sm flex items-center gap-1.5">
              <User size={15} className="text-indigo-600" />
              <span>{formatDate(employee?.dob)}</span>
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-slate-400 font-medium">Employment Authorization</span>
            <p className="font-semibold text-emerald-700 text-sm flex items-center gap-1.5">
              <ShieldCheck size={15} className="text-emerald-600" />
              <span>Active Staff Member</span>
            </p>
          </div>
        </div>

        {/* Read-Only Governance Notice */}
        <div className="mt-6 rounded-xl bg-slate-50 border border-slate-200/80 p-3.5 flex items-center gap-3 text-xs text-slate-500">
          <Lock size={15} className="text-slate-400 flex-shrink-0" />
          <span>
            Employment records, designations, and salary structures are centrally managed by company
            administration. To request adjustments, please consult your department administrator.
          </span>
        </div>
      </div>

      {/* ── Career Milestones & Timeline ── */}
      <div className="sp-card p-6 sm:p-7">
        <div className="flex items-center justify-between pb-5 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">Career Milestones &amp; History</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Chronological log of company onboarding, promotions, and verified certifications.
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
            {careerTimeline.length} Milestone(s)
          </span>
        </div>

        {careerTimeline.length === 0 ? (
          <div className="py-14 text-center text-slate-400 text-sm">
            <Award size={32} className="mx-auto mb-2 text-slate-300" />
            <p className="font-semibold text-slate-700">No career milestones recorded yet</p>
            <p className="text-xs text-slate-400 mt-1">
              Your promotions and verified certifications will automatically appear here.
            </p>
          </div>
        ) : (
          <div className="mt-8 relative pl-6 sm:pl-8 space-y-8 before:absolute before:left-2.5 sm:before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
            {careerTimeline.map((item) => {
              const isPromo = item.type === 'promotion';
              const isCert = item.type === 'certification';

              return (
                <div key={item.id} className="relative group">
                  {/* Timeline Node Icon */}
                  <div
                    className={`absolute -left-6 sm:-left-8 top-0 flex size-6 sm:size-7 items-center justify-center rounded-full border-2 border-white shadow-sm transition-transform group-hover:scale-110 ${
                      isPromo
                        ? 'bg-emerald-600 text-white'
                        : isCert
                        ? 'bg-purple-600 text-white'
                        : 'bg-blue-600 text-white'
                    }`}
                  >
                    {isPromo ? (
                      <TrendingUp size={13} />
                    ) : isCert ? (
                      <CheckCircle2 size={13} />
                    ) : (
                      <BriefcaseBusiness size={13} />
                    )}
                  </div>

                  {/* Milestone Card */}
                  <div className="rounded-xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs hover:border-indigo-200 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-bold text-slate-900">{item.title}</h4>
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${item.badgeClass}`}
                          >
                            {item.badgeText}
                          </span>
                        </div>
                        <p className="text-xs font-medium text-slate-600 mt-0.5">{item.subtitle}</p>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium sm:text-right">
                        <Calendar size={13} className="text-slate-400" />
                        <span>{formatDate(item.date)}</span>
                      </div>
                    </div>

                    {/* Milestone Details */}
                    {item.details && item.details.length > 0 && (
                      <div className="mt-3.5 pt-3 border-t border-slate-100 flex flex-wrap gap-4 text-xs">
                        {item.details.map((d, idx) => (
                          <div key={idx} className="flex items-center gap-1.5">
                            <span className="text-slate-400 font-medium">{d.label}:</span>
                            <span className="font-semibold text-slate-800">{d.value}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
