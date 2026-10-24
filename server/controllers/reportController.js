import Session from '../models/Session.js';
import Student from '../models/Student.js';
import Attendance from '../models/Attendance.js';

// GET /api/reports
export const getReportData = async (req, res) => {
  try {
    const { fromDate, toDate, school, className, studentId, sessionStatus } = req.query;

    const sessionFilter = {};
    if (fromDate && toDate) {
      sessionFilter.sessionDate = { $gte: fromDate, $lte: toDate };
    } else if (fromDate) {
      sessionFilter.sessionDate = { $gte: fromDate };
    } else if (toDate) {
      sessionFilter.sessionDate = { $lte: toDate };
    }

    if (sessionStatus && sessionStatus !== 'all') {
      sessionFilter.sessionStatus = sessionStatus;
    }

    const sessions = await Session.find(sessionFilter).sort({ sessionDate: -1 });

    // Students filter
    const studentFilter = { status: 'active' };
    if (school && school !== 'ALL') studentFilter.schoolName = school;
    if (className && className !== 'ALL') studentFilter.className = className;
    if (studentId && studentId !== 'ALL') studentFilter.studentId = studentId;

    const students = await Student.find(studentFilter);

    // Summary calculations
    let totalPresent = 0;
    let totalAbsent = 0;

    sessions.forEach(s => {
      if (s.sessionStatus === 'conducted') {
        totalPresent += (s.presentCount || 0);
        totalAbsent += (s.absentCount || 0);
      }
    });

    const totalMarks = totalPresent + totalAbsent;
    const avgRate = totalMarks > 0 ? Math.round((totalPresent / totalMarks) * 100) : 0;

    return res.status(200).json({
      success: true,
      data: {
        summary: {
          sessionCount: sessions.length,
          totalPresent,
          totalAbsent,
          avgRate
        },
        sessions: sessions.map(s => ({
          _id: s._id,
          id: `SES-${s.sessionDate}`,
          date: s.sessionDate,
          day: s.dayOfWeek,
          title: s.title,
          topic: s.topic,
          status: s.sessionStatus,
          presentCount: s.presentCount,
          absentCount: s.absentCount,
          totalRegistered: s.totalRegistered
        })),
        studentsCount: students.length
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to generate report data: ' + error.message
    });
  }
};
