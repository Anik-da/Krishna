import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage } from './components/Auth/LoginPage';
import { Navbar } from './components/Layout/Navbar';
import { Sidebar } from './components/Layout/Sidebar';
import { DashboardView } from './components/Dashboard/DashboardView';
import { StudentManagement } from './components/Students/StudentManagement';
import { StudentModal } from './components/Students/StudentModal';
import { StudentProfileModal } from './components/Students/StudentProfileModal';
import { TakeAttendance } from './components/Attendance/TakeAttendance';
import { SessionHistory } from './components/Attendance/SessionHistory';
import { SessionCalendar } from './components/Calendar/SessionCalendar';
import { ReportsView } from './components/Reports/ReportsView';
import { SettingsModal } from './components/Settings/SettingsModal';
import { BhagavadGitaChat } from './components/AI/BhagavadGitaChat';
import { AttendanceInsights } from './components/AI/AttendanceInsights';
import { LandingPage } from './components/Landing/LandingPage';
import { StudentLoginPage } from './components/Auth/StudentLoginPage';
import { StudentDashboard } from './components/Student/StudentDashboard';
import { AppearanceEditor } from './components/Appearance/AppearanceEditor';
import { WeeklyPlanner } from './components/Planning/WeeklyPlanner';
import { JanmashtamiAdmin } from './components/Competition/JanmashtamiAdmin';
import { AdminIdCardManager } from './components/IdCard/AdminIdCardManager';
import { CardVerificationPage } from './components/IdCard/CardVerificationPage';
import { AdminManagementModal } from './components/Admin/AdminManagementModal';
import { apiGetCurrentPlan, apiGetPublishedConfig } from './api/apiClient';
import { updateGlobalFavicon } from './assets/crest';
import { subscribeToDoc } from './db/firebaseService';
import { 
  getAllStudents, 
  getAllSessions, 
  getDashboardMetrics, 
  createStudent, 
  updateStudent, 
  archiveStudent, 
  deleteStudent,
  getCurrentWeeklyPlanLocal,
  applyDeadlineAutoClosure,
  getPublishedAppearanceConfig,
  applyGlobalTheme 
} from './db/db';

const MainPortal = () => {
  const { isAuthenticated, loading: authLoading } = useAuth();

  // Navigation tab state: 'dashboard' | 'take-attendance' | 'students' | 'calendar' | 'sessions' | 'reports'
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Public vs Login state for unauthenticated visitors
  const [showLoginView, setShowLoginView] = useState(false);
  const [showStudentLogin, setShowStudentLogin] = useState(false);
  const [studentUser, setStudentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('krishna_student_user');
      const token = localStorage.getItem('krishna_student_token');
      return (saved && token) ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // URL Verification Token detector for Scanned QR Codes
  const [verifyToken, setVerifyToken] = useState(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.get('verifyCard') || urlParams.get('token') || null;
    } catch {
      return null;
    }
  });

  // Data states
  const [students, setStudents] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [metrics, setMetrics] = useState({
    totalStudents: 0,
    totalConductedSessions: 0,
    totalSessions: 0,
    latestSession: null,
    latestPresent: 0,
    latestAbsent: 0,
    overallPercentage: 0,
    recentlyAdded: [],
    recentActivities: []
  });
  const [weeklyPlan, setWeeklyPlan] = useState(null);
  const [dataLoading, setDataLoading] = useState(false);

  // Modal states
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  
  const [selectedProfileStudentId, setSelectedProfileStudentId] = useState(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAdminSecurityOpen, setIsAdminSecurityOpen] = useState(false);

  // Take Attendance target date
  const [attendanceDate, setAttendanceDate] = useState('');

  // Refresh all application data from database
  const refreshData = useCallback(async () => {
    try {
      const [studentsData, sessionsData, metricsData] = await Promise.all([
        getAllStudents(true),
        getAllSessions(),
        getDashboardMetrics()
      ]);
      setStudents(studentsData || []);
      setSessions(sessionsData || []);
      if (metricsData) setMetrics(metricsData);

      // Load weekly plan immediately from durable local cache & sync
      getCurrentWeeklyPlanLocal().then(planData => {
        if (planData) setWeeklyPlan(applyDeadlineAutoClosure(planData));
      }).catch(() => {});

      // Background check for weekly plan from remote API
      apiGetCurrentPlan().then(planData => {
        if (planData) setWeeklyPlan(applyDeadlineAutoClosure(planData));
      }).catch(() => {});
    } catch (err) {
      console.error("Error refreshing data:", err);
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    // 1. Synchronize published logo, favicon, and global visual theme on app mount (<1ms)
    getPublishedAppearanceConfig().then(cfg => {
      if (cfg?.styling) {
        applyGlobalTheme(cfg.styling);
      }
      const logo = (cfg?.branding?.useCustomLogo !== false && cfg?.branding?.logoUrl) ? cfg.branding.logoUrl : '';
      if (logo) {
        localStorage.setItem('krishna_published_logo', logo);
        updateGlobalFavicon(logo);
      }
      window.dispatchEvent(new CustomEvent('krishna_logo_updated', { detail: logo }));
    }).catch(() => {});

    // 2. Real-time Firebase Cloud Firestore Live Subscription (Instant across ALL phones & devices)
    const unsubscribeFirestoreAppearance = subscribeToDoc('websiteconfigs', 'published', (cloudConfig) => {
      if (cloudConfig?.branding && cloudConfig?.styling) {
        localStorage.setItem('krishna_published_config', JSON.stringify(cloudConfig));
        applyGlobalTheme(cloudConfig.styling);
        const logo = (cloudConfig.branding?.useCustomLogo !== false && cloudConfig.branding?.logoUrl) ? cloudConfig.branding.logoUrl : '';
        if (logo) {
          localStorage.setItem('krishna_published_logo', logo);
          updateGlobalFavicon(logo);
        } else {
          localStorage.removeItem('krishna_published_logo');
          updateGlobalFavicon('');
        }
        window.dispatchEvent(new CustomEvent('krishna_logo_updated', { detail: logo }));
        window.dispatchEvent(new CustomEvent('krishna_config_updated', { detail: cloudConfig }));
      }
    });

    // 3. Listen to local/tab appearance config updates
    const handleConfigUpdate = (e) => {
      if (e?.detail?.styling) {
        applyGlobalTheme(e.detail.styling);
      }
    };
    window.addEventListener('krishna_config_updated', handleConfigUpdate);

    return () => {
      window.removeEventListener('krishna_config_updated', handleConfigUpdate);
      if (unsubscribeFirestoreAppearance) unsubscribeFirestoreAppearance();
    };
  }, []);

  useEffect(() => {
    // 1. Unconditionally load confirmed weekly plan on app startup (<1ms)
    getCurrentWeeklyPlanLocal().then(planData => {
      if (planData) setWeeklyPlan(applyDeadlineAutoClosure(planData));
    }).catch(() => {});

    // 2. Real-time Firebase Cloud Firestore Live Subscription for Weekly Plans
    const unsubscribeFirestorePlan = subscribeToDoc('plans', 'current', (cloudPlan) => {
      if (cloudPlan?.weekKey) {
        const processed = applyDeadlineAutoClosure(cloudPlan);
        setWeeklyPlan(processed);
        localStorage.setItem('krishna_current_weekly_plan', JSON.stringify(processed));
      }
    });

    // 3. Listen to real-time weekly plan updates across tabs and components
    const handlePlanUpdate = (e) => {
      if (e?.detail) {
        setWeeklyPlan(applyDeadlineAutoClosure(e.detail));
      }
    };
    const handleStorage = (e) => {
      if (e.key === 'krishna_current_weekly_plan' && e.newValue) {
        try {
          setWeeklyPlan(applyDeadlineAutoClosure(JSON.parse(e.newValue)));
        } catch {}
      }
    };

    window.addEventListener('krishna_plan_updated', handlePlanUpdate);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('krishna_plan_updated', handlePlanUpdate);
      window.removeEventListener('storage', handleStorage);
      if (unsubscribeFirestorePlan) unsubscribeFirestorePlan();
    };
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      refreshData();
    }
  }, [isAuthenticated, refreshData]);

  // Handler for adding / updating student
  const handleSaveStudent = async (formData, studentId) => {
    if (studentId) {
      await updateStudent(studentId, formData);
    } else {
      await createStudent(formData);
    }
    await refreshData();
  };

  const handleArchiveStudent = async (id) => {
    await archiveStudent(id);
    await refreshData();
  };

  const handleDeleteStudent = async (id) => {
    await deleteStudent(id, true);
    await refreshData();
  };

  const handleOpenEditStudent = (student) => {
    setEditingStudent(student);
    setIsStudentModalOpen(true);
  };

  const handleOpenAddStudent = () => {
    setEditingStudent(null);
    setIsStudentModalOpen(true);
  };

  const handleViewProfile = (studentId) => {
    setSelectedProfileStudentId(studentId);
    setIsProfileModalOpen(true);
  };

  const handleNavigateToAttendance = (date = '') => {
    if (date) setAttendanceDate(date);
    setActiveTab('take-attendance');
  };

  if (verifyToken) {
    return (
      <CardVerificationPage 
        token={verifyToken} 
        onBack={() => {
          window.history.replaceState({}, '', window.location.pathname);
          setVerifyToken(null);
        }} 
      />
    );
  }

  if (authLoading) {
    return (
      <div className="devotional-bg-root" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#FFD700', fontFamily: 'var(--font-heading)', fontSize: '1.2rem' }}>
          Loading Krishna Kripa Portal...
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    if (studentUser) {
      return (
        <StudentDashboard 
          student={studentUser} 
          onLogout={() => {
            localStorage.removeItem('krishna_student_token');
            localStorage.removeItem('krishna_student_user');
            setStudentUser(null);
            setShowStudentLogin(false);
          }} 
        />
      );
    }

    if (showStudentLogin) {
      return (
        <StudentLoginPage 
          onLoginSuccess={(s) => {
            setStudentUser(s);
            setShowStudentLogin(false);
          }}
          onBackToLanding={() => setShowStudentLogin(false)}
          onGoToAdminLogin={() => {
            setShowStudentLogin(false);
            setShowLoginView(true);
          }}
        />
      );
    }

    if (showLoginView) {
      return <LoginPage onBackToLanding={() => setShowLoginView(false)} />;
    }
    
    return (
      <LandingPage 
        onOpenLogin={() => setShowLoginView(true)} 
        onOpenStudentLogin={() => setShowStudentLogin(true)}
        initialPlan={weeklyPlan}
      />
    );
  }

  return (
    <div className="devotional-bg-root">
      
      {/* Top Header Navbar */}
      <Navbar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onOpenSettings={() => setIsSettingsOpen(true)} 
        onOpenAdminSecurity={() => setIsAdminSecurityOpen(true)}
        onViewLanding={() => setActiveTab('landing')}
      />

      {/* Tab Navigation Ribbon */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onQuickAddStudent={handleOpenAddStudent} 
      />

      {/* Main Content Container */}
      <main className="app-main-content">
        {activeTab === 'landing' && (
          <LandingPage onOpenLogin={() => setActiveTab('dashboard')} initialPlan={weeklyPlan} />
        )}

        {activeTab === 'dashboard' && (
          <DashboardView 
            metrics={metrics}
            weeklyPlan={weeklyPlan}
            onNavigate={setActiveTab}
            onAddStudent={handleOpenAddStudent}
            onViewStudentProfile={handleViewProfile}
          />
        )}

        {activeTab === 'competition' && (
          <JanmashtamiAdmin />
        )}

        {activeTab === 'planning' && (
          <WeeklyPlanner onPlanUpdated={refreshData} />
        )}

        {activeTab === 'appearance' && (
          <AppearanceEditor />
        )}

        {activeTab === 'take-attendance' && (
          <TakeAttendance 
            students={students}
            initialDate={attendanceDate}
            onAttendanceSaved={refreshData}
            onNavigateToSessions={() => setActiveTab('sessions')}
          />
        )}

        {activeTab === 'students' && (
          <StudentManagement 
            students={students}
            onAddStudent={handleOpenAddStudent}
            onEditStudent={handleOpenEditStudent}
            onViewProfile={handleViewProfile}
            onArchiveStudent={handleArchiveStudent}
            onDeleteStudent={handleDeleteStudent}
          />
        )}

        {activeTab === 'id-cards' && (
          <AdminIdCardManager />
        )}

        {activeTab === 'calendar' && (
          <SessionCalendar 
            sessions={sessions}
            onSelectDate={handleNavigateToAttendance}
            onRefreshData={refreshData}
          />
        )}

        {activeTab === 'sessions' && (
          <SessionHistory 
            sessions={sessions}
            students={students}
            onEditRegister={handleNavigateToAttendance}
            onRefreshData={refreshData}
          />
        )}

        {activeTab === 'gita-chat' && (
          <BhagavadGitaChat />
        )}

        {activeTab === 'attendance-insights' && (
          <AttendanceInsights metrics={metrics} />
        )}

        {activeTab === 'reports' && (
          <ReportsView 
            students={students}
            sessions={sessions}
            onViewStudentProfile={handleViewProfile}
          />
        )}
      </main>

      {/* Footer */}
      <footer 
        style={{
          borderTop: '1px solid rgba(255, 215, 0, 0.3)',
          background: 'rgba(27, 67, 50, 0.95)',
          padding: '1.25rem 1.5rem',
          color: '#FFF8DC',
          textAlign: 'center',
          fontSize: '0.85rem'
        }}
        className="no-print"
      >
        <div style={{ maxWidth: '1440px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ fontFamily: 'var(--font-heading)', color: '#FFD700', fontWeight: 700, letterSpacing: '0.04em' }}>
            KRISHNA KRIPA &bull; BHAGAVAD GITA ATTENDANCE MANAGEMENT
          </div>
          <div style={{ fontSize: '0.8rem', opacity: 0.85 }}>
            Every Saturday &amp; Sunday
          </div>
        </div>
      </footer>

      {/* Add / Edit Student Modal */}
      <StudentModal 
        isOpen={isStudentModalOpen}
        onClose={() => setIsStudentModalOpen(false)}
        onSave={handleSaveStudent}
        editingStudent={editingStudent}
      />

      {/* Student Profile Modal with Historical Attendance Table */}
      <StudentProfileModal 
        isOpen={isProfileModalOpen}
        studentId={selectedProfileStudentId}
        onClose={() => {
          setIsProfileModalOpen(false);
          setSelectedProfileStudentId(null);
        }}
      />

      {/* Settings & Firebase Sync Modal */}
      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onDatabaseReset={refreshData}
      />

      {/* Administrator Security & Accounts Modal */}
      <AdminManagementModal 
        isOpen={isAdminSecurityOpen}
        onClose={() => setIsAdminSecurityOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainPortal />
    </AuthProvider>
  );
}
