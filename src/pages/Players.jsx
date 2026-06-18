import React, { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { formatDate, isActiveStatus, isApprovedStatus, normalizeExternalUrl } from '../lib/communityData'
import { getImageUrl } from '../lib/storageImages'

const getField = (row, fields, fallback = '') => {
  for (const field of fields) {
    const value = row?.[field]
    if (value !== undefined && value !== null && String(value).trim() !== '') return value
  }
  return fallback
}

const normalize = (value) => String(value || '').toLowerCase().trim()

const getInitials = (name) => {
  const parts = String(name || 'Player').trim().split(/\s+/).slice(0, 2)
  return parts.map((part) => part.charAt(0).toUpperCase()).join('') || 'P'
}

const getAvatarUrl = (row) => getField(row, [
  'avatar_url',
  'photo_url',
  'foto_url',
  'image_url',
  'profile_photo_url',
])

const mapPlayer = (row) => {
  const name = getField(row, ['full_name', 'name', 'nama_asli', 'NamaAsli', 'display_name'], 'Unnamed Player')
  const nickname = getField(row, ['nickname', 'nama_panggilan', 'NamaPanggilan'])
  const city = getField(row, ['city', 'city_area', 'kota', 'KecamatanKota', 'location', 'domicile'])
  const club = getField(row, ['ptm_name', 'club_name', 'ptm', 'NamaPTM', 'nama_ptm'], 'Independent')
  const division = getField(row, ['division', 'Divisi', 'category', 'kelas'], '-')
  const rating = getField(row, ['rating', 'score', 'stars'])
  const status = getField(row, ['status', 'Status'], 'approved')
  const profileStatus = getField(row, ['profile_status', 'StatusProfil'], 'active')
  const verified = isApprovedStatus(status)

  return {
    id: row.id || row.ID || `${name}-${club}`,
    raw: row,
    name,
    nickname,
    city,
    club,
    division,
    rating,
    status,
    profileStatus,
    verified,
    ptmStatus: getField(row, ['ptm_status', 'StatusDiPTM'], '-'),
    note: getField(row, ['player_note', 'KeteranganPemain', 'achievement_note']),
    socialUrl: normalizeExternalUrl(getField(row, ['social_url', 'SocialURL', 'instagram_url'])),
    updatedAt: row.updated_at || row.UpdatedAt || '',
    avatarUrl: getImageUrl(getAvatarUrl(row)),
    photoPosition: getField(row, ['photo_position', 'avatar_position', 'image_position'], 'center center'),
  }
}

export default function Players() {
  const location = useLocation()
  const params = new URLSearchParams(location.search)

  const [players, setPlayers] = useState([])
  const [filters, setFilters] = useState({
    q: params.get('q') || '',
    division: params.get('division') || 'all',
    club: params.get('ptm') || 'all',
  })
  const [loading, setLoading] = useState(Boolean(supabase))
  const [error, setError] = useState('')
  const [selectedPlayer, setSelectedPlayer] = useState(null)

  useEffect(() => {
    let active = true

    async function loadPlayers() {
      if (!supabase) {
        setLoading(false)
        setError('Supabase belum dikonfigurasi.')
        return
      }

      setLoading(true)
      const { data, error: queryError } = await supabase
        .from('players')
        .select('*')
        .in('status', ['approved', 'active'])

      if (!active) return

      if (queryError) {
        setPlayers([])
        setError('Players data could not be loaded.')
      } else {
        setPlayers((data || [])
          .map(mapPlayer)
          .filter((player) => player.verified && isActiveStatus(player.profileStatus)))
        setError('')
      }
      setLoading(false)
    }

    loadPlayers()
    return () => {
      active = false
    }
  }, [])

  const divisions = useMemo(() => {
    const values = players.map((player) => player.division).filter((value) => value && value !== '-')
    return [...new Set(values)].sort()
  }, [players])

  const clubs = useMemo(() => {
    const values = players.map((player) => player.club).filter((value) => value && value !== 'Independent')
    return [...new Set(values)].sort()
  }, [players])

  const filteredPlayers = useMemo(() => {
    const keyword = normalize(filters.q)
    return players.filter((player) => {
      const matchesKeyword = !keyword || [
        player.name,
        player.nickname,
        player.city,
        player.note,
        player.club,
        player.division,
      ].some((value) => normalize(value).includes(keyword))
      const matchesDivision = filters.division === 'all' || player.division === filters.division
      const matchesClub = filters.club === 'all' || player.club === filters.club
      return matchesKeyword && matchesDivision && matchesClub
    })
  }, [filters, players])

  const handleSubmit = (event) => {
    event.preventDefault()
  }

  return (
    <div className="ttc-players-page">
      <section className="ttc-players-hero">
        <div>
          <span className="ttc-players-accent"></span>
          <h1>PLAYERS</h1>
          <p>Discover and connect with table tennis players.</p>
        </div>
      </section>

      <section className="ttc-players-card">
        <form className="players-filter-row" onSubmit={handleSubmit}>
          <input
            type="search"
            placeholder="Search player name..."
            value={filters.q}
            onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))}
          />
          <select
            value={filters.division}
            onChange={(event) => setFilters((current) => ({ ...current, division: event.target.value }))}
          >
            <option value="all">All Divisions</option>
            {divisions.map((division) => (
              <option key={division} value={division}>{division}</option>
            ))}
          </select>
          <select
            value={filters.club}
            onChange={(event) => setFilters((current) => ({ ...current, club: event.target.value }))}
          >
            <option value="all">All PTM/Clubs</option>
            {clubs.map((club) => (
              <option key={club} value={club}>{club}</option>
            ))}
          </select>
          <button type="submit" className="btn btn-primary">Search</button>
        </form>

        {loading && <div className="players-state">Loading players...</div>}
        {error && !loading && <div className="players-state players-error">{error}</div>}
        {!loading && !error && filteredPlayers.length === 0 && (
          <div className="players-state">No players found.</div>
        )}

        {!loading && !error && filteredPlayers.length > 0 && (
          <div className="players-list">
            {filteredPlayers.map((player) => (
              <PlayerRow key={player.id} player={player} onSelect={setSelectedPlayer} />
            ))}
          </div>
        )}
      </section>

      {selectedPlayer && (
        <PlayerDetailModal player={selectedPlayer} onClose={() => setSelectedPlayer(null)} />
      )}
    </div>
  )
}

function PlayerRow({ player, onSelect }) {
  const [avatarFailed, setAvatarFailed] = useState(false)
  const showAvatar = player.avatarUrl && !avatarFailed

  return (
    <article className="ttc-player-row clickable-row" onClick={() => onSelect(player)} role="button" tabIndex={0} onKeyDown={(event) => event.key === 'Enter' && onSelect(player)}>
      <div className="player-avatar">
        {showAvatar ? (
          <img
            src={player.avatarUrl}
            alt={player.name}
            loading="lazy"
            style={{ objectPosition: player.photoPosition }}
            onError={() => setAvatarFailed(true)}
          />
        ) : (
          <span>{getInitials(player.name)}</span>
        )}
      </div>
      <div className="player-main">
        <h2>{player.name}</h2>
        {player.note?.trim() ? <p>{player.note}</p> : null}
      </div>
      <div className="player-meta">
        <span>{player.club}</span>
        <small>PTM/Club</small>
      </div>
      <div className="player-meta">
        <span>{player.division}</span>
        <small>Division</small>
      </div>
      <div className="player-status-cell">
        {player.rating ? (
          <span className="player-rating">★ {player.rating}</span>
        ) : player.socialUrl ? (
          <a className="ttc-row-action" href={player.socialUrl} target="_blank" rel="noopener noreferrer" onClick={(event) => event.stopPropagation()}>
            Social Media
          </a>
        ) : player.verified ? (
          <span className="verified-badge">Verified</span>
        ) : (
          <span className="verified-badge muted">Listed</span>
        )}
      </div>
    </article>
  )
}

function PlayerDetailModal({ player, onClose }) {
  const [avatarFailed, setAvatarFailed] = useState(false)
  const showAvatar = player.avatarUrl && !avatarFailed

  return (
    <div className="ttc-modal-overlay" role="presentation">
      <section className="ttc-modal-card public-detail-modal" role="dialog" aria-modal="true" aria-labelledby="player-detail-title">
        <div className="ttc-modal-header">
          <h2 id="player-detail-title">Detail Pemain</h2>
          <button type="button" onClick={onClose} aria-label="Tutup detail">×</button>
        </div>
        <div className="public-detail-body">
          <div className="public-detail-photo">
            {showAvatar ? (
              <img src={player.avatarUrl} alt={player.name} style={{ objectPosition: player.photoPosition }} onError={() => setAvatarFailed(true)} />
            ) : (
              <span>{getInitials(player.name)}</span>
            )}
          </div>
          <div className="public-detail-content">
            <h3>{player.name}</h3>
            {player.nickname && <p>{player.nickname}</p>}
            {player.socialUrl && (
              <div className="public-detail-actions">
                <a className="ttc-row-action" href={player.socialUrl} target="_blank" rel="noopener noreferrer">
                  Instagram / Social
                </a>
              </div>
            )}
            <div className="public-detail-grid">
              <DetailFact label="Status Verifikasi" value={player.status} />
              <DetailFact label="Status Profil" value={player.profileStatus} />
              <DetailFact label="PTM" value={player.club} />
              <DetailFact label="Status di PTM" value={player.ptmStatus} />
              <DetailFact label="Divisi" value={player.division} />
              {player.note && <DetailFact label="Keterangan Prestasi" value={player.note} />}
              <DetailFact label="Updated" value={formatDate(player.updatedAt)} />
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
