import React, { useState, useEffect } from 'react';
import { calculateStudentAttendanceStats } from '../../db/db';
import { 
  X, 
  User, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Download, 
  Printer, 
  School, 
  Phone, 
  BookOpen, 
  Award,
  Sparkles 
} from 'lucide-react';

export const StudentProfileModal = ({ studentId, isOpen, onClose }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (studentId && isOpen) {
      setLoading(true);
      calculateStudentAttendanceStats(studentId)
        .then(res => setStats(res))
        .catch(err => console.error(err))
        .finally(() => setLoading(false));
    }
  }, [studentId, isOpen]);

  if (!isOpen) return null;

  const exportIndividualCSV = () => {
    if (!stats || !stats.student) return;
    const { student, history, totalEligible, attendedCount, missedCount, percentage } = stats;

    const headers = ["Session Date", "Day", "Class Title", "Status", "Student ID", "Student Name", "Grade", "School"];
    const rows = history.map(h => [
      h.date,
      h.day,
      `"${(h.title || '').replace(/"/g, '""')}"`,
      h.status,
      student.id,
      `"${student.name.replace(/"/g, '""')}"`,
      student.grade,
      `"${student.school.replace(/"/g, '""')}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + 
      `"KRISHNA KRIPA - STUDENT ATTENDANCE REPORT: ${student.name} (${student.id})"\n` +
      `"Total Eligible Classes: ${totalEligible} | Attended: ${attendedCount} | Missed: ${missedCount} | Attendance: ${percentage}%"\n\n` +
      [headers.join(","), ...rows.map(e => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `attendance_${student.id}_${student.name.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 110,
        padding: '1rem',
        backdropFilter: 'blur(5px)'
      }}
      onClick={onClose}
    >
      <div 
        className="devotional-card animate-fade-in printable-profile"
        style={{
          width: '100%',
          maxWidth: '780px',
          maxHeight: '92vh',
          overflowY: 'auto',
          background: '#FFFDF9',
          border: '2px solid #FFD700',
          borderRadius: '16px',
          boxShadow: '0 25px 50px rgba(0,0,0,0.5)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div 
          style={{
            background: 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 60%, #8B4513 100%)',
            padding: '1.5rem 1.75rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '2px solid #FFD700',
            color: '#FFF'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div 
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #FFD700, #FF9933)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#1B4332',
                fontWeight: 900,
                fontSize: '1.4rem',
                border: '2px solid #FFF8DC'
              }}
            >
              {stats?.student?.name?.charAt(0) || 'K'}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 className="heading-gold" style={{ fontSize: '1.45rem', fontWeight: 800 }}>
                  {stats?.student?.name || 'Loading Student...'}
                </h3>
                <span 
                  style={{
                    background: '#FFF9DB',
                    color: '#8B4513',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    border: '1px solid #FFD700'
                  }}
                >
                  {stats?.student?.id}
                </span>
              </div>
              <p style={{ fontSize: '0.85rem', color: '#FFF8DC', marginTop: '2px' }}>
                {stats?.student?.grade} &bull; {stats?.student?.school}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={exportIndividualCSV}
              className="btn-outline-gold no-print"
              style={{ padding: '0.45rem 0.85rem', fontSize: '0.82rem' }}
              title="Download Individual CSV"
            >
              <Download size={15} />
              <span>CSV</span>
            </button>
            <button
              onClick={handlePrint}
              className="btn-outline-gold no-print"
              style={{ padding: '0.45rem 0.85rem', fontSize: '0.82rem' }}
              title="Print Student Record"
            >
              <Printer size={15} />
              <span>Print</span>
            </button>
            <button 
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: '#FFF8DC',
                cursor: 'pointer',
                padding: '4px'
              }}
              className="no-print"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#666' }}>
            Calculating historical attendance from database records...
          </div>
        ) : !stats || !stats.student ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#C0392B' }}>
            Student record not found.
          </div>
        ) : (
          <div style={{ padding: '1.75rem' }}>
            
            {/* Student Details Grid */}
            <div 
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                gap: '1rem',
                background: '#FAF6EE',
                border: '1px solid #EFE4CE',
                borderRadius: '10px',
                padding: '1.25rem',
                marginBottom: '1.5rem'
              }}
            >
              <div>
                <div style={{ fontSize: '0.75rem', color: '#777', textTransform: 'uppercase', fontWeight: 600 }}>Student ID</div>
                <div style={{ fontWeight: 700, color: '#1B4332', fontSize: '0.95rem', fontFamily: 'monospace' }}>{stats.student.id}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#777', textTransform: 'uppercase', fontWeight: 600 }}>Class / Grade</div>
                <div style={{ fontWeight: 600, color: '#303030', fontSize: '0.95rem' }}>{stats.student.grade}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#777', textTransform: 'uppercase', fontWeight: 600 }}>School</div>
                <div style={{ fontWeight: 600, color: '#303030', fontSize: '0.95rem' }}>{stats.student.school}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#777', textTransform: 'uppercase', fontWeight: 600 }}>WhatsApp</div>
                <div style={{ fontWeight: 600, color: '#303030', fontSize: '0.95rem' }}>{stats.student.whatsapp}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#777', textTransform: 'uppercase', fontWeight: 600 }}>Registration Date</div>
                <div style={{ fontWeight: 600, color: '#303030', fontSize: '0.95rem' }}>{stats.student.registrationDate}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#777', textTransform: 'uppercase', fontWeight: 600 }}>Status</div>
                <div style={{ fontWeight: 600, color: stats.student.status === 'archived' ? '#999' : '#1B4332', fontSize: '0.95rem' }}>
                  {stats.student.status === 'archived' ? 'Archived' : 'Active Student'}
                </div>
              </div>
            </div>

            {/* Calculated Attendance Stats (Rule: Calculated from saved records) */}
            <div style={{ marginBottom: '1.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.85rem' }}>
                <Award size={18} color="#FF9933" />
                <h4 style={{ fontFamily: 'var(--font-heading)', color: '#1B4332', fontSize: '1.1rem', fontWeight: 700 }}>
                  Conducted Class Attendance Metrics
                </h4>
              </div>

              <div 
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                  gap: '1rem'
                }}
              >
                {/* Eligible classes */}
                <div className="devotional-card" style={{ padding: '1rem', textAlign: 'center', borderTop: '3px solid #8B4513' }}>
                  <div style={{ fontSize: '0.75rem', color: '#666', fontWeight: 600 }}>Eligible Classes</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#8B4513', marginTop: '4px' }}>
                    {stats.totalEligible}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#888' }}>Since registration</div>
                </div>

                {/* Attended */}
                <div className="devotional-card" style={{ padding: '1rem', textAlign: 'center', borderTop: '3px solid #2D6A4F' }}>
                  <div style={{ fontSize: '0.75rem', color: '#666', fontWeight: 600 }}>Classes Attended</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#2D6A4F', marginTop: '4px' }}>
                    {stats.attendedCount}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#2D6A4F', fontWeight: 600 }}>Present marks</div>
                </div>

                {/* Missed */}
                <div className="devotional-card" style={{ padding: '1rem', textAlign: 'center', borderTop: '3px solid #C0392B' }}>
                  <div style={{ fontSize: '0.75rem', color: '#666', fontWeight: 600 }}>Classes Missed</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#C0392B', marginTop: '4px' }}>
                    {stats.missedCount}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#C0392B', fontWeight: 600 }}>Absent marks</div>
                </div>

                {/* Percentage */}
                <div className="devotional-card" style={{ padding: '1rem', textAlign: 'center', borderTop: '3px solid #FFD700', background: '#FFFDF0' }}>
                  <div style={{ fontSize: '0.75rem', color: '#7A5700', fontWeight: 600 }}>Attendance %</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#996515', marginTop: '4px' }}>
                    {stats.percentage}%
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#7A5700', fontWeight: 600 }}>
                    {stats.percentage >= 80 ? 'Excellent' : stats.percentage >= 60 ? 'Regular' : 'Needs attention'}
                  </div>
                </div>
              </div>
            </div>

            {/* Individual Attendance History Table */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                <h4 style={{ fontFamily: 'var(--font-heading)', color: '#1B4332', fontSize: '1.1rem', fontWeight: 700 }}>
                  Complete Session Attendance History
                </h4>
                <span style={{ fontSize: '0.8rem', color: '#666' }}>
                  {stats.history.length} eligible session{stats.history.length === 1 ? '' : 's'} recorded
                </span>
              </div>

              {stats.history.length > 0 ? (
                <div style={{ overflowX: 'auto', border: '1px solid #EFE4CE', borderRadius: '10px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                    <thead>
                      <tr style={{ background: '#FAF6EE', borderBottom: '1px solid #EAE0CB', color: '#555' }}>
                        <th style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>Session Date</th>
                        <th style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>Day of Week</th>
                        <th style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>Class Title / Topic</th>
                        <th style={{ padding: '0.75rem 1rem', fontWeight: 700, textAlign: 'center' }}>Attendance Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.history.map((record, idx) => (
                        <tr 
                          key={record.sessionId} 
                          style={{ 
                            borderBottom: '1px solid #F0EAE1',
                            background: idx % 2 === 0 ? '#FFFFFF' : '#FCFAF5'
                          }}
                        >
                          <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#303030' }}>
                            {record.date}
                          </td>
                          <td style={{ padding: '0.75rem 1rem', color: '#8B4513', fontWeight: 500 }}>
                            <span className="badge-weekend">
                              {record.day}
                            </span>
                          </td>
                          <td style={{ padding: '0.75rem 1rem', color: '#444' }}>
                            <div style={{ fontWeight: 600 }}>{record.title}</div>
                            {record.topic && (
                              <div style={{ fontSize: '0.75rem', color: '#777' }}>{record.topic}</div>
                            )}
                          </td>
                          <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                            {record.status === 'Present' ? (
                              <span className="badge-present">
                                <CheckCircle2 size={13} />
                                <span>Present</span>
                              </span>
                            ) : record.status === 'Absent' ? (
                              <span className="badge-absent">
                                <XCircle size={13} />
                                <span>Absent</span>
                              </span>
                            ) : (
                              <span style={{ 
                                background: '#EEE', 
                                color: '#666', 
                                padding: '0.2rem 0.6rem', 
                                borderRadius: '12px', 
                                fontSize: '0.75rem' 
                              }}>
                                Not Recorded
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div 
                  style={{
                    padding: '2rem',
                    textAlign: 'center',
                    background: '#FAF6EE',
                    borderRadius: '8px',
                    color: '#888',
                    border: '1px dashed #D0C6B0'
                  }}
                >
                  <Calendar size={28} color="#A08C70" style={{ margin: '0 auto 8px' }} />
                  <p style={{ fontWeight: 600 }}>No conducted weekend sessions recorded after student registration.</p>
                  <p style={{ fontSize: '0.8rem', marginTop: '4px' }}>
                    Student registered on {stats.student.registrationDate}. Take attendance on upcoming Saturdays or Sundays.
                  </p>
                </div>
              )}
            </div>

            {/* Notes if present */}
            {stats.student.notes && (
              <div 
                style={{
                  marginTop: '1.5rem',
                  padding: '0.85rem 1rem',
                  background: '#FFF9DB',
                  border: '1px solid #FFE58F',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  color: '#634A00'
                }}
              >
                <strong>Admin Notes:</strong> {stats.student.notes}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
