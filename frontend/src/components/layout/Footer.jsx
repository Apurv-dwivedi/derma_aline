import { Link } from 'react-router-dom';
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
            <p>Premium skincare and aesthetic treatments designed for your natural beauty and comfort.</p>
          </div>
          
          <div className="footer-links">
            <h4>Quick Links</h4>
            <ul>
              <li><Link to="/about">Our Story</Link></li>
              <li><Link to="/treatments">Treatments</Link></li>
              <li><Link to="/booking">Book Appointment</Link></li>
              <li><Link to="/contact">Contact Us</Link></li>
            </ul>
          </div>
          
          <div className="footer-contact">
            <h4>Clinic Location & Contacts</h4>
            <p style={{ marginBottom: '10px' }}>First Floor, F-121, near Roshan di Kulfi, Main Market, Block F, Rajouri Garden, New Delhi, 110027</p>
            <p style={{ marginBottom: '15px', color: '#ffffff' }}>
              📞 <a href="tel:9319544704" style={{ color: '#ffffff', textDecoration: 'none' }}>+91 93195 44704</a>, <a href="tel:8700751880" style={{ color: '#ffffff', textDecoration: 'none' }}>87007 51880</a>
            </p>
            
            <Link to="/admin-login" style={{ display: 'inline-block', backgroundColor: 'var(--color-accent)', color: '#2C221E', padding: '8px 16px', borderRadius: '8px', fontWeight: '700', fontSize: '0.85rem', textDecoration: 'none', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Admin Portal Login
            </Link>
          </div>
        </div>
        
        <div className="footer-bottom" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
          <p>&copy; {new Date().getFullYear()} Derma Aline Aesthetics Skin Clinic. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;