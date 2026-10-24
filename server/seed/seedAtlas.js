import Student from '../models/Student.js';
import Session from '../models/Session.js';
import Attendance from '../models/Attendance.js';
import AdminActivity from '../models/AdminActivity.js';
import Counter from '../models/Counter.js';

export const seedAtlasIfEmpty = async () => {
  try {
    const studentCount = await Student.countDocuments();
    if (studentCount > 0) {
      return; // Already populated
    }

    console.log('\x1b[36m[MongoDB Atlas]\x1b[0m Seeding initial Bhagavad Gita attendance records...');

    // 1. Initialize atomic counter
    await Counter.findOneAndUpdate(
      { _id: 'studentId_2026' },
      { $set: { seq: 8 } },
      { upsert: true }
    );

    // 2. Initial Students
    const initialStudents = [
      {
        studentId: "BGK-2026-0001",
        name: "Aarav Sharma",
        className: "Class 7",
        whatsappNumber: "+91 98765 43210",
        schoolName: "Delhi Public School",
        registrationDate: "2026-08-01",
        status: "active",
        notes: "Attentive student, participates in shloka recitation."
      },
      {
        studentId: "BGK-2026-0002",
        name: "Ananya Roy",
        className: "Class 8",
        whatsappNumber: "+91 98301 24567",
        schoolName: "Bhavan's Vidya Mandir",
        registrationDate: "2026-08-01",
        status: "active",
        notes: "Memorized Chapter 12 Shlokas 1-10."
      },
      {
        studentId: "BGK-2026-0003",
        name: "Rohan Mukherjee",
        className: "Class 9",
        whatsappNumber: "+91 98312 98765",
        schoolName: "South Point High School",
        registrationDate: "2026-08-08",
        status: "active",
        notes: "Plays Kartalas in kirtan session."
      },
      {
        studentId: "BGK-2026-0004",
        name: "Diya Sengupta",
        className: "Class 6",
        whatsappNumber: "+91 97480 11223",
        schoolName: "Delhi Public School",
        registrationDate: "2026-08-08",
        status: "active",
        notes: "Active in Sunday moral story quizzes."
      },
      {
        studentId: "BGK-2026-0005",
        name: "Aditya Verma",
        className: "Class 10",
        whatsappNumber: "+91 98450 77889",
        schoolName: "Kendriya Vidyalaya",
        registrationDate: "2026-08-15",
        status: "active",
        notes: "Youth volunteer team member."
      },
      {
        studentId: "BGK-2026-0006",
        name: "Sneha Patel",
        className: "Class 8",
        whatsappNumber: "+91 94331 55667",
        schoolName: "Bhavan's Vidya Mandir",
        registrationDate: "2026-08-22",
        status: "active",
        notes: "Enjoys Bhagavad Gita discussion circles."
      },
      {
        studentId: "BGK-2026-0007",
        name: "Karan Singhania",
        className: "Class 7",
        whatsappNumber: "+91 91630 44556",
        schoolName: "St. Xavier's Collegiate School",
        registrationDate: "2026-09-01",
        status: "active",
        notes: "New admission from September batch."
      },
      {
        studentId: "BGK-2026-0008",
        name: "Ishita Banerjee",
        className: "Class 9",
        whatsappNumber: "+91 98360 88990",
        schoolName: "South Point High School",
        registrationDate: "2026-09-05",
        status: "active",
        notes: "Artistic; made illustrations for Gita shlokas."
      }
    ];

    await Student.insertMany(initialStudents);

    // 3. Initial Weekend Sessions
    const initialSessions = [
      { sessionDate: "2026-09-12", dayOfWeek: "Saturday", title: "Session 1: Introduction to Bhagavad Gita As It Is", topic: "Setting the Battlefield of Kurukshetra (Chapter 1)", sessionStatus: "conducted", presentCount: 8, absentCount: 0, totalRegistered: 8 },
      { sessionDate: "2026-09-13", dayOfWeek: "Sunday", title: "Session 2: The Eternal Soul & Sankhya Yoga", topic: "Understanding Body and Soul (Chapter 2)", sessionStatus: "conducted", presentCount: 7, absentCount: 1, totalRegistered: 8 },
      { sessionDate: "2026-09-19", dayOfWeek: "Saturday", title: "Session 3: Art of Selfless Action (Karma Yoga)", topic: "Work without Attachment (Chapter 3)", sessionStatus: "conducted", presentCount: 7, absentCount: 1, totalRegistered: 8 },
      { sessionDate: "2026-09-20", dayOfWeek: "Sunday", title: "Session 4: Transcendental Knowledge & Guru Parampara", topic: "Discipular Succession (Chapter 4)", sessionStatus: "conducted", presentCount: 8, absentCount: 0, totalRegistered: 8 },
      { sessionDate: "2026-09-26", dayOfWeek: "Saturday", title: "Session 5: Mind Control & Dhyana Yoga", topic: "Controlling the Restless Mind (Chapter 6)", sessionStatus: "conducted", presentCount: 6, absentCount: 2, totalRegistered: 8 },
      { sessionDate: "2026-09-27", dayOfWeek: "Sunday", title: "Session 6: Knowledge of the Absolute", topic: "Source of all energies (Chapter 7)", sessionStatus: "conducted", presentCount: 7, absentCount: 1, totalRegistered: 8 },
      { sessionDate: "2026-10-03", dayOfWeek: "Saturday", title: "Session 7: The Most Confidential Knowledge", topic: "Pure Devotional Service (Chapter 9)", sessionStatus: "conducted", presentCount: 8, absentCount: 0, totalRegistered: 8 },
      { sessionDate: "2026-10-04", dayOfWeek: "Sunday", title: "Session 8: The Opulence of the Absolute", topic: "Vibhuti Yoga (Chapter 10)", sessionStatus: "conducted", presentCount: 7, absentCount: 1, totalRegistered: 8 },
      { sessionDate: "2026-10-10", dayOfWeek: "Saturday", title: "Session 9: The Universal Form (Vishwarupa)", topic: "Arjuna beholding the cosmic form (Chapter 11)", sessionStatus: "conducted", presentCount: 7, absentCount: 1, totalRegistered: 8 },
      { sessionDate: "2026-10-11", dayOfWeek: "Sunday", title: "Session 10: Bhakti Yoga — Devotional Service", topic: "35 Qualities of a Devotee (Chapter 12)", sessionStatus: "conducted", presentCount: 8, absentCount: 0, totalRegistered: 8 }
    ];

    await Session.insertMany(initialSessions);

    // 4. Initial Attendance Marks for all sessions
    const attData = [];
    const studentIds = initialStudents.map(s => s.studentId);

    // Seed session 1: all 8 present
    studentIds.forEach(id => attData.push({ sessionId: "SES-2026-09-12", studentId: id, sessionDate: "2026-09-12", status: "present" }));
    
    // Seed session 2: BGK-2026-0007 absent, rest present
    studentIds.forEach(id => attData.push({ sessionId: "SES-2026-09-13", studentId: id, sessionDate: "2026-09-13", status: id === "BGK-2026-0007" ? "absent" : "present" }));

    // Seed session 3: BGK-2026-0004 absent
    studentIds.forEach(id => attData.push({ sessionId: "SES-2026-09-19", studentId: id, sessionDate: "2026-09-19", status: id === "BGK-2026-0004" ? "absent" : "present" }));

    // Seed session 4: all present
    studentIds.forEach(id => attData.push({ sessionId: "SES-2026-09-20", studentId: id, sessionDate: "2026-09-20", status: "present" }));

    // Seed session 5: BGK-2026-0001 and BGK-2026-0006 absent
    studentIds.forEach(id => attData.push({ sessionId: "SES-2026-09-26", studentId: id, sessionDate: "2026-09-26", status: (id === "BGK-2026-0001" || id === "BGK-2026-0006") ? "absent" : "present" }));

    // Seed session 6: BGK-2026-0003 absent
    studentIds.forEach(id => attData.push({ sessionId: "SES-2026-09-27", studentId: id, sessionDate: "2026-09-27", status: id === "BGK-2026-0003" ? "absent" : "present" }));

    // Seed session 7: all present
    studentIds.forEach(id => attData.push({ sessionId: "SES-2026-10-03", studentId: id, sessionDate: "2026-10-03", status: "present" }));

    // Seed session 8: BGK-2026-0005 absent
    studentIds.forEach(id => attData.push({ sessionId: "SES-2026-10-04", studentId: id, sessionDate: "2026-10-04", status: id === "BGK-2026-0005" ? "absent" : "present" }));

    // Seed session 9: BGK-2026-0008 absent
    studentIds.forEach(id => attData.push({ sessionId: "SES-2026-10-10", studentId: id, sessionDate: "2026-10-10", status: id === "BGK-2026-0008" ? "absent" : "present" }));

    // Seed session 10: all present
    studentIds.forEach(id => attData.push({ sessionId: "SES-2026-10-11", studentId: id, sessionDate: "2026-10-11", status: "present" }));

    await Attendance.insertMany(attData);

    // 5. Initial Audit Activity
    await AdminActivity.create({
      adminId: "ANIK",
      action: "SYSTEM_SEED",
      recordType: "system",
      description: "Initialized Krishna Kripa database in MongoDB Atlas with starting students and session logs."
    });

    console.log('\x1b[32m[MongoDB Atlas]\x1b[0m Database seeded successfully with initial Gita classes.');
  } catch (error) {
    console.warn('[MongoDB Atlas Seed Warning]', error.message);
  }
};
