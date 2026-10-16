import { useEffect, useMemo, useState } from 'react';
import { KeyRound, ShieldCheck, UserRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { settingsApi } from '../services/api';

// ── Helpers (unchanged from original) ────────────────────────────────────
const makeProfile = (user) => ({
  name:           user?.name           || '',
  email:          user?.email          || '',
  phone:          user?.phone          || '',
  department:     user?.department     || '',
  jobTitle:       user?.jobTitle       || '',
  employeeId:     user?.employeeId     || `EMP-${String(user?.id || '').slice(-6).toUpperCase()}`,
  dateOfJoining:  user?.dateOfJoining?.slice(0, 10) || '',
  address:        user?.address        || '',
  profilePicture: user?.profilePicture || '',
});

const validate = (p) => {
  const errors = {};
  if (!p.name.trim())  errors.name  = 'Name is required.';
  if (!p.email.trim()) errors.email = 'Email is required.';
  else if (!/^\S+@\S+\.\S+$/.test(p.email)) errors.email = 'Enter a valid email address.';
  if (!/^\d{10}$/.test(p.phone))
    errors.phone = p.phone ? 'Phone number must be exactly 10 digits.' : 'Phone number is required.';
  return errors;
};
// ─────────────────────────────────────────────────────────────────────────

function SectionCard({ icon: Icon, iconBg, title, subtitle, children }) {
  return (
    <div className="sp-card">
      <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-4">
        <div className={`flex size-10 items-center justify-center rounded-xl ${iconBg}`}>
          <Icon size={18} />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
          <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
        </div>
      </div>
      <div className="px-6 py-6">{children}</div>
    </div>
  );
}

function Field({ label, error, touched, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      {children}
      {touched && error && <p className="text-xs text-rose-600">{error}</p>}
    </div>
  );
}

export default function SettingsPage() {
  const { user, updateUser } = useAuth();

  const [profile,   setProfile]   = useState(() => makeProfile(user));
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '' });
  const [users,     setUsers]     = useState([]);
  const [notice,    setNotice]    = useState({ msg: '', ok: true });
  const [touched,   setTouched]   = useState({});
  const [image,     setImage]     = useState({ valid: Boolean(user?.profilePicture), error: '' });

  const errors = useMemo(() => validate(profile), [profile]);

  // Load all users if admin
  useEffect(() => {
    if (user?.role === 'admin')
      settingsApi.users().then(setUsers).catch((e) => setNotice({ msg: e.message, ok: false }));
  }, [user?.role]);

  const update = (key, value) => {
    setProfile((c) => ({ ...c, [key]: value }));
    setNotice({ msg: '', ok: true });
  };
  const touch = (key) => setTouched((c) => ({ ...c, [key]: true }));

  const inputClass = (key) => {
    if (!touched[key]) return 'sp-input';
    return `sp-input ${errors[key]
      ? 'border-rose-400 focus:border-rose-400 focus:ring-rose-400/10'
      : 'border-emerald-400 focus:border-emerald-400 focus:ring-emerald-400/10'}`;
  };

  // ── saveProfile (logic unchanged) ────────────────────────────────────
  const saveProfile = async (e) => {
    e.preventDefault();
    if (!image.valid) { setImage({ valid: false, error: 'Profile image is required.' }); return; }
    if (Object.keys(errors).length) { setTouched({ name: true, email: true, phone: true }); return; }
    try {
      const updated = await settingsApi.updateProfile(profile);
      updateUser(updated);
      setProfile(makeProfile(updated));
      setImage({ valid: true, error: '' });
      setNotice({ msg: 'Profile updated successfully.', ok: true });
    } catch (err) {
      setNotice({ msg: err.message, ok: false });
    }
  };

  // ── changeImage (logic unchanged) ────────────────────────────────────
  const changeImage = (e) => {
    const file = e.target.files?.[0];
    setNotice({ msg: '', ok: true });
    if (!file) {
      update('profilePicture', '');
      setImage({ valid: false, error: 'Profile image is required.' });
      return;
    }
    if (!['image/jpeg', 'image/png'].includes(file.type) || !/\.(jpg|jpeg|png)$/i.test(file.name)) {
      update('profilePicture', '');
      setImage({ valid: false, error: 'Only JPG, JPEG, and PNG files are allowed.' });
      return;
    }
    if (file.size >= 2 * 1024 * 1024) {
      update('profilePicture', '');
      setImage({ valid: false, error: 'Image size must be less than 2 MB.' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => { update('profilePicture', reader.result); setImage({ valid: true, error: '' }); };
    reader.readAsDataURL(file);
  };

  // ── removeImage (logic unchanged) ────────────────────────────────────
  const removeImage = async () => {
    try {
      const updated = await settingsApi.removeProfilePicture();
      updateUser(updated);
      setProfile((c) => ({ ...c, profilePicture: '' }));
      setImage({ valid: false, error: 'Profile image is required.' });
      setNotice({ msg: 'Profile image removed.', ok: true });
    } catch (err) {
      setNotice({ msg: err.message, ok: false });
    }
  };

  // ── savePassword (logic unchanged) ───────────────────────────────────
  const savePassword = async (e) => {
    e.preventDefault();
    try {
      await settingsApi.changePassword(passwords);
      setPasswords({ currentPassword: '', newPassword: '' });
      setNotice({ msg: 'Password changed successfully.', ok: true });
    } catch (err) {
      setNotice({ msg: err.message, ok: false });
    }
  };

  // ── changeRole (logic unchanged) ─────────────────────────────────────
  const changeRole = async (id, role) => {
    try {
      const updated = await settingsApi.updateRole(id, role);
      setUsers((cur) => cur.map((u) => (u._id === updated.id ? { ...u, ...updated, _id: updated.id } : u)));
      setNotice({ msg: 'Role updated successfully.', ok: true });
    } catch (err) {
      setNotice({ msg: err.message, ok: false });
    }
  };

  return (
    <div className="sp-page">

      {/* ── Page header ── */}
      <div className="mb-7">
        <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">Account</p>
        <h1 className="mt-1.5 text-[1.6rem] font-semibold tracking-tight text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage your profile, security, and workspace access.
        </p>
      </div>

      {/* Global notice */}
      {notice.msg && (
        <div className={`mb-6 ${notice.ok ? 'sp-notice-success' : 'sp-notice-error'}`}>
          {notice.msg}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-2">

        {/* ── Profile form ── */}
        <SectionCard
          icon={UserRound}
          iconBg="bg-indigo-100 text-indigo-600"
          title="Profile"
          subtitle="Update your personal and job details."
        >
          <form onSubmit={saveProfile} className="space-y-5">

            <Field label="Full name" error={errors.name} touched={touched.name}>
              <input
                value={profile.name}
                onChange={(e) => update('name', e.target.value)}
                onBlur={() => touch('name')}
                className={inputClass('name')}
                placeholder="Your full name"
              />
            </Field>

            <Field label="Email address" error={errors.email} touched={touched.email}>
              <input
                type="email"
                value={profile.email}
                onChange={(e) => update('email', e.target.value)}
                onBlur={() => touch('email')}
                className={inputClass('email')}
              />
            </Field>

            <Field label="Phone number" error={errors.phone} touched={touched.phone}>
              <input
                type="tel"
                value={profile.phone}
                onChange={(e) => update('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                onBlur={() => touch('phone')}
                className={inputClass('phone')}
                placeholder="10-digit number"
              />
            </Field>

            {/* Two-column row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700">Department</label>
                <select
                  value={profile.department}
                  onChange={(e) => update('department', e.target.value)}
                  className="sp-input"
                >
                  <option value="">Select department</option>
                  {['HR', 'IT', 'Finance', 'Marketing', 'Operations'].map((d) => (
                    <option key={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700">Job title</label>
                <input
                  value={profile.jobTitle}
                  onChange={(e) => update('jobTitle', e.target.value)}
                  className="sp-input"
                  placeholder="e.g. Software Engineer"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700">Employee ID</label>
                <input
                  value={profile.employeeId}
                  readOnly
                  className="sp-input cursor-not-allowed bg-slate-50 text-slate-400"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700">Date of joining</label>
                <input
                  type="date"
                  value={profile.dateOfJoining}
                  onChange={(e) => update('dateOfJoining', e.target.value)}
                  className="sp-input"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Address</label>
              <textarea
                value={profile.address}
                onChange={(e) => update('address', e.target.value)}
                rows={3}
                className="sp-input resize-none"
                placeholder="Your address"
              />
            </div>

            {/* Profile picture upload */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Profile picture</label>

              {/* Preview */}
              {image.valid && profile.profilePicture && (
                <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <img
                    src={profile.profilePicture}
                    alt="Profile preview"
                    className="size-12 rounded-full object-cover ring-2 ring-white shadow"
                  />
                  <div className="flex-1">
                    <p className="text-xs font-medium text-slate-700">Current picture</p>
                    <p className="text-xs text-slate-400">JPG/JPEG/PNG · max 2 MB</p>
                  </div>
                  <button
                    type="button"
                    onClick={removeImage}
                    className="text-xs font-medium text-rose-600 hover:text-rose-700"
                  >
                    Remove
                  </button>
                </div>
              )}

              <input
                type="file"
                accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                onChange={changeImage}
                className={`sp-input py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-indigo-700 ${
                  image.valid
                    ? 'border-emerald-400'
                    : image.error
                    ? 'border-rose-400'
                    : ''
                }`}
              />
              {image.error && <p className="text-xs text-rose-600">{image.error}</p>}
              <p className="text-xs text-slate-400">
                Accepted: JPG, JPEG, PNG · Maximum size: 2 MB
              </p>
            </div>

            {/* Role display */}
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm">
              <span className="text-slate-600">Current role</span>
              <span className="font-semibold capitalize text-slate-800">{user?.role}</span>
            </div>

            <button
              type="submit"
              disabled={!image.valid}
              className="sp-btn-primary w-full"
            >
              Save profile
            </button>
          </form>
        </SectionCard>

        {/* ── Password change form ── */}
        <SectionCard
          icon={KeyRound}
          iconBg="bg-amber-100 text-amber-600"
          title="Change password"
          subtitle="Use a strong password with at least 8 characters."
        >
          <form onSubmit={savePassword} className="space-y-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Current password</label>
              <input
                type="password"
                value={passwords.currentPassword}
                onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
                className="sp-input"
                placeholder="Enter current password"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">New password</label>
              <input
                type="password"
                value={passwords.newPassword}
                onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                className="sp-input"
                placeholder="At least 8 characters"
              />
            </div>
            <div className="sp-notice-info text-xs">
              Passwords must be at least 8 characters. Avoid using common words.
            </div>
            <button type="submit" className="sp-btn-primary">
              Update password
            </button>
          </form>
        </SectionCard>
      </div>

      {/* ── Role management (admin only) ── */}
      {user?.role === 'admin' && (
        <div className="sp-card mt-6 overflow-hidden">
          <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-4">
            <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
              <ShieldCheck size={18} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-800">Role management</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Admin-only · Assign or change workspace access roles.
              </p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="sp-table min-w-[580px]">
              <thead>
                <tr>
                  {['User', 'Email', 'Current role', 'Change role'].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((member) => (
                  <tr key={member._id}>
                    <td className="font-semibold text-slate-800">{member.name}</td>
                    <td className="text-slate-500">{member.email}</td>
                    <td>
                      <span className={member.role === 'admin' ? 'sp-badge-indigo' : 'sp-badge-slate'}>
                        {member.role}
                      </span>
                    </td>
                    <td>
                      <select
                        value={member.role}
                        onChange={(e) => changeRole(member._id, e.target.value)}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 capitalize focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                      >
                        <option value="employee">Employee</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-10 text-center text-sm text-slate-400">
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
