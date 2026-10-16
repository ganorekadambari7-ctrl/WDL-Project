import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

const BLANK = {
  name: '',
  employeeId: '',
  dob: '',
  education: '',
  experience: '',
  basicSalary: '',
};

const FIELDS = [
  { key: 'name', label: 'Full name', type: 'text', placeholder: 'e.g. Priya Sharma', span: 2 },
  { key: 'employeeId', label: 'Employee ID', type: 'text', placeholder: 'e.g. EMP-001' },
  { key: 'dob', label: 'Date of birth', type: 'date' },
  { key: 'education', label: 'Education', type: 'text', placeholder: 'e.g. B.Tech, MBA' },
  { key: 'experience', label: 'Experience (years)', type: 'number', placeholder: '0' },
  { key: 'basicSalary', label: 'Basic salary (₹)', type: 'number', placeholder: '0' },
];

export default function EmployeeForm({ employee, onSave, onClose, saving }) {
  const [form, setForm] = useState(BLANK);
  const [error, setError] = useState('');

  useEffect(() => {
    setForm(
      employee
        ? {
            ...employee,
            dob: employee.dob?.slice(0, 10) ?? '',
            experience: String(employee.experience),
            basicSalary: String(employee.basicSalary),
          }
        : BLANK
    );
    setError('');
  }, [employee]);

  const update = (key, val) =>
    setForm((cur) => ({ ...cur, [key]: val }));

  const submit = (e) => {
    e.preventDefault();
    setError('');
    if (Object.values(form).some((v) => v === ''))
      return setError('Please complete every field before saving.');
    if (Number(form.experience) < 0 || Number(form.basicSalary) < 0)
      return setError('Experience and salary cannot be negative.');
    onSave({ ...form, experience: Number(form.experience), basicSalary: Number(form.basicSalary) });
  };

  return (
    <div className="sp-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sp-modal">

        {/* Modal header */}
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-100 bg-white px-6 py-5">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              {employee ? 'Edit employee' : 'Add new employee'}
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
              {employee
                ? "Update the employee's professional details."
                : 'Fill in the details to create an employee record.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form body */}
        <form onSubmit={submit} className="px-6 py-6">
          <div className="grid grid-cols-2 gap-4">
            {FIELDS.map(({ key, label, type, placeholder, span }) => (
              <label
                key={key}
                className={`flex flex-col gap-1.5 text-sm font-medium text-slate-700 ${span === 2 ? 'col-span-2' : ''}`}
              >
                {label}
                <input
                  type={type}
                  min={type === 'number' ? '0' : undefined}
                  value={form[key]}
                  onChange={(e) => update(key, e.target.value)}
                  placeholder={placeholder}
                  className="sp-input font-normal"
                />
              </label>
            ))}
          </div>

          {/* Error */}
          {error && (
            <p className="mt-4 sp-notice-error">{error}</p>
          )}

          {/* Actions */}
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="sp-btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="sp-btn-primary"
            >
              {saving ? 'Saving…' : employee ? 'Save changes' : 'Add employee'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
