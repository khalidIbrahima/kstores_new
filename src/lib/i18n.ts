'use client'

import { useState, useCallback, useEffect } from 'react'

export type Locale = 'fr' | 'en'

export const translations: Record<Locale, Record<string, Record<string, string>>> = {
  fr: {
    nav: {
      home: 'Accueil',
      products: 'Produits',
      categories: 'Catégories',
      cart: 'Panier',
      favorites: 'Favoris',
      orders: 'Commandes',
      profile: 'Profil',
      login: 'Connexion',
      logout: 'Déconnexion',
      contact: 'Contact',
      admin: 'Administration',
    },
    common: {
      loading: 'Chargement...',
      error: 'Une erreur est survenue',
      save: 'Enregistrer',
      cancel: 'Annuler',
      delete: 'Supprimer',
      search: 'Rechercher',
      noResults: 'Aucun résultat trouvé',
      backToHome: 'Retour à l\'accueil',
    },
    footer: {
      about: 'À propos',
      privacy: 'Politique de confidentialité',
      terms: 'Conditions générales',
      returns: 'Retours et remboursements',
      contact: 'Contact',
    },
    product: {
      addToCart: 'Ajouter au panier',
      outOfStock: 'Rupture de stock',
      reviews: 'Avis',
      share: 'Partager',
      description: 'Description',
      specifications: 'Caractéristiques',
    },
    cart: {
      empty: 'Votre panier est vide',
      total: 'Total',
      checkout: 'Passer la commande',
      remove: 'Retirer',
      quantity: 'Quantité',
    },
    checkout: {
      title: 'Finaliser la commande',
      shipping: 'Livraison',
      payment: 'Paiement',
      confirm: 'Confirmer la commande',
      success: 'Commande confirmée avec succès !',
      error: 'Erreur lors de la commande',
    },
    auth: {
      login: 'Connexion',
      register: 'Inscription',
      email: 'Adresse e-mail',
      password: 'Mot de passe',
      name: 'Nom complet',
      forgotPassword: 'Mot de passe oublié ?',
    },
  },
  en: {
    nav: {
      home: 'Home',
      products: 'Products',
      categories: 'Categories',
      cart: 'Cart',
      favorites: 'Favorites',
      orders: 'Orders',
      profile: 'Profile',
      login: 'Login',
      logout: 'Logout',
      contact: 'Contact',
      admin: 'Admin',
    },
    common: {
      loading: 'Loading...',
      error: 'An error occurred',
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      search: 'Search',
      noResults: 'No results found',
      backToHome: 'Back to home',
    },
    footer: {
      about: 'About',
      privacy: 'Privacy Policy',
      terms: 'Terms & Conditions',
      returns: 'Returns & Refunds',
      contact: 'Contact',
    },
    product: {
      addToCart: 'Add to cart',
      outOfStock: 'Out of stock',
      reviews: 'Reviews',
      share: 'Share',
      description: 'Description',
      specifications: 'Specifications',
    },
    cart: {
      empty: 'Your cart is empty',
      total: 'Total',
      checkout: 'Checkout',
      remove: 'Remove',
      quantity: 'Quantity',
    },
    checkout: {
      title: 'Checkout',
      shipping: 'Shipping',
      payment: 'Payment',
      confirm: 'Confirm order',
      success: 'Order confirmed successfully!',
      error: 'Order failed',
    },
    auth: {
      login: 'Login',
      register: 'Register',
      email: 'Email address',
      password: 'Password',
      name: 'Full name',
      forgotPassword: 'Forgot password?',
    },
  },
}

function getNestedValue(obj: Record<string, unknown>, path: string): string {
  const keys = path.split('.')
  let current: unknown = obj
  for (const key of keys) {
    if (current && typeof current === 'object' && key in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[key]
    } else {
      return path
    }
  }
  return typeof current === 'string' ? current : path
}

function getStoredLocale(): Locale {
  if (typeof window === 'undefined') return 'fr'
  try {
    const fromCookie = document.cookie
      .split('; ')
      .find(c => c.startsWith('locale='))
      ?.split('=')[1]
    if (fromCookie === 'fr' || fromCookie === 'en') return fromCookie
    const fromStorage = localStorage.getItem('locale')
    if (fromStorage === 'fr' || fromStorage === 'en') return fromStorage
  } catch {
    // ignore
  }
  return 'fr'
}

function persistLocale(locale: Locale) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem('locale', locale)
    document.cookie = `locale=${locale};path=/;max-age=${60 * 60 * 24 * 365};SameSite=Lax`
  } catch {
    // ignore
  }
}

export function useTranslation() {
  const [locale, setLocaleState] = useState<Locale>('fr')

  useEffect(() => {
    setLocaleState(getStoredLocale())
  }, [])

  const setLocale = useCallback((l: string) => {
    const validLocale = (l === 'en' ? 'en' : 'fr') as Locale
    setLocaleState(validLocale)
    persistLocale(validLocale)
  }, [])

  const t = useCallback(
    (key: string): string => {
      return getNestedValue(
        translations[locale] as unknown as Record<string, unknown>,
        key
      )
    },
    [locale]
  )

  return { t, locale, setLocale }
}
