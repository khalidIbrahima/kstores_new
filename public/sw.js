/*
 * Service worker de l'application « Kapital Stores Admin ».
 *
 * Enregistré UNIQUEMENT depuis l'admin, avec la portée « /admin » (src/components/ServiceWorkerRegister.tsx).
 * La boutique publique n'a pas de service worker.
 *
 * Règles de sécurité :
 * - aucune page HTML, aucune réponse RSC, rien sous /api/ ni /admin, rien d'un autre domaine (Supabase,
 *   Google…) n'est jamais écrit dans Cache Storage : les données privées restent hors du cache ;
 * - navigations : toujours le réseau ; en cas d'échec seulement, page hors-ligne précachée ;
 * - seuls les fichiers statiques immuables (/_next/static/, icônes, polices) sont mis en cache.
 *
 * Mise à jour : changer VERSION. Le HTML n'étant jamais mis en cache, une mise à jour ne peut pas laisser
 * l'utilisateur bloqué sur une ancienne page ; skipWaiting + clients.claim activent la nouvelle version
 * immédiatement et les anciens caches (dont « ks-admin-v1 ») sont supprimés.
 */
const VERSION = 'v2'
const STATIC_CACHE = `ks-admin-static-${VERSION}`
const OFFLINE_URL = '/admin-offline.html'
const PRECACHE = [
  OFFLINE_URL,
  '/icons/icon-192.png',
  '/icons/icon-maskable-192.png',
  '/icons/favicon.svg',
]
const MAX_STATIC_ENTRIES = 200

// Ancienne version de ce fichier enregistrée avec la portée « / » (avant 2026-11) : elle mettait en cache
// toutes les pages. Quand le navigateur la met à jour vers ce fichier, on la neutralise : suppression de
// tous les caches puis désinscription. L'admin réenregistre ensuite le worker avec la portée « /admin ».
const scopePath = new URL(self.registration.scope).pathname
const IS_ADMIN_SCOPE = scopePath === '/admin' || scopePath.startsWith('/admin/')

self.addEventListener('install', (event) => {
  if (!IS_ADMIN_SCOPE) {
    self.skipWaiting()
    return
  }
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE.map((url) => new Request(url, { cache: 'reload' }))))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      if (!IS_ADMIN_SCOPE) {
        await Promise.all(keys.map((key) => caches.delete(key)))
        await self.registration.unregister()
        return
      }
      await Promise.all(keys.filter((key) => key !== STATIC_CACHE).map((key) => caches.delete(key)))
      await self.clients.claim()
    })(),
  )
})

function isStaticAsset(url) {
  return (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname === '/logo.svg' ||
    /\.(?:woff2?|ttf|otf)$/.test(url.pathname)
  )
}

async function trimCache(cache) {
  const keys = await cache.keys()
  if (keys.length <= MAX_STATIC_ENTRIES) return
  await Promise.all(
    keys
      .slice(0, keys.length - MAX_STATIC_ENTRIES)
      .filter((req) => !PRECACHE.includes(new URL(req.url).pathname))
      .map((req) => cache.delete(req)),
  )
}

async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE)
  const hit = await cache.match(request)
  if (hit) return hit
  const response = await fetch(request)
  // Uniquement les réponses complètes, du même domaine, sans en-tête de session.
  if (response.ok && response.type === 'basic' && response.status === 200) {
    await cache.put(request, response.clone())
    trimCache(cache)
  }
  return response
}

async function networkWithOfflineFallback(request) {
  try {
    return await fetch(request)
  } catch {
    const offline = await caches.match(OFFLINE_URL)
    return (
      offline ||
      new Response('Hors ligne', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
    )
  }
}

self.addEventListener('fetch', (event) => {
  if (!IS_ADMIN_SCOPE) return
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return // Supabase, Google, CDN… : jamais touchés
  if (url.pathname.startsWith('/api/')) return

  if (request.mode === 'navigate') {
    // Réseau uniquement (rien n'est mis en cache) ; page hors-ligne si le réseau échoue.
    event.respondWith(networkWithOfflineFallback(request))
    return
  }

  // Requêtes RSC de Next.js et tout ce qui est sous /admin : réseau seul, sans cache.
  if (request.headers.get('RSC') === '1' || url.searchParams.has('_rsc')) return
  if (url.pathname === '/admin' || url.pathname.startsWith('/admin/')) return

  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request))
  }
})
