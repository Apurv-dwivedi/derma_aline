import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, CheckCircle, Clock, RefreshCw, LogOut, 
  Search, XCircle, UserCheck, ShieldCheck, Phone, Filter
} from 'lucide-react';
import API from '../services/api';
import '../styles/pages.css';

const StaffDashboard = () => {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const staffName = localStorage.getItem('fullName') || 'Clinic Therapist';
  const staffRole = localStorage.getItem('role') || 'STAFF';

  const fetchStaffQueue = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await API.get('/staff/appointments');
      setAppointments(response.data.sort((a, b) => b.id - a.id));
    } catch (err) {
      console.error('Failed to fetch staff queue:', err);
      setError('Unable to fetch appointment queue. Please check your network connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaffQueue();
  }, []);

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      await API.patch(`/staff/appointments/${id}/status`, { status: newStatus });
      setSuccessMessage(`Appointment #${id} updated to ${newStatus}`);
      setTimeout(() => setSuccessMessage(''), 3000);
      fetchStaffQueue();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update status.');
      setTimeout(() => setError(''), 4000);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('fullName');
    navigate('/admin-login');
  };

  const filteredAppointments = appointments.filter((appt) => {
    const matchesSearch = 
      (appt.customerName && appt.customerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (appt.treatmentName && appt.treatmentName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (appt.customerPhone && appt.customerPhone.includes(searchTerm));
    const matchesStatus = statusFilter === 'ALL' || appt.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const pendingCount = appointments.filter((a) => a.status === 'PENDING').length;
  const confirmedCount = appointments.filter((a) => a.status === 'CONFIRMED').length;
  const completedCount = appointments.filter((a) => a.status === 'COMPLETED').length;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px 15px' }}>
      {/* Top Header Card */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '15px',
        backgroundColor: '#ffffff',
        padding: '24px',
        borderRadius: '12px',
        border: '1px solid #e2d9cf',
        boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
        marginBottom: '25px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <h1 style={{ fontSize: '1.6rem', color: '#3a2d24', margin: 0, fontWeight: '700' }}>
              Salon Staff Workspace
            </h1>
            <span style={{
              backgroundColor: '#e0f2fe',
              color: '#0369a1',
              padding: '3px 10px',
              borderRadius: '20px',
              fontSize: '0.75rem',
              fontWeight: '700',
              letterSpacing: '0.5px'
            }}>
              {staffRole}
            </span>
          </div>
          <p style={{ margin: 0, color: '#7c6a5d', fontSize: '0.95rem' }}>
            Logged in as <b>{staffName}</b> &bull; Appointment queue and service execution
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={fetchStaffQueue}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 16px',
              backgroundColor: '#f5efe6',
              border: '1px solid #d9cbbe',
              borderRadius: '8px',
              color: '#4a3b30',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={16} /> Refresh
          </button>
          <button 
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 16px',
              backgroundColor: '#fee2e2',
              border: '1px solid #fca5a5',
              borderRadius: '8px',
              color: '#991b1b',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            <LogOut size={16} /> Exit
          </button>
        </div>
      </div>

      {/* Privacy Notice Banner */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        backgroundColor: '#f0fdf4',
        border: '1px solid #bbf7d0',
        color: '#166534',
        padding: '12px 18px',
        borderRadius: '8px',
        fontSize: '0.88rem',
        marginBottom: '25px'
      }}>
        <ShieldCheck size={20} color="#16a34a" />
        <span>
          <b>Role Partition Active:</b> Staff access is restricted to operational service appointments. Sensitive patient medical history, billing records, and administrative user management remain isolated.
        </span>
      </div>

      {/* Metric Counters */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '15px',
        marginBottom: '25px'
      }}>
        <div style={{ backgroundColor: '#ffffff', padding: '18px', borderRadius: '10px', border: '1px solid #e6ded5', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ color: '#8c7b70', fontSize: '0.85rem', fontWeight: '600', marginBottom: '5px' }}>TOTAL ASSIGNED</div>
          <div style={{ fontSize: '1.8rem', fontWeight: '700', color: '#2c221e' }}>{appointments.length}</div>
        </div>
        <div style={{ backgroundColor: '#ffffff', padding: '18px', borderRadius: '10px', border: '1px solid #fef08a', borderLeft: '4px solid #ca8a04', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ color: '#854d0e', fontSize: '0.85rem', fontWeight: '600', marginBottom: '5px' }}>PENDING REVIEW</div>
          <div style={{ fontSize: '1.8rem', fontWeight: '700', color: '#ca8a04' }}>{pendingCount}</div>
        </div>
        <div style={{ backgroundColor: '#ffffff', padding: '18px', borderRadius: '10px', border: '1px solid #bae6fd', borderLeft: '4px solid #0284c7', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ color: '#0369a1', fontSize: '0.85rem', fontWeight: '600', marginBottom: '5px' }}>CONFIRMED QUEUE</div>
          <div style={{ fontSize: '1.8rem', fontWeight: '700', color: '#0284c7' }}>{confirmedCount}</div>
        </div>
        <div style={{ backgroundColor: '#ffffff', padding: '18px', borderRadius: '10px', border: '1px solid #bbf7d0', borderLeft: '4px solid #16a34a', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ color: '#166534', fontSize: '0.85rem', fontWeight: '600', marginBottom: '5px' }}>COMPLETED</div>
          <div style={{ fontSize: '1.8rem', fontWeight: '700', color: '#16a34a' }}>{completedCount}</div>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div style={{ padding: '12px 18px', backgroundColor: '#fef2f2', color: '#991b1b', borderRadius: '8px', marginBottom: '20px' }}>
          {error}
        </div>
      )}
      {successMessage && (
        <div style={{ padding: '12px 18px', backgroundColor: '#f0fdf4', color: '#166534', borderRadius: '8px', marginBottom: '20px' }}>
          {successMessage}
        </div>
      )}

      {/* Search and Filters Bar */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '12px',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#ffffff',
        padding: '16px',
        borderRadius: '10px',
        border: '1px solid #e6ded5',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1', minWidth: '240px' }}>
          <Search size={18} color="#8c7b70" />
          <input 
            type="text"
            placeholder="Search patient name, treatment, phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', border: 'none', outline: 'none', fontSize: '0.95rem' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Filter size={16} color="#8c7b70" />
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #d4c5b9', outline: 'none', fontSize: '0.9rem' }}
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Appointments List / Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '50px 0', color: '#8c7b70' }}>Loading appointment queue...</div>
      ) : filteredAppointments.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid #e6ded5', color: '#8c7b70' }}>
          No appointments found matching your search.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {filteredAppointments.map((appt) => (
            <div 
              key={appt.id}
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '10px',
                border: '1px solid #e6ded5',
                padding: '20px',
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '15px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
              }}
            >
              {/* Left Details */}
              <div style={{ minWidth: '260px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '1.1rem', fontWeight: '700', color: '#2c221e' }}>{appt.customerName}</span>
                  <span style={{
                    padding: '3px 10px',
                    borderRadius: '12px',
                    fontSize: '0.75rem',
                    fontWeight: '700',
                    backgroundColor: 
                      appt.status === 'CONFIRMED' ? '#e0f2fe' :
                      appt.status === 'COMPLETED' ? '#dcfce7' :
                      appt.status === 'CANCELLED' ? '#fee2e2' : '#fef9c3',
                    color: 
                      appt.status === 'CONFIRMED' ? '#0369a1' :
                      appt.status === 'COMPLETED' ? '#15803d' :
                      appt.status === 'CANCELLED' ? '#b91c1c' : '#854d0e'
                  }}>
                    {appt.status}
                  </span>
                </div>
                <div style={{ color: '#6b584c', fontSize: '0.9rem', marginBottom: '4px' }}>
                  Treatment: <b>{appt.treatmentName}</b>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', color: '#8c7b70', fontSize: '0.85rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Calendar size={14} /> {appt.appointmentDate ? appt.appointmentDate.replace('T', ' ') : 'N/A'}
                  </span>
                  {appt.customerPhone && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Phone size={14} /> {appt.customerPhone}
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons (CTAs) */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {appt.status !== 'CONFIRMED' && appt.status !== 'COMPLETED' && (
                  <button 
                    onClick={() => handleUpdateStatus(appt.id, 'CONFIRMED')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '8px 14px',
                      backgroundColor: '#0284c7',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '0.85rem',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    <CheckCircle size={15} /> Confirm
                  </button>
                )}

                {appt.status !== 'COMPLETED' && (
                  <button 
                    onClick={() => handleUpdateStatus(appt.id, 'COMPLETED')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '8px 14px',
                      backgroundColor: '#16a34a',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '0.85rem',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    <UserCheck size={15} /> Complete
                  </button>
                )}

                {appt.status !== 'CANCELLED' && (
                  <button 
                    onClick={() => handleUpdateStatus(appt.id, 'CANCELLED')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '8px 14px',
                      backgroundColor: '#ef4444',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '0.85rem',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    <XCircle size={15} /> Cancel
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StaffDashboard;
