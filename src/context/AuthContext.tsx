'use client'

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import type { User as SupabaseUser } from '@supabase/supabase-js'

interface GoogleUser {
  sub: string
  name: string
  email: string
  picture: string
}

interface Profile {
  id: string
  full_name: string
  avatar_url: string | null
  email: string | null
  google_id: string | null
  is_admin: boolean | null
}

interface AuthContextType {
  googleUser: GoogleUser | null
  signInWithGoogle: () => void
  supabaseUser: SupabaseUser | null
  signInWithEmail: (email: string, password: string) => Promise<{ error: string | null }>
  signUpWithEmail: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>
  profile: Profile | null
  loading: boolean
  isAuthenticated: boolean
  isAdmin: boolean
  displayName: string
  displayEmail: string
  avatarUrl: string | null
  signOut: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!

function isGoogleCredentialValid(): boolean {
  try {
    const cred = typeof window !== 'undefined' ? localStorage.getItem('ks-google-credential') : null
    if (!cred) return false
    const payload = JSON.parse(atob(cred.split('.')[1])) as { exp?: number }
    return typeof payload.exp === 'number' && payload.exp * 1000 > Date.now()
  } catch {
    return false
  }
}

function purgeGoogleSession(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem('ks-google-credential')
  localStorage.removeItem('ks-google-user')
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [googleUser, setGoogleUser] = useState<GoogleUser | null>(null)
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [gsiLoaded, setGsiLoaded] = useState(false)

  // Track pending profile loads to prevent premature loading=false
  const pendingProfileLoads = useRef(0)
  const initialLoadDone = useRef(false)

  const finishInitialLoad = useCallback(() => {
    if (pendingProfileLoads.current <= 0 && !initialLoadDone.current) {
      initialLoadDone.current = true
      setLoading(false)
    }
  }, [])

  // Upsert profile for Google users
  const upsertGoogleProfile = useCallback(async (gUser: GoogleUser) => {
    try {
      const { data: existing } = await supabase
        .from('profiles')
        .select('*')
        .eq('google_id', gUser.sub)
        .single()

      if (existing) {
        await supabase
          .from('profiles')
          .update({ full_name: gUser.name, avatar_url: gUser.picture, email: gUser.email })
          .eq('google_id', gUser.sub)
        setProfile(existing as Profile)
      } else {
        const { data: newProfile } = await supabase
          .from('profiles')
          .insert({ full_name: gUser.name, avatar_url: gUser.picture, email: gUser.email, google_id: gUser.sub })
          .select()
          .single()
        if (newProfile) setProfile(newProfile as Profile)
      }
    } catch { /* ignore network errors during profile load */ }
  }, [])

  // Upsert profile for Supabase email users
  const upsertEmailProfile = useCallback(async (user: SupabaseUser, fullName?: string) => {
    try {
      const { data: existing } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', user.email)
        .single()

      if (existing) {
        setProfile(existing as Profile)
      } else {
        const { data: newProfile } = await supabase
          .from('profiles')
          .insert({
            full_name: fullName || user.email?.split('@')[0] || 'Utilisateur',
            email: user.email,
            avatar_url: null,
          })
          .select()
          .single()
        if (newProfile) setProfile(newProfile as Profile)
      }
    } catch { /* ignore network errors during profile load */ }
  }, [])

  // Google credential response handler (used during active login, not initial load)
  const handleCredentialResponse = useCallback(async (response: { credential: string }) => {
    const payload = JSON.parse(atob(response.credential.split('.')[1]))
    const gUser: GoogleUser = {
      sub: payload.sub, name: payload.name, email: payload.email, picture: payload.picture,
    }
    setGoogleUser(gUser)
    localStorage.setItem('ks-google-user', JSON.stringify(gUser))
    localStorage.setItem('ks-google-credential', response.credential)
    await upsertGoogleProfile(gUser)
  }, [upsertGoogleProfile])

  // === SINGLE INITIAL LOAD ===
  // Both Google + Supabase sessions are loaded here, and loading=false
  // is ONLY set after ALL pending profile fetches complete.
  useEffect(() => {
    const init = async () => {
      const promises: Promise<void>[] = []

      // 1. Check saved Google session — purge if credential is expired (Google ID tokens last ~1h)
      const savedGoogle = localStorage.getItem('ks-google-user')
      if (savedGoogle) {
        if (!isGoogleCredentialValid()) {
          purgeGoogleSession()
        } else {
          try {
            const gUser = JSON.parse(savedGoogle) as GoogleUser
            setGoogleUser(gUser)
            pendingProfileLoads.current++
            promises.push(
              upsertGoogleProfile(gUser).finally(() => { pendingProfileLoads.current-- })
            )
          } catch { /* corrupted localStorage, ignore */ }
        }
      }

      // 2. Check Supabase session
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        setSupabaseUser(session.user)
        pendingProfileLoads.current++
        promises.push(
          upsertEmailProfile(session.user).finally(() => { pendingProfileLoads.current-- })
        )
      }

      // 3. Wait for ALL profile loads, then mark loading done
      await Promise.allSettled(promises)
      initialLoadDone.current = true
      setLoading(false)
    }

    init()
  }, [upsertGoogleProfile, upsertEmailProfile])

  // Listen for Supabase auth state changes (for login/logout AFTER initial load)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setSupabaseUser(session.user)
          await upsertEmailProfile(session.user)
        } else if (event === 'SIGNED_OUT') {
          setSupabaseUser(null)
          setProfile(null)
        }
      }
    )
    return () => subscription.unsubscribe()
  }, [upsertEmailProfile])

  // Load Google Identity Services script
  useEffect(() => {
    if (typeof window === 'undefined') return
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = () => setGsiLoaded(true)
    document.head.appendChild(script)
    return () => { document.head.removeChild(script) }
  }, [])

  // Initialize Google Sign-In when GSI is loaded
  useEffect(() => {
    if (!gsiLoaded || typeof window === 'undefined') return
    const google = (window as unknown as { google: { accounts: { id: {
      initialize: (config: Record<string, unknown>) => void
    } } } }).google
    if (google?.accounts?.id) {
      google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse,
        auto_select: false,
      })
    }
  }, [gsiLoaded, handleCredentialResponse])

  const signInWithGoogle = () => {
    const google = (window as unknown as { google: { accounts: { id: {
      prompt: () => void
    } } } }).google
    if (google?.accounts?.id) google.accounts.id.prompt()
  }

  const signInWithEmail = async (email: string, password: string): Promise<{ error: string | null }> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      if (error.message === 'Invalid login credentials') return { error: 'Email ou mot de passe incorrect' }
      return { error: error.message }
    }
    return { error: null }
  }

  const signUpWithEmail = async (email: string, password: string, fullName: string): Promise<{ error: string | null }> => {
    const { data, error } = await supabase.auth.signUp({
      email, password, options: { data: { full_name: fullName } },
    })
    if (error) {
      if (error.message.includes('already registered')) return { error: 'Cet email est déjà utilisé' }
      return { error: error.message }
    }
    if (data.user) await upsertEmailProfile(data.user, fullName)
    return { error: null }
  }

  const signOut = async () => {
    if (googleUser) {
      setGoogleUser(null)
      setProfile(null)
      localStorage.removeItem('ks-google-user')
      localStorage.removeItem('ks-google-credential')
      const google = (window as unknown as { google?: { accounts?: { id?: {
        revoke: (email: string, callback: () => void) => void
        disableAutoSelect: () => void
      } } } }).google
      if (googleUser.email && google?.accounts?.id) {
        google.accounts.id.revoke(googleUser.email, () => {})
        google.accounts.id.disableAutoSelect()
      }
    }
    if (supabaseUser) {
      await supabase.auth.signOut()
      setSupabaseUser(null)
      setProfile(null)
    }
  }

  const isAuthenticated = !!(googleUser || supabaseUser)
  const isAdmin = !!(isAuthenticated && profile?.is_admin)
  const displayName = profile?.full_name || googleUser?.name || supabaseUser?.user_metadata?.full_name || supabaseUser?.email?.split('@')[0] || ''
  const displayEmail = googleUser?.email || supabaseUser?.email || ''
  const avatarUrl = profile?.avatar_url || googleUser?.picture || null

  return (
    <AuthContext.Provider value={{
      googleUser, supabaseUser, profile, loading, isAuthenticated, isAdmin,
      displayName, displayEmail, avatarUrl,
      signInWithGoogle, signInWithEmail, signUpWithEmail, signOut,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
