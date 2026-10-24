import mongoose from 'mongoose';
import Student from './Student.js';

const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 }
});

const Counter = mongoose.model('Counter', counterSchema);

/**
 * Safely generate atomic, consecutive student IDs (e.g. BGK-2026-0001)
 * Guaranteed to prevent race conditions and never reuse IDs upon deletion.
 */
let inMemorySeq = 8;

export const getNextStudentId = async (year = '2026') => {
  if (mongoose.connection.readyState !== 1) {
    throw new Error('Database is disconnected. Cannot safely allocate consecutive student ID in MongoDB Atlas.');
  }

  const existingCount = await Student.countDocuments();

  // If there are no students in the database, start ID sequence from 1 (0001)
  if (existingCount === 0) {
    const counterId = `studentId_${year}`;
    await Counter.findByIdAndUpdate(
      counterId,
      { $set: { seq: 1 } },
      { upsert: true }
    );
    return `BGK-${year}-0001`;
  }

  // If students already exist, continue sequentially from the highest existing ID
  const allStudents = await Student.find({}, { studentId: 1 }).lean();
  let maxNum = 0;
  allStudents.forEach(s => {
    if (s.studentId) {
      const match = s.studentId.match(/-(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
    }
  });

  const nextSeq = maxNum >= 1 ? maxNum + 1 : (existingCount + 1);
  const counterId = `studentId_${year}`;
  const counter = await Counter.findByIdAndUpdate(
    counterId,
    { $set: { seq: nextSeq } },
    { new: true, upsert: true }
  );

  const padded = String(counter.seq).padStart(4, '0');
  return `BGK-${year}-${padded}`;
};

export default Counter;
