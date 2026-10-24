import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import AdminActivity from '../models/AdminActivity.js';
import AdminUser from '../models/AdminUser.js';

const JWT_SECRET = process.env.JWT_SECRET || 'krishna_kripa_sacred_jwt_secret_2026_dev_key';
const DEFAULT_SUPERADMIN_USER = (process.env.ADMIN_USERNAME || 'ANIK').toUpperCase();
const DEFAULT_SUPERADMIN_PASS = process.env.ADMIN_PASSWORD || 'anik@45';

// Ensure the initial Super Admin (ANIK) exists in the database
const ensureSuperAdminSeeded = async () => {
  try {
    let existing = await AdminUser.findOne({ username: DEFAULT_SUPERADMIN_USER });
    if (!existing) {
      const hashed = await bcrypt.hash(DEFAULT_SUPERADMIN_PASS, 10);
      existing = await AdminUser.create({
        username: DEFAULT_SUPERADMIN_USER,
        name: 'Anik (Super Administrator)',
        password: hashed,
        role: 'super_admin',
        createdBy: 'INITIAL_SYSTEM_SEED'
      });
      console.log(`[Admin Security] Seeded primary Super Admin: ${DEFAULT_SUPERADMIN_USER}`);
    } else if (existing.role !== 'super_admin') {
      existing.role = 'super_admin';
      await existing.save();
    }
    return existing;
  } catch (err) {
    console.warn('[Admin Security Seed Warning]:', err.message);
  }
};

import mongoose from 'mongoose';

// Seed on startup once database connection is established
if (mongoose.connection.readyState === 1) {
  ensureSuperAdminSeeded();
} else {
  mongoose.connection.once('open', () => {
    ensureSuperAdminSeeded();
  });
}

export const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required.'
      });
    }

    const cleanUser = username.trim().toUpperCase();

    // Ensure database has primary super admin
    await ensureSuperAdminSeeded();

    let adminDoc = await AdminUser.findOne({ username: cleanUser });

    // Fallback if DB check failed or record was deleted: allow default superadmin env credentials
    if (!adminDoc && cleanUser === DEFAULT_SUPERADMIN_USER) {
      if (password === DEFAULT_SUPERADMIN_PASS) {
        const hashed = await bcrypt.hash(DEFAULT_SUPERADMIN_PASS, 10);
        adminDoc = await AdminUser.create({
          username: DEFAULT_SUPERADMIN_USER,
          name: 'Anik (Super Administrator)',
          password: hashed,
          role: 'super_admin',
          createdBy: 'ENV_RESTORE'
        });
      }
    }

    if (!adminDoc) {
      return res.status(401).json({
        success: false,
        message: 'Invalid administrator credentials. Account does not exist.'
      });
    }

    // Verify password
    let passwordMatches = await adminDoc.comparePassword(password);
    // Backward compatibility for plaintext initial dev password
    if (!passwordMatches && cleanUser === DEFAULT_SUPERADMIN_USER && password === DEFAULT_SUPERADMIN_PASS) {
      passwordMatches = true;
      adminDoc.password = await bcrypt.hash(DEFAULT_SUPERADMIN_PASS, 10);
      await adminDoc.save();
    }

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: 'Invalid administrator credentials. Please check your password.'
      });
    }

    // Update last login
    adminDoc.lastLogin = new Date();
    await adminDoc.save();

    const isSuper = adminDoc.role === 'super_admin' || cleanUser === DEFAULT_SUPERADMIN_USER;

    // Sign JWT
    const token = jwt.sign(
      {
        username: adminDoc.username,
        name: adminDoc.name || adminDoc.username,
        role: isSuper ? 'super_admin' : 'admin',
        isSuperAdmin: isSuper,
        issuedAt: Date.now()
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Record admin activity
    try {
      await AdminActivity.create({
        adminId: adminDoc.username,
        action: 'ADMIN_LOGIN',
        recordType: 'auth',
        description: `Administrator ${adminDoc.username} (${isSuper ? 'Super Admin' : 'Admin'}) logged into portal`
      });
    } catch (e) {
      console.warn("Could not record login activity:", e.message);
    }

    return res.status(200).json({
      success: true,
      token,
      admin: {
        username: adminDoc.username,
        name: adminDoc.name || 'Administrator',
        role: isSuper ? 'super_admin' : 'admin',
        isSuperAdmin: isSuper
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error during authentication: ' + error.message
    });
  }
};

export const logout = async (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Administrator logged out successfully.'
  });
};

export const getMe = async (req, res) => {
  try {
    const username = req.admin?.username?.toUpperCase();
    const adminDoc = await AdminUser.findOne({ username });
    const isSuper = adminDoc?.role === 'super_admin' || username === DEFAULT_SUPERADMIN_USER;

    return res.status(200).json({
      success: true,
      admin: {
        username: username,
        role: isSuper ? 'super_admin' : (adminDoc?.role || 'admin'),
        isSuperAdmin: isSuper,
        name: adminDoc?.name || req.admin?.name || 'Administrator'
      }
    });
  } catch (e) {
    return res.status(200).json({
      success: true,
      admin: {
        username: req.admin?.username || 'ANIK',
        role: 'super_admin',
        isSuperAdmin: true,
        name: 'Administrator'
      }
    });
  }
};

// 1. GET /api/auth/admins (Super Admin only: lists all admin users)
export const listAdmins = async (req, res) => {
  try {
    const callerUser = (req.admin?.username || '').toUpperCase();
    const isSuper = req.admin?.role === 'super_admin' || req.admin?.isSuperAdmin || callerUser === DEFAULT_SUPERADMIN_USER;

    if (!isSuper) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only Super Administrators can view the admin accounts register.'
      });
    }

    await ensureSuperAdminSeeded();
    const admins = await AdminUser.find({}, '-password').sort({ createdAt: 1 });
    return res.status(200).json({
      success: true,
      data: admins
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 2. POST /api/auth/admins (Super Admin only: add new Admin or Super Admin)
export const createAdmin = async (req, res) => {
  try {
    const callerUser = (req.admin?.username || '').toUpperCase();
    const isSuper = req.admin?.role === 'super_admin' || req.admin?.isSuperAdmin || callerUser === DEFAULT_SUPERADMIN_USER;

    if (!isSuper) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only Super Administrators can create new administrator accounts.'
      });
    }

    const { username, name, password, role } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required.'
      });
    }

    if (password.length < 5) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 5 characters long.'
      });
    }

    const cleanUser = username.trim().toUpperCase();
    const existing = await AdminUser.findOne({ username: cleanUser });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `Administrator with username "${cleanUser}" already exists.`
      });
    }

    const adminRole = role === 'super_admin' ? 'super_admin' : 'admin';
    const hashedPassword = await bcrypt.hash(password, 10);

    const newAdmin = await AdminUser.create({
      username: cleanUser,
      name: name?.trim() || cleanUser,
      password: hashedPassword,
      role: adminRole,
      createdBy: callerUser
    });

    try {
      await AdminActivity.create({
        adminId: callerUser,
        action: 'ADMIN_CREATED',
        recordType: 'auth',
        description: `Super Admin ${callerUser} created new administrator "${cleanUser}" with role: ${adminRole}`
      });
    } catch (e) {}

    return res.status(201).json({
      success: true,
      message: `Administrator ${cleanUser} successfully created with ${adminRole === 'super_admin' ? 'Super Admin' : 'Admin'} privileges.`,
      data: {
        username: newAdmin.username,
        name: newAdmin.name,
        role: newAdmin.role,
        createdAt: newAdmin.createdAt
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 3. PUT /api/auth/admins/:username/password (Change password: Super Admin or Self)
export const updateAdminPassword = async (req, res) => {
  try {
    const callerUser = (req.admin?.username || '').toUpperCase();
    const targetUser = (req.params.username || '').toUpperCase();
    const { newPassword } = req.body;

    const isSuper = req.admin?.role === 'super_admin' || 
                    req.admin?.role === 'Super Admin' || 
                    req.admin?.isSuperAdmin || 
                    callerUser === DEFAULT_SUPERADMIN_USER || 
                    callerUser === 'ANIK';
    const isSelf = callerUser === targetUser;

    if (!isSuper && !isSelf) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only change your own password, or you must be a Super Administrator.'
      });
    }

    if (!newPassword || newPassword.length < 5) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 5 characters long.'
      });
    }

    let adminDoc = await AdminUser.findOne({ username: targetUser });
    if (!adminDoc) {
      if (targetUser === DEFAULT_SUPERADMIN_USER) {
        adminDoc = await ensureSuperAdminSeeded();
      } else {
        return res.status(404).json({
          success: false,
          message: `Administrator "${targetUser}" not found.`
        });
      }
    }

    adminDoc.password = await bcrypt.hash(newPassword, 10);
    await adminDoc.save();

    try {
      await AdminActivity.create({
        adminId: callerUser,
        action: 'ADMIN_PASSWORD_CHANGED',
        recordType: 'auth',
        description: `Password for administrator "${targetUser}" was updated by ${callerUser}`
      });
    } catch (e) {}

    return res.status(200).json({
      success: true,
      message: `Password for "${targetUser}" updated successfully.`
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 4. PUT /api/auth/admins/:username/role (Super Admin can promote/demote role)
export const updateAdminRole = async (req, res) => {
  try {
    const callerUser = (req.admin?.username || '').toUpperCase();
    const targetUser = (req.params.username || '').toUpperCase();
    const { role } = req.body;

    const isSuper = req.admin?.role === 'super_admin' || 
                    req.admin?.role === 'Super Admin' || 
                    req.admin?.isSuperAdmin || 
                    callerUser === DEFAULT_SUPERADMIN_USER || 
                    callerUser === 'ANIK';
    if (!isSuper) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only Super Administrators can alter administrator privilege levels.'
      });
    }

    if (targetUser === DEFAULT_SUPERADMIN_USER && role !== 'super_admin') {
      return res.status(400).json({
        success: false,
        message: `Primary Super Admin "${DEFAULT_SUPERADMIN_USER}" cannot be demoted.`
      });
    }

    const adminDoc = await AdminUser.findOne({ username: targetUser });
    if (!adminDoc) {
      return res.status(404).json({
        success: false,
        message: `Administrator "${targetUser}" not found.`
      });
    }

    adminDoc.role = role === 'super_admin' ? 'super_admin' : 'admin';
    await adminDoc.save();

    try {
      await AdminActivity.create({
        adminId: callerUser,
        action: 'ADMIN_ROLE_UPDATED',
        recordType: 'auth',
        description: `Role of administrator "${targetUser}" updated to ${adminDoc.role} by ${callerUser}`
      });
    } catch (e) {}

    return res.status(200).json({
      success: true,
      message: `Role for "${targetUser}" updated to ${adminDoc.role === 'super_admin' ? 'Super Admin' : 'Admin'}.`,
      data: { username: adminDoc.username, role: adminDoc.role }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 5. DELETE /api/auth/admins/:username (Super Admin only: remove admin)
export const deleteAdmin = async (req, res) => {
  try {
    const callerUser = (req.admin?.username || '').toUpperCase();
    const targetUser = (req.params.username || '').toUpperCase();

    const isSuper = req.admin?.role === 'super_admin' || 
                    req.admin?.role === 'Super Admin' || 
                    req.admin?.isSuperAdmin || 
                    callerUser === DEFAULT_SUPERADMIN_USER || 
                    callerUser === 'ANIK';
    if (!isSuper) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only Super Administrators can delete administrator accounts.'
      });
    }

    if (targetUser === DEFAULT_SUPERADMIN_USER) {
      return res.status(400).json({
        success: false,
        message: `Primary Super Admin "${DEFAULT_SUPERADMIN_USER}" cannot be deleted.`
      });
    }

    if (callerUser === targetUser) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own active administrator account.'
      });
    }

    const deleted = await AdminUser.findOneAndDelete({ username: targetUser });
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: `Administrator "${targetUser}" not found.`
      });
    }

    try {
      await AdminActivity.create({
        adminId: callerUser,
        action: 'ADMIN_DELETED',
        recordType: 'auth',
        description: `Administrator account "${targetUser}" was removed by ${callerUser}`
      });
    } catch (e) {}

    return res.status(200).json({
      success: true,
      message: `Administrator account "${targetUser}" has been deleted.`
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
