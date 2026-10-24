import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const adminUserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  name: {
    type: String,
    trim: true,
    default: 'Administrator'
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['super_admin', 'admin'],
    default: 'admin'
  },
  createdBy: {
    type: String,
    default: 'SYSTEM'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
    type: Date
  }
}, { timestamps: true });

// Hash password before saving
adminUserSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  // If already hashed with bcrypt, skip
  if (this.password && this.password.startsWith('$2')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

adminUserSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) return false;
  if (this.password.startsWith('$2')) {
    return await bcrypt.compare(candidatePassword, this.password);
  }
  return this.password === candidatePassword;
};

export default mongoose.model('AdminUser', adminUserSchema);
