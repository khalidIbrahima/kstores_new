'use client'

import Link from 'next/link'
import { XCircle, RefreshCw, MessageCircle } from 'lucide-react'

export default function CheckoutErrorPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-20 text-center">
      <div className="w-24 h-24 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-8">
        <XCircle className="w-14 h-14 text-red-400" />
      </div>

      <h1 className="text-3xl sm:text-4xl font-black text-white mb-3">
        Erreur de <span className="text-red-400">paiement</span>
      </h1>

      <p className="text-gray-400 max-w-md mx-auto mb-4">
        Votre paiement n&apos;a pas pu etre traite. Cela peut etre du a un probleme
        technique ou a un refus de votre moyen de paiement.
      </p>

      <p className="text-gray-500 text-sm max-w-md mx-auto mb-10">
        Aucun montant n&apos;a ete debite de votre compte. Vous pouvez reessayer
        ou nous contacter pour obtenir de l&apos;aide.
      </p>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        <Link
          href="/checkout"
          className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-black font-bold px-8 py-3 rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Reessayer le paiement
        </Link>
        <Link
          href="/contact"
          className="inline-flex items-center gap-2 border border-gray-700 hover:border-gray-500 text-gray-300 px-8 py-3 rounded-lg transition-colors"
        >
          <MessageCircle className="w-4 h-4" />
          Contacter le support
        </Link>
      </div>
    </div>
  )
}
