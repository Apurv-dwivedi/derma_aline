import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children, requireAdmin = false, requireStaff = false }) => {
  const token = localStorage.getItem('token');
  const role = (localStorage.getItem('role') || '').toUpperCase();

  const isInternal = requireAdmin || requireStaff;

  if (!token) {
    return <Navigate to={isInternal ? "/admin-login" : "/auth"} replace />;
  }

  // Strict Admin route protection
  if (requireAdmin && role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
    // If a staff worker tries to access admin route, redirect them to staff dashboard
    if (role === 'STAFF') {
      return <Navigate to="/staff" replace />;
    }
    // If a patient tries to access admin route, send to home
    return <Navigate to="/" replace />;
  }

  // Staff / Worker route protection (Admin also allowed)
  if (requireStaff && role !== 'STAFF' && role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
