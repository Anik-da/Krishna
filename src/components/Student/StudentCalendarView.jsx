import React, { useState, useMemo, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  BookOpen,
  GraduationCap,
  Sparkles,
  MapPin,
  CalendarCheck,
  AlertCircle,
  UserCheck,
  UserX,
  Star,
  Info
} from 'lucide-react';
import { 
  getAllSessions, 
  getCurrentWeeklyPlanLocal, 
  getAllWeeklyPlansLocal, 
  calculateStudentAttendanceStats,
  formatDateDMY 
} from '../../db/db';

export const StudentCalendarView = ({ student, attendanceData }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [sessions, setSessions] = useState([]);
  const [weeklyPlan, setWeeklyPlan] = useState(null);
  const [weeklyPlans, setWeeklyPlans] = useState([]);
  const [studentHistory, setStudentHistory] = useState([]);
  const [filterType, setFilterType] = useState('all'); // 'all' | 'classes' | 'attended'

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        const [sess, currPlan, allPlans] = await Promise.all([
          getAllSessions().catch(() => []),
          getCurrentWeeklyPlanLocal().catch(() => null),
          getAllWeeklyPlansLocal().catch(() => [])
        ]);

        if (isMounted) {
          setSessions(sess || []);
          if (currPlan) setWeeklyPlan(currPlan);
          
          let mergedPlans = Array.isArray(allPlans) ? [...allPlans] : [];
          if (currPlan && currPlan.weekKey) {
            const exists = mergedPlans.some(p => p.weekKey === currPlan.weekKey);
            if (!exists) mergedPlans.unshift(currPlan);
          }
          setWeeklyPlans(mergedPlans);
        }

        // Student attendance history
        if (attendanceData?.recentHistory && Array.isArray(attendanceData.recentHistory) && attendanceData.recentHistory.length > 0) {
          if (isMounted) setStudentHistory(attendanceData.recentHistory);
        } else if (student) {
          const stats = await calculateStudentAttendanceStats(student.id || student.studentId, student).catch(() => null);
          if (isMounted && stats?.recentHistory) {
            setStudentHistory(stats.recentHistory);
          }
        }
      } catch (err) {
        console.warn("StudentCalendar loadData notice:", err);
      }
    };

    loadData();

    // Listen for realtime plan confirmation updates from admin
    const onPlanUpdate = (e) => {
      if (e?.detail) {
        setWeeklyPlan(e.detail);
        setWeeklyPlans(prev => {
          const filtered = prev.filter(p => p.weekKey !== e.detail.weekKey);
          return [e.detail, ...filtered];
        });
      }
    };
    window.addEventListener('krishna_plan_updated', onPlanUpdate);

    // Refresh every 12 seconds to ensure sync with admin sessions
    const interval = setInterval(loadData, 12000);

    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener('krishna_plan_updated', onPlanUpdate);
    };
  }, [student, attendanceData]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const monthShort = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];
  const weekdaysShort = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

  // Helper: check if class end time has passed
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

  // Sessions map keyed by date YYYY-MM-DD
  const sessionsMap = useMemo(() => {
    const map = new Map();
    (sessions || []).forEach(s => {
      const d = s.date || s.sessionDate;
      if (d) map.set(d, s);
    });
    return map;
  }, [sessions]);

  // Plans map keyed by Saturday, Sunday, and scheduledDate
  const plansByDate = useMemo(() => {
    const map = new Map();
    (weeklyPlans || []).forEach(p => {
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
  }, [weeklyPlans, weeklyPlan]);

  // Student personal attendance map keyed by date YYYY-MM-DD
  const studentAttendanceMap = useMemo(() => {
    const map = new Map();
    (studentHistory || []).forEach(h => {
      const d = h.date || h.sessionDate;
      const status = (h.status || '').toLowerCase();
      if (d) {
        map.set(d, status);
        map.set(`SES-${d}`, status);
      }
      if (h.sessionId) map.set(h.sessionId, status);
    });
    return map;
  }, [studentHistory]);

  // Days grid calculation
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(year, month, 1).getDay();
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

    // Next month padding to complete 35 or 42 cells
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

  const selectedDateStr = useMemo(() => {
    const y = selectedDate.getFullYear();
    const m = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const d = String(selectedDate.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, [selectedDate]);

  // Comprehensive info for the selected date
  const selectedDayInfo = useMemo(() => {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayAbbr = ['Sun.', 'Mon.', 'Tue.', 'Wed.', 'Thu.', 'Fri.', 'Sat.'];
    const dayOfWeek = selectedDate.getDay();
    const session = sessionsMap.get(selectedDateStr);
    const plan = plansByDate.get(selectedDateStr);

    const isConducted = session && (session.status === 'conducted' || session.sessionStatus === 'conducted');
    const isPlanScheduled = plan?.status === 'scheduled';
    const isThisDayScheduled = isPlanScheduled && plan?.scheduledDate === selectedDateStr;
    const isOtherWeekendDay = isPlanScheduled && plan?.scheduledDate && plan.scheduledDate !== selectedDateStr && (dayOfWeek === 0 || dayOfWeek === 6);
    const isPlanNoClass = plan && (plan.status === 'no_class' || plan.status === 'no-class');
    const isPlanCancelled = (session && (session.status === 'cancelled' || session.sessionStatus === 'cancelled')) || plan?.status === 'cancelled';
    const isPlanUndecided = plan?.status === 'undecided' && (dayOfWeek === 0 || dayOfWeek === 6);

    const classTimeStr = session?.scheduledTime || plan?.scheduledTime || weeklyPlan?.scheduledTime || '06:00 PM – 08:00 PM';
    const isTimeExpired = isClassTimeExpired(selectedDateStr, classTimeStr);

    const isScheduled = ((session && (session.status === 'scheduled' || session.sessionStatus === 'scheduled')) || isThisDayScheduled) && !isTimeExpired;
    const isExpiredUnconducted = ((session && (session.status === 'scheduled' || session.sessionStatus === 'scheduled')) || isThisDayScheduled) && isTimeExpired && !isConducted;

    // Student personal attendance status on this date
    const studentStatus = studentAttendanceMap.get(selectedDateStr) || 
                          (session ? studentAttendanceMap.get(session.id || session.sessionId || `SES-${selectedDateStr}`) : null);

    // Day & week of year
    const start = new Date(selectedDate.getFullYear(), 0, 0);
    const diff = selectedDate - start;
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);
    const weekOfYear = Math.ceil(dayOfYear / 7);
    const isToday = new Date().toISOString().split('T')[0] === selectedDateStr;

    return {
      dayOfWeekName: dayNames[dayOfWeek],
      dayAbbr: dayAbbr[dayOfWeek],
      dayNumber: selectedDate.getDate(),
      monthName: monthNames[selectedDate.getMonth()],
      year: selectedDate.getFullYear(),
      dayOfYear,
      weekOfYear,
      isToday,
      session,
      plan,
      isConducted,
      isScheduled,
      isExpiredUnconducted,
      isPlanNoClass,
      isPlanCancelled,
      isPlanUndecided,
      isOtherWeekendDay,
      classTimeStr,
      studentStatus,
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6
    };
  }, [selectedDate, selectedDateStr, sessionsMap, plansByDate, studentAttendanceMap, weeklyPlan]);

  const handleSelectCell = (cell) => {
    const [y, m, d] = cell.dateString.split('-').map(Number);
    setSelectedDate(new Date(y, m - 1, d));
  };

  const handleMonthChange = (e) => {
    const newMonth = parseInt(e.target.value, 10);
    setCurrentDate(new Date(year, newMonth, 1));
  };

  const handleYearChange = (e) => {
    const newYear = parseInt(e.target.value, 10);
    setCurrentDate(new Date(newYear, month, 1));
  };

  const goToToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDate(now);
  };

  // Helper for cell state computation
  const getCellState = (cell) => {
    const session = sessionsMap.get(cell.dateString);
    const planForDate = plansByDate.get(cell.dateString);

    const isConducted = session && (session.status === 'conducted' || session.sessionStatus === 'conducted');
    const isPlanScheduled = planForDate?.status === 'scheduled';
    const isThisDayScheduled = isPlanScheduled && planForDate?.scheduledDate === cell.dateString;
    const isPlanNoClass = planForDate && (planForDate.status === 'no_class' || planForDate.status === 'no-class');
    const isPlanCancelled = (session && (session.status === 'cancelled' || session.sessionStatus === 'cancelled')) || planForDate?.status === 'cancelled';
    const isPlanUndecided = planForDate?.status === 'undecided' && cell.isWeekend;

    const classTimeStr = session?.scheduledTime || planForDate?.scheduledTime || weeklyPlan?.scheduledTime || '06:00 PM – 08:00 PM';
    const isTimeExpired = isClassTimeExpired(cell.dateString, classTimeStr);

    const isScheduled = ((session && (session.status === 'scheduled' || session.sessionStatus === 'scheduled')) || isThisDayScheduled) && !isTimeExpired;
    const isExpiredUnconducted = ((session && (session.status === 'scheduled' || session.sessionStatus === 'scheduled')) || isThisDayScheduled) && isTimeExpired && !isConducted;

    const studentStatus = studentAttendanceMap.get(cell.dateString) || 
                          (session ? studentAttendanceMap.get(session.id || session.sessionId || `SES-${cell.dateString}`) : null);

    return {
      session,
      planForDate,
      isConducted,
      isScheduled,
      isExpiredUnconducted,
      isPlanNoClass,
      isPlanCancelled,
      isPlanUndecided,
      classTimeStr,
      studentStatus
    };
  };

  return (
    <div className="student-calendar-container animate-fade-in" style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
      
      {/* =========================================================================
          MOBILE VIEW: Premium emerald & gold card layout with full class details
         ========================================================================= */}
      <div className="student-calendar-mobile-card" style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
        
        {/* Top Header Card (Left: Day Badge, Right: Month/Year & Subtitle) */}
        <div className="cal-mobile-top-header">
          <div className="cal-mobile-badge-box">
            <span className="cal-mobile-badge-day">{selectedDayInfo.dayAbbr}</span>
            <span className="cal-mobile-badge-num">{selectedDayInfo.dayNumber}</span>
          </div>

          <div className="cal-mobile-header-details">
            <h3 className="cal-mobile-month-year">
              {selectedDayInfo.monthName} {selectedDayInfo.year}
            </h3>
            <div className="cal-mobile-meta-line">
              <span>Day {selectedDayInfo.dayOfYear}, Week {selectedDayInfo.weekOfYear}</span>
              {selectedDayInfo.isToday && <span className="cal-mobile-today-chip">Today</span>}
            </div>
            <div className="cal-mobile-subtitle">
              {selectedDayInfo.isConducted ? (
                `Conducted: ${selectedDayInfo.session?.topic || selectedDayInfo.session?.title || 'Bhagavad Gita Class'}`
              ) : selectedDayInfo.isScheduled ? (
                `Scheduled: ${selectedDayInfo.classTimeStr} ${selectedDayInfo.plan?.topic ? '— ' + selectedDayInfo.plan.topic : ''}`
              ) : selectedDayInfo.isPlanNoClass ? (
                'Notice: No class scheduled for this weekend'
              ) : selectedDayInfo.isPlanCancelled ? (
                'Notice: Class session cancelled'
              ) : selectedDayInfo.isWeekend ? (
                'Weekend Session Day'
              ) : (
                'Self-study & Japa Chanting Day'
              )}
            </div>
          </div>
        </div>

        {/* Filter & Navigation Bar */}
        <div className="cal-mobile-controls">
          <select 
            value={month} 
            onChange={handleMonthChange}
            className="cal-mobile-select"
          >
            {monthShort.map((m, idx) => (
              <option key={m} value={idx}>{m}</option>
            ))}
          </select>

          <select 
            value={year} 
            onChange={handleYearChange}
            className="cal-mobile-select"
          >
            {[2024, 2025, 2026, 2027].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          <select 
            value={filterType} 
            onChange={(e) => setFilterType(e.target.value)}
            className="cal-mobile-select"
          >
            <option value="all">All Days</option>
            <option value="classes">Class Days Only</option>
            <option value="attended">Attended by Me</option>
          </select>

          <button 
            type="button" 
            onClick={goToToday}
            className="cal-mobile-today-btn"
          >
            Today
          </button>
        </div>

        {/* Weekday Labels Header */}
        <div className="cal-mobile-weekdays">
          {weekdaysShort.map((w, idx) => (
            <div key={w} className="cal-mobile-weekday-col" style={{ color: (idx === 0 || idx === 6) ? '#FFD700' : '#8BA899' }}>
              {w}
            </div>
          ))}
        </div>

        {/* Dates Grid */}
        <div className="cal-mobile-grid">
          {calendarDays.map((cell, idx) => {
            const isSelected = cell.dateString === selectedDateStr;
            const state = getCellState(cell);

            // Filtering check
            if (filterType === 'classes' && !state.isConducted && !state.isScheduled) {
              // Dim non-class days
            }

            return (
              <div 
                key={cell.dateString + idx}
                onClick={() => handleSelectCell(cell)}
                className={`cal-mobile-cell ${cell.isCurrentMonth ? 'in-month' : 'out-month'} ${isSelected ? 'selected' : ''}`}
                style={{
                  background: state.isConducted 
                    ? 'rgba(16, 185, 129, 0.16)' 
                    : state.isScheduled 
                      ? 'rgba(59, 130, 246, 0.16)' 
                      : (cell.isWeekend && cell.isCurrentMonth) 
                        ? 'rgba(255, 215, 0, 0.05)' 
                        : 'transparent',
                  border: isSelected 
                    ? '2px solid #FFD700' 
                    : state.isConducted 
                      ? '1px solid rgba(16, 185, 129, 0.45)' 
                      : state.isScheduled 
                        ? '1px solid rgba(59, 130, 246, 0.45)' 
                        : (cell.isWeekend && cell.isCurrentMonth)
                          ? '1px solid rgba(255, 215, 0, 0.15)'
                          : '1px solid rgba(255, 255, 255, 0.04)'
                }}
              >
                {/* Event Indicators on Date Cell */}
                {state.isConducted && (
                  <span 
                    title="Conducted Class"
                    style={{
                      position: 'absolute',
                      top: '2px',
                      right: '3px',
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: '#10B981',
                      boxShadow: '0 0 6px #10B981'
                    }} 
                  />
                )}

                {state.isScheduled && !state.isConducted && (
                  <span 
                    title="Scheduled Class"
                    style={{
                      position: 'absolute',
                      top: '2px',
                      right: '3px',
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: '#3B82F6',
                      boxShadow: '0 0 6px #3B82F6'
                    }} 
                  />
                )}

                {/* Student Attendance Marker (Present / Absent) */}
                {state.studentStatus === 'present' && (
                  <span 
                    title="You Attended (Present)"
                    style={{
                      position: 'absolute',
                      bottom: '2px',
                      left: '3px',
                      fontSize: '0.62rem',
                      fontWeight: 800,
                      color: '#10B981',
                      lineHeight: 1
                    }}
                  >
                    ✓
                  </span>
                )}
                {state.studentStatus === 'absent' && state.isConducted && (
                  <span 
                    title="You Were Marked Absent"
                    style={{
                      position: 'absolute',
                      bottom: '2px',
                      left: '3px',
                      fontSize: '0.62rem',
                      fontWeight: 800,
                      color: '#EF4444',
                      lineHeight: 1
                    }}
                  >
                    ✕
                  </span>
                )}

                <span className="cal-mobile-cell-num" style={{ color: isSelected ? '#FFD700' : (cell.isWeekend ? '#FDE68A' : '#FFFFFF') }}>
                  {cell.dayNumber}
                </span>
              </div>
            );
          })}
        </div>

        {/* Selected Day Full Inspection Details Card */}
        <div className="cal-mobile-day-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
            <span style={{ color: '#FFD700', fontWeight: 800, fontSize: '0.92rem' }}>
              {selectedDayInfo.dayOfWeekName}, {formatDateDMY(selectedDateStr)}
            </span>

            {/* Badges */}
            {selectedDayInfo.isConducted ? (
              <span className="cal-badge-conducted" style={{ background: '#064E3B', color: '#34D399', border: '1px solid #10B981' }}>
                <CheckCircle2 size={12} /> Conducted Class
              </span>
            ) : selectedDayInfo.isScheduled ? (
              <span className="cal-badge-planned" style={{ background: '#1E3A8A', color: '#93C5FD', border: '1px solid #3B82F6' }}>
                <CalendarCheck size={12} /> Scheduled Class
              </span>
            ) : selectedDayInfo.isPlanNoClass ? (
              <span style={{ background: '#7C2D12', color: '#FDBA74', fontSize: '0.72rem', fontWeight: 700, padding: '2px 7px', borderRadius: '6px', border: '1px solid #F97316' }}>
                No Class This Weekend
              </span>
            ) : selectedDayInfo.isPlanCancelled ? (
              <span style={{ background: '#881337', color: '#FDA4AF', fontSize: '0.72rem', fontWeight: 700, padding: '2px 7px', borderRadius: '6px', border: '1px solid #F43F5E' }}>
                Class Cancelled
              </span>
            ) : selectedDayInfo.isWeekend ? (
              <span className="cal-badge-weekend">Weekend Session Day</span>
            ) : (
              <span className="cal-badge-weekday">Regular Weekday</span>
            )}
          </div>

          {/* Conducted Class Details */}
          {selectedDayInfo.isConducted && (
            <div style={{ fontSize: '0.84rem', color: '#E2E8F0', marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <div>
                <strong style={{ color: '#FCD34D' }}>Topic:</strong>{' '}
                <span>{selectedDayInfo.session?.topic || selectedDayInfo.session?.title || 'Bhagavad Gita Verses & Chanting'}</span>
              </div>
              {selectedDayInfo.session?.conductedByName && (
                <div>
                  <strong style={{ color: '#FCD34D' }}>Conducted By (Teacher):</strong>{' '}
                  <span>{selectedDayInfo.session.conductedByName}</span>
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.78rem', color: '#94A3B8', marginTop: '2px' }}>
                <span>Class Attendance: <strong>{selectedDayInfo.session?.presentCount || 0} Attended</strong></span>
                <span>Absentees: <strong>{selectedDayInfo.session?.absentCount || 0}</strong></span>
              </div>

              {/* Student Verified Attendance Box */}
              <div 
                style={{
                  marginTop: '6px',
                  padding: '7px 10px',
                  borderRadius: '7px',
                  background: selectedDayInfo.studentStatus === 'present' 
                    ? 'rgba(16, 185, 129, 0.15)' 
                    : selectedDayInfo.studentStatus === 'absent' 
                      ? 'rgba(239, 68, 68, 0.15)' 
                      : 'rgba(255, 255, 255, 0.05)',
                  border: selectedDayInfo.studentStatus === 'present'
                    ? '1px solid #10B981'
                    : selectedDayInfo.studentStatus === 'absent'
                      ? '1px solid #EF4444'
                      : '1px solid rgba(255, 255, 255, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                {selectedDayInfo.studentStatus === 'present' ? (
                  <>
                    <CheckCircle2 size={16} color="#10B981" />
                    <div>
                      <div style={{ color: '#34D399', fontWeight: 800, fontSize: '0.82rem' }}>Your Attendance: Present (Verified)</div>
                      <div style={{ color: '#A7F3D0', fontSize: '0.72rem' }}>You attended and participated in this class. Hare Krishna!</div>
                    </div>
                  </>
                ) : selectedDayInfo.studentStatus === 'absent' ? (
                  <>
                    <XCircle size={16} color="#EF4444" />
                    <div>
                      <div style={{ color: '#F87171', fontWeight: 800, fontSize: '0.82rem' }}>Your Attendance: Marked Absent</div>
                      <div style={{ color: '#FECACA', fontSize: '0.72rem' }}>You missed this session. Please consult your teacher or revise chapter notes.</div>
                    </div>
                  </>
                ) : (
                  <>
                    <Info size={16} color="#94A3B8" />
                    <div>
                      <div style={{ color: '#E2E8F0', fontWeight: 700, fontSize: '0.8rem' }}>Attendance Status: Not Recorded</div>
                      <div style={{ color: '#94A3B8', fontSize: '0.72rem' }}>No individual mark was recorded for your student ID on this date.</div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Scheduled Class Details */}
          {!selectedDayInfo.isConducted && selectedDayInfo.isScheduled && (
            <div style={{ fontSize: '0.84rem', color: '#E2E8F0', marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <div>
                <strong style={{ color: '#60A5FA' }}>Class Timings:</strong>{' '}
                <span style={{ color: '#93C5FD', fontWeight: 700 }}>{selectedDayInfo.classTimeStr}</span>
              </div>
              {selectedDayInfo.plan?.topic && (
                <div>
                  <strong style={{ color: '#60A5FA' }}>Planned Topic:</strong>{' '}
                  <span>{selectedDayInfo.plan.topic}</span>
                </div>
              )}
              {selectedDayInfo.plan?.location && (
                <div>
                  <strong style={{ color: '#60A5FA' }}>Location:</strong>{' '}
                  <span>{selectedDayInfo.plan.location}</span>
                </div>
              )}
              {selectedDayInfo.plan?.publicAnnouncement && (
                <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.25)', padding: '6px 9px', borderRadius: '6px', marginTop: '4px', fontSize: '0.78rem', color: '#BFDBFE' }}>
                  <strong>Announcement:</strong> {selectedDayInfo.plan.publicAnnouncement}
                </div>
              )}
              <div style={{ marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px', color: '#FCD34D', fontSize: '0.78rem' }}>
                <Star size={13} color="#FCD34D" />
                <span>Upcoming weekend class. Please bring your Bhagavad Gita As It Is and Japa mala!</span>
              </div>
            </div>
          )}

          {/* No Class / Cancellation Notice */}
          {!selectedDayInfo.isConducted && !selectedDayInfo.isScheduled && (selectedDayInfo.isPlanNoClass || selectedDayInfo.isPlanCancelled) && (
            <div style={{ fontSize: '0.82rem', color: '#E2E8F0', marginTop: '6px' }}>
              <div style={{ color: '#FDBA74', fontWeight: 700, marginBottom: '3px' }}>
                {selectedDayInfo.isPlanCancelled ? 'Notice of Cancellation' : 'No Class Confirmation'}
              </div>
              <p style={{ margin: '0 0 4px 0', color: '#CBD5E1', fontSize: '0.78rem' }}>
                {selectedDayInfo.plan?.publicAnnouncement || 'There are no Bhagavad Gita classes scheduled for this weekend. Regular classes will resume next week.'}
              </p>
              {selectedDayInfo.plan?.cancellationReason && (
                <div style={{ color: '#94A3B8', fontSize: '0.74rem' }}>
                  <strong>Reason:</strong> {selectedDayInfo.plan.cancellationReason}
                </div>
              )}
            </div>
          )}

          {/* Regular Day or Non-Class Weekend */}
          {!selectedDayInfo.isConducted && !selectedDayInfo.isScheduled && !selectedDayInfo.isPlanNoClass && !selectedDayInfo.isPlanCancelled && (
            <div style={{ fontSize: '0.8rem', color: '#94A3B8', marginTop: '6px' }}>
              {selectedDayInfo.isWeekend ? (
                <span>Weekend study period. Regular weekend classes are scheduled on Saturdays or Sundays from 6:00 PM – 8:00 PM.</span>
              ) : (
                <span>Self-study day. Dedicate time daily to chant Hare Krishna Maha-Mantra and read at least one verse from Bhagavad Gita.</span>
              )}
            </div>
          )}

        </div>

      </div>

      {/* =========================================================================
          DESKTOP / LAPTOP VIEW: Full 7-column grid mirroring the admin calendar
         ========================================================================= */}
      <div className="student-calendar-desktop-card">
        
        {/* Top Desktop Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#1B4332', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              <CalendarIcon size={22} color="#1B4332" />
              <span>Weekend Class &amp; Spiritual Calendar</span>
            </h3>
            <p style={{ color: '#666', fontSize: '0.86rem', marginTop: '2px', margin: 0 }}>
              All conducted classes, weekly confirmation schedules, and your verified attendance record
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button 
              type="button"
              onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
              className="btn-ghost"
              style={{ padding: '0.45rem 0.75rem' }}
              title="Previous Month"
            >
              <ChevronLeft size={16} />
            </button>
            <span style={{ fontWeight: 800, color: '#1B4332', fontSize: '1rem', minWidth: '130px', textAlign: 'center' }}>
              {monthNames[month]} {year}
            </span>
            <button 
              type="button"
              onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
              className="btn-ghost"
              style={{ padding: '0.45rem 0.75rem' }}
              title="Next Month"
            >
              <ChevronRight size={16} />
            </button>
            <button 
              type="button"
              onClick={goToToday}
              className="btn-gold"
              style={{ padding: '0.45rem 0.9rem', fontSize: '0.82rem' }}
            >
              Today
            </button>
          </div>
        </div>

        {/* Days of Week Header */}
        <div className="cal-desktop-grid-header">
          {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day, idx) => (
            <div 
              key={day} 
              style={{ 
                fontWeight: 700, 
                color: (idx === 0 || idx === 6) ? '#8B4513' : '#1B4332', 
                padding: '0.5rem', 
                textAlign: 'center', 
                fontSize: '0.85rem',
                background: (idx === 0 || idx === 6) ? '#FFF0E0' : 'transparent',
                borderRadius: '6px'
              }}
            >
              {day} {(idx === 0 || idx === 6) ? '★' : ''}
            </div>
          ))}
        </div>

        {/* 7-Column Desktop Grid */}
        <div className="cal-desktop-grid">
          {calendarDays.map((cell, idx) => {
            const state = getCellState(cell);
            const isToday = new Date().toISOString().split('T')[0] === cell.dateString;
            const isSelected = cell.dateString === selectedDateStr;

            return (
              <div 
                key={cell.dateString + idx}
                onClick={() => handleSelectCell(cell)}
                className={`cal-desktop-cell ${cell.isCurrentMonth ? 'in-month' : 'out-month'} ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}`}
                style={{
                  minHeight: '110px',
                  background: state.isConducted 
                    ? '#FAFDF8' 
                    : state.isScheduled 
                      ? '#F0FDF4' 
                      : (cell.isWeekend && cell.isCurrentMonth) 
                        ? '#FFFDF8' 
                        : '#FFFFFF',
                  border: isSelected 
                    ? '2px solid #D97706' 
                    : state.isConducted 
                      ? '1px solid #2D6A4F' 
                      : state.isScheduled 
                        ? '1px solid #16A34A' 
                        : (cell.isWeekend && cell.isCurrentMonth)
                          ? '1px solid #FFCC99'
                          : '1px solid #EFEAE0'
                }}
              >
                {/* Header: Day number + weekend tag */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ 
                    fontWeight: isToday ? 800 : (cell.isWeekend ? 700 : 600), 
                    fontSize: '0.9rem', 
                    color: isToday ? '#B27B00' : (cell.isWeekend ? '#8B4513' : '#333') 
                  }}>
                    {cell.dayNumber}
                  </span>
                  {cell.isWeekend && cell.isCurrentMonth && (
                    <span style={{ fontSize: '0.65rem', color: '#D35400', fontWeight: 700 }}>Weekend</span>
                  )}
                </div>

                {/* Conducted Class Badge */}
                {state.isConducted && (
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
                      <div style={{ fontWeight: 800, color: '#1B4332', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <CheckCircle2 size={11} color="#2D6A4F" />
                        <span>Conducted Class</span>
                      </div>
                      <div style={{ color: '#2D6A4F', fontSize: '0.68rem', marginTop: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {state.session?.topic || state.session?.title || 'Bhagavad Gita'}
                      </div>
                      {state.session?.conductedByName && (
                        <div style={{ color: '#4B5563', fontSize: '0.66rem', marginTop: '1px' }}>
                          Tr: {state.session.conductedByName}
                        </div>
                      )}
                      {/* Student Attendance Pill */}
                      <div style={{ marginTop: '3px', paddingTop: '3px', borderTop: '1px dashed #C8E6C9' }}>
                        {state.studentStatus === 'present' ? (
                          <span style={{ color: '#15803D', fontWeight: 800, fontSize: '0.68rem', display: 'flex', alignItems: 'center', gap: '2px' }}>
                            <CheckCircle2 size={10} color="#16A34A" /> You: Present
                          </span>
                        ) : state.studentStatus === 'absent' ? (
                          <span style={{ color: '#B91C1C', fontWeight: 800, fontSize: '0.68rem', display: 'flex', alignItems: 'center', gap: '2px' }}>
                            <XCircle size={10} color="#DC2626" /> You: Absent
                          </span>
                        ) : (
                          <span style={{ color: '#6B7280', fontSize: '0.66rem' }}>
                            Not Logged
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Scheduled Class Badge */}
                {state.isScheduled && !state.isConducted && (
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
                      <div style={{ color: '#15803D', fontSize: '0.68rem', marginTop: '1px', fontWeight: 700 }}>
                        {state.classTimeStr}
                      </div>
                      {(state.session?.topic || state.planForDate?.topic) && (
                        <div style={{ color: '#166534', fontSize: '0.66rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {state.session?.topic || state.planForDate?.topic}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* No Class Badge */}
                {state.isPlanNoClass && !state.isConducted && !state.isScheduled && (
                  <div style={{ marginTop: '4px' }}>
                    <div 
                      style={{
                        background: '#FFF7ED',
                        border: '1px solid #FFEDD5',
                        borderRadius: '6px',
                        padding: '3px 5px',
                        fontSize: '0.68rem',
                        color: '#9A3412',
                        fontWeight: 600
                      }}
                    >
                      No Class
                    </div>
                  </div>
                )}

                {/* Cancelled Badge */}
                {state.isPlanCancelled && !state.isConducted && !state.isScheduled && (
                  <div style={{ marginTop: '4px' }}>
                    <div 
                      style={{
                        background: '#FFF1F2',
                        border: '1px solid #FFE4E6',
                        borderRadius: '6px',
                        padding: '3px 5px',
                        fontSize: '0.68rem',
                        color: '#9F1239',
                        fontWeight: 600
                      }}
                    >
                      Cancelled
                    </div>
                  </div>
                )}

              </div>
            );
          })}
        </div>

        {/* Selected Day Footer Card for Desktop */}
        <div 
          style={{
            marginTop: '1.25rem',
            background: 'linear-gradient(135deg, #FAFDF8 0%, #F5F9F3 100%)',
            border: '1px solid #A5D6A7',
            borderRadius: '10px',
            padding: '1rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontWeight: 800, color: '#1B4332', fontSize: '1rem' }}>
                {selectedDayInfo.dayOfWeekName}, {formatDateDMY(selectedDateStr)}
              </span>
              {selectedDayInfo.isToday && (
                <span style={{ background: '#FEF3C7', color: '#92400E', fontSize: '0.72rem', fontWeight: 800, padding: '2px 8px', borderRadius: '10px', border: '1px solid #FCD34D' }}>
                  Today
                </span>
              )}
            </div>
            <div style={{ fontSize: '0.85rem', color: '#374151' }}>
              {selectedDayInfo.isConducted ? (
                <span>
                  <strong>Conducted Class:</strong> {selectedDayInfo.session?.topic || selectedDayInfo.session?.title || 'Bhagavad Gita Verses'}
                  {selectedDayInfo.session?.conductedByName ? ` — Teacher: ${selectedDayInfo.session.conductedByName}` : ''}
                </span>
              ) : selectedDayInfo.isScheduled ? (
                <span>
                  <strong>Scheduled Weekend Class:</strong> {selectedDayInfo.classTimeStr}
                  {selectedDayInfo.plan?.topic ? ` — Topic: ${selectedDayInfo.plan.topic}` : ''}
                </span>
              ) : selectedDayInfo.isPlanNoClass ? (
                <span>There are no Bhagavad Gita classes scheduled for this weekend. Regular classes resume next week.</span>
              ) : selectedDayInfo.isWeekend ? (
                <span>Weekend session day. Open for self-study and chanting.</span>
              ) : (
                <span>Weekday self-study and japa chanting schedule.</span>
              )}
            </div>
          </div>

          <div>
            {selectedDayInfo.isConducted && (
              selectedDayInfo.studentStatus === 'present' ? (
                <div style={{ background: '#DCFCE7', color: '#15803D', border: '1px solid #86EFAC', padding: '6px 14px', borderRadius: '8px', fontWeight: 800, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle2 size={16} color="#16A34A" />
                  <span>Verified: Attended (Present)</span>
                </div>
              ) : selectedDayInfo.studentStatus === 'absent' ? (
                <div style={{ background: '#FEE2E2', color: '#B91C1C', border: '1px solid #FCA5A5', padding: '6px 14px', borderRadius: '8px', fontWeight: 800, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <XCircle size={16} color="#DC2626" />
                  <span>Marked Absent</span>
                </div>
              ) : (
                <div style={{ background: '#F3F4F6', color: '#4B5563', border: '1px solid #E5E7EB', padding: '6px 14px', borderRadius: '8px', fontWeight: 600, fontSize: '0.82rem' }}>
                  Attendance Not Logged
                </div>
              )
            )}
            {selectedDayInfo.isScheduled && !selectedDayInfo.isConducted && (
              <div style={{ background: '#E0F2FE', color: '#0369A1', border: '1px solid #BAE6FD', padding: '6px 14px', borderRadius: '8px', fontWeight: 800, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={16} color="#0284C7" />
                <span>Upcoming Class</span>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
