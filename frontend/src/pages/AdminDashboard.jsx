import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, CheckCircle, Clock, Edit2, Trash2, X, Save, LogOut, RefreshCw, MessageSquare, Mail, Phone, Search, XCircle } from 'lucide-react';
import API from '../services/api';
import '../styles/pages.css';

const AdminDashboard = () => {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('appointments');
  const [appointments, setAppointments] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Search and Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // State for editing appointment
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ patientName: '', treatmentName: '', appointmentDate: '', appointmentTime: '', status: '' });

  const fetchData = async () => {
    try {
      setLoading(true);
      const apptRes = await API.get('/appointments');
      const msgRes = await API.get('/contact');
      // Sort appointments by ID descending (newest first)
      setAppointments(apptRes.data.sort((a, b) => b.id - a.id));
      setMessages(msgRes.data.sort((a, b) => b.id - a.id));
      setError('');
    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
      setError('Failed to load data. Your session may have expired.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleEditClick = (appt) => {
    setEditingId(appt.id);
    setEditForm(appt);
  };

  const handleSaveEdit = async (id) => {
    const targetId = typeof id === 'object' ? id.id : id;
    try {
      await API.put(/appointments/ + targetId, editForm);
      setEditingId(null);
      fetchData();
    } catch (err) {
      console.error("Failed to update appointment:", err);
      alert('Error updating appointment');
    }
  };

  const handleDeleteAppointment = async (id) => {
    const targetId = typeof id === 'object' ? id.id : id;
    if (window.confirm("Are you sure you want to delete this appointment?")) {
      try {
        await API.delete('/appointments/' + targetId);
        fetchData();
      } catch (err) {
        alert('Error deleting appointment');
      }
    }
  };

  const handleDeleteMessage = async (id) => {
    const targetId = typeof id === 'object' ? id.id : id;
    if (window.confirm("Are you sure you want to delete this message?")) {
      try {
        await API.delete('/contact/' + targetId);
        fetchData();
      } catch (err) {
        alert('Error deleting message');
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('fullName');
    navigate('/admin-login');
  };

  // Filtering Logic
  const filteredAppointments = appointments.filter(appt => {
    const matchesSearch = appt.patientName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          appt.treatmentName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || appt.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="internal-page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
        <div>
          <h1>Admin Control Dashboard</h1>
          <p style={{ color: 'var(--text-light)' }}>Manage live clinic appointments and incoming patient queries.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn-primary" onClick={fetchData} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px' }}>
            <RefreshCw size={16} /> Refresh
          </button>
          <button className="btn-secondary" onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', fontWeight: '700' }}>
            <LogOut size={16} /> Logout / Exit
          </button>
        </div>
      </div>

      {error && <div style={{ padding: '15px', backgroundColor: '#f8d7da', color: '#721c24', borderRadius: '8px', marginBottom: '25px' }}>{error}</div>}

      {/* Stats Cards */}
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '30px' }}>
        <div style={{ flex: 1, minWidth: '200px', backgroundColor: 'var(--bg-white)', padding: '25px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
            <Calendar size={24} color="var(--color-accent)" />
            <h3 style={{ fontSize: '1.1rem', color: 'var(--text-light)' }}>Total Bookings</h3>
          </div>
          <p style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--color-primary)' }}>{appointments.length}</p>
        </div>

        <div style={{ flex: 1, minWidth: '200px', backgroundColor: 'var(--bg-white)', padding: '25px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
            <Clock size={24} color="#e0a800" />
            <h3 style={{ fontSize: '1.1rem', color: 'var(--text-light)' }}>Pending</h3>
          </div>
          <p style={{ fontSize: '2rem', fontWeight: '700', color: '#e0a800' }}>
            {appointments.filter(a => a.status === 'PENDING').length}
          </p>
        </div>
        
        <div style={{ flex: 1, minWidth: '200px', backgroundColor: 'var(--bg-white)', padding: '25px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
            <CheckCircle size={24} color="#28a745" />
            <h3 style={{ fontSize: '1.1rem', color: 'var(--text-light)' }}>Confirmed</h3>
          </div>
          <p style={{ fontSize: '2rem', fontWeight: '700', color: '#28a745' }}>
            {appointments.filter(a => a.status === 'CONFIRMED').length}
          </p>
        </div>

        <div style={{ flex: 1, minWidth: '200px', backgroundColor: 'var(--bg-white)', padding: '25px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
            <MessageSquare size={24} color="var(--color-accent)" />
            <h3 style={{ fontSize: '1.1rem', color: 'var(--text-light)' }}>Messages</h3>
          </div>
          <p style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--color-primary)' }}>{messages.length}</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '15px', marginBottom: '25px' }}>
        <button 
          onClick={() => setActiveTab('appointments')} 
          style={{ padding: '12px 24px', fontWeight: '700', borderRadius: '8px', cursor: 'pointer', border: 'none', backgroundColor: activeTab === 'appointments' ? 'var(--color-accent)' : 'var(--bg-white)', color: activeTab === 'appointments' ? '#fff' : 'var(--color-primary)', boxShadow: 'var(--shadow-soft)' }}>
          Appointments ({appointments.length})
        </button>
        <button 
          onClick={() => setActiveTab('messages')} 
          style={{ padding: '12px 24px', fontWeight: '700', borderRadius: '8px', cursor: 'pointer', border: 'none', backgroundColor: activeTab === 'messages' ? 'var(--color-accent)' : 'var(--bg-white)', color: activeTab === 'messages' ? '#fff' : 'var(--color-primary)', boxShadow: 'var(--shadow-soft)' }}>
          Client Messages ({messages.length})
        </button>
      </div>

      {/* Tab 1: Appointments Table */}
      {activeTab === 'appointments' && (
        <div style={{ backgroundColor: 'var(--bg-white)', padding: '30px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-soft)' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '1.5rem', color: 'var(--color-primary)', fontFamily: 'var(--font-heading)', margin: 0 }}>Live Patient Appointments</h2>
            
            <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative' }}>
                <Search size={18} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-light)' }} />
                <input 
                  type="text" 
                  placeholder="Search patient or treatment..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ padding: '8px 12px 8px 35px', borderRadius: '8px', border: '1px solid var(--border-light)', outline: 'none' }}
                />
              </div>
              <select 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-light)', outline: 'none' }}
              >
                <option value="ALL">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
          </div>
          
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '900px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-light)', color: 'var(--text-light)', fontSize: '0.9rem' }}>
                  <th style={{ padding: '12px' }}>Patient Details</th>
                  <th style={{ padding: '12px' }}>Treatment</th>
                  <th style={{ padding: '12px' }}>Date & Time</th>
                  <th style={{ padding: '12px' }}>Status</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="5" style={{ textAlign: 'center', padding: '30px' }}>Loading...</td></tr>
                ) : filteredAppointments.length === 0 ? (
                  <tr><td colSpan="5" style={{ textAlign: 'center', padding: '30px' }}>No appointments match your filters.</td></tr>
                ) : (
                  filteredAppointments.map((appt) => (
                    <tr key={appt.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      {editingId === appt.id ? (
                        <>
                          <td style={{ padding: '12px' }}><input type="text" value={editForm.patientName} onChange={(e) => setEditForm({...editForm, patientName: e.target.value})} style={{ padding: '6px', width: '100%' }} /></td>
                          <td style={{ padding: '12px' }}><input type="text" value={editForm.treatmentName} onChange={(e) => setEditForm({...editForm, treatmentName: e.target.value})} style={{ padding: '6px', width: '100%' }} /></td>
                          <td style={{ padding: '12px' }}>
                            <input type="date" value={editForm.appointmentDate} onChange={(e) => setEditForm({...editForm, appointmentDate: e.target.value})} style={{ padding: '6px', width: '100%', marginBottom: '5px' }} />
                            <input type="time" value={editForm.appointmentTime} onChange={(e) => setEditForm({...editForm, appointmentTime: e.target.value})} style={{ padding: '6px', width: '100%' }} />
                          </td>
                          <td style={{ padding: '12px' }}>
                            <select value={editForm.status} onChange={(e) => setEditForm({...editForm, status: e.target.value})} style={{ padding: '6px', width: '100%' }}>
                              <option value="PENDING">Pending</option>
                              <option value="CONFIRMED">Confirmed</option>
                              <option value="COMPLETED">Completed</option>
                              <option value="CANCELLED">Cancelled</option>
                              <option value="REJECTED">Rejected</option>
                            </select>
                          </td>
                          <td style={{ padding: '12px', textAlign: 'center' }}>
                            <button onClick={() => handleSaveEdit(appt.id)} style={{ backgroundColor: '#28a745', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', marginRight: '5px' }}><Save size={16} /></button>
                            <button onClick={() => setEditingId(null)} style={{ backgroundColor: '#6c757d', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer' }}><X size={16} /></button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td style={{ padding: '15px 12px' }}>
                            <div style={{ fontWeight: '600', color: 'var(--color-primary)' }}>{appt.patientName}</div>
                            {appt.email && <div style={{ fontSize: '0.8rem', color: 'var(--text-light)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}><Mail size={12}/> {appt.email}</div>}
                            {appt.phone && <div style={{ fontSize: '0.8rem', color: 'var(--text-light)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}><Phone size={12}/> {appt.phone}</div>}
                          </td>
                          <td style={{ padding: '15px 12px' }}>{appt.treatmentName}</td>
                          <td style={{ padding: '15px 12px', color: 'var(--text-light)' }}>{appt.appointmentDate}<br/><span style={{ fontSize: '0.9rem' }}>{appt.appointmentTime}</span></td>
                          <td style={{ padding: '15px 12px' }}>
                            <span style={{ 
                              padding: '5px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '700', 
                              backgroundColor: appt.status === 'CONFIRMED' ? '#d4edda' : appt.status === 'COMPLETED' ? '#cce5ff' : appt.status === 'PENDING' ? '#fff3cd' : '#f8d7da', 
                              color: appt.status === 'CONFIRMED' ? '#155724' : appt.status === 'COMPLETED' ? '#004085' : appt.status === 'PENDING' ? '#856404' : '#721c24' 
                            }}>
                              {appt.status}
                            </span>
                          </td>
                          <td style={{ padding: '15px 12px', textAlign: 'center' }}>
                            <button onClick={() => handleEditClick(appt)} className="btn-primary" style={{ padding: '6px 14px', fontSize: '0.8rem', marginRight: '8px' }}><Edit2 size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> Update</button>
                            <button onClick={() => handleDeleteAppointment(appt.id)} style={{ backgroundColor: '#dc3545', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer' }}><Trash2 size={14} /></button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Client Messages Table */}
      {activeTab === 'messages' && (
        <div style={{ backgroundColor: 'var(--bg-white)', padding: '30px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-soft)', overflowX: 'auto' }}>
          <h2 style={{ fontSize: '1.5rem', color: 'var(--color-primary)', marginBottom: '20px', fontFamily: 'var(--font-heading)' }}>Client Contact Messages</h2>
          
          {loading ? (
            <p style={{ textAlign: 'center', padding: '30px', color: 'var(--text-light)' }}>Loading messages...</p>
          ) : messages.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '30px', color: 'var(--text-light)' }}>No messages found.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-light)', color: 'var(--text-light)', fontSize: '0.9rem' }}>
                  <th style={{ padding: '12px' }}>Sender Name</th>
                  <th style={{ padding: '12px' }}>Contact Info</th>
                  <th style={{ padding: '12px' }}>Message</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {messages.map((msg) => (
                  <tr key={msg.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={{ padding: '15px 12px', fontWeight: '600', color: 'var(--color-primary)' }}>{msg.name}</td>
                    <td style={{ padding: '15px 12px', color: 'var(--text-light)', fontSize: '0.9rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}><Mail size={14} /> {msg.email}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Phone size={14} /> {msg.phone}</div>
                    </td>
                    <td style={{ padding: '15px 12px', maxWidth: '300px', wordBreak: 'break-word' }}>{msg.message}</td>
                    <td style={{ padding: '15px 12px', textAlign: 'center' }}>
                      <button onClick={() => handleDeleteMessage(msg.id)} style={{ backgroundColor: '#dc3545', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer' }}>
                        <Trash2 size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;