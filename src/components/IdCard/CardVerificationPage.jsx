import React, { useState, useEffect } from 'react';
import { apiVerifyStudentCard } from '../../api/apiClient';
import { firestoreGetDoc, firestoreGetAll } from '../../db/firebaseService';
import { idbGetAll, idbGet } from '../../db/indexedDbService';
import { DevotionalCrest } from '../../assets/crest';
import { 
  ShieldCheck, 
  ShieldAlert, 
  AlertCircle, 
  ArrowLeft, 
  CheckCircle2, 
  Calendar, 
  GraduationCap, 
  School, 
  Sparkles,
  Printer
} from 'lucide-react';

export const CardVerificationPage = ({ token, onBack }) => {
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;
    if (!token) {
      setError('No verification token provided.');
      setLoading(false);
      return;
    }

    const trimmedToken = decodeURIComponent(String(token)).trim();

    const verifyStudentLocally = async () => {
      // 1. Check direct Cloud Firestore document
      try {
        let cardDoc = await firestoreGetDoc('studentcards', trimmedToken, 3000).catch(() => null);
        let studentDoc = await firestoreGetDoc('students', trimmedToken, 3000).catch(() => null);
        if (!studentDoc) {
          const allDocs = await firestoreGetAll('students', 3000).catch(() => []);
          studentDoc = (allDocs || []).find(s => 
            s.studentId === trimmedToken || 
            s.id === trimmedToken || 
            s.verificationToken === trimmedToken
          );
        }
        if (studentDoc && !cardDoc) {
          cardDoc = await firestoreGetDoc('studentcards', studentDoc.studentId || studentDoc.id, 3000).catch(() => null);
        }

        const isRevoked = cardDoc?.status === 'revoked' || studentDoc?.cardStatus === 'revoked';
        if (isRevoked) {
          return {
            valid: false,
            status: 'revoked',
            message: 'This student ID card has been REVOKED by Krishna Kripa administration and is no longer valid.',
            revokedAt: cardDoc?.revokedAt || new Date().toISOString(),
            revocationReason: cardDoc?.revocationReason || 'Administrative revocation',
            verifiedAt: new Date().toISOString(),
            student: studentDoc ? {
              studentId: studentDoc.studentId || studentDoc.id,
              name: studentDoc.name,
              className: studentDoc.className || studentDoc.grade || 'Class',
              schoolName: studentDoc.schoolName || studentDoc.school || '',
              registrationDate: studentDoc.registrationDate || '2026-10-20'
            } : null,
            card: {
              status: 'revoked',
              cardVersion: cardDoc?.cardVersion || 1,
              issueDate: cardDoc?.issueDate || studentDoc?.registrationDate || '2026-10-20'
            }
          };
        }

        if (studentDoc) {
          return {
            valid: studentDoc.status !== 'archived',
            status: studentDoc.status || 'active',
            message: 'Official Student Identity Verified — Krishna Kripa Bhagavad Gita Study Circle',
            verifiedAt: new Date().toISOString(),
            student: {
              studentId: studentDoc.studentId || studentDoc.id,
              name: studentDoc.name,
              className: studentDoc.className || studentDoc.grade || 'Class',
              schoolName: studentDoc.schoolName || studentDoc.school || '',
              registrationDate: studentDoc.registrationDate || '2026-10-20'
            },
            card: {
              status: cardDoc?.status || 'active',
              issueDate: cardDoc?.issueDate || studentDoc.registrationDate || '2026-10-20',
              cardVersion: cardDoc?.cardVersion || 1
            }
          };
        }
      } catch (fe) {
        console.warn('[QR Verification] Firestore fallback note:', fe.message);
      }

      // 2. Check IndexedDB
      try {
        let localCard = await idbGet('studentcards', trimmedToken).catch(() => null);
        let localStudent = await idbGet('students', trimmedToken).catch(() => null);
        if (!localStudent) {
          const allLocal = await idbGetAll('students').catch(() => []);
          localStudent = (allLocal || []).find(s => 
            s.studentId === trimmedToken || 
            s.id === trimmedToken || 
            s.verificationToken === trimmedToken
          );
        }
        if (localStudent && !localCard) {
          localCard = await idbGet('studentcards', localStudent.studentId || localStudent.id).catch(() => null);
        }

        const isLocalRevoked = localCard?.status === 'revoked' || localStudent?.cardStatus === 'revoked';
        if (isLocalRevoked) {
          return {
            valid: false,
            status: 'revoked',
            message: 'This student ID card has been REVOKED by Krishna Kripa administration and is no longer valid.',
            revokedAt: localCard?.revokedAt || new Date().toISOString(),
            revocationReason: localCard?.revocationReason || 'Administrative revocation',
            verifiedAt: new Date().toISOString(),
            student: localStudent ? {
              studentId: localStudent.studentId || localStudent.id,
              name: localStudent.name,
              className: localStudent.className || localStudent.grade || 'Class',
              schoolName: localStudent.schoolName || localStudent.school || '',
              registrationDate: localStudent.registrationDate || '2026-10-20'
            } : null,
            card: {
              status: 'revoked',
              cardVersion: localCard?.cardVersion || 1,
              issueDate: localCard?.issueDate || localStudent?.registrationDate || '2026-10-20'
            }
          };
        }

        if (localStudent) {
          return {
            valid: localStudent.status !== 'archived',
            status: localStudent.status || 'active',
            message: 'Official Student Identity Verified — Krishna Kripa Bhagavad Gita Study Circle',
            verifiedAt: new Date().toISOString(),
            student: {
              studentId: localStudent.studentId || localStudent.id,
              name: localStudent.name,
              className: localStudent.className || localStudent.grade || 'Class',
              schoolName: localStudent.schoolName || localStudent.school || '',
              registrationDate: localStudent.registrationDate || '2026-10-20'
            },
            card: {
              status: localCard?.status || 'active',
              issueDate: localCard?.issueDate || localStudent.registrationDate || '2026-10-20',
              cardVersion: localCard?.cardVersion || 1
            }
          };
        }
      } catch (ie) {}

      return null;
    };

    // First attempt API verify with 4s timeout, falling back smoothly to Firestore
    apiVerifyStudentCard(trimmedToken)
      .then(res => {
        if (!isMounted) return;
        // If server explicitly returned status (whether valid or revoked/archived)
        if (res && (res.status === 'revoked' || res.status === 'archived' || res.valid)) {
          setResult(res);
          setLoading(false);
          return;
        }
        // Only if server didn't find the card, check local Firestore / IDB
        verifyStudentLocally().then(localRes => {
          if (!isMounted) return;
          if (localRes) {
            setResult(localRes);
          } else {
            setResult(res);
          }
          setLoading(false);
        });
      })
      .catch(err => {
        console.warn('[QR Verification] API unreachable, falling back to Cloud Firestore:', err.message);
        verifyStudentLocally().then(localRes => {
          if (!isMounted) return;
          if (localRes) {
            setResult(localRes);
            setLoading(false);
          } else {
            setError(err.message || 'Verification server could not be reached.');
            setLoading(false);
          }
        });
      });

    return () => { isMounted = false; };
  }, [token]);

  return (
    <div 
      className="devotional-bg-root"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem'
      }}
    >
      <div 
        style={{
          width: '100%',
          maxWidth: '560px',
          background: 'rgba(255, 255, 255, 0.98)',
          borderRadius: '20px',
          border: '1.5px solid #FFD700',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.3), 0 0 40px rgba(255, 215, 0, 0.25)',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div 
          style={{
            background: 'linear-gradient(135deg, #1B4332 0%, #0d291e 70%, #8B4513 100%)',
            padding: '1.75rem 1.5rem',
            textAlign: 'center',
            color: '#FFF8DC',
            borderBottom: '2px solid #FFD700',
            position: 'relative'
          }}
        >
          {onBack && (
            <button
              onClick={onBack}
              style={{
                position: 'absolute',
                left: '1.25rem',
                top: '1.25rem',
                background: 'rgba(255, 255, 255, 0.15)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                color: '#FFFFFF',
                borderRadius: '8px',
                padding: '6px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.8rem',
                cursor: 'pointer'
              }}
            >
              <ArrowLeft size={14} /> Back
            </button>
          )}

          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.5rem' }}>
            <DevotionalCrest size={48} />
          </div>
          <h1 
            style={{ 
              fontFamily: 'var(--font-heading, "Cinzel", serif)', 
              fontSize: '1.5rem', 
              fontWeight: 800, 
              color: '#FFD700',
              margin: '0.25rem 0'
            }}
          >
            KRISHNA KRIPA
          </h1>
          <p style={{ fontSize: '0.8rem', opacity: 0.9, letterSpacing: '0.04em', margin: 0 }}>
            Official Student ID Card Verification Portal
          </p>
        </div>

        {/* Content Body */}
        <div style={{ padding: '2rem 1.75rem' }}>
          {loading && (
            <div style={{ textAlign: 'center', padding: '2rem 0' }}>
              <div 
                style={{
                  display: 'inline-block',
                  width: '40px',
                  height: '40px',
                  border: '3px solid #E5E7EB',
                  borderTopColor: '#1B4332',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite'
                }} 
              />
              <p style={{ marginTop: '1rem', color: '#4B5563', fontSize: '0.9rem' }}>
                Verifying digital credential against MongoDB Atlas...
              </p>
            </div>
          )}

          {!loading && error && (
            <div 
              style={{
                textAlign: 'center',
                padding: '1.5rem',
                background: '#FEF2F2',
                borderRadius: '12px',
                border: '1px solid #FCA5A5'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'center', color: '#DC2626', marginBottom: '0.75rem' }}>
                <ShieldAlert size={48} />
              </div>
              <h3 style={{ color: '#991B1B', fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                Verification Failed
              </h3>
              <p style={{ color: '#7F1D1D', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
                {error}
              </p>
              {onBack && (
                <button
                  onClick={onBack}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    background: '#1B4332',
                    color: '#FFFFFF',
                    border: 'none',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Return to Main Portal
                </button>
              )}
            </div>
          )}

          {!loading && !error && result && (
            <div>
              {/* Status Header Badge */}
              {result.valid ? (
                <div 
                  style={{
                    background: 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)',
                    border: '1.5px solid #10B981',
                    borderRadius: '12px',
                    padding: '1.25rem',
                    textAlign: 'center',
                    marginBottom: '1.5rem'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'center', color: '#059669', marginBottom: '0.5rem' }}>
                    <ShieldCheck size={44} />
                  </div>
                  <h3 style={{ color: '#065F46', fontSize: '1.25rem', fontWeight: 800, margin: '0 0 0.25rem' }}>
                    AUTHENTIC &amp; ACTIVE CREDENTIAL
                  </h3>
                  <p style={{ color: '#047857', fontSize: '0.85rem', margin: 0 }}>
                    Official verified student of Krishna Kripa Bhagavad Gita Study Circle.
                  </p>
                </div>
              ) : (
                <div 
                  style={{
                    background: '#FEF2F2',
                    border: '1.5px solid #EF4444',
                    borderRadius: '12px',
                    padding: '1.25rem',
                    textAlign: 'center',
                    marginBottom: '1.5rem'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'center', color: '#DC2626', marginBottom: '0.5rem' }}>
                    <ShieldAlert size={44} />
                  </div>
                  <h3 style={{ color: '#991B1B', fontSize: '1.25rem', fontWeight: 800, margin: '0 0 0.25rem' }}>
                    {result.status === 'revoked' ? 'CARD REVOKED' : 'INVALID CARD'}
                  </h3>
                  <p style={{ color: '#B91C1C', fontSize: '0.85rem', margin: 0, fontWeight: 500 }}>
                    {result.message}
                  </p>
                  {result.status === 'revoked' && (
                    <div style={{ marginTop: '0.65rem', paddingTop: '0.5rem', borderTop: '1px dashed #FCA5A5', fontSize: '0.78rem', color: '#7F1D1D' }}>
                      {result.revokedAt && (
                        <div><strong>Revocation Date:</strong> {new Date(result.revokedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</div>
                      )}
                      {result.revocationReason && (
                        <div style={{ marginTop: '2px' }}><strong>Reason:</strong> {result.revocationReason}</div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Student Verified Details Card */}
              {result.student && (
                <div 
                  style={{
                    background: '#F9FAFB',
                    border: '1px solid #E5E7EB',
                    borderRadius: '12px',
                    padding: '1.25rem',
                    marginBottom: '1.5rem'
                  }}
                >
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>
                    Student Information
                  </div>

                  <div style={{ display: 'grid', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#6B7280', fontSize: '0.85rem' }}>Full Name:</span>
                      <span style={{ fontWeight: 700, color: '#111827', fontSize: '1.05rem' }}>{result.student.name}</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#6B7280', fontSize: '0.85rem' }}>Permanent Student ID:</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ 
                          fontFamily: 'monospace', 
                          fontWeight: 700, 
                          color: result.status === 'revoked' ? '#991B1B' : '#1B4332', 
                          background: result.status === 'revoked' ? '#FEE2E2' : '#DCFCE7', 
                          padding: '2px 8px', 
                          borderRadius: '4px',
                          border: result.status === 'revoked' ? '1px solid #FCA5A5' : 'none'
                        }}>
                          {result.student.studentId}
                        </span>
                        {result.status === 'revoked' && (
                          <span style={{ 
                            fontSize: '0.65rem', 
                            fontWeight: 800, 
                            color: '#FFFFFF', 
                            background: '#DC2626', 
                            padding: '2px 6px', 
                            borderRadius: '4px',
                            letterSpacing: '0.04em'
                          }}>
                            REVOKED
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#6B7280', fontSize: '0.85rem' }}>Class / Grade:</span>
                      <span style={{ fontWeight: 600, color: '#374151' }}>{result.student.className}</span>
                    </div>

                    {result.student.schoolName && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#6B7280', fontSize: '0.85rem' }}>School:</span>
                        <span style={{ fontWeight: 600, color: '#374151' }}>{result.student.schoolName}</span>
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#6B7280', fontSize: '0.85rem' }}>Registration Date:</span>
                      <span style={{ color: '#4B5563' }}>{result.student.registrationDate}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Security Privacy Notice */}
              <div 
                style={{
                  fontSize: '0.75rem',
                  color: '#6B7280',
                  lineHeight: 1.5,
                  textAlign: 'center',
                  padding: '0.75rem',
                  background: '#F3F4F6',
                  borderRadius: '8px',
                  marginBottom: '1.5rem'
                }}
              >
                🔒 Security Note: This public verification service verifies official identity and card validity. 
                Private personal numbers and comprehensive attendance logs are safeguarded and never exposed through public QR verification.
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                <button
                  type="button"
                  onClick={() => window.print()}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.65rem 1.25rem',
                    borderRadius: '8px',
                    background: '#FFFFFF',
                    border: '1.5px solid #1B4332',
                    color: '#1B4332',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    cursor: 'pointer'
                  }}
                >
                  <Printer size={16} /> Print Verification Slip
                </button>

                {onBack && (
                  <button
                    type="button"
                    onClick={onBack}
                    style={{
                      padding: '0.65rem 1.25rem',
                      borderRadius: '8px',
                      background: '#1B4332',
                      color: '#FFFFFF',
                      fontWeight: 600,
                      fontSize: '0.9rem',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    Open Krishna Kripa
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
