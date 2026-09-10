import { WalletCards } from 'lucide-react';

export default function AuthCard({ title, subtitle, children }) {
  return <main className="flex min-h-screen items-center justify-center bg-slate-100 p-5">
    <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-xl shadow-slate-200/70 sm:p-9">
      <div className="mb-8 flex items-center gap-3"><div className="grid size-11 place-items-center rounded-xl bg-violet-600 text-white"><WalletCards size={22} /></div><div><p className="font-semibold text-slate-900">Salary Pro</p><p className="text-xs text-slate-500">Salary Management System</p></div></div>
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1><p className="mt-2 text-sm leading-6 text-slate-500">{subtitle}</p>
      {children}
    </section>
  </main>;
}
