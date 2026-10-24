import mongoose from 'mongoose';
import WeeklyPlan from '../models/WeeklyPlan.js';
import Session from '../models/Session.js';
import AdminActivity from '../models/AdminActivity.js';

// Fallback in-memory store for when MongoDB Atlas cluster is offline
const memoryPlans = new Map();

const getOrCreateMemoryPlan = (weekKey, info) => {
  if (!memoryPlans.has(weekKey)) {
    memoryPlans.set(weekKey, {
      weekKey,
      year: info.year,
      weekNumber: info.weekNumber,
      saturdayDate: info.saturdayDate,
      sundayDate: info.sundayDate,
      status: 'undecided',
      selectedDay: null,
      scheduledDate: '',
      scheduledTime: '06:00 PM – 08:00 PM',
      location: '',
      topic: '',
      publicAnnouncement: '',
      cancellationReason: '',
      deadlineNote: 'Confirm by Friday 06:00 PM',
      confirmedBy: 'ANIK',
      updatedAt: new Date()
    });
  }
  return memoryPlans.get(weekKey);
};

// Helpers to get ISO week key and Saturday/Sunday dates
export const getWeekInfo = (d = new Date()) => {
  const date = new Date(d);
  const day = date.getDay(); // 0 is Sunday, 6 is Saturday
  
  // Find Monday of the current week
  // If Sunday (0), it's part of the weekend ending the week
  const diffToMonday = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date.setDate(diffToMonday));
  monday.setHours(0, 0, 0, 0);

  // Saturday is Monday + 5 days
  const saturday = new Date(monday);
  saturday.setDate(monday.getDate() + 5);

  // Sunday is Monday + 6 days
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  // Format YYYY-MM-DD
  const toISO = (dt) => {
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const dayNum = String(dt.getDate()).padStart(2, '0');
    return `${y}-${m}-${dayNum}`;
  };

  // Week number
  const startOfYear = new Date(monday.getFullYear(), 0, 1);
  const pastDaysOfYear = (monday - startOfYear) / 86400000;
  const weekNumber = Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);

  const year = monday.getFullYear();
  const weekKey = `${year}-W${String(weekNumber).padStart(2, '0')}`;

  return {
    weekKey,
    year,
    weekNumber,
    saturdayDate: toISO(saturday),
    sundayDate: toISO(sunday)
  };
};

export const isPastFridayDeadline = (saturdayDateStr) => {
  if (!saturdayDateStr) return false;
  const [y, m, d] = saturdayDateStr.split('-').map(Number);
  const fri = new Date(y, m - 1, d, 0, 0, 0, 0);
  fri.setDate(fri.getDate() - 1);
  fri.setHours(18, 0, 0, 0);
  return Date.now() >= fri.getTime();
};

export const applyAutoClosureIfNeeded = async (plan) => {
  if (!plan) return plan;
  let changed = false;
  if (plan.status === 'undecided' && isPastFridayDeadline(plan.saturdayDate)) {
    plan.status = 'no_class';
    plan.cancellationReason = 'Automatic update: No class was scheduled before the Friday 06:00 PM deadline.';
    plan.publicAnnouncement = 'There are no Bhagavad Gita classes scheduled for this weekend. Regular classes will resume next week. We encourage students to continue their self-study and chanting.';
    plan.autoClosed = true;
    plan.updatedAt = new Date();
    changed = true;
  }
  // Sanitize any legacy public announcement exposing Friday deadline or admin workflow
  if (plan.publicAnnouncement && /Friday|deadline|passed without an admin update/i.test(plan.publicAnnouncement)) {
    plan.publicAnnouncement = 'There are no Bhagavad Gita classes scheduled for this weekend. Regular classes will resume next week. We encourage students to continue their self-study and chanting.';
    plan.updatedAt = new Date();
    changed = true;
  }
  if (changed && typeof plan.save === 'function') {
    await plan.save().catch(() => {});
  }
  return plan;
};

// GET /api/plans/current (Public & Admin)
export const getCurrentPlan = async (req, res) => {
  try {
    const info = getWeekInfo();
    const { weekKey, year, weekNumber, saturdayDate, sundayDate } = info;

    if (mongoose.connection.readyState !== 1) {
      const plan = getOrCreateMemoryPlan(weekKey, info);
      await applyAutoClosureIfNeeded(plan);
      return res.status(200).json({ success: true, data: plan });
    }

    let plan = await WeeklyPlan.findOne({ weekKey });
    if (!plan) {
      const expired = isPastFridayDeadline(saturdayDate);
      plan = await WeeklyPlan.create({
        weekKey,
        year,
        weekNumber,
        saturdayDate,
        sundayDate,
        status: expired ? 'no_class' : 'undecided',
        cancellationReason: expired ? 'Automatic update: No class was scheduled before the Friday 06:00 PM deadline.' : '',
        publicAnnouncement: expired ? 'There are no Bhagavad Gita classes scheduled for this weekend. Regular classes will resume next week. We encourage students to continue their self-study and chanting.' : '',
        autoClosed: expired,
        deadlineNote: 'Confirm by Friday 06:00 PM',
        confirmedBy: 'ANIK'
      });
    } else {
      await applyAutoClosureIfNeeded(plan);
    }

    return res.status(200).json({
      success: true,
      data: plan
    });
  } catch (error) {
    const info = getWeekInfo();
    const plan = getOrCreateMemoryPlan(info.weekKey, info);
    await applyAutoClosureIfNeeded(plan);
    return res.status(200).json({
      success: true,
      data: plan
    });
  }
};

// GET /api/plans (Admin only)
export const getAllPlans = async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      const info = getWeekInfo();
      const current = getOrCreateMemoryPlan(info.weekKey, info);
      const list = Array.from(memoryPlans.values());
      return res.status(200).json({
        success: true,
        count: list.length,
        data: list
      });
    }

    const plans = await WeeklyPlan.find().sort({ year: -1, weekNumber: -1 }).limit(20);
    for (const p of plans) {
      await applyAutoClosureIfNeeded(p);
    }
    return res.status(200).json({
      success: true,
      count: plans.length,
      data: plans
    });
  } catch (error) {
    const info = getWeekInfo();
    const current = getOrCreateMemoryPlan(info.weekKey, info);
    return res.status(200).json({
      success: true,
      count: 1,
      data: [current]
    });
  }
};

// POST /api/plans (Admin only) - Confirm / update weekly plan
export const saveWeeklyPlan = async (req, res) => {
  try {
    const { 
      weekKey, 
      status, 
      selectedDay, 
      scheduledTime, 
      location, 
      topic, 
      publicAnnouncement,
      deadlineNote 
    } = req.body;

    if (!weekKey) {
      return res.status(400).json({ success: false, message: 'weekKey is required.' });
    }

    if (!['scheduled', 'no_class', 'undecided', 'cancelled'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status option.' });
    }

    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'MongoDB Atlas is currently unavailable. Weekly class plan could not be saved to the database.'
      });
    }

    const info = getWeekInfo();
    let plan = await WeeklyPlan.findOne({ weekKey });
    if (!plan) {
      plan = new WeeklyPlan({
        weekKey,
        year: info.year,
        weekNumber: info.weekNumber,
        saturdayDate: info.saturdayDate,
        sundayDate: info.sundayDate
      });
    }

    // STRICT RULE: Classes held on either Saturday OR Sunday, never both!
    if (status === 'scheduled') {
      if (!selectedDay || (selectedDay !== 'Saturday' && selectedDay !== 'Sunday')) {
        return res.status(400).json({
          success: false,
          message: 'Classes are held on either Saturday OR Sunday. Please select exactly one day.'
        });
      }

      const targetDate = selectedDay === 'Saturday' ? plan.saturdayDate : plan.sundayDate;
      const otherDate = selectedDay === 'Saturday' ? plan.sundayDate : plan.saturdayDate;

      // Ensure no session exists on the other day for this week (if DB connected)
      if (mongoose.connection.readyState === 1) {
        const otherSession = await Session.findOne({ sessionDate: otherDate });
        if (otherSession && otherSession.sessionStatus !== 'cancelled') {
          return res.status(400).json({
            success: false,
            message: `A session is already recorded for ${otherDate} (${selectedDay === 'Saturday' ? 'Sunday' : 'Saturday'}). Classes can only occur on Saturday OR Sunday in the same week, never both.`
          });
        }
      }

      plan.status = 'scheduled';
      plan.selectedDay = selectedDay;
      plan.scheduledDate = targetDate;
      plan.scheduledTime = scheduledTime || '06:00 PM – 08:00 PM';
      plan.location = location || '';
      plan.topic = topic || '';
      plan.publicAnnouncement = publicAnnouncement || '';
      plan.deadlineNote = (deadlineNote || 'Confirm by Friday 06:00 PM').replace(/Thursday/gi, 'Friday');
      plan.cancellationReason = '';
      plan.confirmedBy = req.admin?.username || 'ANIK';
      plan.updatedAt = new Date();

      if (mongoose.connection.readyState === 1) {
        await plan.save();

        // Ensure matching session exists in attendance system
        let session = await Session.findOne({ sessionDate: targetDate });
        if (!session) {
          session = await Session.create({
            sessionDate: targetDate,
            dayOfWeek: selectedDay,
            title: `Bhagavad Gita Class — ${selectedDay}`,
            topic: plan.topic,
            sessionStatus: 'scheduled'
          });
        } else {
          session.sessionStatus = 'scheduled';
          session.topic = plan.topic || session.topic;
          session.cancellationReason = '';
          await session.save();
        }

        await AdminActivity.create({
          activityType: 'SESSION_CREATE',
          description: `Confirmed weekly class for ${selectedDay}, ${targetDate} (${plan.scheduledTime})`,
          adminUsername: req.admin?.username || 'ANIK',
          details: { weekKey, targetDate, selectedDay }
        }).catch(() => {});
      } else {
        memoryPlans.set(weekKey, plan);
      }

      return res.status(200).json({
        success: true,
        message: `Class successfully confirmed for ${selectedDay}, ${targetDate}!`,
        data: plan
      });

    } else if (status === 'no_class') {
      plan.status = 'no_class';
      plan.selectedDay = null;
      plan.scheduledDate = '';
      plan.publicAnnouncement = publicAnnouncement || 'No class scheduled this week.';
      plan.confirmedBy = req.admin?.username || 'ANIK';
      plan.updatedAt = new Date();

      await plan.save();

      await AdminActivity.create({
        activityType: 'SETTINGS_UPDATE',
        description: `Confirmed NO class for week ${weekKey}`,
        adminUsername: req.admin?.username || 'ANIK',
        details: { weekKey }
      }).catch(() => {});

      return res.status(200).json({
        success: true,
        message: 'Recorded: No class will be held this week.',
        data: plan
      });

    } else if (status === 'undecided') {
      plan.status = 'undecided';
      plan.selectedDay = null;
      plan.scheduledDate = '';
      plan.deadlineNote = deadlineNote || plan.deadlineNote;
      plan.updatedAt = new Date();

      await plan.save();

      return res.status(200).json({
        success: true,
        message: 'Weekly schedule set to pending confirmation.',
        data: plan
      });
    }

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to save weekly class plan: ' + error.message
    });
  }
};

// PUT /api/plans/:weekKey/reschedule (Admin only) - Switch Sat <-> Sun
export const reschedulePlan = async (req, res) => {
  try {
    const { weekKey } = req.params;
    const plan = await WeeklyPlan.findOne({ weekKey });

    if (!plan || plan.status !== 'scheduled') {
      return res.status(400).json({
        success: false,
        message: 'Only currently scheduled classes can be rescheduled.'
      });
    }

    const currentDay = plan.selectedDay;
    const targetDay = currentDay === 'Saturday' ? 'Sunday' : 'Saturday';
    const targetDate = targetDay === 'Saturday' ? plan.saturdayDate : plan.sundayDate;
    const oldDate = plan.scheduledDate;

    // Check if old session had attendance recorded
    const oldSession = await Session.findOne({ sessionDate: oldDate });
    if (oldSession && oldSession.presentCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Attendance is already recorded for ${oldDate}. Historical records cannot be automatically rescheduled.`
      });
    }

    // Cancel old session
    if (oldSession) {
      oldSession.sessionStatus = 'cancelled';
      oldSession.cancellationReason = `Rescheduled to ${targetDay}, ${targetDate}`;
      await oldSession.save();
    }

    // Create or update target session
    let targetSession = await Session.findOne({ sessionDate: targetDate });
    if (!targetSession) {
      targetSession = await Session.create({
        sessionDate: targetDate,
        dayOfWeek: targetDay,
        title: `Bhagavad Gita Class — ${targetDay}`,
        topic: plan.topic,
        sessionStatus: 'scheduled'
      });
    } else {
      targetSession.sessionStatus = 'scheduled';
      targetSession.cancellationReason = '';
      await targetSession.save();
    }

    plan.selectedDay = targetDay;
    plan.scheduledDate = targetDate;
    plan.publicAnnouncement = `Class rescheduled to ${targetDay}, ${targetDate}`;
    plan.updatedAt = new Date();
    await plan.save();

    await AdminActivity.create({
      activityType: 'SETTINGS_UPDATE',
      description: `Rescheduled class from ${currentDay} (${oldDate}) to ${targetDay} (${targetDate})`,
      adminUsername: req.admin?.username || 'ANIK',
      details: { weekKey, oldDate, targetDate }
    }).catch(() => {});

    return res.status(200).json({
      success: true,
      message: `Class successfully rescheduled to ${targetDay}, ${targetDate}!`,
      data: plan
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to reschedule class: ' + error.message
    });
  }
};

// PUT /api/plans/:weekKey/cancel (Admin only) - Emergency cancellation
export const cancelWeeklyPlan = async (req, res) => {
  try {
    const { weekKey } = req.params;
    const { cancellationReason, publicAnnouncement } = req.body;

    const plan = await WeeklyPlan.findOne({ weekKey });
    if (!plan) {
      return res.status(404).json({ success: false, message: 'Weekly plan not found.' });
    }

    const scheduledDate = plan.scheduledDate;

    plan.status = 'cancelled';
    plan.cancellationReason = cancellationReason || 'Class cancelled due to unavoidable circumstances.';
    plan.publicAnnouncement = publicAnnouncement || plan.cancellationReason;
    plan.cancelledAt = new Date();
    plan.updatedAt = new Date();
    await plan.save();

    // Mark matching Session as cancelled so it is excluded from attendance percentages
    if (scheduledDate) {
      const session = await Session.findOne({ sessionDate: scheduledDate });
      if (session) {
        session.sessionStatus = 'cancelled';
        session.cancellationReason = plan.cancellationReason;
        await session.save();
      }
    }

    await AdminActivity.create({
      activityType: 'SESSION_CANCEL',
      description: `Emergency cancelled class for week ${weekKey} (${scheduledDate}): ${plan.cancellationReason}`,
      adminUsername: req.admin?.username || 'ANIK',
      details: { weekKey, scheduledDate, reason: plan.cancellationReason }
    }).catch(() => {});

    return res.status(200).json({
      success: true,
      message: 'Class has been cancelled and published to the landing page notice banner.',
      data: plan
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to cancel weekly class: ' + error.message
    });
  }
};
