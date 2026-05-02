export interface Category {
  id: string
  name: string
  slug: string
  created_at: string
  cover_image_url: string | null
}

export interface Product {
  id: string
  name: string
  description: string | null
  price: number
  image_url: string
  image_url1: string | null
  image_url2: string | null
  image_url3: string | null
  image_url4: string | null
  inventory: number
  category_id: string | null
  created_at: string
  isActive: boolean | null
  colors: unknown[] | null
  old_price: number | null
  promotion_active: boolean | null
  promotion_start_date: string | null
  promotion_end_date: string | null
  promotion_percentage: number | null
  properties: Record<string, unknown> | null
  slug: string | null
  stock: number | null
  categories?: Category
}

export interface Review {
  id: string
  created_at: string
  rate: number | null
  comment: string | null
  productId: string | null
  userId: string | null
}

export interface CartItem {
  product: Product
  quantity: number
}

export interface OrderItem {
  id: string
  order_id: string | null
  product_id: string | null
  quantity: number
  price: number
  created_at: string
}

export interface StoreSettings {
  id: string
  store_name: string
  store_url: string | null
  contact_email: string | null
  support_phone: string | null
  store_description: string | null
  currency: string | null
  logo_url: string | null
  favicon_url: string | null
  social_media: Record<string, string> | null
  tax_rate: number | null
  shipping_options: {
    local_pickup?: boolean
    express_shipping_cost?: number
    standard_shipping_cost?: number
    free_shipping_threshold?: number
  } | null
  payment_methods: {
    wave?: boolean
    paypal?: boolean
    credit_card?: boolean
    bank_transfer?: boolean
    orange_money?: boolean
  } | null
  ai_provider: 'groq' | 'anthropic' | null
}
