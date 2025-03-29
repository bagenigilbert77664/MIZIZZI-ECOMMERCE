export enum AddressType {
  SHIPPING = "shipping",
  BILLING = "billing",
  BOTH = "both",
}

export interface Address {
  id: number
  user_id?: number
  first_name: string
  last_name: string
  address_line1: string
  address_line2?: string
  city: string
  state: string
  postal_code: string
  country: string
  phone?: string
  alternative_phone?: string
  address_type: AddressType | string
  is_default: boolean
  created_at?: string
  updated_at?: string
}

export interface AddressFormValues {
  first_name: string
  last_name: string
  address_line1: string
  address_line2?: string
  city: string
  state: string
  postal_code: string
  country: string
  phone?: string
  alternative_phone?: string
  address_type: "shipping" | "billing" | "both"
  is_default: boolean
}

