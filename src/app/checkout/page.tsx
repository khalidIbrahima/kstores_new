'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { MapPin, Lock, Package, User, Phone, Mail, Home, Loader2, Navigation } from 'lucide-react'
import { useCart } from '@/context/CartContext'
import { useAuth } from '@/context/AuthContext'
import { formatPrice } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useStoreSettings } from '@/hooks/useStoreSettings'
import { notifyOrderCreated } from '@/lib/notifications'

interface GeoLocation {
  lat: number
  lng: number
}

export default function CheckoutPage() {
  const router = useRouter()
  const { items, subtotal, clearCart } = useCart()
  const { settings } = useStoreSettings()
  const { isAuthenticated, displayName, displayEmail, profile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [placedOrderId, setPlacedOrderId] = useState<string | null>(null)
  const [location, setLocation] = useState<GeoLocation | null>(null)
  const [locatingGPS, setLocatingGPS] = useState(false)
  const [locationError, setLocationError] = useState('')

  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
  })

  // Pre-fill form with session data
  useEffect(() => {
    if (!isAuthenticated) return
    setForm(prev => ({
      ...prev,
      name: prev.name || displayName,
      email: prev.email || displayEmail,
    }))
  }, [isAuthenticated, displayName, displayEmail])

  const total = subtotal

  const updateForm = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  // Geolocation: get current position
  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError('La geolocalisation n\'est pas supportee par votre navigateur')
      return
    }
    setLocatingGPS(true)
    setLocationError('')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setLocatingGPS(false)
      },
      (err) => {
        setLocationError(
          err.code === 1 ? 'Acces a la localisation refuse. Activez-la dans les parametres.'
          : 'Impossible d\'obtenir votre position. Reessayez.'
        )
        setLocatingGPS(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }, [])

  const canSubmit = form.name.trim() && form.phone.trim() && form.address.trim()

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    setLoading(true)
    try {
      const { data: order, error } = await supabase
        .from('orders')
        .insert({
          status: 'pending',
          total,
          user_id: profile?.id || null,
          shipping_address: {
            name: form.name,
            email: form.email,
            phone: form.phone,
            address: form.address,
          },
          ...(location ? { userGeolocation: { latitude: location.lat, longitude: location.lng } } : {}),
        })
        .select()
        .single()

      if (error) throw error

      if (order) {
        const orderItems = items.map(item => ({
          order_id: order.id,
          product_id: item.product.id,
          quantity: item.quantity,
          price: item.product.price,
        }))

        await supabase.from('order_items').insert(orderItems)

        // Send all notifications (email + WhatsApp, non-blocking)
        notifyOrderCreated({
          id: order.id,
          email: form.email,
          firstName: form.name,
          phone: form.phone,
          address: form.address,
          total,
          items: items.map(item => ({
            name: item.product.name,
            quantity: item.quantity,
            price: item.product.price,
          })),
        })

        // If Wave payment, redirect
        if (settings?.payment_methods?.wave) {
          try {
            const waveRes = await fetch('/api/wave', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ amount: total, orderId: order.id, customerEmail: form.email }),
            })
            const waveData = await waveRes.json()
            if (waveData.checkout_url) {
              window.location.href = waveData.checkout_url
              return
            }
          } catch (err) {
            console.error('Wave checkout error:', err)
          }
        }
      }

      clearCart()
      setPlacedOrderId(order?.id || null)
    } catch (err) {
      console.error('Order error:', err)
      alert('Erreur lors de la commande. Veuillez reessayer.')
    }
    setLoading(false)
  }

  // ─── Order placed success screen ───
  if (placedOrderId) {
    const shortId = placedOrderId.slice(0, 8).toUpperCase()
    return (
      <div className="max-w-lg mx-auto px-4 py-16 sm:py-24 text-center">
        <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <Package className="w-10 h-10 text-green-400" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white mb-3">Commande recue !</h1>
        <p className="text-gray-400 mb-2">
          Merci pour votre commande. Nous vous contacterons tres vite pour confirmer les details de livraison.
        </p>
        <div className="inline-flex items-center gap-2 bg-[#111827] border border-gray-800 rounded-lg px-4 py-2 mb-8">
          <span className="text-gray-500 text-sm">N° commande:</span>
          <span className="text-green-400 font-mono font-bold">#{shortId}</span>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href={`/orders/track/${placedOrderId}`}
            className="bg-green-500 hover:bg-green-600 text-black font-bold px-6 py-3 rounded-lg transition-colors text-sm">
            Suivre ma commande
          </Link>
          <Link href="/products"
            className="border border-gray-700 hover:border-gray-500 text-gray-300 px-6 py-3 rounded-lg transition-colors text-sm">
            Continuer les achats
          </Link>
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <Package className="w-16 h-16 text-gray-600 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-white mb-4">Votre panier est vide</h1>
        <Link href="/products" className="text-green-400 hover:text-green-300">
          Retour aux produits
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl sm:text-4xl font-black italic text-white">
          Finaliser <span className="text-green-400">votre commande</span>
        </h1>
      </div>

      <form onSubmit={handleSubmitOrder}>
        <div className="grid lg:grid-cols-3 gap-6">
          {/* ═══ LEFT: Form ═══ */}
          <div className="lg:col-span-2 space-y-5">
            {/* Guest banner */}
            {!isAuthenticated && (
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <p className="text-blue-400 text-sm font-medium">Commander sans compte</p>
                  <p className="text-gray-400 text-xs mt-0.5">
                    Remplissez vos coordonnees ci-dessous.
                    {' '}
                    <Link href="/login" className="text-green-400 hover:text-green-300 underline">
                      Se connecter
                    </Link>
                    {' '}pour suivre vos commandes.
                  </p>
                </div>
              </div>
            )}

            {/* Contact Information */}
            <div className="bg-[#111827] border border-gray-800 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <User className="w-4 h-4 text-green-400" />
                <h2 className="text-white font-bold">Informations de contact</h2>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Nom complet *</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                    <input
                      type="text"
                      value={form.name}
                      onChange={e => updateForm('name', e.target.value)}
                      required
                      placeholder="Votre nom complet"
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-3 text-white text-sm outline-none focus:border-green-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Telephone *</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                      <input
                        type="tel"
                        value={form.phone}
                        onChange={e => updateForm('phone', e.target.value)}
                        required
                        placeholder="+221 XX XXX XX XX"
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-3 text-white text-sm outline-none focus:border-green-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Email <span className="text-gray-600">(optionnel)</span></label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                      <input
                        type="email"
                        value={form.email}
                        onChange={e => updateForm('email', e.target.value)}
                        placeholder="votre@email.com"
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-3 text-white text-sm outline-none focus:border-green-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Shipping Address */}
            <div className="bg-[#111827] border border-gray-800 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Home className="w-4 h-4 text-green-400" />
                <h2 className="text-white font-bold">Adresse de livraison</h2>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Adresse *</label>
                <div className="relative">
                  <Home className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                  <input
                    type="text"
                    value={form.address}
                    onChange={e => updateForm('address', e.target.value)}
                    required
                    placeholder="Quartier, rue, repere..."
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-3 text-white text-sm outline-none focus:border-green-500"
                  />
                </div>
              </div>
            </div>

            {/* Geolocation */}
            <div className="bg-[#111827] border border-gray-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-green-400" />
                  <h2 className="text-white font-bold">Localisation</h2>
                </div>
                {location && (
                  <span className="text-xs px-2.5 py-1 rounded-full bg-green-400/10 text-green-400 font-medium">
                    Position capturee
                  </span>
                )}
              </div>

              {location ? (
                <div className="space-y-3">
                  {/* Map preview */}
                  <div className="h-[180px] sm:h-[250px] rounded-lg overflow-hidden border border-gray-700 bg-gray-900 relative">
                    <iframe
                      src={`https://www.openstreetmap.org/export/embed.html?bbox=${location.lng - 0.005},${location.lat - 0.003},${location.lng + 0.005},${location.lat + 0.003}&layer=mapnik&marker=${location.lat},${location.lng}`}
                      className="w-full h-full border-0"
                      title="Location"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-gray-400 text-xs font-mono">
                      {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                    </p>
                    <button
                      type="button"
                      onClick={getCurrentLocation}
                      className="text-green-400 hover:text-green-300 text-xs flex items-center gap-1"
                    >
                      <Navigation className="w-3 h-3" /> Actualiser
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="h-[160px] sm:h-[200px] rounded-lg border-2 border-dashed border-gray-700 flex flex-col items-center justify-center bg-gray-900/50">
                    <MapPin className="w-10 h-10 text-gray-600 mb-3" />
                    <p className="text-gray-500 text-sm mb-1">Partagez votre position</p>
                    <p className="text-gray-600 text-xs mb-4">Pour une livraison precise a votre porte</p>
                    <button
                      type="button"
                      onClick={getCurrentLocation}
                      disabled={locatingGPS}
                      className="bg-green-500 hover:bg-green-600 text-black font-bold px-6 py-2.5 rounded-lg flex items-center gap-2 text-sm transition-colors disabled:opacity-50"
                    >
                      {locatingGPS ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Localisation en cours...</>
                      ) : (
                        <><Navigation className="w-4 h-4" /> Partager ma position</>
                      )}
                    </button>
                  </div>
                  {locationError && (
                    <p className="text-red-400 text-xs">{locationError}</p>
                  )}
                </div>
              )}
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading || !canSubmit}
              className="w-full bg-green-500 hover:bg-green-600 text-black font-bold py-4 rounded-xl flex items-center justify-center gap-2 text-lg transition-colors disabled:opacity-50"
            >
              {loading ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Traitement en cours...</>
              ) : (
                <><Lock className="w-5 h-5" /> Confirmer la commande</>
              )}
            </button>
          </div>

          {/* ═══ RIGHT: Order Summary ═══ */}
          <div>
            <div className="bg-[#111827] border border-gray-800 rounded-xl p-5 sticky top-20">
              <h2 className="text-white font-bold mb-4">Recapitulatif</h2>

              <div className="space-y-3 mb-4 max-h-[300px] overflow-y-auto pr-1">
                {items.map(item => (
                    <div key={item.product.id} className="flex items-center gap-3">
                      <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-900 flex-shrink-0">
                        <Image
                          src={item.product.image_url}
                          alt={item.product.name}
                          fill
                          className="object-cover"
                          sizes="48px"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">{item.product.name}</p>
                        <p className="text-gray-500 text-xs">Qte: {item.quantity}</p>
                      </div>
                      <span className="text-green-400 font-bold text-sm">{formatPrice(item.product.price * item.quantity)}</span>
                    </div>
                ))}
              </div>

              <div className="border-t border-gray-700 pt-4 space-y-2 text-sm">
                <div className="flex justify-between text-gray-400">
                  <span>Sous-total</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Livraison</span>
                  <span className="text-yellow-400 text-xs">A determiner</span>
                </div>
                <div className="border-t border-gray-700 pt-2 flex justify-between">
                  <span className="text-white font-bold">Total</span>
                  <span className="text-green-400 font-bold text-xl">{formatPrice(total)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
