import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth'
import {
  fetchMyPtmMembershipForPtm,
  formatDate,
  getMyPlayer,
  isActiveStatus,
  isApprovedStatus,
  normalizeExternalUrl,
  normalizeText,
  requestJoinPtm,
  toActivityPhotos,
  validateHttpUrl,
} from '../lib/communityData'
import { getImageUrl } from '../lib/storageImages'

const getField = (row, fields, fallback = '') => {
  for (const field of fields) {
    const value = row?.[field]
    if (value !== undefined && value !== null && String(value).trim() !== '') return value
  }
  return fallback
}

const normalize = (value) => String(value || '').toLowerCase().trim()
const CLOSED_MEMBERSHIP_STATUSES = new Set(['rejected', 'cancelled', 'left'])
const OPEN_MEMBERSHIP_STATUSES = new Set(['pending', 'approved'])

const getInitials = (name) => String(name || 'Club')
  .trim()
  .split(/\s+/)
  .slice(0, 2)
  .map((part) => part.charAt(0).toUpperCase())
  .join('') || 'C'

const mapClub = (row) => {
  const name = getField(row, ['name', 'club_name', 'nama_ptm', 'NamaPTM', 'nama'], 'Unnamed Club')
  return {
    id: row.id || row.ID || name,
    createdBy: row.created_by || row.CreatedBy || '',
    raw: row,
    name,
    city: getField(row, ['city_area', 'city', 'location', 'alamat', 'kota', 'KecamatanKota'], '-'),
    members: getField(row, ['member_count', 'members', 'total_members']),
    status: getField(row, ['status', 'Status'], 'approved'),
    ptmStatus: getField(row, ['ptm_status', 'StatusPTM'], 'active'),
    logoUrl: getImageUrl(getField(row, ['logo_url', 'photo_url', 'image_url', 'avatar_url', 'LogoURL'])),
    logoPosition: getField(row, ['logo_position', 'image_position'], 'center center'),
    description: getField(row, ['description', 'deskripsi', 'DeskripsiPTM'], ''),
    chairman: getField(row, ['chairman_name', 'NamaKetua'], '-'),
    address: getField(row, ['address', 'alamat_ptm', 'AlamatPTM'], '-'),
    mapsUrl: getField(row, ['google_maps_link', 'maps_url', 'GoogleMapsLink'], ''),
    websiteUrl: normalizeExternalUrl(getField(row, ['website_url', 'WebsiteURL'])),
    instagramUrl: normalizeExternalUrl(getField(row, ['instagram_url', 'social_url', 'InstagramURL'])),
    whatsapp: getField(row, ['whatsapp', 'contact_whatsapp', 'NoWhatsAppPTM'], ''),
    schedule: getField(row, ['training_schedule', 'JadwalLatihan'], '-'),
    history: getField(row, ['history', 'SejarahPTM'], '-'),
    publicNote: getField(row, ['public_note', 'ptm_note', 'KeteranganPTM'], '-'),
    activityPhotos: toActivityPhotos(row.activity_photos || row.FotoKegiatanJSON).map((photo) => getImageUrl(photo)).filter(Boolean),
    activityPhotoPosition: getField(row, ['activity_photo_position'], 'center center'),
    updatedAt: row.updated_at || row.UpdatedAt || '',
  }
}

export default function Ptm() {
  const { user, loading: authLoading } = useAuth()
  const [clubs, setClubs] = useState([])
  const [filters, setFilters] = useState({ q: '', city: 'all', status: 'all' })
  const [loading, setLoading] = useState(Boolean(supabase))
  const [error, setError] = useState('')
  const [selectedClub, setSelectedClub] = useState(null)
  const [currentPlayer, setCurrentPlayer] = useState(null)
  const [selectedMembership, setSelectedMembership] = useState(null)
  const [membershipLoading, setMembershipLoading] = useState(false)
  const [joinSaving, setJoinSaving] = useState(false)
  const [joinMessage, setJoinMessage] = useState('')
  const [joinError, setJoinError] = useState('')

  useEffect(() => {
    let active = true

    async function loadClubs() {
      if (!supabase) {
        setLoading(false)
        setError('Supabase belum dikonfigurasi.')
        return
      }

      setLoading(true)
      const { data, error: queryError } = await supabase
        .from('ptm')
        .select('*')
        .eq('status', 'approved')

      if (!active) return
      if (queryError) {
        setClubs([])
        setError('Club data could not be loaded.')
      } else {
        setClubs((data || [])
          .map(mapClub)
          .filter((club) => isApprovedStatus(club.status) && isActiveStatus(club.ptmStatus)))
        setError('')
      }
      setLoading(false)
    }

    loadClubs()
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true

    async function loadPlayer() {
      if (!user?.id) {
        setCurrentPlayer(null)
        return
      }
      const player = await getMyPlayer(user.id)
      if (active) setCurrentPlayer(player)
    }

    loadPlayer()
    return () => {
      active = false
    }
  }, [user?.id])

  useEffect(() => {
    let active = true

    async function loadMembership() {
      setJoinMessage('')
      setJoinError('')
      setSelectedMembership(null)

      if (!selectedClub?.id || !user?.id) {
        setMembershipLoading(false)
        return
      }

      setMembershipLoading(true)
      try {
        const membership = await fetchMyPtmMembershipForPtm(user.id, selectedClub.id)
        if (active) setSelectedMembership(membership)
      } catch (_membershipError) {
        if (active) setJoinError('Unable to check your membership status right now.')
      } finally {
        if (active) setMembershipLoading(false)
      }
    }

    loadMembership()
    return () => {
      active = false
    }
  }, [selectedClub?.id, user?.id])

  async function handleRequestJoin(club) {
    if (!user?.id || !club?.id || joinSaving) return
    if (selectedMembership && !canSubmitMembershipRequest(selectedMembership)) {
      setJoinError('You already have a pending or approved membership for this PTM.')
      return
    }

    setJoinSaving(true)
    setJoinMessage('')
    setJoinError('')

    try {
      const membership = await requestJoinPtm({
        ptm_id: club.id,
        user_id: user.id,
        player_id: currentPlayer?.id || null,
      })
      setSelectedMembership(membership || {
        ptm_id: club.id,
        user_id: user.id,
        player_id: currentPlayer?.id || null,
        status: 'pending',
      })
      setJoinMessage('Request submitted. Pending Approval.')
    } catch (joinRequestError) {
      const message = normalizeText(joinRequestError?.message)
      if (joinRequestError?.code === '23505' || message.includes('duplicate')) {
        setJoinError('You already have a pending or approved membership for this PTM.')
        try {
          const membership = await fetchMyPtmMembershipForPtm(user.id, club.id)
          setSelectedMembership(membership)
        } catch (_fetchError) {
          // Keep the friendly duplicate message visible.
        }
      } else {
        setJoinError('Unable to submit request. Please check your account status or try again.')
      }
    } finally {
      setJoinSaving(false)
    }
  }

  const cities = useMemo(() => [...new Set(clubs.map((club) => club.city).filter((city) => city && city !== '-'))].sort(), [clubs])
  const statuses = useMemo(() => [...new Set(clubs.map((club) => club.status).filter(Boolean))].sort(), [clubs])

  const filteredClubs = useMemo(() => {
    const keyword = normalize(filters.q)
    return clubs.filter((club) => {
      const matchesKeyword = !keyword || [club.name, club.city, club.description].some((value) => normalize(value).includes(keyword))
      const matchesCity = filters.city === 'all' || club.city === filters.city
      const matchesStatus = filters.status === 'all' || club.status === filters.status
      return matchesKeyword && matchesCity && matchesStatus
    })
  }, [clubs, filters])

  return (
    <div className="ttc-page ttc-clubs-page">
      <PageHero title="PTM/CLUBS" subtitle="Find table tennis clubs near you." />

      <section className="ttc-list-card">
        <form className="ttc-filter-row" onSubmit={(event) => event.preventDefault()}>
          <input
            type="search"
            placeholder="Search PTM/Club name..."
            value={filters.q}
            onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))}
          />
          <select value={filters.city} onChange={(event) => setFilters((current) => ({ ...current, city: event.target.value }))}>
            <option value="all">All Cities</option>
            {cities.map((city) => <option key={city} value={city}>{city}</option>)}
          </select>
          <select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}>
            <option value="all">All Status</option>
            {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
          <button type="submit" className="btn btn-primary">Search</button>
        </form>

        {loading && <div className="ttc-state">Loading clubs...</div>}
        {error && !loading && <div className="ttc-state ttc-state-error">{error}</div>}
        {!loading && !error && filteredClubs.length === 0 && <div className="ttc-state">No clubs found.</div>}

        {!loading && !error && filteredClubs.length > 0 && (
          <div className="ttc-club-list">
            {filteredClubs.map((club) => <ClubRow key={club.id} club={club} onSelect={setSelectedClub} />)}
          </div>
        )}
      </section>

      {selectedClub && (
        <ClubDetailModal
          club={selectedClub}
          currentUser={user}
          authLoading={authLoading}
          membership={selectedMembership}
          membershipLoading={membershipLoading}
          joinSaving={joinSaving}
          joinMessage={joinMessage}
          joinError={joinError}
          onRequestJoin={handleRequestJoin}
          onClose={() => setSelectedClub(null)}
        />
      )}
    </div>
  )
}

function PageHero({ title, subtitle }) {
  return (
    <section className="ttc-page-hero">
      <span className="ttc-hero-accent"></span>
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </section>
  )
}

function ClubRow({ club, onSelect }) {
  const [imageFailed, setImageFailed] = useState(false)
  const showImage = club.logoUrl && !imageFailed

  return (
    <article className="ttc-club-row clickable-row" onClick={() => onSelect(club)} role="button" tabIndex={0} onKeyDown={(event) => event.key === 'Enter' && onSelect(club)}>
      <div className="ttc-club-logo">
        {showImage ? (
          <img src={club.logoUrl} alt={club.name} loading="lazy" style={{ objectPosition: club.logoPosition }} onError={() => setImageFailed(true)} />
        ) : (
          <span>{getInitials(club.name)}</span>
        )}
      </div>
      <div className="ttc-club-main">
        <h2>{club.name}</h2>
        <p>{club.city}</p>
      </div>
      <div className="ttc-club-meta">
        <strong>{club.members || '-'}</strong>
        <span>Members</span>
      </div>
      <div className="ttc-club-meta">
        <strong>{club.ptmStatus}</strong>
        <span>Status</span>
      </div>
      <button type="button" className="ttc-row-action" onClick={(event) => { event.stopPropagation(); onSelect(club) }}>View Details</button>
    </article>
  )
}

function ClubDetailModal({
  club,
  currentUser,
  authLoading,
  membership,
  membershipLoading,
  joinSaving,
  joinMessage,
  joinError,
  onRequestJoin,
  onClose,
}) {
  const [imageFailed, setImageFailed] = useState(false)
  const showImage = club.logoUrl && !imageFailed
  const waNumber = String(club.whatsapp || '').replace(/\D/g, '')
  const hasWhatsApp = waNumber.length >= 10
  const hasMaps = validateHttpUrl(club.mapsUrl) && Boolean(club.mapsUrl)
  const hasWebsite = Boolean(club.websiteUrl)
  const hasInstagram = Boolean(club.instagramUrl)
  const isOwner = Boolean(currentUser?.id && club.createdBy && club.createdBy === currentUser.id)

  const openWhatsApp = () => {
    if (!hasWhatsApp) return
    window.open(`https://wa.me/${waNumber}`, '_blank', 'noopener,noreferrer')
  }

  const openMaps = () => {
    if (!hasMaps) return
    window.open(club.mapsUrl, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="ttc-modal-overlay" role="presentation">
      <section className="ttc-modal-card public-detail-modal wide" role="dialog" aria-modal="true" aria-labelledby="club-detail-title">
        <div className="ttc-modal-header">
          <h2 id="club-detail-title">Detail PTM</h2>
          <button type="button" onClick={onClose} aria-label="Tutup detail">×</button>
        </div>
        <div className="public-detail-body">
          <div className="public-detail-photo square">
            {showImage ? (
              <img src={club.logoUrl} alt={club.name} style={{ objectPosition: club.logoPosition }} onError={() => setImageFailed(true)} />
            ) : (
              <span>{getInitials(club.name)}</span>
            )}
          </div>
          <div className="public-detail-content">
            <h3>{club.name}</h3>
            <p>{club.description || '-'}</p>
            <div className="public-detail-actions">
              {hasWhatsApp && <button type="button" className="ttc-row-action" onClick={openWhatsApp}>Chat WhatsApp PTM</button>}
              {hasMaps && <button type="button" className="ttc-row-action secondary-link" onClick={openMaps}>Buka Google Maps</button>}
              {hasWebsite && <a className="ttc-row-action secondary-link" href={club.websiteUrl} target="_blank" rel="noopener noreferrer">Website</a>}
              {hasInstagram && <a className="ttc-row-action secondary-link" href={club.instagramUrl} target="_blank" rel="noopener noreferrer">Instagram / Social</a>}
            </div>
            <JoinRequestPanel
              authLoading={authLoading}
              currentUser={currentUser}
              isOwner={isOwner}
              membership={membership}
              membershipLoading={membershipLoading}
              joinSaving={joinSaving}
              joinMessage={joinMessage}
              joinError={joinError}
              onRequestJoin={() => onRequestJoin(club)}
            />
            <div className="public-detail-grid">
              <DetailFact label="Status Verifikasi" value={club.status} />
              <DetailFact label="Status PTM" value={club.ptmStatus} />
              <DetailFact label="Ketua" value={club.chairman} />
              <DetailFact label="Kecamatan / Kota" value={club.city} />
              <DetailFact label="Alamat PTM" value={club.address} />
              <DetailFact label="Kontak WhatsApp" value={club.whatsapp || '-'} />
              <DetailFact label="Jadwal Latihan" value={club.schedule} />
              <DetailFact label="Sejarah PTM" value={club.history} />
              <DetailFact label="Keterangan Publik" value={club.publicNote} />
              <DetailFact label="Updated" value={formatDate(club.updatedAt)} />
            </div>
            {club.activityPhotos.length > 0 && (
              <div className="public-photo-strip">
                {club.activityPhotos.map((photo) => (
                  <img key={photo} src={photo} alt={`Kegiatan ${club.name}`} loading="lazy" style={{ objectPosition: club.activityPhotoPosition }} />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

function JoinRequestPanel({
  authLoading,
  currentUser,
  isOwner,
  membership,
  membershipLoading,
  joinSaving,
  joinMessage,
  joinError,
  onRequestJoin,
}) {
  if (authLoading) {
    return <div className="inline-info">Checking login status...</div>
  }

  if (!currentUser) {
    return (
      <div className="inline-info">
        Login to request join. <Link to="/login">Login</Link>
      </div>
    )
  }

  if (isOwner) {
    return <div className="inline-info">PTM Owner</div>
  }

  if (membershipLoading) {
    return <div className="inline-info">Checking membership status...</div>
  }

  const canRequest = canSubmitMembershipRequest(membership)
  const statusText = membership ? membershipStatusLabel(membership.status) : ''
  const isReapply = membership && canRequest

  return (
    <div className="public-detail-actions">
      {membership && <div className="inline-info">{statusText}</div>}
      {canRequest ? (
        <button type="button" className="ttc-row-action" onClick={onRequestJoin} disabled={joinSaving}>
          {joinSaving ? 'Submitting...' : isReapply ? 'Request Again' : 'Request Join PTM'}
        </button>
      ) : null}
      {joinMessage && <div className="inline-info">{joinMessage}</div>}
      {joinError && <div className="inline-error">{joinError}</div>}
    </div>
  )
}

function canSubmitMembershipRequest(membership) {
  if (!membership) return true
  const status = normalizeText(membership.status)
  if (OPEN_MEMBERSHIP_STATUSES.has(status)) return false
  return CLOSED_MEMBERSHIP_STATUSES.has(status)
}

function membershipStatusLabel(status) {
  const normalized = normalizeText(status)
  if (normalized === 'pending') return 'Pending Approval'
  if (normalized === 'approved') return 'Member'
  if (normalized === 'rejected') return 'Request Rejected'
  if (normalized === 'cancelled') return 'Request Cancelled'
  if (normalized === 'left') return 'Left PTM'
  return 'Membership request found'
}

function DetailFact({ label, value }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value || '-'}</strong>
    </div>
  )
}
