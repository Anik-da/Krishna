import React, { useState, useEffect } from 'react';
import { DevotionalCrest } from '../../assets/crest';
import { apiGetPublishedConfig, apiGetCurrentPlan } from '../../api/apiClient';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  BookOpen, 
  CheckCircle2, 
  AlertCircle, 
  Info, 
  ShieldAlert, 
  Sparkles, 
  LogIn, 
  ChevronRight, 
  Heart,
  Mail,
  Phone,
  Compass,
  GraduationCap,
  Trophy,
  Award,
  Medal,
  ShieldCheck,
  Flame,
  Menu,
  X
} from 'lucide-react';

import { 
  getCurrentWeeklyPlanLocal, 
  getPublishedAppearanceConfig, 
  hexToRgba, 
  formatDateDMY,
  applyDeadlineAutoClosure,
  isPastFridayDeadline,
  getActiveJanmashtamiSeasonLocal,
  calculateJanmashtamiStandingsLocal
} from '../../db/db';
import { apiGetPublicJanmashtamiLeaderboard } from '../../api/apiClient';

export const LandingPage = ({ onOpenLogin, onOpenStudentLogin, customConfig = null, initialPlan = null }) => {
  const [config, setConfig] = useState(customConfig || null);
  const [currentPlan, setCurrentPlan] = useState(initialPlan || null);
  const [loading, setLoading] = useState(!customConfig);
  
  // Janmashtami Challenge State
  const [janmSeason, setJanmSeason] = useState(null);
  const [janmLeaderboard, setJanmLeaderboard] = useState([]);
  const [showAllRankings, setShowAllRankings] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (initialPlan) {
      setCurrentPlan(applyDeadlineAutoClosure(initialPlan));
    }
  }, [initialPlan]);

  useEffect(() => {
    // Load local confirmed weekly plan immediately in <1ms
    getCurrentWeeklyPlanLocal().then(p => {
      if (p) setCurrentPlan(applyDeadlineAutoClosure(p));
    }).catch(() => {});

    // Listen to real-time weekly plan confirmation updates
    const handlePlanUpdate = (e) => {
      if (e?.detail) {
        setCurrentPlan(applyDeadlineAutoClosure(e.detail));
      }
    };
    const handleStorage = (e) => {
      if (e.key === 'krishna_current_weekly_plan' && e.newValue) {
        try {
          setCurrentPlan(applyDeadlineAutoClosure(JSON.parse(e.newValue)));
        } catch {}
      }
    };

    window.addEventListener('krishna_plan_updated', handlePlanUpdate);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('krishna_plan_updated', handlePlanUpdate);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  useEffect(() => {
    // 1. Immediately compute & load authentic Janmashtami standings locally
    getActiveJanmashtamiSeasonLocal().then(activeSeason => {
      setJanmSeason(activeSeason);
      calculateJanmashtamiStandingsLocal(activeSeason).then(allStandings => {
        const publicList = (allStandings || [])
          .filter(s => s.totalPoints > 0)
          .slice(0, 10)
          .map(s => ({
            rank: s.rank,
            displayName: s.displayName,
            totalPoints: s.totalPoints,
            classesAttended: s.classesAttended,
            isWinner: s.isWinner,
            prizeTitle: s.prizeTitle
          }));
        setJanmLeaderboard(publicList);
      }).catch(() => {});
    }).catch(() => {});

    // 2. Background sync with cloud backend
    apiGetPublicJanmashtamiLeaderboard().then(res => {
      if (res?.season) setJanmSeason(res.season);
      if (res?.leaderboard) setJanmLeaderboard(res.leaderboard);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (customConfig) {
      setConfig(customConfig);
      return;
    }

    // Immediately load published configuration from local storage (<1ms)
    getPublishedAppearanceConfig().then(cfg => {
      if (cfg) {
        setConfig(cfg);
        setLoading(false);
      }
    }).catch(() => {});

    // Listen to real-time appearance config updates
    const handleConfigUpdate = (e) => {
      if (e?.detail) {
        setConfig(e.detail);
      }
    };
    const handleConfigStorage = (e) => {
      if (e.key === 'krishna_published_config' && e.newValue) {
        try {
          setConfig(JSON.parse(e.newValue));
        } catch {}
      }
    };

    window.addEventListener('krishna_config_updated', handleConfigUpdate);
    window.addEventListener('storage', handleConfigStorage);

    // Background sync with API if available
    apiGetPublishedConfig().then(remoteCfg => {
      if (remoteCfg) setConfig(remoteCfg);
    }).catch(() => {}).finally(() => setLoading(false));

    return () => {
      window.removeEventListener('krishna_config_updated', handleConfigUpdate);
      window.removeEventListener('storage', handleConfigStorage);
    };
  }, [customConfig]);

  const branding = config?.branding || {
    siteName: 'Krishna Kripa — Bhagavad Gita Attendance Management',
    heroHeading: 'Srimad Bhagavad Gita Weekend Classes',
    heroSubtitle: 'Timeless Vedic Wisdom for Character, Clarity, and Spiritual Growth',
    aboutTitle: 'About Krishna Kripa',
    aboutContent: 'Krishna Kripa is dedicated to sharing the timeless wisdom of the Bhagavad Gita with students and seekers every weekend. Through interactive sessions, guided discussions, and practical lifestyle applications, we nurture spiritual awareness, moral grounding, and inner peace.',
    gitaSectionTitle: 'The Sacred Science of Bhagavad Gita',
    gitaSectionContent: 'Spoken by Lord Sri Krishna on the battlefield of Kurukshetra, the Bhagavad Gita offers eternal guidance for navigating stress, mastering duty without anxiety, and discovering the supreme path of devotional service (Bhakti Yoga).',
    footerText: 'Dedicated to Bhagavad Gita Study',
    contactEmail: '',
    contactPhone: '',
    contactLocation: ''
  };

  const styling = config?.styling || {
    bgImageUrl: 'https://images.unsplash.com/photo-1641730259879-ad98e7db7bcb?crop=entropy&cs=srgb&fm=jpg&q=85',
    overlayOpacity: 0.90,
    primaryColor: '#1B4332',
    secondaryColor: '#8B4513',
    accentColor: '#FFD700',
    heroAlignment: 'center'
  };

  const visibility = config?.sectionsVisibility || {
    showHero: true,
    showClassStatus: true,
    showAbout: true,
    showGita: true,
    showContact: true
  };

  // Scroll smoothly to section
  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const primaryRgba = hexToRgba(styling.primaryColor || '#1B4332', styling.overlayOpacity !== undefined ? styling.overlayOpacity : 0.90);
  const secondaryRgba = hexToRgba(styling.secondaryColor || '#8B4513', styling.overlayOpacity !== undefined ? styling.overlayOpacity : 0.90);

  return (
    <div 
      className="landing-page-root"
      style={{
        minHeight: '100vh',
        minHeight: '100dvh',
        position: 'relative',
        color: '#FFF8DC',
        display: 'flex',
        flexDirection: 'column',
        isolation: 'isolate'
      }}
    >
      {/* Fixed Viewport Background Layer for Flawless Mobile & Desktop Rendering */}
      <div 
        className="landing-bg-fixed-layer"
        aria-hidden="true"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100vw',
          height: '100vh',
          height: '100dvh',
          backgroundImage: `linear-gradient(135deg, ${primaryRgba} 0%, ${secondaryRgba} 100%), url("${styling.bgImageUrl || 'https://images.unsplash.com/photo-1641730259879-ad98e7db7bcb?crop=entropy&cs=srgb&fm=jpg&q=85'}")`,
          backgroundSize: 'cover',
          backgroundPosition: 'center center',
          backgroundRepeat: 'no-repeat',
          zIndex: -1,
          pointerEvents: 'none',
          transform: 'translateZ(0)',
          WebkitTransform: 'translateZ(0)'
        }}
      />
      {/* 1. PUBLIC NAVIGATION BAR */}
      <header 
        className="landing-header"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          background: 'rgba(27, 67, 50, 0.84)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255, 215, 0, 0.35)',
          padding: '0.65rem 1rem',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)'
        }}
      >
        <div 
          className="landing-header-container"
          style={{
            maxWidth: '1280px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem'
          }}
        >
          {/* Logo / Crest */}
          <div 
            className="nav-brand-container"
            style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', minWidth: 0 }}
            onClick={() => { setMobileMenuOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
          >
            <div 
              className="nav-brand-logo-wrap"
              style={{
                '--header-logo-height': `${Math.max(Number(branding.logoHeight) || 46, 42)}px`
              }}
            >
              <DevotionalCrest 
                size={Math.max(Number(branding.logoHeight) || 46, 42)} 
                customLogoUrl={branding.useCustomLogo !== false ? branding.logoUrl : ''} 
                alt={branding.logoAltText || "Krishna Kripa Logo"} 
              />
            </div>
            <div className="nav-brand-text-wrap" style={{ minWidth: 0 }}>
              <span 
                className="nav-brand-title"
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: 'clamp(1rem, 3.5vw, 1.25rem)',
                  fontWeight: 800,
                  color: '#FFD700',
                  letterSpacing: '0.04em',
                  textShadow: '0 1px 3px rgba(0, 0, 0, 0.4)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: 'block'
                }}
              >
                KRISHNA KRIPA
              </span>
              <span 
                className="nav-brand-subtitle"
                style={{
                  display: 'block',
                  fontSize: 'clamp(0.6rem, 2vw, 0.68rem)',
                  color: '#F0E68C',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                Bhagavad Gita Study Circle
              </span>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav 
            className="nav-desktop-links"
            style={{
              fontSize: '0.9rem',
              fontWeight: 500
            }}
          >
            <button 
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              style={{ background: 'none', border: 'none', color: '#FFF8DC', cursor: 'pointer', padding: '0.4rem 0.5rem' }}
            >
              Home
            </button>
            <button 
              onClick={() => scrollTo('class-status')}
              style={{ background: 'none', border: 'none', color: '#FFF8DC', cursor: 'pointer', padding: '0.4rem 0.5rem' }}
            >
              Class Information
            </button>
            <button 
              onClick={() => scrollTo('about')}
              style={{ background: 'none', border: 'none', color: '#FFF8DC', cursor: 'pointer', padding: '0.4rem 0.5rem' }}
            >
              About
            </button>
            <button 
              onClick={() => scrollTo('gita')}
              style={{ background: 'none', border: 'none', color: '#FFF8DC', cursor: 'pointer', padding: '0.4rem 0.5rem' }}
            >
              Bhagavad Gita
            </button>
          </nav>

          {/* Desktop Action CTAs: Student Login & Admin Login */}
          <div className="nav-desktop-actions">
            <button
              onClick={onOpenStudentLogin}
              style={{
                background: '#1B4332',
                color: '#FFD700',
                border: '1.5px solid #FFD700',
                borderRadius: '8px',
                padding: '0.55rem 1rem',
                fontWeight: 700,
                fontSize: '0.84rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
                whiteSpace: 'nowrap'
              }}
            >
              <GraduationCap size={16} />
              <span>Student Login</span>
            </button>

            <button
              onClick={onOpenLogin}
              style={{
                background: 'linear-gradient(135deg, #FFD700 0%, #FFB703 100%)',
                color: '#1B4332',
                border: '1px solid #FFE066',
                borderRadius: '8px',
                padding: '0.55rem 1rem',
                fontWeight: 700,
                fontSize: '0.84rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
                whiteSpace: 'nowrap'
              }}
            >
              <LogIn size={15} />
              <span>Admin Login</span>
            </button>
          </div>

          {/* Mobile Right Controls: Compact Student Button + Hamburger Toggle */}
          <div className="nav-mobile-toggle">
            <button
              onClick={onOpenStudentLogin}
              className="nav-mobile-student-btn"
              style={{
                background: '#1B4332',
                color: '#FFD700',
                border: '1.5px solid #FFD700',
                borderRadius: '6px',
                padding: '0.4rem 0.65rem',
                fontWeight: 700,
                fontSize: '0.78rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                whiteSpace: 'nowrap'
              }}
              aria-label="Student Portal"
            >
              <GraduationCap size={14} />
              <span>Student</span>
            </button>

            <button
              onClick={() => setMobileMenuOpen(prev => !prev)}
              className="nav-mobile-menu-btn"
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                color: '#FFD700',
                border: '1px solid rgba(255, 215, 0, 0.4)',
                borderRadius: '6px',
                padding: '0.45rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              background: 'rgba(13, 41, 30, 0.98)',
              backdropFilter: 'blur(16px)',
              borderBottom: '2px solid #FFD700',
              padding: '1.25rem 1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              boxShadow: '0 12px 30px rgba(0,0,0,0.6)',
              zIndex: 100
            }}
          >
            <button 
              onClick={() => { setMobileMenuOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              style={{ textAlign: 'left', padding: '0.75rem 1rem', background: 'rgba(255, 255, 255, 0.06)', borderRadius: '8px', color: '#FFF8DC', fontSize: '1rem', fontWeight: 600, border: '1px solid rgba(255, 215, 0, 0.2)' }}
            >
              Home
            </button>
            <button 
              onClick={() => { setMobileMenuOpen(false); scrollTo('class-status'); }}
              style={{ textAlign: 'left', padding: '0.75rem 1rem', background: 'rgba(255, 255, 255, 0.06)', borderRadius: '8px', color: '#FFF8DC', fontSize: '1rem', fontWeight: 600, border: '1px solid rgba(255, 215, 0, 0.2)' }}
            >
              Class Information
            </button>
            <button 
              onClick={() => { setMobileMenuOpen(false); scrollTo('about'); }}
              style={{ textAlign: 'left', padding: '0.75rem 1rem', background: 'rgba(255, 255, 255, 0.06)', borderRadius: '8px', color: '#FFF8DC', fontSize: '1rem', fontWeight: 600, border: '1px solid rgba(255, 215, 0, 0.2)' }}
            >
              About Krishna Kripa
            </button>
            <button 
              onClick={() => { setMobileMenuOpen(false); scrollTo('gita'); }}
              style={{ textAlign: 'left', padding: '0.75rem 1rem', background: 'rgba(255, 255, 255, 0.06)', borderRadius: '8px', color: '#FFF8DC', fontSize: '1rem', fontWeight: 600, border: '1px solid rgba(255, 215, 0, 0.2)' }}
            >
              Bhagavad Gita Study
            </button>

            <div style={{ height: '1px', background: 'rgba(255, 215, 0, 0.25)', margin: '0.25rem 0' }} />

            <button
              onClick={() => { setMobileMenuOpen(false); onOpenStudentLogin(); }}
              style={{
                background: '#1B4332',
                color: '#FFD700',
                border: '1.5px solid #FFD700',
                borderRadius: '8px',
                padding: '0.85rem 1rem',
                fontWeight: 700,
                fontSize: '0.95rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 3px 10px rgba(0,0,0,0.3)'
              }}
            >
              <GraduationCap size={18} />
              <span>Student Portal / Register</span>
            </button>

            <button
              onClick={() => { setMobileMenuOpen(false); onOpenLogin(); }}
              style={{
                background: 'linear-gradient(135deg, #FFD700 0%, #FFB703 100%)',
                color: '#1B4332',
                border: '1px solid #FFE066',
                borderRadius: '8px',
                padding: '0.85rem 1rem',
                fontWeight: 700,
                fontSize: '0.95rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 3px 10px rgba(255, 215, 0, 0.3)'
              }}
            >
              <LogIn size={16} />
              <span>Admin Login</span>
            </button>
          </div>
        )}
      </header>

      {/* 2. HERO SECTION */}
      {visibility.showHero && (
        <section 
          id="hero"
          className="landing-section-hero"
          style={{
            padding: '4.5rem 1.5rem 3.5rem',
            textAlign: styling.heroAlignment,
            maxWidth: '1080px',
            margin: '0 auto',
            width: '100%'
          }}
        >
          {/* Sanskrit Invocation Badge */}
          <div 
            className="hero-badge"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(255, 215, 0, 0.15)',
              border: '1px solid rgba(255, 215, 0, 0.4)',
              borderRadius: '24px',
              padding: '0.35rem 1.15rem',
              fontSize: '0.82rem',
              fontWeight: 700,
              color: '#FFD700',
              marginBottom: '1.5rem',
              letterSpacing: '0.06em',
              textTransform: 'uppercase'
            }}
          >
            <span>Krishna Kripa</span>
          </div>

          <h1 
            className="hero-heading"
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 'clamp(2.2rem, 5vw, 3.6rem)',
              fontWeight: 900,
              lineHeight: 1.18,
              color: '#FFF8DC',
              marginBottom: '1.25rem',
              textShadow: '0 2px 10px rgba(0, 0, 0, 0.5)'
            }}
          >
            {branding.heroHeading}
          </h1>

          <p 
            className="hero-subtitle"
            style={{
              fontSize: 'clamp(1.05rem, 2vw, 1.35rem)',
              color: '#F4ECE1',
              maxWidth: '820px',
              margin: styling.heroAlignment === 'center' ? '0 auto 2.25rem' : '0 0 2.25rem',
              lineHeight: 1.6,
              opacity: 0.95
            }}
          >
            {branding.heroSubtitle}
          </p>

          {/* Hero CTAs */}
          <div 
            className="hero-cta-container"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: styling.heroAlignment === 'center' ? 'center' : 'flex-start',
              gap: '1rem',
              flexWrap: 'wrap'
            }}
          >
            <button
              onClick={onOpenStudentLogin}
              className="hero-cta-btn hover:scale-105 active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #FFD700 0%, #FFB703 100%)',
                color: '#1B4332',
                border: 'none',
                borderRadius: '8px',
                padding: '0.85rem 1.75rem',
                fontSize: '1rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 15px rgba(255, 215, 0, 0.4)',
                transition: 'all 0.2s'
              }}
            >
              <GraduationCap size={20} />
              <span>Student Attendance Portal</span>
              <ChevronRight size={18} />
            </button>

            <button
              onClick={() => scrollTo('class-status')}
              className="hero-cta-btn hover:bg-white/20 active:scale-95"
              style={{
                background: 'rgba(255, 255, 255, 0.12)',
                color: '#FFF8DC',
                border: '1px solid rgba(255, 215, 0, 0.5)',
                borderRadius: '8px',
                padding: '0.85rem 1.6rem',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backdropFilter: 'blur(5px)',
                transition: 'all 0.2s'
              }}
            >
              <span>Explore Weekly Class</span>
            </button>
          </div>
        </section>
      )}

      {/* 3. UPCOMING WEEKLY CLASS CONFIRMATION STATUS */}
      {visibility.showClassStatus && (
        <section 
          id="class-status"
          className="landing-section"
          style={{
            maxWidth: '1100px',
            margin: '0 auto 4rem',
            padding: '0 1.5rem',
            width: '100%'
          }}
        >
          <div 
            className="landing-card"
            style={{
              background: 'rgba(255, 255, 255, 0.96)',
              borderRadius: '16px',
              padding: '2.25rem 2rem',
              color: '#1B4332',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.35)',
              border: '2px solid rgba(255, 215, 0, 0.7)'
            }}
          >
            {/* Section Header */}
            <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
              <div 
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#E8F5E9',
                  color: '#1B4332',
                  padding: '4px 14px',
                  borderRadius: '16px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  marginBottom: '8px'
                }}
              >
                <Calendar size={14} />
                <span>WEEKLY CLASS CONFIRMATION</span>
              </div>
              <h2 
                className="class-status-title"
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: '1.85rem',
                  fontWeight: 800,
                  color: '#1B4332',
                  margin: '4px 0'
                }}
              >
                Upcoming Class Schedule &amp; Status
              </h2>
              <p className="class-status-subtitle" style={{ color: '#4A5568', fontSize: '0.92rem', maxWidth: '600px', margin: '0 auto' }}>
                Classes are conducted on either <strong>Saturday OR Sunday</strong> each week. Please check the verified status below.
              </p>
            </div>

            {/* CLASS STATUS BADGES & DETAILS */}
            {(!currentPlan || currentPlan.status === 'undecided') && !isPastFridayDeadline(currentPlan?.saturdayDate) && (
              <div 
                className="status-box-inner"
                style={{
                  background: '#FFFBEB',
                  border: '1px solid #FCD34D',
                  borderRadius: '12px',
                  padding: '1.5rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '14px'
                }}
              >
                <Info size={24} style={{ color: '#D97706', flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#92400E', margin: '0 0 4px' }}>
                    This Week's Schedule is Being Confirmed
                  </h3>
                  <p style={{ color: '#B45309', fontSize: '0.92rem', margin: 0, lineHeight: 1.5 }}>
                    The coordinators are currently finalizing the weekend class schedule for Saturday and Sunday. 
                    Please check back soon for confirmed timings and venue details.
                  </p>
                </div>
              </div>
            )}

            {currentPlan?.status === 'scheduled' && (
              <div 
                className="status-box-inner"
                style={{
                  background: 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)',
                  border: '2px solid #86EFAC',
                  borderRadius: '14px',
                  padding: '1.75rem',
                  boxShadow: '0 4px 15px rgba(34, 197, 94, 0.12)'
                }}
              >
                <div className="class-status-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
                  <div>
                    <span 
                      style={{
                        background: '#16A34A',
                        color: '#FFFFFF',
                        padding: '4px 12px',
                        borderRadius: '20px',
                        fontSize: '0.78rem',
                        fontWeight: 800,
                        letterSpacing: '0.04em',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <CheckCircle2 size={14} />
                      CLASS CONFIRMED &bull; {currentPlan.selectedDay?.toUpperCase()}
                    </span>
                    <h3 
                      className="section-heading"
                      style={{
                        fontFamily: 'var(--font-heading)',
                        fontSize: '1.65rem',
                        fontWeight: 800,
                        color: '#14532D',
                        margin: '10px 0 4px'
                      }}
                    >
                      {currentPlan.selectedDay}, {formatDateDMY(currentPlan.scheduledDate)}
                    </h3>
                    {currentPlan.topic && (
                      <div style={{ fontSize: '1.05rem', color: '#166534', fontWeight: 600 }}>
                        Topic: {currentPlan.topic}
                      </div>
                    )}
                  </div>

                  <div className="class-status-time-badge" style={{ textAlign: 'right' }}>
                    <div 
                      style={{
                        background: '#FFFFFF',
                        border: '1px solid #BBF7D0',
                        borderRadius: '10px',
                        padding: '0.65rem 1.25rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        color: '#15803D',
                        fontWeight: 700,
                        fontSize: '1.05rem'
                      }}
                    >
                      <Clock size={18} />
                      <span>{currentPlan.scheduledTime || '06:00 PM – 08:00 PM'}</span>
                    </div>
                  </div>
                </div>

                {/* Location / Instructions if configured */}
                {currentPlan.location && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#166534', fontSize: '0.92rem', marginBottom: '10px' }}>
                    <MapPin size={16} />
                    <span><strong>Venue / Mode:</strong> {currentPlan.location}</span>
                  </div>
                )}

                {/* Public announcement if present */}
                {currentPlan.publicAnnouncement && (
                  <div 
                    style={{
                      background: 'rgba(255, 255, 255, 0.85)',
                      borderLeft: '4px solid #16A34A',
                      padding: '0.85rem 1rem',
                      borderRadius: '0 8px 8px 0',
                      color: '#14532D',
                      fontSize: '0.9rem',
                      marginTop: '0.75rem'
                    }}
                  >
                    <strong>Special Announcement:</strong> {currentPlan.publicAnnouncement}
                  </div>
                )}
              </div>
            )}

            {(currentPlan?.status === 'no_class' || ((!currentPlan || currentPlan?.status === 'undecided') && isPastFridayDeadline(currentPlan?.saturdayDate))) && (
              <div 
                className="status-box-inner"
                style={{
                  background: '#FEF3C7',
                  border: '1px solid #F59E0B',
                  borderRadius: '12px',
                  padding: '1.5rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '14px'
                }}
              >
                <Info size={24} style={{ color: '#D97706', flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#92400E', margin: '0 0 6px' }}>
                    No Class Planned This Week
                  </h3>
                  <p style={{ color: '#78350F', fontSize: '0.92rem', margin: 0, lineHeight: 1.5 }}>
                    {(() => {
                      const msg = currentPlan?.publicAnnouncement;
                      if (!msg || /deadline|friday|admin update|auto-closed|without an admin/i.test(msg)) {
                        return "There are no Bhagavad Gita classes scheduled for this weekend. Regular classes will resume next week. We encourage students to continue their self-study and chanting.";
                      }
                      return msg;
                    })()}
                  </p>
                </div>
              </div>
            )}

            {currentPlan?.status === 'cancelled' && (
              <div 
                className="status-box-inner"
                style={{
                  background: '#FEF2F2',
                  border: '2px solid #EF4444',
                  borderRadius: '12px',
                  padding: '1.5rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '14px'
                }}
              >
                <ShieldAlert size={26} style={{ color: '#DC2626', flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <span 
                    style={{
                      background: '#DC2626',
                      color: '#FFFFFF',
                      padding: '2px 10px',
                      borderRadius: '12px',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      textTransform: 'uppercase'
                    }}
                  >
                    EMERGENCY CANCELLATION NOTICE
                  </span>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#991B1B', margin: '8px 0 6px' }}>
                    Weekend Class Cancelled
                  </h3>
                  <p style={{ color: '#7F1D1D', fontSize: '0.95rem', margin: '0 0 8px', lineHeight: 1.5 }}>
                    {currentPlan.cancellationReason || "The scheduled class for this weekend has been cancelled due to unavoidable circumstances. We apologize for the inconvenience."}
                  </p>
                  {currentPlan.publicAnnouncement && currentPlan.publicAnnouncement !== currentPlan.cancellationReason && (
                    <p style={{ color: '#991B1B', fontSize: '0.9rem', fontStyle: 'italic', margin: 0 }}>
                      Note: {currentPlan.publicAnnouncement}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* 3.5 JANMASHTAMI SEVA POINTS LEADERBOARD (PUBLIC DISPLAY) */}
      <section 
        id="janmashtami-leaderboard"
        className="landing-section"
        style={{
          maxWidth: '1100px',
          margin: '0 auto 4rem',
          padding: '0 1.5rem',
          width: '100%'
        }}
      >
        <div 
          className="landing-card-dark"
          style={{
            background: 'linear-gradient(135deg, rgba(15, 42, 29, 0.96) 0%, rgba(27, 67, 50, 0.94) 100%)',
            borderRadius: '16px',
            padding: '2.5rem 2rem',
            border: '2px solid rgba(255, 215, 0, 0.55)',
            boxShadow: '0 12px 35px rgba(0, 0, 0, 0.35)',
            color: '#FFF8DC',
            backdropFilter: 'blur(8px)',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* Subtle Devotional Background Glow */}
          <div 
            style={{
              position: 'absolute',
              top: '-30px',
              right: '-30px',
              width: '220px',
              height: '220px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255, 215, 0, 0.15) 0%, transparent 70%)',
              pointerEvents: 'none'
            }}
          />

          {/* Section Header */}
          <div style={{ textAlign: 'center', marginBottom: '2rem', position: 'relative', zIndex: 2 }}>
            <div 
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(255, 215, 0, 0.15)',
                border: '1px solid rgba(255, 215, 0, 0.4)',
                padding: '5px 14px',
                borderRadius: '20px',
                fontSize: '0.78rem',
                fontWeight: 700,
                color: '#FFD700',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                marginBottom: '10px'
              }}
            >
              <Trophy size={15} style={{ color: '#FFD700' }} />
              <span>ANNUAL JANMASHTAMI SEVA CHALLENGE &bull; {janmSeason?.year || 2027}</span>
            </div>

            <h2 
              className="leaderboard-section-title"
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '2.1rem',
                fontWeight: 800,
                color: '#FFD700',
                margin: '6px 0 10px'
              }}
            >
              Janmashtami Seva Points Leaderboard
            </h2>

            <p className="leaderboard-section-desc" style={{ color: '#FFF8DC', fontSize: '1rem', lineHeight: 1.6, maxWidth: '820px', margin: '0 auto 12px' }}>
              Students earn Seva Points for every confirmed weekend Bhagavad Gita class they attend. 
              The highest-ranking devotees will be honored with sacred devotional awards on Sri Krishna Janmashtami!
            </p>

            {/* Verified Date Badge */}
            {janmSeason?.isDateVerified && janmSeason?.eventDate ? (
              <div 
                className="leaderboard-date-badge"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'rgba(216, 243, 220, 0.15)',
                  border: '1px solid rgba(82, 183, 136, 0.5)',
                  padding: '4px 12px',
                  borderRadius: '16px',
                  fontSize: '0.82rem',
                  color: '#D8F3DC'
                }}
              >
                <ShieldCheck size={14} style={{ color: '#52B788' }} />
                <span>
                  Official Janmashtami Observance: <strong>{formatDateDMY(janmSeason?.eventDate)}</strong> (Verified by ISKCON)
                </span>
              </div>
            ) : (
              <div 
                className="leaderboard-date-badge"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'rgba(255, 153, 51, 0.2)',
                  border: '1px solid #FF9933',
                  padding: '5px 14px',
                  borderRadius: '16px',
                  fontSize: '0.82rem',
                  color: '#FFB74D',
                  fontWeight: 700
                }}
              >
                <Clock size={14} />
                <span>Janmashtami 2027 — date awaiting official confirmation</span>
              </div>
            )}
          </div>

          {/* Top 3 Podium Presentation (Only for students who have earned genuine points > 0) */}
          {(() => {
            const eligibleLeaderboard = (janmLeaderboard || []).filter(s => s.totalPoints > 0);
            if (eligibleLeaderboard.length === 0) {
              return (
                <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#E2E8F0', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', marginBottom: '1.5rem' }}>
                  <Trophy size={36} style={{ color: '#FFD700', margin: '0 auto 10px' }} />
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#FFD700', margin: '0 0 6px' }}>
                    Awaiting Recorded Class Attendance
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.95rem', color: '#FFF8DC', maxWidth: '620px', margin: '0 auto', lineHeight: 1.6 }}>
                    Points for the {janmSeason?.year || 2027} Seva Challenge are generated exclusively from confirmed attendance records. Points will appear here as weekend Bhagavad Gita classes are conducted in 2027!
                  </p>
                </div>
              );
            }

            return (
              <div>
                <div 
                  className="podium-grid"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                    gap: '1.25rem',
                    alignItems: 'flex-end',
                    marginBottom: '2rem'
                  }}
                >
                  {/* 2nd Place */}
                  {eligibleLeaderboard[1] && (
                    <div 
                      className="podium-second"
                      style={{
                        background: 'rgba(255, 255, 255, 0.08)',
                        border: '1.5px solid rgba(226, 232, 240, 0.5)',
                        borderRadius: '14px',
                        padding: '1.5rem 1.25rem',
                        textAlign: 'center',
                        position: 'relative'
                      }}
                    >
                      <div 
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #E2E8F0 0%, #A0AEC0 100%)',
                          color: '#1A202C',
                          fontWeight: 900,
                          fontSize: '1.2rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          margin: '0 auto 10px',
                          boxShadow: '0 4px 12px rgba(226, 232, 240, 0.3)'
                        }}
                      >
                        2
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#E2E8F0', fontWeight: 700, textTransform: 'uppercase' }}>
                        2ND PLACE
                      </div>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#FFFFFF', margin: '4px 0 6px' }}>
                        {eligibleLeaderboard[1].displayName}
                      </h3>
                      <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#FFD700' }}>
                        {eligibleLeaderboard[1].totalPoints} <span style={{ fontSize: '0.85rem' }}>pts</span>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#CBD5E0', marginTop: '4px' }}>
                        {eligibleLeaderboard[1].classesAttended} classes attended
                      </div>
                      {eligibleLeaderboard[1].prizeTitle && (
                        <div style={{ marginTop: '8px', fontSize: '0.75rem', color: '#E2E8F0', background: 'rgba(255,255,255,0.1)', padding: '3px 8px', borderRadius: '8px' }}>
                          Prize: {eligibleLeaderboard[1].prizeTitle.split('—')[1] || eligibleLeaderboard[1].prizeTitle}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 1st Place (Center & Elevated) */}
                  {eligibleLeaderboard[0] && (
                    <div 
                      className="podium-first"
                      style={{
                        background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.18) 0%, rgba(255, 153, 51, 0.15) 100%)',
                        border: '2px solid #FFD700',
                        borderRadius: '16px',
                        padding: '2rem 1.5rem',
                        textAlign: 'center',
                        position: 'relative',
                        boxShadow: '0 8px 25px rgba(255, 215, 0, 0.25)',
                        transform: 'scale(1.04)'
                      }}
                    >
                      <div 
                        style={{
                          position: 'absolute',
                          top: '-14px',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          background: '#FFD700',
                          color: '#1B4332',
                          fontSize: '0.72rem',
                          fontWeight: 900,
                          padding: '2px 10px',
                          borderRadius: '10px',
                          letterSpacing: '0.06em'
                        }}
                      >
                        CHAMPION SEVAK
                      </div>
                      <div 
                        style={{
                          width: '52px',
                          height: '52px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #FFD700 0%, #FF9933 100%)',
                          color: '#1B4332',
                          fontWeight: 900,
                          fontSize: '1.5rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          margin: '6px auto 10px',
                          boxShadow: '0 6px 18px rgba(255, 215, 0, 0.4)'
                        }}
                      >
                        1
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#FFD700', fontWeight: 800, textTransform: 'uppercase' }}>
                        1ST PLACE
                      </div>
                      <h3 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#FFFFFF', margin: '4px 0 6px' }}>
                        {eligibleLeaderboard[0].displayName}
                      </h3>
                      <div style={{ fontSize: '1.65rem', fontWeight: 900, color: '#FFD700' }}>
                        {eligibleLeaderboard[0].totalPoints} <span style={{ fontSize: '0.95rem' }}>pts</span>
                      </div>
                      <div style={{ fontSize: '0.82rem', color: '#FFF8DC', marginTop: '4px' }}>
                        {eligibleLeaderboard[0].classesAttended} classes attended
                      </div>
                      {eligibleLeaderboard[0].prizeTitle && (
                        <div style={{ marginTop: '10px', fontSize: '0.78rem', color: '#FFD700', background: 'rgba(255,215,0,0.15)', padding: '4px 10px', borderRadius: '10px', fontWeight: 600 }}>
                          Award: {eligibleLeaderboard[0].prizeTitle.split('—')[1] || eligibleLeaderboard[0].prizeTitle}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 3rd Place */}
                  {eligibleLeaderboard[2] && (
                    <div 
                      className="podium-third"
                      style={{
                        background: 'rgba(255, 255, 255, 0.08)',
                        border: '1.5px solid rgba(251, 211, 141, 0.5)',
                        borderRadius: '14px',
                        padding: '1.5rem 1.25rem',
                        textAlign: 'center',
                        position: 'relative'
                      }}
                    >
                      <div 
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #FBD38D 0%, #D69E2E 100%)',
                          color: '#744210',
                          fontWeight: 900,
                          fontSize: '1.2rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          margin: '0 auto 10px',
                          boxShadow: '0 4px 12px rgba(251, 211, 141, 0.3)'
                        }}
                      >
                        3
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#FBD38D', fontWeight: 700, textTransform: 'uppercase' }}>
                        3RD PLACE
                      </div>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#FFFFFF', margin: '4px 0 6px' }}>
                        {eligibleLeaderboard[2].displayName}
                      </h3>
                      <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#FFD700' }}>
                        {eligibleLeaderboard[2].totalPoints} <span style={{ fontSize: '0.85rem' }}>pts</span>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#CBD5E0', marginTop: '4px' }}>
                        {eligibleLeaderboard[2].classesAttended} classes attended
                      </div>
                      {eligibleLeaderboard[2].prizeTitle && (
                        <div style={{ marginTop: '8px', fontSize: '0.75rem', color: '#FBD38D', background: 'rgba(255,255,255,0.1)', padding: '3px 8px', borderRadius: '8px' }}>
                          Prize: {eligibleLeaderboard[2].prizeTitle.split('—')[1] || eligibleLeaderboard[2].prizeTitle}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Extended Rankings Table (Ranks 4+) */}
                {eligibleLeaderboard.length > 3 && showAllRankings && (
                  <div className="mobile-table-scroll" style={{ overflowX: 'auto', marginBottom: '1.5rem', background: 'rgba(0,0,0,0.25)', borderRadius: '12px', padding: '1rem' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid rgba(255, 215, 0, 0.3)', color: '#FFD700' }}>
                          <th style={{ padding: '0.65rem 1rem', width: '70px', textAlign: 'center' }}>Rank</th>
                          <th style={{ padding: '0.65rem 1rem' }}>Devotee Participant</th>
                          <th style={{ padding: '0.65rem 1rem', textAlign: 'center' }}>Classes Attended</th>
                          <th style={{ padding: '0.65rem 1rem', textAlign: 'right' }}>Total Points</th>
                        </tr>
                      </thead>
                      <tbody>
                        {eligibleLeaderboard.slice(3).map((st) => (
                          <tr key={st.rank} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                            <td style={{ padding: '0.65rem 1rem', textAlign: 'center', color: '#CBD5E0' }}>
                              #{st.rank}
                            </td>
                            <td style={{ padding: '0.65rem 1rem', fontWeight: 600, color: '#FFFFFF' }}>
                              {st.displayName}
                            </td>
                            <td style={{ padding: '0.65rem 1rem', textAlign: 'center', color: '#CBD5E0' }}>
                              {st.classesAttended} sessions
                            </td>
                            <td style={{ padding: '0.65rem 1rem', textAlign: 'right', fontWeight: 700, color: '#FFD700' }}>
                              {st.totalPoints} pts
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* View More / View Less Toggle Button */}
                {eligibleLeaderboard.length > 3 && (
                  <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                    <button 
                      onClick={() => setShowAllRankings(!showAllRankings)}
                      style={{
                        background: 'transparent',
                        border: '1.5px solid #FFD700',
                        color: '#FFD700',
                        borderRadius: '8px',
                        padding: '0.55rem 1.25rem',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      {showAllRankings ? 'Show Top 3 Only' : `View Full Top ${eligibleLeaderboard.length} Leaderboard`}
                    </button>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Privacy & Prize Notice */}
          <div 
            className="leaderboard-privacy-banner"
            style={{
              background: 'rgba(0, 0, 0, 0.3)',
              borderRadius: '10px',
              padding: '0.85rem 1.25rem',
              border: '1px solid rgba(255, 215, 0, 0.25)',
              fontSize: '0.8rem',
              color: 'rgba(255, 248, 220, 0.8)',
              lineHeight: 1.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.75rem'
            }}
          >
            <div>
              <span>
                &bull; <strong>Privacy Policy:</strong> To protect student privacy, only approved initials and Seva Points are shown publicly. Student IDs and contact numbers are strictly confidential.
              </span>
              <span style={{ marginLeft: '6px' }}>
                &bull; <strong>Tie-Breaking:</strong> Points &gt; Classes Attended &gt; Equal Rank Review.
              </span>
            </div>

            {onOpenStudentLogin && (
              <button 
                onClick={onOpenStudentLogin}
                style={{
                  background: 'linear-gradient(135deg, #FFD700 0%, #FF9933 100%)',
                  color: '#1B4332',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '0.4rem 0.9rem',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                Student Login to View Your Rank
              </button>
            )}
          </div>
        </div>
      </section>

      {/* 4. ABOUT SECTION */}
      {visibility.showAbout && (
        <section 
          id="about"
          className="landing-section"
          style={{
            maxWidth: '1100px',
            margin: '0 auto 4rem',
            padding: '0 1.5rem',
            width: '100%'
          }}
        >
          <div 
            className="landing-card-dark"
            style={{
              background: 'rgba(27, 67, 50, 0.90)',
              borderRadius: '16px',
              padding: '2.5rem 2rem',
              border: '1px solid rgba(255, 215, 0, 0.4)',
              backdropFilter: 'blur(8px)',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)'
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <span style={{ color: '#FFD700', fontSize: '0.82rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                SPIRITUAL FOUNDATION &bull; CHARACTER &bull; PURPOSE
              </span>
              <h2 
                className="section-heading"
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: '2rem',
                  fontWeight: 800,
                  color: '#FFD700',
                  margin: '8px 0 12px'
                }}
              >
                {branding.aboutTitle}
              </h2>
              <p className="section-subheading" style={{ color: '#FFF8DC', fontSize: '1.05rem', lineHeight: 1.7, maxWidth: '850px', margin: '0 auto' }}>
                {branding.aboutContent}
              </p>
            </div>

            {/* 3 Pillars of Learning */}
            <div 
              className="pillars-grid"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: '1.5rem',
                marginTop: '1.5rem'
              }}
            >
              <div 
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 215, 0, 0.25)',
                  borderRadius: '12px',
                  padding: '1.5rem',
                  textAlign: 'center'
                }}
              >
                <BookOpen size={32} style={{ color: '#FFD700', margin: '0 auto 12px' }} />
                <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.15rem', color: '#FFD700', margin: '0 0 8px' }}>
                  Authentic Parampara
                </h3>
                <p style={{ fontSize: '0.88rem', color: '#F4ECE1', lineHeight: 1.5, margin: 0 }}>
                  Studying verses in an unbroken disciplic succession preserving the authentic conclusion of Srimad Bhagavad Gita.
                </p>
              </div>

              <div 
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 215, 0, 0.25)',
                  borderRadius: '12px',
                  padding: '1.5rem',
                  textAlign: 'center'
                }}
              >
                <Compass size={32} style={{ color: '#FFD700', margin: '0 auto 12px' }} />
                <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.15rem', color: '#FFD700', margin: '0 0 8px' }}>
                  Mind &amp; Character
                </h3>
                <p style={{ fontSize: '0.88rem', color: '#F4ECE1', lineHeight: 1.5, margin: 0 }}>
                  Practical tools for conquering stress, handling academic pressure, overcoming anger, and living with selfless integrity.
                </p>
              </div>

              <div 
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 215, 0, 0.25)',
                  borderRadius: '12px',
                  padding: '1.5rem',
                  textAlign: 'center'
                }}
              >
                <Heart size={32} style={{ color: '#FFD700', margin: '0 auto 12px' }} />
                <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.15rem', color: '#FFD700', margin: '0 0 8px' }}>
                  Devotional Fellowship
                </h3>
                <p style={{ fontSize: '0.88rem', color: '#F4ECE1', lineHeight: 1.5, margin: 0 }}>
                  A loving, supportive community where youth and families grow together through kirtan, study, and prasadam.
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 5. BHAGAVAD GITA SECTION */}
      {visibility.showGita && (
        <section 
          id="gita"
          className="landing-section"
          style={{
            maxWidth: '1100px',
            margin: '0 auto 4rem',
            padding: '0 1.5rem',
            width: '100%'
          }}
        >
          <div 
            className="landing-card"
            style={{
              background: 'rgba(255, 255, 255, 0.96)',
              borderRadius: '16px',
              padding: '2.5rem 2rem',
              color: '#1B4332',
              boxShadow: '0 8px 25px rgba(0,0,0,0.3)',
              border: '2px solid rgba(255, 215, 0, 0.6)'
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <div 
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: '#B45309',
                  background: '#FEF3C7',
                  padding: '4px 12px',
                  borderRadius: '14px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  marginBottom: '8px'
                }}
              >
                <BookOpen size={14} />
                <span>SACRED SCRIPTURE</span>
              </div>
              <h2 
                className="section-heading"
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: '2rem',
                  fontWeight: 800,
                  color: '#1B4332',
                  margin: '6px 0 10px'
                }}
              >
                {branding.gitaSectionTitle}
              </h2>
              <p className="section-subheading" style={{ color: '#4A5568', fontSize: '1rem', lineHeight: 1.6, maxWidth: '800px', margin: '0 auto' }}>
                {branding.gitaSectionContent}
              </p>
            </div>

            {/* Foundational Scripture Highlight */}
            <div 
              className="scripture-card"
              style={{
                background: 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)',
                color: '#FFF8DC',
                borderRadius: '12px',
                padding: '1.75rem',
                border: '1px solid #FFD700',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
              }}
            >
              <div className="scripture-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ color: '#FFD700', fontWeight: 800, fontSize: '0.9rem', letterSpacing: '0.04em' }}>
                  BHAGAVAD GITA 2.47 &bull; KARMA YOGA
                </span>
                <span style={{ fontSize: '0.78rem', color: '#F0E68C' }}>Action without Attachment</span>
              </div>
              <p 
                className="scripture-verse"
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: '1.15rem',
                  color: '#FFD700',
                  margin: '0 0 10px',
                  fontStyle: 'italic',
                  lineHeight: 1.6
                }}
              >
                कर्मण्येवाधिकारस्ते मा फलेषु कदाचन । मा कर्मफलहेतुर्भूर्मा ते सङ्गोऽस्त्वकर्मणि ॥
              </p>
              <p className="scripture-translation" style={{ fontSize: '0.92rem', color: '#FFF8DC', margin: 0, lineHeight: 1.6 }}>
                "You have a right to perform your prescribed duty, but you are not entitled to the fruits of action. Never consider yourself the cause of the results of your activities, and never be attached to not doing your duty."
              </p>
            </div>
          </div>
        </section>
      )}

      {/* 6. PUBLIC FOOTER */}
      <footer 
        className="landing-footer"
        style={{
          marginTop: 'auto',
          background: 'rgba(27, 67, 50, 0.98)',
          borderTop: '1px solid rgba(255, 215, 0, 0.35)',
          padding: '2.5rem 1.5rem 1.75rem',
          color: '#FFF8DC'
        }}
      >
        <div 
          style={{
            maxWidth: '1100px',
            margin: '0 auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem',
            alignItems: 'center',
            textAlign: 'center'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <DevotionalCrest size={32} />
            <span style={{ fontFamily: 'var(--font-heading)', fontSize: '1.15rem', fontWeight: 800, color: '#FFD700', letterSpacing: '0.06em' }}>
              KRISHNA KRIPA
            </span>
          </div>

          <p style={{ maxWidth: '650px', fontSize: '0.9rem', color: '#F4ECE1', margin: 0, lineHeight: 1.6 }}>
            {(branding.footerText || '').replace(/All glories to Sri Guru and Gauranga\s*[•·-]?\s*/gi, '').trim() || 'Dedicated to Bhagavad Gita Study'}
          </p>

          {/* Contact Details (if configured) */}
          {(branding.contactEmail || branding.contactPhone || branding.contactLocation) && (
            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', justifyContent: 'center', fontSize: '0.85rem', color: '#F0E68C' }}>
              {branding.contactEmail && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Mail size={14} />
                  <span>{branding.contactEmail}</span>
                </div>
              )}
              {branding.contactPhone && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Phone size={14} />
                  <span>{branding.contactPhone}</span>
                </div>
              )}
              {branding.contactLocation && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MapPin size={14} />
                  <span>{branding.contactLocation}</span>
                </div>
              )}
            </div>
          )}

          {/* Devotional Maha Mantra */}
          <div 
            className="mantra-banner"
            style={{
              padding: '0.75rem 1.5rem',
              background: 'rgba(255, 215, 0, 0.1)',
              border: '1px solid rgba(255, 215, 0, 0.3)',
              borderRadius: '20px',
              fontSize: '0.82rem',
              color: '#FFD700',
              letterSpacing: '0.05em'
            }}
          >
            Hare Krishna Hare Krishna Krishna Krishna Hare Hare &bull; Hare Rama Hare Rama Rama Rama Hare Hare
          </div>

          <div className="footer-bottom-row" style={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: '900px', fontSize: '0.78rem', opacity: 0.8, borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '1rem', marginTop: '0.5rem', flexWrap: 'wrap', gap: '8px' }}>
            <span>&copy; {new Date().getFullYear()} Krishna Kripa. All rights reserved.</span>
            <button 
              onClick={onOpenLogin}
              style={{ background: 'none', border: 'none', color: '#FFD700', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
            >
              Coordinator / Admin Portal
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
