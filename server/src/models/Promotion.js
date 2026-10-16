import mongoose from 'mongoose';

const promotionSchema = new mongoose.Schema(
  {
    employeeId: { type: String, required: true, uppercase: true, trim: true },
    employeeRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    employeeName: { type: String, required: true, trim: true },
    department: { type: String, trim: true, default: 'IT' },
    previousDesignation: { type: String, required: true, trim: true },
    previousGrade: { type: String, trim: true, default: '' },
    previousSalary: { type: Number, required: true, min: 0 },
    newDesignation: { type: String, required: true, trim: true },
    newGrade: { type: String, trim: true, default: '' },
    newSalary: { type: Number, required: true, min: 0 },
    incrementPercentage: { type: Number, default: 0 },
    effectiveDate: { type: Date, required: true },
    approvalDate: { type: Date, default: Date.now },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedByName: { type: String, default: 'Administrator' },
    remarks: { type: String, trim: true, default: '' },
    status: { type: String, enum: ['applied', 'scheduled'], default: 'applied' }
  },
  { timestamps: true }
);

export default mongoose.model('Promotion', promotionSchema);
