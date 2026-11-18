import { Link } from 'react-router-dom';
import { Phone, Shield, User, Lock } from 'lucide-react';
import '../../styles/footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-container">
          
          <div className="footer-brand">
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
              <img 
                src="/logo.webp" 
                alt="Derma Aline Logo" 
                style={{ 
                  width: '72px', 
                  height: '72px', 
                  objectFit: 'cover',
                  objectPosition: 'top', 
                  borderRadius: '50%', 
                  border: '2px solid var(--color-secondary)',
                  imageRendering: 'crisp-edges',
                  backfaceVisibility: 'hidden',
                  transform: 'translateZ(0)'
                }} 
              />
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <span style={{ fontSize: '1.75rem', fontWeight: '700', letterSpacing: '2.5px', color: 'var(--color-secondary)', lineHeight: '1.1', fontFamily: 'var(--font-heading)' }}>
                  DERMA ALINE
                </span>
                <span style={{ fontSize: '0.75rem', fontWeight: '500', letterSpacing: '5.5px', color: 'var(--color-secondary)', opacity: 0.8, lineHeight: '1', paddingLeft: '2px', marginTop: '2px' }}>
                  AESTHÉTICS
                </span>
              </div>
            </div>
            <p>Premium skincare and dermatological aesthetic treatments designed for your natural elegance, comfort, and safety.</p>
          </div>
          
          <div className="footer-links">
            <h4>Clinic Portals</h4>
            <ul>
              <li><Link to="/client/login"><User size={13} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> Client Portal</Link></li>
              <li><Link to="/client/register">Client Registration</Link></li>
              <li><Link to="/staff/login"><Shield size={13} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> Staff Workspace</Link></li>
              <li><Link to="/owner/login"><Lock size={13} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> Owner Administration</Link></li>
              <li><Link to="/privacy">Privacy Policy</Link></li>
            </ul>
          </div>
          
          <div className="footer-contact">
            <h4>Clinic Location & Inquiries</h4>
            <p style={{ marginBottom: '10px' }}>First Floor, F-121, near Roshan di Kulfi, Main Market, Block F, Rajouri Garden, New Delhi, 110027</p>
            <p style={{ marginBottom: '15px', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <Phone size={15} color="var(--color-accent, #c5a880)" />
              <a href="tel:8700751880" style={{ color: '#ffffff', textDecoration: 'none' }}>+91 87007 51880</a>, 
              <a href="tel:9319544704" style={{ color: '#ffffff', textDecoration: 'none' }}>+91 93195 44704</a>
            </p>
            
            <Link to="/contact" style={{ display: 'inline-block', backgroundColor: 'var(--color-accent, #c5a880)', color: '#2C221E', padding: '8px 16px', borderRadius: '8px', fontWeight: '700', fontSize: '0.82rem', textDecoration: 'none', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Consultation Enquiries
            </Link>
          </div>
        </div>
        
        <div className="footer-bottom" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <p style={{ margin: 0 }}>&copy; {new Date().getFullYear()} Derma Aline Aesthétics Skin Clinic. All rights reserved.</p>
          <div style={{ display: 'flex', gap: '16px', fontSize: '0.85rem' }}>
            <Link to="/privacy" style={{ color: 'var(--color-secondary)', opacity: 0.8, textDecoration: 'none' }}>Privacy Terms</Link>
            <Link to="/contact" style={{ color: 'var(--color-secondary)', opacity: 0.8, textDecoration: 'none' }}>Clinical Location</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
