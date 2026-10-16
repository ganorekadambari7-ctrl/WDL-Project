import { Building2 } from 'lucide-react';

export default function AuthCard({ title, subtitle, children }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-5">
      <div className="w-full max-w-md">

        {/* Brand header */}
        <div className="mb-7 flex items-center gap-3.5">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-indigo-600 shadow-lg shadow-indigo-600/30">
            <Building2 size={22} className="text-white" />
          </div>
          <div>
            <p className="text-base font-bold tracking-tight text-slate-900">Salary Pro</p>
            <p className="text-xs text-slate-500">Payroll Management System</p>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-lg shadow-slate-900/[0.06]">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">{subtitle}</p>
          {children}
        </div>

        {/* Footer */}
        <p className="mt-5 text-center text-xs text-slate-400">
          © {new Date().getFullYear()} Salary Pro · Secure payroll platform
        </p>
      </div>
    </div>
  );
}
