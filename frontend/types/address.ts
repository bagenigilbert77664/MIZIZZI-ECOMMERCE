export enum AddressType {
  SHIPPING = "shipping",
  BILLING = "billing",
  BOTH = "both",
}

export interface Address {
  id: number
  first_name: string
  last_name: string
  address_line1: string
  address_line2?: string
  city: string
  state: string
  postal_code: string
  country: string
  phone: string
  alternative_phone?: string
  address_type: "shipping" | "billing" | "both"
  is_default: boolean
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
  phone: string
  alternative_phone?: string
  address_type: "shipping" | "billing" | "both"
  is_default: boolean
}
