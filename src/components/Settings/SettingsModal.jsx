import React, { useState, useEffect } from 'react';
import { idbGetAll } from '../../db/indexedDbService';
import { resetToSeed, getAllStudents, getAllSessions } from '../../db/db';
import { 
  apiGetSystemStatus, 
  apiTestCustomBackend, 
  getCustomApiBaseUrl, 
  setCustomApiBaseUrl, 
  getApiBaseUrl 
} from '../../api/apiClient';
import { 
  X, 
  Settings, 
  Database, 
  Server, 
  Download, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle,
  Layers,
  Cloud,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  Globe
} from 'lucide-react';

export const SettingsModal = ({ isOpen, onClose, onDatabaseReset }) => {
  const [feedback, setFeedback] = useState({ message: '', type: '' });
  const [resetting, setResetting] = useState(false);
  const [dbStatus, setDbStatus] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(false);

  // Backend URL settings
  const [backendUrlInput, setBackendUrlInput] = useState('');
  const [testingBackend, setTestingBackend] = useState(false);
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setBackendUrlInput(getCustomApiBaseUrl());
      checkAtlasStatus();
    }
  }, [isOpen]);

  const checkAtlasStatus = async () => {
    setLoadingStatus(true);
    try {
      const status = await apiGetSystemStatus();
      setDbStatus(status);
    } catch (e) {
      setDbStatus({
        success: false,
        error: e.message || 'Cloud backend unreachable',
        database: { connected: false, readyState: 0 }
      });
    } finally {
      setLoadingStatus(false);
    }
  };

  const handleTestBackend = async () => {
    setTestingBackend(true);
    setTestResult(null);
    try {
      const urlToTest = backendUrlInput.trim() || getApiBaseUrl();
      const res = await apiTestCustomBackend(urlToTest);
      setTestResult({
        success: true,
        message: `Successfully connected to backend! MongoDB Atlas readyState: ${res.database?.readyState === 1 ? '1 (Connected)' : res.database?.readyState}`
      });
    } catch (err) {
      setTestResult({
        success: false,
        message: `Connection failed: ${err.message}`
      });
    } finally {
      setTestingBackend(false);
    }
  };

  const handleSaveBackendUrl = () => {
    setCustomApiBaseUrl(backendUrlInput.trim());
    setFeedback({
      type: 'success',
      message: backendUrlInput.trim() 
        ? `Cloud backend URL saved: ${backendUrlInput.trim()}. All devices will connect here.` 
        : 'Cloud backend URL reset to default configuration.'
    });
    setTimeout(() => {
      checkAtlasStatus();
    }, 500);
  };

  if (!isOpen) return null;

  const handleExportFullBackup = async () => {
    try {
      const [students, sessions] = await Promise.all([
        getAllStudents(false).catch(() => []),
        getAllSessions().catch(() => [])
      ]);
      const attendance = await idbGetAll('attendance').catch(() => []);
      const adminActivity = await idbGetAll('adminActivity').catch(() => []);
      const janmashtamiSeasons = await idbGetAll('janmashtamiSeasons').catch(() => []);

      const backupData = {
        application: "Krishna Kripa — Bhagavad Gita Attendance Management",
        primaryDatabase: "MongoDB Atlas (cluster0.rnjbssz.mongodb.net)",
        databaseName: "krishna_kripa",
        exportTimestamp: new Date().toISOString(),
        collections: {
          students,
          sessions,
          attendance,
          adminActivity,
          janmashtamiSeasons
        }
      };

      const jsonStr = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `krishna_kripa_atlas_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(`Export error: ${e.message}`);
    }
  };

  const handleResetData = async () => {
    if (!window.confirm("Restore dataset to initial authentic seed records in MongoDB Atlas?")) {
      return;
    }
    setResetting(true);
    try {
      await resetToSeed();
      setFeedback({ message: 'Dataset restored to initial authentic seed records.', type: 'success' });
      if (onDatabaseReset) onDatabaseReset();
    } catch (err) {
      setFeedback({ message: `Reset failed: ${err.message}`, type: 'error' });
    } finally {
      setResetting(false);
    }
  };

  const isConnected = dbStatus?.database?.connected || dbStatus?.database?.readyState === 1;

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 140,
        padding: '1rem',
        backdropFilter: 'blur(5px)'
      }}
      onClick={onClose}
    >
      <div 
        className="devotional-card animate-fade-in"
        style={{
          width: '100%',
          maxWidth: '720px',
          maxHeight: '92vh',
          overflowY: 'auto',
          background: '#FFFDF9',
          border: '2px solid #FFD700',
          borderRadius: '16px',
          boxShadow: '0 25px 50px rgba(0,0,0,0.5)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div 
          style={{
            background: 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 60%, #8B4513 100%)',
            padding: '1.25rem 1.75rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '2px solid #FFD700',
            color: '#FFF'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: 'rgba(255, 215, 0, 0.2)', padding: '8px', borderRadius: '8px', border: '1px solid #FFD700' }}>
              <Database size={20} color="#FFD700" />
            </div>
            <div>
              <h3 className="heading-gold" style={{ fontSize: '1.3rem', fontWeight: 800 }}>
                MongoDB Atlas &amp; Cloud Synchronization
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#FFF8DC', opacity: 0.9 }}>
                Single Source of Truth Across Mobile, Desktop &amp; Tablets
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#FFF8DC', cursor: 'pointer', padding: '4px' }}
          >
            <X size={22} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '1.75rem' }}>
          
          {feedback.message && (
            <div 
              style={{
                background: feedback.type === 'success' ? '#D8F3DC' : '#FFEBEE',
                border: `1px solid ${feedback.type === 'success' ? '#52B788' : '#EF9A9A'}`,
                color: feedback.type === 'success' ? '#1B4332' : '#C62828',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                fontSize: '0.88rem',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              <span>{feedback.message}</span>
            </div>
          )}

          {/* Active MongoDB Atlas Database Status */}
          <div 
            style={{
              background: '#FAF6EE',
              border: `1.5px solid ${isConnected ? '#52B788' : '#E63946'}`,
              borderRadius: '12px',
              padding: '1.25rem',
              marginBottom: '1.5rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: '#1B4332', fontSize: '1.05rem' }}>
                <Database size={20} color={isConnected ? '#2D6A4F' : '#E63946'} />
                <span>MongoDB Atlas Database Status</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={checkAtlasStatus}
                  disabled={loadingStatus}
                  className="btn-ghost"
                  style={{ padding: '4px 8px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <RefreshCw size={14} className={loadingStatus ? 'spin' : ''} />
                  <span>Check</span>
                </button>
                <span 
                  style={{
                    background: isConnected ? '#D8F3DC' : '#FFEBEE',
                    color: isConnected ? '#1B4332' : '#C62828',
                    padding: '3px 12px',
                    borderRadius: '12px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                >
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: isConnected ? '#2D6A4F' : '#C62828' }} />
                  {isConnected ? 'Online & Connected' : 'Connection Offline'}
                </span>
              </div>
            </div>

            <div style={{ fontSize: '0.85rem', color: '#444', marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div><strong>Primary Database:</strong> <code style={{ background: '#FFF', padding: '2px 6px', borderRadius: '4px' }}>MongoDB Atlas Cluster (v8.0)</code></div>
              <div><strong>Cluster Endpoint:</strong> <code style={{ background: '#FFF', padding: '2px 6px', borderRadius: '4px' }}>cluster0.rnjbssz.mongodb.net</code></div>
              <div><strong>Database Name:</strong> <code style={{ background: '#FFF', padding: '2px 6px', borderRadius: '4px' }}>krishna_kripa</code></div>
              <div><strong>Active API Base:</strong> <code style={{ background: '#FFF', padding: '2px 6px', borderRadius: '4px' }}>{getApiBaseUrl()}</code></div>
              <div style={{ color: isConnected ? '#2D6A4F' : '#C62828', marginTop: '6px', fontWeight: 600 }}>
                {isConnected 
                  ? '✓ MongoDB Atlas is the authoritative single source of truth across all devices. Student registrations, attendance, appearance settings, and Janmashtami scores sync through this database.' 
                  : '⚠ Cannot reach MongoDB Atlas through backend. Ensure the backend server is running and connected.'}
              </div>
            </div>
          </div>

          {/* Cloud Backend URL Configuration */}
          <div 
            style={{
              background: '#FFF',
              border: '1.5px solid #FFD700',
              borderRadius: '12px',
              padding: '1.25rem',
              marginBottom: '1.5rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: '#1B4332', marginBottom: '8px', fontSize: '1rem' }}>
              <Globe size={18} color="#FF9933" />
              <span>Cloud Backend API Connection (Render / Custom Server)</span>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#666', marginBottom: '10px' }}>
              When accessing Krishna Kripa from your mobile phone or outside localhost, ensure the frontend calls your deployed backend URL:
            </p>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <input
                type="text"
                value={backendUrlInput}
                onChange={(e) => setBackendUrlInput(e.target.value)}
                placeholder="https://krishna-attendance-backend.onrender.com (or leave empty for default)"
                style={{
                  flex: '1 1 280px',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #CCC',
                  fontSize: '0.88rem'
                }}
              />
              <button
                type="button"
                onClick={handleTestBackend}
                disabled={testingBackend}
                className="btn-outline-gold"
                style={{ fontSize: '0.82rem', padding: '6px 12px' }}
              >
                {testingBackend ? 'Testing...' : 'Test Connection'}
              </button>
              <button
                type="button"
                onClick={handleSaveBackendUrl}
                className="btn-primary-gold"
                style={{ fontSize: '0.82rem', padding: '6px 14px' }}
              >
                Save Backend URL
              </button>
            </div>

            {testResult && (
              <div 
                style={{ 
                  marginTop: '10px', 
                  fontSize: '0.82rem', 
                  padding: '6px 10px', 
                  borderRadius: '6px',
                  background: testResult.success ? '#D8F3DC' : '#FFEBEE',
                  color: testResult.success ? '#1B4332' : '#C62828'
                }}
              >
                {testResult.message}
              </div>
            )}
          </div>

          {/* Synchronized MongoDB Atlas Collections */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: '#1B4332', marginBottom: '0.75rem', fontSize: '0.98rem' }}>
              <Layers size={18} color="#FF9933" />
              <span>MongoDB Atlas Collections (Synchronized Across All Devices)</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
              <div style={{ background: '#FFF', border: '1px solid #EFE4CE', borderRadius: '8px', padding: '0.75rem' }}>
                <div style={{ fontWeight: 700, color: '#1B4332', fontSize: '0.88rem' }}>students</div>
                <div style={{ fontSize: '0.72rem', color: '#666', marginTop: '2px' }}>
                  Student profiles with non-reusable IDs (BGK-2026-XXXX).
                </div>
              </div>

              <div style={{ background: '#FFF', border: '1px solid #EFE4CE', borderRadius: '8px', padding: '0.75rem' }}>
                <div style={{ fontWeight: 700, color: '#1B4332', fontSize: '0.88rem' }}>sessions</div>
                <div style={{ fontSize: '0.72rem', color: '#666', marginTop: '2px' }}>
                  Weekly sessions, topics, conductor names, and class turnouts.
                </div>
              </div>

              <div style={{ background: '#FFF', border: '1px solid #EFE4CE', borderRadius: '8px', padding: '0.75rem' }}>
                <div style={{ fontWeight: 700, color: '#1B4332', fontSize: '0.88rem' }}>attendances</div>
                <div style={{ fontSize: '0.72rem', color: '#666', marginTop: '2px' }}>
                  Authentic present/absent marks linked to sessionId &amp; studentId.
                </div>
              </div>

              <div style={{ background: '#FFF', border: '1px solid #EFE4CE', borderRadius: '8px', padding: '0.75rem' }}>
                <div style={{ fontWeight: 700, color: '#1B4332', fontSize: '0.88rem' }}>weeklyplans</div>
                <div style={{ fontSize: '0.72rem', color: '#666', marginTop: '2px' }}>
                  Saturday/Sunday class confirmations and announcements.
                </div>
              </div>

              <div style={{ background: '#FFF', border: '1px solid #EFE4CE', borderRadius: '8px', padding: '0.75rem' }}>
                <div style={{ fontWeight: 700, color: '#1B4332', fontSize: '0.88rem' }}>websiteconfigs</div>
                <div style={{ fontSize: '0.72rem', color: '#666', marginTop: '2px' }}>
                  Draft &amp; published appearance, themes, colors, and logos.
                </div>
              </div>

              <div style={{ background: '#FFF', border: '1px solid #EFE4CE', borderRadius: '8px', padding: '0.75rem' }}>
                <div style={{ fontWeight: 700, color: '#1B4332', fontSize: '0.88rem' }}>janmashtamiseasons</div>
                <div style={{ fontSize: '0.72rem', color: '#666', marginTop: '2px' }}>
                  Janmashtami competition rules, prizes, and leaderboards.
                </div>
              </div>

              <div style={{ background: '#FFF', border: '1px solid #EFE4CE', borderRadius: '8px', padding: '0.75rem' }}>
                <div style={{ fontWeight: 700, color: '#1B4332', fontSize: '0.88rem' }}>studentaiquotas</div>
                <div style={{ fontSize: '0.72rem', color: '#666', marginTop: '2px' }}>
                  Persistent 5-question daily AI limits across all devices.
                </div>
              </div>

              <div style={{ background: '#FFF', border: '1px solid #EFE4CE', borderRadius: '8px', padding: '0.75rem' }}>
                <div style={{ fontWeight: 700, color: '#1B4332', fontSize: '0.88rem' }}>adminactivities</div>
                <div style={{ fontSize: '0.72rem', color: '#666', marginTop: '2px' }}>
                  Immutable audit logs for registrations, attendance, and edits.
                </div>
              </div>
            </div>
          </div>

          {/* Backup & Actions */}
          <div 
            style={{
              borderTop: '1px solid #EFE4CE',
              paddingTop: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px'
            }}
          >
            <div>
              <div style={{ fontWeight: 700, color: '#303030', fontSize: '0.92rem' }}>
                Database Backup &amp; Recovery
              </div>
              <div style={{ fontSize: '0.78rem', color: '#666' }}>
                Download complete JSON export of all collections or restore seed records
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={handleExportFullBackup}
                className="btn-outline-gold"
                style={{ fontSize: '0.85rem' }}
                title="Download JSON export"
              >
                <Download size={15} />
                <span>Export JSON Backup</span>
              </button>

              <button
                type="button"
                onClick={handleResetData}
                disabled={resetting}
                className="btn-ghost"
                style={{ fontSize: '0.85rem', color: '#8B4513' }}
                title="Restore default Bhagavad Gita class seed records"
              >
                <RotateCcw size={15} />
                <span>{resetting ? 'Resetting...' : 'Restore Seed'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
