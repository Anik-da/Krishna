import mongoose from 'mongoose';

const PrizeSchema = new mongoose.Schema({
  position: { type: Number, required: true }, // 1, 2, 3, etc.
  title: { type: String, required: true }, // e.g. "1st Prize — Sri Krishna Baladeva Award"
  description: { type: String, default: '' }, // e.g. "Gita As It Is Luxury Edition + Devotional Gift Box"
  winnerStudentId: { type: String, default: null },
  winnerStudentName: { type: String, default: null },
  winnerPoints: { type: Number, default: 0 },
  distributionStatus: { 
    type: String, 
    enum: ['Pending', 'Prepared', 'Distributed'], 
    default: 'Pending' 
  },
  distributedAt: { type: Date, default: null },
  distributedBy: { type: String, default: null },
  notes: { type: String, default: '' }
}, { _id: true });

const LeaderboardSnapshotSchema = new mongoose.Schema({
  rank: { type: Number, required: true },
  studentId: { type: String, required: true },
  name: { type: String, required: true },
  displayName: { type: String, required: true },
  schoolName: { type: String, default: '' },
  className: { type: String, default: '' },
  classesAttended: { type: Number, default: 0 },
  basePoints: { type: Number, default: 0 },
  adjustmentPoints: { type: Number, default: 0 },
  totalPoints: { type: Number, default: 0 },
  isWinner: { type: Boolean, default: false },
  prizeTitle: { type: String, default: null }
}, { _id: false });

const JanmashtamiSeasonSchema = new mongoose.Schema({
  seasonId: { 
    type: String, 
    required: true, 
    unique: true, 
    trim: true 
  }, // e.g. "JANM-2026"
  year: { 
    type: Number, 
    required: true, 
    unique: true 
  }, // e.g. 2026
  title: { 
    type: String, 
    default: 'Krishna Janmashtami Seva Points Challenge' 
  },
  
  // Official ISKCON Bangalore Vaishnava Calendar Verification
  eventDate: { 
    type: String, 
    default: null 
  }, // e.g. "2027-08-25" (YYYY-MM-DD) once confirmed
  eventTime: { 
    type: String, 
    default: '23:59:59' 
  }, // Local Asia/Kolkata boundary
  isDateVerified: { 
    type: Boolean, 
    default: false 
  },
  calendarSourceUrl: { 
    type: String, 
    default: 'https://www.iskconbangalore.org/calendar/' 
  },
  verificationDate: { 
    type: String, 
    default: null 
  }, // Date on which admin verified with official calendar
  verifiedBy: { 
    type: String, 
    default: null 
  },
  
  // Season Timeline
  startDate: { 
    type: String, 
    default: '2027-01-01' 
  },
  endDate: { 
    type: String, 
    default: null 
  },
  
  // Points Rules
  pointsRules: {
    pointsPerPresentClass: { type: Number, default: 10, min: 0 },
    pointsPerAbsentClass: { type: Number, default: 0, min: 0 },
    pointsPerUnrecordedClass: { type: Number, default: 0, min: 0 },
    pointsPerCancelledClass: { type: Number, default: 0, min: 0 },
    requireConfirmedConductor: { type: Boolean, default: true }
  },

  // Competition Status
  status: { 
    type: String, 
    enum: ['upcoming', 'active', 'finalized', 'archived'], 
    default: 'active' 
  },
  
  // Prizes configuration
  prizes: [PrizeSchema],

  // Finalized snapshot
  finalizedAt: { type: Date, default: null },
  finalizedBy: { type: String, default: null },
  finalLeaderboardSnapshot: [LeaderboardSnapshotSchema],
  
  // Display policy for public leaderboard
  publicDisplayNamePolicy: {
    type: String,
    enum: ['initial_masked', 'first_name_only', 'full_name'],
    default: 'initial_masked' // e.g. "Arjun S."
  },
  publicLeaderboardLimit: {
    type: Number,
    default: 10
  },

  notes: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

JanmashtamiSeasonSchema.index({ year: 1, status: 1 });

const JanmashtamiSeason = mongoose.model('JanmashtamiSeason', JanmashtamiSeasonSchema);
export default JanmashtamiSeason;
