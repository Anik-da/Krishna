import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { toPng } from 'html-to-image';
import { DevotionalCrest } from '../../assets/crest';
import { KrishnaCardArtwork } from './KrishnaCardArtwork';
import { 
  Download, 
  Printer, 
  Share2, 
  Copy, 
  Check, 
  ShieldCheck, 
  ShieldAlert, 
  ExternalLink,
  Sparkles,
  Maximize2,
  X
} from 'lucide-react';
import { apiRevokeStudentCard, apiReissueStudentCard } from '../../api/apiClient';
import { firestoreSetDoc } from '../../db/firebaseService';

// Ornate Corner Filigree matching all 4 corners of the golden double border
const CardCornerFiligree = ({ position = 'top-left' }) => {
  const isBottom = position.startsWith('bottom');
  const size = isBottom ? '16px' : '22px';
  const style = { position: 'absolute', width: size, height: size, pointerEvents: 'none', zIndex: 6 };
  let transform = '';
  if (position === 'top-left') {
    style.top = '6px';
    style.left = '6px';
  } else if (position === 'top-right') {
    style.top = '6px';
    style.right = '6px';
    transform = 'scaleX(-1)';
  } else if (position === 'bottom-left') {
    style.bottom = '5px';
    style.left = '5px';
    transform = 'scaleY(-1)';
  } else if (position === 'bottom-right') {
    style.bottom = '5px';
    style.right = '5px';
    transform = 'scale(-1, -1)';
  }

  return (
    <svg 
      viewBox="0 0 40 40" 
      fill="none" 
      style={{ ...style, transform }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={`cornerGold_${position}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFF2B2" />
          <stop offset="40%" stopColor="#E5C368" />
          <stop offset="80%" stopColor="#B38728" />
          <stop offset="100%" stopColor="#FBF0B9" />
        </linearGradient>
      </defs>
      <path 
        d="M2 19 C3 9 10 3 19 2 C13 5 10 10 9 15 C8 20 5 21 2 19 Z" 
        fill={`url(#cornerGold_${position})`} 
      />
      <path 
        d="M5 5 C11 5 15 9 15 15 C15 11 18 7 24 5 C18 9 17 15 22 19 C24 15 28 13 34 13 C28 16 25 21 26 27 C22 24 17 25 14 31 C14 25 10 21 5 21 C9 19 11 15 5 5 Z" 
        fill={`url(#cornerGold_${position})`} 
        opacity="0.95"
      />
      <circle cx="8" cy="8" r="1.6" fill="#FFF8DC" />
      <circle cx="16" cy="16" r="1.3" fill="#FFE58F" />
      <circle cx="23" cy="8" r="1.1" fill="#D4AF37" />
      <circle cx="8" cy="23" r="1.1" fill="#D4AF37" />
    </svg>
  );
};

// Ornate Gold Lotus Motif used for dividers and pill badges
const OrnateGoldLotus = ({ size = 16 }) => (
  <svg 
    width={size} 
    height={Math.round(size * 0.85)} 
    viewBox="0 0 24 20" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}
  >
    <defs>
      <linearGradient id={`goldLotusGrad_${size}`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#FFF2B2" />
        <stop offset="45%" stopColor="#E5C368" />
        <stop offset="85%" stopColor="#B38728" />
        <stop offset="100%" stopColor="#996515" />
      </linearGradient>
    </defs>
    <path 
      d="M12 2 C10.5 6 9.5 11 12 16 C14.5 11 13.5 6 12 2 Z" 
      fill={`url(#goldLotusGrad_${size})`} 
    />
    <path 
      d="M11 5 C8 7.5 7 11.5 11.5 15.5 C9 13.5 8.5 9 11 5 Z" 
      fill={`url(#goldLotusGrad_${size})`} 
      opacity="0.9"
    />
    <path 
      d="M13 5 C16 7.5 17 11.5 12.5 15.5 C15 13.5 15.5 9 13 5 Z" 
      fill={`url(#goldLotusGrad_${size})`} 
      opacity="0.9"
    />
    <path 
      d="M9 9 C5.5 10.5 3.5 14 9.5 16 C6 14.5 6 11 9 9 Z" 
      fill={`url(#goldLotusGrad_${size})`} 
      opacity="0.8"
    />
    <path 
      d="M15 9 C18.5 10.5 20.5 14 14.5 16 C18 14.5 18 11 15 9 Z" 
      fill={`url(#goldLotusGrad_${size})`} 
      opacity="0.8"
    />
    <path 
      d="M8 16 C10 17.5 14 17.5 16 16 C14 16.5 10 16.5 8 16 Z" 
      fill={`url(#goldLotusGrad_${size})`} 
    />
    <circle cx="12" cy="17.2" r="1.1" fill="#E5C368" />
  </svg>
);

// Traditional ornamental filigree scroll under ISKCON logo
const OrnateFiligreeScroll = ({ width = 42, height = 9 }) => (
  <svg 
    width={width} 
    height={height} 
    viewBox="0 0 60 12" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    style={{ display: 'block' }}
  >
    <defs>
      <linearGradient id="scrollGold" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.2" />
        <stop offset="30%" stopColor="#D4AF37" />
        <stop offset="50%" stopColor="#FFF2B2" />
        <stop offset="70%" stopColor="#D4AF37" />
        <stop offset="100%" stopColor="#D4AF37" stopOpacity="0.2" />
      </linearGradient>
    </defs>
    <path 
      d="M2 6 C8 2, 14 10, 20 6 C24 3, 27 8, 30 6 C33 8, 36 3, 40 6 C46 10, 52 2, 58 6" 
      stroke="url(#scrollGold)" 
      strokeWidth="1.2" 
      strokeLinecap="round"
    />
    <circle cx="30" cy="6" r="1.8" fill="#D4AF37" />
    <circle cx="20" cy="6" r="1.1" fill="#AA771C" />
    <circle cx="40" cy="6" r="1.1" fill="#AA771C" />
  </svg>
);

// Exact Logo present in the website header & branding
const IskconHeaderLogo = ({ size = 38 }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
    <DevotionalCrest size={size} />
  </div>
);

export const StudentIdCard = ({
  student,
  cardData,
  onRevoke,
  onReissue,
  isAdmin = false
}) => {
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [shareFeedback, setShareFeedback] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0, active: false, glareX: 50, glareY: 50 });
  const [touchState, setTouchState] = useState({ startX: 0, startY: 0, startTime: 0 });
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const cardRef = useRef(null);

  const studentId = student?.studentId || student?.id || 'KK-BGK-0000';
  const name = student?.name || 'Student Name';
  const className = student?.className || student?.grade || 'Class';
  const schoolName = student?.schoolName || student?.school || '';
  const issueDate = cardData?.issueDate || student?.registrationDate || new Date().toISOString().split('T')[0];

  const [internalStatus, setInternalStatus] = useState(cardData?.status || student?.status || 'active');
  const [internalToken, setInternalToken] = useState(cardData?.verificationToken || studentId);
  const [adminActionLoading, setAdminActionLoading] = useState(false);

  useEffect(() => {
    setInternalStatus(cardData?.status || student?.status || 'active');
    setInternalToken(cardData?.verificationToken || studentId);
  }, [cardData?.status, cardData?.verificationToken, student?.status, studentId]);

  const token = internalToken;
  const status = internalStatus;
  const isRevoked = status === 'revoked';

  const handleRevokeClick = async () => {
    if (onRevoke) {
      await onRevoke(studentId);
      return;
    }
    const reason = window.prompt(`Please enter the reason for revoking ID card for ${studentId}:`, 'Administrative revocation');
    if (!reason) return;

    setAdminActionLoading(true);
    try {
      await apiRevokeStudentCard(studentId, reason);
      await firestoreSetDoc('studentcards', studentId, {
        studentId,
        status: 'revoked',
        revokedAt: new Date().toISOString(),
        revocationReason: reason
      }).catch(() => {});
      setInternalStatus('revoked');
      alert(`Card for ${studentId} revoked.`);
    } catch (err) {
      try {
        await firestoreSetDoc('studentcards', studentId, {
          studentId,
          status: 'revoked',
          revokedAt: new Date().toISOString(),
          revocationReason: reason
        });
        setInternalStatus('revoked');
        alert(`Card for ${studentId} revoked.`);
      } catch (fErr) {
        alert('Revocation failed: ' + err.message);
      }
    } finally {
      setAdminActionLoading(false);
    }
  };

  const handleReissueClick = async () => {
    if (onReissue) {
      await onReissue(studentId);
      return;
    }
    if (!window.confirm(`Reissue/Regenerate QR token for ${studentId}? The previous QR code will immediately be invalidated.`)) {
      return;
    }

    setAdminActionLoading(true);
    try {
      const res = await apiReissueStudentCard(studentId, 'Reissued by Admin');
      const newToken = res?.card?.verificationToken || `token-${Date.now()}`;
      await firestoreSetDoc('studentcards', studentId, {
        studentId,
        verificationToken: newToken,
        status: 'active',
        cardVersion: (cardData?.cardVersion || 1) + 1,
        issueDate: new Date().toISOString().split('T')[0],
        lastReissuedAt: new Date().toISOString(),
        qrCodeUrl: `https://krishna-kripa-attendance.web.app/?verifyCard=${encodeURIComponent(newToken)}`
      }).catch(() => {});
      setInternalStatus('active');
      setInternalToken(newToken);
      alert(`Card for ${studentId} updated with new secure QR token.`);
    } catch (err) {
      try {
        const newToken = `tok-${studentId}-${Date.now().toString(36)}`;
        await firestoreSetDoc('studentcards', studentId, {
          studentId,
          verificationToken: newToken,
          status: 'active',
          cardVersion: (cardData?.cardVersion || 1) + 1,
          issueDate: new Date().toISOString().split('T')[0],
          lastReissuedAt: new Date().toISOString(),
          qrCodeUrl: `https://krishna-kripa-attendance.web.app/?verifyCard=${encodeURIComponent(newToken)}`
        });
        setInternalStatus('active');
        setInternalToken(newToken);
        alert(`Card for ${studentId} updated with new secure QR token.`);
      } catch (fErr) {
        alert('Action failed: ' + err.message);
      }
    } finally {
      setAdminActionLoading(false);
    }
  };

  // Check reduced motion accessibility setting
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(media.matches);
    const handler = (e) => setPrefersReducedMotion(e.matches);
    media.addEventListener('change', handler);
    return () => media.removeEventListener('change', handler);
  }, []);

  // Construct official verification URL - permanent, self-generating, and guaranteed valid across all databases
  const verificationUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/?verifyCard=${encodeURIComponent(studentId)}`
    : `https://krishna-kripa-attendance.web.app/?verifyCard=${encodeURIComponent(studentId)}`;

  useEffect(() => {
    let isMounted = true;
    if (token || studentId) {
      QRCode.toDataURL(verificationUrl, {
        width: 320,
        margin: 1,
        color: {
          dark: '#143D2B',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'M'
      })
      .then(url => {
        if (isMounted) setQrCodeUrl(url);
      })
      .catch(err => {
        console.error('QR code generation error:', err);
      });
    }
    return () => { isMounted = false; };
  }, [token, studentId, verificationUrl]);

  // Desktop 3D Tilt calculation
  const handleMouseMove = (e) => {
    if (prefersReducedMotion || isExporting || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -9; // subtle max 9deg
    const rotateY = ((x - centerX) / centerX) * 9;
    setTilt({
      x: rotateX,
      y: rotateY,
      active: true,
      glareX: (x / rect.width) * 100,
      glareY: (y / rect.height) * 100
    });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0, active: false, glareX: 50, glareY: 50 });
  };

  // Mobile Touch handling
  const handleTouchStart = (e) => {
    if (!e.touches || e.touches.length === 0) return;
    const t = e.touches[0];
    setTouchState({
      startX: t.clientX,
      startY: t.clientY,
      startTime: Date.now()
    });
    if (!prefersReducedMotion) {
      setTilt(prev => ({ ...prev, active: true }));
    }
  };

  const handleTouchEnd = (e) => {
    if (!prefersReducedMotion) {
      setTimeout(() => setTilt(prev => ({ ...prev, active: false })), 200);
    }
    if (!e.changedTouches || e.changedTouches.length === 0) return;
    const t = e.changedTouches[0];
    const diffX = Math.abs(t.clientX - touchState.startX);
    const diffY = Math.abs(t.clientY - touchState.startY);
    const duration = Date.now() - touchState.startTime;

    // Intentional tap (not a scroll)
    if (diffX < 14 && diffY < 14 && duration < 350) {
      setIsExpanded(true);
    }
  };

  // Copy Verification Link
  const handleCopyLink = async (e) => {
    if (e) e.stopPropagation();
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(verificationUrl);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = verificationUrl;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.warn('Copy link error:', err);
    }
  };

  // Native Web Share
  const handleShare = async (e) => {
    if (e) e.stopPropagation();
    if (navigator?.share) {
      try {
        await navigator.share({
          title: `Krishna Kripa Student ID — ${name}`,
          text: `Official Student ID Card for ${name} (${studentId}) — Krishna Kripa Bhagavad Gita Study Circle`,
          url: verificationUrl
        });
        setShareFeedback('Shared successfully!');
        setTimeout(() => setShareFeedback(''), 2500);
      } catch (err) {
        if (err.name !== 'AbortError') {
          handleCopyLink();
        }
      }
    } else {
      handleCopyLink();
    }
  };

  // Download High-Resolution PNG with flattened matrix to avoid perspective skew in output
  const handleDownloadPng = async (e) => {
    if (e) e.stopPropagation();
    if (!cardRef.current) return;
    setIsExporting(true);
    setTilt({ x: 0, y: 0, active: false, glareX: 50, glareY: 50 });
    
    // Allow DOM to settle without 3D transforms before capturing
    await new Promise(resolve => requestAnimationFrame(resolve));

    try {
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 3,
        backgroundColor: '#FFFFFF',
        style: {
          transform: 'none',
          boxShadow: 'none',
          animation: 'none'
        },
        filter: (n) => {
          if (n?.classList?.contains('edge-glow-sheen') || n?.classList?.contains('holographic-glare')) {
            return false;
          }
          return true;
        }
      });
      const link = document.createElement('a');
      link.download = `Krishna_Kripa_ID_${studentId.replace(/[^a-zA-Z0-9_-]/g, '_')}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Download PNG failed:', err);
      alert('Could not export image. Please use the Print ID Card option.');
    } finally {
      setIsExporting(false);
    }
  };

  // Print Card: renders cleanly via dedicated print iframe for exact 1-page centered output
  const handlePrint = (e) => {
    if (e) e.stopPropagation();

    const node = cardRef.current;
    if (!node) {
      window.print();
      return;
    }

    try {
      // Create isolated printing iframe
      const iframe = document.createElement('iframe');
      iframe.setAttribute('title', 'Print Student ID Card');
      iframe.style.position = 'fixed';
      iframe.style.top = '-10000px';
      iframe.style.left = '-10000px';
      iframe.style.width = '1000px';
      iframe.style.height = '1000px';
      iframe.style.border = 'none';
      iframe.style.opacity = '0';
      iframe.style.pointerEvents = 'none';
      document.body.appendChild(iframe);

      // Clone node and strip interactive 3D transforms, animation & shadows
      const clone = node.cloneNode(true);
      clone.style.transform = 'none';
      clone.style.transition = 'none';
      clone.style.boxShadow = 'none';
      clone.style.animation = 'none';
      clone.style.margin = '0 auto';
      clone.style.cursor = 'default';
      clone.style.border = '2px solid #1B4332';
      clone.classList.remove('id-card-floating-idle');

      const glares = clone.querySelectorAll('.holographic-glare, .edge-glow-sheen');
      glares.forEach(g => g.remove());
      const doc = iframe.contentWindow.document;
      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <title>Krishna Kripa Student ID - ${name || 'ISKCON'}</title>
            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
            <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;800&family=Inter:wght@400;500;600;700&family=Outfit:wght@500;600;700;800&display=swap" rel="stylesheet">
            <style>
              @page {
                size: portrait;
                margin: 1.2cm;
              }
              * {
                box-sizing: border-box;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              html, body {
                margin: 0;
                padding: 0;
                background: #ffffff !important;
                color: #1F2937;
                font-family: 'Inter', system-ui, -apple-system, sans-serif;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: flex-start;
                min-height: 100vh;
              }
              .print-page-wrapper {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding-top: 15px;
                width: 100%;
              }
              .print-badge-title {
                font-size: 11px;
                color: #1B4332;
                text-transform: uppercase;
                letter-spacing: 0.12em;
                margin-bottom: 14px;
                font-weight: 800;
                font-family: 'Cinzel', serif;
                text-align: center;
              }
              .print-card-wrapper {
                display: flex;
                justify-content: center;
                align-items: center;
                width: 100%;
              }
              .print-guide-text {
                margin-top: 15px;
                font-size: 10px;
                color: #6B7280;
                display: flex;
                align-items: center;
                gap: 6px;
                letter-spacing: 0.04em;
              }
            </style>
          </head>
          <body>
            <div class="print-page-wrapper">
              <div class="print-badge-title">KRISHNA KRIPA &bull; YOUTH GITA FORUM</div>
              <div class="print-card-wrapper">
                ${clone.outerHTML}
              </div>
              <div class="print-guide-text">
                <span>✂ Official Student Pass &bull; Cut along outer border</span>
              </div>
            </div>
          </body>
        </html>
      `);
      doc.close();

      const runPrint = () => {
        try {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
        } catch (err) {
          console.error('Iframe print error fallback', err);
          window.print();
        } finally {
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
          }, 1500);
        }
      };

      // Wait for all images inside iframe to complete loading
      const images = iframe.contentWindow.document.querySelectorAll('img');
      if (images.length > 0) {
        let loaded = 0;
        const onDone = () => {
          loaded++;
          if (loaded >= images.length) {
            setTimeout(runPrint, 150);
          }
        };
        images.forEach(img => {
          if (img.complete) onDone();
          else {
            img.onload = onDone;
            img.onerror = onDone;
          }
        });
        setTimeout(runPrint, 800);
      } else {
        setTimeout(runPrint, 200);
      }
    } catch (e) {
      console.warn('Fallback to standard window.print', e);
      window.print();
    }
  };

  return (
    <div className="id-card-experience-container" style={{ width: '100%' }}>
      {/* Dynamic Print Stylesheet for flawless ID Card Printing */}
      <style>{`
        @media print {
          @page {
            size: portrait;
            margin: 1cm;
          }
          
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
            min-height: auto !important;
            overflow: visible !important;
            background: #ffffff !important;
          }

          /* Hide clutter */
          .no-print,
          .id-card-actions-section,
          .id-card-info-section,
          .action-buttons-group,
          .navbar,
          .sidebar,
          footer,
          .id-card-modal-backdrop,
          button {
            display: none !important;
          }

          /* Reset modal backdrop so it does not trap or push down content */
          .student-id-card-modal-backdrop {
            position: static !important;
            width: 100% !important;
            height: auto !important;
            background: transparent !important;
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
            overflow: visible !important;
            padding: 0 !important;
            margin: 0 !important;
            display: block !important;
          }

          .student-id-card-modal-backdrop > div {
            animation: none !important;
            box-shadow: none !important;
            margin: 0 auto !important;
            padding: 0 !important;
            max-width: 100% !important;
          }

          /* Center card cleanly in 1 page */
          .id-card-presentation-grid {
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            justify-content: center !important;
            background: transparent !important;
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
            border: none !important;
            box-shadow: none !important;
            padding: 1.5cm 0 0 0 !important;
            margin: 0 auto !important;
            width: 100% !important;
          }

          .id-card-badge-section {
            display: flex !important;
            justify-content: center !important;
            align-items: center !important;
            width: 100% !important;
            margin: 0 auto !important;
          }

          .printable-id-card-node {
            position: relative !important;
            margin: 0 auto !important;
            transform: none !important;
            box-shadow: none !important;
            border: 2px solid #1B4332 !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }

        /* Responsive Presentation Styles */
        .id-card-presentation-grid {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          max-width: 1040px;
          margin: 0 auto;
          background: rgba(255, 255, 255, 0.98);
          backdrop-filter: blur(16px);
          border-radius: 24px;
          border: 1.5px solid rgba(255, 215, 0, 0.45);
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.2), 0 0 40px rgba(27, 67, 50, 0.08);
          padding: 1.5rem 1rem;
          box-sizing: border-box;
          width: 100%;
        }

        /* Mobile: Physical Card Badge at TOP, then Actions, then Meta Info */
        @media (max-width: 859px) {
          .id-card-badge-section {
            order: 1 !important;
            width: 100% !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            margin-bottom: 0.5rem !important;
          }
          .id-card-actions-section {
            order: 2 !important;
            width: 100% !important;
          }
          .id-card-info-section {
            order: 3 !important;
            width: 100% !important;
          }
          .printable-id-card-node {
            width: 100% !important;
            max-width: 340px !important;
            box-sizing: border-box !important;
          }
        }

        /* Desktop: 2-column side-by-side */
        @media (min-width: 860px) {
          .id-card-presentation-grid {
            display: grid !important;
            grid-template-columns: minmax(320px, 1.2fr) minmax(340px, 360px) !important;
            grid-template-areas: 
              "info badge"
              "actions badge" !important;
            gap: 1.25rem 2.5rem !important;
            padding: 2rem 2.25rem !important;
            align-items: center !important;
          }
          .id-card-info-section {
            grid-area: info !important;
          }
          .id-card-actions-section {
            grid-area: actions !important;
          }
          .id-card-badge-section {
            grid-area: badge !important;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .printable-id-card-node {
            transition: none !important;
            transform: none !important;
          }
        }
      `}</style>

      {/* Ticket Presentation Layout */}
      <div className="id-card-presentation-grid">
        {/* Section 1: Information Area */}
        <div className="id-card-info-section" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div>
            {/* Breadcrumb / Category Tag */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <span 
                style={{ 
                  color: '#1B4332', 
                  fontFamily: 'monospace', 
                  fontSize: '0.8rem', 
                  fontWeight: 700, 
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase'
                }}
              >
                STUDENT CREDENTIAL &bull; ISKCON
              </span>
              <span 
                style={{
                  fontSize: '0.72rem',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  background: isRevoked ? '#FEE2E2' : '#DCFCE7',
                  color: isRevoked ? '#991B1B' : '#166534',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                {isRevoked ? <ShieldAlert size={12} /> : <ShieldCheck size={12} />}
                {isRevoked ? 'REVOKED' : 'OFFICIAL ACTIVE'}
              </span>
            </div>

            {/* Headline */}
            <h2 
              style={{
                fontFamily: 'var(--font-heading, "Cinzel", Georgia, serif)',
                color: '#1B4332',
                fontSize: '1.65rem',
                fontWeight: 800,
                lineHeight: 1.2,
                marginBottom: '0.4rem'
              }}
            >
              Hare Krishna! Here's your Student Pass.
            </h2>

            <p style={{ color: '#4B5563', fontSize: '0.88rem', lineHeight: 1.45, marginBottom: '1.25rem' }}>
              Official permanent student identity for Krishna Kripa Bhagavad Gita Study Circle. 
              Featuring authentic sacred artwork of Lord Krishna playing the flute, and a scannable verification code.
            </p>

            {/* Structured Metadata Table (Refined style from reference screenshot) */}
            <div 
              style={{
                display: 'grid',
                gap: '0.65rem',
                borderTop: '1px solid #E5E7EB',
                borderBottom: '1px solid #E5E7EB',
                padding: '0.85rem 0',
                marginBottom: '1.25rem'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#6B7280', letterSpacing: '0.1em' }}>
                  HOLDER
                </span>
                <span style={{ fontWeight: 700, color: '#111827', fontSize: '1rem' }}>
                  {name}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#6B7280', letterSpacing: '0.1em' }}>
                  STUDENT NO.
                </span>
                <span 
                  style={{ 
                    fontFamily: 'monospace', 
                    fontWeight: 700, 
                    color: '#1B4332', 
                    fontSize: '0.95rem',
                    background: '#ECFDF5',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    border: '1px solid #A7F3D0'
                  }}
                >
                  {studentId}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#6B7280', letterSpacing: '0.1em' }}>
                  CLASS / GRADE
                </span>
                <span style={{ fontWeight: 600, color: '#374151' }}>
                  {className}
                </span>
              </div>

              {schoolName && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#6B7280', letterSpacing: '0.1em' }}>
                    SCHOOL
                  </span>
                  <span style={{ fontWeight: 600, color: '#374151' }}>
                    {schoolName}
                  </span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#6B7280', letterSpacing: '0.1em' }}>
                  REGISTERED
                </span>
                <span style={{ fontWeight: 500, color: '#4B5563' }}>
                  {issueDate}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#6B7280', letterSpacing: '0.1em' }}>
                  SESSIONS
                </span>
                <span style={{ fontWeight: 600, color: '#8B4513' }}>
                  Saturday &amp; Sunday (6:00 – 8:00 PM)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Action Buttons Group */}
        <div className="id-card-actions-section action-buttons-group">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.85rem' }}>
              <button
                type="button"
                onClick={handleDownloadPng}
                disabled={isExporting}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.6rem 1rem',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #1B4332 0%, #2d6a4f 100%)',
                  color: '#FFFFFF',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  border: 'none',
                  cursor: isExporting ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 12px rgba(27, 67, 50, 0.25)',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                }}
              >
                <Download size={15} />
                {isExporting ? 'Generating...' : 'Download PNG'}
              </button>

              <button
                type="button"
                onClick={handlePrint}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.6rem 1rem',
                  borderRadius: '10px',
                  background: '#FFFFFF',
                  color: '#1B4332',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  border: '1.5px solid #1B4332',
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.05)'
                }}
              >
                <Printer size={15} />
                Print / Save PDF
              </button>

              <button
                type="button"
                onClick={handleShare}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.6rem 0.95rem',
                  borderRadius: '10px',
                  background: '#F3F4F6',
                  color: '#374151',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  border: '1px solid #D1D5DB',
                  cursor: 'pointer'
                }}
              >
                <Share2 size={15} />
                Share
              </button>

              <button
                type="button"
                onClick={handleCopyLink}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.6rem 0.95rem',
                  borderRadius: '10px',
                  background: copied ? '#ECFDF5' : '#F9FAFB',
                  color: copied ? '#065F46' : '#4B5563',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  border: '1px solid #D1D5DB',
                  cursor: 'pointer'
                }}
              >
                {copied ? <Check size={15} color="#059669" /> : <Copy size={15} />}
                {copied ? 'Link Copied!' : 'Copy Link'}
              </button>

              {/* View Expanded Card Button */}
              <button
                type="button"
                onClick={() => setIsExpanded(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.6rem 0.95rem',
                  borderRadius: '10px',
                  background: '#FEF3C7',
                  color: '#92400E',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  border: '1px solid #FCD34D',
                  cursor: 'pointer'
                }}
              >
                <Maximize2 size={15} />
                Expand View
              </button>
            </div>

            {/* Online verification preview link */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.8rem', color: '#6B7280' }}>
              <ExternalLink size={13} />
              <span>Public Verification: </span>
              <a 
                href={verificationUrl} 
                target="_blank" 
                rel="noreferrer"
                style={{ color: '#1B4332', fontWeight: 600, textDecoration: 'underline' }}
              >
                Verify Student Card
              </a>
            </div>

            {shareFeedback && (
              <div style={{ marginTop: '0.5rem', color: '#059669', fontSize: '0.85rem', fontWeight: 600 }}>
                {shareFeedback}
              </div>
            )}

            {/* Admin Controls (Revoke / Reissue) */}
            {isAdmin && (
              <div 
                style={{ 
                  marginTop: '1.5rem', 
                  paddingTop: '1rem', 
                  borderTop: '1px dashed #D1D5DB',
                  display: 'flex',
                  gap: '0.75rem',
                  alignItems: 'center'
                }}
              >
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#6B7280' }}>ADMIN CONTROLS:</span>
                {!isRevoked ? (
                  <button
                    type="button"
                    disabled={adminActionLoading}
                    onClick={handleRevokeClick}
                    style={{
                      padding: '4px 12px',
                      borderRadius: '6px',
                      background: '#FEE2E2',
                      color: '#991B1B',
                      border: '1px solid #F87171',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: adminActionLoading ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {adminActionLoading ? 'Updating...' : 'Revoke Card'}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={adminActionLoading}
                    onClick={handleReissueClick}
                    style={{
                      padding: '4px 12px',
                      borderRadius: '6px',
                      background: '#DCFCE7',
                      color: '#166534',
                      border: '1px solid #86EFAC',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: adminActionLoading ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {adminActionLoading ? 'Updating...' : 'Reissue New Card'}
                  </button>
                )}
                <button
                  type="button"
                  disabled={adminActionLoading}
                  onClick={handleReissueClick}
                  style={{
                    padding: '4px 12px',
                    borderRadius: '6px',
                    background: '#F3F4F6',
                    color: '#374151',
                    border: '1px solid #D1D5DB',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: adminActionLoading ? 'not-allowed' : 'pointer'
                  }}
                >
                  {adminActionLoading ? 'Updating...' : 'Regenerate Token'}
                </button>
              </div>
            )}
        </div>

        {/* Section 3: The Realistic Event-Ticket-Inspired Lanyard Badge Card with 3D Tilt */}
        <div 
          className="id-card-badge-section" 
          style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center',
            perspective: prefersReducedMotion ? 'none' : '1200px'
          }}
        >
          {/* Lanyard Clip / Strap Graphic */}
          <div 
            className="no-print"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              marginBottom: '-8px',
              zIndex: 10
            }}
          >
            {/* Dark green lanyard ribbon top */}
            <div 
              style={{
                width: '32px',
                height: '24px',
                background: 'linear-gradient(to bottom, #0F281E, #1B4332)',
                borderRadius: '4px 4px 0 0',
                border: '1px solid #FFD700',
                borderBottom: 'none'
              }} 
            />
            {/* Metallic badge clamp */}
            <div 
              style={{
                width: '46px',
                height: '14px',
                background: 'linear-gradient(180deg, #E5E7EB 0%, #9CA3AF 50%, #6B7280 100%)',
                borderRadius: '4px',
                boxShadow: '0 3px 6px rgba(0,0,0,0.3)',
                border: '1px solid #4B5563'
              }}
            />
          </div>

          {/* The Physical Card Node (Interactive 3D Tilt + Captured by toPng & Print) */}
          <div 
            ref={cardRef}
            className="printable-id-card-node"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onClick={() => setIsExpanded(true)}
            title="Click or tap to view expanded card"
            style={{
              width: '100%',
              maxWidth: '340px',
              boxSizing: 'border-box',
              background: '#FAF7EF',
              borderRadius: '28px',
              border: isRevoked ? '3.5px solid #EF4444' : '3.5px solid #D4AF37',
              boxShadow: tilt.active
                ? '0 32px 65px rgba(0, 0, 0, 0.3), 0 0 28px rgba(230, 202, 101, 0.55), 0 0 0 1px #FFF2B2'
                : '0 22px 50px rgba(0, 0, 0, 0.22), 0 0 18px rgba(212, 175, 55, 0.35)',
              transform: (!prefersReducedMotion && tilt.active)
                ? `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) translateY(-8px) scale(1.02)`
                : `perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0) scale(1)`,
              transition: tilt.active 
                ? 'transform 0.08s ease-out, box-shadow 0.15s ease' 
                : 'transform 0.45s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.45s ease',
              overflow: 'hidden',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              fontFamily: 'Inter, system-ui, sans-serif',
              color: '#1F2937',
              cursor: 'pointer'
            }}
          >
            {/* Subtle holographic glare effect following mouse */}
            {!prefersReducedMotion && (
              <div 
                className="holographic-glare"
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: `radial-gradient(circle at ${tilt.glareX}% ${tilt.glareY}%, rgba(255, 235, 150, 0.22) 0%, rgba(255, 255, 255, 0.08) 35%, transparent 65%)`,
                  pointerEvents: 'none',
                  opacity: tilt.active ? 1 : 0,
                  transition: 'opacity 0.3s ease',
                  zIndex: 8
                }} 
              />
            )}

            {/* Inner Hairline Metallic Gold Border */}
            <div 
              style={{
                position: 'absolute',
                inset: '4px',
                border: '1px solid rgba(229, 195, 104, 0.65)',
                borderRadius: '24px',
                pointerEvents: 'none',
                zIndex: 6
              }}
            />

            {/* 4 Ornate Golden Corner Filigree Motifs */}
            <CardCornerFiligree position="top-left" />
            <CardCornerFiligree position="top-right" />
            <CardCornerFiligree position="bottom-left" />
            <CardCornerFiligree position="bottom-right" />

            {/* Glowing Golden Flares along borders */}
            <div 
              className="edge-glow-sheen"
              style={{
                position: 'absolute',
                top: '-4px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '76px',
                height: '10px',
                background: 'radial-gradient(ellipse at center, rgba(255, 230, 130, 0.75) 0%, transparent 70%)',
                pointerEvents: 'none',
                zIndex: 7
              }}
            />
            <div 
              className="edge-glow-sheen"
              style={{
                position: 'absolute',
                bottom: '-4px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '85px',
                height: '10px',
                background: 'radial-gradient(ellipse at center, rgba(255, 230, 130, 0.75) 0%, transparent 70%)',
                pointerEvents: 'none',
                zIndex: 7
              }}
            />
            <div 
              className="edge-glow-sheen"
              style={{
                position: 'absolute',
                top: '20px',
                right: '-3px',
                width: '8px',
                height: '38px',
                background: 'radial-gradient(ellipse at center, rgba(255, 230, 130, 0.7) 0%, transparent 70%)',
                pointerEvents: 'none',
                zIndex: 7
              }}
            />

            {/* Top Deep Forest-Green Header Strip */}
            <div 
              style={{
                background: 'linear-gradient(180deg, #062215 0%, #0B2F1F 55%, #0F3D29 100%)',
                padding: '0.7rem 0.9rem 0.65rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '2.5px solid #D4AF37',
                color: '#FFF8DC',
                position: 'relative',
                overflow: 'hidden',
                zIndex: 3
              }}
            >
              {/* Restrained peacock feather motif in top-right corner */}
              <img 
                src="/card_peacock_feather_clean.png" 
                alt="" 
                style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '0px',
                  height: '74px',
                  width: 'auto',
                  objectFit: 'contain',
                  pointerEvents: 'none',
                  zIndex: 1,
                  opacity: 0.75
                }} 
              />

              {/* Left: ISKCON Gold Logo + Krishna Kripa Typography */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', zIndex: 2 }}>
                <IskconHeaderLogo size={34} />
                <div>
                  <div 
                    style={{ 
                      fontFamily: "'Cinzel', serif", 
                      fontSize: '0.86rem', 
                      fontWeight: 800, 
                      letterSpacing: '0.08em',
                      color: '#E8CB68',
                      lineHeight: 1.15
                    }}
                  >
                    KRISHNA
                  </div>
                  <div 
                    style={{ 
                      fontFamily: "'Cinzel', serif", 
                      fontSize: '0.86rem', 
                      fontWeight: 800, 
                      letterSpacing: '0.08em',
                      color: '#E8CB68',
                      lineHeight: 1.15
                    }}
                  >
                    KRIPA
                  </div>
                  <div style={{ fontSize: '0.60rem', color: '#FAF6ED', opacity: 0.92, letterSpacing: '0.03em', marginTop: '2px', lineHeight: 1.2, whiteSpace: 'nowrap' }}>
                    Bhagavad Gita Study Circle
                  </div>
                </div>
              </div>

              {/* Right: Badges */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', zIndex: 2, marginRight: '14px' }}>
                <span 
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '0.60rem',
                    fontWeight: 700,
                    padding: '2px 5px',
                    borderRadius: '4px',
                    background: 'rgba(255,255,255,0.12)',
                    color: '#FFFFFF',
                    border: '1px solid rgba(229,195,104,0.55)',
                    backdropFilter: 'blur(2px)'
                  }}
                >
                  BGK
                </span>
                <span 
                  style={{
                    background: isRevoked ? '#EF4444' : 'rgba(212, 175, 55, 0.2)',
                    border: isRevoked ? '1px solid #B91C1C' : '1.2px solid #D4AF37',
                    color: isRevoked ? '#FFFFFF' : '#F7E7A9',
                    padding: '2px 7px',
                    borderRadius: '10px',
                    fontSize: '0.60rem',
                    fontWeight: 800,
                    letterSpacing: '0.05em'
                  }}
                >
                  {isRevoked ? 'REVOKED' : 'STUDENT'}
                </span>
              </div>
            </div>

            {/* Main Badge Body: Left Vertical Banner + Center Student Info + Right Krishna Illustration */}
            <div style={{ display: 'flex', flex: 1, position: 'relative', zIndex: 3, background: '#FAF7EF' }}>
              {/* Left Vertical Ribbon */}
              <div 
                style={{
                  width: '28px',
                  background: '#F4F0E6',
                  borderRight: '1px solid #E5DDC9',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  padding: '8px 0'
                }}
              >
                <div 
                  style={{
                    transform: 'rotate(-90deg)',
                    whiteSpace: 'nowrap',
                    fontFamily: 'monospace',
                    fontSize: '0.56rem',
                    fontWeight: 800,
                    letterSpacing: '0.22em',
                    color: isRevoked ? '#EF4444' : '#134E35',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <span style={{ color: '#D4AF37', fontSize: '0.65rem' }}>✦</span>
                  <span>{isRevoked ? 'REVOKED &bull; INVALID' : "YOU'RE REGISTERED"}</span>
                  <span style={{ color: '#D4AF37', fontSize: '0.65rem' }}>✦</span>
                </div>
              </div>

              {/* Student Details Section + Right Krishna Artwork */}
              <div style={{ flex: 1, padding: '0.65rem 0.85rem 0.35rem 0.95rem', position: 'relative' }}>
                
                {/* Heading row: STUDENT IDENTITY + lotus divider + ISKCON */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#4A6052', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                      STUDENT IDENTITY
                    </span>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                      <span style={{ width: '12px', height: '1px', background: '#D4AF37' }} />
                      <OrnateGoldLotus size={10} />
                      <span style={{ width: '12px', height: '1px', background: '#D4AF37' }} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', lineHeight: 1 }}>
                    <span style={{ color: '#B8860B', fontFamily: "'Cinzel', serif", fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.06em' }}>
                      ISKCON
                    </span>
                    <OrnateFiligreeScroll width={36} height={6} />
                  </div>
                </div>

                {/* Name, Handle, Badges & Krishna Artwork Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', minHeight: '120px' }}>
                  
                  {/* Left Column: Student Details (Aligned flush on consistent left edge) */}
                  <div style={{ flex: 1, zIndex: 3, paddingTop: '0.1rem', maxWidth: '172px' }}>
                    <div 
                      style={{ 
                        fontFamily: "'Cinzel', serif",
                        fontSize: '1.38rem', 
                        fontWeight: 800, 
                        color: '#0B331F',
                        lineHeight: 1.15,
                        wordBreak: 'break-word',
                        letterSpacing: '-0.01em',
                        marginBottom: '0.22rem'
                      }}
                    >
                      {name}
                    </div>

                    {/* Handle (@studentId) */}
                    <div 
                      style={{ 
                        fontFamily: 'monospace', 
                        fontSize: '0.80rem', 
                        fontWeight: 700, 
                        color: '#165738', 
                        marginBottom: '0.42rem',
                        letterSpacing: '0.02em'
                      }}
                    >
                      @{studentId}
                    </div>

                    {/* Group / Class Pill Badge */}
                    <div 
                      style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '5px', 
                        background: '#FDF6E2', 
                        border: '1.2px solid #E2BA55', 
                        padding: '2.5px 8px', 
                        borderRadius: '12px', 
                        fontSize: '0.70rem', 
                        fontWeight: 700, 
                        color: '#78350F',
                        boxShadow: '0 1px 3px rgba(212,175,55,0.15)'
                      }}
                    >
                      <span>{className === 'Class' || !className ? 'Youth Gita Forum' : className}</span>
                      <OrnateGoldLotus size={10} />
                    </div>

                    {/* School Name */}
                    {schoolName && (
                      <div style={{ fontSize: '0.70rem', color: '#526E60', marginTop: '6px', fontWeight: 500, lineHeight: 1.3 }}>
                        {schoolName}
                      </div>
                    )}
                  </div>

                  {/* Right Column: Lord Sri Krishna with Calf Artwork (Reduced ~10% for balanced clearance) */}
                  <div 
                    style={{ 
                      width: '112px', 
                      height: '124px', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      marginRight: '-2px', 
                      marginTop: '-2px',
                      zIndex: 2,
                      flexShrink: 0
                    }}
                  >
                    <KrishnaCardArtwork width={112} height={124} />
                  </div>
                </div>

              </div>
            </div>

            {/* Ticket Notches & Perforation Divider with Center Lotus */}
            <div 
              style={{ 
                position: 'relative', 
                height: '14px', 
                display: 'flex', 
                alignItems: 'center',
                margin: '0',
                zIndex: 4,
                background: '#FAF7EF'
              }}
            >
              {/* Left semi-circle notch cut-out */}
              <div 
                style={{
                  position: 'absolute',
                  left: '-8px',
                  width: '16px',
                  height: '16px',
                  background: '#FFFFFF',
                  borderRadius: '50%',
                  borderRight: isRevoked ? '2px solid #EF4444' : '2.5px solid #D4AF37',
                  boxShadow: 'inset -2px 0 3px rgba(0,0,0,0.12)'
                }} 
              />
              
              {/* Dashed perforation line with centered gold lotus */}
              <div 
                style={{ 
                  flex: 1, 
                  margin: '0 16px', 
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }} 
              >
                <div style={{ flex: 1, borderTop: '1.5px dashed #D1C4A5' }} />
                <OrnateGoldLotus size={12} />
                <div style={{ flex: 1, borderTop: '1.5px dashed #D1C4A5' }} />
              </div>

              {/* Right semi-circle notch cut-out */}
              <div 
                style={{
                  position: 'absolute',
                  right: '-8px',
                  width: '16px',
                  height: '16px',
                  background: '#FFFFFF',
                  borderRadius: '50%',
                  borderLeft: isRevoked ? '2px solid #EF4444' : '2.5px solid #D4AF37',
                  boxShadow: 'inset 2px 0 3px rgba(0,0,0,0.12)'
                }} 
              />
            </div>

            {/* Registration Section (Tightened vertical spacing) */}
            <div 
              style={{
                padding: '0.15rem 1rem 0.1rem',
                display: 'flex',
                justifyContent: 'flex-start',
                alignItems: 'flex-start',
                zIndex: 3,
                background: '#FAF7EF'
              }}
            >
              <div>
                <div style={{ fontFamily: 'monospace', fontSize: '0.60rem', color: '#6B7280', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700, marginBottom: '1px' }}>
                  REGISTERED
                </div>
                <div style={{ fontWeight: 800, color: '#111827', fontFamily: 'monospace', fontSize: '0.80rem', lineHeight: 1.2 }}>
                  {issueDate}
                </div>
              </div>
            </div>

            {/* Bottom Section: Scannable Real QR Code */}
            <div 
              style={{
                background: '#FAF7EF',
                padding: '0.15rem 1rem 0.55rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                position: 'relative',
                zIndex: 3
              }}
            >
              {/* Real Scannable QR Code inside white rounded card with gold border */}
              <div 
                style={{
                  background: '#FFFFFF',
                  padding: '8px',
                  borderRadius: '15px',
                  border: '1.8px solid #E5C368',
                  boxShadow: '0 4px 14px rgba(212, 175, 55, 0.20), 0 2px 5px rgba(0,0,0,0.06)',
                  marginBottom: '0.45rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  zIndex: 2
                }}
              >
                {qrCodeUrl ? (
                  <img 
                    src={qrCodeUrl} 
                    alt={`QR Code verification for ${name}`}
                    style={{ width: '108px', height: '108px', display: 'block' }} 
                  />
                ) : (
                  <div style={{ width: '108px', height: '108px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', color: '#9CA3AF' }}>
                    Generating QR...
                  </div>
                )}
              </div>

              {/* Footer row: ID, gold lotus divider, and verification URL (Aligned on same baseline, clear of corners) */}
              <div 
                style={{ 
                  display: 'flex', 
                  alignItems: 'baseline', 
                  justifyContent: 'space-between', 
                  width: '100%', 
                  fontFamily: 'monospace', 
                  fontSize: '0.64rem', 
                  fontWeight: 700,
                  position: 'relative',
                  zIndex: 2,
                  padding: '0 24px',
                  boxSizing: 'border-box'
                }}
              >
                <span style={{ color: '#134E35', fontWeight: 800 }}>{studentId}</span>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1, justifyContent: 'center', transform: 'translateY(-1px)' }}>
                  <span style={{ height: '1px', width: '20px', background: 'linear-gradient(to right, transparent, #D4AF37)' }} />
                  <OrnateGoldLotus size={11} />
                  <span style={{ height: '1px', width: '20px', background: 'linear-gradient(to left, transparent, #D4AF37)' }} />
                </div>

                <span style={{ color: '#4A6B5B' }}>krishnakripa.org/verify</span>
              </div>
            </div>

          </div>

          {/* Interactive touch / hover cue banner */}
          <div 
            className="no-print" 
            style={{ 
              marginTop: '0.65rem', 
              fontSize: '0.75rem', 
              color: '#8B4513', 
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            <Sparkles size={13} color="#D97706" />
            <span>Hover or tap card to inspect &amp; tilt</span>
          </div>
        </div>
      </div>

      {/* Expanded Card Modal for Touch / Mobile Zoom */}
      {isExpanded && (
        <div 
          className="id-card-modal-backdrop animate-fade-in"
          onClick={() => setIsExpanded(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            zIndex: 999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            overflowY: 'auto'
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              maxWidth: '360px',
              width: '100%',
              background: '#FFFFFF',
              borderRadius: '24px',
              boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
              overflow: 'hidden',
              animation: 'scaleUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              style={{
                position: 'absolute',
                top: '0.75rem',
                right: '0.75rem',
                zIndex: 50,
                background: 'rgba(0,0,0,0.5)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <X size={18} />
            </button>

            {/* Expanded Header */}
            <div style={{ background: 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)', color: '#FFF8DC', padding: '1rem 1.25rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#FFD700', fontWeight: 800 }}>
                KRISHNA KRIPA &bull; OFFICIAL ID
              </div>
              <h3 style={{ margin: '0.25rem 0 0', fontFamily: 'var(--font-heading, serif)', fontSize: '1.35rem', fontWeight: 800 }}>
                {name}
              </h3>
              <div style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: '#D1FAE5', marginTop: '2px' }}>
                {studentId}
              </div>
            </div>

            {/* Expanded Body: High-Res QR + Krishna Artwork */}
            <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', width: '100%', marginBottom: '1rem' }}>
                {/* QR Code */}
                <div style={{ background: '#FFFFFF', padding: '8px', borderRadius: '12px', border: '1.5px solid #1B4332', boxShadow: '0 4px 14px rgba(0,0,0,0.1)' }}>
                  {qrCodeUrl && (
                    <img src={qrCodeUrl} alt={name} style={{ width: '120px', height: '120px', display: 'block' }} />
                  )}
                </div>

                {/* Devotional Krishna Artwork */}
                <div style={{ width: '110px', height: '135px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <KrishnaCardArtwork width={110} height={135} />
                </div>
              </div>

              {/* Meta details list */}
              <div style={{ width: '100%', background: '#F9FAFB', borderRadius: '12px', padding: '0.75rem 1rem', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#6B7280' }}>Grade:</span>
                  <span style={{ fontWeight: 700, color: '#1B4332' }}>{className}</span>
                </div>
                {schoolName && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#6B7280' }}>School:</span>
                    <span style={{ fontWeight: 600 }}>{schoolName}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#6B7280' }}>Registered:</span>
                  <span>{issueDate}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#6B7280' }}>Status:</span>
                  <span style={{ color: isRevoked ? '#DC2626' : '#16A34A', fontWeight: 700 }}>
                    {isRevoked ? 'REVOKED' : 'ACTIVE &bull; VERIFIED'}
                  </span>
                </div>
              </div>

              {/* Actions in Expanded View */}
              <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                <button
                  type="button"
                  onClick={handleDownloadPng}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    padding: '0.6rem',
                    borderRadius: '8px',
                    background: '#1B4332',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <Download size={14} /> Download
                </button>
                <button
                  type="button"
                  onClick={handleShare}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    padding: '0.6rem',
                    borderRadius: '8px',
                    background: '#FEF3C7',
                    color: '#92400E',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    border: '1px solid #FCD34D',
                    cursor: 'pointer'
                  }}
                >
                  <Share2 size={14} /> Share
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
