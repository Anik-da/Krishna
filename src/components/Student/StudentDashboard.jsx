import React, { useState, useEffect } from 'react';
import { 
  apiGetStudentAttendance, 
  apiGetStudentAiQuota, 
  apiStudentAskGita, 
  apiStudentAskAttendance,
  apiGetMyStudentCard
} from '../../api/apiClient';
import { StudentIdCard } from '../IdCard/StudentIdCard';
import { StudentCalendarView } from './StudentCalendarView';
import { 
  getAllSessions, 
  calculateStudentAttendanceStats,
  getActiveJanmashtamiSeasonLocal,
  calculateJanmashtamiStandingsLocal,
  formatDateDMY
} from '../../db/db';
import { apiGetActiveJanmashtamiSeason } from '../../api/apiClient';
import { JanmashtamiCountdown } from './JanmashtamiCountdown';
import { askGitaWisdom, isGreetingOrCasual } from '../../utils/gitaAiAssistant';
import { DevotionalCrest } from '../../assets/crest';
import { 
  LogOut, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Sparkles, 
  BookOpen, 
  GraduationCap, 
  Send, 
  User, 
  Calendar, 
  ShieldAlert, 
  RotateCcw,
  Check,
  School,
  HelpCircle,
  Trophy,
  Award,
  Medal,
  ChevronUp,
  Info,
  CreditCard,
  QrCode
} from 'lucide-react';

// Format text cleanly into normal human-readable text without raw asterisks
const formatDevotionalText = (rawText) => {
  if (!rawText) return null;
  const lines = String(rawText).split('\n');
  return lines.map((line, idx) => {
    if (!line.trim()) return <div key={idx} style={{ height: '6px' }} />;
    
    // Split on **bold** and *italic*
    const parts = line.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
    const formattedLine = parts.map((part, pIdx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={pIdx} style={{ color: '#1B4332', fontWeight: 700 }}>{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return <span key={pIdx} style={{ color: '#8B4513', fontStyle: 'italic' }}>{part.slice(1, -1)}</span>;
      }
      return part.replace(/\*\*/g, '').replace(/\*/g, '');
    });

    const isBullet = line.trim().startsWith('•') || line.trim().startsWith('-') || /^\d+\./.test(line.trim());

    return (
      <div 
        key={idx} 
        style={{ 
          marginBottom: isBullet ? '4px' : '6px',
          paddingLeft: isBullet ? '4px' : '0',
          lineHeight: 1.5
        }}
      >
        {formattedLine}
      </div>
    );
  });
};

export const StudentDashboard = ({ student, onLogout }) => {
  const [attendanceData, setAttendanceData] = useState(null);
  const [quota, setQuota] = useState({ used: 0, remaining: 5, limit: 5 });
  const [loading, setLoading] = useState(true);
  const [cardData, setCardData] = useState(null);
  const [activeNav, setActiveNav] = useState('overview'); // 'overview' | 'id-card'

  // Janmashtami Challenge State
  const [season, setSeason] = useState(null);
  const [standings, setStandings] = useState([]);
  const [studentStanding, setStudentStanding] = useState(null);
  const [pointsNeeded, setPointsNeeded] = useState(null);

  // AI Tab State: 'gita' | 'attendance'
  const [aiTab, setAiTab] = useState('gita');
  const [question, setQuestion] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  
  // AI Conversation History for current session
  const [chatMessages, setChatMessages] = useState([
    {
      sender: 'assistant',
      type: 'welcome',
      text: `Hare Krishna, ${student?.name || 'Dear Student'}! Welcome to your personal attendance and Bhagavad Gita portal. You can check your verified class attendance history below or ask up to 5 spiritual or attendance questions today.`
    }
  ]);

  const loadData = async () => {
    // 1. Immediately calculate locally so student dashboard renders with 0ms delay
    try {
      const localStats = await calculateStudentAttendanceStats(student?.id || student?.studentId, student);
      if (localStats) {
        setAttendanceData(localStats);
      } else {
        setAttendanceData({
          attendancePercentage: 0,
          displayPercentage: '0% (New Registration)',
          totalEligibleConducted: 0,
          presentCount: 0,
          absentCount: 0,
          unrecordedCount: 0,
          statusNote: 'Welcome to Krishna Kripa! No attendance marks recorded yet.',
          recentHistory: []
        });
      }
    } catch (localErr) {
      console.warn("Local stats calculation notice:", localErr);
    } finally {
      setLoading(false);
    }

    // 2. Load Janmashtami Challenge details
    try {
      const activeSeason = await getActiveJanmashtamiSeasonLocal();
      setSeason(activeSeason);
      const calculatedStandings = await calculateJanmashtamiStandingsLocal(activeSeason);
      setStandings(calculatedStandings);

      const sid = student?.studentId || student?.id;
      const myStanding = calculatedStandings.find(s => s.studentId === sid);
      setStudentStanding(myStanding || null);

      if (myStanding && myStanding.rank > 1) {
        // Find points of the next rank above
        const nextAbove = calculatedStandings.find(s => s.rank === myStanding.rank - 1);
        if (nextAbove) {
          const diff = Math.max(0, nextAbove.totalPoints - myStanding.totalPoints);
          setPointsNeeded({
            targetRank: myStanding.rank - 1,
            points: diff === 0 ? (activeSeason.pointsRules?.pointsPerPresentClass || 10) : diff
          });
        }
      }
    } catch (jErr) {
      console.warn("Janmashtami standings load notice:", jErr);
    }

    // 3. Initialize quota immediately from localStorage
    const todayStr = new Date().toISOString().split('T')[0];
    const key = `krishna_quota_${student?.id || student?.studentId || 'std'}_${todayStr}`;
    const used = parseInt(localStorage.getItem(key) || '0', 10);
    setQuota({ used, remaining: Math.max(0, 5 - used), limit: 5 });

    // 4. Automatically prepare active verified ID card data so QR code generates immediately and is always valid
    const sid = student?.studentId || student?.id;
    if (sid) {
      setCardData({
        studentId: sid,
        verificationToken: sid,
        status: student?.status || 'active',
        issueDate: student?.registrationDate || new Date().toISOString().split('T')[0],
        cardVersion: 1
      });
    }

    // 4. Asynchronously sync with backend in background without freezing UI
    apiGetStudentAttendance().then(att => {
      if (att && att.attendancePercentage !== undefined) {
        if (att.totalEligibleConducted === 0) {
          att.displayPercentage = '0% (New Registration)';
          att.attendancePercentage = 0;
        } else if (att.presentCount === 0) {
          att.displayPercentage = '0%';
          att.attendancePercentage = 0;
        }
        setAttendanceData(att);
      }
    }).catch(() => {});

    apiGetStudentAiQuota().then(q => {
      if (q) setQuota(q);
    }).catch(() => {});

    apiGetActiveJanmashtamiSeason().then(remoteData => {
      if (remoteData?.season) setSeason(remoteData.season);
      if (remoteData?.standings) {
        setStandings(remoteData.standings);
        const sid = student?.studentId || student?.id;
        const myStanding = remoteData.standings.find(s => s.studentId === sid);
        setStudentStanding(myStanding || null);
      }
    }).catch(() => {});

    // 5. Asynchronously fetch student ID card from MongoDB Atlas
    apiGetMyStudentCard().then(cardRes => {
      if (cardRes?.card) {
        setCardData(cardRes.card);
      }
    }).catch(err => {
      console.warn("Card load notice:", err);
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSendQuestion = async (e) => {
    e.preventDefault();
    if (!question.trim() || isAiLoading) return;
    if (quota.remaining <= 0) return;

    const currentPrompt = question.trim();
    setQuestion('');
    setAiError('');
    setIsAiLoading(true);

    // Append user query to chat
    setChatMessages(prev => [...prev, { sender: 'user', text: currentPrompt, type: aiTab }]);

    try {
      if (aiTab === 'gita') {
        let answerText = '';
        let verses = [];
        try {
          const res = await apiStudentAskGita(currentPrompt);
          if (res?.quota) setQuota(res.quota);
          answerText = res?.answer;
          verses = res?.verses || [];
        } catch (apiErr) {
          const wisdom = await askGitaWisdom(currentPrompt);
          answerText = wisdom.answer;
          verses = wisdom.sourcedVerses || [];
          if (!isGreetingOrCasual(currentPrompt)) {
            setQuota(prev => ({ ...prev, used: prev.used + 1, remaining: Math.max(0, prev.remaining - 1) }));
            const todayStr = new Date().toISOString().split('T')[0];
            const key = `krishna_quota_${student?.id || student?.studentId || 'std'}_${todayStr}`;
            const curUsed = parseInt(localStorage.getItem(key) || '0', 10);
            localStorage.setItem(key, String(curUsed + 1));
          }
        }

        setChatMessages(prev => [
          ...prev, 
          { 
            sender: 'assistant', 
            text: answerText, 
            verses: verses, 
            type: 'gita' 
          }
        ]);
      } else {
        let summaryText = '';
        try {
          const res = await apiStudentAskAttendance(currentPrompt);
          if (res?.quota) setQuota(res.quota);
          summaryText = res?.summary || res?.insights || res?.answer || res?.data?.summary || '';
        } catch (apiErr) {
          console.warn('Attendance API error, using verified stats fallback', apiErr);
        }

        // If server response was blank or unavailable, generate accurate verified response directly
        if (!summaryText || !summaryText.trim()) {
          const curPct = attendanceData?.attendancePercentage ?? 0;
          const curPres = attendanceData?.presentCount ?? 0;
          const curTot = attendanceData?.totalEligibleConducted ?? 0;
          const curAbs = Math.max(0, curTot - curPres);

          summaryText = `Hare Krishna, ${student?.name || 'Student'}!

Here is your verified attendance status from official records:
• Total Conducted Classes: ${curTot}
• Classes You Attended: ${curPres}
• Classes Missed: ${curAbs}
• Your Attendance Rate: ${curPct}%

Classes take place every weekend on Saturday and Sunday from 6:00 PM to 8:00 PM. We look forward to seeing you in class!`;

          setQuota(prev => ({ ...prev, used: prev.used + 1, remaining: Math.max(0, prev.remaining - 1) }));
          const todayStr = new Date().toISOString().split('T')[0];
          const key = `krishna_quota_${student?.id || student?.studentId || 'std'}_${todayStr}`;
          const curUsed = parseInt(localStorage.getItem(key) || '0', 10);
          localStorage.setItem(key, String(curUsed + 1));
        }

        setChatMessages(prev => [
          ...prev, 
          { 
            sender: 'assistant', 
            text: summaryText, 
            type: 'attendance' 
          }
        ]);
      }
    } catch (err) {
      setAiError(err.message || 'Unable to process your question at this moment.');
      setChatMessages(prev => [
        ...prev, 
        { 
          sender: 'assistant', 
          text: err.message || 'Daily question limit reached or service temporarily unavailable.', 
          isError: true 
        }
      ]);
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div 
      className="devotional-bg-root" 
      style={{ 
        minHeight: '100vh', 
        padding: '1rem clamp(0.5rem, 3vw, 1.25rem)',
        width: '100%',
        maxWidth: '100vw',
        boxSizing: 'border-box',
        overflowX: 'hidden'
      }}
    >
      <div 
        className="student-dashboard-content-wrapper" 
        style={{ 
          width: '100%',
          maxWidth: '1100px', 
          margin: '0 auto', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '1.25rem',
          boxSizing: 'border-box',
          minWidth: 0,
          overflowX: 'hidden'
        }}
      >
        
        {/* Sacred Navigation & Student Identity Banner */}
        <header 
          className="devotional-card student-portal-header"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(255, 248, 225, 0.95) 100%)',
            padding: '1rem clamp(0.75rem, 2.5vw, 1.5rem)',
            borderLeft: '5px solid #FF9933',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.85rem',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
            width: '100%',
            maxWidth: '100%',
            boxSizing: 'border-box',
            minWidth: 0
          }}
        >
          <div className="student-portal-header-left" style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: '1 1 auto' }}>
            <div className="student-portal-header-crest" style={{ flexShrink: 0 }}>
              <DevotionalCrest size={44} />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h1 className="heading-gold" style={{ fontSize: '1.3rem', fontWeight: 800, color: '#1B4332', margin: 0, wordBreak: 'break-word' }}>
                  Hare Krishna, {student?.name}
                </h1>
                <span style={{ background: '#D8F3DC', color: '#1B4332', padding: '2px 8px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                  STUDENT PORTAL
                </span>
              </div>
              <p style={{ color: '#666', fontSize: '0.82rem', marginTop: '3px', marginBottom: 0, wordBreak: 'break-word', lineHeight: 1.35 }}>
                {student?.className} &bull; {student?.schoolName} &bull; ID: <strong>{student?.studentId}</strong>
              </p>
            </div>
          </div>

          <div className="student-portal-header-right" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <button
              onClick={onLogout}
              className="btn-ghost"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                color: '#C0392B',
                borderColor: '#E57373',
                fontSize: '0.82rem',
                padding: '0.45rem 0.85rem'
              }}
            >
              <LogOut size={15} />
              <span>Sign Out</span>
            </button>
          </div>
        </header>

        {/* Tab Navigation Ribbon for Student Dashboard */}
        <div 
          className="student-portal-tabs"
          style={{
            display: 'flex',
            gap: '0.5rem',
            background: 'rgba(255, 255, 255, 0.95)',
            padding: '0.4rem',
            borderRadius: '12px',
            border: '1px solid rgba(255, 215, 0, 0.4)',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
            width: '100%',
            maxWidth: '100%',
            boxSizing: 'border-box'
          }}
        >
          <button
            type="button"
            onClick={() => setActiveNav('overview')}
            style={{
              flex: '1 1 0',
              minWidth: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.35rem',
              padding: '0.6rem 0.3rem',
              borderRadius: '8px',
              border: 'none',
              background: activeNav === 'overview' ? '#1B4332' : 'transparent',
              color: activeNav === 'overview' ? '#FFD700' : '#4B5563',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxSizing: 'border-box'
            }}
          >
            <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
            <span className="tab-label-full">Attendance &amp; Insights</span>
            <span className="tab-label-short">Attendance</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveNav('calendar')}
            style={{
              flex: '1 1 0',
              minWidth: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.35rem',
              padding: '0.6rem 0.3rem',
              borderRadius: '8px',
              border: 'none',
              background: activeNav === 'calendar' ? '#1B4332' : 'transparent',
              color: activeNav === 'calendar' ? '#FFD700' : '#4B5563',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxSizing: 'border-box'
            }}
          >
            <Calendar size={16} style={{ flexShrink: 0 }} />
            <span className="tab-label-full">Class Calendar 📅</span>
            <span className="tab-label-short">Calendar 📅</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveNav('id-card')}
            style={{
              flex: '1 1 0',
              minWidth: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.35rem',
              padding: '0.6rem 0.3rem',
              borderRadius: '8px',
              border: activeNav === 'id-card' ? 'none' : '1px dashed #FFD700',
              background: activeNav === 'id-card' 
                ? 'linear-gradient(135deg, #FFD700 0%, #F59E0B 100%)' 
                : '#FFFDF0',
              color: activeNav === 'id-card' ? '#1B4332' : '#8B4513',
              fontWeight: 800,
              fontSize: '0.82rem',
              cursor: 'pointer',
              boxShadow: activeNav === 'id-card' ? '0 4px 12px rgba(245, 158, 11, 0.3)' : 'none',
              transition: 'all 0.2s ease',
              boxSizing: 'border-box'
            }}
          >
            <CreditCard size={16} style={{ flexShrink: 0 }} />
            <span className="tab-label-full">My Digital ID Card 🪪</span>
            <span className="tab-label-short">ID Card 🪪</span>
          </button>
        </div>

        {/* VIEW 1: MY DIGITAL ID CARD */}
        {activeNav === 'id-card' && (
          <section style={{ animation: 'fadeIn 0.3s ease-in-out' }}>
            <StudentIdCard 
              student={student} 
              cardData={cardData} 
            />
          </section>
        )}

        {/* VIEW 2: STUDENT CLASS CALENDAR */}
        {activeNav === 'calendar' && (
          <section style={{ animation: 'fadeIn 0.3s ease-in-out' }}>
            <StudentCalendarView student={student} attendanceData={attendanceData} />
          </section>
        )}

        {/* VIEW 3: OVERVIEW & ATTENDANCE */}
        {activeNav === 'overview' && (
          <>
            {/* Quick Promo Banner for Digital ID Card */}
            <div 
              className="student-id-promo-banner"
              onClick={() => setActiveNav('id-card')}
              style={{
                background: 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)',
                borderRadius: '14px',
                padding: '0.9rem clamp(0.75rem, 2.5vw, 1.25rem)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.85rem',
                color: '#FFF8DC',
                cursor: 'pointer',
                border: '1.5px solid #FFD700',
                boxShadow: '0 4px 15px rgba(27, 67, 50, 0.25)',
                width: '100%',
                maxWidth: '100%',
                boxSizing: 'border-box'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', minWidth: 0, flex: '1 1 200px' }}>
                <div style={{ background: 'rgba(255, 215, 0, 0.2)', padding: '8px', borderRadius: '10px', color: '#FFD700', flexShrink: 0 }}>
                  <CreditCard size={22} />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#FFD700', wordBreak: 'break-word' }}>
                    Your Official Digital Student ID Card is Ready!
                  </div>
                  <div style={{ fontSize: '0.8rem', opacity: 0.9, marginTop: '2px', wordBreak: 'break-word', lineHeight: 1.35 }}>
                    Equipped with scannable QR verification. Download PNG, PDF, or share with parents and teachers.
                  </div>
                </div>
              </div>
              <button
                type="button"
                style={{
                  background: '#FFD700',
                  color: '#1B4332',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.5rem 1rem',
                  fontWeight: 800,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  flexShrink: 0
                }}
              >
                View ID Card &rarr;
              </button>
            </div>

            {/* Attendance Summary Grid */}
            <section 
              className="student-stats-grid"
              style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(140px, 100%), 1fr))', 
                gap: '0.75rem',
                width: '100%',
                maxWidth: '100%',
                boxSizing: 'border-box'
              }}
            >
          {/* Main Percentage Card */}
          <div 
            className="devotional-card student-stat-card student-stat-card-main"
            style={{
              padding: '1.25rem',
              borderTop: '4px solid #2D6A4F',
              background: '#FFFFFF',
              boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
            }}
          >
            <div style={{ fontSize: '0.82rem', color: '#666', fontWeight: 600 }}>Overall Attendance</div>
            <div 
              style={{ 
                fontSize: '2rem', 
                fontWeight: 800, 
                color: (attendanceData?.attendancePercentage ?? 0) >= 75 ? '#2D6A4F' : '#8B4513',
                marginTop: '4px' 
              }}
            >
              {attendanceData?.displayPercentage || 'Calculating...'}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '4px' }}>
              Calculated on conducted classes since registration
            </div>
          </div>

          {/* Attended Card */}
          <div 
            className="devotional-card student-stat-card"
            style={{
              padding: '1.25rem',
              borderTop: '4px solid #52B788',
              background: '#FFFFFF',
              boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
            }}
          >
            <div style={{ fontSize: '0.82rem', color: '#666', fontWeight: 600 }}>Classes Attended</div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#2D6A4F', marginTop: '4px' }}>
              {attendanceData?.presentCount ?? 0}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#2D6A4F', fontWeight: 600, marginTop: '4px' }}>
              Confirmed present marks
            </div>
          </div>

          {/* Conducted & Eligible Card */}
          <div 
            className="devotional-card student-stat-card"
            style={{
              padding: '1.25rem',
              borderTop: '4px solid #D4AF37',
              background: '#FFFFFF',
              boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
            }}
          >
            <div style={{ fontSize: '0.82rem', color: '#666', fontWeight: 600 }}>Total Eligible Classes</div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#1B4332', marginTop: '4px' }}>
              {attendanceData?.totalEligibleConducted ?? 0}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#777', marginTop: '4px' }}>
              Conducted weekend sessions
            </div>
          </div>

          {/* Absences Card */}
          <div 
            className="devotional-card student-stat-card"
            style={{
              padding: '1.25rem',
              borderTop: '4px solid #E57373',
              background: '#FFFFFF',
              boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
            }}
          >
            <div style={{ fontSize: '0.82rem', color: '#666', fontWeight: 600 }}>Recorded Absences</div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#C0392B', marginTop: '4px' }}>
              {attendanceData?.absentCount ?? 0}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#C0392B', fontWeight: 600, marginTop: '4px' }}>
              Missed class sessions
            </div>
          </div>

          {/* Unrecorded Card */}
          <div 
            className="devotional-card student-stat-card"
            style={{
              padding: '1.25rem',
              borderTop: '4px solid #B0BEC5',
              background: '#FFFFFF',
              boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
            }}
          >
            <div style={{ fontSize: '0.82rem', color: '#666', fontWeight: 600 }}>Unrecorded Sessions</div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#78909C', marginTop: '4px' }}>
              {attendanceData?.unrecordedCount ?? 0}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '4px' }}>
              Not marked as absent
            </div>
          </div>
        </section>

        {/* Janmashtami Countdown Calendar Card */}
        <JanmashtamiCountdown 
          season={season} 
          studentStanding={studentStanding}
          onScrollToLeaderboard={() => {
            const el = document.getElementById('student-competition-leaderboard');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
        />

        {/* Dedicated Janmashtami Leaderboard Section */}
        <section 
          id="student-competition-leaderboard"
          className="devotional-card"
          style={{
            background: '#FFFFFF',
            borderTop: '4px solid #FFD700',
            padding: '1.5rem',
            boxShadow: '0 4px 16px rgba(0,0,0,0.06)'
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div 
                style={{
                  background: 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)',
                  color: '#FFD700',
                  padding: '8px',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Trophy size={22} />
              </div>
              <div>
                <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 800, color: '#1B4332', margin: 0 }}>
                  Annual Seva Points Leaderboard &bull; {season?.year || 2027}
                </h2>
                <p style={{ color: '#666', fontSize: '0.82rem', margin: '2px 0 0' }}>
                  Earned through verified attendance at conducted weekend classes. (10 Points per present class).
                </p>
              </div>
            </div>

            {/* Student's Rank & Points Ahead Badge */}
            {studentStanding && (
              <div 
                style={{
                  background: studentStanding.totalPoints > 0 ? '#F0FFF4' : '#F7FAFC',
                  border: studentStanding.totalPoints > 0 ? '1.5px solid #68D391' : '1px solid #E2E8F0',
                  borderRadius: '10px',
                  padding: '0.5rem 0.95rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '0.85rem'
                }}
              >
                <Award size={18} style={{ color: studentStanding.totalPoints > 0 ? '#276749' : '#718096' }} />
                <div>
                  {studentStanding.totalPoints > 0 && studentStanding.rank ? (
                    <>
                      <strong style={{ color: '#22543D' }}>Rank #{studentStanding.rank}</strong> &bull; 
                      <span style={{ color: '#2F855A', marginLeft: '4px' }}>{studentStanding.totalPoints} Points</span>
                      {pointsNeeded && (
                        <div style={{ fontSize: '0.75rem', color: '#2D3748', marginTop: '1px' }}>
                          <ChevronUp size={12} style={{ display: 'inline', color: '#38A169' }} />
                          Need <strong>{pointsNeeded.points} pts</strong> to reach Rank #{pointsNeeded.targetRank}
                        </div>
                      )}
                    </>
                  ) : (
                    <span style={{ color: '#4A5568', fontWeight: 600 }}>
                      0 Seva Points (Unranked) &bull; Attend classes to earn points!
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Leaderboard Table */}
          <div style={{ overflowX: 'auto', marginBottom: '1.25rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ background: '#FAF6EE', borderBottom: '2px solid #EFE4CE', color: '#555' }}>
                  <th style={{ padding: '0.75rem 1rem', width: '70px', textAlign: 'center' }}>Rank</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Devotee Participant</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Classes Attended</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Total Points</th>
                </tr>
              </thead>
              <tbody>
                {standings && standings.filter(s => s.totalPoints > 0).length > 0 ? (
                  standings.filter(s => s.totalPoints > 0).slice(0, 10).map((st) => {
                    const isMe = st.studentId === (student?.studentId || student?.id);
                    return (
                      <tr 
                        key={st.studentId}
                        style={{
                          borderBottom: '1px solid #F0EBE0',
                          background: isMe ? '#FEF9C3' : (st.rank <= 3 ? '#FFFDF5' : '#FFFFFF'),
                          fontWeight: isMe ? 700 : 500
                        }}
                      >
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                          {st.rank === 1 ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '26px', height: '26px', borderRadius: '50%', background: '#FFD700', color: '#1B4332', fontWeight: 800 }}>
                              1
                            </span>
                          ) : st.rank === 2 ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '26px', height: '26px', borderRadius: '50%', background: '#E2E8F0', color: '#4A5568', fontWeight: 800 }}>
                              2
                            </span>
                          ) : st.rank === 3 ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '26px', height: '26px', borderRadius: '50%', background: '#FBD38D', color: '#744210', fontWeight: 800 }}>
                              3
                            </span>
                          ) : (
                            <span style={{ color: '#718096' }}>#{st.rank}</span>
                          )}
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ color: isMe ? '#1B4332' : '#2D3748' }}>
                              {isMe ? student?.name : st.displayName}
                            </span>
                            {isMe && (
                              <span style={{ background: '#1B4332', color: '#FFD700', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '8px', fontWeight: 800 }}>
                                YOU
                              </span>
                            )}
                            {st.prizeTitle && (
                              <span style={{ background: '#FEF3C7', color: '#92400E', fontSize: '0.7rem', padding: '1px 6px', borderRadius: '6px' }}>
                                Prize Eligible
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                          <span style={{ background: '#EDF2F7', padding: '2px 8px', borderRadius: '10px', fontSize: '0.8rem', color: '#4A5568' }}>
                            {st.classesAttended} sessions
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 800, color: '#1B4332', fontSize: '0.95rem' }}>
                          {st.totalPoints} pts
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>
                      No competition attendance records registered for this season yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Tie-Breaking Rule & Prize Information Callout */}
          <div 
            style={{
              background: '#F7FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '10px',
              padding: '0.9rem 1.15rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              fontSize: '0.82rem',
              color: '#4A5568',
              lineHeight: 1.5
            }}
          >
            <Info size={18} style={{ color: '#3182CE', flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong style={{ color: '#2D3748' }}>Tie-Breaking Policy:</strong> Standings are determined strictly by: 
              <strong> 1. Highest total Seva Points</strong> &bull; 
              <strong> 2. Most eligible conducted classes attended</strong> &bull; 
              <strong> 3.</strong> If still tied, students share the same rank and the administrator conducts a final devotional review before prize distribution.
              Private student records and telephone numbers are never published.
            </div>
          </div>
        </section>

        {/* AI Features & Assistant Section (5 Daily Question Quota) */}
        <section 
          className="devotional-card"
          style={{
            background: 'linear-gradient(135deg, #FFFDF8 0%, #FFF9EC 100%)',
            border: '1.5px solid #EADDC8',
            borderTop: '4px solid #FF9933',
            padding: '1.5rem',
            boxShadow: '0 4px 16px rgba(0,0,0,0.06)'
          }}
        >
          {/* AI Header & Daily Quota Counter */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={20} color="#FF9933" />
                <h2 className="heading-gold" style={{ fontSize: '1.3rem', fontWeight: 800, color: '#1B4332' }}>
                  Student AI Assistant
                </h2>
              </div>
              <p style={{ color: '#666', fontSize: '0.82rem', marginTop: '2px' }}>
                Grounded in the Bhagavad Gita scripture &amp; your personal verified attendance records.
              </p>
            </div>

            {/* Daily Quota Counter Badge */}
            <div 
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: quota.remaining > 0 ? '#FEF3C7' : '#FEE2E2',
                border: quota.remaining > 0 ? '1.5px solid #FCD34D' : '1.5px solid #FCA5A5',
                color: quota.remaining > 0 ? '#92400E' : '#991B1B',
                padding: '6px 14px',
                borderRadius: '24px',
                fontWeight: 700,
                fontSize: '0.88rem'
              }}
            >
              <span>AI questions remaining today: <strong>{quota.remaining} of {quota.limit || 5}</strong></span>
            </div>
          </div>

          {/* Limit Reached Notice Banner */}
          {quota.remaining <= 0 && (
            <div 
              style={{
                background: '#FFF3F3',
                border: '1.5px solid #FFCDD2',
                color: '#B71C1C',
                padding: '0.85rem 1.25rem',
                borderRadius: '8px',
                marginBottom: '1.25rem',
                fontSize: '0.88rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontWeight: 600
              }}
            >
              <ShieldAlert size={18} />
              <span>You've used all five AI questions for today. Your daily allowance resets tomorrow at midnight (IST).</span>
            </div>
          )}

          {/* AI Feature Selector Tabs */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem' }}>
            <button
              type="button"
              onClick={() => setAiTab('gita')}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: aiTab === 'gita' ? '#1B4332' : '#EFE4CE',
                color: aiTab === 'gita' ? '#FFD700' : '#555',
                transition: 'all 0.15s ease'
              }}
            >
              <BookOpen size={16} />
              <span>Bhagavad Gita Q&amp;A</span>
            </button>

            <button
              type="button"
              onClick={() => setAiTab('attendance')}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: aiTab === 'attendance' ? '#1B4332' : '#EFE4CE',
                color: aiTab === 'attendance' ? '#FFD700' : '#555',
                transition: 'all 0.15s ease'
              }}
            >
              <GraduationCap size={16} />
              <span>Personal Attendance Assistant</span>
            </button>
          </div>

          {/* Chat Messages Display Box */}
          <div 
            style={{
              maxHeight: '260px',
              overflowY: 'auto',
              background: '#FFFFFF',
              border: '1px solid #E2D9C8',
              borderRadius: '8px',
              padding: '1rem',
              marginBottom: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}
          >
            {chatMessages.map((msg, index) => (
              <div 
                key={index} 
                style={{
                  alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  background: msg.sender === 'user' ? '#1B4332' : (msg.isError ? '#FFF0F0' : '#FAF6EE'),
                  color: msg.sender === 'user' ? '#FFF' : '#333',
                  padding: '10px 14px',
                  borderRadius: msg.sender === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                  fontSize: '0.88rem',
                  lineHeight: 1.45,
                  border: msg.sender === 'user' ? 'none' : '1px solid #EADDC8'
                }}
              >
                <div style={{ whiteSpace: 'pre-wrap' }}>{formatDevotionalText(msg.text)}</div>
                {msg.verses && msg.verses.length > 0 && (
                  <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed #D4AF37', fontSize: '0.78rem', color: '#8B4513' }}>
                    <strong>Referenced Verses:</strong>
                    {msg.verses.map((v, vi) => (
                      <div key={vi} style={{ marginTop: '2px' }}>
                        &bull; Chapter {v.chapter}, Verse {v.verse} ({v.sanskrit ? `"${v.sanskrit.slice(0, 30)}..."` : ''})
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {isAiLoading && (
              <div style={{ alignSelf: 'flex-start', background: '#FAF6EE', padding: '8px 12px', borderRadius: '8px', fontSize: '0.82rem', color: '#8B4513', fontStyle: 'italic' }}>
                Consulting authentic scriptures &amp; verified records...
              </div>
            )}
          </div>

          {/* Question Input Form */}
          <form onSubmit={handleSendQuestion} style={{ display: 'flex', gap: '8px' }}>
            <input 
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              disabled={quota.remaining <= 0 || isAiLoading}
              placeholder={
                quota.remaining <= 0 
                  ? "Daily limit of 5 questions reached. Resets tomorrow." 
                  : (aiTab === 'gita' 
                      ? "Ask a question (e.g. 'How to control anger?', 'What does Gita say about duty?')" 
                      : "Ask about your attendance (e.g. 'What is my percentage?', 'How many classes did I attend?')")
              }
              className="form-input"
              style={{ flex: 1 }}
            />
            <button
              type="submit"
              disabled={quota.remaining <= 0 || isAiLoading || !question.trim()}
              className="btn-gold"
              style={{ padding: '0.65rem 1.25rem', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Send size={16} />
              <span>Ask</span>
            </button>
          </form>
        </section>

        {/* Recent Attendance History Table */}
        <section className="devotional-card" style={{ padding: '0', overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem 1.5rem', background: '#FAF6EE', borderBottom: '1px solid #EFE4CE', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ fontWeight: 800, color: '#1B4332', fontSize: '1.05rem' }}>
              Your Attendance History &amp; Class Speakers
            </div>
            <div style={{ fontSize: '0.8rem', color: '#666' }}>
              Conducted classes since registration date ({student?.registrationDate || '2026-08-01'})
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ background: '#F8F4EA', borderBottom: '2px solid #EADDC8', color: '#555' }}>
                  <th style={{ padding: '0.85rem 1.25rem' }}>Class Date</th>
                  <th style={{ padding: '0.85rem 1.25rem' }}>Day</th>
                  <th style={{ padding: '0.85rem 1.25rem' }}>Class Title &amp; Topic</th>
                  <th style={{ padding: '0.85rem 1.25rem' }}>Class Conductor</th>
                  <th style={{ padding: '0.85rem 1.25rem', textAlign: 'center' }}>Your Status</th>
                </tr>
              </thead>
              <tbody>
                {attendanceData?.recentHistory && attendanceData.recentHistory.length > 0 ? (
                  attendanceData.recentHistory.map((ses, idx) => (
                    <tr 
                      key={idx}
                      style={{
                        borderBottom: '1px solid #F0EBE0',
                        background: idx % 2 === 0 ? '#FFFFFF' : '#FCFAF5'
                      }}
                    >
                      <td style={{ padding: '0.85rem 1.25rem', fontWeight: 700, color: '#303030', whiteSpace: 'nowrap' }}>
                        {ses.sessionDate}
                      </td>
                      <td style={{ padding: '0.85rem 1.25rem' }}>
                        <span className="badge-weekend">{ses.dayOfWeek}</span>
                      </td>
                      <td style={{ padding: '0.85rem 1.25rem' }}>
                        <div style={{ fontWeight: 600, color: '#1B4332' }}>{ses.title}</div>
                        {ses.topic && <div style={{ fontSize: '0.75rem', color: '#777' }}>{ses.topic}</div>}
                      </td>
                      <td style={{ padding: '0.85rem 1.25rem' }}>
                        <span 
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: ses.conductedByName !== 'Not recorded' ? '#FEF3C7' : '#F3F4F6',
                            color: ses.conductedByName !== 'Not recorded' ? '#92400E' : '#6B7280',
                            padding: '2px 8px',
                            borderRadius: '10px',
                            fontWeight: 700,
                            fontSize: '0.8rem'
                          }}
                        >
                          <GraduationCap size={12} />
                          <span>{ses.conductedByName}</span>
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem 1.25rem', textAlign: 'center' }}>
                        {ses.status === 'present' ? (
                          <span className="badge-present">
                            <CheckCircle2 size={13} />
                            <span>Present</span>
                          </span>
                        ) : ses.status === 'absent' ? (
                          <span className="badge-absent">
                            <XCircle size={13} />
                            <span>Absent</span>
                          </span>
                        ) : (
                          <span style={{ background: '#ECEFF1', color: '#607D8B', padding: '3px 8px', borderRadius: '12px', fontSize: '0.78rem', fontWeight: 600 }}>
                            Not recorded
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} style={{ padding: '2.5rem', textAlign: 'center', color: '#888' }}>
                      No conducted sessions found for your registration period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
        </>
        )}

      </div>
    </div>
  );
};
