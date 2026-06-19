import { supabase } from './supabaseClient'

export const DIVISIONS = Array.from({ length: 11 }, (_, index) => `Divisi ${index + 1}`)

export const PTM_RELATION_OPTIONS = [
  'Tidak tergabung PTM',
  'Anggota PTM',
  'Ketua PTM',
  'Pengurus PTM',
  'Pelatih',
]

export const ADMIN_ROLES = ['admin', 'superadmin']
export const SUPER_ADMIN_ROLES = ['superadmin']
export const IMAGE_POSITION_OPTIONS = [
  { label: 'Center', value: 'center center' },
  { label: 'Top', value: 'center top' },
  { label: 'Bottom', value: 'center bottom' },
  { label: 'Left', value: 'left center' },
  { label: 'Right', value: 'right center' },
]

const ACTIVE_VALUES = new Set(['active', 'aktif', 'approved', 'terverifikasi', 'verified', 'complete'])
const APPROVED_VALUES = new Set(['approved', 'active', 'aktif', 'terverifikasi', 'verified', 'true'])
const IMAGE_EXTENSION_REGEX = /\.(jpg|jpeg|png|webp)(\?.*)?$/i
const MISSING_COLUMN_PATTERNS = [
  'schema cache',
  'column',
  'could not find',
]
const PROFILE_OPTIONAL_COLUMNS = [
  'identity_number',
  'birth_date',
  'division',
  'avatar_url',
  'avatar_position',
]
export const DUPLICATE_IDENTITY_MESSAGE = 'NIK/KTP sudah terdaftar. Silakan gunakan akun yang sudah terdaftar atau hubungi admin.'

export function cleanDigits(value) {
  return String(value || '').replace(/\D/g, '')
}

export function normalizeText(value) {
  return String(value || '').trim().toLowerCase()
}

export function normalizeRole(value) {
  const role = normalizeText(value).replace(/[\s-]+/g, '_')
  if (!role) return 'member'
  if (role === 'super_admin' || role === 'superadmin') return 'superadmin'
  if (role === 'admin') return 'admin'
  if (role === 'member') return 'member'
  return role
}

export function normalizeDivision(value) {
  const text = String(value || '').trim()
  if (!text) return ''
  const exact = DIVISIONS.find((division) => normalizeText(division) === normalizeText(text))
  if (exact) return exact

  const match = text.match(/\d+/)
  if (!match) return text

  const divisionNumber = Number(match[0])
  if (divisionNumber >= 1 && divisionNumber <= 11) return `Divisi ${divisionNumber}`
  return text
}

function firstFilled(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && String(value).trim() !== '') return value
  }
  return ''
}

function compactPayload(payload) {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined)
  )
}

export function isAdminRole(value) {
  return ADMIN_ROLES.includes(normalizeRole(value))
}

export function isSuperAdminRole(value) {
  return SUPER_ADMIN_ROLES.includes(normalizeRole(value))
}

export function normalizeStatus(value) {
  const status = normalizeText(value)
  if (!status) return 'pending'
  if (['active', 'aktif', 'approved', 'terverifikasi', 'verified', 'complete'].includes(status)) {
    return 'approved'
  }
  if (['pending', 'pending_duplicate', 'rejected'].includes(status)) return status
  return status
}

export function isBlockedStatus(value) {
  return ['rejected', 'pending_duplicate'].includes(normalizeStatus(value))
}

export function canAccessAdmin(profile) {
  return Boolean(profile && isAdminRole(profile.role) && !isBlockedStatus(profile.status))
}

export function isApprovedStatus(value) {
  return normalizeStatus(value) === 'approved' || APPROVED_VALUES.has(normalizeText(value))
}

export function isActiveStatus(value, fallback = true) {
  if (value === undefined || value === null || String(value).trim() === '') return fallback
  return ACTIVE_VALUES.has(normalizeText(value))
}

export function maskNik(value) {
  const digits = cleanDigits(value)
  if (digits.length < 8) return digits ? `${digits.slice(0, 2)}****` : '-'
  return `${digits.slice(0, 4)}********${digits.slice(-4)}`
}

export function validateNikWithBirthDate(nikValue, birthDateValue) {
  const nik = cleanDigits(nikValue)
  if (!/^\d{16}$/.test(nik)) {
    return {
      valid: false,
      message: 'No KTP/NIK wajib 16 digit angka tanpa huruf, spasi, atau simbol.',
    }
  }

  if (!birthDateValue) {
    return { valid: false, message: 'Tanggal lahir wajib diisi.' }
  }

  const birthDate = new Date(`${birthDateValue}T00:00:00`)
  if (Number.isNaN(birthDate.getTime())) {
    return { valid: false, message: 'Tanggal lahir tidak valid.' }
  }

  const nikDay = Number(nik.slice(6, 8))
  const nikMonth = nik.slice(8, 10)
  const nikYear = nik.slice(10, 12)
  const birthDay = birthDate.getDate()
  const birthMonth = String(birthDate.getMonth() + 1).padStart(2, '0')
  const birthYear = String(birthDate.getFullYear()).slice(-2)
  const validDay = nikDay === birthDay || nikDay === birthDay + 40

  if (!validDay || nikMonth !== birthMonth || nikYear !== birthYear) {
    return {
      valid: false,
      message: 'No KTP/NIK tidak sesuai dengan tanggal lahir. Untuk perempuan, tanggal pada NIK biasanya ditambah 40.',
    }
  }

  return { valid: true, nik }
}

export async function checkIdentityNumberAvailability(identityNumber, currentUserId = null) {
  const nik = cleanDigits(identityNumber)
  if (!supabase || !nik) {
    return { available: true, identityNumber: nik, conflict: null, belongsToCurrentUser: false }
  }

  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc('check_identity_number_conflict', {
      input_identity: nik,
    })

    if (!rpcError && Array.isArray(rpcData) && rpcData.length > 0) {
      const conflict = rpcData[0]
      const belongsToCurrentUser = Boolean(currentUserId && conflict.profile_id === currentUserId)
      return {
        available: !conflict.is_duplicate || belongsToCurrentUser,
        identityNumber: nik,
        conflict,
        belongsToCurrentUser,
      }
    }
  } catch (_error) {
    // Fallback to direct table lookup when the RPC has not been installed yet.
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id,email,status')
    .eq('identity_number', nik)
    .maybeSingle()

  if (error) {
    console.warn('NIK duplicate lookup failed:', error.message)
    return { available: true, identityNumber: nik, conflict: null, belongsToCurrentUser: false, lookupError: error }
  }

  if (!data?.id) {
    return { available: true, identityNumber: nik, conflict: null, belongsToCurrentUser: false }
  }

  const belongsToCurrentUser = Boolean(currentUserId && data.id === currentUserId)
  return {
    available: belongsToCurrentUser,
    identityNumber: nik,
    conflict: data,
    belongsToCurrentUser,
  }
}

export async function assertIdentityNumberAvailable(identityNumber, currentUserId = null) {
  const result = await checkIdentityNumberAvailability(identityNumber, currentUserId)
  if (!result.available) throw new Error(DUPLICATE_IDENTITY_MESSAGE)
  return result
}

export function validateHttpUrl(value) {
  const text = String(value || '').trim()
  return !text || /^https?:\/\//i.test(text)
}

export function normalizeExternalUrl(value) {
  const text = String(value || '').trim()
  if (!text) return ''
  if (/^https?:\/\//i.test(text)) return text
  if (/^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(text)) return `https://${text}`
  return ''
}

export function validateImageUrl(value) {
  const text = String(value || '').trim()
  if (!text) return true
  if (!validateHttpUrl(text)) return false
  if (/\.(mp4|mov|avi|mkv|webm)(\?.*)?$/i.test(text)) return false
  return IMAGE_EXTENSION_REGEX.test(text)
}

export function toActivityPhotos(value) {
  if (Array.isArray(value)) return value.filter(Boolean)
  const text = String(value || '').trim()
  if (!text) return []
  try {
    const parsed = JSON.parse(text)
    if (Array.isArray(parsed)) return parsed.filter(Boolean)
  } catch (_error) {
    // Text input may be a comma/newline separated list.
  }
  return text
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

export function formatDate(value) {
  if (!value) return '-'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString('id-ID')
}

export function getPlayerPhoto(row) {
  return row?.photo_url || row?.avatar_url || row?.foto_url || ''
}

export function getAuthRedirectUrl(path = '/login') {
  if (typeof window === 'undefined') return `https://tabletenniscommunity.netlify.app${path}`
  return `${window.location.origin}${path}`
}

function isMissingColumnError(error) {
  const message = normalizeText(error?.message)
  if (!message) return false
  return MISSING_COLUMN_PATTERNS.some((pattern) => message.includes(pattern))
}

function omitOptionalColumns(payload) {
  const next = { ...payload }
  delete next.photo_position
  delete next.avatar_position
  delete next.logo_position
  delete next.image_position
  delete next.activity_photo_position
  delete next.social_url
  delete next.website_url
  delete next.instagram_url
  return next
}

function omitProfileOptionalColumns(payload) {
  const next = { ...payload }
  PROFILE_OPTIONAL_COLUMNS.forEach((column) => {
    delete next[column]
  })
  return next
}

function getRegisterData(user, override = {}, existing = {}) {
  const metadata = user?.user_metadata || {}
  const identityNumber = cleanDigits(firstFilled(
    override.nik,
    override.identity_number,
    metadata.identity_number,
    metadata.nik,
    existing.identity_number,
  ))
  const division = normalizeDivision(firstFilled(
    override.division,
    override.divisi,
    metadata.division,
    metadata.divisi,
    existing.division,
  ))

  return {
    email: firstFilled(user?.email, override.email, existing.email),
    fullName: firstFilled(
      override.fullName,
      override.full_name,
      metadata.full_name,
      metadata.fullName,
      existing.full_name,
    ),
    phone: firstFilled(override.phone, metadata.phone, existing.phone),
    identityNumber,
    birthDate: firstFilled(
      override.birthDate,
      override.birth_date,
      metadata.birth_date,
      metadata.birthDate,
      existing.birth_date,
    ),
    division,
    avatarUrl: firstFilled(override.avatar_url, override.photo_url, existing.avatar_url),
    avatarPosition: firstFilled(override.avatar_position, override.photo_position, existing.avatar_position, 'center center'),
  }
}

async function getConfiguredRoleForEmail(email) {
  if (!supabase || !email) return null
  const normalizedEmail = normalizeText(email)
  const { data, error } = await supabase
    .from('app_config')
    .select('key,value')
    .in('key', ['ADMIN_EMAIL', 'ADMIN_EMAILS', 'SUPERADMIN_EMAIL', 'SUPERADMIN_EMAILS'])

  if (error || !data?.length) return null

  const valuesByKey = Object.fromEntries(data.map((item) => [item.key, item.value || '']))
  const superEmails = [
    valuesByKey.SUPERADMIN_EMAIL,
    valuesByKey.SUPERADMIN_EMAILS,
  ].join(',').split(',').map(normalizeText).filter(Boolean)
  const adminEmails = [
    valuesByKey.ADMIN_EMAIL,
    valuesByKey.ADMIN_EMAILS,
  ].join(',').split(',').map(normalizeText).filter(Boolean)

  if (superEmails.includes(normalizedEmail)) return 'superadmin'
  if (adminEmails.includes(normalizedEmail)) return 'admin'
  return null
}

export async function getCurrentUser(providedUser = null) {
  if (!supabase) return null
  if (providedUser?.id) return providedUser

  const { data, error } = await supabase.auth.getUser()
  if (error) {
    console.warn('getCurrentUser failed:', error.message)
    return null
  }
  return data?.user || null
}

export async function getCurrentProfile(providedUser = null) {
  if (!supabase) return null
  const user = await getCurrentUser(providedUser)
  if (!user?.id) return null

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (error) {
    console.warn('getCurrentProfile failed:', error.message)
    return null
  }
  return data || null
}

export async function getOrCreateProfile(userOrRegisterData = null, optionalRegisterData = {}) {
  if (!supabase) return null

  const hasProvidedUser = Boolean(userOrRegisterData?.id)
  const user = await getCurrentUser(hasProvidedUser ? userOrRegisterData : null)
  if (!user?.id) return null

  const now = new Date().toISOString()
  const registerOverride = hasProvidedUser ? optionalRegisterData : (userOrRegisterData || {})
  const metadata = user?.user_metadata || {}
  const configuredRole = await getConfiguredRoleForEmail(user.email || registerOverride.email)
  const existing = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  const registerData = getRegisterData(user, registerOverride, existing.data || {})
  const identityCheck = registerData.identityNumber
    ? await checkIdentityNumberAvailability(registerData.identityNumber, user.id)
    : { available: true }
  const hasDuplicateIdentity = Boolean(registerData.identityNumber && !identityCheck.available)
  if (hasDuplicateIdentity) {
    console.warn(`Duplicate identity_number ${registerData.identityNumber} detected for ${user.email || registerData.email}. Marking profile pending_duplicate without saving duplicate NIK.`)
  }
  const sharedPayload = compactPayload({
    email: registerData.email || '',
    full_name: registerData.fullName || '',
    phone: registerData.phone || '',
    identity_number: hasDuplicateIdentity ? undefined : (registerData.identityNumber || undefined),
    birth_date: registerData.birthDate || undefined,
    division: registerData.division || undefined,
    avatar_url: registerData.avatarUrl || undefined,
    avatar_position: registerData.avatarPosition || 'center center',
    updated_at: now,
  })

  if (!existing.error && existing.data) {
    const existingRole = normalizeRole(existing.data.role)
    const shouldUpgradeConfiguredAdmin = configuredRole && !isAdminRole(existingRole)
    const updatePayload = {
      ...sharedPayload,
      ...(shouldUpgradeConfiguredAdmin ? { role: configuredRole } : {}),
      ...(hasDuplicateIdentity ? { status: 'pending_duplicate' } : {}),
    }

    let updated = await supabase
      .from('profiles')
      .update(updatePayload)
      .eq('id', user.id)
      .select('*')
      .maybeSingle()

    if (updated.error && isMissingColumnError(updated.error)) {
      updated = await supabase
        .from('profiles')
        .update(omitProfileOptionalColumns(updatePayload))
        .eq('id', user.id)
        .select('*')
        .maybeSingle()
    }

    if (!updated.error && updated.data) return updated.data
    console.warn('ensureProfile update failed, using existing profile:', updated.error?.message)
    return existing.data
  }

  const payload = {
    id: user.id,
    ...sharedPayload,
    role: registerOverride.role || configuredRole || metadata.role || 'member',
    status: hasDuplicateIdentity ? 'pending_duplicate' : (registerOverride.status || metadata.status || 'pending'),
    created_at: now,
  }

  let inserted = await supabase
    .from('profiles')
    .insert(payload)
    .select('*')
    .maybeSingle()

  if (inserted.error && isMissingColumnError(inserted.error)) {
    inserted = await supabase
      .from('profiles')
      .insert(omitProfileOptionalColumns(payload))
      .select('*')
      .maybeSingle()
  }

  if (!inserted.error && inserted.data) return inserted.data

  console.warn('ensureProfile insert failed, trying select fallback:', inserted.error?.message)
  const fallback = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (fallback.error) {
    console.warn('ensureProfile select fallback failed:', fallback.error.message)
    return null
  }

  return fallback.data || null
}

export async function ensureProfile(user, optionalRegisterData = {}) {
  return getOrCreateProfile(user, optionalRegisterData)
}

export async function upsertProfile(payload = {}, providedUser = null) {
  if (!supabase) return null
  const user = await getCurrentUser(providedUser)
  if (!user?.id) return null

  const existing = await getCurrentProfile(user)
  const now = new Date().toISOString()
  const registerData = getRegisterData(user, payload, existing || {})
  if (registerData.identityNumber) {
    await assertIdentityNumberAvailable(registerData.identityNumber, user.id)
  }
  const upsertPayload = compactPayload({
    id: user.id,
    email: registerData.email || user.email || '',
    full_name: registerData.fullName || '',
    phone: registerData.phone || '',
    identity_number: registerData.identityNumber || undefined,
    birth_date: registerData.birthDate || undefined,
    division: registerData.division || undefined,
    avatar_url: registerData.avatarUrl || undefined,
    avatar_position: registerData.avatarPosition || 'center center',
    role: payload.role || existing?.role || undefined,
    status: payload.status || existing?.status || undefined,
    updated_at: now,
    created_at: existing?.created_at || now,
  })

  let result = await supabase
    .from('profiles')
    .upsert(upsertPayload, { onConflict: 'id' })
    .select('*')
    .maybeSingle()

  if (result.error && isMissingColumnError(result.error)) {
    result = await supabase
      .from('profiles')
      .upsert(omitProfileOptionalColumns(upsertPayload), { onConflict: 'id' })
      .select('*')
      .maybeSingle()
  }

  if (result.error) {
    console.warn('upsertProfile failed:', result.error.message)
    throw result.error
  }

  return result.data || null
}

export async function getMyPlayer(userId) {
  if (!supabase || !userId) return null
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    console.warn('getMyPlayer failed:', error.message)
    return null
  }

  return data || null
}

export async function fetchMyPtmMemberships(userId) {
  if (!supabase || !userId) return []
  const { data, error } = await supabase
    .from('ptm_memberships')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .order('requested_at', { ascending: false })

  if (error) {
    console.warn('fetchMyPtmMemberships failed:', error.message)
    throw error
  }

  return enrichMembershipsWithPtm(data || [])
}

export async function fetchMyPtmMembershipForPtm(userId, ptmId) {
  if (!supabase || !userId || !ptmId) return null
  const { data, error } = await supabase
    .from('ptm_memberships')
    .select('*')
    .eq('user_id', userId)
    .eq('ptm_id', ptmId)
    .order('created_at', { ascending: false })
    .order('requested_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.warn('fetchMyPtmMembershipForPtm failed:', error.message)
    throw error
  }

  const enriched = await enrichMembershipsWithPtm(data ? [data] : [])
  return enriched[0] || null
}

export async function fetchApprovedPtmMembershipsForUsers(userIds = []) {
  const ids = [...new Set((userIds || []).filter(Boolean))]
  if (!supabase || !ids.length) return []

  const { data, error } = await supabase
    .from('ptm_memberships')
    .select('*')
    .in('user_id', ids)
    .eq('status', 'approved')
    .order('is_primary', { ascending: false })
    .order('created_at', { ascending: false })
    .order('requested_at', { ascending: false })

  if (error) {
    console.warn('fetchApprovedPtmMembershipsForUsers failed:', error.message)
    throw error
  }

  return enrichMembershipsWithPtm(data || [])
}

export async function fetchApprovedMembershipsForPtm(ptmId) {
  if (!supabase || !ptmId) return []

  const { data, error } = await supabase
    .from('ptm_memberships')
    .select('*')
    .eq('ptm_id', ptmId)
    .eq('status', 'approved')
    .order('is_primary', { ascending: false })
    .order('created_at', { ascending: true })
    .order('requested_at', { ascending: true })

  if (error) {
    console.warn('fetchApprovedMembershipsForPtm failed:', error.message)
    throw error
  }

  const withPeople = await enrichMembershipsWithPeople(data || [])
  return sortApprovedMemberships(withPeople)
}

export async function fetchApprovedMembershipCountForPtm(ptmId) {
  if (!supabase || !ptmId) return 0

  const { count, error } = await supabase
    .from('ptm_memberships')
    .select('id', { count: 'exact', head: true })
    .eq('ptm_id', ptmId)
    .eq('status', 'approved')

  if (error) {
    console.warn('fetchApprovedMembershipCountForPtm failed:', error.message)
    throw error
  }

  return count || 0
}

export async function fetchApprovedMembershipCountsForPtms(ptmIds = []) {
  const ids = [...new Set((ptmIds || []).filter(Boolean))]
  if (!supabase || !ids.length) return {}

  const { data, error } = await supabase
    .from('ptm_memberships')
    .select('ptm_id')
    .in('ptm_id', ids)
    .eq('status', 'approved')

  if (error) {
    console.warn('fetchApprovedMembershipCountsForPtms failed:', error.message)
    throw error
  }

  return (data || []).reduce((counts, membership) => {
    if (!membership.ptm_id) return counts
    counts[membership.ptm_id] = (counts[membership.ptm_id] || 0) + 1
    return counts
  }, {})
}

export async function fetchOfficialPtmMembershipForUser(userId) {
  if (!userId) return null
  const memberships = await fetchApprovedPtmMembershipsForUsers([userId])
  return pickDisplayPtmMembership(memberships)
}

export async function setPrimaryPtmMembership(membershipId) {
  if (!supabase || !membershipId) return null
  const { data, error } = await supabase.rpc('set_primary_ptm_membership', {
    target_membership_id: membershipId,
  })

  if (error) {
    console.warn('setPrimaryPtmMembership failed:', error.message)
    throw error
  }

  return data || null
}

export async function promotePtmMemberToPengurus(membershipId) {
  if (!supabase || !membershipId) return null
  const { data, error } = await supabase.rpc('promote_ptm_member_to_pengurus', {
    target_membership_id: membershipId,
  })

  if (error) {
    console.warn('promotePtmMemberToPengurus failed:', error.message)
    throw error
  }

  return data || null
}

export async function demotePtmPengurusToMember(membershipId) {
  if (!supabase || !membershipId) return null
  const { data, error } = await supabase.rpc('demote_ptm_pengurus_to_member', {
    target_membership_id: membershipId,
  })

  if (error) {
    console.warn('demotePtmPengurusToMember failed:', error.message)
    throw error
  }

  return data || null
}

export function pickDisplayPtmMembership(memberships = []) {
  const approved = (memberships || []).filter((membership) => normalizeText(membership?.status) === 'approved')
  return approved.find((membership) => membership.is_primary) || approved[0] || null
}

export function getMembershipPtmName(membership) {
  return membership?.ptm?.name || membership?.ptm?.club_name || membership?.ptm?.nama_ptm || ''
}

export function getMembershipDisplayLabel(membership) {
  if (!membership) return ''
  return membership.is_primary ? 'Primary PTM' : 'PTM Membership'
}

async function enrichMembershipsWithPtm(memberships = []) {
  const rows = memberships || []
  const ptmIds = [...new Set(rows.map((membership) => membership.ptm_id).filter(Boolean))]
  if (!supabase || !ptmIds.length) return rows

  const { data, error } = await supabase
    .from('ptm')
    .select('*')
    .in('id', ptmIds)

  if (error) {
    console.warn('membership PTM lookup skipped:', error.message)
    return rows
  }

  const ptmById = {}
  ;(data || []).forEach((ptm) => {
    ptmById[ptm.id] = ptm
  })

  return rows.map((membership) => ({
    ...membership,
    ptm: ptmById[membership.ptm_id] || null,
  }))
}

async function enrichMembershipsWithPeople(memberships = []) {
  const rows = memberships || []
  const playerIds = [...new Set(rows.map((membership) => membership.player_id).filter(Boolean))]
  const userIds = [...new Set(rows.map((membership) => membership.user_id).filter(Boolean))]
  const playersById = {}
  const profilesById = {}

  if (playerIds.length > 0) {
    const { data: players, error: playersError } = await supabase
      .from('players')
      .select('id,user_id,email,full_name,nickname,photo_url,avatar_url')
      .in('id', playerIds)

    if (playersError) {
      console.warn('approved member player lookup skipped:', playersError.message)
    } else {
      ;(players || []).forEach((player) => {
        playersById[player.id] = player
      })
    }
  }

  if (userIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id,email,full_name,avatar_url')
      .in('id', userIds)

    if (profilesError) {
      console.warn('approved member profile lookup skipped:', profilesError.message)
    } else {
      ;(profiles || []).forEach((profile) => {
        profilesById[profile.id] = profile
      })
    }
  }

  return rows.map((membership) => ({
    ...membership,
    player: playersById[membership.player_id] || null,
    profile: profilesById[membership.user_id] || null,
  }))
}

function sortApprovedMemberships(memberships = []) {
  const roleOrder = { ketua: 0, pengurus: 1, coach: 2, member: 3 }
  return [...(memberships || [])].sort((first, second) => {
    const firstRole = roleOrder[normalizeText(first.role)] ?? 99
    const secondRole = roleOrder[normalizeText(second.role)] ?? 99
    if (firstRole !== secondRole) return firstRole - secondRole
    if (Boolean(first.is_primary) !== Boolean(second.is_primary)) return first.is_primary ? -1 : 1
    return new Date(first.requested_at || first.created_at || 0) - new Date(second.requested_at || second.created_at || 0)
  })
}

export async function requestJoinPtm({ ptm_id, user_id, player_id = null, note = '' } = {}) {
  if (!supabase || !ptm_id || !user_id) return null

  const payload = compactPayload({
    ptm_id,
    user_id,
    player_id: player_id || null,
    note: String(note || '').trim() || undefined,
  })

  const { data, error } = await supabase
    .from('ptm_memberships')
    .insert(payload)
    .select('*')
    .maybeSingle()

  if (error) {
    console.warn('requestJoinPtm failed:', error.message)
    throw error
  }

  return data || null
}

export async function fetchPendingMembershipRequestsForPtm(ptmId) {
  if (!supabase || !ptmId) return []

  const { data, error } = await supabase
    .from('ptm_memberships')
    .select('*')
    .eq('ptm_id', ptmId)
    .eq('status', 'pending')
    .eq('role', 'member')
    .eq('is_primary', false)
    .order('requested_at', { ascending: true })

  if (error) {
    console.warn('fetchPendingMembershipRequestsForPtm failed:', error.message)
    throw error
  }

  const requests = data || []
  const playerIds = [...new Set(requests.map((request) => request.player_id).filter(Boolean))]
  const userIds = [...new Set(requests.map((request) => request.user_id).filter(Boolean))]
  const playersById = {}
  const profilesById = {}

  if (playerIds.length > 0) {
    const { data: players, error: playersError } = await supabase
      .from('players')
      .select('id,user_id,email,full_name,nickname,photo_url,avatar_url')
      .in('id', playerIds)

    if (playersError) {
      console.warn('membership player lookup skipped:', playersError.message)
    } else {
      ;(players || []).forEach((player) => {
        playersById[player.id] = player
      })
    }
  }

  if (userIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id,email,full_name,avatar_url')
      .in('id', userIds)

    if (profilesError) {
      console.warn('membership profile lookup skipped:', profilesError.message)
    } else {
      ;(profiles || []).forEach((profile) => {
        profilesById[profile.id] = profile
      })
    }
  }

  return requests.map((request) => ({
    ...request,
    player: playersById[request.player_id] || null,
    profile: profilesById[request.user_id] || null,
  }))
}

export async function approvePtmMembershipRequest(membershipId, approverUserId) {
  if (!supabase || !membershipId || !approverUserId) return null
  const now = new Date().toISOString()
  const payload = {
    status: 'approved',
    approved_by: approverUserId,
    approved_at: now,
    rejected_by: null,
    rejected_at: null,
    updated_at: now,
  }

  const { data, error } = await supabase
    .from('ptm_memberships')
    .update(payload)
    .eq('id', membershipId)
    .eq('status', 'pending')
    .eq('role', 'member')
    .eq('is_primary', false)
    .select('*')
    .maybeSingle()

  if (error) {
    console.warn('approvePtmMembershipRequest failed:', error.message)
    throw error
  }

  return data || null
}

export async function rejectPtmMembershipRequest(membershipId, rejectorUserId) {
  if (!supabase || !membershipId || !rejectorUserId) return null
  const now = new Date().toISOString()
  const payload = {
    status: 'rejected',
    rejected_by: rejectorUserId,
    rejected_at: now,
    approved_by: null,
    approved_at: null,
    updated_at: now,
  }

  const { data, error } = await supabase
    .from('ptm_memberships')
    .update(payload)
    .eq('id', membershipId)
    .eq('status', 'pending')
    .eq('role', 'member')
    .eq('is_primary', false)
    .select('*')
    .maybeSingle()

  if (error) {
    console.warn('rejectPtmMembershipRequest failed:', error.message)
    throw error
  }

  return data || null
}

export async function syncPlayerFromProfile(profileInput = null, payload = {}) {
  if (!supabase) return null
  const user = await getCurrentUser()
  const parentProfile = profileInput?.id
    ? profileInput
    : await getOrCreateProfile(user, payload)

  if (!parentProfile?.id) {
    throw new Error('Profile akun belum tersimpan, sehingga data pemain belum bisa dibuat. Jalankan SQL policy insert own profile di Supabase lalu login ulang.')
  }

  const existing = await getMyPlayer(parentProfile.id)
  const now = new Date().toISOString()
  const registerData = getRegisterData(user, payload, {
    identity_number: existing?.identity_number,
    birth_date: existing?.birth_date,
    division: existing?.division || parentProfile?.division,
    full_name: existing?.full_name || parentProfile?.full_name,
    phone: existing?.phone || parentProfile?.phone,
    email: existing?.email || parentProfile?.email,
  })
  let playerIdentityNumber = registerData.identityNumber || null
  if (playerIdentityNumber) {
    const identityCheck = await checkIdentityNumberAvailability(playerIdentityNumber, parentProfile.id)
    if (!identityCheck.available) {
      console.warn(`Duplicate identity_number ${playerIdentityNumber} detected while syncing player for ${parentProfile.email || user?.email}. Player will stay pending with admin note without saving duplicate NIK.`)
      playerIdentityNumber = null
    }
  }
  const inheritedStatus = payload.status || existing?.status || parentProfile.status || 'pending'
  const playerStatus = normalizeText(inheritedStatus) === 'pending_duplicate' ? 'pending' : inheritedStatus
  const duplicateAdminNote = registerData.identityNumber && !playerIdentityNumber
    ? 'NIK/KTP terindikasi duplikat. Akun diblokir dari approval otomatis dan perlu review admin.'
    : null
  const base = {
    user_id: parentProfile.id,
    email: registerData.email || '',
    full_name: registerData.fullName || '',
    phone: registerData.phone || '',
    updated_at: now,
  }

  const playerPayload = {
    ...base,
    nickname: payload.nickname ?? existing?.nickname ?? null,
    photo_url: payload.photo_url ?? payload.avatar_url ?? existing?.photo_url ?? null,
    birth_date: registerData.birthDate || null,
    identity_number: playerIdentityNumber,
    address: payload.address ?? existing?.address ?? null,
    ptm_name: payload.ptm_name ?? payload.ptmName ?? existing?.ptm_name ?? null,
    ptm_status: payload.ptm_status ?? payload.ptmRole ?? existing?.ptm_status ?? null,
    division: registerData.division || existing?.division || null,
    status: playerStatus,
    profile_status: payload.profile_status || existing?.profile_status || (duplicateAdminNote ? 'incomplete' : 'complete'),
    admin_note: payload.admin_note ?? existing?.admin_note ?? duplicateAdminNote,
    player_note: payload.player_note ?? payload.achievement_note ?? existing?.player_note ?? null,
    social_url: payload.social_url ?? existing?.social_url ?? null,
    photo_position: payload.photo_position || existing?.photo_position || 'center center',
  }

  const writePlayer = (writePayload) => existing?.id
    ? supabase.from('players').update(writePayload).eq('id', existing.id).select('*').maybeSingle()
    : supabase.from('players').insert({ ...writePayload, created_at: now }).select('*').maybeSingle()

  let { data, error } = await writePlayer(playerPayload)
  if (error && isMissingColumnError(error)) {
    const fallbackPayload = omitOptionalColumns(playerPayload)
    const retry = await writePlayer(fallbackPayload)
    data = retry.data
    error = retry.error
  }

  if (error) {
    console.warn('ensurePlayerProfile failed:', error.message)
    if (/players_user_id_fkey/i.test(error.message)) {
      throw new Error('Data pemain belum bisa disimpan karena parent profile belum valid di Supabase. Pastikan profiles.id sudah ada untuk user ini dan policy insert own profile sudah dijalankan.')
    }
    throw error
  }

  return data || null
}

export async function ensurePlayerProfile(user, payload = {}) {
  if (!supabase || !user?.id) return null
  const parentProfile = await getOrCreateProfile(user, {
    fullName: payload.fullName || payload.full_name,
    phone: payload.phone,
    email: payload.email,
    nik: payload.nik,
    identity_number: payload.identity_number,
    birthDate: payload.birthDate,
    birth_date: payload.birth_date,
    division: payload.division,
    avatar_url: payload.avatar_url || payload.photo_url,
    avatar_position: payload.avatar_position || payload.photo_position,
  })

  return syncPlayerFromProfile(parentProfile, payload)
}

export async function safeAuditLog({
  actor,
  action,
  tableName,
  recordId,
  oldData = null,
  newData = null,
}) {
  if (!supabase || !action) return

  const payload = {
    actor_id: actor?.id || null,
    actor_email: actor?.email || actor?.user_metadata?.email || null,
    action,
    table_name: tableName || null,
    record_id: recordId ? String(recordId) : null,
    old_data: oldData,
    new_data: newData,
  }

  const { error } = await supabase.from('audit_logs').insert(payload)
  if (error) console.warn('Audit log skipped:', error.message)
}
