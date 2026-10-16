import mongoose from 'mongoose';

const designationSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    department: { type: String, required: true, trim: true, default: 'IT' },
    grade: { type: String, required: true, trim: true, uppercase: true },
    level: { type: Number, required: true, min: 0, default: 1 }, // Numeric rank for comparison
    baseSalary: { type: Number, required: true, min: 0 },
    description: { type: String, trim: true, default: '' },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Prevent duplicate designation in the same department and grade
designationSchema.index({ title: 1, department: 1, grade: 1 }, { unique: true });

export default mongoose.model('Designation', designationSchema);
