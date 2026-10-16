import { useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  BarChart3, BriefcaseBusiness, CalendarCheck, ClipboardList,
  LayoutDashboard, LogOut, Settings, TrendingUp, Users, X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

/* ── Navigation groups with module accent colors ── */
const NAV = [
  {
    group: 'Overview',
    items: [
      { to: '/',          label: 'Dashboard',  icon: LayoutDashboard, accent: '#2563EB' },
    ],
  },
  {
    group: 'People',
    items: [
      { to: '/employees', label: 'Employees',  icon: Users,           accent: '#2563EB' },
      { to: '/attendance',label: 'Attendance', icon: CalendarCheck,   accent: '#0F9F8F' },
      { to: '/leaves',    label: 'Leave',      icon: ClipboardList,   accent: '#F4B740' },
    ],
  },
  {
    group: 'Payroll',
    items: [
      { to: '/payroll',   label: 'Salary',     icon: BriefcaseBusiness, accent: '#22A06B' },
    ],
  },
  {
    group: 'Analytics',
    items: [
      { to: '/reports',   label: 'Reports',    icon: BarChart3,       accent: '#2563EB' },
      { to: '/insights',  label: 'Insights',   icon: TrendingUp,      accent: '#7C3AED' },
    ],
  },
  {
    group: 'Account',
    items: [
      { to: '/settings',  label: 'Settings',   icon: Settings,        accent: '#667085' },
    ],
  },
];

import SalaryProLogo from './SalaryProLogo';

export default function Sidebar({ open, onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const sidebarRef = useRef(null);

  /* Close on outside click (mobile) */
  useEffect(() => {
    const handler = (e) => {
      if (open && sidebarRef.current && !sidebarRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, onClose]);

  /* Close on Escape */
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleLogout = () => { logout(); navigate('/login'); };

  const initials = user?.name
    ? user.name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()
    : (user?.username?.[0] ?? 'U').toUpperCase();

  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div
          className="sidebar-backdrop"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside ref={sidebarRef} className={`sidebar ${open ? 'open' : ''}`}>

        {/* Brand Header */}
        <div className="sidebar-brand">
          <SalaryProLogo size="small" />
          {/* Mobile close button */}
          <button
            onClick={onClose}
            className="ml-auto lg:hidden"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--sp-muted)', padding: 4,
            }}
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation list */}
        <nav className="sidebar-nav" aria-label="Main navigation">
          {NAV.map(({ group, items }) => {
            const visibleItems = items.filter((item) => !item.adminOnly || user?.role === 'admin');
            if (visibleItems.length === 0) return null;
            return (
              <div key={group} className="sidebar-section">
                <p className="sidebar-section-label">{group}</p>
                {visibleItems.map(({ to, label, icon: Icon, accent }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `sp-nav-item${isActive ? ' active' : ''}`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {/* Icon container */}
                      <div style={{
                        width: 26, height: 26, borderRadius: 8,
                        background: isActive ? `${accent}18` : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 150ms ease',
                      }}>
                        <Icon
                          size={16}
                          style={{
                            color: isActive ? accent : 'var(--sp-muted)',
                            transition: 'color 150ms ease',
                          }}
                        />
                      </div>
                      <span style={{ flex: 1 }}>{label}</span>

                      {/* Active indicator dot */}
                      {isActive && (
                        <div style={{
                          width: 5, height: 5, borderRadius: '50%',
                          background: accent,
                        }} />
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          );
        })}
        </nav>

        {/* User profile footer */}
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar">{initials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                fontSize: 13, fontWeight: 600, color: 'var(--sp-ink)',
                margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {user?.name || user?.username || 'User'}
              </p>
              <p style={{
                fontSize: 11, color: 'var(--sp-subtle)',
                margin: 0, textTransform: 'capitalize',
              }}>
                {user?.role || 'employee'}
              </p>
            </div>
            <button
              onClick={handleLogout}
              title="Logout"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--sp-subtle)', padding: 6, borderRadius: 8,
                transition: 'all 150ms', flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--sp-coral)';
                e.currentTarget.style.background = 'var(--sp-coral-light)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--sp-subtle)';
                e.currentTarget.style.background = 'none';
              }}
              aria-label="Logout"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
