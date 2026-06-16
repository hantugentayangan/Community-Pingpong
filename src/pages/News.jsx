import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { getImageUrl } from '../lib/storageImages'

const getField = (row, fields, fallback = '') => {
  for (const field of fields) {
    const value = row?.[field]
    if (value !== undefined && value !== null && String(value).trim() !== '') return value
  }
  return fallback
}

const normalize = (value) => String(value || '').toLowerCase().trim()

const formatDate = (value) => {
  if (!value) return 'Latest update'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString('id-ID')
}

const mapNews = (row) => ({
  id: row.id || row.ID,
  title: getField(row, ['title', 'judul', 'headline'], 'Untitled News'),
  date: getField(row, ['created_at', 'published_at', 'date', 'tanggal']),
  category: getField(row, ['category', 'kategori']),
  imageUrl: getImageUrl(getField(row, ['image_url', 'thumbnail_url', 'cover_url', 'photo_url', 'FotoURL'])),
  photoPosition: getField(row, ['photo_position', 'image_position'], 'center center'),
  summary: getField(row, ['summary', 'excerpt', 'description', 'content'], ''),
  content: getField(row, ['content', 'isi', 'body'], ''),
  author: getField(row, ['author', 'created_by', 'updated_by', 'CreatedBy'], ''),
})

export default function News() {
  const [items, setItems] = useState([])
  const [filters, setFilters] = useState({ q: '', category: 'all' })
  const [loading, setLoading] = useState(Boolean(supabase))
  const [error, setError] = useState('')
  const [selectedNews, setSelectedNews] = useState(null)

  useEffect(() => {
    let active = true

    async function loadNews() {
      if (!supabase) {
        setLoading(false)
        setError('Supabase belum dikonfigurasi.')
        return
      }

      setLoading(true)
      const { data, error: queryError } = await supabase
        .from('news')
        .select('*')
        .in('status', ['published', 'active'])
        .order('created_at', { ascending: false })

      if (!active) return
      if (queryError) {
        setItems([])
        setError('News data could not be loaded.')
      } else {
        setItems((data || []).map(mapNews))
        setError('')
      }
      setLoading(false)
    }

    loadNews()
    return () => {
      active = false
    }
  }, [])

  const categories = useMemo(() => [...new Set(items.map((item) => item.category).filter(Boolean))].sort(), [items])

  const filteredNews = useMemo(() => {
    const keyword = normalize(filters.q)
    return items.filter((item) => {
      const matchesKeyword = !keyword || [item.title, item.summary, item.category].some((value) => normalize(value).includes(keyword))
      const matchesCategory = filters.category === 'all' || item.category === filters.category
      return matchesKeyword && matchesCategory
    })
  }, [filters, items])

  return (
    <div className="ttc-page ttc-news-page">
      <section className="ttc-page-hero">
        <span className="ttc-hero-accent"></span>
        <h1>NEWS</h1>
        <p>Latest updates from the table tennis community.</p>
      </section>

      <section className="ttc-list-card">
        <form className="ttc-filter-row compact" onSubmit={(event) => event.preventDefault()}>
          <input
            type="search"
            placeholder="Search news..."
            value={filters.q}
            onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))}
          />
          <select value={filters.category} onChange={(event) => setFilters((current) => ({ ...current, category: event.target.value }))}>
            <option value="all">All Categories</option>
            {categories.map((category) => <option key={category} value={category}>{category}</option>)}
          </select>
          <button type="submit" className="btn btn-primary">Search</button>
        </form>

        {loading && <div className="ttc-state">Loading news...</div>}
        {error && !loading && <div className="ttc-state ttc-state-error">{error}</div>}
        {!loading && !error && filteredNews.length === 0 && <div className="ttc-state">No news found.</div>}

        {!loading && !error && filteredNews.length > 0 && (
          <div className="ttc-news-list">
            {filteredNews.map((item) => (
              <NewsItem key={item.id || item.title} item={item} onOpen={() => setSelectedNews(item)} />
            ))}
          </div>
        )}
      </section>

      {selectedNews && (
        <NewsDetailModal item={selectedNews} onClose={() => setSelectedNews(null)} />
      )}
    </div>
  )
}

function NewsItem({ item, onOpen }) {
  const [imageFailed, setImageFailed] = useState(false)
  const showImage = item.imageUrl && !imageFailed

  return (
    <article
      className={`ttc-news-item ${item.id ? 'clickable' : ''}`}
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => event.key === 'Enter' && onOpen()}
    >
      <div className="ttc-news-thumb">
        {showImage ? (
          <img src={item.imageUrl} alt={item.title} loading="lazy" style={{ objectPosition: item.photoPosition }} onError={() => setImageFailed(true)} />
        ) : (
          <span>NEWS</span>
        )}
      </div>
      <div className="ttc-news-copy">
        <div className="ttc-item-kicker">
          {item.category && <span>{item.category}</span>}
          <time>{formatDate(item.date)}</time>
        </div>
        <h2>{item.title}</h2>
        {item.summary && <p>{String(item.summary).slice(0, 160)}</p>}
      </div>
    </article>
  )
}

function NewsDetailModal({ item, onClose }) {
  const [imageFailed, setImageFailed] = useState(false)
  const showImage = item.imageUrl && !imageFailed

  return (
    <div className="ttc-modal-overlay" role="presentation">
      <section className="ttc-modal-card public-detail-modal wide news-detail-modal" role="dialog" aria-modal="true" aria-labelledby="news-detail-title">
        <div className="ttc-modal-header">
          <h2 id="news-detail-title">Detail Berita</h2>
          <button type="button" onClick={onClose} aria-label="Tutup detail berita">×</button>
        </div>
        <div className="public-detail-body news-detail-body">
          <div className="public-detail-photo square news-detail-photo">
            {showImage ? (
              <img src={item.imageUrl} alt={item.title} style={{ objectPosition: item.photoPosition }} onError={() => setImageFailed(true)} />
            ) : (
              <span>NEWS</span>
            )}
          </div>
          <div className="public-detail-content news-detail-content">
            <div className="ttc-item-kicker">
              {item.category && <span>{item.category}</span>}
              <time>{formatDate(item.date)}</time>
            </div>
            <h3>{item.title}</h3>
            {item.summary && <p className="news-detail-summary">{item.summary}</p>}
            <div className="news-detail-text">
              {item.content || item.summary || 'Konten berita belum tersedia.'}
            </div>
            <div className="public-detail-grid news-detail-meta">
              <DetailFact label="Tanggal" value={formatDate(item.date)} />
              <DetailFact label="Penulis" value={item.author || '-'} />
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

function DetailFact({ label, value }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value || '-'}</strong>
    </div>
  )
}
