import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  HeartPulse, Users, MessageSquare, Calendar, RefreshCw, LogOut, 
  Search, CheckCircle2, AlertCircle, Plus, FileText, Phone, Mail, 
  ShieldCheck, Info, X, Clock, CheckCircle
} from 'lucide-react';
import API from '../services/api';
import '../styles/pages.css';

const StaffDashboard = () => {
  const navigate = useNavigate();

  // Active Tab: 'treatments' | 'customers' | 'enquiries' | 'queue'
  const [activeTab, setActiveTab] = useState('treatments');

  // Data States
  const [dashboardData, setDashboardData] = useState(null);
  const [treatmentRecords, setTreatmentRecords] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [enquiries, setEnquiries] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [treatmentsList, setTreatmentsList] = useState([]);

  // UI States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Search States
  const [searchTerm, setSearchTerm] = useState('');
  const [enquiryFilter, setEnquiryFilter] = useState('ACTIVE'); // 'ACTIVE' | 'RESOLVED' | 'ALL'

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

  const [refreshing, setRefreshing] = useState(false);
  const [refreshToast, setRefreshToast] = useState('');

  const staffName = localStorage.getItem('fullName') || 'Clinical Staff';
  const staffRole = localStorage.getItem('role') || 'STAFF';

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async (isManual = false) => {
    if (isManual) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError('');

    try {
      const [dashRes, treatRecordsRes, custRes, enqRes, apptRes, treatsRes] = await Promise.all([
        API.get('/staff/dashboard').catch(() => ({ data: {} })),
        API.get('/staff/treatments/records').catch(() => ({ data: [] })),
        API.get('/staff/customers').catch(() => ({ data: [] })),
        API.get('/staff/enquiries').catch(() => ({ data: [] })),
        API.get('/staff/appointments').catch(() => ({ data: [] })),
        API.get('/treatments/active').catch(() => ({ data: [] }))
      ]);

      setDashboardData(dashRes.data);
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
  };

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
    } catch (err) {
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
    } catch (err) {
      setError('Failed to update status.');
    }
  };

  const handleLogout = () => {
    localStorage.clear();
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

  // Active appointments needing clinic action (excludes COMPLETED, CANCELLED, REJECTED)
  const activeAppointments = appointments.filter((a) => {
    const st = (a.status || 'PENDING').toUpperCase();
    return st === 'PENDING' || st === 'CONFIRMED';
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

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '10px 0 60px 0' }}>
      {/* Top Header Card */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        padding: '28px 32px',
        border: '1px solid #ebdcd0',
        boxShadow: '0 4px 20px rgba(44, 34, 30, 0.03)',
        marginBottom: '25px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '20px'
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
            fontSize: '1.75rem',
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
          <button
            onClick={() => fetchDashboardData(true)}
            disabled={refreshing || loading}
            title="Refresh clinical records"
            style={{ 
              backgroundColor: '#ffffff', 
              border: '1px solid #ebdcd0', 
              padding: '10px 14px', 
              borderRadius: '8px', 
              cursor: (refreshing || loading) ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.85rem',
              fontWeight: '600',
              color: '#6e5d53',
              opacity: (refreshing || loading) ? 0.75 : 1
            }}
          >
            <RefreshCw size={15} color="#6e5d53" style={{ animation: (refreshing || loading) ? 'spin 0.8s linear infinite' : 'none' }} />
            {refreshing ? 'Syncing...' : 'Refresh'}
          </button>
          <button
            onClick={handleLogout}
            style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '10px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '25px' }}>
        <div style={{ backgroundColor: '#ffffff', padding: '22px', borderRadius: '12px', border: '1px solid #ebdcd0' }}>
          <div style={{ fontSize: '0.8rem', color: '#8c7b70', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Client Profiles
          </div>
          <div style={{ fontSize: '2rem', fontWeight: '700', color: '#2c221e', margin: '6px 0 2px' }}>
            {customers.length}
          </div>
          <span style={{ fontSize: '0.82rem', color: '#6e5d53' }}>Registered in clinic CRM</span>
        </div>

        <div style={{ backgroundColor: '#ffffff', padding: '22px', borderRadius: '12px', border: '1px solid #ebdcd0' }}>
          <div style={{ fontSize: '0.8rem', color: '#8c7b70', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Treatments Recorded
          </div>
          <div style={{ fontSize: '2rem', fontWeight: '700', color: '#2c221e', margin: '6px 0 2px' }}>
            {treatmentRecords.length}
          </div>
          <span style={{ fontSize: '0.82rem', color: '#6e5d53' }}>Completed clinical sessions</span>
        </div>

        <div style={{ backgroundColor: '#ffffff', padding: '22px', borderRadius: '12px', border: '1px solid #ebdcd0' }}>
          <div style={{ fontSize: '0.8rem', color: '#8c7b70', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Unread Client Enquiries
          </div>
          <div style={{ fontSize: '2rem', fontWeight: '700', color: '#ca8a04', margin: '6px 0 2px' }}>
            {enquiries.filter((e) => e.status === 'UNREAD').length}
          </div>
          <span style={{ fontSize: '0.82rem', color: '#6e5d53' }}>Awaiting staff response</span>
        </div>

        <div style={{ backgroundColor: '#ffffff', padding: '22px', borderRadius: '12px', border: '1px solid #ebdcd0' }}>
          <div style={{ fontSize: '0.8rem', color: '#8c7b70', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Operational Queue
          </div>
          <div style={{ fontSize: '2rem', fontWeight: '700', color: '#2c221e', margin: '6px 0 2px' }}>
            {appointments.filter((a) => a.status === 'PENDING' || a.status === 'CONFIRMED').length}
          </div>
          <span style={{ fontSize: '0.82rem', color: '#6e5d53' }}>Active visits</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{
        display: 'flex',
        gap: '10px',
        borderBottom: '1px solid #ebdcd0',
        paddingBottom: '6px',
        marginBottom: '25px',
        overflowX: 'auto'
      }}>
        {[
          { id: 'treatments', label: `Clinical Treatment Records (${treatmentRecords.length})`, icon: HeartPulse },
          { id: 'customers', label: `Client Directory (${customers.length})`, icon: Users },
          { id: 'enquiries', label: `Client Enquiries (${activeEnquiries.length})`, icon: MessageSquare },
          { id: 'queue', label: `Operations Queue (${activeAppointments.length})`, icon: Calendar }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setSearchTerm(''); }}
              style={{
                backgroundColor: isActive ? '#806657' : '#ffffff',
                color: isActive ? '#ffffff' : '#5c4d44',
                border: '1px solid',
                borderColor: isActive ? '#806657' : '#ebdcd0',
                padding: '10px 18px',
                borderRadius: '8px',
                fontSize: '0.88rem',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                whiteSpace: 'nowrap'
              }}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Search Bar for Records / Directory */}
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: '#4a3b32', marginBottom: '4px' }}>Treatment Service</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Chemical Peel, Glass Skin"
                    value={recordForm.treatmentName}
                    onChange={(e) => setRecordForm({ ...recordForm, treatmentName: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #ebdcd0', outline: 'none', fontSize: '0.9rem' }}
                  />
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
    </div>
  );
};

export default StaffDashboard;
