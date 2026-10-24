import React, { useState, useEffect } from 'react';
import { apiStudentLogin } from '../../api/apiClient';
import { getAllStudents, createStudent } from '../../db/db';
import { DevotionalCrest } from '../../assets/crest';
import { 
  User, 
  GraduationCap, 
  Sparkles, 
  ArrowLeft, 
  CheckCircle2, 
  AlertTriangle,
  LogIn,
  School,
  Lock,
  Phone,
  UserPlus,
  BookOpen
} from 'lucide-react';

export const StudentLoginPage = ({ onLoginSuccess, onBackToLanding, onGoToAdminLogin }) => {
  // Mode: 'login' | 'register'
  const [mode, setMode] = useState('login');

  // Login Form State
  const [name, setName] = useState('');
  const [className, setClassName] = useState('Class 7');

  // Registration Form State
  const [regName, setRegName] = useState('');
  const [regClass, setRegClass] = useState('Class 7');
  const [regPhone, setRegPhone] = useState('');
  const [regSchool, setRegSchool] = useState('');
  const [regNotes, setRegNotes] = useState('');

  // Status & Feedback
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [candidates, setCandidates] = useState(null);
  const [dbSchools, setDbSchools] = useState([]);

  useEffect(() => {
    let isMounted = true;
    getAllStudents(false).then(list => {
      if (!isMounted) return;
      const schools = Array.from(
        new Set(
          (list || [])
            .map(s => (s.schoolName || s.school || '').trim())
            .filter(Boolean)
        )
      ).sort();
      setDbSchools(schools);
    }).catch(() => {});
    return () => { isMounted = false; };
  }, []);

  const CLASS_OPTIONS = [
    'Pre-Nursery',
    'Nursery',
    'L.K.G',
    'U.K.G',
    'Class 1',
    'Class 2',
    'Class 3',
    'Class 4',
    'Class 5',
    'Class 6',
    'Class 7',
    'Class 8',
    'Class 9',
    'Class 10',
    'Class 11',
    'Class 12',
    'College / Youth',
    'Youth Gita Forum',
    'Sunday School Junior',
    'Sunday School Senior'
  ];

  // ============================================================================
  // STUDENT LOGIN (MONGODB ATLAS PRIMARY AUTHENTICATION)
  // ============================================================================
  const handleLogin = async (selectedStudentId = null) => {
    setError('');
    setSuccessMsg('');
    setLoading(true);

    const inputName = name.trim();
    const inputClass = className.trim();

    if (!inputName) {
      setError('Please enter your full name.');
      setLoading(false);
      return;
    }

    try {
      // Authenticate with MongoDB Atlas via Backend API
      const res = await apiStudentLogin({
        name: inputName,
        className: inputClass,
        studentId: selectedStudentId
      });

      if (res?.multipleMatches && res.candidates) {
        setCandidates(res.candidates);
        setLoading(false);
        return;
      }

      if (res?.success && res.student) {
        localStorage.setItem('krishna_student_token', res.token || `token-${res.student.id || res.student.studentId}`);
        localStorage.setItem('krishna_student_user', JSON.stringify(res.student));
        if (onLoginSuccess) onLoginSuccess(res.student);
        return;
      }

      throw new Error(res?.message || 'Login was not acknowledged by the server.');
    } catch (apiErr) {
      const errMsg = apiErr?.message || '';
      if (errMsg.toLowerCase().includes('no active student record') || errMsg.toLowerCase().includes('not matched') || errMsg.toLowerCase().includes('spelling')) {
        setError(`No registered student record found for "${inputName}". If this is your first time attending, please register your details using the "Register Here" tab below!`);
      } else {
        // Resilient fallback: Try local / Firestore match if network blip
        try {
          const fallbackStudents = await getAllStudents(false).catch(() => []);
          const matched = (fallbackStudents || []).filter(s => 
            (s.name || '').trim().toLowerCase() === inputName.toLowerCase() &&
            (!inputClass || (s.className || s.grade || '').trim().toLowerCase() === inputClass.toLowerCase())
          );
          if (matched.length === 1) {
            const student = matched[0];
            const token = `token-${student.id || student.studentId}`;
            localStorage.setItem('krishna_student_token', token);
            localStorage.setItem('krishna_student_user', JSON.stringify(student));
            if (onLoginSuccess) onLoginSuccess(student);
            return;
          } else if (matched.length > 1) {
            setCandidates(matched);
            setLoading(false);
            return;
          }
        } catch (_) {}

        if (errMsg.toLowerCase().includes('failed to fetch') || errMsg.toLowerCase().includes('network') || errMsg.toLowerCase().includes('abort')) {
          setError('Unable to reach cloud server. Please check your network connection and try again.');
        } else {
          setError(errMsg || 'Unable to log in to Krishna Kripa student portal. Please check your network connection.');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // NEW STUDENT REGISTRATION
  // ============================================================================
  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    const fullName = regName.trim();
    const phone = regPhone.trim();
    const school = regSchool.trim();

    if (!fullName || !phone || !school) {
      setError('Please provide your Full Name, WhatsApp Number, and School Name.');
      setLoading(false);
      return;
    }

    try {
      const newStudent = await createStudent({
        name: fullName,
        className: regClass,
        grade: regClass,
        whatsappNumber: phone,
        schoolName: school,
        notes: regNotes.trim()
      });

      setSuccessMsg(`Hare Krishna! Registration successful. Welcome, ${newStudent.name} (Student ID: ${newStudent.studentId})! Entering portal...`);
      
      setTimeout(() => {
        const studentToken = newStudent.token || localStorage.getItem('krishna_student_token') || `token-${newStudent.studentId || newStudent.id}`;
        localStorage.setItem('krishna_student_token', studentToken);
        localStorage.setItem('krishna_student_user', JSON.stringify(newStudent));
        if (onLoginSuccess) {
          onLoginSuccess(newStudent);
        }
      }, 1200);
    } catch (err) {
      const rawMsg = err?.message || '';
      if (rawMsg.toLowerCase().includes('failed to fetch') || rawMsg.toLowerCase().includes('network') || rawMsg.toLowerCase().includes('aborted')) {
        setError('Network connectivity issue while reaching registration server. Please check your internet connection or try again.');
      } else {
        setError(rawMsg || 'Registration failed. Please check the provided information.');
      }
      setLoading(false);
    }
  };

  return (
    <div className="devotional-bg-root auth-page-wrapper" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
      <div 
        className="animate-fade-in auth-modal-card"
        style={{
          width: '100%',
          maxWidth: '480px',
          background: 'rgba(255, 255, 255, 0.98)',
          borderRadius: '16px',
          border: '1.5px solid #FFD700',
          boxShadow: '0 20px 45px rgba(0, 0, 0, 0.45), 0 0 35px rgba(255, 215, 0, 0.25)',
          overflow: 'hidden'
        }}
      >
        {/* Sacred Devotional Header */}
        <div 
          className="auth-header-pad"
          style={{
            background: 'linear-gradient(135deg, #1B4332 0%, #0d291e 50%, #8B4513 100%)',
            padding: '2rem 1.75rem 1.5rem',
            textAlign: 'center',
            borderBottom: '2px solid #FFD700'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem' }}>
            <DevotionalCrest size={60} />
          </div>

          <h1 
            className="heading-gold" 
            style={{ 
              fontSize: '1.75rem', 
              fontWeight: 800, 
              marginBottom: '0.25rem',
              letterSpacing: '0.04em'
            }}
          >
            KRISHNA KRIPA
          </h1>
          
          <p 
            style={{ 
              color: '#FFF8DC', 
              fontSize: '0.9rem', 
              letterSpacing: '0.04em',
              fontWeight: 500,
              margin: '0 0 0.75rem'
            }}
          >
            Student Attendance &amp; Gita Wisdom Portal
          </p>

          {/* Mode Switcher Tabs */}
          <div 
            style={{
              display: 'flex',
              background: 'rgba(0, 0, 0, 0.25)',
              borderRadius: '10px',
              padding: '3px',
              border: '1px solid rgba(255, 215, 0, 0.35)',
              maxWidth: '360px',
              margin: '0 auto'
            }}
          >
            <button
              type="button"
              onClick={() => { setMode('login'); setError(''); setSuccessMsg(''); }}
              style={{
                flex: 1,
                padding: '0.45rem',
                border: 'none',
                borderRadius: '8px',
                background: mode === 'login' ? 'linear-gradient(135deg, #FFD700 0%, #FFA000 100%)' : 'transparent',
                color: mode === 'login' ? '#1B4332' : '#FFF8DC',
                fontWeight: mode === 'login' ? 800 : 600,
                fontSize: '0.82rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.2s'
              }}
            >
              <LogIn size={14} />
              <span>Student Login</span>
            </button>

            <button
              type="button"
              onClick={() => { setMode('register'); setError(''); setSuccessMsg(''); }}
              style={{
                flex: 1,
                padding: '0.45rem',
                border: 'none',
                borderRadius: '8px',
                background: mode === 'register' ? 'linear-gradient(135deg, #FFD700 0%, #FFA000 100%)' : 'transparent',
                color: mode === 'register' ? '#1B4332' : '#FFF8DC',
                fontWeight: mode === 'register' ? 800 : 600,
                fontSize: '0.82rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.2s'
              }}
            >
              <UserPlus size={14} />
              <span>Register Here</span>
            </button>
          </div>
        </div>

        {/* Form Body */}
        <div style={{ padding: '1.75rem 2rem 2rem', background: '#FFFDF9' }}>
          
          {/* Error Notice */}
          {error && (
            <div 
              style={{
                background: '#FFF0F0',
                border: '1px solid #FFB4B4',
                color: '#B71C1C',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                fontSize: '0.86rem',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px'
              }}
            >
              <AlertTriangle size={17} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <div>{error}</div>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => { setMode('register'); setError(''); }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#1B4332',
                      textDecoration: 'underline',
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontSize: '0.84rem',
                      padding: 0,
                      marginTop: '4px'
                    }}
                  >
                    Click here to register as a new student &rarr;
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Success Notice */}
          {successMsg && (
            <div 
              style={{
                background: '#ECFDF5',
                border: '1px solid #6EE7B7',
                color: '#065F46',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                fontSize: '0.86rem',
                fontWeight: 600,
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <CheckCircle2 size={17} />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Multiple Candidates Disambiguation */}
          {candidates && (
            <div style={{ background: '#FFFDF0', border: '1.5px solid #FFD54F', borderRadius: '8px', padding: '1rem', marginBottom: '1.25rem' }}>
              <div style={{ fontWeight: 700, color: '#1B4332', fontSize: '0.88rem', marginBottom: '6px' }}>
                Multiple students found with this name. Select your record:
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {candidates.map(cand => (
                  <button
                    key={cand.studentId || cand.id}
                    type="button"
                    onClick={() => handleLogin(cand.studentId || cand.id)}
                    className="btn-ghost"
                    style={{
                      textAlign: 'left',
                      padding: '8px 12px',
                      background: '#FFF',
                      border: '1px solid #D8D2C2',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, color: '#1B4332', fontSize: '0.9rem' }}>{cand.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#666' }}>{cand.schoolName || cand.school} &bull; ID: {cand.studentId || cand.id}</div>
                    </div>
                    <CheckCircle2 size={16} color="#2D6A4F" />
                  </button>
                ))}
              </div>
              <button 
                type="button" 
                onClick={() => setCandidates(null)} 
                className="btn-ghost" 
                style={{ fontSize: '0.75rem', marginTop: '8px', padding: '2px 8px' }}
              >
                Cancel Selection
              </button>
            </div>
          )}

          {/* TAB 1: LOGIN FORM */}
          {mode === 'login' && (
            <form onSubmit={(e) => { e.preventDefault(); handleLogin(); }} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
              <div>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                  <User size={15} color="#8B4513" />
                  <span>Your Full Name <span style={{ color: '#E53E3E' }}>*</span></span>
                </label>
                <input 
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Aarav Sharma, Rohan Verma"
                  className="form-input"
                  required
                  autoFocus
                />
                <div style={{ fontSize: '0.74rem', color: '#777', marginTop: '4px' }}>
                  Enter the name provided during class registration.
                </div>
              </div>

              <div>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                  <GraduationCap size={15} color="#8B4513" />
                  <span>Your Class / Grade <span style={{ color: '#E53E3E' }}>*</span></span>
                </label>
                <select
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  className="form-input"
                  required
                >
                  {CLASS_OPTIONS.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-gold"
                style={{
                  width: '100%',
                  padding: '0.85rem',
                  fontSize: '1rem',
                  marginTop: '0.5rem',
                  boxShadow: '0 4px 15px rgba(255, 215, 0, 0.4)'
                }}
              >
                {loading ? (
                  <span>Entering Portal...</span>
                ) : (
                  <>
                    <LogIn size={18} />
                    <span>Enter Student Portal</span>
                  </>
                )}
              </button>

              <div style={{ textAlign: 'center', marginTop: '0.25rem' }}>
                <span style={{ fontSize: '0.82rem', color: '#64748B' }}>Not registered yet? </span>
                <button
                  type="button"
                  onClick={() => { setMode('register'); setError(''); }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#1B4332',
                    fontWeight: 700,
                    textDecoration: 'underline',
                    cursor: 'pointer',
                    fontSize: '0.82rem'
                  }}
                >
                  Register here as a student
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: REGISTRATION FORM */}
          {mode === 'register' && (
            <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                  <User size={15} color="#8B4513" />
                  <span>Full Name <span style={{ color: '#E53E3E' }}>*</span></span>
                </label>
                <input 
                  type="text"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="e.g. Aarav Sharma"
                  className="form-input"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                  <GraduationCap size={15} color="#8B4513" />
                  <span>Class / Grade <span style={{ color: '#E53E3E' }}>*</span></span>
                </label>
                <select
                  value={regClass}
                  onChange={(e) => setRegClass(e.target.value)}
                  className="form-input"
                  required
                >
                  {CLASS_OPTIONS.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                  <Phone size={15} color="#8B4513" />
                  <span>WhatsApp / Contact Number <span style={{ color: '#E53E3E' }}>*</span></span>
                </label>
                <input 
                  type="tel"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  placeholder="e.g. 9876543210"
                  className="form-input"
                  required
                />
              </div>

              <div>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                  <School size={15} color="#8B4513" />
                  <span>School / Institution Name <span style={{ color: '#E53E3E' }}>*</span></span>
                </label>
                <input 
                  type="text"
                  value={regSchool}
                  onChange={(e) => setRegSchool(e.target.value)}
                  list="reg-school-suggestions"
                  placeholder="e.g. Sri Sri Academy, Delhi Public School"
                  className="form-input"
                  required
                />
                <datalist id="reg-school-suggestions">
                  {dbSchools.map((s, idx) => (
                    <option key={idx} value={s} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                  <BookOpen size={15} color="#8B4513" />
                  <span>Notes / Spiritual Interests (Optional)</span>
                </label>
                <input 
                  type="text"
                  value={regNotes}
                  onChange={(e) => setRegNotes(e.target.value)}
                  placeholder="e.g. Interested in Sunday Gita sloka chanting"
                  className="form-input"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-gold"
                style={{
                  width: '100%',
                  padding: '0.85rem',
                  fontSize: '1rem',
                  marginTop: '0.5rem',
                  boxShadow: '0 4px 15px rgba(255, 215, 0, 0.4)'
                }}
              >
                {loading ? (
                  <span>Registering Student...</span>
                ) : (
                  <>
                    <UserPlus size={18} />
                    <span>Register &amp; Enter Portal</span>
                  </>
                )}
              </button>

              <div style={{ textAlign: 'center', marginTop: '0.25rem' }}>
                <span style={{ fontSize: '0.82rem', color: '#64748B' }}>Already registered? </span>
                <button
                  type="button"
                  onClick={() => { setMode('login'); setError(''); }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#1B4332',
                    fontWeight: 700,
                    textDecoration: 'underline',
                    cursor: 'pointer',
                    fontSize: '0.82rem'
                  }}
                >
                  Sign in here
                </button>
              </div>
            </form>
          )}

          {/* Quick Links */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #EFE4CE', fontSize: '0.82rem' }}>
            <button
              type="button"
              onClick={onBackToLanding}
              className="btn-ghost"
              style={{ padding: '0', border: 'none', color: '#1B4332', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            >
              <ArrowLeft size={14} />
              <span>Back to Home</span>
            </button>

            <button
              type="button"
              onClick={onGoToAdminLogin}
              className="btn-ghost"
              style={{ padding: '0', border: 'none', color: '#8B4513', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            >
              <Lock size={14} />
              <span>Administrator Login</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
