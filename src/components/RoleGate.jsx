import React from 'react';

function RoleGate({ profile, allowedRoles, children }) {
  if (!profile || !allowedRoles.includes(profile.role)) {
    return (
      <section className="state-panel">
        <h1>Akses ditolak</h1>
        <p>Anda tidak memiliki role yang dibutuhkan untuk membuka halaman ini.</p>
      </section>
    );
  }

  return children;
}

export default RoleGate;
