import mongoose from 'mongoose';
import JanmashtamiSeason from '../models/JanmashtamiSeason.js';
import JanmashtamiAdjustment from '../models/JanmashtamiAdjustment.js';
import Session from '../models/Session.js';
import Attendance from '../models/Attendance.js';
import Student from '../models/Student.js';

// Default official season for 2027 (Active Seva Challenge spanning 2026-2027 classes)
const DEFAULT_2027_SEASON = {
  seasonId: 'JANM-2027',
  year: 2027,
  title: 'Krishna Janmashtami Seva Points Challenge 2027',
  eventDate: '2027-08-25',
  eventTime: '23:59:59',
  isDateVerified: true,
  calendarSourceUrl: 'https://www.iskconbangalore.org/calendar/',
  verificationDate: '2026-10-20',
  verifiedBy: 'ANIK',
  startDate: '2026-01-01',
  endDate: '2027-08-25',
  pointsRules: {
    pointsPerPresentClass: 10,
    pointsPerAbsentClass: 0,
    pointsPerUnrecordedClass: 0,
    pointsPerCancelledClass: 0,
    requireConfirmedConductor: false
  },
  status: 'active',
  prizes: [],
  publicDisplayNamePolicy: 'initial_masked',
  publicLeaderboardLimit: 10,
  notes: 'Official ISKCON Vaishnava Calendar Seva Points Challenge'
};

let inMemory2027Season = { ...DEFAULT_2027_SEASON };

// Helper: Mask name for public privacy (e.g. "Arjun Sharma" -> "Arjun S.")
export const maskStudentName = (fullName, policy = 'initial_masked') => {
  if (!fullName) return 'Student Seva';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  if (policy === 'first_name_only') return parts[0];
  if (policy === 'full_name') return fullName;
  // default: initial_masked
  const first = parts[0];
  const lastInitial = parts[parts.length - 1][0].toUpperCase();
  return `${first} ${lastInitial}.`;
};

// Ensure 2027 season exists as upcoming or active, while preserving 2026 historical records
export const getOrCreateActiveSeason = async () => {
  if (mongoose.connection.readyState !== 1) {
    throw new Error('MongoDB Atlas connection is offline. Cannot retrieve Janmashtami season.');
  }
  // First check if 2027 season exists
  let season2027 = await JanmashtamiSeason.findOne({ year: 2027 });
  if (!season2027) {
    // Preserve 2026 season as finalized/historical if it was previously active
    const season2026 = await JanmashtamiSeason.findOne({ year: 2026 });
    if (season2026 && season2026.status === 'active') {
      season2026.status = 'finalized';
      await season2026.save();
    }
    season2027 = await JanmashtamiSeason.create(DEFAULT_2027_SEASON);
  } else if (season2027.status === 'upcoming' || season2027.startDate > '2026-01-01') {
    season2027.status = 'active';
    season2027.startDate = '2026-01-01';
    season2027.isDateVerified = true;
    season2027.eventDate = '2027-09-04';
    await season2027.save();
  }
  return season2027;
};

// Calculate standings dynamically from genuine attendance records
export const calculateSeasonStandings = async (season) => {
  // If season is already finalized, return its stored permanent snapshot!
  if (season.status === 'finalized' && season.finalLeaderboardSnapshot?.length > 0) {
    return season.finalLeaderboardSnapshot;
  }

  if (mongoose.connection.readyState !== 1) {
    return [];
  }

  // 1. Get all active & enrolled students
  const students = await Student.find({ status: { $ne: 'archived' } }).lean();

  // 2. Find eligible conducted sessions within the season window
  const minDate = season.startDate && season.startDate < '2026-01-01' ? season.startDate : '2026-01-01';
  const allConductedSessions = await Session.find({
    $or: [{ sessionStatus: 'conducted' }, { status: 'conducted' }]
  }).lean();

  const eligibleSessions = allConductedSessions.filter(s => {
    const sDate = s.sessionDate || s.date;
    if (!sDate) return false;
    if (sDate < minDate) return false;
    if (season.endDate && sDate > season.endDate) return false;
    return true;
  });

  const eligibleDateSet = new Set();
  const eligibleIdSet = new Set();
  eligibleSessions.forEach(s => {
    const sDate = s.sessionDate || s.date;
    if (sDate) {
      eligibleDateSet.add(sDate);
      eligibleIdSet.add(`SES-${sDate}`);
      eligibleIdSet.add(sDate);
    }
    if (s._id) eligibleIdSet.add(String(s._id));
    if (s.id) eligibleIdSet.add(s.id);
  });

  // 3. Find attendance records for these eligible sessions
  const attendanceRecords = await Attendance.find({
    $or: [
      { sessionId: { $in: Array.from(eligibleIdSet) } },
      { sessionDate: { $in: Array.from(eligibleDateSet) } }
    ],
    status: 'present'
  }).lean();

  // Anti-duplication: Map<studentId, Set<sessionDate>>
  const studentPresentSessions = new Map();
  attendanceRecords.forEach(att => {
    const sDate = att.sessionDate || (att.sessionId ? att.sessionId.replace('SES-', '') : null);
    if (!studentPresentSessions.has(att.studentId)) {
      studentPresentSessions.set(att.studentId, new Set());
    }
    studentPresentSessions.get(att.studentId).add(sDate || att.sessionId);
  });

  // 4. Fetch admin manual adjustments
  const adjustments = await JanmashtamiAdjustment.find({ seasonId: season.seasonId }).lean();
  const studentAdjustmentMap = new Map();
  adjustments.forEach(adj => {
    const prev = studentAdjustmentMap.get(adj.studentId) || 0;
    studentAdjustmentMap.set(adj.studentId, prev + (adj.adjustmentPoints || 0));
  });

  const pointsPerPresent = season.pointsRules?.pointsPerPresentClass ?? 10;

  // 5. Build raw standings
  const rawStandings = students.map(st => {
    const sid = st.studentId || st.id || String(st._id);
    const attendedSet = studentPresentSessions.get(sid) || new Set();
    const classesAttended = attendedSet.size;
    const basePoints = classesAttended * pointsPerPresent;
    const adjustmentPoints = studentAdjustmentMap.get(sid) || 0;
    const totalPoints = Math.max(0, basePoints + adjustmentPoints);

    return {
      studentId: sid,
      name: st.name || 'Student',
      displayName: maskStudentName(st.name, season.publicDisplayNamePolicy),
      schoolName: st.schoolName || st.school || '',
      className: st.className || st.grade || '',
      classesAttended,
      basePoints,
      adjustmentPoints,
      totalPoints
    };
  });

  // 6. Only students who have genuinely earned points (totalPoints > 0) are competitively ranked
  const activeCompetitors = rawStandings.filter(st => st.totalPoints > 0);
  const unrankedStudents = rawStandings.filter(st => st.totalPoints <= 0);

  // Tie-breaking sorting for active competitors
  activeCompetitors.sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    if (b.classesAttended !== a.classesAttended) return b.classesAttended - a.classesAttended;
    return a.name.localeCompare(b.name);
  });

  // 7. Assign ranks ONLY to active competitors with points > 0
  const rankedCompetitors = activeCompetitors.map((st, idx) => {
    if (idx > 0) {
      const prev = activeCompetitors[idx - 1];
      if (st.totalPoints === prev.totalPoints && st.classesAttended === prev.classesAttended) {
        st.rank = prev.rank;
      } else {
        st.rank = idx + 1;
      }
    } else {
      st.rank = 1;
    }

    const prize = season.prizes?.find(p => p.position === st.rank);
    st.isWinner = Boolean(prize);
    st.prizeTitle = prize ? prize.title : null;

    return st;
  });

  // Students with 0 points are unranked and never marked as winners or prize candidates
  unrankedStudents.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  const processedUnranked = unrankedStudents.map(st => {
    st.rank = null;
    st.isWinner = false;
    st.prizeTitle = null;
    return st;
  });

  return [...rankedCompetitors, ...processedUnranked];
};

// GET /api/janmashtami/active
export const getActiveSeasonData = async (req, res) => {
  try {
    const season = await getOrCreateActiveSeason();
    const standings = await calculateSeasonStandings(season);
    
    // Check if competition deadline passed and auto-transition if needed
    let isDeadlinePassed = false;
    if (season.isDateVerified && season.endDate) {
      const nowIso = new Date().toISOString();
      const deadlineIso = `${season.endDate}T${season.eventTime || '23:59:59'}+05:30`;
      isDeadlinePassed = new Date(nowIso) >= new Date(deadlineIso);
    }

    res.status(200).json({
      success: true,
      season,
      isDeadlinePassed,
      totalParticipants: standings.length,
      standings
    });
  } catch (err) {
    console.error('[Janmashtami getActiveSeasonData Error]', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/janmashtami/public-leaderboard (Privacy-preserving, unauthenticated)
export const getPublicLeaderboard = async (req, res) => {
  try {
    const season = await getOrCreateActiveSeason();
    const standings = await calculateSeasonStandings(season);

    // Only students with genuine attendance points (> 0) appear on the public leaderboard
    const activeCompetitors = standings.filter(s => s.totalPoints > 0);
    const limit = season.publicLeaderboardLimit || 10;
    const publicStandings = activeCompetitors.slice(0, limit).map(s => ({
      rank: s.rank,
      displayName: s.displayName,
      totalPoints: s.totalPoints,
      classesAttended: s.classesAttended,
      isWinner: s.isWinner,
      prizeTitle: s.prizeTitle
    }));

    res.status(200).json({
      success: true,
      season: {
        seasonId: season.seasonId,
        year: season.year,
        title: season.title,
        eventDate: season.eventDate,
        isDateVerified: season.isDateVerified,
        calendarSourceUrl: season.calendarSourceUrl,
        verificationDate: season.verificationDate,
        status: season.status,
        pointsPerPresentClass: season.pointsRules?.pointsPerPresentClass || 10,
        prizes: season.prizes
      },
      leaderboard: publicStandings
    });
  } catch (err) {
    console.error('[Janmashtami getPublicLeaderboard Error]', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/janmashtami/seasons (All seasons, including archived)
export const getAllSeasons = async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(200).json({ success: true, seasons: [inMemory2027Season] });
    }
    await getOrCreateActiveSeason();
    const seasons = await JanmashtamiSeason.find().sort({ year: -1 }).lean();
    res.status(200).json({ success: true, seasons });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/janmashtami/season (Create or Update season configuration)
export const updateSeasonConfig = async (req, res) => {
  try {
    const { 
      seasonId, 
      eventDate, 
      isDateVerified, 
      calendarSourceUrl, 
      verificationDate, 
      pointsRules,
      prizes,
      publicDisplayNamePolicy,
      publicLeaderboardLimit
    } = req.body;

    if (!seasonId) {
      return res.status(400).json({ success: false, message: 'seasonId is required.' });
    }

    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ 
        success: false, 
        message: 'MongoDB Atlas is currently unavailable. Season configuration could not be saved to the database.' 
      });
    }

    const season = await JanmashtamiSeason.findOne({ seasonId });
    if (!season) {
      return res.status(404).json({ success: false, message: `Season ${seasonId} not found.` });
    }

    if (season.status === 'finalized' || season.status === 'archived') {
      return res.status(400).json({ 
        success: false, 
        message: 'Finalized or archived seasons cannot be modified without unfinalizing.' 
      });
    }

    if (eventDate) {
      season.eventDate = eventDate;
      season.endDate = eventDate;
    }
    if (typeof isDateVerified === 'boolean') season.isDateVerified = isDateVerified;
    if (calendarSourceUrl) season.calendarSourceUrl = calendarSourceUrl;
    if (verificationDate) season.verificationDate = verificationDate;
    if (pointsRules) season.pointsRules = { ...season.pointsRules, ...pointsRules };
    if (prizes) season.prizes = prizes;
    if (publicDisplayNamePolicy) season.publicDisplayNamePolicy = publicDisplayNamePolicy;
    if (publicLeaderboardLimit) season.publicLeaderboardLimit = Number(publicLeaderboardLimit);

    season.updatedAt = new Date();
    await season.save();

    res.status(200).json({
      success: true,
      message: 'Janmashtami season configuration updated successfully.',
      season
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/janmashtami/confirm-date (Review and confirm official festival date)
export const confirmSeasonDate = async (req, res) => {
  try {
    const { 
      seasonId = 'JANM-2027', 
      eventDate, 
      calendarSourceUrl = 'https://www.iskconbangalore.org/calendar/', 
      notes, 
      activateCompetition = true 
    } = req.body;

    if (!eventDate) {
      return res.status(400).json({ success: false, message: 'Official eventDate (YYYY-MM-DD) is required to confirm.' });
    }

    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'MongoDB Atlas is currently unavailable. Official date confirmation could not be saved to the database.'
      });
    }

    const season = await JanmashtamiSeason.findOne({ $or: [{ seasonId }, { year: 2027 }] });
    if (!season) {
      return res.status(404).json({ success: false, message: `Season ${seasonId} not found.` });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    season.eventDate = eventDate;
    season.endDate = eventDate;
    season.isDateVerified = true;
    season.calendarSourceUrl = calendarSourceUrl;
    season.verificationDate = todayStr;
    season.verifiedBy = req.admin?.username || 'ANIK';
    if (notes) season.notes = notes;
    if (activateCompetition) {
      season.status = 'active';
    }

    season.updatedAt = new Date();
    await season.save();

    try {
      await AdminActivity.create({
        adminId: req.admin?.username || 'ANIK',
        action: 'SYSTEM_SEED',
        recordType: 'system',
        recordId: season.seasonId,
        description: `Confirmed official Janmashtami 2027 date as ${eventDate} from ${calendarSourceUrl}. Competition ${activateCompetition ? 'activated' : 'saved'}.`
      });
    } catch (e) {}

    return res.status(200).json({
      success: true,
      message: `Official Janmashtami 2027 date verified and saved as ${eventDate}.`,
      season
    });
  } catch (err) {
    console.error('[confirmSeasonDate Error]', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/janmashtami/adjustment (Add manual adjustment with mandatory audit reason)
export const addPointAdjustment = async (req, res) => {
  try {
    const { seasonId, studentId, adjustmentPoints, reason } = req.body;
    const adminUser = req.user?.username || 'ANIK';
    const adminName = req.user?.name || 'Administrator';

    if (!seasonId || !studentId || adjustmentPoints === undefined) {
      return res.status(400).json({ success: false, message: 'seasonId, studentId, and adjustmentPoints are required.' });
    }

    if (!reason || reason.trim().length < 5) {
      return res.status(400).json({ 
        success: false, 
        message: 'A clear audit reason (minimum 5 characters) is mandatory for any manual point adjustment.' 
      });
    }

    const season = await JanmashtamiSeason.findOne({ seasonId });
    if (!season) return res.status(404).json({ success: false, message: 'Season not found.' });

    const student = await Student.findOne({ 
      $or: [{ studentId }, { id: studentId }] 
    });
    if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });

    const adjustment = await JanmashtamiAdjustment.create({
      seasonId,
      studentId: student.studentId || studentId,
      studentName: student.name,
      adjustmentPoints: Number(adjustmentPoints),
      reason: reason.trim(),
      adjustedBy: adminUser,
      adjustedByName: adminName
    });

    res.status(201).json({
      success: true,
      message: `Adjusted points for ${student.name} by ${adjustmentPoints > 0 ? '+' : ''}${adjustmentPoints}.`,
      adjustment
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/janmashtami/adjustments (View audit history)
export const getAdjustmentsHistory = async (req, res) => {
  try {
    const { seasonId } = req.query;
    const query = seasonId ? { seasonId } : {};
    const adjustments = await JanmashtamiAdjustment.find(query).sort({ createdAt: -1 }).lean();
    res.status(200).json({ success: true, adjustments });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/janmashtami/prizes (Update prize distribution status)
export const updatePrizeStatus = async (req, res) => {
  try {
    const { seasonId, position, distributionStatus, winnerStudentId, notes } = req.body;
    const adminUser = req.user?.username || 'ANIK';

    const season = await JanmashtamiSeason.findOne({ seasonId });
    if (!season) return res.status(404).json({ success: false, message: 'Season not found.' });

    const prize = season.prizes.find(p => p.position === Number(position));
    if (!prize) return res.status(404).json({ success: false, message: `Prize for position ${position} not found.` });

    if (distributionStatus) prize.distributionStatus = distributionStatus;
    if (distributionStatus === 'Distributed') {
      prize.distributedAt = new Date();
      prize.distributedBy = adminUser;
    }
    if (winnerStudentId) prize.winnerStudentId = winnerStudentId;
    if (notes !== undefined) prize.notes = notes;

    season.updatedAt = new Date();
    await season.save();

    res.status(200).json({
      success: true,
      message: `Prize distribution status for position ${position} updated to ${prize.distributionStatus}.`,
      season
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/janmashtami/finalize (Finalize season & idempotent auto-rollover)
export const finalizeSeason = async (req, res) => {
  try {
    const { seasonId } = req.body;
    const adminUser = req.user?.username || 'ANIK';

    const season = await JanmashtamiSeason.findOne({ seasonId });
    if (!season) return res.status(404).json({ success: false, message: 'Season not found.' });

    if (season.status === 'finalized') {
      return res.status(200).json({ 
        success: true, 
        message: 'Season was already finalized. Standings preserved.',
        season
      });
    }

    // 1. Calculate and lock permanent final leaderboard snapshot
    const finalStandings = await calculateSeasonStandings(season);
    season.finalLeaderboardSnapshot = finalStandings;
    season.status = 'finalized';
    season.finalizedAt = new Date();
    season.finalizedBy = adminUser;

    // Attach winners to prizes only if student has earned points (> 0)
    season.prizes.forEach(prize => {
      const winner = finalStandings.find(s => s.rank === prize.position && s.totalPoints > 0);
      if (winner) {
        prize.winnerStudentId = winner.studentId;
        prize.winnerStudentName = winner.name;
        prize.winnerPoints = winner.totalPoints;
      } else {
        prize.winnerStudentId = null;
        prize.winnerStudentName = null;
        prize.winnerPoints = 0;
      }
    });

    await season.save();

    // 2. Idempotent creation of next calendar year season with ZERO active points
    const nextYear = season.year + 1;
    const nextSeasonId = `JANM-${nextYear}`;
    let nextSeason = await JanmashtamiSeason.findOne({ year: nextYear });
    
    if (!nextSeason) {
      nextSeason = await JanmashtamiSeason.create({
        seasonId: nextSeasonId,
        year: nextYear,
        title: `Krishna Janmashtami Seva Points Challenge ${nextYear}`,
        eventDate: `${nextYear}-08-25`, // Tentative placeholder awaiting official verification
        eventTime: '23:59:59',
        isDateVerified: false, // Flagged unverified until published on ISKCON Bangalore calendar
        calendarSourceUrl: 'https://www.iskconbangalore.org/calendar/',
        verificationDate: 'Awaiting official calendar publication',
        verifiedBy: adminUser,
        startDate: `${nextYear}-01-01`,
        endDate: `${nextYear}-08-25`,
        pointsRules: {
          pointsPerPresentClass: season.pointsRules?.pointsPerPresentClass || 10,
          pointsPerAbsentClass: 0,
          pointsPerUnrecordedClass: 0,
          pointsPerCancelledClass: 0,
          requireConfirmedConductor: true
        },
        status: 'active',
        prizes: season.prizes.map(p => ({
          position: p.position,
          title: p.title,
          description: p.description,
          distributionStatus: 'Pending'
        }))
      });
    }

    res.status(200).json({
      success: true,
      message: `Season ${season.seasonId} successfully finalized and archived! Next season ${nextSeason.seasonId} initialized with zero active points.`,
      finalizedSeason: season,
      nextSeason
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
