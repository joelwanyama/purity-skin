import { useContext } from 'react'
import { CatalogContext } from './CatalogContext'

export function useShopCatalog() {
  const context = useContext(CatalogContext)
  if (!context) throw new Error('useShopCatalog must be used inside CatalogProvider')
  return context
}
