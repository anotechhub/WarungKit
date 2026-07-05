// Product and ProductType come from the shared backend contract — do not
// redeclare this shape here. @warungkit/contracts is the single source of
// truth for the public product payload returned by GET /api/products.
import type { Product } from '@warungkit/contracts'

export type { Product, ProductType } from '@warungkit/contracts'

export type CheckoutDraft = {
  product: Product
  customer: {
    name: string
    email: string
    phone: string
  }
}

export type OrderStatus = 'pending' | 'payment_created' | 'paid' | 'expired' | 'failed' | 'cancelled'

export type OrderView = {
  id: string
  orderCode: string
  status: OrderStatus
  product: Product
  customer: {
    email: string
    phone: string
  }
  amountIdr: number
  paidAt?: string
}
