import React, { useState, useEffect } from 'react';
import { 
  Trophy, 
  Calendar, 
  Award, 
  ShieldCheck, 
  ExternalLink, 
  PlusCircle, 
  FileSpreadsheet, 
  Lock, 
  RotateCcw, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Edit3, 
  Save, 
  History, 
  Filter, 
  Search, 
  UserCheck, 
  ChevronRight,
  Info,
  Gift,
  Check
} from 'lucide-react';
import { 
  getActiveJanmashtamiSeasonLocal, 
  getAllJanmashtamiSeasonsLocal, 
  saveJanmashtamiSeasonLocal, 
  calculateJanmashtamiStandingsLocal, 
  addJanmashtamiAdjustmentLocal, 
  getJanmashtamiAdjustmentsLocal, 
  finalizeJanmashtamiSeasonLocal, 
  updateJanmashtamiPrizeLocal, 
  exportJanmashtamiCSV,
  formatDateDMY 
} from '../../db/db';
import { 
  apiGetActiveJanmashtamiSeason, 
  apiGetAllJanmashtamiSeasons, 
  apiUpdateJanmashtamiSeason, 
  apiAddJanmashtamiAdjustment, 
  apiGetJanmashtamiAdjustments, 
  apiUpdateJanmashtamiPrize, 
  apiFinalizeJanmashtamiSeason 
} from '../../api/apiClient';

export const JanmashtamiAdmin = () => {
  const [activeSeason, setActiveSeason] = useState(null);
  const [allSeasons, setAllSeasons] = useState([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState(null);
  const [standings, setStandings] = useState([]);
  const [adjustments, setAdjustments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState('standings'); // 'standings' | 'prizes' | 'settings' | 'audit' | 'archive'

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');

  // Manual Adjustment Modal State
  const [isAdjModalOpen, setIsAdjModalOpen] = useState(false);
  const [selectedStudentForAdj, setSelectedStudentForAdj] = useState(null);
  const [adjustmentPoints, setAdjustmentPoints] = useState(10);
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [adjError, setAdjError] = useState('');
  const [isSubmittingAdj, setIsSubmittingAdj] = useState(false);

  // Season Settings Form State
  const [settingsForm, setSettingsForm] = useState({
    eventDate: '',
    isDateVerified: false,
    calendarSourceUrl: 'https://www.iskconbangalore.org/calendar/',
    verificationDate: '',
    pointsPerPresentClass: 10,
    publicDisplayNamePolicy: 'initial_masked',
    publicLeaderboardLimit: 10
  });
  const [settingsSaveSuccess, setSettingsSaveSuccess] = useState(false);

  // Finalize Season Modal State
  const [isFinalizeModalOpen, setIsFinalizeModalOpen] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);

  // Load all competition data
  const loadSeasonData = async (targetSeasonId = null) => {
    try {
      setLoading(true);
      const [season, seasonsList] = await Promise.all([
        getActiveJanmashtamiSeasonLocal(),
        getAllJanmashtamiSeasonsLocal()
      ]);

      const effectiveSeason = targetSeasonId 
        ? seasonsList.find(s => s.seasonId === targetSeasonId) || season
        : season;

      setActiveSeason(effectiveSeason);
      setSelectedSeasonId(effectiveSeason.seasonId);
      setAllSeasons(seasonsList);

      setSettingsForm({
        eventDate: effectiveSeason.eventDate || '',
        isDateVerified: Boolean(effectiveSeason.isDateVerified),
        calendarSourceUrl: effectiveSeason.calendarSourceUrl || 'https://www.iskconbangalore.org/calendar/',
        verificationDate: effectiveSeason.verificationDate || '',
        pointsPerPresentClass: effectiveSeason.pointsRules?.pointsPerPresentClass ?? 10,
        publicDisplayNamePolicy: effectiveSeason.publicDisplayNamePolicy || 'initial_masked',
        publicLeaderboardLimit: effectiveSeason.publicLeaderboardLimit || 10
      });

      // Calculate standings dynamically
      const rankedStandings = await calculateJanmashtamiStandingsLocal(effectiveSeason);
      setStandings(rankedStandings);

      // Load audit adjustments
      const adjList = await getJanmashtamiAdjustmentsLocal(effectiveSeason.seasonId);
      setAdjustments(adjList);
    } catch (err) {
      console.error("Error loading Janmashtami season data:", err);
    } finally {
      setLoading(false);
    }

    // Background sync with API
    apiGetActiveJanmashtamiSeason().then(remote => {
      if (remote?.season && !targetSeasonId) {
        setActiveSeason(remote.season);
        if (remote.standings) setStandings(remote.standings);
      }
    }).catch(() => {});
  };

  useEffect(() => {
    loadSeasonData();
  }, []);

  const handleSelectSeason = (sId) => {
    loadSeasonData(sId);
  };

  // Handle Save Settings
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    if (!activeSeason) return;

    try {
      const isVerified = Boolean(settingsForm.isDateVerified && settingsForm.eventDate);
      const updatedSeason = {
        ...activeSeason,
        eventDate: isVerified ? settingsForm.eventDate : null,
        endDate: isVerified ? settingsForm.eventDate : null,
        isDateVerified: isVerified,
        status: isVerified ? 'active' : 'upcoming',
        calendarSourceUrl: settingsForm.calendarSourceUrl,
        verificationDate: isVerified ? (settingsForm.verificationDate || new Date().toISOString().split('T')[0]) : null,
        verifiedBy: isVerified ? 'ANIK' : null,
        pointsRules: {
          ...activeSeason.pointsRules,
          pointsPerPresentClass: Number(settingsForm.pointsPerPresentClass)
        },
        publicDisplayNamePolicy: settingsForm.publicDisplayNamePolicy,
        publicLeaderboardLimit: Number(settingsForm.publicLeaderboardLimit)
      };

      await saveJanmashtamiSeasonLocal(updatedSeason);
      setActiveSeason(updatedSeason);

      // Background API sync
      apiUpdateJanmashtamiSeason({
        seasonId: updatedSeason.seasonId,
        eventDate: updatedSeason.eventDate,
        isDateVerified: updatedSeason.isDateVerified,
        status: updatedSeason.status,
        calendarSourceUrl: updatedSeason.calendarSourceUrl,
        verificationDate: updatedSeason.verificationDate,
        pointsRules: updatedSeason.pointsRules,
        publicDisplayNamePolicy: updatedSeason.publicDisplayNamePolicy,
        publicLeaderboardLimit: updatedSeason.publicLeaderboardLimit
      }).catch(() => {});

      // Recalculate standings with new rules
      const recalculated = await calculateJanmashtamiStandingsLocal(updatedSeason);
      setStandings(recalculated);

      setSettingsSaveSuccess(true);
      setTimeout(() => setSettingsSaveSuccess(false), 3000);
    } catch (err) {
      alert("Failed to save season settings: " + err.message);
    }
  };

  // Open manual adjustment modal
  const handleOpenAdjModal = (student) => {
    setSelectedStudentForAdj(student);
    setAdjustmentPoints(10);
    setAdjustmentReason('');
    setAdjError('');
    setIsAdjModalOpen(true);
  };

  // Submit manual point adjustment with mandatory audit reason
  const handleSubmitAdjustment = async (e) => {
    e.preventDefault();
    if (!adjustmentReason || adjustmentReason.trim().length < 5) {
      setAdjError('A detailed audit explanation (at least 5 characters) is mandatory.');
      return;
    }

    try {
      setIsSubmittingAdj(true);
      await addJanmashtamiAdjustmentLocal({
        seasonId: activeSeason.seasonId,
        studentId: selectedStudentForAdj.studentId,
        studentName: selectedStudentForAdj.name,
        adjustmentPoints: Number(adjustmentPoints),
        reason: adjustmentReason.trim(),
        adminUser: 'ANIK',
        adminName: 'Anik (Administrator)'
      });

      // Background API sync
      apiAddJanmashtamiAdjustment({
        seasonId: activeSeason.seasonId,
        studentId: selectedStudentForAdj.studentId,
        adjustmentPoints: Number(adjustmentPoints),
        reason: adjustmentReason.trim()
      }).catch(() => {});

      // Refresh standings and audit list
      const updatedStandings = await calculateJanmashtamiStandingsLocal(activeSeason);
      setStandings(updatedStandings);
      const updatedAdj = await getJanmashtamiAdjustmentsLocal(activeSeason.seasonId);
      setAdjustments(updatedAdj);

      setIsAdjModalOpen(false);
    } catch (err) {
      setAdjError(err.message || 'Failed to submit point adjustment.');
    } finally {
      setIsSubmittingAdj(false);
    }
  };

  // Update prize distribution status
  const handleUpdatePrizeStatus = async (position, newStatus) => {
    try {
      const updatedSeason = await updateJanmashtamiPrizeLocal(activeSeason.seasonId, position, {
        distributionStatus: newStatus
      });
      setActiveSeason({ ...updatedSeason });

      apiUpdateJanmashtamiPrize({
        seasonId: activeSeason.seasonId,
        position,
        distributionStatus: newStatus
      }).catch(() => {});
    } catch (err) {
      alert("Error updating prize status: " + err.message);
    }
  };

  // Finalize season and perform annual rollover
  const handleConfirmFinalize = async () => {
    try {
      setIsFinalizing(true);
      const result = await finalizeJanmashtamiSeasonLocal(activeSeason.seasonId, 'ANIK');
      
      apiFinalizeJanmashtamiSeason(activeSeason.seasonId).catch(() => {});

      alert(result.message || `Season ${activeSeason.seasonId} has been successfully finalized! All standings are preserved permanently.`);
      setIsFinalizeModalOpen(false);
      loadSeasonData();
    } catch (err) {
      alert("Failed to finalize season: " + err.message);
    } finally {
      setIsFinalizing(false);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    exportJanmashtamiCSV(standings, activeSeason);
  };

  const filteredStandings = standings.filter(s => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.name?.toLowerCase().includes(q) ||
      s.studentId?.toLowerCase().includes(q) ||
      s.schoolName?.toLowerCase().includes(q)
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Top Banner & Season Selector */}
      <div 
        className="devotional-card"
        style={{
          background: 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)',
          color: '#FFF8DC',
          padding: '1.5rem 1.75rem',
          borderLeft: '5px solid #FFD700',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div 
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #FFD700 0%, #FF9933 100%)',
              color: '#1B4332',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(255, 215, 0, 0.35)'
            }}
          >
            <Trophy size={26} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                Krishna Janmashtami Seva Points Challenge
              </h1>
              <span 
                style={{
                  background: activeSeason?.status === 'active' ? '#D8F3DC' : '#FEF3C7',
                  color: activeSeason?.status === 'active' ? '#1B4332' : '#92400E',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  textTransform: 'uppercase'
                }}
              >
                {activeSeason?.status || 'Active'}
              </span>
            </div>
            <p style={{ color: '#E2E8F0', fontSize: '0.85rem', margin: '4px 0 0' }}>
              Official Attendance Points Engine &bull; Observance: <strong>{activeSeason?.isDateVerified && activeSeason?.eventDate ? formatDateDMY(activeSeason.eventDate) : 'Janmashtami 2027 — date awaiting official confirmation'}</strong>
            </p>
          </div>
        </div>

        {/* Action Controls & Season Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {allSeasons.length > 1 && (
            <select
              value={selectedSeasonId || ''}
              onChange={(e) => handleSelectSeason(e.target.value)}
              style={{
                background: 'rgba(255, 255, 255, 0.15)',
                border: '1px solid rgba(255, 215, 0, 0.4)',
                color: '#FFF8DC',
                padding: '0.45rem 0.85rem',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 600
              }}
            >
              {allSeasons.map(s => (
                <option key={s.seasonId} value={s.seasonId} style={{ background: '#1B4332', color: '#FFFFFF' }}>
                  Season {s.year} ({s.status})
                </option>
              ))}
            </select>
          )}

          <button
            onClick={handleExportCSV}
            className="btn-primary"
            style={{
              padding: '0.5rem 1rem',
              fontSize: '0.85rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <FileSpreadsheet size={16} />
            <span>Export CSV</span>
          </button>

          {activeSeason?.status === 'active' && (
            <button
              onClick={() => setIsFinalizeModalOpen(true)}
              style={{
                background: '#C0392B',
                color: '#FFFFFF',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Lock size={15} />
              <span>Finalize &amp; Rollover</span>
            </button>
          )}
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div 
        style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '2px solid #EADDC8',
          paddingBottom: '0.5rem',
          overflowX: 'auto'
        }}
      >
        {[
          { id: 'standings', label: 'Competition Standings', icon: Trophy, count: standings.length },
          { id: 'prizes', label: 'Prizes & Winners', icon: Award, count: activeSeason?.prizes?.length },
          { id: 'settings', label: 'Rules & Verified Dates', icon: Calendar },
          { id: 'audit', label: 'Audit Trail', icon: History, count: adjustments.length },
          { id: 'archive', label: 'Annual Archives', icon: RotateCcw, count: allSeasons.length }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              style={{
                background: isActive ? '#1B4332' : 'transparent',
                color: isActive ? '#FFD700' : '#4A5568',
                border: 'none',
                padding: '0.55rem 1rem',
                borderRadius: '8px',
                fontSize: '0.88rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s'
              }}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span 
                  style={{
                    background: isActive ? 'rgba(255, 215, 0, 0.25)' : '#E2E8F0',
                    color: isActive ? '#FFD700' : '#4A5568',
                    padding: '1px 6px',
                    borderRadius: '10px',
                    fontSize: '0.72rem'
                  }}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* SUB-TAB 1: STANDINGS & MANUAL ADJUSTMENTS */}
      {activeSubTab === 'standings' && (
        <div className="devotional-card" style={{ padding: '0', overflow: 'hidden' }}>
          
          {/* Controls Bar */}
          <div 
            style={{
              padding: '1rem 1.25rem',
              background: '#FAF6EE',
              borderBottom: '1px solid #EFE4CE',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Search size={18} style={{ color: '#718096' }} />
              <input
                type="text"
                placeholder="Search student name or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  border: '1px solid #CBD5E0',
                  borderRadius: '6px',
                  padding: '0.4rem 0.75rem',
                  fontSize: '0.88rem',
                  width: '260px'
                }}
              />
            </div>

            <div style={{ fontSize: '0.82rem', color: '#4A5568' }}>
              Default points: <strong>{activeSeason?.pointsRules?.pointsPerPresentClass || 10} pts</strong> per eligible attended class
            </div>
          </div>

          {/* Standings Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ background: '#F8F4EA', borderBottom: '2px solid #EADDC8', color: '#555' }}>
                  <th style={{ padding: '0.85rem 1rem', width: '60px', textAlign: 'center' }}>Rank</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Student ID &amp; Full Name</th>
                  <th style={{ padding: '0.85rem 1rem' }}>School / Class</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>Conducted Classes Attended</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Base Pts (Attendance)</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Manual Adjustment</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Total Points</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStandings && filteredStandings.length > 0 ? (
                  filteredStandings.map((st) => (
                    <tr 
                      key={st.studentId}
                      style={{
                        borderBottom: '1px solid #F0EBE0',
                        background: (st.totalPoints > 0 && st.rank <= 3) ? '#FFFDF8' : '#FFFFFF'
                      }}
                    >
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                        {st.totalPoints > 0 && st.rank ? (
                          st.rank === 1 ? (
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
                            <span style={{ color: '#718096', fontWeight: 600 }}>#{st.rank}</span>
                          )
                        ) : (
                          <span style={{ color: '#A0AEC0', fontWeight: 500 }} title="Unranked — No points earned yet">—</span>
                        )}
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ fontWeight: 700, color: '#1B4332' }}>{st.name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#718096' }}>ID: {st.studentId}</div>
                        {st.totalPoints > 0 && st.prizeTitle && (
                          <span style={{ background: '#FEF3C7', color: '#92400E', fontSize: '0.7rem', padding: '1px 6px', borderRadius: '6px', marginTop: '2px', display: 'inline-block' }}>
                            {st.prizeTitle}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', color: '#4A5568' }}>
                        <div>{st.schoolName || '—'}</div>
                        <div style={{ fontSize: '0.75rem', color: '#718096' }}>{st.className || ''}</div>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                        <span style={{ background: '#EDF2F7', padding: '3px 8px', borderRadius: '12px', fontWeight: 600, color: '#2D3748' }}>
                          {st.classesAttended} classes
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right', color: '#4A5568' }}>
                        {st.basePoints} pts
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                        {st.adjustmentPoints !== 0 ? (
                          <span style={{ color: st.adjustmentPoints > 0 ? '#2E7D32' : '#C0392B', fontWeight: 700 }}>
                            {st.adjustmentPoints > 0 ? `+${st.adjustmentPoints}` : st.adjustmentPoints} pts
                          </span>
                        ) : (
                          <span style={{ color: '#A0AEC0' }}>0</span>
                        )}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 800, color: '#1B4332', fontSize: '1rem' }}>
                        {st.totalPoints} pts
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                        {activeSeason?.status === 'active' && (
                          <button
                            onClick={() => handleOpenAdjModal(st)}
                            style={{
                              background: '#FFF8E7',
                              border: '1px solid #FFD700',
                              color: '#8B4513',
                              padding: '0.35rem 0.75rem',
                              borderRadius: '6px',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <Edit3 size={13} />
                            <span>Adjust Pts</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: '#718096' }}>
                      No students or attendance records found matching your query.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: PRIZES & WINNERS */}
      {activeSubTab === 'prizes' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div 
            style={{
              background: '#FFFFFF',
              borderRadius: '12px',
              padding: '1.25rem 1.5rem',
              border: '1px solid #EADDC8',
              boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
            }}
          >
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1B4332', margin: '0 0 4px' }}>
              Sri Krishna Janmashtami Award Allocations
            </h2>
            <p style={{ color: '#666', fontSize: '0.85rem', margin: 0 }}>
              Prizes awarded to top-ranking students based on confirmed competition points. Update prize readiness and distribution logs below.
            </p>
          </div>

          <div 
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '1.25rem'
            }}
          >
            {(activeSeason?.prizes || []).map(prize => {
              const matchedWinner = standings.find(s => s.rank === prize.position && s.totalPoints > 0);
              return (
                <div 
                  key={prize.position}
                  className="devotional-card"
                  style={{
                    background: '#FFFFFF',
                    borderTop: prize.position === 1 ? '4px solid #FFD700' : prize.position === 2 ? '4px solid #CBD5E0' : '4px solid #FBD38D',
                    padding: '1.5rem',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.06)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div 
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          background: prize.position === 1 ? '#FFD700' : prize.position === 2 ? '#E2E8F0' : '#FBD38D',
                          color: '#1B4332',
                          fontWeight: 800,
                          fontSize: '1.1rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        {prize.position}
                      </div>
                      <div>
                        <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#1B4332', margin: 0 }}>
                          {prize.title}
                        </h3>
                        <span style={{ fontSize: '0.75rem', color: '#718096' }}>Position #{prize.position}</span>
                      </div>
                    </div>

                    <span 
                      style={{
                        background: prize.distributionStatus === 'Distributed' ? '#D8F3DC' : prize.distributionStatus === 'Prepared' ? '#FEF3C7' : '#EDF2F7',
                        color: prize.distributionStatus === 'Distributed' ? '#1B4332' : prize.distributionStatus === 'Prepared' ? '#92400E' : '#4A5568',
                        padding: '3px 8px',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: 700
                      }}
                    >
                      {prize.distributionStatus || 'Pending'}
                    </span>
                  </div>

                  <p style={{ color: '#4A5568', fontSize: '0.85rem', lineHeight: 1.5, margin: '0 0 1rem' }}>
                    {prize.description}
                  </p>

                  <div 
                    style={{
                      background: '#FAF6EE',
                      padding: '0.75rem 1rem',
                      borderRadius: '8px',
                      marginBottom: '1rem',
                      fontSize: '0.85rem'
                    }}
                  >
                    <span style={{ color: '#718096', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700 }}>
                      CURRENT LEADING CANDIDATE
                    </span>
                    <div style={{ fontWeight: 800, color: '#1B4332', marginTop: '2px' }}>
                      {matchedWinner && matchedWinner.totalPoints > 0 ? `${matchedWinner.name} (${matchedWinner.totalPoints} pts)` : 'Awaiting attendance records'}
                    </div>
                  </div>

                  {/* Distribution Status Controls */}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {['Pending', 'Prepared', 'Distributed'].map(statusOpt => (
                      <button
                        key={statusOpt}
                        onClick={() => handleUpdatePrizeStatus(prize.position, statusOpt)}
                        style={{
                          background: prize.distributionStatus === statusOpt ? '#1B4332' : '#FFFFFF',
                          color: prize.distributionStatus === statusOpt ? '#FFD700' : '#4A5568',
                          border: '1px solid #CBD5E0',
                          padding: '0.35rem 0.75rem',
                          borderRadius: '6px',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        {statusOpt}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: SETTINGS & VERIFIED CALENDAR DATES */}
      {activeSubTab === 'settings' && (
        <form onSubmit={handleSaveSettings} className="devotional-card" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1B4332', margin: 0 }}>
                Season Configuration &amp; ISKCON Calendar Verification
              </h2>
              <p style={{ color: '#666', fontSize: '0.85rem', margin: '2px 0 0' }}>
                Store official festival dates and competition points rules. Never start countdowns on unverified dates.
              </p>
            </div>

            {settingsSaveSuccess && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#2E7D32', fontWeight: 700, fontSize: '0.85rem' }}>
                <CheckCircle2 size={16} />
                <span>Configuration saved successfully!</span>
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
            
            {/* Event Date */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#2D3748', marginBottom: '6px' }}>
                Official Janmashtami Observance Date (YYYY-MM-DD) {settingsForm.isDateVerified ? '(Required)' : '(Awaiting confirmation)'}
              </label>
              <input 
                type="date"
                value={settingsForm.eventDate || ''}
                onChange={(e) => setSettingsForm({ ...settingsForm, eventDate: e.target.value })}
                required={settingsForm.isDateVerified}
                style={{ width: '100%', padding: '0.65rem', borderRadius: '6px', border: '1px solid #CBD5E0', fontSize: '0.9rem' }}
              />
              <span style={{ fontSize: '0.75rem', color: '#718096' }}>
                {settingsForm.eventDate ? `Observance: ${formatDateDMY(settingsForm.eventDate)}` : 'Janmashtami 2027 — date awaiting official confirmation'}
              </span>
            </div>

            {/* Is Date Verified */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#2D3748', marginBottom: '6px' }}>
                Calendar Verification Status
              </label>
              <select
                value={settingsForm.isDateVerified ? 'true' : 'false'}
                onChange={(e) => setSettingsForm({ ...settingsForm, isDateVerified: e.target.value === 'true' })}
                style={{ width: '100%', padding: '0.65rem', borderRadius: '6px', border: '1px solid #CBD5E0', fontSize: '0.9rem' }}
              >
                <option value="true">Verified by Official ISKCON Calendar</option>
                <option value="false">Awaiting Official Confirmation (Pause Countdown)</option>
              </select>
            </div>

            {/* Calendar Source URL */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#2D3748', marginBottom: '6px' }}>
                Official Calendar Source URL
              </label>
              <input 
                type="url"
                value={settingsForm.calendarSourceUrl}
                onChange={(e) => setSettingsForm({ ...settingsForm, calendarSourceUrl: e.target.value })}
                required
                style={{ width: '100%', padding: '0.65rem', borderRadius: '6px', border: '1px solid #CBD5E0', fontSize: '0.9rem' }}
              />
            </div>

            {/* Date Verified On */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#2D3748', marginBottom: '6px' }}>
                Date Verified On (Audit Record)
              </label>
              <input 
                type="date"
                value={settingsForm.verificationDate}
                onChange={(e) => setSettingsForm({ ...settingsForm, verificationDate: e.target.value })}
                style={{ width: '100%', padding: '0.65rem', borderRadius: '6px', border: '1px solid #CBD5E0', fontSize: '0.9rem' }}
              />
            </div>

            {/* Points per class */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#2D3748', marginBottom: '6px' }}>
                Points per Present Class Session
              </label>
              <input 
                type="number"
                min="1"
                max="100"
                value={settingsForm.pointsPerPresentClass}
                onChange={(e) => setSettingsForm({ ...settingsForm, pointsPerPresentClass: e.target.value })}
                style={{ width: '100%', padding: '0.65rem', borderRadius: '6px', border: '1px solid #CBD5E0', fontSize: '0.9rem' }}
              />
              <span style={{ fontSize: '0.75rem', color: '#718096' }}>Default is 10 points per attended conducted class.</span>
            </div>

            {/* Display name policy */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#2D3748', marginBottom: '6px' }}>
                Public Leaderboard Privacy Policy
              </label>
              <select
                value={settingsForm.publicDisplayNamePolicy}
                onChange={(e) => setSettingsForm({ ...settingsForm, publicDisplayNamePolicy: e.target.value })}
                style={{ width: '100%', padding: '0.65rem', borderRadius: '6px', border: '1px solid #CBD5E0', fontSize: '0.9rem' }}
              >
                <option value="initial_masked">Initial Masked (e.g. "Arjun S.") — Recommended</option>
                <option value="first_name_only">First Name Only (e.g. "Arjun")</option>
                <option value="full_name">Full Name</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="submit"
              className="btn-primary"
              style={{ padding: '0.65rem 1.5rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Save size={16} />
              <span>Save Season Settings</span>
            </button>
          </div>
        </form>
      )}

      {/* SUB-TAB 4: AUDIT TRAIL */}
      {activeSubTab === 'audit' && (
        <div className="devotional-card" style={{ padding: '0', overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem 1.5rem', background: '#FAF6EE', borderBottom: '1px solid #EFE4CE' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1B4332', margin: 0 }}>
              Audit History: Manual Point Adjustments
            </h2>
            <p style={{ color: '#666', fontSize: '0.82rem', margin: '2px 0 0' }}>
              All manual additions or deductions require a mandatory recorded reason and administrator identity.
            </p>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ background: '#F8F4EA', borderBottom: '2px solid #EADDC8', color: '#555' }}>
                  <th style={{ padding: '0.85rem 1.25rem' }}>Timestamp</th>
                  <th style={{ padding: '0.85rem 1.25rem' }}>Student Name &amp; ID</th>
                  <th style={{ padding: '0.85rem 1.25rem' }}>Adjustment</th>
                  <th style={{ padding: '0.85rem 1.25rem' }}>Mandatory Audit Reason</th>
                  <th style={{ padding: '0.85rem 1.25rem' }}>Responsible Admin</th>
                </tr>
              </thead>
              <tbody>
                {adjustments && adjustments.length > 0 ? (
                  adjustments.map((adj) => (
                    <tr key={adj.id} style={{ borderBottom: '1px solid #F0EBE0' }}>
                      <td style={{ padding: '0.85rem 1.25rem', whiteSpace: 'nowrap', color: '#718096' }}>
                        {new Date(adj.createdAt).toLocaleString('en-IN')}
                      </td>
                      <td style={{ padding: '0.85rem 1.25rem' }}>
                        <div style={{ fontWeight: 700, color: '#1B4332' }}>{adj.studentName}</div>
                        <div style={{ fontSize: '0.75rem', color: '#718096' }}>ID: {adj.studentId}</div>
                      </td>
                      <td style={{ padding: '0.85rem 1.25rem', fontWeight: 700, color: adj.adjustmentPoints > 0 ? '#2E7D32' : '#C0392B' }}>
                        {adj.adjustmentPoints > 0 ? `+${adj.adjustmentPoints}` : adj.adjustmentPoints} pts
                      </td>
                      <td style={{ padding: '0.85rem 1.25rem', color: '#2D3748' }}>
                        {adj.reason}
                      </td>
                      <td style={{ padding: '0.85rem 1.25rem', color: '#718096' }}>
                        {adj.adjustedByName || adj.adjustedBy}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} style={{ padding: '2.5rem', textAlign: 'center', color: '#888' }}>
                      No manual point adjustments recorded for this season.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 5: ARCHIVES */}
      {activeSubTab === 'archive' && (
        <div className="devotional-card" style={{ padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1B4332', margin: '0 0 6px' }}>
            Annual Season Archives &amp; Historical Winners
          </h2>
          <p style={{ color: '#666', fontSize: '0.85rem', margin: '0 0 1.25rem' }}>
            Historical competition standings, point ledgers, and winner records are permanently preserved.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {allSeasons.map(s => (
              <div 
                key={s.seasonId}
                style={{
                  background: '#FAF6EE',
                  border: '1px solid #EADDC8',
                  borderRadius: '10px',
                  padding: '1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '1rem'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1B4332', margin: 0 }}>
                      Season {s.year} &bull; {s.title}
                    </h3>
                    <span style={{ background: s.status === 'finalized' ? '#D8F3DC' : '#FEF3C7', color: s.status === 'finalized' ? '#1B4332' : '#92400E', padding: '2px 8px', borderRadius: '10px', fontSize: '0.72rem', fontWeight: 800 }}>
                      {s.status}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#666', marginTop: '4px' }}>
                    Event Date: <strong>{formatDateDMY(s.eventDate)}</strong> &bull; Season ID: <code>{s.seasonId}</code>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => handleSelectSeason(s.seasonId)}
                    className="btn-ghost"
                    style={{ padding: '0.4rem 0.85rem', fontSize: '0.82rem' }}
                  >
                    View Details &amp; Standings
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL 1: MANUAL ADJUSTMENT */}
      {isAdjModalOpen && selectedStudentForAdj && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
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
              boxShadow: '0 12px 30px rgba(0,0,0,0.25)'
            }}
          >
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1B4332', margin: '0 0 6px' }}>
              Adjust Points: {selectedStudentForAdj.name}
            </h3>
            <p style={{ fontSize: '0.82rem', color: '#666', margin: '0 0 1.25rem' }}>
              Current Base Points: <strong>{selectedStudentForAdj.basePoints} pts</strong> ({selectedStudentForAdj.classesAttended} classes attended).
            </p>

            {adjError && (
              <div style={{ background: '#FEE2E2', color: '#991B1B', padding: '0.65rem', borderRadius: '6px', fontSize: '0.82rem', marginBottom: '1rem' }}>
                {adjError}
              </div>
            )}

            <form onSubmit={handleSubmitAdjustment} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#2D3748', marginBottom: '4px' }}>
                  Points to Add or Deduct (can be negative)
                </label>
                <input 
                  type="number"
                  value={adjustmentPoints}
                  onChange={(e) => setAdjustmentPoints(e.target.value)}
                  required
                  style={{ width: '100%', padding: '0.65rem', borderRadius: '6px', border: '1px solid #CBD5E0' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#2D3748', marginBottom: '4px' }}>
                  Mandatory Audit Reason (min 5 characters) *
                </label>
                <textarea 
                  rows={3}
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  placeholder="e.g. Special award for memorizing BG Chapter 12 verses in class"
                  required
                  style={{ width: '100%', padding: '0.65rem', borderRadius: '6px', border: '1px solid #CBD5E0', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setIsAdjModalOpen(false)}
                  className="btn-ghost"
                  style={{ padding: '0.55rem 1rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAdj}
                  className="btn-primary"
                  style={{ padding: '0.55rem 1.25rem' }}
                >
                  {isSubmittingAdj ? 'Saving...' : 'Save Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: FINALIZE SEASON CONFIRMATION */}
      {isFinalizeModalOpen && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1rem'
          }}
        >
          <div 
            style={{
              background: '#FFFFFF',
              borderRadius: '14px',
              maxWidth: '520px',
              width: '100%',
              padding: '1.75rem',
              boxShadow: '0 12px 30px rgba(0,0,0,0.25)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#C0392B', marginBottom: '10px' }}>
              <Lock size={26} />
              <h3 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0 }}>
                Finalize &amp; Seal Season {activeSeason?.seasonId}
              </h3>
            </div>

            <p style={{ color: '#4A5568', fontSize: '0.9rem', lineHeight: 1.6, margin: '0 0 1rem' }}>
              Finalizing will:
              <br />
              1. <strong>Lock the current standings</strong> permanently as the official winner snapshot.
              <br />
              2. <strong>Archive this season</strong> as read-only.
              <br />
              3. <strong>Initialize Season {activeSeason?.year + 1}</strong> with active points starting cleanly at <strong>zero</strong>.
              <br />
              4. <strong>Never delete</strong> previous attendance or winner history.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setIsFinalizeModalOpen(false)}
                className="btn-ghost"
                style={{ padding: '0.55rem 1rem' }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmFinalize}
                disabled={isFinalizing}
                style={{
                  background: '#C0392B',
                  color: '#FFFFFF',
                  border: 'none',
                  padding: '0.55rem 1.25rem',
                  borderRadius: '8px',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                {isFinalizing ? 'Finalizing...' : 'Yes, Finalize Season'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
