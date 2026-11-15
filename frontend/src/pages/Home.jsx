import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Shield, Award, MapPin, Phone, ExternalLink } from 'lucide-react';
import '../styles/pages.css';

const Home = () => {
  const navigate = useNavigate();

  return (
    <div className="internal-page">
      {/* Hero Section */}
      <div style={{ textAlign: 'center', padding: '80px 20px', background: 'linear-gradient(135deg, #F9F6F0 0%, #EFE9DF 100%)', borderRadius: 'var(--radius-lg)', marginBottom: '40px', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-soft)' }}>
        <Sparkles size={40} color="var(--color-accent)" style={{ marginBottom: '15px' }} />
        <h1 style={{ fontSize: '3rem', color: 'var(--color-primary)', fontFamily: 'var(--font-heading)', marginBottom: '20px' }}>
          Redefining Your Natural Radiance
        </h1>
        <p style={{ fontSize: '1.2rem', color: 'var(--text-light)', maxWidth: '700px', margin: '0 auto 30px auto' }}>
          Experience advanced dermatological care and bespoke aesthetic treatments at Derma Aline Aesthetics, Rajouri Garden, New Delhi.
        </p>
        <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button 
            className="btn-primary" 
            onClick={() => navigate('/booking')}
          >
            Book Appointment
          </button>
          
          <button 
            className="btn-primary" 
            onClick={() => navigate('/treatments')}
          >
            Explore Treatments
          </button>
        </div>
      </div>

      {/* Why Choose Us */}
      <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap', marginBottom: '60px' }}>
        <div style={{ flex: 1, minWidth: '280px', background: 'var(--bg-white)', padding: '30px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-soft)' }}>
          <Shield size={32} color="var(--color-accent)" style={{ marginBottom: '15px' }} />
          <h3 style={{ color: 'var(--color-primary)', marginBottom: '10px', fontSize: '1.3rem' }}>Expert Dermatologists</h3>
          <p style={{ color: 'var(--text-light)', fontSize: '0.95rem' }}>Trained professionals dedicated to safe, personalized skin and hair care solutions.</p>
        </div>
        <div style={{ flex: 1, minWidth: '280px', background: 'var(--bg-white)', padding: '30px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-soft)' }}>
          <Sparkles size={32} color="var(--color-accent)" style={{ marginBottom: '15px' }} />
          <h3 style={{ color: 'var(--color-primary)', marginBottom: '10px', fontSize: '1.3rem' }}>Advanced Technology</h3>
          <p style={{ color: 'var(--text-light)', fontSize: '0.95rem' }}>State-of-the-art FDA-approved equipment for flawless, lasting results.</p>
        </div>
        <div style={{ flex: 1, minWidth: '280px', background: 'var(--bg-white)', padding: '30px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-soft)' }}>
          <Award size={32} color="var(--color-accent)" style={{ marginBottom: '15px' }} />
          <h3 style={{ color: 'var(--color-primary)', marginBottom: '10px', fontSize: '1.3rem' }}>Luxury Experience</h3>
          <p style={{ color: 'var(--text-light)', fontSize: '0.95rem' }}>Calming, premium clinic environment designed for your comfort and relaxation.</p>
        </div>
      </div>

      {/* Visit Our Clinic Section with Real Google Map & Contact Nos */}
      <div style={{ marginBottom: '60px' }}>
        <h2 style={{ fontSize: '2.2rem', color: 'var(--color-primary)', fontFamily: 'var(--font-heading)', textAlign: 'center', marginBottom: '30px' }}>
          Visit Our Clinic
        </h2>
        <div style={{ display: 'flex', gap: '40px', flexWrap: 'wrap' }}>
          
          <div style={{ flex: '1', minWidth: '300px', backgroundColor: 'var(--color-primary)', color: 'var(--bg-cream)', padding: '40px', borderRadius: 'var(--radius-lg)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-start', marginBottom: '20px' }}>
              <MapPin size={28} style={{ flexShrink: 0, marginTop: '5px', color: 'var(--color-accent)' }} />
              <p style={{ fontSize: '1.05rem', lineHeight: '1.7', color: '#E6E0D5' }}>
                <strong>Derma Aline Aesthetics Skin Clinic</strong><br/>
                First Floor, F-121, near Roshan di Kulfi,<br/>
                Main Market, Block F, Rajouri Garden,<br/>
                New Delhi, Delhi, 110027, India
              </p>
            </div>

            <div style={{ display: 'flex', gap: '15px', alignItems: 'center', marginBottom: '25px' }}>
              <Phone size={24} style={{ flexShrink: 0, color: 'var(--color-accent)' }} />
              <p style={{ fontSize: '1rem', color: '#E6E0D5', lineHeight: '1.5' }}>
                <a href="tel:9319544704" style={{ color: '#ffffff', textDecoration: 'none' }}>+91 93195 44704</a><br/>
                <a href="tel:8700751880" style={{ color: '#ffffff', textDecoration: 'none' }}>+91 87007 51880</a>
              </p>
            </div>
            
            <a 
              href="https://www.google.com/maps/search/?api=1&query=Roshan+di+Kulfi+Block+F+Rajouri+Garden+New+Delhi" 
              target="_blank" 
              rel="noopener noreferrer" 
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', backgroundColor: 'var(--color-accent)', color: '#2C221E', padding: '12px 20px', borderRadius: '8px', fontWeight: '700', fontSize: '0.9rem', textDecoration: 'none', textTransform: 'uppercase', letterSpacing: '0.5px', width: 'fit-content' }}>
              Open in Google Maps <ExternalLink size={16} />
            </a>
          </div>

          <div style={{ flex: '1', minWidth: '300px', backgroundColor: 'var(--bg-white)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', minHeight: '320px', boxShadow: 'var(--shadow-soft)' }}>
            <iframe 
              title="Derma Aline Exact Location Map Home"
              src="https://maps.google.com/maps?q=Roshan%20di%20Kulfi,%20Block%20F,%20Rajouri%20Garden,%20New%20Delhi&t=&z=17&ie=UTF8&iwloc=&output=embed" 
              width="100%" 
              height="100%" 
              style={{ border: 0, minHeight: '320px' }} 
              allowFullScreen="" 
              loading="lazy" 
              referrerPolicy="no-referrer-when-downgrade">
            </iframe>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Home;