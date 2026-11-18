'use client'

import { useSyncExternalStore } from 'react'

/**
 * État partagé de l'installation PWA, lu avec useSyncExternalStore (pas de setState dans un effet).
 *
 * `beforeinstallprompt` (Chrome/Edge/Samsung Internet, pas Safari) peut arriver avant le montage des
 * composants qui l'affichent : on l'écoute dès le chargement de ce module, importé par
 * ServiceWorkerRegister, monté par le layout admin en dehors de la garde d'authentification.
 */

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

// Seule l'admin est installable (décision du 2026-11-18).
const DISMISS_KEY = 'ks-install-dismissed-admin'

let deferredPrompt: BeforeInstallPromptEvent | null = null
let installedNow = false
let dismissed: boolean | undefined
const listeners = new Set<() => void>()

function emit() {
  for (const l of listeners) l()
}

function readDismissed(): boolean {
  if (dismissed === undefined) {
    try {
      dismissed = window.localStorage.getItem(DISMISS_KEY) === '1'
    } catch {
      dismissed = false
    }
  }
  return dismissed
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    // Empêche la mini-barre native de Chrome : on propose notre propre bouton.
    e.preventDefault()
    deferredPrompt = e as BeforeInstallPromptEvent
    emit()
  })
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null
    installedNow = true
    emit()
  })
}

function subscribe(cb: () => void) {
  listeners.add(cb)
  let mq: MediaQueryList | null = null
  if (typeof window !== 'undefined' && window.matchMedia) {
    mq = window.matchMedia('(display-mode: standalone)')
    mq.addEventListener?.('change', cb)
  }
  return () => {
    listeners.delete(cb)
    mq?.removeEventListener?.('change', cb)
  }
}

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  const nav = window.navigator as Navigator & { standalone?: boolean }
  return Boolean(
    window.matchMedia?.('(display-mode: standalone)').matches ||
      window.matchMedia?.('(display-mode: fullscreen)').matches ||
      nav.standalone,
  )
}

export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  // iPadOS 13+ se présente comme un Mac : on le reconnaît à l'écran tactile.
  return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

export type InstallMode = 'none' | 'prompt' | 'ios'

function getMode(): InstallMode {
  if (installedNow || isStandalone() || readDismissed()) return 'none'
  if (deferredPrompt) return 'prompt'
  if (isIOS()) return 'ios'
  return 'none'
}

/** 'prompt' : boîte native disponible ; 'ios' : afficher l'astuce Partager ; 'none' : ne rien montrer. */
export function useInstallMode(): InstallMode {
  return useSyncExternalStore(
    subscribe,
    getMode,
    () => 'none',
  )
}

/** Ouvre la boîte d'installation native. Renvoie true si l'utilisateur a accepté. */
export async function promptInstall(): Promise<boolean> {
  const e = deferredPrompt
  if (!e) return false
  deferredPrompt = null // un événement ne peut servir qu'une fois
  emit()
  await e.prompt()
  const choice = await e.userChoice
  return choice.outcome === 'accepted'
}

export function dismissInstall() {
  dismissed = true
  try {
    window.localStorage.setItem(DISMISS_KEY, '1')
  } catch {
    // stockage indisponible (navigation privée) : on masque seulement pour cette session
  }
  emit()
}
