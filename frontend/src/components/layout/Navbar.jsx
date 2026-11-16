import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  UserCircle, LogOut, Menu, X, 
  Home, Info, Sparkles, Mail, Calendar, Shield, ChevronRight
} from 'lucide-react';
import '../../styles/navbar.css';

const Navbar = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const isLoggedIn = !!localStorage.getItem('token');
    const userRole = (localStorage.getItem('role') || '').toUpperCase();
    const userName = localStorage.getItem('fullName') || '';

    // Close sidebar on route change
    useEffect(() => {
        setIsSidebarOpen(false);
    }, [location.pathname]);

    // Prevent body scrolling when mobile sidebar is open
    useEffect(() => {
        if (isSidebarOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isSidebarOpen]);

    const handleBookingClick = (e) => {
        if (!isLoggedIn) {
            e.preventDefault();
            alert("Please login first to book an appointment!");
            navigate("/auth");
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        localStorage.removeItem('fullName');
        setIsSidebarOpen(false);
        navigate("/auth");
    };

    const toggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
    };

    return (
        <header className="navbar">
            <div className="container nav-container">

                {/* Brand Logo & Title */}
                <Link to="/" className="nav-logo" style={{ display: 'flex', alignItems: 'center', gap: '15px', textDecoration: 'none' }}>
                    <img
                        src="/logo.webp"
                        alt="Derma Aline Logo"
                        style={{
                            width: '54px',
                            height: '54px',
                            objectFit: 'cover',
                            objectPosition: 'top',
                            borderRadius: '50%',
                            border: '2px solid var(--color-primary, #806657)',
                            boxShadow: '0 2px 10px rgba(128, 102, 87, 0.15)',
                            imageRendering: 'crisp-edges',
                            backfaceVisibility: 'hidden',
                            transform: 'translateZ(0)'
                        }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <span style={{
                            fontSize: '1.4rem',
                            fontWeight: '700',
                            letterSpacing: '2.5px',
                            color: 'var(--color-primary, #806657)',
                            lineHeight: '1.1',
                            fontFamily: 'var(--font-heading, serif)',
                            textTransform: 'uppercase'
                        }}>
                            Derma Aline
                        </span>
                        <span style={{
                            fontSize: '0.62rem',
                            fontWeight: '600',
                            letterSpacing: '5px',
                            color: 'var(--color-primary, #806657)',
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

                {/* Desktop Navigation Links (Hidden on Mobile) */}
                <nav className="nav-links desktop-nav">
                    <Link to="/" className="nav-link">Home</Link>
                    <Link to="/about" className="nav-link">About</Link>
                    <Link to="/treatments" className="nav-link">Treatments</Link>
                    <Link to="/contact" className="nav-link">Contact</Link>

                    {/* Role-Specific Shortcuts for Internal Staff */}
                    {isLoggedIn && (userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') && (
                        <Link to="/admin" className="nav-link" style={{ fontWeight: '600', color: '#806657' }}>
                            Admin Center
                        </Link>
                    )}
                    {isLoggedIn && userRole === 'STAFF' && (
                        <Link to="/staff" className="nav-link" style={{ fontWeight: '600', color: '#0369a1' }}>
                            Staff Queue
                        </Link>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginLeft: '10px' }}>
                        {!isLoggedIn ? (
                            <Link to="/auth" style={{ color: 'var(--color-primary, #806657)', display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none', fontWeight: '500' }}>
                                <UserCircle size={20} /> Login
                            </Link>
                        ) : (
                            <button onClick={handleLogout} style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '500', fontSize: '0.95rem' }}>
                                <LogOut size={18} /> Logout
                            </button>
                        )}

                        <Link to="/booking" onClick={handleBookingClick}>
                            <button className="btn-primary">Book Appointment</button>
                        </Link>
                    </div>
                </nav>

                {/* Mobile Hamburger Toggle Button (Hidden on Desktop) */}
                <button 
                    className="mobile-hamburger-btn" 
                    onClick={toggleSidebar} 
                    aria-label="Toggle Navigation Menu"
                    style={{
                        display: 'none', // Controlled by CSS media query
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '8px',
                        color: 'var(--color-primary, #806657)'
                    }}
                >
                    {isSidebarOpen ? <X size={28} /> : <Menu size={28} />}
                </button>
            </div>

            {/* Mobile Sidebar Overlay Backdrop */}
            {isSidebarOpen && (
                <div 
                    className="sidebar-backdrop" 
                    onClick={() => setIsSidebarOpen(false)}
                    aria-hidden="true"
                />
            )}

            {/* Mobile Collapsible Sidebar Drawer (Slides from Right/Left) */}
            <aside className={`mobile-sidebar-drawer ${isSidebarOpen ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <img
                            src="/logo.webp"
                            alt="Logo"
                            style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover' }}
                        />
                        <span style={{ fontFamily: 'var(--font-heading, serif)', fontWeight: '700', color: '#5a4638', fontSize: '1.1rem' }}>
                            Derma Aline
                        </span>
                    </div>
                    <button 
                        className="sidebar-close-btn" 
                        onClick={() => setIsSidebarOpen(false)} 
                        aria-label="Close Sidebar"
                    >
                        <X size={22} color="#5a4638" />
                    </button>
                </div>

                {/* User Session Banner (if logged in) */}
                {isLoggedIn && (
                    <div className="sidebar-user-pill">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <UserCircle size={18} color="#806657" />
                            <span style={{ fontSize: '0.9rem', fontWeight: '600', color: '#333' }}>
                                {userName || 'Client Session'}
                            </span>
                        </div>
                        <span className="sidebar-role-tag">{userRole || 'PATIENT'}</span>
                    </div>
                )}

                {/* Navigation Links with Monochrome Icons */}
                <div className="sidebar-nav-list">
                    <Link to="/" className={`sidebar-nav-item ${location.pathname === '/' ? 'active' : ''}`}>
                        <div className="sidebar-nav-label">
                            <Home size={18} />
                            <span>Home</span>
                        </div>
                        <ChevronRight size={16} className="chevron" />
                    </Link>

                    <Link to="/about" className={`sidebar-nav-item ${location.pathname === '/about' ? 'active' : ''}`}>
                        <div className="sidebar-nav-label">
                            <Info size={18} />
                            <span>About Clinic</span>
                        </div>
                        <ChevronRight size={16} className="chevron" />
                    </Link>

                    <Link to="/treatments" className={`sidebar-nav-item ${location.pathname === '/treatments' ? 'active' : ''}`}>
                        <div className="sidebar-nav-label">
                            <Sparkles size={18} />
                            <span>Aesthetic Treatments</span>
                        </div>
                        <ChevronRight size={16} className="chevron" />
                    </Link>

                    <Link to="/contact" className={`sidebar-nav-item ${location.pathname === '/contact' ? 'active' : ''}`}>
                        <div className="sidebar-nav-label">
                            <Mail size={18} />
                            <span>Contact & Location</span>
                        </div>
                        <ChevronRight size={16} className="chevron" />
                    </Link>

                    {/* Role Workspaces */}
                    {isLoggedIn && (userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') && (
                        <Link to="/admin" className="sidebar-nav-item admin-link">
                            <div className="sidebar-nav-label">
                                <Shield size={18} />
                                <span>Admin Dashboard</span>
                            </div>
                            <ChevronRight size={16} className="chevron" />
                        </Link>
                    )}

                    {isLoggedIn && userRole === 'STAFF' && (
                        <Link to="/staff" className="sidebar-nav-item staff-link">
                            <div className="sidebar-nav-label">
                                <Shield size={18} />
                                <span>Staff Workspace</span>
                            </div>
                            <ChevronRight size={16} className="chevron" />
                        </Link>
                    )}
                </div>

                {/* Sidebar Bottom CTAs */}
                <div className="sidebar-footer">
                    <Link to="/booking" onClick={handleBookingClick} style={{ textDecoration: 'none' }}>
                        <button className="btn-primary sidebar-booking-btn">
                            <Calendar size={18} />
                            <span>Book Appointment</span>
                        </button>
                    </Link>

                    <div className="sidebar-auth-row">
                        {!isLoggedIn ? (
                            <Link to="/auth" className="sidebar-login-link">
                                <UserCircle size={18} />
                                <span>Patient Login / Sign Up</span>
                            </Link>
                        ) : (
                            <button onClick={handleLogout} className="sidebar-logout-btn">
                                <LogOut size={18} />
                                <span>Sign Out</span>
                            </button>
                        )}
                    </div>

                    <div style={{ marginTop: '12px', textAlign: 'center' }}>
                        <Link to="/admin-login" style={{ fontSize: '0.8rem', color: '#a39284', textDecoration: 'none' }}>
                            Salon Team Workspace &rarr;
                        </Link>
                    </div>
                </div>
            </aside>
        </header>
    );
};

export default Navbar;
