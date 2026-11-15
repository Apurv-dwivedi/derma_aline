import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock, User, Phone, Mail, FileText, AlertCircle } from 'lucide-react';
import API from '../services/api';
import '../styles/pages.css';

const Booking = () => {
  const [treatments, setTreatments] = useState([]);
  const [formData, setFormData] = useState({
    patientName: localStorage.getItem('fullName') || '',
    email: '',
    phone: '',
    treatmentName: '',
    appointmentDate: '',
    appointmentTime: '10:00',
    notes: '',
    consent: false // Data protection consent requirement
  });

  const [status, setStatus] = useState({ type: '', message: '' });
  const [loading, setLoading] = useState(false);

  const timeSlots = [
    "10:00", "11:00", "12:00", "14:00", "15:00", "16:00", "17:00", "18:00"
  ];

  useEffect(() => {
    // Fetch dynamic treatments from the database
    const fetchTreatments = async () => {
      try {
        const res = await API.get('/treatments');
        setTreatments(res.data);
        if (res.data.length > 0) {
          setFormData(prev => ({ ...prev, treatmentName: res.data[0].name }));
        }
      } catch (err) {
        console.error("Failed to load treatments:", err);
      }
    };
    fetchTreatments();
  }, []);

  const handleInputChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.consent) {
      setStatus({ type: 'error', message: 'You must agree to the privacy policy to book an appointment.' });
      return;
    }

    setLoading(true);
    setStatus({ type: '', message: '' });

    try {
      // Create a payload without the UI-only consent boolean
      const { consent, ...payload } = formData;
      await API.post('/appointments', payload);
      
      setStatus({ type: 'success', message: 'Booking confirmed! We will contact you shortly.' });
      setFormData({ ...formData, appointmentDate: '', appointmentTime: '10:00', notes: '', consent: false });
    } catch (error) {
      if (error.response && error.response.status === 409) {
        setStatus({ type: 'error', message: error.response.data }); // Double booking error
      } else {
        setStatus({ type: 'error', message: 'Failed to book appointment. Please try again later.' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="internal-page">
      <div className="page-header" style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto 40px auto' }}>
        <h1>Book Your Consultation</h1>
        <p style={{ color: 'var(--text-light)', marginTop: '10px' }}>
          Schedule a personalized skin assessment with our expert dermatologists.
        </p>
      </div>

      <div style={{ maxWidth: '700px', margin: '0 auto', backgroundColor: 'var(--bg-white)', padding: '40px', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-soft)', border: '1px solid var(--border-light)' }}>
        
        {status.message && (
          <div style={{ padding: '15px', marginBottom: '25px', borderRadius: '8px', backgroundColor: status.type === 'success' ? '#d4edda' : '#f8d7da', color: status.type === 'success' ? '#155724' : '#721c24', fontWeight: '600', textAlign: 'center' }}>
            {status.message}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '25px' }}>
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><User size={16} /> Full Name</label>
              <input type="text" name="patientName" value={formData.patientName} onChange={handleInputChange} className="form-input" required style={{ width: '100%', padding: '12px' }} />
            </div>
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Phone size={16} /> Phone Number</label>
              <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} className="form-input" required style={{ width: '100%', padding: '12px' }} />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '25px' }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Mail size={16} /> Email Address</label>
            <input type="email" name="email" value={formData.email} onChange={handleInputChange} className="form-input" required style={{ width: '100%', padding: '12px' }} />
          </div>

          <div className="form-group" style={{ marginBottom: '25px' }}>
            <label className="form-label">Select Treatment</label>
            <select name="treatmentName" value={formData.treatmentName} onChange={handleInputChange} className="form-input" required style={{ width: '100%', padding: '12px' }}>
              {treatments.length === 0 ? <option value="">Loading treatments...</option> : null}
              {treatments.map((t) => <option key={t.id} value={t.name}>{t.name}</option>)}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '25px' }}>
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><CalendarIcon size={16} /> Preferred Date</label>
              <input type="date" name="appointmentDate" value={formData.appointmentDate} onChange={handleInputChange} className="form-input" required min={new Date().toISOString().split('T')[0]} style={{ width: '100%', padding: '12px' }} />
            </div>
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Clock size={16} /> Preferred Time</label>
              <select name="appointmentTime" value={formData.appointmentTime} onChange={handleInputChange} className="form-input" style={{ width: '100%', padding: '12px' }}>
                {timeSlots.map((time) => <option key={time} value={time}>{time}</option>)}
              </select>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><FileText size={16} /> Optional Notes</label>
            <textarea name="notes" value={formData.notes} onChange={handleInputChange} className="form-input" rows="3" placeholder="Any specific skin concerns?" style={{ width: '100%', padding: '12px' }}></textarea>
          </div>

          {/* Privacy & Data Consent Checkbox */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '30px', backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
            <input type="checkbox" name="consent" checked={formData.consent} onChange={handleInputChange} id="consent-checkbox" style={{ marginTop: '4px', width: '18px', height: '18px', cursor: 'pointer' }} />
            <label htmlFor="consent-checkbox" style={{ fontSize: '0.9rem', color: 'var(--text-light)', cursor: 'pointer', lineHeight: '1.4' }}>
              I consent to Derma Aline collecting and securely storing my provided medical details and contact information in accordance with the <a href="/privacy" target="_blank" style={{ color: 'var(--color-primary)', fontWeight: '600' }}>Privacy Policy</a>.
            </label>
          </div>

          <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', padding: '16px', fontSize: '1.1rem', fontWeight: '700' }}>
            {loading ? 'Confirming...' : 'Confirm Appointment'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Booking;