'use client'

import { Settings } from 'lucide-react'

export default function MaintenancePage() {
  return (
    <div className="fixed inset-0 bg-[#060a13] flex items-center justify-center z-50">
      <div className="text-center px-6">
        <div className="w-20 h-20 bg-[#111827] border border-gray-800 rounded-full flex items-center justify-center mx-auto mb-8">
          <Settings className="w-10 h-10 text-green-400 animate-spin" style={{ animationDuration: '3s' }} />
        </div>

        <h1 className="text-3xl sm:text-4xl font-black text-white mb-4">
          Site en <span className="text-green-400">maintenance</span>
        </h1>

        <p className="text-gray-500 text-lg max-w-md mx-auto mb-6">
          Nous revenons tres bientot
        </p>

        <p className="text-gray-600 text-sm max-w-sm mx-auto">
          Nous effectuons des mises a jour pour ameliorer votre experience.
          Merci pour votre patience.
        </p>

        <div className="mt-10 flex items-center justify-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" style={{ animationDelay: '0.2s' }} />
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" style={{ animationDelay: '0.4s' }} />
        </div>
      </div>
    </div>
  )
}
