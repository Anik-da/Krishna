import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Shield, 
  ShieldCheck, 
  UserPlus, 
  Key, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Users, 
  RefreshCw,
  Lock,
  User,
  Crown
} from 'lucide-react';
import { 
  apiListAdmins, 
  apiCreateAdmin, 
  apiUpdateAdminPassword, 
  apiUpdateAdminRole, 
  apiDeleteAdmin 
} from '../../api/apiClient';
import { useAuth } from '../../context/AuthContext';

export const AdminManagementModal = ({ isOpen, onClose }) => {
  const { currentUser } = useAuth();
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState({ message: '', type: '' });

  // Self change password
  const [selfNewPass, setSelfNewPass] = useState('');
  const [selfConfirmPass, setSelfConfirmPass] = useState('');
  const [selfUpdating, setSelfUpdating] = useState(false);

  // Add new admin form
  const [newUsername, setNewUsername] = useState('');
  const [newName, setNewName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('admin');
  const [creating, setCreating] = useState(false);

  // Selected admin to edit password
  const [targetAdminForPass, setTargetAdminForPass] = useState(null);
  const [targetNewPass, setTargetNewPass] = useState('');
  const [targetUpdating, setTargetUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState('admins');

  const isSuperAdmin = currentUser?.role === 'super_admin' || 
                       currentUser?.role === 'Super Admin' || 
                       currentUser?.username?.toUpperCase() === 'ANIK';

  const loadAdmins = async () => {
    if (!isSuperAdmin) return;
    setLoading(true);
    try {
      const list = await apiListAdmins();
      setAdmins(list);
    } catch (err) {
      console.warn("Could not load admins list:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setFeedback({ message: '', type: '' });
      setSelfNewPass('');
      setSelfConfirmPass('');
      setTargetAdminForPass(null);
      setActiveTab(isSuperAdmin ? 'admins' : 'my-password');
      loadAdmins();
    }
  }, [isOpen, isSuperAdmin]);

  if (!isOpen) return null;

  // Handle Self Password Change
  const handleSelfPasswordChange = async (e) => {
    e.preventDefault();
    if (!selfNewPass || selfNewPass.length < 5) {
      setFeedback({ message: 'New password must be at least 5 characters long.', type: 'error' });
      return;
    }
    if (selfNewPass !== selfConfirmPass) {
      setFeedback({ message: 'Passwords do not match. Please re-enter carefully.', type: 'error' });
      return;
    }

    setSelfUpdating(true);
    setFeedback({ message: '', type: '' });
    try {
      await apiUpdateAdminPassword(currentUser?.username || 'ANIK', selfNewPass);
      setFeedback({ message: 'Your administrator password has been updated successfully!', type: 'success' });
      setSelfNewPass('');
      setSelfConfirmPass('');
    } catch (err) {
      setFeedback({ message: err.message || 'Failed to update password.', type: 'error' });
    } finally {
      setSelfUpdating(false);
    }
  };

  // Handle Add New Admin
  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    if (!newUsername.trim() || !newPassword) {
      setFeedback({ message: 'Username and initial password are required.', type: 'error' });
      return;
    }
    if (newPassword.length < 5) {
      setFeedback({ message: 'Password must be at least 5 characters long.', type: 'error' });
      return;
    }

    setCreating(true);
    setFeedback({ message: '', type: '' });
    try {
      const res = await apiCreateAdmin({
        username: newUsername.trim(),
        name: newName.trim() || newUsername.trim(),
        password: newPassword,
        role: newRole
      });
      setFeedback({ 
        message: res.message || `Administrator ${newUsername.trim().toUpperCase()} created successfully!`, 
        type: 'success' 
      });
      setNewUsername('');
      setNewName('');
      setNewPassword('');
      setNewRole('admin');
      loadAdmins();
    } catch (err) {
      setFeedback({ message: err.message || 'Failed to create administrator.', type: 'error' });
    } finally {
      setCreating(false);
    }
  };

  // Handle Target Admin Password Change
  const handleTargetPasswordChange = async (e) => {
    e.preventDefault();
    if (!targetNewPass || targetNewPass.length < 5) {
      setFeedback({ message: 'Password must be at least 5 characters long.', type: 'error' });
      return;
    }

    setTargetUpdating(true);
    setFeedback({ message: '', type: '' });
    try {
      await apiUpdateAdminPassword(targetAdminForPass.username, targetNewPass);
      setFeedback({ 
        message: `Password for administrator "${targetAdminForPass.username}" updated successfully!`, 
        type: 'success' 
      });
      setTargetAdminForPass(null);
      setTargetNewPass('');
    } catch (err) {
      setFeedback({ message: err.message || 'Failed to update administrator password.', type: 'error' });
    } finally {
      setTargetUpdating(false);
    }
  };

  // Handle Role Toggle
  const handleToggleRole = async (admin) => {
    const nextRole = admin.role === 'super_admin' ? 'admin' : 'super_admin';
    const confirmMsg = nextRole === 'super_admin' 
      ? `Promote "${admin.username}" to Super Administrator? They will be able to create admins, manage passwords, and promote other super admins.`
      : `Demote "${admin.username}" to regular Administrator?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      await apiUpdateAdminRole(admin.username, nextRole);
      setFeedback({ message: `Role for ${admin.username} updated to ${nextRole === 'super_admin' ? 'Super Admin' : 'Admin'}.`, type: 'success' });
      loadAdmins();
    } catch (err) {
      setFeedback({ message: err.message || 'Failed to update role.', type: 'error' });
    }
  };

  // Handle Delete Admin
  const handleDeleteAdmin = async (admin) => {
    if (!window.confirm(`Are you sure you want to delete administrator account "${admin.username}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await apiDeleteAdmin(admin.username);
      setFeedback({ message: `Administrator "${admin.username}" deleted successfully.`, type: 'success' });
      loadAdmins();
    } catch (err) {
      setFeedback({ message: err.message || 'Failed to delete administrator.', type: 'error' });
    }
  };

  const modalContent = (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        zIndex: 999999,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: 'clamp(1rem, 3.5vh, 2.5rem) 1rem',
        overflowY: 'auto',
        boxSizing: 'border-box',
        animation: 'fadeIn 0.2s ease-out'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '750px',
          maxHeight: 'calc(100vh - clamp(2rem, 7vh, 5rem))',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.45)',
          border: '2px solid #FFD700',
          overflow: 'hidden',
          margin: '0 auto',
          position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div 
          style={{
            background: 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)',
            padding: '1.25rem 1.5rem',
            color: '#FFF8DC',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '2px solid #FFD700',
            flexShrink: 0
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div 
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                background: 'rgba(255, 215, 0, 0.2)',
                color: '#FFD700',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <ShieldCheck size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#FFD700', margin: 0 }}>
                Administrator Security &amp; Accounts
              </h2>
              <p style={{ margin: '2px 0 0', fontSize: '0.8rem', opacity: 0.9 }}>
                Manage administrator credentials, privileges, and Super Admin delegation
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#FFF8DC',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.15s ease'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div 
          style={{ 
            padding: '1.25rem 1.5rem', 
            overflowY: 'auto', 
            flex: '1 1 auto', 
            minHeight: 0, 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '1.25rem' 
          }}
        >
          
          {/* Feedback Message */}
          {feedback.message && (
            <div 
              style={{
                padding: '0.85rem 1rem',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.88rem',
                fontWeight: 600,
                background: feedback.type === 'error' ? '#FEE2E2' : '#DCFCE7',
                border: feedback.type === 'error' ? '1px solid #FCA5A5' : '1px solid #86EFAC',
                color: feedback.type === 'error' ? '#991B1B' : '#166534'
              }}
            >
              {feedback.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
              <span>{feedback.message}</span>
            </div>
          )}

          {/* Current Admin Identity Banner */}
          <div 
            style={{
              background: 'linear-gradient(135deg, #FFFDF8 0%, #FFF9EC 100%)',
              border: '1.5px solid #EADDC8',
              borderRadius: '12px',
              padding: '1rem 1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div 
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  background: isSuperAdmin ? 'linear-gradient(135deg, #FFD700, #F59E0B)' : '#E2E8F0',
                  color: isSuperAdmin ? '#1B4332' : '#4A5568',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '1.1rem'
                }}
              >
                {isSuperAdmin ? <Crown size={22} /> : <User size={22} />}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1B4332' }}>
                    {currentUser?.username || 'ANIK'}
                  </span>
                  <span 
                    style={{
                      background: isSuperAdmin ? '#FEF3C7' : '#E2E8F0',
                      color: isSuperAdmin ? '#92400E' : '#4A5568',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: '12px',
                      border: isSuperAdmin ? '1px solid #FCD34D' : '1px solid #CBD5E1',
                      letterSpacing: '0.05em'
                    }}
                  >
                    {isSuperAdmin ? 'SUPER ADMIN (FULL CONTROL)' : 'ADMINISTRATOR'}
                  </span>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '2px' }}>
                  Logged in as primary administrator. {isSuperAdmin ? 'You have full authorization to manage admins and reset credentials.' : 'You can update your personal password.'}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Navigation Tabs for Admin Management */}
          <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid #E2E8F0', paddingBottom: '8px', flexWrap: 'wrap' }}>
            {isSuperAdmin && (
              <button
                type="button"
                onClick={() => setActiveTab('admins')}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: activeTab === 'admins' ? '#1B4332' : '#F1F5F9',
                  color: activeTab === 'admins' ? '#FFD700' : '#475569',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease'
                }}
              >
                <Users size={16} />
                <span>Registered Admins ({admins.length})</span>
              </button>
            )}

            {isSuperAdmin && (
              <button
                type="button"
                onClick={() => setActiveTab('add')}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: activeTab === 'add' ? '#1B4332' : '#F1F5F9',
                  color: activeTab === 'add' ? '#FFD700' : '#475569',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease'
                }}
              >
                <UserPlus size={16} />
                <span>+ Add New Admin</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setActiveTab('my-password')}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                border: 'none',
                background: activeTab === 'my-password' ? '#1B4332' : '#F1F5F9',
                color: activeTab === 'my-password' ? '#FFD700' : '#475569',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease'
              }}
            >
              <Key size={16} />
              <span>Change My Password</span>
            </button>
          </div>

          {/* Section 1: Change My Password */}
          {activeTab === 'my-password' && (
          <div 
            style={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '12px',
              padding: '1.25rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.75rem' }}>
              <Key size={18} color="#1B4332" />
              <h3 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#1B4332', margin: 0 }}>
                Change My Password ({currentUser?.username || 'ANIK'})
              </h3>
            </div>

            <form onSubmit={handleSelfPasswordChange} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'flex-end' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#4A5568', marginBottom: '4px' }}>
                  New Password
                </label>
                <input 
                  type="password"
                  value={selfNewPass}
                  onChange={(e) => setSelfNewPass(e.target.value)}
                  placeholder="Min 5 characters"
                  className="form-input"
                  style={{ width: '100%' }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#4A5568', marginBottom: '4px' }}>
                  Confirm New Password
                </label>
                <input 
                  type="password"
                  value={selfConfirmPass}
                  onChange={(e) => setSelfConfirmPass(e.target.value)}
                  placeholder="Re-enter new password"
                  className="form-input"
                  style={{ width: '100%' }}
                  required
                />
              </div>

              <div>
                <button
                  type="submit"
                  disabled={selfUpdating || !selfNewPass}
                  className="btn-gold"
                  style={{ width: '100%', padding: '0.65rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  <Lock size={15} />
                  <span>{selfUpdating ? 'Updating...' : 'Update My Password'}</span>
                </button>
              </div>
            </form>
          </div>
          )}

          {/* Section 2: Super Admin Exclusive - Add New Admin */}
          {isSuperAdmin && activeTab === 'add' && (
            <div 
              style={{
                background: 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)',
                border: '1.5px solid #86EFAC',
                borderRadius: '12px',
                padding: '1.25rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <UserPlus size={18} color="#166534" />
                  <h3 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#166534', margin: 0 }}>
                    Add New Administrator (Super Admin Privilege)
                  </h3>
                </div>
                <span style={{ background: '#166534', color: '#FFD700', fontSize: '0.7rem', fontWeight: 800, padding: '2px 8px', borderRadius: '10px' }}>
                  SUPER ADMIN ONLY
                </span>
              </div>

              <form onSubmit={handleCreateAdmin} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.85rem', alignItems: 'flex-end' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#166534', marginBottom: '4px' }}>
                    Username *
                  </label>
                  <input 
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value.toUpperCase())}
                    placeholder="e.g. PRIYANKA"
                    className="form-input"
                    style={{ width: '100%', textTransform: 'uppercase' }}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#166534', marginBottom: '4px' }}>
                    Full Name
                  </label>
                  <input 
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Priyanka Sharma"
                    className="form-input"
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#166534', marginBottom: '4px' }}>
                    Initial Password *
                  </label>
                  <input 
                    type="text"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 5 chars"
                    className="form-input"
                    style={{ width: '100%' }}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#166534', marginBottom: '4px' }}>
                    Privilege Role
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="form-input"
                    style={{ width: '100%', fontWeight: 700 }}
                  >
                    <option value="admin">Admin (Standard)</option>
                    <option value="super_admin">Super Admin (Full Access)</option>
                  </select>
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={creating || !newUsername.trim() || !newPassword}
                    className="btn-primary"
                    style={{ width: '100%', padding: '0.65rem 0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  >
                    <UserPlus size={15} />
                    <span>{creating ? 'Creating...' : 'Add Admin'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Section 3: Registered Administrators Table (Super Admin only) */}
          {isSuperAdmin && activeTab === 'admins' && (
            <div 
              style={{
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '12px',
                overflow: 'hidden'
              }}
            >
              <div 
                style={{
                  padding: '0.85rem 1.25rem',
                  background: '#F8FAFC',
                  borderBottom: '1px solid #E2E8F0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Users size={17} color="#1B4332" />
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1B4332', margin: 0 }}>
                    Registered Administrators ({admins.length})
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={loadAdmins}
                  className="btn-ghost"
                  style={{ padding: '4px 8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <RefreshCw size={13} className={loading ? 'spin' : ''} />
                  <span>Refresh</span>
                </button>
              </div>

              {/* Password change drawer for selected admin */}
              {targetAdminForPass && (
                <div 
                  style={{
                    padding: '1rem 1.25rem',
                    background: '#FEF3C7',
                    borderBottom: '1px solid #FCD34D',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '10px'
                  }}
                >
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#92400E' }}>
                    Set New Password for <strong>{targetAdminForPass.username}</strong>:
                  </div>
                  <form onSubmit={handleTargetPasswordChange} style={{ display: 'flex', gap: '8px', flex: 1, maxWidth: '400px' }}>
                    <input 
                      type="password"
                      value={targetNewPass}
                      onChange={(e) => setTargetNewPass(e.target.value)}
                      placeholder="Enter new password"
                      className="form-input"
                      style={{ flex: 1 }}
                      required
                    />
                    <button type="submit" disabled={targetUpdating} className="btn-gold" style={{ padding: '0.4rem 0.85rem', fontSize: '0.82rem' }}>
                      {targetUpdating ? 'Saving...' : 'Save'}
                    </button>
                    <button type="button" onClick={() => setTargetAdminForPass(null)} className="btn-ghost" style={{ padding: '0.4rem 0.75rem', fontSize: '0.82rem' }}>
                      Cancel
                    </button>
                  </form>
                </div>
              )}

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: '#F1F5F9', borderBottom: '1px solid #CBD5E1', color: '#475569' }}>
                      <th style={{ padding: '0.65rem 1rem' }}>Username</th>
                      <th style={{ padding: '0.65rem 1rem' }}>Name</th>
                      <th style={{ padding: '0.65rem 1rem' }}>Role</th>
                      <th style={{ padding: '0.65rem 1rem' }}>Last Login</th>
                      <th style={{ padding: '0.65rem 1rem', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {admins.map((ad, idx) => {
                      const isPrimary = ad.username === 'ANIK';
                      const isCurrent = ad.username === currentUser?.username;
                      const isSuper = ad.role === 'super_admin';

                      return (
                        <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                          <td style={{ padding: '0.75rem 1rem', fontWeight: 800, color: '#1B4332' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {ad.username}
                              {isPrimary && (
                                <span style={{ background: '#FEF3C7', color: '#92400E', fontSize: '0.65rem', padding: '1px 5px', borderRadius: '4px' }}>
                                  PRIMARY
                                </span>
                              )}
                              {isCurrent && (
                                <span style={{ background: '#DCFCE7', color: '#166534', fontSize: '0.65rem', padding: '1px 5px', borderRadius: '4px' }}>
                                  YOU
                                </span>
                              )}
                            </div>
                          </td>
                          <td style={{ padding: '0.75rem 1rem', color: '#334155' }}>
                            {ad.name || ad.username}
                          </td>
                          <td style={{ padding: '0.75rem 1rem' }}>
                            <span 
                              style={{
                                background: isSuper ? '#FEF3C7' : '#F1F5F9',
                                color: isSuper ? '#92400E' : '#475569',
                                fontWeight: 700,
                                fontSize: '0.75rem',
                                padding: '2px 8px',
                                borderRadius: '10px',
                                border: isSuper ? '1px solid #FCD34D' : '1px solid #CBD5E1'
                              }}
                            >
                              {isSuper ? 'Super Admin' : 'Admin'}
                            </span>
                          </td>
                          <td style={{ padding: '0.75rem 1rem', color: '#64748B', fontSize: '0.78rem' }}>
                            {ad.lastLogin ? new Date(ad.lastLogin).toLocaleDateString() : 'Never'}
                          </td>
                          <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                              <button
                                type="button"
                                onClick={() => {
                                  setTargetAdminForPass(ad);
                                  setTargetNewPass('');
                                }}
                                title="Change this admin's password"
                                style={{
                                  background: '#FEF3C7',
                                  border: '1px solid #FCD34D',
                                  color: '#92400E',
                                  padding: '3px 8px',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  fontSize: '0.75rem',
                                  fontWeight: 700
                                }}
                              >
                                Password
                              </button>

                              {!isPrimary && (
                                <button
                                  type="button"
                                  onClick={() => handleToggleRole(ad)}
                                  title={isSuper ? "Demote to Admin" : "Promote to Super Admin"}
                                  style={{
                                    background: '#F1F5F9',
                                    border: '1px solid #CBD5E1',
                                    color: '#334155',
                                    padding: '3px 8px',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontSize: '0.75rem'
                                  }}
                                >
                                  {isSuper ? 'Demote' : 'Make Super'}
                                </button>
                              )}

                              {!isPrimary && !isCurrent && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteAdmin(ad)}
                                  title="Delete admin account"
                                  style={{
                                    background: '#FEE2E2',
                                    border: '1px solid #FCA5A5',
                                    color: '#991B1B',
                                    padding: '3px 6px',
                                    borderRadius: '6px',
                                    cursor: 'pointer'
                                  }}
                                >
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div 
          style={{
            padding: '1rem 1.5rem',
            background: '#F8FAFC',
            borderTop: '1px solid #E2E8F0',
            display: 'flex',
            justifyContent: 'flex-end',
            flexShrink: 0
          }}
        >
          <button
            type="button"
            onClick={onClose}
            className="btn-primary"
            style={{ padding: '0.55rem 1.5rem' }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
