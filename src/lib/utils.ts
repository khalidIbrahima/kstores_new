export function formatPrice(price: number | null | undefined, currency = 'XOF'): string {
  const value = Number(price) || 0
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export function getDiscountedPrice(price: number | null | undefined, percentage: number | null | undefined): number {
  const p = Number(price) || 0
  const pct = Number(percentage) || 0
  if (!pct) return p
  return Math.round(p * (1 - pct / 100))
}

export function cn(...classes: (string | false | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ')
}
