import crypto from 'crypto';
import StudentCard from '../models/StudentCard.js';
import Student from '../models/Student.js';
import AdminActivity from '../models/AdminActivity.js';

/**
 * Generate a cryptographically secure, random, revocable token for verification
 */
export const generateSecureToken = () => {
  return crypto.randomBytes(24).toString('hex');
};

/**
 * Get or automatically create an ID card for a student in MongoDB Atlas
 */
export const getOrCreateStudentCard = async (studentId, createdBy = 'SYSTEM') => {
  const student = await Student.findOne({ studentId });
  if (!student) {
    throw new Error(`Student with ID "${studentId}" not found.`);
  }

  let card = await StudentCard.findOne({ studentId });
  if (!card) {
    const token = generateSecureToken();
    card = await StudentCard.create({
      studentId: student.studentId,
      studentMongoId: student._id,
      verificationToken: token,
      status: 'active',
      cardVersion: 1,
      issueDate: student.registrationDate || new Date().toISOString().split('T')[0],
      auditTrail: [
        {
          action: 'CARD_CREATED',
          performedBy: createdBy,
          timestamp: new Date(),
          notes: `Initial card generated for ${student.name} (${student.studentId})`
        }
      ]
    });
  }

  return {
    card,
    student: {
      studentId: student.studentId,
      name: student.name,
      className: student.className,
      schoolName: student.schoolName,
      registrationDate: student.registrationDate,
      status: student.status
    }
  };
};

/**
 * Securely verify a card token (Public verification endpoint)
 * Never exposes phone numbers, attendance marks, or private credentials.
 */
export const verifyCardToken = async (token) => {
  if (!token || typeof token !== 'string') {
    return {
      valid: false,
      status: 'invalid',
      message: 'Invalid verification token format.'
    };
  }

  const trimmedToken = token.trim();
  let card = await StudentCard.findOne({
    $or: [
      { verificationToken: trimmedToken },
      { studentId: trimmedToken }
    ]
  });

  if (!card) {
    // If card record doesn't exist yet but student is in MongoDB Atlas, generate on-the-fly
    const studentExists = await Student.findOne({
      $or: [
        { studentId: trimmedToken },
        { id: trimmedToken }
      ]
    });
    if (studentExists) {
      const created = await getOrCreateStudentCard(studentExists.studentId, 'AUTO_VERIFY');
      card = created.card;
    }
  }

  if (!card) {
    return {
      valid: false,
      status: 'not_found',
      message: 'No active student card found for this verification code. The card may be counterfeit or expired.'
    };
  }

  const student = await Student.findOne({ studentId: card.studentId });
  if (!student) {
    return {
      valid: false,
      status: 'student_missing',
      message: 'Associated student record was not found in the database.'
    };
  }

  if (card.status === 'revoked') {
    return {
      valid: false,
      status: 'revoked',
      message: 'This student ID card has been REVOKED by Krishna Kripa administration and is no longer valid.',
      revokedAt: card.revokedAt,
      revocationReason: card.revocationReason || 'Administrative revocation',
      card: {
        studentId: card.studentId,
        cardVersion: card.cardVersion,
        issueDate: card.issueDate
      },
      student: {
        name: student.name,
        className: student.className,
        schoolName: student.schoolName
      }
    };
  }

  if (student.status !== 'active') {
    return {
      valid: false,
      status: 'archived',
      message: 'The student record linked to this card is currently archived or inactive.',
      card: {
        studentId: card.studentId,
        status: 'inactive'
      }
    };
  }

  return {
    valid: true,
    status: 'active',
    message: 'Official Student Identity Verified — Krishna Kripa Bhagavad Gita Study Circle',
    verifiedAt: new Date().toISOString(),
    student: {
      studentId: student.studentId,
      name: student.name,
      className: student.className,
      schoolName: student.schoolName,
      registrationDate: student.registrationDate
    },
    card: {
      status: card.status,
      issueDate: card.issueDate,
      cardVersion: card.cardVersion,
      lastReissuedAt: card.lastReissuedAt
    }
  };
};

/**
 * Revoke a student card
 */
export const revokeCard = async (studentId, reason = 'Administrative revocation', adminUser = 'ADMIN') => {
  const card = await StudentCard.findOne({ studentId });
  if (!card) {
    throw new Error(`No card found for student "${studentId}".`);
  }

  card.status = 'revoked';
  card.revokedAt = new Date();
  card.revocationReason = reason;
  card.auditTrail.push({
    action: 'CARD_REVOKED',
    performedBy: adminUser,
    timestamp: new Date(),
    notes: reason
  });

  await card.save();

  await AdminActivity.create({
    adminId: adminUser,
    action: 'CARD_REVOKED',
    recordType: 'student_card',
    recordId: studentId,
    description: `Revoked ID card for student ${studentId}. Reason: ${reason}`
  }).catch(() => {});

  return card;
};

/**
 * Reissue a student card with a new secure token (invalidating previous token)
 */
export const reissueCard = async (studentId, reason = 'Card reissuance', adminUser = 'ADMIN') => {
  let card = await StudentCard.findOne({ studentId });
  const student = await Student.findOne({ studentId });
  if (!student) {
    throw new Error(`Student "${studentId}" does not exist.`);
  }

  const newToken = generateSecureToken();
  const now = new Date();

  if (!card) {
    card = await StudentCard.create({
      studentId,
      studentMongoId: student._id,
      verificationToken: newToken,
      status: 'active',
      cardVersion: 1,
      issueDate: new Date().toISOString().split('T')[0],
      auditTrail: [
        {
          action: 'CARD_CREATED',
          performedBy: adminUser,
          timestamp: now,
          notes: 'Created upon reissue request'
        }
      ]
    });
  } else {
    card.verificationToken = newToken;
    card.status = 'active';
    card.cardVersion = (card.cardVersion || 1) + 1;
    card.lastReissuedAt = now;
    card.revokedAt = null;
    card.revocationReason = '';
    card.auditTrail.push({
      action: 'CARD_REISSUED',
      performedBy: adminUser,
      timestamp: now,
      notes: reason
    });
    await card.save();
  }

  await AdminActivity.create({
    adminId: adminUser,
    action: 'CARD_REISSUED',
    recordType: 'student_card',
    recordId: studentId,
    description: `Reissued ID card for student ${student.name} (${studentId}). New version: ${card.cardVersion}`
  }).catch(() => {});

  return {
    card,
    student: {
      studentId: student.studentId,
      name: student.name,
      className: student.className,
      schoolName: student.schoolName,
      registrationDate: student.registrationDate
    }
  };
};

/**
 * Bulk generate cards for all existing genuine active students
 */
export const bulkGenerateCards = async (adminUser = 'ADMIN') => {
  const activeStudents = await Student.find({ status: 'active' });
  const existingCards = await StudentCard.find({});
  const cardMap = new Map();
  existingCards.forEach(c => cardMap.set(c.studentId, c));

  let generatedCount = 0;
  let existingCount = 0;

  for (const student of activeStudents) {
    if (cardMap.has(student.studentId)) {
      existingCount++;
    } else {
      const token = generateSecureToken();
      await StudentCard.create({
        studentId: student.studentId,
        studentMongoId: student._id,
        verificationToken: token,
        status: 'active',
        cardVersion: 1,
        issueDate: student.registrationDate || new Date().toISOString().split('T')[0],
        auditTrail: [
          {
            action: 'CARD_BULK_GENERATED',
            performedBy: adminUser,
            timestamp: new Date(),
            notes: 'Generated during bulk card migration'
          }
        ]
      });
      generatedCount++;
    }
  }

  return {
    totalActiveStudents: activeStudents.length,
    newlyGenerated: generatedCount,
    alreadyHadCards: existingCount
  };
};
