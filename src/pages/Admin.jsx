import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth'
import ImageUploadField from '../components/ImageUploadField'
import {
  DIVISIONS,
  canAccessAdmin,
  formatDate,
  maskNik,
  normalizeRole,
  normalizeStatus,
  safeAuditLog,
  validateHttpUrl,
} from '../lib/communityData'
import { STORAGE_BUCKETS } from '../lib/storageImages'
import { sendNotification } from '../lib/notifications'
import ittcLogo from '../assets/ittc-logo.jpeg'

const adminMenu = [
  { key: 'overview', label: 'Dashboard' },
  { key: 'players', label: 'Player Approval' },
  { key: 'ptm', label: 'PTM Approval' },
  { key: 'news', label: 'Kelola Berita' },
  { key: 'ads', label: 'Iklan / Marketplace' },
  { key: 'users', label: 'User' },
  { key: 'queue', label: 'Message / Queue' },
  { key: 'config', label: 'Configuration' },
  { key: 'logs', label: 'Log Activity' },
]

const statCards = [
  { key: 'players', label: 'Players', table: 'players' },
  { key: 'clubs', label: 'PTM/Clubs', table: 'ptm' },
  { key: 'news', label: 'News', table: 'news' },
  { key: 'marketplace', label: 'Ads', table: 'ads' },
]

const defaultNewsForm = {
  title: '',
  summary: '',
  content: '',
  photo_url: '',
  photo_position: 'center center',
  status: 'draft',
}

const defaultAdsForm = {
  title: '',
  description: '',
  photo_url: '',
  photo_position: 'center center',
  target_url: '',
  advertiser_name: '',
  seller_city: '',
  ad_type: 'banner',
  status: 'draft',
}

const safeError = (error, fallback) => error?.message || fallback
const isPending = (value) => ['pending', 'pending_duplicate', 'menunggu verifikasi', 'draft', ''].includes(String(value || '').toLowerCase())
const isDuplicateStatus = (value) => String(value || '').toLowerCase() === 'pending_duplicate'
const isMissingOptionalColumnError = (error) => /schema cache|could not find|column/i.test(error?.message || '')

function omitImagePositionFields(payload) {
  const next = { ...payload }
  delete next.photo_position
  delete next.image_position
  delete next.seller_city
  return next
}

export default function Admin() {
  const {
    user,
    profile,
    loading: authLoading,
    profileLoading,
    profileError,
    isAdmin,
    refreshProfile,
    normalizedRole,
    normalizedStatus,
  } = useAuth()
  const [activeModule, setActiveModule] = useState('overview')
  const [counts, setCounts] = useState({})
  const [newsItems, setNewsItems] = useState([])
  const [adsItems, setAdsItems] = useState([])
  const [players, setPlayers] = useState([])
  const [clubs, setClubs] = useState([])
  const [profiles, setProfiles] = useState([])
  const [configs, setConfigs] = useState([])
  const [logs, setLogs] = useState([])
  const [playerDrafts, setPlayerDrafts] = useState({})
  const [ptmDrafts, setPtmDrafts] = useState({})
  const [profileDrafts, setProfileDrafts] = useState({})
  const [configDrafts, setConfigDrafts] = useState({})
  const [loading, setLoading] = useState(Boolean(supabase))
  const [contentLoading, setContentLoading] = useState(Boolean(supabase))
  const [adminLoading, setAdminLoading] = useState(Boolean(supabase))
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [modal, setModal] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [profileLookupDone, setProfileLookupDone] = useState(false)

  const currentUserId = user?.id || null
  const adminAllowed = canAccessAdmin(profile)
  const denyReason = getAdminDenyReason({ user, profile, adminAllowed, normalizedRole, normalizedStatus })

  useEffect(() => {
    setProfileLookupDone(false)
  }, [user?.id])

  useEffect(() => {
    if (authLoading || profileLoading || !user?.id) return
    if (profileError) return
    if (profile) {
      setProfileLookupDone(true)
      return
    }
    let active = true
    refreshProfile?.().finally(() => {
      if (active) setProfileLookupDone(true)
    })
    return () => {
      active = false
    }
  }, [authLoading, profile, profileError, profileLoading, refreshProfile, user?.id])

  useEffect(() => {
    if (profileError) return
    if (authLoading || profileLoading || !user?.id || !profile || adminAllowed) return
    console.warn('Admin access denied by profile gate:', {
      userId: user.id,
      email: user.email,
      profileId: profile.id,
      rawRole: profile.role,
      normalizedRole: normalizedRole || normalizeRole(profile.role),
      rawStatus: profile.status,
      normalizedStatus: normalizedStatus || normalizeStatus(profile.status),
    })
  }, [adminAllowed, authLoading, normalizedRole, normalizedStatus, profile, profileError, profileLoading, user?.email, user?.id])

  useEffect(() => {
    if (authLoading || profileLoading || !adminAllowed) return
    refreshAll()
  }, [adminAllowed, authLoading, profileLoading])

  async function refreshAll() {
    await Promise.all([loadCounts(), loadContent(), loadAdminData()])
  }

  async function loadCounts() {
    if (!supabase) {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const results = await Promise.all(statCards.map(async (card) => {
        const { count, error: queryError } = await supabase
          .from(card.table)
          .select('*', { count: 'exact', head: true })
        if (queryError) throw queryError
        return [card.key, count || 0]
      }))
      setCounts(Object.fromEntries(results))
      setError('')
    } catch (_queryError) {
      setError('Admin statistics could not be loaded.')
    } finally {
      setLoading(false)
    }
  }

  async function loadContent() {
    if (!supabase) {
      setContentLoading(false)
      return
    }

    setContentLoading(true)
    try {
      const [newsResult, adsResult] = await Promise.all([
        supabase.from('news').select('*').order('created_at', { ascending: false }),
        supabase.from('ads').select('*').order('created_at', { ascending: false }),
      ])

      if (newsResult.error) throw newsResult.error
      if (adsResult.error) throw adsResult.error

      setNewsItems(newsResult.data || [])
      setAdsItems(adsResult.data || [])
      setError('')
    } catch (_queryError) {
      setError('Content data could not be loaded.')
    } finally {
      setContentLoading(false)
    }
  }

  async function loadAdminData() {
    if (!supabase) {
      setAdminLoading(false)
      return
    }

    setAdminLoading(true)
    try {
      const [playersResult, clubsResult, profilesResult, configResult, logsResult] = await Promise.all([
        supabase.from('players').select('*').order('created_at', { ascending: false }),
        supabase.from('ptm').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('app_config').select('*').order('key', { ascending: true }),
        supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(100),
      ])

      if (playersResult.error) throw playersResult.error
      if (clubsResult.error) throw clubsResult.error
      if (profilesResult.error) throw profilesResult.error
      if (configResult.error) throw configResult.error
      if (logsResult.error) throw logsResult.error

      setPlayers(playersResult.data || [])
      setClubs(clubsResult.data || [])
      setProfiles(profilesResult.data || [])
      setConfigs(configResult.data || [])
      setLogs(logsResult.data || [])
      setPlayerDrafts(Object.fromEntries((playersResult.data || []).map((player) => [player.id, {
        division: player.division || '',
        status: player.status || 'pending',
        admin_note: player.admin_note || '',
        profile_status: player.profile_status || 'incomplete',
      }])))
      setPtmDrafts(Object.fromEntries((clubsResult.data || []).map((club) => [club.id, {
        status: club.status || 'pending',
        ptm_status: club.ptm_status || 'active',
        admin_note: club.admin_note || '',
        public_note: club.public_note || club.ptm_note || '',
      }])))
      setProfileDrafts(Object.fromEntries((profilesResult.data || []).map((profile) => [profile.id, {
        role: profile.role || 'member',
        status: profile.status || 'active',
      }])))
      setConfigDrafts(Object.fromEntries((configResult.data || []).map((config) => [config.key, config.value || ''])))
      setError('')
    } catch (queryError) {
      setError(safeError(queryError, 'Admin data could not be loaded.'))
    } finally {
      setAdminLoading(false)
    }
  }

  function openCreate(type) {
    setMessage('')
    setModal({ type, mode: 'create', form: type === 'news' ? defaultNewsForm : defaultAdsForm })
  }

  function openEdit(type, item) {
    setMessage('')
    setModal({
      type,
      mode: 'edit',
      item,
      form: type === 'news' ? {
        title: item.title || '',
        summary: item.summary || '',
        content: item.content || '',
        photo_url: item.photo_url || '',
        photo_position: item.photo_position || 'center center',
        status: item.status || 'draft',
      } : {
        title: item.title || '',
        description: item.description || '',
        photo_url: item.photo_url || '',
        photo_position: item.photo_position || 'center center',
        target_url: item.target_url || '',
        advertiser_name: item.advertiser_name || '',
        seller_city: item.seller_city || '',
        ad_type: item.ad_type || 'banner',
        status: item.status || 'draft',
      },
    })
  }

  async function handleSubmitModal(event) {
    event.preventDefault()
    if (!modal || !supabase) return
    setMessage('')
    setError('')

    try {
      if (modal.type === 'ads' && !validateHttpUrl(modal.form.target_url)) {
        setError('Target URL harus kosong atau diawali http:// atau https://.')
        return
      }

      const table = modal.type === 'news' ? 'news' : 'ads'
      const payload = buildPayload(modal.type, modal.form, currentUserId, modal.mode)
      const writeContent = (nextPayload) => modal.mode === 'create'
        ? supabase.from(table).insert(nextPayload).select('*').maybeSingle()
        : supabase.from(table).update(nextPayload).eq('id', modal.item.id).select('*').maybeSingle()

      let { data, error: submitError } = await writeContent(payload)
      if (submitError && isMissingOptionalColumnError(submitError)) {
        const retry = await writeContent(omitImagePositionFields(payload))
        data = retry.data
        submitError = retry.error
      }
      if (submitError) throw submitError

      await safeAuditLog({
        actor: user,
        action: `${modal.type === 'news' ? 'NEWS' : 'ADS'}_${modal.mode === 'create' ? 'CREATED' : 'UPDATED'}`,
        tableName: table,
        recordId: data?.id || modal.item?.id,
        oldData: modal.item || null,
        newData: data,
      })

      setModal(null)
      setMessage(`${modal.type === 'news' ? 'News' : 'Ads'} berhasil ${modal.mode === 'create' ? 'dibuat' : 'diperbarui'}.`)
      await refreshAll()
    } catch (submitError) {
      setError(safeError(submitError, 'Data belum bisa disimpan. Cek permission/RLS admin.'))
    }
  }

  async function handleDelete() {
    if (!confirmDelete || !supabase) return
    setMessage('')
    setError('')

    try {
      const table = confirmDelete.type === 'news' ? 'news' : 'ads'
      const { error: deleteError } = await supabase.from(table).delete().eq('id', confirmDelete.item.id)
      if (deleteError) throw deleteError

      await safeAuditLog({
        actor: user,
        action: `${confirmDelete.type === 'news' ? 'NEWS' : 'ADS'}_DELETED`,
        tableName: table,
        recordId: confirmDelete.item.id,
        oldData: confirmDelete.item,
      })

      setConfirmDelete(null)
      setMessage(`${confirmDelete.type === 'news' ? 'News' : 'Ads'} berhasil dihapus.`)
      await refreshAll()
    } catch (deleteError) {
      setError(safeError(deleteError, 'Data belum bisa dihapus. Cek permission/RLS admin.'))
    }
  }

  async function toggleStatus(type, item) {
    if (!supabase) return
    setMessage('')
    setError('')

    const table = type === 'news' ? 'news' : 'ads'
    const current = item.status || (type === 'news' ? 'draft' : 'inactive')
    const nextStatus = type === 'news'
      ? (current === 'published' ? 'draft' : 'published')
      : (current === 'active' ? 'inactive' : 'active')

    try {
      const payload = currentUserId ? { status: nextStatus, updated_by: currentUserId } : { status: nextStatus }
      const { data, error: statusError } = await supabase.from(table).update(payload).eq('id', item.id).select('*').maybeSingle()
      if (statusError) throw statusError

      await safeAuditLog({
        actor: user,
        action: `${type === 'news' ? 'NEWS' : 'ADS'}_UPDATED`,
        tableName: table,
        recordId: item.id,
        oldData: item,
        newData: data,
      })

      setMessage(`Status ${type === 'news' ? 'news' : 'ads'} berhasil diubah ke ${nextStatus}.`)
      await refreshAll()
    } catch (statusError) {
      setError(safeError(statusError, 'Status belum bisa diperbarui. Cek permission/RLS admin.'))
    }
  }

  async function savePlayer(player, override = {}) {
    if (!supabase) return
    const draft = { ...(playerDrafts[player.id] || {}), ...override }
    const nextStatus = draft.status || player.status || 'pending'
    const payload = {
      division: draft.division || player.division || null,
      status: nextStatus,
      admin_note: draft.admin_note || null,
      profile_status: nextStatus === 'approved'
        ? 'complete'
        : (draft.profile_status || player.profile_status || 'incomplete'),
      updated_at: new Date().toISOString(),
    }

    if (nextStatus === 'approved') {
      payload.verified_at = new Date().toISOString()
      payload.verified_by = user?.id || null
    }

    const updatedPlayer = await updateRow('players', player.id, payload, player, playerActionName(player, payload))
    if (updatedPlayer && ['approved', 'rejected'].includes(nextStatus) && player.user_id) {
      const { data: updatedProfile, error: profileError } = await supabase
        .from('profiles')
        .update({ status: nextStatus, updated_at: new Date().toISOString() })
        .eq('id', player.user_id)
        .select('*')
        .maybeSingle()

      if (profileError) {
        setError(safeError(profileError, 'Status profile user belum bisa disinkronkan.'))
      } else {
        await safeAuditLog({
          actor: user,
          action: 'PROFILE_STATUS_SYNCED_FROM_PLAYER',
          tableName: 'profiles',
          recordId: player.user_id,
          oldData: null,
          newData: updatedProfile,
        })
      }
    }
    if (updatedPlayer && ['approved', 'rejected'].includes(nextStatus) && player.email) {
      await sendNotification('PLAYER_VERIFICATION_RESULT', {
        to: player.email,
        subject: 'Status Verifikasi Pemain Anda',
        message: `Status verifikasi pemain Anda berubah menjadi ${nextStatus}.`,
        data: {
          email: player.email,
          full_name: player.full_name,
          status: nextStatus,
          division: updatedPlayer.division,
          admin_note: updatedPlayer.admin_note,
        },
      })
    }
  }

  async function savePtm(club, override = {}) {
    if (!supabase) return
    const draft = { ...(ptmDrafts[club.id] || {}), ...override }
    const nextStatus = draft.status || club.status || 'pending'
    const payload = {
      status: nextStatus,
      ptm_status: draft.ptm_status || club.ptm_status || 'active',
      admin_note: draft.admin_note || null,
      public_note: draft.public_note || null,
      updated_at: new Date().toISOString(),
      updated_by: user?.id || null,
    }

    if (nextStatus === 'approved') {
      payload.verified_at = new Date().toISOString()
      payload.verified_by = user?.id || null
    }

    const updatedPtm = await updateRow('ptm', club.id, payload, club, ptmActionName(club, payload))
    if (updatedPtm && ['approved', 'rejected'].includes(nextStatus) && club.chairman_email) {
      await sendNotification('PTM_VERIFICATION_RESULT', {
        to: club.chairman_email,
        subject: 'Status Verifikasi PTM Anda',
        message: `Status verifikasi PTM ${club.name || ''} berubah menjadi ${nextStatus}.`,
        data: {
          ptm_name: club.name,
          status: nextStatus,
          admin_note: updatedPtm.admin_note,
        },
      })
    }
  }

  async function saveProfile(row) {
    if (!supabase) return
    const draft = profileDrafts[row.id] || {}
    await updateRow('profiles', row.id, {
      role: draft.role || row.role || 'member',
      status: draft.status || row.status || 'active',
      updated_at: new Date().toISOString(),
    }, row, 'USER_UPDATED')
  }

  async function saveConfig(config) {
    if (!supabase) return
    const nextValue = configDrafts[config.key] || ''
    if (config.key === 'WEB_APP_URL' && nextValue && !validateHttpUrl(nextValue)) {
      setError('WEB_APP_URL harus kosong atau diawali http:// atau https://.')
      return
    }

    await updateRow('app_config', config.key, {
      value: nextValue,
      updated_at: new Date().toISOString(),
    }, config, 'CONFIG_UPDATED', 'key')
  }

  async function updateRow(table, id, payload, oldData, action, idField = 'id') {
    setMessage('')
    setError('')

    try {
      const { data, error: updateError } = await supabase
        .from(table)
        .update(payload)
        .eq(idField, id)
        .select('*')
        .maybeSingle()
      if (updateError) throw updateError

      await safeAuditLog({
        actor: user,
        action,
        tableName: table,
        recordId: id,
        oldData,
        newData: data,
      })

      setMessage('Perubahan berhasil disimpan.')
      await refreshAll()
      return data
    } catch (updateError) {
      setError(safeError(updateError, 'Data belum bisa diperbarui. Cek permission/RLS admin.'))
      return null
    }
  }

  const queueItems = useMemo(() => [
    ...players.filter((player) => isPending(player.status)).map((player) => ({
      id: `player-${player.id}`,
      title: player.full_name || player.email || 'Player pending',
      type: isDuplicateStatus(player.status) ? 'Player duplicate NIK' : 'Player pending',
      target: 'players',
    })),
    ...clubs.filter((club) => isPending(club.status)).map((club) => ({
      id: `ptm-${club.id}`,
      title: club.name || 'PTM pending',
      type: 'PTM pending',
      target: 'ptm',
    })),
    ...newsItems.filter((item) => item.status === 'draft').map((item) => ({
      id: `news-${item.id}`,
      title: item.title || 'News draft',
      type: 'News draft',
      target: 'news',
    })),
    ...adsItems.filter((item) => item.status === 'draft').map((item) => ({
      id: `ads-${item.id}`,
      title: item.title || 'Ads draft',
      type: 'Ads draft',
      target: 'ads',
    })),
  ], [adsItems, clubs, newsItems, players])

  const activeContent = useMemo(() => {
    if (activeModule === 'news') {
      return (
        <ContentManager
          type="news"
          title="Kelola Berita"
          description="Create, edit, publish, unpublish, and delete community news."
          items={newsItems}
          loading={contentLoading}
          onCreate={() => openCreate('news')}
          onEdit={(item) => openEdit('news', item)}
          onDelete={(item) => setConfirmDelete({ type: 'news', item })}
          onToggle={(item) => toggleStatus('news', item)}
        />
      )
    }

    if (activeModule === 'ads') {
      return (
        <ContentManager
          type="ads"
          title="Iklan / Marketplace"
          description="Manage sponsor, ads, marketplace, and promotion banners."
          items={adsItems}
          loading={contentLoading}
          onCreate={() => openCreate('ads')}
          onEdit={(item) => openEdit('ads', item)}
          onDelete={(item) => setConfirmDelete({ type: 'ads', item })}
          onToggle={(item) => toggleStatus('ads', item)}
        />
      )
    }

    if (activeModule === 'players') {
      return <PlayerApproval players={players} drafts={playerDrafts} setDrafts={setPlayerDrafts} onSave={savePlayer} loading={adminLoading} />
    }

    if (activeModule === 'ptm') {
      return <PtmApproval clubs={clubs} drafts={ptmDrafts} setDrafts={setPtmDrafts} onSave={savePtm} loading={adminLoading} />
    }

    if (activeModule === 'users') {
      return <UserManagement profiles={profiles} drafts={profileDrafts} setDrafts={setProfileDrafts} onSave={saveProfile} loading={adminLoading} />
    }

    if (activeModule === 'queue') {
      return <Queue items={queueItems} setActiveModule={setActiveModule} />
    }

    if (activeModule === 'config') {
      return <Configuration configs={configs} drafts={configDrafts} setDrafts={setConfigDrafts} onSave={saveConfig} loading={adminLoading} />
    }

    if (activeModule === 'logs') {
      return <AuditLogs logs={logs} loading={adminLoading} />
    }

    return <Overview counts={counts} loading={loading} queueCount={queueItems.length} setActiveModule={setActiveModule} />
  }, [activeModule, adsItems, adminLoading, clubs, configDrafts, configs, contentLoading, counts, loading, logs, newsItems, players, playerDrafts, profiles, profileDrafts, ptmDrafts, queueItems])

  if (authLoading || profileLoading || (user?.id && !profile && !profileLookupDone && !profileError)) {
    return <div className="ttc-page"><div className="ttc-state">Memuat akses admin dari profil...</div></div>
  }

  if (profileError && user?.id && !profile) {
    return (
      <div className="ttc-page">
        <section className="ttc-list-card admin-access-card">
          <h1>Profil admin belum bisa dibaca</h1>
          <p>Supabase mengembalikan error saat membaca profil. Kemungkinan besar policy RLS profiles masih recursion.</p>
          <p>Jalankan file SQL emergency: <strong>supabase/manual_sql/20260617_fix_rls_recursion_profiles_500.sql</strong>, lalu refresh halaman ini.</p>
          {import.meta.env.DEV && <p className="field-warning">Debug Supabase: {profileError}</p>}
          <Link to="/" className="ttc-row-action">Kembali ke Home</Link>
        </section>
      </div>
    )
  }

  if (!isAdmin || !adminAllowed) {
    return (
      <div className="ttc-page">
        <section className="ttc-list-card admin-access-card">
          <h1>Akses admin ditolak</h1>
          <p>Halaman ini hanya untuk admin. Silakan login dengan akun admin yang sudah disetujui.</p>
          {import.meta.env.DEV && <p className="field-warning">Debug akses: {denyReason}</p>}
          <Link to="/login" className="ttc-row-action">Login</Link>
        </section>
      </div>
    )
  }

  return (
    <div className="ttc-dashboard-shell admin-shell">
      <aside className="ttc-dashboard-sidebar">
        <Link to="/" className="dashboard-brand">
          <img className="brand-logo" src={ittcLogo} alt="Indonesian Table Tennis Community" />
          <span>Admin<br />Console</span>
        </Link>
        <nav>
          {adminMenu.map((item, index) => (
            <button
              key={item.key}
              type="button"
              className={activeModule === item.key ? 'active' : ''}
              onClick={() => setActiveModule(item.key)}
            >
              <span>{index + 1}</span>{item.label}
              {item.key === 'queue' && queueItems.length > 0 && <em className="menu-badge">{queueItems.length}</em>}
            </button>
          ))}
        </nav>
      </aside>

      <main className="ttc-dashboard-main">
        <section className="dashboard-welcome">
          <div>
            <h1>Admin Dashboard</h1>
            <p>Approval pemain/PTM, content, configuration, dan audit log.</p>
          </div>
          <span className="dashboard-role">{normalizedRole || normalizeRole(profile?.role)}</span>
        </section>

        {message && <div className="inline-info">{message}</div>}
        {error && <div className="inline-error">{error}</div>}

        {activeContent}
      </main>

      {modal && (
        <EditorModal
          modal={modal}
          setModal={setModal}
          onSubmit={handleSubmitModal}
          currentUserId={currentUserId}
        />
      )}

      {confirmDelete && (
        <ConfirmDeleteModal
          type={confirmDelete.type}
          item={confirmDelete.item}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  )
}

function getAdminDenyReason({ user, profile, adminAllowed, normalizedRole, normalizedStatus }) {
  if (!user?.id) return 'no session'
  if (!profile?.id) return 'profile missing'
  if (adminAllowed) return 'allowed'
  if (!['admin', 'superadmin'].includes(normalizedRole || normalizeRole(profile.role))) return 'role not admin'
  if (['rejected', 'pending_duplicate'].includes(normalizedStatus || normalizeStatus(profile.status))) return 'status blocked'
  return 'unknown'
}

function playerActionName(player, payload) {
  if (payload.status === 'approved' && player.status !== 'approved') return 'PLAYER_APPROVED'
  if (payload.status === 'rejected' && player.status !== 'rejected') return 'PLAYER_REJECTED'
  if (payload.division !== player.division) return 'PLAYER_DIVISION_CHANGED'
  return 'PLAYER_UPDATED'
}

function ptmActionName(club, payload) {
  if (payload.status === 'approved' && club.status !== 'approved') return 'PTM_APPROVED'
  if (payload.status === 'rejected' && club.status !== 'rejected') return 'PTM_REJECTED'
  return 'PTM_UPDATED'
}

function buildPayload(type, form, currentUserId, mode) {
  const auditFields = currentUserId
    ? mode === 'create'
      ? { created_by: currentUserId, updated_by: currentUserId }
      : { updated_by: currentUserId }
    : {}

  if (type === 'news') {
    return {
      title: form.title.trim(),
      summary: form.summary.trim() || null,
      content: form.content.trim() || null,
      photo_url: form.photo_url.trim() || null,
      photo_position: form.photo_position || 'center center',
      status: form.status,
      ...auditFields,
    }
  }

  return {
    title: form.title.trim() || null,
    description: form.description.trim() || null,
    photo_url: form.photo_url.trim() || null,
    photo_position: form.photo_position || 'center center',
    target_url: form.target_url.trim() || null,
    advertiser_name: form.advertiser_name.trim() || null,
    seller_city: form.seller_city.trim() || null,
    ad_type: form.ad_type.trim() || 'banner',
    status: form.status,
    ...auditFields,
  }
}

function Overview({ counts, loading, queueCount, setActiveModule }) {
  return (
    <>
      {loading && <div className="ttc-state">Loading admin statistics...</div>}
      <section className="dashboard-stats-grid">
        {statCards.map((card) => (
          <article className="dashboard-stat-card" key={card.key}>
            <span>{card.label}</span>
            <strong>{counts[card.key] ?? 0}</strong>
          </article>
        ))}
      </section>

      <section className="dashboard-panel admin-table-panel">
        <div className="ttc-admin-section-header">
          <div>
            <h2>Management Modules</h2>
            <p>{queueCount} item menunggu review di message/verification queue.</p>
          </div>
          <button type="button" className="ttc-row-action" onClick={() => setActiveModule('queue')}>Open Queue</button>
        </div>
        <div className="admin-module-table">
          <ModuleRow title="Player Approval" text="Verifikasi pemain agar tampil di halaman Players." />
          <ModuleRow title="PTM Approval" text="Approve/reject PTM sebelum tampil publik." />
          <ModuleRow title="Configuration" text="Edit key-value public/admin config dari app_config." />
          <ModuleRow title="Log Activity" text="Audit trail perubahan penting." />
        </div>
      </section>
    </>
  )
}

function ModuleRow({ title, text }) {
  return (
    <div className="admin-module-row">
      <strong>{title}</strong>
      <span>{text}</span>
      <span className="admin-module-badge">Ready</span>
    </div>
  )
}

function PlayerApproval({ players, drafts, setDrafts, onSave, loading }) {
  return (
    <section className="dashboard-panel ttc-admin-section">
      <div className="ttc-admin-section-header">
        <div>
          <h2>Player Approval</h2>
          <p>Public Players hanya menampilkan pemain approved dan active.</p>
        </div>
      </div>
      {loading && <div className="ttc-state">Loading players...</div>}
      {!loading && players.length === 0 && <div className="ttc-state">Belum ada data pemain.</div>}
      {!loading && players.length > 0 && (
        <div className="ttc-admin-table-wrap">
          <table className="ttc-admin-table approval-table">
            <thead>
              <tr>
                <th>Player</th>
                <th>KTP</th>
                <th>Birth/Phone</th>
                <th>PTM</th>
                <th>Division</th>
                <th>Status</th>
                <th>Admin Note</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {players.map((player) => {
                const draft = drafts[player.id] || {}
                return (
                  <tr key={player.id}>
                    <td>
                      <strong>{player.full_name || '-'}</strong>
                      <small>{player.email || '-'}</small>
                      {isDuplicateStatus(player.status) && <small className="field-warning">Indikasi NIK/KTP duplikat. Review admin diperlukan.</small>}
                    </td>
                    <td>{maskNik(player.identity_number)}</td>
                    <td><strong>{formatDate(player.birth_date)}</strong><small>{player.phone || '-'}</small></td>
                    <td>{player.ptm_name || '-'}</td>
                    <td>
                      <select value={draft.division || player.division || 'Divisi 11'} onChange={(event) => updateDraft(setDrafts, player.id, 'division', event.target.value)}>
                        <option value="">Pilih divisi</option>
                        {DIVISIONS.map((division) => <option key={division} value={division}>{division}</option>)}
                      </select>
                    </td>
                    <td>
                      <select value={draft.status || player.status || 'pending'} onChange={(event) => updateDraft(setDrafts, player.id, 'status', event.target.value)}>
                        <option value="pending">pending</option>
                        <option value="approved">approved</option>
                        <option value="rejected">rejected</option>
                      </select>
                      <select value={draft.profile_status || player.profile_status || 'incomplete'} onChange={(event) => updateDraft(setDrafts, player.id, 'profile_status', event.target.value)}>
                        <option value="complete">complete</option>
                        <option value="incomplete">incomplete</option>
                        <option value="active">active</option>
                        <option value="inactive">inactive</option>
                      </select>
                    </td>
                    <td>
                      <textarea value={draft.admin_note || ''} onChange={(event) => updateDraft(setDrafts, player.id, 'admin_note', event.target.value)} placeholder="Catatan admin" />
                      {player.player_note && <small>{player.player_note}</small>}
                    </td>
                    <td>
                      <div className="admin-action-row">
                        <button type="button" onClick={() => onSave(player)}>Save</button>
                        <button type="button" onClick={() => onSave(player, { status: 'approved' })}>Approve</button>
                        <button type="button" className="danger" onClick={() => onSave(player, { status: 'rejected' })}>Reject</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function PtmApproval({ clubs, drafts, setDrafts, onSave, loading }) {
  return (
    <section className="dashboard-panel ttc-admin-section">
      <div className="ttc-admin-section-header">
        <div>
          <h2>PTM Approval</h2>
          <p>Public PTM hanya menampilkan PTM approved dan active.</p>
        </div>
      </div>
      {loading && <div className="ttc-state">Loading PTM...</div>}
      {!loading && clubs.length === 0 && <div className="ttc-state">Belum ada data PTM.</div>}
      {!loading && clubs.length > 0 && (
        <div className="ttc-admin-table-wrap">
          <table className="ttc-admin-table approval-table">
            <thead>
              <tr>
                <th>PTM</th>
                <th>Ketua/Kontak</th>
                <th>Lokasi</th>
                <th>Status</th>
                <th>Admin Note</th>
                <th>Keterangan Publik</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {clubs.map((club) => {
                const draft = drafts[club.id] || {}
                return (
                  <tr key={club.id}>
                    <td><strong>{club.name || '-'}</strong><small>{club.description || '-'}</small></td>
                    <td><strong>{club.chairman_name || '-'}</strong><small>{club.whatsapp || club.chairman_phone || '-'}</small></td>
                    <td><strong>{club.city_area || '-'}</strong><small>{club.address || '-'}</small></td>
                    <td>
                      <select value={draft.status || club.status || 'pending'} onChange={(event) => updateDraft(setDrafts, club.id, 'status', event.target.value)}>
                        <option value="pending">pending</option>
                        <option value="approved">approved</option>
                        <option value="rejected">rejected</option>
                      </select>
                      <select value={draft.ptm_status || club.ptm_status || 'active'} onChange={(event) => updateDraft(setDrafts, club.id, 'ptm_status', event.target.value)}>
                        <option value="active">active</option>
                        <option value="inactive">inactive</option>
                      </select>
                    </td>
                    <td><textarea value={draft.admin_note || ''} onChange={(event) => updateDraft(setDrafts, club.id, 'admin_note', event.target.value)} /></td>
                    <td><textarea value={draft.public_note || ''} onChange={(event) => updateDraft(setDrafts, club.id, 'public_note', event.target.value)} /></td>
                    <td>
                      <div className="admin-action-row">
                        <button type="button" onClick={() => onSave(club)}>Save</button>
                        <button type="button" onClick={() => onSave(club, { status: 'approved' })}>Approve</button>
                        <button type="button" className="danger" onClick={() => onSave(club, { status: 'rejected' })}>Reject</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function UserManagement({ profiles, drafts, setDrafts, onSave, loading }) {
  return (
    <section className="dashboard-panel ttc-admin-section">
      <div className="ttc-admin-section-header">
        <div>
          <h2>User Management</h2>
          <p>User tidak butuh approval untuk login. Admin hanya mengelola role/status.</p>
        </div>
      </div>
      {loading && <div className="ttc-state">Loading users...</div>}
      {!loading && profiles.length === 0 && <div className="ttc-state">Belum ada user profile.</div>}
      {!loading && profiles.length > 0 && (
        <div className="ttc-admin-table-wrap">
          <table className="ttc-admin-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((profile) => {
                const draft = drafts[profile.id] || {}
                return (
                  <tr key={profile.id}>
                    <td>
                      <strong>{profile.full_name || '-'}</strong>
                      <small>{profile.email || '-'}</small>
                      {isDuplicateStatus(profile.status) && <small className="field-warning">Indikasi NIK/KTP duplikat. Reject jika bukan akun valid.</small>}
                    </td>
                    <td>
                      <select value={draft.role || profile.role || 'member'} onChange={(event) => updateDraft(setDrafts, profile.id, 'role', event.target.value)}>
                        <option value="member">member</option>
                        <option value="admin">admin</option>
                        <option value="super_admin">super_admin</option>
                      </select>
                    </td>
                    <td>
                      <select value={draft.status || profile.status || 'active'} onChange={(event) => updateDraft(setDrafts, profile.id, 'status', event.target.value)}>
                        <option value="pending">pending</option>
                        <option value="pending_duplicate">pending_duplicate</option>
                        <option value="active">active</option>
                        <option value="approved">approved</option>
                        <option value="rejected">rejected</option>
                        <option value="suspended">suspended</option>
                      </select>
                    </td>
                    <td>{formatDate(profile.created_at)}</td>
                    <td><button type="button" className="ttc-row-action" onClick={() => onSave(profile)}>Save</button></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function Queue({ items, setActiveModule }) {
  return (
    <section className="dashboard-panel ttc-admin-section">
      <div className="ttc-admin-section-header">
        <div>
          <h2>Message / Verification Queue</h2>
          <p>Daftar internal item yang butuh review admin. Tidak real-time dan tidak mengirim email.</p>
        </div>
      </div>
      {items.length === 0 && <div className="ttc-state">Tidak ada item pending.</div>}
      {items.length > 0 && (
        <div className="admin-module-table">
          {items.map((item) => (
            <button key={item.id} type="button" className="admin-module-row queue-row" onClick={() => setActiveModule(item.target)}>
              <strong>{item.title}</strong>
              <span>{item.type}</span>
              <span className="admin-module-badge">Open</span>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}

function Configuration({ configs, drafts, setDrafts, onSave, loading }) {
  return (
    <section className="dashboard-panel ttc-admin-section">
      <div className="ttc-admin-section-header">
        <div>
          <h2>Configuration</h2>
          <p>Edit key-value dari app_config. WEB_APP_URL harus kosong atau URL http/https.</p>
        </div>
      </div>
      {loading && <div className="ttc-state">Loading configuration...</div>}
      {!loading && configs.length === 0 && <div className="ttc-state">Belum ada app_config.</div>}
      {!loading && configs.length > 0 && (
        <div className="ttc-admin-table-wrap">
          <table className="ttc-admin-table config-table">
            <thead>
              <tr>
                <th>Key</th>
                <th>Value</th>
                <th>Description</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {configs.map((config) => (
                <tr key={config.key}>
                  <td><strong>{config.key}</strong><small>{config.is_public ? 'public' : 'admin/private'}</small></td>
                  <td>
                    <textarea value={drafts[config.key] || ''} onChange={(event) => setDrafts((current) => ({ ...current, [config.key]: event.target.value }))} />
                    {config.key === 'WEB_APP_URL' && drafts[config.key] && !validateHttpUrl(drafts[config.key]) && (
                      <small className="field-warning">WEB_APP_URL harus diawali http:// atau https://.</small>
                    )}
                  </td>
                  <td>{config.description || '-'}</td>
                  <td><button type="button" className="ttc-row-action" onClick={() => onSave(config)}>Save</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function AuditLogs({ logs, loading }) {
  return (
    <section className="dashboard-panel ttc-admin-section">
      <div className="ttc-admin-section-header">
        <div>
          <h2>Log Activity</h2>
          <p>Audit trail perubahan penting. Jika RLS log menolak insert user biasa, aplikasi tidak crash.</p>
        </div>
      </div>
      {loading && <div className="ttc-state">Loading logs...</div>}
      {!loading && logs.length === 0 && <div className="ttc-state">Belum ada audit log.</div>}
      {!loading && logs.length > 0 && (
        <div className="ttc-admin-table-wrap">
          <table className="ttc-admin-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Table</th>
                <th>Record</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td>{formatDate(log.created_at)}</td>
                  <td>{log.actor_email || log.actor_id || '-'}</td>
                  <td><span className="status-pill">{log.action || '-'}</span></td>
                  <td>{log.table_name || '-'}</td>
                  <td className="truncate-cell">{log.record_id || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function updateDraft(setDrafts, id, field, value) {
  setDrafts((current) => ({
    ...current,
    [id]: {
      ...(current[id] || {}),
      [field]: value,
    },
  }))
}

function ContentManager({ type, title, description, items, loading, onCreate, onEdit, onDelete, onToggle }) {
  return (
    <section className="dashboard-panel ttc-admin-section">
      <div className="ttc-admin-section-header">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <button type="button" className="ttc-row-action" onClick={onCreate}>
          Create {type === 'news' ? 'News' : 'Ads'}
        </button>
      </div>

      {loading && <div className="ttc-state">Loading {type === 'news' ? 'news' : 'ads'}...</div>}
      {!loading && items.length === 0 && <div className="ttc-state">No {type === 'news' ? 'news yet.' : 'ads yet.'}</div>}

      {!loading && items.length > 0 && (
        <div className="ttc-admin-table-wrap">
          <table className="ttc-admin-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>{type === 'news' ? 'Summary' : 'Advertiser'}</th>
                <th>Status</th>
                <th>{type === 'news' ? 'Created' : 'Target URL'}</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <ContentRow
                  key={item.id}
                  type={type}
                  item={item}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onToggle={onToggle}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function ContentRow({ type, item, onEdit, onDelete, onToggle }) {
  const title = item.title || '(Untitled)'
  const status = item.status || (type === 'news' ? 'draft' : 'inactive')
  const secondary = type === 'news' ? (item.summary || '-') : (item.advertiser_name || '-')
  const dateOrUrl = type === 'news' ? formatDate(item.created_at) : (item.target_url || '-')
  const toggleText = type === 'news'
    ? status === 'published' ? 'Unpublish' : 'Publish'
    : status === 'active' ? 'Deactivate' : 'Activate'

  return (
    <tr>
      <td>
        <strong>{title}</strong>
        {type === 'ads' && item.ad_type && <small>{item.ad_type}</small>}
      </td>
      <td>{secondary}</td>
      <td><span className={`status-pill status-${status}`}>{status}</span></td>
      <td className="truncate-cell">{dateOrUrl}</td>
      <td>
        <div className="admin-action-row">
          <button type="button" onClick={() => onEdit(item)}>Edit</button>
          <button type="button" onClick={() => onToggle(item)}>{toggleText}</button>
          <button type="button" className="danger" onClick={() => onDelete(item)}>Delete</button>
        </div>
      </td>
    </tr>
  )
}

function EditorModal({ modal, setModal, onSubmit, currentUserId }) {
  const isNews = modal.type === 'news'
  const title = `${modal.mode === 'create' ? 'Create' : 'Edit'} ${isNews ? 'News' : 'Ads'}`

  return (
    <div className="ttc-modal-overlay" role="presentation">
      <section className="ttc-modal-card ttc-admin-modal" role="dialog" aria-modal="true" aria-labelledby="admin-editor-title">
        <div className="ttc-modal-header">
          <h2 id="admin-editor-title">{title}</h2>
          <button type="button" onClick={() => setModal(null)} aria-label="Close modal">×</button>
        </div>

        <form onSubmit={onSubmit} className="ttc-admin-form">
          {isNews ? (
            <NewsFields modal={modal} setModal={setModal} currentUserId={currentUserId} />
          ) : (
            <AdsFields modal={modal} setModal={setModal} currentUserId={currentUserId} />
          )}

          <div className="ttc-modal-footer">
            <button type="button" className="button secondary" onClick={() => setModal(null)}>Cancel</button>
            <button type="submit" className="button primary">Save</button>
          </div>
        </form>
      </section>
    </div>
  )
}

function NewsFields({ modal, setModal, currentUserId }) {
  const pathPrefix = `news/${modal.item?.id || currentUserId || 'draft'}`

  return (
    <>
      <FormInput label="Title" required value={modal.form.title} onChange={(value) => updateModalForm(setModal, 'title', value)} />
      <FormInput label="Summary" value={modal.form.summary} onChange={(value) => updateModalForm(setModal, 'summary', value)} />
      <FormTextarea label="Content" value={modal.form.content} onChange={(value) => updateModalForm(setModal, 'content', value)} />
      <ImageUploadField
        label="Upload Foto Berita"
        bucket={STORAGE_BUCKETS.news}
        pathPrefix={pathPrefix}
        value={modal.form.photo_url}
        position={modal.form.photo_position}
        onUploaded={(url) => updateModalForm(setModal, 'photo_url', url)}
        onPositionChange={(value) => updateModalForm(setModal, 'photo_position', value)}
      />
      <FormSelect label="Status" value={modal.form.status} onChange={(value) => updateModalForm(setModal, 'status', value)} options={['draft', 'published', 'archived']} />
    </>
  )
}

function AdsFields({ modal, setModal, currentUserId }) {
  const pathPrefix = `ads/${modal.item?.id || currentUserId || 'draft'}`

  return (
    <>
      <FormInput label="Title" value={modal.form.title} onChange={(value) => updateModalForm(setModal, 'title', value)} />
      <FormInput label="Advertiser Name" value={modal.form.advertiser_name} onChange={(value) => updateModalForm(setModal, 'advertiser_name', value)} />
      <FormInput label="Seller City / Location" value={modal.form.seller_city} onChange={(value) => updateModalForm(setModal, 'seller_city', value)} placeholder="Example: Bekasi" />
      <FormTextarea label="Description" value={modal.form.description} onChange={(value) => updateModalForm(setModal, 'description', value)} />
      <ImageUploadField
        label="Upload Foto Iklan / Marketplace"
        bucket={STORAGE_BUCKETS.ads}
        pathPrefix={pathPrefix}
        value={modal.form.photo_url}
        position={modal.form.photo_position}
        onUploaded={(url) => updateModalForm(setModal, 'photo_url', url)}
        onPositionChange={(value) => updateModalForm(setModal, 'photo_position', value)}
      />
      <FormInput label="Target URL" value={modal.form.target_url} onChange={(value) => updateModalForm(setModal, 'target_url', value)} placeholder="https://example.com" />
      <FormInput label="Ad Type" value={modal.form.ad_type} onChange={(value) => updateModalForm(setModal, 'ad_type', value)} />
      <FormSelect label="Status" value={modal.form.status} onChange={(value) => updateModalForm(setModal, 'status', value)} options={['draft', 'active', 'inactive', 'archived']} />
    </>
  )
}

function updateModalForm(setModal, field, value) {
  setModal((current) => ({
    ...current,
    form: {
      ...current.form,
      [field]: value,
    },
  }))
}

function FormInput({ label, value, onChange, required = false, placeholder = '' }) {
  return (
    <label>
      {label}
      <input value={value} onChange={(event) => onChange(event.target.value)} required={required} placeholder={placeholder} />
    </label>
  )
}

function FormTextarea({ label, value, onChange }) {
  return (
    <label>
      {label}
      <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={5} />
    </label>
  )
}

function FormSelect({ label, value, onChange, options }) {
  return (
    <label>
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  )
}

function ConfirmDeleteModal({ type, item, onCancel, onConfirm }) {
  return (
    <div className="ttc-modal-overlay" role="presentation">
      <section className="ttc-modal-card ttc-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="delete-title">
        <div className="ttc-modal-header">
          <h2 id="delete-title">Confirm Delete</h2>
          <button type="button" onClick={onCancel} aria-label="Close modal">×</button>
        </div>
        <div className="ttc-confirm-body">
          <p>Are you sure you want to delete this {type === 'news' ? 'news' : 'ads'} item?</p>
          <strong>{item.title || '(Untitled)'}</strong>
        </div>
        <div className="ttc-modal-footer">
          <button type="button" className="button secondary" onClick={onCancel}>Cancel</button>
          <button type="button" className="button danger" onClick={onConfirm}>Delete</button>
        </div>
      </section>
    </div>
  )
}
