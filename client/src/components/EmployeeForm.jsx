import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { departmentApi, promotionApi } from '../services/api';

const BLANK = {
  name: '',
  employeeId: '',
  department: 'IT',
  designation: '',
  grade: '',
  dob: '',
  education: '',
  experience: '',
  basicSalary: '',
};

export default function EmployeeForm({ employee, onSave, onClose, saving }) {
  const [form, setForm] = useState(BLANK);
  const [error, setError] = useState('');
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);

  useEffect(() => {
    Promise.all([
      departmentApi.list(),
      promotionApi.designations(),
    ])
      .then(([depts, desigs]) => {
        setDepartments(depts);
        setDesignations(desigs);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setForm(
      employee
        ? {
            ...employee,
            department: employee.department || 'IT',
            designation: employee.designation || '',
            grade: employee.grade || '',
            dob: employee.dob?.slice(0, 10) ?? '',
            experience: String(employee.experience ?? ''),
            basicSalary: String(employee.basicSalary ?? ''),
          }
        : { ...BLANK, department: departments[0]?.name || 'IT' }
    );
    setError('');
  }, [employee, departments]);

  const update = (key, val) => setForm((cur) => ({ ...cur, [key]: val }));

  const handleDepartmentChange = (deptName) => {
    setForm((cur) => {
      // Find matching designation in this new department
      const matching = designations.filter((d) => d.department === deptName);
      const firstDesig = matching[0];
      return {
        ...cur,
        department: deptName,
        designation: firstDesig ? firstDesig.title : cur.designation,
        grade: firstDesig ? firstDesig.grade : cur.grade,
        basicSalary: firstDesig && !employee ? String(firstDesig.baseSalary) : cur.basicSalary,
      };
    });
  };

  const handleDesignationChange = (desigTitle) => {
    const found = designations.find(
      (d) => d.title === desigTitle && d.department === form.department
    ) || designations.find((d) => d.title === desigTitle);

    setForm((cur) => ({
      ...cur,
      designation: desigTitle,
      grade: found ? found.grade : cur.grade,
      basicSalary: found && !employee ? String(found.baseSalary) : cur.basicSalary,
    }));
  };

  const submit = (e) => {
    e.preventDefault();
    setError('');
    if (!form.name || !form.employeeId || !form.dob || !form.education || form.experience === '' || form.basicSalary === '') {
      return setError('Please complete all required fields before saving.');
    }
    if (Number(form.experience) < 0 || Number(form.basicSalary) < 0) {
      return setError('Experience and salary cannot be negative.');
    }
    onSave({
      ...form,
      department: form.department || 'IT',
      designation: form.designation || 'Unassigned',
      grade: form.grade || '',
      experience: Number(form.experience),
      basicSalary: Number(form.basicSalary),
    });
  };

  // Filter designations for selected department
  const departmentDesignations = designations.filter((d) => d.department === form.department);

  return (
    <div className="sp-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sp-modal max-w-xl">
        {/* Modal header */}
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-100 bg-white px-6 py-5">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              {employee ? 'Edit employee' : 'Add new employee'}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {employee
                ? "Update the employee's professional and departmental details."
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
        <form onSubmit={submit} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3.5">
            {/* Full Name */}
            <label className="col-span-2 flex flex-col gap-1 text-xs font-semibold uppercase tracking-wider text-slate-700">
              Full Name *
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                placeholder="e.g. Priya Sharma"
                className="sp-input font-normal text-xs"
              />
            </label>

            {/* Employee ID */}
            <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wider text-slate-700">
              Employee ID *
              <input
                type="text"
                required
                value={form.employeeId}
                onChange={(e) => update('employeeId', e.target.value.toUpperCase())}
                placeholder="e.g. EMP-001"
                className="sp-input font-mono font-normal uppercase text-xs"
              />
            </label>

            {/* Department */}
            <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wider text-slate-700">
              Department *
              <select
                value={form.department}
                onChange={(e) => handleDepartmentChange(e.target.value)}
                className="sp-input font-normal text-xs"
              >
                {departments.map((d) => (
                  <option key={d._id} value={d.name}>{d.name}</option>
                ))}
              </select>
            </label>

            {/* Designation */}
            <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wider text-slate-700">
              Designation
              <select
                value={form.designation}
                onChange={(e) => handleDesignationChange(e.target.value)}
                className="sp-input font-normal text-xs"
              >
                <option value="Unassigned">Unassigned</option>
                {departmentDesignations.map((d) => (
                  <option key={d._id} value={d.title}>
                    {d.title} ({d.grade})
                  </option>
                ))}
              </select>
            </label>

            {/* Grade Code */}
            <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wider text-slate-700">
              Grade Code
              <input
                type="text"
                value={form.grade}
                onChange={(e) => update('grade', e.target.value.toUpperCase())}
                placeholder="e.g. L2, H1"
                className="sp-input font-mono font-normal uppercase text-xs"
              />
            </label>

            {/* Date of Birth */}
            <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wider text-slate-700">
              Date of Birth *
              <input
                type="date"
                required
                value={form.dob}
                onChange={(e) => update('dob', e.target.value)}
                className="sp-input font-normal text-xs"
              />
            </label>

            {/* Education */}
            <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wider text-slate-700">
              Education *
              <input
                type="text"
                required
                value={form.education}
                onChange={(e) => update('education', e.target.value)}
                placeholder="e.g. B.Tech, MBA"
                className="sp-input font-normal text-xs"
              />
            </label>

            {/* Experience */}
            <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wider text-slate-700">
              Experience (Years) *
              <input
                type="number"
                min="0"
                max="70"
                required
                value={form.experience}
                onChange={(e) => update('experience', e.target.value)}
                placeholder="0"
                className="sp-input font-normal text-xs"
              />
            </label>

            {/* Basic Salary */}
            <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wider text-slate-700">
              Basic Salary (₹) *
              <input
                type="number"
                min="0"
                required
                value={form.basicSalary}
                onChange={(e) => update('basicSalary', e.target.value)}
                placeholder="e.g. 65000"
                className="sp-input font-normal text-xs"
              />
            </label>
          </div>

          {error && <p className="sp-notice-error text-xs">{error}</p>}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="sp-btn-secondary text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="sp-btn-primary text-xs"
            >
              {saving ? 'Saving…' : employee ? 'Save changes' : 'Add employee'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
