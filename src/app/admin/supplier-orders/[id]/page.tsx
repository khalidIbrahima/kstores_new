'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { adminFetch } from '@/lib/admin-fetch'
import { formatPrice } from '@/lib/utils'
import {
  ArrowLeft, Loader2, Plus, Trash2, Package, DollarSign, Hash, Calendar,
  FileText, X, Save, Edit3, Truck, Plane, Ship, Zap, RefreshCw,
} from 'lucide-react'

interface SupplierOrder {
  id: string
  title: string | null
  order_date: string
  order_number: string | null
  total_amount_usd: number | null
  bank_fees_usd: number | null
  shipping_fees_usd: number | null
  usd_xof_value: number | null
  notes: string | null
}

interface SupplierOrderItem {
  id: string
  supplier_order_id: string
  product_name: string
  unit_price_usd: number
  quantity: number
  unit_weight: number | null
  unit_cbm: number | null
  ads_amount: number | null
  image_url: string | null
  notes: string | null
}

interface ShippingAgency {
  id: string
  name: string
  phone: string | null
  air_price_per_kg: number | null
  sea_price_per_cbm: number | null
  express_cost_per_kg: number | null
}

interface Delivery {
  id: string
  supplier_order_id: string
  shipping_agency_id: string | null
  type: string
  is_express: boolean | null
  weight_kg: number | null
  cbm: number | null
  shipping_fees_xof: number | null
  other_fees_xof: number | null
  send_date: string | null
  receive_date: string | null
  tracking_number: string | null
  status: string | null
  notes: string | null
  shipping_agencies: ShippingAgency | null
}

const emptyItemForm = {
  product_name: '', unit_price_usd: '', quantity: '1',
  unit_weight: '', unit_cbm: '', ads_amount: '', image_url: '', notes: '',
}

const emptyDeliveryForm = {
  shipping_agency_id: '', type: 'air', weight_kg: '', cbm: '',
  shipping_fees_xof: '', other_fees_xof: '', send_date: '', receive_date: '',
  tracking_number: '', status: '', notes: '',
}

const TYPE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  air: { label: 'Aerien', icon: Plane, color: 'text-blue-400 bg-blue-400/10' },
  sea: { label: 'Maritime', icon: Ship, color: 'text-cyan-400 bg-cyan-400/10' },
  express: { label: 'Express', icon: Zap, color: 'text-purple-400 bg-purple-400/10' },
}

const STATUS_COLORS: Record<string, string> = {
  'En cours': 'text-blue-400 bg-blue-400/10',
  'Livré': 'text-green-400 bg-green-400/10',
  'Retardé': 'text-red-400 bg-red-400/10',
}

function fmtUsd(val: number | null | undefined) {
  const n = Number(val) || 0
  return `$${n.toFixed(2)}`
}

export default function SupplierOrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [order, setOrder] = useState<SupplierOrder | null>(null)
  const [items, setItems] = useState<SupplierOrderItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showItemForm, setShowItemForm] = useState(false)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [itemForm, setItemForm] = useState(emptyItemForm)
  const [savingItem, setSavingItem] = useState(false)
  const [deletingItem, setDeletingItem] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  // Deliveries
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [agencies, setAgencies] = useState<ShippingAgency[]>([])
  const [showDeliveryForm, setShowDeliveryForm] = useState(false)
  const [editingDeliveryId, setEditingDeliveryId] = useState<string | null>(null)
  const [deliveryForm, setDeliveryForm] = useState(emptyDeliveryForm)
  const [savingDelivery, setSavingDelivery] = useState(false)
  const [deletingDelivery, setDeletingDelivery] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      // Fetch order first
      const orderRes = await supabase.from('supplier_orders').select('*').eq('id', id).single()
      if (orderRes.data) {
        setOrder(orderRes.data as SupplierOrder)
        setNotes(orderRes.data.notes || '')
      }

      // Fetch items, deliveries, agencies in parallel — log errors
      const [itemsRes, deliveriesRes, agenciesRes] = await Promise.all([
        supabase.from('supplier_order_items').select('*').eq('supplier_order_id', id).order('created_at'),
        supabase.from('deliveries').select('*, shipping_agencies(id, name, phone, air_price_per_kg, sea_price_per_cbm, express_cost_per_kg)').eq('supplier_order_id', id).order('created_at', { ascending: false }),
        supabase.from('shipping_agencies').select('*').order('name'),
      ])

      if (itemsRes.error) console.error('Items fetch error:', itemsRes.error)
      if (deliveriesRes.error) console.error('Deliveries fetch error:', deliveriesRes.error)

      setItems((itemsRes.data || []) as SupplierOrderItem[])
      if (deliveriesRes.data) setDeliveries(deliveriesRes.data as Delivery[])
      if (agenciesRes.data) setAgencies(agenciesRes.data as ShippingAgency[])
      setLoading(false)
    }
    fetchData()
  }, [id])

  const refreshItems = async () => {
    const { data, error } = await supabase.from('supplier_order_items').select('*').eq('supplier_order_id', id).order('created_at')
    if (error) console.error('Refresh items error:', error)
    setItems((data || []) as SupplierOrderItem[])
  }

  const openAddItem = () => {
    setEditingItemId(null)
    setItemForm(emptyItemForm)
    setShowItemForm(true)
  }

  const openEditItem = (item: SupplierOrderItem) => {
    setEditingItemId(item.id)
    setItemForm({
      product_name: item.product_name || '',
      unit_price_usd: item.unit_price_usd?.toString() || '',
      quantity: item.quantity?.toString() || '1',
      unit_weight: item.unit_weight?.toString() || '',
      unit_cbm: item.unit_cbm?.toString() || '',
      ads_amount: item.ads_amount?.toString() || '',
      image_url: item.image_url || '',
      notes: item.notes || '',
    })
    setShowItemForm(true)
  }

  const handleSaveItem = async () => {
    if (!itemForm.product_name.trim()) return
    setSavingItem(true)
    const payload = {
      product_name: itemForm.product_name,
      unit_price_usd: parseFloat(itemForm.unit_price_usd) || 0,
      quantity: parseInt(itemForm.quantity) || 1,
      unit_weight: itemForm.unit_weight ? parseFloat(itemForm.unit_weight) : null,
      unit_cbm: itemForm.unit_cbm ? parseFloat(itemForm.unit_cbm) : null,
      ads_amount: itemForm.ads_amount ? parseFloat(itemForm.ads_amount) : null,
      image_url: itemForm.image_url || null,
      notes: itemForm.notes || null,
    }

    const res = editingItemId
      ? await adminFetch(`/api/admin/supplier-order-items/${editingItemId}`, { method: 'PATCH', body: JSON.stringify(payload) })
      : await adminFetch('/api/admin/supplier-order-items', { method: 'POST', body: JSON.stringify({ ...payload, supplier_order_id: id }) })
    const json = await res.json().catch(() => ({})) as { item?: SupplierOrderItem; error?: string }
    if (res.ok && json.item) {
      const item = json.item
      if (editingItemId) {
        setItems(prev => prev.map(i => i.id === editingItemId ? item : i))
      } else {
        setItems(prev => [...prev, item])
      }
    } else {
      alert('Erreur: ' + (json.error || `${res.status}`))
    }
    setItemForm(emptyItemForm)
    setEditingItemId(null)
    setShowItemForm(false)
    setSavingItem(false)
  }

  const closeItemForm = () => {
    setItemForm(emptyItemForm)
    setEditingItemId(null)
    setShowItemForm(false)
  }

  // === Delivery CRUD ===
  const openAddDelivery = () => {
    setEditingDeliveryId(null)
    setDeliveryForm(emptyDeliveryForm)
    setShowDeliveryForm(true)
  }

  const openEditDelivery = (d: Delivery) => {
    setEditingDeliveryId(d.id)
    setDeliveryForm({
      shipping_agency_id: d.shipping_agency_id || '',
      type: d.type || 'air',
      weight_kg: d.weight_kg?.toString() || '',
      cbm: d.cbm?.toString() || '',
      shipping_fees_xof: d.shipping_fees_xof?.toString() || '',
      other_fees_xof: d.other_fees_xof?.toString() || '',
      send_date: d.send_date || '',
      receive_date: d.receive_date || '',
      tracking_number: d.tracking_number || '',
      status: d.status || '',
      notes: d.notes || '',
    })
    setShowDeliveryForm(true)
  }

  const handleSaveDelivery = async () => {
    setSavingDelivery(true)
    const payload = {
      shipping_agency_id: deliveryForm.shipping_agency_id || null,
      type: deliveryForm.type,
      weight_kg: deliveryForm.weight_kg ? parseFloat(deliveryForm.weight_kg) : null,
      cbm: deliveryForm.cbm ? parseFloat(deliveryForm.cbm) : null,
      shipping_fees_xof: deliveryForm.shipping_fees_xof ? parseFloat(deliveryForm.shipping_fees_xof) : null,
      other_fees_xof: deliveryForm.other_fees_xof ? parseFloat(deliveryForm.other_fees_xof) : null,
      send_date: deliveryForm.send_date || null,
      receive_date: deliveryForm.receive_date || null,
      tracking_number: deliveryForm.tracking_number || null,
      status: deliveryForm.status || null,
      notes: deliveryForm.notes || null,
    }

    const res = editingDeliveryId
      ? await adminFetch(`/api/admin/deliveries/${editingDeliveryId}`, { method: 'PATCH', body: JSON.stringify(payload) })
      : await adminFetch('/api/admin/deliveries', { method: 'POST', body: JSON.stringify({ ...payload, supplier_order_id: id }) })
    const json = await res.json().catch(() => ({})) as { delivery?: Delivery; error?: string }
    if (res.ok && json.delivery) {
      const delivery = json.delivery
      if (editingDeliveryId) {
        setDeliveries(prev => prev.map(d => d.id === editingDeliveryId ? delivery : d))
      } else {
        setDeliveries(prev => [delivery, ...prev])
      }
    } else {
      alert('Erreur: ' + (json.error || `${res.status}`))
    }
    setDeliveryForm(emptyDeliveryForm)
    setEditingDeliveryId(null)
    setShowDeliveryForm(false)
    setSavingDelivery(false)
  }

  const closeDeliveryForm = () => {
    setDeliveryForm(emptyDeliveryForm); setEditingDeliveryId(null); setShowDeliveryForm(false)
  }

  const handleDeleteDelivery = async (did: string) => {
    if (!confirm('Supprimer cette livraison ?')) return
    setDeletingDelivery(did)
    const res = await adminFetch(`/api/admin/deliveries/${did}`, { method: 'DELETE' })
    if (res.ok) {
      setDeliveries(prev => prev.filter(d => d.id !== did))
    } else {
      const err = await res.json().catch(() => ({})) as { error?: string }
      alert(err.error || `Erreur ${res.status}`)
    }
    setDeletingDelivery(null)
  }

  const totalDeliveryFees = deliveries.reduce((sum, d) => sum + (Number(d.shipping_fees_xof) || 0) + (Number(d.other_fees_xof) || 0), 0)

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Supprimer cet article ?')) return
    setDeletingItem(itemId)
    const res = await adminFetch(`/api/admin/supplier-order-items/${itemId}`, { method: 'DELETE' })
    if (res.ok) {
      setItems(prev => prev.filter(i => i.id !== itemId))
    } else {
      const err = await res.json().catch(() => ({})) as { error?: string }
      alert(err.error || `Erreur ${res.status}`)
    }
    setDeletingItem(null)
  }

  const handleSaveNotes = async () => {
    if (!order) return
    await adminFetch(`/api/admin/supplier-orders/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ notes }),
    })
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
        <Link href="/admin/supplier-orders" className="text-green-400 hover:text-green-300 text-sm mt-2 inline-block">Retour</Link>
      </div>
    )
  }

  const rate = Number(order.usd_xof_value) || 0
  const totalAmountUsd = Number(order.total_amount_usd) || 0
  const bankFees = Number(order.bank_fees_usd) || 0
  const shippingFees = Number(order.shipping_fees_usd) || 0
  const totalWithFees = totalAmountUsd + bankFees + shippingFees
  const itemsValueUsd = items.reduce((sum, i) => sum + (Number(i.unit_price_usd) || 0) * (i.quantity || 0), 0)
  const totalQuantity = items.reduce((sum, i) => sum + (i.quantity || 0), 0)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/admin/supplier-orders" className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-gray-800">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-lg sm:text-2xl font-black text-white">{order.title || 'Sans titre'}</h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {order.order_number && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-700 text-gray-300 font-mono flex items-center gap-1">
                <Hash className="w-3 h-3" />{order.order_number}
              </span>
            )}
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <Calendar className="w-3 h-3" />{order.order_date ? new Date(order.order_date).toLocaleDateString('fr-FR') : '—'}
            </span>
            {rate > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-400/10 text-purple-400">1 USD = {rate} XOF</span>
            )}
          </div>
        </div>
      </div>

      {/* Financial Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-[#111827] border border-gray-800 rounded-xl p-4">
          <p className="text-gray-500 text-xs">Produits (USD)</p>
          <p className="text-green-400 font-bold text-lg">{fmtUsd(totalAmountUsd)}</p>
        </div>
        <div className="bg-[#111827] border border-gray-800 rounded-xl p-4">
          <p className="text-gray-500 text-xs">Frais bancaires</p>
          <p className="text-yellow-400 font-bold text-lg">{fmtUsd(bankFees)}</p>
        </div>
        <div className="bg-[#111827] border border-gray-800 rounded-xl p-4">
          <p className="text-gray-500 text-xs">Frais livraison</p>
          <p className="text-yellow-400 font-bold text-lg">{fmtUsd(shippingFees)}</p>
        </div>
        <div className="bg-[#111827] border border-gray-800 rounded-xl p-4">
          <p className="text-gray-500 text-xs">Total + frais (USD)</p>
          <p className="text-white font-bold text-lg">{fmtUsd(totalWithFees)}</p>
        </div>
        {rate > 0 && (
          <div className="bg-[#111827] border border-green-500/30 rounded-xl p-4">
            <p className="text-gray-500 text-xs">Total (XOF)</p>
            <p className="text-green-400 font-bold text-lg">{formatPrice(totalWithFees * rate)}</p>
          </div>
        )}
      </div>

      {/* 2-column grid */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Left — Items */}
        <div className="lg:col-span-2 bg-[#111827] border border-gray-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-bold flex items-center gap-2">
              <Package className="w-4 h-4 text-blue-400" /> Articles ({items.length})
            </h2>
            <div className="flex items-center gap-2">
              <button onClick={refreshItems} className="p-1.5 text-gray-500 hover:text-white hover:bg-gray-800 rounded-lg transition-colors" title="Rafraichir">
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
              <button onClick={openAddItem}
                className="bg-green-500 hover:bg-green-600 text-black font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs transition-colors">
                <Plus className="w-3.5 h-3.5" /> Ajouter
              </button>
            </div>
          </div>

          {items.length === 0 ? (
            <div className="text-center py-8">
              <Package className="w-10 h-10 text-gray-700 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">Aucun article</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800 text-left">
                    <th className="pb-2 text-xs text-gray-500 font-medium">Produit</th>
                    <th className="pb-2 text-xs text-gray-500 font-medium text-center">Qte</th>
                    <th className="pb-2 text-xs text-gray-500 font-medium text-right">Prix (USD)</th>
                    <th className="pb-2 text-xs text-gray-500 font-medium text-right">Ads (USD)</th>
                    <th className="pb-2 text-xs text-gray-500 font-medium text-right">Total (USD)</th>
                    {rate > 0 && <th className="pb-2 text-xs text-gray-500 font-medium text-right">Total (XOF)</th>}
                    <th className="pb-2 text-xs text-gray-500 font-medium text-right">Poids</th>
                    <th className="pb-2 text-xs text-gray-500 font-medium text-right">CBM</th>
                    <th className="pb-2 w-16"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => {
                    const lineTotal = (Number(item.unit_price_usd) || 0) * (item.quantity || 0)
                    const totalWeight = (Number(item.unit_weight) || 0) * (item.quantity || 0)
                    const totalCbm = (Number(item.unit_cbm) || 0) * (item.quantity || 0)
                    return (
                      <tr key={item.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 group">
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            {item.image_url && (
                              <img src={item.image_url} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0 border border-gray-700" />
                            )}
                            <div className="min-w-0">
                              <p className="text-white font-medium truncate max-w-[180px]">{item.product_name}</p>
                              {item.notes && <p className="text-gray-600 text-xs truncate max-w-[180px]">{item.notes}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 text-gray-300 text-center">{item.quantity}</td>
                        <td className="py-3 text-gray-300 text-right">{fmtUsd(item.unit_price_usd)}</td>
                        <td className="py-3 text-gray-500 text-right">{item.ads_amount ? fmtUsd(item.ads_amount) : '—'}</td>
                        <td className="py-3 text-green-400 font-bold text-right">{fmtUsd(lineTotal)}</td>
                        {rate > 0 && <td className="py-3 text-green-400 text-right">{formatPrice(lineTotal * rate)}</td>}
                        <td className="py-3 text-gray-500 text-right">{totalWeight > 0 ? `${totalWeight.toFixed(1)} kg` : '—'}</td>
                        <td className="py-3 text-gray-500 text-right">{totalCbm > 0 ? totalCbm.toFixed(3) : '—'}</td>
                        <td className="py-3 text-right">
                          <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => openEditItem(item)}
                              className="p-1.5 text-gray-500 hover:text-white hover:bg-gray-800 rounded transition-colors">
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleDeleteItem(item.id)} disabled={deletingItem === item.id}
                              className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-gray-800 rounded transition-colors disabled:opacity-50">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-gray-700">
                    <td className="py-3 text-white font-bold">Total</td>
                    <td className="py-3 text-white text-center font-bold">{totalQuantity}</td>
                    <td className="py-3"></td>
                    <td className="py-3"></td>
                    <td className="py-3 text-green-400 font-bold text-right">{fmtUsd(itemsValueUsd)}</td>
                    {rate > 0 && <td className="py-3 text-green-400 font-bold text-right">{formatPrice(itemsValueUsd * rate)}</td>}
                    <td colSpan={3}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {/* Deliveries — full width below items */}
        <div className="lg:col-span-2 bg-[#111827] border border-gray-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-bold flex items-center gap-2">
              <Truck className="w-4 h-4 text-purple-400" /> Livraisons ({deliveries.length})
              {totalDeliveryFees > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-green-400/10 text-green-400 font-normal ml-2">
                  {formatPrice(totalDeliveryFees)} total
                </span>
              )}
            </h2>
            <button onClick={openAddDelivery}
              className="bg-purple-500 hover:bg-purple-600 text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs transition-colors">
              <Plus className="w-3.5 h-3.5" /> Livraison
            </button>
          </div>

          {deliveries.length === 0 ? (
            <div className="text-center py-6">
              <Truck className="w-8 h-8 text-gray-700 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">Aucune livraison</p>
            </div>
          ) : (
            <div className="space-y-3">
              {deliveries.map(d => {
                const typeConf = TYPE_CONFIG[d.type] || TYPE_CONFIG.air
                const TypeIcon = typeConf.icon
                const statusColor = d.status ? (STATUS_COLORS[d.status] || 'text-gray-400 bg-gray-700') : ''
                const totalFees = (Number(d.shipping_fees_xof) || 0) + (Number(d.other_fees_xof) || 0)
                return (
                  <div key={d.id} className="bg-gray-800/30 border border-gray-800 rounded-lg p-4 group hover:border-gray-700 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className={`w-9 h-9 rounded-lg ${typeConf.color} flex items-center justify-center flex-shrink-0`}>
                          <TypeIcon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-white text-sm font-medium">{d.shipping_agencies?.name || 'Sans agence'}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${typeConf.color}`}>{typeConf.label}</span>
                            {d.status && <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusColor}`}>{d.status}</span>}
                          </div>
                          <div className="flex items-center gap-4 mt-1.5 text-xs text-gray-500 flex-wrap">
                            {d.weight_kg && <span>{d.weight_kg} kg</span>}
                            {d.cbm && <span>{d.cbm} CBM</span>}
                            {totalFees > 0 && <span className="text-green-400 font-medium">{formatPrice(totalFees)}</span>}
                            {d.tracking_number && <span className="font-mono text-gray-400">#{d.tracking_number}</span>}
                          </div>
                          {(d.send_date || d.receive_date) && (
                            <div className="flex items-center gap-3 mt-1 text-xs text-gray-600">
                              {d.send_date && <span>Envoi: {new Date(d.send_date).toLocaleDateString('fr-FR')}</span>}
                              {d.receive_date && <span>Reception: {new Date(d.receive_date).toLocaleDateString('fr-FR')}</span>}
                            </div>
                          )}
                          {d.notes && <p className="text-gray-600 text-xs mt-1 truncate">{d.notes}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        <button onClick={() => openEditDelivery(d)} className="p-1.5 text-gray-500 hover:text-white hover:bg-gray-700 rounded transition-colors">
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDeleteDelivery(d.id)} disabled={deletingDelivery === d.id}
                          className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-gray-700 rounded transition-colors disabled:opacity-50">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Right — Order info + notes */}
        <div className="space-y-4">
          <div className="bg-[#111827] border border-gray-800 rounded-xl p-5">
            <h3 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-green-400" /> Resume financier
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Produits</span><span className="text-white">{fmtUsd(totalAmountUsd)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Frais bancaires</span><span className="text-yellow-400">{fmtUsd(bankFees)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Frais livraison</span><span className="text-yellow-400">{fmtUsd(shippingFees)}</span></div>
              <div className="border-t border-gray-700 pt-2 flex justify-between">
                <span className="text-white font-bold">Total USD</span>
                <span className="text-green-400 font-bold">{fmtUsd(totalWithFees)}</span>
              </div>
              {rate > 0 && (
                <div className="flex justify-between">
                  <span className="text-white font-bold">Total XOF</span>
                  <span className="text-green-400 font-bold">{formatPrice(totalWithFees * rate)}</span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-[#111827] border border-gray-800 rounded-xl p-5">
            <h3 className="text-white font-bold text-sm mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4 text-gray-400" /> Notes
            </h3>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              onBlur={handleSaveNotes}
              rows={4}
              placeholder="Notes..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-green-500 resize-none"
            />
          </div>
        </div>
      </div>

      {/* Add/Edit Item Modal */}
      {showItemForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm" onClick={closeItemForm}>
          <div className="bg-[#111827] border border-gray-800 rounded-xl w-full max-w-lg mx-4 mt-8 sm:mt-16 p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold">{editingItemId ? 'Modifier' : 'Ajouter'} un article</h3>
              <button onClick={closeItemForm} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Nom du produit *</label>
                <input type="text" value={itemForm.product_name} onChange={e => setItemForm(prev => ({ ...prev, product_name: e.target.value }))}
                  placeholder="Nom du produit..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-green-500" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Prix USD *</label>
                  <input type="number" step="0.01" min="0" value={itemForm.unit_price_usd} onChange={e => setItemForm(prev => ({ ...prev, unit_price_usd: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-green-500" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Quantite *</label>
                  <input type="number" min="1" value={itemForm.quantity} onChange={e => setItemForm(prev => ({ ...prev, quantity: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-green-500" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Ads USD</label>
                  <input type="number" step="0.01" min="0" value={itemForm.ads_amount} onChange={e => setItemForm(prev => ({ ...prev, ads_amount: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-green-500" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Poids unit. (kg)</label>
                  <input type="number" step="0.01" min="0" value={itemForm.unit_weight} onChange={e => setItemForm(prev => ({ ...prev, unit_weight: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-green-500" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Volume unit. (CBM)</label>
                  <input type="number" step="0.001" min="0" value={itemForm.unit_cbm} onChange={e => setItemForm(prev => ({ ...prev, unit_cbm: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-green-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Image (URL)</label>
                <input type="url" value={itemForm.image_url} onChange={e => setItemForm(prev => ({ ...prev, image_url: e.target.value }))}
                  placeholder="https://..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-green-500" />
                {itemForm.image_url && (
                  <img src={itemForm.image_url} alt="" className="mt-2 w-16 h-16 rounded-lg object-cover border border-gray-700" />
                )}
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Notes</label>
                <textarea value={itemForm.notes} onChange={e => setItemForm(prev => ({ ...prev, notes: e.target.value }))}
                  rows={2} placeholder="Notes..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-green-500 resize-none" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={closeItemForm} className="px-4 py-2 text-gray-400 text-sm hover:text-white">Annuler</button>
              <button onClick={handleSaveItem} disabled={savingItem || !itemForm.product_name.trim()}
                className="bg-green-500 hover:bg-green-600 text-black font-bold px-5 py-2 rounded-lg flex items-center gap-2 text-sm disabled:opacity-50">
                <Save className="w-4 h-4" /> {savingItem ? '...' : editingItemId ? 'Enregistrer' : 'Ajouter'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Delivery Modal */}
      {showDeliveryForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm" onClick={closeDeliveryForm}>
          <div className="bg-[#111827] border border-gray-800 rounded-xl w-full max-w-lg mx-4 mt-8 sm:mt-12 p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold flex items-center gap-2">
                <Truck className="w-4 h-4 text-purple-400" />
                {editingDeliveryId ? 'Modifier' : 'Nouvelle'} livraison
              </h3>
              <button onClick={closeDeliveryForm} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Agence de livraison</label>
                  <select value={deliveryForm.shipping_agency_id} onChange={e => setDeliveryForm(prev => ({ ...prev, shipping_agency_id: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-green-500">
                    <option value="">Selectionnez...</option>
                    {agencies.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Type</label>
                  <select value={deliveryForm.type} onChange={e => setDeliveryForm(prev => ({ ...prev, type: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-green-500">
                    <option value="air">Aerien</option>
                    <option value="sea">Maritime</option>
                    <option value="express">Express</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Poids (kg)</label>
                  <input type="number" step="0.01" min="0" value={deliveryForm.weight_kg}
                    onChange={e => setDeliveryForm(prev => ({ ...prev, weight_kg: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-green-500" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">CBM</label>
                  <input type="number" step="0.001" min="0" value={deliveryForm.cbm}
                    onChange={e => setDeliveryForm(prev => ({ ...prev, cbm: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-green-500" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Frais livraison (F CFA)</label>
                  <input type="number" step="0.01" min="0" value={deliveryForm.shipping_fees_xof}
                    onChange={e => setDeliveryForm(prev => ({ ...prev, shipping_fees_xof: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-green-500" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Autres frais (F CFA)</label>
                  <input type="number" step="0.01" min="0" value={deliveryForm.other_fees_xof}
                    onChange={e => setDeliveryForm(prev => ({ ...prev, other_fees_xof: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-green-500" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Date envoi</label>
                  <input type="date" value={deliveryForm.send_date}
                    onChange={e => setDeliveryForm(prev => ({ ...prev, send_date: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-green-500" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Date reception</label>
                  <input type="date" value={deliveryForm.receive_date}
                    onChange={e => setDeliveryForm(prev => ({ ...prev, receive_date: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-green-500" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">N° suivi</label>
                  <input type="text" value={deliveryForm.tracking_number}
                    onChange={e => setDeliveryForm(prev => ({ ...prev, tracking_number: e.target.value }))}
                    placeholder="Tracking..."
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-green-500" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Statut</label>
                  <select value={deliveryForm.status} onChange={e => setDeliveryForm(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-green-500">
                    <option value="">—</option>
                    <option value="En cours">En cours</option>
                    <option value="Livré">Livre</option>
                    <option value="Retardé">Retarde</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Notes</label>
                <textarea value={deliveryForm.notes} onChange={e => setDeliveryForm(prev => ({ ...prev, notes: e.target.value }))}
                  rows={2} placeholder="Notes..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-green-500 resize-none" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={closeDeliveryForm} className="px-4 py-2 text-gray-400 text-sm hover:text-white">Annuler</button>
              <button onClick={handleSaveDelivery} disabled={savingDelivery}
                className="bg-purple-500 hover:bg-purple-600 text-white font-bold px-5 py-2 rounded-lg flex items-center gap-2 text-sm disabled:opacity-50">
                <Save className="w-4 h-4" /> {savingDelivery ? '...' : editingDeliveryId ? 'Enregistrer' : 'Ajouter'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
