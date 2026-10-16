import mongoose from 'mongoose';

const leaveSchema = new mongoose.Schema(
  {
    employeeId: { type: String, required: true, trim: true, uppercase: true },
    employeeName: { type: String, trim: true },
    employeeRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    leaveType: { type: String, enum: ['full-day', 'half-day'], required: true },
    reason: { type: String, required: true, trim: true, maxlength: 500 },
    lateMark: { type: Boolean, default: false },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    remarks: { type: String, trim: true, default: '' },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date }
  },
  { timestamps: true }
);
export default mongoose.model('Leave', leaveSchema);
