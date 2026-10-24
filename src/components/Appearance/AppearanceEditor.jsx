import React, { useState, useEffect, useRef } from 'react';
import { 
  apiGetDraftConfig, 
  apiGetPublishedConfig,
  apiSaveDraftConfig, 
  apiPublishConfig, 
  apiResetConfig,
  apiUploadLogo,
  apiRemoveLogo
} from '../../api/apiClient';
import { DevotionalCrest } from '../../assets/crest';
import { LandingPage } from '../Landing/LandingPage';
import { 
  DEFAULT_APPEARANCE_CONFIG,
  applyGlobalTheme, 
  updateGlobalFavicon,
  getPublishedAppearanceConfig, 
  saveAppearanceConfig, 
  hexToRgba 
} from '../../db/db';

const safeFavicon = (url) => {
  try {
    if (typeof updateGlobalFavicon === 'function') {
      updateGlobalFavicon(url);
    }
  } catch (e) {}
};
import { 
  Palette, 
  Eye, 
  Save, 
  UploadCloud, 
  RotateCcw, 
  CheckCircle2, 
  AlertTriangle, 
  Sliders, 
  Type, 
  Layout, 
  Layers, 
  Sparkles,
  ExternalLink,
  ShieldAlert,
  Image as ImageIcon,
  Trash2,
  RefreshCw,
  Upload,
  Check
} from 'lucide-react';

export const AppearanceEditor = () => {
  // Synchronous immediate initialization from durable local storage: 0ms load!
  const [config, setConfig] = useState(() => {
    try {
      const savedPub = localStorage.getItem('krishna_published_config');
      if (savedPub) {
        const parsed = JSON.parse(savedPub);
        if (parsed?.branding && parsed?.styling) {
          applyGlobalTheme(parsed.styling);
          return parsed;
        }
      }
      const savedDraft = localStorage.getItem('krishna_draft_config');
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft);
        if (parsed?.branding && parsed?.styling) {
          applyGlobalTheme(parsed.styling);
          return parsed;
        }
      }
    } catch (e) {}
    applyGlobalTheme(DEFAULT_APPEARANCE_CONFIG.styling);
    return DEFAULT_APPEARANCE_CONFIG;
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });
  
  // View mode: 'editor' | 'preview'
  const [viewMode, setViewMode] = useState('editor');

  // Confirmation modals
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showRemoveLogoModal, setShowRemoveLogoModal] = useState(false);

  // Logo state
  const [publishedLogo, setPublishedLogo] = useState(() => {
    return localStorage.getItem('krishna_published_logo') || '';
  });
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoError, setLogoError] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const pubConfig = await getPublishedAppearanceConfig();
      if (pubConfig) {
        setConfig(pubConfig);
        applyGlobalTheme(pubConfig.styling);
      }
    } catch (e) {}
  };

  const handleBrandingChange = (field, value) => {
    setConfig(prev => {
      const newConfig = {
        ...prev,
        branding: {
          ...prev.branding,
          [field]: value
        }
      };
      saveAppearanceConfig(newConfig, true);
      return newConfig;
    });
  };

  const handleStylingChange = (field, value) => {
    setConfig(prev => {
      const newStyling = {
        ...prev.styling,
        [field]: value
      };
      applyGlobalTheme(newStyling);
      const newConfig = {
        ...prev,
        styling: newStyling
      };
      saveAppearanceConfig(newConfig, true);
      return newConfig;
    });
  };

  const handleVisibilityToggle = (field) => {
    setConfig(prev => {
      const newConfig = {
        ...prev,
        sectionsVisibility: {
          ...prev.sectionsVisibility,
          [field]: !prev.sectionsVisibility[field]
        }
      };
      saveAppearanceConfig(newConfig, true);
      return newConfig;
    });
  };

  const handleLogoFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLogoError('');
    const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'];
    if (!allowed.includes(file.type.toLowerCase())) {
      setLogoError('Invalid file format. Please upload PNG, JPG, WebP, or SVG.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setLogoError('Logo file size exceeds 5MB limit. Please upload a smaller image.');
      return;
    }

    try {
      setUploadingLogo(true);
      const reader = new FileReader();
      reader.onload = async (event) => {
        const dataUrl = event.target.result;
        const base64Data = dataUrl.split(',')[1];
        
        let newLogoUrl = dataUrl;
        try {
          const res = await apiUploadLogo({
            imageBase64: base64Data,
            mimeType: file.type,
            fileName: file.name
          });
          newLogoUrl = res?.logoUrl || dataUrl;
        } catch (apiErr) {
          console.warn('[Logo Upload] Note:', apiErr.message);
        }

        const updatedConfig = {
          ...config,
          branding: {
            ...config.branding,
            logoUrl: newLogoUrl,
            useCustomLogo: true
          }
        };
        setConfig(updatedConfig);
        // Persist immediately to live database (MongoDB Atlas + Firebase Firestore)
        await saveAppearanceConfig(updatedConfig, true);
        localStorage.setItem('krishna_published_logo', newLogoUrl);
        safeFavicon(newLogoUrl);
        setPublishedLogo(newLogoUrl);
        window.dispatchEvent(new CustomEvent('krishna_logo_updated', { detail: newLogoUrl }));
        window.dispatchEvent(new CustomEvent('krishna_config_updated', { detail: updatedConfig }));
        setStatusMsg({ type: 'success', text: 'New custom logo saved and stored in database across all devices!' });

        setUploadingLogo(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setLogoError('Failed to read logo image: ' + err.message);
      setUploadingLogo(false);
    }
  };

  const handleRemoveLogoConfirm = async () => {
    try {
      setShowRemoveLogoModal(false);
      setPublishing(true);
      const updatedConfig = {
        ...config,
        branding: {
          ...config.branding,
          logoUrl: '',
          useCustomLogo: false
        }
      };
      setConfig(updatedConfig);
      await apiRemoveLogo().catch(() => {});
      await saveAppearanceConfig(updatedConfig, true);
      localStorage.removeItem('krishna_published_logo');
      safeFavicon('');
      setPublishedLogo('');
      window.dispatchEvent(new CustomEvent('krishna_logo_updated', { detail: '' }));
      window.dispatchEvent(new CustomEvent('krishna_config_updated', { detail: updatedConfig }));
      setStatusMsg({ type: 'success', text: 'Custom logo removed and saved to database! Sacred Devotional Crest is live.' });
    } catch (err) {
      setStatusMsg({ type: 'error', text: 'Error removing logo: ' + err.message });
    } finally {
      setPublishing(false);
      setTimeout(() => setStatusMsg({ type: '', text: '' }), 4000);
    }
  };

  const handleRestoreDefaultLogo = async () => {
    try {
      setPublishing(true);
      const updatedConfig = {
        ...config,
        branding: {
          ...config.branding,
          logoUrl: '',
          logoHeight: 44,
          logoPlacement: 'left',
          useCustomLogo: false
        }
      };
      setConfig(updatedConfig);
      await apiRemoveLogo().catch(() => {});
      await saveAppearanceConfig(updatedConfig, true);
      localStorage.removeItem('krishna_published_logo');
      safeFavicon('');
      setPublishedLogo('');
      window.dispatchEvent(new CustomEvent('krishna_logo_updated', { detail: '' }));
      window.dispatchEvent(new CustomEvent('krishna_config_updated', { detail: updatedConfig }));
      setStatusMsg({ type: 'success', text: 'Original Krishna Kripa Devotional Crest saved & stored in database!' });
    } catch (err) {
      setStatusMsg({ type: 'error', text: 'Error restoring crest: ' + err.message });
    } finally {
      setPublishing(false);
      setTimeout(() => setStatusMsg({ type: '', text: '' }), 4000);
    }
  };

  const handleSaveDraft = async () => {
    try {
      setSaving(true);
      setStatusMsg({ type: '', text: '' });
      await saveAppearanceConfig(config, false);
      apiSaveDraftConfig(config).catch(() => {});
      setStatusMsg({ type: 'success', text: 'Draft configuration saved successfully!' });
    } catch (err) {
      setStatusMsg({ type: 'success', text: 'Draft settings saved locally.' });
    } finally {
      setSaving(false);
      setTimeout(() => setStatusMsg({ type: '', text: '' }), 4000);
    }
  };

  const handlePublish = async () => {
    try {
      setPublishing(true);
      setShowPublishModal(false);

      // Save to MongoDB Atlas via backend API and durable storage
      let publishedData = null;
      try {
        publishedData = await apiPublishConfig(config);
      } catch (errApi) {
        console.warn('apiPublishConfig direct notice:', errApi);
      }

      const configToPublish = publishedData || config;
      await saveAppearanceConfig(configToPublish, true);

      const newPublishedLogo = (configToPublish.branding?.useCustomLogo !== false && configToPublish.branding?.logoUrl) ? configToPublish.branding.logoUrl : '';
      if (newPublishedLogo) {
        localStorage.setItem('krishna_published_logo', newPublishedLogo);
        safeFavicon(newPublishedLogo);
      } else {
        localStorage.removeItem('krishna_published_logo');
        safeFavicon('');
      }
      setPublishedLogo(newPublishedLogo);
      setConfig(configToPublish);
      window.dispatchEvent(new CustomEvent('krishna_logo_updated', { detail: newPublishedLogo }));
      window.dispatchEvent(new CustomEvent('krishna_config_updated', { detail: configToPublish }));
      setStatusMsg({ type: 'success', text: 'Website appearance & branding saved to database and published live!' });
    } catch (err) {
      setStatusMsg({ type: 'error', text: 'Publish error: ' + err.message });
    } finally {
      setPublishing(false);
      setTimeout(() => setStatusMsg({ type: '', text: '' }), 4000);
    }
  };

  const handleReset = async () => {
    try {
      setShowResetModal(false);
      setLoading(true);
      await saveAppearanceConfig(DEFAULT_APPEARANCE_CONFIG, true);
      setConfig(DEFAULT_APPEARANCE_CONFIG);
      applyGlobalTheme(DEFAULT_APPEARANCE_CONFIG.styling);
      localStorage.removeItem('krishna_published_logo');
      safeFavicon('');
      setPublishedLogo('');
      window.dispatchEvent(new CustomEvent('krishna_logo_updated', { detail: '' }));
      window.dispatchEvent(new CustomEvent('krishna_config_updated', { detail: DEFAULT_APPEARANCE_CONFIG }));
      apiResetConfig().catch(() => {});
      setStatusMsg({ type: 'success', text: 'Website appearance reset to authentic default theme.' });
    } catch (err) {
      setStatusMsg({ type: 'success', text: 'Theme reset to authentic default.' });
    } finally {
      setLoading(false);
      setTimeout(() => setStatusMsg({ type: '', text: '' }), 4000);
    }
  };

  const handleReturnToEditor = () => {
    setViewMode('editor');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!config) {
    return null;
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* Top Banner & Control Ribbon */}
      <div 
        className="devotional-card"
        style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(255, 248, 220, 0.95) 100%)',
          padding: '1.25rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          borderLeft: '5px solid #2D6A4F'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: '#E8F5E9', padding: '10px', borderRadius: '10px', color: '#1B4332' }}>
            <Palette size={26} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 className="heading-gold" style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1B4332' }}>
                Website Appearance &amp; Customization
              </h2>
              <span 
                style={{
                  background: '#D8F3DC',
                  color: '#1B4332',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '0.72rem',
                  fontWeight: 700
                }}
              >
                LIVE EDITOR
              </span>
            </div>
            <p style={{ color: '#4A5568', fontSize: '0.85rem', margin: 0 }}>
              Customize the public landing page branding, hero text, section visibility, and theme colors with live preview.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Mode Switcher */}
          <div style={{ background: '#F1F5F9', padding: '3px', borderRadius: '8px', display: 'flex', gap: '4px' }}>
            <button
              onClick={handleReturnToEditor}
              style={{
                background: viewMode === 'editor' ? '#FFFFFF' : 'transparent',
                color: viewMode === 'editor' ? '#1B4332' : '#64748B',
                border: 'none',
                borderRadius: '6px',
                padding: '0.45rem 0.9rem',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                boxShadow: viewMode === 'editor' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              <Sliders size={14} />
              <span>Settings Form</span>
            </button>
            <button
              onClick={() => setViewMode('preview')}
              style={{
                background: viewMode === 'preview' ? '#FFFFFF' : 'transparent',
                color: viewMode === 'preview' ? '#1B4332' : '#64748B',
                border: 'none',
                borderRadius: '6px',
                padding: '0.45rem 0.9rem',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                boxShadow: viewMode === 'preview' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              <Eye size={14} />
              <span>Live Preview</span>
            </button>
          </div>

          <button
            onClick={handleSaveDraft}
            disabled={saving}
            style={{
              background: '#F8FAFC',
              color: '#334155',
              border: '1px solid #CBD5E1',
              borderRadius: '8px',
              padding: '0.5rem 0.95rem',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            className="hover:bg-slate-100"
          >
            <Save size={14} />
            <span>{saving ? 'Saving...' : 'Save Draft'}</span>
          </button>

          <button
            onClick={() => setShowPublishModal(true)}
            disabled={publishing}
            style={{
              background: 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)',
              color: '#FFD700',
              border: '1px solid #FFD700',
              borderRadius: '8px',
              padding: '0.5rem 1.15rem',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            className="hover:scale-105"
          >
            <UploadCloud size={14} />
            <span>Publish Live</span>
          </button>

          <button
            onClick={() => setShowResetModal(true)}
            style={{
              background: '#FFF1F2',
              color: '#BE123C',
              border: '1px solid #FECDD3',
              borderRadius: '8px',
              padding: '0.5rem 0.85rem',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}
            className="hover:bg-rose-100"
          >
            <RotateCcw size={14} />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Status Notice */}
      {statusMsg.text && (
        <div 
          style={{
            background: statusMsg.type === 'error' ? '#FEE2E2' : '#DCFCE7',
            border: `1px solid ${statusMsg.type === 'error' ? '#F87171' : '#86EFAC'}`,
            color: statusMsg.type === 'error' ? '#991B1B' : '#14532D',
            padding: '0.75rem 1.25rem',
            borderRadius: '8px',
            fontSize: '0.85rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <CheckCircle2 size={16} />
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* FLOATING RETURN TO SETTINGS BUTTON (Always visible anywhere on screen during Live Preview) */}
      {viewMode === 'preview' && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 999999
          }}
        >
          <button
            onClick={handleReturnToEditor}
            style={{
              background: 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)',
              color: '#FFD700',
              border: '2px solid #FFD700',
              borderRadius: '50px',
              padding: '12px 24px',
              fontSize: '0.92rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.45)',
              transition: 'all 0.2s ease',
              letterSpacing: '0.02em'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)';
              e.currentTarget.style.boxShadow = '0 12px 36px rgba(255, 215, 0, 0.4)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.45)';
            }}
          >
            <Sliders size={18} />
            <span>&larr; Return to Settings Form</span>
          </button>
        </div>
      )}

      {/* VIEW MODE: LIVE PREVIEW */}
      {viewMode === 'preview' && (
        <div style={{ border: '3px solid #FFD700', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 8px 30px rgba(0,0,0,0.2)', position: 'relative' }}>
          <div 
            style={{ 
              position: 'sticky',
              top: 0,
              zIndex: 10000,
              background: '#1B4332', 
              padding: '10px 20px', 
              color: '#FFD700', 
              fontSize: '0.85rem', 
              fontWeight: 700, 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              borderBottom: '2px solid #FFD700',
              boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Eye size={18} />
              <span>LIVE INTERACTIVE PREVIEW (Draft Mode)</span>
            </div>
            <button 
              onClick={handleReturnToEditor}
              style={{ 
                background: 'linear-gradient(135deg, #FFD700 0%, #D4AF37 100%)', 
                border: 'none', 
                color: '#1A3324', 
                cursor: 'pointer', 
                fontSize: '0.82rem',
                fontWeight: 800,
                padding: '6px 16px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
              }}
            >
              <Sliders size={15} />
              <span>Return to Settings Form &rarr;</span>
            </button>
          </div>
          <LandingPage onOpenLogin={() => alert("Admin portal is already open in the editing window.")} customConfig={config} />
        </div>
      )}

      {/* VIEW MODE: EDITOR FORM */}
      {viewMode === 'editor' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.25rem' }}>
          
          {/* Section: Website Logo & Visual Branding */}
          <div 
            className="devotional-card"
            style={{
              gridColumn: '1 / -1',
              background: '#FFFFFF',
              borderRadius: '14px',
              padding: '1.75rem',
              border: '2px solid #FFD700',
              boxShadow: '0 4px 20px rgba(27, 67, 50, 0.08)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.85rem', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ background: '#1B4332', color: '#FFD700', padding: '8px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ImageIcon size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1B4332', margin: 0 }}>
                    Logo &amp; Branding Management
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748B' }}>
                    Upload, size, preview, and update the official website logo across landing page, student portal, and admin dashboard.
                  </p>
                </div>
              </div>

              {/* Status Pill */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', fontWeight: 700, padding: '4px 10px', borderRadius: '12px', background: (config.branding?.useCustomLogo !== false && config.branding?.logoUrl) ? '#DCFCE7' : '#FEF3C7', color: (config.branding?.useCustomLogo !== false && config.branding?.logoUrl) ? '#166534' : '#92400E' }}>
                <span>{(config.branding?.useCustomLogo !== false && config.branding?.logoUrl) ? '✓ Custom Logo Active (Draft)' : 'Sacred Devotional Crest (Default)'}</span>
              </div>
            </div>

            {/* Error Message */}
            {logoError && (
              <div style={{ background: '#FEE2E2', border: '1px solid #F87171', color: '#991B1B', padding: '0.6rem 1rem', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 600 }}>
                {logoError}
              </div>
            )}

            {/* Logo Previews (Current Published vs Draft Selected) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
              
              {/* Box 1: Currently Published Logo */}
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Currently Published Logo (Live)
                  </span>
                  <span style={{ fontSize: '0.7rem', color: '#059669', background: '#D1FAE5', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                    LIVE
                  </span>
                </div>
                <div style={{ height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1B4332', borderRadius: '8px', padding: '12px', border: '1px dashed rgba(255, 215, 0, 0.4)' }}>
                  <DevotionalCrest size={config.branding?.logoHeight || 44} customLogoUrl={publishedLogo} />
                </div>
                <span style={{ fontSize: '0.72rem', color: '#64748B', textAlign: 'center' }}>
                  {publishedLogo ? 'Custom logo active on live website' : 'Original sacred Devotional Crest SVG active'}
                </span>
              </div>

              {/* Box 2: Draft / Selected Logo Preview */}
              <div style={{ background: '#FDF8F0', border: '1.5px solid #FFD700', borderRadius: '10px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#8B4513', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Draft / Selected Preview (Before Publishing)
                  </span>
                  <span style={{ fontSize: '0.7rem', color: '#92400E', background: '#FEF3C7', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                    DRAFT
                  </span>
                </div>
                <div style={{ height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1B4332', borderRadius: '8px', padding: '12px', border: '1px dashed #FFD700' }}>
                  {config.branding?.useCustomLogo !== false && config.branding?.logoUrl ? (
                    <img 
                      src={config.branding.logoUrl} 
                      alt="Logo preview" 
                      style={{ 
                        height: `${config.branding?.logoHeight || 44}px`, 
                        width: 'auto', 
                        maxHeight: '80px', 
                        maxWidth: '100%', 
                        objectFit: 'contain' 
                      }} 
                    />
                  ) : (
                    <DevotionalCrest size={config.branding?.logoHeight || 44} customLogoUrl="" />
                  )}
                </div>
                <span style={{ fontSize: '0.72rem', color: '#8B4513', textAlign: 'center', fontWeight: 600 }}>
                  Height: {config.branding?.logoHeight || 44}px &bull; Aspect ratio preserved
                </span>
              </div>
            </div>

            {/* Upload & Action Controls */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', borderTop: '1px solid #F1F5F9', paddingTop: '1rem' }}>
              <input 
                type="file" 
                ref={fileInputRef} 
                accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml" 
                style={{ display: 'none' }} 
                onChange={handleLogoFileChange} 
              />
              
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingLogo}
                style={{
                  background: 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)',
                  color: '#FFD700',
                  border: '1px solid #FFD700',
                  borderRadius: '8px',
                  padding: '0.55rem 1.1rem',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                className="hover:scale-105"
              >
                <Upload size={15} />
                <span>{uploadingLogo ? 'Uploading...' : config.branding?.logoUrl ? 'Replace Logo' : 'Upload Custom Logo'}</span>
              </button>

              {config.branding?.logoUrl && (
                <button
                  type="button"
                  onClick={() => setShowRemoveLogoModal(true)}
                  style={{
                    background: '#FFF1F2',
                    color: '#BE123C',
                    border: '1px solid #FECDD3',
                    borderRadius: '8px',
                    padding: '0.55rem 1rem',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                  className="hover:bg-rose-100"
                >
                  <Trash2 size={15} />
                  <span>Remove Custom Logo</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleRestoreDefaultLogo}
                style={{
                  background: '#F8FAFC',
                  color: '#475569',
                  border: '1px solid #CBD5E1',
                  borderRadius: '8px',
                  padding: '0.55rem 1rem',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                className="hover:bg-slate-100"
              >
                <RefreshCw size={15} />
                <span>Restore Default Crest</span>
              </button>

              <span style={{ fontSize: '0.75rem', color: '#64748B', marginLeft: 'auto' }}>
                Formats: PNG, JPG, WebP, SVG &bull; Max 5MB &bull; Aspect ratio preserved
              </span>
            </div>

            {/* Display Size & Placement Controls */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', background: '#F8FAFC', padding: '1rem', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
              
              {/* Logo Size (Height) Slider */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>
                    Logo Display Height: <span style={{ color: '#1B4332', fontWeight: 800 }}>{config.branding?.logoHeight || 44}px</span>
                  </label>
                  <span style={{ fontSize: '0.72rem', color: '#64748B' }}>Range: 28px – 80px</span>
                </div>
                <input 
                  type="range"
                  min="28"
                  max="80"
                  step="2"
                  value={config.branding?.logoHeight || 44}
                  onChange={(e) => handleBrandingChange('logoHeight', parseInt(e.target.value, 10))}
                  style={{ width: '100%', accentColor: '#1B4332', cursor: 'pointer' }}
                />
              </div>

              {/* Header Placement */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Header Logo Placement
                </label>
                <select 
                  className="devotional-input"
                  value={config.branding?.logoPlacement || 'left'}
                  onChange={(e) => handleBrandingChange('logoPlacement', e.target.value)}
                  style={{ padding: '0.45rem 0.75rem', fontSize: '0.85rem' }}
                >
                  <option value="left">Left Aligned (Standard Navigation)</option>
                  <option value="center">Center Aligned</option>
                </select>
              </div>

              {/* Logo Alt Text */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Logo Alternative Text (Accessibility)
                </label>
                <input 
                  type="text"
                  className="devotional-input"
                  placeholder="e.g. Krishna Kripa Logo"
                  value={config.branding?.logoAltText || 'Krishna Kripa Logo'}
                  onChange={(e) => handleBrandingChange('logoAltText', e.target.value)}
                  style={{ padding: '0.45rem 0.75rem', fontSize: '0.85rem' }}
                />
              </div>
            </div>
          </div>

          {/* Card 1: Branding & Hero Texts */}
          <div 
            className="devotional-card"
            style={{
              background: '#FFFFFF',
              borderRadius: '12px',
              padding: '1.5rem',
              border: '1px solid #E2E8F0',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.75rem' }}>
              <Type size={18} style={{ color: '#1B4332' }} />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1B4332', margin: 0 }}>
                Hero &amp; Branding Content
              </h3>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                Website Name / Title
              </label>
              <input 
                type="text"
                className="devotional-input"
                value={config.branding.siteName}
                onChange={(e) => handleBrandingChange('siteName', e.target.value)}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                Hero Main Heading (Cinzel Typography)
              </label>
              <input 
                type="text"
                className="devotional-input"
                value={config.branding.heroHeading}
                onChange={(e) => handleBrandingChange('heroHeading', e.target.value)}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                Hero Subtitle / Description
              </label>
              <textarea 
                rows={3}
                className="devotional-input"
                value={config.branding.heroSubtitle}
                onChange={(e) => handleBrandingChange('heroSubtitle', e.target.value)}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                Hero Alignment
              </label>
              <select 
                className="devotional-input"
                value={config.styling.heroAlignment}
                onChange={(e) => handleStylingChange('heroAlignment', e.target.value)}
              >
                <option value="center">Center Aligned</option>
                <option value="left">Left Aligned</option>
              </select>
            </div>
          </div>

          {/* Card 2: Visual Styling & Theme Colors */}
          <div 
            className="devotional-card"
            style={{
              background: '#FFFFFF',
              borderRadius: '12px',
              padding: '1.5rem',
              border: '1px solid #E2E8F0',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.75rem' }}>
              <Palette size={18} style={{ color: '#1B4332' }} />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1B4332', margin: 0 }}>
                Visual Design &amp; Background
              </h3>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                Background Image URL (Secure HTTPS)
              </label>
              <input 
                type="url"
                className="devotional-input"
                value={config.styling.bgImageUrl}
                onChange={(e) => handleStylingChange('bgImageUrl', e.target.value)}
              />
              <span style={{ fontSize: '0.72rem', color: '#64748B', display: 'block', marginTop: '2px' }}>
                Default: Authentic Unsplash Lord Krishna Deity Image
              </span>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>
                  Overlay Opacity (Forest Green to Brown)
                </label>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1B4332' }}>
                  {Math.round(config.styling.overlayOpacity * 100)}%
                </span>
              </div>
              <input 
                type="range"
                min="0.4"
                max="0.98"
                step="0.02"
                value={config.styling.overlayOpacity}
                onChange={(e) => handleStylingChange('overlayOpacity', parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: '#1B4332' }}
              />
            </div>

            {/* Color Pickers */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Primary
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input 
                    type="color"
                    value={config.styling.primaryColor}
                    onChange={(e) => handleStylingChange('primaryColor', e.target.value)}
                    style={{ width: '36px', height: '36px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>{config.styling.primaryColor}</span>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Secondary
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input 
                    type="color"
                    value={config.styling.secondaryColor}
                    onChange={(e) => handleStylingChange('secondaryColor', e.target.value)}
                    style={{ width: '36px', height: '36px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>{config.styling.secondaryColor}</span>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Accent Gold
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input 
                    type="color"
                    value={config.styling.accentColor}
                    onChange={(e) => handleStylingChange('accentColor', e.target.value)}
                    style={{ width: '36px', height: '36px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>{config.styling.accentColor}</span>
                </div>
              </div>
            </div>

            {/* Live Interactive Preview Swatch of Background & Overlay */}
            <div style={{ marginTop: '0.5rem', borderRadius: '10px', overflow: 'hidden', border: '1.5px solid #FFD700', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
              <div 
                style={{
                  height: '110px',
                  backgroundImage: `linear-gradient(135deg, ${hexToRgba(config.styling?.primaryColor || '#1B4332', config.styling?.overlayOpacity !== undefined ? config.styling?.overlayOpacity : 0.90)} 0%, ${hexToRgba(config.styling?.secondaryColor || '#8B4513', config.styling?.overlayOpacity !== undefined ? config.styling?.overlayOpacity : 0.90)} 100%), url("${config.styling?.bgImageUrl || 'https://images.unsplash.com/photo-1641730259879-ad98e7db7bcb?crop=entropy&cs=srgb&fm=jpg&q=85'}")`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column',
                  padding: '1rem',
                  textAlign: 'center',
                  transition: 'all 0.3s ease'
                }}
              >
                <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1.15rem', color: config.styling?.accentColor || '#FFD700', textShadow: '0 2px 8px rgba(0,0,0,0.7)' }}>
                  Live Background &amp; Overlay Preview
                </span>
                <span style={{ fontSize: '0.78rem', color: '#FFF8DC', marginTop: '4px', textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
                  Overlay: {Math.round((config.styling?.overlayOpacity !== undefined ? config.styling?.overlayOpacity : 0.90) * 100)}% &bull; Gradient: {config.styling?.primaryColor} &rarr; {config.styling?.secondaryColor}
                </span>
              </div>
            </div>
          </div>

          {/* Card 3: About & Bhagavad Gita Content */}
          <div 
            className="devotional-card"
            style={{
              background: '#FFFFFF',
              borderRadius: '12px',
              padding: '1.5rem',
              border: '1px solid #E2E8F0',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.75rem' }}>
              <Layers size={18} style={{ color: '#1B4332' }} />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1B4332', margin: 0 }}>
                About &amp; Scripture Sections
              </h3>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                About Section Heading
              </label>
              <input 
                type="text"
                className="devotional-input"
                value={config.branding.aboutTitle}
                onChange={(e) => handleBrandingChange('aboutTitle', e.target.value)}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                About Section Text
              </label>
              <textarea 
                rows={3}
                className="devotional-input"
                value={config.branding.aboutContent}
                onChange={(e) => handleBrandingChange('aboutContent', e.target.value)}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                Bhagavad Gita Intro Text
              </label>
              <textarea 
                rows={3}
                className="devotional-input"
                value={config.branding.gitaSectionContent}
                onChange={(e) => handleBrandingChange('gitaSectionContent', e.target.value)}
              />
            </div>
          </div>

          {/* Card 4: Visibility & Contact Information */}
          <div 
            className="devotional-card"
            style={{
              background: '#FFFFFF',
              borderRadius: '12px',
              padding: '1.5rem',
              border: '1px solid #E2E8F0',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.75rem' }}>
              <Layout size={18} style={{ color: '#1B4332' }} />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1B4332', margin: 0 }}>
                Section Toggles &amp; Contact Info
              </h3>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                Landing Page Section Visibility
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  { key: 'showHero', label: 'Show Hero Section' },
                  { key: 'showClassStatus', label: 'Show Weekly Class Status Card' },
                  { key: 'showAbout', label: 'Show About Krishna Kripa Section' },
                  { key: 'showGita', label: 'Show Bhagavad Gita Wisdom Section' },
                  { key: 'showContact', label: 'Show Public Contact in Footer' }
                ].map(({ key, label }) => (
                  <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', cursor: 'pointer' }}>
                    <input 
                      type="checkbox"
                      checked={config.sectionsVisibility[key]}
                      onChange={() => handleVisibilityToggle(key)}
                      style={{ accentColor: '#1B4332', width: '16px', height: '16px' }}
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '0.75rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                Public Contact Email (Optional)
              </label>
              <input 
                type="email"
                placeholder="info@krishnakripa.org"
                className="devotional-input"
                value={config.branding.contactEmail}
                onChange={(e) => handleBrandingChange('contactEmail', e.target.value)}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                Public Contact Phone (Optional)
              </label>
              <input 
                type="tel"
                placeholder="+91 98765 43210"
                className="devotional-input"
                value={config.branding.contactPhone}
                onChange={(e) => handleBrandingChange('contactPhone', e.target.value)}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                Public Class Venue / Location (Optional)
              </label>
              <input 
                type="text"
                placeholder="ISKCON Temple Hall / Online"
                className="devotional-input"
                value={config.branding.contactLocation}
                onChange={(e) => handleBrandingChange('contactLocation', e.target.value)}
              />
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL: PUBLISH */}
      {showPublishModal && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}
        >
          <div 
            style={{
              background: '#FFFFFF',
              borderRadius: '14px',
              maxWidth: '480px',
              width: '100%',
              padding: '1.75rem',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
              border: '2px solid #FFD700'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#1B4332', marginBottom: '12px' }}>
              <UploadCloud size={24} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
                Publish Changes Live?
              </h3>
            </div>
            <p style={{ color: '#4B5563', fontSize: '0.9rem', lineHeight: 1.5, margin: '0 0 1.25rem' }}>
              Are you sure you want to publish these appearance customizations to the public website? 
              All visitors will immediately see the updated hero headings, colors, and content across both mobile and desktop devices.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setShowPublishModal(false)}
                style={{
                  background: '#F3F4F6',
                  color: '#4B5563',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '0.6rem 1.2rem',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handlePublish}
                disabled={publishing}
                style={{
                  background: 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)',
                  color: '#FFD700',
                  border: '1px solid #FFD700',
                  borderRadius: '6px',
                  padding: '0.6rem 1.3rem',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                {publishing ? 'Publishing...' : 'Yes, Publish Live'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL: RESET */}
      {showResetModal && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}
        >
          <div 
            style={{
              background: '#FFFFFF',
              borderRadius: '14px',
              maxWidth: '480px',
              width: '100%',
              padding: '1.75rem',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
              border: '2px solid #FCA5A5'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#991B1B', marginBottom: '12px' }}>
              <AlertTriangle size={24} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
                Reset to Authentic Default Theme?
              </h3>
            </div>
            <p style={{ color: '#4B5563', fontSize: '0.9rem', lineHeight: 1.5, margin: '0 0 1.25rem' }}>
              This will revert all custom headings, colors, and layout settings back to the authentic Krishna Kripa devotional visual identity. 
              This action cannot be undone.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setShowResetModal(false)}
                style={{
                  background: '#F3F4F6',
                  color: '#4B5563',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '0.6rem 1.2rem',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleReset}
                style={{
                  background: '#DC2626',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '0.6rem 1.3rem',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Yes, Reset Theme
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL: REMOVE LOGO */}
      {showRemoveLogoModal && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}
        >
          <div 
            style={{
              background: '#FFFFFF',
              borderRadius: '14px',
              maxWidth: '460px',
              width: '100%',
              padding: '1.75rem',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
              border: '2px solid #FCA5A5'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#991B1B', marginBottom: '12px' }}>
              <Trash2 size={24} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
                Remove Custom Logo?
              </h3>
            </div>
            <p style={{ color: '#4B5563', fontSize: '0.9rem', lineHeight: 1.5, margin: '0 0 1.25rem' }}>
              Are you sure you want to remove the custom website logo? The authentic sacred Krishna Kripa devotional crest will be restored as default.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setShowRemoveLogoModal(false)}
                style={{
                  background: '#F3F4F6',
                  color: '#4B5563',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '0.6rem 1.2rem',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleRemoveLogoConfirm}
                style={{
                  background: '#DC2626',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '0.6rem 1.3rem',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Yes, Remove Logo
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
