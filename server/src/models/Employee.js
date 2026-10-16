import mongoose from 'mongoose';

const employeeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    employeeId: { type: String, required: true, unique: true, trim: true, uppercase: true },
    dob: { type: Date, required: true },
    education: { type: String, required: true, trim: true },
    experience: { type: Number, required: true, min: 0, max: 70 },
    basicSalary: { type: Number, required: true, min: 0 },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

export default mongoose.model('Employee', employeeSchema);
