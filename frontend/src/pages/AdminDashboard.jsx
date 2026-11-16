import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, CheckCircle, Clock, Edit2, Trash2, X, Save, LogOut, 
  RefreshCw, MessageSquare, Mail, Phone, Search, DollarSign, 
  TrendingUp, Users, UserPlus, Shield, Briefcase, Award
} from 'lucide-react';
import API from '../services/api';
import '../styles/pages.css';

const AdminDashboard = () => {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('appointments');
  const [appointments, setAppointments] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Financial & Report State
  const [reports, setReports] = useState({
    completedRevenue: 0,
    projectedRevenue: 0,
    totalEstimatedValue: 0,
    averageBookingValue: 0,
    totalCustomers: 0,
    treatmentCounts: {}
  });

  // Staff State
  const [staffInvitations, setStaffInvitations] = useState([]);
  const [newStaff, setNewStaff] = useState({
    fullName: '',
    email: '',
    designation: 'Skin Therapist',
    password: ''
  });
  const [staffActionLoading, setStaffActionLoading] = useState(false);
  const [staffSuccess, setStaffSuccess] = useState('');
  const [staffError, setStaffError] = useState('');
  
  // Search and Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // State for editing appointment
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ patientName: '', treatmentName: '', appointmentDate: '', appointmentTime: '', status: '' });

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');

      const [apptRes, msgRes, reportRes, staffRes] = await Promise.allSettled([
        API.get('/appointments'),
        API.get('/contact'),
        API.get('/admin/reports/overview'),
        API.get('/admin/staff/invitations')
      ]);

      if (apptRes.status === 'fulfilled') {
        setAppointments((apptRes.value.data || []).sort((a, b) => b.id - a.id));
      }
      if (msgRes.status === 'fulfilled') {
        setMessages((msgRes.value.data || []).sort((a, b) => b.id - a.id));
      }
      if (reportRes.status === 'fulfilled' && reportRes.value.data) {
        setReports(reportRes.value.data);
      }
      if (staffRes.status === 'fulfilled') {
        setStaffInvitations(staffRes.value.data || []);
      }
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
    let dateStr = appt.appointmentDate || '';
    if (typeof dateStr === 'string' && dateStr.includes('T')) {
      dateStr = dateStr.split('T')[0];
    }
    setEditForm({
      ...appt,
      patientName: appt.patientName || appt.customerName || '',
      customerName: appt.customerName || appt.patientName || '',
      appointmentDate: dateStr,
      appointmentTime: appt.appointmentTime || '10:00',
      status: appt.status || 'PENDING'
    });
  };

  const handleSaveEdit = async (id) => {
    const targetId = typeof id === 'object' ? id.id : id;
    try {
      await API.put('/appointments/' + targetId, editForm);
      setEditingId(null);
      fetchData();
    } catch (err) {
      console.error("Failed to update appointment:", err);
      alert(err.response?.data?.message || 'Error updating appointment');
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

  const handleEnrollStaff = async (e) => {
    e.preventDefault();
    if (!newStaff.email || !newStaff.fullName) {
      setStaffError('Please provide both staff member name and work email.');
      return;
    }
    try {
      setStaffActionLoading(true);
      setStaffError('');
      setStaffSuccess('');

      const res = await API.post('/admin/staff/invitations', newStaff);
      if (res.data && res.data.success) {
        setStaffSuccess(`Successfully enrolled ${newStaff.fullName} as ${newStaff.designation}!`);
        setNewStaff({ fullName: '', email: '', designation: 'Skin Therapist', password: '' });
        // Refresh staff list
        const updatedStaff = await API.get('/admin/staff/invitations');
        setStaffInvitations(updatedStaff.data || []);
      } else {
        setStaffError(res.data?.message || 'Failed to enroll staff member.');
      }
    } catch (err) {
      console.error("Staff enrollment error:", err);
      setStaffError(err.response?.data?.message || 'Server error while enrolling staff.');
    } finally {
      setStaffActionLoading(false);
    }
  };

  const handleRevokeStaff = async (id) => {
    if (window.confirm("Are you sure you want to revoke this staff member's credentials? They will no longer be able to log in to the staff portal.")) {
      try {
        await API.delete('/admin/staff/invitations/' + id);
        setStaffSuccess('Staff account and access revoked.');
        const updatedStaff = await API.get('/admin/staff/invitations');
        setStaffInvitations(updatedStaff.data || []);
      } catch (err) {
        alert('Failed to revoke staff access.');
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
    const name = appt.customerName || appt.patientName || '';
    const treatment = appt.treatmentName || '';
    const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          treatment.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || appt.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="internal-page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
        <div>
          <h1>Admin Control Dashboard</h1>
          <p style={{ color: 'var(--text-light)' }}>
            Super Admin Suite: Financial revenues, clinic operations, live bookings, and staff management.
          </p>
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

      {error && (
        <div style={{ padding: '15px', backgroundColor: '#f8d7da', color: '#721c24', borderRadius: '8px', marginBottom: '25px' }}>
          {error}
        </div>
      )}

      {/* Top Stats & Financial Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        
        {/* Revenue Collected */}
        <div style={{ backgroundColor: 'var(--bg-white)', padding: '22px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-soft)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-light)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Revenue Collected</span>
            <TrendingUp size={22} color="#155724" />
          </div>
          <p style={{ fontSize: '1.9rem', fontWeight: '800', color: '#155724', margin: '6px 0 2px' }}>
            ₹{Number(reports.completedRevenue || 0).toLocaleString('en-IN')}
          </p>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>From completed sessions</span>
        </div>

        {/* Projected Pipeline */}
        <div style={{ backgroundColor: 'var(--bg-white)', padding: '22px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-soft)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-light)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Projected Pipeline</span>
            <DollarSign size={22} color="var(--color-primary)" />
          </div>
          <p style={{ fontSize: '1.9rem', fontWeight: '800', color: 'var(--color-primary)', margin: '6px 0 2px' }}>
            ₹{Number(reports.projectedRevenue || 0).toLocaleString('en-IN')}
          </p>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>From confirmed bookings</span>
        </div>

        {/* Total Bookings */}
        <div style={{ backgroundColor: 'var(--bg-white)', padding: '22px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-soft)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-light)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Bookings</span>
            <Calendar size={22} color="var(--color-accent)" />
          </div>
          <p style={{ fontSize: '1.9rem', fontWeight: '800', color: 'var(--color-primary)', margin: '6px 0 2px' }}>
            {appointments.length}
          </p>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>
            {appointments.filter(a => a.status === 'CONFIRMED').length} confirmed • {appointments.filter(a => a.status === 'PENDING').length} pending
          </span>
        </div>

        {/* Staff Members */}
        <div style={{ backgroundColor: 'var(--bg-white)', padding: '22px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-soft)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-light)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Staff Workers</span>
            <Users size={22} color="var(--color-primary)" />
          </div>
          <p style={{ fontSize: '1.9rem', fontWeight: '800', color: 'var(--color-primary)', margin: '6px 0 2px' }}>
            {staffInvitations.length}
          </p>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>Active salon team members</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '25px', flexWrap: 'wrap' }}>
        <button 
          onClick={() => setActiveTab('appointments')} 
          style={{ 
            padding: '12px 20px', fontWeight: '700', borderRadius: '8px', cursor: 'pointer', border: 'none', 
            backgroundColor: activeTab === 'appointments' ? 'var(--color-accent)' : 'var(--bg-white)', 
            color: activeTab === 'appointments' ? '#fff' : 'var(--color-primary)', 
            boxShadow: 'var(--shadow-soft)', display: 'flex', alignItems: 'center', gap: '8px'
          }}>
          <Calendar size={16} /> Appointments ({appointments.length})
        </button>

        <button 
          onClick={() => setActiveTab('revenue')} 
          style={{ 
            padding: '12px 20px', fontWeight: '700', borderRadius: '8px', cursor: 'pointer', border: 'none', 
            backgroundColor: activeTab === 'revenue' ? 'var(--color-accent)' : 'var(--bg-white)', 
            color: activeTab === 'revenue' ? '#fff' : 'var(--color-primary)', 
            boxShadow: 'var(--shadow-soft)', display: 'flex', alignItems: 'center', gap: '8px'
          }}>
          <DollarSign size={16} /> Revenue & Financials
        </button>

        <button 
          onClick={() => setActiveTab('staff')} 
          style={{ 
            padding: '12px 20px', fontWeight: '700', borderRadius: '8px', cursor: 'pointer', border: 'none', 
            backgroundColor: activeTab === 'staff' ? 'var(--color-accent)' : 'var(--bg-white)', 
            color: activeTab === 'staff' ? '#fff' : 'var(--color-primary)', 
            boxShadow: 'var(--shadow-soft)', display: 'flex', alignItems: 'center', gap: '8px'
          }}>
          <Users size={16} /> Staff & Workers ({staffInvitations.length})
        </button>

        <button 
          onClick={() => setActiveTab('messages')} 
          style={{ 
            padding: '12px 20px', fontWeight: '700', borderRadius: '8px', cursor: 'pointer', border: 'none', 
            backgroundColor: activeTab === 'messages' ? 'var(--color-accent)' : 'var(--bg-white)', 
            color: activeTab === 'messages' ? '#fff' : 'var(--color-primary)', 
            boxShadow: 'var(--shadow-soft)', display: 'flex', alignItems: 'center', gap: '8px'
          }}>
          <MessageSquare size={16} /> Inquiries ({messages.length})
        </button>
      </div>

      {/* Tab 1: Appointments Table */}
      {activeTab === 'appointments' && (
        <div style={{ backgroundColor: 'var(--bg-white)', padding: '30px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-soft)' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '1.4rem', color: 'var(--color-primary)', fontFamily: 'var(--font-heading)', margin: 0 }}>Live Patient Appointments</h2>
            
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
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
                            <div style={{ fontWeight: '600', color: 'var(--color-primary)' }}>{appt.customerName || appt.patientName}</div>
                            {(appt.customerEmail || appt.email) && <div style={{ fontSize: '0.8rem', color: 'var(--text-light)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}><Mail size={12}/> {appt.customerEmail || appt.email}</div>}
                            {(appt.customerPhone || appt.phone) && <div style={{ fontSize: '0.8rem', color: 'var(--text-light)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}><Phone size={12}/> {appt.customerPhone || appt.phone}</div>}
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

      {/* Tab 2: Revenue & Financials */}
      {activeTab === 'revenue' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
          {/* Revenue Metric Breakdown */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
            <div style={{ backgroundColor: 'var(--bg-white)', padding: '24px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-soft)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <TrendingUp size={20} color="#155724" />
                <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Realized Revenue</h4>
              </div>
              <p style={{ fontSize: '2.2rem', fontWeight: '800', color: '#155724', margin: '8px 0' }}>
                ₹{Number(reports.completedRevenue || 0).toLocaleString('en-IN')}
              </p>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-light)' }}>
                Total income collected from {reports.completedAppointments || 0} successfully completed client procedures.
              </p>
            </div>

            <div style={{ backgroundColor: 'var(--bg-white)', padding: '24px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-soft)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <DollarSign size={20} color="var(--color-primary)" />
                <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Confirmed Pipeline</h4>
              </div>
              <p style={{ fontSize: '2.2rem', fontWeight: '800', color: 'var(--color-primary)', margin: '8px 0' }}>
                ₹{Number(reports.projectedRevenue || 0).toLocaleString('en-IN')}
              </p>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-light)' }}>
                Expected revenue from {reports.confirmedAppointments || 0} confirmed client appointments.
              </p>
            </div>

            <div style={{ backgroundColor: 'var(--bg-white)', padding: '24px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-soft)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <Award size={20} color="var(--color-accent)" />
                <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Average Ticket Value</h4>
              </div>
              <p style={{ fontSize: '2.2rem', fontWeight: '800', color: 'var(--color-primary)', margin: '8px 0' }}>
                ₹{Number(reports.averageBookingValue || 0).toLocaleString('en-IN')}
              </p>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-light)' }}>
                Average revenue generated per booked aesthetic treatment session.
              </p>
            </div>
          </div>

          {/* Treatment Distribution Table */}
          <div style={{ backgroundColor: 'var(--bg-white)', padding: '30px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-soft)' }}>
            <h3 style={{ fontSize: '1.3rem', color: 'var(--color-primary)', marginBottom: '15px', fontFamily: 'var(--font-heading)' }}>
              Treatment Volume & Distribution
            </h3>
            <p style={{ color: 'var(--text-light)', fontSize: '0.9rem', marginBottom: '20px' }}>
              Detailed breakdown of booking demand across all dermatology and aesthetic services.
            </p>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-light)', color: 'var(--text-light)', fontSize: '0.9rem' }}>
                    <th style={{ padding: '12px' }}>Treatment Name</th>
                    <th style={{ padding: '12px', textAlign: 'center' }}>Total Bookings</th>
                    <th style={{ padding: '12px', textAlign: 'right' }}>Volume Share</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.treatmentCounts && Object.keys(reports.treatmentCounts).length > 0 ? (
                    Object.entries(reports.treatmentCounts).map(([name, count]) => {
                      const percentage = reports.totalAppointments > 0 
                        ? Math.round((count / reports.totalAppointments) * 100) 
                        : 0;
                      return (
                        <tr key={name} style={{ borderBottom: '1px solid var(--border-light)' }}>
                          <td style={{ padding: '14px 12px', fontWeight: '600', color: 'var(--color-primary)' }}>
                            {name}
                          </td>
                          <td style={{ padding: '14px 12px', textAlign: 'center', fontWeight: '700' }}>
                            {count}
                          </td>
                          <td style={{ padding: '14px 12px', textAlign: 'right', color: 'var(--text-light)' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                              <span>{percentage}%</span>
                              <div style={{ width: '80px', height: '6px', backgroundColor: '#f0f0f0', borderRadius: '4px', overflow: 'hidden' }}>
                                <div style={{ width: `${percentage}%`, height: '100%', backgroundColor: 'var(--color-accent)' }}></div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="3" style={{ textAlign: 'center', padding: '25px', color: 'var(--text-light)' }}>
                        No treatment data recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Staff & Workers Management */}
      {activeTab === 'staff' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
          
          {/* Security & Role Policy Banner */}
          <div style={{ backgroundColor: '#f8f9fa', padding: '18px 24px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: '15px' }}>
            <Shield size={28} color="var(--color-primary)" />
            <div style={{ fontSize: '0.9rem', color: 'var(--text-main)', lineHeight: '1.5' }}>
              <strong>Role Access Boundary:</strong> Staff members are strictly restricted to the <code>/staff</code> operational queue. They can update appointment status (Confirm, Complete, Cancel) but <strong>cannot</strong> view financial revenue, customer medical notes, or manage accounts.
            </div>
          </div>

          {/* Feedback alerts */}
          {staffSuccess && (
            <div style={{ padding: '14px 18px', backgroundColor: '#d4edda', color: '#155724', borderRadius: '8px', border: '1px solid #c3e6cb' }}>
              {staffSuccess}
            </div>
          )}
          {staffError && (
            <div style={{ padding: '14px 18px', backgroundColor: '#f8d7da', color: '#721c24', borderRadius: '8px', border: '1px solid #f5c6cb' }}>
              {staffError}
            </div>
          )}

          {/* Enroll New Staff Form */}
          <div style={{ backgroundColor: 'var(--bg-white)', padding: '30px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-soft)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
              <UserPlus size={22} color="var(--color-accent)" />
              <h3 style={{ fontSize: '1.3rem', color: 'var(--color-primary)', margin: 0, fontFamily: 'var(--font-heading)' }}>
                Enroll New Salon / Clinic Staff Worker
              </h3>
            </div>
            <p style={{ color: 'var(--text-light)', fontSize: '0.9rem', marginBottom: '20px' }}>
              Create credentials for your clinic therapists, aestheticians, and reception workers to manage daily bookings.
            </p>

            <form onSubmit={handleEnrollStaff} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '15px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '6px', color: 'var(--color-primary)' }}>
                  Full Name *
                </label>
                <input 
                  type="text" 
                  placeholder="e.g. Priya Sharma" 
                  value={newStaff.fullName}
                  onChange={(e) => setNewStaff({ ...newStaff, fullName: e.target.value })}
                  required
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-light)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '6px', color: 'var(--color-primary)' }}>
                  Work Email *
                </label>
                <input 
                  type="email" 
                  placeholder="e.g. priya@dermaaline.com" 
                  value={newStaff.email}
                  onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                  required
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-light)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '6px', color: 'var(--color-primary)' }}>
                  Designation / Role
                </label>
                <input 
                  type="text" 
                  placeholder="e.g. Skin Therapist, Aesthetician" 
                  value={newStaff.designation}
                  onChange={(e) => setNewStaff({ ...newStaff, designation: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-light)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '6px', color: 'var(--color-primary)' }}>
                  Initial Password (Optional)
                </label>
                <input 
                  type="password" 
                  placeholder="Default: Staff@2026" 
                  value={newStaff.password}
                  onChange={(e) => setNewStaff({ ...newStaff, password: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-light)' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button 
                  type="submit" 
                  disabled={staffActionLoading}
                  className="btn-primary" 
                  style={{ width: '100%', padding: '11px 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: '700' }}
                >
                  <UserPlus size={16} /> {staffActionLoading ? 'Enrolling...' : 'Enroll Staff Worker'}
                </button>
              </div>
            </form>
          </div>

          {/* Active Staff List Table */}
          <div style={{ backgroundColor: 'var(--bg-white)', padding: '30px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-soft)' }}>
            <h3 style={{ fontSize: '1.3rem', color: 'var(--color-primary)', marginBottom: '15px', fontFamily: 'var(--font-heading)' }}>
              Active Clinic Staff Team
            </h3>
            
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-light)', color: 'var(--text-light)', fontSize: '0.9rem' }}>
                    <th style={{ padding: '12px' }}>Staff Worker</th>
                    <th style={{ padding: '12px' }}>Email</th>
                    <th style={{ padding: '12px' }}>Designation</th>
                    <th style={{ padding: '12px' }}>Role Clearance</th>
                    <th style={{ padding: '12px', textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {staffInvitations.length === 0 ? (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-light)' }}>
                        No staff workers enrolled yet. Use the form above to enroll your first salon worker.
                      </td>
                    </tr>
                  ) : (
                    staffInvitations.map((staff) => (
                      <tr key={staff.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                        <td style={{ padding: '14px 12px' }}>
                          <div style={{ fontWeight: '600', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Briefcase size={16} color="var(--color-accent)" />
                            {staff.fullName || 'Clinic Staff'}
                          </div>
                        </td>
                        <td style={{ padding: '14px 12px', color: 'var(--text-light)', fontSize: '0.9rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Mail size={14} /> {staff.email}
                          </div>
                        </td>
                        <td style={{ padding: '14px 12px', color: 'var(--color-primary)', fontWeight: '500' }}>
                          {staff.designation || 'Skin Therapist'}
                        </td>
                        <td style={{ padding: '14px 12px' }}>
                          <span style={{ 
                            padding: '4px 10px', borderRadius: '15px', fontSize: '0.75rem', fontWeight: '700', 
                            backgroundColor: '#e2e3e5', color: '#383d41', border: '1px solid #d6d8db'
                          }}>
                            OPERATIONAL STAFF
                          </span>
                        </td>
                        <td style={{ padding: '14px 12px', textAlign: 'center' }}>
                          <button 
                            onClick={() => handleRevokeStaff(staff.id)}
                            style={{ 
                              backgroundColor: '#dc3545', color: '#fff', border: 'none', padding: '6px 12px', 
                              borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px' 
                            }}
                          >
                            <Trash2 size={13} /> Revoke Access
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* Tab 4: Client Messages Table */}
      {activeTab === 'messages' && (
        <div style={{ backgroundColor: 'var(--bg-white)', padding: '30px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-soft)', overflowX: 'auto' }}>
          <h2 style={{ fontSize: '1.4rem', color: 'var(--color-primary)', marginBottom: '20px', fontFamily: 'var(--font-heading)' }}>Client Contact Messages</h2>
          
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
