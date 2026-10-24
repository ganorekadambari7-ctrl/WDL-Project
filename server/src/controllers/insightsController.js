import Employee from '../models/Employee.js';
import Salary from '../models/Salary.js';
import Attendance from '../models/Attendance.js';

export const getSalaryInsights = async (_req, res, next) => {
  try {
    const [employees, salaries, attendance] = await Promise.all([Employee.find(), Salary.find().sort({ createdAt: -1 }), Attendance.find()]);
    const latest = new Map(); salaries.forEach((salary) => { if (!latest.has(salary.employeeId)) latest.set(salary.employeeId, salary); });
    const salaryRecords = [...latest.values()]; const average = salaryRecords.length ? salaryRecords.reduce((sum, item) => sum + item.netSalary, 0) / salaryRecords.length : 0;
    const employeeNames = Object.fromEntries(employees.map((employee) => [employee.employeeId, employee.name]));
    const anomalies = salaryRecords.filter((item) => average && (item.netSalary > average * 1.35 || item.netSalary < average * 0.65)).map((item) => ({ employee: employeeNames[item.employeeId] || item.employeeId, amount: item.netSalary, type: item.netSalary > average ? 'above' : 'below' }));
    const bonuses = salaryRecords.filter((item) => item.bonus === 0).length;
    const present = attendance.filter((item) => item.status === 'present').length;
    const rate = attendance.length ? Math.round((present / attendance.length) * 100) : 0;
    let trend = 'steady';
    if (salaryRecords.length > 1) {
      const half = Math.floor(salaryRecords.length / 2);
      const recentAvg = salaryRecords.slice(0, half).reduce((s, r) => s + r.netSalary, 0) / (half || 1);
      const olderAvg = salaryRecords.slice(half).reduce((s, r) => s + r.netSalary, 0) / (salaryRecords.length - half || 1);
      if (recentAvg > olderAvg * 1.02) trend = 'upward';
      else if (recentAvg < olderAvg * 0.98) trend = 'downward';
    }

    const suggestions = [
      bonuses ? `${bonuses} employee${bonuses > 1 ? 's have' : ' has'} no recorded bonus. Review extra-work eligibility before the next pay run.` : 'Bonus allocation looks complete across the latest salary records.',
      attendance.length ? `Attendance is ${rate}%. Use late-mark deductions consistently to keep payroll fair and predictable.` : 'Start recording attendance to enable attendance-based payroll insights.',
      average ? `Current average net salary is ₹${Math.round(average).toLocaleString('en-IN')}. Review salaries outside the normal range before approval.` : 'Calculate salaries for employees to unlock salary benchmarks and anomaly detection.'
    ];
    res.json({ summary: { employeeCount: employees.length, averageSalary: Math.round(average), attendanceRate: rate, trend }, anomalies, suggestions });
  } catch (error) { next(error); }
};
