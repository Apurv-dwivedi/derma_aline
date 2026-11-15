import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Calendar, LogOut, Phone, Mail, Clock, RefreshCw } from 'lucide-react';
import API from '../services/api';
import '../styles/pages.css';

const Profile = () => {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const fullName = localStorage.getItem('fullName') || 'Patient';
  const role = localStorage.getItem('role');

  useEffect(() => {
    // If not logged in, or is an admin masquerading as a patient, kick out
    if (!localStorage.getItem('token') || role !== 'PATIENT') {
      navigate('/auth');
      return;
    }
    fetchMyAppointments();
  }, [navigate, role]);

  const fetchMyAppointments = async () => {
    try {
      setLoading(true);
      // Calls the secure endpoint that identifies the user via JWT
      const res = await API.get('/appointments/my');
      // Sort newest first
      setAppointments(res.data.sort((a, b) => b.id - a.id));
      setError('');
    } catch (err) {
      console.error("Failed to load history:", err);
      setError('Could not load your appointment history.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('fullName');
    navigate('/');
  };

  return (
    <div className="internal-page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
        <div>
          <h1>My Profile</h1>
          <p style={{ color: 'var(--text-light)' }}>Welcome back, {fullName}</p>
        </div>
        <button className="btn-secondary" onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', fontWeight: '700' }}>
          <LogOut size={16} /> Logout
        </button>
      </div>

      <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap' }}>
        {/* Sidebar: Profile Summary */}
        <div style={{ flex: '1', minWidth: '280px', maxWidth: '350px', backgroundColor: 'var(--bg-white)', padding: '30px', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-soft)', border: '1px solid var(--border-light)', alignSelf: 'flex-start' }}>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <div style={{ width: '80px', height: '80px', backgroundColor: 'var(--color-accent)', color: '#fff', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '0 auto 15px auto' }}>
              <User size={40} />
            </div>
            <h3 style={{ fontSize: '1.2rem', color: 'var(--color-primary)', marginBottom: '5px' }}>{fullName}</h3>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-light)', backgroundColor: '#f0f0f0', padding: '4px 10px', borderRadius: '15px' }}>Registered Patient</span>
          </div>
          <hr style={{ border: 'none', borderTop: '1px solid var(--border-light)', margin: '20px 0' }} />
          <button className="btn-primary" onClick={() => navigate('/booking')} style={{ width: '100%', padding: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
            <Calendar size={18} /> Book New Visit
          </button>
        </div>

        {/* Main Content: Appointment History */}
        <div style={{ flex: '2', minWidth: '300px', backgroundColor: 'var(--bg-white)', padding: '30px', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-soft)', border: '1px solid var(--border-light)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
            <h2 style={{ fontSize: '1.4rem', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Clock size={24} color="var(--color-accent)" /> My Appointment History
            </h2>
            <button onClick={fetchMyAppointments} style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer' }}><RefreshCw size={18} /></button>
          </div>

          {error && <div style={{ padding: '15px', backgroundColor: '#f8d7da', color: '#721c24', borderRadius: '8px', marginBottom: '20px' }}>{error}</div>}

          {loading ? (
            <p style={{ textAlign: 'center', color: 'var(--text-light)', padding: '20px' }}>Loading your history...</p>
          ) : appointments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', backgroundColor: '#fafafa', borderRadius: '8px', border: '1px dashed var(--border-light)' }}>
              <p style={{ color: 'var(--text-light)', marginBottom: '15px' }}>You haven't booked any appointments yet.</p>
              <button className="btn-primary" onClick={() => navigate('/booking')} style={{ padding: '10px 20px' }}>Book Now</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {appointments.map((appt) => (
                <div key={appt.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-light)', backgroundColor: '#fff', transition: 'box-shadow 0.3s' }} onMouseEnter={(e) => e.currentTarget.style.boxShadow = 'var(--shadow-soft)'} onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', color: 'var(--color-primary)', marginBottom: '5px' }}>{appt.treatmentName}</h3>
                    <p style={{ color: 'var(--text-light)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Calendar size={14} /> {appt.appointmentDate} at {appt.appointmentTime}
                    </p>
                  </div>
                  <div>
                    <span style={{ 
                      padding: '6px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '700', 
                      backgroundColor: appt.status === 'CONFIRMED' ? '#d4edda' : appt.status === 'COMPLETED' ? '#cce5ff' : appt.status === 'PENDING' ? '#fff3cd' : '#f8d7da', 
                      color: appt.status === 'CONFIRMED' ? '#155724' : appt.status === 'COMPLETED' ? '#004085' : appt.status === 'PENDING' ? '#856404' : '#721c24' 
                    }}>
                      {appt.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;