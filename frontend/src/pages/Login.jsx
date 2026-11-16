import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, Sparkles, AlertCircle } from 'lucide-react';
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
      const response = await API.post('/auth/login', { email, password });
      const { token, role, fullName } = response.data;

      if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
        setError('Access Denied: You do not have administrative privileges.');
        setLoading(false);
        return;
      }

      localStorage.setItem('token', token || 'authenticated');
      localStorage.setItem('role', role);
      localStorage.setItem('fullName', fullName || '');

      navigate('/admin');
    } catch (err) {
      console.error("Login failed:", err);
      setError('Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="internal-page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
      <div style={{ width: '100%', maxWidth: '450px', backgroundColor: 'var(--bg-white)', padding: '40px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-soft)' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <Sparkles size={32} color="var(--color-accent)" style={{ marginBottom: '10px' }} />
          <p style={{ color: 'var(--text-light)', fontSize: '0.9rem', marginTop: '5px' }}>
            Derma Aline Aesthetics Management
          </p>
        </div>

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', backgroundColor: '#f8d7da', color: '#721c24', borderRadius: '8px', marginBottom: '20px', fontSize: '0.9rem' }}>
            <AlertCircle size={18} /> {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontWeight: '600' }}>
              <Mail size={16} color="var(--color-accent)" /> Admin Email
            </label>
            <input 
              type="email" 
              className="form-input" 
              placeholder="admin@dermaaline.com" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-light)' }} 
            />
          </div>

          <div className="form-group" style={{ marginBottom: '25px' }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontWeight: '600' }}>
              <Lock size={16} color="var(--color-accent)" /> Password
            </label>
            <input 
              type="password" 
              className="form-input" 
              placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-light)' }} 
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', padding: '14px', fontSize: '1rem', fontWeight: '700' }}>
            {loading ? 'Authenticating...' : 'Secure Login'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
