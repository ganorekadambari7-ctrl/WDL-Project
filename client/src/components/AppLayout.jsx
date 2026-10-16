import { useState, useCallback } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function AppLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const openSidebar  = useCallback(() => setSidebarOpen(true), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  return (
    <div className="shell-root">
      {/* Sidebar */}
      <Sidebar open={sidebarOpen} onClose={closeSidebar} />

      {/* Main */}
      <div className="shell-main">
        <Topbar onMenuClick={openSidebar} />
        <main className="shell-content">
          {children}
        </main>
      </div>
    </div>
  );
}
