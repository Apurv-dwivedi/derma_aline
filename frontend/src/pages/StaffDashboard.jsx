import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  HeartPulse, Users, MessageSquare, Calendar, RefreshCw, LogOut, 
  Search, CheckCircle2, AlertCircle, Plus,
  ShieldCheck, Sparkles, X, KeyRound, Menu
} from 'lucide-react';
import API, { performServerLogout } from '../services/api';
import { TREATMENTS_DATA, TREATMENT_CATEGORIES } from '../data/treatmentsData';
import '../styles/pages.css';

const StaffDashboard = () => {
  const navigate = useNavigate();

  // Active Tab: 'treatments' | 'catalogue' | 'queue' | 'customers' | 'enquiries'
  const [activeTab, setActiveTab] = useState('treatments');

  // Data States
  const [treatmentRecords, setTreatmentRecords] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [enquiries, setEnquiries] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [treatmentsList, setTreatmentsList] = useState([]);

  // UI States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Search States
  const [searchTerm, setSearchTerm] = useState('');
  const [enquiryFilter, setEnquiryFilter] = useState('ACTIVE'); // 'ACTIVE' | 'RESOLVED' | 'ALL'
  const [catalogueSearch, setCatalogueSearch] = useState('');
  const [catalogueCategory, setCatalogueCategory] = useState('all');

  // Modals
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [recordForm, setRecordForm] = useState({
    customerEmail: '',
    treatmentName: '',
    treatmentDate: new Date().toISOString().split('T')[0],
    description: '',
    clinicalNotes: '',
    aftercareInstructions: 'Keep skin clean and hydrated. Avoid sun exposure and apply broad-spectrum SPF 50+ regularly.'
  });
  const [recordSaving, setRecordSaving] = useState(false);

  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerForm, setCustomerForm] = useState({ fullName: '', email: '', phone: '', notes: '' });
  const [customerSaving, setCustomerSaving] = useState(false);

  // Staff Password Change with 6-Digit OTP State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [staffPasswordForm, setStaffPasswordForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
    otp: ''
  });
  const [staffPasswordLoading, setStaffPasswordLoading] = useState(false);
  const [staffOtpRequesting, setStaffOtpRequesting] = useState(false);
  const [staffOtpSent, setStaffOtpSent] = useState(false);
  const [staffPasswordError, setStaffPasswordError] = useState('');
  const [staffPasswordSuccess, setStaffPasswordSuccess] = useState('');

  const [refreshing, setRefreshing] = useState(false);
  const [refreshToast, setRefreshToast] = useState('');

  const staffName = localStorage.getItem('fullName') || 'Clinical Staff';
  const staffRole = localStorage.getItem('role') || 'STAFF';

  const fetchDashboardData = useCallback(async (isManual = false) => {
    if (isManual) {
      setRefreshing(true);
      setError('');
    }

    try {
      const [, treatRecordsRes, custRes, enqRes, apptRes, treatsRes] = await Promise.all([
        API.get('/staff/dashboard').catch(() => ({ data: {} })),
        API.get('/staff/treatments/records').catch(() => ({ data: [] })),
        API.get('/staff/customers').catch(() => ({ data: [] })),
        API.get('/staff/enquiries').catch(() => ({ data: [] })),
        API.get('/staff/appointments').catch(() => ({ data: [] })),
        API.get('/treatments/active').catch(() => ({ data: [] }))
      ]);

      setTreatmentRecords(treatRecordsRes.data || []);
      setCustomers(custRes.data || []);
      setEnquiries(enqRes.data || []);
      setAppointments(apptRes.data || []);
      setTreatmentsList(treatsRes.data || []);

      if (isManual) {
        setRefreshToast('Clinical workspace synchronized.');
        setTimeout(() => setRefreshToast(''), 3000);
      }
    } catch (err) {
      console.error("Failed to load staff workspace:", err);
      setError('Unable to load clinical workspace. Please check your authentication.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDashboardData();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchDashboardData]);

  const handleCreateTreatmentRecord = async (e) => {
    e.preventDefault();
    setRecordSaving(true);
    setError('');

    try {
      await API.post('/staff/treatments/records', recordForm);
      setSuccessMessage('Clinical treatment session successfully recorded!');
      setShowRecordModal(false);
      setRecordForm({
        customerEmail: '',
        treatmentName: '',
        treatmentDate: new Date().toISOString().split('T')[0],
        description: '',
        clinicalNotes: '',
        aftercareInstructions: 'Keep skin clean and hydrated. Avoid sun exposure and apply broad-spectrum SPF 50+ regularly.'
      });
      fetchDashboardData();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to record treatment.');
    } finally {
      setRecordSaving(false);
    }
  };

  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    setCustomerSaving(true);
    setError('');

    try {
      await API.post('/staff/customers', customerForm);
      setSuccessMessage('Client profile successfully created!');
      setShowCustomerModal(false);
      setCustomerForm({ fullName: '', email: '', phone: '', notes: '' });
      fetchDashboardData();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create client.');
    } finally {
      setCustomerSaving(false);
    }
  };

  const handleUpdateEnquiryStatus = async (id, status) => {
    try {
      await API.patch(`/staff/enquiries/${id}/status`, { status });
      setEnquiries((prev) =>
        prev.map((e) => (e.id === id ? { ...e, status } : e))
      );
      setSuccessMessage(`Enquiry marked as ${status}`);
      setTimeout(() => setSuccessMessage(''), 2500);
    } catch {
      setError('Failed to update enquiry status.');
    }
  };

  const handleUpdateAppointmentStatus = async (id, status) => {
    try {
      await API.patch(`/staff/appointments/${id}/status`, { status });
      setAppointments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status } : a))
      );
      setSuccessMessage(`Appointment status updated to ${status}`);
      setTimeout(() => setSuccessMessage(''), 2500);
    } catch {
      setError('Failed to update status.');
    }
  };

  const handleOpenPasswordModal = () => {
    setStaffPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '', otp: '' });
    setStaffPasswordError('');
    setStaffPasswordSuccess('');
    setStaffOtpSent(false);
    setShowPasswordModal(true);
  };

  const handleRequestStaffOtp = async () => {
    const email = localStorage.getItem('email') || '';
    if (!email) {
      setStaffPasswordError('Staff email not found. Please log in again.');
      return;
    }
    setStaffOtpRequesting(true);
    setStaffPasswordError('');
    try {
      const res = await API.post('/auth/password/request-otp', { email });
      setStaffOtpSent(true);
      setStaffPasswordSuccess(res.data?.message || `A 6-digit verification code has been dispatched to ${email}.`);
      setTimeout(() => setStaffPasswordSuccess(''), 6000);
    } catch (err) {
      setStaffPasswordError(err.response?.data?.message || 'Failed to dispatch verification code. Please try again.');
    } finally {
      setStaffOtpRequesting(false);
    }
  };

  const handleUpdateStaffPassword = async (e) => {
    e.preventDefault();
    const email = localStorage.getItem('email') || '';
    if (!email) {
      setStaffPasswordError('Staff email not found. Please log in again.');
      return;
    }
    if (!staffPasswordForm.oldPassword) {
      setStaffPasswordError('Current password is required.');
      return;
    }
    if (staffPasswordForm.newPassword !== staffPasswordForm.confirmPassword) {
      setStaffPasswordError('New passwords do not match.');
      return;
    }
    if (staffPasswordForm.newPassword.length < 6) {
      setStaffPasswordError('New password must be at least 6 characters long.');
      return;
    }
    if (!staffPasswordForm.otp || staffPasswordForm.otp.trim().length !== 6) {
      setStaffPasswordError('Please enter the 6-digit OTP received in your mailbox.');
      return;
    }

    setStaffPasswordLoading(true);
    setStaffPasswordError('');
    try {
      const res = await API.post('/auth/change-password', {
        email,
        oldPassword: staffPasswordForm.oldPassword.trim(),
        newPassword: staffPasswordForm.newPassword.trim(),
        otp: staffPasswordForm.otp.trim()
      });
      setStaffPasswordSuccess(res.data?.message || 'Password updated successfully!');
      setTimeout(() => {
        setShowPasswordModal(false);
        setStaffPasswordSuccess('');
      }, 2000);
    } catch (err) {
      setStaffPasswordError(err.response?.data?.message || 'Failed to update password. Please check your credentials and OTP.');
    } finally {
      setStaffPasswordLoading(false);
    }
  };

  const handleLogout = async () => {
    await performServerLogout();
    navigate('/staff-login');
  };

  const filteredCustomers = customers.filter((c) => {
    const q = searchTerm.toLowerCase();
    return (
      (c.fullName && c.fullName.toLowerCase().includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      (c.phone && c.phone.includes(q))
    );
  });

  const filteredTreatmentRecords = treatmentRecords.filter((tr) => {
    const q = searchTerm.toLowerCase();
    return (
      (tr.treatmentName && tr.treatmentName.toLowerCase().includes(q)) ||
      (tr.customerName && tr.customerName.toLowerCase().includes(q)) ||
      (tr.customerEmail && tr.customerEmail.toLowerCase().includes(q))
    );
  });

  // Active patient enquiries awaiting resolution (excludes RESOLVED)
  const activeEnquiries = enquiries.filter((e) => {
    const st = (e.status || 'UNREAD').toUpperCase();
    return st !== 'RESOLVED';
  });

  // Resolved patient enquiries archive
  const resolvedEnquiries = enquiries.filter((e) => {
    const st = (e.status || 'UNREAD').toUpperCase();
    return st === 'RESOLVED';
  });

  // Filtered enquiries based on sub-tab
  const displayedEnquiries = enquiries.filter((e) => {
    const st = (e.status || 'UNREAD').toUpperCase();
    if (enquiryFilter === 'ACTIVE') return st !== 'RESOLVED';
    if (enquiryFilter === 'RESOLVED') return st === 'RESOLVED';
    return true;
  });

  const staffTabs = [
    { id: 'treatments', label: 'Clinical Treatment Records', count: treatmentRecords.length, icon: HeartPulse },
    { id: 'catalogue', label: 'Treatment Catalogue & Prices', count: 55, icon: Sparkles },
    { id: 'queue', label: 'Client Appointments', count: appointments.length, icon: Calendar },
    { id: 'customers', label: 'Client Directory', count: customers.length, icon: Users },
    { id: 'enquiries', label: 'Client Enquiries', count: activeEnquiries.length, icon: MessageSquare }
  ];

  const currentActiveTabObj = staffTabs.find((t) => t.id === activeTab) || staffTabs[0];
  const ActiveTabIcon = currentActiveTabObj.icon;

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '16px 20px 60px 20px' }}>
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

      {/* Staff Suite Responsive Layout with Left Sidebar */}
      <div className="admin-suite-layout">
        {/* Left Navigation Sidebar (Desktop Pinned Left / Mobile Slide-Over Drawer) */}
        <aside className={`admin-suite-sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}>
          {/* Mobile-Only Header with Close Button */}
          <div className="client-sidebar-mobile-header">
            <span className="client-sidebar-title">Staff Navigation</span>
            <button 
              type="button" 
              className="client-sidebar-close-btn"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close navigation menu"
            >
              <X size={18} />
            </button>
          </div>

          {/* Staff Identity Card in Sidebar */}
          <div className="client-sidebar-profile-card">
            <div className="client-sidebar-avatar-wrap" style={{ cursor: 'default' }}>
              <HeartPulse size={34} />
            </div>

            <div className="client-sidebar-verified-badge" style={{ backgroundColor: '#f0fdf4', color: '#166534', padding: '3px 8px', borderRadius: '12px' }}>
              <ShieldCheck size={12} color="#16a34a" /> CLINICAL STAFF SUITE
            </div>

            <h2 className="client-sidebar-user-name">
              {staffName || 'Operating Staff'}
            </h2>

            <div className="client-sidebar-user-meta">
              {staffRole || 'Skin Specialist'}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#8c7b70', wordBreak: 'break-all', marginTop: '2px' }}>
              {localStorage.getItem('email') || ''}
            </div>

            <div className="client-sidebar-actions" style={{ flexDirection: 'column', gap: '6px', width: '100%', marginTop: '14px' }}>
              <button
                type="button"
                onClick={() => fetchDashboardData(true)}
                disabled={refreshing || loading}
                title="Refresh clinical records"
                className="client-sidebar-action-btn client-sidebar-refresh-btn"
                style={{ width: '100%', justifyContent: 'center' }}
              >
                <RefreshCw size={13} style={{ animation: (refreshing || loading) ? 'spin 0.8s linear infinite' : 'none' }} />
                <span>{refreshing ? 'Syncing...' : 'Refresh'}</span>
              </button>

              <button
                type="button"
                onClick={handleOpenPasswordModal}
                title="Change your staff workspace password with 6-digit email OTP"
                className="client-sidebar-action-btn"
                style={{ width: '100%', justifyContent: 'center', backgroundColor: '#fdfbf9', border: '1px solid #ebdcd0', color: '#806657' }}
              >
                <KeyRound size={13} />
                <span>Change Password</span>
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="client-sidebar-action-btn client-sidebar-logout-btn"
                style={{ width: '100%', justifyContent: 'center' }}
              >
                <LogOut size={13} />
                <span>Sign Out</span>
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div className="client-sidebar-title">Clinical Navigation</div>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {staffTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(tab.id);
                      setMobileMenuOpen(false);
                      setSearchTerm('');
                    }}
                    className={`client-nav-btn ${isActive ? 'active' : ''}`}
                  >
                    <span className="client-nav-btn-content">
                      <Icon size={17} style={{ flexShrink: 0 }} />
                      <span>{tab.label}</span>
                    </span>
                    {tab.count !== undefined && (
                      <span className="client-nav-badge">
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Mobile Backdrop Overlay */}
        {mobileMenuOpen && (
          <div 
            className="admin-suite-backdrop"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Main Content Area */}
        <main className="admin-suite-content">
          {/* Mobile-Only Bar with Hamburger: Strictly hidden on desktop, visible on phone */}
          <div className="admin-mobile-bar">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="client-mobile-hamburger-btn"
              aria-label="Toggle navigation menu"
            >
              <Menu size={18} />
              <span>Menu</span>
            </button>
            <div className="client-mobile-active-tab">
              <ActiveTabIcon size={15} />
              <span>{currentActiveTabObj?.label || 'Staff Portal'}</span>
            </div>
          </div>

          {/* Staff Content Header Card */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            padding: '24px 28px',
            border: '1px solid #ebdcd0',
            boxShadow: '0 4px 20px rgba(44, 34, 30, 0.03)',
            marginBottom: '22px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            <div>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: '#f7f2ed',
                padding: '4px 12px',
                borderRadius: '15px',
                fontSize: '0.75rem',
                fontWeight: '700',
                letterSpacing: '0.08em',
                color: '#806657',
                marginBottom: '6px',
                textTransform: 'uppercase'
              }}>
                <ShieldCheck size={14} color="#16a34a" /> Generalist Clinical Operations
              </div>
              <h1 style={{
                fontSize: '1.65rem',
                color: '#2c221e',
                fontFamily: 'var(--font-heading)',
                fontWeight: '600',
                margin: '0 0 4px 0'
              }}>
                Staff Clinical Workspace
              </h1>
              <p style={{ margin: 0, color: '#8c7b70', fontSize: '0.88rem' }}>
                Operating Practitioner: <b>{staffName}</b> ({staffRole})
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <button
                onClick={() => setShowRecordModal(true)}
                className="btn-primary"
                style={{ padding: '10px 18px', fontSize: '0.85rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Plus size={16} /> Record Treatment
              </button>
              <button
                onClick={() => setShowCustomerModal(true)}
                style={{
                  backgroundColor: '#fbf9f6',
                  border: '1px solid #ebdcd0',
                  color: '#806657',
                  padding: '10px 16px',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Plus size={16} /> Add Client Profile
              </button>
            </div>
          </div>

          {/* Global Alerts */}
          {error && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 18px',
              backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b',
              borderRadius: '10px', marginBottom: '20px', fontSize: '0.9rem'
            }}>
              <AlertCircle size={18} /> <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 18px',
              backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534',
              borderRadius: '10px', marginBottom: '20px', fontSize: '0.9rem'
            }}>
              <CheckCircle2 size={18} /> <span>{successMessage}</span>
            </div>
          )}

          {/* Operational Metrics Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px', marginBottom: '22px' }}>
            <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '12px', border: '1px solid #ebdcd0' }}>
              <div style={{ fontSize: '0.8rem', color: '#8c7b70', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Client Profiles
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: '700', color: '#2c221e', margin: '4px 0 2px' }}>
                {customers.length}
              </div>
              <span style={{ fontSize: '0.8rem', color: '#6e5d53' }}>Registered in clinic CRM</span>
            </div>

            <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '12px', border: '1px solid #ebdcd0' }}>
              <div style={{ fontSize: '0.8rem', color: '#8c7b70', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Treatments Recorded
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: '700', color: '#2c221e', margin: '4px 0 2px' }}>
                {treatmentRecords.length}
              </div>
              <span style={{ fontSize: '0.8rem', color: '#6e5d53' }}>Completed clinical sessions</span>
            </div>

            <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '12px', border: '1px solid #ebdcd0' }}>
              <div style={{ fontSize: '0.8rem', color: '#8c7b70', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Unread Client Enquiries
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: '700', color: '#ca8a04', margin: '4px 0 2px' }}>
                {enquiries.filter((e) => e.status === 'UNREAD').length}
              </div>
              <span style={{ fontSize: '0.8rem', color: '#6e5d53' }}>Awaiting staff response</span>
            </div>

            <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '12px', border: '1px solid #ebdcd0' }}>
              <div style={{ fontSize: '0.8rem', color: '#8c7b70', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Catalogue Services
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: '700', color: '#2c221e', margin: '4px 0 2px' }}>
                {treatmentsList.length}
              </div>
              <span style={{ fontSize: '0.8rem', color: '#6e5d53' }}>Active clinic offerings</span>
            </div>
          </div>

          {/* Search Bar for Records / Directory */}
          {activeTab !== 'catalogue' && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{ position: 'relative', maxWidth: '400px' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: '#a8988d' }} />
                <input
                  type="text"
                  placeholder="Search by client name, email, or treatment..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px 10px 36px', borderRadius: '8px', border: '1px solid #ebdcd0', outline: 'none', fontSize: '0.88rem' }}
                />
              </div>
            </div>
          )}

      {/* TAB 1: CLINICAL TREATMENT RECORDS */}
      {activeTab === 'treatments' && (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', border: '1px solid #ebdcd0', overflowX: 'auto' }}>
          {filteredTreatmentRecords.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '50px 20px', color: '#8c7b70' }}>
              <HeartPulse size={36} color="#c2b4a8" style={{ marginBottom: '10px' }} />
              <p style={{ margin: 0 }}>No treatment records match your search criteria.</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '850px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #ebdcd0', color: '#8c7b70', fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <th style={{ padding: '14px 16px' }}>Client</th>
                  <th style={{ padding: '14px 16px' }}>Treatment</th>
                  <th style={{ padding: '14px 16px' }}>Date</th>
                  <th style={{ padding: '14px 16px' }}>Clinical Notes</th>
                  <th style={{ padding: '14px 16px' }}>Aftercare Prescribed</th>
                  <th style={{ padding: '14px 16px' }}>Recorded By</th>
                </tr>
              </thead>
              <tbody>
                {filteredTreatmentRecords.map((tr) => (
                  <tr key={tr.id} style={{ borderBottom: '1px solid #ebdcd0' }}>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: '600', color: '#2c221e' }}>{tr.customerName}</div>
                      <div style={{ fontSize: '0.8rem', color: '#8c7b70' }}>{tr.customerEmail}</div>
                    </td>
                    <td style={{ padding: '14px 16px', fontWeight: '500', color: '#806657' }}>
                      {tr.treatmentName}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '0.88rem', color: '#6e5d53' }}>
                      {new Date(tr.treatmentDate).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '0.85rem', color: '#5c4d44', maxWidth: '240px' }}>
                      {tr.clinicalNotes || 'Session completed as scheduled.'}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '0.82rem', color: '#854d0e', maxWidth: '240px' }}>
                      <span style={{ backgroundColor: '#fefce8', padding: '4px 8px', borderRadius: '4px', border: '1px solid #fef08a' }}>
                        {tr.aftercareInstructions || 'Standard hydration and SPF.'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '0.82rem', color: '#8c7b70' }}>
                      {tr.practitionerName || 'Staff'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* TAB: TREATMENT CATALOGUE & PRICING (STAFF ACCESS) */}
      {activeTab === 'catalogue' && (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #ebdcd0', padding: '30px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px', flexWrap: 'wrap', gap: '15px' }}>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#806657', fontSize: '0.78rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
                <Sparkles size={14} /> Clinic Service Directory
              </div>
              <h2 style={{ fontSize: '1.35rem', color: '#2c221e', margin: 0, fontWeight: '700' }}>
                Master Treatment Catalogue & Pricing (55)
              </h2>
              <p style={{ color: '#8c7b70', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
                Complete list of all clinic services across 7 clinical categories. View exact pricing, clinical details, and record sessions directly for clients.
              </p>
            </div>

            <button
              onClick={() => setShowRecordModal(true)}
              style={{
                backgroundColor: '#806657',
                color: '#ffffff',
                border: 'none',
                padding: '10px 18px',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Plus size={16} /> Record Treatment Session
            </button>
          </div>

          {/* Search & Category Filter Controls */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
            <div style={{ position: 'relative' }}>
              <Search size={18} color="#a89a90" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Filter treatments by name or area (e.g. PRP, MNRF, Phenol Peel, Botox, Full Body)..."
                value={catalogueSearch}
                onChange={(e) => setCatalogueSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 14px 12px 42px',
                  borderRadius: '10px',
                  border: '1px solid #ebdcd0',
                  backgroundColor: '#fbf9f6',
                  fontSize: '0.9rem',
                  color: '#2c221e',
                  outline: 'none'
                }}
              />
            </div>

            {/* Category Filter Pills */}
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '6px' }}>
              {TREATMENT_CATEGORIES.map((cat) => {
                const isSelected = catalogueCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setCatalogueCategory(cat.id)}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '20px',
                      border: '1px solid',
                      borderColor: isSelected ? '#806657' : '#ebdcd0',
                      backgroundColor: isSelected ? '#806657' : '#ffffff',
                      color: isSelected ? '#ffffff' : '#6e5d53',
                      fontSize: '0.8rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.2s'
                    }}
                  >
                    {cat.shortName || cat.name} {cat.count ? `(${cat.count})` : ''}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Treatment Cards Grid */}
          {(() => {
            const filtered = TREATMENTS_DATA.filter((item) => {
              const matchesCategory = catalogueCategory === 'all' || item.categoryId === catalogueCategory;
              const q = catalogueSearch.toLowerCase().trim();
              const matchesSearch = !q ||
                item.name.toLowerCase().includes(q) ||
                (item.subcategory && item.subcategory.toLowerCase().includes(q)) ||
                (item.categoryName && item.categoryName.toLowerCase().includes(q)) ||
                (item.description && item.description.toLowerCase().includes(q));
              return matchesCategory && matchesSearch;
            });

            if (filtered.length === 0) {
              return (
                <div style={{ textAlign: 'center', padding: '50px 20px', color: '#8c7b70', border: '1px dashed #ebdcd0', borderRadius: '10px' }}>
                  <Search size={36} color="#c2b4a8" style={{ marginBottom: '10px' }} />
                  <p style={{ margin: '0 0 6px 0', fontWeight: '500' }}>No treatments match your search</p>
                  <button
                    onClick={() => { setCatalogueSearch(''); setCatalogueCategory('all'); }}
                    style={{
                      backgroundColor: '#fbf9f6',
                      border: '1px solid #ebdcd0',
                      color: '#806657',
                      padding: '8px 16px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      fontWeight: '600'
                    }}
                  >
                    Reset Filters
                  </button>
                </div>
              );
            }

            return (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '16px'
              }}>
                {filtered.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #ebdcd0',
                      borderRadius: '12px',
                      padding: '18px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      boxShadow: '0 2px 6px rgba(44, 34, 30, 0.02)'
                    }}
                  >
                    <div>
                      {item.image && (
                        <div style={{ width: '100%', aspectRatio: '3 / 2', borderRadius: '8px', overflow: 'hidden', marginBottom: '12px', backgroundColor: '#faf7f2', border: '1px solid #ebdcd0' }}>
                          <img 
                            src={item.image} 
                            alt={item.name} 
                            loading="lazy" 
                            style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
                          />
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: '700', color: '#806657', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          {item.subcategory || item.categoryName}
                        </span>
                        {item.pricingNote && (
                          <span style={{ fontSize: '0.7rem', backgroundColor: '#f7f2ed', color: '#6e5d53', padding: '2px 8px', borderRadius: '10px', fontWeight: '600' }}>
                            {item.pricingNote}
                          </span>
                        )}
                      </div>
                      <h4 style={{ fontSize: '1.05rem', color: '#2c221e', margin: '0 0 8px 0', fontWeight: '600', lineHeight: '1.3' }}>
                        {item.name}
                      </h4>
                      <p style={{ color: '#6e5d53', fontSize: '0.83rem', lineHeight: '1.45', margin: '0 0 16px 0', minHeight: '44px' }}>
                        {item.description}
                      </p>
                    </div>

                    <div style={{ borderTop: '1px solid #f3ece4', paddingTop: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span style={{ fontSize: '0.7rem', color: '#8c7b70', display: 'block', textTransform: 'uppercase', fontWeight: '600' }}>Official Price</span>
                        <span style={{ fontSize: '1.25rem', fontWeight: '700', color: '#2c221e' }}>{item.price}</span>
                      </div>
                      <button
                        onClick={() => {
                          setRecordForm((prev) => ({
                            ...prev,
                            treatmentName: item.name,
                            description: item.description
                          }));
                          setShowRecordModal(true);
                        }}
                        style={{
                          backgroundColor: '#fbf9f6',
                          border: '1px solid #ebdcd0',
                          color: '#806657',
                          padding: '8px 14px',
                          borderRadius: '8px',
                          fontSize: '0.8rem',
                          fontWeight: '600',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <Plus size={14} /> Record For Client
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {/* TAB 2: CLIENT DIRECTORY */}
      {activeTab === 'customers' && (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', border: '1px solid #ebdcd0', overflowX: 'auto' }}>
          {filteredCustomers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '50px 20px', color: '#8c7b70' }}>
              <Users size={36} color="#c2b4a8" style={{ marginBottom: '10px' }} />
              <p style={{ margin: 0 }}>No client profiles found.</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #ebdcd0', color: '#8c7b70', fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <th style={{ padding: '14px 16px' }}>Client Name</th>
                  <th style={{ padding: '14px 16px' }}>Email</th>
                  <th style={{ padding: '14px 16px' }}>Phone</th>
                  <th style={{ padding: '14px 16px' }}>Clinical Profile Notes</th>
                  <th style={{ padding: '14px 16px', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((c) => (
                  <tr key={c.id} style={{ borderBottom: '1px solid #ebdcd0' }}>
                    <td style={{ padding: '14px 16px', fontWeight: '600', color: '#2c221e' }}>{c.fullName}</td>
                    <td style={{ padding: '14px 16px', color: '#6e5d53', fontSize: '0.88rem' }}>{c.email}</td>
                    <td style={{ padding: '14px 16px', color: '#6e5d53', fontSize: '0.88rem' }}>{c.phone || '—'}</td>
                    <td style={{ padding: '14px 16px', color: '#5c4d44', fontSize: '0.85rem' }}>{c.notes || 'No general notes.'}</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      <button
                        onClick={() => {
                          setRecordForm((prev) => ({ ...prev, customerEmail: c.email }));
                          setShowRecordModal(true);
                        }}
                        style={{
                          backgroundColor: '#fbf9f6',
                          border: '1px solid #ebdcd0',
                          color: '#806657',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                          fontWeight: '600'
                        }}
                      >
                        Record Session
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* TAB 3: CLIENT ENQUIRIES */}
      {activeTab === 'enquiries' && (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', border: '1px solid #ebdcd0', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', color: '#2c221e', margin: 0, fontWeight: '700' }}>Client Enquiries Queue</h2>
              <p style={{ color: '#8c7b70', fontSize: '0.85rem', margin: '3px 0 0 0' }}>Manage patient inquiries submitted through the website.</p>
            </div>

            <div style={{ display: 'flex', gap: '8px', backgroundColor: '#faf7f2', padding: '4px', borderRadius: '8px', border: '1px solid #ebdcd0' }}>
              <button
                onClick={() => setEnquiryFilter('ACTIVE')}
                style={{
                  padding: '7px 14px', borderRadius: '6px', fontSize: '0.82rem', fontWeight: '600', border: 'none', cursor: 'pointer',
                  backgroundColor: enquiryFilter === 'ACTIVE' ? '#806657' : 'transparent',
                  color: enquiryFilter === 'ACTIVE' ? '#ffffff' : '#5c4d44'
                }}
              >
                Active Enquiries ({activeEnquiries.length})
              </button>
              <button
                onClick={() => setEnquiryFilter('RESOLVED')}
                style={{
                  padding: '7px 14px', borderRadius: '6px', fontSize: '0.82rem', fontWeight: '600', border: 'none', cursor: 'pointer',
                  backgroundColor: enquiryFilter === 'RESOLVED' ? '#806657' : 'transparent',
                  color: enquiryFilter === 'RESOLVED' ? '#ffffff' : '#5c4d44'
                }}
              >
                Resolved ({resolvedEnquiries.length})
              </button>
              <button
                onClick={() => setEnquiryFilter('ALL')}
                style={{
                  padding: '7px 14px', borderRadius: '6px', fontSize: '0.82rem', fontWeight: '600', border: 'none', cursor: 'pointer',
                  backgroundColor: enquiryFilter === 'ALL' ? '#806657' : 'transparent',
                  color: enquiryFilter === 'ALL' ? '#ffffff' : '#5c4d44'
                }}
              >
                All ({enquiries.length})
              </button>
            </div>
          </div>

          {displayedEnquiries.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '45px 20px', color: '#8c7b70', border: '1px dashed #ebdcd0', borderRadius: '10px' }}>
              <MessageSquare size={34} color="#c2b4a8" style={{ marginBottom: '10px' }} />
              <p style={{ margin: 0, fontWeight: '500' }}>
                {enquiryFilter === 'ACTIVE' ? 'All client enquiries have been resolved!' : enquiryFilter === 'RESOLVED' ? 'No resolved enquiries in archive.' : 'No enquiries received.'}
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '750px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #ebdcd0', color: '#8c7b70', fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    <th style={{ padding: '14px 16px' }}>Sender</th>
                    <th style={{ padding: '14px 16px' }}>Contact</th>
                    <th style={{ padding: '14px 16px' }}>Message</th>
                    <th style={{ padding: '14px 16px', textAlign: 'center' }}>Status</th>
                    <th style={{ padding: '14px 16px', textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedEnquiries.map((e) => {
                    const isResolved = (e.status || '').toUpperCase() === 'RESOLVED';
                    const isRead = (e.status || '').toUpperCase() === 'READ';
                    return (
                      <tr key={e.id} style={{ borderBottom: '1px solid #ebdcd0', backgroundColor: isResolved ? '#fafafa' : isRead ? 'transparent' : 'rgba(217, 119, 6, 0.03)' }}>
                        <td style={{ padding: '14px 16px', fontWeight: '600', color: '#2c221e' }}>{e.name}</td>
                        <td style={{ padding: '14px 16px', fontSize: '0.85rem', color: '#6e5d53' }}>
                          <div>{e.email}</div>
                          <div>{e.phone}</div>
                        </td>
                        <td style={{ padding: '14px 16px', fontSize: '0.88rem', color: '#4a3b32', maxWidth: '300px' }}>
                          {e.message}
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                          <span style={{
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            fontWeight: '700',
                            backgroundColor: isResolved ? '#f0fdf4' : isRead ? '#f8fafc' : '#fef3c7',
                            color: isResolved ? '#166534' : isRead ? '#475569' : '#92400e',
                            border: '1px solid',
                            borderColor: isResolved ? '#bbf7d0' : isRead ? '#cbd5e1' : '#fde68a'
                          }}>
                            {isResolved ? 'RESOLVED' : isRead ? 'READ' : 'UNREAD'}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', gap: '6px' }}>
                            {isResolved ? (
                              <button
                                onClick={() => handleUpdateEnquiryStatus(e.id, 'UNREAD')}
                                style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: '6px', fontSize: '0.78rem', cursor: 'pointer' }}
                              >
                                Reopen
                              </button>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleUpdateEnquiryStatus(e.id, 'READ')}
                                  style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '6px 10px', borderRadius: '6px', fontSize: '0.78rem', cursor: 'pointer' }}
                                >
                                  Mark Read
                                </button>
                                <button
                                  onClick={() => handleUpdateEnquiryStatus(e.id, 'RESOLVED')}
                                  title="Mark as resolved and remove from active queue"
                                  style={{ backgroundColor: '#059669', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '0.78rem', cursor: 'pointer', fontWeight: '600' }}
                                >
                                  Resolve
                                </button>
                              </>
                            )}
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

      {/* TAB 4: OPERATIONS QUEUE */}
      {activeTab === 'queue' && (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', border: '1px solid #ebdcd0', overflowX: 'auto' }}>
          {appointments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '50px 20px', color: '#8c7b70' }}>
              <Calendar size={36} color="#c2b4a8" style={{ marginBottom: '10px' }} />
              <p style={{ margin: 0 }}>No active operational visits queued.</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '750px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #ebdcd0', color: '#8c7b70', fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <th style={{ padding: '14px 16px' }}>Client</th>
                  <th style={{ padding: '14px 16px' }}>Service</th>
                  <th style={{ padding: '14px 16px' }}>Schedule</th>
                  <th style={{ padding: '14px 16px', textAlign: 'center' }}>Status</th>
                  <th style={{ padding: '14px 16px', textAlign: 'center' }}>Operational Update</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((a) => (
                  <tr key={a.id} style={{ borderBottom: '1px solid #ebdcd0' }}>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: '600', color: '#2c221e' }}>{a.customerName || a.patientName}</div>
                      <div style={{ fontSize: '0.8rem', color: '#8c7b70' }}>{a.customerEmail || a.email}</div>
                    </td>
                    <td style={{ padding: '14px 16px', fontWeight: '500', color: '#806657' }}>
                      {a.treatmentName}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '0.85rem', color: '#6e5d53' }}>
                      {a.appointmentDate ? String(a.appointmentDate).split('T')[0] : '—'} • {a.appointmentTime || '10:00'}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        backgroundColor: a.status === 'COMPLETED' ? '#f0fdf4' : a.status === 'CONFIRMED' ? '#dcfce7' : '#fef3c7',
                        color: a.status === 'COMPLETED' ? '#166534' : a.status === 'CONFIRMED' ? '#15803d' : '#92400e'
                      }}>
                        {a.status}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      <select
                        value={a.status}
                        onChange={(e) => handleUpdateAppointmentStatus(a.id, e.target.value)}
                        style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #ebdcd0', fontSize: '0.82rem', outline: 'none' }}
                      >
                        <option value="PENDING">Pending</option>
                        <option value="CONFIRMED">Confirmed</option>
                        <option value="COMPLETED">Completed</option>
                        <option value="CANCELLED">Cancelled</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

        </main>
      </div>

      {/* MODAL 1: RECORD TREATMENT */}
      {showRecordModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#ffffff', borderRadius: '16px', padding: '32px',
            maxWidth: '560px', width: '100%', maxHeight: '90vh', overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '1.3rem', color: '#2c221e', margin: 0, fontWeight: '600' }}>Record Clinical Treatment Session</h2>
              <button onClick={() => setShowRecordModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <form onSubmit={handleCreateTreatmentRecord} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: '#4a3b32', marginBottom: '4px' }}>Client Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="client@domain.com"
                  value={recordForm.customerEmail}
                  onChange={(e) => setRecordForm({ ...recordForm, customerEmail: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #ebdcd0', outline: 'none', fontSize: '0.9rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: '#4a3b32', marginBottom: '4px' }}>Treatment Service</label>
                  <input
                    type="text"
                    required
                    list="staff-treatment-options"
                    placeholder="e.g. Hair GFC + PRP, Chemical Peel"
                    value={recordForm.treatmentName}
                    onChange={(e) => setRecordForm({ ...recordForm, treatmentName: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #ebdcd0', outline: 'none', fontSize: '0.9rem' }}
                  />
                  <datalist id="staff-treatment-options">
                    {TREATMENTS_DATA.map((t) => (
                      <option key={t.id} value={t.name}>
                        {t.price} — {t.categoryName}
                      </option>
                    ))}
                  </datalist>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: '#4a3b32', marginBottom: '4px' }}>Session Date</label>
                  <input
                    type="date"
                    required
                    value={recordForm.treatmentDate}
                    onChange={(e) => setRecordForm({ ...recordForm, treatmentDate: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #ebdcd0', outline: 'none', fontSize: '0.9rem' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: '#4a3b32', marginBottom: '4px' }}>Clinical Session Notes</label>
                <textarea
                  rows={2}
                  placeholder="Practitioner observations, products applied..."
                  value={recordForm.clinicalNotes}
                  onChange={(e) => setRecordForm({ ...recordForm, clinicalNotes: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #ebdcd0', outline: 'none', fontSize: '0.9rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: '#4a3b32', marginBottom: '4px' }}>
                  Prescribed Aftercare Instructions (Visible to Client in Portal)
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Keep skin hydrated. Avoid direct sun for 48 hours..."
                  value={recordForm.aftercareInstructions}
                  onChange={(e) => setRecordForm({ ...recordForm, aftercareInstructions: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #ebdcd0', outline: 'none', fontSize: '0.9rem' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="submit" disabled={recordSaving} className="btn-primary" style={{ flex: 1, padding: '12px', fontWeight: '600' }}>
                  {recordSaving ? 'Saving Record...' : 'Save & Notify Client'}
                </button>
                <button type="button" onClick={() => setShowRecordModal(false)} style={{ padding: '12px 18px', backgroundColor: '#f1f5f9', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD CLIENT PROFILE */}
      {showCustomerModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '32px', maxWidth: '480px', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '1.3rem', color: '#2c221e', margin: 0, fontWeight: '600' }}>Create Client Profile</h2>
              <button onClick={() => setShowCustomerModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <form onSubmit={handleCreateCustomer} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: '#4a3b32', marginBottom: '4px' }}>Full Legal Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Eleanor Vance"
                  value={customerForm.fullName}
                  onChange={(e) => setCustomerForm({ ...customerForm, fullName: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #ebdcd0', outline: 'none', fontSize: '0.9rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: '#4a3b32', marginBottom: '4px' }}>Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="client@domain.com"
                  value={customerForm.email}
                  onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #ebdcd0', outline: 'none', fontSize: '0.9rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: '#4a3b32', marginBottom: '4px' }}>Phone Number</label>
                <input
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={customerForm.phone}
                  onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #ebdcd0', outline: 'none', fontSize: '0.9rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: '#4a3b32', marginBottom: '4px' }}>General Clinical Notes</label>
                <textarea
                  rows={2}
                  placeholder="Skin sensitivities, allergies, consultation goals..."
                  value={customerForm.notes}
                  onChange={(e) => setCustomerForm({ ...customerForm, notes: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #ebdcd0', outline: 'none', fontSize: '0.9rem' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="submit" disabled={customerSaving} className="btn-primary" style={{ flex: 1, padding: '12px', fontWeight: '600' }}>
                  {customerSaving ? 'Creating Profile...' : 'Save Client Profile'}
                </button>
                <button type="button" onClick={() => setShowCustomerModal(false)} style={{ padding: '12px 18px', backgroundColor: '#f1f5f9', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: CHANGE STAFF PASSWORD WITH 6-DIGIT EMAIL OTP */}
      {showPasswordModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#ffffff', borderRadius: '16px', padding: '30px',
            maxWidth: '440px', width: '100%', boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
            maxHeight: '90vh', overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <KeyRound size={20} color="#806657" />
                <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#2c221e', fontFamily: 'var(--font-heading)' }}>
                  Change Workspace Password
                </h3>
              </div>
              <button 
                type="button" 
                onClick={() => setShowPasswordModal(false)} 
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8c7b70' }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ color: '#8c7b70', fontSize: '0.85rem', margin: '0 0 16px 0', lineHeight: '1.4' }}>
              To update your staff password, a 6-digit security OTP code must be dispatched to your email address: <strong>{localStorage.getItem('email') || 'your registered staff mailbox'}</strong>.
            </p>

            {staffPasswordError && (
              <div style={{ padding: '10px 14px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertCircle size={16} /> <span>{staffPasswordError}</span>
              </div>
            )}

            {staffPasswordSuccess && (
              <div style={{ padding: '10px 14px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle2 size={16} /> <span>{staffPasswordSuccess}</span>
              </div>
            )}

            <form onSubmit={handleUpdateStaffPassword} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: '#4a3b32', marginBottom: '4px' }}>Current Password *</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={staffPasswordForm.oldPassword}
                  onChange={(e) => setStaffPasswordForm({ ...staffPasswordForm, oldPassword: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #ebdcd0', outline: 'none', fontSize: '0.9rem', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: '#4a3b32', marginBottom: '4px' }}>New Password (min 6 chars) *</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={staffPasswordForm.newPassword}
                  onChange={(e) => setStaffPasswordForm({ ...staffPasswordForm, newPassword: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #ebdcd0', outline: 'none', fontSize: '0.9rem', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: '#4a3b32', marginBottom: '4px' }}>Confirm New Password *</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={staffPasswordForm.confirmPassword}
                  onChange={(e) => setStaffPasswordForm({ ...staffPasswordForm, confirmPassword: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #ebdcd0', outline: 'none', fontSize: '0.9rem', boxSizing: 'border-box' }}
                />
              </div>

              {/* OTP Dispatch and Input Section */}
              <div style={{ backgroundColor: '#fdfbf9', padding: '14px', borderRadius: '10px', border: '1px dashed #d4c5b9', marginTop: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#4a3b32', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ShieldCheck size={15} color="#16a34a" /> 6-Digit Email OTP *
                  </label>
                  <button
                    type="button"
                    onClick={handleRequestStaffOtp}
                    disabled={staffOtpRequesting}
                    style={{
                      padding: '5px 10px',
                      backgroundColor: staffOtpSent ? '#f1f5f9' : '#806657',
                      color: staffOtpSent ? '#475569' : '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      cursor: staffOtpRequesting ? 'wait' : 'pointer'
                    }}
                  >
                    {staffOtpRequesting ? 'Sending OTP...' : staffOtpSent ? 'Resend OTP' : 'Request OTP'}
                  </button>
                </div>
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="e.g. 849201"
                  value={staffPasswordForm.otp}
                  onChange={(e) => setStaffPasswordForm({ ...staffPasswordForm, otp: e.target.value.replace(/\D/g, '') })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #ebdcd0',
                    outline: 'none',
                    fontSize: '1.1rem',
                    letterSpacing: '3px',
                    textAlign: 'center',
                    fontWeight: '700',
                    color: '#2c221e',
                    boxSizing: 'border-box'
                  }}
                />
                <span style={{ fontSize: '0.72rem', color: '#8c7b70', marginTop: '4px', display: 'block' }}>
                  Check your email inbox for the 6-digit verification code.
                </span>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                <button
                  type="submit"
                  disabled={staffPasswordLoading}
                  className="btn-primary"
                  style={{ flex: 1, padding: '12px', fontWeight: '700', cursor: staffPasswordLoading ? 'not-allowed' : 'pointer' }}
                >
                  {staffPasswordLoading ? 'Verifying OTP...' : 'Verify OTP & Change Password'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  style={{ padding: '12px 18px', backgroundColor: '#f1f5f9', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffDashboard;
