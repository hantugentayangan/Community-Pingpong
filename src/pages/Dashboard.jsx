import React, { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { getMyPlayer, normalizeDivision } from '../lib/communityData'

const menuItems = [
  { label: 'Dashboard', to: '/dashboard' },
  { label: 'My Profile', to: '/profile' },
  { label: 'My PTM/Club', to: '/my-ptm' },
]

export default function Dashboard() {
  const { user, profile, loading, logout, isAdmin } = useAuth()
  const [player, setPlayer] = useState(null)
  const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Member'
  const displayDivision = player?.division || normalizeDivision(profile?.division || user?.user_metadata?.division || '') || '-'

  useEffect(() => {
    if (!user?.id) return
    getMyPlayer(user.id).then(setPlayer)
  }, [user?.id])

  if (loading) return <div className="ttc-page"><div className="ttc-state">Memuat dashboard...</div></div>
  if (!user) return <Navigate to="/login" replace />

  return (
    <div className="ttc-dashboard-shell">
      <aside className="ttc-dashboard-sidebar">
        <Link to="/" className="dashboard-brand">
          <span className="brand-emblem" aria-hidden="true"></span>
          <span>Table Tennis<br />Community</span>
        </Link>
        <nav>
          {menuItems.map((item, index) => (
            <Link key={item.label} className={index === 0 ? 'active' : ''} to={item.to}>
              <span>{index + 1}</span>{item.label}
            </Link>
          ))}
          {isAdmin && (
            <Link to="/admin">
              <span>{menuItems.length + 1}</span>Admin Console
            </Link>
          )}
          <button type="button" onClick={logout}>
            <span>{isAdmin ? menuItems.length + 2 : menuItems.length + 1}</span>Logout
          </button>
        </nav>
      </aside>

      <main className="ttc-dashboard-main">
        <section className="dashboard-welcome">
          <div>
            <h1>Dashboard</h1>
            <p>Welcome back, {displayName}. Manage your table tennis community profile here.</p>
          </div>
          <span className="dashboard-role">{profile?.role || 'member'}</span>
        </section>

        <section className="dashboard-stats-grid">
          <StatCard label="Profile Status" value={player?.profile_status || 'active'} />
          <StatCard label="Player Verification" value={player?.status || 'pending'} />
          <StatCard label="My PTM/Club" value={player?.ptm_name || '-'} />
          <StatCard label="Division" value={displayDivision} />
        </section>

        <section className="dashboard-content-grid">
          <article className="dashboard-panel">
            <h2>Recent Activities</h2>
            <div className="activity-list">
              <ActivityItem title="Profile ready for completion" meta="Update your player details" />
              <ActivityItem title="Explore PTM/Club directory" meta="Find clubs near you" />
              <ActivityItem title="Marketplace available" meta="Browse table tennis products" />
            </div>
          </article>
          <article className="dashboard-panel compact-panel">
            <h2>Quick Actions</h2>
            <Link to="/profile" className="ttc-row-action">Update Profile</Link>
            <Link to="/ptm" className="ttc-row-action">Explore PTM/Club</Link>
            <Link to="/marketplace" className="ttc-row-action">Open Marketplace</Link>
            <Link to="/my-ptm" className="ttc-row-action">My PTM/Club</Link>
            {isAdmin && <Link to="/admin" className="ttc-row-action">Open Admin Console</Link>}
          </article>
        </section>
      </main>
    </div>
  )
}

function StatCard({ label, value }) {
  return (
    <article className="dashboard-stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  )
}

function ActivityItem({ title, meta }) {
  return (
    <div className="activity-item">
      <span></span>
      <div>
        <strong>{title}</strong>
        <small>{meta}</small>
      </div>
    </div>
  )
}
