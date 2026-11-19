// Single source of truth for the public address of the shop.
// NEXT_PUBLIC_PRODUCTION_URL is deliberately not read: in Vercel it pointed to an old domain,
// which sent share previews and notification links to the wrong site.

const DEFAULT_SITE_URL = 'https://kapitalstores.com'

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_URL).replace(/\/+$/, '')

/**
 * Quality accepted by the image optimizer (`/_next/image`). Next.js only serves the qualities
 * listed in `images.qualities` (75 by default); any other value is answered with a 400.
 */
export const IMAGE_QUALITY = 75

/** Absolute URL of a product photo resized by the site, for link previews (WhatsApp, Facebook, X…). */
export function sharePreviewImage(imageUrl: string, width: number = 1200): string {
  return `${SITE_URL}/_next/image?url=${encodeURIComponent(imageUrl)}&w=${width}&q=${IMAGE_QUALITY}`
}
