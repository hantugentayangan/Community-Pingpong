import React from 'react';
import { NavLink, Link } from 'react-router-dom';

function Navbar({ user, profile, onLogout }) {
  const role = profile?.role;
  const canSeeAdmin = role === 'admin' || role === 'super_admin';

  return (
    <header className="site-header">
      <Link className="brand" to="/">
        <span className="brand-mark" aria-hidden="true" />
        <span>
          <strong>Community Pingpong</strong>
          <small>Indonesia Table Tennis</small>
        </span>
      </Link>

      <nav className="nav-links" aria-label="Navigasi utama">
        <NavLink to="/">Home</NavLink>
        <NavLink to="/news">Berita</NavLink>
        <NavLink to="/ptm">PTM</NavLink>
        {user && <NavLink to="/profile">Profil</NavLink>}
        {canSeeAdmin && <NavLink to="/admin">Admin</NavLink>}
        {user ? (
          <button className="nav-button" type="button" onClick={onLogout}>
            Logout
          </button>
        ) : (
          <NavLink className="nav-button" to="/login">
            Login
          </NavLink>
        )}
      </nav>
    </header>
  );
}

export default Navbar;
