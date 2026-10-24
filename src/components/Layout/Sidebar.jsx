import React from 'react';
import { 
  LayoutDashboard, 
  UserCheck, 
  Users, 
  Calendar, 
  History, 
  FileSpreadsheet, 
  PlusCircle, 
  Sparkles,
  BookOpen,
  Brain,
  CalendarCheck,
  Palette,
  Trophy
} from 'lucide-react';

export const Sidebar = ({ activeTab, setActiveTab, onQuickAddStudent }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'competition', label: 'Janmashtami Challenge', icon: Trophy, highlight: true },
    { id: 'planning', label: 'Weekly Planning', icon: CalendarCheck, highlight: true },
    { id: 'take-attendance', label: 'Take Attendance', icon: UserCheck },
    { id: 'students', label: 'Students Directory', icon: Users },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'gita-chat', label: 'Gita Q&A', icon: BookOpen, ai: true },
    { id: 'attendance-insights', label: 'AI Insights', icon: Brain, ai: true },
    { id: 'calendar', label: 'Session Calendar', icon: Calendar },
    { id: 'sessions', label: 'Attendance History', icon: History },
    { id: 'reports', label: 'Reports & Export', icon: FileSpreadsheet },
  ];

  return (
    <div 
      style={{
        background: 'rgba(255, 255, 255, 0.95)',
        borderBottom: '1px solid rgba(255, 215, 0, 0.4)',
        boxShadow: '0 4px 15px rgba(0, 0, 0, 0.08)',
        padding: '0.45rem 1.25rem',
        backdropFilter: 'blur(10px)',
        position: 'sticky',
        top: '64px',
        zIndex: 40
      }}
    >
      <style>{`
        .nav-tabs-ribbon::-webkit-scrollbar {
          display: none !important;
          width: 0 !important;
          height: 0 !important;
        }
        .nav-tabs-ribbon {
          -ms-overflow-style: none !important;
          scrollbar-width: none !important;
        }
        @media (min-width: 900px) {
          .nav-tabs-ribbon {
            flex-wrap: wrap !important;
            overflow-x: visible !important;
            row-gap: 0.35rem !important;
          }
        }
      `}</style>
      <div 
        style={{
          maxWidth: '100%',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem'
        }}
      >
        {/* Navigation Tabs */}
        <nav 
          className="nav-tabs-ribbon"
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.25rem', 
            padding: '0.15rem 0',
            flex: 1,
            minWidth: 0,
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none'
          }}
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                title={item.label}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '0.42rem 0.68rem',
                  borderRadius: '7px',
                  flexShrink: 0,
                  border: isActive 
                    ? '1.5px solid #FFD700' 
                    : item.highlight 
                      ? '1px dashed #FF9933' 
                      : item.ai
                        ? '1px solid rgba(255, 215, 0, 0.35)'
                        : '1px solid transparent',
                  background: isActive 
                    ? 'linear-gradient(135deg, #1B4332 0%, #143527 100%)' 
                    : item.highlight
                      ? '#FFF4E5'
                      : item.ai
                        ? '#FFFDF5'
                        : 'transparent',
                  color: isActive 
                    ? '#FFD700' 
                    : item.highlight
                      ? '#D35400'
                      : item.ai
                        ? '#8B4513'
                        : '#4A4A4A',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  transition: 'all 0.18s ease',
                  whiteSpace: 'nowrap',
                  boxShadow: isActive ? '0 3px 10px rgba(27, 67, 50, 0.25)' : 'none'
                }}
                onMouseOver={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = '#F7F3E9';
                    e.currentTarget.style.color = '#1B4332';
                  }
                }}
                onMouseOut={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = item.highlight ? '#FFF4E5' : (item.ai ? '#FFFDF5' : 'transparent');
                    e.currentTarget.style.color = item.highlight ? '#D35400' : (item.ai ? '#8B4513' : '#4A4A4A');
                  }
                }}
              >
                <Icon size={15} color={isActive ? '#FFD700' : (item.highlight ? '#D35400' : (item.ai ? '#FF9933' : '#666'))} />
                <span>{item.label}</span>
                {item.highlight && !isActive && (
                  <span style={{ 
                    background: '#FF9933', 
                    color: '#FFF', 
                    fontSize: '0.62rem', 
                    padding: '1px 5px', 
                    borderRadius: '4px',
                    fontWeight: 700
                  }}>
                    Weekend
                  </span>
                )}
                {item.ai && !isActive && (
                  <span style={{ 
                    background: 'rgba(255, 215, 0, 0.25)', 
                    color: '#8B4513', 
                    fontSize: '0.62rem', 
                    padding: '1px 5px', 
                    borderRadius: '4px',
                    fontWeight: 700,
                    border: '1px solid rgba(255, 215, 0, 0.4)'
                  }}>
                    AI
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Quick Add Student Action Button */}
        <div style={{ flexShrink: 0 }}>
          <button
            onClick={onQuickAddStudent}
            className="btn-gold"
            style={{ 
              padding: '0.42rem 0.75rem', 
              fontSize: '0.8rem',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              whiteSpace: 'nowrap',
              boxShadow: '0 2px 8px rgba(212, 160, 23, 0.3)'
            }}
          >
            <PlusCircle size={15} />
            <span>+ Student</span>
          </button>
        </div>
      </div>
    </div>
  );
};
