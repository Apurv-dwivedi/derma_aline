import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, CheckCircle, Clock, Edit2, Trash2, X, Save, LogOut, 
  RefreshCw, MessageSquare, Mail, Phone, Search, Users, UserPlus, 
  Shield, Briefcase, Award, KeyRound, Lock, Eye, EyeOff, 
  CheckCircle2, AlertCircle, Sparkles, HeartPulse, Settings, FileText
} from 'lucide-react';
import API from '../services/api';
import '../styles/pages.css';

const AdminDashboard = () => {
  const navigate = useNavigate();

  // Active Tab: 'clients' | 'treatments' | 'staff' | 'messages' | 'reports' | 'audit' | 'settings' | 'security' | 'appointments'
  const [activeTab, setActiveTab] = useState('clients');

  // Core Data States
  const [appointments, setAppointments] = useState([]);
  const [clients, setClients] = useState([]);
  const [messages, setMessages] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [treatmentsList, setTreatmentsList] = useState([]);

  // Treatment Catalogue Management State
  const [showTreatmentModal, setShowTreatmentModal] = useState(false);
  const [treatmentForm, setTreatmentForm] = useState({ name: '', category: 'Facial Aesthetics', description: '', price: '', durationMinutes: 60, active: true });
  const [treatmentSaving, setTreatmentSaving] = useState(false);
  const [treatmentToast, setTreatmentToast] = useState('');
  const [reports, setReports] = useState({
    totalCustomers: 0,
    totalTreatmentsRecorded: 0,
    totalActiveServices: 0,
    totalStaff: 0,
    treatmentCounts: {},
    totalEnquiries: 0,
    unreadEnquiries: 0,
    resolvedEnquiries: 0
  });

  // Staff State
  const [staffInvitations, setStaffInvitations] = useState([]);
  const [newStaff, setNewStaff] = useState({
    fullName: '',
    email: '',
    designation: 'Skin Therapist',
    phone: ''
  });
  const [staffActionLoading, setStaffActionLoading] = useState(false);
  const [staffSuccess, setStaffSuccess] = useState('');
  const [staffError, setStaffError] = useState('');

  // Clinic Settings State
  const [settings, setSettings] = useState({
    clinicName: 'DERMA ALINE AESTHÉTICS SKIN CLINIC',
    contactEmail: 'dermaalineskinaesthetics@gmail.com',
    contactPhone: '+91 87007 51880',
    address: 'Derma Aline Aesthétics Clinic, Luxury Care Suite',
    openingHours: 'Mon - Sat: 10:00 AM - 08:00 PM',
    generalInformation: 'Premier aesthetic skin clinic providing tailored clinical treatments, skin rejuvenation, and luxury dermatological care.'
  });
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState('');

  // Security & Password State
  const [passwordForm, setPasswordForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Search and Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [messageFilter, setMessageFilter] = useState('ACTIVE');
  const [messageToast, setMessageToast] = useState('');

  // State for editing appointment
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ patientName: '', treatmentName: '', appointmentDate: '', appointmentTime: '', status: '' });

  // Selected Client Details Modal
  const [selectedClient, setSelectedClient] = useState(null);
  const [clientDetailLoading, setClientDetailLoading] = useState(false);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshToast, setRefreshToast] = useState('');
  const [error, setError] = useState('');

  const fetchData = async (isManual = false) => {
    try {
      if (isManual) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError('');

      const [apptRes, msgRes, reportRes, staffRes, clientsRes, settingsRes, auditRes, treatRes] = await Promise.allSettled([
        API.get('/appointments'),
        API.get('/contact'),
        API.get('/admin/reports/overview'),
        API.get('/admin/staff/invitations'),
        API.get('/admin/clients'),
        API.get('/admin/settings'),
        API.get('/admin/audit-logs'),
        API.get('/treatments')
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
      if (clientsRes.status === 'fulfilled') {
        setClients(clientsRes.value.data || []);
      }
      if (settingsRes.status === 'fulfilled' && settingsRes.value.data) {
        setSettings(settingsRes.value.data);
      }
      if (auditRes.status === 'fulfilled') {
        setAuditLogs(auditRes.value.data || []);
      }
      if (treatRes.status === 'fulfilled') {
        setTreatmentsList(treatRes.value.data || []);
      }

      if (isManual) {
        setRefreshToast('Clinic database synchronized.');
        setTimeout(() => setRefreshToast(''), 3000);
      }
    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
      setError('Failed to load data. Your session may have expired.');
    } finally {
      setLoading(false);
      setRefreshing(false);
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

  const handleQuickStatusChange = async (id, newStatus) => {
    const targetId = typeof id === 'object' ? id.id : id;
    try {
      setAppointments(prev => prev.map(a => a.id === targetId ? { ...a, status: newStatus } : a));
      await API.patch(`/appointments/${targetId}/status`, { status: newStatus });
    } catch (err) {
      console.error("Failed to update status:", err);
      fetchData();
      alert(err.response?.data?.message || 'Error updating status');
    }
  };

  const handleSaveEdit = async (id) => {
    const targetId = typeof id === 'object' ? id.id : id;
    try {
      const payload = {
        patientName: editForm.patientName || editForm.customerName,
        customerName: editForm.customerName || editForm.patientName,
        email: editForm.email || editForm.customerEmail,
        customerEmail: editForm.customerEmail || editForm.email,
        phone: editForm.phone || editForm.customerPhone,
        customerPhone: editForm.customerPhone || editForm.phone,
        treatmentName: editForm.treatmentName,
        appointmentDate: editForm.appointmentDate,
        appointmentTime: editForm.appointmentTime,
        status: editForm.status,
        notes: editForm.notes
      };
      await API.put('/appointments/' + targetId, payload);
      setEditingId(null);
      fetchData();
    } catch (err) {
      console.error("Failed to update appointment via PUT, attempting status patch fallback:", err);
      if (editForm.status) {
        try {
          await API.patch('/appointments/' + targetId + '/status', { status: editForm.status });
          setEditingId(null);
          fetchData();
          return;
        } catch (patchErr) {
          console.error("Status patch fallback also failed:", patchErr);
        }
      }
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

  // Treatment Catalogue Management
  const handleSaveTreatment = async (e) => {
    e.preventDefault();
    setTreatmentSaving(true);
    setTreatmentToast('');
    try {
      if (treatmentForm.id) {
        await API.put(`/treatments/${treatmentForm.id}`, treatmentForm);
        setTreatmentToast('Treatment updated successfully.');
      } else {
        await API.post('/treatments', treatmentForm);
        setTreatmentToast('Treatment created successfully.');
      }
      setShowTreatmentModal(false);
      setTreatmentForm({ name: '', category: 'Facial Aesthetics', description: '', price: '', durationMinutes: 60, active: true });
      const res = await API.get('/treatments');
      setTreatmentsList(res.data || []);
      setTimeout(() => setTreatmentToast(''), 3000);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save treatment.');
    } finally {
      setTreatmentSaving(false);
    }
  };

  const handleToggleTreatmentActive = async (tr) => {
    try {
      await API.put(`/treatments/${tr.id}`, { ...tr, active: !tr.active });
      setTreatmentsList(prev => prev.map(item => item.id === tr.id ? { ...item, active: !item.active } : item));
    } catch (err) {
      alert('Failed to update treatment status.');
    }
  };

  // Staff Management: Invite
  const handleEnrollStaff = async (e) => {
    e.preventDefault();
    setStaffActionLoading(true);
    setStaffSuccess('');
    setStaffError('');

    try {
      const response = await API.post('/admin/staff/invitations', newStaff);
      setStaffSuccess(response.data.message || 'Staff invitation successfully dispatched!');
      setNewStaff({ fullName: '', email: '', designation: 'Skin Therapist', phone: '' });
      fetchData();
      setTimeout(() => setStaffSuccess(''), 4000);
    } catch (err) {
      console.error("Failed to invite staff worker:", err);
      setStaffError(err.response?.data?.message || 'Failed to dispatch staff invitation.');
      setTimeout(() => setStaffError(''), 4000);
    } finally {
      setStaffActionLoading(false);
    }
  };

  // Staff Management: Resend Invitation
  const handleResendStaffInvite = async (id) => {
    try {
      const res = await API.post(`/admin/staff/invitations/${id}/resend`);
      setStaffSuccess(res.data.message || 'Invitation resent.');
      fetchData();
      setTimeout(() => setStaffSuccess(''), 3000);
    } catch (err) {
      setStaffError('Failed to resend invitation.');
    }
  };

  // Staff Management: Revoke
  const handleRevokeStaff = async (id) => {
    if (window.confirm("Are you sure you want to revoke this staff member's clearance?")) {
      try {
        await API.delete('/admin/staff/invitations/' + id);
        fetchData();
      } catch (err) {
        alert("Failed to revoke staff access");
      }
    }
  };

  // Client Details Modal
  const handleViewClientDetails = async (clientId) => {
    setClientDetailLoading(true);
    try {
      const res = await API.get(`/admin/clients/${clientId}`);
      setSelectedClient(res.data);
    } catch (err) {
      alert("Failed to load client details.");
    } finally {
      setClientDetailLoading(false);
    }
  };

  // Clinic Settings Save
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSettingsLoading(true);
    setSettingsSuccess('');

    try {
      const res = await API.put('/admin/settings', settings);
      setSettingsSuccess(res.data.message || 'Clinic settings updated successfully.');
      setTimeout(() => setSettingsSuccess(''), 3000);
    } catch (err) {
      alert('Failed to save settings.');
    } finally {
      setSettingsLoading(false);
    }
  };

  // Change Admin Password
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters long.');
      return;
    }

    const currentEmail = localStorage.getItem('email') || 'apurvdwivedi2205@gmail.com';
    setPasswordLoading(true);

    try {
      const response = await API.post('/auth/change-password', {
        email: currentEmail,
        oldPassword: passwordForm.oldPassword,
        newPassword: passwordForm.newPassword
      });

      setPasswordSuccess(response.data.message || 'Password changed successfully!');
      setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setPasswordSuccess(''), 4000);
    } catch (err) {
      console.error("Failed to change password:", err);
      setPasswordError(err.response?.data?.message || 'Incorrect old password or session error.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/owner/login');
  };

  // Active appointments needing clinic action
  const activeAppointments = appointments.filter(a => {
    const st = (a.status || 'PENDING').toUpperCase();
    return st === 'PENDING' || st === 'CONFIRMED';
  });

  // Active patient inquiries awaiting resolution (excludes RESOLVED)
  const activeMessages = messages.filter(m => {
    const st = (m.status || 'UNREAD').toUpperCase();
    return st !== 'RESOLVED';
  });

  // Resolved patient inquiries
  const resolvedMessages = messages.filter(m => {
    const st = (m.status || 'UNREAD').toUpperCase();
    return st === 'RESOLVED';
  });

  // Displayed messages based on sub-filter
  const displayedMessages = messages.filter(m => {
    const st = (m.status || 'UNREAD').toUpperCase();
    if (messageFilter === 'ACTIVE') return st !== 'RESOLVED';
    if (messageFilter === 'RESOLVED') return st === 'RESOLVED';
    return true;
  });

  const handleResolveMessage = async (id) => {
    try {
      setMessages(prev => prev.map(m => m.id === id ? { ...m, status: 'RESOLVED' } : m));
      await API.patch(`/contact/${id}/status`, { status: 'RESOLVED' });
      setMessageToast('Query marked as resolved and removed from active list.');
      setTimeout(() => setMessageToast(''), 3500);
    } catch (err) {
      console.error("Failed to resolve message:", err);
      fetchData();
    }
  };

  const handleReopenMessage = async (id) => {
    try {
      setMessages(prev => prev.map(m => m.id === id ? { ...m, status: 'UNREAD' } : m));
      await API.patch(`/contact/${id}/status`, { status: 'UNREAD' });
      setMessageToast('Query reopened and restored to active list.');
      setTimeout(() => setMessageToast(''), 3500);
    } catch (err) {
      console.error("Failed to reopen message:", err);
      fetchData();
    }
  };

  // Filtering Logic
  const filteredAppointments = appointments.filter(appt => {
    const name = appt.customerName || appt.patientName || '';
    const treatment = appt.treatmentName || '';
    const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          treatment.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesStatus = true;
    if (statusFilter === 'ACTIVE') {
      matchesStatus = appt.status === 'PENDING' || appt.status === 'CONFIRMED';
    } else if (statusFilter !== 'ALL') {
      matchesStatus = appt.status === statusFilter;
    }
    return matchesSearch && matchesStatus;
  });

  const filteredClients = clients.filter(c => {
    const q = clientSearchTerm.toLowerCase();
    return (
      (c.fullName && c.fullName.toLowerCase().includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      (c.phone && c.phone.includes(q))
    );
  });

  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto', padding: '10px 0 60px 0' }}>
      
      {/* Top Header Card */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '20px',
        backgroundColor: 'var(--bg-white)',
        padding: '28px 32px',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-light)',
        boxShadow: 'var(--shadow-soft)',
        marginBottom: '25px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{ 
              backgroundColor: '#fef3c7', color: '#92400e', padding: '4px 10px', 
              borderRadius: '20px', fontSize: '0.75rem', fontWeight: '800', letterSpacing: '0.08em', textTransform: 'uppercase'
            }}>
              SUPER_ADMIN
            </span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>Clinic Management Platform</span>
          </div>
          <h1 style={{ fontSize: '1.8rem', color: 'var(--color-primary)', margin: 0, fontFamily: 'var(--font-heading)', fontWeight: '600' }}>
            Derma Aline Executive Suite
          </h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            className="btn-secondary" 
            onClick={() => fetchData(true)} 
            disabled={refreshing || loading}
            title="Refresh All Clinic Data"
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              padding: '10px 14px', 
              fontSize: '0.85rem', 
              fontWeight: '600',
              cursor: (refreshing || loading) ? 'wait' : 'pointer',
              opacity: (refreshing || loading) ? 0.75 : 1
            }}
          >
            <RefreshCw size={15} style={{ animation: (refreshing || loading) ? 'spin 0.8s linear infinite' : 'none' }} /> 
            {refreshing ? 'Syncing...' : 'Refresh'}
          </button>
          
          <button 
            className="btn-primary" 
            onClick={handleLogout} 
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 18px', fontSize: '0.85rem', fontWeight: '600', backgroundColor: '#dc3545', borderColor: '#dc3545' }}
          >
            <LogOut size={15} /> Sign Out
          </button>
        </div>
      </div>

      {/* Floating Refresh Confirmation Toast */}
      {refreshToast && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          backgroundColor: '#2c221e',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: '8px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '0.88rem',
          fontWeight: '500'
        }}>
          <CheckCircle2 size={16} color="#4ade80" /> {refreshToast}
        </div>
      )}

      {error && (
        <div style={{ padding: '15px', backgroundColor: '#f8d7da', color: '#721c24', borderRadius: '8px', marginBottom: '25px' }}>
          {error}
        </div>
      )}

      {/* Top Operational Summary Cards (Zero Financial/Revenue Metrics) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        
        {/* Total Registered Clients */}
        <div style={{ backgroundColor: 'var(--bg-white)', padding: '22px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-soft)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-light)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Registered Clients</span>
            <Users size={22} color="var(--color-accent)" />
          </div>
          <p style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--color-primary)', margin: '6px 0 2px' }}>
            {reports.totalCustomers || clients.length}
          </p>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>Client profiles in clinic CRM</span>
        </div>

        {/* Clinical Treatments Recorded */}
        <div style={{ backgroundColor: 'var(--bg-white)', padding: '22px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-soft)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-light)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Treatments Recorded</span>
            <HeartPulse size={22} color="#155724" />
          </div>
          <p style={{ fontSize: '2rem', fontWeight: '800', color: '#155724', margin: '6px 0 2px' }}>
            {reports.totalTreatmentsRecorded || 0}
          </p>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>Clinical sessions completed</span>
        </div>

        {/* Active Client Enquiries */}
        <div style={{ backgroundColor: 'var(--bg-white)', padding: '22px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-soft)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-light)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active Enquiries</span>
            <MessageSquare size={22} color="#b45309" />
          </div>
          <p style={{ fontSize: '2rem', fontWeight: '800', color: '#b45309', margin: '6px 0 2px' }}>
            {activeMessages.length}
          </p>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>
            {reports.unreadEnquiries || 0} unread • {messages.length} total received
          </span>
        </div>

        {/* Staff Team */}
        <div style={{ backgroundColor: 'var(--bg-white)', padding: '22px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-soft)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-light)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Clinic Staff Team</span>
            <Briefcase size={22} color="var(--color-primary)" />
          </div>
          <p style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--color-primary)', margin: '6px 0 2px' }}>
            {staffInvitations.length}
          </p>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>Authorized operational staff</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '25px', flexWrap: 'wrap' }}>
        <button 
          onClick={() => setActiveTab('clients')} 
          style={{ 
            padding: '11px 18px', fontWeight: '700', borderRadius: '8px', cursor: 'pointer', border: 'none', 
            backgroundColor: activeTab === 'clients' ? 'var(--color-accent)' : 'var(--bg-white)', 
            color: activeTab === 'clients' ? '#fff' : 'var(--color-primary)', 
            boxShadow: 'var(--shadow-soft)', display: 'flex', alignItems: 'center', gap: '8px'
          }}>
          <Users size={16} /> Client CRM ({clients.length})
        </button>

        <button 
          onClick={() => setActiveTab('treatments')} 
          style={{ 
            padding: '11px 18px', fontWeight: '700', borderRadius: '8px', cursor: 'pointer', border: 'none', 
            backgroundColor: activeTab === 'treatments' ? 'var(--color-accent)' : 'var(--bg-white)', 
            color: activeTab === 'treatments' ? '#fff' : 'var(--color-primary)', 
            boxShadow: 'var(--shadow-soft)', display: 'flex', alignItems: 'center', gap: '8px'
          }}>
          <Sparkles size={16} /> Treatment Catalogue ({treatmentsList.length})
        </button>

        <button 
          onClick={() => setActiveTab('staff')} 
          style={{ 
            padding: '11px 18px', fontWeight: '700', borderRadius: '8px', cursor: 'pointer', border: 'none', 
            backgroundColor: activeTab === 'staff' ? 'var(--color-accent)' : 'var(--bg-white)', 
            color: activeTab === 'staff' ? '#fff' : 'var(--color-primary)', 
            boxShadow: 'var(--shadow-soft)', display: 'flex', alignItems: 'center', gap: '8px'
          }}>
          <Briefcase size={16} /> Staff Management ({staffInvitations.length})
        </button>

        <button 
          onClick={() => setActiveTab('messages')} 
          style={{ 
            padding: '11px 18px', fontWeight: '700', borderRadius: '8px', cursor: 'pointer', border: 'none', 
            backgroundColor: activeTab === 'messages' ? 'var(--color-accent)' : 'var(--bg-white)', 
            color: activeTab === 'messages' ? '#fff' : 'var(--color-primary)', 
            boxShadow: 'var(--shadow-soft)', display: 'flex', alignItems: 'center', gap: '8px'
          }}>
          <MessageSquare size={16} /> Inquiries ({activeMessages.length})
        </button>

        <button 
          onClick={() => setActiveTab('reports')} 
          style={{ 
            padding: '11px 18px', fontWeight: '700', borderRadius: '8px', cursor: 'pointer', border: 'none', 
            backgroundColor: activeTab === 'reports' ? 'var(--color-accent)' : 'var(--bg-white)', 
            color: activeTab === 'reports' ? '#fff' : 'var(--color-primary)', 
            boxShadow: 'var(--shadow-soft)', display: 'flex', alignItems: 'center', gap: '8px'
          }}>
          <FileText size={16} /> Operational Reports
        </button>

        <button 
          onClick={() => setActiveTab('audit')} 
          style={{ 
            padding: '11px 18px', fontWeight: '700', borderRadius: '8px', cursor: 'pointer', border: 'none', 
            backgroundColor: activeTab === 'audit' ? 'var(--color-accent)' : 'var(--bg-white)', 
            color: activeTab === 'audit' ? '#fff' : 'var(--color-primary)', 
            boxShadow: 'var(--shadow-soft)', display: 'flex', alignItems: 'center', gap: '8px'
          }}>
          <Shield size={16} /> Audit Trail ({auditLogs.length})
        </button>

        <button 
          onClick={() => setActiveTab('settings')} 
          style={{ 
            padding: '11px 18px', fontWeight: '700', borderRadius: '8px', cursor: 'pointer', border: 'none', 
            backgroundColor: activeTab === 'settings' ? 'var(--color-accent)' : 'var(--bg-white)', 
            color: activeTab === 'settings' ? '#fff' : 'var(--color-primary)', 
            boxShadow: 'var(--shadow-soft)', display: 'flex', alignItems: 'center', gap: '8px'
          }}>
          <Settings size={16} /> Clinic Settings
        </button>

        <button 
          onClick={() => setActiveTab('security')} 
          style={{ 
            padding: '11px 18px', fontWeight: '700', borderRadius: '8px', cursor: 'pointer', border: 'none', 
            backgroundColor: activeTab === 'security' ? 'var(--color-accent)' : 'var(--bg-white)', 
            color: activeTab === 'security' ? '#fff' : 'var(--color-primary)', 
            boxShadow: 'var(--shadow-soft)', display: 'flex', alignItems: 'center', gap: '8px'
          }}>
          <KeyRound size={16} /> Admin Password
        </button>

        <button 
          onClick={() => setActiveTab('appointments')} 
          style={{ 
            padding: '11px 18px', fontWeight: '700', borderRadius: '8px', cursor: 'pointer', border: 'none', 
            backgroundColor: activeTab === 'appointments' ? 'var(--color-accent)' : 'var(--bg-white)', 
            color: activeTab === 'appointments' ? '#fff' : 'var(--color-primary)', 
            boxShadow: 'var(--shadow-soft)', display: 'flex', alignItems: 'center', gap: '8px'
          }}>
          <Calendar size={16} /> Archived Visits ({appointments.length})
        </button>
      </div>

      {/* TAB 1: APPOINTMENTS */}
      {activeTab === 'appointments' && (
        <div style={{ backgroundColor: 'var(--bg-white)', padding: '30px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-soft)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
            <h2 style={{ fontSize: '1.4rem', color: 'var(--color-primary)', margin: 0, fontFamily: 'var(--font-heading)' }}>Live Patient Appointments</h2>
            
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
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
                <option value="ACTIVE">Active (Pending & Confirmed)</option>
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
                {filteredAppointments.length === 0 ? (
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
                          <td style={{ padding: '15px 12px', color: 'var(--text-light)' }}>{appt.appointmentDate ? String(appt.appointmentDate).split('T')[0] : '—'}<br/><span style={{ fontSize: '0.9rem' }}>{appt.appointmentTime}</span></td>
                          <td style={{ padding: '15px 12px' }}>
                            <select
                              value={appt.status || 'PENDING'}
                              onChange={(e) => handleQuickStatusChange(appt.id, e.target.value)}
                              title="Click to quickly change appointment status"
                              style={{ 
                                padding: '5px 10px', 
                                borderRadius: '20px', 
                                fontSize: '0.75rem', 
                                fontWeight: '700', 
                                cursor: 'pointer',
                                border: '1px solid rgba(0,0,0,0.1)',
                                backgroundColor: appt.status === 'CONFIRMED' ? '#d4edda' : appt.status === 'COMPLETED' ? '#cce5ff' : appt.status === 'PENDING' ? '#fff3cd' : '#f8d7da', 
                                color: appt.status === 'CONFIRMED' ? '#155724' : appt.status === 'COMPLETED' ? '#004085' : appt.status === 'PENDING' ? '#856404' : '#721c24',
                                outline: 'none'
                              }}
                            >
                              <option value="PENDING">PENDING</option>
                              <option value="CONFIRMED">CONFIRMED</option>
                              <option value="COMPLETED">COMPLETED</option>
                              <option value="CANCELLED">CANCELLED</option>
                              <option value="REJECTED">REJECTED</option>
                            </select>
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

      {/* TAB 2: CLIENT CRM */}
      {activeTab === 'clients' && (
        <div style={{ backgroundColor: 'var(--bg-white)', padding: '30px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-soft)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
            <div>
              <h2 style={{ fontSize: '1.4rem', color: 'var(--color-primary)', margin: 0, fontFamily: 'var(--font-heading)' }}>Client CRM & History</h2>
              <p style={{ color: 'var(--text-light)', fontSize: '0.85rem', margin: '4px 0 0 0' }}>Centralized directory of clinic patients and their clinical treatments.</p>
            </div>
            
            <div style={{ position: 'relative' }}>
              <Search size={18} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-light)' }} />
              <input 
                type="text" 
                placeholder="Search clients..." 
                value={clientSearchTerm}
                onChange={(e) => setClientSearchTerm(e.target.value)}
                style={{ padding: '8px 12px 8px 35px', borderRadius: '8px', border: '1px solid var(--border-light)', outline: 'none' }}
              />
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '750px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-light)', color: 'var(--text-light)', fontSize: '0.88rem' }}>
                  <th style={{ padding: '12px' }}>Client</th>
                  <th style={{ padding: '12px' }}>Email</th>
                  <th style={{ padding: '12px' }}>Phone</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>Sessions on File</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>Clinical Profile</th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.length === 0 ? (
                  <tr><td colSpan="5" style={{ textAlign: 'center', padding: '30px' }}>No clients found.</td></tr>
                ) : (
                  filteredClients.map((c) => (
                    <tr key={c.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={{ padding: '14px 12px', fontWeight: '600', color: 'var(--color-primary)' }}>{c.fullName}</td>
                      <td style={{ padding: '14px 12px', color: 'var(--text-light)', fontSize: '0.88rem' }}>{c.email}</td>
                      <td style={{ padding: '14px 12px', color: 'var(--text-light)', fontSize: '0.88rem' }}>{c.phone || '—'}</td>
                      <td style={{ padding: '14px 12px', textAlign: 'center' }}>
                        <span style={{ backgroundColor: '#f1f5f9', color: '#334155', padding: '4px 10px', borderRadius: '12px', fontSize: '0.78rem', fontWeight: '700' }}>
                          {c.treatmentCount || 0} treatments
                        </span>
                      </td>
                      <td style={{ padding: '14px 12px', textAlign: 'center' }}>
                        <button
                          onClick={() => handleViewClientDetails(c.id)}
                          style={{ backgroundColor: '#fbf9f6', border: '1px solid #ebdcd0', color: '#806657', padding: '6px 14px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer' }}
                        >
                          View File
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: OPERATIONAL REPORTS */}
      {activeTab === 'reports' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
          <div style={{ backgroundColor: 'var(--bg-white)', padding: '30px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-soft)' }}>
            <h3 style={{ fontSize: '1.3rem', color: 'var(--color-primary)', marginBottom: '8px', fontFamily: 'var(--font-heading)' }}>
              Treatment Volume & Service Popularity Breakdown
            </h3>
            <p style={{ color: 'var(--text-light)', fontSize: '0.88rem', marginBottom: '20px' }}>
              Operational clinic analysis tracking service demand across all skin and dermatology procedures (strictly non-financial).
            </p>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-light)', color: 'var(--text-light)', fontSize: '0.9rem' }}>
                    <th style={{ padding: '12px' }}>Treatment Service Name</th>
                    <th style={{ padding: '12px', textAlign: 'center' }}>Total Completed Sessions</th>
                    <th style={{ padding: '12px', textAlign: 'right' }}>Popularity Share</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.treatmentCounts && Object.keys(reports.treatmentCounts).length > 0 ? (
                    Object.entries(reports.treatmentCounts).map(([name, count]) => {
                      const total = reports.totalTreatmentsRecorded || 1;
                      const percentage = Math.round((count / total) * 100);
                      return (
                        <tr key={name} style={{ borderBottom: '1px solid var(--border-light)' }}>
                          <td style={{ padding: '14px 12px', fontWeight: '600', color: 'var(--color-primary)' }}>{name}</td>
                          <td style={{ padding: '14px 12px', textAlign: 'center', fontWeight: '700' }}>{count}</td>
                          <td style={{ padding: '14px 12px', textAlign: 'right', color: 'var(--text-light)' }}>{percentage}%</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr><td colSpan="3" style={{ textAlign: 'center', padding: '25px', color: 'var(--text-light)' }}>No treatment records logged yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: STAFF MANAGEMENT */}
      {activeTab === 'staff' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
          <div style={{ backgroundColor: '#f8f9fa', padding: '18px 24px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: '15px' }}>
            <Shield size={28} color="var(--color-primary)" />
            <div style={{ fontSize: '0.9rem', color: 'var(--text-main)', lineHeight: '1.5' }}>
              <strong>Generalist Staff Working Model:</strong> Authorized staff operate across the general clinic workspace (`/staff`). They can record clinical treatment sessions and answer inquiries, but have <strong>no access</strong> to owner settings or unauthorized patient medical data.
            </div>
          </div>

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

          {/* Send Staff Invitation */}
          <div style={{ backgroundColor: 'var(--bg-white)', padding: '30px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-soft)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
              <UserPlus size={22} color="var(--color-accent)" />
              <h3 style={{ fontSize: '1.3rem', color: 'var(--color-primary)', margin: 0, fontFamily: 'var(--font-heading)' }}>
                Invite New Staff Member
              </h3>
            </div>
            <p style={{ color: 'var(--text-light)', fontSize: '0.9rem', marginBottom: '20px' }}>
              Dispatches a secure single-use invitation link expiring in 24 hours. The employee sets their own password.
            </p>

            <form onSubmit={handleEnrollStaff} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '15px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '6px', color: 'var(--color-primary)' }}>Full Name *</label>
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
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '6px', color: 'var(--color-primary)' }}>Work Email *</label>
                <input 
                  type="email" 
                  placeholder="priya@dermaaline.com" 
                  value={newStaff.email}
                  onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                  required
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-light)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '6px', color: 'var(--color-primary)' }}>Designation</label>
                <input 
                  type="text" 
                  placeholder="e.g. Skin Therapist, Aesthetician" 
                  value={newStaff.designation}
                  onChange={(e) => setNewStaff({ ...newStaff, designation: e.target.value })}
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
                  <UserPlus size={16} /> {staffActionLoading ? 'Dispatching...' : 'Send Secure Invitation'}
                </button>
              </div>
            </form>
          </div>

          {/* Active Staff List Table */}
          <div style={{ backgroundColor: 'var(--bg-white)', padding: '30px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-soft)' }}>
            <h3 style={{ fontSize: '1.3rem', color: 'var(--color-primary)', marginBottom: '15px', fontFamily: 'var(--font-heading)' }}>
              Clinic Staff Team & Invitations
            </h3>
            
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-light)', color: 'var(--text-light)', fontSize: '0.9rem' }}>
                    <th style={{ padding: '12px' }}>Staff Worker</th>
                    <th style={{ padding: '12px' }}>Email</th>
                    <th style={{ padding: '12px' }}>Designation</th>
                    <th style={{ padding: '12px' }}>Status</th>
                    <th style={{ padding: '12px', textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {staffInvitations.length === 0 ? (
                    <tr><td colSpan="5" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-light)' }}>No staff members enrolled yet.</td></tr>
                  ) : (
                    staffInvitations.map((staff) => (
                      <tr key={staff.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                        <td style={{ padding: '14px 12px', fontWeight: '600', color: 'var(--color-primary)' }}>{staff.fullName || 'Clinic Staff'}</td>
                        <td style={{ padding: '14px 12px', color: 'var(--text-light)', fontSize: '0.9rem' }}>{staff.email}</td>
                        <td style={{ padding: '14px 12px', color: 'var(--color-primary)', fontWeight: '500' }}>{staff.designation || 'Skin Therapist'}</td>
                        <td style={{ padding: '14px 12px' }}>
                          <span style={{ 
                            padding: '4px 10px', borderRadius: '15px', fontSize: '0.75rem', fontWeight: '700', 
                            backgroundColor: staff.status === 'ACTIVE' ? '#d4edda' : staff.status === 'INVITED' ? '#fff3cd' : '#e2e3e5', 
                            color: staff.status === 'ACTIVE' ? '#155724' : staff.status === 'INVITED' ? '#856404' : '#383d41'
                          }}>
                            {staff.status || 'INVITED'}
                          </span>
                        </td>
                        <td style={{ padding: '14px 12px', textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', gap: '8px' }}>
                            {staff.status === 'INVITED' && (
                              <button 
                                onClick={() => handleResendStaffInvite(staff.id)}
                                style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '6px 10px', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer' }}
                              >
                                Resend
                              </button>
                            )}
                            <button 
                              onClick={() => handleRevokeStaff(staff.id)}
                              style={{ backgroundColor: '#dc3545', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}
                            >
                              Revoke
                            </button>
                          </div>
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

      {/* TAB 5: MESSAGES / INQUIRIES */}
      {activeTab === 'messages' && (
        <div style={{ backgroundColor: 'var(--bg-white)', padding: '30px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-soft)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
            <div>
              <h2 style={{ fontSize: '1.4rem', color: 'var(--color-primary)', margin: 0, fontFamily: 'var(--font-heading)' }}>Client Inquiries & Messages</h2>
              <p style={{ color: 'var(--text-light)', fontSize: '0.85rem', margin: '4px 0 0 0' }}>Review and resolve patient enquiries submitted through the clinic contact form.</p>
            </div>
            
            <div style={{ display: 'flex', gap: '8px', backgroundColor: '#faf7f2', padding: '4px', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
              <button
                onClick={() => setMessageFilter('ACTIVE')}
                style={{
                  padding: '7px 14px', borderRadius: '6px', fontSize: '0.82rem', fontWeight: '600', border: 'none', cursor: 'pointer',
                  backgroundColor: messageFilter === 'ACTIVE' ? 'var(--color-primary)' : 'transparent',
                  color: messageFilter === 'ACTIVE' ? '#ffffff' : 'var(--color-primary)'
                }}
              >
                Active Queries ({activeMessages.length})
              </button>
              <button
                onClick={() => setMessageFilter('RESOLVED')}
                style={{
                  padding: '7px 14px', borderRadius: '6px', fontSize: '0.82rem', fontWeight: '600', border: 'none', cursor: 'pointer',
                  backgroundColor: messageFilter === 'RESOLVED' ? 'var(--color-primary)' : 'transparent',
                  color: messageFilter === 'RESOLVED' ? '#ffffff' : 'var(--color-primary)'
                }}
              >
                Resolved Archive ({resolvedMessages.length})
              </button>
              <button
                onClick={() => setMessageFilter('ALL')}
                style={{
                  padding: '7px 14px', borderRadius: '6px', fontSize: '0.82rem', fontWeight: '600', border: 'none', cursor: 'pointer',
                  backgroundColor: messageFilter === 'ALL' ? 'var(--color-primary)' : 'transparent',
                  color: messageFilter === 'ALL' ? '#ffffff' : 'var(--color-primary)'
                }}
              >
                All ({messages.length})
              </button>
            </div>
          </div>

          {messageToast && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', borderRadius: '8px', marginBottom: '16px', fontSize: '0.85rem' }}>
              <CheckCircle2 size={16} /> <span>{messageToast}</span>
            </div>
          )}
          
          {loading ? (
            <p style={{ textAlign: 'center', padding: '30px', color: 'var(--text-light)' }}>Loading inquiries...</p>
          ) : displayedMessages.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-light)', border: '1px dashed var(--border-light)', borderRadius: '8px' }}>
              <MessageSquare size={32} color="#c2b4a8" style={{ marginBottom: '8px' }} />
              <p style={{ margin: 0, fontWeight: '500' }}>
                {messageFilter === 'ACTIVE' ? 'All patient inquiries are resolved!' : messageFilter === 'RESOLVED' ? 'No resolved queries in archive.' : 'No messages found.'}
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-light)', color: 'var(--text-light)', fontSize: '0.9rem' }}>
                    <th style={{ padding: '12px' }}>Sender Name</th>
                    <th style={{ padding: '12px' }}>Contact Info</th>
                    <th style={{ padding: '12px' }}>Message</th>
                    <th style={{ padding: '12px', textAlign: 'center' }}>Status</th>
                    <th style={{ padding: '12px', textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedMessages.map((msg) => {
                    const isResolved = (msg.status || '').toUpperCase() === 'RESOLVED';
                    const isRead = (msg.status || '').toUpperCase() === 'READ';
                    return (
                      <tr key={msg.id} style={{ borderBottom: '1px solid var(--border-light)', backgroundColor: isResolved ? '#fafafa' : isRead ? 'transparent' : 'rgba(217, 119, 6, 0.03)' }}>
                        <td style={{ padding: '15px 12px', fontWeight: '600', color: 'var(--color-primary)' }}>{msg.name}</td>
                        <td style={{ padding: '15px 12px', color: 'var(--text-light)', fontSize: '0.9rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}><Mail size={14} /> {msg.email}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Phone size={14} /> {msg.phone}</div>
                        </td>
                        <td style={{ padding: '15px 12px', maxWidth: '300px', wordBreak: 'break-word', fontSize: '0.92rem' }}>{msg.message}</td>
                        <td style={{ padding: '15px 12px', textAlign: 'center' }}>
                          <span style={{
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            fontWeight: '700',
                            backgroundColor: isResolved ? '#d4edda' : isRead ? '#e2e8f0' : '#fef3c7',
                            color: isResolved ? '#155724' : isRead ? '#475569' : '#92400e',
                            border: `1px solid ${isResolved ? '#c3e6cb' : isRead ? '#cbd5e1' : '#fde68a'}`
                          }}>
                            {isResolved ? 'RESOLVED' : isRead ? 'READ' : 'UNREAD'}
                          </span>
                        </td>
                        <td style={{ padding: '15px 12px', textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                            {isResolved ? (
                              <button 
                                onClick={() => handleReopenMessage(msg.id)} 
                                title="Reopen query and move back to active"
                                style={{ 
                                  backgroundColor: '#6c757d', 
                                  color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', 
                                  cursor: 'pointer', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px' 
                                }}
                              >
                                Reopen
                              </button>
                            ) : (
                              <button 
                                onClick={() => handleResolveMessage(msg.id)} 
                                title="Resolve query and remove from active list"
                                style={{ 
                                  backgroundColor: '#198754', 
                                  color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '6px', 
                                  cursor: 'pointer', fontSize: '0.82rem', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '5px' 
                                }}
                              >
                                <CheckCircle2 size={14} /> Resolve Query
                              </button>
                            )}
                            <button 
                              onClick={() => handleDeleteMessage(msg.id)} 
                              title="Delete query permanently"
                              style={{ backgroundColor: '#dc3545', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 6: CLINIC SETTINGS */}
      {activeTab === 'settings' && (
        <div style={{ backgroundColor: 'var(--bg-white)', padding: '36px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-soft)', maxWidth: '750px', margin: '0 auto' }}>
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '1.4rem', color: 'var(--color-primary)', fontFamily: 'var(--font-heading)', fontWeight: '600', margin: '0 0 6px 0' }}>Clinic Settings & Information</h2>
            <p style={{ color: 'var(--text-light)', fontSize: '0.88rem', margin: 0 }}>Configure official public clinic contact and operational parameters.</p>
          </div>

          {settingsSuccess && (
            <div style={{ padding: '12px 16px', backgroundColor: '#d4edda', color: '#155724', borderRadius: '8px', marginBottom: '20px' }}>
              {settingsSuccess}
            </div>
          )}

          <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '6px', color: 'var(--color-primary)' }}>Official Clinic Name</label>
              <input
                type="text"
                required
                value={settings.clinicName}
                onChange={(e) => setSettings({ ...settings, clinicName: e.target.value })}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-light)' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '6px', color: 'var(--color-primary)' }}>Public Contact Email</label>
                <input
                  type="email"
                  required
                  value={settings.contactEmail}
                  onChange={(e) => setSettings({ ...settings, contactEmail: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-light)' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '6px', color: 'var(--color-primary)' }}>Contact Phone Number</label>
                <input
                  type="text"
                  required
                  value={settings.contactPhone}
                  onChange={(e) => setSettings({ ...settings, contactPhone: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-light)' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '6px', color: 'var(--color-primary)' }}>Clinic Location Address</label>
              <input
                type="text"
                value={settings.address}
                onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-light)' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '6px', color: 'var(--color-primary)' }}>Consultation & Opening Hours</label>
              <input
                type="text"
                value={settings.openingHours}
                onChange={(e) => setSettings({ ...settings, openingHours: e.target.value })}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-light)' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '6px', color: 'var(--color-primary)' }}>Clinic Description</label>
              <textarea
                rows={3}
                value={settings.generalInformation}
                onChange={(e) => setSettings({ ...settings, generalInformation: e.target.value })}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-light)' }}
              />
            </div>

            <button type="submit" disabled={settingsLoading} className="btn-primary" style={{ padding: '12px', fontWeight: '600', marginTop: '6px' }}>
              {settingsLoading ? 'Saving...' : 'Save Settings'}
            </button>
          </form>
        </div>
      )}

      {/* TAB 7: SECURITY & ADMIN PASSWORD */}
      {activeTab === 'security' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '25px', maxWidth: '650px', margin: '0 auto' }}>
          <div style={{ backgroundColor: 'var(--bg-white)', padding: '35px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-soft)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
              <KeyRound size={24} color="var(--color-accent)" />
              <h3 style={{ fontSize: '1.35rem', color: 'var(--color-primary)', margin: 0, fontFamily: 'var(--font-heading)' }}>
                Change Owner Administrator Password
              </h3>
            </div>
            <p style={{ color: 'var(--text-light)', fontSize: '0.9rem', marginBottom: '25px', lineHeight: '1.5' }}>
              Update your master administrator credentials directly. Changes apply immediately with BCrypt encryption.
            </p>

            {passwordSuccess && (
              <div style={{ padding: '14px 18px', backgroundColor: '#d4edda', color: '#155724', borderRadius: '8px', border: '1px solid #c3e6cb', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={18} /> {passwordSuccess}
              </div>
            )}
            {passwordError && (
              <div style={{ padding: '14px 18px', backgroundColor: '#f8d7da', color: '#721c24', borderRadius: '8px', border: '1px solid #f5c6cb', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={18} /> {passwordError}
              </div>
            )}

            <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '6px', color: 'var(--color-primary)' }}>Current Admin Password *</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type={showOldPassword ? "text" : "password"} 
                    placeholder="Enter existing password"
                    value={passwordForm.oldPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })}
                    required
                    style={{ width: '100%', padding: '11px 40px 11px 14px', borderRadius: '8px', border: '1px solid var(--border-light)', outline: 'none' }}
                  />
                  <button type="button" onClick={() => setShowOldPassword(!showOldPassword)} style={{ position: 'absolute', right: '12px', top: '12px', background: 'none', border: 'none', color: 'var(--text-light)', cursor: 'pointer' }}>
                    {showOldPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '6px', color: 'var(--color-primary)' }}>New Admin Password *</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type={showNewPassword ? "text" : "password"} 
                    placeholder="Minimum 6 characters"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    required
                    style={{ width: '100%', padding: '11px 40px 11px 14px', borderRadius: '8px', border: '1px solid var(--border-light)', outline: 'none' }}
                  />
                  <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} style={{ position: 'absolute', right: '12px', top: '12px', background: 'none', border: 'none', color: 'var(--text-light)', cursor: 'pointer' }}>
                    {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '6px', color: 'var(--color-primary)' }}>Confirm New Password *</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type={showConfirmPassword ? "text" : "password"} 
                    placeholder="Re-enter new password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    required
                    style={{ width: '100%', padding: '11px 40px 11px 14px', borderRadius: '8px', border: '1px solid var(--border-light)', outline: 'none' }}
                  />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} style={{ position: 'absolute', right: '12px', top: '12px', background: 'none', border: 'none', color: 'var(--text-light)', cursor: 'pointer' }}>
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={passwordLoading}
                className="btn-primary" 
                style={{ padding: '12px 20px', fontWeight: '700', marginTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <Lock size={16} /> {passwordLoading ? 'Updating Password...' : 'Save New Admin Password'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB: TREATMENT CATALOGUE */}
      {activeTab === 'treatments' && (
        <div style={{ backgroundColor: 'var(--bg-white)', padding: '30px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-soft)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
            <div>
              <h2 style={{ fontSize: '1.4rem', color: 'var(--color-primary)', margin: '0 0 4px', fontFamily: 'var(--font-heading)' }}>
                Clinical Treatment Catalogue
              </h2>
              <p style={{ color: 'var(--text-light)', fontSize: '0.85rem', margin: 0 }}>
                Manage treatment offerings. Treatment prices are catalogue information only and never generate invoices or payments.
              </p>
            </div>
            <button 
              onClick={() => {
                setTreatmentForm({ name: '', category: 'Facial Aesthetics', description: '', price: '', durationMinutes: 60, active: true });
                setShowTreatmentModal(true);
              }}
              className="btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 18px', fontWeight: '700', fontSize: '0.85rem' }}
            >
              <Sparkles size={16} /> Add Treatment Entry
            </button>
          </div>

          {treatmentToast && (
            <div style={{ padding: '12px 18px', backgroundColor: '#d4edda', color: '#155724', borderRadius: '8px', border: '1px solid #c3e6cb', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={16} /> {treatmentToast}
            </div>
          )}

          {treatmentsList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--text-light)', border: '1px dashed var(--border-light)', borderRadius: '12px' }}>
              No treatments configured in catalogue yet. Click "Add Treatment Entry" above to add clinic offerings.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-light)', color: 'var(--text-light)', fontSize: '0.85rem' }}>
                    <th style={{ padding: '12px 14px' }}>Treatment Name</th>
                    <th style={{ padding: '12px 14px' }}>Category</th>
                    <th style={{ padding: '12px 14px' }}>Catalogue Price</th>
                    <th style={{ padding: '12px 14px' }}>Est. Duration</th>
                    <th style={{ padding: '12px 14px' }}>Public Status</th>
                    <th style={{ padding: '12px 14px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {treatmentsList.map((tr) => (
                    <tr key={tr.id} style={{ borderBottom: '1px solid var(--border-light)', fontSize: '0.9rem' }}>
                      <td style={{ padding: '14px', fontWeight: '600', color: 'var(--color-primary)' }}>
                        {tr.name}
                      </td>
                      <td style={{ padding: '14px', color: 'var(--text-light)' }}>
                        {tr.category || 'Clinical Treatment'}
                      </td>
                      <td style={{ padding: '14px', color: '#2c221e', fontWeight: '600' }}>
                        {tr.price ? `₹${tr.price}` : 'Consultation'}
                      </td>
                      <td style={{ padding: '14px', color: 'var(--text-light)' }}>
                        {tr.durationMinutes ? `${tr.durationMinutes} mins` : '60 mins'}
                      </td>
                      <td style={{ padding: '14px' }}>
                        <span style={{
                          padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '700',
                          backgroundColor: tr.active ? '#d4edda' : '#f8d7da',
                          color: tr.active ? '#155724' : '#721c24'
                        }}>
                          {tr.active ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </td>
                      <td style={{ padding: '14px', textAlign: 'right' }}>
                        <button
                          onClick={() => handleToggleTreatmentActive(tr)}
                          style={{
                            backgroundColor: '#faf8f5', border: '1px solid #ebdcd0', color: '#806657',
                            padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600', marginRight: '8px'
                          }}
                        >
                          {tr.active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => {
                            setTreatmentForm(tr);
                            setShowTreatmentModal(true);
                          }}
                          style={{
                            backgroundColor: '#f7f2ed', border: '1px solid #d4c3b3', color: '#2c221e',
                            padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600'
                          }}
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB: AUDIT LOGS */}
      {activeTab === 'audit' && (
        <div style={{ backgroundColor: 'var(--bg-white)', padding: '30px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-soft)' }}>
          <div style={{ marginBottom: '20px' }}>
            <h2 style={{ fontSize: '1.4rem', color: 'var(--color-primary)', margin: '0 0 4px', fontFamily: 'var(--font-heading)' }}>
              Operational & Security Audit Trail
            </h2>
            <p style={{ color: 'var(--text-light)', fontSize: '0.85rem', margin: 0 }}>
              Immutable record of administrative actions, staff invitations, account status alterations, and security operations.
            </p>
          </div>

          {auditLogs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--text-light)', border: '1px dashed var(--border-light)', borderRadius: '12px' }}>
              No audit logs recorded yet. Security events and operational tasks will automatically appear here.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-light)', color: 'var(--text-light)', fontSize: '0.85rem' }}>
                    <th style={{ padding: '12px 14px' }}>Timestamp</th>
                    <th style={{ padding: '12px 14px' }}>Action</th>
                    <th style={{ padding: '12px 14px' }}>Actor</th>
                    <th style={{ padding: '12px 14px' }}>Target Entity</th>
                    <th style={{ padding: '12px 14px' }}>Operational Details</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log) => (
                    <tr key={log.id} style={{ borderBottom: '1px solid var(--border-light)', fontSize: '0.88rem' }}>
                      <td style={{ padding: '12px 14px', color: 'var(--text-light)', whiteSpace: 'nowrap' }}>
                        {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'Recent'}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '700',
                          backgroundColor: log.action?.includes('SUCCESS') ? '#d4edda' : log.action?.includes('FAILED') ? '#f8d7da' : '#e0f2fe',
                          color: log.action?.includes('SUCCESS') ? '#155724' : log.action?.includes('FAILED') ? '#721c24' : '#0369a1'
                        }}>
                          {log.action}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: '600', color: 'var(--color-primary)' }}>
                        {log.performedBy || 'System'} <span style={{ fontSize: '0.75rem', color: 'var(--text-light)', fontWeight: 'normal' }}>({log.role})</span>
                      </td>
                      <td style={{ padding: '12px 14px', color: '#5c4d44' }}>
                        {log.targetEntity} {log.targetId ? `#${log.targetId}` : ''}
                      </td>
                      <td style={{ padding: '12px 14px', color: '#2c221e' }}>
                        {log.details}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL: ADD / EDIT TREATMENT */}
      {showTreatmentModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#ffffff', borderRadius: '16px', padding: '32px',
            maxWidth: '550px', width: '100%', maxHeight: '90vh', overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '1.3rem', color: '#2c221e', margin: 0, fontWeight: '600' }}>
                {treatmentForm.id ? 'Edit Treatment Catalogue Entry' : 'Create Treatment Catalogue Entry'}
              </h2>
              <button onClick={() => setShowTreatmentModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <form onSubmit={handleSaveTreatment} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '6px', color: '#4a3b32' }}>Treatment Name *</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. HydraFacial Elite Rejuvenation"
                  value={treatmentForm.name}
                  onChange={(e) => setTreatmentForm({ ...treatmentForm, name: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #ebdcd0', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '6px', color: '#4a3b32' }}>Category *</label>
                <select
                  value={treatmentForm.category}
                  onChange={(e) => setTreatmentForm({ ...treatmentForm, category: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #ebdcd0', outline: 'none', backgroundColor: '#fff' }}
                >
                  <option value="Facial Aesthetics">Facial Aesthetics</option>
                  <option value="Laser Care">Laser Care</option>
                  <option value="Anti-Aging">Anti-Aging</option>
                  <option value="Acne & Scars">Acne & Scars</option>
                  <option value="Skin Rejuvenation">Skin Rejuvenation</option>
                  <option value="Clinical Peels">Clinical Peels</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '6px', color: '#4a3b32' }}>Catalogue Price (INR)</label>
                  <input 
                    type="number"
                    placeholder="e.g. 4500"
                    value={treatmentForm.price}
                    onChange={(e) => setTreatmentForm({ ...treatmentForm, price: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #ebdcd0', outline: 'none' }}
                  />
                  <span style={{ fontSize: '0.75rem', color: '#8c7b70', display: 'block', marginTop: '4px' }}>Informational guide price</span>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '6px', color: '#4a3b32' }}>Expected Duration (mins)</label>
                  <input 
                    type="number"
                    value={treatmentForm.durationMinutes}
                    onChange={(e) => setTreatmentForm({ ...treatmentForm, durationMinutes: parseInt(e.target.value) || 60 })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #ebdcd0', outline: 'none' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '6px', color: '#4a3b32' }}>Description</label>
                <textarea 
                  rows={3}
                  placeholder="Clinical treatment summary and benefits..."
                  value={treatmentForm.description}
                  onChange={(e) => setTreatmentForm({ ...treatmentForm, description: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #ebdcd0', outline: 'none', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input 
                  type="checkbox"
                  id="activeCheck"
                  checked={treatmentForm.active}
                  onChange={(e) => setTreatmentForm({ ...treatmentForm, active: e.target.checked })}
                />
                <label htmlFor="activeCheck" style={{ fontSize: '0.85rem', color: '#4a3b32', cursor: 'pointer', fontWeight: '600' }}>
                  Show in public treatment catalogue on clinic website
                </label>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                  type="submit"
                  disabled={treatmentSaving}
                  className="btn-primary"
                  style={{ flex: 1, padding: '11px', fontWeight: '700' }}
                >
                  {treatmentSaving ? 'Saving...' : 'Save Catalogue Entry'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowTreatmentModal(false)}
                  style={{ backgroundColor: '#fff', border: '1px solid #ebdcd0', padding: '11px 18px', borderRadius: '8px', cursor: 'pointer', color: '#6e5d53' }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CLIENT DETAIL VIEW */}
      {selectedClient && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#ffffff', borderRadius: '16px', padding: '32px',
            maxWidth: '650px', width: '100%', maxHeight: '85vh', overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '1.4rem', color: '#2c221e', margin: 0, fontWeight: '600' }}>
                  {selectedClient.customer?.fullName}
                </h2>
                <span style={{ fontSize: '0.85rem', color: '#8c7b70' }}>{selectedClient.customer?.email} • {selectedClient.customer?.phone || 'No phone'}</span>
              </div>
              <button onClick={() => setSelectedClient(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <h3 style={{ fontSize: '1.1rem', color: '#806657', marginBottom: '12px' }}>Clinical Treatment Records</h3>
            {(!selectedClient.treatments || selectedClient.treatments.length === 0) ? (
              <p style={{ color: '#8c7b70', fontStyle: 'italic', padding: '20px 0' }}>No clinical treatments recorded for this client yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {selectedClient.treatments.map((tr) => (
                  <div key={tr.id} style={{ border: '1px solid #ebdcd0', borderRadius: '8px', padding: '16px', backgroundColor: '#faf8f5' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontWeight: '600', color: '#2c221e' }}>{tr.treatmentName}</span>
                      <span style={{ fontSize: '0.82rem', color: '#8c7b70' }}>{new Date(tr.treatmentDate).toLocaleDateString()}</span>
                    </div>
                    {tr.clinicalNotes && <p style={{ fontSize: '0.85rem', color: '#5c4d44', margin: '0 0 6px 0' }}><b>Notes:</b> {tr.clinicalNotes}</p>}
                    <p style={{ fontSize: '0.82rem', color: '#854d0e', margin: 0 }}><b>Aftercare:</b> {tr.aftercareInstructions}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
