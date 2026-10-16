import { BriefcaseBusiness, UserRound } from 'lucide-react';

const ROLES = [
  { value: 'admin', label: 'Admin', icon: BriefcaseBusiness, desc: 'Manage payroll & team' },
  { value: 'employee', label: 'Employee', icon: UserRound, desc: 'View personal records' },
];

export default function RoleSelector({ value, onChange }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {ROLES.map(({ value: role, label, icon: Icon, desc }) => {
        const active = value === role;
        return (
          <button
            key={role}
            type="button"
            onClick={() => onChange(role)}
            className={`flex flex-col items-start gap-1.5 rounded-xl border px-4 py-3.5 text-left
              transition-all duration-150
              ${active
                ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500/50'
                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
              }`}
          >
            <Icon
              size={16}
              className={active ? 'text-indigo-600' : 'text-slate-400'}
            />
            <div>
              <p className={`text-sm font-semibold ${active ? 'text-indigo-700' : 'text-slate-700'}`}>
                {label}
              </p>
              <p className={`text-[11px] leading-tight ${active ? 'text-indigo-500' : 'text-slate-400'}`}>
                {desc}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
