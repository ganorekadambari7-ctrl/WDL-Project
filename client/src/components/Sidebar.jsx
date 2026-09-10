import { BarChart3, Bot, CalendarCheck, CircleDollarSign, FileText, LayoutDashboard, LogOut, Network, Settings, Users } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const items = [
  { to: '/', label: 'Overview', icon: LayoutDashboard }, { to: '/employees', label: 'Employees', icon: Users },
  { to: '/attendance', label: 'Attendance', icon: CalendarCheck }, { to: '/leaves', label: 'Leave management', icon: FileText },
  { to: '/payroll', label: 'Payroll', icon: CircleDollarSign }, { to: '/reports', label: 'Reports', icon: BarChart3 }, { to: '/insights', label: 'AI insights', icon: Bot }, { to: '/uml', label: 'UML diagrams', icon: Network }, { to: '/settings', label: 'Settings', icon: Settings }
];
export default function Sidebar({ open, onClose }) {
  const { user, logout } = useAuth();
  return <><button onClick={onClose} className={`fixed inset-0 z-20 bg-slate-900/30 lg:hidden ${open ? 'block' : 'hidden'}`} aria-label="Close navigation"/><aside className={`fixed inset-y-0 left-0 z-30 flex w-64 shrink-0 flex-col border-r border-slate-200 bg-white p-4 transition-transform lg:static lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
    <div className="mb-9 flex items-center gap-2 px-2"><div className="grid size-8 place-items-center rounded-lg bg-violet-600 text-sm font-bold text-white">S</div><span className="font-semibold">Salary Pro</span></div>
    <nav className="space-y-1">{items.map(({ to, label, icon: Icon }) => <NavLink onClick={onClose} key={to} to={to} className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${isActive ? 'bg-violet-50 font-medium text-violet-700' : 'text-slate-600 hover:bg-slate-100'}`}><Icon size={18}/>{label}</NavLink>)}</nav>
    <div className="mt-auto border-t border-slate-100 pt-4"><div className="mb-3 px-3"><p className="truncate text-sm font-medium">{user?.name}</p><p className="capitalize text-xs text-slate-500">{user?.role}</p></div><button onClick={logout} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-100"><LogOut size={18}/>Sign out</button></div>
  </aside></>;
}
