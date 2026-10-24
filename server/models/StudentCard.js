import mongoose from 'mongoose';

const studentCardSchema = new mongoose.Schema({
  studentId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    trim: true
  },
  studentMongoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student'
  },
  verificationToken: {
    type: String,
    required: true,
    unique: true,
    index: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['active', 'revoked'],
    default: 'active',
    index: true
  },
  cardVersion: {
    type: Number,
    default: 1
  },
  issueDate: {
    type: String,
    required: true,
    default: () => new Date().toISOString().split('T')[0]
  },
  lastReissuedAt: {
    type: Date
  },
  revokedAt: {
    type: Date
  },
  revocationReason: {
    type: String,
    default: ''
  },
  auditTrail: [
    {
      action: { type: String, required: true },
      performedBy: { type: String, default: 'SYSTEM' },
      timestamp: { type: Date, default: Date.now },
      notes: { type: String, default: '' }
    }
  ]
}, {
  timestamps: true
});

const StudentCard = mongoose.model('StudentCard', studentCardSchema);
export default StudentCard;
