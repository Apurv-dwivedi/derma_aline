import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, Eye, EyeOff, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import API from '../services/api';
import '../styles/pages.css';

const StaffActivate = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleActivate = async (e) => {
    e.preventDefault();
    if (!token) {
      setError('Missing invitation token. Please check your invitation email.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await API.post('/auth/staff/activate', {
        token,
        password,
        fullName: fullName.trim()
      });

      const { token: jwtToken, role, fullName: staffName, email } = res.data;
      localStorage.setItem('token', jwtToken);
      localStorage.setItem('role', role || 'STAFF');
      localStorage.setItem('fullName', staffName || 'Clinic Staff');
      localStorage.setItem('email', email);

      setSuccess('Staff account activated successfully! Redirecting to your operational workspace...');
      setTimeout(() => navigate('/staff'), 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid or expired invitation token.');
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
      backgroundColor: '#fbf9f6'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '460px',
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        padding: '38px',
        border: '1px solid #ebdcd0',
        boxShadow: '0 10px 30px rgba(44, 34, 30, 0.05)'
      }}>
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
            <ShieldCheck size={14} color="#16a34a" /> Clinical Onboarding
          </div>
          <h1 style={{
            fontSize: '1.6rem',
            color: '#2c221e',
            fontFamily: 'var(--font-heading)',
            margin: '0 0 6px 0',
            fontWeight: '600'
          }}>
            Activate Staff Account
          </h1>
          <p style={{ color: '#8c7b70', fontSize: '0.88rem', margin: 0 }}>
            Welcome to the Derma Aline clinical team. Set your personal password below to activate your staff access.
          </p>
        </div>

        {error && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '12px 14px', backgroundColor: '#fef2f2', border: '1px solid #fecaca',
            color: '#991b1b', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '20px'
          }}>
            <AlertCircle size={18} /> <span>{error}</span>
          </div>
        )}

        {success && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '12px 14px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0',
            color: '#166534', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '20px'
          }}>
            <CheckCircle2 size={18} /> <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleActivate} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: '#4a3b32', marginBottom: '6px' }}>
              Full Name
            </label>
            <input
              type="text"
              placeholder="Confirm your legal name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #ebdcd0', outline: 'none', fontSize: '0.9rem' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: '#4a3b32', marginBottom: '6px' }}>
              Set Your Password
            </label>
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
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: '12px', top: '12px', background: 'none', border: 'none', color: '#a8988d', cursor: 'pointer' }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: '#4a3b32', marginBottom: '6px' }}>
              Confirm Password
            </label>
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
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                style={{ position: 'absolute', right: '12px', top: '12px', background: 'none', border: 'none', color: '#a8988d', cursor: 'pointer' }}
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{ width: '100%', padding: '12px', fontSize: '0.95rem', fontWeight: '600', marginTop: '6px' }}
          >
            {loading ? 'Activating Account...' : 'Activate Account & Access Workspace'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default StaffActivate;
