'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useRef, useEffect } from 'react'
import { Search, User, ShoppingCart, Menu, X, Heart, LogOut, Package, UserCircle, Shield } from 'lucide-react'
import LanguageSelector from '@/components/LanguageSelector'
import { useCart } from '@/context/CartContext'
import { useAuth } from '@/context/AuthContext'

export default function Navbar() {
  const { totalItems } = useCart()
  const { isAuthenticated, isAdmin, displayName, displayEmail, avatarUrl, signOut, loading } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const navLinks = [
    { label: 'Accueil', href: '/' },
    { label: 'Tous les articles', href: '/products' },
    { label: 'Catégories', href: '/categories' },
    { label: 'Contact', href: '/contact' },
  ]

  return (
    <nav className="sticky top-0 z-50 bg-[#0a0f1a]/95 backdrop-blur-md border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo.svg" alt="" className="w-9 h-9 sm:w-10 sm:h-10" />
            <span className="hidden sm:inline text-xl font-black italic tracking-tight">
              <span className="text-white">KAPITAL</span><span className="text-green-400">STORES</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map(link => (
              <Link
                key={link.label}
                href={link.href}
                className="text-gray-300 hover:text-white transition-colors text-sm font-medium"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-1 sm:gap-2">
            {searchOpen ? (
              <div className="flex items-center rounded-lg bg-gray-800 px-2.5 py-1.5 sm:px-3">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Rechercher..."
                  className="w-24 bg-transparent text-sm text-white outline-none sm:w-40"
                  autoFocus
                  onKeyDown={e => {
                    if (e.key === 'Enter' && searchQuery.trim()) {
                      window.location.href = `/products?search=${encodeURIComponent(searchQuery)}`
                    }
                  }}
                />
                <button onClick={() => setSearchOpen(false)}>
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            ) : (
              <button onClick={() => setSearchOpen(true)} className="text-gray-400 hover:text-white p-2">
                <Search className="w-5 h-5" />
              </button>
            )}

            <Link href="/favorites" className="text-gray-400 hover:text-white p-2 hidden sm:block">
              <Heart className="w-5 h-5" />
            </Link>

            {/* User menu */}
            {!loading && (
              <div className="relative hidden sm:block" ref={userMenuRef}>
                {isAuthenticated ? (
                  <>
                    <button
                      onClick={() => setUserMenuOpen(!userMenuOpen)}
                      className="flex items-center gap-2 text-gray-300 hover:text-white p-1.5 rounded-lg transition-colors"
                    >
                      {avatarUrl ? (
                        <Image
                          src={avatarUrl}
                          alt={displayName}
                          width={28}
                          height={28}
                          className="rounded-full"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 text-xs font-bold">
                          {displayName.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </button>

                    {userMenuOpen && (
                      <div className="absolute right-0 top-full mt-2 w-56 bg-[#111827] border border-gray-700 rounded-xl shadow-xl py-2 z-50">
                        <div className="px-4 py-2 border-b border-gray-700">
                          <p className="text-white text-sm font-medium truncate">{displayName}</p>
                          <p className="text-gray-500 text-xs truncate">{displayEmail}</p>
                        </div>
                        <Link
                          href="/orders"
                          className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-800 hover:text-white"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <Package className="w-4 h-4" />
                          Mes commandes
                        </Link>
                        <Link
                          href="/favorites"
                          className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-800 hover:text-white"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <Heart className="w-4 h-4" />
                          Mes favoris
                        </Link>
                        <Link
                          href="/profile"
                          className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-800 hover:text-white"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <UserCircle className="w-4 h-4" />
                          Mon profil
                        </Link>
                        {isAdmin && (
                          <Link
                            href="/admin"
                            className="flex items-center gap-2 px-4 py-2.5 text-sm text-green-400 hover:bg-gray-800 hover:text-green-300"
                            onClick={() => setUserMenuOpen(false)}
                          >
                            <Shield className="w-4 h-4" />
                            Administration
                          </Link>
                        )}
                        <button
                          onClick={() => { signOut(); setUserMenuOpen(false) }}
                          className="flex items-center gap-2 px-4 py-2.5 text-sm text-red-400 hover:bg-gray-800 w-full text-left"
                        >
                          <LogOut className="w-4 h-4" />
                          Déconnexion
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <Link href="/login" className="text-gray-400 hover:text-white p-2">
                    <User className="w-5 h-5" />
                  </Link>
                )}
              </div>
            )}

            <LanguageSelector />

            <Link href="/cart" className="relative text-gray-400 hover:text-white p-2">
              <ShoppingCart className="w-5 h-5" />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 bg-green-500 text-black text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {totalItems}
                </span>
              )}
            </Link>

            <button
              className="md:hidden text-gray-400 hover:text-white p-2"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-[#0a0f1a] border-t border-gray-800 px-4 pb-4">
          {navLinks.map(link => (
            <Link
              key={link.label}
              href={link.href}
              className="block py-3 text-gray-300 hover:text-white border-b border-gray-800/50 text-sm"
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          {isAuthenticated ? (
            <>
              <div className="flex items-center gap-3 py-3 border-b border-gray-800/50">
                {avatarUrl ? (
                  <Image src={avatarUrl} alt="" width={32} height={32} className="rounded-full" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 text-sm font-bold">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="text-white text-sm">{displayName}</span>
              </div>
              <Link
                href="/orders"
                className="block py-3 text-gray-300 hover:text-white border-b border-gray-800/50 text-sm"
                onClick={() => setMobileOpen(false)}
              >
                Mes commandes
              </Link>
              <Link
                href="/favorites"
                className="block py-3 text-gray-300 hover:text-white border-b border-gray-800/50 text-sm"
                onClick={() => setMobileOpen(false)}
              >
                Mes favoris
              </Link>
              <Link
                href="/profile"
                className="block py-3 text-gray-300 hover:text-white border-b border-gray-800/50 text-sm"
                onClick={() => setMobileOpen(false)}
              >
                Mon profil
              </Link>
              {isAdmin && (
                <Link
                  href="/admin"
                  className="block py-3 text-green-400 hover:text-green-300 border-b border-gray-800/50 text-sm"
                  onClick={() => setMobileOpen(false)}
                >
                  Administration
                </Link>
              )}
              <button
                onClick={() => { signOut(); setMobileOpen(false) }}
                className="block py-3 text-red-400 text-sm w-full text-left"
              >
                Déconnexion
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="block py-3 text-green-400 hover:text-green-300 text-sm"
              onClick={() => setMobileOpen(false)}
            >
              Connexion / Inscription
            </Link>
          )}
        </div>
      )}
    </nav>
  )
}
