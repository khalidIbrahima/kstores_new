'use client'

import { useState, useRef, useEffect } from 'react'
import { Globe } from 'lucide-react'
import { useTranslation } from '@/lib/i18n'

const languages = [
  { code: 'fr', label: 'FR', name: 'Fran\u00e7ais' },
  { code: 'en', label: 'EN', name: 'English' },
] as const

export default function LanguageSelector() {
  const { locale, setLocale } = useTranslation()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const current = languages.find(l => l.code === locale) || languages[0]

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#111827] border border-gray-700 hover:border-gray-600 text-gray-300 hover:text-white transition-colors text-sm cursor-pointer"
      >
        <Globe className="w-4 h-4" />
        <span className="font-medium">{current.label}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-40 bg-[#111827] border border-gray-700 rounded-xl shadow-xl py-1 z-50">
          {languages.map(lang => (
            <button
              key={lang.code}
              onClick={() => {
                setLocale(lang.code)
                setOpen(false)
              }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors cursor-pointer ${
                locale === lang.code
                  ? 'text-green-400 bg-green-500/10'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <span className="font-semibold">{lang.label}</span>
              <span className="text-gray-500">{lang.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
