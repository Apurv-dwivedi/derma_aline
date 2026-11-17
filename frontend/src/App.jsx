import React, { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import Navbar from './components/layout/Navbar.jsx';
import Footer from './components/layout/Footer.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

// Core public pages loaded eagerly or quickly
import Home from './pages/Home.jsx';

// Route-level code-splitting: lazy load pages on-demand
const About = lazy(() => import('./pages/About.jsx'));
const Treatments = lazy(() => import('./pages/Treatments.jsx'));
const Contact = lazy(() => import('./pages/Contact.jsx'));
const Privacy = lazy(() => import('./pages/Privacy.jsx'));
const NotFound = lazy(() => import('./pages/NotFound.jsx'));

// Portal 1: Owner / Admin Portal
const Login = lazy(() => import('./pages/Login.jsx'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard.jsx'));

// Portal 2: Staff Portal
const StaffDashboard = lazy(() => import('./pages/StaffDashboard.jsx'));
const StaffActivate = lazy(() => import('./pages/StaffActivate.jsx'));

// Portal 3: Client / Customer Portal
const ClientAuth = lazy(() => import('./pages/ClientAuth.jsx'));
const ClientDashboard = lazy(() => import('./pages/ClientDashboard.jsx'));

// Sleek Error Boundary to prevent blank screens on unexpected client errors
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error, errorInfo) {
    console.error("Application Render Notice:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ textAlign: 'center', padding: '80px 20px', fontFamily: 'system-ui, sans-serif' }}>
          <h2 style={{ color: '#806657', marginBottom: '10px', fontFamily: 'serif' }}>Derma Aline Aesthétics</h2>
          <p style={{ color: '#666', marginBottom: '20px', fontSize: '0.95rem' }}>An update is being synchronized. Please refresh to load the latest clinic experience.</p>
          <button 
            onClick={() => { localStorage.clear(); window.location.reload(); }} 
            style={{ backgroundColor: '#806657', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}
          >
            Refresh Sanctuary
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

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
          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <Routes>
              {/* Public Website */}
              <Route path="/" element={<Home />} />
              <Route path="/about" element={<About />} />
              <Route path="/treatments" element={<Treatments />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/privacy" element={<Privacy />} />

              {/* Portal 3: Client Portal Routes (Self-Registration with Email OTP, Login, Dashboard) */}
              <Route path="/client/login" element={<ClientAuth />} />
              <Route path="/client/register" element={<ClientAuth />} />
              <Route path="/client/verify-email" element={<ClientAuth />} />
              <Route path="/client/forgot-password" element={<ClientAuth />} />
              <Route path="/client/reset-password" element={<ClientAuth />} />
              <Route path="/client/dashboard" element={<ClientDashboard />} />
              <Route path="/profile" element={<Navigate to="/client/dashboard" replace />} />
              <Route path="/auth" element={<Navigate to="/client/login" replace />} />

              {/* Portal 2: Staff Portal Routes */}
              <Route path="/staff/login" element={<Login />} />
              <Route path="/staff-login" element={<Login />} />
              <Route path="/staff/activate" element={<StaffActivate />} />
              <Route path="/staff" element={<ProtectedRoute requireStaff={true}><StaffDashboard /></ProtectedRoute>} />
              <Route path="/staff/dashboard" element={<ProtectedRoute requireStaff={true}><StaffDashboard /></ProtectedRoute>} />

              {/* Portal 1: Owner / Admin Portal Routes */}
              <Route path="/owner/login" element={<Login />} />
              <Route path="/admin-login" element={<Login />} />
              <Route path="/admin" element={<ProtectedRoute requireAdmin={true}><AdminDashboard /></ProtectedRoute>} />
              <Route path="/admin/dashboard" element={<ProtectedRoute requireAdmin={true}><AdminDashboard /></ProtectedRoute>} />

              {/* Catch-all 404 Route */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </main>

        <Footer />
      </div>
    </Router>
  );
}

export default App;
