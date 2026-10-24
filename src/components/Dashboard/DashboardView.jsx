import React from 'react';
import { 
  Users, 
  CalendarCheck, 
  UserCheck, 
  UserX, 
  Percent, 
  PlusCircle, 
  ClipboardCheck, 
  Clock, 
  FileText, 
  ArrowRight,
  BookOpen,
  Sparkles,
  School,
  ChevronRight,
  AlertTriangle,
  CalendarX,
  Info
} from 'lucide-react';
import { formatDateDMY, isPastFridayDeadline } from '../../db/db';

export const DashboardView = ({ 
  metrics, 
  weeklyPlan,
  onNavigate, 
  onAddStudent, 
  onViewStudentProfile 
}) => {
  if (!metrics) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem', color: '#FFF8DC' }}>
        <p>Loading Bhagavad Gita class metrics...</p>
      </div>
    );
  }

  const {
    totalStudents,
    totalConductedSessions,
    latestSession,
    latestPresent,
    latestAbsent,
    overallPercentage,
    recentlyAdded,
    recentActivities
  } = metrics;

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      
      {/* Top Banner / Devotional Welcome */}
      <div 
        className="devotional-card"
        style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.96) 0%, rgba(255, 248, 220, 0.95) 100%)',
          padding: '1.5rem 1.75rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          borderLeft: '5px solid #FFD700'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span 
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '1.35rem',
                fontWeight: 700,
                color: '#1B4332',
                letterSpacing: '0.03em'
              }}
            >
              Hare Krishna! Welcome to Bhagavad Gita Class Register
            </span>
            <span style={{ background: '#FF9933', color: '#FFF', fontSize: '0.72rem', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
              Live System
            </span>
          </div>
          <p style={{ color: '#666', fontSize: '0.9rem', maxWidth: '720px', lineHeight: 1.5 }}>
            Manage attendance for weekly Saturday and Sunday Bhagavad Gita classes. 
            All statistics reflect saved records from the database.
          </p>
        </div>

        {/* Quick Action Badges */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button 
            onClick={() => onNavigate('take-attendance')} 
            className="btn-saffron"
            style={{ fontSize: '0.9rem', padding: '0.65rem 1.25rem' }}
          >
            <ClipboardCheck size={18} />
            <span>Take Weekend Attendance</span>
          </button>
          <button 
            onClick={onAddStudent} 
            className="btn-gold"
            style={{ fontSize: '0.9rem', padding: '0.65rem 1.25rem' }}
          >
            <PlusCircle size={18} />
            <span>Add Student</span>
          </button>
        </div>
      </div>

      {/* Weekly Class Confirmation Reminder Banner (Only visible BEFORE Friday 06:00 PM deadline) */}
      {(!weeklyPlan || weeklyPlan.status === 'undecided') && !isPastFridayDeadline(weeklyPlan?.saturdayDate) && (
        <div 
          style={{
            background: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)',
            border: '2px solid #F59E0B',
            borderRadius: '12px',
            padding: '1.25rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            boxShadow: '0 4px 15px rgba(245, 158, 11, 0.15)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: '#FDE68A', padding: '10px', borderRadius: '10px', color: '#B45309' }}>
              <AlertTriangle size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <strong style={{ color: '#92400E', fontSize: '1.05rem' }}>
                  Upcoming Weekend Class Schedule Pending Confirmation
                </strong>
                <span style={{ background: '#F59E0B', color: '#FFF', fontSize: '0.72rem', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
                  ACTION REQUIRED
                </span>
              </div>
              <p style={{ color: '#78350F', fontSize: '0.85rem', margin: '3px 0 0', lineHeight: 1.4 }}>
                Saturday &amp; Sunday classes are conducted on either one day or not planned. 
                Please confirm this week&apos;s plan ({(weeklyPlan?.deadlineNote || 'Confirm by Friday 06:00 PM').replace(/Thursday/gi, 'Friday')}).
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigate('planning')}
            style={{
              background: '#D97706',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              padding: '0.65rem 1.25rem',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 6px rgba(217, 119, 6, 0.3)'
            }}
            className="hover:bg-amber-700 active:scale-95"
          >
            <CalendarCheck size={16} />
            <span>Confirm Weekend Plan</span>
          </button>
        </div>
      )}

      {/* No Class This Week / Auto-Closed Banner */}
      {weeklyPlan?.status === 'no_class' && (
        <div 
          style={{
            background: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)',
            border: '1.5px solid #F59E0B',
            borderRadius: '12px',
            padding: '1rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            boxShadow: '0 4px 12px rgba(245, 158, 11, 0.12)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: '#FCD34D', padding: '10px', borderRadius: '10px', color: '#92400E' }}>
              <CalendarX size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.98rem', fontWeight: 800, color: '#92400E' }}>
                  No Class This Weekend {weeklyPlan.autoClosed || isPastFridayDeadline(weeklyPlan?.saturdayDate) ? '(Auto-Closed: Friday 06:00 PM deadline passed)' : ''}
                </span>
              </div>
              <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: '#78350F', lineHeight: 1.4 }}>
                {weeklyPlan.publicAnnouncement || 'There are no classes scheduled for this weekend. Regular schedule resumes next week.'}
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigate('planning')}
            style={{
              background: '#FFFFFF',
              border: '1px solid #FCD34D',
              color: '#B45309',
              borderRadius: '6px',
              padding: '0.45rem 1rem',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
            className="hover:bg-amber-50 active:scale-95"
          >
            Manage Weekly Plan
          </button>
        </div>
      )}

      {weeklyPlan?.status === 'scheduled' && (
        <div 
          style={{
            background: 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)',
            border: '1.5px solid #86EFAC',
            borderRadius: '12px',
            padding: '1rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <CalendarCheck size={22} style={{ color: '#16A34A' }} />
            <div>
              <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#14532D' }}>
                Confirmed This Week: {weeklyPlan.selectedDay}, {formatDateDMY(weeklyPlan.scheduledDate)} ({weeklyPlan.scheduledTime})
              </span>
              {weeklyPlan.topic && (
                <span style={{ fontSize: '0.82rem', color: '#166534', marginLeft: '8px' }}>
                  &bull; {weeklyPlan.topic}
                </span>
              )}
            </div>
          </div>

          <button
            onClick={() => onNavigate('planning')}
            style={{
              background: '#FFFFFF',
              border: '1px solid #BBF7D0',
              color: '#15803D',
              borderRadius: '6px',
              padding: '0.4rem 0.9rem',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Manage Weekly Plan
          </button>
        </div>
      )}
      <div 
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '1.25rem'
        }}
      >
        {/* Metric 1: Total Registered Students */}
        <div 
          className="devotional-card" 
          style={{ padding: '1.35rem', borderTop: '4px solid #1B4332', cursor: 'pointer' }}
          onClick={() => onNavigate('students')}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.82rem', color: '#666', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Registered Students
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#1B4332', marginTop: '0.35rem' }}>
                {totalStudents}
              </div>
            </div>
            <div style={{ background: '#E8F5E9', padding: '10px', borderRadius: '10px', color: '#1B4332' }}>
              <Users size={24} />
            </div>
          </div>
          <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: '#2D6A4F', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>Active student profiles</span>
            <ChevronRight size={14} />
          </div>
        </div>

        {/* Metric 2: Total Conducted Sessions */}
        <div 
          className="devotional-card" 
          style={{ padding: '1.35rem', borderTop: '4px solid #8B4513', cursor: 'pointer' }}
          onClick={() => onNavigate('sessions')}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.82rem', color: '#666', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Conducted Classes
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#8B4513', marginTop: '0.35rem' }}>
                {totalConductedSessions}
              </div>
            </div>
            <div style={{ background: '#FFF3E0', padding: '10px', borderRadius: '10px', color: '#8B4513' }}>
              <CalendarCheck size={24} />
            </div>
          </div>
          <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: '#8B4513', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>Weekend class sessions</span>
            <ChevronRight size={14} />
          </div>
        </div>

        {/* Metric 3: Present in Latest Session */}
        <div 
          className="devotional-card" 
          style={{ padding: '1.35rem', borderTop: '4px solid #2D6A4F' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.82rem', color: '#666', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Present (Latest Session)
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#2D6A4F', marginTop: '0.35rem' }}>
                {latestPresent}
              </div>
            </div>
            <div style={{ background: '#D8F3DC', padding: '10px', borderRadius: '10px', color: '#1B4332' }}>
              <UserCheck size={24} />
            </div>
          </div>
          <div style={{ marginTop: '0.75rem', fontSize: '0.78rem', color: '#666' }}>
            {latestSession ? `On ${latestSession.dayOfWeek}, ${latestSession.date}` : 'No sessions yet'}
          </div>
        </div>

        {/* Metric 4: Absent in Latest Session */}
        <div 
          className="devotional-card" 
          style={{ padding: '1.35rem', borderTop: '4px solid #D9534F' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.82rem', color: '#666', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Absent (Latest Session)
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#C0392B', marginTop: '0.35rem' }}>
                {latestAbsent}
              </div>
            </div>
            <div style={{ background: '#FADBD8', padding: '10px', borderRadius: '10px', color: '#C0392B' }}>
              <UserX size={24} />
            </div>
          </div>
          <div style={{ marginTop: '0.75rem', fontSize: '0.78rem', color: '#666' }}>
            {latestSession ? `${latestPresent + latestAbsent} total registered` : 'No sessions recorded'}
          </div>
        </div>

        {/* Metric 5: Overall Attendance Percentage */}
        <div 
          className="devotional-card" 
          style={{ padding: '1.35rem', borderTop: '4px solid #FFD700', background: '#FFFDF0' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.82rem', color: '#7A5700', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Overall Attendance
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#996515', marginTop: '0.35rem' }}>
                {overallPercentage}%
              </div>
            </div>
            <div style={{ background: '#FFF9DB', padding: '10px', borderRadius: '10px', color: '#D4AF37' }}>
              <Percent size={24} />
            </div>
          </div>
          <div style={{ marginTop: '0.75rem', fontSize: '0.78rem', color: '#7A5700', fontWeight: 600 }}>
            Calculated across all saved records
          </div>
        </div>
      </div>

      {/* Quick Actions Panel */}
      <div 
        className="devotional-card-cream" 
        style={{ padding: '1.25rem 1.5rem', border: '1.5px solid rgba(255, 215, 0, 0.45)' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
          <Sparkles size={18} color="#FF9933" />
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem', color: '#1B4332', fontWeight: 700 }}>
            Quick Actions
          </h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
          <button 
            onClick={onAddStudent}
            style={{
              background: '#FFF',
              border: '1px solid #D4AF37',
              borderRadius: '8px',
              padding: '0.85rem 1rem',
              textAlign: 'left',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              transition: 'all 0.15s ease'
            }}
            onMouseOver={(e) => e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 215, 0, 0.25)'}
            onMouseOut={(e) => e.currentTarget.style.boxShadow = 'none'}
          >
            <div style={{ background: '#FFF9DB', padding: '8px', borderRadius: '6px', color: '#8B4513' }}>
              <PlusCircle size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1B4332' }}>Add Student</div>
              <div style={{ fontSize: '0.75rem', color: '#666' }}>New registration</div>
            </div>
          </button>

          <button 
            onClick={() => onNavigate('take-attendance')}
            style={{
              background: '#FFF',
              border: '1px solid #FF9933',
              borderRadius: '8px',
              padding: '0.85rem 1rem',
              textAlign: 'left',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              transition: 'all 0.15s ease'
            }}
            onMouseOver={(e) => e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 153, 51, 0.25)'}
            onMouseOut={(e) => e.currentTarget.style.boxShadow = 'none'}
          >
            <div style={{ background: '#FFF0E0', padding: '8px', borderRadius: '6px', color: '#D35400' }}>
              <ClipboardCheck size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1B4332' }}>Take Attendance</div>
              <div style={{ fontSize: '0.75rem', color: '#666' }}>Sat / Sun Register</div>
            </div>
          </button>

          <button 
            onClick={() => onNavigate('students')}
            style={{
              background: '#FFF',
              border: '1px solid #D0C6B0',
              borderRadius: '8px',
              padding: '0.85rem 1rem',
              textAlign: 'left',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              transition: 'all 0.15s ease'
            }}
            onMouseOver={(e) => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)'}
            onMouseOut={(e) => e.currentTarget.style.boxShadow = 'none'}
          >
            <div style={{ background: '#E8F5E9', padding: '8px', borderRadius: '6px', color: '#1B4332' }}>
              <Users size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1B4332' }}>View Students</div>
              <div style={{ fontSize: '0.75rem', color: '#666' }}>Filter &amp; manage</div>
            </div>
          </button>

          <button 
            onClick={() => onNavigate('sessions')}
            style={{
              background: '#FFF',
              border: '1px solid #D0C6B0',
              borderRadius: '8px',
              padding: '0.85rem 1rem',
              textAlign: 'left',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              transition: 'all 0.15s ease'
            }}
            onMouseOver={(e) => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)'}
            onMouseOut={(e) => e.currentTarget.style.boxShadow = 'none'}
          >
            <div style={{ background: '#FFF3E0', padding: '8px', borderRadius: '6px', color: '#8B4513' }}>
              <Clock size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1B4332' }}>Attendance History</div>
              <div style={{ fontSize: '0.75rem', color: '#666' }}>Past session logs</div>
            </div>
          </button>

          <button 
            onClick={() => onNavigate('reports')}
            style={{
              background: '#FFF',
              border: '1px solid #D0C6B0',
              borderRadius: '8px',
              padding: '0.85rem 1rem',
              textAlign: 'left',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              transition: 'all 0.15s ease'
            }}
            onMouseOver={(e) => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)'}
            onMouseOut={(e) => e.currentTarget.style.boxShadow = 'none'}
          >
            <div style={{ background: '#E3F2FD', padding: '8px', borderRadius: '6px', color: '#1565C0' }}>
              <FileText size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1B4332' }}>Generate Reports</div>
              <div style={{ fontSize: '0.75rem', color: '#666' }}>Export CSV &amp; print</div>
            </div>
          </button>
        </div>
      </div>

      {/* Two Column Layout: Recently Added Students & Recent Attendance Activity */}
      <div 
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '1.5rem'
        }}
      >
        {/* Recently Added Students */}
        <div className="devotional-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={19} color="#1B4332" />
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.15rem', color: '#1B4332', fontWeight: 700 }}>
                Recently Added Students
              </h3>
            </div>
            <button 
              onClick={() => onNavigate('students')} 
              className="btn-ghost" 
              style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
            >
              <span>View All</span>
              <ArrowRight size={14} />
            </button>
          </div>

          {recentlyAdded && recentlyAdded.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {recentlyAdded.map(student => (
                <div 
                  key={student.id}
                  onClick={() => onViewStudentProfile(student.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 0.95rem',
                    background: '#FAF8F3',
                    borderRadius: '8px',
                    border: '1px solid #EFE4CE',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = '#F5EEDC'}
                  onMouseOut={(e) => e.currentTarget.style.background = '#FAF8F3'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div 
                      style={{
                        background: '#1B4332',
                        color: '#FFD700',
                        width: '34px',
                        height: '34px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '0.85rem'
                      }}
                    >
                      {student.name.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#303030' }}>
                        {student.name}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#666', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>{student.grade}</span>
                        <span>&bull;</span>
                        <span>{student.school}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span 
                      style={{ 
                        fontFamily: 'monospace', 
                        fontSize: '0.78rem', 
                        fontWeight: 700,
                        color: '#8B4513',
                        background: '#FFF9DB',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        border: '1px solid #FFE066'
                      }}
                    >
                      {student.id}
                    </span>
                    <div style={{ fontSize: '0.72rem', color: '#888', marginTop: '2px' }}>
                      Reg: {student.registrationDate}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: '#888', fontSize: '0.9rem', textAlign: 'center', padding: '1.5rem 0' }}>
              No students registered yet.
            </p>
          )}
        </div>

        {/* Recent Attendance Activity */}
        <div className="devotional-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={19} color="#8B4513" />
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.15rem', color: '#1B4332', fontWeight: 700 }}>
                Recent Activity &amp; Logs
              </h3>
            </div>
            <span style={{ fontSize: '0.78rem', color: '#888' }}>Audit Trail</span>
          </div>

          {recentActivities && recentActivities.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {recentActivities.map(act => (
                <div 
                  key={act.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    padding: '0.65rem 0.85rem',
                    background: '#FFFFFF',
                    borderRadius: '8px',
                    border: '1px solid #EAE6DB'
                  }}
                >
                  <div 
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: act.type === 'ATTENDANCE_RECORDED' ? '#2D6A4F' : '#FF9933',
                      marginTop: '6px',
                      flexShrink: 0
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.86rem', color: '#303030', fontWeight: 500, lineHeight: 1.35 }}>
                      {act.description}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#888', marginTop: '3px' }}>
                      {new Date(act.timestamp).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })} &bull; Admin: {act.admin}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: '#888', fontSize: '0.9rem', textAlign: 'center', padding: '1.5rem 0' }}>
              No recent activity recorded.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
