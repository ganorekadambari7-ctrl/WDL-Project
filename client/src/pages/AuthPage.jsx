import { useCallback, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertCircle, ArrowRight, BriefcaseBusiness, Check,
  CheckCircle2, Eye, EyeOff, Loader2, Lock, Mail, UserRound,
} from 'lucide-react';
import SalaryProLogo from '../components/SalaryProLogo';
import payrollIllustrationImg from '../assets/payroll-illustration.png';
import { authApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

/* ═══════════════════════════════════════════════════════════
   VALIDATION HELPERS
   Accepts all valid email addresses (e.g. admin@vadhvanport.com)
   without domain restrictions.
═══════════════════════════════════════════════════════════ */
const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

const strictEmailError = (value) => {
  const email = value.trim();
  if (!email) return 'Email is required.';
  if (/\s/.test(email) || !emailRegex.test(email))
    return 'Please enter a valid email address.';
  return '';
};

const validateSignup = (form) => {
  const errors = {};
  if (!form.name.trim()) errors.name = 'Name is required.';
  else if (!/^[A-Za-z ]+$/.test(form.name)) errors.name = 'Use alphabets and spaces only.';
  else if (form.name.length > 20) errors.name = 'Name cannot exceed 20 characters.';
  if (!form.username) errors.username = 'Username is required.';
  else if (!/^[A-Za-z0-9._-]{4,20}$/.test(form.username))
    errors.username = '4–20 characters: letters, numbers, dots, underscores, hyphens.';
  const emailErr = strictEmailError(form.email);
  if (emailErr) errors.email = emailErr;
  if (!form.password) errors.password = 'Password is required.';
  else if (form.password.length < 6) errors.password = 'Minimum 6 characters.';
  if (!form.confirmPassword) errors.confirmPassword = 'Please confirm your password.';
  else if (form.confirmPassword !== form.password) errors.confirmPassword = 'Passwords do not match.';
  return errors;
};

const validateLogin = (form) => {
  const errors = {};
  const identity = form.email.trim();
  if (!identity) errors.email = 'Please enter your email or username.';
  else if (/\s/.test(identity)) errors.email = 'Please enter a valid email address or username.';
  else if (identity.includes('@')) {
    if (!emailRegex.test(identity)) {
      errors.email = 'Please enter a valid email address.';
    }
  } else if (!/^[A-Za-z0-9._-]{4,20}$/.test(identity)) {
    errors.email = 'Please enter a valid username or email.';
  }
  if (!form.password) errors.password = 'Please enter your password.';
  else if (form.password.length < 6) errors.password = 'Password must be at least 6 characters.';
  return errors;
};

/* ═══════════════════════════════════════════════════════════
   ROLE SELECTOR COMPONENT
═══════════════════════════════════════════════════════════ */
function RoleSelector({ value, onChange }) {
  const isSelectedAdmin = value === 'admin';
  const isSelectedEmp   = value === 'employee';

  return (
    <div className="grid grid-cols-2 gap-3">
      {/* Admin Card */}
      <button
        type="button"
        onClick={() => onChange('admin')}
        className={`relative flex flex-col items-start gap-1 p-3.5 rounded-xl text-left transition-all duration-150 cursor-pointer ${
          isSelectedAdmin
            ? 'bg-[#EEF5FF] border-2 border-[#2563EB] text-[#2563EB] shadow-xs'
            : 'bg-[#F8FAFC] border-1.5 border-[#E4E7EC] text-[#172033] hover:bg-white hover:border-[#CBD5E1]'
        }`}
      >
        <BriefcaseBusiness size={18} className={isSelectedAdmin ? 'text-[#2563EB]' : 'text-[#64748B]'} />
        <p className="text-sm font-bold margin-0 leading-tight">Admin</p>
        <p className={`text-[11px] font-medium margin-0 ${isSelectedAdmin ? 'text-[#2563EB]' : 'text-[#667085]'}`}>
          Manage payroll & workforce
        </p>
        {isSelectedAdmin && (
          <div className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-[#2563EB] flex items-center justify-center">
            <Check size={10} color="white" strokeWidth={3} />
          </div>
        )}
      </button>

      {/* Employee Card */}
      <button
        type="button"
        onClick={() => onChange('employee')}
        className={`relative flex flex-col items-start gap-1 p-3.5 rounded-xl text-left transition-all duration-150 cursor-pointer ${
          isSelectedEmp
            ? 'bg-[#EEF5FF] border-2 border-[#2563EB] text-[#2563EB] shadow-xs'
            : 'bg-[#F8FAFC] border-1.5 border-[#E4E7EC] text-[#172033] hover:bg-white hover:border-[#CBD5E1]'
        }`}
      >
        <UserRound size={18} className={isSelectedEmp ? 'text-[#2563EB]' : 'text-[#64748B]'} />
        <p className="text-sm font-bold margin-0 leading-tight">Employee</p>
        <p className={`text-[11px] font-medium margin-0 ${isSelectedEmp ? 'text-[#2563EB]' : 'text-[#667085]'}`}>
          View personal records
        </p>
        {isSelectedEmp && (
          <div className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-[#2563EB] flex items-center justify-center">
            <Check size={10} color="white" strokeWidth={3} />
          </div>
        )}
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   FORM SECTION (LEFT COLUMN)
═══════════════════════════════════════════════════════════ */
function LoginFormSection({ isSignup, form, errors, touched, loading, error, success,
  showPw, onUpdate, onTouch, onTogglePw, onRoleChange, onSubmit }) {

  const inputClass = (key) => {
    if (!touched[key]) return 'bg-[#F0F4FA] border-[#E2E8F0]';
    return errors[key]
      ? 'bg-white border-[#F26B5B] focus:ring-[#F26B5B]/20'
      : 'bg-white border-[#22A06B] focus:ring-[#22A06B]/20';
  };

  return (
    <div className="flex flex-col justify-between h-full p-8 lg:p-11 bg-white">
      <div>
        {/* Official Brand Header Logo */}
        <div className="mb-7">
          <SalaryProLogo size="normal" showSubtitle={true} />
        </div>

        {/* Heading */}
        <h1 className="text-2xl lg:text-[26px] font-extrabold text-[#172033] tracking-tight mb-1">
          {isSignup ? 'Create your account 👋' : 'Welcome back 👋'}
        </h1>
        <p className="text-sm text-[#667085] font-medium mb-6">
          {isSignup
            ? 'Set up your Salary Pro workspace in seconds.'
            : 'Sign in to your Salary Pro account.'}
        </p>

        {/* Form */}
        <form onSubmit={onSubmit} className="space-y-4">

          {/* Signup Only Fields */}
          {isSignup && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#172033] mb-1.5">Full name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => onUpdate('name', e.target.value)}
                  onBlur={() => onTouch('name')}
                  className={`w-full px-3.5 py-2.5 text-sm font-medium rounded-xl border-1.5 outline-none transition-all duration-150 ${inputClass('name')}`}
                  placeholder="Alex Morgan"
                />
                {touched.name && errors.name && (
                  <p className="mt-1 text-xs text-[#F26B5B] flex items-center gap-1 font-medium">
                    <AlertCircle size={12} /> {errors.name}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-[#172033] mb-1.5">Username</label>
                <input
                  type="text"
                  value={form.username}
                  onChange={(e) => onUpdate('username', e.target.value)}
                  onBlur={() => onTouch('username')}
                  className={`w-full px-3.5 py-2.5 text-sm font-medium rounded-xl border-1.5 outline-none transition-all duration-150 ${inputClass('username')}`}
                  placeholder="alex.morgan"
                />
                {touched.username && errors.username && (
                  <p className="mt-1 text-xs text-[#F26B5B] flex items-center gap-1 font-medium">
                    <AlertCircle size={12} /> {errors.username}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Email or Username Input */}
          <div>
            <label className="block text-xs font-bold text-[#172033] mb-1.5">
              {isSignup ? 'Email address' : 'Email or username'}
            </label>
            <div className="relative flex items-center">
              <Mail size={16} className="absolute left-3.5 text-[#98A2B3] pointer-events-none" />
              <input
                type={isSignup ? 'email' : 'text'}
                value={form.email}
                onChange={(e) => onUpdate('email', e.target.value)}
                onBlur={() => onTouch('email')}
                className={`w-full pl-10 pr-3.5 py-2.5 text-sm font-medium rounded-xl border-1.5 text-[#172033] placeholder:text-[#98A2B3] outline-none transition-all duration-150 focus:border-[#2563EB] focus:bg-white focus:ring-4 focus:ring-[#2563EB]/10 ${inputClass('email')}`}
                placeholder={isSignup ? 'you@vadhvanport.com' : 'admin@vadhvanport.com'}
                autoComplete="username"
              />
            </div>
            {touched.email && errors.email && (
              <p className="mt-1 text-xs text-[#F26B5B] flex items-center gap-1 font-medium">
                <AlertCircle size={12} /> {errors.email}
              </p>
            )}
          </div>

          {/* Password Input */}
          <div>
            <label className="block text-xs font-bold text-[#172033] mb-1.5">Password</label>
            <div className="relative flex items-center">
              <Lock size={16} className="absolute left-3.5 text-[#98A2B3] pointer-events-none" />
              <input
                type={showPw ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => onUpdate('password', e.target.value)}
                onBlur={() => onTouch('password')}
                className={`w-full pl-10 pr-10 py-2.5 text-sm font-medium rounded-xl border-1.5 text-[#172033] placeholder:text-[#98A2B3] outline-none transition-all duration-150 focus:border-[#2563EB] focus:bg-white focus:ring-4 focus:ring-[#2563EB]/10 ${inputClass('password')}`}
                placeholder="••••••••••••"
                autoComplete={isSignup ? 'new-password' : 'current-password'}
              />
              <button
                type="button"
                className="absolute right-3.5 text-[#98A2B3] hover:text-[#667085] p-1"
                onClick={onTogglePw}
                tabIndex={-1}
                aria-label={showPw ? 'Hide password' : 'Show password'}
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {touched.password && errors.password && (
              <p className="mt-1 text-xs text-[#F26B5B] flex items-center gap-1 font-medium">
                <AlertCircle size={12} /> {errors.password}
              </p>
            )}
          </div>

          {/* Confirm Password (Signup Only) */}
          {isSignup && (
            <div>
              <label className="block text-xs font-bold text-[#172033] mb-1.5">Confirm password</label>
              <div className="relative flex items-center">
                <Lock size={16} className="absolute left-3.5 text-[#98A2B3] pointer-events-none" />
                <input
                  type="password"
                  value={form.confirmPassword}
                  onChange={(e) => onUpdate('confirmPassword', e.target.value)}
                  onBlur={() => onTouch('confirmPassword')}
                  className={`w-full pl-10 pr-3.5 py-2.5 text-sm font-medium rounded-xl border-1.5 text-[#172033] placeholder:text-[#98A2B3] outline-none transition-all duration-150 focus:border-[#2563EB] focus:bg-white focus:ring-4 focus:ring-[#2563EB]/10 ${inputClass('confirmPassword')}`}
                  placeholder="Re-enter password"
                />
              </div>
              {touched.confirmPassword && errors.confirmPassword && (
                <p className="mt-1 text-xs text-[#F26B5B] flex items-center gap-1 font-medium">
                  <AlertCircle size={12} /> {errors.confirmPassword}
                </p>
              )}
            </div>
          )}

          {/* Role Selector */}
          <div>
            <p className="block text-xs font-bold text-[#172033] mb-1.5">Continue as</p>
            <RoleSelector value={form.role} onChange={onRoleChange} />
          </div>

          {/* Error & Success Feedback */}
          {error && (
            <div className="flex items-center gap-2 bg-[#FFF0ED] border border-[#F26B5B]/30 rounded-xl p-3 text-xs font-medium text-[#D94E3E]">
              <AlertCircle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 bg-[#ECFDF5] border border-[#10B981]/30 rounded-xl p-3 text-xs font-medium text-[#047857]">
              <CheckCircle2 size={15} className="shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* Primary CTA Button */}
          <button
            type="submit"
            disabled={loading || Object.keys(errors).length > 0}
            className="w-full mt-2 py-3 px-5 bg-[#2563EB] hover:bg-[#1D4ED8] active:translate-y-0.5 text-white font-extrabold text-sm rounded-xl shadow-md shadow-[#2563EB]/25 flex items-center justify-center gap-2 transition-all duration-150 cursor-pointer disabled:opacity-55 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                {isSignup ? 'Creating account…' : 'Signing in…'}
              </>
            ) : (
              <>
                {isSignup ? 'Create account' : 'Sign in'}
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>
      </div>

      {/* Switch mode link */}
      <p className="mt-6 text-center text-xs font-medium text-[#667085]">
        {isSignup ? 'Already have an account?' : 'New to Salary Pro?'}{' '}
        <Link
          to={isSignup ? '/login' : '/signup'}
          className="font-bold text-[#2563EB] hover:text-[#1D4ED8] transition-colors"
        >
          {isSignup ? 'Sign in' : 'Create an account'}
        </Link>
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   RIGHT COLUMN: FINAL APPROVED PAYROLL ILLUSTRATION COMPOSITION
═══════════════════════════════════════════════════════════ */
function ValuePropSection() {
  return (
    <div className="flex flex-col justify-center items-center h-full p-8 lg:p-11 bg-[#FAFBFE]/90 border-t lg:border-t-0 lg:border-l border-[#F0F4FA] text-center">

      {/* Main Visual Focal Point */}
      <div className="w-full flex justify-center items-center my-auto py-2">
        <img
          src={payrollIllustrationImg}
          alt="Salary Pro Payroll Illustration"
          className="w-[85%] max-w-[460px] h-auto object-contain select-none transition-transform duration-300"
          style={{
            filter: 'drop-shadow(0 6px 16px rgba(37,99,235,0.06))',
          }}
        />
      </div>

      {/* Headline with Tiny Green Hand-Drawn-Style Stroke Under "Payroll" */}
      <div className="max-w-md mx-auto mt-2 mb-4">
        <h2 className="text-2xl lg:text-[28px] font-extrabold text-[#172033] tracking-tight mb-2 leading-snug">
          <span className="relative inline-block">
            Payroll
            <svg
              className="absolute -bottom-1 left-0 w-full h-2.5 text-[#10B981] overflow-visible"
              viewBox="0 0 100 20"
              fill="none"
              preserveAspectRatio="none"
            >
              <path
                d="M 2 12 C 30 4, 70 14, 98 8"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
              />
            </svg>
          </span>{' '}
          <span className="text-[#2563EB]">made simple.</span>
        </h2>
        <p className="text-xs lg:text-sm text-[#667085] leading-relaxed font-medium">
          Manage people, attendance and salaries in one place.
        </p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN AUTHENTICATION PAGE ROOT
═══════════════════════════════════════════════════════════ */
export default function AuthPage({ mode }) {
  const isSignup = mode === 'signup';
  const navigate  = useNavigate();
  const { login } = useAuth();

  const [form, setForm] = useState({
    name: '', username: '', email: '', password: '', confirmPassword: '', role: 'employee',
  });
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState({});
  const [showPw,  setShowPw]  = useState(false);

  const errors = useMemo(
    () => (isSignup ? validateSignup(form) : validateLogin(form)),
    [form, isSignup]
  );

  const update = useCallback((key, value) => {
    setForm((c) => ({ ...c, [key]: value }));
    if (!isSignup && ['email', 'password'].includes(key))
      setTouched((c) => ({ ...c, [key]: true }));
    setError('');
    setSuccess('');
  }, [isSignup]);

  const touch = useCallback((key) => setTouched((c) => ({ ...c, [key]: true })), []);

  const submit = useCallback(async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (Object.keys(errors).length) {
      setTouched(
        isSignup
          ? { name: true, username: true, email: true, password: true, confirmPassword: true }
          : { email: true, password: true }
      );
      return;
    }
    setLoading(true);
    try {
      const data = await (isSignup
        ? authApi.register(form)
        : authApi.login({ ...form, email: form.email.trim() }));
      setSuccess(isSignup ? 'Account created!' : 'Welcome back!');
      setTimeout(() => { login(data); navigate('/'); }, 700);
    } catch {
      setError(isSignup
        ? 'Unable to create account. Please try again.'
        : 'Invalid username/email or password.');
    } finally {
      setLoading(false);
    }
  }, [errors, form, isSignup, login, navigate]);

  const togglePw = useCallback(() => setShowPw((v) => !v), []);

  return (
    <div className="min-h-screen w-full bg-[#F4F7FB] flex items-center justify-center p-4 lg:p-8 relative overflow-hidden font-sans">

      {/* Subtle Low-Opacity High-Blur Pastel Decorative Blobs Behind Container */}
      <div className="absolute -top-28 -left-28 w-[520px] h-[520px] bg-[#E0EDFF] rounded-full blur-3xl opacity-45 pointer-events-none" />
      <div className="absolute -top-24 -right-24 w-[500px] h-[500px] bg-[#E2F8F6] rounded-full blur-3xl opacity-45 pointer-events-none" />
      <div className="absolute -bottom-28 -right-28 w-[540px] h-[540px] bg-[#FFEBE2] rounded-full blur-3xl opacity-45 pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-[480px] h-[480px] bg-[#FFF6DC] rounded-full blur-3xl opacity-40 pointer-events-none" />

      {/* Subtle Dot Grid Patterns (Left & Right Background) */}
      <div className="absolute top-1/3 left-6 pointer-events-none hidden md:block opacity-40">
        <svg width="80" height="120" viewBox="0 0 80 120" fill="none">
          <pattern id="dotGrid1" x="0" y="0" width="16" height="16" patternUnits="userSpaceOnUse">
            <circle cx="3" cy="3" r="1.5" fill="#CBD5E1" />
          </pattern>
          <rect width="80" height="120" fill="url(#dotGrid1)" />
        </svg>
      </div>
      <div className="absolute bottom-1/4 right-8 pointer-events-none hidden md:block opacity-40">
        <svg width="80" height="120" viewBox="0 0 80 120" fill="none">
          <pattern id="dotGrid2" x="0" y="0" width="16" height="16" patternUnits="userSpaceOnUse">
            <circle cx="3" cy="3" r="1.5" fill="#CBD5E1" />
          </pattern>
          <rect width="80" height="120" fill="url(#dotGrid2)" />
        </svg>
      </div>

      {/* Subtle Background Curved Strokes */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-30" fill="none">
        <path d="M-100 200 C 300 100, 600 900, 1400 300" stroke="#93C5FD" strokeWidth="1.5" />
        <path d="M-50 700 C 400 400, 800 200, 1600 600" stroke="#CBD5E1" strokeWidth="1" strokeDasharray="4 4" />
      </svg>

      {/* Main Centered White Container with Translucent Light Surface */}
      <div className="relative z-10 w-full max-w-5xl bg-white/95 backdrop-blur-sm rounded-[28px] shadow-2xl shadow-blue-900/5 border border-white/80 overflow-hidden grid grid-cols-1 lg:grid-cols-2">

        {/* Left Column: Form */}
        <LoginFormSection
          isSignup={isSignup}
          form={form}
          errors={errors}
          touched={touched}
          loading={loading}
          error={error}
          success={success}
          showPw={showPw}
          onUpdate={update}
          onTouch={touch}
          onTogglePw={togglePw}
          onRoleChange={(r) => update('role', r)}
          onSubmit={submit}
        />

        {/* Right Column: Approved Payroll Vector Artwork Composition */}
        <ValuePropSection />
      </div>
    </div>
  );
}
