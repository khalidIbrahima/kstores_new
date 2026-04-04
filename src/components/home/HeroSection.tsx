'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'

const slides = [
  {
    title: 'Votre destination unique pour',
    highlight: 'Tout ce dont vous avez besoin',
    desc: 'Découvrez des milliers d\'articles de qualité avec une livraison rapide et un service client exceptionnel.',
    cta: 'Acheter maintenant',
    ctaLink: '/products',
    cta2: 'Parcourir les catégories',
    cta2Link: '/products',
    bg: 'from-green-900/20 via-[#060a13] to-blue-900/20',
  },
  {
    title: 'Gaming &',
    highlight: 'Electronique',
    desc: 'Les meilleurs gadgets, claviers mécaniques, souris gaming et accessoires tech pour votre setup.',
    cta: 'Explorer Gaming',
    ctaLink: '/products?category=gaming',
    cta2: 'Voir les promos',
    cta2Link: '/products',
    bg: 'from-purple-900/20 via-[#060a13] to-green-900/20',
  },
  {
    title: 'Livraison rapide à',
    highlight: 'Dakar & tout le Sénégal',
    desc: 'Livraison gratuite à Dakar pour les commandes de plus de 50 000 F CFA. Recevez vos commandes sous 1-2 jours.',
    cta: 'Acheter maintenant',
    ctaLink: '/products',
    cta2: 'Nous contacter',
    cta2Link: '/contact',
    bg: 'from-blue-900/20 via-[#060a13] to-cyan-900/20',
  },
]

export default function HeroSection() {
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent(prev => (prev + 1) % slides.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [])

  const slide = slides[current]

  return (
    <section className={`relative bg-gradient-to-r ${slide.bg} py-20 sm:py-32 transition-all duration-700`}>
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PHBhdGggZD0iTSAxMCAwIEwgMTAgNDAiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCBmaWxsPSJ1cmwoI2dyaWQpIiB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIi8+PC9zdmc+')] opacity-50" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl animate-fade-in" key={current}>
          <h1 className="text-4xl sm:text-6xl font-black italic text-white leading-tight">
            {slide.title}{' '}
            <span className="text-green-400">{slide.highlight}</span>
          </h1>
          <p className="mt-4 text-gray-400 text-lg max-w-lg">
            {slide.desc}
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href={slide.ctaLink}
              className="bg-green-500 hover:bg-green-600 text-black font-bold px-8 py-3 rounded-lg transition-colors"
            >
              {slide.cta}
            </Link>
            <Link
              href={slide.cta2Link}
              className="border border-gray-600 hover:border-gray-400 text-white px-8 py-3 rounded-lg transition-colors"
            >
              {slide.cta2}
            </Link>
          </div>
        </div>

        {/* Slide indicators */}
        <div className="flex gap-2 mt-12">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`w-3 h-3 rounded-full transition-all ${
                i === current ? 'bg-green-400 w-8' : 'bg-gray-600'
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
