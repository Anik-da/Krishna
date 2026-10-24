import Attendance from '../models/Attendance.js';
import Session from '../models/Session.js';
import Student from '../models/Student.js';
import AdminActivity from '../models/AdminActivity.js';

const getWeekday = (dateStr) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-US', { weekday: 'long' });
};

// POST /api/attendance
export const saveAttendance = async (req, res) => {
  try {
    const { sessionDate, date, title, topic, records, conductedByName } = req.body;
    const finalDate = sessionDate || date;

    if (!finalDate) {
      return res.status(400).json({
        success: false,
        message: 'Session date is required.'
      });
    }

    // Require conductor name before finalizing attendance
    if (!conductedByName || !conductedByName.trim()) {
      return res.status(400).json({
        success: false,
        message: "Who conducted today's class? Please enter or select the teacher/speaker's full name before finalizing attendance."
      });
    }

    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Attendance records array is required.'
      });
    }

    const dayOfWeek = getWeekday(finalDate);
    const sessionId = `SES-${finalDate}`;
    const cleanConductor = conductedByName.trim();
    const adminUser = req.admin?.username || 'ANIK';
    const adminName = req.admin?.name || 'Anik (Administrator)';
    const recordedAt = new Date();

    // Calculate present and absent counts
    let presentCount = 0;
    let absentCount = 0;

    records.forEach(r => {
      if (r.status === 'present') presentCount++;
      else absentCount++;
    });

    // Find or create the Session document
    let session = await Session.findOne({ sessionDate: finalDate });
    const isNewSession = !session;

    if (!session) {
      session = await Session.create({
        sessionDate: finalDate,
        dayOfWeek,
        title: title || `Bhagavad Gita Class — ${dayOfWeek}`,
        topic: topic || '',
        sessionStatus: 'conducted',
        conductedByName: cleanConductor,
        attendanceRecordedBy: adminUser,
        attendanceRecordedByName: adminName,
        attendanceRecordedAt: recordedAt,
        presentCount,
        absentCount,
        totalRegistered: records.length
      });
    } else {
      const prevConductor = session.conductedByName;
      session.presentCount = presentCount;
      session.absentCount = absentCount;
      session.totalRegistered = records.length;
      if (title) session.title = title;
      if (topic !== undefined) session.topic = topic;
      session.sessionStatus = 'conducted'; // Ensure conducted on save
      session.conductedByName = cleanConductor;
      session.attendanceRecordedBy = adminUser;
      session.attendanceRecordedByName = adminName;
      session.attendanceRecordedAt = recordedAt;
      await session.save();

      if (prevConductor && prevConductor !== cleanConductor) {
        await AdminActivity.create({
          adminId: adminUser,
          action: 'ATTENDANCE_CORRECTED',
          recordType: 'session',
          recordId: sessionId,
          description: `Updated class conductor for ${finalDate} from "${prevConductor}" to "${cleanConductor}"`
        }).catch(() => {});
      }
    }

    // Atomic bulk upsert for all student attendance marks
    // Uses compound index on (sessionId, studentId) to safely prevent duplicate records!
    const bulkOps = records.map(r => ({
      updateOne: {
        filter: { sessionId, studentId: r.studentId },
        update: {
          $set: {
            sessionId,
            studentId: r.studentId,
            sessionDate: finalDate,
            status: r.status === 'present' ? 'present' : 'absent',
            markedAt: new Date()
          }
        },
        upsert: true
      }
    }));

    await Attendance.bulkWrite(bulkOps);

    // Audit action
    await AdminActivity.create({
      adminId: req.admin?.username || 'ANIK',
      action: isNewSession ? 'ATTENDANCE_SUBMITTED' : 'ATTENDANCE_CORRECTED',
      recordType: 'attendance',
      recordId: sessionId,
      description: `Saved attendance for ${dayOfWeek}, ${finalDate} (${presentCount} Present, ${absentCount} Absent)`
    }).catch(() => {});

    return res.status(200).json({
      success: true,
      message: `Attendance successfully saved in MongoDB Atlas (${presentCount} Present, ${absentCount} Absent)`,
      data: {
        session,
        presentCount,
        absentCount,
        totalRegistered: records.length
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to save attendance: ' + error.message
    });
  }
};

// GET /api/attendance/session/:id
export const getSessionAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    // id could be 'SES-YYYY-MM-DD' or 'YYYY-MM-DD'
    const cleanSessionId = id.startsWith('SES-') ? id : `SES-${id}`;
    const dateStr = id.startsWith('SES-') ? id.replace('SES-', '') : id;

    const records = await Attendance.find({
      $or: [
        { sessionId: cleanSessionId },
        { sessionDate: dateStr }
      ]
    });

    return res.status(200).json({
      success: true,
      count: records.length,
      data: records.map(r => ({
        _id: r._id,
        sessionId: r.sessionId,
        studentId: r.studentId,
        status: r.status,
        date: r.sessionDate || dateStr,
        markedAt: r.markedAt
      }))
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch session attendance: ' + error.message
    });
  }
};
