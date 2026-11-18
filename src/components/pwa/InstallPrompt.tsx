'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Download, Share, SquarePlus, X } from 'lucide-react'
import { dismissInstall, promptInstall, useInstallMode } from '@/lib/pwa/install'

/**
 * Astuce iOS : Safari n'a pas de boîte d'installation, on explique Partager → Sur l'écran d'accueil.
 * Rendue dans <body> via un portail : la barre du haut a un `backdrop-blur`, qui ferait de cette barre le
 * repère des éléments `fixed` (la boîte serait alors coincée dans la barre).
 */
function IOSHint({ onClose }: { onClose: () => void }) {
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ks-ios-install-title"
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 p-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-gray-800 bg-[#111827] p-5 text-sm text-gray-300 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <h2 id="ks-ios-install-title" className="text-base font-semibold text-white">
            Installer l&apos;application
          </h2>
          <button onClick={onClose} aria-label="Fermer" className="-m-1 rounded-lg p-1 text-gray-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
        <ol className="space-y-3">
          <li className="flex items-center gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-800 text-green-400">
              <Share className="h-4 w-4" />
            </span>
            <span>
              Touchez <strong className="text-white">Partager</strong> dans la barre de Safari.
            </span>
          </li>
          <li className="flex items-center gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-800 text-green-400">
              <SquarePlus className="h-4 w-4" />
            </span>
            <span>
              Choisissez <strong className="text-white">Sur l&apos;écran d&apos;accueil</strong>, puis{' '}
              <strong className="text-white">Ajouter</strong>.
            </span>
          </li>
        </ol>
      </div>
    </div>,
    document.body,
  )
}

function useInstallAction() {
  const mode = useInstallMode()
  const [iosOpen, setIosOpen] = useState(false)
  const install = async () => {
    if (mode === 'ios') {
      setIosOpen(true)
      return
    }
    await promptInstall()
  }
  const hint = iosOpen ? <IOSHint onClose={() => setIosOpen(false)} /> : null
  return { mode, install, hint }
}

/** Bouton icône pour la barre du haut de l'admin (mobile). Rien n'est rendu si l'installation n'est pas possible. */
export function AdminInstallIconButton() {
  const { mode, install, hint } = useInstallAction()
  if (mode === 'none' && !hint) return null
  return (
    <>
      {mode !== 'none' && (
        <button
          onClick={install}
          className="rounded-lg p-2 text-green-400 transition-colors hover:bg-gray-800"
          aria-label="Installer l'application"
          title="Installer l'application"
        >
          <Download className="h-5 w-5" />
        </button>
      )}
      {hint}
    </>
  )
}

/** Ligne du menu latéral de l'admin, avec bouton « Masquer ». */
export function AdminInstallMenuItem({ onDone }: { onDone?: () => void }) {
  const { mode, install, hint } = useInstallAction()
  if (mode === 'none' && !hint) return null
  return (
    <>
      {mode !== 'none' && (
        <div className="flex items-center gap-1">
          <button
            onClick={async () => {
              await install()
              onDone?.()
            }}
            className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium text-green-400 transition-colors hover:bg-gray-800"
          >
            <Download className="h-5 w-5 shrink-0" />
            <span className="truncate">Installer l&apos;app</span>
          </button>
          <button
            onClick={() => dismissInstall()}
            className="shrink-0 rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-800 hover:text-white"
            aria-label="Masquer l'invite d'installation"
            title="Masquer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      {hint}
    </>
  )
}
