import { useEffect, useRef, useState } from 'react';
import { Bell, LogOut, Menu, Search, Settings, UserRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Topbar({ onMenuClick }) {
  const { user } = useAuth();
  const { logout } = useAuth();
  const navigate = useNavigate(); const [open, setOpen] = useState(false); const menuRef = useRef(null);
  useEffect(() => { const close = (event) => { if (menuRef.current && !menuRef.current.contains(event.target)) setOpen(false); }; document.addEventListener('mousedown', close); return () => document.removeEventListener('mousedown', close); }, []);
  const goToSettings = () => { setOpen(false); navigate('/settings'); };
  const signOut = () => { setOpen(false); logout(); };
  return <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-5 backdrop-blur sm:px-8">
    <button onClick={onMenuClick} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden" aria-label="Open navigation"><Menu size={20}/></button>
    <div className="hidden max-w-sm flex-1 items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-slate-400 md:flex"><Search size={17}/><span className="text-sm">Search employees...</span></div>
    <div className="ml-auto flex items-center gap-3"><button className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Notifications"><Bell size={19}/><span className="absolute right-2 top-2 size-1.5 rounded-full bg-violet-600"/></button><div className="hidden text-right sm:block"><p className="text-sm font-medium">{user?.name || 'User'}</p><p className="capitalize text-xs text-slate-500">{user?.role || 'Employee'}</p></div><div ref={menuRef} className="relative"><button onClick={() => setOpen((current) => !current)} className="grid size-9 overflow-hidden place-items-center rounded-full bg-violet-100 text-sm font-semibold text-violet-700" aria-label="Open account menu" aria-expanded={open}>{user?.profilePicture ? <img src={user.profilePicture} alt="" className="size-full object-cover"/> : (user?.name || 'U').charAt(0).toUpperCase()}</button><div className={`absolute right-0 top-12 w-72 origin-top-right rounded-xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-200/70 transition duration-150 ${open ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-1 opacity-0'}`}><div className="border-b border-slate-100 px-3 py-3"><p className="truncate text-sm font-semibold text-slate-800">{user?.name || 'User'}</p><p className="mt-0.5 truncate text-xs text-slate-500">{user?.email || 'No email available'}</p><span className="mt-2 inline-flex rounded-full bg-violet-50 px-2 py-0.5 text-xs font-medium capitalize text-violet-700">{user?.role || 'Employee'}</span></div><div className="py-1"><button onClick={goToSettings} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-100"><UserRound size={16}/>View Profile</button><button onClick={goToSettings} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-100"><Settings size={16}/>Account Settings</button><button onClick={signOut} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-rose-600 hover:bg-rose-50"><LogOut size={16}/>Logout</button></div></div></div></div>
  </header>;
}
