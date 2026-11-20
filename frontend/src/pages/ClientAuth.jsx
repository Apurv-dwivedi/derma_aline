import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, User, Phone, CheckCircle2, AlertCircle, ArrowLeft, RefreshCw, Sparkles, ShieldCheck } from 'lucide-react';
import API from '../services/api';
import {
  supabase,
  isSupabaseConfigured,
  signInWithGoogleSSO,
  signUpWithSupabase,
  verifySupabaseOtp,
  requestSupabasePasswordReset,
  updateSupabasePassword
} from '../services/supabaseClient';
import '../styles/pages.css';

/**
 * Derma Aline Aesthétics Client Portal Authentication
 * Supports:
 * - Google SSO via Supabase Auth
 * - Self-Registration with Supabase / Email OTP Verification
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

  // Detect Supabase OAuth Redirect or Active Session on Load
  useEffect(() => {
    const checkSupabaseSession = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          console.warn('Supabase session inspection notice:', sessionError.message);
          return;
        }

        if (session?.user) {
          const user = session.user;
          const userMeta = user.user_metadata || {};
          const detectedFullName = userMeta.full_name || userMeta.name || 'Valued Client';
          const detectedPhone = userMeta.phone || user.phone || '';
          const provider = user.app_metadata?.provider || 'google';

          setLoading(true);
          const res = await API.post('/auth/sync-supabase-user', {
            email: user.email,
            fullName: detectedFullName,
            phone: detectedPhone,
            provider
          });

          if (res.data?.token) {
            localStorage.setItem('token', res.data.token);
            localStorage.setItem('role', res.data.role || 'CUSTOMER');
            localStorage.setItem('fullName', res.data.fullName || detectedFullName);
            localStorage.setItem('email', user.email);
            if (res.data.profilePicture) {
              localStorage.setItem('profilePicture', res.data.profilePicture);
            }

            // Remove URL hash tokens to clean address bar
            if (window.location.hash) {
              window.history.replaceState(null, '', window.location.pathname);
            }

            navigate('/client/dashboard');
          }
        }
      } catch (err) {
        console.warn('OAuth session sync notice:', err);
      } finally {
        setLoading(false);
      }
    };

    checkSupabaseSession();
  }, [navigate]);

  // Google SSO Handler
  const handleGoogleSSO = async () => {
    setLoading(true);
    setError('');
    setSuccessMessage('');
    try {
      if (!isSupabaseConfigured()) {
        setError('Google SSO is awaiting configuration in your clinic environment. Please sign in with email.');
        setLoading(false);
        return;
      }
      await signInWithGoogleSSO('/client/login');
    } catch (err) {
      setError(err?.message || 'Google SSO could not be initiated.');
      setLoading(false);
    }
  };

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

    // If Supabase is configured, use Supabase Auth for high-deliverability email OTP
    if (isSupabaseConfigured()) {
      try {
        await signUpWithSupabase(email, password, fullName, phone);
        setSuccessMessage(`A 6-digit verification code has been dispatched to ${email.trim()}. Please enter it below.`);
        setMode('verify');
        setCooldown(60);
        setLoading(false);
        return;
      } catch (sbErr) {
        if (sbErr.message && sbErr.message.toLowerCase().includes('already registered')) {
          setError('This email address is already registered. Please sign in or reset your password.');
          setLoading(false);
          return;
        }
        console.warn('Supabase sign-up error, falling back to direct backend registration:', sbErr.message);
      }
    }

    // Direct backend registration
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

    // If Supabase is configured, verify through Supabase Auth
    if (isSupabaseConfigured()) {
      try {
        const data = await verifySupabaseOtp(email, otp);
        if (data?.session || data?.user) {
          const res = await API.post('/auth/sync-supabase-user', {
            email: email.trim().toLowerCase(),
            fullName: fullName.trim() || 'Valued Client',
            phone: phone.trim(),
            provider: 'supabase_email_otp'
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

          setSuccessMessage('Account verified successfully! Entering your private suite...');
          setTimeout(() => navigate('/client/dashboard'), 600);
          return;
        }
      } catch (sbErr) {
        console.warn('Supabase OTP verification notice, attempting backend verification:', sbErr.message);
      }
    }

    // Direct backend OTP verification
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
      setTimeout(() => navigate('/client/dashboard'), 800);
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

    if (isSupabaseConfigured()) {
      try {
        await signUpWithSupabase(email, password || 'DermaAlineTemp@2026', fullName, phone);
        setSuccessMessage(`A fresh verification code has been dispatched to ${email.trim()}.`);
        setCooldown(60);
        setLoading(false);
        return;
      } catch (sbErr) {
        console.warn('Supabase resend notice:', sbErr.message);
      }
    }

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

    let supabaseSent = false;
    if (isSupabaseConfigured()) {
      try {
        await requestSupabasePasswordReset(email);
        supabaseSent = true;
      } catch (sbErr) {
        console.warn('Supabase password reset notice:', sbErr.message);
      }
    }

    try {
      const res = await API.post('/auth/forgot-password', {
        email: email.trim().toLowerCase()
      });
      setSuccessMessage(res.data.message || 'If an account exists with that email, password reset instructions have been sent.');
    } catch (err) {
      if (supabaseSent) {
        setSuccessMessage('Password reset instructions have been dispatched to your email address.');
      } else {
        setError(err.response?.data?.message || 'Request failed. Please try again.');
      }
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

    if (isSupabaseConfigured()) {
      try {
        await updateSupabasePassword(password);
      } catch (sbErr) {
        console.warn('Supabase password update notice:', sbErr.message);
      }
    }

    try {
      // Sync password with backend
      await API.post('/auth/sync-password', {
        email: email.trim().toLowerCase(),
        newPassword: password
      });
      setSuccessMessage('Your password has been updated successfully! Redirecting to sign in...');
      setTimeout(() => setMode('login'), 1500);
    } catch (err) {
      if (resetToken) {
        try {
          const res = await API.post('/auth/reset-password', {
            token: resetToken.trim(),
            newPassword: password
          });
          setSuccessMessage(res.data.message);
          setTimeout(() => setMode('login'), 1500);
          return;
        } catch (innerErr) {
          setError(innerErr.response?.data?.message || 'Password reset link has expired.');
          return;
        }
      }
      setError(err.response?.data?.message || 'Failed to update password. Please request a new reset link.');
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

        {/* Google SSO Button (Login & Register modes) */}
        {(mode === 'login' || mode === 'register') && (
          <div style={{ marginBottom: '20px' }}>
            <button
              type="button"
              onClick={handleGoogleSSO}
              disabled={loading}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                padding: '11px 16px',
                backgroundColor: '#ffffff',
                border: '1px solid #d4c4b7',
                borderRadius: '8px',
                color: '#2c221e',
                fontSize: '0.9rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 4px rgba(0,0,0,0.03)'
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.03h3.88c2.27-2.09 3.665-5.17 3.665-9.12z"/>
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.03c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.13C3.25 21.37 7.34 24 12 24z"/>
                <path fill="#FBBC05" d="M5.28 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.58H1.26C.46 8.18 0 9.99 0 12s.46 3.82 1.26 5.42l4.02-3.13z"/>
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.25 2.63 1.26 6.58l4.02 3.13c.95-2.83 3.6-4.96 6.72-4.96z"/>
              </svg>
              Continue with Google
            </button>

            <div style={{ display: 'flex', alignItems: 'center', margin: '18px 0', gap: '12px' }}>
              <div style={{ flex: 1, height: '1px', backgroundColor: '#ebdcd0' }}></div>
              <span style={{ fontSize: '0.75rem', color: '#a8988d', textTransform: 'uppercase', letterSpacing: '0.05em' }}>OR CONTINUE WITH EMAIL</span>
              <div style={{ flex: 1, height: '1px', backgroundColor: '#ebdcd0' }}></div>
            </div>
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
                  <ShieldCheck size={14} color="#806657" /> Secure 6-digit verification code sent directly to your email inbox
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
