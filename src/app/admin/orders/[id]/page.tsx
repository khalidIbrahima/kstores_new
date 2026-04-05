'use client'

import { useState, useEffect, use, useRef, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { formatPrice } from '@/lib/utils'
import { generateInvoiceHtml } from '@/lib/invoice'
import { notifyStatusUpdate } from '@/lib/notifications'
import { useToast } from '@/components/ToastProvider'
import {
  ArrowLeft,
  Loader2,
  Clock,
  CheckCircle2,
  Truck,
  XCircle,
  MapPin,
  Phone,
  Mail,
  Save,
  Pencil,
  Plus,
  X,
  Search,
  FileText,
  Package,
  CalendarDays,
  DollarSign,
  Trash2,
  Navigation,
  ExternalLink,
} from 'lucide-react'

interface OrderItem {
  id: string
  quantity: number
  price: number
  products: { name: string; image_url: string } | null
}

interface ShippingAddress {
  name?: string
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  address?: string
  city?: string
  country?: string
  postalCode?: string
  _meta?: {
    admin_discount_amount?: number
  }
}

type ShippingAddressFieldKey = Exclude<keyof ShippingAddress, '_meta'>

interface GeoLocation {
  latitude?: number
  longitude?: number
}

interface Order {
  id: string
  created_at: string
  status: string
  total: number
  shipping_address: ShippingAddress
  userGeolocation?: GeoLocation | null
}

interface ProductResult {
  id: string
  name: string
  price: number
  image_url: string | null
}

const STATUSES = [
  { value: 'pending', label: 'Recue', color: 'text-yellow-400', icon: Clock },
  { value: 'confirmed', label: 'Confirmee', color: 'text-blue-400', icon: CheckCircle2 },
  { value: 'shipped', label: 'Expediee', color: 'text-purple-400', icon: Truck },
  { value: 'delivered', label: 'Livree', color: 'text-green-400', icon: CheckCircle2 },
  { value: 'cancelled', label: 'Annulee', color: 'text-red-400', icon: XCircle },
]

const TIMELINE_STATUSES = ['pending', 'confirmed', 'shipped', 'delivered']

const getItemsSubtotal = (items: OrderItem[]) =>
  items.reduce((sum, item) => sum + item.price * item.quantity, 0)

const getOrderDiscount = (order: Order | null) => {
  if (!order) return 0
  return Math.max(0, Number(order.shipping_address?._meta?.admin_discount_amount) || 0)
}

const getBaseAdjustment = (order: Order | null, items: OrderItem[]) => {
  if (!order) return 0
  return order.total - getItemsSubtotal(items) + getOrderDiscount(order)
}

const clampDiscount = (value: number, subtotal: number, baseAdjustment: number) =>
  Math.max(0, Math.min(Number.isFinite(value) ? value : 0, Math.max(0, subtotal + baseAdjustment)))

interface DeleteOrderItemResponse {
  success?: boolean
  error?: string
  total?: number
  discount?: number
}

// ─── Edit Customer Modal ────────────────────────────────────────────────────
function EditCustomerModal({
  address,
  onSave,
  onClose,
}: {
  address: ShippingAddress
  onSave: (addr: ShippingAddress) => void
  onClose: () => void
}) {
  const [form, setForm] = useState<ShippingAddress>({ ...address })
  const fields: { key: ShippingAddressFieldKey; label: string }[] = [
    { key: 'firstName', label: 'Prenom' },
    { key: 'lastName', label: 'Nom' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Telephone' },
    { key: 'address', label: 'Adresse' },
    { key: 'city', label: 'Ville' },
    { key: 'country', label: 'Pays' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#111827] border border-gray-700 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-gray-800">
          <h3 className="text-white font-bold text-lg">Modifier le client</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 space-y-3 max-h-[60vh] overflow-y-auto">
          {fields.map(({ key, label }) => (
            <div key={key}>
              <label className="text-gray-400 text-xs font-medium mb-1 block">{label}</label>
              <input
                type="text"
                value={form[key] || ''}
                onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-green-500 transition-colors"
              />
            </div>
          ))}
        </div>
        <div className="flex gap-3 p-5 border-t border-gray-800">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-lg border border-gray-700 text-gray-300 text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={() => onSave(form)}
            className="flex-1 bg-green-500 hover:bg-green-600 text-black font-bold px-4 py-2.5 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  )
}

function ConfirmDeleteItemDialog({
  itemName,
  loading,
  onConfirm,
  onClose,
}: {
  itemName: string
  loading: boolean
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-700 bg-[#111827] shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-800 p-5">
          <h3 className="text-lg font-bold text-white">Supprimer l&apos;article</h3>
          <button
            onClick={onClose}
            disabled={loading}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-800 hover:text-white disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3 p-5">
          <p className="text-sm text-gray-300">
            Voulez-vous vraiment retirer <span className="font-semibold text-white">{itemName}</span> de cette commande ?
          </p>
          <p className="text-xs text-gray-500">
            Cette action supprimera la ligne et recalculera automatiquement le total de la commande.
          </p>
        </div>

        <div className="flex gap-3 border-t border-gray-800 p-5">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 rounded-lg border border-gray-700 px-4 py-2.5 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-800 disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-500 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-red-600 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            {loading ? 'Suppression...' : 'Supprimer'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Add Item Modal ─────────────────────────────────────────────────────────
function AddItemModal({
  orderId,
  onSave,
  onClose,
}: {
  orderId: string
  onSave: (item: OrderItem, productName: string) => void
  onClose: () => void
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [results, setResults] = useState<ProductResult[]>([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState<ProductResult | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [price, setPrice] = useState(0)
  const [saving, setSaving] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const searchProducts = (query: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    setSearchQuery(query)
    if (query.length < 2) {
      setResults([])
      return
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      const { data } = await supabase
        .from('products')
        .select('id, name, price, image_url')
        .ilike('name', `%${query}%`)
        .limit(8)
      setResults((data || []) as ProductResult[])
      setSearching(false)
    }, 300)
  }

  const selectProduct = (product: ProductResult) => {
    setSelected(product)
    setPrice(product.price)
    setSearchQuery(product.name)
    setResults([])
  }

  const handleSave = async () => {
    if (!selected) return
    setSaving(true)
    const { data } = await supabase
      .from('order_items')
      .insert({
        order_id: orderId,
        product_id: selected.id,
        quantity,
        price,
      })
      .select('*, products(name, image_url)')
      .single()
    if (data) {
      onSave(data as OrderItem, selected.name)
    }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#111827] border border-gray-700 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-gray-800">
          <h3 className="text-white font-bold text-lg">Ajouter un article</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          {/* Product Search */}
          <div className="relative">
            <label className="text-gray-400 text-xs font-medium mb-1 block">Produit</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => searchProducts(e.target.value)}
                placeholder="Rechercher un produit..."
                className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-10 pr-4 py-2.5 text-white text-sm outline-none focus:border-green-500 transition-colors"
              />
            </div>
            {/* Search results dropdown */}
            {(results.length > 0 || searching) && (
              <div className="absolute z-10 w-full mt-1 bg-gray-900 border border-gray-700 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                {searching ? (
                  <div className="p-3 text-center text-gray-500 text-sm">Recherche...</div>
                ) : (
                  results.map(product => (
                    <button
                      key={product.id}
                      onClick={() => selectProduct(product)}
                      className="w-full flex items-center gap-3 p-3 hover:bg-gray-800 text-left transition-colors"
                    >
                      <div className="w-8 h-8 rounded bg-gray-800 overflow-hidden flex-shrink-0 relative">
                        {product.image_url && (
                          <Image src={product.image_url} alt="" fill className="object-cover" sizes="32px" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm truncate">{product.name}</p>
                        <p className="text-green-400 text-xs">{formatPrice(product.price)}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {selected && (
            <div className="flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
              <div className="w-10 h-10 rounded bg-gray-800 overflow-hidden flex-shrink-0 relative">
                {selected.image_url && (
                  <Image src={selected.image_url} alt="" fill className="object-cover" sizes="40px" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{selected.name}</p>
                <p className="text-green-400 text-xs">{formatPrice(selected.price)}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-gray-400 text-xs font-medium mb-1 block">Quantite</label>
              <input
                type="number"
                min={1}
                value={quantity}
                onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-green-500 transition-colors"
              />
            </div>
            <div>
              <label className="text-gray-400 text-xs font-medium mb-1 block">Prix unitaire</label>
              <input
                type="number"
                min={0}
                value={price}
                onChange={e => setPrice(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-green-500 transition-colors"
              />
            </div>
          </div>

          {selected && (
            <div className="text-right text-sm text-gray-400">
              Sous-total: <span className="text-green-400 font-bold">{formatPrice(price * quantity)}</span>
            </div>
          )}
        </div>
        <div className="flex gap-3 p-5 border-t border-gray-800">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-lg border border-gray-700 text-gray-300 text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={!selected || saving}
            className="flex-1 bg-green-500 hover:bg-green-600 text-black font-bold px-4 py-2.5 rounded-lg text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            {saving ? 'Ajout...' : 'Ajouter'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Order Timeline ─────────────────────────────────────────────────────────
function OrderTimeline({ status }: { status: string }) {
  const isCancelled = status === 'cancelled'
  const currentIndex = TIMELINE_STATUSES.indexOf(status)
  const labels = ['Recue', 'Confirmee', 'Expediee', 'Livree']

  return (
    <div className="flex items-center justify-between w-full py-2">
      {TIMELINE_STATUSES.map((s, i) => {
        const reached = !isCancelled && currentIndex >= i
        const isLast = i === TIMELINE_STATUSES.length - 1
        return (
          <div key={s} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              {isCancelled ? (
                <div className="w-8 h-8 rounded-full border-2 border-red-500/40 bg-red-500/10 flex items-center justify-center">
                  <X className="w-4 h-4 text-red-400" />
                </div>
              ) : (
                <div
                  className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${
                    reached
                      ? 'border-green-500 bg-green-500 text-black'
                      : 'border-gray-600 bg-transparent text-gray-600'
                  }`}
                >
                  {reached && <CheckCircle2 className="w-4 h-4" />}
                </div>
              )}
              <span className={`text-[10px] mt-1.5 font-medium ${
                isCancelled ? 'text-red-400' : reached ? 'text-green-400' : 'text-gray-600'
              }`}>
                {isCancelled && i === 0 ? 'Annulee' : labels[i]}
              </span>
            </div>
            {!isLast && (
              <div className="flex-1 mx-1">
                <div
                  className={`h-0.5 w-full rounded-full transition-all ${
                    isCancelled
                      ? 'bg-red-500/20'
                      : !isCancelled && currentIndex > i
                        ? 'bg-green-500'
                        : 'bg-gray-700'
                  }`}
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Main Page ──────────────────────────────────────────────────────────────
export default function OrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const toast = useToast()
  const [order, setOrder] = useState<Order | null>(null)
  const [items, setItems] = useState<OrderItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingDiscount, setSavingDiscount] = useState(false)
  const [newStatus, setNewStatus] = useState('')
  const [notifyCustomer, setNotifyCustomer] = useState(true)
  const [discountInput, setDiscountInput] = useState('0')
  const [discountError, setDiscountError] = useState('')
  const [showEditCustomer, setShowEditCustomer] = useState(false)
  const [showAddItem, setShowAddItem] = useState(false)
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null)
  const [itemPendingDelete, setItemPendingDelete] = useState<OrderItem | null>(null)

  const fetchData = useCallback(async () => {
    const [orderRes, itemsRes] = await Promise.all([
      supabase.from('orders').select('*').eq('id', id).single(),
      supabase.from('order_items').select('*, products(name, image_url)').eq('order_id', id),
    ])
    if (orderRes.data) {
      const nextOrder = orderRes.data as Order
      setOrder(nextOrder)
      setNewStatus(nextOrder.status)
      setDiscountInput(String(getOrderDiscount(nextOrder)))
    }
    if (itemsRes.data) setItems(itemsRes.data as OrderItem[])
    setLoading(false)
  }, [id])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const recalcTotal = async (updatedItems: OrderItem[]) => {
    if (!order) return false
    const subtotal = getItemsSubtotal(updatedItems)
    const currentDiscount = getOrderDiscount(order)
    const baseAdjustment = getBaseAdjustment(order, items)
    const nextDiscount = clampDiscount(currentDiscount, subtotal, baseAdjustment)
    const newTotal = Math.max(0, subtotal + baseAdjustment - nextDiscount)

    const { error } = await supabase.from('orders').update({ total: newTotal }).eq('id', id)
    if (error) {
      toast("Le total n'a pas pu etre recalculé.", 'error')
      return false
    }

    setOrder(prev => {
      if (!prev) return null
      return {
        ...prev,
        total: newTotal,
        shipping_address: {
          ...prev.shipping_address,
          _meta: {
            ...prev.shipping_address?._meta,
            admin_discount_amount: nextDiscount,
          },
        },
      }
    })
    setDiscountInput(String(nextDiscount))
    setDiscountError('')
    return true
  }

  const handleUpdateStatus = async () => {
    if (!order || newStatus === order.status) return
    setSaving(true)
    await supabase.from('orders').update({ status: newStatus }).eq('id', id)

    // Send notifications only if admin opted in
    if (notifyCustomer) {
      const addr = order.shipping_address
      if (addr?.email && newStatus !== 'pending') {
        notifyStatusUpdate({
          id: order.id,
          email: addr.email,
          firstName: addr.firstName || addr.name || '',
          phone: addr.phone,
          status: newStatus,
        }).catch(err => console.error('Status notification error:', err))
      }
    }

    setOrder(prev => (prev ? { ...prev, status: newStatus } : null))
    setSaving(false)
  }

  const handleSaveCustomer = async (newAddr: ShippingAddress) => {
    if (!order) return
    const merged = { ...order.shipping_address, ...newAddr }
    await supabase.from('orders').update({ shipping_address: merged }).eq('id', id)
    setOrder(prev => (prev ? { ...prev, shipping_address: merged } : null))
    setShowEditCustomer(false)
  }

  const handleSaveDiscount = async () => {
    if (!order) return

    const parsedDiscount = Number(discountInput)
    const subtotal = getItemsSubtotal(items)
    const baseAdjustment = getBaseAdjustment(order, items)

    if (!Number.isFinite(parsedDiscount) || parsedDiscount < 0) {
      setDiscountError('La remise doit etre un montant positif.')
      return
    }

    const nextDiscount = clampDiscount(parsedDiscount, subtotal, baseAdjustment)
    if (nextDiscount !== parsedDiscount) {
      setDiscountError('La remise depasse le montant total editable de la commande.')
      return
    }

    setSavingDiscount(true)
    setDiscountError('')

    const nextShippingAddress: ShippingAddress = {
      ...order.shipping_address,
      _meta: {
        ...order.shipping_address?._meta,
        admin_discount_amount: nextDiscount,
      },
    }
    const nextTotal = Math.max(0, subtotal + baseAdjustment - nextDiscount)

    const { error } = await supabase
      .from('orders')
      .update({
        total: nextTotal,
        shipping_address: nextShippingAddress,
      })
      .eq('id', id)

    if (error) {
      setDiscountError("Impossible d'enregistrer la remise pour le moment.")
      setSavingDiscount(false)
      return
    }

    setOrder(prev => (prev ? { ...prev, total: nextTotal, shipping_address: nextShippingAddress } : null))
    setDiscountInput(String(nextDiscount))
    setSavingDiscount(false)
  }

  const handleAddItem = async (item: OrderItem) => {
    const updated = [...items, item]
    setItems(updated)
    const saved = await recalcTotal(updated)
    if (saved) {
      toast('Article ajoute a la commande.', 'success')
    }
    setShowAddItem(false)
  }

  const handleDeleteItem = async (itemId: string) => {
    const targetItem = items.find(it => it.id === itemId)
    if (!targetItem || deletingItemId) return
    setItemPendingDelete(targetItem)
  }

  const confirmDeleteItem = async () => {
    const targetItem = itemPendingDelete
    if (!targetItem || deletingItemId) return

    const itemId = targetItem.id
    setDeletingItemId(itemId)
    const previousItems = items

    try {
      const response = await fetch(`/api/admin/orders/${id}/items/${itemId}`, {
        method: 'DELETE',
      })
      const payload = (await response.json()) as DeleteOrderItemResponse
      if (!response.ok) {
        throw new Error(payload.error || 'Delete failed')
      }

      const updated = previousItems.filter(it => it.id !== itemId)
      setItems(updated)
      if (typeof payload.total === 'number') {
        setOrder(prev => {
          if (!prev) return null
          return {
            ...prev,
            total: payload.total ?? prev.total,
            shipping_address: {
              ...prev.shipping_address,
              _meta: {
                ...prev.shipping_address?._meta,
                admin_discount_amount: typeof payload.discount === 'number'
                  ? payload.discount
                  : prev.shipping_address?._meta?.admin_discount_amount,
              },
            },
          }
        })
      } else {
        await fetchData()
      }

      toast('Article supprime de la commande.', 'success')
      setItemPendingDelete(null)
    } catch (error) {
      console.error('Delete order item error:', error)
      setItems(previousItems)
      toast(
        error instanceof Error ? error.message : "Impossible de supprimer l'article pour le moment.",
        'error'
      )
    } finally {
      setDeletingItemId(null)
    }
  }

  const handleDownloadInvoice = () => {
    if (!order) return
    const addr = order.shipping_address
    const invoiceHtml = generateInvoiceHtml({
      id: order.id,
      date: order.created_at,
      firstName: addr?.firstName || '',
      lastName: addr?.lastName || '',
      email: addr?.email || '',
      phone: addr?.phone,
      address: addr?.address,
      city: addr?.city,
      items: items.map(it => ({
        name: it.products?.name || 'Produit supprime',
        quantity: it.quantity,
        price: it.price,
      })),
      subtotal: itemsSubtotal,
      discount: savedDiscount,
      shipping: 0,
      total: order.total,
    })
    const win = window.open('', '_blank')
    if (win) {
      win.document.write(invoiceHtml)
      win.document.close()
      win.print()
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-green-400 animate-spin" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">Commande introuvable</p>
        <Link href="/admin/orders" className="text-green-400 hover:text-green-300 text-sm mt-2 inline-block">
          Retour aux commandes
        </Link>
      </div>
    )
  }

  const addr = order.shipping_address
  const currentStatus = STATUSES.find(s => s.value === order.status)
  const itemsSubtotal = getItemsSubtotal(items)
  const savedDiscount = getOrderDiscount(order)
  const baseAdjustment = getBaseAdjustment(order, items)
  const adjustmentLabel = baseAdjustment >= 0 ? 'Ajustement' : 'Ajustement negatif'
  const parsedDiscountInput = Number(discountInput)
  const discountChanged = Number.isFinite(parsedDiscountInput) && parsedDiscountInput !== savedDiscount

  return (
    <div className="max-w-6xl space-y-6">
      {/* ── Header with inline badges ──────────────────────────────────── */}
      <div className="flex items-center gap-4">
        <Link href="/admin/orders" className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-gray-800 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-white">Commande</h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-green-500/15 text-green-400">
              <DollarSign className="w-3 h-3" />
              {formatPrice(order.total)}
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-400/10 text-blue-400">
              <Package className="w-3 h-3" />
              {items.length} article{items.length > 1 ? 's' : ''}
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-gray-700 text-gray-300">
              <CalendarDays className="w-3 h-3" />
              {new Date(order.created_at).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </span>
            {currentStatus && (
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${currentStatus.color} bg-gray-800`}>
                <currentStatus.icon className="w-3 h-3" />
                {currentStatus.label}
              </span>
            )}
          </div>
          <p className="text-gray-500 text-xs font-mono mt-1">{order.id}</p>
        </div>
      </div>

      {/* ── 2-Column Grid ─────────────────────────────────────────────── */}
      <div className="grid lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
        {/* LEFT: Items + Status + Timeline */}
        <div className="lg:col-span-2 space-y-3 sm:space-y-4 lg:space-y-6">
          {/* Order Items */}
          <div className="bg-[#111827] border border-gray-800 rounded-xl p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-bold">Articles ({items.length})</h2>
              <button
                onClick={() => setShowAddItem(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/10 text-green-400 text-xs font-bold hover:bg-green-500/20 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Ajouter un article
              </button>
            </div>
            <div className="space-y-2">
              {items.map(item => (
                <div key={item.id} className="flex items-center gap-3 p-3 bg-gray-800/30 rounded-lg group">
                  <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-900 flex-shrink-0">
                    {item.products?.image_url && (
                      <Image src={item.products.image_url} alt="" fill className="object-cover" sizes="48px" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{item.products?.name || 'Produit supprime'}</p>
                    <p className="text-gray-500 text-xs">Qte: {item.quantity} x {formatPrice(item.price)}</p>
                  </div>
                  <span className="text-green-400 font-bold text-sm">{formatPrice(item.price * item.quantity)}</span>
                  <button
                    onClick={() => handleDeleteItem(item.id)}
                    disabled={deletingItemId === item.id}
                    className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-400/10 transition-all disabled:opacity-50"
                    title="Supprimer"
                  >
                    {deletingItemId === item.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              ))}
              {items.length === 0 && (
                <p className="text-gray-500 text-sm text-center py-4">Aucun article</p>
              )}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-700 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Sous-total articles</span>
                <span className="text-white">{formatPrice(itemsSubtotal)}</span>
              </div>
              {baseAdjustment !== 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">{adjustmentLabel}</span>
                  <span className={baseAdjustment >= 0 ? 'text-white' : 'text-red-400'}>
                    {baseAdjustment > 0 ? '+' : ''}{formatPrice(baseAdjustment)}
                  </span>
                </div>
              )}
              {savedDiscount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Remise admin</span>
                  <span className="text-red-400">- {formatPrice(savedDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-white font-bold">Total</span>
                <span className="text-green-400 font-bold text-xl">{formatPrice(order.total)}</span>
              </div>
            </div>
          </div>

          <div className="bg-[#111827] border border-gray-800 rounded-xl p-4 sm:p-6">
            <h2 className="text-white font-bold mb-4">Remise admin</h2>
            <div className="space-y-3">
              <div>
                <label className="text-gray-400 text-xs font-medium mb-1 block">Montant de la remise</label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={discountInput}
                  onChange={e => {
                    setDiscountInput(e.target.value)
                    if (discountError) setDiscountError('')
                  }}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-green-500 transition-colors"
                />
              </div>
              <p className="text-gray-500 text-xs">
                La remise est appliquee au total en conservant les ajustements deja presents sur la commande.
              </p>
              {discountError && (
                <p className="text-red-400 text-xs">{discountError}</p>
              )}
              {discountChanged && (
                <button
                  onClick={handleSaveDiscount}
                  disabled={savingDiscount}
                  className="bg-green-500 hover:bg-green-600 text-black font-bold px-5 py-2.5 rounded-lg flex items-center gap-2 text-sm transition-colors disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {savingDiscount ? 'Enregistrement...' : 'Enregistrer la remise'}
                </button>
              )}
            </div>
          </div>

          {/* Update Status */}
          <div className="bg-[#111827] border border-gray-800 rounded-xl p-4 sm:p-6">
            <h2 className="text-white font-bold mb-4">Mettre a jour le statut</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              {STATUSES.map(s => (
                <button
                  key={s.value}
                  onClick={() => setNewStatus(s.value)}
                  className={`p-3 rounded-xl border-2 text-center transition-all ${
                    newStatus === s.value
                      ? 'border-green-500 bg-green-500/10'
                      : 'border-gray-700 hover:border-gray-500'
                  }`}
                >
                  <s.icon className={`w-5 h-5 mx-auto mb-1 ${s.color}`} />
                  <p className="text-white text-xs font-medium">{s.label}</p>
                </button>
              ))}
            </div>
            {newStatus !== order.status && (
              <div className="mt-4 flex items-center gap-4">
                <button
                  onClick={handleUpdateStatus}
                  disabled={saving}
                  className="bg-green-500 hover:bg-green-600 text-black font-bold px-6 py-2.5 rounded-lg flex items-center gap-2 text-sm transition-colors disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Enregistrement...' : 'Enregistrer le statut'}
                </button>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={notifyCustomer}
                    onChange={e => setNotifyCustomer(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-green-500 focus:ring-green-500 focus:ring-offset-0 cursor-pointer"
                  />
                  <span className={`text-xs ${notifyCustomer ? 'text-green-400' : 'text-gray-500'}`}>
                    Notifier le client
                  </span>
                </label>
              </div>
            )}
          </div>

          {/* Timeline */}
          <div className="bg-[#111827] border border-gray-800 rounded-xl p-4 sm:p-6">
            <h2 className="text-white font-bold mb-4">Progression</h2>
            <OrderTimeline status={order.status} />
          </div>
        </div>

        {/* RIGHT: Customer + Shipping + Invoice */}
        <div className="space-y-3 sm:space-y-4 lg:space-y-6">
          {/* Customer Info */}
          <div className="bg-[#111827] border border-gray-800 rounded-xl p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-bold">Client</h2>
              <button
                onClick={() => setShowEditCustomer(true)}
                className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-gray-800 transition-colors"
                title="Modifier"
              >
                <Pencil className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <p className="text-white text-sm font-medium">{addr?.firstName} {addr?.lastName}</p>
              {addr?.email && (
                <div className="flex items-center gap-2 text-gray-400 text-sm">
                  <Mail className="w-4 h-4 text-gray-500 flex-shrink-0" />
                  <span className="truncate">{addr.email}</span>
                </div>
              )}
              {addr?.phone && (
                <div className="flex items-center gap-2 text-gray-400 text-sm">
                  <Phone className="w-4 h-4 text-gray-500 flex-shrink-0" />
                  {addr.phone}
                </div>
              )}
            </div>
          </div>

          {/* Shipping Address */}
          <div className="bg-[#111827] border border-gray-800 rounded-xl p-4 sm:p-6">
            <h2 className="text-white font-bold mb-4">Adresse de livraison</h2>
            <div className="flex items-start gap-2 text-gray-400 text-sm">
              <MapPin className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
              <div>
                {addr?.address && <p>{addr.address}</p>}
                <p>{[addr?.postalCode, addr?.city].filter(Boolean).join(' ')}</p>
                {addr?.country && <p>{addr.country}</p>}
              </div>
            </div>
          </div>

          {/* Location Map */}
          {order.userGeolocation?.latitude && order.userGeolocation?.longitude && (() => {
            const lat = order.userGeolocation!.latitude!
            const lng = order.userGeolocation!.longitude!
            const gmapsUrl = `https://www.google.com/maps?q=${lat},${lng}`
            const gmapsNavUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
            const osmUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.004},${lat - 0.003},${lng + 0.004},${lat + 0.003}&layer=mapnik&marker=${lat},${lng}`
            const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(gmapsNavUrl)}&bgcolor=111827&color=22c55e`
            return (
              <div className="bg-[#111827] border border-gray-800 rounded-xl overflow-hidden">
                {/* Map embed */}
                <div className="h-[180px] relative">
                  <iframe
                    src={osmUrl}
                    className="w-full h-full border-0"
                    title="Localisation"
                    loading="lazy"
                  />
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <p className="text-white font-bold text-sm flex items-center gap-1.5">
                        <Navigation className="w-3.5 h-3.5 text-green-400" /> Localisation
                      </p>
                      <p className="text-gray-500 text-xs font-mono mt-1">{lat.toFixed(6)}, {lng.toFixed(6)}</p>
                    </div>
                    {/* QR Code — scan from mobile to open navigation */}
                    <div className="flex flex-col items-center flex-shrink-0">
                      <a href={gmapsNavUrl} target="_blank" rel="noopener noreferrer" title="Scanner pour naviguer">
                        <img src={qrUrl} alt="QR Google Maps" width={80} height={80} className="rounded-lg border-2 border-green-500/30" />
                      </a>
                      <p className="text-gray-600 text-[9px] mt-1 text-center">Scanner pour naviguer</p>
                    </div>
                  </div>
                  {/* Action buttons */}
                  <div className="flex gap-2">
                    <a
                      href={gmapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-white text-xs font-medium hover:bg-gray-700 transition-colors"
                    >
                      <MapPin className="w-3.5 h-3.5 text-green-400" /> Voir sur Maps
                      <ExternalLink className="w-3 h-3 text-gray-500" />
                    </a>
                    <a
                      href={gmapsNavUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-green-500 text-black text-xs font-bold hover:bg-green-600 transition-colors"
                    >
                      <Navigation className="w-3.5 h-3.5" /> Naviguer
                    </a>
                  </div>
                </div>
              </div>
            )
          })()}

          {/* Invoice Download */}
          <div className="bg-[#111827] border border-gray-800 rounded-xl p-4 sm:p-6">
            <h2 className="text-white font-bold mb-4">Facture</h2>
            <button
              onClick={handleDownloadInvoice}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm font-medium hover:bg-gray-700 hover:border-gray-600 transition-colors"
            >
              <FileText className="w-4 h-4 text-green-400" />
              Telecharger facture
            </button>
          </div>

          {/* Order Info */}
          <div className="bg-[#111827] border border-gray-800 rounded-xl p-4 sm:p-6">
            <h2 className="text-white font-bold mb-3">Informations</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-400">
                <span>Date</span>
                <span className="text-white">
                  {new Date(order.created_at).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Articles</span>
                <span className="text-white">{items.length}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Statut</span>
                <span className={currentStatus?.color}>{currentStatus?.label}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Modals ────────────────────────────────────────────────────── */}
      {showEditCustomer && (
        <EditCustomerModal
          address={order.shipping_address}
          onSave={handleSaveCustomer}
          onClose={() => setShowEditCustomer(false)}
        />
      )}
      {showAddItem && (
        <AddItemModal
          orderId={order.id}
          onSave={handleAddItem}
          onClose={() => setShowAddItem(false)}
        />
      )}
      {itemPendingDelete && (
        <ConfirmDeleteItemDialog
          itemName={itemPendingDelete.products?.name || 'cet article'}
          loading={deletingItemId === itemPendingDelete.id}
          onConfirm={confirmDeleteItem}
          onClose={() => {
            if (!deletingItemId) setItemPendingDelete(null)
          }}
        />
      )}
    </div>
  )
}
