import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthCard from '../components/AuthCard';
import RoleSelector from '../components/RoleSelector';
import { authApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

const strictEmailError = (value) => {
  const email = value.trim();
  if (!email) return 'Email is required.';
  if (/\s/.test(email) || !/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+$/.test(email)) return 'Please enter a valid email address.';
  if (!/^[a-zA-Z0-9._-]+@(gmail\.com|yahoo\.com|outlook\.com)$/.test(email)) return 'Only Gmail, Yahoo, and Outlook email addresses are allowed.';
  return '';
};

const validateSignup = (form) => {
  const errors = {};
  if (!form.name.trim()) errors.name = 'Name is required.';
  else if (!/^[A-Za-z ]+$/.test(form.name)) errors.name = 'Use alphabets and spaces only.';
  else if (form.name.length > 20) errors.name = 'Name cannot exceed 20 characters.';
  if (!form.username) errors.username = 'Username is required.';
  else if (!/^[A-Za-z0-9._-]{4,20}$/.test(form.username)) errors.username = 'Use 4-20 letters, numbers, dots, underscores, or hyphens only.';
  const emailError = strictEmailError(form.email);
  if (emailError) errors.email = emailError;
  if (!form.password) errors.password = 'Password is required.';
  else if (form.password.length < 6) errors.password = 'Password must be at least 6 characters.';
  if (!form.confirmPassword) errors.confirmPassword = 'Please confirm your password.';
  else if (form.confirmPassword !== form.password) errors.confirmPassword = 'Passwords do not match.';
  return errors;
};

const validateLogin = (form) => {
  const errors = {}; const identity = form.email.trim();
  if (!identity) errors.email = 'Please enter your email or username.';
  else if (/\s/.test(identity)) errors.email = 'Please enter a valid email address.';
  else if (identity.includes('@')) {
    const emailError = strictEmailError(identity);
    if (emailError) errors.email = emailError;
  } else if (!/^[A-Za-z0-9._-]{4,20}$/.test(identity)) errors.email = 'Please enter a valid email address.';
  if (!form.password) errors.password = 'Please enter your password.';
  else if (form.password.length < 6) errors.password = 'Password must be at least 6 characters.';
  return errors;
};

export default function AuthPage({ mode }) {
  const isSignup = mode === 'signup'; const navigate = useNavigate(); const { login } = useAuth();
  const [form, setForm] = useState({ name: '', username: '', email: '', password: '', confirmPassword: '', role: 'employee' }); const [error, setError] = useState(''); const [success, setSuccess] = useState(''); const [loading, setLoading] = useState(false); const [touched, setTouched] = useState({});
  const errors = useMemo(() => isSignup ? validateSignup(form) : validateLogin(form), [form, isSignup]);
  const update = (key, value) => { setForm((current) => ({ ...current, [key]: value })); if (!isSignup && ['email', 'password'].includes(key)) setTouched((current) => ({ ...current, [key]: true })); setError(''); setSuccess(''); };
  const markTouched = (key) => setTouched((current) => ({ ...current, [key]: true }));
  const inputClass = (key) => `input mt-2 ${touched[key] ? (errors[key] ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-100' : 'border-emerald-500 focus:border-emerald-500 focus:ring-emerald-100') : ''}`;
  const submit = async (event) => { event.preventDefault(); setError(''); setSuccess(''); if (Object.keys(errors).length) { setTouched(isSignup ? { name: true, username: true, email: true, password: true, confirmPassword: true } : { email: true, password: true }); return; } setLoading(true); try { const data = await (isSignup ? authApi.register(form) : authApi.login({ ...form, email: form.email.trim() })); if (isSignup) { setSuccess('Account created successfully'); setTimeout(() => { login(data); navigate('/'); }, 900); } else { setSuccess('Login successful'); setTimeout(() => { login(data); navigate('/'); }, 700); } } catch { setError(isSignup ? 'Unable to create account. Please try again.' : 'Invalid username/email or password.'); } finally { setLoading(false); } };
  return <AuthCard title={isSignup ? 'Create your account' : 'Welcome back'} subtitle={isSignup ? 'Start managing your payroll with confidence.' : 'Sign in to your Salary Pro workspace.'}>
    {!isSignup && <div className="mt-6 rounded-xl border border-violet-100 bg-violet-50 p-3.5 text-sm text-violet-950"><p className="font-medium">Login details</p><p className="mt-1 leading-5 text-violet-800">Use the email and password you registered with, then select the same role. New here? Create an account below first.</p></div>}
    <form onSubmit={submit} className="mt-7 space-y-5">
      {isSignup && <><label className="block text-sm font-medium text-slate-700">Full name<input value={form.name} onChange={(e) => update('name', e.target.value)} onBlur={() => markTouched('name')} className={inputClass('name')} placeholder="Alex Morgan" />{touched.name && errors.name && <span className="mt-1 block text-xs text-rose-600">{errors.name}</span>}</label><label className="block text-sm font-medium text-slate-700">Username<input value={form.username} onChange={(e) => update('username', e.target.value)} onBlur={() => markTouched('username')} className={inputClass('username')} placeholder="alex.morgan" />{touched.username && errors.username && <span className="mt-1 block text-xs text-rose-600">{errors.username}</span>}</label></>}
      <label className="block text-sm font-medium text-slate-700">{isSignup ? 'Email address' : 'Email or username'}<input type={isSignup ? 'email' : 'text'} value={form.email} onChange={(e) => update('email', e.target.value)} onBlur={() => markTouched('email')} className={inputClass('email')} placeholder={isSignup ? 'you@company.com' : 'you@company.com or username'} />{touched.email && errors.email && <span className="mt-1 block text-xs text-rose-600">{errors.email}</span>}</label>
      <label className="block text-sm font-medium text-slate-700">Password<input type="password" value={form.password} onChange={(e) => update('password', e.target.value)} onBlur={() => markTouched('password')} className={inputClass('password')} placeholder="Minimum 6 characters" />{touched.password && errors.password && <span className="mt-1 block text-xs text-rose-600">{errors.password}</span>}</label>
      {isSignup && <label className="block text-sm font-medium text-slate-700">Confirm password<input type="password" value={form.confirmPassword} onChange={(e) => update('confirmPassword', e.target.value)} onBlur={() => markTouched('confirmPassword')} className={inputClass('confirmPassword')} placeholder="Re-enter your password" />{touched.confirmPassword && errors.confirmPassword && <span className="mt-1 block text-xs text-rose-600">{errors.confirmPassword}</span>}</label>}
      <div><p className="mb-2 text-sm font-medium text-slate-700">Continue as</p><RoleSelector value={form.role} onChange={(role) => update('role', role)} /></div>
      {error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2.5 text-sm text-rose-700">{error}</p>}{success && <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700">{success}</p>}
      <button disabled={loading || Object.keys(errors).length > 0} className="button-primary w-full">{loading ? 'Please wait…' : isSignup ? 'Create account' : 'Sign in'}</button>
    </form>
    <p className="mt-6 text-center text-sm text-slate-500">{isSignup ? 'Already have an account?' : 'New to Salary Pro?'} <Link className="font-medium text-violet-700 hover:text-violet-800" to={isSignup ? '/login' : '/signup'}>{isSignup ? 'Sign in' : 'Create an account'}</Link></p>
  </AuthCard>;
}
