import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema({
  sessionDate: {
    type: String,
    required: [true, 'Session date is required'],
    unique: true,
    index: true,
    trim: true // e.g. '2026-10-11'
  },
  dayOfWeek: {
    type: String,
    required: true,
    trim: true // 'Saturday', 'Sunday', etc.
  },
  title: {
    type: String,
    default: function() {
      return `Bhagavad Gita Class — ${this.dayOfWeek || ''}`;
    },
    trim: true
  },
  topic: {
    type: String,
    default: '',
    trim: true
  },
  sessionStatus: {
    type: String,
    enum: ['scheduled', 'conducted', 'cancelled'],
    default: 'conducted',
    index: true
  },
  cancellationReason: {
    type: String,
    default: ''
  },
  presentCount: {
    type: Number,
    default: 0
  },
  absentCount: {
    type: Number,
    default: 0
  },
  totalRegistered: {
    type: Number,
    default: 0
  },
  conductedByName: {
    type: String,
    default: '',
    trim: true
  },
  attendanceRecordedBy: {
    type: String,
    default: '',
    trim: true
  },
  attendanceRecordedByName: {
    type: String,
    default: '',
    trim: true
  },
  attendanceRecordedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

sessionSchema.index({ sessionDate: 1, sessionStatus: 1 });

const Session = mongoose.model('Session', sessionSchema);
export default Session;
