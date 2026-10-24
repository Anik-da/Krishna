// Script to purge fake demo records from MongoDB Atlas and build optimal indexes
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Student from '../models/Student.js';
import Session from '../models/Session.js';
import Attendance from '../models/Attendance.js';
import AdminActivity from '../models/AdminActivity.js';
import StudentAiQuota from '../models/StudentAiQuota.js';
import WeeklyPlan from '../models/WeeklyPlan.js';
import WebsiteConfig from '../models/WebsiteConfig.js';
import Counter from '../models/Counter.js';

const FAKE_STUDENT_IDS = [
  "BGK-2026-0001",
  "BGK-2026-0002",
  "BGK-2026-0003",
  "BGK-2026-0004",
  "BGK-2026-0005",
  "BGK-2026-0006",
  "BGK-2026-0007",
  "BGK-2026-0008"
];

const FAKE_STUDENT_NAMES = [
  "Aarav Sharma",
  "Ananya Roy",
  "Rohan Mukherjee",
  "Diya Sengupta",
  "Aditya Verma",
  "Sneha Patel",
  "Karan Singhania",
  "Ishita Banerjee"
];

const FAKE_SESSION_DATES = [
  "2026-09-12",
  "2026-09-13",
  "2026-09-19",
  "2026-09-20",
  "2026-09-26",
  "2026-09-27",
  "2026-10-03",
  "2026-10-04",
  "2026-10-10",
  "2026-10-11"
];

const FAKE_SESSION_IDS = FAKE_SESSION_DATES.map(d => `SES-${d}`);

export const runCleanupAndIndexOptimization = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri || uri.includes('<your-cluster-url>')) {
    console.log('[Notice] No valid MongoDB URI configured. Skipping direct MongoDB Atlas cleanup.');
    return { success: false, reason: 'NO_URI' };
  }

  try {
    console.log('[MongoDB Atlas] Connecting for audit, cleanup & indexing...');
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    console.log('[MongoDB Atlas] Connected successfully.');

    // 1. Audit Students
    const allStudents = await Student.find({});
    const fakeStudents = allStudents.filter(s => 
      FAKE_STUDENT_IDS.includes(s.studentId) || FAKE_STUDENT_NAMES.includes(s.name)
    );
    const genuineStudents = allStudents.filter(s => 
      !FAKE_STUDENT_IDS.includes(s.studentId) && !FAKE_STUDENT_NAMES.includes(s.name)
    );

    console.log(`[Audit Students] Total: ${allStudents.length}, Fake: ${fakeStudents.length}, Genuine: ${genuineStudents.length}`);

    // Delete confirmed fake students
    if (fakeStudents.length > 0) {
      const delResult = await Student.deleteMany({
        $or: [
          { studentId: { $in: FAKE_STUDENT_IDS } },
          { name: { $in: FAKE_STUDENT_NAMES } }
        ]
      });
      console.log(`[Cleanup] Deleted ${delResult.deletedCount} confirmed fake student records.`);
    }

    // 2. Audit Sessions
    const allSessions = await Session.find({});
    const fakeSessions = allSessions.filter(s => FAKE_SESSION_DATES.includes(s.sessionDate));
    const genuineSessions = allSessions.filter(s => !FAKE_SESSION_DATES.includes(s.sessionDate));

    console.log(`[Audit Sessions] Total: ${allSessions.length}, Fake: ${fakeSessions.length}, Genuine: ${genuineSessions.length}`);

    if (fakeSessions.length > 0) {
      const delSessionsResult = await Session.deleteMany({
        sessionDate: { $in: FAKE_SESSION_DATES }
      });
      console.log(`[Cleanup] Deleted ${delSessionsResult.deletedCount} confirmed fake session records.`);
    }

    // 3. Audit Attendance
    const allAttendance = await Attendance.find({});
    const fakeAttendance = allAttendance.filter(a => 
      FAKE_STUDENT_IDS.includes(a.studentId) || 
      FAKE_SESSION_IDS.includes(a.sessionId) ||
      FAKE_SESSION_DATES.includes(a.sessionDate)
    );
    const genuineAttendance = allAttendance.filter(a => 
      !FAKE_STUDENT_IDS.includes(a.studentId) && 
      !FAKE_SESSION_IDS.includes(a.sessionId) &&
      !FAKE_SESSION_DATES.includes(a.sessionDate)
    );

    console.log(`[Audit Attendance] Total: ${allAttendance.length}, Fake: ${fakeAttendance.length}, Genuine: ${genuineAttendance.length}`);

    if (fakeAttendance.length > 0) {
      const delAttResult = await Attendance.deleteMany({
        $or: [
          { studentId: { $in: FAKE_STUDENT_IDS } },
          { sessionId: { $in: FAKE_SESSION_IDS } },
          { sessionDate: { $in: FAKE_SESSION_DATES } }
        ]
      });
      console.log(`[Cleanup] Deleted ${delAttResult.deletedCount} confirmed fake attendance records.`);
    }

    // 4. Audit Admin Activity Logs
    const delActResult = await AdminActivity.deleteMany({
      $or: [
        { action: 'SYSTEM_SEED' },
        { description: { $regex: /Seed initial|Aarav Sharma|SES-2026/i } }
      ]
    });
    console.log(`[Cleanup] Deleted ${delActResult.deletedCount} fake admin activity logs.`);

    // 5. Ensure Optimal Production Indexes on Atlas
    console.log('[Indexes] Ensuring optimal production indexes across collections...');
    await Student.collection.createIndex({ studentId: 1 }, { unique: true });
    await Student.collection.createIndex({ name: 1, className: 1 });
    await Student.collection.createIndex({ status: 1 });

    await Session.collection.createIndex({ sessionDate: 1 }, { unique: true });
    await Session.collection.createIndex({ sessionDate: 1, sessionStatus: 1 });

    await Attendance.collection.createIndex({ sessionId: 1, studentId: 1 }, { unique: true });
    await Attendance.collection.createIndex({ studentId: 1, sessionDate: -1 });

    await StudentAiQuota.collection.createIndex({ studentId: 1, date: 1 }, { unique: true });

    await WeeklyPlan.collection.createIndex({ weekKey: 1 }, { unique: true });
    await WeeklyPlan.collection.createIndex({ status: 1 });

    await WebsiteConfig.collection.createIndex({ configType: 1 }, { unique: true });
    await AdminActivity.collection.createIndex({ timestamp: -1 });

    console.log('[Indexes] All MongoDB Atlas indexes verified and established.');

    return {
      success: true,
      fakeStudentsRemoved: fakeStudents.length,
      genuineStudentsPreserved: genuineStudents.length,
      fakeSessionsRemoved: fakeSessions.length,
      genuineSessionsPreserved: genuineSessions.length,
      fakeAttendanceRemoved: fakeAttendance.length,
      genuineAttendancePreserved: genuineAttendance.length
    };
  } catch (err) {
    console.warn('[MongoDB Atlas Notice]', err.message);
    return { success: false, error: err.message };
  } finally {
    await mongoose.disconnect();
  }
};

if (process.argv[1] && process.argv[1].includes('cleanFakeData.js')) {
  runCleanupAndIndexOptimization().then(res => {
    console.log('[Result]', JSON.stringify(res, null, 2));
    process.exit(0);
  });
}
