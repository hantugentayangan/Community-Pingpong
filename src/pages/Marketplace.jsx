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

const isValidUrl = (value) => /^https?:\/\//i.test(String(value || '').trim())
const isLikelyUuid = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || '').trim())

const formatPrice = (value) => {
  if (!value) return ''
  const number = Number(value)
  if (Number.isNaN(number)) return String(value)
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(number)
}

const mapItem = (row, creatorProfile = null) => {
  const advertiser = getField(row, ['advertiser_name', 'NamaPengiklan'])
    || creatorProfile?.full_name
    || creatorProfile?.email
    || 'Pengiklan belum tersedia'

  return {
    id: row.id || row.ID,
    title: getField(row, ['title', 'name', 'product_name', 'nama_produk'], 'Untitled Item'),
    price: getField(row, ['price', 'harga']),
    category: getField(row, ['ad_type', 'category', 'kategori', 'type']),
    description: getField(row, ['description', 'deskripsi']),
    imageUrl: getImageUrl(getField(row, ['image_url', 'thumbnail_url', 'cover_url', 'photo_url', 'FotoURL'])),
    photoPosition: getField(row, ['photo_position', 'image_position'], 'center center'),
    seller: isLikelyUuid(advertiser) ? 'Pengiklan belum tersedia' : advertiser,
    location: getField(row, ['location', 'city', 'kota']),
    link: getField(row, ['target_url', 'link', 'link_url', 'url', 'LinkTujuan']),
    createdAt: row.created_at || row.CreatedAt || '',
  }
}

export default function Marketplace() {
  const [items, setItems] = useState([])
  const [filters, setFilters] = useState({ q: '', category: 'all' })
  const [loading, setLoading] = useState(Boolean(supabase))
  const [error, setError] = useState('')
  const [selectedItem, setSelectedItem] = useState(null)

  useEffect(() => {
    let active = true

    async function loadItems() {
      if (!supabase) {
        setLoading(false)
        setError('Supabase belum dikonfigurasi.')
        return
      }

      setLoading(true)
      const { data, error: queryError } = await supabase
        .from('ads')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      if (!active) return
      if (queryError) {
        setItems([])
        setError('Marketplace data could not be loaded.')
      } else {
        const rows = data || []
        const creatorIds = [...new Set(rows.map((row) => row.created_by).filter(Boolean))]
        let profilesById = {}

        if (creatorIds.length > 0) {
          const { data: profileRows, error: profileError } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .in('id', creatorIds)

          if (profileError) {
            console.warn('Marketplace creator profile lookup skipped:', profileError.message)
          } else {
            profilesById = Object.fromEntries((profileRows || []).map((profile) => [profile.id, profile]))
          }
        }

        setItems(rows.map((row) => mapItem(row, profilesById[row.created_by])))
        setError('')
      }
      setLoading(false)
    }

    loadItems()
    return () => {
      active = false
    }
  }, [])

  const categories = useMemo(() => [...new Set(items.map((item) => item.category).filter(Boolean))].sort(), [items])

  const filteredItems = useMemo(() => {
    const keyword = normalize(filters.q)
    return items.filter((item) => {
      const matchesKeyword = !keyword || [item.title, item.seller, item.location, item.category].some((value) => normalize(value).includes(keyword))
      const matchesCategory = filters.category === 'all' || item.category === filters.category
      return matchesKeyword && matchesCategory
    })
  }, [filters, items])

  return (
    <div className="ttc-page ttc-market-page">
      <section className="ttc-page-hero">
        <span className="ttc-hero-accent"></span>
        <h1>MARKETPLACE</h1>
        <p>Buy, sell, or promote table tennis products and services.</p>
      </section>

      <section className="ttc-list-card">
        <form className="ttc-filter-row compact" onSubmit={(event) => event.preventDefault()}>
          <input
            type="search"
            placeholder="Search products..."
            value={filters.q}
            onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))}
          />
          <select value={filters.category} onChange={(event) => setFilters((current) => ({ ...current, category: event.target.value }))}>
            <option value="all">All Categories</option>
            {categories.map((category) => <option key={category} value={category}>{category}</option>)}
          </select>
          <button type="submit" className="btn btn-primary">Search</button>
        </form>

        {loading && <div className="ttc-state">Loading marketplace...</div>}
        {error && !loading && <div className="ttc-state ttc-state-error">{error}</div>}
        {!loading && !error && filteredItems.length === 0 && <div className="ttc-state">No marketplace items found.</div>}

        {!loading && !error && filteredItems.length > 0 && (
          <div className="ttc-market-grid">
            {filteredItems.map((item) => <MarketCard key={item.id || item.title} item={item} onOpen={setSelectedItem} />)}
          </div>
        )}
      </section>
      {selectedItem && (
        <MarketplaceDetailModal item={selectedItem} onClose={() => setSelectedItem(null)} />
      )}
    </div>
  )
}

function MarketCard({ item, onOpen }) {
  const [imageFailed, setImageFailed] = useState(false)
  const showImage = item.imageUrl && !imageFailed

  return (
    <article
      className="ttc-market-card clickable-card"
      role="button"
      tabIndex={0}
      onClick={() => onOpen(item)}
      onKeyDown={(event) => event.key === 'Enter' && onOpen(item)}
    >
      <div className="ttc-market-image">
        {showImage ? (
          <img src={item.imageUrl} alt={item.title} loading="lazy" style={{ objectPosition: item.photoPosition }} onError={() => setImageFailed(true)} />
        ) : (
          <span>MARKET</span>
        )}
      </div>
      <div className="ttc-market-body">
        {item.category && <span className="ttc-market-category">{item.category}</span>}
        <h2>{item.title}</h2>
        {item.price && <strong>{formatPrice(item.price)}</strong>}
        <p>{[item.seller, item.location].filter(Boolean).join(' • ') || 'Seller info unavailable'}</p>
        <span className="ttc-row-action">Lihat Detail</span>
      </div>
    </article>
  )
}

function MarketplaceDetailModal({ item, onClose }) {
  const [imageFailed, setImageFailed] = useState(false)
  const showImage = item.imageUrl && !imageFailed
  const canOpen = isValidUrl(item.link)

  return (
    <div className="ttc-modal-overlay" role="presentation">
      <section className="ttc-modal-card public-detail-modal" role="dialog" aria-modal="true" aria-labelledby="marketplace-detail-title">
        <div className="ttc-modal-header">
          <h2 id="marketplace-detail-title">Detail Marketplace</h2>
          <button type="button" onClick={onClose} aria-label="Tutup detail">×</button>
        </div>
        <div className="public-detail-body">
          <div className="public-detail-photo">
            {showImage ? (
              <img src={item.imageUrl} alt={item.title} style={{ objectPosition: item.photoPosition }} onError={() => setImageFailed(true)} />
            ) : (
              <span>MARKET</span>
            )}
          </div>
          <div className="public-detail-content">
            {item.category && <span className="ttc-market-category">{item.category}</span>}
            <h3>{item.title}</h3>
            {item.price && <strong>{formatPrice(item.price)}</strong>}
            <p>{item.description || 'Deskripsi belum tersedia.'}</p>
            <div className="public-detail-grid">
              <DetailFact label="Pengiklan" value={item.seller} />
              <DetailFact label="Lokasi" value={item.location || '-'} />
              <DetailFact label="Dibuat" value={item.createdAt ? new Date(item.createdAt).toLocaleDateString('id-ID') : '-'} />
              <DetailFact label="Link" value={canOpen ? item.link : 'Link belum tersedia'} />
            </div>
            {canOpen ? (
              <button type="button" className="button primary" onClick={() => window.open(item.link, '_blank', 'noopener,noreferrer')}>
                Buka Link
              </button>
            ) : (
              <div className="ttc-link-empty">Link belum tersedia</div>
            )}
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
