import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import Student from '../models/Student.js';
import Session from '../models/Session.js';
import Attendance from '../models/Attendance.js';
import StudentAiQuota from '../models/StudentAiQuota.js';
import { getNextStudentId } from '../models/Counter.js';
import { getOrCreateStudentCard } from '../services/cardService.js';
import { searchGitaVerses } from '../data/gitaDataset.js';
import { 
  answerGitaQuestion, 
  analyzeAttendanceInsights,
  isGreetingOrCasual,
  getGreetingResponse
} from '../services/aiService.js';

const JWT_SECRET = process.env.JWT_SECRET || 'krishna_kripa_sacred_jwt_secret_2026_dev_key';

// Helper: Get calendar date in application configured timezone (Asia/Kolkata / IST)
export const getISTDateString = () => {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
  } catch (e) {
    return new Date().toISOString().split('T')[0];
  }
};

// 1. POST /api/student/portal/login
export const studentLogin = async (req, res) => {
  try {
    const { name, className, studentId } = req.body;

    if (!name || !name.trim() || !className || !className.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both your Full Name and Class/Grade.'
      });
    }

    const cleanName = name.trim();
    const cleanClass = className.trim();

    // Query active students matching name and class (case-insensitive)
    const nameRegex = new RegExp(`^${cleanName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
    const classRegex = new RegExp(`^${cleanClass.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');

    const query = {
      name: nameRegex,
      className: classRegex,
      status: 'active'
    };

    if (studentId && studentId.trim()) {
      query.studentId = studentId.trim();
    }

    const matches = await Student.find(query);

    if (!matches || matches.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'No active student record matched the provided name and class. Please check your spelling.'
      });
    }

    // Handle duplicate names in the same class
    if (matches.length > 1 && !studentId) {
      // Disambiguation candidates without exposing sensitive information (no whatsapp/phone)
      const candidates = matches.map(s => ({
        studentId: s.studentId,
        schoolName: s.schoolName,
        className: s.className,
        name: s.name
      }));

      return res.status(200).json({
        success: true,
        multipleMatches: true,
        message: 'Multiple students match this name and class. Please select your record.',
        candidates
      });
    }

    const student = matches[0];

    // Issue Student JWT (Role: student only, strictly separated from admin)
    const token = jwt.sign(
      {
        role: 'student',
        studentId: student.studentId,
        name: student.name,
        className: student.className,
        schoolName: student.schoolName
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      success: true,
      token,
      student: {
        studentId: student.studentId,
        name: student.name,
        className: student.className,
        schoolName: student.schoolName,
        registrationDate: student.registrationDate
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Student login error: ' + error.message
    });
  }
};

// POST /api/student/portal/register
export const registerStudent = async (req, res) => {
  try {
    const { name, className, grade, whatsappNumber, whatsapp, schoolName, school, notes, registrationDate } = req.body;

    const studentName = name?.trim();
    const finalClassName = (className || grade)?.trim();
    const finalPhone = (whatsappNumber || whatsapp)?.trim();
    const finalSchool = (schoolName || school)?.trim();

    if (!studentName || !finalClassName || !finalPhone || !finalSchool) {
      return res.status(400).json({
        success: false,
        message: 'All 4 fields are required: Full Name, Class/Grade, WhatsApp Number, and School Name.'
      });
    }

    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'MongoDB Atlas connection is currently unavailable. Registration could not be saved to the database.'
      });
    }

    // Check duplicate student
    const existing = await Student.findOne({
      status: 'active',
      name: { $regex: new RegExp(`^${studentName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
      $or: [
        { schoolName: { $regex: new RegExp(`^${finalSchool.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } },
        { whatsappNumber: finalPhone.replace(/\D/g, '') }
      ]
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: `A student named "${studentName}" from "${finalSchool}" already exists with ID ${existing.studentId}.`
      });
    }

    const year = registrationDate ? registrationDate.split('-')[0] : '2026';
    const studentId = await getNextStudentId(year);
    const nowIso = new Date().toISOString();

    let newStudentData = {
      studentId,
      name: studentName,
      className: finalClassName,
      whatsappNumber: finalPhone,
      schoolName: finalSchool,
      registrationDate: registrationDate || nowIso.split('T')[0],
      status: 'active',
      notes: notes || '',
      createdAt: nowIso,
      updatedAt: nowIso
    };

    const created = await Student.create(newStudentData);
    newStudentData._id = created._id;

    // Automatically generate digital Student ID card in MongoDB Atlas
    let studentCard = null;
    try {
      const cardResult = await getOrCreateStudentCard(studentId, `REGISTRATION_${studentId}`);
      studentCard = cardResult.card;
    } catch (cardErr) {
      console.warn('ID Card generation warning during registration:', cardErr.message);
    }

    // Generate login token
    const token = jwt.sign(
      {
        role: 'student',
        studentId,
        name: studentName,
        className: finalClassName,
        schoolName: finalSchool
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      success: true,
      message: 'Student registered successfully. Digital Student ID Card generated.',
      token,
      card: studentCard ? {
        studentId: studentCard.studentId,
        verificationToken: studentCard.verificationToken,
        status: studentCard.status,
        cardVersion: studentCard.cardVersion,
        issueDate: studentCard.issueDate
      } : null,
      student: {
        id: studentId,
        studentId,
        name: studentName,
        className: finalClassName,
        grade: finalClassName,
        whatsapp: finalPhone,
        whatsappNumber: finalPhone,
        school: finalSchool,
        schoolName: finalSchool,
        registrationDate: newStudentData.registrationDate,
        status: 'active'
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Registration error: ' + error.message
    });
  }
};

// 2. GET /api/student/portal/me
export const getStudentProfile = async (req, res) => {
  try {
    const student = await Student.findOne({ studentId: req.student.studentId, status: 'active' });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student record not found.'
      });
    }

    return res.status(200).json({
      success: true,
      student: {
        studentId: student.studentId,
        name: student.name,
        className: student.className,
        schoolName: student.schoolName,
        registrationDate: student.registrationDate
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// 3. GET /api/student/portal/attendance
export const getStudentAttendance = async (req, res) => {
  try {
    const studentId = req.student.studentId;
    const student = await Student.findOne({ studentId });

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student record not found.' });
    }

    const regDate = student.registrationDate || '2026-08-01';
    const today = getISTDateString();

    // 1. Fetch only conducted sessions on or after registrationDate and on or before today
    const conductedSessions = await Session.find({
      sessionStatus: 'conducted',
      sessionDate: { $gte: regDate, $lte: today }
    }).sort({ sessionDate: -1 });

    // 2. Fetch all attendance marks for this student
    const attendanceRecords = await Attendance.find({ studentId });
    const attendanceMap = new Map();
    attendanceRecords.forEach(r => attendanceMap.set(r.sessionDate || r.sessionId, r.status));

    let presentCount = 0;
    let absentCount = 0;
    let unrecordedCount = 0;

    const recentHistory = conductedSessions.map(ses => {
      const statusMark = attendanceMap.get(ses.sessionDate) || attendanceMap.get(ses._id?.toString()) || 'not_recorded';
      if (statusMark === 'present') presentCount++;
      else if (statusMark === 'absent') absentCount++;
      else unrecordedCount++;

      return {
        sessionDate: ses.sessionDate,
        dayOfWeek: ses.dayOfWeek,
        title: ses.title,
        topic: ses.topic || '',
        conductedByName: ses.conductedByName || 'Not recorded',
        status: statusMark // 'present' | 'absent' | 'not_recorded'
      };
    });

    const totalEligibleConducted = conductedSessions.length;
    // Attendance % = Present sessions / Total eligible conducted sessions * 100
    const attendancePercentage = (totalEligibleConducted > 0 && presentCount > 0)
      ? Math.round((presentCount / totalEligibleConducted) * 100)
      : 0;

    const displayPercentage = totalEligibleConducted === 0
      ? '0% (New Registration)'
      : (presentCount === 0 ? '0%' : `${attendancePercentage}%`);

    return res.status(200).json({
      success: true,
      data: {
        studentId: student.studentId,
        name: student.name,
        className: student.className,
        schoolName: student.schoolName,
        registrationDate: regDate,
        totalEligibleConducted,
        presentCount,
        absentCount,
        unrecordedCount,
        attendancePercentage,
        displayPercentage,
        recentHistory
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve attendance: ' + error.message
    });
  }
};

// 4. GET /api/student/portal/ai-quota
export const getStudentAiQuota = async (req, res) => {
  try {
    const studentId = req.student.studentId;
    const date = getISTDateString();

    const quotaDoc = await StudentAiQuota.findOne({ studentId, date });
    const used = quotaDoc ? quotaDoc.used : 0;
    const remaining = Math.max(0, 5 - used);

    return res.status(200).json({
      success: true,
      quota: {
        date,
        used,
        remaining,
        limit: 5,
        isLimitReached: used >= 5
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Internal Helper: Atomically consume 1 AI credit for student
const consumeStudentQuota = async (studentId, questionType, question) => {
  const date = getISTDateString();

  // Find or create quota doc
  let doc = await StudentAiQuota.findOne({ studentId, date });
  if (!doc) {
    try {
      doc = await StudentAiQuota.create({ studentId, date, used: 0, history: [] });
    } catch (err) {
      doc = await StudentAiQuota.findOne({ studentId, date });
    }
  }

  if (doc.used >= 5) {
    return { allowed: false, used: doc.used, remaining: 0 };
  }

  // Atomically increment
  const updated = await StudentAiQuota.findOneAndUpdate(
    { studentId, date, used: { $lt: 5 } },
    {
      $inc: { used: 1 },
      $push: {
        history: {
          timestamp: new Date(),
          questionType,
          questionPreview: question.slice(0, 100)
        }
      }
    },
    { new: true }
  );

  if (!updated) {
    return { allowed: false, used: 5, remaining: 0 };
  }

  return { allowed: true, used: updated.used, remaining: Math.max(0, 5 - updated.used) };
};

// 5. POST /api/student/portal/ai/gita
export const askStudentGita = async (req, res) => {
  try {
    const studentId = req.student.studentId;
    const { question } = req.body;

    if (!question || !question.trim()) {
      return res.status(400).json({ success: false, message: 'Please provide a question.' });
    }

    const trimmedQ = question.trim();

    // 1. If it's a greeting, reply immediately without deducting student quota
    if (isGreetingOrCasual(trimmedQ)) {
      const date = getISTDateString();
      const quotaDoc = await StudentAiQuota.findOne({ studentId, date });
      const used = quotaDoc ? quotaDoc.used : 0;
      const remaining = Math.max(0, 5 - used);
      return res.status(200).json({
        success: true,
        data: {
          answer: getGreetingResponse(),
          modelUsed: "Sri Gita Wisdom Guide",
          sourcedVerses: [],
          quota: {
            used,
            remaining,
            limit: 5
          }
        }
      });
    }

    // Atomic quota check & deduction
    const quotaResult = await consumeStudentQuota(studentId, 'gita', trimmedQ);
    if (!quotaResult.allowed) {
      return res.status(429).json({
        success: false,
        code: 'DAILY_LIMIT_REACHED',
        message: "You've used all five AI questions for today. Your allowance resets tomorrow at midnight (IST).",
        quota: { used: 5, remaining: 0, limit: 5 }
      });
    }

    // RAG retrieval of authentic verses
    const relevantVerses = searchGitaVerses(trimmedQ, 3);
    const aiAnswer = await answerGitaQuestion(trimmedQ, relevantVerses);

    return res.status(200).json({
      success: true,
      data: {
        ...aiAnswer,
        quota: {
          used: quotaResult.used,
          remaining: quotaResult.remaining,
          limit: 5
        }
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 6. POST /api/student/portal/ai/attendance
export const askStudentAttendanceAi = async (req, res) => {
  try {
    const studentId = req.student.studentId;
    const { question } = req.body;

    if (!question || !question.trim()) {
      return res.status(400).json({ success: false, message: 'Please provide a question about your attendance.' });
    }

    // Atomic quota check & deduction
    const quotaResult = await consumeStudentQuota(studentId, 'attendance', question.trim());
    if (!quotaResult.allowed) {
      return res.status(429).json({
        success: false,
        code: 'DAILY_LIMIT_REACHED',
        message: "You've used all five AI questions for today. Your allowance resets tomorrow at midnight (IST).",
        quota: { used: 5, remaining: 0, limit: 5 }
      });
    }

    // Fetch this student's actual numbers strictly from MongoDB (No access to other students)
    const student = await Student.findOne({ studentId });
    const regDate = student?.registrationDate || '2026-08-01';
    const conductedSessions = await Session.find({
      sessionStatus: 'conducted',
      sessionDate: { $gte: regDate, $lte: getISTDateString() }
    }).sort({ sessionDate: -1 });

    const attendanceRecords = await Attendance.find({ studentId });
    const attendanceMap = new Map();
    attendanceRecords.forEach(r => attendanceMap.set(r.sessionDate || r.sessionId, r.status));

    let present = 0;
    let absent = 0;
    conductedSessions.forEach(ses => {
      const st = attendanceMap.get(ses.sessionDate) || 'not_recorded';
      if (st === 'present') present++;
      else if (st === 'absent') absent++;
    });

    const total = conductedSessions.length;
    const pct = total > 0 ? Math.round((present / total) * 100) : 0;

    const studentContext = {
      studentName: req.student.name,
      className: req.student.className,
      totalEligibleSessions: total,
      classesAttended: present,
      classesMissed: absent,
      attendancePercentage: total > 0 ? `${pct}%` : '0%',
      points: present * 10,
      latestSessionDate: conductedSessions[0]?.sessionDate || 'None'
    };

    let summaryText = '';
    try {
      const aiAnswer = await analyzeAttendanceInsights(
        `Personal student attendance inquiry: "${question.trim()}". Student verified data: Attended ${present} of ${total} classes (${pct}% attendance). Absences: ${absent}. Provide an encouraging, personal, devotionally uplifting explanation strictly about these verified numbers.`,
        studentContext
      );
      summaryText = aiAnswer?.summary || aiAnswer?.insights || '';
    } catch (e) {
      console.warn("AI Attendance notice:", e.message);
    }

    if (!summaryText || summaryText.includes('undefined')) {
      const tier = pct >= 80 ? 'Outstanding' : pct >= 65 ? 'Good & Steady' : 'Needs Consistent Turnout';
      summaryText = `### 📋 Verified Attendance Standing
Hare Krishna, **${req.student.name}**! 🙏 Here is your official attendance record:

- **Attendance Rate**: **${pct}%** (${tier})
- **Classes Attended**: **${present} of ${total}** conducted weekend classes
- **Classes Missed**: **${absent} session(s)**
- **Seva Points**: **${present * 10} pts**
${conductedSessions[0]?.sessionDate ? `- **Latest Session**: ${conductedSessions[0].sessionDate}` : ''}

Classes take place every Saturday and Sunday from **6:00 PM to 8:00 PM**. We look forward to seeing you in class!`;
    }

    return res.status(200).json({
      success: true,
      data: {
        summary: summaryText,
        verifiedStats: studentContext,
        quota: {
          used: quotaResult.used,
          remaining: quotaResult.remaining,
          limit: 5
        }
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 7. GET /api/reports/ai-usage (Protected Admin Only)
export const getAdminAiUsageReport = async (req, res) => {
  try {
    const today = getISTDateString();
    const todayQuotas = await StudentAiQuota.find({ date: today });
    const studentIds = todayQuotas.map(q => q.studentId);
    const students = await Student.find({ studentId: { $in: studentIds } });
    const studentMap = new Map();
    students.forEach(s => studentMap.set(s.studentId, s));

    let totalQuestionsToday = 0;
    let limitReachedCount = 0;

    const breakdown = todayQuotas.map(q => {
      totalQuestionsToday += q.used;
      if (q.used >= 5) limitReachedCount++;
      const s = studentMap.get(q.studentId);
      return {
        studentId: q.studentId,
        name: s?.name || q.studentId,
        className: s?.className || '-',
        used: q.used,
        remaining: Math.max(0, 5 - q.used),
        isLimitReached: q.used >= 5,
        updatedAt: q.updatedAt
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        date: today,
        totalQuestionsToday,
        activeStudentsToday: todayQuotas.length,
        limitReachedCount,
        breakdown
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
