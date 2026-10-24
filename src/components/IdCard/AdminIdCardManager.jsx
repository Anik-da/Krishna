import React, { useState, useEffect } from 'react';
import { 
  apiListStudentCardsAdmin, 
  apiGetStudentCardAdmin,
  apiRevokeStudentCard, 
  apiReissueStudentCard, 
  apiBulkGenerateCards 
} from '../../api/apiClient';
import { StudentIdCardModal } from './StudentIdCardModal';
import { 
  Search, 
  CreditCard, 
  CheckCircle, 
  AlertTriangle, 
  RefreshCw, 
  Eye, 
  ShieldCheck, 
  ShieldAlert, 
  X,
  Filter,
  Sparkles,
  Download
} from 'lucide-react';

export const AdminIdCardManager = () => {
  const [cardsList, setCardsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  
  // Modal Preview State
  const [previewStudent, setPreviewStudent] = useState(null);
  const [previewCardData, setPreviewCardData] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Bulk action state
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [bulkResultMsg, setBulkResultMsg] = useState('');

  const loadCards = async () => {
    setLoading(true);
    try {
      const res = await apiListStudentCardsAdmin({
        q: searchQuery,
        className: classFilter,
        status: statusFilter
      });
      if (res?.success) {
        setCardsList(res.data || []);
      }
    } catch (err) {
      console.error('Failed to load card records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCards();
  }, [classFilter, statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadCards();
  };

  // Open Preview Modal
  const handleOpenPreview = async (studentId) => {
    setIsPreviewOpen(true);
    setPreviewLoading(true);
    try {
      const res = await apiGetStudentCardAdmin(studentId);
      if (res?.success) {
        setPreviewStudent(res.student);
        setPreviewCardData(res.card);
      }
    } catch (err) {
      alert('Failed to load student card: ' + err.message);
      setIsPreviewOpen(false);
    } finally {
      setPreviewLoading(false);
    }
  };

  // Revoke Action
  const handleRevoke = async (studentId) => {
    const reason = window.prompt(`Please enter the reason for revoking ID card for ${studentId}:`, 'Administrative revocation');
    if (!reason) return;

    try {
      await apiRevokeStudentCard(studentId, reason);
      alert(`Card for ${studentId} revoked.`);
      loadCards();
      if (previewStudent?.studentId === studentId) {
        handleOpenPreview(studentId);
      }
    } catch (err) {
      alert('Revocation failed: ' + err.message);
    }
  };

  // Reissue Action
  const handleReissue = async (studentId) => {
    if (!window.confirm(`Reissue a brand new ID card for ${studentId}? The previous verification token will be invalidated permanently.`)) {
      return;
    }

    try {
      await apiReissueStudentCard(studentId, 'Reissued by Admin');
      alert(`Card for ${studentId} reissued with new secure QR token.`);
      loadCards();
      if (previewStudent?.studentId === studentId) {
        handleOpenPreview(studentId);
      }
    } catch (err) {
      alert('Reissue failed: ' + err.message);
    }
  };

  // Bulk Generate Action for all existing students
  const handleBulkGenerate = async () => {
    if (!window.confirm('Generate digital ID cards for all active students who do not yet have one in MongoDB Atlas? Existing student attendance, points, and records will NOT be modified.')) {
      return;
    }

    setBulkProcessing(true);
    setBulkResultMsg('');
    try {
      const res = await apiBulkGenerateCards();
      setBulkResultMsg(res.message || 'Bulk generation complete.');
      await loadCards();
    } catch (err) {
      alert('Bulk generation failed: ' + err.message);
    } finally {
      setBulkProcessing(false);
    }
  };

  // Calculated Stats
  const total = cardsList.length;
  const activeCount = cardsList.filter(c => c.cardStatus === 'active').length;
  const revokedCount = cardsList.filter(c => c.cardStatus === 'revoked').length;
  const unissuedCount = cardsList.filter(c => c.cardStatus === 'not_generated').length;

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
      
      {/* Top Banner */}
      <div 
        style={{
          background: 'linear-gradient(135deg, #1B4332 0%, #0d291e 60%, #8B4513 100%)',
          borderRadius: '16px',
          padding: '1.75rem 2rem',
          color: '#FFF8DC',
          border: '1.5px solid #FFD700',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.25)',
          marginBottom: '2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <CreditCard size={24} color="#FFD700" />
            <span style={{ fontSize: '0.85rem', color: '#FFD700', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              IDENTITY MANAGEMENT
            </span>
          </div>
          <h2 style={{ fontFamily: 'var(--font-heading, "Cinzel", serif)', fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.25rem' }}>
            Digital Student ID Cards &amp; QR Codes
          </h2>
          <p style={{ opacity: 0.85, fontSize: '0.9rem', margin: 0, maxWidth: '600px' }}>
            Issue, verify, download, and manage tamper-proof ID credentials with revocable QR tokens in MongoDB Atlas.
          </p>
        </div>

        {/* Bulk Generate Action Button */}
        <div>
          <button
            type="button"
            onClick={handleBulkGenerate}
            disabled={bulkProcessing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              padding: '0.75rem 1.25rem',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #FFD700 0%, #F59E0B 100%)',
              color: '#1B4332',
              fontWeight: 700,
              fontSize: '0.9rem',
              border: 'none',
              cursor: bulkProcessing ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 15px rgba(245, 158, 11, 0.35)'
            }}
          >
            <RefreshCw size={16} className={bulkProcessing ? 'animate-spin' : ''} />
            {bulkProcessing ? 'Generating Cards...' : 'Bulk Generate All Cards'}
          </button>
        </div>
      </div>

      {bulkResultMsg && (
        <div 
          style={{
            background: '#ECFDF5',
            border: '1px solid #10B981',
            borderRadius: '10px',
            padding: '1rem 1.25rem',
            color: '#065F46',
            marginBottom: '1.5rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <CheckCircle size={18} />
          {bulkResultMsg}
        </div>
      )}

      {/* Metrics Counter Cards */}
      <div 
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem'
        }}
      >
        <div style={{ background: '#FFFFFF', padding: '1.25rem', borderRadius: '12px', border: '1px solid #E5E7EB', boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '0.8rem', color: '#6B7280', fontWeight: 600 }}>TOTAL STUDENTS</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#111827', marginTop: '0.25rem' }}>{total}</div>
        </div>

        <div style={{ background: '#FFFFFF', padding: '1.25rem', borderRadius: '12px', border: '1px solid #E5E7EB', boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '0.8rem', color: '#059669', fontWeight: 600 }}>ACTIVE ID CARDS</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#059669', marginTop: '0.25rem' }}>{activeCount}</div>
        </div>

        <div style={{ background: '#FFFFFF', padding: '1.25rem', borderRadius: '12px', border: '1px solid #E5E7EB', boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '0.8rem', color: '#DC2626', fontWeight: 600 }}>REVOKED CARDS</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#DC2626', marginTop: '0.25rem' }}>{revokedCount}</div>
        </div>

        <div style={{ background: '#FFFFFF', padding: '1.25rem', borderRadius: '12px', border: '1px solid #E5E7EB', boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '0.8rem', color: '#D97706', fontWeight: 600 }}>PENDING GENERATION</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#D97706', marginTop: '0.25rem' }}>{unissuedCount}</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div 
        style={{
          background: '#FFFFFF',
          borderRadius: '12px',
          padding: '1rem 1.25rem',
          border: '1px solid #E5E7EB',
          marginBottom: '1.5rem',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1rem',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.5rem', flex: '1', minWidth: '260px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
            <input
              type="text"
              placeholder="Search by student name, ID, or school..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem 0.5rem 2.25rem',
                borderRadius: '8px',
                border: '1px solid #D1D5DB',
                fontSize: '0.9rem'
              }}
            />
          </div>
          <button
            type="submit"
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              background: '#1B4332',
              color: '#FFFFFF',
              border: 'none',
              fontWeight: 600,
              fontSize: '0.9rem',
              cursor: 'pointer'
            }}
          >
            Search
          </button>
        </form>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.85rem', color: '#6B7280', fontWeight: 600 }}>Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '0.5rem 0.75rem',
              borderRadius: '8px',
              border: '1px solid #D1D5DB',
              fontSize: '0.85rem',
              background: '#FFFFFF'
            }}
          >
            <option value="ALL">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="revoked">Revoked Only</option>
          </select>
        </div>
      </div>

      {/* Student Cards Data Table */}
      <div 
        style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #E5E7EB',
          boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
          overflow: 'hidden'
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB', color: '#4B5563', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <th style={{ padding: '0.85rem 1.25rem' }}>Student Name</th>
                <th style={{ padding: '0.85rem 1.25rem' }}>Permanent ID</th>
                <th style={{ padding: '0.85rem 1.25rem' }}>Class / Grade</th>
                <th style={{ padding: '0.85rem 1.25rem' }}>School</th>
                <th style={{ padding: '0.85rem 1.25rem' }}>Card Status</th>
                <th style={{ padding: '0.85rem 1.25rem' }}>Issue Date</th>
                <th style={{ padding: '0.85rem 1.25rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ padding: '2.5rem', textAlign: 'center', color: '#6B7280' }}>
                    Loading student cards from MongoDB Atlas...
                  </td>
                </tr>
              ) : cardsList.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ padding: '2.5rem', textAlign: 'center', color: '#6B7280' }}>
                    No students found matching your criteria.
                  </td>
                </tr>
              ) : (
                cardsList.map((item) => (
                  <tr 
                    key={item.studentId} 
                    style={{ borderBottom: '1px solid #F3F4F6', transition: 'background 0.15s ease' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#F9FAFB'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '0.85rem 1.25rem', fontWeight: 600, color: '#111827' }}>
                      {item.name}
                    </td>
                    <td style={{ padding: '0.85rem 1.25rem', fontFamily: 'monospace', fontWeight: 700, color: '#1B4332' }}>
                      {item.studentId}
                    </td>
                    <td style={{ padding: '0.85rem 1.25rem', color: '#374151' }}>
                      {item.className}
                    </td>
                    <td style={{ padding: '0.85rem 1.25rem', color: '#6B7280', fontSize: '0.85rem' }}>
                      {item.schoolName || '—'}
                    </td>
                    <td style={{ padding: '0.85rem 1.25rem' }}>
                      {item.cardStatus === 'active' && (
                        <span style={{ background: '#DCFCE7', color: '#166534', padding: '3px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <ShieldCheck size={12} /> Active
                        </span>
                      )}
                      {item.cardStatus === 'revoked' && (
                        <span style={{ background: '#FEE2E2', color: '#991B1B', padding: '3px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <ShieldAlert size={12} /> Revoked
                        </span>
                      )}
                      {item.cardStatus === 'not_generated' && (
                        <span style={{ background: '#FEF3C7', color: '#92400E', padding: '3px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}>
                          Auto-on-view
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '0.85rem 1.25rem', color: '#6B7280', fontSize: '0.85rem' }}>
                      {item.issueDate || '—'}
                    </td>
                    <td style={{ padding: '0.85rem 1.25rem', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.5rem', alignItems: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleOpenPreview(item.studentId)}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '6px',
                            background: '#1B4332',
                            color: '#FFFFFF',
                            border: 'none',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            cursor: 'pointer'
                          }}
                        >
                          <Eye size={12} /> Preview &amp; Print
                        </button>

                        {item.cardStatus === 'active' ? (
                          <button
                            type="button"
                            onClick={() => handleRevoke(item.studentId)}
                            style={{
                              padding: '4px 8px',
                              borderRadius: '6px',
                              background: '#FEE2E2',
                              color: '#991B1B',
                              border: '1px solid #F87171',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            Revoke
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleReissue(item.studentId)}
                            style={{
                              padding: '4px 8px',
                              borderRadius: '6px',
                              background: '#DCFCE7',
                              color: '#166534',
                              border: '1px solid #86EFAC',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            Reissue
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Card Preview Modal rendered via React Portal */}
      <StudentIdCardModal
        isOpen={isPreviewOpen}
        isLoading={previewLoading}
        student={previewStudent}
        cardData={previewCardData}
        isAdmin={true}
        onRevoke={handleRevoke}
        onReissue={handleReissue}
        onClose={() => {
          setIsPreviewOpen(false);
          setPreviewStudent(null);
          setPreviewCardData(null);
        }}
      />

    </div>
  );
};
