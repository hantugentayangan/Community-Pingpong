import React, { useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth'
import ImageUploadField from '../components/ImageUploadField'
import {
  formatDate,
  getMyPlayer,
  normalizeExternalUrl,
  normalizeText,
  safeAuditLog,
  toActivityPhotos,
  validateHttpUrl,
} from '../lib/communityData'
import { STORAGE_BUCKETS, buildStoragePath, getImageUrl } from '../lib/storageImages'
import { sendNotification } from '../lib/notifications'

const editableRoles = new Set(['ketua ptm', 'pengurus ptm'])

const emptyForm = {
  name: '',
  city_area: '',
  address: '',
  google_maps_link: '',
  website_url: '',
  instagram_url: '',
  whatsapp: '',
  chairman_name: '',
  training_schedule: '',
  description: '',
  history: '',
  public_note: '',
  logo_url: '',
  logo_position: 'center center',
  activity_photos: '',
  activity_photo_position: 'center center',
}

export default function MyPTM() {
  const { user, profile, loading: authLoading, isAdmin } = useAuth()
  const [player, setPlayer] = useState(null)
  const [ownedPtm, setOwnedPtm] = useState(null)
  const [accessRows, setAccessRows] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(Boolean(supabase))
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user?.id) return
    loadData()
  }, [user?.id])

  async function loadData() {
    if (!supabase || !user?.id) return
    setLoading(true)
    setError('')

    try {
      const [currentPlayer, ownedResult, accessResult] = await Promise.all([
        getMyPlayer(user.id),
        supabase.from('ptm').select('*').eq('created_by', user.id).order('created_at', { ascending: false }).limit(1),
        supabase.from('ptm_access').select('*').eq('user_id', user.id),
      ])

      if (ownedResult.error) throw ownedResult.error
      if (accessResult.error) console.warn('ptm_access read skipped:', accessResult.error.message)

      let owned = ownedResult.data?.[0] || null
      const accessList = accessResult.data || []
      const approvedAccess = accessList.find((row) => {
        const role = normalizeText(row.ptm_role)
        const status = normalizeText(row.access_status)
        return ['ketua', 'ketua ptm', 'pengurus', 'admin', 'manager'].includes(role) && (!status || status === 'approved')
      })

      if (!owned && approvedAccess?.ptm_id) {
        const managed = await supabase.from('ptm').select('*').eq('id', approvedAccess.ptm_id).maybeSingle()
        if (!managed.error) owned = managed.data || null
      }

      if (!owned && currentPlayer?.ptm_name && editableRoles.has(normalizeText(currentPlayer?.ptm_status))) {
        const byName = await supabase.from('ptm').select('*').ilike('name', currentPlayer.ptm_name).maybeSingle()
        if (!byName.error) owned = byName.data || null
      }

      setPlayer(currentPlayer)
      setOwnedPtm(owned)
      setAccessRows(accessList)
      fillForm(owned, currentPlayer)
    } catch (loadError) {
      setError(loadError?.message || 'Data PTM belum bisa dimuat.')
    } finally {
      setLoading(false)
    }
  }

  function fillForm(ptm, currentPlayer) {
    const photoList = toActivityPhotos(ptm?.activity_photos)
    setForm({
      name: ptm?.name || currentPlayer?.ptm_name || '',
      city_area: ptm?.city_area || '',
      address: ptm?.address || '',
      google_maps_link: ptm?.google_maps_link || '',
      website_url: ptm?.website_url || '',
      instagram_url: ptm?.instagram_url || '',
      whatsapp: ptm?.whatsapp || '',
      chairman_name: ptm?.chairman_name || currentPlayer?.full_name || profile?.full_name || '',
      training_schedule: ptm?.training_schedule || '',
      description: ptm?.description || '',
      history: ptm?.history || '',
      public_note: ptm?.public_note || ptm?.ptm_note || '',
      logo_url: getImageUrl(ptm?.logo_url) || '',
      logo_position: ptm?.logo_position || 'center center',
      activity_photos: photoList.map((photo) => getImageUrl(photo)).filter(Boolean).join('\n'),
      activity_photo_position: ptm?.activity_photo_position || 'center center',
    })
  }

  const canCreate = useMemo(() => normalizeText(player?.ptm_status) === 'ketua ptm' && !ownedPtm, [ownedPtm, player?.ptm_status])
  const accessMatch = useMemo(() => {
    if (!ownedPtm?.id) return null
    return accessRows.find((row) => {
      const role = normalizeText(row.ptm_role)
      const status = normalizeText(row.access_status)
      return row.ptm_id === ownedPtm.id && ['ketua', 'ketua ptm', 'pengurus', 'admin', 'manager'].includes(role) && (!status || status === 'approved')
    })
  }, [accessRows, ownedPtm?.id])

  const canEdit = Boolean(
    isAdmin ||
    (ownedPtm?.created_by && ownedPtm.created_by === user?.id) ||
    accessMatch ||
    (ownedPtm && editableRoles.has(normalizeText(player?.ptm_status)) && normalizeText(player?.ptm_name) === normalizeText(ownedPtm.name))
  )

  async function handleSubmit(event) {
    event.preventDefault()
    if (!supabase || !user) return
    setSaving(true)
    setMessage('')
    setError('')

    const activities = toActivityPhotos(form.activity_photos)

    if (!validateHttpUrl(form.google_maps_link)) {
      setError('Google Maps URL harus kosong atau diawali http:// atau https://.')
      setSaving(false)
      return
    }

    if (!ownedPtm && !canCreate) {
      setError('Hanya Ketua PTM yang bisa mendaftarkan PTM baru dari halaman ini.')
      setSaving(false)
      return
    }

    if (ownedPtm && !canEdit) {
      setError('Anda tidak memiliki akses edit untuk PTM ini.')
      setSaving(false)
      return
    }

    const now = new Date().toISOString()
    const payload = {
      name: form.name.trim(),
      city_area: form.city_area.trim() || null,
      address: form.address.trim() || null,
      google_maps_link: form.google_maps_link.trim() || null,
      website_url: normalizeExternalUrl(form.website_url) || null,
      instagram_url: normalizeExternalUrl(form.instagram_url) || null,
      whatsapp: form.whatsapp.replace(/\D/g, '') || null,
      chairman_name: form.chairman_name.trim() || null,
      training_schedule: form.training_schedule.trim() || null,
      description: form.description.trim() || null,
      history: form.history.trim() || null,
      public_note: form.public_note.trim() || null,
      logo_url: form.logo_url.trim() || null,
      logo_position: form.logo_position,
      activity_photos: activities,
      activity_photo_position: form.activity_photo_position,
      updated_by: user.id,
      updated_at: now,
    }

    try {
      const writePayload = async (nextPayload) => ownedPtm
        ? supabase.from('ptm').update(nextPayload).eq('id', ownedPtm.id).select('*').maybeSingle()
        : supabase.from('ptm').insert({
            ...nextPayload,
            status: 'pending',
            ptm_status: 'active',
            created_by: user.id,
            created_at: now,
          }).select('*').maybeSingle()

      let { data, error: saveError } = await writePayload(payload)

      if (saveError && /schema cache|could not find|column/i.test(saveError.message || '')) {
        const fallbackPayload = { ...payload }
        delete fallbackPayload.logo_position
        delete fallbackPayload.activity_photo_position
        delete fallbackPayload.website_url
        delete fallbackPayload.instagram_url
        const retry = await writePayload(fallbackPayload)
        data = retry.data
        saveError = retry.error
      }

      if (saveError) throw saveError

      await safeAuditLog({
        actor: user,
        action: ownedPtm ? 'PTM_UPDATED' : 'PTM_CREATED',
        tableName: 'ptm',
        recordId: data?.id,
        oldData: ownedPtm,
        newData: data,
      })

      await sendNotification('PTM_VERIFICATION_NEEDED', {
        subject: 'Verifikasi PTM/Club Diperlukan',
        message: `${data?.name || form.name} ${ownedPtm ? 'diperbarui' : 'didaftarkan'} dan membutuhkan review admin.`,
        data: {
          ptm_name: data?.name || form.name,
          city_area: data?.city_area,
          chairman_name: data?.chairman_name,
          created_by_email: user.email,
          status: data?.status,
        },
      })

      setOwnedPtm(data)
      setMessage(ownedPtm ? 'PTM berhasil diperbarui.' : 'PTM berhasil didaftarkan dan menunggu verifikasi admin.')
    } catch (saveError) {
      setError(saveError?.message || 'PTM belum bisa disimpan. Cek permission/RLS.')
    } finally {
      setSaving(false)
    }
  }

  function addActivityPhoto(url) {
    const photos = toActivityPhotos(form.activity_photos)
    setForm((current) => ({
      ...current,
      activity_photos: [...photos, url].join('\n'),
    }))
  }

  if (authLoading) return <div className="ttc-page"><div className="ttc-state">Memuat PTM...</div></div>
  if (!user) return <Navigate to="/login" replace />

  const activityPhotos = toActivityPhotos(form.activity_photos)

  return (
    <div className="ttc-page profile-page">
      <section className="ttc-page-hero">
        <span className="ttc-hero-accent"></span>
        <h1>MY PTM/CLUB</h1>
        <p>Ketua PTM bisa mendaftarkan satu PTM. Pengurus hanya bisa edit PTM yang sesuai aksesnya.</p>
      </section>

      {loading && <div className="ttc-state">Memuat data PTM...</div>}
      {message && <div className="inline-info">{message}</div>}
      {error && <div className="inline-error">{error}</div>}

      {!loading && (
        <section className="profile-grid">
          <aside className="profile-summary-card">
            <h2>{ownedPtm?.name || player?.ptm_name || 'PTM Saya'}</h2>
            <p>Status user di PTM: {player?.ptm_status || '-'}</p>
            <div className="profile-status-list">
              <ProfileFact label="Status Verifikasi PTM" value={ownedPtm?.status || (ownedPtm ? 'pending' : '-')} />
              <ProfileFact label="Status PTM" value={ownedPtm?.ptm_status || '-'} />
              <ProfileFact label="Updated" value={formatDate(ownedPtm?.updated_at)} />
            </div>
            {!ownedPtm && !canCreate && (
              <div className="inline-info">
                Untuk mendaftarkan PTM, update status hubungan PTM Anda menjadi Ketua PTM di halaman Profile.
              </div>
            )}
            {ownedPtm && !canEdit && (
              <div className="inline-error">Anda belum punya permission edit untuk PTM ini.</div>
            )}
          </aside>

          <form className="profile-form-card" onSubmit={handleSubmit}>
            <div className="profile-form-header">
              <h2>{ownedPtm ? 'Edit PTM' : 'Daftarkan PTM'}</h2>
              <p>Upload gambar memakai Supabase Storage. File maksimal 2MB: JPG, PNG, atau WEBP.</p>
            </div>

            <div className="form-grid two">
              <FormInput label="Nama PTM" value={form.name} onChange={(value) => setFormValue(setForm, 'name', value)} required disabled={ownedPtm && !canEdit} />
              <FormInput label="Kecamatan / Kota" value={form.city_area} onChange={(value) => setFormValue(setForm, 'city_area', value)} disabled={ownedPtm && !canEdit} />
              <FormInput label="Alamat PTM" value={form.address} onChange={(value) => setFormValue(setForm, 'address', value)} disabled={ownedPtm && !canEdit} />
              <FormInput label="Google Maps URL" value={form.google_maps_link} onChange={(value) => setFormValue(setForm, 'google_maps_link', value)} placeholder="https://maps.google.com/..." disabled={ownedPtm && !canEdit} />
              <FormInput label="Website URL" value={form.website_url} onChange={(value) => setFormValue(setForm, 'website_url', value)} placeholder="https://example.com" disabled={ownedPtm && !canEdit} />
              <FormInput label="Instagram / Social Media URL" value={form.instagram_url} onChange={(value) => setFormValue(setForm, 'instagram_url', value)} placeholder="https://instagram.com/ptmname" disabled={ownedPtm && !canEdit} />
              <FormInput label="WhatsApp Ketua/Pengurus" value={form.whatsapp} onChange={(value) => setFormValue(setForm, 'whatsapp', value)} disabled={ownedPtm && !canEdit} />
              <FormInput label="Nama Ketua" value={form.chairman_name} onChange={(value) => setFormValue(setForm, 'chairman_name', value)} disabled={ownedPtm && !canEdit} />
              <FormInput label="Jadwal Latihan" value={form.training_schedule} onChange={(value) => setFormValue(setForm, 'training_schedule', value)} disabled={ownedPtm && !canEdit} />
            </div>

            <ImageUploadField
              label="Upload Logo / Foto Utama PTM"
              bucket={STORAGE_BUCKETS.ptm}
              pathPrefix={buildStoragePath('ptm', user.id, 'logo')}
              value={form.logo_url}
              position={form.logo_position}
              onUploaded={(url) => setForm((current) => ({ ...current, logo_url: url }))}
              onPositionChange={(value) => setFormValue(setForm, 'logo_position', value)}
              disabled={ownedPtm && !canEdit}
            />

            <ImageUploadField
              label="Upload Foto Kegiatan PTM"
              bucket={STORAGE_BUCKETS.ptmActivity}
              pathPrefix={buildStoragePath('ptm', user.id, 'activities')}
              value={activityPhotos[activityPhotos.length - 1] || ''}
              position={form.activity_photo_position}
              onUploaded={addActivityPhoto}
              onPositionChange={(value) => setFormValue(setForm, 'activity_photo_position', value)}
              disabled={ownedPtm && !canEdit}
            />

            {activityPhotos.length > 0 && (
              <div className="public-photo-strip form-full">
                {activityPhotos.map((photo) => (
                  <img key={photo} src={photo} alt="Foto kegiatan PTM" style={{ objectPosition: form.activity_photo_position }} />
                ))}
              </div>
            )}

            <FormTextarea label="Deskripsi" value={form.description} onChange={(value) => setFormValue(setForm, 'description', value)} disabled={ownedPtm && !canEdit} />
            <FormTextarea label="Sejarah PTM" value={form.history} onChange={(value) => setFormValue(setForm, 'history', value)} disabled={ownedPtm && !canEdit} />
            <FormTextarea label="Keterangan Publik PTM" value={form.public_note} onChange={(value) => setFormValue(setForm, 'public_note', value)} disabled={ownedPtm && !canEdit} />

            <div className="profile-form-actions">
              <button type="submit" className="button primary" disabled={saving || (ownedPtm && !canEdit) || (!ownedPtm && !canCreate)}>
                {saving ? 'Menyimpan...' : ownedPtm ? 'Simpan PTM' : 'Daftarkan PTM'}
              </button>
            </div>
          </form>
        </section>
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

function FormInput({ label, value, onChange, required = false, placeholder = '', disabled = false }) {
  return (
    <label>
      {label}
      <input value={value} onChange={(event) => onChange(event.target.value)} required={required} placeholder={placeholder} disabled={disabled} />
    </label>
  )
}

function FormTextarea({ label, value, onChange, disabled = false }) {
  return (
    <label className="form-full">
      {label}
      <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={5} disabled={disabled} />
    </label>
  )
}
