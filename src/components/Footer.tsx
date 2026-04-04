import Link from 'next/link'
import { Facebook, Instagram, Twitter } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-[#070b14] border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <Link href="/" className="text-2xl font-black italic text-green-400">
              Kapital Stores
            </Link>
            <p className="mt-3 text-gray-500 text-sm">
              Boutique en ligne spécialisée dans les produits tech et électronique. Livraison rapide, prix bas, qualité garantie.
            </p>
            <div className="flex gap-3 mt-4">
              <a href="https://facebook.com/people/kstoressn/100063748556013" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-white">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="https://instagram.com/k.stores.sn" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-white">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="https://twitter.com/kapital_stores" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-white">
                <Twitter className="w-5 h-5" />
              </a>
            </div>
            <p className="text-gray-600 text-xs mt-4">Suivez-nous sur les réseaux sociaux pour rester informé de nos dernières offres et nouveautés.</p>
          </div>

          {/* Liens Rapides */}
          <div>
            <h3 className="font-bold text-white mb-4">Liens Rapides</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/" className="text-gray-500 hover:text-green-400">Accueil</Link></li>
              <li><Link href="/products" className="text-gray-500 hover:text-green-400">Tous les articles</Link></li>
              <li><Link href="/products" className="text-gray-500 hover:text-green-400">Catégories</Link></li>
              <li><Link href="/contact" className="text-gray-500 hover:text-green-400">Contact</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="font-bold text-white mb-4">Support</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/terms" className="text-gray-500 hover:text-green-400">Conditions Générales</Link></li>
              <li><Link href="/privacy" className="text-gray-500 hover:text-green-400">Politique de Confidentialité</Link></li>
              <li><Link href="/returns" className="text-gray-500 hover:text-green-400">Retours et Remboursements</Link></li>
              <li>
                <a href="mailto:support@kapital-stores.shop" className="text-gray-500 hover:text-green-400">
                  support@kapital-stores.shop
                </a>
              </li>
              <li>
                <a href="tel:+221761800649" className="text-gray-500 hover:text-green-400">
                  +221 76 180 06 49
                </a>
              </li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h3 className="font-bold text-white mb-4">Newsletter</h3>
            <p className="text-gray-500 text-sm mb-3">Restez informé des dernières offres et nouveautés</p>
            <div className="flex flex-col gap-2 sm:flex-row sm:gap-0">
              <input
                type="email"
                placeholder="Entrez votre email"
                className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm text-white outline-none focus:border-green-500 sm:rounded-r-none"
              />
              <button className="rounded-lg bg-green-500 px-4 py-2 text-black transition-colors hover:bg-green-600 sm:rounded-l-none">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
            <p className="text-gray-600 text-xs mt-3">Fass Delorme, Dakar, Sénégal</p>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-10 pt-6 text-center text-gray-600 text-sm">
          Conçu et développé avec soin pour le client moderne. &copy; 2025 Kapital Stores. Tous droits réservés.
        </div>
      </div>
    </footer>
  )
}
