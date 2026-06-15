import { Navigate } from 'react-router-dom';

function ProtectedRoute({ user, profile, loading, children }) {
  if (loading) {
    return <div className="state-panel">Memuat sesi akun...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!profile || profile.status !== 'approved') {
    return (
      <main className="page narrow-page">
        <section className="state-panel">
          <h1>Akun menunggu approval</h1>
          <p>Akun Anda masih menunggu approval admin.</p>
        </section>
      </main>
    );
  }

  return children;
}

export default ProtectedRoute;
