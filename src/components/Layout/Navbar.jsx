import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { DevotionalCrest, IskconLogo } from '../../assets/crest';
import { LogOut, Calendar, Shield, Settings, Sparkles, BookOpen, Globe, KeyRound } from 'lucide-react';
import { AdminManagementModal } from '../Admin/AdminManagementModal';

export const Navbar = ({ activeTab, setActiveTab, onOpenSettings, onOpenAdminSecurity, onViewLanding }) => {
  const { currentUser, logout } = useAuth();
  const [currentDateTime, setCurrentDateTime] = useState('');
  const [isWeekendDay, setIsWeekendDay] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);

  const handleOpenAdminModal = () => {
    if (onOpenAdminSecurity) {
      onOpenAdminSecurity();
    } else {
      setIsAdminModalOpen(true);
    }
  };

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const options = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
      setCurrentDateTime(now.toLocaleDateString('en-US', options));
      const day = now.getDay(); // 0 is Sunday, 6 is Saturday
      setIsWeekendDay(day === 0 || day === 6);
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header 
      className="portal-navbar-header"
      style={{
        background: 'linear-gradient(90deg, rgba(27, 67, 50, 0.96) 0%, rgba(20, 50, 37, 0.95) 45%, rgba(139, 69, 19, 0.92) 100%)',
        borderBottom: '2px solid #FFD700',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.35)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        padding: '0.6rem 1.25rem',
        backdropFilter: 'blur(8px)'
      }}
    >
      <style>{`
        @media (min-width: 900px) {
          .portal-navbar-inner {
            flex-wrap: nowrap !important;
          }
          .portal-navbar-controls {
            flex-wrap: nowrap !important;
          }
        }
        @media (max-width: 1300px) and (min-width: 900px) {
          .navbar-subtitle-text {
            max-width: 280px !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            white-space: nowrap !important;
          }
          .navbar-btn-label-long {
            display: none !important;
          }
          .navbar-btn-label-short {
            display: inline !important;
          }
        }
        @media (min-width: 1301px) {
          .navbar-btn-label-short {
            display: none !important;
          }
        }
      `}</style>

      <div 
        className="portal-navbar-inner"
        style={{
          maxWidth: '100%',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}
      >
        {/* Brand identity */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flexShrink: 0 }}>
          <DevotionalCrest size={44} />
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span 
                className="heading-gold" 
                style={{ 
                  fontSize: '1.35rem', 
                  fontWeight: 800,
                  letterSpacing: '0.04em',
                  whiteSpace: 'nowrap'
                }}
              >
                KRISHNA KRIPA
              </span>
              <span 
                style={{ 
                  fontSize: '0.68rem', 
                  background: 'rgba(255, 215, 0, 0.15)',
                  border: '1px solid #FFD700',
                  color: '#FFD700',
                  padding: '1px 7px',
                  borderRadius: '12px',
                  fontWeight: 600,
                  letterSpacing: '0.05em',
                  whiteSpace: 'nowrap'
                }}
              >
                GITA ATTENDANCE
              </span>
            </div>
            <div 
              className="navbar-subtitle-text"
              style={{ 
                color: '#FFF8DC', 
                fontSize: '0.78rem', 
                opacity: 0.9,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap'
              }}
            >
              <span>Bhagavad Gita Weekend Classes Portal</span>
              <span style={{ opacity: 0.5 }}>|</span>
              <span style={{ color: '#FFD700', fontWeight: 600 }}>Saturday &amp; Sunday Register</span>
            </div>
          </div>
        </div>

        {/* Right Admin Controls & Status */}
        <div 
          className="portal-navbar-controls"
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            flexWrap: 'wrap',
            flexShrink: 0 
          }}
        >
          {/* Weekend Banner Badge */}
          <div 
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '4px 10px',
              borderRadius: '20px',
              background: isWeekendDay ? 'rgba(255, 153, 51, 0.25)' : 'rgba(255, 255, 255, 0.1)',
              border: isWeekendDay ? '1px solid #FF9933' : '1px solid rgba(255, 248, 220, 0.3)',
              color: isWeekendDay ? '#FFA726' : '#FFF8DC',
              fontSize: '0.8rem',
              fontWeight: 600,
              whiteSpace: 'nowrap'
            }}
          >
            <Calendar size={13} />
            <span>{currentDateTime}</span>
            {isWeekendDay && (
              <span style={{ background: '#FF9933', color: '#FFF', fontSize: '0.65rem', padding: '1px 5px', borderRadius: '8px' }}>
                Class Day
              </span>
            )}
          </div>

          {/* View Public Website */}
          {onViewLanding && (
            <button
              onClick={onViewLanding}
              className="btn-outline-gold"
              style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap' }}
              title="View Public Landing Page"
            >
              <Globe size={14} />
              <span className="hide-on-mobile">
                <span className="navbar-btn-label-long">Public Website</span>
                <span className="navbar-btn-label-short">Website</span>
              </span>
            </button>
          )}

          {/* Quick Settings */}
          <button
            onClick={onOpenSettings}
            className="btn-outline-gold"
            style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap' }}
            title="Database & MongoDB Settings"
          >
            <Settings size={14} />
            <span className="hide-on-mobile">
              <span className="navbar-btn-label-long">System &amp; Sync</span>
              <span className="navbar-btn-label-short">Sync</span>
            </span>
          </button>

          {/* Admin & Password Management */}
          <button
            onClick={handleOpenAdminModal}
            className="btn-outline-gold"
            style={{ 
              padding: '0.4rem 0.75rem', 
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              background: 'rgba(255, 215, 0, 0.12)',
              whiteSpace: 'nowrap'
            }}
            title="Manage Admins & Passwords (Super Admin ANIK)"
          >
            <Shield size={14} />
            <span className="hide-on-mobile">
              <span className="navbar-btn-label-long">Admins &amp; Password</span>
              <span className="navbar-btn-label-short">Admins</span>
            </span>
          </button>

          {/* Admin User Badge */}
          <div 
            onClick={handleOpenAdminModal}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(0, 0, 0, 0.25)',
              padding: '3px 10px 3px 6px',
              borderRadius: '24px',
              border: '1px solid rgba(255, 215, 0, 0.3)',
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
            title="Click to manage admin password and accounts"
          >
            <div 
              style={{
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #FFD700, #FF9933)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#1B4332',
                fontWeight: 800,
                fontSize: '0.8rem'
              }}
            >
              A
            </div>
            <div style={{ lineHeight: 1.1 }}>
              <div style={{ color: '#FFD700', fontSize: '0.8rem', fontWeight: 700 }}>
                {currentUser?.username || 'ANIK'}
              </div>
              <div style={{ color: '#FFF8DC', fontSize: '0.65rem', opacity: 0.8 }}>
                {currentUser?.role === 'super_admin' ? 'Super Admin' : 'Administrator'}
              </div>
            </div>
          </div>

          {/* Logout Button */}
          <button
            onClick={logout}
            style={{
              background: 'rgba(180, 40, 40, 0.25)',
              border: '1px solid rgba(255, 100, 100, 0.4)',
              color: '#FFCCCC',
              padding: '0.4rem 0.75rem',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              fontSize: '0.8rem',
              fontWeight: 600,
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = 'rgba(200, 40, 40, 0.5)';
              e.currentTarget.style.color = '#FFF';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'rgba(180, 40, 40, 0.25)';
              e.currentTarget.style.color = '#FFCCCC';
            }}
            title="Log out from Admin session"
          >
            <LogOut size={14} />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {!onOpenAdminSecurity && (
        <AdminManagementModal 
          isOpen={isAdminModalOpen} 
          onClose={() => setIsAdminModalOpen(false)} 
        />
      )}
    </header>
  );
};
