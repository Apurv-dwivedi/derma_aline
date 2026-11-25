import { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock, User, Phone, Mail, FileText } from 'lucide-react';
import API from '../services/api';
import { TREATMENTS_DATA } from '../data/treatmentsData';
import { getTodayLocalDateString } from '../utils/authSession';
import '../styles/pages.css';

const Booking = () => {
  const [treatments, setTreatments] = useState([]);
  const [formData, setFormData] = useState({
    patientName: localStorage.getItem('fullName') || '',
    email: '',
    phone: '',
    treatmentName: '',
    appointmentDate: '',
    appointmentTime: '10:00 AM',
    notes: '',
    consent: false // Data protection consent requirement
  });

  const [slotAvailability, setSlotAvailability] = useState(null);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [loading, setLoading] = useState(false);

  const timeSlots = [
    "10:00 AM", "11:00 AM", "12:00 PM", "01:30 PM", "03:00 PM", "04:30 PM", "05:30 PM", "06:30 PM"
  ];

  useEffect(() => {
    // Fetch dynamic treatments from the database, falling back to verified clinic menu if none returned
    const fetchTreatments = async () => {
      try {
        const res = await API.get('/treatments/active');
        const dbList = Array.isArray(res.data) ? res.data : [];
        const options = dbList.length > 0
          ? dbList
          : TREATMENTS_DATA.map((t) => ({ id: t.id, name: t.name }));
        setTreatments(options);
        if (options.length > 0) {
          setFormData((prev) => ({ ...prev, treatmentName: prev.treatmentName || options[0].name }));
        }
      } catch (err) {
        console.error("Failed to load treatments:", err);
        const fallback = TREATMENTS_DATA.map((t) => ({ id: t.id, name: t.name }));
        setTreatments(fallback);
        if (fallback.length > 0) {
          setFormData((prev) => ({ ...prev, treatmentName: prev.treatmentName || fallback[0].name }));
        }
      }
    };
    fetchTreatments();
  }, []);

  useEffect(() => {
    if (!formData.appointmentDate) {
      return;
    }
    let cancelled = false;
    API.get('/appointments/availability', {
      params: {
        date: formData.appointmentDate,
        treatmentName: formData.treatmentName || undefined
      }
    })
      .then((res) => {
        if (!cancelled && res.data?.slots) {
          setSlotAvailability(res.data.slots);
        }
      })
      .catch(() => {
        if (!cancelled) setSlotAvailability(null);
      });
    return () => { cancelled = true; };
  }, [formData.appointmentDate, formData.treatmentName]);

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
      const payload = {
        patientName: formData.patientName,
        email: formData.email,
        phone: formData.phone,
        treatmentName: formData.treatmentName,
        appointmentDate: formData.appointmentDate,
        appointmentTime: formData.appointmentTime,
        notes: formData.notes
      };
      const res = await API.post('/appointments', payload);
      
      setStatus({ type: 'success', message: res.data?.message || 'Booking confirmed! We will contact you shortly.' });
      setSlotAvailability(null);
      setFormData({ ...formData, appointmentDate: '', appointmentTime: '10:00 AM', notes: '', consent: false });
    } catch (error) {
      const errMsg = error.response?.data?.message || error.response?.data || 'Failed to book appointment. Please check your details.';
      setStatus({ type: 'error', message: typeof errMsg === 'string' ? errMsg : 'Failed to book appointment. Please try again later.' });
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

      <div style={{ maxWidth: '700px', margin: '0 auto', backgroundColor: 'var(--bg-white)', padding: 'clamp(20px, 4vw, 40px)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-soft)', border: '1px solid var(--border-light)' }}>
        
        {status.message && (
          <div style={{ padding: '15px', marginBottom: '25px', borderRadius: '8px', backgroundColor: status.type === 'success' ? '#d4edda' : '#f8d7da', color: status.type === 'success' ? '#155724' : '#721c24', fontWeight: '600', textAlign: 'center' }}>
            {status.message}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '25px' }}>
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

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '25px' }}>
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><CalendarIcon size={16} /> Preferred Date</label>
              <input type="date" name="appointmentDate" value={formData.appointmentDate} onChange={handleInputChange} className="form-input" required min={getTodayLocalDateString()} style={{ width: '100%', padding: '12px' }} />
            </div>
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Clock size={16} /> Preferred Time</label>
              <select name="appointmentTime" value={formData.appointmentTime} onChange={handleInputChange} className="form-input" style={{ width: '100%', padding: '12px' }}>
                {timeSlots.map((time) => {
                  const isAvailable = slotAvailability ? slotAvailability[time] !== false : true;
                  return (
                    <option key={time} value={time} disabled={!isAvailable}>
                      {time}{!isAvailable ? ' (Unavailable)' : ''}
                    </option>
                  );
                })}
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