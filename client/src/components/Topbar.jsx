import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, LogOut, Menu, Settings, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import NotificationDropdown from './NotificationDropdown';

const PAGE_NAMES = {
  '/':           { title: 'Dashboard',   sub: 'Overview of your payroll activity' },
  '/employees':  { title: 'Employees',   sub: 'Manage your workforce' },
  '/attendance': { title: 'Attendance',  sub: 'Track daily attendance records' },
  '/leaves':     { title: 'Leave',       sub: 'Review and manage leave requests' },
  '/learning':   { title: 'Learning & Development', sub: 'Track employee courses and certifications' },
  '/payroll':    { title: 'Salary',      sub: 'Process and review payroll' },
  '/reports':    { title: 'Reports',     sub: 'Payroll and HR analytics' },
  '/insights':   { title: 'Insights',    sub: 'AI-powered payroll recommendations' },
  '/settings':   { title: 'Settings',    sub: 'Account and system preferences' },
  '/profile':    { title: 'My Career Profile', sub: 'Employment details & career milestones' },
};

export default function Topbar({ onMenuClick }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [dropOpen, setDropOpen] = useState(false);
  const dropRef = useRef(null);

  const page = PAGE_NAMES[location.pathname] ?? { title: 'Salary Pro', sub: '' };

  /* Close dropdown on outside click */
  useEffect(() => {
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) {
        setDropOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = () => { setDropOpen(false); logout(); navigate('/login'); };

  const initials = user?.name
    ? user.name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()
    : (user?.username?.[0] ?? 'U').toUpperCase();

  const displayName = user?.name || user?.username || 'User';
  const role = user?.role ?? 'employee';

  return (
    <header className="topbar">
      {/* Left: hamburger + page title context */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <button
          className="lg:hidden"
          onClick={onMenuClick}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--sp-muted)', padding: 6, borderRadius: 8,
            transition: 'background 150ms',
          }}
          aria-label="Open navigation"
        >
          <Menu size={20} />
        </button>

        {/* Clean page title */}
        <div>
          <h1 style={{
            fontSize: 16, fontWeight: 700, color: 'var(--sp-ink)',
            letterSpacing: '-0.01em', margin: 0, lineHeight: 1.2,
          }}>
            {page.title}
          </h1>
          {page.sub && (
            <p style={{ fontSize: 11.5, color: 'var(--sp-muted)', margin: '1px 0 0' }}>
              {page.sub}
            </p>
          )}
        </div>
      </div>

      {/* Right: notifications + user dropdown */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <NotificationDropdown />

        <div style={{ position: 'relative' }} ref={dropRef}>
        <button
          className="topbar-user-btn"
          onClick={() => setDropOpen((v) => !v)}
          aria-haspopup="true"
          aria-expanded={dropOpen}
        >
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            background: 'var(--sp-blue-light)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700, color: 'var(--sp-blue-dark)',
            flexShrink: 0,
          }}>
            {initials}
          </div>

          <div style={{ textAlign: 'left' }}>
            <p style={{
              fontSize: 12.5, fontWeight: 600, color: 'var(--sp-ink)',
              margin: 0, lineHeight: 1.2,
              maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {displayName}
            </p>
            <p style={{
              fontSize: 10.5, color: 'var(--sp-subtle)', margin: 0,
              textTransform: 'capitalize',
            }}>
              {role}
            </p>
          </div>

          <ChevronDown
            size={14}
            style={{
              color: 'var(--sp-subtle)',
              transition: 'transform 150ms',
              transform: dropOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          />
        </button>

        {/* Dropdown */}
        <div className={`topbar-dropdown ${dropOpen ? 'open' : 'closed'}`} role="menu">
          <div style={{
            padding: '10px 12px 8px',
            borderBottom: '1px solid var(--sp-border-lt)',
            marginBottom: 4,
          }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--sp-ink)', margin: 0 }}>
              {displayName}
            </p>
            <p style={{ fontSize: 11, color: 'var(--sp-subtle)', margin: '2px 0 0', textTransform: 'capitalize' }}>
              {role} account
            </p>
          </div>

          {role === 'employee' && (
            <button
              className="topbar-dropdown-item"
              role="menuitem"
              onClick={() => { setDropOpen(false); navigate('/profile'); }}
            >
              <User size={15} style={{ color: 'var(--sp-muted)' }} />
              My Profile
            </button>
          )}

          <button
            className="topbar-dropdown-item"
            role="menuitem"
            onClick={() => { setDropOpen(false); navigate('/settings'); }}
          >
            <Settings size={15} style={{ color: 'var(--sp-muted)' }} />
            Settings
          </button>

          <div style={{ height: 1, background: 'var(--sp-border-lt)', margin: '4px 6px' }} />

          <button
            className="topbar-dropdown-item danger"
            role="menuitem"
            onClick={handleLogout}
          >
            <LogOut size={15} />
            Sign out
          </button>
        </div>
      </div>
    </div>
  </header>
);
}
