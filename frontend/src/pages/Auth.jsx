import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Phone, Sparkles, AlertCircle } from 'lucide-react';
import API from '../services/api';
import '../styles/pages.css';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ fullName: '', email: '', phone: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        const response = await API.post('/auth/login', {
          email: formData.email,
          password: formData.password
        });
        
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('role', response.data.role);
        localStorage.setItem('fullName', response.data.fullName);
        
        if (response.data.role === 'ADMIN') navigate('/admin');
        else navigate('/profile');
        
      } else {
        await API.post('/auth/register', formData);
        alert('Registration successful! Please log in.');
        setIsLogin(true);
      }
    } catch (err) {
      console.error("Auth error:", err);
      setError(err.response?.data || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="internal-page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
      <div style={{ width: '100%', maxWidth: '450px', backgroundColor: 'var(--bg-white)', padding: '40px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-soft)' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <Sparkles size={32} color="var(--color-accent)" style={{ marginBottom: '10px' }} />
          <h2>{isLogin ? 'Welcome Back' : 'Create an Account'}</h2>
          <p style={{ color: 'var(--text-light)', fontSize: '0.9rem', marginTop: '5px' }}>
            {isLogin ? 'Log in to manage your appointments' : 'Join Derma Aline for premium skin care'}
          </p>
        </div>

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', backgroundColor: '#f8d7da', color: '#721c24', borderRadius: '8px', marginBottom: '20px', fontSize: '0.9rem' }}>
            <AlertCircle size={18} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <>
              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontWeight: '600' }}><User size={16} /> Full Name</label>
                <input type="text" name="fullName" className="form-input" placeholder="John Doe" value={formData.fullName} onChange={handleInputChange} required style={{ width: '100%', padding: '12px', borderRadius: '8px' }} />
              </div>
              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontWeight: '600' }}><Phone size={16} /> Phone Number</label>
                <input type="tel" name="phone" className="form-input" placeholder="9876543210" value={formData.phone} onChange={handleInputChange} required style={{ width: '100%', padding: '12px', borderRadius: '8px' }} />
              </div>
            </>
          )}

          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontWeight: '600' }}><Mail size={16} /> Email Address</label>
            <input type="email" name="email" className="form-input" placeholder="you@example.com" value={formData.email} onChange={handleInputChange} required style={{ width: '100%', padding: '12px', borderRadius: '8px' }} />
          </div>

          <div className="form-group" style={{ marginBottom: '25px' }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontWeight: '600' }}><Lock size={16} /> Password</label>
            <input type="password" name="password" className="form-input" placeholder="••••••••" value={formData.password} onChange={handleInputChange} required style={{ width: '100%', padding: '12px', borderRadius: '8px' }} />
          </div>

          <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', padding: '14px', fontSize: '1rem', fontWeight: '700' }}>
            {loading ? 'Processing...' : isLogin ? 'Login to Account' : 'Register Now'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <button onClick={() => { setIsLogin(!isLogin); setError(''); }} style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontWeight: '600', cursor: 'pointer' }}>
            {isLogin ? "Don't have an account? Sign up" : "Already have an account? Log in"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;