import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [staffMode, setStaffModeState] = useState(
    () => localStorage.getItem('vc_staff_mode') === 'true'
  )

  function setStaffMode(val) {
    setStaffModeState(val)
    localStorage.setItem('vc_staff_mode', val ? 'true' : 'false')
  }

  async function fetchProfile(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*, franchises(*)')
      .eq('id', userId)
      .single()
    if (error) return null
    return data
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user)
        const p = await fetchProfile(session.user.id)
        setProfile(p)
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user)
        const p = await fetchProfile(session.user.id)
        setProfile(p)
      } else {
        setUser(null)
        setProfile(null)
        setStaffMode(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signOut() {
    setStaffMode(false)
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut, fetchProfile, setProfile, staffMode, setStaffMode }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
