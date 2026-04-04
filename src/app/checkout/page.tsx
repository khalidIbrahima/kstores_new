'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ChevronRight, Lock, CreditCard, Truck, Package } from 'lucide-react'
import { useCart } from '@/context/CartContext'
import { useAuth } from '@/context/AuthContext'
import { formatPrice, getDiscountedPrice } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useStoreSettings } from '@/hooks/useStoreSettings'
import { notifyOrderCreated } from '@/lib/notifications'

type Step = 1 | 2 | 3

const PAYMENT_CONFIG: Record<string, { label: string; sub: string }> = {
  wave: { label: 'Wave', sub: 'Paiement mobile' },
  orange_money: { label: 'Orange Money', sub: 'Mobile Money' },
  credit_card: { label: 'Carte bancaire', sub: 'Visa, Mastercard' },
  paypal: { label: 'PayPal', sub: 'Paiement en ligne' },
  bank_transfer: { label: 'Virement bancaire', sub: 'Virement direct' },
  cash_on_delivery: { label: 'Paiement à la livraison', sub: 'Espèces à réception' },
}

export default function CheckoutPage() {
  const { items, subtotal, clearCart } = useCart()
  const { settings } = useStoreSettings()
  const { isAuthenticated, displayName, displayEmail, profile } = useAuth()
  const [step, setStep] = useState<Step>(1)
  const [loading, setLoading] = useState(false)
  const [orderPlaced, setOrderPlaced] = useState(false)
  const [promoCode, setPromoCode] = useState('')

  const enabledPayments = settings?.payment_methods
    ? Object.entries(settings.payment_methods).filter(([, enabled]) => enabled).map(([key]) => key)
    : ['wave', 'cash_on_delivery']

  const [form, setForm] = useState({
    email: '',
    firstName: '',
    lastName: '',
    address: '',
    city: '',
    country: 'Sénégal',
    phone: '',
    paymentMethod: enabledPayments[0] || 'wave',
    cardNumber: '',
    cardExpiry: '',
    cardCvv: '',
    cardName: '',
  })

  // Pre-fill form with session data
  useEffect(() => {
    if (!isAuthenticated) return
    setForm(prev => ({
      ...prev,
      email: prev.email || displayEmail,
      firstName: prev.firstName || displayName.split(' ')[0] || '',
      lastName: prev.lastName || displayName.split(' ').slice(1).join(' ') || '',
    }))
  }, [isAuthenticated, displayName, displayEmail])

  const freeShippingThreshold = settings?.shipping_options?.free_shipping_threshold ?? 35000
  const standardShippingCost = settings?.shipping_options?.standard_shipping_cost ?? 1500
  const shipping = subtotal >= freeShippingThreshold ? 0 : standardShippingCost
  const total = subtotal + shipping

  const updateForm = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmitOrder = async () => {
    setLoading(true)
    try {
      const { data: order, error } = await supabase
        .from('orders')
        .insert({
          status: 'pending',
          total,
          user_id: profile?.id || null,
          shipping_address: {
            firstName: form.firstName,
            lastName: form.lastName,
            address: form.address,
            city: form.city,
            country: form.country,
            phone: form.phone,
            email: form.email,
          },
        })
        .select()
        .single()

      if (error) throw error

      if (order) {
        const orderItems = items.map(item => ({
          order_id: order.id,
          product_id: item.product.id,
          quantity: item.quantity,
          price: item.product.promotion_active && item.product.promotion_percentage
            ? getDiscountedPrice(item.product.price, item.product.promotion_percentage)
            : item.product.price,
        }))

        await supabase.from('order_items').insert(orderItems)

        // Send all notifications (email + WhatsApp, non-blocking)
        notifyOrderCreated({
          id: order.id,
          email: form.email,
          firstName: form.firstName,
          phone: form.phone,
          total,
          items: items.map(item => ({
            name: item.product.name,
            quantity: item.quantity,
            price: item.product.promotion_active && item.product.promotion_percentage
              ? getDiscountedPrice(item.product.price, item.product.promotion_percentage)
              : item.product.price,
          })),
        })

        // If Wave payment, redirect to Wave checkout
        if (form.paymentMethod === 'wave') {
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
      setOrderPlaced(true)
    } catch (err) {
      console.error('Order error:', err)
      alert('Erreur lors de la commande. Veuillez réessayer.')
    }
    setLoading(false)
  }

  if (orderPlaced) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <Package className="w-10 h-10 text-green-400" />
        </div>
        <h1 className="text-3xl font-black text-white mb-3">Commande confirmée !</h1>
        <p className="text-gray-400 mb-8">
          Merci pour votre commande ! Nous vous contacterons très vite pour confirmer les détails de livraison.
        </p>
        <Link
          href="/products"
          className="inline-flex bg-green-500 hover:bg-green-600 text-black font-bold px-8 py-3 rounded-lg"
        >
          Continuer les achats
        </Link>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
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
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-black italic text-white">
          Finaliser <span className="text-green-400">votre commande</span>
        </h1>
        <nav className="flex items-center gap-2 text-sm text-gray-500 mt-2">
          <Link href="/" className="hover:text-white">Accueil</Link>
          <ChevronRight className="w-3 h-3" />
          <Link href="/cart" className="hover:text-white">Panier</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-green-400">Checkout</span>
        </nav>
      </div>

      {/* Steps */}
      <div className="flex items-center justify-center gap-4 mb-10">
        {[
          { num: 1, label: 'Informations' },
          { num: 2, label: 'Livraison' },
          { num: 3, label: 'Paiement' },
        ].map((s, i) => (
          <div key={s.num} className="flex items-center gap-3">
            <button
              onClick={() => s.num <= step && setStep(s.num as Step)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                s.num === step
                  ? 'bg-green-500 text-black'
                  : s.num < step
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-gray-800 text-gray-500'
              }`}
            >
              <span className="w-6 h-6 rounded-full bg-black/20 flex items-center justify-center text-xs font-bold">
                {s.num}
              </span>
              {s.label}
            </button>
            {i < 2 && <div className="w-12 h-px bg-gray-700 hidden sm:block" />}
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Step 1: Information */}
          {step === 1 && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-[#111827] border border-gray-800 rounded-xl p-6">
                <h2 className="text-white font-bold text-lg mb-4">Informations de contact</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Email *</label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={e => updateForm('email', e.target.value)}
                      placeholder="votre@email.com"
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white outline-none focus:border-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Téléphone</label>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={e => updateForm('phone', e.target.value)}
                      placeholder="+221 XX XXX XX XX"
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white outline-none focus:border-green-500"
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={() => setStep(2)}
                className="w-full bg-green-500 hover:bg-green-600 text-black font-bold py-3 rounded-lg transition-colors"
              >
                Continuer vers la livraison
              </button>
            </div>
          )}

          {/* Step 2: Shipping */}
          {step === 2 && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-[#111827] border border-gray-800 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Truck className="w-5 h-5 text-green-400" />
                  <h2 className="text-white font-bold text-lg">Informations de livraison</h2>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Prénom *</label>
                    <input
                      type="text"
                      value={form.firstName}
                      onChange={e => updateForm('firstName', e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white outline-none focus:border-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Nom *</label>
                    <input
                      type="text"
                      value={form.lastName}
                      onChange={e => updateForm('lastName', e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white outline-none focus:border-green-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm text-gray-400 mb-1">Adresse *</label>
                    <input
                      type="text"
                      value={form.address}
                      onChange={e => updateForm('address', e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white outline-none focus:border-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Ville *</label>
                    <input
                      type="text"
                      value={form.city}
                      onChange={e => updateForm('city', e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white outline-none focus:border-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Pays *</label>
                    <select
                      value={form.country}
                      onChange={e => updateForm('country', e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white outline-none focus:border-green-500"
                    >
                      <option>Sénégal</option>
                      <option>France</option>
                      <option>Côte d&apos;Ivoire</option>
                      <option>Mali</option>
                      <option>Guinée</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 border border-gray-700 hover:border-gray-500 text-gray-300 py-3 rounded-lg transition-colors"
                >
                  Retour
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="flex-1 bg-green-500 hover:bg-green-600 text-black font-bold py-3 rounded-lg transition-colors"
                >
                  Continuer vers le paiement
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Payment */}
          {step === 3 && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-[#111827] border border-gray-800 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <CreditCard className="w-5 h-5 text-green-400" />
                  <h2 className="text-white font-bold text-lg">Méthode de paiement</h2>
                </div>

                {/* Payment methods from DB */}
                <div className={`grid gap-3 mb-6 ${enabledPayments.length <= 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                  {enabledPayments.map(key => {
                    const config = PAYMENT_CONFIG[key] || { label: key, sub: '' }
                    return (
                      <button
                        key={key}
                        onClick={() => updateForm('paymentMethod', key)}
                        className={`p-4 rounded-xl border-2 text-center transition-all ${
                          form.paymentMethod === key
                            ? 'border-green-500 bg-green-500/10'
                            : 'border-gray-700 hover:border-gray-500'
                        }`}
                      >
                        <p className="text-white text-sm font-medium">{config.label}</p>
                        <p className="text-gray-500 text-xs mt-1">{config.sub}</p>
                      </button>
                    )
                  })}
                </div>

                {form.paymentMethod === 'credit_card' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Numéro de carte *</label>
                      <input
                        type="text"
                        value={form.cardNumber}
                        onChange={e => updateForm('cardNumber', e.target.value)}
                        placeholder="1234 5678 9012 3456"
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white outline-none focus:border-green-500"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">Date d&apos;expiration *</label>
                        <input
                          type="text"
                          value={form.cardExpiry}
                          onChange={e => updateForm('cardExpiry', e.target.value)}
                          placeholder="MM/AA"
                          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white outline-none focus:border-green-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">CVV *</label>
                        <input
                          type="text"
                          value={form.cardCvv}
                          onChange={e => updateForm('cardCvv', e.target.value)}
                          placeholder="123"
                          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white outline-none focus:border-green-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Nom sur la carte *</label>
                      <input
                        type="text"
                        value={form.cardName}
                        onChange={e => updateForm('cardName', e.target.value)}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white outline-none focus:border-green-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 border border-gray-700 hover:border-gray-500 text-gray-300 py-3 rounded-lg transition-colors"
                >
                  Retour
                </button>
                <button
                  onClick={handleSubmitOrder}
                  disabled={loading}
                  className="flex-1 bg-green-500 hover:bg-green-600 text-black font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  <Lock className="w-4 h-4" />
                  {loading ? 'Traitement...' : 'Finaliser la commande'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Order Recap Sidebar */}
        <div>
          <div className="bg-[#111827] border border-gray-800 rounded-xl p-6 sticky top-20">
            <h2 className="text-white font-bold text-lg mb-4">Récapitulatif</h2>

            <div className="space-y-3 mb-4">
              {items.map(item => {
                const hasPromo = item.product.promotion_active && item.product.promotion_percentage
                const price = hasPromo
                  ? getDiscountedPrice(item.product.price, item.product.promotion_percentage)
                  : item.product.price

                return (
                  <div key={item.product.id} className="flex items-center gap-3">
                    <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-gray-900 flex-shrink-0">
                      <Image
                        src={item.product.image_url}
                        alt={item.product.name}
                        fill
                        className="object-cover"
                        sizes="56px"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{item.product.name}</p>
                      <p className="text-gray-500 text-xs">Qté: {item.quantity}</p>
                    </div>
                    <span className="text-green-400 font-bold text-sm">{formatPrice(price * item.quantity)}</span>
                  </div>
                )
              })}
            </div>

            <div className="border-t border-gray-700 pt-4 space-y-2 text-sm">
              <div className="flex justify-between text-gray-400">
                <span>Sous-total</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Livraison</span>
                <span className={shipping === 0 ? 'text-green-400' : ''}>
                  {shipping === 0 ? 'Gratuite' : formatPrice(shipping)}
                </span>
              </div>
              <div className="border-t border-gray-700 pt-2 flex justify-between">
                <span className="text-white font-bold">Total</span>
                <span className="text-green-400 font-bold text-xl">{formatPrice(total)}</span>
              </div>
            </div>

            {/* Promo code */}
            <div className="mt-4 flex gap-2">
              <input
                type="text"
                value={promoCode}
                onChange={e => setPromoCode(e.target.value)}
                placeholder="Code promo"
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-green-500"
              />
              <button className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm transition-colors">
                Appliquer
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
