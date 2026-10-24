import React, { useState, useMemo, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  XCircle, 
  Clock,
  MapPin,
  X,
  ClipboardCheck,
  CalendarCheck,
  Trash2,
  AlertCircle
} from 'lucide-react';
import { 
  getCurrentWeeklyPlanLocal, 
  getAllWeeklyPlansLocal, 
  deleteSession,
  formatDateDMY 
} from '../../db/db';

export const SessionCalendar = ({ sessions = [], onSelectDate, onRefreshData }) => {
  // Navigation state for month & year
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedSessionModal, setSelectedSessionModal] = useState(null);
  const [weeklyPlan, setWeeklyPlan] = useState(null);
  const [allPlans, setAllPlans] = useState([]);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const [curr, all] = await Promise.all([
          getCurrentWeeklyPlanLocal().catch(() => null),
          getAllWeeklyPlansLocal().catch(() => [])
        ]);
        if (curr) setWeeklyPlan(curr);
        if (Array.isArray(all) && all.length > 0) {
          setAllPlans(all);
        } else if (curr) {
          setAllPlans([curr]);
        }
      } catch (err) {
        console.warn('SessionCalendar fetchPlans notice:', err);
      }
    };
    fetchPlans();

    const interval = setInterval(fetchPlans, 10000);

    const onPlanUpdate = (e) => {
      if (e?.detail) {
        setWeeklyPlan(e.detail);
        setAllPlans(prev => {
          const filtered = prev.filter(p => p.weekKey !== e.detail.weekKey);
          return [e.detail, ...filtered];
        });
      }
    };
    window.addEventListener('krishna_plan_updated', onPlanUpdate);
    return () => {
      clearInterval(interval);
      window.removeEventListener('krishna_plan_updated', onPlanUpdate);
    };
  }, []);

  const isClassTimeExpired = (cellDateStr, timeStr) => {
    if (!cellDateStr) return false;
    try {
      const [y, m, d] = cellDateStr.split('-').map(Number);
      let endHour = 19;
      let endMin = 0;
      if (timeStr) {
        const parts = timeStr.split(/[–\-]/);
        const targetPart = (parts.length > 1 ? parts[1] : parts[0]).trim();
        const match = targetPart.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
        if (match) {
          let h = parseInt(match[1], 10);
          const mins = parseInt(match[2], 10);
          const meridiem = (match[3] || '').toUpperCase();
          if (meridiem === 'PM' && h < 12) h += 12;
          if (meridiem === 'AM' && h === 12) h = 0;
          endHour = h;
          endMin = mins;
        }
      }
      const endDateTime = new Date(y, m - 1, d, endHour, endMin, 0, 0);
      return Date.now() >= endDateTime.getTime();
    } catch (e) {
      return false;
    }
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  // Month navigation
  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Map sessions by date string YYYY-MM-DD
  const sessionsMap = useMemo(() => {
    const map = new Map();
    (sessions || []).forEach(s => {
      const d = s.date || s.sessionDate;
      if (d) map.set(d, s);
    });
    return map;
  }, [sessions]);

  // Map weekly confirmation plans by Saturday, Sunday, and scheduledDate
  const plansByDate = useMemo(() => {
    const map = new Map();
    (allPlans || []).forEach(p => {
      if (p.saturdayDate) map.set(p.saturdayDate, p);
      if (p.sundayDate) map.set(p.sundayDate, p);
      if (p.scheduledDate) map.set(p.scheduledDate, p);
    });
    if (weeklyPlan) {
      if (weeklyPlan.saturdayDate && !map.has(weeklyPlan.saturdayDate)) map.set(weeklyPlan.saturdayDate, weeklyPlan);
      if (weeklyPlan.sundayDate && !map.has(weeklyPlan.sundayDate)) map.set(weeklyPlan.sundayDate, weeklyPlan);
      if (weeklyPlan.scheduledDate && !map.has(weeklyPlan.scheduledDate)) map.set(weeklyPlan.scheduledDate, weeklyPlan);
    }
    return map;
  }, [allPlans, weeklyPlan]);

  // Calendar cells computation
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const days = [];

    // Prev month padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const m = month === 0 ? 11 : month - 1;
      const y = month === 0 ? year - 1 : year;
      const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        dayNumber: d,
        dateString: dateStr,
        isCurrentMonth: false,
        isWeekend: (new Date(y, m, d).getDay() === 0 || new Date(y, m, d).getDay() === 6)
      });
    }

    // Current month days
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayOfWeek = new Date(year, month, d).getDay();
      days.push({
        dayNumber: d,
        dateString: dateStr,
        isCurrentMonth: true,
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6
      });
    }

    // Next month padding to complete grid (multiples of 7)
    const remaining = (7 - (days.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const m = month === 11 ? 0 : month + 1;
      const y = month === 11 ? year + 1 : year;
      const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        dayNumber: d,
        dateString: dateStr,
        isCurrentMonth: false,
        isWeekend: (new Date(y, m, d).getDay() === 0 || new Date(y, m, d).getDay() === 6)
      });
    }

    return days;
  }, [year, month]);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const todayStr = new Date().toISOString().split('T')[0];

  const handleCellClick = (cell, session) => {
    const planForDate = plansByDate.get(cell.dateString);
    setSelectedSessionModal({
      cell,
      session,
      plan: planForDate,
      isPlannedFromWeekly: !session && planForDate?.status === 'scheduled' && planForDate?.scheduledDate === cell.dateString
    });
  };

  const handleGoToAttendance = (dateStr) => {
    setSelectedSessionModal(null);
    if (onSelectDate) onSelectDate(dateStr);
  };

  const handleDeleteSession = async (session) => {
    if (!session) return;
    const sDate = session.date || session.sessionDate;
    if (!window.confirm(`Are you sure you want to permanently delete the class session on ${sDate}? This will remove it from the calendar.`)) {
      return;
    }
    try {
      const id = session.id || session._id || sDate;
      await deleteSession(id);
      setSelectedSessionModal(null);
      if (onRefreshData) onRefreshData();
    } catch (err) {
      alert(`Failed to delete session: ${err.message}`);
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Top Banner & Month Selector */}
      <div 
        className="devotional-card"
        style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(255, 248, 220, 0.95) 100%)',
          padding: '1.25rem 1.75rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          borderLeft: '5px solid #2D6A4F'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CalendarIcon size={22} color="#1B4332" />
            <h2 className="heading-gold" style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1B4332' }}>
              Weekend Class Session Calendar
            </h2>
          </div>
          <p style={{ color: '#666', fontSize: '0.88rem', marginTop: '2px' }}>
            Bhagavad Gita sessions conducted every Saturday &amp; Sunday. Click on any date to inspect details or record attendance.
          </p>
        </div>

        {/* Month Navigation Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button 
            onClick={prevMonth}
            className="btn-ghost"
            style={{ padding: '0.45rem 0.75rem' }}
            title="Previous Month"
          >
            <ChevronLeft size={18} />
          </button>

          <span 
            style={{ 
              fontFamily: 'var(--font-heading)', 
              fontWeight: 700, 
              fontSize: '1.15rem', 
              color: '#1B4332',
              minWidth: '170px',
              textAlign: 'center'
            }}
          >
            {monthNames[month]} {year}
          </span>

          <button 
            onClick={nextMonth}
            className="btn-ghost"
            style={{ padding: '0.45rem 0.75rem' }}
            title="Next Month"
          >
            <ChevronRight size={18} />
          </button>

          <button 
            onClick={goToToday}
            className="btn-outline-gold"
            style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem' }}
          >
            Today
          </button>
        </div>
      </div>

      {/* Calendar Grid Card */}
      <div className="devotional-card" style={{ padding: '1rem', maxWidth: '100%', overflow: 'hidden' }}>
        
        {/* Mobile Swipe Cue */}
        <div 
          className="mobile-swipe-indicator" 
          style={{ 
            display: 'none',
            alignItems: 'center', 
            justifyContent: 'space-between', 
            background: '#FEF3C7', 
            border: '1px solid #FCD34D',
            padding: '5px 10px', 
            borderRadius: '6px', 
            marginBottom: '0.65rem',
            fontSize: '0.72rem',
            color: '#92400E',
            fontWeight: 600
          }}
        >
          <span>Sunday – Saturday Schedule</span>
          <span>↔ Swipe to view all 7 days</span>
        </div>

        {/* Scrollable Grid Container */}
        <div className="calendar-scroll-wrapper">
          <div className="calendar-grid-min">
            {/* Days of Week Header */}
            <div 
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: '8px',
                marginBottom: '8px',
                textAlign: 'center',
                fontWeight: 700,
                fontSize: '0.88rem'
              }}
            >
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, index) => {
            const isWeekendCol = index === 0 || index === 6;
            return (
              <div 
                key={d} 
                style={{
                  padding: '0.65rem 0.25rem',
                  borderRadius: '6px',
                  background: isWeekendCol ? '#FFF0E0' : '#FAF6EE',
                  color: isWeekendCol ? '#8B4513' : '#666',
                  border: isWeekendCol ? '1px solid #FFCC99' : '1px solid #EFE4CE'
                }}
              >
                {d} {isWeekendCol ? '★' : ''}
              </div>
            );
          })}
        </div>

        {/* Days Cells Grid */}
        <div 
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: '8px'
          }}
        >
          {calendarDays.map((cell) => {
            let session = sessionsMap.get(cell.dateString);
            const planForDate = plansByDate.get(cell.dateString);
            const isToday = cell.dateString === todayStr;

            const isConducted = session && (session.status === 'conducted' || session.sessionStatus === 'conducted');

            const isPlanScheduled = planForDate?.status === 'scheduled';
            const isThisDayScheduled = isPlanScheduled && planForDate?.scheduledDate === cell.dateString;
            const isOtherWeekendDayScheduled = isPlanScheduled && planForDate?.scheduledDate && planForDate.scheduledDate !== cell.dateString && cell.isWeekend;

            const isPlanNoClass = planForDate && (planForDate.status === 'no_class' || planForDate.status === 'no-class');
            const isPlanCancelled = (session && (session.status === 'cancelled' || session.sessionStatus === 'cancelled')) || planForDate?.status === 'cancelled';
            const isPlanUndecided = planForDate?.status === 'undecided' && cell.isWeekend;

            const classTimeStr = session?.scheduledTime || planForDate?.scheduledTime || weeklyPlan?.scheduledTime || '06:00 PM – 08:00 PM';
            const isTimeExpired = isClassTimeExpired(cell.dateString, classTimeStr);

            const isScheduled = ((session && (session.status === 'scheduled' || session.sessionStatus === 'scheduled')) || isThisDayScheduled) && !isTimeExpired;
            const isExpiredUnconducted = ((session && (session.status === 'scheduled' || session.sessionStatus === 'scheduled')) || isThisDayScheduled) && isTimeExpired && !isConducted;

            const cellBorder = isToday 
              ? '2px solid #D97706' 
              : isConducted 
                ? '1px solid #2D6A4F' 
                : isScheduled
                  ? '1px solid #16A34A'
                  : isExpiredUnconducted
                    ? '1px solid #FCD34D'
                    : isPlanCancelled
                      ? '1px solid #FCA5A5'
                      : isPlanNoClass
                        ? '1px solid #FDBA74'
                        : isPlanUndecided
                          ? '1px solid #CBD5E1'
                          : cell.isWeekend 
                            ? '1px solid #F0E0D0' 
                            : '1px solid #EFEAE0';

            const cellBg = !cell.isCurrentMonth
              ? '#F9F8F5'
              : isConducted 
                ? '#FAFDF8' 
                : isScheduled
                  ? '#F0FDF4'
                  : isExpiredUnconducted
                    ? '#FFFBEB'
                    : isPlanCancelled
                      ? '#FFF5F5'
                      : isPlanNoClass
                        ? '#FFF7ED'
                        : isPlanUndecided
                          ? '#F8FAFC'
                          : (cell.isWeekend ? '#FFFDF8' : '#FFFFFF');

            return (
              <div
                key={cell.dateString}
                onClick={() => handleCellClick(cell, session)}
                style={{
                  minHeight: '110px',
                  padding: '8px',
                  borderRadius: '8px',
                  border: cellBorder,
                  background: cellBg,
                  opacity: cell.isCurrentMonth ? 1 : 0.45,
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'all 0.15s ease',
                  position: 'relative'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 14px rgba(0, 0, 0, 0.08)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {/* Day number & weekend indicator */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span 
                    style={{
                      fontSize: '0.88rem',
                      fontWeight: isToday ? 800 : (cell.isWeekend ? 700 : 500),
                      color: isToday ? '#B27B00' : (cell.isWeekend ? '#8B4513' : '#444'),
                      width: isToday ? '24px' : 'auto',
                      height: isToday ? '24px' : 'auto',
                      borderRadius: isToday ? '50%' : '0',
                      background: isToday ? '#FFF9DB' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: isToday ? '1px solid #FFE066' : 'none'
                    }}
                  >
                    {cell.dayNumber}
                  </span>

                  {cell.isWeekend && cell.isCurrentMonth && (
                    <span style={{ fontSize: '0.65rem', color: '#D35400', fontWeight: 700 }}>
                      Weekend
                    </span>
                  )}
                </div>

                {/* Session & Weekly Plan Data Rendering */}
                {isConducted && (
                  <div style={{ marginTop: '4px' }}>
                    <div 
                      style={{
                        background: '#E8F5E9',
                        border: '1px solid #A5D6A7',
                        borderRadius: '6px',
                        padding: '4px 6px',
                        fontSize: '0.72rem'
                      }}
                    >
                      <div style={{ fontWeight: 700, color: '#1B4332', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <CheckCircle2 size={11} color="#2D6A4F" />
                        <span>Conducted</span>
                      </div>
                      <div style={{ color: '#333', marginTop: '2px', display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#2D6A4F', fontWeight: 600 }}>P: {session.presentCount || 0}</span>
                        <span style={{ color: '#C0392B', fontWeight: 600 }}>A: {session.absentCount || 0}</span>
                      </div>
                    </div>
                  </div>
                )}

                {isScheduled && !isConducted && (
                  <div style={{ marginTop: '4px' }}>
                    <div 
                      style={{
                        background: '#DCFCE7',
                        border: '1px solid #86EFAC',
                        borderRadius: '6px',
                        padding: '4px 6px',
                        fontSize: '0.72rem'
                      }}
                    >
                      <div style={{ fontWeight: 800, color: '#14532D', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <CalendarCheck size={11} color="#16A34A" />
                        <span>Class Planned</span>
                      </div>
                      <div style={{ color: '#15803D', fontSize: '0.68rem', marginTop: '1px', fontWeight: 600 }}>
                        {classTimeStr}
                      </div>
                      {(session?.topic || planForDate?.topic) && (
                        <div style={{ color: '#166534', fontSize: '0.66rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {session?.topic || planForDate?.topic}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {isExpiredUnconducted && (
                  <div style={{ marginTop: '4px' }}>
                    <div 
                      style={{
                        background: '#FEF3C7',
                        border: '1px solid #FCD34D',
                        borderRadius: '6px',
                        padding: '4px 6px',
                        fontSize: '0.72rem'
                      }}
                    >
                      <div style={{ fontWeight: 800, color: '#92400E', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <Clock size={11} color="#D97706" />
                        <span>No Class / Time Passed</span>
                      </div>
                      <div style={{ color: '#B45309', fontSize: '0.66rem', marginTop: '1px', fontWeight: 600 }}>
                        Time elapsed without admin update
                      </div>
                    </div>
                  </div>
                )}

                {isPlanCancelled && !isConducted && !isScheduled && !isExpiredUnconducted && (
                  <div style={{ marginTop: '4px' }}>
                    <div 
                      style={{
                        background: '#FFEBEE',
                        border: '1px solid #FFCDD2',
                        borderRadius: '6px',
                        padding: '4px 6px',
                        fontSize: '0.72rem',
                        color: '#C62828',
                        fontWeight: 600
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <XCircle size={11} color="#C62828" />
                        <span>Cancelled</span>
                      </div>
                    </div>
                  </div>
                )}

                {isPlanNoClass && !isConducted && !isScheduled && !isExpiredUnconducted && !isPlanCancelled && (
                  <div style={{ marginTop: '4px' }}>
                    <div 
                      style={{
                        background: '#FFF7ED',
                        border: '1px solid #FFEDD5',
                        borderRadius: '6px',
                        padding: '4px 6px',
                        fontSize: '0.72rem'
                      }}
                    >
                      <div style={{ fontWeight: 800, color: '#C2410C', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <XCircle size={11} color="#EA580C" />
                        <span>No Class</span>
                      </div>
                      <div style={{ color: '#9A3412', fontSize: '0.64rem', marginTop: '1px', lineHeight: 1.2 }}>
                        {planForDate.autoClosed ? 'Auto-closed deadline' : 'No class scheduled'}
                      </div>
                    </div>
                  </div>
                )}

                {isPlanUndecided && !isConducted && !isScheduled && !isExpiredUnconducted && !isPlanCancelled && !isPlanNoClass && (
                  <div style={{ marginTop: '4px' }}>
                    <div 
                      style={{
                        background: '#F8FAFC',
                        border: '1px solid #CBD5E1',
                        borderRadius: '6px',
                        padding: '4px 6px',
                        fontSize: '0.72rem'
                      }}
                    >
                      <div style={{ fontWeight: 800, color: '#475569', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <Clock size={11} color="#64748B" />
                        <span>Pending</span>
                      </div>
                      <div style={{ color: '#64748B', fontSize: '0.64rem', marginTop: '1px', lineHeight: 1.2 }}>
                        Awaiting decision
                      </div>
                    </div>
                  </div>
                )}

                {isOtherWeekendDayScheduled && !isConducted && !isScheduled && !isExpiredUnconducted && !isPlanCancelled && !isPlanNoClass && !isPlanUndecided && (
                  <div style={{ marginTop: '4px' }}>
                    <div 
                      style={{
                        background: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                        borderRadius: '6px',
                        padding: '3px 5px',
                        fontSize: '0.68rem',
                        color: '#64748B'
                      }}
                    >
                      <span>Class on {planForDate.selectedDay}</span>
                    </div>
                  </div>
                )}

                {!session && !isThisDayScheduled && !isOtherWeekendDayScheduled && !isPlanNoClass && !isPlanUndecided && !isPlanCancelled && cell.isWeekend && cell.isCurrentMonth && (
                  <div style={{ textAlign: 'center', padding: '6px 0', color: '#A08C70', fontSize: '0.72rem' }}>
                    <span style={{ borderBottom: '1px dashed #D4AF37' }}>+ Record Class</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
          </div>
        </div>
      </div>

      {/* Calendar Legend */}
      <div 
        className="devotional-card-cream" 
        style={{ 
          padding: '0.85rem 1.25rem', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          flexWrap: 'wrap', 
          gap: '12px',
          fontSize: '0.82rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '12px', height: '12px', background: '#E8F5E9', border: '1px solid #A5D6A7', borderRadius: '3px' }} />
            <span>Conducted Session (Present/Absent counts)</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '12px', height: '12px', background: '#DCFCE7', border: '1px solid #86EFAC', borderRadius: '3px' }} />
            <span>Confirmed Class Planned (Weekly Decision)</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '12px', height: '12px', background: '#FFF7ED', border: '1px solid #FFEDD5', borderRadius: '3px' }} />
            <span>No Class (Weekly Decision / Auto-Closed)</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '12px', height: '12px', background: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: '3px' }} />
            <span>Pending Confirmation</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '12px', height: '12px', background: '#FFEBEE', border: '1px solid #FFCDD2', borderRadius: '3px' }} />
            <span>Cancelled Session</span>
          </div>
        </div>

        <div style={{ color: '#666', fontStyle: 'italic' }}>
          Click any date cell to view details or record attendance
        </div>
      </div>

      {/* Weekly Confirmation History Section */}
      <div 
        className="devotional-card"
        style={{
          background: '#FFFFFF',
          borderRadius: '14px',
          padding: '1.5rem',
          border: '1px solid #E2E8F0',
          boxShadow: '0 4px 15px rgba(0, 0, 0, 0.04)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1B4332', margin: 0 }}>
              Weekly Confirmation History
            </h3>
            <p style={{ color: '#64748B', fontSize: '0.82rem', margin: '2px 0 0' }}>
              Historical weekly coordinator decisions, public notices, and class schedule statuses
            </p>
          </div>
          <span style={{ fontSize: '0.78rem', background: '#F1F5F9', color: '#475569', padding: '3px 8px', borderRadius: '6px', fontWeight: 600 }}>
            {allPlans.length} {allPlans.length === 1 ? 'Week' : 'Weeks'} Recorded
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="devotional-table" style={{ width: '100%', fontSize: '0.85rem' }}>
            <thead>
              <tr>
                <th>Week</th>
                <th>Weekend Dates</th>
                <th>Confirmed Status</th>
                <th>Scheduled Day &amp; Date</th>
                <th>Topic</th>
                <th>Public Notice</th>
              </tr>
            </thead>
            <tbody>
              {allPlans.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '1.5rem', color: '#94A3B8' }}>
                    No weekly confirmation records found.
                  </td>
                </tr>
              ) : (
                allPlans.map(p => (
                  <tr key={p._id || p.weekKey}>
                    <td style={{ fontWeight: 700, fontFamily: 'monospace', color: '#1B4332' }}>{p.weekKey}</td>
                    <td>Sat: {formatDateDMY(p.saturdayDate)}<br />Sun: {formatDateDMY(p.sundayDate)}</td>
                    <td>
                      {p.status === 'scheduled' && (
                        <span style={{ background: '#DCFCE7', color: '#15803D', padding: '3px 8px', borderRadius: '6px', fontWeight: 700, fontSize: '0.78rem' }}>
                          Scheduled
                        </span>
                      )}
                      {p.status === 'no_class' && (
                        <span style={{ background: '#FFEDD5', color: '#C2410C', padding: '3px 8px', borderRadius: '6px', fontWeight: 700, fontSize: '0.78rem' }}>
                          No Class
                        </span>
                      )}
                      {p.status === 'cancelled' && (
                        <span style={{ background: '#FEE2E2', color: '#DC2626', padding: '3px 8px', borderRadius: '6px', fontWeight: 700, fontSize: '0.78rem' }}>
                          Cancelled
                        </span>
                      )}
                      {p.status === 'undecided' && (
                        <span style={{ background: '#F1F5F9', color: '#64748B', padding: '3px 8px', borderRadius: '6px', fontWeight: 700, fontSize: '0.78rem' }}>
                          Pending
                        </span>
                      )}
                    </td>
                    <td>{p.selectedDay ? `${p.selectedDay} (${formatDateDMY(p.scheduledDate)})` : '—'}</td>
                    <td>{p.topic || '—'}</td>
                    <td style={{ maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={p.cancellationReason || p.publicAnnouncement || ''}>
                      {p.cancellationReason || p.publicAnnouncement || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Date Detail & Action Modal */}
      {selectedSessionModal && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
            backdropFilter: 'blur(3px)'
          }}
          onClick={() => setSelectedSessionModal(null)}
        >
          <div 
            className="devotional-card animate-fade-in"
            style={{
              background: '#FFFFFF',
              width: '100%',
              maxWidth: '460px',
              padding: '1.5rem',
              borderRadius: '14px',
              borderTop: '5px solid #2D6A4F',
              boxShadow: '0 12px 30px rgba(0, 0, 0, 0.2)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CalendarIcon size={20} color="#1B4332" />
                <h3 style={{ fontFamily: 'var(--font-heading)', color: '#1B4332', fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
                  {selectedSessionModal.cell.dateString}
                </h3>
              </div>
              <button 
                onClick={() => setSelectedSessionModal(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
              <div>
                <span style={{ color: '#64748B', fontSize: '0.8rem', display: 'block', fontWeight: 600 }}>STATUS</span>
                {selectedSessionModal.session?.status === 'conducted' ? (
                  <span style={{ background: '#DCFCE7', color: '#15803D', padding: '3px 10px', borderRadius: '12px', fontWeight: 700, fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <CheckCircle2 size={13} /> Conducted Class
                  </span>
                ) : (selectedSessionModal.session?.status === 'scheduled' || selectedSessionModal.isPlannedFromWeekly) ? (
                  <span style={{ background: '#DCFCE7', color: '#15803D', padding: '3px 10px', borderRadius: '12px', fontWeight: 700, fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <CalendarCheck size={13} /> Confirmed Class Planned ({selectedSessionModal.plan?.selectedDay || 'Weekend'})
                  </span>
                ) : (selectedSessionModal.plan?.status === 'no_class' || selectedSessionModal.plan?.status === 'no-class') ? (
                  <span style={{ background: '#FFEDD5', color: '#C2410C', padding: '3px 10px', borderRadius: '12px', fontWeight: 700, fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <XCircle size={13} /> No Class Scheduled (Weekly Decision)
                  </span>
                ) : selectedSessionModal.plan?.status === 'undecided' ? (
                  <span style={{ background: '#F1F5F9', color: '#475569', padding: '3px 10px', borderRadius: '12px', fontWeight: 700, fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={13} /> Pending Confirmation
                  </span>
                ) : (selectedSessionModal.session?.status === 'cancelled' || selectedSessionModal.plan?.status === 'cancelled') ? (
                  <span style={{ background: '#FEE2E2', color: '#DC2626', padding: '3px 10px', borderRadius: '12px', fontWeight: 700, fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <XCircle size={13} /> Class Cancelled
                  </span>
                ) : (
                  <span style={{ background: '#F1F5F9', color: '#475569', padding: '3px 10px', borderRadius: '12px', fontWeight: 700, fontSize: '0.82rem' }}>
                    {selectedSessionModal.cell.isWeekend ? 'Unrecorded Weekend' : 'Weekday'}
                  </span>
                )}
              </div>

              {/* Weekly Confirmation Box */}
              {selectedSessionModal.plan && (
                <div style={{ background: '#F8FAFC', borderRadius: '8px', padding: '10px 12px', border: '1px solid #E2E8F0', marginTop: '2px' }}>
                  <div style={{ fontSize: '0.76rem', fontWeight: 800, color: '#1B4332', marginBottom: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>WEEKLY CONFIRMATION DETAILS</span>
                    <span style={{ fontFamily: 'monospace', background: '#E2E8F0', padding: '1px 6px', borderRadius: '4px' }}>{selectedSessionModal.plan.weekKey}</span>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#475569', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div>
                      <span style={{ fontWeight: 600 }}>Decision Status: </span>
                      <strong style={{ 
                        color: selectedSessionModal.plan.status === 'scheduled' ? '#15803D' : (selectedSessionModal.plan.status === 'no_class' ? '#C2410C' : (selectedSessionModal.plan.status === 'cancelled' ? '#DC2626' : '#64748B')) 
                      }}>
                        {selectedSessionModal.plan.status === 'scheduled' ? 'Scheduled' : (selectedSessionModal.plan.status === 'no_class' ? 'No Class' : (selectedSessionModal.plan.status === 'cancelled' ? 'Cancelled' : 'Pending Confirmation'))}
                      </strong>
                    </div>
                    {selectedSessionModal.plan.selectedDay && (
                      <div>
                        <span style={{ fontWeight: 600 }}>Scheduled Class: </span>
                        <span>{selectedSessionModal.plan.selectedDay} ({formatDateDMY(selectedSessionModal.plan.scheduledDate)})</span>
                      </div>
                    )}
                    {selectedSessionModal.plan.topic && (
                      <div>
                        <span style={{ fontWeight: 600 }}>Topic: </span>
                        <span>{selectedSessionModal.plan.topic}</span>
                      </div>
                    )}
                    {(selectedSessionModal.plan.cancellationReason || selectedSessionModal.plan.publicAnnouncement) && (
                      <div>
                        <span style={{ fontWeight: 600 }}>Public Notice: </span>
                        <span style={{ color: '#1F2937' }}>{selectedSessionModal.plan.cancellationReason || selectedSessionModal.plan.publicAnnouncement}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {(selectedSessionModal.session?.title || selectedSessionModal.isPlannedFromWeekly) && (
                <div>
                  <span style={{ color: '#64748B', fontSize: '0.8rem', display: 'block', fontWeight: 600 }}>CLASS TITLE</span>
                  <div style={{ fontWeight: 700, color: '#1B4332' }}>
                    {selectedSessionModal.session?.title || `Bhagavad Gita Class — ${weeklyPlan?.selectedDay || 'Weekend'}`}
                  </div>
                </div>
              )}

              {(selectedSessionModal.session?.topic || (selectedSessionModal.isPlannedFromWeekly && weeklyPlan?.topic)) && (
                <div>
                  <span style={{ color: '#64748B', fontSize: '0.8rem', display: 'block', fontWeight: 600 }}>TOPIC / VERSES</span>
                  <div style={{ color: '#334155' }}>
                    {selectedSessionModal.session?.topic || weeklyPlan?.topic}
                  </div>
                </div>
              )}

              {selectedSessionModal.session?.conductedByName && selectedSessionModal.session.conductedByName !== 'Not recorded' && (
                <div>
                  <span style={{ color: '#64748B', fontSize: '0.8rem', display: 'block', fontWeight: 600 }}>CLASS CONDUCTOR / TEACHER</span>
                  <div style={{ fontWeight: 600, color: '#1B4332' }}>
                    {selectedSessionModal.session.conductedByName}
                  </div>
                </div>
              )}

              {selectedSessionModal.session?.status === 'conducted' && (
                <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
                  <div style={{ flex: 1, background: '#F0FDF4', padding: '8px 12px', borderRadius: '8px', border: '1px solid #BBF7D0' }}>
                    <span style={{ fontSize: '0.75rem', color: '#166534', display: 'block' }}>Present</span>
                    <strong style={{ fontSize: '1.2rem', color: '#15803D' }}>{selectedSessionModal.session.presentCount || 0}</strong>
                  </div>
                  <div style={{ flex: 1, background: '#FEF2F2', padding: '8px 12px', borderRadius: '8px', border: '1px solid #FECACA' }}>
                    <span style={{ fontSize: '0.75rem', color: '#991B1B', display: 'block' }}>Absent</span>
                    <strong style={{ fontSize: '1.2rem', color: '#DC2626' }}>{selectedSessionModal.session.absentCount || 0}</strong>
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', justifyContent: 'flex-end', paddingTop: '0.75rem', borderTop: '1px solid #F1F5F9' }}>
              {selectedSessionModal.session && (
                <button 
                  onClick={() => handleDeleteSession(selectedSessionModal.session)}
                  className="btn-ghost"
                  style={{ 
                    padding: '0.55rem 0.85rem', 
                    fontSize: '0.82rem', 
                    marginRight: 'auto',
                    color: '#DC2626',
                    border: '1px solid #FECACA',
                    background: '#FEF2F2',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    fontWeight: 700
                  }}
                  title="Permanently Delete Taken Class Session and its attendance records (Admin only)"
                >
                  <Trash2 size={15} />
                  <span>Delete Taken Class (Admin Only)</span>
                </button>
              )}
              <button 
                onClick={() => setSelectedSessionModal(null)}
                className="btn-ghost"
                style={{ padding: '0.6rem 1rem', fontSize: '0.88rem' }}
              >
                Close
              </button>
              <button 
                onClick={() => handleGoToAttendance(selectedSessionModal.cell.dateString)}
                className="btn-saffron"
                style={{ padding: '0.6rem 1.25rem', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <ClipboardCheck size={16} />
                <span>{selectedSessionModal.session?.status === 'conducted' ? 'Edit Register' : 'Mark Attendance'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
