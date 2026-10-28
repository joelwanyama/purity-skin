import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { AuthContext } from './AuthContext'
import { supabase } from '../lib/supabase'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(Boolean(supabase))

  useEffect(() => {
    if (!supabase) return
    let active = true
    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return
      if (error) console.error('Auth session read failed', error.message)
      setSession(data.session)
      setLoading(false)
    }).catch(() => {
      if (active) { setSession(null); setLoading(false) }
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setLoading(false)
    })
    return () => { active = false; subscription.unsubscribe() }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) return 'Owner sign-in is not configured yet.'
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return error?.message ?? null
  }, [])
  const signOut = useCallback(async () => {
    if (supabase) await supabase.auth.signOut()
  }, [])
  const resetPassword = useCallback(async (email: string) => {
    if (!supabase) return 'Owner sign-in is not configured yet.'
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/owner/reset-password` })
    return error?.message ?? null
  }, [])

  const value = useMemo(() => ({ user: session?.user ?? null, loading, signIn, signOut, resetPassword }), [session, loading, signIn, signOut, resetPassword])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
