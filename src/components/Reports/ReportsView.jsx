import React, { useState, useEffect, useMemo } from 'react';
import { apiGetAdminAiUsageReport } from '../../api/apiClient';
import { 
  FileSpreadsheet, 
  Printer, 
  Download, 
  Filter, 
  Calendar, 
  Users, 
  CheckCircle2, 
  XCircle, 
  Percent, 
  Sparkles,
  School,
  BookOpen,
  GraduationCap,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

export const ReportsView = ({ 
  students, 
  sessions, 
  onViewStudentProfile 
}) => {
  // Filter States
  const [fromDate, setFromDate] = useState('2026-08-01');
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedStudentId, setSelectedStudentId] = useState('ALL');
  const [selectedSchool, setSelectedSchool] = useState('ALL');
  const [selectedGrade, setSelectedGrade] = useState('ALL');
  const [sessionStatus, setSessionStatus] = useState('conducted'); // 'conducted', 'all', 'cancelled'
  const [aiUsageReport, setAiUsageReport] = useState(null);

  useEffect(() => {
    apiGetAdminAiUsageReport().then(rep => {
      if (rep) setAiUsageReport(rep);
    }).catch(() => {});
  }, []);

  // Extract unique schools and grades
  const schoolsList = useMemo(() => {
    const set = new Set();
    students.forEach(s => { if (s.school) set.add(s.school); });
    return Array.from(set).sort();
  }, [students]);

  const gradesList = useMemo(() => {
    const set = new Set();
    students.forEach(s => { if (s.grade) set.add(s.grade); });
    return Array.from(set).sort();
  }, [students]);

  // Filtered Sessions
  const filteredSessions = useMemo(() => {
    return sessions.filter(s => {
      if (fromDate && s.date < fromDate) return false;
      if (toDate && s.date > toDate) return false;
      if (sessionStatus !== 'all' && s.status !== sessionStatus) return false;
      return true;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [sessions, fromDate, toDate, sessionStatus]);

  // Aggregate Metrics in filtered range
  const summary = useMemo(() => {
    let totalPresent = 0;
    let totalAbsent = 0;
    let highestTurnoutSession = null;
    let highestTurnout = -1;

    filteredSessions.forEach(s => {
      const p = s.presentCount || 0;
      const a = s.absentCount || 0;
      totalPresent += p;
      totalAbsent += a;
      if (p > highestTurnout) {
        highestTurnout = p;
        highestTurnoutSession = s;
      }
    });

    const totalMarks = totalPresent + totalAbsent;
    const avgRate = totalMarks > 0 ? Math.round((totalPresent / totalMarks) * 100) : 0;

    return {
      sessionCount: filteredSessions.length,
      totalPresent,
      totalAbsent,
      avgRate,
      highestTurnoutSession
    };
  }, [filteredSessions]);

  // Filtered Students List
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      if (selectedStudentId !== 'ALL' && s.id !== selectedStudentId) return false;
      if (selectedSchool !== 'ALL' && s.school !== selectedSchool) return false;
      if (selectedGrade !== 'ALL' && s.grade !== selectedGrade) return false;
      return true;
    });
  }, [students, selectedStudentId, selectedSchool, selectedGrade]);

  // CSV Export: Master Report
  const handleExportMasterCSV = () => {
    const headers = [
      "Session Date", 
      "Day", 
      "Session Title", 
      "Topic", 
      "Class Conductor",
      "Attendance Recorded By",
      "Status", 
      "Present Count", 
      "Absent Count", 
      "Total Registered", 
      "Attendance Rate %"
    ];

    const rows = filteredSessions.map(s => {
      const total = (s.presentCount || 0) + (s.absentCount || 0);
      const pct = total > 0 ? Math.round(((s.presentCount || 0) / total) * 100) : 0;
      return [
        s.date,
        s.dayOfWeek,
        `"${(s.title || '').replace(/"/g, '""')}"`,
        `"${(s.topic || '').replace(/"/g, '""')}"`,
        `"${(s.conductedByName || 'Not recorded').replace(/"/g, '""')}"`,
        `"${(s.attendanceRecordedByName || 'Not recorded').replace(/"/g, '""')}"`,
        s.status,
        s.presentCount || 0,
        s.absentCount || 0,
        s.totalRegistered || total,
        `${pct}%`
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," + 
      `"KRISHNA KRIPA - BHAGAVAD GITA CLASS ATTENDANCE MASTER REPORT"\n` +
      `"Date Range: ${fromDate} to ${toDate} | Status Filter: ${sessionStatus}"\n` +
      `"Total Sessions: ${summary.sessionCount} | Average Attendance Rate: ${summary.avgRate}%"\n\n` +
      [headers.join(","), ...rows.map(e => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `krishna_kripa_report_${fromDate}_to_${toDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Top Banner & Export Actions */}
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
          borderLeft: '5px solid #1B4332'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileSpreadsheet size={22} color="#1B4332" />
            <h2 className="heading-gold" style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1B4332' }}>
              Attendance Reports &amp; Analytics
            </h2>
          </div>
          <p style={{ color: '#666', fontSize: '0.88rem', marginTop: '2px' }}>
            Comprehensive filtering across date ranges, students, schools, classes, and sessions.
          </p>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }} className="no-print">
          <button 
            onClick={handleExportMasterCSV}
            className="btn-gold"
            style={{ fontSize: '0.88rem', padding: '0.6rem 1.15rem' }}
            title="Download CSV report of filtered records"
          >
            <Download size={16} />
            <span>Export CSV Report</span>
          </button>

          <button 
            onClick={handlePrint}
            className="btn-outline-gold"
            style={{ fontSize: '0.88rem', padding: '0.6rem 1.15rem' }}
            title="Print-friendly Report format"
          >
            <Printer size={16} />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Filter Options Bar */}
      <div 
        className="devotional-card-cream no-print"
        style={{
          padding: '1.25rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '1rem'
        }}
      >
        {/* From Date */}
        <div>
          <label className="form-label">From Date</label>
          <input 
            type="date"
            className="form-input"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
        </div>

        {/* To Date */}
        <div>
          <label className="form-label">To Date</label>
          <input 
            type="date"
            className="form-input"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
        </div>

        {/* School Filter */}
        <div>
          <label className="form-label">Filter by School</label>
          <select 
            className="form-input"
            value={selectedSchool}
            onChange={(e) => setSelectedSchool(e.target.value)}
          >
            <option value="ALL">All Schools</option>
            {schoolsList.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Class Filter */}
        <div>
          <label className="form-label">Filter by Class</label>
          <select 
            className="form-input"
            value={selectedGrade}
            onChange={(e) => setSelectedGrade(e.target.value)}
          >
            <option value="ALL">All Classes</option>
            {gradesList.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>

        {/* Specific Student Filter */}
        <div>
          <label className="form-label">Specific Student</label>
          <select 
            className="form-input"
            value={selectedStudentId}
            onChange={(e) => setSelectedStudentId(e.target.value)}
          >
            <option value="ALL">All Registered Students</option>
            {students.map(s => (
              <option key={s.id} value={s.id}>{s.name} ({s.id})</option>
            ))}
          </select>
        </div>

        {/* Session Status */}
        <div>
          <label className="form-label">Session Status</label>
          <select 
            className="form-input"
            value={sessionStatus}
            onChange={(e) => setSessionStatus(e.target.value)}
          >
            <option value="conducted">Conducted Sessions Only</option>
            <option value="cancelled">Cancelled Only</option>
            <option value="all">All Sessions</option>
          </select>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div 
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '1rem'
        }}
      >
        <div className="devotional-card" style={{ padding: '1rem', borderTop: '3px solid #1B4332' }}>
          <div style={{ fontSize: '0.78rem', color: '#666', fontWeight: 600 }}>Sessions in Range</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#1B4332', marginTop: '4px' }}>
            {summary.sessionCount}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#888' }}>{fromDate} to {toDate}</div>
        </div>

        <div className="devotional-card" style={{ padding: '1rem', borderTop: '3px solid #2D6A4F' }}>
          <div style={{ fontSize: '0.78rem', color: '#666', fontWeight: 600 }}>Total Student Presences</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#2D6A4F', marginTop: '4px' }}>
            {summary.totalPresent}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#2D6A4F', fontWeight: 600 }}>Present attendance marks</div>
        </div>

        <div className="devotional-card" style={{ padding: '1rem', borderTop: '3px solid #C0392B' }}>
          <div style={{ fontSize: '0.78rem', color: '#666', fontWeight: 600 }}>Total Absences</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#C0392B', marginTop: '4px' }}>
            {summary.totalAbsent}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#C0392B', fontWeight: 600 }}>Absent attendance marks</div>
        </div>

        <div className="devotional-card" style={{ padding: '1rem', borderTop: '3px solid #FFD700', background: '#FFFDF0' }}>
          <div style={{ fontSize: '0.78rem', color: '#7A5700', fontWeight: 600 }}>Average Turnout %</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#996515', marginTop: '4px' }}>
            {summary.avgRate}%
          </div>
          <div style={{ fontSize: '0.72rem', color: '#7A5700', fontWeight: 600 }}>Calculated from actual records</div>
        </div>
      </div>

      {/* Filtered Sessions Report Table */}
      <div className="devotional-card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.5rem', background: '#FAF6EE', borderBottom: '1px solid #EFE4CE', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 700, color: '#1B4332', fontSize: '0.95rem' }}>
            Session Registers Breakdown ({filteredSessions.length} sessions)
          </div>
          <span style={{ fontSize: '0.8rem', color: '#666' }}>
            Krishna Kripa Bhagavad Gita Weekend Classes
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ background: '#F8F4EA', borderBottom: '2px solid #EADDC8', color: '#555' }}>
                <th style={{ padding: '0.85rem 1.25rem' }}>Date</th>
                <th style={{ padding: '0.85rem 1.25rem' }}>Day</th>
                <th style={{ padding: '0.85rem 1.25rem' }}>Class Title</th>
                <th style={{ padding: '0.85rem 1.25rem' }}>Class Conductor</th>
                <th style={{ padding: '0.85rem 1.25rem', textAlign: 'center' }}>Present</th>
                <th style={{ padding: '0.85rem 1.25rem', textAlign: 'center' }}>Absent</th>
                <th style={{ padding: '0.85rem 1.25rem', textAlign: 'center' }}>Attendance Rate</th>
                <th style={{ padding: '0.85rem 1.25rem', textAlign: 'center' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredSessions.length > 0 ? (
                filteredSessions.map((session, idx) => {
                  const total = (session.presentCount || 0) + (session.absentCount || 0);
                  const rate = total > 0 ? Math.round(((session.presentCount || 0) / total) * 100) : 0;
                  const conductorName = session.conductedByName || 'Not recorded';

                  return (
                    <tr 
                      key={session.id}
                      style={{ 
                        borderBottom: '1px solid #F0EBE0',
                        background: idx % 2 === 0 ? '#FFFFFF' : '#FCFAF5'
                      }}
                    >
                      <td style={{ padding: '0.85rem 1.25rem', fontWeight: 700, color: '#303030' }}>
                        {session.date}
                      </td>
                      <td style={{ padding: '0.85rem 1.25rem' }}>
                        <span className="badge-weekend">{session.dayOfWeek}</span>
                      </td>
                      <td style={{ padding: '0.85rem 1.25rem' }}>
                        <div style={{ fontWeight: 600, color: '#1B4332' }}>{session.title}</div>
                        {session.topic && <div style={{ fontSize: '0.75rem', color: '#777' }}>{session.topic}</div>}
                      </td>
                      <td style={{ padding: '0.85rem 1.25rem' }}>
                        {session.status === 'conducted' ? (
                          <div>
                            <span 
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                background: conductorName !== 'Not recorded' ? '#FEF3C7' : '#F3F4F6',
                                color: conductorName !== 'Not recorded' ? '#92400E' : '#6B7280',
                                padding: '2px 8px',
                                borderRadius: '10px',
                                fontWeight: 700,
                                fontSize: '0.8rem'
                              }}
                            >
                              <GraduationCap size={12} />
                              <span>{conductorName}</span>
                            </span>
                            {session.attendanceRecordedByName && (
                              <div style={{ fontSize: '0.7rem', color: '#888', marginTop: '2px' }}>
                                Rec: {session.attendanceRecordedByName}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: '#999', fontSize: '0.8rem' }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: '0.85rem 1.25rem', textAlign: 'center', fontWeight: 700, color: '#2D6A4F' }}>
                        {session.status === 'conducted' ? session.presentCount : '-'}
                      </td>
                      <td style={{ padding: '0.85rem 1.25rem', textAlign: 'center', fontWeight: 700, color: '#C0392B' }}>
                        {session.status === 'conducted' ? session.absentCount : '-'}
                      </td>
                      <td style={{ padding: '0.85rem 1.25rem', textAlign: 'center' }}>
                        {session.status === 'conducted' ? (
                          <span style={{ 
                            background: rate >= 80 ? '#D8F3DC' : '#FFF9DB',
                            color: rate >= 80 ? '#1B4332' : '#7A5700',
                            padding: '2px 8px',
                            borderRadius: '10px',
                            fontWeight: 700,
                            fontSize: '0.8rem'
                          }}>
                            {rate}%
                          </span>
                        ) : '-'}
                      </td>
                      <td style={{ padding: '0.85rem 1.25rem', textAlign: 'center' }}>
                        <span className={session.status === 'conducted' ? 'badge-present' : 'badge-absent'}>
                          {session.status === 'conducted' ? 'Conducted' : 'Cancelled'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: '#888' }}>
                    No sessions match the selected date range and filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. STUDENT AI DAILY QUOTA USAGE REPORT (ADMINISTRATOR ONLY) */}
      <div className="devotional-card" style={{ padding: '0', overflow: 'hidden', marginTop: '1rem', borderTop: '4px solid #FF9933' }}>
        <div style={{ padding: '1.25rem 1.5rem', background: '#FAF6EE', borderBottom: '1px solid #EFE4CE', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={20} color="#FF9933" />
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1B4332' }}>
                Student AI Usage Monitoring (5 Questions/Day Strict Limit)
              </h3>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#666', marginTop: '2px' }}>
              Real-time persistent tracking from MongoDB Atlas. Resets daily at midnight IST.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '0.85rem', color: '#1B4332', fontWeight: 700 }}>
              Date: {aiUsageReport?.date || new Date().toISOString().split('T')[0]}
            </span>
            <span style={{ background: '#FEF3C7', color: '#92400E', padding: '3px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 700 }}>
              Total Questions Asked Today: {aiUsageReport?.totalQuestionsToday ?? 0}
            </span>
            <span style={{ background: (aiUsageReport?.limitReachedCount ?? 0) > 0 ? '#FEE2E2' : '#D8F3DC', color: (aiUsageReport?.limitReachedCount ?? 0) > 0 ? '#991B1B' : '#1B4332', padding: '3px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 700 }}>
              At Daily Limit (5/5): {aiUsageReport?.limitReachedCount ?? 0}
            </span>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ background: '#F8F4EA', borderBottom: '2px solid #EADDC8', color: '#555' }}>
                <th style={{ padding: '0.85rem 1.25rem' }}>Student ID</th>
                <th style={{ padding: '0.85rem 1.25rem' }}>Student Full Name</th>
                <th style={{ padding: '0.85rem 1.25rem' }}>Class / Grade</th>
                <th style={{ padding: '0.85rem 1.25rem', textAlign: 'center' }}>Questions Used</th>
                <th style={{ padding: '0.85rem 1.25rem', textAlign: 'center' }}>Questions Remaining</th>
                <th style={{ padding: '0.85rem 1.25rem', textAlign: 'center' }}>Daily Limit Status</th>
              </tr>
            </thead>
            <tbody>
              {aiUsageReport?.breakdown && aiUsageReport.breakdown.length > 0 ? (
                aiUsageReport.breakdown.map((row, idx) => (
                  <tr 
                    key={row.studentId || idx}
                    style={{
                      borderBottom: '1px solid #F0EBE0',
                      background: idx % 2 === 0 ? '#FFFFFF' : '#FCFAF5'
                    }}
                  >
                    <td style={{ padding: '0.85rem 1.25rem', fontWeight: 700, color: '#303030' }}>
                      {row.studentId}
                    </td>
                    <td style={{ padding: '0.85rem 1.25rem', fontWeight: 600, color: '#1B4332' }}>
                      {row.name}
                    </td>
                    <td style={{ padding: '0.85rem 1.25rem' }}>
                      {row.className}
                    </td>
                    <td style={{ padding: '0.85rem 1.25rem', textAlign: 'center', fontWeight: 700, color: row.used >= 5 ? '#C0392B' : '#8B4513' }}>
                      {row.used} / 5
                    </td>
                    <td style={{ padding: '0.85rem 1.25rem', textAlign: 'center', fontWeight: 700, color: row.remaining === 0 ? '#C0392B' : '#2D6A4F' }}>
                      {row.remaining}
                    </td>
                    <td style={{ padding: '0.85rem 1.25rem', textAlign: 'center' }}>
                      {row.isLimitReached ? (
                        <span style={{ background: '#FEE2E2', color: '#991B1B', padding: '3px 10px', borderRadius: '12px', fontSize: '0.78rem', fontWeight: 700 }}>
                          Limit Reached (5/5)
                        </span>
                      ) : (
                        <span style={{ background: '#D8F3DC', color: '#1B4332', padding: '3px 10px', borderRadius: '12px', fontSize: '0.78rem', fontWeight: 700 }}>
                          Active ({row.remaining} Left)
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} style={{ padding: '2.5rem', textAlign: 'center', color: '#888' }}>
                    No student AI questions asked yet today. Daily quota limit is 5 questions per student.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
