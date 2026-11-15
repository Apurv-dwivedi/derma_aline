import React, { useState } from 'react';
import { MapPin, Phone, Mail, Clock, Send, MessageSquare } from 'lucide-react';
import API from '../services/api';
import '../styles/pages.css';

const Contact = () => {
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', message: '' });
  const [status, setStatus] = useState({ type: '', message: '' });
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Basic Rate Limiting / Validation to prevent spam clicks
    if (loading) return;
    if (formData.message.trim().length < 10) {
      setStatus({ type: 'error', message: 'Message must be at least 10 characters long.' });
      return;
    }

    setLoading(true);
    setStatus({ type: '', message: '' });

    try {
      await API.post('/contact', formData);
      setStatus({ type: 'success', message: 'Thank you! Your message has been sent securely. We will respond soon.' });
      setFormData({ name: '', email: '', phone: '', message: '' });
    } catch (error) {
      console.error("Contact submission failed:", error);
      setStatus({ type: 'error', message: 'Failed to send message. Please check your connection or try calling us directly.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="internal-page">
      <div className="page-header" style={{ textAlign: 'center', maxWidth: '700px', margin: '0 auto 50px auto' }}>
        <h1>Get in Touch</h1>
        <p style={{ color: 'var(--text-light)', marginTop: '15px', fontSize: '1.1rem' }}>
          Have questions about our treatments or want to schedule a specific consultation? Reach out to our experts in Rajouri Garden.
        </p>
      </div>

      <div style={{ display: 'flex', gap: '40px', flexWrap: 'wrap' }}>
        {/* Contact Form */}
        <div style={{ flex: '1', minWidth: '300px', backgroundColor: 'var(--bg-white)', padding: '40px', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-soft)', border: '1px solid var(--border-light)' }}>
          <h2 style={{ fontSize: '1.4rem', color: 'var(--color-primary)', marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <MessageSquare size={24} color="var(--color-accent)" /> Send us a Message
          </h2>

          {status.message && (
            <div style={{ padding: '15px', marginBottom: '25px', borderRadius: '8px', backgroundColor: status.type === 'success' ? '#d4edda' : '#f8d7da', color: status.type === 'success' ? '#155724' : '#721c24', fontWeight: '600' }}>
              {status.message}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label className="form-label" style={{ fontWeight: '600', marginBottom: '8px', display: 'block' }}>Full Name</label>
              <input type="text" name="name" value={formData.name} onChange={handleInputChange} className="form-input" required placeholder="John Doe" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-light)' }} />
            </div>

            <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', flexWrap: 'wrap' }}>
              <div className="form-group" style={{ flex: '1', minWidth: '150px' }}>
                <label className="form-label" style={{ fontWeight: '600', marginBottom: '8px', display: 'block' }}>Email Address</label>
                <input type="email" name="email" value={formData.email} onChange={handleInputChange} className="form-input" required placeholder="you@example.com" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-light)' }} />
              </div>
              <div className="form-group" style={{ flex: '1', minWidth: '150px' }}>
                <label className="form-label" style={{ fontWeight: '600', marginBottom: '8px', display: 'block' }}>Phone Number</label>
                <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} className="form-input" required placeholder="9876543210" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-light)' }} />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '25px' }}>
              <label className="form-label" style={{ fontWeight: '600', marginBottom: '8px', display: 'block' }}>Your Query</label>
              <textarea name="message" value={formData.message} onChange={handleInputChange} className="form-input" required rows="5" placeholder="How can we help you today?" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-light)' }}></textarea>
            </div>

            <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', padding: '14px', fontSize: '1rem', fontWeight: '700', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
              {loading ? 'Sending securely...' : <><Send size={18} /> Send Message</>}
            </button>
          </form>
        </div>

        {/* Contact Information */}
        <div style={{ flex: '1', minWidth: '300px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ backgroundColor: 'var(--color-primary)', color: '#fff', padding: '40px', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-soft)' }}>
            <h3 style={{ fontSize: '1.4rem', marginBottom: '25px', fontFamily: 'var(--font-heading)' }}>Clinic Information</h3>
            
            <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
              <MapPin size={24} color="var(--color-accent)" style={{ flexShrink: 0 }} />
              <div>
                <h4 style={{ fontSize: '1.1rem', marginBottom: '5px' }}>Our Location</h4>
                <p style={{ color: '#ccc', lineHeight: '1.5' }}>Rajouri Garden<br/>New Delhi, 110027<br/>India</p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
              <Phone size={24} color="var(--color-accent)" style={{ flexShrink: 0 }} />
              <div>
                <h4 style={{ fontSize: '1.1rem', marginBottom: '5px' }}>Contact Details</h4>
                <p style={{ color: '#ccc', marginBottom: '4px' }}>+91 98765 43210</p>
                <p style={{ color: '#ccc' }}>+91 11 2345 6789</p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
              <Mail size={24} color="var(--color-accent)" style={{ flexShrink: 0 }} />
              <div>
                <h4 style={{ fontSize: '1.1rem', marginBottom: '5px' }}>Email Support</h4>
                <p style={{ color: '#ccc' }}>hello@dermaaline.com</p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '15px' }}>
              <Clock size={24} color="var(--color-accent)" style={{ flexShrink: 0 }} />
              <div>
                <h4 style={{ fontSize: '1.1rem', marginBottom: '5px' }}>Operating Hours</h4>
                <p style={{ color: '#ccc', marginBottom: '4px' }}>Mon - Sat: 10:00 AM - 7:00 PM</p>
                <p style={{ color: '#ccc' }}>Sunday: Closed</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;