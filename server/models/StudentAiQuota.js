import mongoose from 'mongoose';

const studentAiQuotaSchema = new mongoose.Schema({
  studentId: {
    type: String,
    required: true,
    index: true,
    trim: true
  },
  date: {
    type: String, // 'YYYY-MM-DD' in Asia/Kolkata timezone
    required: true,
    index: true,
    trim: true
  },
  used: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  history: [{
    timestamp: {
      type: Date,
      default: Date.now
    },
    questionType: {
      type: String,
      enum: ['gita', 'attendance'],
      required: true
    },
    questionPreview: {
      type: String,
      trim: true
    }
  }]
}, {
  timestamps: true
});

// CRITICAL: Unique compound index ensuring one quota record per student per calendar date
studentAiQuotaSchema.index({ studentId: 1, date: 1 }, { unique: true });

const StudentAiQuota = mongoose.model('StudentAiQuota', studentAiQuotaSchema);
export default StudentAiQuota;
