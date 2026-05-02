'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { adminFetch } from '@/lib/admin-fetch'
import { formatPrice } from '@/lib/utils'
import {
  ArrowLeft, Save, Plus, Trash2, Search, User, Phone, Mail, Home, Package, Loader2, Truck,
} from 'lucide-react'

interface Product {
  id: string; name: string; price: number; image_url: string
  promotion_active: boolean | null; promotion_percentage: number | null
  stock: number | null; inventory: number
}

interface CartItem {
  product: Product
  quantity: number
  unitPrice: number
}

export default function AdminCreateOrder() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '' })
  const [shippingFee, setShippingFee] = useState('')
  const [cartItems, setCartItems] = useState<CartItem[]>([])

  // Product search
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Product[]>([])
  const [searching, setSearching] = useState(false)
  const searchTimeout = useRef<NodeJS.Timeout>(null)

  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return }
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(async () => {
      setSearching(true)
      const { data } = await supabase
        .from('products')
        .select('id, name, price, image_url, promotion_active, promotion_percentage, stock, inventory')
        .ilike('name', `%${searchQuery}%`)
        .limit(6)
      setSearchResults((data || []) as Product[])
      setSearching(false)
    }, 300)
  }, [searchQuery])

  const addProduct = (product: Product) => {
    const exists = cartItems.find(i => i.product.id === product.id)
    if (exists) {
      setCartItems(prev => prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i))
    } else {
      setCartItems(prev => [...prev, { product, quantity: 1, unitPrice: product.price }])
    }
    setSearchQuery('')
    setSearchResults([])
  }

  const removeItem = (productId: string) => {
    setCartItems(prev => prev.filter(i => i.product.id !== productId))
  }

  const updateQuantity = (productId: string, qty: number) => {
    if (qty < 1) return
    setCartItems(prev => prev.map(i => i.product.id === productId ? { ...i, quantity: qty } : i))
  }

  const subtotal = cartItems.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0)
  const shipping = Math.max(0, Number(shippingFee) || 0)
  const total = subtotal + shipping

  const canSubmit = form.name.trim() && form.phone.trim() && cartItems.length > 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    setSaving(true)

    const orderRes = await adminFetch('/api/admin/orders', {
      method: 'POST',
      body: JSON.stringify({
        status: 'processing',
        total,
        user_id: null,
        shipping_address: {
          name: form.name,
          email: form.email || null,
          phone: form.phone,
          address: form.address || null,
          _meta: shipping > 0 ? { shipping_fee: shipping } : undefined,
        },
      }),
    })
    const orderJson = await orderRes.json().catch(() => ({})) as { order?: { id: string }; error?: string }
    if (!orderRes.ok || !orderJson.order) {
      alert('Erreur: ' + (orderJson.error || 'Impossible de creer la commande'))
      setSaving(false)
      return
    }
    const order = orderJson.order

    const orderItems = cartItems.map(i => ({
      order_id: order.id,
      product_id: i.product.id,
      quantity: i.quantity,
      price: i.unitPrice,
    }))

    await adminFetch('/api/admin/order-items', {
      method: 'POST',
      body: JSON.stringify({ items: orderItems }),
    })

    router.push(`/admin/orders/${order.id}`)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/admin/orders" className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-gray-800">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-lg sm:text-2xl font-black text-white">Nouvelle commande</h1>
          <p className="text-gray-500 text-xs mt-0.5">Creer une commande manuellement</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left — Customer + Products */}
          <div className="lg:col-span-2 space-y-4">
            {/* Customer info */}
            <div className="bg-[#111827] border border-gray-800 rounded-xl p-4 sm:p-5">
              <h2 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
                <User className="w-4 h-4 text-green-400" /> Client
              </h2>
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Nom complet *</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                      <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required
                        placeholder="Nom du client"
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-3 py-2.5 text-white text-sm outline-none focus:border-green-500" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Telephone *</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                      <input type="tel" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} required
                        placeholder="+221 XX XXX XX XX"
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-3 py-2.5 text-white text-sm outline-none focus:border-green-500" />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                      <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                        placeholder="email@example.com"
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-3 py-2.5 text-white text-sm outline-none focus:border-green-500" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Adresse</label>
                    <div className="relative">
                      <Home className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                      <input type="text" value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
                        placeholder="Quartier, rue..."
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-3 py-2.5 text-white text-sm outline-none focus:border-green-500" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Product search + cart */}
            <div className="bg-[#111827] border border-gray-800 rounded-xl p-4 sm:p-5">
              <h2 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
                <Package className="w-4 h-4 text-blue-400" /> Articles
              </h2>

              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Rechercher un produit..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-3 py-2.5 text-white text-sm outline-none focus:border-green-500"
                />
                {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-400 animate-spin" />}

                {/* Search results dropdown */}
                {searchResults.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-[#1a2332] border border-gray-700 rounded-lg shadow-xl z-30 max-h-[250px] overflow-y-auto">
                    {searchResults.map(p => (
                        <button key={p.id} type="button" onClick={() => addProduct(p)}
                          className="w-full flex items-center gap-3 p-3 hover:bg-gray-800/50 transition-colors text-left">
                          <img src={p.image_url} alt="" className="w-10 h-10 rounded-lg object-cover bg-gray-900 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm truncate">{p.name}</p>
                            <p className="text-green-400 text-xs font-bold">{formatPrice(p.price)}</p>
                          </div>
                          <Plus className="w-4 h-4 text-gray-500 flex-shrink-0" />
                        </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Cart items */}
              {cartItems.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="w-10 h-10 text-gray-700 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">Ajoutez des produits a la commande</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {cartItems.map(item => (
                    <div key={item.product.id} className="flex items-center gap-3 bg-gray-800/30 rounded-lg p-3">
                      <img src={item.product.image_url} alt="" className="w-12 h-12 rounded-lg object-cover bg-gray-900 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">{item.product.name}</p>
                        <p className="text-green-400 text-xs font-bold">{formatPrice(item.unitPrice)}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                          className="w-7 h-7 rounded bg-gray-800 text-gray-400 hover:text-white flex items-center justify-center text-sm">-</button>
                        <span className="w-8 text-center text-white text-sm font-bold">{item.quantity}</span>
                        <button type="button" onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                          className="w-7 h-7 rounded bg-gray-800 text-gray-400 hover:text-white flex items-center justify-center text-sm">+</button>
                      </div>
                      <span className="text-green-400 font-bold text-sm w-24 text-right">{formatPrice(item.unitPrice * item.quantity)}</span>
                      <button type="button" onClick={() => removeItem(item.product.id)}
                        className="p-1.5 text-gray-500 hover:text-red-400 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right — Summary */}
          <div className="space-y-4">
            <div className="bg-[#111827] border border-gray-800 rounded-xl p-4 sm:p-5 sticky top-20">
              <h2 className="text-white font-bold text-sm mb-4">Recapitulatif</h2>

              <div className="space-y-2 text-sm mb-4">
                <div className="flex justify-between text-gray-400">
                  <span>Sous-total ({cartItems.reduce((s, i) => s + i.quantity, 0)} articles)</span>
                  <span className="text-white">{formatPrice(subtotal)}</span>
                </div>
              </div>

              {/* Shipping fee */}
              <div className="mb-4">
                <label className="text-gray-400 text-xs font-medium mb-1 flex items-center gap-1">
                  <Truck className="w-3 h-3 text-blue-400" /> Frais de livraison (F CFA)
                </label>
                <input type="number" min={0} step={100} value={shippingFee}
                  onChange={e => setShippingFee(e.target.value)}
                  placeholder="0"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-green-500" />
              </div>

              {shipping > 0 && (
                <div className="flex justify-between text-sm text-gray-400 mb-2">
                  <span>Livraison</span>
                  <span className="text-blue-400">{formatPrice(shipping)}</span>
                </div>
              )}

              <div className="border-t border-gray-700 pt-3 flex justify-between mb-6">
                <span className="text-white font-bold">Total</span>
                <span className="text-green-400 font-bold text-xl">{formatPrice(total)}</span>
              </div>

              <button type="submit" disabled={saving || !canSubmit}
                className="w-full bg-green-500 hover:bg-green-600 text-black font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50">
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Creation...</> : <><Save className="w-4 h-4" /> Creer la commande</>}
              </button>

              <p className="text-gray-600 text-xs text-center mt-3">
                La commande sera creee avec le statut &quot;Confirmee&quot;
              </p>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
