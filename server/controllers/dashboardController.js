import Student from '../models/Student.js';
import Session from '../models/Session.js';
import Attendance from '../models/Attendance.js';
import AdminActivity from '../models/AdminActivity.js';

// GET /api/dashboard/stats
export const getDashboardStats = async (req, res) => {
  try {
    // 1. Total registered active students
    const totalStudents = await Student.countDocuments({ status: 'active' });

    // 2. Total conducted class sessions
    const conductedSessions = await Session.find({ sessionStatus: 'conducted' }).sort({ sessionDate: -1 });
    const totalConductedSessions = conductedSessions.length;

    // 3. Latest session numbers
    const latestSession = conductedSessions.length > 0 ? conductedSessions[0] : null;
    const latestPresent = latestSession ? (latestSession.presentCount || 0) : 0;
    const latestAbsent = latestSession ? (latestSession.absentCount || 0) : 0;

    // 4. Overall Attendance Percentage from actual conducted session records
    let totalPresentMarks = 0;
    let totalRecordedMarks = 0;

    conductedSessions.forEach(s => {
      const p = s.presentCount || 0;
      const a = s.absentCount || 0;
      totalPresentMarks += p;
      totalRecordedMarks += (p + a);
    });

    const overallPercentage = totalRecordedMarks > 0
      ? Math.round((totalPresentMarks / totalRecordedMarks) * 100)
      : 0;

    // 5. Recently added students (last 5)
    const recentlyAddedDocs = await Student.find({ status: 'active' })
      .sort({ createdAt: -1 })
      .limit(5);

    const recentlyAdded = recentlyAddedDocs.map(s => ({
      _id: s._id,
      id: s.studentId,
      studentId: s.studentId,
      name: s.name,
      grade: s.className,
      className: s.className,
      whatsapp: s.whatsappNumber,
      whatsappNumber: s.whatsappNumber,
      school: s.schoolName,
      schoolName: s.schoolName,
      registrationDate: s.registrationDate,
      status: s.status,
      createdAt: s.createdAt
    }));

    // 6. Recent audit activities (last 8)
    const recentActivities = await AdminActivity.find()
      .sort({ timestamp: -1 })
      .limit(8);

    return res.status(200).json({
      success: true,
      data: {
        totalStudents,
        totalConductedSessions,
        totalSessions: await Session.countDocuments(),
        latestSession: latestSession ? {
          id: `SES-${latestSession.sessionDate}`,
          date: latestSession.sessionDate,
          dayOfWeek: latestSession.dayOfWeek,
          title: latestSession.title,
          topic: latestSession.topic,
          presentCount: latestSession.presentCount,
          absentCount: latestSession.absentCount
        } : null,
        latestPresent,
        latestAbsent,
        overallPercentage,
        recentlyAdded,
        recentActivities: recentActivities.map(a => ({
          id: a._id,
          type: a.action,
          action: a.action,
          description: a.description,
          timestamp: a.timestamp,
          admin: a.adminId
        }))
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to calculate dashboard statistics: ' + error.message
    });
  }
};
