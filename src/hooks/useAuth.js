import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import {
  canAccessAdmin,
  getOrCreateProfile,
  getMyPlayer,
  isBlockedStatus,
  isSuperAdminRole,
  normalizeRole,
  normalizeStatus,
  syncPlayerFromProfile,
} from '../lib/communityData'

const PROFILE_CACHE_KEY = 'community_pingpong_profile'
const LEGACY_AUTH_CACHE_KEYS = [
  PROFILE_CACHE_KEY,
  'community_pingpong_role',
  'community_pingpong_is_admin',
  'community_pingpong_is_super_admin',
  'profile',
  'userProfile',
  'isAdmin',
  'isSuperAdmin',
]

function clearAuthCache() {
  if (typeof window === 'undefined') return
  LEGACY_AUTH_CACHE_KEYS.forEach((key) => {
    window.localStorage?.removeItem(key)
    window.sessionStorage?.removeItem(key)
  })
}

function cacheFreshProfile(nextProfile) {
  if (typeof window === 'undefined' || !nextProfile) return
  window.localStorage?.setItem(PROFILE_CACHE_KEY, JSON.stringify(nextProfile))
}

function logAuthRoleDebug(authUser, nextProfile) {
  if (!import.meta.env.DEV) return
  const rawRole = nextProfile?.role
  const rawStatus = nextProfile?.status
  const normalizedRole = normalizeRole(rawRole)
  const normalizedStatus = normalizeStatus(rawStatus)
  const isBlocked = isBlockedStatus(rawStatus)

  console.log('[auth-role-debug]', {
    userId: authUser?.id || null,
    email: authUser?.email || nextProfile?.email || null,
    profileId: nextProfile?.id || null,
    rawRole,
    normalizedRole,
    rawStatus,
    normalizedStatus,
    isAdmin: canAccessAdmin(nextProfile),
    isSuperAdmin: isSuperAdminRole(rawRole) && !isBlocked,
  })
}

export function useAuth() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileError, setProfileError] = useState('')

  useEffect(() => {
    if (!supabase) {
      setProfileError('')
      setLoading(false)
      return undefined
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        clearAuthCache()
        fetchProfile(session.user).finally(() => setLoading(false))
      } else {
        clearAuthCache()
        setProfile(null)
        setProfileError('')
        setLoading(false)
      }
    })

    // Listen for auth changes
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const newUser = session?.user ?? null
        setUser(newUser)
        if (newUser) {
          clearAuthCache()
          await fetchProfile(newUser)
        } else {
          clearAuthCache()
          setProfile(null)
          setProfileError('')
        }
        setLoading(false)
      }
    )

    return () => {
      listener?.subscription.unsubscribe()
    }
  }, [])

  async function fetchProfile(authUser) {
    if (!supabase || !authUser?.id) {
      clearAuthCache()
      setProfile(null)
      setProfileError('')
      setProfileLoading(false)
      return null
    }

    setProfileLoading(true)
    setProfileError('')
    try {
      let syncedProfile = null

      try {
        syncedProfile = await getOrCreateProfile(authUser)
        await syncPlayerFromRegisterMetadata(authUser)
      } catch (syncError) {
        const message = syncError?.message || 'Profile sync failed.'
        console.warn('[auth-role-debug:error]', {
          stage: 'profile-sync',
          userId: authUser.id,
          email: authUser.email || null,
          message,
        })
        setProfileError(message)
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle()

      if (error) {
        const message = error.message || 'Fresh profile fetch failed.'
        console.warn('[auth-role-debug:error]', {
          stage: 'profile-fetch',
          userId: authUser.id,
          email: authUser.email || null,
          message,
        })
        if (!syncedProfile) setProfileError(message)
      }

      const freshProfile = data || syncedProfile || null

      if (freshProfile) {
        setProfile(freshProfile)
        setProfileError('')
        cacheFreshProfile(freshProfile)
        logAuthRoleDebug(authUser, freshProfile)
        return freshProfile
      }

      setProfile(null)
      setProfileError((current) => current || 'Profile akun belum ditemukan atau belum bisa dibaca dari Supabase.')
      logAuthRoleDebug(authUser, null)
      return null
    } finally {
      setProfileLoading(false)
    }
  }

  const logout = async () => {
    if (!supabase) return
    await supabase.auth.signOut()
    clearAuthCache()
    setUser(null)
    setProfile(null)
    setProfileError('')
  }

  const refreshProfile = async () => fetchProfile(user)

  const normalizedRole = normalizeRole(profile?.role)
  const normalizedStatus = normalizeStatus(profile?.status)
  const isBlocked = isBlockedStatus(profile?.status)
  const isAdmin = canAccessAdmin(profile)
  const isSuperAdmin = isSuperAdminRole(profile?.role) && !isBlocked
  const isLoggedIn = !!user

  return {
    user,
    profile,
    profileError,
    loading,
    profileLoading,
    logout,
    refreshProfile,
    isLoggedIn,
    role: profile?.role || '',
    status: profile?.status || '',
    isAdmin,
    isSuperAdmin,
    normalizedRole,
    normalizedStatus,
    isBlocked,
  }
}

async function syncPlayerFromRegisterMetadata(authUser) {
  const metadata = authUser?.user_metadata || {}
  if (!metadata.identity_number || !metadata.birth_date) return

  const existingPlayer = await getMyPlayer(authUser.id)
  if (existingPlayer) return

  try {
    const profile = await getOrCreateProfile(authUser)
    await syncPlayerFromProfile(profile, {
      fullName: metadata.full_name,
      phone: metadata.phone,
      nik: metadata.identity_number,
      birthDate: metadata.birth_date,
      division: metadata.division,
      ptm_status: metadata.ptm_status || 'Tidak tergabung PTM',
    })
  } catch (error) {
    console.warn('Player profile sync from register metadata failed:', error?.message)
  }
}
