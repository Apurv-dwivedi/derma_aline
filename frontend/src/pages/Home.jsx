import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Sparkles, ShieldCheck, Award, MapPin, Phone, 
  ExternalLink, Calendar, Check, ChevronRight, 
  Clock, Droplets, Zap, HeartPulse, UserCheck
} from 'lucide-react';
import '../styles/pages.css';

const Home = () => {
  const navigate = useNavigate();

  return (
    <div className="internal-page">
      {/* Hero Section */}
      <div style={{ 
        textAlign: 'center', 
        padding: '75px 20px', 
        background: 'linear-gradient(135deg, #FAF7F2 0%, #EFE9DF 100%)', 
        borderRadius: 'var(--radius-lg, 12px)', 
        marginBottom: '40px', 
        border: '1px solid var(--border-light, #e2d9cf)', 
        boxShadow: '0 4px 20px rgba(0,0,0,0.03)' 
      }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 14px',
          backgroundColor: '#ffffff',
          borderRadius: '20px',
          border: '1px solid #d9cbbe',
          color: '#5a4638',
          fontSize: '0.82rem',
          fontWeight: '600',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          marginBottom: '20px'
        }}>
          <Sparkles size={14} color="#806657" />
          <span>Advanced Clinical Aesthetics &bull; Rajouri Garden</span>
        </div>

        <h1 style={{ 
          fontSize: 'clamp(2.1rem, 5vw, 3.2rem)', 
          color: 'var(--color-primary, #5a4638)', 
          fontFamily: 'var(--font-heading, serif)', 
          marginBottom: '18px',
          lineHeight: '1.2',
          fontWeight: '700'
        }}>
          Redefining Your Natural Radiance
        </h1>

        <p style={{ 
          fontSize: 'clamp(1rem, 2.5vw, 1.15rem)', 
          color: 'var(--text-light, #666666)', 
          maxWidth: '680px', 
          margin: '0 auto 30px auto',
          lineHeight: '1.7'
        }}>
          Experience bespoke dermatological care, non-invasive skin rejuvenation, and laser aesthetics delivered by certified skin practitioners in a calming luxury sanctuary.
        </p>

        <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button 
            className="btn-primary" 
            onClick={() => navigate('/contact')}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 26px', fontSize: '1rem' }}
          >
            <Mail size={18} />
            <span>Enquire Consultation</span>
          </button>

          <button 
            onClick={() => navigate('/client/login')}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              padding: '12px 24px', 
              fontSize: '1rem',
              backgroundColor: '#ffffff',
              color: '#5a4638',
              border: '1px solid #d9cbbe',
              borderRadius: '8px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            <span>Client Suite</span>
            <ChevronRight size={16} />
          </button>
          
          <button 
            onClick={() => navigate('/treatments')}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              padding: '12px 24px', 
              fontSize: '1rem',
              backgroundColor: 'transparent',
              color: '#5a4638',
              border: '1px solid #d9cbbe',
              borderRadius: '8px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            <span>Explore Menu</span>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Clinical Excellence Pillars */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
        gap: '20px', 
        marginBottom: '60px' 
      }}>
        <div style={{ 
          background: 'var(--bg-white, #ffffff)', 
          padding: '28px 24px', 
          borderRadius: '12px', 
          border: '1px solid #e6ded5', 
          boxShadow: '0 2px 10px rgba(0,0,0,0.02)' 
        }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '10px', backgroundColor: '#f5efe6', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
            <UserCheck size={24} color="#806657" />
          </div>
          <h3 style={{ color: '#3a2d24', marginBottom: '8px', fontSize: '1.2rem', fontWeight: '700' }}>Certified Therapists</h3>
          <p style={{ color: '#7c6a5d', fontSize: '0.92rem', lineHeight: '1.6', margin: 0 }}>
            Board-certified skin practitioners specializing in personalized dermatological and aesthetics protocols.
          </p>
        </div>

        <div style={{ 
          background: 'var(--bg-white, #ffffff)', 
          padding: '28px 24px', 
          borderRadius: '12px', 
          border: '1px solid #e6ded5', 
          boxShadow: '0 2px 10px rgba(0,0,0,0.02)' 
        }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '10px', backgroundColor: '#f5efe6', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
            <ShieldCheck size={24} color="#806657" />
          </div>
          <h3 style={{ color: '#3a2d24', marginBottom: '8px', fontSize: '1.2rem', fontWeight: '700' }}>FDA-Approved Tech</h3>
          <p style={{ color: '#7c6a5d', fontSize: '0.92rem', lineHeight: '1.6', margin: 0 }}>
            Gold-standard aesthetic lasers and medical-grade sterilization for optimal safety and lasting results.
          </p>
        </div>

        <div style={{ 
          background: 'var(--bg-white, #ffffff)', 
          padding: '28px 24px', 
          borderRadius: '12px', 
          border: '1px solid #e6ded5', 
          boxShadow: '0 2px 10px rgba(0,0,0,0.02)' 
        }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '10px', backgroundColor: '#f5efe6', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
            <Award size={24} color="#806657" />
          </div>
          <h3 style={{ color: '#3a2d24', marginBottom: '8px', fontSize: '1.2rem', fontWeight: '700' }}>Bespoke Formulations</h3>
          <p style={{ color: '#7c6a5d', fontSize: '0.92rem', lineHeight: '1.6', margin: 0 }}>
            Custom serums and tailored aesthetic programs formulated precisely for your unique skin phenotype.
          </p>
        </div>

        <div style={{ 
          background: 'var(--bg-white, #ffffff)', 
          padding: '28px 24px', 
          borderRadius: '12px', 
          border: '1px solid #e6ded5', 
          boxShadow: '0 2px 10px rgba(0,0,0,0.02)' 
        }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '10px', backgroundColor: '#f5efe6', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
            <Clock size={24} color="#806657" />
          </div>
          <h3 style={{ color: '#3a2d24', marginBottom: '8px', fontSize: '1.2rem', fontWeight: '700' }}>Zero Downtime Care</h3>
          <p style={{ color: '#7c6a5d', fontSize: '0.92rem', lineHeight: '1.6', margin: 0 }}>
            Gentle lunchtime aesthetic procedures crafted to revitalize your glow with seamless recovery.
          </p>
        </div>
      </div>

      {/* Signature Treatments Spotlight */}
      <div style={{ marginBottom: '60px' }}>
        <div style={{ textAlign: 'center', marginBottom: '35px' }}>
          <h2 style={{ fontSize: '2.2rem', color: 'var(--color-primary, #5a4638)', fontFamily: 'var(--font-heading, serif)', marginBottom: '10px' }}>
            Signature Treatments
          </h2>
          <p style={{ color: '#7c6a5d', fontSize: '1rem', maxWidth: '600px', margin: '0 auto' }}>
            Targeted therapies engineered for deep dermal hydration, brightening, and rejuvenation.
          </p>
        </div>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', 
          gap: '20px' 
        }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e6ded5', padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <Droplets size={20} color="#806657" />
                <h4 style={{ fontSize: '1.15rem', color: '#2c221e', margin: 0, fontWeight: '700' }}>HydraFacial Glow</h4>
              </div>
              <p style={{ fontSize: '0.9rem', color: '#666', lineHeight: '1.6', marginBottom: '16px' }}>
                Multi-step medical facial that extracts impurities, hydrates deeply, and infuses antioxidant peptides.
              </p>
            </div>
            <button 
              onClick={() => navigate('/contact')}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: '8px', backgroundColor: '#fcf9f5', border: '1px solid #ded4c9', color: '#5a4638', fontWeight: '600', fontSize: '0.88rem', cursor: 'pointer' }}
            >
              <span>Enquire Service</span>
              <ChevronRight size={16} />
            </button>
          </div>

          <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e6ded5', padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <Zap size={20} color="#806657" />
                <h4 style={{ fontSize: '1.15rem', color: '#2c221e', margin: 0, fontWeight: '700' }}>Laser Hair Reduction</h4>
              </div>
              <p style={{ fontSize: '0.9rem', color: '#666', lineHeight: '1.6', marginBottom: '16px' }}>
                Triple-wavelength diode technology delivering virtually painless, permanent follicle reduction for all skin types.
              </p>
            </div>
            <button 
              onClick={() => navigate('/contact')}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: '8px', backgroundColor: '#fcf9f5', border: '1px solid #ded4c9', color: '#5a4638', fontWeight: '600', fontSize: '0.88rem', cursor: 'pointer' }}
            >
              <span>Enquire Service</span>
              <ChevronRight size={16} />
            </button>
          </div>

          <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e6ded5', padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <Sparkles size={20} color="#806657" />
                <h4 style={{ fontSize: '1.15rem', color: '#2c221e', margin: 0, fontWeight: '700' }}>Carbon Laser Peel</h4>
              </div>
              <p style={{ fontSize: '0.9rem', color: '#666', lineHeight: '1.6', marginBottom: '16px' }}>
                Hollywood carbon facial delivering immediate pore tightening, oil balance, and radiant porcelain clarity.
              </p>
            </div>
            <button 
              onClick={() => navigate('/contact')}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: '8px', backgroundColor: '#fcf9f5', border: '1px solid #ded4c9', color: '#5a4638', fontWeight: '600', fontSize: '0.88rem', cursor: 'pointer' }}
            >
              <span>Enquire Service</span>
              <ChevronRight size={16} />
            </button>
          </div>

          <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e6ded5', padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <HeartPulse size={20} color="#806657" />
                <h4 style={{ fontSize: '1.15rem', color: '#2c221e', margin: 0, fontWeight: '700' }}>Skin Rejuvenation</h4>
              </div>
              <p style={{ fontSize: '0.9rem', color: '#666', lineHeight: '1.6', marginBottom: '16px' }}>
                Collagen-stimulating micro-needling and gentle chemical peels for pigmentation, acne scars, and fine lines.
              </p>
            </div>
            <button 
              onClick={() => navigate('/contact')}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: '8px', backgroundColor: '#fcf9f5', border: '1px solid #ded4c9', color: '#5a4638', fontWeight: '600', fontSize: '0.88rem', cursor: 'pointer' }}
            >
              <span>Enquire Service</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Visit Our Clinic Section with Real Google Map & Contact Details */}
      <div style={{ marginBottom: '60px' }}>
        <h2 style={{ fontSize: '2.2rem', color: 'var(--color-primary, #5a4638)', fontFamily: 'var(--font-heading, serif)', textAlign: 'center', marginBottom: '30px' }}>
          Visit Our Clinic
        </h2>
        
        <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap' }}>
          
          <div style={{ 
            flex: '1', 
            minWidth: '290px', 
            backgroundColor: 'var(--color-primary, #5a4638)', 
            color: '#ffffff', 
            padding: '35px 28px', 
            borderRadius: '12px', 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'space-between',
            boxShadow: '0 4px 15px rgba(0,0,0,0.06)' 
          }}>
            <div>
              <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', marginBottom: '22px' }}>
                <MapPin size={24} style={{ flexShrink: 0, marginTop: '3px', color: '#d9cbbe' }} />
                <p style={{ fontSize: '0.98rem', lineHeight: '1.7', color: '#f5efe6', margin: 0 }}>
                  <strong style={{ color: '#ffffff', fontSize: '1.05rem' }}>Derma Aline Aesthetics Skin Clinic</strong><br/>
                  First Floor, F-121, near Roshan di Kulfi,<br/>
                  Main Market, Block F, Rajouri Garden,<br/>
                  New Delhi, Delhi, 110027, India
                </p>
              </div>

              <div style={{ display: 'flex', gap: '14px', alignItems: 'center', marginBottom: '20px' }}>
                <Clock size={22} style={{ flexShrink: 0, color: '#d9cbbe' }} />
                <p style={{ fontSize: '0.95rem', color: '#f5efe6', lineHeight: '1.5', margin: 0 }}>
                  <strong>Hours:</strong> Mon &ndash; Sun: 10:00 AM &ndash; 8:00 PM
                </p>
              </div>

              <div style={{ display: 'flex', gap: '14px', alignItems: 'center', marginBottom: '25px' }}>
                <Phone size={22} style={{ flexShrink: 0, color: '#d9cbbe' }} />
                <p style={{ fontSize: '0.95rem', color: '#f5efe6', lineHeight: '1.6', margin: 0 }}>
                  <a href="tel:9319544704" style={{ color: '#ffffff', textDecoration: 'none' }}>+91 93195 44704</a><br/>
                  <a href="tel:8700751880" style={{ color: '#ffffff', textDecoration: 'none' }}>+91 87007 51880</a>
                </p>
              </div>
            </div>
            
            <a 
              href="https://www.google.com/maps/search/?api=1&query=Roshan+di+Kulfi+Block+F+Rajouri+Garden+New+Delhi" 
              target="_blank" 
              rel="noopener noreferrer" 
              style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: '8px', 
                backgroundColor: '#ffffff', 
                color: '#3a2d24', 
                padding: '12px 20px', 
                borderRadius: '8px', 
                fontWeight: '700', 
                fontSize: '0.88rem', 
                textDecoration: 'none', 
                textTransform: 'uppercase', 
                letterSpacing: '0.5px', 
                width: 'fit-content' 
              }}>
              <span>Open in Google Maps</span>
              <ExternalLink size={16} />
            </a>
          </div>

          <div style={{ 
            flex: '1', 
            minWidth: '290px', 
            backgroundColor: '#ffffff', 
            border: '1px solid var(--border-light, #e2d9cf)', 
            borderRadius: '12px', 
            overflow: 'hidden', 
            minHeight: '320px', 
            boxShadow: '0 2px 10px rgba(0,0,0,0.03)' 
          }}>
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
