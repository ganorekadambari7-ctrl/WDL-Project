import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import AppLayout from './components/AppLayout';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import EmployeesPage from './pages/EmployeesPage';
import AttendancePage from './pages/AttendancePage';
import LeavePage from './pages/LeavePage';
import PayrollPage from './pages/PayrollPage';
import ReportsPage from './pages/ReportsPage';
import UmlPage from './pages/UmlPage';
import SettingsPage from './pages/SettingsPage';
import InsightsPage from './pages/InsightsPage';
import PlaceholderPage from './pages/PlaceholderPage';

function Protected({ children }) { return useAuth().user ? <AppLayout>{children}</AppLayout> : <Navigate to="/login" replace />; }

/** Redirect employees away from admin-only routes */
function AdminOnly({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/" replace />;
  return <AppLayout>{children}</AppLayout>;
}

const page = (title) => <Protected><PlaceholderPage title={title}/></Protected>;

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<AuthPage mode="login"/>}/>
      <Route path="/signup" element={<AuthPage mode="signup"/>}/>
      <Route path="/" element={<Protected><Dashboard/></Protected>}/>
      <Route path="/employees" element={<AdminOnly><EmployeesPage/></AdminOnly>}/>
      <Route path="/attendance" element={<Protected><AttendancePage/></Protected>}/>
      <Route path="/leaves" element={<Protected><LeavePage/></Protected>}/>
      <Route path="/payroll" element={<Protected><PayrollPage/></Protected>}/>
      <Route path="/reports" element={<AdminOnly><ReportsPage/></AdminOnly>}/>
      <Route path="/insights" element={<AdminOnly><InsightsPage/></AdminOnly>}/>
      <Route path="/uml" element={<Protected><UmlPage/></Protected>}/>
      <Route path="/settings" element={<Protected><SettingsPage/></Protected>}/>
      <Route path="*" element={<Navigate to="/" replace/>}/>
    </Routes>
  );
}
