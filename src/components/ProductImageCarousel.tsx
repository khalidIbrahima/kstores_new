'use client'

import { useState, useCallback } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface ProductImageCarouselProps {
  images: string[]
}

export default function ProductImageCarousel({ images }: ProductImageCarouselProps) {
  const [current, setCurrent] = useState(0)

  const validImages = images.filter(Boolean)

  const goTo = useCallback((index: number) => {
    setCurrent(index)
  }, [])

  const goPrev = useCallback(() => {
    setCurrent((prev) => (prev === 0 ? validImages.length - 1 : prev - 1))
  }, [validImages.length])

  const goNext = useCallback(() => {
    setCurrent((prev) => (prev === validImages.length - 1 ? 0 : prev + 1))
  }, [validImages.length])

  if (validImages.length === 0) {
    return (
      <div className="aspect-square rounded-xl bg-gray-900 border border-gray-800 flex items-center justify-center">
        <span className="text-gray-600 text-sm">Aucune image</span>
      </div>
    )
  }

  return (
    <div>
      {/* Main Image */}
      <div className="relative aspect-square rounded-xl overflow-hidden bg-gray-900 border border-gray-800 group">
        <Image
          src={validImages[current]}
          alt={`Image ${current + 1}`}
          fill
          className="object-cover transition-opacity duration-300"
          sizes="(max-width: 1024px) 100vw, 50vw"
          priority={current === 0}
        />

        {/* Arrow Buttons */}
        {validImages.length > 1 && (
          <>
            <button
              onClick={goPrev}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 border border-gray-700 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
              aria-label="Image précédente"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={goNext}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 border border-gray-700 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
              aria-label="Image suivante"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}

        {/* Image Counter */}
        {validImages.length > 1 && (
          <div className="absolute bottom-3 right-3 bg-black/60 text-white text-xs font-medium px-2.5 py-1 rounded-md border border-gray-700">
            {current + 1} / {validImages.length}
          </div>
        )}
      </div>

      {/* Thumbnail Strip */}
      {validImages.length > 1 && (
        <div className="flex gap-3 mt-4 overflow-x-auto pb-1">
          {validImages.map((img, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all ${
                current === i
                  ? 'border-green-500 shadow-lg shadow-green-500/20'
                  : 'border-gray-700 hover:border-gray-500'
              }`}
            >
              <Image
                src={img}
                alt={`Miniature ${i + 1}`}
                fill
                className="object-cover"
                sizes="80px"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
