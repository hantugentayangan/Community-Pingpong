import React from 'react';
import { isBlockedStatus, normalizeRole } from '../lib/communityData';

function RoleGate({ profile, allowedRoles, children }) {
  const normalizedAllowed = allowedRoles.map(normalizeRole);
  const requiresAdminAccess = normalizedAllowed.some((role) => ['admin', 'superadmin'].includes(role));
  const allowed = Boolean(
    profile
    && normalizedAllowed.includes(normalizeRole(profile.role))
    && (!requiresAdminAccess || !isBlockedStatus(profile.status))
  );

  if (!allowed) {
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
