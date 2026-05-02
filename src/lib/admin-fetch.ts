import { supabase } from '@/lib/supabase'

async function getAdminToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession()
  if (data.session?.access_token) return data.session.access_token

  if (typeof window !== 'undefined') {
    const googleCred = localStorage.getItem('ks-google-credential')
    if (googleCred) return googleCred
  }
  return null
}

export async function adminFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const token = await getAdminToken()
  const headers = new Headers(init.headers)
  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  return fetch(input, { ...init, headers })
}
