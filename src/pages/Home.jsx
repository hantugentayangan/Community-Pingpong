import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth'
import { useLanguage } from '../contexts/LanguageContext'
import { TableTennisHero } from '../components/TableTennisHero'

export default function Home() {
  const { language } = useLanguage()
  const { isLoggedIn } = useAuth()
  const navigate = useNavigate()

  const [stats, setStats] = useState({ players: 0, ptm: 0, news: 0, ads: 0 })
  const [latestNews, setLatestNews] = useState([])
  const [topPtm, setTopPtm] = useState([])
  const [marketplaceItems, setMarketplaceItems] = useState([])
  const [divisions, setDivisions] = useState([])
  const [searchForm, setSearchForm] = useState({ name: '', division: '', ptm: '' })

  const isEn = language === 'en'

  // Text content
  const heroTitle = isEn ? 'Indonesia Table Tennis Community Portal' : 'Portal Komunitas Tenis Meja Indonesia'
  const heroSub = isEn
    ? 'One platform to discover players, clubs, news, tournaments, sponsors, and marketplace updates across the table tennis community.'
    : 'Satu platform untuk melihat pemain, PTM/klub, berita, turnamen, sponsor, dan marketplace komunitas tenis meja.'

  const ctaText = {
    viewPlayers: isEn ? 'View Players' : 'Lihat Pemain',
    explorePtm: isEn ? 'Explore PTM/Club' : 'Lihat PTM/Klub',
    register: isEn ? 'Register' : 'Daftar',
    dashboard: isEn ? 'Dashboard' : 'Dashboard',
  }

  const searchTitle = isEn ? 'Find Verified Players' : 'Cari Pemain Terverifikasi'
  const searchPlaceholder = isEn ? 'Search player name, PTM/Club, or division' : 'Cari nama pemain, PTM/Klub, atau divisi'
  const ptmPlaceholder = isEn ? 'Example: Ganda Jaya' : 'Contoh: Ganda Jaya'
  const searchBtn = isEn ? 'Search' : 'Cari'

  // Fetch stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [playersCount, ptmCount, newsCount, adsCount] = await Promise.all([
          supabase.from('players').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
          supabase.from('ptm').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
          supabase.from('news').select('*', { count: 'exact', head: true }).eq('status', 'published'),
          supabase.from('ads').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        ])
        setStats({
          players: playersCount.count || 0,
          ptm: ptmCount.count || 0,
          news: newsCount.count || 0,
          ads: adsCount.count || 0,
        })
      } catch (err) {
        console.warn('Stats fetch error', err)
        setStats({ players: 0, ptm: 0, news: 0, ads: 0 })
      }
    }
    fetchStats()
  }, [])

  // Latest News
  useEffect(() => {
    const fetchNews = async () => {
      const { data, error } = await supabase
        .from('news')
        .select('id, title, published_at')
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .limit(3)
      if (!error) setLatestNews(data || [])
    }
    fetchNews()
  }, [])

  // Top PTM
  useEffect(() => {
    const fetchPtm = async () => {
      const { data, error } = await supabase
        .from('ptm')
        .select('id, name, logo_url')
        .eq('status', 'approved')
        .limit(4)
      if (!error) setTopPtm(data || [])
    }
    fetchPtm()
  }, [])

  // Marketplace (ads)
  useEffect(() => {
    const fetchAds = async () => {
      const { data, error } = await supabase
        .from('ads')
        .select('id, title, image_url, link')
        .eq('status', 'active')
        .limit(3)
      if (!error) setMarketplaceItems(data || [])
    }
    fetchAds()
  }, [])

  // Fetch divisions for search dropdown
  useEffect(() => {
    const fetchDivisions = async () => {
      const { data, error } = await supabase
        .from('players')
        .select('division')
        .eq('status', 'approved')
        .not('division', 'is', null)
      if (!error && data) {
        const unique = [...new Set(data.map(d => d.division))]
        setDivisions(unique)
      } else {
        setDivisions([])
      }
    }
    fetchDivisions()
  }, [])

  const handleSearch = (e) => {
    e.preventDefault()
    const params = new URLSearchParams()
    if (searchForm.name) params.append('q', searchForm.name)
    if (searchForm.division && searchForm.division !== 'all') params.append('division', searchForm.division)
    if (searchForm.ptm) params.append('ptm', searchForm.ptm)
    navigate(`/players?${params.toString()}`)
  }

  const statLabels = {
    players: isEn ? 'Verified Players' : 'Pemain Terverifikasi',
    ptm: isEn ? 'Active PTM/Clubs' : 'PTM/Klub Aktif',
    news: isEn ? 'Public Content' : 'Konten Publik',
    ads: isEn ? 'Marketplace Listings' : 'Iklan/Marketplace',
  }

  return (
    <div className="container">
      <div className="hero-section">
        <h1 className="hero-title">{heroTitle}</h1>
        <p className="hero-subtitle">{heroSub}</p>
        <div className="hero-cta">
          <button onClick={() => navigate('/players')} className="btn btn-primary">{ctaText.viewPlayers}</button>
          <button onClick={() => navigate('/ptm')} className="btn btn-outline">{ctaText.explorePtm}</button>
          {!isLoggedIn ? (
            <button onClick={() => navigate('/register')} className="btn btn-primary">{ctaText.register}</button>
          ) : (
            <button onClick={() => navigate('/dashboard')} className="btn btn-primary">{ctaText.dashboard}</button>
          )}
        </div>
      </div>

      <TableTennisHero />

      <div className="stats-grid">
        <div className="stat-card"><div className="stat-number">{stats.players}</div><div>{statLabels.players}</div></div>
        <div className="stat-card"><div className="stat-number">{stats.ptm}</div><div>{statLabels.ptm}</div></div>
        <div className="stat-card"><div className="stat-number">{stats.news}</div><div>{statLabels.news}</div></div>
        <div className="stat-card"><div className="stat-number">{stats.ads}</div><div>{statLabels.ads}</div></div>
      </div>

      <div className="search-card">
        <h3>{searchTitle}</h3>
        <form onSubmit={handleSearch} className="search-form">
          <input type="text" placeholder={searchPlaceholder} value={searchForm.name} onChange={e => setSearchForm({...searchForm, name: e.target.value})} />
          <select value={searchForm.division} onChange={e => setSearchForm({...searchForm, division: e.target.value})}>
            <option value="all">{isEn ? 'All divisions' : 'Semua divisi'}</option>
            {divisions.map(div => <option key={div} value={div}>{div}</option>)}
          </select>
          <input type="text" placeholder={ptmPlaceholder} value={searchForm.ptm} onChange={e => setSearchForm({...searchForm, ptm: e.target.value})} />
          <button type="submit" className="btn btn-primary">{searchBtn}</button>
        </form>
      </div>

      <h2 className="section-title">{isEn ? 'Latest News' : 'Berita Terbaru'}</h2>
      <div className="preview-grid">
        {latestNews.length === 0 && <div className="empty-state">{isEn ? 'No news yet' : 'Belum ada berita'}</div>}
        {latestNews.map(item => (
          <div key={item.id} className="preview-card" onClick={() => navigate(`/news/${item.id}`)} style={{cursor: 'pointer'}}>
            <div className="preview-card-content"><h4>{item.title}</h4><small>{new Date(item.published_at).toLocaleDateString()}</small></div>
          </div>
        ))}
      </div>

      <h2 className="section-title">{isEn ? 'Top PTM/Clubs' : 'PTM/Klub Teratas'}</h2>
      <div className="preview-grid">
        {topPtm.length === 0 && <div className="empty-state">{isEn ? 'No clubs available' : 'Belum ada klub'}</div>}
        {topPtm.map(ptm => (
          <div key={ptm.id} className="preview-card" onClick={() => navigate(`/ptm`)} style={{cursor: 'pointer'}}>
            <div className="preview-card-content"><h4>{ptm.name}</h4></div>
          </div>
        ))}
      </div>

      <h2 className="section-title">{isEn ? 'Marketplace' : 'Marketplace'}</h2>
      <div className="preview-grid">
        {marketplaceItems.length === 0 && <div className="empty-state">{isEn ? 'No active listings' : 'Tidak ada iklan aktif'}</div>}
        {marketplaceItems.map(ad => (
          <div key={ad.id} className="preview-card" onClick={() => window.open(ad.link, '_blank')} style={{cursor: 'pointer'}}>
            <div className="preview-card-content"><h4>{ad.title}</h4></div>
          </div>
        ))}
      </div>
    </div>
  )
}