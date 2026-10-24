import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { DevotionalCrest, IskconLogo } from '../../assets/crest';
import { Eye, EyeOff, Lock, User, Sparkles, BookOpen, ShieldCheck, ArrowLeft } from 'lucide-react';

export const LoginPage = ({ onBackToLanding }) => {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(username, password);
    } catch (err) {
      setError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="devotional-bg-root auth-page-wrapper" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
      {/* Devotional Ambient Particle Overlay or Border */}
      <div 
        className="animate-fade-in auth-modal-card"
        style={{
          width: '100%',
          maxWidth: '460px',
          background: 'rgba(255, 255, 255, 0.98)',
          borderRadius: '16px',
          border: '1.5px solid #FFD700',
          boxShadow: '0 20px 45px rgba(0, 0, 0, 0.45), 0 0 35px rgba(255, 215, 0, 0.25)',
          overflow: 'hidden'
        }}
      >
        {/* Card Header with Sacred Devotional Motif */}
        <div 
          className="auth-header-pad"
          style={{
            background: 'linear-gradient(135deg, #1B4332 0%, #0d291e 50%, #8B4513 100%)',
            padding: '2.25rem 2rem 1.75rem',
            textAlign: 'center',
            position: 'relative',
            borderBottom: '2px solid #FFD700'
          }}
        >
          {/* Subtle gold line ornament */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.85rem' }}>
            <DevotionalCrest size={68} />
          </div>

          <h1 
            className="heading-gold" 
            style={{ 
              fontSize: '1.85rem', 
              fontWeight: 800, 
              marginBottom: '0.35rem',
              letterSpacing: '0.04em'
            }}
          >
            KRISHNA KRIPA
          </h1>
          
          <p 
            style={{ 
              color: '#FFF8DC', 
              fontSize: '0.92rem', 
              letterSpacing: '0.06em',
              fontWeight: 500,
              textShadow: '0 1px 3px rgba(0,0,0,0.6)'
            }}
          >
            Bhagavad Gita Attendance Management
          </p>

          <div 
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(255, 215, 0, 0.15)',
              border: '1px solid rgba(255, 215, 0, 0.4)',
              borderRadius: '20px',
              padding: '3px 12px',
              marginTop: '0.85rem',
              color: '#FFD700',
              fontSize: '0.78rem',
              fontWeight: 600
            }}
          >
            <Sparkles size={13} color="#FFD700" />
            <span>Weekend Class Administration</span>
          </div>
        </div>

        {/* Form Body */}
        <div style={{ padding: '2rem 2.25rem 2.25rem', background: '#FFFDF9' }}>
          {error && (
            <div 
              style={{
                background: '#FFF0F0',
                border: '1px solid #FFB4B4',
                color: '#B71C1C',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                fontSize: '0.88rem',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
                lineHeight: 1.4
              }}
            >
              <div style={{ fontWeight: 700 }}>•</div>
              <div>{error}</div>
            </div>
          )}

          <form 
            onSubmit={handleSubmit} 
            autoComplete="off" 
            style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
          >
            {/* Decoy hidden inputs to absorb browser autofill / password manager */}
            <input type="text" name="fake_username_remember" tabIndex={-1} style={{ display: 'none' }} aria-hidden="true" autoComplete="off" />
            <input type="password" name="fake_password_remember" tabIndex={-1} style={{ display: 'none' }} aria-hidden="true" autoComplete="off" />

            {/* Username Field */}
            <div>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <User size={15} color="#8B4513" />
                <span>Admin Username</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input 
                  id="admin-user-input"
                  name="krishna_admin_user"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter administrator username"
                  className="form-input"
                  required
                  autoComplete="off"
                  readOnly
                  onFocus={(e) => e.target.removeAttribute('readOnly')}
                  style={{ paddingLeft: '2.5rem' }}
                />
                <User 
                  size={18} 
                  color="#888" 
                  style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Lock size={15} color="#8B4513" />
                <span>Security Password</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input 
                  id="admin-pass-input"
                  name="krishna_admin_auth_token"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter security password"
                  className="form-input"
                  required
                  autoComplete="new-password"
                  readOnly
                  onFocus={(e) => e.target.removeAttribute('readOnly')}
                  style={{ paddingLeft: '2.5rem', paddingRight: '2.75rem' }}
                />
                <Lock 
                  size={18} 
                  color="#888" 
                  style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#666',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '4px'
                  }}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Sign in button */}
            <button
              type="submit"
              disabled={loading}
              className="btn-gold"
              style={{
                width: '100%',
                padding: '0.85rem',
                fontSize: '1.05rem',
                marginTop: '0.5rem',
                boxShadow: '0 4px 15px rgba(255, 215, 0, 0.4)'
              }}
            >
              {loading ? (
                <span>Verifying Credentials...</span>
              ) : (
                <>
                  <ShieldCheck size={19} />
                  <span>Enter Administration Portal</span>
                </>
              )}
            </button>
          </form>

          {/* Back to Public Website Link */}
          {onBackToLanding && (
            <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
              <button
                type="button"
                onClick={onBackToLanding}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#1B4332',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  textDecoration: 'underline'
                }}
              >
                <ArrowLeft size={15} />
                <span>Return to Public Landing Page</span>
              </button>
            </div>
          )}

          <div style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.78rem', color: '#888' }}>
            <span>Hare Krishna &bull; Dedicated to Sunday &amp; Saturday Bhagavad Gita Study</span>
          </div>
        </div>
      </div>
    </div>
  );
};
