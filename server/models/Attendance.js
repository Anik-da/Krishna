import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    index: true
  },
  studentId: {
    type: String,
    required: true,
    index: true
  },
  sessionDate: {
    type: String,
    index: true
  },
  status: {
    type: String,
    enum: ['present', 'absent'],
    required: true
  },
  markedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// CRITICAL: Unique compound index on sessionId + studentId to prevent duplicate attendance records
attendanceSchema.index({ sessionId: 1, studentId: 1 }, { unique: true });
attendanceSchema.index({ studentId: 1, sessionDate: -1 });

const Attendance = mongoose.model('Attendance', attendanceSchema);
export default Attendance;
