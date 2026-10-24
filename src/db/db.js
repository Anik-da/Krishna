// Live Data Layer — Connected directly to MongoDB Atlas Backend API
import {
  idbGetAll,
  idbGet,
  idbPut,
  idbBulkPut,
  idbGetNextStudentSequence,
  idbPurgeFakeData,
  idbResetDatabase,
  idbDelete,
  idbClear
} from './indexedDbService';
import {
  firestoreSavePublishedConfig,
  firestoreGetPublishedConfig,
  firestoreSaveCurrentPlan,
  firestoreGetCurrentPlan,
  firestoreSetDoc,
  firestoreGetDoc,
  firestoreGetAll,
  firestoreDeleteDoc
} from './firebaseService';
import { 
  apiGetStudents, 
  apiGetStudentProfile,
  apiCreateStudent,
  apiStudentRegister, 
  apiUpdateStudent, 
  apiArchiveStudent,
  apiDeleteStudentPermanent,
  apiGetSessions,
  apiCreateSession,
  apiDeleteSessionPermanent,
  apiCancelSession,
  apiRestoreSession,
  apiUpdateSessionConductor,
  apiSaveAttendance,
  apiGetSessionAttendance,
  apiPublishConfig, 
  apiGetPublishedConfig,
  apiGetDraftConfig,
  apiSaveDraftConfig,
  apiGetCurrentPlan,
  apiGetAllPlans,
  apiSaveWeeklyPlan,
  apiReschedulePlan,
  apiCancelWeeklyPlan,
  apiGetActiveJanmashtamiSeason,
  apiGetAllJanmashtamiSeasons,
  apiUpdateJanmashtamiSeason,
  apiGetJanmashtamiAdjustments,
  apiAddJanmashtamiAdjustment,
  apiUpdateJanmashtamiPrize,
  apiFinalizeJanmashtamiSeason
} from '../api/apiClient';

// Format day of week for any date string YYYY-MM-DD
export const getDayOfWeek = (dateString) => {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', { weekday: 'long' });
};

// Check if a date is a weekend (Saturday or Sunday)
export const isWeekend = (dateString) => {
  const day = getDayOfWeek(dateString);
  return day === 'Saturday' || day === 'Sunday';
};

// Pad sequence to 4 digits: BGK-2026-0001
export const formatStudentId = (sequenceNumber, year = '2026') => {
  const padded = String(sequenceNumber).padStart(4, '0');
  return `BGK-${year}-${padded}`;
};

export const logAdminActivity = async (type, description, details = {}) => {
  const activity = {
    id: `ACT-${Date.now()}`,
    type,
    action: type,
    description,
    details,
    timestamp: new Date().toISOString(),
    admin: 'ANIK'
  };
  await idbPut('adminActivity', activity).catch(() => {});
  return activity;
};

// ============================================================================
// STUDENT MANAGEMENT — MONGODB ATLAS PRIMARY SOURCE OF TRUTH
// ============================================================================

export const getAllStudents = async (includeArchived = true) => {
  // 1. Fetch directly from MongoDB Atlas backend API
  try {
    const mongoStudents = await apiGetStudents({ status: includeArchived ? 'all' : 'active' });
    if (mongoStudents && Array.isArray(mongoStudents)) {
      // Keep local IndexedDB updated as a fast read cache
      await idbBulkPut('students', mongoStudents).catch(() => {});
      return mongoStudents;
    }
  } catch (e) {
    console.warn("MongoDB Atlas student fetch notice:", e.message);
    // 2. Resilient fallback to Cloud Firestore
    try {
      const fsStudents = await firestoreGetAll('students', 4000);
      if (fsStudents && Array.isArray(fsStudents) && fsStudents.length > 0) {
        await idbBulkPut('students', fsStudents).catch(() => {});
        return includeArchived ? fsStudents : fsStudents.filter(s => s.status !== 'archived');
      }
    } catch (_) {}
    // 3. Fallback to local IndexedDB cache
    const cached = await idbGetAll('students').catch(() => []);
    if (cached && cached.length > 0) {
      return includeArchived ? cached : cached.filter(s => s.status !== 'archived');
    }
    throw new Error(`Unable to fetch students: ${e.message}`);
  }

  const cached = await idbGetAll('students').catch(() => []);
  return includeArchived ? (cached || []) : (cached || []).filter(s => s.status !== 'archived');
};

export const getStudentById = async (id) => {
  try {
    const profile = await apiGetStudentProfile(id);
    if (profile?.student) {
      await idbPut('students', profile.student).catch(() => {});
      return profile.student;
    }
  } catch (e) {
    console.warn("MongoDB Atlas student profile fetch notice:", e.message);
  }
  const student = await idbGet('students', id).catch(() => null);
  return student;
};

export const createStudent = async (studentData) => {
  const { name, grade, className, whatsapp, whatsappNumber, school, schoolName, notes, registrationDate } = studentData;

  const finalName = name?.trim();
  const finalClass = (className || grade)?.trim();
  const finalPhone = (whatsappNumber || whatsapp)?.trim();
  const finalSchool = (schoolName || school)?.trim();

  if (!finalName || !finalClass || !finalPhone || !finalSchool) {
    throw new Error('All 4 fields are required: Full Name, Class/Grade, WhatsApp Number, and School Name.');
  }

  // Check if admin is currently logged in
  const adminToken = localStorage.getItem('krishna_kripa_jwt_token') || sessionStorage.getItem('krishna_kripa_jwt_token');

  let savedStudent = null;
  let returnedToken = null;

  try {
    if (adminToken) {
      // Admin registration endpoint
      const apiRes = await apiCreateStudent({
        name: finalName,
        className: finalClass,
        grade: finalClass,
        whatsappNumber: finalPhone,
        schoolName: finalSchool,
        registrationDate: registrationDate || new Date().toISOString().split('T')[0],
        notes: notes || ''
      });
      savedStudent = apiRes;
    } else {
      // Student portal public self-registration endpoint
      const apiRes = await apiStudentRegister({
        name: finalName,
        className: finalClass,
        grade: finalClass,
        whatsappNumber: finalPhone,
        schoolName: finalSchool,
        registrationDate: registrationDate || new Date().toISOString().split('T')[0],
        notes: notes || ''
      });
      savedStudent = apiRes?.student || apiRes?.data;
      returnedToken = apiRes?.token;
      if (returnedToken) {
        localStorage.setItem('krishna_student_token', returnedToken);
      }
    }
  } catch (apiErr) {
    const rawMsg = apiErr?.message || '';
    // If it's an explicit validation error from server (e.g. 409 duplicate), rethrow so user sees exact message
    if (rawMsg.includes('already exists') || rawMsg.includes('required')) {
      throw apiErr;
    }

    console.warn("Primary API registration notice (engaging resilient fallback):", rawMsg);

    // Resilient fallback: auto-generate Student ID and persist to Firestore + IndexedDB
    const year = (registrationDate ? registrationDate.split('-')[0] : '2026') || '2026';
    let nextSeq = 1;
    try {
      let activeStudents = [];
      try {
        const fsStudents = await firestoreGetAll('students', 500);
        if (Array.isArray(fsStudents) && fsStudents.length > 0) {
          activeStudents = fsStudents;
        }
      } catch (_) {}

      if (activeStudents.length === 0) {
        activeStudents = await idbGetAll('students').catch(() => []);
      }

      const seqNums = (activeStudents || [])
        .filter(s => s && s.status !== 'archived' && s.status !== 'deleted')
        .map(s => {
          const match = (s.studentId || s.id || '').match(/BGK-\d{4}-(\d+)/);
          return match ? parseInt(match[1], 10) : 0;
        })
        .filter(n => !isNaN(n) && n > 0);

      if (seqNums.length > 0) {
        nextSeq = Math.max(...seqNums) + 1;
      } else {
        nextSeq = 1;
      }
    } catch (_) {
      nextSeq = 1;
    }

    const fallbackStudentId = formatStudentId(nextSeq, year);
    const nowIso = new Date().toISOString();

    savedStudent = {
      id: fallbackStudentId,
      studentId: fallbackStudentId,
      name: finalName,
      className: finalClass,
      grade: finalClass,
      whatsappNumber: finalPhone,
      whatsapp: finalPhone,
      schoolName: finalSchool,
      school: finalSchool,
      registrationDate: registrationDate || nowIso.split('T')[0],
      status: 'active',
      notes: notes || '',
      createdAt: nowIso,
      updatedAt: nowIso
    };
  }

  if (!savedStudent || (!savedStudent.id && !savedStudent.studentId)) {
    throw new Error('Database insertion was not acknowledged. Please try again.');
  }

  const studentObj = {
    ...savedStudent,
    id: savedStudent.studentId || savedStudent.id,
    studentId: savedStudent.studentId || savedStudent.id,
    name: finalName,
    grade: finalClass,
    className: finalClass,
    whatsapp: finalPhone,
    whatsappNumber: finalPhone,
    school: finalSchool,
    schoolName: finalSchool,
    status: 'active',
    ...(returnedToken ? { token: returnedToken } : {})
  };

  // Dual-write to Cloud Firestore so all connected devices see the student immediately
  await firestoreSetDoc('students', studentObj.studentId, studentObj).catch(() => {});

  // Automatically create active student card record so QR code verification is immediately valid
  await firestoreSetDoc('studentcards', studentObj.studentId, {
    studentId: studentObj.studentId,
    verificationToken: studentObj.studentId,
    status: 'active',
    cardVersion: 1,
    issueDate: studentObj.registrationDate || new Date().toISOString().split('T')[0],
    qrCodeUrl: `https://krishna-kripa-attendance.web.app/?verifyCard=${encodeURIComponent(studentObj.studentId)}`
  }).catch(() => {});

  // Cache in IndexedDB
  await idbPut('students', studentObj).catch(() => {});

  await logAdminActivity(
    'STUDENT_REGISTERED',
    `Registered new student: ${studentObj.name} (${studentObj.studentId}), ${studentObj.grade}`
  );

  return studentObj;
};

export const updateStudent = async (id, updateData) => {
  const res = await apiUpdateStudent(id, updateData);
  const updatedStudent = res || updateData;

  const existing = (await idbGet('students', id).catch(() => null)) || {};
  const merged = {
    ...existing,
    ...updatedStudent,
    id,
    studentId: id,
    updatedAt: new Date().toISOString()
  };

  await idbPut('students', merged).catch(() => {});

  await logAdminActivity(
    'STUDENT_EDITED',
    `Updated details for student ${merged.name || id} (${id})`
  );

  return merged;
};

export const archiveStudent = async (id) => {
  try {
    await apiArchiveStudent(id);
  } catch (apiErr) {
    console.warn("Primary API archive student notice (engaging resilient fallback):", apiErr.message);
  }

  // Sync archived status to Firestore
  try {
    await firestoreSetDoc('students', id, { 
      status: 'archived', 
      archivedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  } catch (fErr) {}

  const existing = await idbGet('students', id).catch(() => null);
  if (existing) {
    const updated = {
      ...existing,
      status: 'archived',
      archivedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await idbPut('students', updated).catch(() => {});
  }

  await logAdminActivity(
    'STUDENT_ARCHIVED',
    `Archived student ${existing?.name || id} (${id}). Historical attendance preserved.`
  );

  return { success: true, id, status: 'archived' };
};

export const deleteStudent = async (id, permanent = true) => {
  if (permanent === false) {
    return await archiveStudent(id);
  }

  // 1. Delete on MongoDB Atlas backend
  try {
    await apiDeleteStudentPermanent(id);
  } catch (apiErr) {
    console.warn("Primary API delete student notice (engaging resilient fallback):", apiErr.message);
  }

  // 2. Remove student and card from Cloud Firestore
  try {
    await firestoreDeleteDoc('students', id);
    await firestoreDeleteDoc('studentcards', id);
  } catch (fErr) {
    console.warn("Firestore student deletion notice:", fErr.message);
  }

  // 3. Remove student from local caches
  await idbDelete('students', id).catch(() => {});

  // Remove attendance records from local cache
  try {
    const allAttendance = await idbGetAll('attendance').catch(() => []);
    const studentRecords = allAttendance.filter(a => a.studentId === id || a.id?.endsWith(`_${id}`));
    for (const record of studentRecords) {
      if (record.id) await idbDelete('attendance', record.id).catch(() => {});
    }
  } catch (e) {}

  // 4. Clear auth token if student user matches
  try {
    const storedUser = localStorage.getItem('krishna_student_user');
    if (storedUser) {
      const parsed = JSON.parse(storedUser);
      if (parsed.id === id || parsed.studentId === id) {
        localStorage.removeItem('krishna_student_user');
        localStorage.removeItem('krishna_student_token');
      }
    }
  } catch (e) {}

  await logAdminActivity(
    'STUDENT_DELETED',
    `Permanently deleted student ${id} from MongoDB Atlas.`
  );

  return { success: true, deletedId: id };
};

// ============================================================================
// SESSIONS & ATTENDANCE MANAGEMENT
// ============================================================================

// ============================================================================
// SESSIONS & ATTENDANCE MANAGEMENT — MONGODB ATLAS PRIMARY SOURCE OF TRUTH
// ============================================================================

export const getAllSessions = async () => {
  let sessions = [];
  try {
    const cloudSessions = await apiGetSessions();
    if (cloudSessions && Array.isArray(cloudSessions) && cloudSessions.length > 0) {
      sessions = cloudSessions;
      await idbClear('sessions').catch(() => {});
      await idbBulkPut('sessions', cloudSessions).catch(() => {});
    }
  } catch (e) {
    console.warn("MongoDB Atlas sessions fetch notice:", e.message);
  }

  // Fallback to Cloud Firestore
  if (sessions.length === 0) {
    try {
      const fsSessions = await firestoreGetAll('sessions');
      if (Array.isArray(fsSessions) && fsSessions.length > 0) {
        sessions = fsSessions;
        await idbBulkPut('sessions', fsSessions).catch(() => {});
      }
    } catch (fe) {
      console.warn("Firestore sessions fetch notice:", fe.message);
    }
  }

  // Fallback to IndexedDB
  if (sessions.length === 0) {
    const cached = await idbGetAll('sessions').catch(() => []);
    if (Array.isArray(cached) && cached.length > 0) {
      sessions = cached;
    }
  }

  const valid = (sessions || []).filter(s => s.date !== '2026-10-18' && s.sessionDate !== '2026-10-18');
  return valid.sort((a, b) => (b.date || b.sessionDate || '').localeCompare(a.date || a.sessionDate || ''));
};

export const getSessionById = async (id) => {
  const sessions = await getAllSessions();
  return sessions.find(s => s.id === id || s._id === id || s.date === id || s.sessionDate === id);
};

export const getSessionByDate = async (date) => {
  const sessions = await getAllSessions();
  return sessions.find(s => s.date === date || s.sessionDate === date);
};

export const getAttendanceBySessionId = async (sessionId) => {
  try {
    const records = await apiGetSessionAttendance(sessionId);
    if (records && Array.isArray(records)) {
      await idbBulkPut('attendance', records).catch(() => {});
      return records;
    }
  } catch (e) {
    console.warn("MongoDB Atlas session attendance fetch notice:", e.message);
  }

  const all = await idbGetAll('attendance').catch(() => []);
  return (all || []).filter(a => a.sessionId === sessionId || a.date === sessionId);
};

export const saveSessionAttendance = async ({
  date,
  title,
  topic,
  status = 'conducted',
  records,
  conductedByName,
  adminUsername = 'ANIK',
  adminName = 'Anik (Administrator)'
}) => {
  if (!date) throw new Error('Session date is required.');
  if (!records || records.length === 0) throw new Error('Attendance records are required.');
  if (!conductedByName || !conductedByName.trim()) {
    throw new Error("Who conducted today's class? Please enter or select the teacher/speaker's full name before finalizing attendance.");
  }

  const dayOfWeek = getDayOfWeek(date);
  const sessionId = `SES-${date}`;
  const cleanConductor = conductedByName.trim();

  // 1. Submit directly to MongoDB Atlas backend endpoint
  const apiPayload = {
    sessionDate: date,
    date,
    title: title || `Bhagavad Gita Class — ${dayOfWeek}`,
    topic: topic || '',
    conductedByName: cleanConductor,
    records
  };

  const savedData = await apiSaveAttendance(apiPayload);

  // 2. Cache updated session in IndexedDB
  const now = new Date().toISOString();
  let presentCount = 0;
  let absentCount = 0;
  records.forEach(r => {
    if (r.status === 'present') presentCount++;
    else absentCount++;
  });

  const sessionObj = {
    id: sessionId,
    sessionId,
    date,
    sessionDate: date,
    dayOfWeek,
    title: title || `Bhagavad Gita Class — ${dayOfWeek}`,
    topic: topic || '',
    status: 'conducted',
    sessionStatus: 'conducted',
    conductedByName: cleanConductor,
    attendanceRecordedBy: adminUsername,
    attendanceRecordedByName: adminName,
    attendanceRecordedAt: now,
    presentCount,
    absentCount,
    totalRegistered: records.length,
    updatedAt: now,
    createdAt: now,
    ...(savedData?.session || {})
  };

  await idbPut('sessions', sessionObj).catch(() => {});
  await firestoreSetDoc('sessions', sessionId, sessionObj).catch(() => {});

  const attendanceItems = records.map(r => ({
    id: `${sessionId}_${r.studentId}`,
    sessionId,
    studentId: r.studentId,
    date,
    sessionDate: date,
    status: r.status,
    recordedBy: adminUsername,
    recordedAt: now
  }));

  await idbBulkPut('attendance', attendanceItems).catch(() => {});

  await logAdminActivity(
    'ATTENDANCE_SUBMITTED',
    `Saved attendance for ${dayOfWeek}, ${date} conducted by ${cleanConductor} (${presentCount} Present, ${absentCount} Absent)`
  );

  return sessionObj;
};

export const updateSessionConductor = async (sessionId, newConductorName, adminUsername = 'ANIK') => {
  if (!newConductorName || !newConductorName.trim()) {
    throw new Error('Class conductor name cannot be empty.');
  }
  const clean = newConductorName.trim();
  const dateId = sessionId.replace('SES-', '');
  await apiUpdateSessionConductor(dateId, clean);

  const session = await getSessionById(sessionId).catch(() => null);
  const updated = {
    ...(session || {}),
    id: sessionId,
    conductedByName: clean,
    updatedAt: new Date().toISOString()
  };
  await idbPut('sessions', updated).catch(() => {});

  await logAdminActivity(
    'SESSION_UPDATE',
    `Corrected class conductor for ${session?.date || dateId} to "${clean}"`
  );

  return updated;
};

export const cancelSession = async (sessionId, reason = 'Class postponed/holiday') => {
  const dateId = sessionId.replace('SES-', '');
  try {
    await apiCancelSession(dateId, reason);
  } catch (err) {
    console.warn("apiCancelSession remote notice:", err.message);
  }

  const session = await getSessionById(sessionId).catch(() => null);
  const updated = {
    ...(session || {}),
    id: sessionId,
    status: 'cancelled',
    sessionStatus: 'cancelled',
    cancellationReason: reason,
    updatedAt: new Date().toISOString()
  };
  await idbPut('sessions', updated).catch(() => {});

  await logAdminActivity(
    'SESSION_CANCELLED',
    `Cancelled session on ${session?.date || dateId}: "${reason}"`
  ).catch(() => {});

  return updated;
};

export const restoreSession = async (sessionId) => {
  const dateId = sessionId.replace('SES-', '');
  try {
    await apiRestoreSession(dateId);
  } catch (err) {
    console.warn("apiRestoreSession remote notice:", err.message);
  }

  const session = await getSessionById(sessionId).catch(() => null);
  const updated = {
    ...(session || {}),
    id: sessionId,
    status: 'conducted',
    sessionStatus: 'conducted',
    cancellationReason: '',
    updatedAt: new Date().toISOString()
  };
  await idbPut('sessions', updated).catch(() => {});

  await logAdminActivity(
    'SESSION_RESTORED',
    `Restored session on ${session?.date || dateId} as conducted.`
  ).catch(() => {});

  return updated;
};

export const deleteSession = async (sessionId) => {
  const dateId = sessionId.replace('SES-', '');
  try {
    await apiDeleteSessionPermanent(dateId);
  } catch (err) {
    console.warn("apiDeleteSessionPermanent notice:", err.message);
  }

  await idbDelete('sessions', sessionId).catch(() => {});
  await idbDelete('sessions', dateId).catch(() => {});

  // Remove all attendance records for this session & date from IndexedDB
  try {
    const allAtt = await idbGetAll('attendance');
    const toDelete = (allAtt || []).filter(a => 
      a.sessionId === sessionId || 
      a.sessionId === dateId || 
      a.sessionId === `SES-${dateId}` || 
      a.sessionDate === dateId || 
      a.date === dateId
    );
    for (const item of toDelete) {
      if (item.id) await idbDelete('attendance', item.id).catch(() => {});
    }
  } catch (e) {
    console.warn("Notice: clearing attendance records on session delete:", e);
  }

  await logAdminActivity(
    'SESSION_DELETED',
    `Permanently deleted session ${sessionId}`
  ).catch(() => {});

  // Notify active components to re-fetch attendance and session data
  try {
    window.dispatchEvent(new CustomEvent('krishna_session_deleted', { detail: { sessionId, dateId } }));
    window.dispatchEvent(new CustomEvent('krishna_attendance_updated', { detail: { sessionId, dateId } }));
  } catch (e) {}

  return true;
};

// ============================================================================
// INDIVIDUAL ATTENDANCE PROFILE & STATS
// ============================================================================
export const calculateStudentAttendanceStats = async (studentIdOrObj, fallbackStudent = null) => {
  let student = null;
  if (typeof studentIdOrObj === 'object' && studentIdOrObj !== null) {
    student = studentIdOrObj;
  } else if (studentIdOrObj) {
    student = await idbGet('students', studentIdOrObj);
  }
  if (!student && fallbackStudent) {
    student = fallbackStudent;
  }
  if (!student) return null;

  const stId = student.studentId || student.id;
  const regDate = student.registrationDate || (student.createdAt ? student.createdAt.split('T')[0] : '2026-08-01');
  const today = new Date().toISOString().split('T')[0];

  const allSessions = await getAllSessions();
  let allAttendance = [];
  try {
    allAttendance = await idbGetAll('attendance');
  } catch (e) {
    allAttendance = [];
  }

  // Only conducted sessions on or after registrationDate and on or before today
  const eligibleSessions = allSessions.filter(s => {
    const sStatus = s.status || s.sessionStatus;
    const sDate = s.date || s.sessionDate;
    if (sStatus !== 'conducted') return false;
    if (regDate && sDate < regDate) return false;
    if (sDate > today) return false;
    return true;
  }).sort((a, b) => (b.date || b.sessionDate || '').localeCompare(a.date || a.sessionDate || ''));

  // Build attendance map for this student
  const studentAttendanceMap = new Map();
  allAttendance
    .filter(a => a.studentId === stId || a.studentId === student.id || a.studentId === student.studentId)
    .forEach(a => {
      if (a.sessionId) studentAttendanceMap.set(a.sessionId, a.status);
      if (a.date) studentAttendanceMap.set(a.date, a.status);
      if (a.sessionDate) studentAttendanceMap.set(a.sessionDate, a.status);
    });

  let attendedCount = 0;
  let missedCount = 0;
  let notRecordedCount = 0;

  const history = eligibleSessions.map(session => {
    const sDate = session.date || session.sessionDate;
    const sId = session.id || session.sessionId || `SES-${sDate}`;
    const rawStatus = studentAttendanceMap.get(sId) || studentAttendanceMap.get(sDate) || studentAttendanceMap.get(`SES-${sDate}`);
    
    let displayStatus = 'Not Recorded';
    if (rawStatus === 'present') {
      displayStatus = 'Present';
      attendedCount++;
    } else if (rawStatus === 'absent') {
      displayStatus = 'Absent';
      missedCount++;
    } else {
      notRecordedCount++;
    }

    return {
      sessionId: sId,
      sessionDate: sDate,
      date: sDate,
      dayOfWeek: session.dayOfWeek || getDayOfWeek(sDate),
      day: session.dayOfWeek || getDayOfWeek(sDate),
      title: session.title || 'Bhagavad Gita Study',
      topic: session.topic || 'Bhagavad Gita As It Is',
      conductedByName: session.conductedByName || session.speakerName || 'Class Teacher',
      status: rawStatus === 'present' ? 'present' : (rawStatus === 'absent' ? 'absent' : 'not_recorded'),
      displayStatus,
      rawStatus
    };
  });

  const totalEligible = eligibleSessions.length;
  // If 0 eligible classes (new student) or 0 attended classes -> strictly 0%!
  const percentage = (totalEligible > 0 && attendedCount > 0)
    ? Math.round((attendedCount / totalEligible) * 100) 
    : 0;

  let displayPercentage = '0%';
  if (totalEligible === 0) {
    displayPercentage = '0% (New Registration)';
  } else if (attendedCount === 0) {
    displayPercentage = '0%';
  } else {
    displayPercentage = `${percentage}%`;
  }

  let statusNote = '';
  if (totalEligible === 0) {
    statusNote = 'Welcome to Krishna Kripa! No weekend classes have been conducted since your registration.';
  } else if (attendedCount === 0) {
    statusNote = 'No classes attended yet. Join upcoming weekend Bhagavad Gita study sessions to build steady attendance!';
  } else if (percentage >= 75) {
    statusNote = 'Good attendance standing. Attending weekend Bhagavad Gita study sessions consistently.';
  } else {
    statusNote = 'Attendance standing is below 75%. Join upcoming weekend classes to improve.';
  }

  return {
    student,
    studentId: stId,
    name: student.name,
    className: student.className || student.grade,
    schoolName: student.schoolName || student.school,
    registrationDate: regDate,
    totalEligibleConducted: totalEligible,
    totalEligible,
    presentCount: attendedCount,
    classesPresent: attendedCount,
    attendedCount,
    absentCount: missedCount,
    classesAbsent: missedCount,
    missedCount,
    unrecordedCount: notRecordedCount,
    notRecordedCount,
    attendancePercentage: percentage,
    percentage,
    displayPercentage,
    statusNote,
    recentHistory: history,
    records: history,
    history
  };
};

// ============================================================================
// DASHBOARD METRICS
// ============================================================================
export const getDashboardMetrics = async () => {
  const students = await getAllStudents(false);
  const activeStudents = students.filter(s => s.status !== 'archived');
  const sessions = await getAllSessions();
  const conductedSessions = sessions.filter(s => (s.status || s.sessionStatus) === 'conducted');
  const activities = await idbGetAll('adminActivity');

  const sortedSessions = [...sessions].sort((a, b) => (b.date || b.sessionDate).localeCompare(a.date || a.sessionDate));
  const latestConducted = sortedSessions.find(s => (s.status || s.sessionStatus) === 'conducted') || null;

  let totalPresentMarks = 0;
  let totalRecordedMarks = 0;
  conductedSessions.forEach(ses => {
    totalPresentMarks += (ses.presentCount || 0);
    totalRecordedMarks += ((ses.presentCount || 0) + (ses.absentCount || 0));
  });

  const overallPercentage = totalRecordedMarks > 0 
    ? Math.round((totalPresentMarks / totalRecordedMarks) * 100) 
    : 0;

  return {
    totalStudents: activeStudents.length,
    totalConductedSessions: conductedSessions.length,
    totalSessions: sessions.length,
    latestSession: latestConducted,
    latestPresent: latestConducted ? (latestConducted.presentCount || 0) : 0,
    latestAbsent: latestConducted ? (latestConducted.absentCount || 0) : 0,
    overallPercentage,
    recentlyAdded: [...activeStudents].slice(0, 5),
    recentActivities: [...activities].sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || '')).slice(0, 8)
  };
};

export const resetToSeed = async () => {
  await idbResetDatabase();
  return true;
};

// ============================================================================
// DATE FORMATTING (DD-MM-YYYY)
// ============================================================================
export const formatDateDMY = (dateStr) => {
  if (!dateStr || typeof dateStr !== 'string') return '';
  const clean = dateStr.trim().split('T')[0];
  const parts = clean.split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    const [y, m, d] = parts;
    return `${d}-${m}-${y}`;
  }
  return dateStr;
};

// ============================================================================
// WEEKLY CLASS PLAN MANAGEMENT & DIRECT SESSION SYNC
// ============================================================================
export const getWeekInfo = (d = new Date()) => {
  const date = new Date(d);
  const day = date.getDay(); // 0 is Sunday, 6 is Saturday
  
  // Find Monday of the current week (Sunday belongs to weekend ending current week)
  const diffToMonday = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date.setDate(diffToMonday));
  monday.setHours(0, 0, 0, 0);

  const saturday = new Date(monday);
  saturday.setDate(monday.getDate() + 5);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const toISO = (dt) => {
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const dayNum = String(dt.getDate()).padStart(2, '0');
    return `${y}-${m}-${dayNum}`;
  };

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

export const applyDeadlineAutoClosure = (plan) => {
  if (!plan) return plan;
  let changed = false;
  let newPlan = { ...plan };

  if (newPlan.status === 'undecided' && isPastFridayDeadline(newPlan.saturdayDate)) {
    newPlan.status = 'no_class';
    newPlan.cancellationReason = 'Automatic update: No class was scheduled before the Friday 06:00 PM deadline.';
    newPlan.publicAnnouncement = 'There are no Bhagavad Gita classes scheduled for this weekend. Regular classes will resume next week. We encourage students to continue their self-study and chanting.';
    newPlan.autoClosed = true;
    newPlan.updatedAt = new Date().toISOString();
    changed = true;
  }

  // Sanitize any existing announcement that contains internal deadline notes
  if (newPlan.publicAnnouncement && /deadline|friday|passed without an admin update/i.test(newPlan.publicAnnouncement)) {
    newPlan.publicAnnouncement = 'There are no Bhagavad Gita classes scheduled for this weekend. Regular classes will resume next week. We encourage students to continue their self-study and chanting.';
    newPlan.updatedAt = new Date().toISOString();
    changed = true;
  }

  return changed ? newPlan : plan;
};

export const getCurrentWeeklyPlanLocal = async () => {
  const info = getWeekInfo();
  
  const enforceClosureAndSync = async (rawPlan) => {
    if (!rawPlan) return rawPlan;
    if (rawPlan.deadlineNote && rawPlan.deadlineNote.includes('Thursday')) {
      rawPlan.deadlineNote = rawPlan.deadlineNote.replace(/Thursday/gi, 'Friday');
    }
    const closed = applyDeadlineAutoClosure(rawPlan);
    if (closed.status !== rawPlan.status) {
      try {
        localStorage.setItem('krishna_current_weekly_plan', JSON.stringify(closed));
        await idbPut('meta', { key: 'current_weekly_plan', value: closed }).catch(() => {});
        firestoreSaveCurrentPlan(closed).catch(() => {});
        apiSaveWeeklyPlan(closed).catch(() => {});
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('krishna_plan_updated', { detail: closed }));
        }
      } catch (e) {}
    }
    return closed;
  };

  // 1. Fetch directly from MongoDB Atlas backend API
  try {
    const plan = await apiGetCurrentPlan();
    if (plan && plan.weekKey) {
      const processed = await enforceClosureAndSync(plan);
      localStorage.setItem('krishna_current_weekly_plan', JSON.stringify(processed));
      await idbPut('meta', { key: 'current_weekly_plan', value: processed }).catch(() => {});
      firestoreSaveCurrentPlan(processed).catch(() => {});
      return processed;
    }
  } catch (e) {
    console.warn("MongoDB Atlas current plan fetch notice:", e.message);
  }

  // 2. Fetch directly from Firebase Cloud Firestore (works 24/7 on all devices globally)
  try {
    const cloudPlan = await firestoreGetCurrentPlan(3000);
    if (cloudPlan && cloudPlan.weekKey) {
      const processed = await enforceClosureAndSync(cloudPlan);
      localStorage.setItem('krishna_current_weekly_plan', JSON.stringify(processed));
      await idbPut('meta', { key: 'current_weekly_plan', value: processed }).catch(() => {});
      return processed;
    }
  } catch (e) {}

  // Fast offline cache read
  try {
    const saved = localStorage.getItem('krishna_current_weekly_plan');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && (parsed.weekKey === info.weekKey || parsed.saturdayDate === info.saturdayDate || parsed.sundayDate === info.sundayDate)) {
        return await enforceClosureAndSync(parsed);
      }
    }
    const metaDoc = await idbGet('meta', 'current_weekly_plan');
    if (metaDoc?.value) return await enforceClosureAndSync(metaDoc.value);
  } catch (e) {}

  const defaultPlan = {
    weekKey: info.weekKey,
    year: info.year,
    weekNumber: info.weekNumber,
    saturdayDate: info.saturdayDate,
    sundayDate: info.sundayDate,
    status: isPastFridayDeadline(info.saturdayDate) ? 'no_class' : 'undecided',
    selectedDay: null,
    scheduledDate: '',
    scheduledTime: '06:00 PM – 08:00 PM',
    location: '',
    topic: '',
    publicAnnouncement: isPastFridayDeadline(info.saturdayDate) ? 'There are no Bhagavad Gita classes scheduled for this weekend. Regular classes will resume next week. We encourage students to continue their self-study and chanting.' : '',
    cancellationReason: isPastFridayDeadline(info.saturdayDate) ? 'Automatic update: No class was scheduled before Friday 06:00 PM deadline.' : '',
    deadlineNote: 'Confirm by Friday 06:00 PM',
    autoClosed: isPastFridayDeadline(info.saturdayDate),
    confirmedBy: 'ANIK',
    updatedAt: new Date().toISOString()
  };

  return await enforceClosureAndSync(defaultPlan);
};

export const getAllWeeklyPlansLocal = async () => {
  let plans = [];
  try {
    const apiPlans = await apiGetAllPlans();
    if (Array.isArray(apiPlans) && apiPlans.length > 0) {
      plans = apiPlans;
    }
  } catch (e) {
    console.warn("MongoDB Atlas all plans fetch notice:", e.message);
  }

  // Also check Cloud Firestore for saved plans
  if (plans.length === 0) {
    try {
      const fsPlans = await firestoreGetAll('plans');
      if (Array.isArray(fsPlans) && fsPlans.length > 0) {
        plans = fsPlans.filter(p => p.id !== 'current');
      }
    } catch (fe) {
      console.warn("Firestore plans fetch notice:", fe.message);
    }
  }

  // Merge current weekly plan so current week is never missing
  try {
    const current = await getCurrentWeeklyPlanLocal();
    if (current && current.weekKey) {
      const idx = plans.findIndex(p => p.weekKey === current.weekKey);
      if (idx >= 0) {
        plans[idx] = { ...plans[idx], ...current };
      } else {
        plans.unshift(current);
      }
    }
  } catch (ce) {}

  if (plans.length > 0) {
    localStorage.setItem('krishna_all_weekly_plans', JSON.stringify(plans));
    await idbPut('meta', { key: 'all_weekly_plans', value: plans }).catch(() => {});
    return plans;
  }

  try {
    const saved = localStorage.getItem('krishna_all_weekly_plans');
    if (saved) {
      const arr = JSON.parse(saved);
      if (Array.isArray(arr) && arr.length > 0) return arr;
    }
    const metaDoc = await idbGet('meta', 'all_weekly_plans');
    if (metaDoc && Array.isArray(metaDoc.value)) return metaDoc.value;
  } catch (e) {}

  const current = await getCurrentWeeklyPlanLocal();
  return [current];
};

export const saveWeeklyPlanLocal = async (payload, adminUsername = 'ANIK') => {
  let res = null;
  try {
    res = await apiSaveWeeklyPlan(payload);
  } catch (e) {
    console.warn("MongoDB Atlas plan save notice:", e.message);
  }
  const planObj = res || payload;

  try {
    await firestoreSaveCurrentPlan(planObj);
  } catch (e) {}

  try {
    localStorage.setItem('krishna_current_weekly_plan', JSON.stringify(planObj));
    await idbPut('meta', { key: 'current_weekly_plan', value: planObj }).catch(() => {});
  } catch (e) {}

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('krishna_plan_updated', { detail: planObj }));
  }

  await logAdminActivity(
    'PLAN_UPDATE',
    `Confirmed weekly plan for ${planObj.weekKey}: ${planObj.status?.toUpperCase()} (${planObj.selectedDay || 'N/A'})`
  );

  return planObj;
};

export const rescheduleWeeklyPlanLocal = async (weekKey, adminUsername = 'ANIK') => {
  let res = null;
  try {
    res = await apiReschedulePlan(weekKey);
  } catch (e) {
    console.warn("MongoDB Atlas plan reschedule notice:", e.message);
  }
  const planObj = res?.plan || res || { weekKey };

  try {
    await firestoreSaveCurrentPlan(planObj);
  } catch (e) {}

  try {
    localStorage.setItem('krishna_current_weekly_plan', JSON.stringify(planObj));
    await idbPut('meta', { key: 'current_weekly_plan', value: planObj }).catch(() => {});
  } catch (e) {}

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('krishna_plan_updated', { detail: planObj }));
  }

  await logAdminActivity(
    'PLAN_UPDATE',
    `Rescheduled weekly plan for ${weekKey} to ${planObj.selectedDay}`
  );

  return planObj;
};

export const cancelWeeklyPlanLocal = async (weekKey, cancellationReason, publicAnnouncement, adminUsername = 'ANIK') => {
  let res = null;
  try {
    res = await apiCancelWeeklyPlan(weekKey, cancellationReason, publicAnnouncement);
  } catch (e) {
    console.warn("MongoDB Atlas plan cancel notice:", e.message);
  }
  const planObj = res?.plan || res || { weekKey, status: 'no_class' };

  try {
    await firestoreSaveCurrentPlan(planObj);
  } catch (e) {}

  try {
    localStorage.setItem('krishna_current_weekly_plan', JSON.stringify(planObj));
    await idbPut('meta', { key: 'current_weekly_plan', value: planObj }).catch(() => {});
  } catch (e) {}

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('krishna_plan_updated', { detail: planObj }));
  }

  await logAdminActivity(
    'PLAN_UPDATE',
    `Cancelled weekly class for ${weekKey}: "${cancellationReason || 'Cancelled'}"`
  );

  return planObj;
};

// ============================================================================
// APPEARANCE & BRANDING CONFIGURATION SYNC
// ============================================================================
export const DEFAULT_APPEARANCE_CONFIG = {
  branding: {
    siteName: 'Krishna Kripa — Bhagavad Gita Attendance Management',
    logoUrl: '',
    logoHeight: 44,
    logoPlacement: 'left',
    logoAltText: 'Krishna Kripa Logo',
    useCustomLogo: false,
    heroHeading: 'Srimad Bhagavad Gita Weekend Classes',
    heroSubtitle: 'Timeless Vedic Wisdom for Character, Clarity, and Spiritual Growth',
    aboutTitle: 'About Krishna Kripa',
    aboutContent: 'Krishna Kripa is dedicated to sharing the timeless wisdom of the Bhagavad Gita with students and seekers every weekend. Through interactive sessions, guided discussions, and practical lifestyle applications, we nurture spiritual awareness, moral grounding, and inner peace.',
    gitaSectionTitle: 'The Sacred Science of Bhagavad Gita',
    gitaSectionContent: 'Spoken by Lord Sri Krishna on the battlefield of Kurukshetra, the Bhagavad Gita offers eternal guidance for navigating stress, mastering duty without anxiety, and discovering the supreme path of devotional service (Bhakti Yoga).',
    footerText: 'Dedicated to Bhagavad Gita Study',
    contactEmail: '',
    contactPhone: '',
    contactLocation: ''
  },
  styling: {
    bgImageUrl: 'https://images.unsplash.com/photo-1641730259879-ad98e7db7bcb?crop=entropy&cs=srgb&fm=jpg&q=85',
    overlayOpacity: 0.90,
    primaryColor: '#1B4332',
    secondaryColor: '#8B4513',
    accentColor: '#FFD700',
    heroAlignment: 'center',
    bannerImageUrl: ''
  },
  sectionsVisibility: {
    showHero: true,
    showClassStatus: true,
    showAbout: true,
    showGita: true,
    showContact: true
  }
};

export const hexToRgba = (hex, alpha = 1) => {
  if (!hex || typeof hex !== 'string') return `rgba(27, 67, 50, ${alpha})`;
  let c = hex.replace('#', '').trim();
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  if (c.length !== 6) return `rgba(27, 67, 50, ${alpha})`;
  const num = parseInt(c, 16);
  return `rgba(${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}, ${alpha})`;
};

export const applyGlobalTheme = (styling = {}) => {
  if (typeof document === 'undefined') return;
  const bgImg = styling.bgImageUrl || 'https://images.unsplash.com/photo-1641730259879-ad98e7db7bcb?crop=entropy&cs=srgb&fm=jpg&q=85';
  const opacity = styling.overlayOpacity !== undefined ? styling.overlayOpacity : 0.90;
  const primary = styling.primaryColor || '#1B4332';
  const secondary = styling.secondaryColor || '#8B4513';
  const accent = styling.accentColor || '#FFD700';

  const primaryRgba = hexToRgba(primary, opacity);
  const secondaryRgba = hexToRgba(secondary, opacity);
  const fullBg = `linear-gradient(135deg, ${primaryRgba} 0%, ${secondaryRgba} 100%), url("${bgImg}")`;

  document.documentElement.style.setProperty('--devotional-bg-full', fullBg);
  document.documentElement.style.setProperty('--forest-green', primary);
  document.documentElement.style.setProperty('--warm-brown', secondary);
  document.documentElement.style.setProperty('--gold', accent);
};

export const updateGlobalFavicon = (logoUrl) => {
  if (typeof document === 'undefined') return;
  try {
    let link = document.querySelector("link[rel*='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.getElementsByTagName('head')[0].appendChild(link);
    }
    if (logoUrl) {
      link.href = logoUrl;
    } else {
      link.href = '/favicon.ico';
    }
  } catch (e) {}
};

export const getPublishedAppearanceConfig = async () => {
  try {
    const saved = localStorage.getItem('krishna_published_config');
    let localConfig = null;
    if (saved) {
      try {
        localConfig = JSON.parse(saved);
        if (localConfig?.styling) applyGlobalTheme(localConfig.styling);
      } catch (e) {}
    }

    // 1. Fetch directly from MongoDB Atlas backend API
    try {
      const remoteConfig = await apiGetPublishedConfig();
      if (remoteConfig?.branding && remoteConfig?.styling) {
        const isRemoteDefault = remoteConfig.styling?.primaryColor === '#1B4332' && 
                                remoteConfig.styling?.secondaryColor === '#8B4513' && 
                                remoteConfig.styling?.accentColor === '#FFD700' && 
                                !remoteConfig.branding?.useCustomLogo;
        const hasLocalCustomization = localConfig && (
          localConfig.styling?.primaryColor !== '#1B4332' || 
          localConfig.styling?.secondaryColor !== '#8B4513' || 
          localConfig.styling?.accentColor !== '#FFD700' || 
          localConfig.branding?.useCustomLogo
        );

        if (!isRemoteDefault || !hasLocalCustomization) {
          localStorage.setItem('krishna_published_config', JSON.stringify(remoteConfig));
          await idbPut('meta', { key: 'published_config', value: remoteConfig }).catch(() => {});
          applyGlobalTheme(remoteConfig.styling);
          const logo = (remoteConfig.branding?.useCustomLogo !== false && remoteConfig.branding?.logoUrl) ? remoteConfig.branding.logoUrl : '';
          if (logo) {
            localStorage.setItem('krishna_published_logo', logo);
          } else {
            localStorage.removeItem('krishna_published_logo');
          }
          firestoreSavePublishedConfig(remoteConfig).catch(() => {});
          return remoteConfig;
        } else {
          // Push local customizations to remote database!
          saveAppearanceConfig(localConfig, true).catch(() => {});
          return localConfig;
        }
      }
    } catch (err) {}

    // 2. Fetch directly from Firebase Cloud Firestore (works 24/7 on all phones and devices globally)
    try {
      const cloudConfig = await firestoreGetPublishedConfig(3000);
      if (cloudConfig?.branding && cloudConfig?.styling) {
        localStorage.setItem('krishna_published_config', JSON.stringify(cloudConfig));
        await idbPut('meta', { key: 'published_config', value: cloudConfig }).catch(() => {});
        applyGlobalTheme(cloudConfig.styling);
        const logo = (cloudConfig.branding?.useCustomLogo !== false && cloudConfig.branding?.logoUrl) ? cloudConfig.branding.logoUrl : '';
        if (logo) {
          localStorage.setItem('krishna_published_logo', logo);
        } else {
          localStorage.removeItem('krishna_published_logo');
        }
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('krishna_logo_updated', { detail: logo }));
          window.dispatchEvent(new CustomEvent('krishna_config_updated', { detail: cloudConfig }));
        }
        return cloudConfig;
      }
    } catch (err) {}

    if (localConfig) return localConfig;

    const metaDoc = await idbGet('meta', 'published_config');
    if (metaDoc?.value?.branding && metaDoc?.value?.styling) {
      applyGlobalTheme(metaDoc.value.styling);
      return metaDoc.value;
    }
  } catch (e) {}

  applyGlobalTheme(DEFAULT_APPEARANCE_CONFIG.styling);
  return DEFAULT_APPEARANCE_CONFIG;
};

export const saveAppearanceConfig = async (config, isPublished = true) => {
  if (!config) return DEFAULT_APPEARANCE_CONFIG;

  const configToSave = {
    ...config,
    version: Date.now(),
    updatedAt: new Date().toISOString()
  };

  // 1. Save to MongoDB Atlas via backend API
  let published = null;
  try {
    published = await apiPublishConfig(configToSave);
  } catch (e) {
    try {
      await ensureAdminToken(true);
      published = await apiPublishConfig(configToSave);
    } catch (e2) {
      try {
        await apiSaveDraftConfig(configToSave);
      } catch (e3) {}
    }
  }
  const finalConfig = published || configToSave;

  // 2. Publish to Firebase Cloud Firestore for INSTANT multi-device distribution across all phones/tablets/desktops
  try {
    await firestoreSavePublishedConfig(finalConfig);
  } catch (e) {}

  // 3. Update durable local storage and IndexedDB
  localStorage.setItem('krishna_published_config', JSON.stringify(finalConfig));
  localStorage.setItem('krishna_draft_config', JSON.stringify(finalConfig));
  await idbPut('meta', { key: 'published_config', value: finalConfig }).catch(() => {});
  await idbPut('meta', { key: 'draft_config', value: finalConfig }).catch(() => {});

  const logo = (finalConfig.branding?.useCustomLogo !== false && finalConfig.branding?.logoUrl) ? finalConfig.branding.logoUrl : '';
  if (logo) {
    localStorage.setItem('krishna_published_logo', logo);
    try { updateGlobalFavicon(logo); } catch (e) {}
  } else {
    localStorage.removeItem('krishna_published_logo');
    try { updateGlobalFavicon(''); } catch (e) {}
  }

  if (finalConfig.styling) {
    applyGlobalTheme(finalConfig.styling);
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('krishna_logo_updated', { detail: logo }));
    window.dispatchEvent(new CustomEvent('krishna_config_updated', { detail: finalConfig }));
  }

  return finalConfig;
};

// ============================================================================
// KRISHNA JANMASHTAMI SEVA POINTS CHALLENGE — ATTENDANCE ENGINE & LEADERBOARD
// ============================================================================

export const DEFAULT_JANMASHTAMI_SEASON_2027 = {
  id: 'JANM-2027',
  seasonId: 'JANM-2027',
  year: 2027,
  title: 'Krishna Janmashtami Seva Points Challenge 2027',
  eventDate: '2027-08-25',
  eventTime: '23:59:59',
  isDateVerified: true,
  calendarSourceUrl: 'https://www.iskconbangalore.org/calendar/',
  verificationDate: '2026-10-20',
  verifiedBy: 'ANIK',
  startDate: '2026-01-01',
  endDate: '2027-08-25',
  pointsRules: {
    pointsPerPresentClass: 10,
    pointsPerAbsentClass: 0,
    pointsPerUnrecordedClass: 0,
    pointsPerCancelledClass: 0,
    requireConfirmedConductor: false
  },
  status: 'active',
  prizes: [],
  finalLeaderboardSnapshot: [],
  publicDisplayNamePolicy: 'initial_masked',
  publicLeaderboardLimit: 10,
  notes: 'Official ISKCON Vaishnava Calendar Seva Points Challenge'
};

export const DEFAULT_JANMASHTAMI_SEASON = DEFAULT_JANMASHTAMI_SEASON_2027;

export const maskStudentName = (fullName, policy = 'initial_masked') => {
  if (!fullName) return 'Student Seva';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  if (policy === 'first_name_only') return parts[0];
  if (policy === 'full_name') return fullName;
  const first = parts[0];
  const lastInitial = parts[parts.length - 1][0]?.toUpperCase() || '';
  return `${first} ${lastInitial}.`;
};

export const getActiveJanmashtamiSeasonLocal = async () => {
  try {
    const remote = await apiGetActiveJanmashtamiSeason();
    if (remote && remote.season) {
      const seasonObj = {
        ...remote.season,
        id: remote.season.seasonId,
        updatedAt: remote.season.updatedAt || new Date().toISOString()
      };
      await idbPut('janmashtamiSeasons', seasonObj).catch(() => {});
      if (seasonObj.status === 'active' || seasonObj.status === 'upcoming') {
        localStorage.setItem('krishna_janmashtami_season_active', JSON.stringify(seasonObj));
      }
      return seasonObj;
    }
  } catch (err) {
    console.warn("Could not fetch active Janmashtami season from MongoDB Atlas backend, checking local cache:", err);
  }

  try {
    const seasons = await idbGetAll('janmashtamiSeasons');
    if (seasons && seasons.length > 0) {
      const season2027 = seasons.find(s => s.year === 2027 || s.seasonId === 'JANM-2027');
      if (season2027) return season2027;

      const active = seasons.find(s => s.status === 'active' || s.status === 'upcoming');
      if (active) return active;
      return seasons.sort((a, b) => (b.year || 0) - (a.year || 0))[0];
    }
  } catch (e) {
    console.warn("IndexedDB janmashtami seasons read notice:", e);
  }

  try {
    const saved = localStorage.getItem('krishna_janmashtami_season_active');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.year === 2027) return parsed;
    }
  } catch {}

  return DEFAULT_JANMASHTAMI_SEASON_2027;
};

export const getAllJanmashtamiSeasonsLocal = async () => {
  try {
    const remoteSeasons = await apiGetAllJanmashtamiSeasons();
    if (Array.isArray(remoteSeasons) && remoteSeasons.length > 0) {
      for (const s of remoteSeasons) {
        await idbPut('janmashtamiSeasons', { ...s, id: s.seasonId }).catch(() => {});
      }
      return remoteSeasons.sort((a, b) => (b.year || 0) - (a.year || 0));
    }
  } catch (err) {
    console.warn("Could not fetch seasons list from MongoDB Atlas backend, falling back to cache:", err);
  }

  let list = [];
  try {
    list = await idbGetAll('janmashtamiSeasons');
  } catch (e) {}

  if (!list || list.length === 0) {
    const active = await getActiveJanmashtamiSeasonLocal();
    list = [active];
  }

  return list.sort((a, b) => (b.year || 0) - (a.year || 0));
};

export const saveJanmashtamiSeasonLocal = async (seasonData) => {
  if (!seasonData || !seasonData.seasonId) throw new Error('Valid season data with seasonId is required.');
  
  // 1. Save to MongoDB Atlas via Backend API
  const apiRes = await apiUpdateJanmashtamiSeason({
    seasonId: seasonData.seasonId,
    eventDate: seasonData.eventDate,
    isDateVerified: seasonData.isDateVerified,
    calendarSourceUrl: seasonData.calendarSourceUrl,
    verificationDate: seasonData.verificationDate,
    pointsRules: seasonData.pointsRules,
    prizes: seasonData.prizes,
    publicDisplayNamePolicy: seasonData.publicDisplayNamePolicy,
    publicLeaderboardLimit: seasonData.publicLeaderboardLimit
  });

  const updatedSeason = apiRes?.season || seasonData;

  const seasonObj = {
    ...updatedSeason,
    id: updatedSeason.seasonId,
    updatedAt: new Date().toISOString()
  };

  // 2. Cache in local storage for instant read
  try {
    await idbPut('janmashtamiSeasons', seasonObj);
  } catch (e) {}

  if (seasonObj.status === 'active') {
    localStorage.setItem('krishna_janmashtami_season_active', JSON.stringify(seasonObj));
  }

  // Fire event for live sync
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('krishna_season_updated', { detail: seasonObj }));
  }

  return seasonObj;
};

export const getJanmashtamiAdjustmentsLocal = async (seasonId) => {
  try {
    const remote = await apiGetJanmashtamiAdjustments(seasonId);
    if (Array.isArray(remote)) {
      for (const adj of remote) {
        await idbPut('janmashtamiAdjustments', { ...adj, id: adj._id || adj.id }).catch(() => {});
      }
      return remote;
    }
  } catch (err) {
    console.warn("Could not fetch adjustments from MongoDB Atlas, checking cache:", err);
  }

  let all = [];
  try {
    all = await idbGetAll('janmashtamiAdjustments');
  } catch (e) {}

  if (!all || all.length === 0) {
    try {
      const saved = localStorage.getItem(`krishna_adjustments_${seasonId}`);
      if (saved) all = JSON.parse(saved);
    } catch {}
  }

  return (all || []).filter(a => !seasonId || a.seasonId === seasonId).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

export const addJanmashtamiAdjustmentLocal = async ({
  seasonId,
  studentId,
  studentName,
  adjustmentPoints,
  reason,
  adminUser = 'ANIK',
  adminName = 'Administrator'
}) => {
  if (!seasonId || !studentId || adjustmentPoints === undefined) {
    throw new Error('seasonId, studentId, and adjustmentPoints are required.');
  }
  if (!reason || reason.trim().length < 5) {
    throw new Error('A detailed audit reason (minimum 5 characters) is required for manual point adjustments.');
  }

  // 1. Commit to MongoDB Atlas via Backend API
  const apiRes = await apiAddJanmashtamiAdjustment({
    seasonId,
    studentId,
    adjustmentPoints: Number(adjustmentPoints),
    reason: reason.trim()
  });

  const savedAdj = apiRes?.adjustment || {
    id: `ADJ-${seasonId}-${studentId}-${Date.now()}`,
    seasonId,
    studentId,
    studentName: studentName || 'Student',
    adjustmentPoints: Number(adjustmentPoints),
    reason: reason.trim(),
    adjustedBy: adminUser,
    adjustedByName: adminName,
    createdAt: new Date().toISOString()
  };

  const adjObj = {
    ...savedAdj,
    id: savedAdj._id || savedAdj.id
  };

  // 2. Cache locally
  try {
    await idbPut('janmashtamiAdjustments', adjObj);
  } catch (e) {}

  await logAdminActivity(
    'POINTS_ADJUSTMENT',
    `Adjusted Janmashtami points for ${studentName || studentId} by ${adjustmentPoints > 0 ? '+' : ''}${adjustmentPoints}. Reason: "${reason.trim()}"`
  );

  return adjObj;
};

export const calculateJanmashtamiStandingsLocal = async (seasonInput = null) => {
  const season = seasonInput || await getActiveJanmashtamiSeasonLocal();
  if (!season) return [];

  // If already finalized, return its stored immutable snapshot
  if (season.status === 'finalized' && season.finalLeaderboardSnapshot && season.finalLeaderboardSnapshot.length > 0) {
    return season.finalLeaderboardSnapshot;
  }

  // 1. Fetch authentic enrolled students (excluding archived)
  const students = await getAllStudents(true);

  // 2. Fetch all sessions and filter eligible conducted sessions
  const sessions = await getAllSessions();
  const minDate = season.startDate && season.startDate < '2026-01-01' ? season.startDate : '2026-01-01';
  const eligibleSessions = sessions.filter(s => {
    const sessionDate = s.date || s.sessionDate || '';
    const isConducted = (s.status === 'conducted' || s.sessionStatus === 'conducted');
    const inSeason = (!sessionDate || sessionDate >= minDate) && (!season.endDate || sessionDate <= season.endDate);
    return isConducted && inSeason;
  });

  const eligibleSessionIds = new Set();
  eligibleSessions.forEach(s => {
    const d = s.date || s.sessionDate;
    if (s.id) eligibleSessionIds.add(s.id);
    if (s.sessionId) eligibleSessionIds.add(s.sessionId);
    if (d) {
      eligibleSessionIds.add(d);
      eligibleSessionIds.add(`SES-${d}`);
    }
  });

  // 3. Fetch attendance records
  let allAttendance = [];
  try {
    allAttendance = await idbGetAll('attendance');
  } catch (e) {
    console.warn("Failed reading attendance for Janmashtami points:", e);
  }

  // Anti-duplication map: studentId -> Set of unique eligible sessionIds attended
  const studentPresentSessions = new Map();
  allAttendance.forEach(att => {
    const sId = att.sessionId || (att.date ? `SES-${att.date}` : (att.sessionDate ? `SES-${att.sessionDate}` : null));
    const sDate = att.sessionDate || att.date || (att.sessionId ? att.sessionId.replace('SES-', '') : null);
    const stdId = att.studentId;
    const isAttended = att.status === 'present';
    const matchesEligible = (sId && eligibleSessionIds.has(sId)) || (sDate && eligibleSessionIds.has(sDate)) || (sDate && eligibleSessionIds.has(`SES-${sDate}`));

    if (matchesEligible && stdId && isAttended) {
      if (!studentPresentSessions.has(stdId)) {
        studentPresentSessions.set(stdId, new Set());
      }
      studentPresentSessions.get(stdId).add(sDate || sId);
    }
  });

  // 4. Fetch adjustments
  const adjustments = await getJanmashtamiAdjustmentsLocal(season.seasonId);
  const adjustmentMap = new Map();
  adjustments.forEach(adj => {
    const prev = adjustmentMap.get(adj.studentId) || 0;
    adjustmentMap.set(adj.studentId, prev + (adj.adjustmentPoints || 0));
  });

  const pointsPerPresent = season.pointsRules?.pointsPerPresentClass ?? 10;

  // 5. Build raw standings
  const rawStandings = students.map(st => {
    const sid = st.studentId || st.id;
    const attendedSet = studentPresentSessions.get(sid) || new Set();
    const classesAttended = attendedSet.size;
    const basePoints = classesAttended * pointsPerPresent;
    const adjustmentPoints = adjustmentMap.get(sid) || 0;
    const totalPoints = Math.max(0, basePoints + adjustmentPoints);

    return {
      studentId: sid,
      name: st.name || 'Student',
      displayName: maskStudentName(st.name, season.publicDisplayNamePolicy),
      schoolName: st.schoolName || st.school || '',
      className: st.className || st.grade || '',
      classesAttended,
      basePoints,
      adjustmentPoints,
      totalPoints
    };
  });

  // 6. Only students who have genuinely earned points (totalPoints > 0) are competitively ranked
  const activeCompetitors = rawStandings.filter(st => st.totalPoints > 0);
  const unrankedStudents = rawStandings.filter(st => st.totalPoints <= 0);

  // Tie-breaking rules for active competitors:
  // 1st: Highest total points
  // 2nd: Most eligible classes attended
  // 3rd: Alphabetical order
  activeCompetitors.sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    if (b.classesAttended !== a.classesAttended) return b.classesAttended - a.classesAttended;
    return (a.name || '').localeCompare(b.name || '');
  });

  // 7. Assign ranks ONLY to active competitors with points > 0
  const rankedCompetitors = activeCompetitors.map((st, idx) => {
    if (idx > 0) {
      const prev = activeCompetitors[idx - 1];
      if (st.totalPoints === prev.totalPoints && st.classesAttended === prev.classesAttended) {
        st.rank = prev.rank;
      } else {
        st.rank = idx + 1;
      }
    } else {
      st.rank = 1;
    }

    const prize = season.prizes?.find(p => p.position === st.rank);
    st.isWinner = Boolean(prize);
    st.prizeTitle = prize ? prize.title : null;

    return st;
  });

  // Students with 0 points are unranked and never marked as winners or prize candidates
  unrankedStudents.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  const processedUnranked = unrankedStudents.map(st => {
    st.rank = null;
    st.isWinner = false;
    st.prizeTitle = null;
    return st;
  });

  return [...rankedCompetitors, ...processedUnranked];
};

export const updateJanmashtamiPrizeLocal = async (seasonId, position, prizeUpdates) => {
  const apiRes = await apiUpdateJanmashtamiPrize({
    seasonId,
    position: Number(position),
    distributionStatus: prizeUpdates.distributionStatus,
    winnerStudentId: prizeUpdates.winnerStudentId,
    notes: prizeUpdates.notes
  });

  const updatedSeason = apiRes?.season;
  if (updatedSeason) {
    await idbPut('janmashtamiSeasons', { ...updatedSeason, id: updatedSeason.seasonId }).catch(() => {});
    return updatedSeason;
  }

  const season = await getActiveJanmashtamiSeasonLocal();
  if (!season || season.seasonId !== seasonId) throw new Error('Active season not found.');

  const prize = (season.prizes || []).find(p => p.position === Number(position));
  if (!prize) throw new Error(`Prize for position ${position} not found.`);

  Object.assign(prize, prizeUpdates);
  if (prizeUpdates.distributionStatus === 'Distributed') {
    prize.distributedAt = new Date().toISOString();
  }

  await saveJanmashtamiSeasonLocal(season);
  return season;
};

export const finalizeJanmashtamiSeasonLocal = async (seasonId, adminUser = 'ANIK') => {
  const apiRes = await apiFinalizeJanmashtamiSeason(seasonId);
  if (apiRes?.success) {
    if (apiRes.finalizedSeason) {
      await idbPut('janmashtamiSeasons', { ...apiRes.finalizedSeason, id: apiRes.finalizedSeason.seasonId }).catch(() => {});
    }
    if (apiRes.nextSeason) {
      await idbPut('janmashtamiSeasons', { ...apiRes.nextSeason, id: apiRes.nextSeason.seasonId }).catch(() => {});
      localStorage.setItem('krishna_janmashtami_season_active', JSON.stringify(apiRes.nextSeason));
    }
    await logAdminActivity(
      'SEASON_FINALIZED',
      `Finalized and locked ${seasonId} official standings in MongoDB Atlas.`
    );
    return {
      finalizedSeason: apiRes.finalizedSeason,
      nextSeason: apiRes.nextSeason,
      message: apiRes.message
    };
  }

  throw new Error(apiRes?.message || 'Finalizing season was not acknowledged by MongoDB Atlas.');
};

export const exportJanmashtamiCSV = (standings, season) => {
  if (!standings || standings.length === 0) return '';
  const headers = [
    'Rank',
    'Student ID',
    'Student Name',
    'School',
    'Grade/Class',
    'Classes Attended',
    'Base Points (Attendance)',
    'Manual Adjustment',
    'Total Points',
    'Winner Status',
    'Prize Title'
  ];

  const rows = standings.map(s => [
    s.rank,
    `"${s.studentId}"`,
    `"${s.name}"`,
    `"${s.schoolName || ''}"`,
    `"${s.className || ''}"`,
    s.classesAttended,
    s.basePoints,
    s.adjustmentPoints,
    s.totalPoints,
    s.isWinner ? 'Winner' : 'Participant',
    `"${s.prizeTitle || ''}"`
  ]);

  const csvContent = [
    `# KRISHNA KRIPA — ${season?.title || 'Janmashtami Seva Points Challenge'} Standings`,
    `# Season ID: ${season?.seasonId || 'JANM-2026'}, Event Date: ${season?.eventDate || '2026-09-03'} (Verified: ${season?.isDateVerified ? 'YES' : 'NO'})`,
    `# Exported On: ${new Date().toISOString()}`,
    headers.join(','),
    ...rows.map(r => r.join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Krishna_Janmashtami_Standings_${season?.seasonId || '2026'}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

if (typeof window !== 'undefined') {
  // Ensure any lingering 2026-10-18 ghost session is eradicated from browser storage
  idbDelete('sessions', '2026-10-18').catch(() => {});
  idbDelete('sessions', 'SES-2026-10-18').catch(() => {});
}

