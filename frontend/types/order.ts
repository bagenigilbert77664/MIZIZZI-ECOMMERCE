export interface OrderItem {
  id: string
  product_id: string
  name?: string
  product_name?: string
  price: number
  quantity: number
  image?: string
  product?: {
    name?: string
    thumbnail_url?: string
    image_urls?: string[]
    variation?: Record<string, string>
  }
  thumbnail_url?: string
  image_url?: string
  variation?: Record<string, string>
  return_tracking?: string
  return_authorization?: string
  return_reason?: string
  refund_status?: string
  refund_amount?: number
}

export interface Address {
  name: string
  street: string
  city: string
  state: string
  zipCode: string
  country: string
  phone?: string
  first_name?: string
  last_name?: string
  address_line1?: string
  postal_code?: string
}

export interface Order {
  id: string
  order_number: string
  user_id: string
  status: string
  items: OrderItem[]
  created_at: string
  updated_at?: string
  cancelled_at?: string
  returned_at?: string
  shipping_address: Address
  billing_address: Address
  payment_method: string
  shipping_method?: string
  carrier?: string
  tracking_number?: string
  subtotal: number
  shipping: number
  tax: number
  total: number
  total_amount?: number
  subtotal_amount?: number
  shipping_amount?: number
  tax_amount?: number
  discount_amount?: number
  cancellation_reason?: string
  return_reason?: string
  return_tracking?: string
  return_authorization?: string
  refund_status?: string
}

