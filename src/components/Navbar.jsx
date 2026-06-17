import React, { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useLanguage } from '../contexts/LanguageContext'
import ittcLogo from '../assets/ittc-logo.jpeg'

const translations = {
  en: {
    home: 'Home',
    players: 'Players',
    ptm: 'PTM/Club',
    news: 'News',
    marketplace: 'Marketplace',
    login: 'Login',
    register: 'Register',
    dashboard: 'Dashboard',
    profile: 'Profile',
    admin: 'Admin',
    logout: 'Logout',
  },
  id: {
    home: 'Beranda',
    players: 'Pemain',
    ptm: 'PTM/Klub',
    news: 'Berita',
    marketplace: 'Marketplace',
    login: 'Masuk',
    register: 'Daftar',
    dashboard: 'Dashboard',
    profile: 'Profil',
    admin: 'Admin',
    logout: 'Keluar',
  },
}

export default function Navbar() {
  const { language, toggleLanguage } = useLanguage()
  const { isLoggedIn, isAdmin, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const t = translations[language]

  const toggleMenu = () => setMenuOpen(!menuOpen)

  return (
    <nav className="ttc-navbar">
      <div className="nav-container">
        <div className="nav-brand">
          <Link to="/" className="brand-link">
            <img className="brand-logo" src={ittcLogo} alt="Indonesian Table Tennis Community" />
            <span className="brand-copy">
              <span className="brand-name">Table Tennis</span>
              <span className="brand-sub">Community</span>
            </span>
          </Link>
        </div>

        <div className={`nav-links ${menuOpen ? 'active' : ''}`}>
          <NavLink to="/" onClick={() => setMenuOpen(false)}>{t.home}</NavLink>
          <NavLink to="/players" onClick={() => setMenuOpen(false)}>{t.players}</NavLink>
          <NavLink to="/ptm" onClick={() => setMenuOpen(false)}>{t.ptm}</NavLink>
          <NavLink to="/news" onClick={() => setMenuOpen(false)}>{t.news}</NavLink>
          <NavLink to="/marketplace" onClick={() => setMenuOpen(false)}>{t.marketplace}</NavLink>

          {!isLoggedIn && (
            <>
              <NavLink to="/login" className="nav-login" onClick={() => setMenuOpen(false)}>{t.login}</NavLink>
              <NavLink to="/register" className="nav-register" onClick={() => setMenuOpen(false)}>{t.register}</NavLink>
            </>
          )}

          {isLoggedIn && (
            <>
              <NavLink to="/dashboard" onClick={() => setMenuOpen(false)}>{t.dashboard}</NavLink>
              <NavLink to="/profile" onClick={() => setMenuOpen(false)}>{t.profile}</NavLink>
              {isAdmin && (
                <NavLink to="/admin" onClick={() => setMenuOpen(false)}>{t.admin}</NavLink>
              )}
              <button onClick={() => { logout(); setMenuOpen(false); }} className="logout-btn">{t.logout}</button>
            </>
          )}
        </div>

        <div className="nav-actions">
          <button onClick={toggleLanguage} className="lang-switch">
            {language === 'en' ? 'EN' : 'ID'}
          </button>
          <button className={`hamburger ${menuOpen ? 'open' : ''}`} onClick={toggleMenu} aria-label="Toggle navigation" type="button">
            <span></span><span></span><span></span>
          </button>
        </div>
      </div>
    </nav>
  )
}
