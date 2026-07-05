import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { syncOnLogin, schedulePush } from '../lib/cloudSync'

// Аккаунт (Supabase) + автосинк данных. Без входа всё работает как раньше
// (localStorage) — облако подключается только после логина.
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  // Любое изменение состояния (избранное/портфель/алерты/настройки) → пуш в облако
  useEffect(() => {
    if (!user) return
    const onChange = () => schedulePush(user.id)
    window.addEventListener('tidewatch:state-changed', onChange)
    window.addEventListener('tidewatch:alerts-changed', onChange)
    return () => {
      window.removeEventListener('tidewatch:state-changed', onChange)
      window.removeEventListener('tidewatch:alerts-changed', onChange)
    }
  }, [user])

  const signIn = useCallback(async (email, password) => {
    setBusy(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) return { error: error.message }
      const replaced = await syncOnLogin(data.user.id)
      if (replaced) window.location.reload() // облачные данные пришли — перерисовать всё
      return {}
    } finally {
      setBusy(false)
    }
  }, [])

  const signUp = useCallback(async (email, password) => {
    setBusy(true)
    try {
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) return { error: error.message }
      if (data.user) await syncOnLogin(data.user.id) // новый аккаунт → пуш локального
      return {}
    } finally {
      setBusy(false)
    }
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  const value = useMemo(() => ({ user, busy, signIn, signUp, signOut }), [user, busy, signIn, signUp, signOut])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
