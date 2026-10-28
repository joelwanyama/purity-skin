import { createContext } from 'react'
import type { CatalogProduct } from '../catalog/types'
import type { EnquiryLine } from './enquiry'

export type EnquiryValue = {
  /** Live lines, resolved against the published catalogue. */
  lines: EnquiryLine[]
  items: number
  totalUgx: number
  hasUnpriced: boolean
  note: string
  /** Products that were in the list but are no longer published. */
  removed: string[]
  quantityOf: (productId: string) => number
  add: (product: Pick<CatalogProduct, 'id' | 'name'>) => void
  setQuantity: (productId: string, quantity: number) => void
  remove: (productId: string) => void
  clear: () => void
  setNote: (note: string) => void
  dismissRemoved: () => void
}

export const EnquiryContext = createContext<EnquiryValue | null>(null)
