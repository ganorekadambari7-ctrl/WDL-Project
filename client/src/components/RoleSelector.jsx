import { BriefcaseBusiness, UserRound } from 'lucide-react';

const roles = [{ value: 'admin', label: 'Admin', icon: BriefcaseBusiness }, { value: 'employee', label: 'Employee', icon: UserRound }];

export default function RoleSelector({ value, onChange }) {
  return <div className="grid grid-cols-2 gap-3">{roles.map(({ value: role, label, icon: Icon }) => (
    <button key={role} type="button" onClick={() => onChange(role)} className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-medium transition ${value === role ? 'border-violet-600 bg-violet-50 text-violet-700 ring-1 ring-violet-600' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}>
      <Icon size={16} />{label}
    </button>
  ))}</div>;
}
