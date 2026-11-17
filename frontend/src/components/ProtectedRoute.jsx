import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children, requireAdmin = false, requireStaff = false, requireCustomer = false }) => {
  const token = localStorage.getItem('token');
  const role = (localStorage.getItem('role') || '').toUpperCase();

  if (!token) {
    if (requireAdmin) return <Navigate to="/owner/login" replace />;
    if (requireStaff) return <Navigate to="/staff/login" replace />;
    return <Navigate to="/client/login" replace />;
  }

  // Strict Admin route protection
  if (requireAdmin && role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
    if (role === 'STAFF') {
      return <Navigate to="/staff" replace />;
    }
    return <Navigate to="/" replace />;
  }

  // Staff route protection (Admin also allowed)
  if (requireStaff && role !== 'STAFF' && role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
    return <Navigate to="/" replace />;
  }

  // Customer route protection (Admin/SuperAdmin also allowed for assistance)
  if (requireCustomer && role !== 'CUSTOMER' && role !== 'PATIENT' && role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
    return <Navigate to="/client/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
