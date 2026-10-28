import { createContext } from 'react'
import type { CatalogProduct, CatalogSettings, CatalogSnapshot } from './types'

export type CatalogValue = CatalogSnapshot & {
  reload: () => void
  persist: (products: CatalogProduct[], settings: CatalogSettings) => { ok: boolean; error?: string }
  discard: () => void
}

export const CatalogContext = createContext<CatalogValue | null>(null)
