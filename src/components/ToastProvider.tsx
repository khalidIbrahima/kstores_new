'use client'

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
  ReactNode,
} from 'react'
import { CheckCircle, XCircle, Info, X } from 'lucide-react'

type ToastType = 'success' | 'error' | 'info'

interface Toast {
  id: string
  message: string
  type: ToastType
  exiting: boolean
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const MAX_TOASTS = 3
const AUTO_DISMISS_MS = 4000

const typeConfig: Record<ToastType, { icon: typeof CheckCircle; color: string; bg: string; border: string }> = {
  success: {
    icon: CheckCircle,
    color: 'text-green-400',
    bg: 'bg-green-500/10',
    border: 'border-green-500/30',
  },
  error: {
    icon: XCircle,
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
  },
  info: {
    icon: Info,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
  },
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.map(t => (t.id === id ? { ...t, exiting: true } : t)))
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 300)
    const timer = timers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.current.delete(id)
    }
  }, [])

  const toast = useCallback(
    (message: string, type: ToastType = 'info') => {
      const id = crypto.randomUUID()
      setToasts(prev => {
        const next = [...prev, { id, message, type, exiting: false }]
        if (next.length > MAX_TOASTS) {
          const oldest = next[0]
          setTimeout(() => dismiss(oldest.id), 0)
        }
        return next.slice(-MAX_TOASTS)
      })

      const timer = setTimeout(() => dismiss(id), AUTO_DISMISS_MS)
      timers.current.set(id, timer)
    },
    [dismiss]
  )

  useEffect(() => {
    const activeTimers = timers.current
    return () => {
      activeTimers.forEach(timer => clearTimeout(timer))
    }
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed inset-x-4 top-4 z-50 flex flex-col items-end gap-3 pointer-events-none sm:right-4 sm:left-auto">
        {toasts.map(t => {
          const config = typeConfig[t.type]
          const Icon = config.icon
          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex w-full max-w-[420px] items-start gap-3 rounded-xl border px-4 py-3 shadow-xl backdrop-blur-sm transition-all duration-300 ${
                config.bg
              } ${config.border} ${
                t.exiting
                  ? 'opacity-0 translate-x-8'
                  : 'opacity-100 translate-x-0 animate-slide-in'
              }`}
              style={{
                animation: t.exiting ? undefined : 'slideIn 0.3s ease-out',
              }}
            >
              <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${config.color}`} />
              <p className="text-sm text-gray-200 flex-1 break-words">{t.message}</p>
              <button
                onClick={() => dismiss(t.id)}
                className="shrink-0 text-gray-500 hover:text-gray-300 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )
        })}
      </div>
      <style jsx global>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </ToastContext.Provider>
  )
}

export function useToast(): (message: string, type?: ToastType) => void {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return ctx.toast
}
