'use client'

import { useEffect, useState } from 'react'
import { X, Download, Share2, Loader2 } from 'lucide-react'
import { renderProductVisual, type VisualFormat, type VisualProduct } from '@/lib/instagram-visual'

interface Generated {
  format: VisualFormat
  label: string
  file: File
  url: string
}

const FORMATS: { format: VisualFormat; label: string }[] = [
  { format: 'post', label: 'Post 1080 × 1350' },
  { format: 'story', label: 'Story 1080 × 1920' },
]

function slugify(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'produit'
}

function download(file: File) {
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = file.name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export default function InstagramVisualModal({ product, onClose }: { product: VisualProduct; onClose: () => void }) {
  const [items, setItems] = useState<Generated[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    const created: string[] = []
    ;(async () => {
      try {
        const base = slugify(product.name)
        const out: Generated[] = []
        for (const { format, label } of FORMATS) {
          const blob = await renderProductVisual(product, format)
          const file = new File([blob], `${base}-${format}.png`, { type: 'image/png' })
          const url = URL.createObjectURL(file)
          created.push(url)
          out.push({ format, label, file, url })
        }
        if (!cancelled) setItems(out)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Génération impossible')
      }
    })()
    return () => {
      cancelled = true
      created.forEach(u => URL.revokeObjectURL(u))
    }
  }, [product])

  const canShareFiles = (files: File[]) =>
    typeof navigator !== 'undefined' && !!navigator.canShare && navigator.canShare({ files })

  const share = async (files: File[]) => {
    try {
      await navigator.share({ files, title: product.name })
    } catch (e) {
      if ((e as Error).name !== 'AbortError') files.forEach(download)
    }
  }

  const allFiles = items?.map(i => i.file) ?? []

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Visuel Instagram"
        onClick={e => e.stopPropagation()}
        className="w-full sm:max-w-3xl max-h-[92dvh] overflow-y-auto bg-[#111827] border border-gray-800 rounded-t-2xl sm:rounded-2xl p-4 sm:p-6 pb-[max(1rem,env(safe-area-inset-bottom))]"
      >
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="text-white font-bold text-lg">Visuel Instagram</h2>
          <button onClick={onClose} aria-label="Fermer" className="w-11 h-11 -mr-2 flex items-center justify-center text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        {!items && !error && (
          <div className="flex items-center justify-center gap-2 py-16 text-gray-400 text-sm">
            <Loader2 className="w-5 h-5 animate-spin" /> Création des images…
          </div>
        )}

        {items && (
          <>
            <div className="grid grid-cols-2 gap-3 sm:gap-5 items-start">
              {items.map(it => (
                <figure key={it.format} className="min-w-0 space-y-2">
                  {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
                  <img src={it.url} alt={it.label} className="w-full rounded-lg border border-gray-800" />
                  <figcaption className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs text-gray-400">{it.label}</span>
                    <button
                      onClick={() => download(it.file)}
                      className="inline-flex items-center gap-1.5 min-h-10 px-3 text-xs text-gray-300 border border-gray-700 hover:border-gray-500 rounded-lg"
                    >
                      <Download className="w-3.5 h-3.5" /> Télécharger
                    </button>
                  </figcaption>
                </figure>
              ))}
            </div>

            <div className="mt-5 flex flex-col sm:flex-row gap-2">
              {canShareFiles(allFiles) && (
                <button
                  onClick={() => share(allFiles)}
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-black font-bold py-3 rounded-xl"
                >
                  <Share2 className="w-5 h-5" /> Partager (Instagram, WhatsApp…)
                </button>
              )}
              <button
                onClick={() => allFiles.forEach(download)}
                className={`flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-xl font-bold ${
                  canShareFiles(allFiles) ? 'border border-gray-700 text-gray-200 hover:border-gray-500' : 'bg-green-500 hover:bg-green-600 text-black'
                }`}
              >
                <Download className="w-5 h-5" /> Tout télécharger
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
