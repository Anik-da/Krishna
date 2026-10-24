import React, { useState, useEffect } from 'react';
import { 
  apiGetCurrentPlan, 
  apiGetAllPlans, 
  apiSaveWeeklyPlan, 
  apiReschedulePlan, 
  apiCancelWeeklyPlan 
} from '../../api/apiClient';
import {
  getCurrentWeeklyPlanLocal,
  getAllWeeklyPlansLocal,
  saveWeeklyPlanLocal,
  rescheduleWeeklyPlanLocal,
  cancelWeeklyPlanLocal,
  formatDateDMY,
  applyDeadlineAutoClosure,
  isPastFridayDeadline
} from '../../db/db';
import { 
  CalendarCheck, 
  Calendar, 
  Clock, 
  MapPin, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  Save, 
  AlertCircle,
  HelpCircle,
  ShieldAlert,
  ArrowRightLeft,
  ChevronRight,
  Info
} from 'lucide-react';

export const WeeklyPlanner = ({ onPlanUpdated }) => {
  const [currentPlan, setCurrentPlan] = useState(null);
  const [allPlans, setAllPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });

  // Form states for confirming the current week
  const [selectedOption, setSelectedOption] = useState('undecided'); // 'scheduled' | 'no_class' | 'undecided'
  const [selectedDay, setSelectedDay] = useState('Saturday'); // 'Saturday' | 'Sunday'
  const [scheduledTime, setScheduledTime] = useState('06:00 PM – 08:00 PM');
  const [location, setLocation] = useState('');
  const [topic, setTopic] = useState('');
  const [publicAnnouncement, setPublicAnnouncement] = useState('');
  const [deadlineNote, setDeadlineNote] = useState('Confirm by Friday 06:00 PM');

  // Emergency Cancellation Modal
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');

  // Reschedule Confirmation Modal
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const applyPlanToForm = (rawP) => {
    if (!rawP) return;
    const p = applyDeadlineAutoClosure(rawP);
    setCurrentPlan(p);
    setSelectedOption(p.status === 'cancelled' ? 'undecided' : (p.status || 'undecided'));
    if (p.selectedDay) setSelectedDay(p.selectedDay);
    if (p.scheduledTime) setScheduledTime(p.scheduledTime);
    if (p.location) setLocation(p.location);
    if (p.topic !== undefined) setTopic(p.topic || '');
    if (p.publicAnnouncement) setPublicAnnouncement(p.publicAnnouncement);
    if (p.deadlineNote) {
      setDeadlineNote(p.deadlineNote.replace(/Thursday/gi, 'Friday'));
    } else {
      setDeadlineNote('Confirm by Friday 06:00 PM');
    }
  };

  const loadData = async () => {
    try {
      // 1. Instant cache-first load (<2ms, ZERO FREEZE)
      const localPlan = await getCurrentWeeklyPlanLocal();
      const localAll = await getAllWeeklyPlansLocal();
      if (localPlan) {
        applyPlanToForm(localPlan);
      }
      if (Array.isArray(localAll)) {
        setAllPlans(localAll.map(applyDeadlineAutoClosure));
      }

      // 2. Non-blocking remote sync in background
      Promise.allSettled([
        apiGetCurrentPlan(),
        apiGetAllPlans()
      ]).then(([currentRes, allRes]) => {
        if (currentRes.status === 'fulfilled' && currentRes.value) {
          applyPlanToForm(currentRes.value);
        }
        if (allRes.status === 'fulfilled' && Array.isArray(allRes.value) && allRes.value.length > 0) {
          setAllPlans(allRes.value.map(applyDeadlineAutoClosure));
        }
      }).catch(() => {});
    } catch (e) {
      console.warn("Error reading local weekly plan:", e);
    }
  };

  const handleSavePlan = async () => {
    if (!currentPlan) return;
    try {
      setSaving(true);
      setStatusMsg({ type: '', text: '' });

      const payload = {
        weekKey: currentPlan.weekKey,
        year: currentPlan.year,
        weekNumber: currentPlan.weekNumber,
        saturdayDate: currentPlan.saturdayDate,
        sundayDate: currentPlan.sundayDate,
        status: selectedOption,
        selectedDay: selectedOption === 'scheduled' ? selectedDay : null,
        scheduledTime,
        location,
        topic: topic.trim(),
        publicAnnouncement,
        deadlineNote: (deadlineNote || 'Confirm by Friday 06:00 PM').replace(/Thursday/gi, 'Friday')
      };

      // 1. Save locally to IndexedDB & Firestore & directly update session register!
      const res = await saveWeeklyPlanLocal(payload);
      setCurrentPlan(res);
      setStatusMsg({ type: 'success', text: `Weekly class plan saved: ${res.status.toUpperCase()}!` });
      
      // Update session history & parent metrics immediately
      if (onPlanUpdated) onPlanUpdated();

      // 2. Sync to Express / MongoDB in background without blocking UI
      apiSaveWeeklyPlan(payload).catch((err) => {
        console.warn("Background server plan sync notice (local DB preserved):", err.message);
      });
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to save weekly class plan.' });
    } finally {
      setSaving(false);
      setTimeout(() => setStatusMsg({ type: '', text: '' }), 5000);
    }
  };

  const handleReschedule = async () => {
    if (!currentPlan) return;
    try {
      setShowRescheduleModal(false);
      setSaving(true);

      const res = await rescheduleWeeklyPlanLocal(currentPlan.weekKey);
      setCurrentPlan(res);
      setStatusMsg({ type: 'success', text: `Class rescheduled to ${res.selectedDay}, ${res.scheduledDate}!` });
      if (onPlanUpdated) onPlanUpdated();

      apiReschedulePlan(currentPlan.weekKey).catch(() => {});
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to reschedule class.' });
    } finally {
      setSaving(false);
      setTimeout(() => setStatusMsg({ type: '', text: '' }), 5000);
    }
  };

  const handleCancelClass = async () => {
    if (!currentPlan) return;
    try {
      setShowCancelModal(false);
      setSaving(true);

      const reason = cancellationReason || 'Class cancelled due to unavoidable circumstances.';
      const res = await cancelWeeklyPlanLocal(
        currentPlan.weekKey, 
        reason,
        reason
      );
      setCurrentPlan(res);
      setStatusMsg({ type: 'success', text: 'Class cancelled and emergency alert published to landing page!' });
      if (onPlanUpdated) onPlanUpdated();

      apiCancelWeeklyPlan(currentPlan.weekKey, reason, reason).catch(() => {});
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to cancel class.' });
    } finally {
      setSaving(false);
      setTimeout(() => setStatusMsg({ type: '', text: '' }), 5000);
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* 1. Header Banner */}
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
            <CalendarCheck size={26} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 className="heading-gold" style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1B4332' }}>
                Weekly Class Planning &amp; Confirmation
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
                WEEK {currentPlan?.weekNumber} ({currentPlan?.weekKey})
              </span>
            </div>
            <p style={{ color: '#4A5568', fontSize: '0.85rem', margin: 0 }}>
              <strong>Rule:</strong> Classes are held on either <strong>Saturday OR Sunday</strong>, never both. Some weeks have no class. Confirm this week's plan in advance.
            </p>
          </div>
        </div>

        <button
          onClick={loadData}
          style={{
            background: '#F1F5F9',
            color: '#334155',
            border: '1px solid #CBD5E1',
            borderRadius: '8px',
            padding: '0.45rem 0.85rem',
            fontSize: '0.82rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '5px'
          }}
          className="hover:bg-slate-200"
        >
          <RefreshCw size={14} />
          <span>Refresh Status</span>
        </button>
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
          {statusMsg.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* 2. UNDECIDED REMINDER ALERT (Only before Friday 06:00 PM deadline) */}
      {currentPlan?.status === 'undecided' && !isPastFridayDeadline(currentPlan?.saturdayDate) && (
        <div 
          style={{
            background: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)',
            border: '2px solid #F59E0B',
            borderRadius: '12px',
            padding: '1.25rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            boxShadow: '0 4px 12px rgba(245, 158, 11, 0.15)'
          }}
        >
          <AlertTriangle size={24} style={{ color: '#D97706', flexShrink: 0, marginTop: '2px' }} />
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#92400E', margin: '0 0 4px' }}>
              Pending Confirmation: Upcoming Weekend Class
            </h3>
            <p style={{ color: '#78350F', fontSize: '0.88rem', margin: 0, lineHeight: 1.5 }}>
              The schedule for Saturday ({formatDateDMY(currentPlan.saturdayDate)}) and Sunday ({formatDateDMY(currentPlan.sundayDate)}) has not been confirmed yet. 
              Please confirm below whether Saturday or Sunday class will be conducted, or declare no class this week.
            </p>
            <div style={{ marginTop: '6px', fontSize: '0.78rem', color: '#B45309', fontWeight: 700 }}>
              Guideline Deadline: {(currentPlan.deadlineNote || 'Confirm by Friday 06:00 PM').replace(/Thursday/gi, 'Friday')}
            </div>
          </div>
        </div>
      )}

      {/* AUTO-CLOSED NOTICE WHEN FRIDAY DEADLINE PASSED */}
      {currentPlan?.status === 'no_class' && (currentPlan?.autoClosed || isPastFridayDeadline(currentPlan?.saturdayDate) || currentPlan?.cancellationReason?.includes('deadline')) && (
        <div 
          style={{
            background: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)',
            border: '2px solid #F59E0B',
            borderRadius: '12px',
            padding: '1.25rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            boxShadow: '0 4px 12px rgba(245, 158, 11, 0.12)'
          }}
        >
          <Info size={24} style={{ color: '#D97706', flexShrink: 0, marginTop: '2px' }} />
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#92400E', margin: '0 0 4px' }}>
              Automatic Notice: Friday Confirmation Deadline Passed
            </h3>
            <p style={{ color: '#78350F', fontSize: '0.88rem', margin: 0, lineHeight: 1.5 }}>
              The deadline to confirm this weekend&apos;s class passed on Friday at 06:00 PM without an admin update. 
              The system has automatically declared <strong>No Class This Week</strong>. Public visitors and students see that no classes are scheduled.
            </p>
            <p style={{ color: '#B45309', fontSize: '0.8rem', margin: '6px 0 0', fontWeight: 700 }}>
              Need to conduct an emergency class? You can override this anytime by selecting Saturday or Sunday below and clicking &quot;Save Class Plan&quot;.
            </p>
          </div>
        </div>
      )}

      {/* 3. CURRENT PLAN CONFIRMATION CARD */}
      <div 
        className="devotional-card"
        style={{
          background: '#FFFFFF',
          borderRadius: '14px',
          padding: '1.75rem',
          border: '1px solid #E2E8F0',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.75rem', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1B4332', margin: 0 }}>
              Upcoming Week Decision ({currentPlan?.weekKey})
            </h3>
            <span style={{ fontSize: '0.82rem', color: '#64748B' }}>
              Weekend Dates: Saturday <strong>{formatDateDMY(currentPlan?.saturdayDate)}</strong> &bull; Sunday <strong>{formatDateDMY(currentPlan?.sundayDate)}</strong>
            </span>
          </div>

          {/* Current Live Badge */}
          <div>
            {currentPlan?.status === 'scheduled' && (
              <span style={{ background: '#DCFCE7', color: '#15803D', padding: '4px 12px', borderRadius: '16px', fontWeight: 700, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <CheckCircle2 size={14} />
                CONFIRMED: {currentPlan.selectedDay?.toUpperCase()}
              </span>
            )}
            {currentPlan?.status === 'no_class' && (
              <span style={{ background: '#FEF3C7', color: '#B45309', padding: '4px 12px', borderRadius: '16px', fontWeight: 700, fontSize: '0.8rem' }}>
                NO CLASS THIS WEEK {currentPlan?.autoClosed || isPastFridayDeadline(currentPlan?.saturdayDate) ? '(AUTO-CLOSED)' : ''}
              </span>
            )}
            {currentPlan?.status === 'cancelled' && (
              <span style={{ background: '#FEE2E2', color: '#DC2626', padding: '4px 12px', borderRadius: '16px', fontWeight: 700, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <ShieldAlert size={14} />
                CLASS CANCELLED
              </span>
            )}
            {currentPlan?.status === 'undecided' && (
              <span style={{ background: '#F1F5F9', color: '#475569', padding: '4px 12px', borderRadius: '16px', fontWeight: 700, fontSize: '0.8rem' }}>
                NOT DECIDED YET
              </span>
            )}
          </div>
        </div>

        {/* 3 Exclusive Radio Options */}
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: '#1B4332', marginBottom: '8px' }}>
            Select this week's status (Exactly one option):
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '10px' }}>
            
            {/* Option 1: Class Conducted */}
            <div 
              onClick={() => setSelectedOption('scheduled')}
              style={{
                border: `2px solid ${selectedOption === 'scheduled' ? '#16A34A' : '#E2E8F0'}`,
                background: selectedOption === 'scheduled' ? '#F0FDF4' : '#FAFAFA',
                borderRadius: '10px',
                padding: '1rem',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <input 
                  type="radio" 
                  name="weekStatus" 
                  checked={selectedOption === 'scheduled'} 
                  onChange={() => setSelectedOption('scheduled')}
                  style={{ accentColor: '#16A34A' }}
                />
                <strong style={{ color: '#14532D', fontSize: '0.95rem' }}>1. Class Will Be Conducted</strong>
              </div>
              <p style={{ fontSize: '0.8rem', color: '#4B5563', margin: 0 }}>
                Schedule exactly one session on either Saturday OR Sunday.
              </p>
            </div>

            {/* Option 2: No Class */}
            <div 
              onClick={() => setSelectedOption('no_class')}
              style={{
                border: `2px solid ${selectedOption === 'no_class' ? '#D97706' : '#E2E8F0'}`,
                background: selectedOption === 'no_class' ? '#FFFBEB' : '#FAFAFA',
                borderRadius: '10px',
                padding: '1rem',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <input 
                  type="radio" 
                  name="weekStatus" 
                  checked={selectedOption === 'no_class'} 
                  onChange={() => setSelectedOption('no_class')}
                  style={{ accentColor: '#D97706' }}
                />
                <strong style={{ color: '#92400E', fontSize: '0.95rem' }}>2. No Class This Week</strong>
              </div>
              <p style={{ fontSize: '0.8rem', color: '#4B5563', margin: 0 }}>
                Declare exam break or holiday. Will not affect attendance percentages.
              </p>
            </div>

            {/* Option 3: Not Decided */}
            <div 
              onClick={() => setSelectedOption('undecided')}
              style={{
                border: `2px solid ${selectedOption === 'undecided' ? '#64748B' : '#E2E8F0'}`,
                background: selectedOption === 'undecided' ? '#F8FAFC' : '#FAFAFA',
                borderRadius: '10px',
                padding: '1rem',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <input 
                  type="radio" 
                  name="weekStatus" 
                  checked={selectedOption === 'undecided'} 
                  onChange={() => setSelectedOption('undecided')}
                  style={{ accentColor: '#64748B' }}
                />
                <strong style={{ color: '#334155', fontSize: '0.95rem' }}>3. Not Decided Yet</strong>
              </div>
              <p style={{ fontSize: '0.8rem', color: '#4B5563', margin: 0 }}>
                Schedule being confirmed. Shows reminder in dashboard.
              </p>
            </div>
          </div>
        </div>

        {/* IF SCHEDULED: Day Choice (Saturday OR Sunday) */}
        {selectedOption === 'scheduled' && (
          <div style={{ background: '#F8FAFC', padding: '1.25rem', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: '#1B4332', marginBottom: '8px' }}>
              Choose Class Day (Strictly Saturday OR Sunday):
            </label>

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
              <label 
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  background: selectedDay === 'Saturday' ? '#DCFCE7' : '#FFFFFF',
                  border: `2px solid ${selectedDay === 'Saturday' ? '#16A34A' : '#CBD5E1'}`,
                  borderRadius: '8px',
                  padding: '0.75rem 1rem',
                  cursor: 'pointer',
                  fontWeight: 700,
                  color: selectedDay === 'Saturday' ? '#14532D' : '#334155'
                }}
              >
                <input 
                  type="radio" 
                  name="dayPick" 
                  checked={selectedDay === 'Saturday'} 
                  onChange={() => setSelectedDay('Saturday')}
                  style={{ accentColor: '#16A34A' }}
                />
                <div>
                  <div>Saturday Class</div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 500, color: '#4B5563' }}>
                    {formatDateDMY(currentPlan?.saturdayDate)}
                  </div>
                </div>
              </label>

              <label 
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  background: selectedDay === 'Sunday' ? '#DCFCE7' : '#FFFFFF',
                  border: `2px solid ${selectedDay === 'Sunday' ? '#16A34A' : '#CBD5E1'}`,
                  borderRadius: '8px',
                  padding: '0.75rem 1rem',
                  cursor: 'pointer',
                  fontWeight: 700,
                  color: selectedDay === 'Sunday' ? '#14532D' : '#334155'
                }}
              >
                <input 
                  type="radio" 
                  name="dayPick" 
                  checked={selectedDay === 'Sunday'} 
                  onChange={() => setSelectedDay('Sunday')}
                  style={{ accentColor: '#16A34A' }}
                />
                <div>
                  <div>Sunday Class</div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 500, color: '#4B5563' }}>
                    {formatDateDMY(currentPlan?.sundayDate)}
                  </div>
                </div>
              </label>
            </div>

            {/* Time, Topic, Venue, Announcement Fields */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Class Time
                </label>
                <input 
                  type="text" 
                  className="devotional-input"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  placeholder="06:00 PM – 08:00 PM"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Topic / Chapter Focus (Optional)
                </label>
                <input 
                  type="text" 
                  className="devotional-input"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Chapter 4 — Transcendental Knowledge (Optional)"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Venue / Location / Mode (Optional)
                </label>
                <input 
                  type="text" 
                  className="devotional-input"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Temple Hall / Online"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Public Announcement (Optional)
                </label>
                <input 
                  type="text" 
                  className="devotional-input"
                  value={publicAnnouncement}
                  onChange={(e) => setPublicAnnouncement(e.target.value)}
                  placeholder="e.g. Special youth kirtan will precede the lecture"
                />
              </div>
            </div>
          </div>
        )}

        {/* Save & Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <button
            onClick={handleSavePlan}
            disabled={saving}
            style={{
              background: 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)',
              color: '#FFD700',
              border: '1px solid #FFD700',
              borderRadius: '8px',
              padding: '0.65rem 1.4rem',
              fontSize: '0.9rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            className="hover:scale-105 active:scale-95"
          >
            <Save size={16} />
            <span>{saving ? 'Saving Plan...' : 'Confirm Weekly Plan'}</span>
          </button>

          {/* Emergency actions if currently scheduled */}
          {currentPlan?.status === 'scheduled' && (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                onClick={() => setShowRescheduleModal(true)}
                style={{
                  background: '#EFF6FF',
                  color: '#1D4ED8',
                  border: '1px solid #BFDBFE',
                  borderRadius: '8px',
                  padding: '0.6rem 1rem',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
                className="hover:bg-blue-100"
              >
                <ArrowRightLeft size={14} />
                <span>Switch to {currentPlan.selectedDay === 'Saturday' ? 'Sunday' : 'Saturday'}</span>
              </button>

              <button
                onClick={() => setShowCancelModal(true)}
                style={{
                  background: '#FFF1F2',
                  color: '#DC2626',
                  border: '1px solid #FECDD3',
                  borderRadius: '8px',
                  padding: '0.6rem 1rem',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
                className="hover:bg-rose-100"
              >
                <XCircle size={14} />
                <span>Emergency Cancel</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 4. PREVIOUS WEEKS' HISTORY TABLE */}
      {allPlans.length > 0 && (
        <div 
          className="devotional-card"
          style={{
            background: '#FFFFFF',
            borderRadius: '14px',
            padding: '1.5rem',
            border: '1px solid #E2E8F0'
          }}
        >
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1B4332', marginBottom: '1rem' }}>
            Weekly Confirmation History
          </h3>

          <div style={{ overflowX: 'auto' }}>
            <table className="devotional-table" style={{ width: '100%', fontSize: '0.85rem' }}>
              <thead>
                <tr>
                  <th>Week</th>
                  <th>Weekend Dates</th>
                  <th>Confirmed Status</th>
                  <th>Scheduled Day &amp; Date</th>
                  <th>Topic</th>
                  <th>Public Notice</th>
                </tr>
              </thead>
              <tbody>
                {allPlans.map(p => (
                  <tr key={p._id || p.weekKey}>
                    <td style={{ fontWeight: 700, fontFamily: 'monospace' }}>{p.weekKey}</td>
                    <td>Sat: {formatDateDMY(p.saturdayDate)}<br />Sun: {formatDateDMY(p.sundayDate)}</td>
                    <td>
                      {p.status === 'scheduled' && <span style={{ color: '#16A34A', fontWeight: 700 }}>Scheduled</span>}
                      {p.status === 'no_class' && <span style={{ color: '#D97706', fontWeight: 700 }}>No Class</span>}
                      {p.status === 'cancelled' && <span style={{ color: '#DC2626', fontWeight: 700 }}>Cancelled</span>}
                      {p.status === 'undecided' && <span style={{ color: '#64748B', fontWeight: 700 }}>Pending</span>}
                    </td>
                    <td>{p.selectedDay ? `${p.selectedDay} (${formatDateDMY(p.scheduledDate)})` : '—'}</td>
                    <td>{p.topic || '—'}</td>
                    <td style={{ maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.cancellationReason || p.publicAnnouncement || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* EMERGENCY CANCEL MODAL */}
      {showCancelModal && (
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
              border: '2px solid #EF4444'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#DC2626', marginBottom: '12px' }}>
              <ShieldAlert size={26} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
                Cancel Scheduled Class?
              </h3>
            </div>
            <p style={{ color: '#4B5563', fontSize: '0.88rem', lineHeight: 1.5, margin: '0 0 1rem' }}>
              This will mark the class on <strong>{formatDateDMY(currentPlan.scheduledDate)} ({currentPlan.selectedDay})</strong> as cancelled. 
              The cancellation notice will be immediately published to the public landing page. 
              It will be excluded from attendance percentage calculations.
            </p>

            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
              Public Cancellation Reason (Displayed to students):
            </label>
            <textarea 
              rows={3}
              className="devotional-input"
              value={cancellationReason}
              onChange={(e) => setCancellationReason(e.target.value)}
              placeholder="e.g. Class cancelled due to severe weather conditions. Self-study encouraged."
              style={{ marginBottom: '1.25rem' }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setShowCancelModal(false)}
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
                Dismiss
              </button>
              <button
                onClick={handleCancelClass}
                disabled={saving}
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
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESCHEDULE CONFIRMATION MODAL */}
      {showRescheduleModal && (
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
              border: '2px solid #3B82F6'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#1D4ED8', marginBottom: '12px' }}>
              <ArrowRightLeft size={24} />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>
                Reschedule to {currentPlan.selectedDay === 'Saturday' ? 'Sunday' : 'Saturday'}?
              </h3>
            </div>
            <p style={{ color: '#4B5563', fontSize: '0.88rem', lineHeight: 1.5, margin: '0 0 1.25rem' }}>
              This will switch the scheduled session for week {currentPlan.weekKey} from <strong>{currentPlan.selectedDay} ({formatDateDMY(currentPlan.scheduledDate)})</strong> to <strong>{currentPlan.selectedDay === 'Saturday' ? `Sunday (${formatDateDMY(currentPlan.sundayDate)})` : `Saturday (${formatDateDMY(currentPlan.saturdayDate)})`}</strong>. 
              The landing page and session registers will update automatically.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setShowRescheduleModal(false)}
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
                onClick={handleReschedule}
                disabled={saving}
                style={{
                  background: '#1D4ED8',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '0.6rem 1.3rem',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Confirm Reschedule
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
