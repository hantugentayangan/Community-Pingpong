import React, { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabaseClient'
import { getMyPlayer, normalizeDivision, normalizeExternalUrl } from '../lib/communityData'
import { getImageUrl } from '../lib/storageImages'
import ittcLogo from '../assets/ittc-logo.jpeg'

const menuItems = [
  { label: 'Dashboard', to: '/dashboard' },
  { label: 'My Profile', to: '/profile' },
  { label: 'My PTM/Club', to: '/my-ptm' },
]

export default function Dashboard() {
  const { user, profile, loading, logout, isAdmin } = useAuth()
  const [player, setPlayer] = useState(null)
  const [ads, setAds] = useState([])
  const [adsLoading, setAdsLoading] = useState(Boolean(supabase))
  const [adsError, setAdsError] = useState(false)
  const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Member'
  const displayDivision = player?.division || normalizeDivision(profile?.division || user?.user_metadata?.division || '') || '-'

  useEffect(() => {
    if (!user?.id) return
    getMyPlayer(user.id).then(setPlayer)
  }, [user?.id])

  useEffect(() => {
    let active = true

    async function loadAds() {
      if (!supabase) {
        setAdsLoading(false)
        return
      }

      setAdsLoading(true)
      setAdsError(false)

      let result = await supabase
        .from('ads')
        .select('id, title, description, photo_url, photo_position, target_url, advertiser_name, ad_type, status, created_at')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(4)

      if (result.error && /created_at/i.test(result.error.message || '')) {
        result = await supabase
          .from('ads')
          .select('id, title, description, photo_url, photo_position, target_url, advertiser_name, ad_type, status')
          .eq('status', 'active')
          .limit(4)
      }

      if (!active) return

      if (result.error) {
        console.warn('Dashboard ads fetch error:', result.error.message)
        setAds([])
        setAdsError(true)
      } else {
        setAds(result.data || [])
      }
      setAdsLoading(false)
    }

    loadAds()
    return () => {
      active = false
    }
  }, [])

  if (loading) return <div className="ttc-page"><div className="ttc-state">Memuat dashboard...</div></div>
  if (!user) return <Navigate to="/login" replace />

  return (
    <div className="ttc-dashboard-shell">
      <aside className="ttc-dashboard-sidebar">
        <Link to="/" className="dashboard-brand">
          <img className="brand-logo" src={ittcLogo} alt="Indonesian Table Tennis Community" />
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
            <div className="dashboard-panel-heading">
              <div>
                <h2>Ads & Marketplace</h2>
                <p>Discover community offers, equipment, and partner updates.</p>
              </div>
              <Link to="/marketplace" className="ttc-row-action">View All</Link>
            </div>
            <AdsHighlights ads={ads} loading={adsLoading} error={adsError} />
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

function AdsHighlights({ ads, loading, error }) {
  if (loading) return <div className="ttc-state">Loading highlights...</div>
  if (error) return <div className="ttc-state">Unable to load highlights right now.</div>
  if (!ads.length) return <div className="ttc-state">Ads and marketplace highlights will appear here soon.</div>

  return (
    <div className="dashboard-ads-grid">
      {ads.map((ad) => <AdHighlightCard key={ad.id} ad={ad} />)}
    </div>
  )
}

function AdHighlightCard({ ad }) {
  const imageUrl = getImageUrl(ad.photo_url)
  const targetUrl = normalizeExternalUrl(ad.target_url)

  return (
    <article className="dashboard-ad-card">
      {imageUrl ? (
        <img src={imageUrl} alt={ad.title || 'Marketplace highlight'} loading="lazy" style={{ objectPosition: ad.photo_position || 'center center' }} />
      ) : (
        <div className="dashboard-ad-placeholder"></div>
      )}
      <div>
        {ad.ad_type && <span className="dashboard-ad-type">{ad.ad_type}</span>}
        <strong>{ad.title || 'Marketplace Offer'}</strong>
        {ad.advertiser_name && <small>{ad.advertiser_name}</small>}
        {ad.description && <p>{ad.description}</p>}
        {targetUrl && (
          <a href={targetUrl} target="_blank" rel="noopener noreferrer" className="ttc-row-action">
            View Offer
          </a>
        )}
      </div>
    </article>
  )
}
