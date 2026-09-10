import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema(
  {
    employeeId: { type: String, required: true, trim: true, uppercase: true },
    date: { type: Date, required: true },
    status: { type: String, enum: ['present', 'absent'], required: true }
  },
  { timestamps: true }
);
attendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });

export default mongoose.model('Attendance', attendanceSchema);
