import React from 'react';

function MyProfile({ appState }) {
  const { user, profile, profileError } = appState;

  return (
    <main className="page narrow-page">
      <section className="panel">
        <h1>Profil Saya</h1>
        {profileError && <div className="inline-error">{profileError}</div>}
        <div className="detail-list">
          <div>
            <span>Email</span>
            <strong>{user?.email || '-'}</strong>
          </div>
          <div>
            <span>Nama</span>
            <strong>{profile?.full_name || profile?.name || '-'}</strong>
          </div>
          <div>
            <span>Role</span>
            <strong>{profile?.role || '-'}</strong>
          </div>
          <div>
            <span>Status</span>
            <strong>{profile?.status || '-'}</strong>
          </div>
        </div>
      </section>
    </main>
  );
}

export default MyProfile;
