import mongoose from 'mongoose';

const designationSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    grade: { type: String, required: true, trim: true, uppercase: true },
    baseSalary: { type: Number, required: true, min: 0 },
    description: { type: String, trim: true, default: '' },
    active: { type: Boolean, default: true }
  },
  { timestamps: true }
);

// Prevent duplicate designation title + grade combinations
designationSchema.index({ title: 1, grade: 1 }, { unique: true });

export default mongoose.model('Designation', designationSchema);
