import mongoose from 'mongoose';

const adminActivitySchema = new mongoose.Schema({
  adminId: {
    type: String,
    required: true,
    default: 'ANIK'
  },
  action: {
    type: String,
    required: true,
    enum: [
      'STUDENT_REGISTERED',
      'STUDENT_EDITED',
      'STUDENT_ARCHIVED',
      'STUDENT_DELETED',
      'ATTENDANCE_SUBMITTED',
      'ATTENDANCE_CORRECTED',
      'SESSION_CANCELLED',
      'SESSION_RESTORED',
      'ADMIN_LOGIN',
      'SYSTEM_SEED'
    ]
  },
  recordType: {
    type: String,
    required: true,
    enum: ['student', 'session', 'attendance', 'system', 'auth']
  },
  recordId: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

const AdminActivity = mongoose.model('AdminActivity', adminActivitySchema);
export default AdminActivity;
