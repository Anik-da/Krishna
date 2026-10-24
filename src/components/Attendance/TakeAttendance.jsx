import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiSaveAttendance } from '../../api/apiClient';
import { 
  getDayOfWeek, 
  isWeekend, 
  getSessionByDate, 
  getAttendanceBySessionId,
  saveSessionAttendance,
  deleteSession
} from '../../db/db';
import { 
  ClipboardCheck, 
  Calendar, 
  UserCheck, 
  UserX, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Save, 
  Search, 
  Sparkles, 
  BookOpen, 
  Check, 
  X,
  RotateCcw,
  GraduationCap,
  ShieldCheck,
  User,
  Trash2
} from 'lucide-react';

export const TakeAttendance = ({ 
  students, 
  initialDate, 
  onAttendanceSaved, 
  onNavigateToSessions 
}) => {
  const { currentUser } = useAuth();

  // Get default date: today's date formatted as YYYY-MM-DD
  const getDefaultDate = () => {
    if (initialDate) return initialDate;
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const [sessionDate, setSessionDate] = useState(getDefaultDate());
  const [dayOfWeek, setDayOfWeek] = useState(getDayOfWeek(getDefaultDate()));
  const [sessionTitle, setSessionTitle] = useState('');
  const [sessionTopic, setSessionTopic] = useState('');
  
  // Who conducted today's class (Required)
  const [conductedByName, setConductedByName] = useState('');
  const [conductorError, setConductorError] = useState('');

  // Map of studentId -> 'present' | 'absent'
  const [attendanceMap, setAttendanceMap] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  
  // State for existing session detection & overwrite confirmation
  const [existingSession, setExistingSession] = useState(null);
  const [showOverwriteConfirm, setShowOverwriteConfirm] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Active students only
  const activeStudents = useMemo(() => {
    return students.filter(s => s.status !== 'archived');
  }, [students]);

  // Synchronize sessionDate whenever initialDate prop changes (e.g. from calendar or session history)
  useEffect(() => {
    if (initialDate && initialDate !== sessionDate) {
      setSessionDate(initialDate);
    }
  }, [initialDate]);

  // Load existing session data when date changes
  useEffect(() => {
    const day = getDayOfWeek(sessionDate);
    setDayOfWeek(day);
    setSaveSuccessMessage('');

    let isMounted = true;
    getSessionByDate(sessionDate).then(async (ses) => {
      if (!isMounted) return;
      if (ses) {
        setExistingSession(ses);
        setSessionTitle(ses.title || `Bhagavad Gita Class — ${day}`);
        setSessionTopic(ses.topic || '');
        setConductedByName(ses.conductedByName || '');
        setConductorError('');
        
        // Fetch saved attendance for this session
        const records = await getAttendanceBySessionId(ses.id);
        const map = {};
        records.forEach(r => {
          map[r.studentId] = r.status;
        });

        // For any active student registered on or before session date without record, default to present
        activeStudents.forEach(s => {
          if (!map[s.id]) {
            map[s.id] = 'present';
          }
        });
        setAttendanceMap(map);
      } else {
        setExistingSession(null);
        setSessionTitle(`Bhagavad Gita Weekend Class — ${day}`);
        setSessionTopic('');
        setConductedByName('');
        setConductorError('');
        
        // Default all active students to present for fast marking
        const defaultMap = {};
        activeStudents.forEach(s => {
          defaultMap[s.id] = 'present';
        });
        setAttendanceMap(defaultMap);
      }
    });

    return () => { isMounted = false; };
  }, [sessionDate, activeStudents]);

  // Bulk actions
  const handleMarkAllPresent = () => {
    const newMap = { ...attendanceMap };
    activeStudents.forEach(s => {
      newMap[s.id] = 'present';
    });
    setAttendanceMap(newMap);
  };

  const handleMarkAllAbsent = () => {
    const newMap = { ...attendanceMap };
    activeStudents.forEach(s => {
      newMap[s.id] = 'absent';
    });
    setAttendanceMap(newMap);
  };

  // Toggle single student
  const toggleAttendance = (studentId) => {
    setAttendanceMap(prev => ({
      ...prev,
      [studentId]: prev[studentId] === 'present' ? 'absent' : 'present'
    }));
  };

  // Stats calculation
  const totalEligibleCount = activeStudents.length;
  const presentCount = Object.values(attendanceMap).filter(st => st === 'present').length;
  const absentCount = totalEligibleCount - presentCount;
  const attendancePercentage = totalEligibleCount > 0 
    ? Math.round((presentCount / totalEligibleCount) * 100) 
    : 0;

  // Filtered students according to search
  const visibleStudents = useMemo(() => {
    if (!searchQuery.trim()) return activeStudents;
    const q = searchQuery.toLowerCase().trim();
    return activeStudents.filter(s => 
      s.name.toLowerCase().includes(q) ||
      s.id.toLowerCase().includes(q) ||
      s.school.toLowerCase().includes(q) ||
      s.grade.toLowerCase().includes(q)
    );
  }, [activeStudents, searchQuery]);

  // Handle Save
  const handleSaveClick = (e) => {
    e.preventDefault();
    if (!conductedByName || !conductedByName.trim()) {
      setConductorError("Who conducted today's class? Please enter or select the teacher/speaker's full name before finalizing attendance.");
      const el = document.getElementById('conductor-input');
      if (el) el.focus();
      return;
    }
    setConductorError('');

    if (existingSession) {
      setShowOverwriteConfirm(true);
    } else {
      executeSave();
    }
  };

  const executeSave = async () => {
    setShowOverwriteConfirm(false);
    setIsSaving(true);
    setSaveSuccessMessage('');

    try {
      const records = activeStudents.map(student => ({
        studentId: student.id,
        status: attendanceMap[student.id] || 'present'
      }));

      await saveSessionAttendance({
        date: sessionDate,
        title: sessionTitle || `Bhagavad Gita Class — ${dayOfWeek}`,
        topic: sessionTopic,
        status: 'conducted',
        records,
        conductedByName: conductedByName.trim(),
        adminUsername: currentUser?.username || 'ANIK',
        adminName: currentUser?.name || 'Anik (Administrator)'
      });

      apiSaveAttendance({
        sessionDate,
        title: sessionTitle || `Bhagavad Gita Class — ${dayOfWeek}`,
        topic: sessionTopic,
        records,
        conductedByName: conductedByName.trim()
      }).catch(() => {});

      setSaveSuccessMessage(`Attendance successfully saved for ${dayOfWeek}, ${sessionDate}! Conductor: ${conductedByName.trim()} (${presentCount} Present, ${absentCount} Absent)`);
      if (onAttendanceSaved) onAttendanceSaved();
    } catch (err) {
      alert(`Error saving attendance: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTakenClass = async () => {
    if (!existingSession) return;
    const confirmMsg = `Are you sure you want to permanently delete the taken class session for ${sessionDate}? This will remove all marked attendance for this day.`;
    if (!window.confirm(confirmMsg)) return;

    setIsSaving(true);
    try {
      const sId = existingSession.id || existingSession._id || sessionDate;
      await deleteSession(sId);
      setExistingSession(null);
      setSaveSuccessMessage(`Class session and attendance for ${sessionDate} have been permanently deleted.`);
      
      const resetMap = {};
      activeStudents.forEach(s => {
        resetMap[s.id] = 'absent';
      });
      setAttendanceMap(resetMap);
      
      if (onAttendanceSaved) onAttendanceSaved();
    } catch (err) {
      alert(`Failed to delete class session: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const isWeekendSelected = dayOfWeek === 'Saturday' || dayOfWeek === 'Sunday';

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Session Header Card */}
      <div 
        className="devotional-card"
        style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(255, 248, 220, 0.95) 100%)',
          padding: '1.5rem 1.75rem',
          borderLeft: '5px solid #FF9933'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ClipboardCheck size={24} color="#1B4332" />
              <h2 className="heading-gold" style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1B4332' }}>
                Saturday &amp; Sunday Attendance Register
              </h2>
            </div>
            <p style={{ color: '#666', fontSize: '0.9rem', marginTop: '4px' }}>
              Mark attendance for Bhagavad Gita students. Changes are saved to durable records.
            </p>
          </div>

          {/* Weekend Tag */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span 
              style={{
                background: isWeekendSelected ? '#D8F3DC' : '#FFF3E0',
                color: isWeekendSelected ? '#1B4332' : '#8B4513',
                border: isWeekendSelected ? '1px solid #95D5B2' : '1px solid #FFCC99',
                padding: '6px 14px',
                borderRadius: '20px',
                fontWeight: 700,
                fontSize: '0.88rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Calendar size={15} />
              <span>{dayOfWeek} {isWeekendSelected ? '✓ Official Class Day' : '(Weekday)'}</span>
            </span>
          </div>
        </div>

        {/* Existing Session Alert Banner */}
        {existingSession && (
          <div 
            style={{
              background: '#FFF8E1',
              border: '1.5px solid #FFD54F',
              borderRadius: '8px',
              padding: '0.85rem 1.25rem',
              marginTop: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '10px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#795548', fontSize: '0.9rem' }}>
              <AlertTriangle size={18} color="#FF9933" />
              <span>
                <strong>Existing Register Found:</strong> Attendance for <strong>{sessionDate}</strong> was already saved ({existingSession.presentCount} Present, {existingSession.absentCount} Absent). You can review or edit it below.
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handleDeleteTakenClass}
                disabled={isSaving}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  background: '#FEE2E2',
                  color: '#DC2626',
                  border: '1px solid #FCA5A5',
                  padding: '0.4rem 0.8rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '0.82rem'
                }}
                title="Delete this class session and clear its attendance records (Admin only)"
              >
                <Trash2 size={14} />
                <span>Delete Taken Class</span>
              </button>
              <button
                onClick={() => onNavigateToSessions && onNavigateToSessions()}
                className="btn-ghost"
                style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
              >
                View in Session History
              </button>
            </div>
          </div>
        )}

        {/* Success Confirmation Alert */}
        {saveSuccessMessage && (
          <div 
            style={{
              background: '#D8F3DC',
              border: '1.5px solid #52B788',
              color: '#081C15',
              borderRadius: '8px',
              padding: '0.85rem 1.25rem',
              marginTop: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: 600
            }}
          >
            <CheckCircle2 size={20} color="#1B4332" />
            <span>{saveSuccessMessage}</span>
          </div>
        )}

        {/* Conductor & Administrator Identity Banner (Required) */}
        <div 
          style={{
            background: 'linear-gradient(135deg, #FFFDF5 0%, #FFF8E7 100%)',
            border: conductorError ? '2px solid #E53E3E' : '1.5px solid #E2D9C8',
            borderLeft: '5px solid #FF9933',
            borderRadius: '10px',
            padding: '1.25rem 1.5rem',
            marginTop: '1.25rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', alignItems: 'flex-start' }}>
            {/* Field 1: Who conducted today's class? (Required) */}
            <div>
              <label 
                htmlFor="conductor-input"
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  fontWeight: 700, 
                  fontSize: '1rem', 
                  color: '#1B4332',
                  marginBottom: '4px'
                }}
              >
                <GraduationCap size={20} color="#FF9933" />
                <span>Who conducted today's class? <span style={{ color: '#E53E3E' }}>* (Required)</span></span>
              </label>
              <p style={{ fontSize: '0.8rem', color: '#666', margin: '0 0 8px 0' }}>
                Enter or select the speaker, teacher, or guest conductor (does not require a student account).
              </p>
              <div style={{ position: 'relative' }}>
                <input 
                  id="conductor-input"
                  type="text"
                  list="class-conductors-list"
                  className="form-input"
                  style={{
                    borderColor: conductorError ? '#E53E3E' : '#D4AF37',
                    background: conductorError ? '#FFF5F5' : '#FFFFFF',
                    fontSize: '0.96rem',
                    fontWeight: 600,
                    color: '#1B4332',
                    padding: '0.65rem 0.9rem'
                  }}
                  placeholder="e.g. HG Gauranga Das, Smt. Radharani Devi, Dr. Sharma (Guest Speaker)"
                  value={conductedByName}
                  onChange={(e) => {
                    setConductedByName(e.target.value);
                    if (conductorError) setConductorError('');
                  }}
                  required
                />
                <datalist id="class-conductors-list">
                  <option value="Course Director" />
                  <option value="HG Gauranga Das" />
                  <option value="HG Radheshyam Das" />
                  <option value="Smt. Krishna Priya Devi Dasi" />
                  <option value="HG Chaitanya Charan Das" />
                  <option value="Guest Speaker (Visiting Scholar)" />
                </datalist>
              </div>
              {conductorError ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#E53E3E', fontSize: '0.84rem', marginTop: '6px', fontWeight: 600 }}>
                  <AlertTriangle size={15} />
                  <span>{conductorError}</span>
                </div>
              ) : (
                <div style={{ fontSize: '0.78rem', color: '#888', marginTop: '5px' }}>
                  ✓ Stored with class session and reflected across attendance reports and certificates.
                </div>
              )}
            </div>

            {/* Field 2: Attendance Recorded By (Authenticated Admin - Read-Only) */}
            <div 
              style={{
                background: 'rgba(27, 67, 50, 0.05)',
                border: '1.5px dashed #2D6A4F',
                borderRadius: '8px',
                padding: '0.9rem 1.15rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#1B4332', fontWeight: 700, fontSize: '0.92rem', marginBottom: '4px' }}>
                <ShieldCheck size={18} color="#2D6A4F" />
                <span>Attendance recorded by (Authenticated Administrator)</span>
              </div>
              <p style={{ fontSize: '0.78rem', color: '#666', margin: '0 0 8px 0' }}>
                Automatically secured by administrator authentication. Cannot be altered or impersonated.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#FFFFFF', padding: '7px 12px', borderRadius: '6px', border: '1px solid #D8D2C2' }}>
                <User size={16} color="#B8860B" />
                <span style={{ fontWeight: 700, color: '#1B4332', fontSize: '0.92rem' }}>
                  {currentUser?.name || 'Administrator'}
                </span>
                <span style={{ color: '#666', fontSize: '0.82rem' }}>
                  (@{currentUser?.username || 'ANIK'})
                </span>
                <span style={{ marginLeft: 'auto', fontSize: '0.72rem', background: '#D8F3DC', color: '#1B4332', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>
                  VERIFIED ADMIN
                </span>
              </div>
              {existingSession?.attendanceRecordedByName && (
                <div style={{ fontSize: '0.76rem', color: '#795548', marginTop: '8px' }}>
                  Previously recorded by: <strong>{existingSession.attendanceRecordedByName}</strong> on {existingSession.attendanceRecordedAt ? new Date(existingSession.attendanceRecordedAt).toLocaleString() : 'prior date'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Session Metadata Controls */}
        <div 
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1rem',
            marginTop: '1.25rem'
          }}
        >
          {/* Date Picker */}
          <div>
            <label className="form-label">
              Select Session Date <span style={{ color: '#E53E3E' }}>*</span>
            </label>
            <input 
              type="date"
              className="form-input"
              value={sessionDate}
              onChange={(e) => setSessionDate(e.target.value)}
            />
          </div>

          {/* Session Title */}
          <div>
            <label className="form-label">
              Class Session Title
            </label>
            <input 
              type="text"
              className="form-input"
              placeholder="e.g. Chapter 4: Transcendental Knowledge"
              value={sessionTitle}
              onChange={(e) => setSessionTitle(e.target.value)}
            />
          </div>

          {/* Lesson Topic */}
          <div>
            <label className="form-label">
              Topic / Verses Discussed (Optional)
            </label>
            <input 
              type="text"
              className="form-input"
              placeholder="e.g. Gita Verses 4.1 to 4.10, Guru Parampara"
              value={sessionTopic}
              onChange={(e) => setSessionTopic(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Live Attendance Tally Counter & Bulk Actions Bar */}
      <div 
        className="devotional-card-cream"
        style={{
          padding: '1rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          border: '1px solid rgba(255, 215, 0, 0.4)'
        }}
      >
        {/* Tally Metrics */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
          <div>
            <span style={{ fontSize: '0.8rem', color: '#666', fontWeight: 600 }}>Total Students:</span>{' '}
            <strong style={{ fontSize: '1.1rem', color: '#1B4332' }}>{totalEligibleCount}</strong>
          </div>
          <div>
            <span style={{ fontSize: '0.8rem', color: '#2D6A4F', fontWeight: 600 }}>Present:</span>{' '}
            <strong style={{ fontSize: '1.1rem', color: '#2D6A4F' }}>{presentCount}</strong>
          </div>
          <div>
            <span style={{ fontSize: '0.8rem', color: '#C0392B', fontWeight: 600 }}>Absent:</span>{' '}
            <strong style={{ fontSize: '1.1rem', color: '#C0392B' }}>{absentCount}</strong>
          </div>
          <div>
            <span style={{ fontSize: '0.8rem', color: '#8B4513', fontWeight: 600 }}>Attendance:</span>{' '}
            <strong style={{ fontSize: '1.1rem', color: '#8B4513' }}>{attendancePercentage}%</strong>
          </div>
        </div>

        {/* Bulk Action Buttons & Save */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button 
            type="button"
            onClick={handleMarkAllPresent}
            className="btn-ghost"
            style={{ fontSize: '0.85rem', color: '#1B4332', background: '#D8F3DC', borderColor: '#95D5B2' }}
          >
            <Check size={16} />
            <span>Mark All Present</span>
          </button>

          <button 
            type="button"
            onClick={handleMarkAllAbsent}
            className="btn-ghost"
            style={{ fontSize: '0.85rem', color: '#9D0208', background: '#FFE5D9', borderColor: '#F4A261' }}
          >
            <X size={16} />
            <span>Mark All Absent</span>
          </button>

          {existingSession && (
            <button 
              type="button"
              onClick={handleDeleteTakenClass}
              disabled={isSaving}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: '#FEE2E2',
                color: '#DC2626',
                border: '1px solid #FCA5A5',
                padding: '0.6rem 1rem',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '0.88rem'
              }}
              title="Delete this class session and clear its attendance records (Admin only)"
            >
              <Trash2 size={16} />
              <span>Delete Class (Admin)</span>
            </button>
          )}

          <button 
            type="button"
            onClick={handleSaveClick}
            disabled={isSaving}
            className="btn-gold"
            style={{ fontSize: '0.92rem', padding: '0.65rem 1.4rem' }}
          >
            <Save size={18} />
            <span>{isSaving ? 'Saving...' : (existingSession ? 'Update Register' : 'Save Attendance')}</span>
          </button>
        </div>
      </div>

      {/* Student Attendance List Table */}
      <div className="devotional-card" style={{ padding: '0', overflow: 'hidden' }}>
        
        {/* Table Search Header */}
        <div style={{ padding: '1rem 1.5rem', background: '#FAF6EE', borderBottom: '1px solid #EFE4CE', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: '320px' }}>
            <input 
              type="text"
              placeholder="Search students in this register..."
              className="form-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '2.4rem', fontSize: '0.88rem' }}
            />
            <Search size={16} color="#888" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
          </div>

          <div style={{ fontSize: '0.82rem', color: '#666' }}>
            Click toggle buttons to flip between <strong style={{ color: '#1B4332' }}>Present</strong> and <strong style={{ color: '#C0392B' }}>Absent</strong>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ background: '#F8F4EA', borderBottom: '2px solid #EADDC8', color: '#555' }}>
                <th style={{ padding: '0.85rem 1.25rem', width: '120px' }}>Student ID</th>
                <th style={{ padding: '0.85rem 1.25rem' }}>Full Name</th>
                <th style={{ padding: '0.85rem 1.25rem' }}>Class</th>
                <th style={{ padding: '0.85rem 1.25rem' }}>School</th>
                <th style={{ padding: '0.85rem 1.25rem', textAlign: 'center', width: '220px' }}>Attendance Status</th>
              </tr>
            </thead>
            <tbody>
              {visibleStudents.length > 0 ? (
                visibleStudents.map((student, idx) => {
                  const isPresent = attendanceMap[student.id] === 'present';
                  return (
                    <tr 
                      key={student.id}
                      style={{ 
                        borderBottom: '1px solid #F0EBE0',
                        background: isPresent ? (idx % 2 === 0 ? '#FFFFFF' : '#FCFAF5') : '#FFF5F5',
                        transition: 'background 0.15s ease'
                      }}
                    >
                      <td style={{ padding: '0.85rem 1.25rem' }}>
                        <span 
                          style={{
                            fontFamily: 'monospace',
                            fontWeight: 700,
                            color: '#8B4513',
                            background: '#FFF9DB',
                            padding: '3px 7px',
                            borderRadius: '4px',
                            border: '1px solid #FFE066',
                            fontSize: '0.85rem'
                          }}
                        >
                          {student.id}
                        </span>
                      </td>

                      <td style={{ padding: '0.85rem 1.25rem' }}>
                        <div style={{ fontWeight: 700, color: '#303030' }}>
                          {student.name}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#777' }}>
                          Registered: {student.registrationDate}
                        </div>
                      </td>

                      <td style={{ padding: '0.85rem 1.25rem', color: '#444' }}>
                        {student.grade}
                      </td>

                      <td style={{ padding: '0.85rem 1.25rem', color: '#555' }}>
                        {student.school}
                      </td>

                      {/* Toggle Button */}
                      <td style={{ padding: '0.85rem 1.25rem', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', borderRadius: '8px', overflow: 'hidden', border: '1px solid #D0C6B0' }}>
                          <button
                            type="button"
                            onClick={() => setAttendanceMap(prev => ({ ...prev, [student.id]: 'present' }))}
                            style={{
                              padding: '0.45rem 1rem',
                              border: 'none',
                              cursor: 'pointer',
                              fontWeight: 700,
                              fontSize: '0.82rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '5px',
                              background: isPresent ? '#2D6A4F' : '#FFF',
                              color: isPresent ? '#FFF' : '#666',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <CheckCircle2 size={15} />
                            <span>Present</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setAttendanceMap(prev => ({ ...prev, [student.id]: 'absent' }))}
                            style={{
                              padding: '0.45rem 1rem',
                              border: 'none',
                              cursor: 'pointer',
                              fontWeight: 700,
                              fontSize: '0.82rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '5px',
                              background: !isPresent ? '#C0392B' : '#FFF',
                              color: !isPresent ? '#FFF' : '#666',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <XCircle size={15} />
                            <span>Absent</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} style={{ padding: '3.5rem 1rem', textAlign: 'center', color: '#888' }}>
                    <div style={{ fontWeight: 700, fontSize: '1rem', color: '#1B4332' }}>
                      {activeStudents.length === 0 ? 'No students registered yet.' : 'No students match your filter.'}
                    </div>
                    <div style={{ fontSize: '0.84rem', marginTop: '4px', color: '#666' }}>
                      {activeStudents.length === 0 ? 'Please register students using "Add Student" before recording attendance.' : 'Try adjusting your search query.'}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal for Overwriting Existing Register */}
      {showOverwriteConfirm && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 130,
            padding: '1rem',
            backdropFilter: 'blur(3px)'
          }}
          onClick={() => setShowOverwriteConfirm(false)}
        >
          <div 
            className="devotional-card animate-fade-in"
            style={{
              maxWidth: '480px',
              width: '100%',
              padding: '1.75rem',
              background: '#FFF',
              border: '2px solid #FF9933'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#8B4513', marginBottom: '0.75rem' }}>
              <AlertTriangle size={24} color="#FF9933" />
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Confirm Overwrite Register</h3>
            </div>
            
            <p style={{ color: '#555', fontSize: '0.92rem', lineHeight: 1.5, marginBottom: '1.25rem' }}>
              Attendance has already been recorded for <strong>{dayOfWeek}, {sessionDate}</strong>.
              <br /><br />
              Are you sure you want to overwrite this session register with the current changes?
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setShowOverwriteConfirm(false)}
                className="btn-ghost"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={executeSave}
                className="btn-gold"
              >
                Yes, Overwrite &amp; Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
