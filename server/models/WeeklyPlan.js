import mongoose from 'mongoose';

const weeklyPlanSchema = new mongoose.Schema({
  weekKey: {
    type: String, // e.g. "2026-W42"
    required: [true, 'Week identifier is required'],
    unique: true,
    index: true,
    trim: true
  },
  year: { type: Number, required: true },
  weekNumber: { type: Number, required: true },
  saturdayDate: { type: String, required: true }, // e.g. "2026-10-17"
  sundayDate: { type: String, required: true },   // e.g. "2026-10-18"
  
  status: {
    type: String,
    enum: ['scheduled', 'no_class', 'undecided', 'cancelled'],
    default: 'undecided',
    index: true
  },

  // If status is 'scheduled':
  selectedDay: {
    type: String,
    enum: ['Saturday', 'Sunday', null],
    default: null
  },
  scheduledDate: {
    type: String,
    default: '' // Matches either saturdayDate or sundayDate
  },
  scheduledTime: {
    type: String,
    default: '06:00 PM – 08:00 PM',
    trim: true
  },
  location: {
    type: String,
    default: '',
    trim: true
  },
  topic: {
    type: String,
    default: '',
    trim: true
  },
  publicAnnouncement: {
    type: String,
    default: '',
    trim: true
  },
  
  // If status is 'cancelled':
  cancellationReason: {
    type: String,
    default: '',
    trim: true
  },
  cancelledAt: {
    type: Date,
    default: null
  },

  // Deadline for confirmation
  deadlineNote: {
    type: String,
    default: 'Confirm by Friday 06:00 PM'
  },
  
  confirmedBy: {
    type: String,
    default: ''
  },
  autoClosed: {
    type: Boolean,
    default: false
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

const WeeklyPlan = mongoose.model('WeeklyPlan', weeklyPlanSchema);
export default WeeklyPlan;
