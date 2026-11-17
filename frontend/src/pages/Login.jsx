import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, Sparkles, AlertCircle, Shield } from 'lucide-react';
import API from '../services/api';
import '../styles/pages.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await API.post('/auth/login', { 
        email, 
        password, 
        portal: 'internal' 
      });
      const { token, role, fullName } = response.data;

      const upperRole = (role || '').toUpperCase();

      if (upperRole !== 'ADMIN' && upperRole !== 'SUPER_ADMIN' && upperRole !== 'STAFF') {
        setError('Access Denied: Patient accounts cannot access internal staff portals.');
        setLoading(false);
        return;
      }

      localStorage.setItem('token', token || 'authenticated');
      localStorage.setItem('role', role);
      localStorage.setItem('fullName', fullName || '');
      localStorage.setItem('email', email);

      // Route workers to Staff Workspace, and managers to Full Admin Dashboard
      if (upperRole === 'STAFF') {
        navigate('/staff');
      } else {
        navigate('/admin');
      }
    } catch (err) {
      console.error("Internal login failed:", err);
      setError(err.response?.data?.message || 'Invalid credentials or access restricted.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="internal-page" style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '80vh',
      padding: '20px'
    }}>
      <div style={{ 
        width: '100%', 
        maxWidth: '440px', 
        backgroundColor: 'var(--bg-white, #ffffff)', 
        padding: '35px 25px', 
        borderRadius: '12px', 
        border: '1px solid var(--border-light, #e2d9cf)', 
        boxShadow: '0 4px 20px rgba(0,0,0,0.06)' 
      }}>
        
        <div style={{ textAlign: 'center', marginBottom: '25px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '56px',
            height: '56px',
            backgroundColor: '#f5efe6',
            borderRadius: '50%',
            marginBottom: '12px'
          }}>
            <Shield size={28} color="#7c6a5d" />
          </div>
          <h2 style={{ fontSize: '1.5rem', color: '#3a2d24', margin: '0 0 5px 0', fontWeight: '700' }}>
            Salon Team Portal
          </h2>
          <p style={{ color: '#8c7b70', fontSize: '0.88rem', margin: 0 }}>
            Dedicated Workspace for Administrators & Therapists
          </p>
        </div>

        {error && (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            padding: '12px', 
            backgroundColor: '#fef2f2', 
            color: '#991b1b', 
            borderRadius: '8px', 
            marginBottom: '20px', 
            fontSize: '0.88rem',
            lineHeight: '1.4'
          }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} /> 
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="form-group" style={{ marginBottom: '18px' }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontWeight: '600', fontSize: '0.9rem', color: '#4a3b30' }}>
              <Mail size={16} color="#7c6a5d" /> Staff / Admin Email
            </label>
            <input 
              type="email" 
              className="form-input" 
              placeholder="name@dermaaline.com" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #d4c5b9', boxSizing: 'border-box' }} 
            />
          </div>

          <div className="form-group" style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0, fontWeight: '600', fontSize: '0.9rem', color: '#4a3b30' }}>
                <Lock size={16} color="#7c6a5d" /> Password
              </label>
              <a href="/auth?mode=forgot" style={{ fontSize: '0.82rem', color: '#7c6a5d', textDecoration: 'none', fontWeight: '500' }}>
                Forgot Password?
              </a>
            </div>
            <input 
              type="password" 
              className="form-input" 
              placeholder="••••••••••••" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #d4c5b9', boxSizing: 'border-box' }} 
            />
          </div>

          <button 
            type="submit" 
            className="btn-primary" 
            disabled={loading} 
            style={{ 
              width: '100%', 
              padding: '13px', 
              fontSize: '1rem', 
              fontWeight: '700',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Authenticating...' : 'Sign In to Workspace'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '22px', borderTop: '1px solid #f0eae1', paddingTop: '15px' }}>
          <p style={{ fontSize: '0.82rem', color: '#a39284', margin: 0 }}>
            Public patient? <a href="/auth" style={{ color: '#7c6a5d', fontWeight: '600', textDecoration: 'none' }}>Go to Patient Login</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
