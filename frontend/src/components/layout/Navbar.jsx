import { Link } from 'react-router-dom';
import { UserCircle } from 'lucide-react';
import '../../styles/navbar.css';

const Navbar = () => {
  return (
    <header className="navbar">
      <div className="container nav-container">
        
        <Link to="/" className="nav-logo" style={{ display: 'flex', alignItems: 'center', gap: '15px', textDecoration: 'none' }}>
          <img 
            src="/logo.webp"
            alt="Derma Aline Logo" 
            style={{ 
              width: '58px', 
              height: '58px', 
              objectFit: 'cover',
              objectPosition: 'top', 
              borderRadius: '50%',
              border: '2px solid var(--color-primary)',
              boxShadow: '0 2px 12px rgba(128, 102, 87, 0.15)',
              imageRendering: 'crisp-edges',
              backfaceVisibility: 'hidden',
              transform: 'translateZ(0)'
            }} 
          />
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <span style={{ 
              fontSize: '1.45rem', 
              fontWeight: '700', 
              letterSpacing: '2.5px', 
              color: 'var(--color-primary)', 
              lineHeight: '1.1',
              fontFamily: 'var(--font-heading)',
              textTransform: 'uppercase'
            }}>
              Derma Aline
            </span>
            <span style={{ 
              fontSize: '0.65rem', 
              fontWeight: '600', 
              letterSpacing: '5.5px', 
              color: 'var(--color-primary)', 
              opacity: '0.85',
              lineHeight: '1',
              textTransform: 'uppercase',
              paddingLeft: '2px',
              marginTop: '2px'
            }}>
              Aesthétics
            </span>
          </div>
        </Link>
        
        <nav className="nav-links">
          <Link to="/" className="nav-link">Home</Link>
          <Link to="/about" className="nav-link">About</Link>
          <Link to="/treatments" className="nav-link">Treatments</Link>
          <Link to="/contact" className="nav-link">Contact</Link>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <Link to="/auth" style={{ color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '5px', textDecoration: 'none', fontWeight: '500' }}>
              <UserCircle size={22} /> Login
            </Link>
            <Link to="/booking">
              <button className="btn-primary">Book Appointment</button>
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
};

export default Navbar;