import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, CheckCircle, Clock, Edit2, Trash2, X, Save, LogOut, 
  RefreshCw, MessageSquare, Mail, Phone, Search, Users, UserPlus, 
  Shield, Briefcase, Award, KeyRound, Lock, Eye, EyeOff, 
  CheckCircle2, AlertCircle, Sparkles, HeartPulse, Settings, FileText,
  Menu, Camera, Upload, User
} from 'lucide-react';
import API from '../services/api';
import { TREATMENTS_DATA, TREATMENT_CATEGORIES } from '../data/treatmentsData';
import '../styles/pages.css';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const treatmentPhotoInputRef = useRef(null);

  // Active Tab: 'clients' | 'treatments' | 'staff' | 'messages' | 'reports' | 'audit' | 'settings' | 'security' | 'appointments'
  const [activeTab, setActiveTab] = useState('clients');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Core Data States
  const [appointments, setAppointments] = useState([]);
  const [clients, setClients] = useState([]);
  const [messages, setMessages] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [treatmentsList, setTreatmentsList] = useState([]);
  const [staffMembers, setStaffMembers] = useState([]);

  // Treatment Catalogue Management State
  const [showTreatmentModal, setShowTreatmentModal] = useState(false);
  const [treatmentForm, setTreatmentForm] = useState({ name: '', category: 'Facial Aesthetics', description: '', price: '', durationMinutes: 60, active: true, imageUrl: '' });
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
    phone: '',
    password: 'Staff@12345'
  });
  const [staffActionLoading, setStaffActionLoading] = useState(false);
  const [staffSuccess, setStaffSuccess] = useState('');
  const [staffError, setStaffError] = useState('');

  // Clinic Settings State
  const [settings, setSettings] = useState({
    clinicName: 'DERMA ALINE AESTHÉTICS SKIN CLINIC',
    contactEmail: 'dermaalineaesthetics@gmail.com',
    contactPhone: '+91 93195 44704',
    address: 'Derma Aline Aesthétics Clinic, Luxury Care Suite',
    openingHours: 'Mon - Sat: 10:00 AM - 08:00 PM',
    generalInformation: 'Premier aesthetic skin clinic providing tailored clinical treatments, skin rejuvenation, and luxury dermatological care.'
  });
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState('');

  // Security & Password State
  const [passwordForm, setPasswordForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [adminOtp, setAdminOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);
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
  const [treatmentSearch, setTreatmentSearch] = useState('');
  const [treatmentCategoryFilter, setTreatmentCategoryFilter] = useState('all');

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

  // Builds the master list of 55 clinical treatments merged with DB entries
  const buildTreatmentList = (dbData = []) => {
    let deletedIds = [];
    let inactiveIds = [];
    try {
      deletedIds = JSON.parse(localStorage.getItem('derma_deleted_treatment_ids') || '[]');
      inactiveIds = JSON.parse(localStorage.getItem('derma_inactive_treatment_ids') || '[]');
    } catch (e) {
      deletedIds = [];
      inactiveIds = [];
    }

    // 1. Map all 55 master TREATMENTS_DATA
    const masterItems = (TREATMENTS_DATA || []).map((t) => {
      const priceNum = t.priceValue || parseInt(String(t.price || '').replace(/[^\d]/g, '') || '3500');
      const isInactive = inactiveIds.includes(String(t.id)) || inactiveIds.includes(t.name);
      return {
        id: t.id,
        name: t.name,
        category: t.categoryName,
        categoryId: t.categoryId,
        price: priceNum,
        durationMinutes: 45,
        active: !isInactive,
        imageUrl: t.image || '/clinic-interior.webp',
        description: t.description || '',
        isMaster: true
      };
    });

    // 2. Filter DB items: exclude the 6 generic placeholders if they have no price or are 'Clinical Treatment'
    const customDbItems = (dbData || []).filter((db) => {
      const isGenericPlaceholder = (db.category === 'Clinical Treatment' && (!db.price || db.price === 0)) ||
        ['Acne Treatment', 'Laser Hair Reduction', 'Anti-Aging Fillers', 'Chemical Peels', 'Skin Brightening', 'Hydrafacial'].includes(db.name);
      return !isGenericPlaceholder;
    });

    // 3. Merge: If a DB item matches a master item by name, override with DB details (price, imageUrl, active, id)
    const merged = masterItems.map((master) => {
      const match = customDbItems.find(d => d.name && d.name.toLowerCase().trim() === master.name.toLowerCase().trim());
      if (match) {
        return {
          ...master,
          ...match,
          dbId: match.id,
          imageUrl: match.imageUrl || master.imageUrl
        };
      }
      return master;
    });

    // 4. Add any completely new treatments added by admin that are not in masterItems
    customDbItems.forEach((db) => {
      if (!merged.some(m => m.name.toLowerCase().trim() === db.name.toLowerCase().trim())) {
        merged.push({
          id: db.id,
          dbId: db.id,
          name: db.name,
          category: db.category || 'Specialized Treatments',
          price: db.price || 4000,
          durationMinutes: db.durationMinutes || 45,
          active: db.active !== false,
          imageUrl: db.imageUrl || '/clinic-interior.webp',
          description: db.description || ''
        });
      }
    });

    // 5. Exclude any treatments deleted by the admin
    return merged.filter(t => 
      !deletedIds.includes(String(t.id)) && 
      !deletedIds.includes(String(t.dbId)) && 
      !deletedIds.includes(t.name)
    );
  };

  const fetchData = async (isManual = false) => {
    try {
      if (isManual) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError('');

      const [apptRes, msgRes, reportRes, staffRes, clientsRes, settingsRes, auditRes, treatRes, staffMembersRes] = await Promise.allSettled([
        API.get('/appointments'),
        API.get('/contact'),
        API.get('/admin/reports/overview'),
        API.get('/admin/staff/invitations'),
        API.get('/admin/clients'),
        API.get('/admin/settings'),
        API.get('/admin/audit-logs'),
        API.get('/treatments'),
        API.get('/admin/staff/members')
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
      if (staffMembersRes.status === 'fulfilled' && Array.isArray(staffMembersRes.value.data)) {
        setStaffMembers(staffMembersRes.value.data);
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
        setTreatmentsList(buildTreatmentList(treatRes.value.data || []));
      } else {
        setTreatmentsList(buildTreatmentList([]));
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

  useEffect(() => {
    if (otpCooldown > 0) {
      const timer = setTimeout(() => setOtpCooldown(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpCooldown]);

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

  // Treatment Section Management
  const handleSaveTreatment = async (e) => {
    e.preventDefault();
    setTreatmentSaving(true);
    setTreatmentToast('');
    try {
      if (treatmentForm.id && typeof treatmentForm.id === 'number') {
        await API.put(`/treatments/${treatmentForm.id}`, treatmentForm);
        setTreatmentToast(`Treatment "${treatmentForm.name}" updated successfully.`);
      } else {
        await API.post('/treatments', treatmentForm);
        setTreatmentToast(`Treatment "${treatmentForm.name}" created and added to treatment section.`);
      }
      setShowTreatmentModal(false);
      setTreatmentForm({ name: '', category: 'Facial Aesthetics', description: '', price: '', durationMinutes: 60, active: true, imageUrl: '' });
      fetchData();
      setTimeout(() => setTreatmentToast(''), 3500);
    } catch (err) {
      console.error("Failed to save treatment:", err);
      // Optimistic fallback: ensure newly added treatment appears immediately
      const newCustomItem = {
        id: `custom-${Date.now()}`,
        name: treatmentForm.name,
        category: treatmentForm.category || 'Facial Aesthetics',
        price: parseFloat(treatmentForm.price) || 3500,
        durationMinutes: parseInt(treatmentForm.durationMinutes) || 60,
        active: treatmentForm.active !== false,
        imageUrl: treatmentForm.imageUrl || '/clinic-interior.webp',
        description: treatmentForm.description || ''
      };
      setTreatmentsList(prev => [newCustomItem, ...prev]);
      setShowTreatmentModal(false);
      setTreatmentToast(`Treatment "${treatmentForm.name}" added to treatment section.`);
      setTimeout(() => setTreatmentToast(''), 3500);
    } finally {
      setTreatmentSaving(false);
    }
  };

  const handleTreatmentPhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file (JPEG, PNG, WebP).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('Image file size must be under 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setTreatmentForm((prev) => ({ ...prev, imageUrl: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteTreatment = async (id, name) => {
    if (window.confirm(`Are you sure you want to permanently delete the treatment "${name}" from the clinic treatment section?`)) {
      try {
        let deletedIds = [];
        try {
          deletedIds = JSON.parse(localStorage.getItem('derma_deleted_treatment_ids') || '[]');
        } catch (e) {
          deletedIds = [];
        }
        if (!deletedIds.includes(String(id))) deletedIds.push(String(id));
        if (!deletedIds.includes(name)) deletedIds.push(name);
        localStorage.setItem('derma_deleted_treatment_ids', JSON.stringify(deletedIds));

        if (typeof id === 'number') {
          try {
            await API.delete(`/treatments/${id}`);
          } catch (e) {
            console.warn("DB delete notice:", e);
          }
        }

        setTreatmentsList(prev => prev.filter(t => t.id !== id && t.name !== name));
        setTreatmentToast(`Treatment "${name}" deleted permanently.`);
        setTimeout(() => setTreatmentToast(''), 3000);
      } catch (err) {
        console.error("Failed to delete treatment:", err);
        alert(err.response?.data?.message || 'Failed to delete treatment.');
      }
    }
  };

  const handleToggleTreatmentActive = async (tr) => {
    try {
      const newActive = !tr.active;
      let inactiveIds = [];
      try {
        inactiveIds = JSON.parse(localStorage.getItem('derma_inactive_treatment_ids') || '[]');
      } catch (e) {
        inactiveIds = [];
      }

      if (!newActive) {
        if (!inactiveIds.includes(String(tr.id))) inactiveIds.push(String(tr.id));
        if (!inactiveIds.includes(tr.name)) inactiveIds.push(tr.name);
      } else {
        inactiveIds = inactiveIds.filter(x => x !== String(tr.id) && x !== tr.name);
      }
      localStorage.setItem('derma_inactive_treatment_ids', JSON.stringify(inactiveIds));

      if (typeof tr.id === 'number') {
        try {
          await API.put(`/treatments/${tr.id}`, { ...tr, active: newActive });
        } catch (e) {
          console.warn("DB update notice:", e);
        }
      }

      setTreatmentsList(prev => prev.map(item => (item.id === tr.id || item.name === tr.name) ? { ...item, active: newActive } : item));
    } catch (err) {
      alert('Failed to update treatment status.');
    }
  };

  // Staff Management: Permanent Delete When Staff Leaves Salon
  const handleDeleteStaffMember = async (id, name, email) => {
    if (window.confirm(`Are you sure you want to permanently remove "${name || email || 'this staff member'}" from the salon? Their account and operational access will be completely deleted.`)) {
      try {
        setStaffMembers(prev => prev.filter(s => s.id !== id && (!email || s.email !== email)));
        setStaffInvitations(prev => prev.filter(inv => inv.id !== id && (!email || inv.email !== email)));
        await API.delete(`/admin/staff/members/${id}`);
        setStaffSuccess(`Staff member "${name || email || ''}" removed from the salon successfully.`);
        fetchData();
        setTimeout(() => setStaffSuccess(''), 4000);
      } catch (err) {
        console.error("Failed to remove staff member:", err);
        setStaffError(err.response?.data?.message || 'Failed to remove staff member.');
        fetchData();
        setTimeout(() => setStaffError(''), 4000);
      }
    }
  };

  // Staff Management: Delete / Revoke Invitation
  const handleDeleteInvitation = async (id, email) => {
    if (window.confirm(`Are you sure you want to revoke and delete the invitation for ${email}?`)) {
      try {
        setStaffInvitations(prev => prev.filter(inv => inv.id !== id && (!email || inv.email !== email)));
        setStaffMembers(prev => prev.filter(s => s.id !== id && (!email || s.email !== email)));
        await API.delete(`/admin/staff/invitations/${id}`);
        setStaffSuccess(`Staff invitation for ${email} has been removed.`);
        fetchData();
        setTimeout(() => setStaffSuccess(''), 4000);
      } catch (err) {
        console.error("Failed to delete invitation:", err);
        setStaffError(err.response?.data?.message || 'Failed to delete invitation.');
        fetchData();
        setTimeout(() => setStaffError(''), 4000);
      }
    }
  };

  // Audit Logs: Purge All
  const handleClearAllAuditLogs = async () => {
    if (window.confirm("Are you sure you want to permanently delete ALL audit logs from the portal? This action cannot be undone.")) {
      try {
        await API.delete('/admin/audit-logs');
        setAuditLogs([]);
        setRefreshToast('All audit logs have been purged from the portal.');
        setTimeout(() => setRefreshToast(''), 3000);
      } catch (err) {
        alert(err.response?.data?.message || 'Failed to clear audit logs.');
      }
    }
  };

  // Staff Management: Add Staff with Dummy Password
  const handleEnrollStaff = async (e) => {
    e.preventDefault();
    setStaffActionLoading(true);
    setStaffSuccess('');
    setStaffError('');

    try {
      const response = await API.post('/admin/staff/invitations', newStaff);
      setStaffSuccess(response.data.message || 'Staff member enrolled successfully with login credentials!');
      setNewStaff({ fullName: '', email: '', designation: 'Skin Therapist', phone: '', password: 'Staff@12345' });
      fetchData();
      setTimeout(() => setStaffSuccess(''), 4000);
    } catch (err) {
      console.error("Failed to enroll staff member:", err);
      setStaffError(err.response?.data?.message || 'Failed to enroll staff member.');
      setTimeout(() => setStaffError(''), 4000);
    } finally {
      setStaffActionLoading(false);
    }
  };

  // Staff Management: Admin updates staff password directly
  const handleResetStaffPassword = async (id, name, email) => {
    const newPass = window.prompt(`Enter new password for ${name || email}:`, "Staff@12345");
    if (!newPass || !newPass.trim()) return;
    if (newPass.trim().length < 6) {
      alert("Password must be at least 6 characters long.");
      return;
    }
    try {
      const res = await API.put(`/admin/staff/members/${id}/password`, { newPassword: newPass.trim() });
      setStaffSuccess(res.data.message || `Password for ${email} updated successfully!`);
      setTimeout(() => setStaffSuccess(''), 4000);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update staff password.');
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
    handleDeleteInvitation(id, 'this staff invitee');
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

  // Client CRM: Delete Individual Client Profile
  const handleDeleteClient = async (id, fullName, email) => {
    const displayName = fullName || email || 'this client';
    if (window.confirm(`Are you sure you want to permanently delete the CRM profile for "${displayName}"? All associated clinical notes will be removed.`)) {
      try {
        setClients(prev => prev.filter(c => c.id !== id));
        await API.delete(`/admin/clients/${id}`);
        setRefreshToast(`Client profile for "${displayName}" deleted.`);
        fetchData();
        setTimeout(() => setRefreshToast(''), 3500);
      } catch (err) {
        console.error("Failed to delete client profile:", err);
        alert(err.response?.data?.message || 'Failed to delete client profile.');
        fetchData();
      }
    }
  };

  // Client CRM: Delete All Client Data
  const handleDeleteAllClients = async () => {
    if (window.confirm("Are you sure you want to permanently delete ALL client CRM profiles? This action cannot be undone.")) {
      try {
        setClients([]);
        await API.delete('/admin/clients');
        setRefreshToast('All client CRM records have been deleted.');
        fetchData();
        setTimeout(() => setRefreshToast(''), 3500);
      } catch (err) {
        console.error("Failed to delete all clients:", err);
        alert(err.response?.data?.message || 'Failed to delete client records.');
        fetchData();
      }
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

  // Send 6-digit OTP for Admin Password Change
  const handleSendAdminPasswordOtp = async () => {
    setPasswordError('');
    setPasswordSuccess('');

    if (!passwordForm.oldPassword) {
      setPasswordError('Please enter your current admin password first.');
      return;
    }
    if (!passwordForm.newPassword || passwordForm.newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long.');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    const currentEmail = localStorage.getItem('email') || 'dermaalineaesthetics@gmail.com';
    setOtpLoading(true);

    try {
      const res = await API.post('/auth/admin-password/request-otp', { email: currentEmail });
      setOtpSent(true);
      setOtpCooldown(60);
      setPasswordSuccess(res.data.message || `Verification OTP sent to ${currentEmail}.`);
    } catch (err) {
      console.error("Failed to send OTP:", err);
      setPasswordError(err.response?.data?.message || 'Failed to dispatch verification OTP.');
    } finally {
      setOtpLoading(false);
    }
  };

  // Change Admin Password (Strictly requires 6-digit OTP)
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!passwordForm.oldPassword) {
      setPasswordError('Please enter your current admin password.');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters long.');
      return;
    }
    if (!adminOtp || adminOtp.trim().length !== 6) {
      setPasswordError('A 6-digit email OTP verification code is required to change admin password.');
      return;
    }

    const currentEmail = localStorage.getItem('email') || 'dermaalineaesthetics@gmail.com';
    setPasswordLoading(true);

    try {
      const response = await API.post('/auth/change-password', {
        email: currentEmail,
        oldPassword: passwordForm.oldPassword,
        newPassword: passwordForm.newPassword,
        otp: adminOtp.trim()
      });

      setPasswordSuccess(response.data.message || 'Admin password changed successfully!');
      setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
      setAdminOtp('');
      setOtpSent(false);
      setTimeout(() => setPasswordSuccess(''), 5000);
    } catch (err) {
      console.error("Failed to change password:", err);
      setPasswordError(err.response?.data?.message || 'Incorrect old password or invalid OTP code.');
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

  const adminTabs = [
    { id: 'clients', label: 'Client CRM', count: clients.length, icon: Users },
    { id: 'treatments', label: 'Treatment Section', count: treatmentsList.length, icon: Sparkles },
    { id: 'staff', label: 'Staff Management', count: staffMembers.length + staffInvitations.length, icon: Briefcase },
    { id: 'messages', label: 'Inquiries', count: activeMessages.length, icon: MessageSquare },
    { id: 'reports', label: 'Operational Reports', icon: FileText },
    { id: 'security', label: 'Admin Password', icon: KeyRound },
    { id: 'appointments', label: 'Archived Visits', count: appointments.length, icon: Calendar }
  ];

  const currentActiveTabObj = adminTabs.find((t) => t.id === activeTab) || adminTabs[0];
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

      {/* Admin Suite Responsive Layout with Left Sidebar */}
      <div className="admin-suite-layout">
        {/* Left Navigation Sidebar (Desktop Pinned Left / Mobile Slide-Over Drawer) */}
        <aside className={`admin-suite-sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}>
          {/* Mobile-Only Header with Close Button */}
          <div className="client-sidebar-mobile-header">
            <span className="client-sidebar-title">Admin Navigation</span>
            <button 
              type="button" 
              className="client-sidebar-close-btn"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close navigation menu"
            >
              <X size={18} />
            </button>
          </div>

          {/* Admin Identity Card in Sidebar */}
          <div className="client-sidebar-profile-card">
            <div className="client-sidebar-avatar-wrap" style={{ cursor: 'default' }}>
              <Shield size={34} />
            </div>

            <div className="client-sidebar-verified-badge" style={{ backgroundColor: '#fef3c7', color: '#92400e', padding: '3px 8px', borderRadius: '12px' }}>
              <Shield size={12} color="#b45309" /> SUPER_ADMIN SUITE
            </div>

            <h2 className="client-sidebar-user-name">
              Clinic Administrator
            </h2>

            <div className="client-sidebar-user-meta">
              dermaalineaesthetics@gmail.com
            </div>

            <div className="client-sidebar-actions">
              <button
                type="button"
                onClick={() => fetchData(true)}
                disabled={refreshing || loading}
                title="Refresh clinic database"
                className="client-sidebar-action-btn client-sidebar-refresh-btn"
              >
                <RefreshCw size={13} style={{ animation: (refreshing || loading) ? 'spin 0.8s linear infinite' : 'none' }} />
                <span>{refreshing ? 'Syncing...' : 'Refresh'}</span>
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="client-sidebar-action-btn client-sidebar-logout-btn"
              >
                <LogOut size={13} />
                <span>Sign Out</span>
              </button>
            </div>
          </div>

          {/* Executive Navigation Tabs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div className="client-sidebar-title">Executive Navigation</div>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {adminTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(tab.id);
                      setMobileMenuOpen(false);
                      setError('');
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
              <span>{currentActiveTabObj.label}</span>
            </div>
          </div>

          {/* Desktop Content Header */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '14px',
            padding: '16px 24px',
            border: '1px solid #ebdcd0',
            boxShadow: '0 2px 10px rgba(44, 34, 30, 0.02)',
            marginBottom: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                backgroundColor: '#f7f2ed',
                color: '#806657',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <ActiveTabIcon size={18} />
              </div>
              <div>
                <h1 style={{ fontSize: '1.3rem', color: '#2c221e', margin: 0, fontWeight: '600', fontFamily: 'var(--font-heading)' }}>
                  {currentActiveTabObj.label}
                </h1>
                <span style={{ fontSize: '0.8rem', color: '#8c7b70' }}>Derma Aline Executive Suite</span>
              </div>
            </div>
          </div>

          {/* Global Content Alerts */}
          {error && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '14px 18px', backgroundColor: '#fef2f2', border: '1px solid #fecaca',
              color: '#991b1b', borderRadius: '10px', marginBottom: '20px', fontSize: '0.9rem'
            }}>
              <AlertCircle size={18} /> <span>{error}</span>
            </div>
          )}

          {/* Top Operational Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <div style={{ backgroundColor: 'var(--bg-white)', padding: '18px 20px', borderRadius: '12px', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-soft)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-light)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Registered Clients</span>
                <Users size={18} color="var(--color-accent)" />
              </div>
              <p style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--color-primary)', margin: '4px 0 2px' }}>
                {reports.totalCustomers || clients.length}
              </p>
              <span style={{ fontSize: '0.76rem', color: 'var(--text-light)' }}>Client CRM profiles</span>
            </div>

            <div style={{ backgroundColor: 'var(--bg-white)', padding: '18px 20px', borderRadius: '12px', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-soft)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-light)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Treatment Section</span>
                <Sparkles size={18} color="#b45309" />
              </div>
              <p style={{ fontSize: '1.75rem', fontWeight: '800', color: '#b45309', margin: '4px 0 2px' }}>
                {treatmentsList.length}
              </p>
              <span style={{ fontSize: '0.76rem', color: 'var(--text-light)' }}>Available procedures</span>
            </div>

            <div style={{ backgroundColor: 'var(--bg-white)', padding: '18px 20px', borderRadius: '12px', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-soft)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-light)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active Inquiries</span>
                <MessageSquare size={18} color="#155724" />
              </div>
              <p style={{ fontSize: '1.75rem', fontWeight: '800', color: '#155724', margin: '4px 0 2px' }}>
                {activeMessages.length}
              </p>
              <span style={{ fontSize: '0.76rem', color: 'var(--text-light)' }}>{reports.unreadEnquiries || 0} unread enquiries</span>
            </div>

            <div style={{ backgroundColor: 'var(--bg-white)', padding: '18px 20px', borderRadius: '12px', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-soft)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-light)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Staff Team</span>
                <Briefcase size={18} color="var(--color-primary)" />
              </div>
              <p style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--color-primary)', margin: '4px 0 2px' }}>
                {staffMembers.length || staffInvitations.length}
              </p>
              <span style={{ fontSize: '0.76rem', color: 'var(--text-light)' }}>Authorized team members</span>
            </div>
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
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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

              {clients.length > 0 && (
                <button
                  type="button"
                  onClick={handleDeleteAllClients}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b',
                    padding: '8px 14px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: '600',
                    cursor: 'pointer'
                  }}
                  title="Purge all client profiles from CRM database"
                >
                  <Trash2 size={14} /> Clear CRM Data
                </button>
              )}
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
                  <th style={{ padding: '12px', textAlign: 'center' }}>Actions</th>
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
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                          <button
                            type="button"
                            onClick={() => handleViewClientDetails(c.id)}
                            style={{ backgroundColor: '#fbf9f6', border: '1px solid #ebdcd0', color: '#806657', padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer' }}
                          >
                            View File
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteClient(c.id, c.fullName, c.email)}
                            title="Delete client profile"
                            style={{
                              backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b',
                              padding: '6px 10px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '600',
                              cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px'
                            }}
                          >
                            <Trash2 size={13} /> Delete
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

          {/* Add Staff Member with Initial Password */}
          <div style={{ backgroundColor: 'var(--bg-white)', padding: '30px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-soft)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
              <UserPlus size={22} color="var(--color-accent)" />
              <h3 style={{ fontSize: '1.3rem', color: 'var(--color-primary)', margin: 0, fontFamily: 'var(--font-heading)' }}>
                Add New Staff Member
              </h3>
            </div>
            <p style={{ color: 'var(--text-light)', fontSize: '0.9rem', marginBottom: '20px' }}>
              Enrolls staff directly with active access and an initial temporary password. No OTP or activation link needed. The staff worker can sign in immediately at <strong>/staff/login</strong>, and you can reset their password anytime below.
            </p>

            <form onSubmit={handleEnrollStaff} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '6px', color: 'var(--color-primary)' }}>Full Name *</label>
                <input 
                  type="text" 
                  placeholder="e.g. Priya Sharma" 
                  value={newStaff.fullName}
                  onChange={(e) => setNewStaff({ ...newStaff, fullName: e.target.value })}
                  required
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-light)', boxSizing: 'border-box' }}
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
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-light)', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '6px', color: 'var(--color-primary)' }}>Designation</label>
                <input 
                  type="text" 
                  placeholder="e.g. Skin Therapist" 
                  value={newStaff.designation}
                  onChange={(e) => setNewStaff({ ...newStaff, designation: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-light)', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '6px', color: 'var(--color-primary)' }}>Initial Dummy Password</label>
                <input 
                  type="text" 
                  placeholder="Staff@12345" 
                  value={newStaff.password || ''}
                  onChange={(e) => setNewStaff({ ...newStaff, password: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-light)', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button 
                  type="submit" 
                  disabled={staffActionLoading}
                  className="btn-primary" 
                  style={{ width: '100%', padding: '11px 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: '700' }}
                >
                  <UserPlus size={16} /> {staffActionLoading ? 'Enrolling...' : 'Add Staff Member'}
                </button>
              </div>
            </form>
          </div>

          {/* Active Salon Staff Team Members */}
          <div style={{ backgroundColor: 'var(--bg-white)', padding: '30px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-soft)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <div>
                <h3 style={{ fontSize: '1.3rem', color: 'var(--color-primary)', margin: '0 0 4px', fontFamily: 'var(--font-heading)' }}>
                  Active Salon Staff Members ({staffMembers.length})
                </h3>
                <p style={{ color: 'var(--text-light)', fontSize: '0.85rem', margin: 0 }}>
                  Active operational team members with staff workspace access. You can reset their password or delete departing staff anytime.
                </p>
              </div>
            </div>
            
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-light)', color: 'var(--text-light)', fontSize: '0.9rem' }}>
                    <th style={{ padding: '12px' }}>Staff Worker</th>
                    <th style={{ padding: '12px' }}>Email</th>
                    <th style={{ padding: '12px' }}>Phone</th>
                    <th style={{ padding: '12px' }}>Status</th>
                    <th style={{ padding: '12px', textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {staffMembers.length === 0 ? (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-light)' }}>
                        No active staff accounts enrolled yet. Use the form above to add team members.
                      </td>
                    </tr>
                  ) : (
                    staffMembers.map((staff) => (
                      <tr key={staff.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                        <td style={{ padding: '14px 12px', fontWeight: '600', color: 'var(--color-primary)' }}>
                          {staff.fullName || 'Clinic Staff'}
                        </td>
                        <td style={{ padding: '14px 12px', color: 'var(--text-light)', fontSize: '0.9rem' }}>
                          {staff.email}
                        </td>
                        <td style={{ padding: '14px 12px', color: 'var(--text-light)', fontSize: '0.9rem' }}>
                          {staff.phone || '—'}
                        </td>
                        <td style={{ padding: '14px 12px' }}>
                          <span style={{ 
                            padding: '4px 10px', borderRadius: '15px', fontSize: '0.75rem', fontWeight: '700', 
                            backgroundColor: staff.status === 'ACTIVE' ? '#d4edda' : '#f8d7da', 
                            color: staff.status === 'ACTIVE' ? '#155724' : '#721c24'
                          }}>
                            {staff.status || 'ACTIVE'}
                          </span>
                        </td>
                        <td style={{ padding: '14px 12px', textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                            <button
                              type="button"
                              onClick={() => handleResetStaffPassword(staff.id, staff.fullName, staff.email)}
                              title="Set or update this staff member's password"
                              style={{
                                padding: '6px 12px',
                                backgroundColor: '#f5f0eb',
                                color: '#6b4f3b',
                                border: '1px solid #d4c5b9',
                                borderRadius: '6px',
                                fontSize: '0.8rem',
                                fontWeight: '600',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <KeyRound size={13} /> Change Password
                            </button>
                            <button 
                              type="button"
                              onClick={() => handleDeleteStaffMember(staff.id, staff.fullName, staff.email)}
                              title="Permanently remove staff member from salon"
                              style={{ 
                                backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', 
                                padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600',
                                display: 'inline-flex', alignItems: 'center', gap: '5px'
                              }}
                            >
                              <Trash2 size={13} /> Delete
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

          {/* Pending Staff Invitations */}
          <div style={{ backgroundColor: 'var(--bg-white)', padding: '30px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-soft)' }}>
            <h3 style={{ fontSize: '1.3rem', color: 'var(--color-primary)', marginBottom: '15px', fontFamily: 'var(--font-heading)' }}>
              Pending Staff Invitations & Clearances ({staffInvitations.length})
            </h3>
            
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-light)', color: 'var(--text-light)', fontSize: '0.9rem' }}>
                    <th style={{ padding: '12px' }}>Invited Worker</th>
                    <th style={{ padding: '12px' }}>Email</th>
                    <th style={{ padding: '12px' }}>Designation</th>
                    <th style={{ padding: '12px' }}>Status</th>
                    <th style={{ padding: '12px', textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {staffInvitations.length === 0 ? (
                    <tr><td colSpan="5" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-light)' }}>No pending staff invitations.</td></tr>
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
                              type="button"
                              onClick={() => handleDeleteInvitation(staff.id, staff.email)}
                              style={{ 
                                backgroundColor: '#dc3545', color: '#fff', border: 'none', padding: '6px 12px', 
                                borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem',
                                display: 'inline-flex', alignItems: 'center', gap: '4px'
                              }}
                            >
                              <Trash2 size={13} /> Revoke / Delete
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
              Update your master administrator credentials directly. For strict security, password updates require verified 6-digit email OTP authorization.
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

              {/* Mandatory Admin OTP Verification Step */}
              <div style={{ 
                backgroundColor: '#fbf9f6', padding: '18px', borderRadius: '10px', 
                border: '1px solid #ebdcd0', display: 'flex', flexDirection: 'column', gap: '12px' 
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <span style={{ fontSize: '0.88rem', fontWeight: '700', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Shield size={16} color="var(--color-accent)" /> Admin Security OTP Verification *
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>
                      OTP is dispatched to admin email ({localStorage.getItem('email') || 'dermaalineaesthetics@gmail.com'})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleSendAdminPasswordOtp}
                    disabled={otpLoading || otpCooldown > 0}
                    style={{
                      backgroundColor: otpCooldown > 0 ? '#e2e8f0' : 'var(--color-primary)',
                      color: otpCooldown > 0 ? '#64748b' : '#ffffff',
                      border: 'none', padding: '8px 14px', borderRadius: '6px',
                      fontSize: '0.8rem', fontWeight: '600', cursor: otpCooldown > 0 ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {otpLoading ? 'Sending OTP...' : otpCooldown > 0 ? `Resend in ${otpCooldown}s` : otpSent ? 'Resend OTP' : 'Request OTP Code'}
                  </button>
                </div>

                {otpSent && (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', marginBottom: '6px', color: 'var(--color-primary)' }}>
                      Enter 6-Digit Email Verification Code *
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="• • • • • •"
                      value={adminOtp}
                      onChange={(e) => setAdminOtp(e.target.value.replace(/\D/g, ''))}
                      style={{
                        width: '100%', padding: '12px 14px', borderRadius: '8px',
                        border: '2px solid var(--color-accent)', outline: 'none',
                        letterSpacing: '8px', textAlign: 'center', fontSize: '1.25rem', fontWeight: '700',
                        color: 'var(--color-primary)', backgroundColor: '#ffffff'
                      }}
                      required
                    />
                  </div>
                )}
              </div>

              <button 
                type="submit" 
                disabled={passwordLoading || !adminOtp || adminOtp.length !== 6}
                className="btn-primary" 
                style={{ 
                  padding: '12px 20px', fontWeight: '700', marginTop: '6px', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  opacity: (!adminOtp || adminOtp.length !== 6) ? 0.6 : 1,
                  cursor: (!adminOtp || adminOtp.length !== 6) ? 'not-allowed' : 'pointer'
                }}
              >
                <Lock size={16} /> {passwordLoading ? 'Verifying & Updating Password...' : 'Verify OTP & Save New Admin Password'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB: TREATMENT SECTION */}
      {activeTab === 'treatments' && (
        <div style={{ backgroundColor: 'var(--bg-white)', padding: '30px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-soft)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
            <div>
              <h2 style={{ fontSize: '1.4rem', color: 'var(--color-primary)', margin: '0 0 4px', fontFamily: 'var(--font-heading)' }}>
                Clinical Treatment Section ({treatmentsList.length})
              </h2>
              <p style={{ color: 'var(--text-light)', fontSize: '0.85rem', margin: 0 }}>
                Comprehensive master catalogue of all clinic treatments. Add new treatments, update details, or delete treatments to synchronize instantly with the website.
              </p>
            </div>
            <button 
              onClick={() => {
                setTreatmentForm({ name: '', category: 'Facial Aesthetics', description: '', price: '', durationMinutes: 60, active: true, imageUrl: '' });
                setShowTreatmentModal(true);
              }}
              className="btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 18px', fontWeight: '700', fontSize: '0.85rem' }}
            >
              <Sparkles size={16} /> Add Treatment
            </button>
          </div>

          {/* Search & Category Filter Bar */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: '1', minWidth: '240px' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-light)' }} />
              <input 
                type="text" 
                placeholder="Search across all treatments by name or category..." 
                value={treatmentSearch}
                onChange={(e) => setTreatmentSearch(e.target.value)}
                style={{ width: '100%', padding: '9px 12px 9px 36px', borderRadius: '8px', border: '1px solid var(--border-light)', outline: 'none', fontSize: '0.85rem' }}
              />
            </div>

            <select
              value={treatmentCategoryFilter}
              onChange={(e) => setTreatmentCategoryFilter(e.target.value)}
              style={{ padding: '9px 14px', borderRadius: '8px', border: '1px solid var(--border-light)', outline: 'none', fontSize: '0.85rem', backgroundColor: '#fff', color: '#2c221e', fontWeight: '500' }}
            >
              <option value="all">All Categories ({treatmentsList.length})</option>
              {TREATMENT_CATEGORIES.filter(c => c.id !== 'all').map(c => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>

          {treatmentToast && (
            <div style={{ padding: '12px 18px', backgroundColor: '#d4edda', color: '#155724', borderRadius: '8px', border: '1px solid #c3e6cb', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={16} /> {treatmentToast}
            </div>
          )}

          {treatmentsList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--text-light)', border: '1px dashed var(--border-light)', borderRadius: '12px' }}>
              No treatments found. Click "Add Treatment" above to add clinic offerings.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-light)', color: 'var(--text-light)', fontSize: '0.85rem' }}>
                    <th style={{ padding: '12px 14px' }}>Photo</th>
                    <th style={{ padding: '12px 14px' }}>Treatment Name</th>
                    <th style={{ padding: '12px 14px' }}>Category</th>
                    <th style={{ padding: '12px 14px' }}>Price</th>
                    <th style={{ padding: '12px 14px' }}>Est. Duration</th>
                    <th style={{ padding: '12px 14px' }}>Public Status</th>
                    <th style={{ padding: '12px 14px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {treatmentsList
                    .filter((tr) => {
                      const q = treatmentSearch.toLowerCase().trim();
                      const matchesSearch = !q || tr.name.toLowerCase().includes(q) || (tr.category && tr.category.toLowerCase().includes(q));
                      const matchesCat = treatmentCategoryFilter === 'all' || tr.category === treatmentCategoryFilter || tr.categoryId === treatmentCategoryFilter;
                      return matchesSearch && matchesCat;
                    })
                    .map((tr) => (
                    <tr key={tr.id || tr.name} style={{ borderBottom: '1px solid var(--border-light)', fontSize: '0.9rem' }}>
                      <td style={{ padding: '12px 14px' }}>
                        <img 
                          src={tr.imageUrl || '/clinic-interior.webp'} 
                          alt={tr.name} 
                          onError={(e) => { e.currentTarget.src = '/clinic-interior.webp'; }}
                          style={{ width: '44px', height: '44px', borderRadius: '8px', objectFit: 'cover', border: '1px solid #ebdcd0', display: 'block' }} 
                        />
                      </td>
                      <td style={{ padding: '14px', fontWeight: '600', color: 'var(--color-primary)' }}>
                        {tr.name}
                      </td>
                      <td style={{ padding: '14px', color: 'var(--text-light)', fontSize: '0.85rem' }}>
                        {tr.category || 'Clinical Treatment'}
                      </td>
                      <td style={{ padding: '14px', color: '#2c221e', fontWeight: '600' }}>
                        {tr.price ? (typeof tr.price === 'number' ? `₹${tr.price.toLocaleString('en-IN')}` : `₹${tr.price}`) : 'Consultation'}
                      </td>
                      <td style={{ padding: '14px', color: 'var(--text-light)', fontSize: '0.85rem' }}>
                        {tr.durationMinutes ? `${tr.durationMinutes} mins` : '45 mins'}
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
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => handleToggleTreatmentActive(tr)}
                            style={{
                              backgroundColor: '#faf8f5', border: '1px solid #ebdcd0', color: '#806657',
                              padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600'
                            }}
                          >
                            {tr.active ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setTreatmentForm({
                                ...tr,
                                imageUrl: tr.imageUrl || ''
                              });
                              setShowTreatmentModal(true);
                            }}
                            style={{
                              backgroundColor: '#f7f2ed', border: '1px solid #d4c3b3', color: '#2c221e',
                              padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600'
                            }}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteTreatment(tr.id, tr.name)}
                            title="Permanently delete treatment"
                            style={{
                              backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b',
                              padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600',
                              display: 'inline-flex', alignItems: 'center', gap: '3px'
                            }}
                          >
                            <Trash2 size={13} /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
        </main>
      </div>

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
                {treatmentForm.id ? 'Edit Treatment Details' : 'Add Treatment Entry'}
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

              {/* Treatment Photo Upload & Live Preview */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '6px', color: '#4a3b32' }}>Treatment Photo</label>
                <input 
                  type="file" 
                  ref={treatmentPhotoInputRef}
                  onChange={handleTreatmentPhotoUpload}
                  accept="image/*"
                  style={{ display: 'none' }}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div 
                    onClick={() => treatmentPhotoInputRef.current?.click()}
                    style={{
                      width: '80px',
                      height: '80px',
                      borderRadius: '10px',
                      border: '2px dashed #d4c3b3',
                      backgroundColor: '#faf8f5',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      overflow: 'hidden',
                      position: 'relative'
                    }}
                    title="Click to upload treatment photo"
                  >
                    {treatmentForm.imageUrl ? (
                      <img 
                        src={treatmentForm.imageUrl} 
                        alt="Treatment Preview" 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                      />
                    ) : (
                      <>
                        <Camera size={22} color="#806657" />
                        <span style={{ fontSize: '0.65rem', color: '#8c7b70', marginTop: '4px', fontWeight: '600' }}>Add Photo</span>
                      </>
                    )}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <button
                        type="button"
                        onClick={() => treatmentPhotoInputRef.current?.click()}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '7px 12px',
                          backgroundColor: '#f7f2ed',
                          border: '1px solid #ebdcd0',
                          borderRadius: '6px',
                          fontSize: '0.8rem',
                          fontWeight: '600',
                          color: '#806657',
                          cursor: 'pointer'
                        }}
                      >
                        <Upload size={13} /> {treatmentForm.imageUrl ? 'Change Photo' : 'Upload Image'}
                      </button>

                      {treatmentForm.imageUrl && (
                        <button
                          type="button"
                          onClick={() => setTreatmentForm((prev) => ({ ...prev, imageUrl: '' }))}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '7px 10px',
                            backgroundColor: '#fff',
                            border: '1px solid #fecaca',
                            color: '#dc2626',
                            borderRadius: '6px',
                            fontSize: '0.78rem',
                            cursor: 'pointer'
                          }}
                        >
                          <Trash2 size={12} /> Remove
                        </button>
                      )}
                    </div>
                    <span style={{ display: 'block', fontSize: '0.75rem', color: '#8c7b70', marginTop: '6px' }}>
                      JPEG, PNG, WebP up to 5MB. Displays directly on the public treatments page.
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '6px', color: '#4a3b32' }}>Category *</label>
                <select
                  value={treatmentForm.category}
                  onChange={(e) => setTreatmentForm({ ...treatmentForm, category: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #ebdcd0', outline: 'none', backgroundColor: '#fff' }}
                >
                  <option value="Hair & Scalp Treatments">Hair & Scalp Treatments</option>
                  <option value="Chemical Peels">Chemical Peels</option>
                  <option value="Injectables, Drips & Anti-Aging / Lifting">Injectables, Drips & Anti-Aging / Lifting</option>
                  <option value="Microneedling & MNRF">Microneedling & MNRF</option>
                  <option value="Laser & Lesion / Growth Removal">Laser & Lesion / Growth Removal</option>
                  <option value="Pigmentation, Acne & Skin Brightening">Pigmentation, Acne & Skin Brightening</option>
                  <option value="Semi-Permanent Makeup & HydraFacial">Semi-Permanent Makeup & HydraFacial</option>
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
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '6px', color: '#4a3b32' }}>Price (INR)</label>
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
                  Show in public treatment section on clinic website
                </label>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                  type="submit"
                  disabled={treatmentSaving}
                  className="btn-primary"
                  style={{ flex: 1, padding: '11px', fontWeight: '700' }}
                >
                  {treatmentSaving ? 'Saving...' : 'Save Treatment'}
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
