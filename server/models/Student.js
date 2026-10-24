import mongoose from 'mongoose';

const studentSchema = new mongoose.Schema({
  studentId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    trim: true
  },
  name: {
    type: String,
    required: [true, 'Student full name is required'],
    trim: true
  },
  className: {
    type: String,
    required: [true, 'Class or grade is required'],
    trim: true
  },
  whatsappNumber: {
    type: String,
    required: [true, 'WhatsApp number is required'],
    trim: true
  },
  schoolName: {
    type: String,
    required: [true, 'School name is required'],
    trim: true
  },
  registrationDate: {
    type: String,
    required: true,
    default: () => new Date().toISOString().split('T')[0]
  },
  status: {
    type: String,
    enum: ['active', 'archived'],
    default: 'active',
    index: true
  },
  notes: {
    type: String,
    default: '',
    trim: true
  }
}, {
  timestamps: true
});

// Index for searching and filtering
studentSchema.index({ name: 1, className: 1 });
studentSchema.index({ schoolName: 1, className: 1 });
studentSchema.index({ name: 'text', schoolName: 'text', whatsappNumber: 'text' });

const Student = mongoose.model('Student', studentSchema);
export default Student;
