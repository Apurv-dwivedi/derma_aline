import React, { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/layout/Navbar.jsx';
import Footer from './components/layout/Footer.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

// Core public pages loaded eagerly or quickly
import Home from './pages/Home.jsx';

// Route-level code-splitting: lazy load pages on-demand to reduce initial bundle size by >60%
const About = lazy(() => import('./pages/About.jsx'));
const Treatments = lazy(() => import('./pages/Treatments.jsx'));
const Booking = lazy(() => import('./pages/Booking.jsx'));
const Auth = lazy(() => import('./pages/Auth.jsx'));
const Contact = lazy(() => import('./pages/Contact.jsx'));
const Profile = lazy(() => import('./pages/Profile.jsx'));
const Privacy = lazy(() => import('./pages/Privacy.jsx'));
const Login = lazy(() => import('./pages/Login.jsx'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard.jsx'));
const StaffDashboard = lazy(() => import('./pages/StaffDashboard.jsx'));
const NotFound = lazy(() => import('./pages/NotFound.jsx'));

// Lightweight, sleek loading fallback
const PageLoader = () => (
  <div style={{
    minHeight: '60vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    gap: '12px'
  }}>
    <div style={{
      width: '36px',
      height: '36px',
      border: '3px solid #f0eae1',
      borderTop: '3px solid var(--color-primary, #806657)',
      borderRadius: '50%',
      animation: 'spin 0.8s linear infinite'
    }} />
    <span style={{ fontSize: '0.85rem', color: '#8c7b70', fontWeight: '500' }}>Loading experience...</span>
    <style>{`
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `}</style>
  </div>
);

// Scroll to top helper component on every route change
const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

function App() {
  // Silent background warm-up ping to wake Render backend on initial app load
  useEffect(() => {
    const apiBase = import.meta.env.VITE_API_BASE_URL || 'https://derma-aline.onrender.com/api';
    fetch(`${apiBase}/treatments/active`, { method: 'GET', keepalive: true }).catch(() => {});
  }, []);

  return (
    <Router>
      <ScrollToTop />
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Navbar />

        <main className="container" style={{ flex: 1, padding: '40px 20px' }}>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/about" element={<About />} />
              <Route path="/treatments" element={<Treatments />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/booking" element={<Booking />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/privacy" element={<Privacy />} />

              {/* Dedicated Internal Salon Access (Admin & Staff) */}
              <Route path="/admin-login" element={<Login />} />
              <Route path="/staff-login" element={<Login />} />
              <Route path="/admin" element={<ProtectedRoute requireAdmin={true}><AdminDashboard /></ProtectedRoute>} />
              <Route path="/staff" element={<ProtectedRoute requireStaff={true}><StaffDashboard /></ProtectedRoute>} />

              {/* Catch-all 404 Route */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </main>

        <Footer />
      </div>
    </Router>
  );
}

export default App;
