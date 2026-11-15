import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children, requireAdmin = false }) => {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  if (!token) {
    return <Navigate to={requireAdmin ? "/admin-login" : "/auth"} replace />;
  }

  if (requireAdmin && role !== 'ADMIN') {
    // If a patient tries to access admin routes, kick them to home
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;