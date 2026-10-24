import React, { useState, useEffect } from 'react';

// Global helper to update document favicon if custom logo is active
export const updateGlobalFavicon = (logoUrl) => {
  if (typeof document === 'undefined') return;
  try {
    let link = document.querySelector("link[rel*='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.getElementsByTagName('head')[0].appendChild(link);
    }
    if (logoUrl) {
      link.href = logoUrl;
    } else {
      link.href = '/favicon.ico';
    }
  } catch (e) {}
};

export const DevotionalCrest = ({ 
  size = 44, 
  customLogoUrl, 
  className = "", 
  style = {},
  alt = "Krishna Kripa Logo" 
}) => {
  // If customLogoUrl is explicitly provided as prop, prioritize it
  const isExplicit = customLogoUrl !== undefined;
  const [internalLogo, setInternalLogo] = useState(() => {
    if (isExplicit) return customLogoUrl || '';
    if (typeof window !== 'undefined') {
      return localStorage.getItem('krishna_published_logo') || '';
    }
    return '';
  });
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    if (isExplicit) {
      setInternalLogo(customLogoUrl || '');
      setImgError(false);
      return;
    }

    const syncLogo = (newUrl) => {
      const url = newUrl !== undefined ? newUrl : (typeof window !== 'undefined' ? (localStorage.getItem('krishna_published_logo') || '') : '');
      setInternalLogo(url || '');
      setImgError(false);
    };

    const handleConfigUpdate = (e) => {
      if (e?.detail?.branding) {
        const logo = e.detail.branding.useCustomLogo !== false ? (e.detail.branding.logoUrl || '') : '';
        syncLogo(logo);
      }
    };

    const handleLogoUpdate = (e) => {
      if (typeof e?.detail === 'string') {
        syncLogo(e.detail);
      }
    };

    const handleStorage = (e) => {
      if (e.key === 'krishna_published_logo') {
        syncLogo(e.newValue);
      }
    };

    window.addEventListener('krishna_config_updated', handleConfigUpdate);
    window.addEventListener('krishna_logo_updated', handleLogoUpdate);
    window.addEventListener('storage', handleStorage);

    // Initial check in case it was stored just before mount
    syncLogo();

    return () => {
      window.removeEventListener('krishna_config_updated', handleConfigUpdate);
      window.removeEventListener('krishna_logo_updated', handleLogoUpdate);
      window.removeEventListener('storage', handleStorage);
    };
  }, [customLogoUrl, isExplicit]);

  const effectiveLogo = isExplicit ? (customLogoUrl || '') : internalLogo;

  // If a custom logo URL is present and has not errored, render the image logo
  if (effectiveLogo && effectiveLogo.trim() && !imgError) {
    return (
      <img 
        src={effectiveLogo}
        alt={alt}
        onError={() => setImgError(true)}
        style={{
          height: `${size}px`,
          width: 'auto',
          maxHeight: `${size}px`,
          maxWidth: '100%',
          objectFit: 'contain',
          verticalAlign: 'middle',
          display: 'inline-block',
          ...style
        }}
        className={className}
      />
    );
  }

  // Fallback: Sacred Devotional SVG Crest
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ verticalAlign: 'middle', ...style }}
    >
      {/* Outer Sacred Ring */}
      <circle cx="50" cy="50" r="47" stroke="#FFD700" strokeWidth="2.5" fill="#1B4332" />
      <circle cx="50" cy="50" r="42" stroke="rgba(255, 215, 0, 0.4)" strokeWidth="1" strokeDasharray="2 3" />
      
      {/* Lotus Petals Base */}
      <path 
        d="M50 82 C38 74 24 72 20 62 C30 63 42 68 50 82 Z" 
        fill="#FF9933" 
        opacity="0.9"
      />
      <path 
        d="M50 82 C62 74 76 72 80 62 C70 63 58 68 50 82 Z" 
        fill="#FF9933" 
        opacity="0.9"
      />
      
      {/* Tilak & Tulasi leaf motif */}
      <path 
        d="M44 26 C44 20 56 20 56 26 L56 58 C53 62 47 62 44 58 Z" 
        fill="#FFF8DC" 
        stroke="#FFD700" 
        strokeWidth="1.2"
      />
      <path 
        d="M48 30 L52 30 L51 52 L49 52 Z" 
        fill="#FF9933" 
      />
      {/* Central Tulasi Leaf */}
      <path 
        d="M50 56 C44 63 47 70 50 72 C53 70 56 63 50 56 Z" 
        fill="#2D6A4F" 
        stroke="#FFD700" 
        strokeWidth="1"
      />
      
      {/* Divine Rays / Radiance */}
      <circle cx="50" cy="22" r="3.5" fill="#FFD700" />
      <line x1="50" y1="12" x2="50" y2="16" stroke="#FFD700" strokeWidth="2" strokeLinecap="round" />
      <line x1="43" y1="15" x2="45" y2="18" stroke="#FFD700" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="57" y1="15" x2="55" y2="18" stroke="#FFD700" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
};

export const IskconLogo = ({ height = 36 }) => (
  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
    <DevotionalCrest size={height} />
    <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
      <span style={{ 
        fontFamily: "'Cinzel', serif", 
        fontSize: '11px', 
        letterSpacing: '0.12em', 
        color: '#FFD700',
        fontWeight: 700 
      }}>
        ISKCON
      </span>
      <span style={{ 
        fontSize: '9px', 
        color: '#FFF8DC', 
        letterSpacing: '0.04em',
        opacity: 0.85
      }}>
        BHAGAVAD GITA
      </span>
    </div>
  </div>
);
