import mongoose from 'mongoose';

const courseSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      index: true,
    },
    employeeId: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    employeeName: {
      type: String,
      trim: true,
      default: '',
    },
    title: {
      type: String,
      required: [true, 'Course title is required'],
      trim: true,
      maxlength: 200,
    },
    platform: {
      type: String,
      required: [true, 'Course platform/provider is required'],
      trim: true,
      maxlength: 100,
    },
    courseUrl: {
      type: String,
      trim: true,
      default: '',
    },
    startDate: {
      type: Date,
    },
    endDate: {
      type: Date,
    },
    progress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    status: {
      type: String,
      enum: ['enrolled', 'in-progress', 'completed', 'dropped'],
      default: 'enrolled',
    },
    certificateType: {
      type: String,
      enum: ['url', 'file', 'none'],
      default: 'none',
    },
    certificateUrl: {
      type: String,
      trim: true,
      default: '',
    },
    certificateFileName: {
      type: String,
      trim: true,
      default: '',
    },
    certificateSubmittedAt: {
      type: Date,
    },
    verificationStatus: {
      type: String,
      enum: ['not_submitted', 'pending_review', 'verified', 'rejected'],
      default: 'not_submitted',
      index: true,
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    verifiedAt: {
      type: Date,
    },
    verificationRemarks: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { timestamps: true }
);

courseSchema.index({ employeeId: 1, createdAt: -1 });

export default mongoose.model('Course', courseSchema);
