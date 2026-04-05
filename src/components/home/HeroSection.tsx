'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const slides = [
  {
    title: 'Votre destination unique pour',
    highlight: 'Tout ce dont vous avez besoin',
    desc: "Decouvrez des milliers d'articles de qualite avec une livraison rapide et un service client exceptionnel.",
    cta: 'Acheter maintenant',
    ctaLink: '/products',
    cta2: 'Parcourir les categories',
    cta2Link: '/categories',
    image: 'https://images.unsplash.com/photo-1614179924047-e1ab49a0a0cf?w=1920&q=80&auto=format&fit=crop&crop=edges',
  },
  {
    title: 'Gaming &',
    highlight: 'Electronique',
    desc: 'Les meilleurs gadgets, claviers mecaniques, souris gaming et accessoires tech pour votre setup.',
    cta: 'Explorer Gaming',
    ctaLink: '/products?category=gaming',
    cta2: 'Voir les promos',
    cta2Link: '/products',
    image: 'https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?w=1920&q=80&auto=format',
  },
  {
    title: 'Livraison rapide a',
    highlight: 'Dakar & tout le Senegal',
    desc: 'Livraison gratuite a Dakar pour les commandes de plus de 50 000 F CFA. Recevez vos commandes en moins de 3h.',
    cta: 'Acheter maintenant',
    ctaLink: '/products',
    cta2: 'Nous contacter',
    cta2Link: '/contact',
    image: 'https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=1920&q=80&auto=format',
  },
]

export default function HeroSection() {
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent(prev => (prev + 1) % slides.length)
    }, 6000)
    return () => clearInterval(timer)
  }, [])

  const prev = () => setCurrent(c => (c - 1 + slides.length) % slides.length)
  const next = () => setCurrent(c => (c + 1) % slides.length)

  const slide = slides[current]

  return (
    <section className="relative overflow-hidden" style={{ minHeight: 'min(85vh, 600px)' }}>
      {/* Background images — all preloaded, only active one visible */}
      {slides.map((s, i) => (
        <div
          key={i}
          className="absolute inset-0 transition-opacity duration-1000"
          style={{ opacity: i === current ? 1 : 0 }}
        >
          <Image
            src={s.image}
            alt=""
            fill
            className={`object-cover ${i === 0 ? 'scale-[1.35] object-center' : ''}`}
            sizes="100vw"
            priority={i === 0}
          />
          {/* Dark overlay for text readability */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#060a13] via-[#060a13]/85 to-[#060a13]/40" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#060a13] via-transparent to-[#060a13]/30" />
        </div>
      ))}

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center" style={{ minHeight: 'min(85vh, 600px)' }}>
        <div className="max-w-xl py-16 sm:py-20" key={current}>
          <div className="animate-fade-in">
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black italic text-white leading-tight">
              {slide.title}{' '}
              <span className="text-green-400">{slide.highlight}</span>
            </h1>
            <p className="mt-4 sm:mt-6 text-gray-300 text-sm sm:text-lg max-w-lg leading-relaxed">
              {slide.desc}
            </p>
            <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row gap-3">
              <Link
                href={slide.ctaLink}
                className="bg-green-500 hover:bg-green-600 text-black font-bold px-6 sm:px-8 py-3 rounded-lg transition-colors text-center text-sm sm:text-base"
              >
                {slide.cta}
              </Link>
              <Link
                href={slide.cta2Link}
                className="border border-gray-500 hover:border-gray-300 text-white px-6 sm:px-8 py-3 rounded-lg transition-colors text-center text-sm sm:text-base"
              >
                {slide.cta2}
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation arrows */}
      <button
        onClick={prev}
        className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-black/60 transition-all"
        aria-label="Precedent"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <button
        onClick={next}
        className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-black/60 transition-all"
        aria-label="Suivant"
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      {/* Slide indicators */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-2">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`h-2 rounded-full transition-all duration-300 ${
              i === current ? 'bg-green-400 w-8' : 'bg-white/30 w-2 hover:bg-white/50'
            }`}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>
    </section>
  )
}
