'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Minus, Plus, Trash2, Lock, Truck, Shield, ArrowLeft, ShoppingCart } from 'lucide-react'
import { useCart } from '@/context/CartContext'
import { formatPrice } from '@/lib/utils'
import { useStoreSettings } from '@/hooks/useStoreSettings'

const PAYMENT_LABELS: Record<string, string> = {
  wave: 'Wave',
  orange_money: 'Orange Money',
  credit_card: 'Carte bancaire',
  paypal: 'PayPal',
  bank_transfer: 'Virement bancaire',
}

export default function CartPage() {
  const { items, updateQuantity, removeFromCart, subtotal, totalItems } = useCart()
  const { settings } = useStoreSettings()

  const freeShippingThreshold = settings?.shipping_options?.free_shipping_threshold ?? 35000
  const standardShippingCost = settings?.shipping_options?.standard_shipping_cost ?? 1500
  const shipping = subtotal >= freeShippingThreshold ? 0 : standardShippingCost
  const total = subtotal + shipping

  const enabledPayments = settings?.payment_methods
    ? Object.entries(settings.payment_methods).filter(([, enabled]) => enabled).map(([key]) => key)
    : ['wave']

  if (items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <ShoppingCart className="w-16 h-16 text-gray-600 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">Votre panier est vide</h1>
        <p className="text-gray-500 mb-6">Ajoutez des produits pour commencer vos achats</p>
        <Link
          href="/products"
          className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-black font-bold px-8 py-3 rounded-lg"
        >
          Continuer mes achats
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-3xl sm:text-4xl font-black italic text-white flex items-center gap-3">
          <ShoppingCart className="w-8 h-8 text-green-400" />
          Votre <span className="text-green-400">Panier</span>
        </h1>
        <p className="text-gray-500 text-sm mt-1">{totalItems} article{totalItems > 1 ? 's' : ''} dans votre panier</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {items.map(item => {
            const unitPrice = item.product.price

            return (
              <div
                key={item.product.id}
                className="bg-[#111827] border border-gray-800 rounded-xl p-4 flex gap-4"
              >
                <div className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-lg overflow-hidden bg-gray-900 flex-shrink-0">
                  <Image
                    src={item.product.image_url}
                    alt={item.product.name}
                    fill
                    className="object-cover"
                    sizes="128px"
                  />
                </div>
                <div className="flex-1 flex flex-col justify-between min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-white font-semibold text-sm sm:text-base">{item.product.name}</h3>
                      <p className="text-gray-500 text-xs mt-0.5">
                        {item.product.categories?.name}
                      </p>
                    </div>
                    <button
                      onClick={() => removeFromCart(item.product.id)}
                      className="text-gray-500 hover:text-red-400 p-1 flex-shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center bg-gray-800 rounded-lg">
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                        className="p-2 text-gray-400 hover:text-white"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="px-3 text-white text-sm font-medium">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        className="p-2 text-gray-400 hover:text-white"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="text-right">
                      <p className="text-green-400 font-bold">{formatPrice(unitPrice * item.quantity)}</p>
                      <p className="text-gray-500 text-xs">Prix unitaire</p>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Order Summary */}
        <div>
          <div className="bg-[#111827] border border-gray-800 rounded-xl p-6 sticky top-20">
            <h2 className="text-white font-bold text-lg mb-4">Résumé de commande</h2>

            <div className="space-y-3 text-sm">
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
              {shipping > 0 && (
                <p className="text-gray-600 text-xs">Livraison gratuite à Dakar pour les commandes de plus de {formatPrice(freeShippingThreshold)}</p>
              )}
              <div className="border-t border-gray-700 pt-3 flex justify-between">
                <span className="text-white font-bold">Total</span>
                <span className="text-green-400 font-bold text-xl">{formatPrice(total)}</span>
              </div>
            </div>

            <Link
              href="/checkout"
              className="w-full mt-6 bg-green-500 hover:bg-green-600 text-black font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              <Lock className="w-4 h-4" />
              Passer au paiement
            </Link>

            <Link
              href="/products"
              className="w-full mt-3 border border-gray-700 hover:border-gray-500 text-gray-300 py-3 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Continuer mes achats
            </Link>

            {/* Trust badges */}
            <div className="mt-6 pt-4 border-t border-gray-800">
              <p className="text-gray-400 text-xs font-medium mb-3">Paiement sécurisé</p>
              <div className="flex flex-wrap gap-2">
                {enabledPayments.map(key => (
                  <div key={key} className="bg-gray-800 rounded px-2 py-1 text-[10px] text-gray-400 font-medium">
                    {PAYMENT_LABELS[key] || key}
                  </div>
                ))}
                <Lock className="w-4 h-4 text-green-400" />
              </div>

              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <Truck className="w-4 h-4 text-green-400 flex-shrink-0" />
                  <div>
                    <p className="text-white font-medium">Livraison rapide</p>
                    <p>Dakar : 3h | Autres villes : 5h à moins de 2 jours</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <Shield className="w-4 h-4 text-green-400 flex-shrink-0" />
                  <div>
                    <p className="text-white font-medium">Garantie qualité</p>
                    <p>14 jours pour retourner votre article</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
