import Student from '../models/Student.js';
import Session from '../models/Session.js';
import Attendance from '../models/Attendance.js';
import AdminActivity from '../models/AdminActivity.js';
import StudentAiQuota from '../models/StudentAiQuota.js';
import JanmashtamiAdjustment from '../models/JanmashtamiAdjustment.js';
import { getNextStudentId } from '../models/Counter.js';
import { getOrCreateStudentCard } from '../services/cardService.js';
import StudentCard from '../models/StudentCard.js';

// GET /api/students
export const getStudents = async (req, res) => {
  try {
    const { q, school, className, status } = req.query;
    const filter = {};

    // Status filter: defaults to active unless explicitly requesting all or archived
    if (status === 'archived') {
      filter.status = 'archived';
    } else if (status !== 'all') {
      filter.status = 'active';
    }

    if (school && school !== 'ALL') {
      filter.schoolName = school;
    }

    if (className && className !== 'ALL') {
      filter.className = className;
    }

    if (q && q.trim()) {
      const regex = new RegExp(q.trim(), 'i');
      filter.$or = [
        { name: regex },
        { studentId: regex },
        { schoolName: regex },
        { whatsappNumber: regex }
      ];
    }

    const students = await Student.find(filter).sort({ createdAt: -1 });

    // Format output mapping to match existing frontend conventions seamlessly
    const formatted = students.map(s => ({
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
      notes: s.notes,
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
      message: 'Failed to fetch students: ' + error.message
    });
  }
};

// GET /api/students/:id (Accepts studentId or MongoDB _id)
export const getStudentProfile = async (req, res) => {
  try {
    const { id } = req.params;

    // Search by studentId first, then by _id
    let student = await Student.findOne({ studentId: id });
    if (!student && id.match(/^[0-9a-fA-F]{24}$/)) {
      student = await Student.findById(id);
    }

    if (!student) {
      return res.status(404).json({
        success: false,
        message: `Student with ID "${id}" was not found.`
      });
    }

    // STRICT ATTENDANCE CALCULATIONS RULES:
    // 1. Count ONLY conducted sessions (sessionStatus === 'conducted')
    // 2. Do NOT count cancelled or upcoming sessions
    // 3. Do NOT count sessions before student's registrationDate
    // 4. Distinguish Not Recorded from Absent
    // 5. Show 0% when no eligible conducted sessions exist
    const conductedSessions = await Session.find({
      sessionStatus: 'conducted',
      sessionDate: { $gte: student.registrationDate }
    }).sort({ sessionDate: -1 });

    // Fetch attendance marks for this student
    const attendanceRecords = await Attendance.find({
      studentId: student.studentId
    });

    const attendanceMap = new Map();
    attendanceRecords.forEach(att => {
      attendanceMap.set(att.sessionId, att.status);
    });

    let attendedCount = 0;
    let missedCount = 0;
    let notRecordedCount = 0;

    const history = conductedSessions.map(session => {
      const rawStatus = attendanceMap.get(session._id.toString()) || attendanceMap.get(`SES-${session.sessionDate}`);
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
        sessionId: session._id,
        date: session.sessionDate,
        day: session.dayOfWeek,
        title: session.title,
        topic: session.topic,
        status: displayStatus,
        rawStatus
      };
    });

    const totalEligible = conductedSessions.length;
    const percentage = totalEligible > 0
      ? Math.round((attendedCount / totalEligible) * 100)
      : 0;

    return res.status(200).json({
      success: true,
      data: {
        student: {
          _id: student._id,
          id: student.studentId,
          studentId: student.studentId,
          name: student.name,
          grade: student.className,
          className: student.className,
          whatsapp: student.whatsappNumber,
          whatsappNumber: student.whatsappNumber,
          school: student.schoolName,
          schoolName: student.schoolName,
          registrationDate: student.registrationDate,
          status: student.status,
          notes: student.notes,
          createdAt: student.createdAt
        },
        stats: {
          totalEligible,
          attendedCount,
          missedCount,
          notRecordedCount,
          percentage
        },
        history
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to calculate student profile: ' + error.message
    });
  }
};

// POST /api/students
export const createStudent = async (req, res) => {
  try {
    const { name, className, grade, whatsappNumber, whatsapp, schoolName, school, registrationDate, notes } = req.body;

    const studentName = name?.trim();
    const finalClassName = (className || grade)?.trim();
    const finalPhone = (whatsappNumber || whatsapp)?.trim();
    const finalSchool = (schoolName || school)?.trim();

    if (!studentName || !finalClassName || !finalPhone || !finalSchool) {
      return res.status(400).json({
        success: false,
        message: 'All 4 fields are required: Full Name, Class/Grade, WhatsApp Number, and School Name.'
      });
    }

    // Check duplicate student
    const existing = await Student.findOne({
      status: 'active',
      name: { $regex: new RegExp(`^${studentName}$`, 'i') },
      $or: [
        { schoolName: { $regex: new RegExp(`^${finalSchool}$`, 'i') } },
        { whatsappNumber: finalPhone.replace(/\D/g, '') }
      ]
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: `A student named "${studentName}" from "${finalSchool}" already exists with ID ${existing.studentId}.`
      });
    }

    // Generate concurrency-safe unique ID (BGK-2026-XXXX)
    const year = registrationDate ? registrationDate.split('-')[0] : '2026';
    const studentId = await getNextStudentId(year);

    const newStudent = await Student.create({
      studentId,
      name: studentName,
      className: finalClassName,
      whatsappNumber: finalPhone,
      schoolName: finalSchool,
      registrationDate: registrationDate || new Date().toISOString().split('T')[0],
      status: 'active',
      notes: notes || ''
    });

    // Audit log
    await AdminActivity.create({
      adminId: req.admin?.username || 'ANIK',
      action: 'STUDENT_REGISTERED',
      recordType: 'student',
      recordId: newStudent.studentId,
      description: `Registered student ${newStudent.name} (${newStudent.studentId}), ${newStudent.className}`
    });

    // Automatically generate digital Student ID card in MongoDB Atlas
    let studentCard = null;
    try {
      const cardResult = await getOrCreateStudentCard(newStudent.studentId, req.admin?.username || 'ANIK');
      studentCard = cardResult.card;
    } catch (cardErr) {
      console.warn('Admin student card creation warning:', cardErr.message);
    }

    return res.status(201).json({
      success: true,
      message: 'Student registered successfully in MongoDB Atlas. Digital ID Card created.',
      card: studentCard,
      data: {
        _id: newStudent._id,
        id: newStudent.studentId,
        studentId: newStudent.studentId,
        name: newStudent.name,
        grade: newStudent.className,
        className: newStudent.className,
        whatsapp: newStudent.whatsappNumber,
        whatsappNumber: newStudent.whatsappNumber,
        school: newStudent.schoolName,
        schoolName: newStudent.schoolName,
        registrationDate: newStudent.registrationDate,
        status: newStudent.status,
        notes: newStudent.notes
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to create student: ' + error.message
    });
  }
};

// PUT /api/students/:id
export const updateStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, className, grade, whatsappNumber, whatsapp, schoolName, school, notes } = req.body;

    let student = await Student.findOne({ studentId: id });
    if (!student && id.match(/^[0-9a-fA-F]{24}$/)) {
      student = await Student.findById(id);
    }

    if (!student) {
      return res.status(404).json({
        success: false,
        message: `Student "${id}" not found.`
      });
    }

    if (name) student.name = name.trim();
    if (className || grade) student.className = (className || grade).trim();
    if (whatsappNumber || whatsapp) student.whatsappNumber = (whatsappNumber || whatsapp).trim();
    if (schoolName || school) student.schoolName = (schoolName || school).trim();
    if (notes !== undefined) student.notes = notes.trim();

    // Preserve permanent studentId and registrationDate
    await student.save();

    await AdminActivity.create({
      adminId: req.admin?.username || 'ANIK',
      action: 'STUDENT_EDITED',
      recordType: 'student',
      recordId: student.studentId,
      description: `Updated student record for ${student.name} (${student.studentId})`
    });

    return res.status(200).json({
      success: true,
      message: 'Student updated successfully.',
      data: student
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update student: ' + error.message
    });
  }
};

// DELETE /api/students/:id (Permanent Delete or Archive)
export const archiveStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const isPermanent = req.query.permanent === 'true' || req.query.permanent === true;

    let student = await Student.findOne({ studentId: id });
    if (!student && id.match(/^[0-9a-fA-F]{24}$/)) {
      student = await Student.findById(id);
    }

    if (!student) {
      return res.status(404).json({
        success: false,
        message: `Student "${id}" not found.`
      });
    }

    const studentId = student.studentId;
    const studentMongoId = student._id;

    if (isPermanent) {
      // 1. Find all affected sessions before removing attendance
      const affectedAttendance = await Attendance.find({
        $or: [
          { studentId: studentId },
          { studentId: id },
          { studentId: studentMongoId.toString() }
        ]
      });
      const affectedSessionIds = [...new Set(affectedAttendance.map(a => a.sessionId).filter(Boolean))];

      // 2. Permanently delete student attendance records
      await Attendance.deleteMany({
        $or: [
          { studentId: studentId },
          { studentId: id },
          { studentId: studentMongoId.toString() }
        ]
      });

      // 3. Recalculate session counts for affected sessions
      for (const sId of affectedSessionIds) {
        const remainingForSession = await Attendance.find({ sessionId: sId });
        const presentCount = remainingForSession.filter(r => r.status === 'present').length;
        const absentCount = remainingForSession.filter(r => r.status === 'absent').length;
        await Session.findOneAndUpdate(
          { $or: [{ _id: sId.match(/^[0-9a-fA-F]{24}$/) ? sId : null }, { sessionId: sId }] },
          { 
            presentCount, 
            absentCount, 
            totalRegistered: remainingForSession.length 
          }
        );
      }

      // 4. Delete Student AI Quotas & Janmashtami adjustments
      try {
        await StudentAiQuota.deleteMany({
          $or: [{ studentId }, { studentId: id }]
        });
      } catch (e) {}

      try {
        await JanmashtamiAdjustment.deleteMany({
          $or: [{ studentId }, { studentId: id }]
        });
      } catch (e) {}

      try {
        await StudentCard.deleteMany({
          $or: [{ studentId }, { studentId: id }]
        });
      } catch (e) {}

      // 5. Delete Student document
      await Student.deleteOne({ _id: studentMongoId });

      await AdminActivity.create({
        adminId: req.admin?.username || 'ANIK',
        action: 'STUDENT_DELETED',
        recordType: 'student',
        recordId: studentId,
        description: `Permanently deleted student ${student.name} (${studentId}) and removed all associated attendance and points from the system.`
      });

      return res.status(200).json({
        success: true,
        message: `Student ${studentId} and all associated records permanently removed from the website.`
      });
    } else {
      // Soft Archive
      student.status = 'archived';
      await student.save();

      await AdminActivity.create({
        adminId: req.admin?.username || 'ANIK',
        action: 'STUDENT_ARCHIVED',
        recordType: 'student',
        recordId: studentId,
        description: `Archived student ${student.name} (${studentId}).`
      });

      return res.status(200).json({
        success: true,
        message: `Student ${studentId} archived.`
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to process student deletion: ' + error.message
    });
  }
};
