'use client'

import { useState, useCallback } from 'react'
import { Plus, Trash2, ChevronDown, ChevronUp, Palette, Ruler, Image as ImageIcon, Package, X } from 'lucide-react'

export interface VariantOption {
  id: string
  name: string
  image_url: string
  display_order: number
  stock: number | null
}

export interface Variant {
  id: string
  name: string
  display_order: number
  options: VariantOption[]
}

interface Props {
  variants: Variant[]
  onChange: (variants: Variant[]) => void
}

function tempId() {
  return `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function getVariantIcon(name: string) {
  const n = name.toLowerCase()
  if (n.includes('couleur') || n.includes('color')) return Palette
  if (n.includes('taille') || n.includes('size')) return Ruler
  if (n.includes('motif') || n.includes('pattern') || n.includes('image')) return ImageIcon
  return Package
}

function isColorVariant(name: string) {
  const n = name.toLowerCase()
  return n.includes('couleur') || n.includes('color')
}

export default function ProductVariantsManager({ variants, onChange }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const toggle = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const addVariant = useCallback((typeName: string) => {
    const id = tempId()
    onChange([...variants, { id, name: typeName, display_order: variants.length, options: [] }])
    setExpanded(prev => new Set(prev).add(id))
  }, [variants, onChange])

  const updateVariant = useCallback((variantId: string, field: string, value: string) => {
    onChange(variants.map(v => v.id === variantId ? { ...v, [field]: value } : v))
  }, [variants, onChange])

  const removeVariant = useCallback((variantId: string) => {
    onChange(variants.filter(v => v.id !== variantId))
    setExpanded(prev => { const n = new Set(prev); n.delete(variantId); return n })
  }, [variants, onChange])

  const addOption = useCallback((variantId: string) => {
    onChange(variants.map(v => {
      if (v.id !== variantId) return v
      return {
        ...v,
        options: [...v.options, {
          id: tempId(),
          name: '',
          image_url: '',
          display_order: v.options.length,
          stock: null,
        }],
      }
    }))
  }, [variants, onChange])

  const updateOption = useCallback((variantId: string, optionId: string, field: string, value: string | number | null) => {
    onChange(variants.map(v => {
      if (v.id !== variantId) return v
      return { ...v, options: v.options.map(o => o.id === optionId ? { ...o, [field]: value } : o) }
    }))
  }, [variants, onChange])

  const removeOption = useCallback((variantId: string, optionId: string) => {
    onChange(variants.map(v => {
      if (v.id !== variantId) return v
      return { ...v, options: v.options.filter(o => o.id !== optionId) }
    }))
  }, [variants, onChange])

  return (
    <div className="space-y-3">
      {variants.map(variant => {
        const Icon = getVariantIcon(variant.name)
        const isColor = isColorVariant(variant.name)
        const isOpen = expanded.has(variant.id)

        return (
          <div key={variant.id} className="bg-gray-800/50 border border-gray-700 rounded-lg overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-2 px-4 py-3 cursor-pointer hover:bg-gray-800/80 transition-colors" onClick={() => toggle(variant.id)}>
              <Icon className="w-4 h-4 text-purple-400 flex-shrink-0" />
              <input
                type="text"
                value={variant.name}
                onChange={e => { e.stopPropagation(); updateVariant(variant.id, 'name', e.target.value) }}
                onClick={e => e.stopPropagation()}
                placeholder="Nom du variant (ex: Couleur, Taille...)"
                className={`bg-transparent text-white text-sm font-medium outline-none flex-1 min-w-0 ${!variant.name ? 'border-b border-red-500/50' : ''}`}
              />
              <div className="flex items-center gap-1 flex-shrink-0">
                {!isOpen && variant.options.length > 0 && (
                  <div className="flex gap-1 mr-2">
                    {variant.options.slice(0, 4).map(o => (
                      <span key={o.id} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-700 text-gray-300 max-w-[60px] truncate">
                        {isColor && o.image_url?.startsWith('#') ? (
                          <span className="inline-block w-3 h-3 rounded-full border border-gray-500 mr-0.5 align-middle" style={{ backgroundColor: o.image_url }} />
                        ) : null}
                        {o.name || '?'}
                      </span>
                    ))}
                    {variant.options.length > 4 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-700 text-gray-500">+{variant.options.length - 4}</span>
                    )}
                  </div>
                )}
                <span className="text-xs text-gray-500">{variant.options.length} option{variant.options.length !== 1 ? 's' : ''}</span>
                <button type="button" onClick={e => { e.stopPropagation(); removeVariant(variant.id) }}
                  className="p-1 text-gray-600 hover:text-red-400 transition-colors ml-1">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                {isOpen ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
              </div>
            </div>

            {/* Options */}
            {isOpen && (
              <div className="border-t border-gray-700 p-3 space-y-2">
                {variant.options.length === 0 && (
                  <p className="text-gray-600 text-xs text-center py-2">Aucune option. Ajoutez-en une.</p>
                )}
                {variant.options.map(option => (
                  <div key={option.id} className="flex items-center gap-2 bg-gray-900/50 rounded-lg px-3 py-2">
                    {/* Color swatch or image indicator */}
                    {isColor ? (
                      <input
                        type="color"
                        value={option.image_url?.startsWith('#') ? option.image_url : '#22c55e'}
                        onChange={e => updateOption(variant.id, option.id, 'image_url', e.target.value)}
                        className="w-7 h-7 rounded border border-gray-600 bg-gray-800 cursor-pointer flex-shrink-0"
                      />
                    ) : option.image_url ? (
                      <img src={option.image_url} alt="" className="w-7 h-7 rounded object-cover border border-gray-600 flex-shrink-0" />
                    ) : null}

                    {/* Name */}
                    <input
                      type="text"
                      value={option.name}
                      onChange={e => updateOption(variant.id, option.id, 'name', e.target.value)}
                      placeholder="Nom (ex: Rouge, S, XL...)"
                      className={`bg-transparent text-white text-sm outline-none flex-1 min-w-0 ${!option.name ? 'border-b border-red-500/30' : ''}`}
                    />

                    {/* Stock */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span className="text-gray-600 text-[10px]">Stock:</span>
                      <input
                        type="number"
                        min={0}
                        value={option.stock ?? ''}
                        onChange={e => updateOption(variant.id, option.id, 'stock', e.target.value ? Math.max(0, parseInt(e.target.value)) : null)}
                        placeholder="—"
                        className="bg-transparent text-white text-sm outline-none w-14 text-center border-b border-gray-700 focus:border-green-500"
                      />
                    </div>

                    {/* Image URL (non-color variants) */}
                    {!isColor && (
                      <input
                        type="url"
                        value={option.image_url}
                        onChange={e => updateOption(variant.id, option.id, 'image_url', e.target.value)}
                        placeholder="Image URL"
                        className="bg-transparent text-gray-400 text-xs outline-none w-24 border-b border-gray-700 focus:border-green-500 flex-shrink-0"
                      />
                    )}

                    {/* Delete option */}
                    <button type="button" onClick={() => removeOption(variant.id, option.id)}
                      className="p-1 text-gray-600 hover:text-red-400 transition-colors flex-shrink-0">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}

                <button type="button" onClick={() => addOption(variant.id)}
                  className="w-full text-center py-2 text-xs text-purple-400 hover:text-purple-300 hover:bg-purple-500/5 rounded-lg border border-dashed border-gray-700 hover:border-purple-500/30 transition-colors flex items-center justify-center gap-1">
                  <Plus className="w-3 h-3" /> Ajouter une option
                </button>
              </div>
            )}
          </div>
        )
      })}

      {/* Add Variant Type */}
      <div className="flex gap-2">
        <button type="button" onClick={() => addVariant('Couleur')}
          className="flex items-center gap-1.5 px-3 py-2 text-xs bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 rounded-lg transition-colors border border-purple-500/20">
          <Palette className="w-3.5 h-3.5" /> Couleur
        </button>
        <button type="button" onClick={() => addVariant('Taille')}
          className="flex items-center gap-1.5 px-3 py-2 text-xs bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 rounded-lg transition-colors border border-purple-500/20">
          <Ruler className="w-3.5 h-3.5" /> Taille
        </button>
        <button type="button" onClick={() => addVariant('')}
          className="flex items-center gap-1.5 px-3 py-2 text-xs bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors border border-gray-700">
          <Plus className="w-3.5 h-3.5" /> Personnalise
        </button>
      </div>
    </div>
  )
}
