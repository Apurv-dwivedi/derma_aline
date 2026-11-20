import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, User, Phone, CheckCircle2, AlertCircle, ArrowLeft, RefreshCw, Sparkles, ShieldCheck } from 'lucide-react';
import API from '../services/api';
import '../styles/pages.css';

/**
 * Derma Aline Aesthétics Client Portal Authentication
 * Supports:
 * - Option A: Self-Registration with Email OTP Verification
 * - Email OTP Verification with countdown timer & resend cooldown
 * - Client Login
 * - Password Reset
 */
const ClientAuth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Mode: 'login' | 'register' | 'verify' | 'forgot' | 'reset'
  const initialMode = searchParams.get('mode') || (searchParams.get('token') ? 'reset' : 'login');
  const [mode, setMode] = useState(initialMode);

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [resetToken, setResetToken] = useState(searchParams.get('token') || '');

  // UI States
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Resend Cooldown Timer
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    let timer;
    if (cooldown > 0) {
      timer = setInterval(() => setCooldown((prev) => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      setResetToken(token);
      setMode('reset');
    }
  }, [searchParams]);

  // 1. Client Login
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const res = await API.post('/auth/login', {
        email: email.trim().toLowerCase(),
        password,
        portal: 'client'
      });

      const { token, role, fullName: userFullName, profilePicture } = res.data;
      localStorage.setItem('token', token);
      localStorage.setItem('role', role || 'CUSTOMER');
      localStorage.setItem('fullName', userFullName || 'Client');
      localStorage.setItem('email', email.trim().toLowerCase());
      if (profilePicture) {
        localStorage.setItem('profilePicture', profilePicture);
      } else {
        localStorage.removeItem('profilePicture');
      }

      navigate('/client/dashboard');
    } catch (err) {
      if (err.response?.data?.requiresVerification) {
        setError(err.response.data.message || 'Please verify your email with the 6-digit code sent to your inbox.');
        setMode('verify');
        setCooldown(60);
        return;
      }
      setError(err.response?.data?.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Client Self-Registration with 6-Digit Email Verification
  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (!termsAccepted) {
      setError('Please accept the clinic privacy and service terms to continue.');
      return;
    }

    setLoading(true);

    try {
      const res = await API.post('/auth/register', {
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        password
      });

      if (res.data?.requiresVerification || !res.data?.token) {
        setSuccessMessage(res.data?.message || `A 6-digit verification code has been dispatched to ${email.trim()}. Please enter it below.`);
        setMode('verify');
        setCooldown(60);
      } else if (res.data?.token) {
        const { token, role, fullName: userFullName, profilePicture } = res.data;
        localStorage.setItem('token', token);
        localStorage.setItem('role', role || 'CUSTOMER');
        localStorage.setItem('fullName', userFullName || 'Client');
        localStorage.setItem('email', email.trim().toLowerCase());
        if (profilePicture) {
          localStorage.setItem('profilePicture', profilePicture);
        } else {
          localStorage.removeItem('profilePicture');
        }

        setSuccessMessage('Registration successful! Entering your client suite...');
        setTimeout(() => navigate('/client/dashboard'), 800);
      } else {
        setSuccessMessage('Account created successfully! Please sign in.');
        setMode('login');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please check your details.');
    } finally {
      setLoading(false);
    }
  };

  // 3. Email OTP Verification (Step 2: Activates Account)
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      const res = await API.post('/auth/verify-otp', {
        email: email.trim().toLowerCase(),
        otp: otp.trim()
      });

      const { token, role, fullName: userFullName, profilePicture } = res.data;
      localStorage.setItem('token', token);
      localStorage.setItem('role', role || 'CUSTOMER');
      localStorage.setItem('fullName', userFullName || 'Client');
      localStorage.setItem('email', email.trim().toLowerCase());
      if (profilePicture) {
        localStorage.setItem('profilePicture', profilePicture);
      } else {
        localStorage.removeItem('profilePicture');
      }

      setSuccessMessage('Account verified successfully! Redirecting to your private suite...');
      setTimeout(() => navigate('/client/dashboard'), 1200);
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid or expired verification code.');
    } finally {
      setLoading(false);
    }
  };

  // 4. Resend OTP
  const handleResendOtp = async () => {
    if (cooldown > 0) return;
    setError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      const res = await API.post('/auth/resend-otp', {
        email: email.trim().toLowerCase()
      });
      setSuccessMessage(res.data.message || 'A new code has been sent to your email.');
      setCooldown(60);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend code. Please wait a moment.');
    } finally {
      setLoading(false);
    }
  };

  // 5. Forgot Password
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      const res = await API.post('/auth/forgot-password', {
        email: email.trim().toLowerCase()
      });
      setSuccessMessage(res.data.message);
    } catch (err) {
      setError(err.response?.data?.message || 'Request failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // 6. Reset Password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);

    try {
      const res = await API.post('/auth/reset-password', {
        token: resetToken.trim(),
        newPassword: password
      });
      setSuccessMessage(res.data.message);
      setTimeout(() => setMode('login'), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Password reset link has expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '85vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px',
      backgroundColor: '#fbf9f6'
    }}>
      <div style={{
        width: '100%',
        maxWidth: mode === 'register' ? '540px' : '440px',
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        padding: '38px',
        border: '1px solid #ebdcd0',
        boxShadow: '0 10px 30px rgba(44, 34, 30, 0.05)'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#f7f2ed',
            padding: '6px 14px',
            borderRadius: '20px',
            fontSize: '0.75rem',
            fontWeight: '600',
            letterSpacing: '0.08em',
            color: '#806657',
            marginBottom: '14px',
            textTransform: 'uppercase'
          }}>
            <Sparkles size={14} /> Client Portal
          </div>
          <h1 style={{
            fontSize: '1.65rem',
            color: '#2c221e',
            fontFamily: 'var(--font-heading)',
            margin: '0 0 6px 0',
            fontWeight: '600'
          }}>
            {mode === 'login' && 'Welcome to Your Private Suite'}
            {mode === 'register' && 'Create Your Client Account'}
            {mode === 'verify' && 'Verify Your Email Address'}
            {mode === 'forgot' && 'Reset Your Password'}
            {mode === 'reset' && 'Set New Password'}
          </h1>
          <p style={{ color: '#8c7b70', fontSize: '0.9rem', margin: 0 }}>
            {mode === 'login' && 'Sign in to access your personal treatment records and aftercare instructions.'}
            {mode === 'register' && 'Register with Derma Aline for personalized clinical aesthetics care.'}
            {mode === 'verify' && `Enter the 6-digit verification code sent to ${email}`}
            {mode === 'forgot' && 'Enter your registered email to receive secure reset instructions.'}
            {mode === 'reset' && 'Enter your new confidential password below.'}
          </p>
        </div>

        {/* Alerts */}
        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px 14px',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#991b1b',
            borderRadius: '8px',
            fontSize: '0.85rem',
            marginBottom: '20px'
          }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px 14px',
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            color: '#166534',
            borderRadius: '8px',
            fontSize: '0.85rem',
            marginBottom: '20px'
          }}>
            <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Form: LOGIN */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: '#4a3b32', marginBottom: '6px' }}>
                Email Address
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: '#a8988d' }} />
                <input
                  type="email"
                  required
                  placeholder="your.email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px 10px 38px',
                    borderRadius: '8px',
                    border: '1px solid #ebdcd0',
                    outline: 'none',
                    fontSize: '0.9rem'
                  }}
                />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: '600', color: '#4a3b32' }}>Password</label>
                <button
                  type="button"
                  onClick={() => { setMode('forgot'); setError(''); setSuccessMessage(''); }}
                  style={{ background: 'none', border: 'none', color: '#806657', fontSize: '0.8rem', cursor: 'pointer', padding: 0 }}
                >
                  Forgot password?
                </button>
              </div>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: '#a8988d' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 38px 10px 38px',
                    borderRadius: '8px',
                    border: '1px solid #ebdcd0',
                    outline: 'none',
                    fontSize: '0.9rem'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '12px', top: '12px', background: 'none', border: 'none', color: '#a8988d', cursor: 'pointer' }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '0.95rem',
                fontWeight: '600',
                marginTop: '6px'
              }}
            >
              {loading ? 'Authenticating...' : 'Sign In to Client Suite'}
            </button>

            <div style={{ textAlign: 'center', marginTop: '10px', fontSize: '0.85rem', color: '#8c7b70' }}>
              First time visiting?{' '}
              <button
                type="button"
                onClick={() => { setMode('register'); setError(''); setSuccessMessage(''); }}
                style={{ background: 'none', border: 'none', color: '#806657', fontWeight: '600', cursor: 'pointer' }}
              >
                Create Account
              </button>
            </div>
          </form>
        )}

        {/* Form: REGISTER */}
        {mode === 'register' && (
          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: '#4a3b32', marginBottom: '5px' }}>
                Full Name
              </label>
              <div style={{ position: 'relative' }}>
                <User size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: '#a8988d' }} />
                <input
                  type="text"
                  required
                  placeholder="e.g. Eleanor Vance"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px 10px 38px', borderRadius: '8px', border: '1px solid #ebdcd0', outline: 'none', fontSize: '0.9rem' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: '#4a3b32', marginBottom: '5px' }}>
                  Email Address
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: '#a8988d' }} />
                  <input
                    type="email"
                    required
                    placeholder="name@domain.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px 10px 38px', borderRadius: '8px', border: '1px solid #ebdcd0', outline: 'none', fontSize: '0.9rem' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: '#4a3b32', marginBottom: '5px' }}>
                  Phone Number
                </label>
                <div style={{ position: 'relative' }}>
                  <Phone size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: '#a8988d' }} />
                  <input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px 10px 38px', borderRadius: '8px', border: '1px solid #ebdcd0', outline: 'none', fontSize: '0.9rem' }}
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: '#4a3b32', marginBottom: '5px' }}>
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: '#a8988d' }} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Min 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{ width: '100%', padding: '10px 36px 10px 38px', borderRadius: '8px', border: '1px solid #ebdcd0', outline: 'none', fontSize: '0.9rem' }}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '10px', top: '10px', background: 'none', border: 'none', color: '#a8988d', cursor: 'pointer' }}>
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: '#4a3b32', marginBottom: '5px' }}>
                  Confirm Password
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: '#a8988d' }} />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    style={{ width: '100%', padding: '10px 36px 10px 38px', borderRadius: '8px', border: '1px solid #ebdcd0', outline: 'none', fontSize: '0.9rem' }}
                  />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} style={{ position: 'absolute', right: '10px', top: '10px', background: 'none', border: 'none', color: '#a8988d', cursor: 'pointer' }}>
                    {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginTop: '4px' }}>
              <input
                type="checkbox"
                id="terms"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                style={{ marginTop: '3px', cursor: 'pointer' }}
              />
              <label htmlFor="terms" style={{ fontSize: '0.8rem', color: '#6e5d53', lineHeight: '1.4' }}>
                I agree to the clinic <Link to="/privacy" style={{ color: '#806657', textDecoration: 'underline' }}>Privacy Policy</Link> and consent to receive clinical aftercare updates via email.
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{ width: '100%', padding: '12px', fontSize: '0.95rem', fontWeight: '600', marginTop: '6px' }}
            >
              {loading ? 'Creating Account...' : 'Create Account & Enter Suite'}
            </button>

            <div style={{ textAlign: 'center', marginTop: '6px', fontSize: '0.85rem', color: '#8c7b70' }}>
              Already registered?{' '}
              <button
                type="button"
                onClick={() => { setMode('login'); setError(''); setSuccessMessage(''); }}
                style={{ background: 'none', border: 'none', color: '#806657', fontWeight: '600', cursor: 'pointer' }}
              >
                Sign In
              </button>
            </div>
          </form>
        )}

        {/* Form: VERIFY OTP */}
        {mode === 'verify' && (
          <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: '#4a3b32', marginBottom: '8px', textAlign: 'center' }}>
                Enter 6-Digit Verification Code
              </label>
              <input
                type="text"
                required
                maxLength={6}
                placeholder="123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '10px',
                  border: '2px solid #806657',
                  textAlign: 'center',
                  fontSize: '1.6rem',
                  letterSpacing: '0.3em',
                  fontWeight: '700',
                  outline: 'none',
                  color: '#2c221e',
                  backgroundColor: '#faf8f5'
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                <span style={{ fontSize: '0.8rem', color: '#8c7b70' }}>Code valid for 5 minutes</span>
                <button
                  type="button"
                  disabled={cooldown > 0 || loading}
                  onClick={handleResendOtp}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: cooldown > 0 ? '#b0a49c' : '#806657',
                    fontWeight: '600',
                    fontSize: '0.8rem',
                    cursor: cooldown > 0 ? 'not-allowed' : 'pointer'
                  }}
                >
                  {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Code'}
                </button>
              </div>
              <div style={{ textAlign: 'center', marginTop: '12px' }}>
                <span style={{ fontSize: '0.75rem', color: '#8c7b70', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                  <ShieldCheck size={14} color="#806657" /> Secure 6-digit email verification via Brevo HTTPS delivery
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="btn-primary"
              style={{ width: '100%', padding: '12px', fontSize: '0.95rem', fontWeight: '600' }}
            >
              {loading ? 'Verifying...' : 'Verify Code & Enter Suite'}
            </button>

            <div style={{ textAlign: 'center' }}>
              <button
                type="button"
                onClick={() => { setMode('register'); setError(''); }}
                style={{ background: 'none', border: 'none', color: '#8c7b70', fontSize: '0.82rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              >
                <ArrowLeft size={14} /> Change Email
              </button>
            </div>
          </form>
        )}

        {/* Form: FORGOT PASSWORD */}
        {mode === 'forgot' && (
          <form onSubmit={handleForgotPassword} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: '#4a3b32', marginBottom: '6px' }}>
                Registered Email Address
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: '#a8988d' }} />
                <input
                  type="email"
                  required
                  placeholder="your.email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px 10px 38px', borderRadius: '8px', border: '1px solid #ebdcd0', outline: 'none', fontSize: '0.9rem' }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{ width: '100%', padding: '12px', fontSize: '0.95rem', fontWeight: '600' }}
            >
              {loading ? 'Sending Instructions...' : 'Send Reset Instructions'}
            </button>

            <div style={{ textAlign: 'center' }}>
              <button
                type="button"
                onClick={() => { setMode('login'); setError(''); setSuccessMessage(''); }}
                style={{ background: 'none', border: 'none', color: '#806657', fontSize: '0.85rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              >
                <ArrowLeft size={14} /> Back to Sign In
              </button>
            </div>
          </form>
        )}

        {/* Form: RESET PASSWORD */}
        {mode === 'reset' && (
          <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: '#4a3b32', marginBottom: '6px' }}>New Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: '#a8988d' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Min 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ width: '100%', padding: '10px 38px 10px 38px', borderRadius: '8px', border: '1px solid #ebdcd0', outline: 'none', fontSize: '0.9rem' }}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '12px', top: '12px', background: 'none', border: 'none', color: '#a8988d', cursor: 'pointer' }}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: '#4a3b32', marginBottom: '6px' }}>Confirm New Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: '#a8988d' }} />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={{ width: '100%', padding: '10px 38px 10px 38px', borderRadius: '8px', border: '1px solid #ebdcd0', outline: 'none', fontSize: '0.9rem' }}
                />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} style={{ position: 'absolute', right: '12px', top: '12px', background: 'none', border: 'none', color: '#a8988d', cursor: 'pointer' }}>
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{ width: '100%', padding: '12px', fontSize: '0.95rem', fontWeight: '600' }}
            >
              {loading ? 'Updating Password...' : 'Save New Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ClientAuth;
