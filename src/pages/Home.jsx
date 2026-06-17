import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth'
import { useLanguage } from '../contexts/LanguageContext'
import { getImageUrl } from '../lib/storageImages'

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

  const heroTitle = isEn ? 'INDONESIAN TABLE TENNIS COMMUNITY PORTAL' : 'INDONESIA PORTAL KOMUNITAS TENIS MEJA'
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
          supabase.from('news').select('*', { count: 'exact', head: true }).in('status', ['published', 'active']),
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
        .select('id, title, summary, photo_url, photo_position, status, created_at')
        .in('status', ['published', 'active'])
        .order('created_at', { ascending: false })
        .limit(3)
      if (!error) setLatestNews(data || [])
      else console.warn('News fetch error:', error)
    }
    fetchNews()
  }, [])

  // Top PTM
  useEffect(() => {
    const fetchPtm = async () => {
      const { data, error } = await supabase
        .from('ptm')
        .select('*')
        .eq('status', 'approved')
        .limit(4)
      if (!error) setTopPtm(data || [])
      else console.warn('PTM fetch error:', error)
    }
    fetchPtm()
  }, [])

  // Marketplace (ads)
  useEffect(() => {
    const fetchAds = async () => {
      const { data, error } = await supabase
        .from('ads')
        .select('id, title, description, photo_url, photo_position, target_url, advertiser_name, status, created_at')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(3)
      if (!error) setMarketplaceItems(data || [])
      else console.warn('Ads fetch error:', error)
    }
    fetchAds()
  }, [])

  // Divisions untuk search
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
    <div className="ttc-home">
      <section className="ttc-landing-shell">
        <div className="ttc-hero-grid">
          <div className="ttc-hero-copy">
            <p className="ttc-country">INDONESIA</p>
            <h1>{heroTitle}</h1>
            <p className="ttc-hero-subtitle">{heroSub}</p>
            <div className="hero-cta">
              <button onClick={() => navigate('/players')} className="btn btn-primary">{ctaText.viewPlayers}</button>
              <button onClick={() => navigate('/ptm')} className="btn btn-outline">{ctaText.explorePtm}</button>
              {!isLoggedIn ? (
                <button onClick={() => navigate('/register')} className="btn btn-ghost">{ctaText.register}</button>
              ) : (
                <button onClick={() => navigate('/dashboard')} className="btn btn-ghost">{ctaText.dashboard}</button>
              )}
            </div>
          </div>

          <div className="ttc-hero-visual" aria-label="Dynamic table tennis visual">
            <div className="hero-athlete-frame">
              <img
                className="hero-athlete-image"
                src="/assets/hero-table-tennis.jpg"
                alt="Table tennis athlete in action"
                loading="eager"
                onLoad={(event) => event.currentTarget.closest('.ttc-hero-visual')?.classList.add('has-athlete-image')}
                onError={(event) => {
                  event.currentTarget.style.display = 'none'
                  event.currentTarget.closest('.ttc-hero-visual')?.classList.remove('has-athlete-image')
                }}
              />
            </div>
            <div className="hero-splash splash-one"></div>
            <div className="hero-splash splash-two"></div>
            <div className="hero-player-card">
              <div className="player-head"></div>
              <div className="player-body"></div>
              <div className="player-arm"></div>
              <div className="player-paddle"></div>
            </div>
            <div className="hero-ball"></div>
            <div className="hero-table-line"></div>
            <div className="hero-net"></div>
          </div>
        </div>

        <div className="stats-grid">
          <StatCard icon="player" number={stats.players} label={statLabels.players} />
          <StatCard icon="club" number={stats.ptm} label={statLabels.ptm} />
          <StatCard icon="content" number={stats.news} label={statLabels.news} />
          <StatCard icon="market" number={stats.ads} label={statLabels.ads} />
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

        <div className="preview-grid">
          <PreviewColumn title={isEn ? 'Latest News' : 'Berita Terbaru'} action={isEn ? 'View all' : 'Lihat semua'} onAction={() => navigate('/news')}>
            {latestNews.length === 0 && <div className="empty-state">{isEn ? 'No news yet' : 'Belum ada berita'}</div>}
            {latestNews.map(item => (
              <PreviewItem
                key={item.id}
                icon="news"
                title={item.title}
                imageUrl={getImageUrl(item.photo_url)}
                imagePosition={item.photo_position}
                meta={item.created_at ? new Date(item.created_at).toLocaleDateString() : (isEn ? 'Latest update' : 'Update terbaru')}
                onClick={() => navigate(`/news/${item.id}`)}
              />
            ))}
          </PreviewColumn>

          <PreviewColumn title={isEn ? 'Top PTM/Clubs' : 'PTM/Klub Teratas'} action={isEn ? 'View all' : 'Lihat semua'} onAction={() => navigate('/ptm')}>
            {topPtm.length === 0 && <div className="empty-state">{isEn ? 'No clubs available' : 'Belum ada klub'}</div>}
            {topPtm.map((ptm, index) => (
              <PreviewItem
                key={ptm.id}
                icon="ptm"
                title={ptm.name}
                imageUrl={getImageUrl(ptm.logo_url || ptm.photo_url || ptm.image_url || ptm.avatar_url)}
                imagePosition={ptm.logo_position || ptm.photo_position || ptm.image_position}
                meta="Registered PTM"
                onClick={() => navigate('/ptm')}
              />
            ))}
          </PreviewColumn>

          <PreviewColumn title="Marketplace" action={isEn ? 'View all' : 'Lihat semua'} onAction={() => navigate('/marketplace')}>
            {marketplaceItems.length === 0 && <div className="empty-state">{isEn ? 'No active listings' : 'Tidak ada iklan aktif'}</div>}
            {marketplaceItems.map(ad => (
              <PreviewItem
                key={ad.id}
                icon="market"
                title={ad.title}
                imageUrl={getImageUrl(ad.photo_url)}
                imagePosition={ad.photo_position}
                meta={isEn ? 'Active listing' : 'Listing aktif'}
                onClick={() => navigate('/marketplace')}
              />
            ))}
          </PreviewColumn>
        </div>
      </section>
    </div>
  )
}

function StatCard({ icon, number, label }) {
  return (
    <div className="stat-card">
      <span className={`stat-icon stat-${icon}`}></span>
      <div>
        <div className="stat-number">{number}+</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  )
}

function PreviewColumn({ title, action, onAction, children }) {
  return (
    <section className="preview-column">
      <div className="preview-column-header">
        <h2>{title}</h2>
        <button type="button" onClick={onAction}>{action}</button>
      </div>
      <div className="preview-list">{children}</div>
    </section>
  )
}

function PreviewItem({ icon, title, meta, imageUrl, imagePosition = 'center center', onClick }) {
  const [imageFailed, setImageFailed] = useState(false)
  const showImage = imageUrl && !imageFailed

  return (
    <button type="button" className="preview-item" onClick={onClick}>
      <span className={`preview-thumb thumb-${icon} ${showImage ? 'has-image' : ''}`}>
        {showImage && (
          <img
            src={imageUrl}
            alt={title}
            loading="lazy"
            style={{ objectPosition: imagePosition || 'center center' }}
            onError={() => setImageFailed(true)}
          />
        )}
      </span>
      <span className="preview-copy">
        <strong>{title}</strong>
        <small>{meta}</small>
      </span>
    </button>
  )
}
