import {
  getOrCreateStudentCard,
  verifyCardToken,
  revokeCard,
  reissueCard,
  bulkGenerateCards
} from '../services/cardService.js';
import StudentCard from '../models/StudentCard.js';
import Student from '../models/Student.js';

// GET /api/id-card/verify/:token (PUBLIC - Rate limited)
export const handleVerifyCard = async (req, res) => {
  try {
    const { token } = req.params;
    const result = await verifyCardToken(token);
    return res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Verification check failed: ' + error.message
    });
  }
};

// GET /api/id-card/my-card (STUDENT ONLY - Protected by requireStudent)
export const handleGetMyCard = async (req, res) => {
  try {
    const studentId = req.student.studentId;
    const { card, student } = await getOrCreateStudentCard(studentId, `STUDENT_${studentId}`);
    return res.status(200).json({
      success: true,
      card: {
        studentId: card.studentId,
        verificationToken: card.verificationToken,
        status: card.status,
        cardVersion: card.cardVersion,
        issueDate: card.issueDate,
        lastReissuedAt: card.lastReissuedAt,
        revokedAt: card.revokedAt,
        revocationReason: card.revocationReason
      },
      student
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Could not load your student ID card: ' + error.message
    });
  }
};

// GET /api/id-card/student/:studentId (ADMIN ONLY)
export const handleGetStudentCardAdmin = async (req, res) => {
  try {
    const { studentId } = req.params;
    const adminUser = req.admin?.username || 'ADMIN';
    const { card, student } = await getOrCreateStudentCard(studentId, adminUser);
    return res.status(200).json({
      success: true,
      card,
      student
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// GET /api/id-card/list (ADMIN ONLY)
export const handleListAllCards = async (req, res) => {
  try {
    const { q, status, className } = req.query;
    
    // Find students matching query first
    const studentQuery = {};
    if (className && className !== 'ALL') {
      studentQuery.className = className;
    }
    if (q && q.trim()) {
      const regex = new RegExp(q.trim(), 'i');
      studentQuery.$or = [
        { name: regex },
        { studentId: regex },
        { schoolName: regex }
      ];
    }

    const students = await Student.find(studentQuery).sort({ name: 1 });
    const studentIds = students.map(s => s.studentId);

    const cardQuery = { studentId: { $in: studentIds } };
    if (status && status !== 'ALL') {
      cardQuery.status = status;
    }

    const cards = await StudentCard.find(cardQuery);
    const cardMap = new Map();
    cards.forEach(c => cardMap.set(c.studentId, c));

    const combined = students.map(s => {
      const card = cardMap.get(s.studentId);
      return {
        studentId: s.studentId,
        name: s.name,
        className: s.className,
        schoolName: s.schoolName,
        registrationDate: s.registrationDate,
        studentStatus: s.status,
        hasCard: !!card,
        cardStatus: card ? card.status : 'not_generated',
        verificationToken: card ? card.verificationToken : null,
        cardVersion: card ? card.cardVersion : 1,
        issueDate: card ? card.issueDate : (s.registrationDate || new Date().toISOString().split('T')[0]),
        lastReissuedAt: card ? card.lastReissuedAt : null,
        revokedAt: card ? card.revokedAt : null,
        revocationReason: card ? card.revocationReason : ''
      };
    });

    return res.status(200).json({
      success: true,
      count: combined.length,
      data: combined
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch cards: ' + error.message
    });
  }
};

// POST /api/id-card/revoke/:studentId (ADMIN ONLY)
export const handleRevokeCard = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { reason } = req.body;
    const adminUser = req.admin?.username || 'ADMIN';
    const updatedCard = await revokeCard(studentId, reason || 'Administrative revocation', adminUser);
    return res.status(200).json({
      success: true,
      message: `Card for student ${studentId} has been revoked.`,
      card: updatedCard
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// POST /api/id-card/reissue/:studentId (ADMIN ONLY)
export const handleReissueCard = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { reason } = req.body;
    const adminUser = req.admin?.username || 'ADMIN';
    const result = await reissueCard(studentId, reason || 'Administrative reissue', adminUser);
    return res.status(200).json({
      success: true,
      message: `Card for student ${studentId} reissued with new verification token.`,
      ...result
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// POST /api/id-card/bulk-generate (ADMIN ONLY)
export const handleBulkGenerate = async (req, res) => {
  try {
    const adminUser = req.admin?.username || 'ADMIN';
    const result = await bulkGenerateCards(adminUser);
    return res.status(200).json({
      success: true,
      message: `Bulk card generation completed. Generated: ${result.newlyGenerated}, Existing: ${result.alreadyHadCards}.`,
      data: result
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
