import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  User, Sparkles, Calendar, Clock, FileText, MessageSquare, Bell, 
  ShieldCheck, LogOut, CheckCircle2, AlertCircle, Edit2, KeyRound, 
  Lock, RefreshCw, ChevronRight, HeartPulse, Info, Camera, Trash2, Upload,
  Search, Plus, ArrowRight
} from 'lucide-react';
import API from '../services/api';
import { TREATMENTS_DATA, TREATMENT_CATEGORIES } from '../data/treatmentsData';
import '../styles/pages.css';

const ClientDashboard = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fileInputRef = useRef(null);

  // Active Tab: 'overview' | 'appointments' | 'catalogue' | 'treatments' | 'profile' | 'enquiries' | 'notifications' | 'security'
  const [activeTab, setActiveTab] = useState('overview');

  // Client Data States
  const [profile, setProfile] = useState(null);
  const [treatments, setTreatments] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [enquiries, setEnquiries] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Booking Form State
  const [bookTreatment, setBookTreatment] = useState('Hair GFC + PRP');
  const [bookDate, setBookDate] = useState('');
  const [bookTime, setBookTime] = useState('11:00 AM');
  const [bookNotes, setBookNotes] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);

  // Catalogue Browse State
  const [catalogueSearch, setCatalogueSearch] = useState('');
  const [catalogueCategory, setCatalogueCategory] = useState('all');

  // Refresh State
  const [refreshing, setRefreshing] = useState(false);
  const [refreshToast, setRefreshToast] = useState('');

  // Profile Picture Upload State
  const [photoUploading, setPhotoUploading] = useState(false);

  // Edit Profile State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editFullName, setEditFullName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);

  // Change Password State
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = (localStorage.getItem('role') || '').toUpperCase();

    if (!token || (role !== 'CUSTOMER' && role !== 'PATIENT')) {
      navigate('/client/login');
      return;
    }

    fetchClientData();
  }, [navigate]);

  useEffect(() => {
    const requestedTreatment = searchParams.get('bookTreatment');
    if (requestedTreatment) {
      setBookTreatment(requestedTreatment);
      setActiveTab('appointments');
    }
  }, [searchParams]);

  const fetchClientData = async (isManual = false) => {
    if (isManual) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError('');

    try {
      const [profileRes, treatmentsRes, enquiriesRes, notificationsRes, appointmentsRes] = await Promise.all([
        API.get('/client/profile'),
        API.get('/client/treatments'),
        API.get('/client/enquiries'),
        API.get('/client/notifications'),
        API.get('/client/appointments').catch(() => ({ data: [] }))
      ]);

      setProfile(profileRes.data);
      setEditFullName(profileRes.data.fullName || '');
      setEditPhone(profileRes.data.phone || '');
      if (profileRes.data.profilePicture) {
        localStorage.setItem('profilePicture', profileRes.data.profilePicture);
      } else {
        localStorage.removeItem('profilePicture');
      }

      setTreatments(treatmentsRes.data || []);
      setEnquiries(enquiriesRes.data || []);
      setNotifications(notificationsRes.data || []);
      setAppointments(appointmentsRes.data || []);

      if (isManual) {
        setRefreshToast('Care suite records synchronized.');
        setTimeout(() => setRefreshToast(''), 3000);
      }
    } catch (err) {
      console.error("Failed to fetch client suite data:", err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        localStorage.clear();
        navigate('/client/login');
      } else {
        setError('Could not refresh your private records. Please check your connection.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Self-Booking Handler from Client Suite
  const handleBookAppointment = async (e) => {
    e.preventDefault();
    if (!bookTreatment || !bookDate) {
      setError('Please select both a treatment procedure and your preferred appointment date.');
      return;
    }

    setBookingLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const res = await API.post('/client/appointments', {
        treatmentName: bookTreatment,
        appointmentDate: bookDate,
        appointmentTime: bookTime,
        notes: bookNotes
      });

      setSuccessMessage(res.data.message || 'Appointment request submitted successfully!');
      setBookNotes('');
      fetchClientData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit appointment request. Please try again.');
    } finally {
      setBookingLoading(false);
    }
  };

  const handleSelectTreatmentToBook = (treatmentName) => {
    setBookTreatment(treatmentName);
    setActiveTab('appointments');
    window.scrollTo({ top: 300, behavior: 'smooth' });
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (JPEG, PNG, WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image file exceeds 5MB. Please choose a smaller photo.');
      return;
    }

    setPhotoUploading(true);
    setError('');

    const reader = new FileReader();
    reader.onerror = () => {
      setError('Failed to read image file.');
      setPhotoUploading(false);
    };

    reader.onload = (event) => {
      const img = new Image();
      img.onerror = () => {
        setError('Failed to process image file.');
        setPhotoUploading(false);
      };

      img.onload = async () => {
        try {
          const canvas = document.createElement('canvas');
          const MAX_DIM = 400;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_DIM) {
              height = Math.round((height * MAX_DIM) / width);
              width = MAX_DIM;
            }
          } else {
            if (height > MAX_DIM) {
              width = Math.round((width * MAX_DIM) / height);
              height = MAX_DIM;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          const base64Data = canvas.toDataURL('image/jpeg', 0.85);

          const res = await API.put('/client/profile/photo', { profilePicture: base64Data });
          setProfile((prev) => ({ ...prev, profilePicture: res.data.profilePicture }));
          localStorage.setItem('profilePicture', res.data.profilePicture);
          setSuccessMessage('Profile photo updated successfully.');
          setTimeout(() => setSuccessMessage(''), 3000);
        } catch (uploadErr) {
          setError(uploadErr.response?.data?.message || 'Failed to update profile photo.');
        } finally {
          setPhotoUploading(false);
        }
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = async () => {
    setPhotoUploading(true);
    setError('');
    try {
      await API.delete('/client/profile/photo');
      setProfile((prev) => ({ ...prev, profilePicture: '' }));
      localStorage.removeItem('profilePicture');
      setSuccessMessage('Profile photo removed.');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to remove profile photo.');
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileSaving(true);
    setError('');
    setSuccessMessage('');

    try {
      const res = await API.put('/client/profile', {
        fullName: editFullName,
        phone: editPhone
      });
      setProfile((prev) => ({ ...prev, fullName: res.data.fullName, phone: res.data.phone }));
      localStorage.setItem('fullName', res.data.fullName);
      setIsEditingProfile(false);
      setSuccessMessage('Profile details updated successfully.');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmNewPassword) {
      setError('New passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }

    setPasswordLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      await API.post('/auth/change-password', {
        email: profile?.email,
        oldPassword,
        newPassword
      });
      setSuccessMessage('Password updated successfully.');
      setOldPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update password.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleMarkNotificationRead = async (id) => {
    try {
      await API.patch(`/client/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch (err) {
      console.error("Failed to mark notification read:", err);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  const unreadNotifsCount = notifications.filter((n) => !n.read).length;

  if (loading && !profile) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 20px', color: '#8c7b70' }}>
        <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite', marginBottom: '16px' }} />
        <p style={{ fontSize: '1.05rem', fontWeight: '500' }}>Preparing your personal care suite...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1180px', margin: '0 auto', padding: '10px 0 60px 0' }}>
      {/* Top Banner */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        padding: '30px 36px',
        border: '1px solid #ebdcd0',
        boxShadow: '0 4px 20px rgba(44, 34, 30, 0.03)',
        marginBottom: '25px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div 
            onClick={() => {
              setActiveTab('profile');
              fileInputRef.current?.click();
            }}
            title="Click to update profile photo"
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: '#f7f2ed',
              color: '#806657',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid #d4c3b3',
              overflow: 'hidden',
              cursor: 'pointer',
              position: 'relative',
              boxShadow: '0 2px 8px rgba(128, 102, 87, 0.15)',
              flexShrink: 0
            }}
          >
            {profile?.profilePicture ? (
              <img 
                src={profile.profilePicture} 
                alt={profile.fullName || 'Client'} 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
              />
            ) : (
              <User size={30} />
            )}
            <div style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              backgroundColor: 'rgba(44, 34, 30, 0.65)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '2px 0',
              color: '#ffffff'
            }}>
              <Camera size={11} />
            </div>
          </div>
          <div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              color: '#806657',
              fontSize: '0.75rem',
              fontWeight: '700',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: '4px'
            }}>
              <ShieldCheck size={14} color="#16a34a" /> Verified Client Suite
            </div>
            <h1 style={{
              fontSize: '1.75rem',
              color: '#2c221e',
              fontFamily: 'var(--font-heading)',
              fontWeight: '600',
              margin: '0 0 4px 0'
            }}>
              Welcome, {profile?.fullName || 'Valued Client'}
            </h1>
            <p style={{ margin: 0, color: '#8c7b70', fontSize: '0.88rem' }}>
              {profile?.email} • Member since {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : '2026'}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => fetchClientData(true)}
            disabled={refreshing || loading}
            title="Refresh care suite records"
            style={{
              backgroundColor: '#fbf9f6',
              border: '1px solid #ebdcd0',
              color: '#6e5d53',
              padding: '10px 14px',
              borderRadius: '8px',
              cursor: (refreshing || loading) ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.85rem',
              fontWeight: '600',
              opacity: (refreshing || loading) ? 0.75 : 1
            }}
          >
            <RefreshCw size={14} style={{ animation: (refreshing || loading) ? 'spin 0.8s linear infinite' : 'none' }} />
            {refreshing ? 'Syncing...' : 'Refresh'}
          </button>
          <button
            onClick={handleLogout}
            style={{
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#991b1b',
              padding: '10px 16px',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.85rem',
              fontWeight: '600'
            }}
          >
            <LogOut size={14} /> Sign Out
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
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '14px 18px', backgroundColor: '#fef2f2', border: '1px solid #fecaca',
          color: '#991b1b', borderRadius: '10px', marginBottom: '20px', fontSize: '0.9rem'
        }}>
          <AlertCircle size={18} /> <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '14px 18px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0',
          color: '#166534', borderRadius: '10px', marginBottom: '20px', fontSize: '0.9rem'
        }}>
          <CheckCircle2 size={18} /> <span>{successMessage}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div style={{
        display: 'flex',
        gap: '10px',
        overflowX: 'auto',
        paddingBottom: '6px',
        marginBottom: '25px',
        borderBottom: '1px solid #ebdcd0'
      }}>
        {[
          { id: 'overview', label: 'Suite Overview', icon: Sparkles },
          { id: 'appointments', label: `My Appointments (${appointments.length})`, icon: Calendar },
          { id: 'catalogue', label: 'Explore Treatments (55)', icon: HeartPulse },
          { id: 'treatments', label: `Clinical Records (${treatments.length})`, icon: FileText },
          { id: 'profile', label: 'My Profile', icon: User },
          { id: 'enquiries', label: `My Enquiries (${enquiries.length})`, icon: MessageSquare },
          { id: 'notifications', label: `Notifications ${unreadNotifsCount > 0 ? `(${unreadNotifsCount})` : ''}`, icon: Bell },
          { id: 'security', label: 'Privacy & Security', icon: Lock }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setError(''); setSuccessMessage(''); }}
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
                whiteSpace: 'nowrap',
                transition: 'all 0.2s'
              }}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
          {/* Quick Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
            <div style={{ backgroundColor: '#ffffff', padding: '22px', borderRadius: '12px', border: '1px solid #ebdcd0' }}>
              <div style={{ fontSize: '0.8rem', color: '#8c7b70', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Appointments Booked
              </div>
              <div style={{ fontSize: '2.1rem', fontWeight: '700', color: '#806657', margin: '8px 0 4px' }}>
                {appointments.length}
              </div>
              <span style={{ fontSize: '0.82rem', color: '#6e5d53' }}>In-clinic scheduled visits</span>
            </div>

            <div style={{ backgroundColor: '#ffffff', padding: '22px', borderRadius: '12px', border: '1px solid #ebdcd0' }}>
              <div style={{ fontSize: '0.8rem', color: '#8c7b70', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Total Treatments Recorded
              </div>
              <div style={{ fontSize: '2.1rem', fontWeight: '700', color: '#2c221e', margin: '8px 0 4px' }}>
                {treatments.length}
              </div>
              <span style={{ fontSize: '0.82rem', color: '#6e5d53' }}>Official clinical sessions on file</span>
            </div>

            <div style={{ backgroundColor: '#ffffff', padding: '22px', borderRadius: '12px', border: '1px solid #ebdcd0' }}>
              <div style={{ fontSize: '0.8rem', color: '#8c7b70', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Submitted Enquiries
              </div>
              <div style={{ fontSize: '2.1rem', fontWeight: '700', color: '#2c221e', margin: '8px 0 4px' }}>
                {enquiries.length}
              </div>
              <span style={{ fontSize: '0.82rem', color: '#6e5d53' }}>Direct communications with clinic</span>
            </div>

            <div style={{ backgroundColor: '#ffffff', padding: '22px', borderRadius: '12px', border: '1px solid #ebdcd0' }}>
              <div style={{ fontSize: '0.8rem', color: '#8c7b70', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Account Standing
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#166534', margin: '14px 0 6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle2 size={18} /> Verified & Active
              </div>
              <span style={{ fontSize: '0.82rem', color: '#6e5d53' }}>Strict patient data isolation active</span>
            </div>
          </div>

          {/* Quick Actions Card */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '14px',
            border: '1px solid #ebdcd0',
            padding: '24px 28px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px',
            background: 'linear-gradient(135deg, #ffffff 0%, #FAF7F2 100%)'
          }}>
            <div>
              <h3 style={{ fontSize: '1.15rem', color: '#2c221e', margin: '0 0 4px 0', fontWeight: '600', fontFamily: 'var(--font-heading)' }}>
                Need to schedule a treatment or explore services?
              </h3>
              <p style={{ margin: 0, color: '#8c7b70', fontSize: '0.88rem' }}>
                Book your next in-clinic appointment directly or browse our full catalogue of 55 clinical treatments with transparent pricing.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button
                onClick={() => setActiveTab('appointments')}
                style={{
                  backgroundColor: '#806657',
                  color: '#ffffff',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  fontWeight: '600',
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <Plus size={16} /> Book Appointment
              </button>
              <button
                onClick={() => setActiveTab('catalogue')}
                style={{
                  backgroundColor: '#ffffff',
                  color: '#806657',
                  border: '1px solid #ebdcd0',
                  padding: '10px 18px',
                  borderRadius: '8px',
                  fontWeight: '600',
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <HeartPulse size={16} /> Browse Treatment Menu
              </button>
            </div>
          </div>

          {/* Recent Treatment Highlight */}
          <div style={{ backgroundColor: '#ffffff', padding: '30px', borderRadius: '14px', border: '1px solid #ebdcd0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '1.25rem', color: '#2c221e', fontFamily: 'var(--font-heading)', margin: 0, fontWeight: '600' }}>
                Latest Clinical Treatment Record
              </h2>
              {treatments.length > 0 && (
                <button
                  onClick={() => setActiveTab('treatments')}
                  style={{ background: 'none', border: 'none', color: '#806657', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  View all treatments <ChevronRight size={14} />
                </button>
              )}
            </div>

            {treatments.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', backgroundColor: '#faf8f5', borderRadius: '10px', border: '1px dashed #ebdcd0' }}>
                <HeartPulse size={36} color="#c2b4a8" style={{ marginBottom: '12px' }} />
                <p style={{ color: '#6e5d53', fontSize: '0.95rem', margin: '0 0 6px 0', fontWeight: '500' }}>No clinical treatments recorded yet.</p>
                <span style={{ color: '#8c7b70', fontSize: '0.85rem' }}>
                  When your skin specialist or aesthetic therapist completes a session, detailed clinical notes and aftercare instructions will appear here.
                </span>
              </div>
            ) : (
              <div style={{ border: '1px solid #ebdcd0', borderRadius: '12px', padding: '24px', backgroundColor: '#fcfaf8' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
                  <div>
                    <h3 style={{ fontSize: '1.2rem', color: '#2c221e', margin: '0 0 4px 0', fontWeight: '600' }}>
                      {treatments[0].treatmentName}
                    </h3>
                    <span style={{ fontSize: '0.85rem', color: '#8c7b70' }}>
                      Completed on {new Date(treatments[0].treatmentDate).toLocaleDateString()} • Attended by {treatments[0].practitionerName || 'Clinic Staff'}
                    </span>
                  </div>
                  <span style={{ backgroundColor: '#eef2ff', color: '#3730a3', padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '700' }}>
                    CLINICAL RECORD
                  </span>
                </div>

                {treatments[0].description && (
                  <p style={{ color: '#5c4d44', fontSize: '0.9rem', lineHeight: '1.5', margin: '0 0 16px 0' }}>
                    {treatments[0].description}
                  </p>
                )}

                {/* Highlighted Aftercare Instructions */}
                <div style={{ backgroundColor: '#ffffff', border: '1px solid #ebdcd0', borderLeft: '4px solid #ca8a04', padding: '16px 18px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: '700', color: '#854d0e', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Info size={16} /> Clinical Aftercare Instructions
                  </div>
                  <p style={{ color: '#4a3b32', fontSize: '0.9rem', lineHeight: '1.5', margin: 0 }}>
                    {treatments[0].aftercareInstructions || 'Keep treated skin hydrated. Apply broad-spectrum SPF 50+ daily and avoid harsh exfoliants.'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: MY APPOINTMENTS & SELF-BOOKING */}
      {activeTab === 'appointments' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
          {/* Booking Card */}
          <div style={{ backgroundColor: '#ffffff', padding: '32px', borderRadius: '16px', border: '1px solid #ebdcd0' }}>
            <div style={{ marginBottom: '22px' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#806657', fontSize: '0.78rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
                <Calendar size={14} /> Self-Service In-Clinic Scheduling
              </div>
              <h2 style={{ fontSize: '1.35rem', color: '#2c221e', fontFamily: 'var(--font-heading)', fontWeight: '600', margin: '0 0 6px 0' }}>
                Schedule An Appointment
              </h2>
              <p style={{ color: '#8c7b70', fontSize: '0.88rem', margin: 0 }}>
                Select your desired aesthetic procedure and preferred time. Your booking request will be securely confirmed by our clinical reception.
              </p>
            </div>

            <form onSubmit={handleBookAppointment} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#4a3b32', marginBottom: '6px' }}>
                    Procedure / Treatment <span style={{ color: '#b91c1c' }}>*</span>
                  </label>
                  <select
                    value={bookTreatment}
                    onChange={(e) => setBookTreatment(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: '8px',
                      border: '1px solid #d4c3b3',
                      backgroundColor: '#fdfbf9',
                      fontSize: '0.9rem',
                      color: '#2c221e',
                      outline: 'none'
                    }}
                  >
                    {TREATMENTS_DATA.map((t) => (
                      <option key={t.id} value={t.name}>
                        {t.name} — {t.price} ({t.categoryName})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#4a3b32', marginBottom: '6px' }}>
                    Preferred Appointment Date <span style={{ color: '#b91c1c' }}>*</span>
                  </label>
                  <input
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    value={bookDate}
                    onChange={(e) => setBookDate(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: '8px',
                      border: '1px solid #d4c3b3',
                      backgroundColor: '#fdfbf9',
                      fontSize: '0.9rem',
                      color: '#2c221e',
                      outline: 'none'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#4a3b32', marginBottom: '6px' }}>
                    Preferred Time Slot
                  </label>
                  <select
                    value={bookTime}
                    onChange={(e) => setBookTime(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: '8px',
                      border: '1px solid #d4c3b3',
                      backgroundColor: '#fdfbf9',
                      fontSize: '0.9rem',
                      color: '#2c221e',
                      outline: 'none'
                    }}
                  >
                    {['10:00 AM', '11:00 AM', '12:00 PM', '01:30 PM', '03:00 PM', '04:30 PM', '06:00 PM', '07:00 PM'].map((slot) => (
                      <option key={slot} value={slot}>{slot}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#4a3b32', marginBottom: '6px' }}>
                    Skin Concerns or Personal Notes (Optional)
                  </label>
                  <input
                    type="text"
                    value={bookNotes}
                    onChange={(e) => setBookNotes(e.target.value)}
                    placeholder="e.g. Skin sensitivity, specific questions..."
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: '8px',
                      border: '1px solid #d4c3b3',
                      backgroundColor: '#fdfbf9',
                      fontSize: '0.9rem',
                      color: '#2c221e',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button
                  type="submit"
                  disabled={bookingLoading}
                  style={{
                    backgroundColor: '#806657',
                    color: '#ffffff',
                    border: 'none',
                    padding: '12px 28px',
                    borderRadius: '8px',
                    fontWeight: '600',
                    fontSize: '0.92rem',
                    cursor: bookingLoading ? 'wait' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    opacity: bookingLoading ? 0.7 : 1
                  }}
                >
                  <Calendar size={16} />
                  {bookingLoading ? 'Submitting Appointment...' : 'Request Appointment'}
                </button>
              </div>
            </form>
          </div>

          {/* Appointments List */}
          <div style={{ backgroundColor: '#ffffff', padding: '32px', borderRadius: '16px', border: '1px solid #ebdcd0' }}>
            <h3 style={{ fontSize: '1.25rem', color: '#2c221e', fontFamily: 'var(--font-heading)', fontWeight: '600', margin: '0 0 16px 0' }}>
              My In-Clinic Visits & Status ({appointments.length})
            </h3>

            {appointments.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '45px 20px', backgroundColor: '#faf8f5', borderRadius: '10px', border: '1px dashed #ebdcd0' }}>
                <Calendar size={38} color="#c2b4a8" style={{ marginBottom: '12px' }} />
                <p style={{ color: '#6e5d53', fontSize: '0.95rem', fontWeight: '500', margin: '0 0 6px 0' }}>
                  No appointments scheduled currently.
                </p>
                <p style={{ color: '#8c7b70', fontSize: '0.85rem', margin: 0 }}>
                  Select a procedure from the form above to book your upcoming in-clinic session.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {appointments.map((appt) => {
                  const status = (appt.status || 'PENDING').toUpperCase();
                  let badgeStyle = { bg: '#fef3c7', text: '#92400e', border: '#fde68a' };
                  if (status === 'CONFIRMED') badgeStyle = { bg: '#ecfdf5', text: '#065f46', border: '#a7f3d0' };
                  if (status === 'COMPLETED') badgeStyle = { bg: '#eff6ff', text: '#1e40af', border: '#bfdbfe' };
                  if (status === 'CANCELLED') badgeStyle = { bg: '#fef2f2', text: '#991b1b', border: '#fecaca' };

                  return (
                    <div
                      key={appt.id}
                      style={{
                        border: '1px solid #ebdcd0',
                        borderRadius: '12px',
                        padding: '20px 24px',
                        backgroundColor: '#ffffff',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '16px'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                          <h4 style={{ margin: 0, fontSize: '1.1rem', color: '#2c221e', fontWeight: '600' }}>
                            {appt.treatmentName || appt.service || 'Aesthetic Consultation'}
                          </h4>
                          <span style={{
                            backgroundColor: badgeStyle.bg,
                            color: badgeStyle.text,
                            border: `1px solid ${badgeStyle.border}`,
                            padding: '3px 10px',
                            borderRadius: '20px',
                            fontSize: '0.75rem',
                            fontWeight: '700'
                          }}>
                            {status}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '0.85rem', color: '#6e5d53' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <Calendar size={14} color="#806657" /> {appt.appointmentDate}
                          </span>
                          {appt.appointmentTime && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <Clock size={14} color="#806657" /> {appt.appointmentTime}
                            </span>
                          )}
                        </div>
                        {appt.notes && (
                          <p style={{ margin: '8px 0 0', fontSize: '0.84rem', color: '#8c7b70', fontStyle: 'italic' }}>
                            Note: "{appt.notes}"
                          </p>
                        )}
                      </div>
                      <div style={{ textAlign: 'right', fontSize: '0.8rem', color: '#8c7b70' }}>
                        Ref: #{appt.id}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: TREATMENT CATALOGUE & PRICING */}
      {activeTab === 'catalogue' && (
        <div style={{ backgroundColor: '#ffffff', padding: '32px', borderRadius: '16px', border: '1px solid #ebdcd0' }}>
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#806657', fontSize: '0.78rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
              <HeartPulse size={14} /> Comprehensive Clinic Menu
            </div>
            <h2 style={{ fontSize: '1.35rem', color: '#2c221e', fontFamily: 'var(--font-heading)', fontWeight: '600', margin: '0 0 6px 0' }}>
              Treatments & Pricing Catalogue
            </h2>
            <p style={{ color: '#8c7b70', fontSize: '0.88rem', margin: 0 }}>
              Browse all 55 verified aesthetic procedures across 7 specialized dermatological categories with transparent pricing in INR (₹).
            </p>
          </div>

          {/* Search & Category Filter Controls */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
            <div style={{ position: 'relative' }}>
              <Search size={18} color="#a89a90" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Search procedures by name or treatment area (e.g. PRP, Peels, Botox, Laser)..."
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
                <div style={{ textAlign: 'center', padding: '50px 20px', backgroundColor: '#faf8f5', borderRadius: '10px', border: '1px dashed #ebdcd0' }}>
                  <Search size={36} color="#c2b4a8" style={{ marginBottom: '10px' }} />
                  <p style={{ color: '#6e5d53', fontSize: '0.95rem', fontWeight: '500', margin: '0 0 6px 0' }}>No treatments found</p>
                  <p style={{ color: '#8c7b70', fontSize: '0.85rem', margin: '0 0 14px 0' }}>
                    No procedures match your current search or category filter.
                  </p>
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
                      boxShadow: '0 2px 8px rgba(44, 34, 30, 0.02)',
                      transition: 'transform 0.2s, box-shadow 0.2s'
                    }}
                  >
                    <div>
                      {item.image && (
                        <div style={{ width: '100%', height: '140px', borderRadius: '8px', overflow: 'hidden', marginBottom: '14px', backgroundColor: '#faf7f2' }}>
                          <img 
                            src={item.image} 
                            alt={item.name} 
                            loading="lazy" 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
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
                      <p style={{ color: '#6e5d53', fontSize: '0.83rem', lineHeight: '1.45', margin: '0 0 16px 0', minHeight: '48px' }}>
                        {item.description}
                      </p>
                    </div>

                    <div style={{ borderTop: '1px solid #f3ece4', paddingTop: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span style={{ fontSize: '0.7rem', color: '#8c7b70', display: 'block', textTransform: 'uppercase', fontWeight: '600' }}>Standard Fee</span>
                        <span style={{ fontSize: '1.25rem', fontWeight: '700', color: '#2c221e' }}>{item.price}</span>
                      </div>
                      <button
                        onClick={() => handleSelectTreatmentToBook(item.name)}
                        style={{
                          backgroundColor: '#806657',
                          color: '#ffffff',
                          border: 'none',
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
                        Book Appointment <ArrowRight size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}

          {/* Pricing Disclaimer */}
          <div style={{ marginTop: '24px', padding: '14px 18px', backgroundColor: '#faf8f5', borderRadius: '8px', border: '1px solid #ebdcd0', fontSize: '0.8rem', color: '#8c7b70', lineHeight: '1.45' }}>
            <strong>Clinical Notice:</strong> Treatment prices are indicative and may vary depending on individual consultation, treatment requirements and clinical assessment. Please contact our clinic for confirmation.
          </div>
        </div>
      )}

      {/* TAB 2: MY TREATMENTS */}
      {activeTab === 'treatments' && (
        <div style={{ backgroundColor: '#ffffff', padding: '32px', borderRadius: '16px', border: '1px solid #ebdcd0' }}>
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '1.35rem', color: '#2c221e', fontFamily: 'var(--font-heading)', fontWeight: '600', margin: '0 0 6px 0' }}>
              Official Treatment History
            </h2>
            <p style={{ color: '#8c7b70', fontSize: '0.88rem', margin: 0 }}>
              Below is the verified record of dermatological and aesthetic treatments performed at Derma Aline.
            </p>
          </div>

          {treatments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '50px 20px', backgroundColor: '#faf8f5', borderRadius: '10px', border: '1px dashed #ebdcd0' }}>
              <HeartPulse size={40} color="#c2b4a8" style={{ marginBottom: '14px' }} />
              <p style={{ color: '#6e5d53', fontSize: '1rem', fontWeight: '500', margin: '0 0 6px 0' }}>No treatments recorded in your file.</p>
              <p style={{ color: '#8c7b70', fontSize: '0.85rem', margin: 0 }}>
                Official treatment records are entered by authorized clinic practitioners following consultation.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {treatments.map((tr) => (
                <div key={tr.id} style={{ border: '1px solid #ebdcd0', borderRadius: '12px', padding: '24px', backgroundColor: '#ffffff', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
                    <div>
                      <h3 style={{ fontSize: '1.25rem', color: '#2c221e', margin: '0 0 4px 0', fontWeight: '600' }}>{tr.treatmentName}</h3>
                      <div style={{ fontSize: '0.85rem', color: '#8c7b70', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span>Session Date: {new Date(tr.treatmentDate).toLocaleDateString()}</span>
                        <span>•</span>
                        <span>Practitioner: {tr.practitionerName || 'Clinic Staff'}</span>
                      </div>
                    </div>
                    <span style={{ backgroundColor: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '700' }}>
                      COMPLETED SESSION
                    </span>
                  </div>

                  {tr.description && (
                    <div style={{ color: '#5c4d44', fontSize: '0.9rem', lineHeight: '1.5', marginBottom: '14px' }}>
                      {tr.description}
                    </div>
                  )}

                  {tr.clinicalNotes && (
                    <div style={{ backgroundColor: '#fbf9f6', padding: '12px 14px', borderRadius: '8px', fontSize: '0.85rem', color: '#6e5d53', marginBottom: '14px' }}>
                      <b>Clinical Practitioner Note:</b> {tr.clinicalNotes}
                    </div>
                  )}

                  {/* Aftercare Box */}
                  <div style={{ backgroundColor: '#fefce8', border: '1px solid #fef08a', borderLeft: '4px solid #ca8a04', padding: '16px', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: '700', color: '#854d0e', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Info size={15} /> Prescribed Aftercare
                    </div>
                    <p style={{ color: '#4a3b32', fontSize: '0.88rem', lineHeight: '1.5', margin: 0 }}>
                      {tr.aftercareInstructions || 'Keep skin clean and hydrated. Avoid sun exposure and apply broad-spectrum SPF 50+ regularly.'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: MY PROFILE */}
      {activeTab === 'profile' && (
        <div style={{ backgroundColor: '#ffffff', padding: '36px', borderRadius: '16px', border: '1px solid #ebdcd0', maxWidth: '680px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <div>
              <h2 style={{ fontSize: '1.35rem', color: '#2c221e', fontFamily: 'var(--font-heading)', fontWeight: '600', margin: '0 0 4px 0' }}>
                Client Profile
              </h2>
              <p style={{ color: '#8c7b70', fontSize: '0.88rem', margin: 0 }}>Manage your personal details and contact preferences.</p>
            </div>
            {!isEditingProfile && (
              <button
                onClick={() => setIsEditingProfile(true)}
                style={{
                  backgroundColor: '#fbf9f6',
                  border: '1px solid #ebdcd0',
                  color: '#806657',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Edit2 size={14} /> Edit Details
              </button>
            )}
          </div>

          {/* Profile Photo Management Card */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '24px',
            padding: '20px 24px',
            backgroundColor: '#faf7f2',
            borderRadius: '12px',
            border: '1px solid #ebdcd0',
            marginBottom: '26px'
          }}>
            <div style={{
              width: '84px',
              height: '84px',
              borderRadius: '50%',
              backgroundColor: '#f0eae1',
              color: '#806657',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '3px solid #d4c3b3',
              overflow: 'hidden',
              flexShrink: 0,
              boxShadow: '0 4px 12px rgba(128, 102, 87, 0.12)'
            }}>
              {profile?.profilePicture ? (
                <img 
                  src={profile.profilePicture} 
                  alt={profile.fullName || 'Client'} 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                />
              ) : (
                <User size={38} />
              )}
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: '600', color: '#2c221e', fontSize: '0.96rem', marginBottom: '4px' }}>
                Profile Photo
              </div>
              <p style={{ color: '#8c7b70', fontSize: '0.82rem', margin: '0 0 12px 0', lineHeight: '1.4' }}>
                Upload a portrait for your personalized clinic record and reception greeting.
              </p>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  accept="image/png, image/jpeg, image/webp" 
                  onChange={handlePhotoUpload} 
                  style={{ display: 'none' }} 
                />
                <button
                  type="button"
                  disabled={photoUploading}
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    backgroundColor: 'var(--color-primary, #806657)',
                    color: '#ffffff',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    cursor: photoUploading ? 'wait' : 'pointer',
                    fontSize: '0.82rem',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Camera size={14} /> {photoUploading ? 'Uploading...' : profile?.profilePicture ? 'Change Photo' : 'Upload Photo'}
                </button>

                {profile?.profilePicture && (
                  <button
                    type="button"
                    disabled={photoUploading}
                    onClick={handleRemovePhoto}
                    style={{
                      backgroundColor: '#ffffff',
                      color: '#dc2626',
                      border: '1px solid #fecaca',
                      padding: '8px 14px',
                      borderRadius: '8px',
                      cursor: photoUploading ? 'wait' : 'pointer',
                      fontSize: '0.82rem',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <Trash2 size={13} /> Remove
                  </button>
                )}
              </div>
            </div>
          </div>

          {isEditingProfile ? (
            <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: '#4a3b32', marginBottom: '6px' }}>Full Name</label>
                <input
                  type="text"
                  required
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #ebdcd0', outline: 'none', fontSize: '0.9rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: '#4a3b32', marginBottom: '6px' }}>Phone Number</label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #ebdcd0', outline: 'none', fontSize: '0.9rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: '#8c7b70', marginBottom: '6px' }}>Email Address (Verified)</label>
                <input
                  type="email"
                  disabled
                  value={profile?.email || ''}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #ebdcd0', backgroundColor: '#f7f2ed', color: '#8c7b70', outline: 'none', fontSize: '0.9rem' }}
                />
                <span style={{ fontSize: '0.78rem', color: '#8c7b70', marginTop: '4px', display: 'block' }}>Email changes require clinical identity re-verification.</span>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <button
                  type="submit"
                  disabled={profileSaving}
                  className="btn-primary"
                  style={{ padding: '10px 20px', fontSize: '0.9rem', fontWeight: '600' }}
                >
                  {profileSaving ? 'Saving Changes...' : 'Save Profile'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingProfile(false)}
                  style={{ backgroundColor: '#ffffff', border: '1px solid #ebdcd0', color: '#6e5d53', padding: '10px 18px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem' }}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid #ebdcd0' }}>
                <span style={{ color: '#8c7b70', fontSize: '0.88rem' }}>Full Legal Name</span>
                <span style={{ color: '#2c221e', fontWeight: '600', fontSize: '0.92rem' }}>{profile?.fullName}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid #ebdcd0' }}>
                <span style={{ color: '#8c7b70', fontSize: '0.88rem' }}>Email Address</span>
                <span style={{ color: '#2c221e', fontWeight: '600', fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {profile?.email} <CheckCircle2 size={14} color="#16a34a" />
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid #ebdcd0' }}>
                <span style={{ color: '#8c7b70', fontSize: '0.88rem' }}>Phone Number</span>
                <span style={{ color: '#2c221e', fontWeight: '600', fontSize: '0.92rem' }}>{profile?.phone || 'Not provided'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid #ebdcd0' }}>
                <span style={{ color: '#8c7b70', fontSize: '0.88rem' }}>Role Isolation</span>
                <span style={{ backgroundColor: '#f7f2ed', color: '#806657', padding: '4px 10px', borderRadius: '12px', fontSize: '0.78rem', fontWeight: '700' }}>
                  CUSTOMER (PRIVATE SUITE)
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: MY ENQUIRIES */}
      {activeTab === 'enquiries' && (
        <div style={{ backgroundColor: '#ffffff', padding: '32px', borderRadius: '16px', border: '1px solid #ebdcd0' }}>
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '1.35rem', color: '#2c221e', fontFamily: 'var(--font-heading)', fontWeight: '600', margin: '0 0 6px 0' }}>
              My Submitted Enquiries
            </h2>
            <p style={{ color: '#8c7b70', fontSize: '0.88rem', margin: 0 }}>
              Track the status of queries submitted through the clinic contact form.
            </p>
          </div>

          {enquiries.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '50px 20px', backgroundColor: '#faf8f5', borderRadius: '10px', border: '1px dashed #ebdcd0' }}>
              <MessageSquare size={38} color="#c2b4a8" style={{ marginBottom: '12px' }} />
              <p style={{ color: '#6e5d53', fontSize: '0.95rem', fontWeight: '500', margin: '0 0 6px 0' }}>No inquiries submitted.</p>
              <p style={{ color: '#8c7b70', fontSize: '0.85rem', margin: 0 }}>
                Have questions regarding treatment plans? Contact the clinic directly via the contact page.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {enquiries.map((msg) => (
                <div key={msg.id} style={{ border: '1px solid #ebdcd0', borderRadius: '10px', padding: '20px', backgroundColor: '#ffffff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.82rem', color: '#8c7b70' }}>
                      Submitted {msg.createdAt ? new Date(msg.createdAt).toLocaleDateString() : 'Recently'}
                    </span>
                    <span style={{
                      backgroundColor: msg.status === 'RESOLVED' ? '#f0fdf4' : msg.status === 'READ' ? '#f8fafc' : '#fef3c7',
                      color: msg.status === 'RESOLVED' ? '#166534' : msg.status === 'READ' ? '#475569' : '#92400e',
                      border: '1px solid',
                      borderColor: msg.status === 'RESOLVED' ? '#bbf7d0' : msg.status === 'READ' ? '#cbd5e1' : '#fde68a',
                      padding: '4px 10px',
                      borderRadius: '12px',
                      fontSize: '0.75rem',
                      fontWeight: '700'
                    }}>
                      {msg.status || 'RECEIVED'}
                    </span>
                  </div>
                  <p style={{ color: '#2c221e', fontSize: '0.92rem', lineHeight: '1.5', margin: 0 }}>
                    {msg.message}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: NOTIFICATIONS */}
      {activeTab === 'notifications' && (
        <div style={{ backgroundColor: '#ffffff', padding: '32px', borderRadius: '16px', border: '1px solid #ebdcd0' }}>
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '1.35rem', color: '#2c221e', fontFamily: 'var(--font-heading)', fontWeight: '600', margin: '0 0 6px 0' }}>
              Clinical Notifications
            </h2>
            <p style={{ color: '#8c7b70', fontSize: '0.88rem', margin: 0 }}>
              Updates regarding treatment records, aftercare guidelines, and clinic notices.
            </p>
          </div>

          {notifications.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '50px 20px', backgroundColor: '#faf8f5', borderRadius: '10px', border: '1px dashed #ebdcd0' }}>
              <Bell size={38} color="#c2b4a8" style={{ marginBottom: '12px' }} />
              <p style={{ color: '#6e5d53', fontSize: '0.95rem', fontWeight: '500', margin: 0 }}>You are completely up to date.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {notifications.map((n) => (
                <div
                  key={n.id}
                  style={{
                    border: '1px solid #ebdcd0',
                    borderRadius: '10px',
                    padding: '20px',
                    backgroundColor: n.read ? '#ffffff' : '#fefdf8',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: '14px'
                  }}
                >
                  <div>
                    <h4 style={{ fontSize: '1rem', color: '#2c221e', margin: '0 0 4px 0', fontWeight: '600' }}>{n.title}</h4>
                    <p style={{ color: '#5c4d44', fontSize: '0.88rem', lineHeight: '1.5', margin: '0 0 6px 0' }}>{n.message}</p>
                    <span style={{ fontSize: '0.78rem', color: '#8c7b70' }}>{new Date(n.createdAt).toLocaleDateString()}</span>
                  </div>
                  {!n.read && (
                    <button
                      onClick={() => handleMarkNotificationRead(n.id)}
                      style={{
                        background: 'none',
                        border: '1px solid #ebdcd0',
                        color: '#806657',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '0.78rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      Mark Read
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 6: PRIVACY & SECURITY */}
      {activeTab === 'security' && (
        <div style={{ backgroundColor: '#ffffff', padding: '36px', borderRadius: '16px', border: '1px solid #ebdcd0', maxWidth: '600px', margin: '0 auto' }}>
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '1.35rem', color: '#2c221e', fontFamily: 'var(--font-heading)', fontWeight: '600', margin: '0 0 6px 0' }}>
              Privacy & Security
            </h2>
            <p style={{ color: '#8c7b70', fontSize: '0.88rem', margin: 0 }}>
              Update your password and review your account security status.
            </p>
          </div>

          <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: '#4a3b32', marginBottom: '6px' }}>Current Password</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #ebdcd0', outline: 'none', fontSize: '0.9rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: '#4a3b32', marginBottom: '6px' }}>New Password</label>
              <input
                type="password"
                required
                placeholder="Min 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #ebdcd0', outline: 'none', fontSize: '0.9rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: '#4a3b32', marginBottom: '6px' }}>Confirm New Password</label>
              <input
                type="password"
                required
                placeholder="Re-enter new password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #ebdcd0', outline: 'none', fontSize: '0.9rem' }}
              />
            </div>

            <button
              type="submit"
              disabled={passwordLoading}
              className="btn-primary"
              style={{ width: '100%', padding: '12px', fontSize: '0.92rem', fontWeight: '600', marginTop: '6px' }}
            >
              {passwordLoading ? 'Updating Password...' : 'Save New Password'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default ClientDashboard;
