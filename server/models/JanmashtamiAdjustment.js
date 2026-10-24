import mongoose from 'mongoose';

const JanmashtamiAdjustmentSchema = new mongoose.Schema({
  seasonId: { 
    type: String, 
    required: true, 
    index: true 
  },
  studentId: { 
    type: String, 
    required: true, 
    index: true 
  },
  studentName: { 
    type: String, 
    required: true 
  },
  adjustmentPoints: { 
    type: Number, 
    required: true 
  }, // can be positive or negative
  reason: { 
    type: String, 
    required: true, 
    minlength: 5,
    trim: true 
  }, // Mandatory explanation for audit trail
  adjustedBy: { 
    type: String, 
    required: true 
  }, // Admin username e.g. "ANIK"
  adjustedByName: { 
    type: String, 
    default: 'Administrator' 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

JanmashtamiAdjustmentSchema.index({ seasonId: 1, studentId: 1 });

const JanmashtamiAdjustment = mongoose.model('JanmashtamiAdjustment', JanmashtamiAdjustmentSchema);
export default JanmashtamiAdjustment;
