import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { DevotionalCrest } from '../../assets/crest';
import { StudentIdCard } from './StudentIdCard';

export const StudentIdCardModal = ({
  isOpen,
  onClose,
  student,
  cardData,
  isAdmin = false,
  onRevoke,
  onReissue,
  isLoading = false
}) => {
  // Lock background scrolling and handle Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div 
      className="student-id-card-modal-backdrop"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.82)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 999999,
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        padding: '2.5rem 1rem'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '1060px',
          margin: 'auto',
          borderRadius: '24px',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.45)',
          animation: 'fadeInUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Dedicated Prominent Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="no-print"
          aria-label="Close Digital ID Card Preview"
          title="Close (Esc)"
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            zIndex: 60,
            background: 'rgba(27, 67, 50, 0.95)',
            color: '#FFD700',
            border: '2px solid #FFD700',
            borderRadius: '50%',
            width: '38px',
            height: '38px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(0,0,0,0.3)',
            transition: 'transform 0.15s ease, background 0.15s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.1)';
            e.currentTarget.style.background = '#0F281E';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.background = 'rgba(27, 67, 50, 0.95)';
          }}
        >
          <X size={20} strokeWidth={2.5} />
        </button>

        {isLoading ? (
          <div 
            style={{ 
              background: '#FFFFFF', 
              padding: '3.5rem 2rem', 
              borderRadius: '24px', 
              textAlign: 'center', 
              border: '1.5px solid #FFD700',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)' 
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
              <DevotionalCrest size={52} />
            </div>
            <p style={{ color: '#1B4332', fontWeight: 800, fontSize: '1.2rem', fontFamily: 'var(--font-heading, serif)' }}>
              Loading Digital Student Card...
            </p>
            <p style={{ color: '#6B7280', fontSize: '0.9rem', marginTop: '4px' }}>
              Fetching verified credentials from database
            </p>
          </div>
        ) : student ? (
          <StudentIdCard 
            student={student}
            cardData={cardData}
            isAdmin={isAdmin}
            onRevoke={onRevoke}
            onReissue={onReissue}
          />
        ) : null}
      </div>
    </div>,
    document.body
  );
};
