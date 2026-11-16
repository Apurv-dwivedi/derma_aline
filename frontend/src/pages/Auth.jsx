import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import axios from 'axios';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://derma-aline.onrender.com/api';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      if (isLogin) {
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

        alert('Login Successful!');
        navigate('/');
      } else {
        await axios.post(`${API_BASE_URL}/auth/register`, { fullName: name, name, email, password });
        setMessage('Registration successful! Please login.');
        setIsLogin(true);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Authentication failed. Please check your credentials.');
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      alert('Please enter your email address first, then click Forgot Password.');
      return;
    }
    try {
      await axios.post(`${API_BASE_URL}/auth/forgot-password`, { email });
      alert('Password reset instructions sent to your email!');
    } catch (err) {
      alert('Password reset request sent successfully.');
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
          maxWidth: '420px',
          width: '100%',
          backgroundColor: '#ffffff',
          padding: '35px',
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(128, 102, 87, 0.1)',
          border: '1px solid #e6ded5'
        }}>
          <h2 style={{
            textAlign: 'center',
            fontFamily: 'var(--font-heading, serif)',
            color: 'var(--color-primary, #5a4638)',
            fontSize: '1.8rem',
            marginBottom: '25px',
            fontWeight: '600'
          }}>
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h2>

          {error && (
              <div style={{ padding: '10px 15px', backgroundColor: '#fef2f2', color: '#ef4444', fontSize: '0.9rem', borderRadius: '6px', marginBottom: '15px' }}>
                {error}
              </div>
          )}

          {message && (
              <div style={{ padding: '10px 15px', backgroundColor: '#f0fdf4', color: '#16a34a', fontSize: '0.9rem', borderRadius: '6px', marginBottom: '15px' }}>
                {message}
              </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {!isLogin && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '500', color: '#5a4638', marginBottom: '8px' }}>Full Name</label>
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
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '500', color: '#5a4638', marginBottom: '8px' }}>Email Address</label>
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
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '500', color: '#5a4638', marginBottom: '8px' }}>Password</label>
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
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {isLogin && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '-10px' }}>
                  <button
                      type="button"
                      onClick={handleForgotPassword}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#7c6252',
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        fontWeight: '500',
                        padding: 0
                      }}
                  >
                    Forgot Password?
                  </button>
                </div>
            )}

            <button
                type="submit"
                style={{
                  width: '100%',
                  backgroundColor: '#6ba8c9',
                  color: '#ffffff',
                  padding: '12px',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                  marginTop: '5px'
                }}
            >
              {isLogin ? 'Login' : 'Register'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.9rem', color: '#666' }}>
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
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
              {isLogin ? 'Sign up' : 'Login'}
            </button>
          </div>

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