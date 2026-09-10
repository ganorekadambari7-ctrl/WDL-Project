import mongoose from 'mongoose';

const salarySchema = new mongoose.Schema(
  {
    employeeId: { type: String, required: true, trim: true, uppercase: true },
    basicSalary: { type: Number, required: true, min: 0 },
    bonus: { type: Number, default: 0, min: 0 },
    taxDeduction: { type: Number, default: 0, min: 0 },
    lateMarkDeduction: { type: Number, default: 0, min: 0 },
    totalDeductions: { type: Number, required: true, min: 0 },
    netSalary: { type: Number, required: true, min: 0 }
  },
  { timestamps: true }
);
export default mongoose.model('Salary', salarySchema);
