const SCRAPINGBEE_API_KEY = process.env.SCRAPINGBEE_API_KEY || ''

export interface ScrapedProduct {
  name: string
  description: string
  price: number
  image_url: string
  colors: string[]
  source_url: string
}

async function fetchHtml(url: string): Promise<string> {
  if (!SCRAPINGBEE_API_KEY) {
    throw new Error('SCRAPINGBEE_API_KEY is not configured')
  }
  const params = new URLSearchParams({
    api_key: SCRAPINGBEE_API_KEY,
    url,
    render_js: 'false',
    premium_proxy: 'true',
    country_code: 'us',
  })
  const res = await fetch(`https://app.scrapingbee.com/api/v1/?${params}`)
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`ScrapingBee ${res.status}: ${body.slice(0, 200)}`)
  }
  return res.text()
}

interface JsonLdProduct {
  '@type'?: string | string[]
  name?: string
  description?: string
  image?: string | string[]
  offers?: JsonLdOffer | JsonLdOffer[]
}

interface JsonLdOffer {
  price?: string | number
  lowPrice?: string | number
  priceSpecification?: { price?: string | number }
}

function parseJsonLd(html: string): Partial<ScrapedProduct> | null {
  const matches = html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)
  for (const m of matches) {
    let parsed: unknown
    try {
      parsed = JSON.parse(m[1].trim())
    } catch {
      continue
    }
    const items = Array.isArray(parsed) ? parsed : [parsed]
    for (const raw of items) {
      const item = raw as JsonLdProduct
      const type = item['@type']
      const isProduct = type === 'Product' || (Array.isArray(type) && type.includes('Product'))
      if (!isProduct) continue

      const offers = item.offers
      const offer = (Array.isArray(offers) ? offers[0] : offers) || {}
      const priceRaw = offer.price ?? offer.lowPrice ?? offer.priceSpecification?.price
      const price = priceRaw != null ? parseFloat(String(priceRaw)) : undefined

      return {
        name: typeof item.name === 'string' ? item.name : undefined,
        description: typeof item.description === 'string' ? item.description : undefined,
        price: Number.isFinite(price) ? price : undefined,
        image_url: Array.isArray(item.image) ? item.image[0] : item.image,
      }
    }
  }
  return null
}

interface AlibabaSkuValue {
  propertyValueDisplayName?: string
  name?: string
}
interface AlibabaSkuProperty {
  skuPropertyName?: string
  skuPropertyValues?: AlibabaSkuValue[]
}
interface AlibabaRunParams {
  data?: {
    subject?: string
    title?: string
    priceModule?: { minAmount?: { value?: string | number } }
    imageModule?: { imagePathList?: string[] }
    skuModule?: { productSKUPropertyList?: AlibabaSkuProperty[] }
  }
}

function parseRunParams(html: string): Partial<ScrapedProduct> | null {
  const m = html.match(/window\.runParams\s*=\s*(\{[\s\S]*?\});\s*<\/script>/)
  if (!m) return null
  let parsed: AlibabaRunParams
  try {
    parsed = JSON.parse(m[1]) as AlibabaRunParams
  } catch {
    return null
  }
  const d = parsed.data
  if (!d) return null

  const priceRaw = d.priceModule?.minAmount?.value
  const price = priceRaw != null ? parseFloat(String(priceRaw)) : undefined

  const colorProp = d.skuModule?.productSKUPropertyList?.find((p) =>
    /color|couleur/i.test(p.skuPropertyName || '')
  )
  const colors = colorProp?.skuPropertyValues
    ?.map((v) => v.propertyValueDisplayName || v.name)
    .filter((v): v is string => typeof v === 'string' && v.length > 0) || []

  return {
    name: d.subject || d.title,
    price: Number.isFinite(price) ? price : undefined,
    image_url: d.imageModule?.imagePathList?.[0],
    colors,
  }
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

export async function scrapeAlibabaProduct(url: string): Promise<ScrapedProduct> {
  const html = await fetchHtml(url)
  const fromJsonLd = parseJsonLd(html)
  const fromRunParams = parseRunParams(html)

  const name = fromRunParams?.name || fromJsonLd?.name
  if (!name) {
    throw new Error('Could not extract product name from page')
  }

  const price = fromRunParams?.price ?? fromJsonLd?.price
  if (price == null) {
    throw new Error('Could not extract product price from page')
  }

  return {
    name,
    description: fromJsonLd?.description || '',
    price,
    image_url: fromRunParams?.image_url || fromJsonLd?.image_url || '',
    colors: fromRunParams?.colors || [],
    source_url: url,
  }
}
