'use client'

import React, { useEffect, useState } from 'react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import {
  ShoppingCart, Plus, Trash2, Edit3, Save, X, Loader2, Search, ChevronRight,
  ChevronDown, Package,
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
  image_url: string | null
  notes: string | null
  created_at: string
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

const emptyItemForm = {
  product_name: '', unit_price_usd: '', quantity: '1',
  unit_weight: '', unit_cbm: '', ads_amount: '', image_url: '', notes: '',
}

const emptyForm = {
  title: '',
  order_date: new Date().toISOString().split('T')[0],
  order_number: '',
  total_amount_usd: '',
  bank_fees_usd: '',
  shipping_fees_usd: '',
  usd_xof_value: '',
  notes: '',
}

function fmtUsd(val: number | null | undefined) {
  const n = Number(val) || 0
  return `$${n.toFixed(2)}`
}

export default function AdminSupplierOrders() {
  const [orders, setOrders] = useState<SupplierOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [tableExists, setTableExists] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState<SupplierOrder | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  // Expandable items
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null)
  const [orderItems, setOrderItems] = useState<Record<string, SupplierOrderItem[]>>({})
  const [loadingItems, setLoadingItems] = useState<string | null>(null)
  const [showItemForm, setShowItemForm] = useState(false)
  const [itemFormOrderId, setItemFormOrderId] = useState<string | null>(null)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [itemForm, setItemForm] = useState(emptyItemForm)
  const [savingItem, setSavingItem] = useState(false)
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    const load = async () => {
      const { data, error } = await supabase
        .from('supplier_orders')
        .select('*')
        .order('order_date', { ascending: false })

      if (!active) return

      if (error && (error.message.includes('relation') || error.message.includes('does not exist'))) {
        setTableExists(false)
      } else {
        setOrders((data || []) as SupplierOrder[])
      }
      setLoading(false)
    }

    void load()

    return () => {
      active = false
    }
  }, [])

  const handleSave = async () => {
    setSaving(true)
    const payload = {
      title: form.title || null,
      order_date: form.order_date,
      order_number: form.order_number || null,
      total_amount_usd: form.total_amount_usd ? parseFloat(form.total_amount_usd) : null,
      bank_fees_usd: form.bank_fees_usd ? parseFloat(form.bank_fees_usd) : null,
      shipping_fees_usd: form.shipping_fees_usd ? parseFloat(form.shipping_fees_usd) : null,
      usd_xof_value: form.usd_xof_value ? parseFloat(form.usd_xof_value) : null,
      notes: form.notes || null,
    }

    if (editingItem) {
      await supabase.from('supplier_orders').update(payload).eq('id', editingItem.id)
      setOrders(prev => prev.map(o => o.id === editingItem.id ? { ...o, ...payload } as SupplierOrder : o))
    } else {
      const { data } = await supabase.from('supplier_orders').insert(payload).select().single()
      if (data) setOrders(prev => [data as SupplierOrder, ...prev])
    }
    setForm(emptyForm); setEditingItem(null); setShowForm(false); setSaving(false)
  }

  const handleEdit = (e: React.MouseEvent, order: SupplierOrder) => {
    e.preventDefault(); e.stopPropagation()
    setForm({
      title: order.title || '',
      order_date: order.order_date?.split('T')[0] || '',
      order_number: order.order_number || '',
      total_amount_usd: order.total_amount_usd?.toString() || '',
      bank_fees_usd: order.bank_fees_usd?.toString() || '',
      shipping_fees_usd: order.shipping_fees_usd?.toString() || '',
      usd_xof_value: order.usd_xof_value?.toString() || '',
      notes: order.notes || '',
    })
    setEditingItem(order); setShowForm(true)
  }

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault(); e.stopPropagation()
    if (!confirm('Supprimer cette commande fournisseur ?')) return
    setDeleting(id)
    await supabase.from('supplier_order_items').delete().eq('supplier_order_id', id)
    await supabase.from('supplier_orders').delete().eq('id', id)
    setOrders(prev => prev.filter(o => o.id !== id))
    setDeleting(null)
  }

  const handleCancel = () => { setForm(emptyForm); setEditingItem(null); setShowForm(false) }

  // === Items expand/CRUD ===
  const toggleExpand = async (e: React.MouseEvent, orderId: string) => {
    e.preventDefault(); e.stopPropagation()
    if (expandedOrder === orderId) { setExpandedOrder(null); return }
    setExpandedOrder(orderId)
    if (!orderItems[orderId]) {
      setLoadingItems(orderId)
      const { data } = await supabase.from('supplier_order_items').select('*').eq('supplier_order_id', orderId)
      setOrderItems(prev => ({ ...prev, [orderId]: (data || []) as SupplierOrderItem[] }))
      setLoadingItems(null)
    }
  }

  const openAddItemForm = (e: React.MouseEvent, orderId: string) => {
    e.preventDefault(); e.stopPropagation()
    setItemFormOrderId(orderId); setEditingItemId(null); setItemForm(emptyItemForm); setShowItemForm(true)
  }

  const openEditItemForm = (item: SupplierOrderItem) => {
    setItemFormOrderId(item.supplier_order_id)
    setEditingItemId(item.id)
    setItemForm({
      product_name: item.product_name || '', unit_price_usd: item.unit_price_usd?.toString() || '',
      quantity: item.quantity?.toString() || '1', unit_weight: item.unit_weight?.toString() || '',
      unit_cbm: item.unit_cbm?.toString() || '', ads_amount: item.ads_amount?.toString() || '',
      image_url: item.image_url || '', notes: item.notes || '',
    })
    setShowItemForm(true)
  }

  const handleSaveItem = async () => {
    if (!itemForm.product_name.trim() || !itemFormOrderId) return
    setSavingItem(true)
    const payload = {
      product_name: itemForm.product_name, unit_price_usd: parseFloat(itemForm.unit_price_usd) || 0,
      quantity: parseInt(itemForm.quantity) || 1,
      unit_weight: itemForm.unit_weight ? parseFloat(itemForm.unit_weight) : null,
      unit_cbm: itemForm.unit_cbm ? parseFloat(itemForm.unit_cbm) : null,
      ads_amount: itemForm.ads_amount ? parseFloat(itemForm.ads_amount) : null,
      image_url: itemForm.image_url || null, notes: itemForm.notes || null,
    }
    if (editingItemId) {
      const { data } = await supabase.from('supplier_order_items').update(payload).eq('id', editingItemId).select().single()
      if (data) setOrderItems(prev => ({ ...prev, [itemFormOrderId!]: (prev[itemFormOrderId!] || []).map(i => i.id === editingItemId ? data as SupplierOrderItem : i) }))
    } else {
      const { data } = await supabase.from('supplier_order_items').insert({ ...payload, supplier_order_id: itemFormOrderId }).select().single()
      if (data) setOrderItems(prev => ({ ...prev, [itemFormOrderId!]: [...(prev[itemFormOrderId!] || []), data as SupplierOrderItem] }))
    }
    setItemForm(emptyItemForm); setEditingItemId(null); setItemFormOrderId(null); setShowItemForm(false); setSavingItem(false)
  }

  const handleDeleteItem = async (e: React.MouseEvent, orderId: string, itemId: string) => {
    e.preventDefault(); e.stopPropagation()
    if (!confirm('Supprimer cet article ?')) return
    setDeletingItemId(itemId)
    await supabase.from('supplier_order_items').delete().eq('id', itemId)
    setOrderItems(prev => ({ ...prev, [orderId]: (prev[orderId] || []).filter(i => i.id !== itemId) }))
    setDeletingItemId(null)
  }

  const closeItemForm = () => { setItemForm(emptyItemForm); setEditingItemId(null); setItemFormOrderId(null); setShowItemForm(false) }

  const totalUsd = orders.reduce((sum, o) => sum + (Number(o.total_amount_usd) || 0), 0)
  const totalFees = orders.reduce((sum, o) => sum + (Number(o.bank_fees_usd) || 0) + (Number(o.shipping_fees_usd) || 0), 0)

  const filtered = orders.filter(o =>
    (o.title || '').toLowerCase().includes(search.toLowerCase()) ||
    (o.order_number || '').toLowerCase().includes(search.toLowerCase())
  )

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-black text-white">Commandes fournisseurs</h1>
        <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-green-400 animate-spin" /></div>
      </div>
    )
  }

  if (!tableExists) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-black text-white">Commandes fournisseurs</h1>
        <div className="bg-[#111827] border border-gray-800 rounded-xl p-12 text-center">
          <ShoppingCart className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h2 className="text-white font-bold text-lg mb-2">Table non configuree</h2>
          <p className="text-gray-500 text-sm">La table <code className="text-green-400 bg-green-400/10 px-1.5 py-0.5 rounded">supplier_orders</code> n&apos;existe pas encore.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-white sm:text-3xl">Commandes fournisseurs</h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-xs px-2.5 py-1 rounded-full bg-green-400/10 text-green-400 font-medium">{fmtUsd(totalUsd)} total</span>
            <span className="text-xs px-2.5 py-1 rounded-full bg-yellow-400/10 text-yellow-400 font-medium">{fmtUsd(totalFees)} frais</span>
            <span className="text-xs px-2.5 py-1 rounded-full bg-blue-400/10 text-blue-400 font-medium">{orders.length} commande{orders.length > 1 ? 's' : ''}</span>
          </div>
        </div>
        <button onClick={() => { setForm(emptyForm); setEditingItem(null); setShowForm(true) }}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-500 px-4 py-2.5 text-sm font-bold text-black transition-colors hover:bg-green-600 sm:w-auto">
          <Plus className="w-4 h-4" /> Ajouter
        </button>
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm" onClick={handleCancel}>
          <div className="bg-[#111827] border border-gray-800 rounded-xl w-full max-w-2xl mx-4 mt-20 p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-bold text-lg">{editingItem ? 'Modifier' : 'Nouvelle'} commande</h2>
              <button onClick={handleCancel} className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800"><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Titre</label>
                <input type="text" value={form.title} onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Commande Alibaba..." className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-green-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Date</label>
                <input type="date" value={form.order_date} onChange={e => setForm(prev => ({ ...prev, order_date: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-green-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">N° commande</label>
                <input type="text" value={form.order_number} onChange={e => setForm(prev => ({ ...prev, order_number: e.target.value }))}
                  placeholder="N° Alibaba" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-green-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Montant total (USD)</label>
                <input type="number" step="0.01" value={form.total_amount_usd} onChange={e => setForm(prev => ({ ...prev, total_amount_usd: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-green-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Frais bancaires (USD)</label>
                <input type="number" step="0.01" value={form.bank_fees_usd} onChange={e => setForm(prev => ({ ...prev, bank_fees_usd: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-green-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Frais livraison (USD)</label>
                <input type="number" step="0.01" value={form.shipping_fees_usd} onChange={e => setForm(prev => ({ ...prev, shipping_fees_usd: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-green-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Taux USD → XOF</label>
                <input type="number" step="0.01" value={form.usd_xof_value} onChange={e => setForm(prev => ({ ...prev, usd_xof_value: e.target.value }))}
                  placeholder="Ex: 615" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-green-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Notes</label>
                <input type="text" value={form.notes || ''} onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-green-500" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button onClick={handleCancel} className="px-4 py-2 rounded-lg text-gray-400 hover:text-white text-sm hover:bg-gray-800">Annuler</button>
              <button onClick={handleSave} disabled={saving}
                className="bg-green-500 hover:bg-green-600 text-black font-bold px-5 py-2 rounded-lg flex items-center gap-2 text-sm disabled:opacity-50">
                <Save className="w-4 h-4" /> {saving ? '...' : editingItem ? 'Modifier' : 'Ajouter'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher par titre ou numero..."
          className="w-full bg-[#111827] border border-gray-800 rounded-lg pl-10 pr-4 py-2.5 text-white text-sm outline-none focus:border-green-500" />
      </div>

      {/* Table — rows are clickable */}
      <div className="bg-[#111827] border border-gray-800 rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-8 text-center">
            <ShoppingCart className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500">Aucune commande fournisseur</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px]">
            <thead>
              <tr className="border-b border-gray-800 text-left">
                <th className="px-4 py-3 w-10"></th>
                <th className="px-4 py-3 text-xs text-gray-500 font-medium">Date</th>
                <th className="px-4 py-3 text-xs text-gray-500 font-medium">Titre</th>
                <th className="px-4 py-3 text-xs text-gray-500 font-medium">N°</th>
                <th className="px-4 py-3 text-xs text-gray-500 font-medium">Montant USD</th>
                <th className="px-4 py-3 text-xs text-gray-500 font-medium">Frais USD</th>
                <th className="px-4 py-3 text-xs text-gray-500 font-medium">Taux</th>
                <th className="px-4 py-3 text-xs text-gray-500 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(order => {
                const fees = (Number(order.bank_fees_usd) || 0) + (Number(order.shipping_fees_usd) || 0)
                const isExpanded = expandedOrder === order.id
                const items = orderItems[order.id] || []
                const isItemsLoading = loadingItems === order.id
                return (
                  <React.Fragment key={order.id}>
                    <tr className={`border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors cursor-pointer ${isExpanded ? 'bg-gray-800/20' : ''}`}
                      onClick={() => window.location.href = `/admin/supplier-orders/${order.id}`}>
                      <td className="px-4 py-3">
                        <button onClick={(e) => toggleExpand(e, order.id)}
                          className="p-1 text-gray-500 hover:text-white transition-colors">
                          {isExpanded ? <ChevronDown className="w-4 h-4 text-green-400" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-sm">
                        {order.order_date ? new Date(order.order_date).toLocaleDateString('fr-FR') : '—'}
                      </td>
                      <td className="px-4 py-3 text-white text-sm font-medium">{order.title || 'Sans titre'}</td>
                      <td className="px-4 py-3 text-gray-400 text-sm font-mono">{order.order_number || '—'}</td>
                      <td className="px-4 py-3">
                        <span className="text-green-400 font-bold text-sm">{fmtUsd(order.total_amount_usd)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-yellow-400 text-sm">{fmtUsd(fees)}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-sm">
                        {order.usd_xof_value ? `${order.usd_xof_value} XOF` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={(e) => handleEdit(e, order)}
                            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors">
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button onClick={(e) => handleDelete(e, order.id)} disabled={deleting === order.id}
                            className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {/* Expanded items row */}
                    {isExpanded && (
                      <tr>
                        <td colSpan={8} className="bg-[#0d1117] border-b border-gray-800 px-6 py-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-white text-sm font-bold flex items-center gap-2">
                              <Package className="w-3.5 h-3.5 text-blue-400" />
                              Articles ({items.length})
                            </h4>
                            <button onClick={(e) => openAddItemForm(e, order.id)}
                              className="bg-green-500/20 text-green-400 hover:bg-green-500/30 px-2.5 py-1 rounded-lg flex items-center gap-1 text-xs font-medium transition-colors">
                              <Plus className="w-3 h-3" /> Ajouter
                            </button>
                          </div>
                          {isItemsLoading ? (
                            <div className="flex items-center justify-center py-4">
                              <Loader2 className="w-4 h-4 text-green-400 animate-spin" />
                            </div>
                          ) : items.length === 0 ? (
                            <p className="text-gray-600 text-xs text-center py-3">Aucun article</p>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full min-w-[620px] text-xs">
                              <thead>
                                <tr className="text-left text-gray-600">
                                  <th className="pb-2 font-medium">Produit</th>
                                  <th className="pb-2 font-medium text-center">Qte</th>
                                  <th className="pb-2 font-medium text-right">Prix USD</th>
                                  <th className="pb-2 font-medium text-right">Total USD</th>
                                  <th className="pb-2 font-medium text-right">Poids</th>
                                  <th className="pb-2 w-16"></th>
                                </tr>
                              </thead>
                              <tbody>
                                {items.map(item => {
                                  const lineTotal = (Number(item.unit_price_usd) || 0) * (item.quantity || 0)
                                  return (
                                    <tr key={item.id} className="border-t border-gray-800/50 group">
                                      <td className="py-2">
                                        <div className="flex items-center gap-2">
                                          {item.image_url && (
                                            <div className="relative h-6 w-6 overflow-hidden rounded border border-gray-700">
                                              <Image src={item.image_url} alt="" fill className="object-cover" sizes="24px" />
                                            </div>
                                          )}
                                          <span className="text-gray-300 truncate max-w-[150px]">{item.product_name}</span>
                                        </div>
                                      </td>
                                      <td className="py-2 text-gray-400 text-center">{item.quantity}</td>
                                      <td className="py-2 text-gray-400 text-right">{fmtUsd(item.unit_price_usd)}</td>
                                      <td className="py-2 text-green-400 font-medium text-right">{fmtUsd(lineTotal)}</td>
                                      <td className="py-2 text-gray-600 text-right">{item.unit_weight ? `${(item.unit_weight * item.quantity).toFixed(1)} kg` : '—'}</td>
                                      <td className="py-2 text-right">
                                        <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <button onClick={() => openEditItemForm(item)}
                                            className="p-1 text-gray-500 hover:text-white transition-colors">
                                            <Edit3 className="w-3 h-3" />
                                          </button>
                                          <button onClick={(e) => handleDeleteItem(e, order.id, item.id)} disabled={deletingItemId === item.id}
                                            className="p-1 text-gray-500 hover:text-red-400 transition-colors disabled:opacity-50">
                                            <Trash2 className="w-3 h-3" />
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  )
                                })}
                              </tbody>
                              </table>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )
              })}
            </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Item Modal */}
      {showItemForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm" onClick={closeItemForm}>
          <div className="bg-[#111827] border border-gray-800 rounded-xl w-full max-w-lg mx-4 mt-16 p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold flex items-center gap-2">
                <Package className="w-4 h-4 text-blue-400" />
                {editingItemId ? 'Modifier' : 'Ajouter'} un article
              </h3>
              <button onClick={closeItemForm} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-1">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Nom du produit *</label>
                <input type="text" value={itemForm.product_name} onChange={e => setItemForm(prev => ({ ...prev, product_name: e.target.value }))}
                  placeholder="Nom du produit..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-green-500" />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Prix USD *</label>
                  <input type="number" step="0.01" min="0" value={itemForm.unit_price_usd}
                    onChange={e => setItemForm(prev => ({ ...prev, unit_price_usd: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-green-500" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Quantite *</label>
                  <input type="number" min="1" value={itemForm.quantity}
                    onChange={e => setItemForm(prev => ({ ...prev, quantity: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-green-500" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Ads USD</label>
                  <input type="number" step="0.01" min="0" value={itemForm.ads_amount}
                    onChange={e => setItemForm(prev => ({ ...prev, ads_amount: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-green-500" />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Poids unit. (kg)</label>
                  <input type="number" step="0.01" min="0" value={itemForm.unit_weight}
                    onChange={e => setItemForm(prev => ({ ...prev, unit_weight: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-green-500" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Volume unit. (CBM)</label>
                  <input type="number" step="0.001" min="0" value={itemForm.unit_cbm}
                    onChange={e => setItemForm(prev => ({ ...prev, unit_cbm: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-green-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Image (URL)</label>
                <input type="url" value={itemForm.image_url} onChange={e => setItemForm(prev => ({ ...prev, image_url: e.target.value }))}
                  placeholder="https://..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-green-500" />
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
    </div>
  )
}
