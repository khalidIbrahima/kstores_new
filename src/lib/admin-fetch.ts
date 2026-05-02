import { supabase } from '@/lib/supabase'

async function getAdminToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession()
  if (data.session?.access_token) return data.session.access_token

  if (typeof window !== 'undefined') {
    const googleCred = localStorage.getItem('ks-google-credential')
    if (!googleCred) return null
    try {
      const payload = JSON.parse(atob(googleCred.split('.')[1])) as { exp?: number }
      if (typeof payload.exp === 'number' && payload.exp * 1000 > Date.now()) return googleCred
    } catch { /* malformed, fall through to purge */ }
    localStorage.removeItem('ks-google-credential')
    localStorage.removeItem('ks-google-user')
  }
  return null
}

export async function adminFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const token = await getAdminToken()
  const headers = new Headers(init.headers)
  if (token) headers.set('Authorization', `Bearer ${token}`)
  // Don't override Content-Type for FormData — the browser sets it with the boundary
  const isFormData = typeof FormData !== 'undefined' && init.body instanceof FormData
  if (init.body && !isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  return fetch(input, { ...init, headers })
}
