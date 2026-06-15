import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export function useAuth() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const newUser = session?.user ?? null
        setUser(newUser)
        if (newUser) {
          await fetchProfile(newUser.id)
        } else {
          setProfile(null)
        }
        setLoading(false)
      }
    )

    return () => {
      listener?.subscription.unsubscribe()
    }
  }, [])

  async function fetchProfile(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()
    if (!error && data) {
      setProfile(data)
    } else {
      setProfile(null)
    }
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }

  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin'
  const isLoggedIn = !!user

  return { user, profile, loading, logout, isLoggedIn, isAdmin }
}