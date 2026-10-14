import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, 
  Lock, 
  Eye, 
  EyeOff, 
  ShieldAlert, 
  CheckCircle2, 
  KeyRound, 
  Sparkles, 
  ArrowRight,
  ShieldCheck,
  Building2,
  HelpCircle,
  X
} from 'lucide-react';
import './Login.css';
import iqraaLogo from '../assets/iqraa-logo.png';

export default function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Password reset states
  const [isResetting, setIsResetting] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  // Status & modal states
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);

  const navigate = useNavigate();

  // Load remembered username if previously saved
  useEffect(() => {
    const savedUser = localStorage.getItem('iqraa_remembered_user');
    if (savedUser) {
      setUsername(savedUser);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      const response = await fetch(`http://${window.location.hostname}:8000/api/auth/login/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        // Remember username preference
        if (rememberMe) {
          localStorage.setItem('iqraa_remembered_user', username);
        } else {
          localStorage.removeItem('iqraa_remembered_user');
        }

        onLoginSuccess(data);
        const redirectUrl = sessionStorage.getItem('redirectUrl');
        if (redirectUrl) {
          sessionStorage.removeItem('redirectUrl');
          navigate(redirectUrl);
        } else if (data.is_staff) {
          navigate('/');
        } else {
          navigate('/appraise');
        }
      } else {
        setError(data.non_field_errors ? data.non_field_errors[0] : (data.error || 'Invalid username or password'));
      }
    } catch (err) {
      setError('Connection failed. Is the backend server running?');
    } finally {
      setLoading(false);
    }
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`http://${window.location.hostname}:8000/api/auth/reset-password/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessMessage('Password changed successfully! You can now sign in with your new password.');
        setIsResetting(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setError(data.error || 'Failed to change password');
      }
    } catch (err) {
      setError('Connection failed. Is the backend server running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="iqraa-login-page">
      {/* Background ambient particle layer */}
      <div className="bg-particles-layer" />

      {/* Main Dual-Panel Login Card */}
      <div className="iqraa-login-card">
        
        {/* ================================================================ */}
        {/* LEFT PANEL: HERO BANNER & 3D FLOATING SPHERES                     */}
        {/* ================================================================ */}
        <div className="iqraa-hero-panel">
          {/* Animated 3D Blue Orbs */}
          <div className="hero-orb-large" />
          <div className="hero-orb-medium" />
          <div className="hero-orb-small" />

          {/* Organic Fluid Curve Transition to White Panel */}
          <svg className="hero-organic-curve" viewBox="0 0 60 600" preserveAspectRatio="none">
            <defs>
              <linearGradient id="heroCurveGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#0284c7" />
                <stop offset="32%" stopColor="#0062f5" />
                <stop offset="68%" stopColor="#0040be" />
                <stop offset="100%" stopColor="#002477" />
              </linearGradient>
            </defs>
            <path d="M0,0 Q60,180 20,380 Q-5,480 30,600 L0,600 Z" fill="url(#heroCurveGrad)" />
          </svg>

          <div className="hero-content">
            {/* Top Hospital Identity Tag */}
            <div>
              <div style={{
                background: '#ffffff',
                padding: '8px 16px',
                borderRadius: '14px',
                display: 'inline-flex',
                alignItems: 'center',
                boxShadow: '0 8px 24px rgba(0, 20, 60, 0.28)',
                marginBottom: '22px'
              }}>
                <img 
                  src={iqraaLogo} 
                  alt="IQRAA International Hospital and Research Centre" 
                  style={{ height: '40px', width: 'auto', objectFit: 'contain' }} 
                />
              </div>

              {/* Main Typography Header */}
              <div className="hero-text-block">
                <h2 className="hero-welcome-label">WELCOME</h2>
                <h1 className="hero-main-title">
                  <span>IQRAA SMART HUB</span>
                  <span className="hero-pulse-dot" />
                </h1>
                <p className="hero-system-description">
                  Hospital Human Resources Management & Performance Appraisal System. Secure, unified portal for staff appraisals, clinical evaluations, and healthcare analytics across all hospital branches.
                </p>

                {/* Key Pillars */}
                <div className="hero-features-list">
                  <div className="hero-feature-item">
                    <div className="hero-feature-icon">
                      <Sparkles size={16} />
                    </div>
                    <span>Performance Appraisals & Trainee Assessments</span>
                  </div>

                  <div className="hero-feature-item">
                    <div className="hero-feature-icon">
                      <Building2 size={16} />
                    </div>
                    <span>Multi-Branch Hospital Network & HR Control</span>
                  </div>

                  <div className="hero-feature-item">
                    <div className="hero-feature-icon">
                      <ShieldCheck size={16} />
                    </div>
                    <span>NABH & HIPAA Compliant Role-Based Access</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Subtle Note */}
            <div className="hero-footer-note">
              <span>• Developed By IT Department • </span>
            </div>
          </div>
        </div>

        {/* ================================================================ */}
        {/* RIGHT PANEL: AUTHENTICATION FORM & CORNER ORB                     */}
        {/* ================================================================ */}
        <div className="iqraa-form-panel">
          {/* Signature Accent Orb at Bottom Right (Matching Reference Image) */}
          <div className="form-corner-orb" />

          {/* Heading */}
          <div className="form-header-area">
            <h2 className="form-main-heading">
              {isResetting ? 'Reset Password' : 'Sign in'}
            </h2>
            <p className="form-sub-heading">
              {isResetting 
                ? 'Enter your employee username and current credentials to update your password.' 
                : 'Welcome back! Please enter your details to access your portal.'}
            </p>
          </div>

          {/* Error Alert Banner */}
          {error && (
            <div className="iqraa-alert-banner iqraa-alert-error">
              <ShieldAlert size={18} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* Success Alert Banner */}
          {successMessage && (
            <div className="iqraa-alert-banner iqraa-alert-success">
              <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Form Content */}
          {isResetting ? (
            /* RESET PASSWORD FORM */
            <form onSubmit={handleResetSubmit} className="iqraa-form">
              <div className="iqraa-input-group">
                <label className="iqraa-input-label">Username / Employee Code</label>
                <div className="iqraa-input-box">
                  <span className="input-icon-left">
                    <User size={18} />
                  </span>
                  <input
                    type="text"
                    className="iqraa-native-input"
                    placeholder="e.g. admin or EMP001"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="iqraa-input-group">
                <label className="iqraa-input-label">Current Password</label>
                <div className="iqraa-input-box">
                  <span className="input-icon-left">
                    <Lock size={18} />
                  </span>
                  <input
                    type={showCurrentPass ? 'text' : 'password'}
                    className="iqraa-native-input"
                    placeholder="Enter current password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle-badge"
                    onClick={() => setShowCurrentPass(!showCurrentPass)}
                  >
                    {showCurrentPass ? <EyeOff size={13} /> : <Eye size={13} />}
                    <span>{showCurrentPass ? 'HIDE' : 'SHOW'}</span>
                  </button>
                </div>
              </div>

              <div className="iqraa-input-group">
                <label className="iqraa-input-label">New Password</label>
                <div className="iqraa-input-box">
                  <span className="input-icon-left">
                    <KeyRound size={18} />
                  </span>
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    className="iqraa-native-input"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle-badge"
                    onClick={() => setShowNewPass(!showNewPass)}
                  >
                    {showNewPass ? <EyeOff size={13} /> : <Eye size={13} />}
                    <span>{showNewPass ? 'HIDE' : 'SHOW'}</span>
                  </button>
                </div>
              </div>

              <div className="iqraa-input-group">
                <label className="iqraa-input-label">Confirm New Password</label>
                <div className="iqraa-input-box">
                  <span className="input-icon-left">
                    <KeyRound size={18} />
                  </span>
                  <input
                    type={showConfirmPass ? 'text' : 'password'}
                    className="iqraa-native-input"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle-badge"
                    onClick={() => setShowConfirmPass(!showConfirmPass)}
                  >
                    {showConfirmPass ? <EyeOff size={13} /> : <Eye size={13} />}
                    <span>{showConfirmPass ? 'HIDE' : 'SHOW'}</span>
                  </button>
                </div>
              </div>

              <button 
                type="submit" 
                className="iqraa-submit-btn" 
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="iqraa-spinner" />
                    <span>Updating Password...</span>
                  </>
                ) : (
                  <>
                    <span>Change Password</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>

              <button
                type="button"
                className="iqraa-secondary-btn"
                onClick={() => {
                  setIsResetting(false);
                  setError('');
                  setSuccessMessage('');
                }}
              >
                Back to Sign In
              </button>
            </form>
          ) : (
            /* STANDARD SIGN IN FORM */
            <form onSubmit={handleSubmit} className="iqraa-form">
              {/* Username Input */}
              <div className="iqraa-input-group">
                <div className="iqraa-input-box">
                  <span className="input-icon-left">
                    <User size={18} />
                  </span>
                  <input
                    type="text"
                    className="iqraa-native-input"
                    placeholder="User Name"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
              </div>

              {/* Password Input with SHOW/HIDE button */}
              <div className="iqraa-input-group">
                <div className="iqraa-input-box">
                  <span className="input-icon-left">
                    <Lock size={18} />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="iqraa-native-input"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle-badge"
                    onClick={() => setShowPassword(!showPassword)}
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                    <span>{showPassword ? 'HIDE' : 'SHOW'}</span>
                  </button>
                </div>
              </div>

              {/* Remember Me & Forgot Password Row */}
              <div className="iqraa-options-row">
                <label className="remember-me-container">
                  <input
                    type="checkbox"
                    className="remember-me-checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span>Remember me</span>
                </label>

                <button
                  type="button"
                  className="forgot-password-trigger"
                  onClick={() => {
                    setIsResetting(true);
                    setError('');
                    setSuccessMessage('');
                  }}
                >
                  Forgot Password?
                </button>
              </div>

              {/* Main Submit Button */}
              <button 
                type="submit" 
                className="iqraa-submit-btn" 
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="iqraa-spinner" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign in</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>

              {/* Divider */}
              <div className="iqraa-divider">
                <span>Or</span>
              </div>

              {/* Secondary Option Button (matching reference image) */}
              <button
                type="button"
                className="iqraa-secondary-btn"
                onClick={() => setShowSupportModal(true)}
              >
                <HelpCircle size={16} />
                <span>Sign in with other</span>
              </button>

              {/* Bottom Support Information */}
              <div className="iqraa-form-footer">
                <span>Need help with access? </span>
                <button
                  type="button"
                  onClick={() => setShowSupportModal(true)}
                >
                  Contact IT Support
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* IT Support / Helpdesk Modal */}
      {showSupportModal && (
        <div className="iqraa-info-modal-overlay" onClick={() => setShowSupportModal(false)}>
          <div className="iqraa-info-modal-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <img src={iqraaLogo} alt="IQRAA Logo" style={{ height: '34px', width: 'auto', objectFit: 'contain' }} />
                <div>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>IQRAA SMART HUB Support</h3>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>Hospital IT & HR Helpdesk</span>
                </div>
              </div>
              <button
                onClick={() => setShowSupportModal(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ fontSize: '13px', color: '#334155', lineHeight: '1.6', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p style={{ margin: 0 }}>
                For account credentials, branch reassignments, or appraisal role permissions, please reach out to the hospital administration desk:
              </p>

              <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontWeight: '600', color: '#0052cc', marginBottom: '4px' }}>📞 Internal IT Extension</div>
                <div>Extension: <b>252, #514</b> (Hospital IT Support & Helpdesk)</div>
              </div>

              <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontWeight: '600', color: '#0052cc', marginBottom: '4px' }}>✉️ HR Management Email</div>
                <div>Email: <b>HR@IQRAAHOSPITAL.IN</b></div>
              </div>

              <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '4px' }}>
                Note: Doctors and Nursing staff may sign in with their assigned Employee ID (e.g., EMP001).
              </div>
            </div>

            <button
              className="iqraa-submit-btn"
              style={{ marginTop: '20px' }}
              onClick={() => setShowSupportModal(false)}
            >
              Understood
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
