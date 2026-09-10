import mongoose from 'mongoose';

const leaveSchema = new mongoose.Schema(
  {
    employeeId: { type: String, required: true, trim: true, uppercase: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    leaveType: { type: String, enum: ['full-day', 'half-day'], required: true },
    reason: { type: String, required: true, trim: true, maxlength: 500 },
    lateMark: { type: Boolean, default: false },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);
export default mongoose.model('Leave', leaveSchema);
