// Authentic seed dataset for Bhagavad Gita weekend classes
export const initialStudents = [
  {
    id: "BGK-2026-0001",
    name: "Aarav Sharma",
    grade: "Class 7",
    whatsapp: "+91 98765 43210",
    school: "Delhi Public School",
    registrationDate: "2026-08-01",
    status: "active",
    notes: "Attentive student, participates in shloka recitation.",
    createdAt: "2026-08-01T09:00:00.000Z"
  },
  {
    id: "BGK-2026-0002",
    name: "Ananya Roy",
    grade: "Class 8",
    whatsapp: "+91 98301 24567",
    school: "Bhavan's Vidya Mandir",
    registrationDate: "2026-08-01",
    status: "active",
    notes: "Memorized Chapter 12 Shlokas 1-10.",
    createdAt: "2026-08-01T09:15:00.000Z"
  },
  {
    id: "BGK-2026-0003",
    name: "Rohan Mukherjee",
    grade: "Class 9",
    whatsapp: "+91 98312 98765",
    school: "South Point High School",
    registrationDate: "2026-08-08",
    status: "active",
    notes: "Plays Kartalas in kirtan session.",
    createdAt: "2026-08-08T10:00:00.000Z"
  },
  {
    id: "BGK-2026-0004",
    name: "Diya Sengupta",
    grade: "Class 6",
    whatsapp: "+91 97480 11223",
    school: "Delhi Public School",
    registrationDate: "2026-08-08",
    status: "active",
    notes: "Active in Sunday moral story quizzes.",
    createdAt: "2026-08-08T10:10:00.000Z"
  },
  {
    id: "BGK-2026-0005",
    name: "Aditya Verma",
    grade: "Class 10",
    whatsapp: "+91 98450 77889",
    school: "Kendriya Vidyalaya",
    registrationDate: "2026-08-15",
    status: "active",
    notes: "Youth volunteer team member.",
    createdAt: "2026-08-15T09:30:00.000Z"
  },
  {
    id: "BGK-2026-0006",
    name: "Sneha Patel",
    grade: "Class 8",
    whatsapp: "+91 94331 55667",
    school: "Bhavan's Vidya Mandir",
    registrationDate: "2026-08-22",
    status: "active",
    notes: "Enjoys Bhagavad Gita discussion circles.",
    createdAt: "2026-08-22T09:20:00.000Z"
  },
  {
    id: "BGK-2026-0007",
    name: "Karan Singhania",
    grade: "Class 7",
    whatsapp: "+91 91630 44556",
    school: "St. Xavier's Collegiate School",
    registrationDate: "2026-09-01",
    status: "active",
    notes: "New admission from September batch.",
    createdAt: "2026-09-01T09:00:00.000Z"
  },
  {
    id: "BGK-2026-0008",
    name: "Ishita Banerjee",
    grade: "Class 9",
    whatsapp: "+91 98360 88990",
    school: "South Point High School",
    registrationDate: "2026-09-05",
    status: "active",
    notes: "Artistic; made illustrations for Gita shlokas.",
    createdAt: "2026-09-05T09:00:00.000Z"
  }
];

// Conducted weekend class sessions (Saturdays and Sundays)
export const initialSessions = [
  {
    id: "SES-2026-09-12",
    date: "2026-09-12",
    dayOfWeek: "Saturday",
    title: "Session 1: Introduction to Bhagavad Gita As It Is",
    topic: "Setting the Battlefield of Kurukshetra (Chapter 1)",
    status: "conducted",
    presentCount: 8,
    absentCount: 0,
    totalRegistered: 8,
    createdAt: "2026-09-12T11:30:00.000Z"
  },
  {
    id: "SES-2026-09-13",
    date: "2026-09-13",
    dayOfWeek: "Sunday",
    title: "Session 2: The Eternal Soul & Sankhya Yoga",
    topic: "Understanding the difference between Body and Soul (Chapter 2, 2.11 - 2.20)",
    status: "conducted",
    presentCount: 7,
    absentCount: 1,
    totalRegistered: 8,
    createdAt: "2026-09-13T11:30:00.000Z"
  },
  {
    id: "SES-2026-09-19",
    date: "2026-09-19",
    dayOfWeek: "Saturday",
    title: "Session 3: Art of Selfless Action (Karma Yoga)",
    topic: "Work without Attachment to Fruits (Chapter 3, 3.19 - 3.27)",
    status: "conducted",
    presentCount: 7,
    absentCount: 1,
    totalRegistered: 8,
    createdAt: "2026-09-19T11:30:00.000Z"
  },
  {
    id: "SES-2026-09-20",
    date: "2026-09-20",
    dayOfWeek: "Sunday",
    title: "Session 4: Transcendental Knowledge & Guru Parampara",
    topic: "How Divine Knowledge descends through Discipular Succession (Chapter 4)",
    status: "conducted",
    presentCount: 8,
    absentCount: 0,
    totalRegistered: 8,
    createdAt: "2026-09-20T11:30:00.000Z"
  },
  {
    id: "SES-2026-09-26",
    date: "2026-09-26",
    dayOfWeek: "Saturday",
    title: "Session 5: Mind Control & Dhyana Yoga",
    topic: "Controlling the Restless Mind (Chapter 6, 6.5 & 6.26)",
    status: "conducted",
    presentCount: 6,
    absentCount: 2,
    totalRegistered: 8,
    createdAt: "2026-09-26T11:30:00.000Z"
  },
  {
    id: "SES-2026-09-27",
    date: "2026-09-27",
    dayOfWeek: "Sunday",
    title: "Session 6: Knowledge of the Absolute",
    topic: "The Supreme Creator and Source of all energies (Chapter 7)",
    status: "conducted",
    presentCount: 7,
    absentCount: 1,
    totalRegistered: 8,
    createdAt: "2026-09-27T11:30:00.000Z"
  },
  {
    id: "SES-2026-10-03",
    date: "2026-10-03",
    dayOfWeek: "Saturday",
    title: "Session 7: The Most Confidential Knowledge",
    topic: "Pure Devotional Service (Chapter 9, 9.26 & 9.27)",
    status: "conducted",
    presentCount: 8,
    absentCount: 0,
    totalRegistered: 8,
    createdAt: "2026-10-03T11:30:00.000Z"
  },
  {
    id: "SES-2026-10-04",
    date: "2026-10-04",
    dayOfWeek: "Sunday",
    title: "Session 8: The Opulence of the Absolute",
    topic: "Vibhuti Yoga: Seeing Krishna everywhere in nature (Chapter 10)",
    status: "conducted",
    presentCount: 7,
    absentCount: 1,
    totalRegistered: 8,
    createdAt: "2026-10-04T11:30:00.000Z"
  },
  {
    id: "SES-2026-10-10",
    date: "2026-10-10",
    dayOfWeek: "Saturday",
    title: "Session 9: The Universal Form (Vishwarupa)",
    topic: "Arjuna beholding the cosmic manifestation (Chapter 11)",
    status: "conducted",
    presentCount: 7,
    absentCount: 1,
    totalRegistered: 8,
    createdAt: "2026-10-10T11:30:00.000Z"
  },
  {
    id: "SES-2026-10-11",
    date: "2026-10-11",
    dayOfWeek: "Sunday",
    title: "Session 10: Bhakti Yoga — Devotional Service",
    topic: "The 35 qualities of a dear devotee (Chapter 12, 12.13 - 12.20)",
    status: "conducted",
    presentCount: 8,
    absentCount: 0,
    totalRegistered: 8,
    createdAt: "2026-10-11T11:30:00.000Z"
  }
];

// Attendance logs matching the above sessions
export const initialAttendance = [
  // Session 1: 2026-09-12 (All 8 Present)
  { id: "SES-2026-09-12_BGK-2026-0001", sessionId: "SES-2026-09-12", studentId: "BGK-2026-0001", date: "2026-09-12", status: "present", recordedBy: "ANIK" },
  { id: "SES-2026-09-12_BGK-2026-0002", sessionId: "SES-2026-09-12", studentId: "BGK-2026-0002", date: "2026-09-12", status: "present", recordedBy: "ANIK" },
  { id: "SES-2026-09-12_BGK-2026-0003", sessionId: "SES-2026-09-12", studentId: "BGK-2026-0003", date: "2026-09-12", status: "present", recordedBy: "ANIK" },
  { id: "SES-2026-09-12_BGK-2026-0004", sessionId: "SES-2026-09-12", studentId: "BGK-2026-0004", date: "2026-09-12", status: "present", recordedBy: "ANIK" },
  { id: "SES-2026-09-12_BGK-2026-0005", sessionId: "SES-2026-09-12", studentId: "BGK-2026-0005", date: "2026-09-12", status: "present", recordedBy: "ANIK" },
  { id: "SES-2026-09-12_BGK-2026-0006", sessionId: "SES-2026-09-12", studentId: "BGK-2026-0006", date: "2026-09-12", status: "present", recordedBy: "ANIK" },
  { id: "SES-2026-09-12_BGK-2026-0007", sessionId: "SES-2026-09-12", studentId: "BGK-2026-0007", date: "2026-09-12", status: "present", recordedBy: "ANIK" },
  { id: "SES-2026-09-12_BGK-2026-0008", sessionId: "SES-2026-09-12", studentId: "BGK-2026-0008", date: "2026-09-12", status: "present", recordedBy: "ANIK" },

  // Session 2: 2026-09-13 (Karan absent, rest present)
  { id: "SES-2026-09-13_BGK-2026-0001", sessionId: "SES-2026-09-13", studentId: "BGK-2026-0001", date: "2026-09-13", status: "present", recordedBy: "ANIK" },
  { id: "SES-2026-09-13_BGK-2026-0002", sessionId: "SES-2026-09-13", studentId: "BGK-2026-0002", date: "2026-09-13", status: "present", recordedBy: "ANIK" },
  { id: "SES-2026-09-13_BGK-2026-0003", sessionId: "SES-2026-09-13", studentId: "BGK-2026-0003", date: "2026-09-13", status: "present", recordedBy: "ANIK" },
  { id: "SES-2026-09-13_BGK-2026-0004", sessionId: "SES-2026-09-13", studentId: "BGK-2026-0004", date: "2026-09-13", status: "present", recordedBy: "ANIK" },
  { id: "SES-2026-09-13_BGK-2026-0005", sessionId: "SES-2026-09-13", studentId: "BGK-2026-0005", date: "2026-09-13", status: "present", recordedBy: "ANIK" },
  { id: "SES-2026-09-13_BGK-2026-0006", sessionId: "SES-2026-09-13", studentId: "BGK-2026-0006", date: "2026-09-13", status: "present", recordedBy: "ANIK" },
  { id: "SES-2026-09-13_BGK-2026-0007", sessionId: "SES-2026-09-13", studentId: "BGK-2026-0007", date: "2026-09-13", status: "absent", recordedBy: "ANIK" },
  { id: "SES-2026-09-13_BGK-2026-0008", sessionId: "SES-2026-09-13", studentId: "BGK-2026-0008", date: "2026-09-13", status: "present", recordedBy: "ANIK" },

  // Session 3: 2026-09-19 (Diya absent, rest present)
  { id: "SES-2026-09-19_BGK-2026-0001", sessionId: "SES-2026-09-19", studentId: "BGK-2026-0001", date: "2026-09-19", status: "present", recordedBy: "ANIK" },
  { id: "SES-2026-09-19_BGK-2026-0002", sessionId: "SES-2026-09-19", studentId: "BGK-2026-0002", date: "2026-09-19", status: "present", recordedBy: "ANIK" },
  { id: "SES-2026-09-19_BGK-2026-0003", sessionId: "SES-2026-09-19", studentId: "BGK-2026-0003", date: "2026-09-19", status: "present", recordedBy: "ANIK" },
  { id: "SES-2026-09-19_BGK-2026-0004", sessionId: "SES-2026-09-19", studentId: "BGK-2026-0004", date: "2026-09-19", status: "absent", recordedBy: "ANIK" },
  { id: "SES-2026-09-19_BGK-2026-0005", sessionId: "SES-2026-09-19", studentId: "BGK-2026-0005", date: "2026-09-19", status: "present", recordedBy: "ANIK" },
  { id: "SES-2026-09-19_BGK-2026-0006", sessionId: "SES-2026-09-19", studentId: "BGK-2026-0006", date: "2026-09-19", status: "present", recordedBy: "ANIK" },
  { id: "SES-2026-09-19_BGK-2026-0007", sessionId: "SES-2026-09-19", studentId: "BGK-2026-0007", date: "2026-09-19", status: "present", recordedBy: "ANIK" },
  { id: "SES-2026-09-19_BGK-2026-0008", sessionId: "SES-2026-09-19", studentId: "BGK-2026-0008", date: "2026-09-19", status: "present", recordedBy: "ANIK" },

  // Session 4: 2026-09-20 (All present)
  { id: "SES-2026-09-20_BGK-2026-0001", sessionId: "SES-2026-09-20", studentId: "BGK-2026-0001", date: "2026-09-20", status: "present", recordedBy: "ANIK" },
  { id: "SES-2026-09-20_BGK-2026-0002", sessionId: "SES-2026-09-20", studentId: "BGK-2026-0002", date: "2026-09-20", status: "present", recordedBy: "ANIK" },
  { id: "SES-2026-09-20_BGK-2026-0003", sessionId: "SES-2026-09-20", studentId: "BGK-2026-0003", date: "2026-09-20", status: "present", recordedBy: "ANIK" },
  { id: "SES-2026-09-20_BGK-2026-0004", sessionId: "SES-2026-09-20", studentId: "BGK-2026-0004", date: "2026-09-20", status: "present", recordedBy: "ANIK" },
  { id: "SES-2026-09-20_BGK-2026-0005", sessionId: "SES-2026-09-20", studentId: "BGK-2026-0005", date: "2026-09-20", status: "present", recordedBy: "ANIK" },
  { id: "SES-2026-09-20_BGK-2026-0006", sessionId: "SES-2026-09-20", studentId: "BGK-2026-0006", date: "2026-09-20", status: "present", recordedBy: "ANIK" },
  { id: "SES-2026-09-20_BGK-2026-0007", sessionId: "SES-2026-09-20", studentId: "BGK-2026-0007", date: "2026-09-20", status: "present", recordedBy: "ANIK" },
  { id: "SES-2026-09-20_BGK-2026-0008", sessionId: "SES-2026-09-20", studentId: "BGK-2026-0008", date: "2026-09-20", status: "present", recordedBy: "ANIK" },

  // Session 5: 2026-09-26 (Aarav and Sneha absent)
  { id: "SES-2026-09-26_BGK-2026-0001", sessionId: "SES-2026-09-26", studentId: "BGK-2026-0001", date: "2026-09-26", status: "absent", recordedBy: "ANIK" },
  { id: "SES-2026-09-26_BGK-2026-0002", sessionId: "SES-2026-09-26", studentId: "BGK-2026-0002", date: "2026-09-26", status: "present", recordedBy: "ANIK" },
  { id: "SES-2026-09-26_BGK-2026-0003", sessionId: "SES-2026-09-26", studentId: "BGK-2026-0003", date: "2026-09-26", status: "present", recordedBy: "ANIK" },
  { id: "SES-2026-09-26_BGK-2026-0004", sessionId: "SES-2026-09-26", studentId: "BGK-2026-0004", date: "2026-09-26", status: "present", recordedBy: "ANIK" },
  { id: "SES-2026-09-26_BGK-2026-0005", sessionId: "SES-2026-09-26", studentId: "BGK-2026-0005", date: "2026-09-26", status: "present", recordedBy: "ANIK" },
  { id: "SES-2026-09-26_BGK-2026-0006", sessionId: "SES-2026-09-26", studentId: "BGK-2026-0006", date: "2026-09-26", status: "absent", recordedBy: "ANIK" },
  { id: "SES-2026-09-26_BGK-2026-0007", sessionId: "SES-2026-09-26", studentId: "BGK-2026-0007", date: "2026-09-26", status: "present", recordedBy: "ANIK" },
  { id: "SES-2026-09-26_BGK-2026-0008", sessionId: "SES-2026-09-26", studentId: "BGK-2026-0008", date: "2026-09-26", status: "present", recordedBy: "ANIK" },

  // Session 6: 2026-09-27 (Rohan absent)
  { id: "SES-2026-09-27_BGK-2026-0001", sessionId: "SES-2026-09-27", studentId: "BGK-2026-0001", date: "2026-09-27", status: "present", recordedBy: "ANIK" },
  { id: "SES-2026-09-27_BGK-2026-0002", sessionId: "SES-2026-09-27", studentId: "BGK-2026-0002", date: "2026-09-27", status: "present", recordedBy: "ANIK" },
  { id: "SES-2026-09-27_BGK-2026-0003", sessionId: "SES-2026-09-27", studentId: "BGK-2026-0003", date: "2026-09-27", status: "absent", recordedBy: "ANIK" },
  { id: "SES-2026-09-27_BGK-2026-0004", sessionId: "SES-2026-09-27", studentId: "BGK-2026-0004", date: "2026-09-27", status: "present", recordedBy: "ANIK" },
  { id: "SES-2026-09-27_BGK-2026-0005", sessionId: "SES-2026-09-27", studentId: "BGK-2026-0005", date: "2026-09-27", status: "present", recordedBy: "ANIK" },
  { id: "SES-2026-09-27_BGK-2026-0006", sessionId: "SES-2026-09-27", studentId: "BGK-2026-0006", date: "2026-09-27", status: "present", recordedBy: "ANIK" },
  { id: "SES-2026-09-27_BGK-2026-0007", sessionId: "SES-2026-09-27", studentId: "BGK-2026-0007", date: "2026-09-27", status: "present", recordedBy: "ANIK" },
  { id: "SES-2026-09-27_BGK-2026-0008", sessionId: "SES-2026-09-27", studentId: "BGK-2026-0008", date: "2026-09-27", status: "present", recordedBy: "ANIK" },

  // Session 7: 2026-10-03 (All present)
  { id: "SES-2026-10-03_BGK-2026-0001", sessionId: "SES-2026-10-03", studentId: "BGK-2026-0001", date: "2026-10-03", status: "present", recordedBy: "ANIK" },
  { id: "SES-2026-10-03_BGK-2026-0002", sessionId: "SES-2026-10-03", studentId: "BGK-2026-0002", date: "2026-10-03", status: "present", recordedBy: "ANIK" },
  { id: "SES-2026-10-03_BGK-2026-0003", sessionId: "SES-2026-10-03", studentId: "BGK-2026-0003", date: "2026-10-03", status: "present", recordedBy: "ANIK" },
  { id: "SES-2026-10-03_BGK-2026-0004", sessionId: "SES-2026-10-03", studentId: "BGK-2026-0004", date: "2026-10-03", status: "present", recordedBy: "ANIK" },
  { id: "SES-2026-10-03_BGK-2026-0005", sessionId: "SES-2026-10-03", studentId: "BGK-2026-0005", date: "2026-10-03", status: "present", recordedBy: "ANIK" },
  { id: "SES-2026-10-03_BGK-2026-0006", sessionId: "SES-2026-10-03", studentId: "BGK-2026-0006", date: "2026-10-03", status: "present", recordedBy: "ANIK" },
  { id: "SES-2026-10-03_BGK-2026-0007", sessionId: "SES-2026-10-03", studentId: "BGK-2026-0007", date: "2026-10-03", status: "present", recordedBy: "ANIK" },
  { id: "SES-2026-10-03_BGK-2026-0008", sessionId: "SES-2026-10-03", studentId: "BGK-2026-0008", date: "2026-10-03", status: "present", recordedBy: "ANIK" },

  // Session 8: 2026-10-04 (Aditya absent)
  { id: "SES-2026-10-04_BGK-2026-0001", sessionId: "SES-2026-10-04", studentId: "BGK-2026-0001", date: "2026-10-04", status: "present", recordedBy: "ANIK" },
  { id: "SES-2026-10-04_BGK-2026-0002", sessionId: "SES-2026-10-04", studentId: "BGK-2026-0002", date: "2026-10-04", status: "present", recordedBy: "ANIK" },
  { id: "SES-2026-10-04_BGK-2026-0003", sessionId: "SES-2026-10-04", studentId: "BGK-2026-0003", date: "2026-10-04", status: "present", recordedBy: "ANIK" },
  { id: "SES-2026-10-04_BGK-2026-0004", sessionId: "SES-2026-10-04", studentId: "BGK-2026-0004", date: "2026-10-04", status: "present", recordedBy: "ANIK" },
  { id: "SES-2026-10-04_BGK-2026-0005", sessionId: "SES-2026-10-04", studentId: "BGK-2026-0005", date: "2026-10-04", status: "absent", recordedBy: "ANIK" },
  { id: "SES-2026-10-04_BGK-2026-0006", sessionId: "SES-2026-10-04", studentId: "BGK-2026-0006", date: "2026-10-04", status: "present", recordedBy: "ANIK" },
  { id: "SES-2026-10-04_BGK-2026-0007", sessionId: "SES-2026-10-04", studentId: "BGK-2026-0007", date: "2026-10-04", status: "present", recordedBy: "ANIK" },
  { id: "SES-2026-10-04_BGK-2026-0008", sessionId: "SES-2026-10-04", studentId: "BGK-2026-0008", date: "2026-10-04", status: "present", recordedBy: "ANIK" },

  // Session 9: 2026-10-10 (Ishita absent)
  { id: "SES-2026-10-10_BGK-2026-0001", sessionId: "SES-2026-10-10", studentId: "BGK-2026-0001", date: "2026-10-10", status: "present", recordedBy: "ANIK" },
  { id: "SES-2026-10-10_BGK-2026-0002", sessionId: "SES-2026-10-10", studentId: "BGK-2026-0002", date: "2026-10-10", status: "present", recordedBy: "ANIK" },
  { id: "SES-2026-10-10_BGK-2026-0003", sessionId: "SES-2026-10-10", studentId: "BGK-2026-0003", date: "2026-10-10", status: "present", recordedBy: "ANIK" },
  { id: "SES-2026-10-10_BGK-2026-0004", sessionId: "SES-2026-10-10", studentId: "BGK-2026-0004", date: "2026-10-10", status: "present", recordedBy: "ANIK" },
  { id: "SES-2026-10-10_BGK-2026-0005", sessionId: "SES-2026-10-10", studentId: "BGK-2026-0005", date: "2026-10-10", status: "present", recordedBy: "ANIK" },
  { id: "SES-2026-10-10_BGK-2026-0006", sessionId: "SES-2026-10-10", studentId: "BGK-2026-0006", date: "2026-10-10", status: "present", recordedBy: "ANIK" },
  { id: "SES-2026-10-10_BGK-2026-0007", sessionId: "SES-2026-10-10", studentId: "BGK-2026-0007", date: "2026-10-10", status: "present", recordedBy: "ANIK" },
  { id: "SES-2026-10-10_BGK-2026-0008", sessionId: "SES-2026-10-10", studentId: "BGK-2026-0008", date: "2026-10-10", status: "absent", recordedBy: "ANIK" },

  // Session 10: 2026-10-11 (Latest Session: All 8 present)
  { id: "SES-2026-10-11_BGK-2026-0001", sessionId: "SES-2026-10-11", studentId: "BGK-2026-0001", date: "2026-10-11", status: "present", recordedBy: "ANIK" },
  { id: "SES-2026-10-11_BGK-2026-0002", sessionId: "SES-2026-10-11", studentId: "BGK-2026-0002", date: "2026-10-11", status: "present", recordedBy: "ANIK" },
  { id: "SES-2026-10-11_BGK-2026-0003", sessionId: "SES-2026-10-11", studentId: "BGK-2026-0003", date: "2026-10-11", status: "present", recordedBy: "ANIK" },
  { id: "SES-2026-10-11_BGK-2026-0004", sessionId: "SES-2026-10-11", studentId: "BGK-2026-0004", date: "2026-10-11", status: "present", recordedBy: "ANIK" },
  { id: "SES-2026-10-11_BGK-2026-0005", sessionId: "SES-2026-10-11", studentId: "BGK-2026-0005", date: "2026-10-11", status: "present", recordedBy: "ANIK" },
  { id: "SES-2026-10-11_BGK-2026-0006", sessionId: "SES-2026-10-11", studentId: "BGK-2026-0006", date: "2026-10-11", status: "present", recordedBy: "ANIK" },
  { id: "SES-2026-10-11_BGK-2026-0007", sessionId: "SES-2026-10-11", studentId: "BGK-2026-0007", date: "2026-10-11", status: "present", recordedBy: "ANIK" },
  { id: "SES-2026-10-11_BGK-2026-0008", sessionId: "SES-2026-10-11", studentId: "BGK-2026-0008", date: "2026-10-11", status: "present", recordedBy: "ANIK" }
];

export const initialActivities = [
  {
    id: "ACT-001",
    type: "ATTENDANCE_RECORDED",
    description: "Recorded Sunday attendance for Session 10 (8 Present, 0 Absent)",
    timestamp: "2026-10-11T12:05:00.000Z",
    admin: "ANIK"
  },
  {
    id: "ACT-002",
    type: "ATTENDANCE_RECORDED",
    description: "Recorded Saturday attendance for Session 9 (7 Present, 1 Absent)",
    timestamp: "2026-10-10T12:10:00.000Z",
    admin: "ANIK"
  },
  {
    id: "ACT-003",
    type: "STUDENT_ADDED",
    description: "Registered Ishita Banerjee (BGK-2026-0008), Class 9",
    timestamp: "2026-09-05T09:00:00.000Z",
    admin: "ANIK"
  },
  {
    id: "ACT-004",
    type: "STUDENT_ADDED",
    description: "Registered Karan Singhania (BGK-2026-0007), Class 7",
    timestamp: "2026-09-01T09:00:00.000Z",
    admin: "ANIK"
  }
];
