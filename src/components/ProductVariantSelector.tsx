'use client'

import { Check } from 'lucide-react'

interface ProductVariantSelectorProps {
  colors?: string[]
  properties?: Record<string, string[]>
  selectedColor?: string
  selectedProperties?: Record<string, string>
  onColorChange?: (color: string) => void
  onPropertyChange?: (key: string, value: string) => void
}

export default function ProductVariantSelector({
  colors,
  properties,
  selectedColor,
  selectedProperties = {},
  onColorChange,
  onPropertyChange,
}: ProductVariantSelectorProps) {
  const hasColors = colors && colors.length > 0
  const hasProperties = properties && Object.keys(properties).length > 0

  if (!hasColors && !hasProperties) return null

  return (
    <div className="space-y-5">
      {/* Color Selector */}
      {hasColors && (
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2.5">
            Couleur
            {selectedColor && (
              <span className="ml-2 text-white font-normal">{selectedColor}</span>
            )}
          </label>
          <div className="flex flex-wrap gap-2.5">
            {colors.map((color) => {
              const isSelected = selectedColor === color
              return (
                <button
                  key={color}
                  type="button"
                  onClick={() => onColorChange?.(color)}
                  title={color}
                  className={`relative w-9 h-9 rounded-full border-2 transition-all flex items-center justify-center ${
                    isSelected
                      ? 'border-green-500 ring-2 ring-green-500/30'
                      : 'border-gray-600 hover:border-gray-400'
                  }`}
                  style={{ backgroundColor: color }}
                >
                  {isSelected && (
                    <Check
                      className="w-4 h-4 drop-shadow-md"
                      style={{
                        color: isLightColor(color) ? '#000' : '#fff',
                      }}
                    />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Property Selectors */}
      {hasProperties &&
        Object.entries(properties).map(([key, rawValues]) => {
          const values = Array.isArray(rawValues) ? rawValues : []
          if (values.length === 0) return null
          const selected = selectedProperties[key]
          const isSmallList = values.length <= 6

          return (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-400 mb-2.5">
                {key}
                {selected && (
                  <span className="ml-2 text-white font-normal">{selected}</span>
                )}
              </label>

              {isSmallList ? (
                /* Button Group for small lists */
                <div className="flex flex-wrap gap-2">
                  {values.map((value) => {
                    const isSelected = selected === value
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => onPropertyChange?.(key, value)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                          isSelected
                            ? 'bg-green-500 text-black border-green-500'
                            : 'bg-gray-800 text-gray-300 border-gray-700 hover:border-gray-500 hover:text-white'
                        }`}
                      >
                        {value}
                      </button>
                    )
                  })}
                </div>
              ) : (
                /* Dropdown for larger lists */
                <select
                  value={selected || ''}
                  onChange={(e) => onPropertyChange?.(key, e.target.value)}
                  className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-green-500 transition-colors appearance-none cursor-pointer"
                >
                  <option value="" disabled>
                    Sélectionner {key.toLowerCase()}
                  </option>
                  {values.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )
        })}
    </div>
  )
}

/** Determines if a CSS color string is light (to pick contrasting check icon). */
function isLightColor(color: string): boolean {
  // Handle hex colors
  const hex = color.replace('#', '')
  if (/^[0-9a-fA-F]{3,8}$/.test(hex)) {
    const fullHex = hex.length === 3
      ? hex.split('').map((c) => c + c).join('')
      : hex.slice(0, 6)
    const r = parseInt(fullHex.slice(0, 2), 16)
    const g = parseInt(fullHex.slice(2, 4), 16)
    const b = parseInt(fullHex.slice(4, 6), 16)
    // Perceived luminance
    return (r * 299 + g * 587 + b * 114) / 1000 > 150
  }

  // For named colors, assume dark by default
  const lightNames = ['white', 'yellow', 'lime', 'cyan', 'aqua', 'lightyellow', 'lightcyan', 'lighgreen', 'ivory', 'beige', 'snow', 'linen']
  return lightNames.includes(color.toLowerCase())
}
