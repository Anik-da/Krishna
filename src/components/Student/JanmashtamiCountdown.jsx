import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Calendar, 
  Clock, 
  Trophy, 
  Award, 
  ExternalLink, 
  ShieldCheck, 
  Flame, 
  Info,
  ChevronRight
} from 'lucide-react';
import { formatDateDMY } from '../../db/db';

export const JanmashtamiCountdown = ({ season, studentStanding, onScrollToLeaderboard }) => {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isExpired: false
  });

  const isVerified = Boolean(season?.isDateVerified && season?.eventDate);

  useEffect(() => {
    if (!isVerified || !season?.eventDate) return;

    const targetStr = `${season.eventDate}T${season.eventTime || '23:59:59'}+05:30`;
    const targetTime = new Date(targetStr).getTime();

    const calculateTime = () => {
      const now = new Date().getTime();
      const difference = targetTime - now;

      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true });
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds, isExpired: false });
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [season?.eventDate, season?.eventTime, isVerified]);

  // Formatted festival weekday
  const getWeekday = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr + 'T12:00:00Z');
      return d.toLocaleDateString('en-IN', { weekday: 'long' });
    } catch {
      return '';
    }
  };

  const festivalDay = getWeekday(season?.eventDate);
  const formattedDate = formatDateDMY(season?.eventDate);

  return (
    <div 
      className="devotional-card"
      style={{
        background: 'linear-gradient(135deg, #0F2A1D 0%, #1B4332 50%, #2D6A4F 100%)',
        color: '#FFF8DC',
        borderRadius: '16px',
        padding: '1.75rem',
        border: '2px solid rgba(255, 215, 0, 0.45)',
        boxShadow: '0 10px 30px rgba(15, 42, 29, 0.4)',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Devotional background motif */}
      <div 
        style={{
          position: 'absolute',
          top: '-40px',
          right: '-40px',
          width: '180px',
          height: '180px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255, 215, 0, 0.12) 0%, transparent 70%)',
          pointerEvents: 'none'
        }}
      />

      <div style={{ position: 'relative', zIndex: 2 }}>
        
        {/* Header Ribbon */}
        <div 
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
            marginBottom: '1.25rem',
            paddingBottom: '0.85rem',
            borderBottom: '1px solid rgba(255, 215, 0, 0.25)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div 
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #FFD700 0%, #FF9933 100%)',
                color: '#1B4332',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(255, 215, 0, 0.35)'
              }}
            >
              <Trophy size={20} />
            </div>
            <div>
              <span 
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  color: '#FFD700',
                  textTransform: 'uppercase'
                }}
              >
                ANNUAL COMPETITION &bull; {season?.year || 2027}
              </span>
              <h2 
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: '1.35rem',
                  color: '#FFFFFF',
                  margin: '2px 0 0',
                  fontWeight: 800
                }}
              >
                {season?.title || 'Krishna Janmashtami Seva Points Challenge 2027'}
              </h2>
            </div>
          </div>

          {/* Verification Badge */}
          {isVerified ? (
            <div 
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(216, 243, 220, 0.15)',
                border: '1px solid rgba(255, 215, 0, 0.4)',
                padding: '4px 10px',
                borderRadius: '20px',
                fontSize: '0.75rem',
                color: '#FFD700'
              }}
              title={`Verified by ${season.verifiedBy || 'Admin'} on ${season.verificationDate || '2026-10-14'}`}
            >
              <ShieldCheck size={14} style={{ color: '#52B788' }} />
              <span>Verified by ISKCON</span>
              {season?.calendarSourceUrl && (
                <a 
                  href={season.calendarSourceUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ color: '#FFD700', display: 'inline-flex' }}
                >
                  <ExternalLink size={12} />
                </a>
              )}
            </div>
          ) : (
            <div 
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(255, 153, 51, 0.2)',
                border: '1px solid #FF9933',
                padding: '5px 12px',
                borderRadius: '20px',
                fontSize: '0.75rem',
                color: '#FFB74D',
                fontWeight: 700
              }}
            >
              <Clock size={14} />
              <span>Janmashtami 2027 — date awaiting official confirmation</span>
            </div>
          )}
        </div>

        {/* Date & Countdown Box */}
        <div 
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1.25rem',
            alignItems: 'center'
          }}
        >
          {/* Left: Confirmed Date & Festival Info */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <Calendar size={18} style={{ color: '#FFD700' }} />
              <span style={{ fontSize: '0.9rem', color: '#FFF8DC', fontWeight: 600 }}>
                Grand Appearance Day of Lord Sri Krishna:
              </span>
            </div>
            {isVerified ? (
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#FFD700', margin: '4px 0 10px' }}>
                {festivalDay ? `${festivalDay}, ` : ''}{formattedDate}
              </div>
            ) : (
              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#FFB74D', margin: '4px 0 10px' }}>
                Janmashtami 2027 — date awaiting official confirmation
              </div>
            )}
            <p style={{ fontSize: '0.85rem', color: 'rgba(255, 248, 220, 0.85)', lineHeight: 1.5, margin: 0 }}>
              Attend weekend Bhagavad Gita classes diligently! Every attended conducted class awards 
              <strong style={{ color: '#FFD700' }}> {season?.pointsRules?.pointsPerPresentClass || 10} Seva Points</strong>. 
              The highest-ranking devotees will receive sacred honors and prizes on Sri Krishna Janmashtami!
            </p>
          </div>

          {/* Right: Live Countdown Units or Completion State */}
          <div 
            style={{
              background: 'rgba(0, 0, 0, 0.35)',
              borderRadius: '12px',
              padding: '1.15rem',
              border: '1px solid rgba(255, 215, 0, 0.3)',
              textAlign: 'center'
            }}
          >
            {isVerified ? (
              timeLeft.isExpired ? (
                <div style={{ padding: '0.5rem 0' }}>
                  <Award size={36} style={{ color: '#FFD700', margin: '0 auto 8px' }} />
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#FFD700' }}>
                    Janmashtami Challenge Completed!
                  </div>
                  <p style={{ fontSize: '0.82rem', color: '#E2E8F0', margin: '6px 0 10px' }}>
                    The annual competition deadline has arrived. Final standings and prize honors are officially sealed.
                  </p>
                  {onScrollToLeaderboard && (
                    <button 
                      onClick={onScrollToLeaderboard}
                      className="btn-primary"
                      style={{
                        padding: '0.45rem 1rem',
                        fontSize: '0.85rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <span>View Final Standings</span>
                      <ChevronRight size={14} />
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <div 
                    style={{
                      fontSize: '0.78rem',
                      color: '#FFD700',
                      fontWeight: 700,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      marginBottom: '10px'
                    }}
                  >
                    COUNTDOWN TO JANMASHTAMI
                  </div>

                  <div 
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(4, 1fr)',
                      gap: '8px'
                    }}
                  >
                    {[
                      { label: 'DAYS', value: timeLeft.days },
                      { label: 'HOURS', value: timeLeft.hours },
                      { label: 'MINUTES', value: timeLeft.minutes },
                      { label: 'SECONDS', value: timeLeft.seconds }
                    ].map((unit, idx) => (
                      <div 
                        key={idx}
                        style={{
                          background: 'rgba(255, 255, 255, 0.08)',
                          borderRadius: '8px',
                          padding: '0.6rem 0.2rem',
                          border: '1px solid rgba(255, 215, 0, 0.25)'
                        }}
                      >
                        <div 
                          style={{
                            fontSize: 'clamp(1.1rem, 4.5vw, 1.5rem)',
                            fontWeight: 800,
                            color: '#FFFFFF',
                            fontFamily: 'monospace',
                            lineHeight: 1
                          }}
                        >
                          {String(unit.value).padStart(2, '0')}
                        </div>
                        <div 
                          style={{
                            fontSize: '0.68rem',
                            color: '#FFD700',
                            marginTop: '4px',
                            fontWeight: 600,
                            letterSpacing: '0.05em'
                          }}
                        >
                          {unit.label}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )
            ) : (
              <div style={{ padding: '0.85rem 0.5rem' }}>
                <Clock size={32} style={{ color: '#FFB74D', margin: '0 auto 8px' }} />
                <div style={{ fontSize: '0.98rem', color: '#FFD700', fontWeight: 700, marginBottom: '4px' }}>
                  Janmashtami 2027 — date awaiting official confirmation
                </div>
                <div style={{ fontSize: '0.82rem', color: '#E2E8F0', lineHeight: 1.4 }}>
                  Countdown is paused. Official date will be confirmed from the official ISKCON Vaishnava calendar before activating the timer.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Student Personal Standing Pill */}
        {studentStanding && (
          <div 
            style={{
              marginTop: '1.25rem',
              padding: '0.9rem 1.25rem',
              borderRadius: '10px',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 215, 0, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.85rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div 
                style={{
                  background: (studentStanding.totalPoints > 0 && studentStanding.rank <= 3) ? '#FFD700' : 'rgba(255, 255, 255, 0.2)',
                  color: (studentStanding.totalPoints > 0 && studentStanding.rank <= 3) ? '#1B4332' : '#FFFFFF',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '0.9rem'
                }}
              >
                {studentStanding.totalPoints > 0 && studentStanding.rank ? `#${studentStanding.rank}` : '—'}
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#FFD700', textTransform: 'uppercase', fontWeight: 700 }}>
                  YOUR COMPETITION STATUS
                </span>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#FFFFFF' }}>
                  {studentStanding.totalPoints > 0 
                    ? `${studentStanding.totalPoints} Seva Points • ${studentStanding.classesAttended} Classes Attended`
                    : '0 Seva Points (Unranked) • Attend classes to enter leaderboard!'}
                </div>
              </div>
            </div>

            {onScrollToLeaderboard && (
              <button 
                onClick={onScrollToLeaderboard}
                style={{
                  background: 'transparent',
                  border: '1px solid #FFD700',
                  color: '#FFD700',
                  borderRadius: '8px',
                  padding: '0.4rem 0.85rem',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <span>Full Leaderboard</span>
                <ChevronRight size={14} />
              </button>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
