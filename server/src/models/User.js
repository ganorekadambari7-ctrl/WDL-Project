import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    username: { type: String, unique: true, sparse: true, trim: true, maxlength: 20 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6, select: false },
    role: { type: String, enum: ['admin', 'employee'], default: 'employee' },
    department: { type: String, trim: true },
    employeeId: { type: String, trim: true },
    phone: { type: String, trim: true },
    jobTitle: { type: String, trim: true },
    dateOfJoining: { type: Date },
    address: { type: String, trim: true, maxlength: 500 },
    profilePicture: { type: String }
  },
  { timestamps: true }
);

export default mongoose.model('User', userSchema);
