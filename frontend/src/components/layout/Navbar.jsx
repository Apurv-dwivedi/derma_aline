import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  UserCircle, LogOut, Menu, X, 
  Home, Info, Sparkles, Mail, Shield, ChevronRight, User, Calendar
} from 'lucide-react';
import '../../styles/navbar.css';

const Navbar = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const isLoggedIn = !!localStorage.getItem('token');
    const userRole = (localStorage.getItem('role') || '').toUpperCase();
    const userName = localStorage.getItem('fullName') || '';
    const userPhoto = localStorage.getItem('profilePicture') || '';

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

    const handleLogout = () => {
        localStorage.clear();
        setIsSidebarOpen(false);
        navigate("/");
    };

    const toggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
    };

    const isClient = userRole === 'CUSTOMER' || userRole === 'PATIENT';
    const isOwner = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';
    const isStaff = userRole === 'STAFF';
    const isPortalRoute = location.pathname.startsWith('/staff') || 
                          location.pathname.startsWith('/admin') || 
                          location.pathname.startsWith('/client/dashboard');

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
                    {isPortalRoute ? (
                        /* Dedicated Internal Portal Navigation Mode */
                        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
                            {isStaff && (
                                <span style={{
                                    padding: '5px 14px',
                                    borderRadius: '20px',
                                    backgroundColor: '#e0f2fe',
                                    color: '#0369a1',
                                    fontSize: '0.78rem',
                                    fontWeight: '700',
                                    letterSpacing: '0.04em'
                                }}>
                                    STAFF OPERATIONS PORTAL
                                </span>
                            )}
                            {isOwner && (
                                <span style={{
                                    padding: '5px 14px',
                                    borderRadius: '20px',
                                    backgroundColor: '#fef3c7',
                                    color: '#92400e',
                                    fontSize: '0.78rem',
                                    fontWeight: '700',
                                    letterSpacing: '0.04em'
                                }}>
                                    OWNER EXECUTIVE SUITE
                                </span>
                            )}
                            {isClient && (
                                <span style={{
                                    padding: '5px 14px',
                                    borderRadius: '20px',
                                    backgroundColor: '#f0eae1',
                                    color: '#806657',
                                    fontSize: '0.78rem',
                                    fontWeight: '700',
                                    letterSpacing: '0.04em'
                                }}>
                                    CLIENT PRIVATE SUITE
                                </span>
                            )}

                            <Link to="/" className="nav-link" style={{ fontSize: '0.88rem', color: '#6e5d53', textDecoration: 'none', fontWeight: '500' }}>
                                View Website &rarr;
                            </Link>

                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                fontSize: '0.85rem',
                                color: '#2c221e',
                                fontWeight: '600',
                                backgroundColor: '#faf7f2',
                                padding: '6px 14px',
                                borderRadius: '8px',
                                border: '1px solid #ebdcd0'
                            }}>
                                {userPhoto ? (
                                    <img 
                                        src={userPhoto} 
                                        alt={userName || 'Profile'} 
                                        style={{ width: '20px', height: '20px', borderRadius: '50%', objectFit: 'cover' }} 
                                    />
                                ) : (
                                    <UserCircle size={16} color="#806657" />
                                )}
                                <span>{userName || (isStaff ? 'Staff Member' : isOwner ? 'Administrator' : 'Client')}</span>
                            </div>

                            <button 
                                onClick={handleLogout} 
                                style={{ 
                                    color: '#dc2626', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '6px', 
                                    background: '#fef2f2', 
                                    border: '1px solid #fecaca', 
                                    padding: '7px 14px', 
                                    borderRadius: '8px', 
                                    cursor: 'pointer', 
                                    fontWeight: '600', 
                                    fontSize: '0.85rem' 
                                }}
                            >
                                <LogOut size={15} /> Sign Out
                            </button>
                        </div>
                    ) : (
                        /* Public Website Navigation Mode */
                        <>
                            <Link to="/" className="nav-link">Home</Link>
                            <Link to="/about" className="nav-link">About</Link>
                            <Link to="/treatments" className="nav-link">Treatments</Link>
                            <Link to="/contact" className="nav-link">Contact</Link>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginLeft: '10px' }}>
                                {!isLoggedIn ? (
                                    <>
                                        <Link to="/client/login" style={{ color: 'var(--color-primary, #806657)', display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none', fontWeight: '600', fontSize: '0.9rem' }}>
                                            <User size={17} /> Client Portal
                                        </Link>
                                        <Link to="/contact">
                                            <button className="btn-primary" style={{ padding: '9px 18px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <Calendar size={15} /> Book Appointment
                                            </button>
                                        </Link>
                                    </>
                                ) : (
                                    <>
                                        <Link to="/contact" style={{ textDecoration: 'none' }}>
                                            <button style={{ backgroundColor: '#ffffff', color: '#806657', border: '1px solid #806657', padding: '8px 16px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                                                <Calendar size={14} /> Book Appointment
                                            </button>
                                        </Link>
                                        <Link to={isOwner ? "/admin" : isStaff ? "/staff" : "/client/dashboard"}>
                                            <button className="btn-primary" style={{ padding: '9px 18px', fontSize: '0.85rem' }}>
                                                {isOwner ? "Executive Suite" : isStaff ? "Staff Workspace" : "My Dashboard"}
                                            </button>
                                        </Link>
                                        <button onClick={handleLogout} style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '600', fontSize: '0.9rem' }}>
                                            <LogOut size={16} /> Sign Out
                                        </button>
                                    </>
                                )}
                            </div>
                        </>
                    )}
                </nav>

                {/* Mobile Hamburger Toggle Button (Hidden on Desktop) */}
                <button 
                    className="mobile-hamburger-btn" 
                    onClick={toggleSidebar} 
                    aria-label="Toggle Navigation Menu"
                    style={{
                        display: 'none',
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

            {/* Mobile Collapsible Sidebar Drawer */}
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
                            {userPhoto ? (
                                <img 
                                    src={userPhoto} 
                                    alt={userName || 'Profile'} 
                                    style={{ width: '22px', height: '22px', borderRadius: '50%', objectFit: 'cover' }} 
                                />
                            ) : (
                                <UserCircle size={18} color="#806657" />
                            )}
                            <span style={{ fontSize: '0.9rem', fontWeight: '600', color: '#333' }}>
                                {userName || 'Active Session'}
                            </span>
                        </div>
                        <span className="sidebar-role-tag">{userRole || 'CLIENT'}</span>
                    </div>
                )}

                {/* Navigation Links */}
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
                            <span>Contact & Enquiries</span>
                        </div>
                        <ChevronRight size={16} className="chevron" />
                    </Link>

                    {/* Portals */}
                    {isLoggedIn && isOwner && (
                        <Link to="/admin" className="sidebar-nav-item admin-link">
                            <div className="sidebar-nav-label">
                                <Shield size={18} />
                                <span>Owner Executive Suite</span>
                            </div>
                            <ChevronRight size={16} className="chevron" />
                        </Link>
                    )}

                    {isLoggedIn && isStaff && (
                        <Link to="/staff" className="sidebar-nav-item staff-link">
                            <div className="sidebar-nav-label">
                                <Shield size={18} />
                                <span>Staff Workspace</span>
                            </div>
                            <ChevronRight size={16} className="chevron" />
                        </Link>
                    )}

                    {isLoggedIn && isClient && (
                        <Link to="/client/dashboard" className="sidebar-nav-item client-link">
                            <div className="sidebar-nav-label">
                                <User size={18} />
                                <span>My Client Suite</span>
                            </div>
                            <ChevronRight size={16} className="chevron" />
                        </Link>
                    )}
                </div>

                {/* Sidebar Bottom CTAs */}
                <div className="sidebar-footer">
                    <Link to="/contact" style={{ textDecoration: 'none' }} onClick={() => setIsSidebarOpen(false)}>
                        <button className="btn-primary sidebar-booking-btn" style={{ width: '100%', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                            <Calendar size={18} />
                            <span>Book Appointment</span>
                        </button>
                    </Link>

                    {!isLoggedIn ? (
                        <>
                            <Link to="/client/login" style={{ textDecoration: 'none' }} onClick={() => setIsSidebarOpen(false)}>
                                <button style={{ width: '100%', padding: '10px', backgroundColor: '#ffffff', border: '1px solid #806657', color: '#806657', borderRadius: '8px', fontWeight: '600', fontSize: '0.9rem', marginBottom: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                    <User size={16} />
                                    <span>Client Portal Sign In</span>
                                </button>
                            </Link>
                            <Link to="/client/register" onClick={() => setIsSidebarOpen(false)} style={{ display: 'block', textAlign: 'center', fontSize: '0.85rem', color: '#806657', textDecoration: 'none', fontWeight: '600', padding: '6px 0' }}>
                                New Client? Create Account &rarr;
                            </Link>
                        </>
                    ) : (
                        <button onClick={handleLogout} className="sidebar-logout-btn" style={{ width: '100%' }}>
                            <LogOut size={18} />
                            <span>Sign Out</span>
                        </button>
                    )}

                    <div style={{ marginTop: '16px', textAlign: 'center', borderTop: '1px solid #ebdcd0', paddingTop: '12px' }}>
                        <Link to="/owner/login" style={{ fontSize: '0.78rem', color: '#a39284', textDecoration: 'none' }}>
                            Clinic Administration Login &rarr;
                        </Link>
                    </div>
                </div>
            </aside>
        </header>
    );
};

export default Navbar;
