import { searchGitaVerses } from '../data/gitaDataset.js';
import { answerGitaQuestion, analyzeAttendanceInsights } from '../services/aiService.js';
import Student from '../models/Student.js';
import Session from '../models/Session.js';
import Attendance from '../models/Attendance.js';
import AdminActivity from '../models/AdminActivity.js';

// POST /api/ai/gita-ask (Public or Student inquiry)
export const askBhagavadGita = async (req, res) => {
  try {
    const { question } = req.body;

    if (!question || !question.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a question about the Bhagavad Gita.'
      });
    }

    if (question.length > 600) {
      return res.status(400).json({
        success: false,
        message: 'Question is too long (maximum 600 characters).'
      });
    }

    // 1. RAG: Retrieve relevant authentic verses from structured scripture dataset
    const relevantVerses = searchGitaVerses(question.trim(), 3);

    // 2. Generate grounded response with Qwen model
    const result = await answerGitaQuestion(question.trim(), relevantVerses);

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to process Bhagavad Gita inquiry: ' + error.message
    });
  }
};

// POST /api/ai/attendance-insights (Protected for authorized Admin only)
export const getAttendanceInsights = async (req, res) => {
  try {
    const { query } = req.body;
    const adminPrompt = query?.trim() || "Summarize overall student attendance health and identify any key patterns.";

    // 1. DETERMINISTIC SERVER-SIDE COMPUTATION (Zero AI Hallucination on numbers)
    const activeStudents = await Student.find({ status: 'active' });
    const conductedSessions = await Session.find({ sessionStatus: 'conducted' }).sort({ sessionDate: -1 });
    const cancelledCount = await Session.countDocuments({ sessionStatus: 'cancelled' });

    let totalPresentMarks = 0;
    let totalRecordedMarks = 0;

    const sessionSummaries = conductedSessions.slice(0, 6).map(s => {
      const p = s.presentCount || 0;
      const a = s.absentCount || 0;
      totalPresentMarks += p;
      totalRecordedMarks += (p + a);
      return {
        date: s.sessionDate,
        day: s.dayOfWeek,
        topic: s.topic || s.title,
        present: p,
        absent: a,
        turnoutRate: (p + a) > 0 ? `${Math.round((p / (p + a)) * 100)}%` : '0%'
      };
    });

    const overallPercentage = totalRecordedMarks > 0
      ? Math.round((totalPresentMarks / totalRecordedMarks) * 100)
      : 0;

    const latest = conductedSessions[0] || null;

    const deterministicMetrics = {
      totalStudents: activeStudents.length,
      totalConductedSessions: conductedSessions.length,
      totalCancelledSessions: cancelledCount,
      overallPercentage,
      latestPresent: latest ? latest.presentCount : 0,
      latestAbsent: latest ? latest.absentCount : 0,
      recentSessions: sessionSummaries,
      computationRules: "Cancelled sessions strictly excluded; unrecorded sessions treated as Not Recorded."
    };

    // 2. Pass verified deterministic data to Qwen for executive summary
    const result = await analyzeAttendanceInsights(adminPrompt, deterministicMetrics);

    // Audit log
    await AdminActivity.create({
      adminId: req.admin?.username || 'ANIK',
      action: 'ADMIN_LOGIN',
      recordType: 'system',
      description: `Generated AI Attendance Insights for prompt: "${adminPrompt.slice(0, 60)}..."`
    }).catch(() => {});

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to generate attendance insights: ' + error.message
    });
  }
};
