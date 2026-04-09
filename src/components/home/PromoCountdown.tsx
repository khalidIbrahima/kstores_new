'use client'

import { useState, useEffect } from 'react'
import { Product } from '@/lib/types'
import ProductCard from '@/components/ProductCard'

function getTimeLeft() {
  const now = new Date()
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
  const diff = endOfMonth.getTime() - now.getTime()
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  }
}

export default function PromoCountdown({ products }: { products: Product[] }) {
  const [time, setTime] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 })
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setTime(getTimeLeft())
    const timer = setInterval(() => setTime(getTimeLeft()), 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <section className="py-16 sm:py-20 bg-gradient-to-b from-[#060a13] via-blue-950/10 to-[#060a13]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black italic text-white">
            Promotions <span className="text-green-400">Flash</span>
          </h2>
          <p className="text-gray-500 mt-2">Offres limitées - Ne manquez pas ces réductions</p>

          {/* Countdown */}
          <div className="flex justify-center gap-4 mt-6">
            {[
              { val: time.days, label: 'Jours' },
              { val: time.hours, label: 'Heures' },
              { val: time.minutes, label: 'Minutes' },
              { val: time.seconds, label: 'Secondes' },
            ].map(item => (
              <div key={item.label} className="text-center">
                <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-green-400 tabular-nums">
                  {mounted ? String(item.val).padStart(2, '0') : '--'}
                </div>
                <div className="text-gray-500 text-xs mt-1">{item.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {products.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  )
}
