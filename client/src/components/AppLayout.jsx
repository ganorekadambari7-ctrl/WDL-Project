import { useState } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
export default function AppLayout({ children }) { const [open, setOpen] = useState(false); return <div className="flex min-h-screen"><Sidebar open={open} onClose={() => setOpen(false)} /><div className="min-w-0 flex-1"><Topbar onMenuClick={() => setOpen(true)} />{children}</div></div>; }
