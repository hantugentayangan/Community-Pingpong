import React, { useEffect, useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth'
import ImageUploadField from '../components/ImageUploadField'
import {
  DIVISIONS,
  PTM_RELATION_OPTIONS,
  fetchMyPtmMemberships,
  formatDate,
  getMembershipDisplayLabel,
  getMembershipPtmName,
  getOrCreateProfile,
  getMyPlayer,
  isApprovedStatus,
  normalizeText,
  normalizeExternalUrl,
  normalizeDivision,
  safeAuditLog,
  setPrimaryPtmMembership,
  syncPlayerFromProfile,
  upsertProfile,
} from '../lib/communityData'
import { STORAGE_BUCKETS, buildStoragePath } from '../lib/storageImages'
import { sendNotification } from '../lib/notifications'

const emptyForm = {
  fullName: '',
  phone: '',
  address: '',
  photoUrl: '',
  photoPosition: 'center center',
  ptmName: '',
  ptmStatus: 'Tidak tergabung PTM',
  division: 'Divisi 11',
  playerNote: '',
  socialUrl: '',
}

export default function Profile() {
  const { user, profile, loading: authLoading, refreshProfile } = useAuth()
  const [player, setPlayer] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(Boolean(supabase))
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [avatarFailed, setAvatarFailed] = useState(false)
  const [memberships, setMemberships] = useState([])
  const [membershipsError, setMembershipsError] = useState(false)
  const [primarySavingId, setPrimarySavingId] = useState('')

  useEffect(() => {
    if (!user?.id) return
    loadProfile()
  }, [user?.id])

  async function loadProfile() {
    setLoading(true)
    setError('')
    const currentProfile = await getOrCreateProfile(user)
    const currentPlayer = await getMyPlayer(user.id)
    await loadMemberships()
    const metadata = user?.user_metadata || {}
    const savedDivision = normalizeDivision(
      currentPlayer?.division ||
      currentProfile?.division ||
      profile?.division ||
      metadata.division ||
      metadata.divisi ||
      ''
    ) || 'Divisi 11'
    setPlayer(currentPlayer)
    setForm({
      fullName: currentPlayer?.full_name || currentProfile?.full_name || profile?.full_name || user?.user_metadata?.full_name || '',
      phone: currentPlayer?.phone || currentProfile?.phone || profile?.phone || user?.user_metadata?.phone || '',
      address: currentPlayer?.address || '',
      photoUrl: currentPlayer?.photo_url || currentProfile?.avatar_url || profile?.avatar_url || '',
      photoPosition: currentPlayer?.photo_position || currentProfile?.avatar_position || profile?.avatar_position || 'center center',
      ptmName: currentPlayer?.ptm_name || '',
      ptmStatus: currentPlayer?.ptm_status || 'Tidak tergabung PTM',
      division: savedDivision,
      playerNote: currentPlayer?.player_note || '',
      socialUrl: currentPlayer?.social_url || '',
    })
    setLoading(false)
  }

  async function loadMemberships() {
    if (!user?.id) return []
    try {
      const currentMemberships = await fetchMyPtmMemberships(user.id)
      setMemberships(currentMemberships)
      setMembershipsError(false)
      return currentMemberships
    } catch (membershipError) {
      console.warn('Profile memberships fetch error:', membershipError?.message)
      setMemberships([])
      setMembershipsError(true)
      return []
    }
  }

  const divisionLocked = useMemo(() => isApprovedStatus(player?.status), [player?.status])
  const initials = useMemo(() => {
    const source = form.fullName || user?.email || 'Member'
    return source.split(/\s+/).slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join('')
  }, [form.fullName, user?.email])

  async function handleSubmit(event) {
    event.preventDefault()
    if (!supabase || !user) return
    setSaving(true)
    setMessage('')
    setError('')

    try {
      const parentProfile = await upsertProfile({
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        email: user.email,
        division: form.division,
        avatar_url: form.photoUrl.trim(),
        avatar_position: form.photoPosition,
      }, user)

      if (!parentProfile?.id) {
        throw new Error('Profile akun belum tersimpan. Jalankan SQL policy profiles insert own profile di Supabase, lalu login ulang.')
      }

      let nextPlayer = null
      let playerSyncError = null

      try {
        nextPlayer = await syncPlayerFromProfile(parentProfile, {
          fullName: form.fullName.trim(),
          phone: form.phone.trim(),
          address: form.address.trim(),
          photo_url: form.photoUrl.trim(),
          photo_position: form.photoPosition,
          ptm_name: form.ptmName.trim(),
          ptm_status: form.ptmStatus,
          division: divisionLocked ? player?.division : form.division,
          player_note: form.playerNote.trim(),
          social_url: normalizeExternalUrl(form.socialUrl),
        })
      } catch (syncError) {
        playerSyncError = syncError
      }

      if (nextPlayer) {
        await safeAuditLog({
          actor: user,
          action: 'PROFILE_UPDATED',
          tableName: 'players',
          recordId: nextPlayer?.id || player?.id || user.id,
          oldData: player,
          newData: nextPlayer,
        })
        setPlayer(nextPlayer)
        await sendNotification('PROFILE_UPDATED', {
          subject: 'Update Profile Pemain - Table Tennis Community',
          message: `${nextPlayer.full_name || user.email} memperbarui profile pemain.`,
          data: {
            email: user.email,
            full_name: nextPlayer.full_name,
            division: nextPlayer.division,
            ptm_name: nextPlayer.ptm_name,
          },
        })
      }

      await refreshProfile()

      if (playerSyncError) {
        setMessage('Data akun berhasil disimpan, tetapi data pemain belum tersinkron.')
        setError(playerSyncError?.message || 'Player sync gagal. Cek policy/RLS players dan profiles.')
      } else {
        setMessage('Profil berhasil diperbarui.')
      }
    } catch (saveError) {
      setError(saveError?.message || 'Profil belum bisa diperbarui. Cek koneksi atau permission RLS.')
    } finally {
      setSaving(false)
    }
  }

  async function handleSetPrimary(membership) {
    if (!membership?.id || primarySavingId) return
    setPrimarySavingId(membership.id)
    setMessage('')
    setError('')

    try {
      await setPrimaryPtmMembership(membership.id)
      await loadMemberships()
      setMessage('Primary PTM berhasil diperbarui.')
    } catch (primaryError) {
      const text = normalizeText(primaryError?.message)
      console.warn('Set primary PTM failed:', primaryError?.message)

      if (text.includes('approved membership not found')) {
        setError('Only approved PTM memberships can be set as Primary PTM.')
      } else if (text.includes('another user') || text.includes('not allowed')) {
        setError('Unable to set Primary PTM for this membership.')
      } else {
        setError('Unable to update Primary PTM. Please try again.')
      }
    } finally {
      setPrimarySavingId('')
    }
  }

  if (authLoading) {
    return <div className="ttc-page"><div className="ttc-state">Memuat profil...</div></div>
  }

  if (!user) return <Navigate to="/login" replace />

  return (
    <div className="ttc-page profile-page">
      <section className="ttc-page-hero">
        <span className="ttc-hero-accent"></span>
        <h1>MY PROFILE</h1>
        <p>Kelola data publik pemain tanpa menampilkan KTP atau data sensitif.</p>
      </section>

      {loading && <div className="ttc-state">Memuat data profile...</div>}
      {message && <div className="inline-info">{message}</div>}
      {error && <div className="inline-error">{error}</div>}

      {!loading && (
        <>
          <section className="profile-grid">
            <aside className="profile-summary-card">
              <div className="profile-avatar-large">
                {form.photoUrl && !avatarFailed ? (
                  <img
                    src={form.photoUrl}
                    alt={form.fullName}
                    style={{ objectPosition: form.photoPosition }}
                    onError={() => setAvatarFailed(true)}
                  />
                ) : (
                  <span>{initials}</span>
                )}
              </div>
              <h2>{form.fullName || 'Member'}</h2>
              <p>{user.email}</p>
              <div className="profile-status-list">
                <ProfileFact label="Role" value={profile?.role || 'member'} />
                <ProfileFact label="Status Verifikasi" value={player?.status || 'pending'} />
                <ProfileFact label="Divisi" value={player?.division || form.division} />
                <ProfileFact label="Tanggal Lahir" value={player?.birth_date ? formatDate(player.birth_date) : 'Tersimpan saat registrasi'} />
              </div>
              <Link className="ttc-row-action" to="/dashboard">Kembali ke Dashboard</Link>
            </aside>

            <form className="profile-form-card" onSubmit={handleSubmit}>
              <div className="profile-form-header">
                <h2>Update Profile</h2>
                <p>No KTP/NIK tidak ditampilkan dan tidak bisa diedit dari halaman ini.</p>
              </div>

              <div className="form-grid two">
                <FormInput label="Full Name" value={form.fullName} onChange={(value) => setFormValue(setForm, 'fullName', value)} required />
                <FormInput label="WhatsApp / Phone" value={form.phone} onChange={(value) => setFormValue(setForm, 'phone', value)} required />
                <FormInput label="Alamat / Lokasi" value={form.address} onChange={(value) => setFormValue(setForm, 'address', value)} />
                <FormInput label="Nama PTM / Club" value={form.ptmName} onChange={(value) => setFormValue(setForm, 'ptmName', value)} />
                <FormInput
                  label="Social Media URL / Instagram"
                  value={form.socialUrl}
                  onChange={(value) => setFormValue(setForm, 'socialUrl', value)}
                  placeholder="https://instagram.com/username"
                />
                <FormSelect label="Status Hubungan PTM" value={form.ptmStatus} onChange={(value) => setFormValue(setForm, 'ptmStatus', value)} options={PTM_RELATION_OPTIONS} />
                <FormSelect label="Divisi" value={form.division} onChange={(value) => setFormValue(setForm, 'division', value)} options={DIVISIONS} disabled={divisionLocked} />
              </div>

              <ImageUploadField
                label="Upload Foto Profil"
                bucket={STORAGE_BUCKETS.avatar}
                pathPrefix={buildStoragePath('profiles', user.id, 'avatars')}
                value={form.photoUrl}
                position={form.photoPosition}
                onUploaded={(url) => {
                  setAvatarFailed(false)
                  setForm((current) => ({ ...current, photoUrl: url }))
                }}
                onPositionChange={(value) => setFormValue(setForm, 'photoPosition', value)}
              />

              {divisionLocked && (
                <div className="inline-info">Divisi terkunci karena pemain sudah diverifikasi. Perubahan divisi hanya bisa dilakukan admin.</div>
              )}

              <FormTextarea
                label="Keterangan Pemain / Prestasi"
                value={form.playerNote}
                onChange={(value) => setFormValue(setForm, 'playerNote', value)}
                placeholder="Contoh: Juara 1 Turnamen Bekasi Open 2024 Divisi 10"
              />

              <div className="profile-form-actions">
                <button type="submit" className="button primary" disabled={saving}>
                  {saving ? 'Menyimpan...' : 'Simpan Profile'}
                </button>
              </div>
            </form>
          </section>

          <MembershipListPanel
            memberships={memberships}
            error={membershipsError}
            primarySavingId={primarySavingId}
            onSetPrimary={handleSetPrimary}
          />
        </>
      )}
    </div>
  )
}

function setFormValue(setForm, field, value) {
  setForm((current) => ({ ...current, [field]: value }))
}

function ProfileFact({ label, value }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value || '-'}</strong>
    </div>
  )
}

function MembershipListPanel({ memberships, error, primarySavingId, onSetPrimary }) {
  return (
    <section className="profile-form-card membership-profile-card">
      <div className="profile-form-header">
        <h2>PTM Memberships</h2>
        <p>Data ini dibaca dari membership resmi PTM, bukan dari field legacy profile.</p>
      </div>

      {error && <div className="inline-info">Membership PTM belum bisa dimuat saat ini.</div>}
      {!error && memberships.length === 0 && <div className="ttc-state">Belum ada membership PTM.</div>}

      {!error && memberships.length > 0 && (
        <div className="membership-list">
          {memberships.map((membership) => (
            <article className="membership-list-card" key={membership.id}>
              <div>
                <strong>{getMembershipPtmName(membership) || 'PTM Membership'}</strong>
                <span>{membership.role || 'member'}</span>
              </div>
              <div className="membership-badge-row">
                <span className={`membership-badge ${membership.status || 'pending'}`}>{membership.status || 'pending'}</span>
                {membership.is_primary && <span className="membership-badge primary">{getMembershipDisplayLabel(membership)}</span>}
                {normalizeText(membership.status) === 'approved' && !membership.is_primary && (
                  <button
                    type="button"
                    className="membership-primary-button"
                    disabled={primarySavingId === membership.id}
                    onClick={() => onSetPrimary(membership)}
                  >
                    {primarySavingId === membership.id ? 'Saving...' : 'Set as Primary'}
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

function FormInput({ label, value, onChange, required = false, placeholder = '', disabled = false }) {
  return (
    <label>
      {label}
      <input value={value} onChange={(event) => onChange(event.target.value)} required={required} placeholder={placeholder} disabled={disabled} />
    </label>
  )
}

function FormSelect({ label, value, onChange, options, disabled = false }) {
  return (
    <label>
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled}>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  )
}

function FormTextarea({ label, value, onChange, placeholder = '' }) {
  return (
    <label className="form-full">
      {label}
      <textarea value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} rows={5} />
    </label>
  )
}
