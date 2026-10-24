import Session from '../models/Session.js';
import Attendance from '../models/Attendance.js';
import AdminActivity from '../models/AdminActivity.js';

// Calculate weekday for date string
const getWeekday = (dateStr) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-US', { weekday: 'long' });
};

// GET /api/sessions
export const getSessions = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status && status !== 'all') {
      filter.sessionStatus = status;
    }

    const sessions = await Session.find(filter).sort({ sessionDate: -1 });

    const formatted = sessions.map(s => ({
      _id: s._id,
      id: `SES-${s.sessionDate}`,
      sessionDate: s.sessionDate,
      date: s.sessionDate,
      dayOfWeek: s.dayOfWeek,
      title: s.title,
      topic: s.topic,
      sessionStatus: s.sessionStatus,
      status: s.sessionStatus,
      cancellationReason: s.cancellationReason,
      conductedByName: s.conductedByName || 'Not recorded',
      attendanceRecordedBy: s.attendanceRecordedBy || 'Not recorded',
      attendanceRecordedByName: s.attendanceRecordedByName || 'Not recorded',
      attendanceRecordedAt: s.attendanceRecordedAt || null,
      presentCount: s.presentCount,
      absentCount: s.absentCount,
      totalRegistered: s.totalRegistered,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt
    }));

    return res.status(200).json({
      success: true,
      count: formatted.length,
      data: formatted
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch class sessions: ' + error.message
    });
  }
};

// POST /api/sessions
export const createSession = async (req, res) => {
  try {
    const { sessionDate, date, title, topic, sessionStatus } = req.body;
    const finalDate = sessionDate || date;

    if (!finalDate) {
      return res.status(400).json({
        success: false,
        message: 'Session date is required.'
      });
    }

    // Duplicate check
    const existing = await Session.findOne({ sessionDate: finalDate });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `A session for date ${finalDate} already exists. Please edit the existing register instead.`
      });
    }

    const dayOfWeek = getWeekday(finalDate);

    const session = await Session.create({
      sessionDate: finalDate,
      dayOfWeek,
      title: title || `Bhagavad Gita Class — ${dayOfWeek}`,
      topic: topic || '',
      sessionStatus: sessionStatus || 'conducted'
    });

    await AdminActivity.create({
      adminId: req.admin?.username || 'ANIK',
      action: 'SESSION_RESTORED',
      recordType: 'session',
      recordId: session.sessionDate,
      description: `Created new weekend session for ${session.dayOfWeek}, ${session.sessionDate}`
    });

    return res.status(201).json({
      success: true,
      message: 'Session created successfully.',
      data: session
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to create session: ' + error.message
    });
  }
};

// PATCH /api/sessions/:id/cancel
export const cancelSession = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    let session = await Session.findOne({ sessionDate: id });
    if (!session && id.match(/^[0-9a-fA-F]{24}$/)) {
      session = await Session.findById(id);
    }

    if (!session) {
      return res.status(200).json({
        success: true,
        message: `Session "${id}" is already removed or does not exist.`,
        data: { sessionDate: id, sessionStatus: 'cancelled' }
      });
    }

    session.sessionStatus = 'cancelled';
    session.cancellationReason = reason || 'Class postponed/holiday';
    await session.save();

    await AdminActivity.create({
      adminId: req.admin?.username || 'ANIK',
      action: 'SESSION_CANCELLED',
      recordType: 'session',
      recordId: session.sessionDate,
      description: `Cancelled session on ${session.sessionDate} (${session.dayOfWeek}): "${session.cancellationReason}"`
    });

    return res.status(200).json({
      success: true,
      message: 'Session marked as cancelled. It will not be counted in conducted classes.',
      data: session
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to cancel session: ' + error.message
    });
  }
};

// PATCH /api/sessions/:id/restore
export const restoreSession = async (req, res) => {
  try {
    const { id } = req.params;

    let session = await Session.findOne({ sessionDate: id });
    if (!session && id.match(/^[0-9a-fA-F]{24}$/)) {
      session = await Session.findById(id);
    }

    if (!session) {
      return res.status(200).json({
        success: true,
        message: `Session "${id}" is already removed or does not exist.`,
        data: { sessionDate: id, sessionStatus: 'conducted' }
      });
    }

    session.sessionStatus = 'conducted';
    session.cancellationReason = '';
    await session.save();

    await AdminActivity.create({
      adminId: req.admin?.username || 'ANIK',
      action: 'SESSION_RESTORED',
      recordType: 'session',
      recordId: session.sessionDate,
      description: `Restored session on ${session.sessionDate} as conducted.`
    });

    return res.status(200).json({
      success: true,
      message: 'Session restored as conducted.',
      data: session
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to restore session: ' + error.message
    });
  }
};

// PATCH /api/sessions/:id/conductor
export const updateSessionConductor = async (req, res) => {
  try {
    const { id } = req.params;
    const { conductedByName } = req.body;

    if (!conductedByName || !conductedByName.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Class conductor full name is required.'
      });
    }

    let session = await Session.findOne({ sessionDate: id });
    if (!session && id.match(/^[0-9a-fA-F]{24}$/)) {
      session = await Session.findById(id);
    }

    if (!session) {
      return res.status(404).json({
        success: false,
        message: `Session "${id}" not found.`
      });
    }

    const previousConductor = session.conductedByName || 'Not recorded';
    session.conductedByName = conductedByName.trim();
    await session.save();

    await AdminActivity.create({
      activityType: 'SESSION_UPDATE',
      description: `Corrected class conductor for ${session.sessionDate} from "${previousConductor}" to "${conductedByName.trim()}"`,
      adminUsername: req.admin?.username || 'ANIK',
      details: { sessionDate: session.sessionDate, previous: previousConductor, current: conductedByName.trim() }
    }).catch(() => {});

    return res.status(200).json({
      success: true,
      message: `Class conductor successfully updated to "${conductedByName.trim()}".`,
      data: session
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update conductor: ' + error.message
    });
  }
};

// DELETE /api/sessions/:id
export const deleteSession = async (req, res) => {
  try {
    const { id } = req.params;
    let session = await Session.findOne({ sessionDate: id });
    if (!session && id.match(/^[0-9a-fA-F]{24}$/)) {
      session = await Session.findById(id);
    }

    if (!session) {
      return res.status(200).json({
        success: true,
        message: `Session "${id}" was already deleted.`
      });
    }

    const sDate = session ? session.sessionDate : id;
    if (session) {
      await Session.findByIdAndDelete(session._id);
    } else {
      await Session.deleteMany({ sessionDate: id });
    }

    // Delete associated attendance records for this session / date
    await Attendance.deleteMany({
      $or: [
        { sessionId: id },
        { sessionId: `SES-${id}` },
        { sessionDate: sDate },
        { sessionDate: id }
      ]
    }).catch(() => {});

    await AdminActivity.create({
      activityType: 'SESSION_DELETE',
      description: `Deleted class session on ${sDate}.`,
      adminUsername: req.admin?.username || 'ANIK',
      details: { sessionDate: sDate }
    }).catch(() => {});

    return res.status(200).json({
      success: true,
      message: `Session on ${sDate} and attendance records successfully deleted.`
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to delete session: ' + error.message
    });
  }
};


