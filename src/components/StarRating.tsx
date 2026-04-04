'use client'

import { useState } from 'react'
import { Star } from 'lucide-react'

interface StarRatingProps {
  rating: number
  size?: number
  interactive?: boolean
  onChange?: (rating: number) => void
}

export default function StarRating({
  rating,
  size = 16,
  interactive = false,
  onChange,
}: StarRatingProps) {
  const [hovered, setHovered] = useState<number>(0)

  const displayRating = interactive && hovered > 0 ? hovered : rating

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = displayRating >= star
        const half = !filled && displayRating >= star - 0.5

        return (
          <button
            key={star}
            type="button"
            disabled={!interactive}
            onClick={() => interactive && onChange?.(star)}
            onMouseEnter={() => interactive && setHovered(star)}
            onMouseLeave={() => interactive && setHovered(0)}
            className={`p-0 border-0 bg-transparent ${
              interactive ? 'cursor-pointer' : 'cursor-default'
            }`}
          >
            {half ? (
              <span className="relative inline-block" style={{ width: size, height: size }}>
                <Star
                  size={size}
                  className="absolute inset-0 text-gray-600"
                />
                <span
                  className="absolute inset-0 overflow-hidden"
                  style={{ width: size / 2 }}
                >
                  <Star
                    size={size}
                    className="text-yellow-400 fill-yellow-400"
                  />
                </span>
              </span>
            ) : (
              <Star
                size={size}
                className={
                  filled
                    ? 'text-yellow-400 fill-yellow-400'
                    : 'text-gray-600'
                }
              />
            )}
          </button>
        )
      })}
    </div>
  )
}
