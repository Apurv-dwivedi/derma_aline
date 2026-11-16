import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Eye, EyeOff, KeyRound, Mail, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import axios from 'axios';

const Auth = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Mode can be: 'login', 'register', 'forgot', 'reset'
  const [mode, setMode] = useState('login');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [directResetToken, setDirectResetToken] = useState('');

  // Status states
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://derma-aline.onrender.com/api';

  useEffect(() => {
    const tokenFromUrl = searchParams.get('resetToken') || searchParams.get('token');
    const modeFromUrl = searchParams.get('mode');

    if (tokenFromUrl) {
      setResetToken(tokenFromUrl);
      setMode('reset');
    } else if (modeFromUrl === 'forgot') {
      setMode('forgot');
    }
  }, [searchParams]);

  const handleLoginOrRegister = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      if (mode === 'login') {
        const response = await axios.post(`${API_BASE_URL}/auth/login`, { 
          email, 
          password, 
          portal: 'public' 
        });
        const { token, role, fullName } = response.data;
        const tokenToStore = token || response.data.accessToken || 'authenticated';
        localStorage.setItem('token', tokenToStore);
        if (role) localStorage.setItem('role', role);
        if (fullName) localStorage.setItem('fullName', fullName);

        setMessage('Login Successful! Redirecting...');
        setTimeout(() => {
          navigate('/');
        }, 600);
      } else {
        await axios.post(`${API_BASE_URL}/auth/register`, { 
          fullName: name, 
          name, 
          email, 
          password 
        });
        setMessage('Registration successful! Please sign in with your credentials.');
        setMode('login');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!email || !email.trim()) {
      setError('Please provide your registered email address.');
      return;
    }

    setError('');
    setMessage('');
    setLoading(true);

    try {
      const response = await axios.post(`${API_BASE_URL}/auth/forgot-password`, { 
        email: email.trim() 
      });
      setMessage(response.data?.message || 'Password reset instructions have been sent to your email.');
      if (response.data?.token) {
        setDirectResetToken(response.data.token);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to process reset request. Please verify your email.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!password) {
      setError('Please enter a new password.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    setError('');
    setMessage('');
    setLoading(true);

    try {
      const response = await axios.post(`${API_BASE_URL}/auth/reset-password`, { 
        token: resetToken, 
        newPassword: password 
      });
      setMessage(response.data?.message || 'Password reset successfully! Redirecting to login...');
      setTimeout(() => {
        setMode('login');
        setPassword('');
        setConfirmPassword('');
      }, 1800);
    } catch (err) {
      setError(err.response?.data?.message || 'Reset link is invalid or has expired. Please request a new one.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '80vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px',
      backgroundColor: '#fdfbf7'
    }}>
      <div style={{
        maxWidth: '440px',
        width: '100%',
        backgroundColor: '#ffffff',
        padding: '35px',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(128, 102, 87, 0.1)',
        border: '1px solid #e6ded5'
      }}>

        {/* Header Section */}
        <div style={{ textAlign: 'center', marginBottom: '25px' }}>
          <h2 style={{
            fontFamily: 'var(--font-heading, serif)',
            color: 'var(--color-primary, #5a4638)',
            fontSize: '1.75rem',
            marginBottom: '8px',
            fontWeight: '600'
          }}>
            {mode === 'login' && 'Welcome Back'}
            {mode === 'register' && 'Create Account'}
            {mode === 'forgot' && 'Reset Password'}
            {mode === 'reset' && 'Set New Password'}
          </h2>
          <p style={{ color: '#8c7b70', fontSize: '0.9rem', margin: 0 }}>
            {mode === 'login' && 'Sign in to access your appointments and care records'}
            {mode === 'register' && 'Join Derma Aline for personalized aesthetic care'}
            {mode === 'forgot' && "Enter your email and we'll send you a password reset link"}
            {mode === 'reset' && 'Create a new secure password for your account'}
          </p>
        </div>

        {/* Feedback Alerts */}
        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 14px', backgroundColor: '#fef2f2', color: '#991b1b', fontSize: '0.88rem', borderRadius: '8px', marginBottom: '18px', border: '1px solid #fecaca' }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {message && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 14px', backgroundColor: '#f0fdf4', color: '#166534', fontSize: '0.88rem', borderRadius: '8px', marginBottom: '18px', border: '1px solid #bbf7d0' }}>
            <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
            <span>{message}</span>
          </div>
        )}

        {/* Mode: Forgot Password */}
        {mode === 'forgot' && (
          <form onSubmit={handleForgotPassword} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {directResetToken && (
              <div style={{ padding: '16px', backgroundColor: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0', textAlign: 'center', marginBottom: '10px' }}>
                <p style={{ margin: '0 0 12px 0', fontSize: '0.88rem', color: '#166534', fontWeight: '600' }}>
                  Secure reset authorization generated!
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setResetToken(directResetToken);
                    setMode('reset');
                    setError('');
                    setMessage('');
                  }}
                  style={{
                    backgroundColor: '#16a34a',
                    color: '#ffffff',
                    border: 'none',
                    padding: '10px 18px',
                    borderRadius: '6px',
                    fontSize: '0.9rem',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Set New Password Now &rarr;
                </button>
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '500', color: '#5a4638', marginBottom: '8px' }}>
                Your Registered Email Address
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  style={{
                    width: '100%',
                    padding: '12px 15px',
                    borderRadius: '8px',
                    border: '1px solid #dcd3cb',
                    fontSize: '1rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                backgroundColor: '#6ba8c9',
                color: '#ffffff',
                padding: '12px',
                borderRadius: '8px',
                border: 'none',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background 0.2s'
              }}
            >
              {loading ? 'Sending Reset Link...' : 'Send Password Reset Link'}
            </button>

            <button
              type="button"
              onClick={() => { setMode('login'); setError(''); setMessage(''); }}
              style={{
                background: 'none',
                border: 'none',
                color: '#7c6252',
                fontSize: '0.9rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                fontWeight: '600',
                padding: '8px 0'
              }}
            >
              <ArrowLeft size={16} /> Back to Sign In
            </button>
          </form>
        )}

        {/* Mode: Reset Password (From Email Link) */}
        {mode === 'reset' && (
          <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '500', color: '#5a4638', marginBottom: '8px' }}>
                New Password (Min. 6 characters)
              </label>
              <div style={{ position: 'relative', width: '100%', boxSizing: 'border-box' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter new password"
                  style={{
                    width: '100%',
                    padding: '12px 45px 12px 15px',
                    borderRadius: '8px',
                    border: '1px solid #dcd3cb',
                    fontSize: '1rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#7c6252',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0'
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '500', color: '#5a4638', marginBottom: '8px' }}>
                Confirm New Password
              </label>
              <div style={{ position: 'relative', width: '100%', boxSizing: 'border-box' }}>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  style={{
                    width: '100%',
                    padding: '12px 45px 12px 15px',
                    borderRadius: '8px',
                    border: '1px solid #dcd3cb',
                    fontSize: '1rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#7c6252',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0'
                  }}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                backgroundColor: '#6ba8c9',
                color: '#ffffff',
                padding: '12px',
                borderRadius: '8px',
                border: 'none',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background 0.2s'
              }}
            >
              {loading ? 'Updating Password...' : 'Save New Password'}
            </button>

            <button
              type="button"
              onClick={() => { setMode('login'); setError(''); setMessage(''); }}
              style={{
                background: 'none',
                border: 'none',
                color: '#7c6252',
                fontSize: '0.9rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                fontWeight: '600',
                padding: '8px 0'
              }}
            >
              <ArrowLeft size={16} /> Back to Sign In
            </button>
          </form>
        )}

        {/* Mode: Login or Register */}
        {(mode === 'login' || mode === 'register') && (
          <form onSubmit={handleLoginOrRegister} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {mode === 'register' && (
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '500', color: '#5a4638', marginBottom: '8px' }}>
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  style={{
                    width: '100%',
                    padding: '12px 15px',
                    borderRadius: '8px',
                    border: '1px solid #dcd3cb',
                    fontSize: '1rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '500', color: '#5a4638', marginBottom: '8px' }}>
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                style={{
                  width: '100%',
                  padding: '12px 15px',
                  borderRadius: '8px',
                  border: '1px solid #dcd3cb',
                  fontSize: '1rem',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '500', color: '#5a4638', marginBottom: '8px' }}>
                Password
              </label>
              <div style={{ position: 'relative', width: '100%', boxSizing: 'border-box' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  style={{
                    width: '100%',
                    padding: '12px 45px 12px 15px',
                    borderRadius: '8px',
                    border: '1px solid #dcd3cb',
                    fontSize: '1rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#7c6252',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0'
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {mode === 'login' && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '-10px' }}>
                <button
                  type="button"
                  onClick={() => { setMode('forgot'); setError(''); setMessage(''); }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#7c6252',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    fontWeight: '600',
                    padding: 0
                  }}
                >
                  Forgot Password?
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                backgroundColor: '#6ba8c9',
                color: '#ffffff',
                padding: '12px',
                borderRadius: '8px',
                border: 'none',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background 0.2s',
                marginTop: '5px'
              }}
            >
              {loading ? 'Processing...' : (mode === 'login' ? 'Login' : 'Register')}
            </button>
          </form>
        )}

        {/* Toggle Login / Register */}
        {(mode === 'login' || mode === 'register') && (
          <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.9rem', color: '#666' }}>
            {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
            <button
              type="button"
              onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); setMessage(''); }}
              style={{
                background: 'none',
                border: 'none',
                color: '#7c6252',
                fontWeight: '600',
                cursor: 'pointer',
                fontSize: '0.9rem',
                padding: 0
              }}
            >
              {mode === 'login' ? 'Sign up' : 'Login'}
            </button>
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: '16px', paddingTop: '14px', borderTop: '1px solid #f0eae1' }}>
          <Link to="/admin-login" style={{ fontSize: '0.82rem', color: '#8c7b70', textDecoration: 'none' }}>
            Salon Therapist / Admin? <span style={{ color: '#5a4638', fontWeight: '600' }}>Team Portal &rarr;</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Auth;
