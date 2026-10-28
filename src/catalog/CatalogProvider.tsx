import type { ReactNode } from 'react'
import { CatalogContext } from './CatalogContext'
import { useCatalog } from './useCatalog'

export function CatalogProvider({ children }: { children: ReactNode }) {
  const value = useCatalog()
  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>
}
