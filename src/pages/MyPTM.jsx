import React from 'react';

function MyPTM({ appState }) {
  const role = appState.profile?.role;

  return (
    <main className="page narrow-page">
      <section className="panel">
        <h1>PTM Saya</h1>
        <p>
          Halaman ini disiapkan untuk fitur edit PTM pada tahap berikutnya. Saat ini akses
          dibuka untuk role ketua_ptm, pengurus_ptm, admin, dan super_admin.
        </p>
        <div className="inline-info">Role Anda: {role || '-'}</div>
      </section>
    </main>
  );
}

export default MyPTM;
