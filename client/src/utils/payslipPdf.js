import { jsPDF } from 'jspdf';

const money = (value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);

export function downloadPayslip(employee, salary) {
  if (!salary) return;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const payDate = salary.month ? new Date(`${salary.month}-01T00:00:00Z`) : new Date(salary.createdAt || Date.now());
  const period = payDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  const rule = (y) => { doc.setDrawColor(226, 232, 240); doc.line(20, y, 190, y); };
  doc.setFillColor(76, 29, 149); doc.rect(0, 0, 210, 43, 'F');
  doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(23); doc.text('SALARY PRO', 20, 21); doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.text(`PAYSLIP | ${period.toUpperCase()}`, 20, 30);
  doc.setTextColor(15, 23, 42); doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.text('Employee details', 20, 59); doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
  doc.setTextColor(71, 85, 105); doc.text('Employee name', 20, 69); doc.text('Employee ID', 110, 69); doc.setTextColor(15, 23, 42); doc.setFont('helvetica', 'bold'); doc.text(employee?.name || salary.employeeName || 'Employee', 20, 76); doc.text(employee?.employeeId || salary.employeeId, 110, 76); rule(84);
  doc.setFontSize(15); doc.text('Salary breakdown', 20, 99); doc.setFontSize(10); doc.setFont('helvetica', 'normal');
  const rows = [['Basic salary', money(salary.basicSalary), false], ['Bonus - extra work', money(salary.bonus), false], ['Tax deduction', `- ${money(salary.taxDeduction)}`, true], ['Late marks deduction', `- ${money(salary.lateMarkDeduction)}`, true]];
  let y = 112; rows.forEach(([label, value, deduction]) => { doc.setTextColor(71, 85, 105); doc.text(label, 22, y); doc.setTextColor(deduction ? 225 : 15, deduction ? 29 : 23, deduction ? 72 : 42); doc.text(value, 185, y, { align: 'right' }); y += 11; });
  doc.setFillColor(245, 243, 255); doc.roundedRect(20, 159, 170, 28, 4, 4, 'F'); doc.setTextColor(91, 33, 182); doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.text('NET SALARY', 28, 171); doc.setFontSize(18); doc.text(money(salary.netSalary), 182, 173, { align: 'right' });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(100, 116, 139); doc.text('This is a computer-generated payslip from Salary Pro.', 20, 272); doc.text(`Generated ${new Date().toLocaleDateString('en-IN')}`, 190, 272, { align: 'right' });
  const empId = employee?.employeeId || salary.employeeId || 'EMP';
  const fileDate = salary.month || new Date(salary.createdAt || Date.now()).toISOString().slice(0, 7);
  doc.save(`Payslip-${empId}-${fileDate}.pdf`);
}
