import React from 'react';
import { Navigate } from 'react-router-dom';

function ProtectedRoute({ user, profile, loading, children }) {
  if (loading) {
    return <div className="state-panel">Memuat sesi akun...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default ProtectedRoute;
