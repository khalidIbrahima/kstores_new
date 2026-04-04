'use client'

import { cn } from '@/lib/utils'

interface PromotionBadgeProps {
  percentage: number
  className?: string
}

export default function PromotionBadge({ percentage, className }: PromotionBadgeProps) {
  if (percentage <= 0) return null

  return (
    <span
      className={cn(
        'absolute z-10 bg-gradient-to-r from-red-500 to-orange-500 text-white text-xs font-bold px-2.5 py-1 rounded-md shadow-lg',
        className
      )}
    >
      -{percentage}%
    </span>
  )
}
