import React, { useState, useMemo } from 'react';
import { 
  cancelSession, 
  restoreSession, 
  deleteSession,
  getAttendanceBySessionId,
  updateSessionConductor
} from '../../db/db';
import { apiUpdateSessionConductor } from '../../api/apiClient';
import { 
  History, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  Edit3, 
  Ban, 
  RotateCcw, 
  Download, 
  Search, 
  AlertTriangle,
  ChevronRight,
  BookOpen,
  GraduationCap,
  ShieldCheck,
  User,
  Check,
  Trash2
} from 'lucide-react';

export const SessionHistory = ({ 
  sessions, 
  students,
  onEditRegister, 
  onRefreshData 
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [cancelModalSession, setCancelModalSession] = useState(null);
  const [cancelReason, setCancelReason] = useState('Public Holiday / Temple Festival');

  // Conductor correction modal state
  const [conductorModalSession, setConductorModalSession] = useState(null);
  const [newConductorName, setNewConductorName] = useState('');
  const [conductorEditError, setConductorEditError] = useState('');
  const [isUpdatingConductor, setIsUpdatingConductor] = useState(false);

  const filteredSessions = useMemo(() => {
    return sessions.filter(session => {
      if (statusFilter !== 'ALL' && session.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesDate = session.date?.includes(q);
        const matchesDay = session.dayOfWeek?.toLowerCase().includes(q);
        const matchesTitle = session.title?.toLowerCase().includes(q);
        const matchesTopic = session.topic?.toLowerCase().includes(q);
        const matchesConductor = session.conductedByName?.toLowerCase().includes(q);
        const matchesRecorder = session.attendanceRecordedByName?.toLowerCase().includes(q);
        if (!matchesDate && !matchesDay && !matchesTitle && !matchesTopic && !matchesConductor && !matchesRecorder) return false;
      }
      return true;
    });
  }, [sessions, searchQuery, statusFilter]);

  const handleOpenConductorModal = (session) => {
    setConductorModalSession(session);
    setNewConductorName(session.conductedByName === 'Not recorded' ? '' : (session.conductedByName || ''));
    setConductorEditError('');
  };

  const handleSaveConductorCorrection = async () => {
    if (!newConductorName || !newConductorName.trim()) {
      setConductorEditError("Please enter the teacher or speaker's full name.");
      return;
    }
    if (!conductorModalSession) return;

    setIsUpdatingConductor(true);
    setConductorEditError('');
    try {
      const cleanName = newConductorName.trim();
      await updateSessionConductor(conductorModalSession.id, cleanName);
      apiUpdateSessionConductor(conductorModalSession.id, cleanName).catch(() => {});
      
      setConductorModalSession(null);
      if (onRefreshData) onRefreshData();
    } catch (err) {
      setConductorEditError(`Error updating conductor: ${err.message}`);
    } finally {
      setIsUpdatingConductor(false);
    }
  };

  // Export single session register CSV
  const handleExportSessionCSV = async (session) => {
    const records = await getAttendanceBySessionId(session.id);
    const studentMap = new Map();
    students.forEach(s => studentMap.set(s.id, s));

    const headers = ["Student ID", "Full Name", "Grade", "School", "WhatsApp", "Session Date", "Day", "Status", "Class Conductor", "Attendance Recorded By"];
    const rows = records.map(r => {
      const s = studentMap.get(r.studentId) || {};
      return [
        r.studentId,
        `"${(s.name || '').replace(/"/g, '""')}"`,
        `"${(s.grade || '').replace(/"/g, '""')}"`,
        `"${(s.school || '').replace(/"/g, '""')}"`,
        `"${(s.whatsapp || '').replace(/"/g, '""')}"`,
        session.date,
        session.dayOfWeek,
        r.status,
        `"${(session.conductedByName || 'Not recorded').replace(/"/g, '""')}"`,
        `"${(session.attendanceRecordedByName || 'Not recorded').replace(/"/g, '""')}"`
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," + 
      `"KRISHNA KRIPA - CLASS ATTENDANCE REGISTER: ${session.date} (${session.dayOfWeek})"\n` +
      `"Session: ${(session.title || '').replace(/"/g, '""')} | Topic: ${(session.topic || '').replace(/"/g, '""')}"\n` +
      `"Class Conducted By: ${(session.conductedByName || 'Not recorded').replace(/"/g, '""')} | Attendance Recorded By: ${(session.attendanceRecordedByName || 'Not recorded').replace(/"/g, '""')}"\n` +
      `"Present: ${session.presentCount || 0} | Absent: ${session.absentCount || 0} | Status: ${session.status}"\n\n` +
      [headers.join(","), ...rows.map(e => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `attendance_register_${session.date}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleConfirmCancel = async () => {
    if (!cancelModalSession) return;
    try {
      const sId = cancelModalSession.id || cancelModalSession._id || cancelModalSession.date || cancelModalSession.sessionDate;
      await cancelSession(sId, cancelReason);
      setCancelModalSession(null);
      if (onRefreshData) await onRefreshData();
    } catch (err) {
      alert(`Error cancelling session: ${err.message}`);
    }
  };

  const handleRestore = async (sessionId) => {
    try {
      await restoreSession(sessionId);
      if (onRefreshData) onRefreshData();
    } catch (err) {
      alert(`Error restoring session: ${err.message}`);
    }
  };

  const handleDelete = async (session) => {
    if (!session) return;
    const sDate = session.date || session.sessionDate;
    if (!window.confirm(`Are you sure you want to permanently delete the session record for ${sDate}? This cannot be undone.`)) {
      return;
    }
    try {
      await deleteSession(session.id || session._id || sDate);
      if (onRefreshData) onRefreshData();
    } catch (err) {
      alert(`Error deleting session: ${err.message}`);
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Header Banner */}
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
          borderLeft: '5px solid #8B4513'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <History size={22} color="#8B4513" />
            <h2 className="heading-gold" style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1B4332' }}>
              Attendance History &amp; Conducted Sessions
            </h2>
          </div>
          <p style={{ color: '#666', fontSize: '0.88rem', marginTop: '2px' }}>
            Historical weekend Bhagavad Gita class sessions. Cancelled sessions do not count towards attendance statistics.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.85rem', color: '#1B4332', fontWeight: 600 }}>
            {sessions.filter(s => s.status === 'conducted').length} Conducted &bull; {sessions.filter(s => s.status === 'cancelled').length} Cancelled
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div 
        className="devotional-card-cream"
        style={{
          padding: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}
      >
        <div style={{ flex: '1 1 280px', position: 'relative' }}>
          <input 
            type="text"
            className="form-input"
            placeholder="Search by date, day, topic, title, conductor, or recorder..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '2.5rem' }}
          />
          <Search size={17} color="#888" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
        </div>

        <div style={{ flex: '0 1 180px' }}>
          <select 
            className="form-input"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All Sessions</option>
            <option value="conducted">Conducted Only</option>
            <option value="cancelled">Cancelled Only</option>
          </select>
        </div>
      </div>

      {/* Sessions Table */}
      <div className="devotional-card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ background: '#F8F4EA', borderBottom: '2px solid #EADDC8', color: '#555' }}>
                <th style={{ padding: '0.85rem 1.25rem' }}>Session Date</th>
                <th style={{ padding: '0.85rem 1.25rem' }}>Weekday</th>
                <th style={{ padding: '0.85rem 1.25rem' }}>Class Title &amp; Topic</th>
                <th style={{ padding: '0.85rem 1.25rem' }}>Class Conductor</th>
                <th style={{ padding: '0.85rem 1.25rem', textAlign: 'center' }}>Present</th>
                <th style={{ padding: '0.85rem 1.25rem', textAlign: 'center' }}>Absent</th>
                <th style={{ padding: '0.85rem 1.25rem', textAlign: 'center' }}>Turnout</th>
                <th style={{ padding: '0.85rem 1.25rem', textAlign: 'center' }}>Status</th>
                <th style={{ padding: '0.85rem 1.25rem', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSessions.length > 0 ? (
                filteredSessions.map((session, idx) => {
                  const isConducted = session.status === 'conducted';
                  const total = (session.presentCount || 0) + (session.absentCount || 0);
                  const rate = total > 0 ? Math.round(((session.presentCount || 0) / total) * 100) : 0;
                  const conductorName = session.conductedByName || 'Not recorded';

                  return (
                    <tr 
                      key={session.id}
                      style={{ 
                        borderBottom: '1px solid #F0EBE0',
                        background: isConducted ? (idx % 2 === 0 ? '#FFFFFF' : '#FCFAF5') : '#FFF3F3',
                        transition: 'background 0.15s ease'
                      }}
                    >
                      <td style={{ padding: '0.85rem 1.25rem', fontWeight: 700, color: '#303030', whiteSpace: 'nowrap' }}>
                        {session.date}
                      </td>

                      <td style={{ padding: '0.85rem 1.25rem' }}>
                        <span className="badge-weekend">
                          {session.dayOfWeek}
                        </span>
                      </td>

                      <td style={{ padding: '0.85rem 1.25rem' }}>
                        <div style={{ fontWeight: 600, color: '#1B4332' }}>
                          {session.title}
                        </div>
                        {session.topic && (
                          <div style={{ fontSize: '0.78rem', color: '#666' }}>
                            {session.topic}
                          </div>
                        )}
                        {!isConducted && session.cancellationReason && (
                          <div style={{ fontSize: '0.75rem', color: '#C0392B', fontWeight: 600, marginTop: '2px' }}>
                            Reason: {session.cancellationReason}
                          </div>
                        )}
                      </td>

                      {/* Class Conductor & Recorded By */}
                      <td style={{ padding: '0.85rem 1.25rem' }}>
                        {isConducted ? (
                          <div>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                              <span 
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                  background: conductorName !== 'Not recorded' ? '#FEF3C7' : '#F3F4F6',
                                  color: conductorName !== 'Not recorded' ? '#92400E' : '#6B7280',
                                  border: conductorName !== 'Not recorded' ? '1px solid #FCD34D' : '1px solid #E5E7EB',
                                  padding: '3px 8px',
                                  borderRadius: '12px',
                                  fontWeight: 700,
                                  fontSize: '0.82rem'
                                }}
                              >
                                <GraduationCap size={13} />
                                <span>{conductorName}</span>
                              </span>
                              <button
                                onClick={() => handleOpenConductorModal(session)}
                                className="btn-ghost"
                                style={{ padding: '2px 5px', color: '#B8860B' }}
                                title="Correct teacher/speaker name (audit logged)"
                              >
                                <Edit3 size={13} />
                              </button>
                            </div>
                            {session.attendanceRecordedByName && (
                              <div style={{ fontSize: '0.72rem', color: '#666', marginTop: '3px' }}>
                                Recorded by: <strong>{session.attendanceRecordedByName}</strong>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: '#999', fontSize: '0.8rem' }}>—</span>
                        )}
                      </td>

                      <td style={{ padding: '0.85rem 1.25rem', textAlign: 'center' }}>
                        {isConducted ? (
                          <span style={{ fontWeight: 700, color: '#2D6A4F' }}>
                            {session.presentCount || 0}
                          </span>
                        ) : '-'}
                      </td>

                      <td style={{ padding: '0.85rem 1.25rem', textAlign: 'center' }}>
                        {isConducted ? (
                          <span style={{ fontWeight: 700, color: '#C0392B' }}>
                            {session.absentCount || 0}
                          </span>
                        ) : '-'}
                      </td>

                      <td style={{ padding: '0.85rem 1.25rem', textAlign: 'center' }}>
                        {isConducted ? (
                          <span style={{ 
                            background: rate >= 80 ? '#D8F3DC' : '#FFF9DB',
                            color: rate >= 80 ? '#1B4332' : '#7A5700',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontWeight: 700,
                            fontSize: '0.8rem'
                          }}>
                            {rate}%
                          </span>
                        ) : '-'}
                      </td>

                      <td style={{ padding: '0.85rem 1.25rem', textAlign: 'center' }}>
                        {isConducted ? (
                          <span className="badge-present">
                            <CheckCircle2 size={13} />
                            <span>Conducted</span>
                          </span>
                        ) : (
                          <span className="badge-absent">
                            <Ban size={13} />
                            <span>Cancelled</span>
                          </span>
                        )}
                      </td>

                      <td style={{ padding: '0.85rem 1.25rem', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          {/* Edit / Open Register */}
                          <button
                            onClick={() => onEditRegister(session.date)}
                            className="btn-ghost"
                            style={{ padding: '0.35rem 0.65rem', color: '#1B4332', border: '1px solid #1B4332' }}
                            title="Edit or review this session's attendance register"
                          >
                            <Edit3 size={15} />
                            <span style={{ fontSize: '0.78rem' }}>Register</span>
                          </button>

                          {/* Export CSV for this session */}
                          <button
                            onClick={() => handleExportSessionCSV(session)}
                            className="btn-ghost"
                            style={{ padding: '0.35rem 0.55rem', color: '#8B4513' }}
                            title="Download Session CSV"
                          >
                            <Download size={15} />
                          </button>

                          {/* Cancel or Restore */}
                          {isConducted ? (
                            <button
                              onClick={() => setCancelModalSession(session)}
                              className="btn-ghost"
                              style={{ padding: '0.35rem 0.55rem', color: '#C0392B' }}
                              title="Cancel Session (excluded from conducted count)"
                            >
                              <Ban size={15} />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleRestore(session.id)}
                              className="btn-ghost"
                              style={{ padding: '0.35rem 0.55rem', color: '#2D6A4F' }}
                              title="Restore session as conducted"
                            >
                              <RotateCcw size={15} />
                            </button>
                          )}

                          {/* Delete Taken Class (Admin Only) */}
                          <button
                            onClick={() => handleDelete(session)}
                            className="btn-ghost"
                            style={{ padding: '0.35rem 0.55rem', color: '#DC2626', background: '#FEE2E2', borderRadius: '4px' }}
                            title="Delete Taken Class & Attendance Records (Admin Only)"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} style={{ padding: '3.5rem 1rem', textAlign: 'center', color: '#888' }}>
                    <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#1B4332' }}>
                      {sessions.length === 0 ? 'No classes scheduled or recorded yet.' : 'No sessions match your filter.'}
                    </div>
                    <div style={{ fontSize: '0.84rem', marginTop: '4px', color: '#666' }}>
                      {sessions.length === 0 ? 'Record your first class attendance by clicking "Take Attendance".' : 'Try adjusting your search query or status filter.'}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cancel Session Confirmation Modal */}
      {cancelModalSession && (
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
          onClick={() => setCancelModalSession(null)}
        >
          <div 
            className="devotional-card animate-fade-in"
            style={{
              maxWidth: '480px',
              width: '100%',
              padding: '1.75rem',
              background: '#FFF',
              border: '2px solid #E57373'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#C62828', marginBottom: '0.75rem' }}>
              <Ban size={24} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Cancel Weekend Session</h3>
            </div>
            
            <p style={{ color: '#555', fontSize: '0.9rem', lineHeight: 1.5, marginBottom: '1.25rem' }}>
              Are you sure you want to cancel the session on <strong>{cancelModalSession.dayOfWeek}, {cancelModalSession.date}</strong>?
              <br /><br />
              <span style={{ color: '#8B4513', fontWeight: 600 }}>
                Rule: Cancelled sessions do not count as conducted sessions in attendance percentage calculations.
              </span>
            </p>

            <div style={{ marginBottom: '1.25rem' }}>
              <label className="form-label">Cancellation Reason</label>
              <input 
                type="text"
                className="form-input"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Festival, weather, public holiday"
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setCancelModalSession(null)}
                className="btn-ghost"
              >
                Go Back
              </button>

              <button
                onClick={handleConfirmCancel}
                style={{
                  background: '#C62828',
                  color: '#FFF',
                  border: 'none',
                  padding: '0.6rem 1.1rem',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Correct Class Conductor Modal with Audit Logging */}
      {conductorModalSession && (
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
          onClick={() => setConductorModalSession(null)}
        >
          <div 
            className="devotional-card animate-fade-in"
            style={{
              maxWidth: '520px',
              width: '100%',
              padding: '1.75rem',
              background: '#FFF',
              border: '2px solid #FF9933'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#1B4332', marginBottom: '0.75rem' }}>
              <GraduationCap size={24} color="#FF9933" />
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Correct Class Conductor / Speaker</h3>
            </div>
            
            <p style={{ color: '#555', fontSize: '0.88rem', lineHeight: 1.5, marginBottom: '1rem' }}>
              Update the teacher or speaker name for session on <strong>{conductorModalSession.dayOfWeek}, {conductorModalSession.date}</strong>.
              <br />
              <span style={{ fontSize: '0.8rem', color: '#8B4513', fontStyle: 'italic' }}>
                Note: This change will be permanently recorded in the administrator audit trail.
              </span>
            </p>

            <div style={{ background: '#FAF6EE', border: '1px solid #EFE4CE', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem' }}>
              <div style={{ color: '#555', marginBottom: '4px' }}>
                <strong>Class:</strong> {conductorModalSession.title}
              </div>
              <div style={{ color: '#555' }}>
                <strong>Attendance Recorded By:</strong> {conductorModalSession.attendanceRecordedByName || 'Administrator'}
              </div>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label className="form-label" style={{ fontWeight: 700, color: '#1B4332' }}>
                Teacher / Speaker Full Name <span style={{ color: '#E53E3E' }}>*</span>
              </label>
              <input 
                type="text"
                list="modal-conductor-options"
                className="form-input"
                value={newConductorName}
                onChange={(e) => {
                  setNewConductorName(e.target.value);
                  if (conductorEditError) setConductorEditError('');
                }}
                placeholder="e.g. HG Gauranga Das, Guest Speaker"
                autoFocus
              />
              <datalist id="modal-conductor-options">
                <option value="Course Director" />
                <option value="HG Gauranga Das" />
                <option value="HG Radheshyam Das" />
                <option value="Smt. Krishna Priya Devi Dasi" />
                <option value="HG Chaitanya Charan Das" />
                <option value="Guest Speaker (Visiting Scholar)" />
              </datalist>

              {conductorEditError && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#E53E3E', fontSize: '0.82rem', marginTop: '6px', fontWeight: 600 }}>
                  <AlertTriangle size={14} />
                  <span>{conductorEditError}</span>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setConductorModalSession(null)}
                className="btn-ghost"
                disabled={isUpdatingConductor}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSaveConductorCorrection}
                className="btn-gold"
                disabled={isUpdatingConductor}
                style={{ padding: '0.6rem 1.25rem' }}
              >
                <Check size={16} />
                <span>{isUpdatingConductor ? 'Saving Change...' : 'Update & Log Correction'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
