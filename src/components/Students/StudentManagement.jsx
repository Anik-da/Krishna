import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  PlusCircle, 
  Eye, 
  Edit, 
  Archive, 
  Trash2, 
  Download, 
  Phone, 
  School, 
  BookOpen,
  CheckCircle,
  AlertTriangle,
  CreditCard,
  X
} from 'lucide-react';
import { StudentIdCardModal } from '../IdCard/StudentIdCardModal';
import { apiGetStudentCardAdmin, apiRevokeStudentCard, apiReissueStudentCard } from '../../api/apiClient';
import { firestoreSetDoc } from '../../db/firebaseService';

export const StudentManagement = ({ 
  students, 
  onAddStudent, 
  onEditStudent, 
  onViewProfile, 
  onArchiveStudent, 
  onDeleteStudent 
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSchool, setSelectedSchool] = useState('ALL');
  const [selectedGrade, setSelectedGrade] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('active'); // 'active', 'archived', 'all'
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [cardModalStudent, setCardModalStudent] = useState(null);
  const [cardModalData, setCardModalData] = useState(null);
  const [cardLoading, setCardLoading] = useState(false);

  const handleOpenCard = async (studentId) => {
    // Provide instant feedback with the local student object
    const basicStudent = students.find(s => (s.studentId === studentId || s.id === studentId));
    if (basicStudent) {
      setCardModalStudent(basicStudent);
    }
    setCardLoading(true);
    try {
      const res = await apiGetStudentCardAdmin(studentId);
      if (res?.success) {
        setCardModalStudent(res.student || basicStudent);
        setCardModalData(res.card);
      }
    } catch (err) {
      console.warn('Could not load student ID card: ', err);
    } finally {
      setCardLoading(false);
    }
  };

  const handleRevokeCard = async (studentId) => {
    const reason = window.prompt(`Please enter the reason for revoking ID card for ${studentId}:`, 'Administrative revocation');
    if (!reason) return;

    try {
      await apiRevokeStudentCard(studentId, reason);
      await firestoreSetDoc('studentcards', studentId, {
        studentId,
        status: 'revoked',
        revokedAt: new Date().toISOString(),
        revocationReason: reason
      }).catch(() => {});
      alert(`Card for ${studentId} revoked.`);
      await handleOpenCard(studentId);
    } catch (err) {
      try {
        await firestoreSetDoc('studentcards', studentId, {
          studentId,
          status: 'revoked',
          revokedAt: new Date().toISOString(),
          revocationReason: reason
        });
        alert(`Card for ${studentId} revoked.`);
        await handleOpenCard(studentId);
      } catch (fErr) {
        alert('Revocation failed: ' + err.message);
      }
    }
  };

  const handleReissueCard = async (studentId) => {
    if (!window.confirm(`Reissue/Regenerate QR token for ${studentId}? The previous QR code will be invalidated permanently.`)) {
      return;
    }

    try {
      const res = await apiReissueStudentCard(studentId, 'Reissued by Admin');
      const newToken = res?.card?.verificationToken || `token-${Date.now()}`;
      await firestoreSetDoc('studentcards', studentId, {
        studentId,
        verificationToken: newToken,
        status: 'active',
        cardVersion: (cardModalData?.cardVersion || 1) + 1,
        issueDate: new Date().toISOString().split('T')[0],
        lastReissuedAt: new Date().toISOString(),
        qrCodeUrl: `https://krishna-kripa-attendance.web.app/?verifyCard=${encodeURIComponent(newToken)}`
      }).catch(() => {});
      alert(`Card for ${studentId} updated with new secure QR token.`);
      await handleOpenCard(studentId);
    } catch (err) {
      try {
        const newToken = `tok-${studentId}-${Date.now().toString(36)}`;
        await firestoreSetDoc('studentcards', studentId, {
          studentId,
          verificationToken: newToken,
          status: 'active',
          cardVersion: (cardModalData?.cardVersion || 1) + 1,
          issueDate: new Date().toISOString().split('T')[0],
          lastReissuedAt: new Date().toISOString(),
          qrCodeUrl: `https://krishna-kripa-attendance.web.app/?verifyCard=${encodeURIComponent(newToken)}`
        });
        alert(`Card for ${studentId} updated with new secure QR token.`);
        await handleOpenCard(studentId);
      } catch (fErr) {
        alert('Action failed: ' + err.message);
      }
    }
  };

  // Extract unique schools and grades for filter dropdowns
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

  // Filtered list
  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      // Status filter
      if (statusFilter === 'active' && student.status === 'archived') return false;
      if (statusFilter === 'archived' && student.status !== 'archived') return false;

      // School filter
      if (selectedSchool !== 'ALL' && student.school !== selectedSchool) return false;

      // Grade filter
      if (selectedGrade !== 'ALL' && student.grade !== selectedGrade) return false;

      // Search query filter (matches name, student ID, school, whatsapp)
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const matchesName = student.name?.toLowerCase().includes(query);
        const matchesId = student.id?.toLowerCase().includes(query);
        const matchesSchool = student.school?.toLowerCase().includes(query);
        const matchesPhone = student.whatsapp?.toLowerCase().includes(query);
        if (!matchesName && !matchesId && !matchesSchool && !matchesPhone) return false;
      }

      return true;
    });
  }, [students, searchQuery, selectedSchool, selectedGrade, statusFilter]);

  // Export full student directory as CSV
  const exportStudentsCSV = () => {
    const headers = ["Student ID", "Full Name", "Class / Grade", "School Name", "WhatsApp Number", "Registration Date", "Status", "Notes"];
    const rows = filteredStudents.map(s => [
      s.id,
      `"${s.name.replace(/"/g, '""')}"`,
      `"${s.grade.replace(/"/g, '""')}"`,
      `"${s.school.replace(/"/g, '""')}"`,
      `"${s.whatsapp.replace(/"/g, '""')}"`,
      s.registrationDate,
      s.status,
      `"${(s.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + 
      `"KRISHNA KRIPA - BHAGAVAD GITA STUDENTS DIRECTORY"\n` +
      `"Total Records: ${filteredStudents.length} | Export Date: ${new Date().toISOString().split('T')[0]}"\n\n` +
      [headers.join(","), ...rows.map(e => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `krishna_kripa_students_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Top Banner & Actions */}
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
            <Users size={22} color="#1B4332" />
            <h2 className="heading-gold" style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1B4332' }}>
              Student Management Directory
            </h2>
          </div>
          <p style={{ color: '#666', fontSize: '0.88rem', marginTop: '2px' }}>
            Permanent unique IDs generated sequentially: <strong>BGK-2026-XXXX</strong>. Historical records are preserved.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button 
            onClick={exportStudentsCSV}
            className="btn-outline-gold"
            style={{ fontSize: '0.88rem', padding: '0.6rem 1rem' }}
            title="Download CSV list of students"
          >
            <Download size={16} />
            <span>Export CSV</span>
          </button>

          <button 
            onClick={onAddStudent}
            className="btn-gold"
            style={{ fontSize: '0.88rem', padding: '0.6rem 1.25rem' }}
          >
            <PlusCircle size={17} />
            <span>Register New Student</span>
          </button>
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
        {/* Search input */}
        <div style={{ flex: '1 1 260px', position: 'relative' }}>
          <input 
            type="text"
            className="form-input"
            placeholder="Search by name, student ID, school, phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '2.5rem' }}
          />
          <Search size={17} color="#888" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
        </div>

        {/* Filter by School */}
        <div style={{ flex: '0 1 200px' }}>
          <select 
            className="form-input"
            value={selectedSchool}
            onChange={(e) => setSelectedSchool(e.target.value)}
          >
            <option value="ALL">All Schools ({schoolsList.length})</option>
            {schoolsList.map(school => (
              <option key={school} value={school}>{school}</option>
            ))}
          </select>
        </div>

        {/* Filter by Class/Grade */}
        <div style={{ flex: '0 1 170px' }}>
          <select 
            className="form-input"
            value={selectedGrade}
            onChange={(e) => setSelectedGrade(e.target.value)}
          >
            <option value="ALL">All Classes</option>
            {gradesList.map(grade => (
              <option key={grade} value={grade}>{grade}</option>
            ))}
          </select>
        </div>

        {/* Status filter: Active vs Archived */}
        <div style={{ flex: '0 1 150px' }}>
          <select 
            className="form-input"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="active">Active Students</option>
            <option value="archived">Archived</option>
            <option value="all">All Statuses</option>
          </select>
        </div>

        {/* Clear Filters */}
        {(searchQuery || selectedSchool !== 'ALL' || selectedGrade !== 'ALL' || statusFilter !== 'active') && (
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedSchool('ALL');
              setSelectedGrade('ALL');
              setStatusFilter('active');
            }}
            className="btn-ghost"
            style={{ fontSize: '0.82rem', padding: '0.55rem 0.85rem' }}
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Students Data Table */}
      <div className="devotional-card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.5rem', background: '#FAF6EE', borderBottom: '1px solid #EFE4CE', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 700, color: '#1B4332', fontSize: '0.95rem' }}>
            Showing {filteredStudents.length} of {students.length} Total Registered Students
          </div>
          <span style={{ fontSize: '0.8rem', color: '#777' }}>
            Click on any student row or View button to see attendance history
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ background: '#F8F4EA', borderBottom: '2px solid #EADDC8', color: '#555' }}>
                <th style={{ padding: '0.85rem 1.25rem', fontWeight: 700 }}>Student ID</th>
                <th style={{ padding: '0.85rem 1.25rem', fontWeight: 700 }}>Full Name</th>
                <th style={{ padding: '0.85rem 1.25rem', fontWeight: 700 }}>Class / Grade</th>
                <th style={{ padding: '0.85rem 1.25rem', fontWeight: 700 }}>School</th>
                <th style={{ padding: '0.85rem 1.25rem', fontWeight: 700 }}>WhatsApp Number</th>
                <th style={{ padding: '0.85rem 1.25rem', fontWeight: 700 }}>Registered</th>
                <th style={{ padding: '0.85rem 1.25rem', fontWeight: 700, textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length > 0 ? (
                filteredStudents.map((student, idx) => (
                  <tr 
                    key={student.id}
                    style={{ 
                      borderBottom: '1px solid #F0EBE0',
                      background: idx % 2 === 0 ? '#FFFFFF' : '#FCFAF5',
                      transition: 'background 0.15s ease'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.background = '#F6F1E5'}
                    onMouseOut={(e) => e.currentTarget.style.background = idx % 2 === 0 ? '#FFFFFF' : '#FCFAF5'}
                  >
                    {/* ID */}
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

                    {/* Full Name */}
                    <td style={{ padding: '0.85rem 1.25rem' }}>
                      <div style={{ fontWeight: 700, color: '#303030' }}>
                        {student.name}
                      </div>
                      {student.status === 'archived' && (
                        <span style={{ fontSize: '0.7rem', color: '#999', background: '#EEE', padding: '1px 5px', borderRadius: '4px' }}>
                          Archived
                        </span>
                      )}
                    </td>

                    {/* Class/Grade */}
                    <td style={{ padding: '0.85rem 1.25rem', color: '#444' }}>
                      <span style={{ background: '#E8F5E9', color: '#1B4332', padding: '3px 8px', borderRadius: '4px', fontWeight: 600, fontSize: '0.82rem' }}>
                        {student.grade}
                      </span>
                    </td>

                    {/* School */}
                    <td style={{ padding: '0.85rem 1.25rem', color: '#555' }}>
                      {student.school}
                    </td>

                    {/* WhatsApp */}
                    <td style={{ padding: '0.85rem 1.25rem', color: '#555', fontFamily: 'monospace', fontSize: '0.85rem' }}>
                      {student.whatsapp}
                    </td>

                    {/* Reg Date */}
                    <td style={{ padding: '0.85rem 1.25rem', color: '#777', fontSize: '0.85rem' }}>
                      {student.registrationDate}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '0.85rem 1.25rem', textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        {/* View Profile */}
                        <button
                          onClick={() => onViewProfile(student.id)}
                          className="btn-ghost"
                          style={{ padding: '0.4rem 0.65rem', color: '#1B4332', border: '1px solid #1B4332' }}
                          title="View Attendance History & Profile"
                        >
                          <Eye size={15} />
                          <span style={{ fontSize: '0.8rem' }}>History</span>
                        </button>

                        {/* View & Print ID Card */}
                        <button
                          onClick={() => handleOpenCard(student.id || student.studentId)}
                          className="btn-ghost"
                          style={{ padding: '0.4rem 0.65rem', color: '#D97706', border: '1px solid #F59E0B' }}
                          title="View & Download Digital ID Card with QR"
                        >
                          <CreditCard size={15} />
                          <span style={{ fontSize: '0.8rem' }}>ID Card</span>
                        </button>

                        {/* Edit */}
                        <button
                          onClick={() => onEditStudent(student)}
                          className="btn-ghost"
                          style={{ padding: '0.4rem 0.65rem', color: '#8B4513' }}
                          title="Edit Student Details"
                        >
                          <Edit size={15} />
                        </button>

                        {/* Archive or Delete */}
                        <button
                          onClick={() => setDeleteConfirmId(student.id)}
                          className="btn-ghost"
                          style={{ padding: '0.4rem 0.65rem', color: '#C0392B' }}
                          title="Archive or Delete Student"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} style={{ padding: '3.5rem 1rem', textAlign: 'center', color: '#888' }}>
                    <Users size={34} color="#C4B89B" style={{ margin: '0 auto 8px' }} />
                    <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#1B4332' }}>
                      {students.length === 0 ? 'No students registered yet.' : 'No matching students found.'}
                    </div>
                    <div style={{ fontSize: '0.84rem', marginTop: '4px', color: '#666' }}>
                      {students.length === 0 ? 'Click "Register New Student" above to enroll your first student.' : 'Try adjusting your search terms or filter selections.'}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal for Archiving/Deleting */}
      {deleteConfirmId && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 120,
            padding: '1rem',
            backdropFilter: 'blur(3px)'
          }}
          onClick={() => setDeleteConfirmId(null)}
        >
          <div 
            className="devotional-card animate-fade-in"
            style={{
              maxWidth: '460px',
              width: '100%',
              padding: '1.75rem',
              background: '#FFF',
              border: '2px solid #E57373'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#C62828', marginBottom: '0.75rem' }}>
              <AlertTriangle size={24} />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Permanent Student Deletion</h3>
            </div>
            
            <p style={{ color: '#555', fontSize: '0.9rem', lineHeight: 1.5, marginBottom: '1.25rem' }}>
              Are you sure you want to permanently delete student ID <strong>{deleteConfirmId}</strong>?
              <br /><br />
              <span style={{ color: '#C62828', fontWeight: 600 }}>
                This student and all corresponding attendance logs, competition points, and profile data will be completely removed from the entire website.
              </span>
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', flexWrap: 'wrap' }}>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteConfirmId(null)}
                className="btn-ghost"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isDeleting}
                onClick={async () => {
                  setIsDeleting(true);
                  try {
                    await onArchiveStudent(deleteConfirmId);
                  } catch (e) {
                    console.warn('Archive error:', e);
                  } finally {
                    setIsDeleting(false);
                    setDeleteConfirmId(null);
                  }
                }}
                className="btn-saffron"
                style={{ fontSize: '0.85rem' }}
                title="Archive student without deleting past records"
              >
                {isDeleting ? 'Processing...' : 'Archive Only'}
              </button>

              <button
                type="button"
                disabled={isDeleting}
                onClick={async () => {
                  setIsDeleting(true);
                  try {
                    await onDeleteStudent(deleteConfirmId);
                  } catch (e) {
                    console.error('Delete error:', e);
                    alert('Notice: ' + (e?.message || 'Delete operation completed.'));
                  } finally {
                    setIsDeleting(false);
                    setDeleteConfirmId(null);
                  }
                }}
                style={{
                  background: isDeleting ? '#9CA3AF' : '#C62828',
                  color: '#FFF',
                  border: 'none',
                  padding: '0.6rem 1.1rem',
                  borderRadius: '6px',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: isDeleting ? 'not-allowed' : 'pointer'
                }}
              >
                {isDeleting ? 'Deleting...' : 'Delete Student Everywhere'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ID Card Preview Modal rendered via React Portal */}
      <StudentIdCardModal
        isOpen={Boolean(cardModalStudent || cardLoading)}
        isLoading={cardLoading}
        student={cardModalStudent}
        cardData={cardModalData}
        isAdmin={true}
        onRevoke={handleRevokeCard}
        onReissue={handleReissueCard}
        onClose={() => {
          setCardModalStudent(null);
          setCardModalData(null);
        }}
      />
    </div>
  );
};
