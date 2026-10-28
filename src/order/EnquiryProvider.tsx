import { useCallback, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { publishedProducts } from '../catalog/storage'
import type { CatalogProduct } from '../catalog/types'
import { useShopCatalog } from '../catalog/useShopCatalog'
import { EnquiryContext } from './EnquiryContext'
import {
  addItem,
  emptyEnquiry,
  loadEnquiry,
  missingLines,
  removeItem,
  resolveLines,
  saveEnquiry,
  setQuantity,
  summarize,
} from './enquiry'
import type { StoredEnquiry } from './enquiry'

/**
 * Holds the customer's enquiry list on their own device. Names, sizes and
 * prices are read from the live catalogue on every render, so a saved list can
 * never carry a stale price. A product that stops being published simply drops
 * out of the resolved list, with a visible notice.
 */
export function EnquiryProvider({ children }: { children: ReactNode }) {
  const { products } = useShopCatalog()
  const published = useMemo(() => publishedProducts(products), [products])
  const [stored, setStored] = useState<StoredEnquiry>(() => loadEnquiry())

  const commit = useCallback((next: StoredEnquiry) => {
    setStored(next)
    saveEnquiry(next)
  }, [])

  const lines = useMemo(() => resolveLines(stored.lines, published), [stored.lines, published])
  const totals = useMemo(() => summarize(lines), [lines])

  const gone = useMemo(() => missingLines(stored.lines, published), [stored.lines, published])
  const removed = useMemo(
    () => [...new Set(gone.map((line) => line.name || 'A product you chose'))].slice(0, 3),
    [gone],
  )

  const add = useCallback((product: Pick<CatalogProduct, 'id' | 'name'>) => {
    commit({ ...stored, lines: addItem(stored.lines, product) })
  }, [commit, stored])

  const setQuantityFor = useCallback((productId: string, quantity: number) => {
    commit({ ...stored, lines: setQuantity(stored.lines, productId, quantity) })
  }, [commit, stored])

  const remove = useCallback((productId: string) => {
    commit({ ...stored, lines: removeItem(stored.lines, productId) })
  }, [commit, stored])

  const clear = useCallback(() => {
    commit(emptyEnquiry())
  }, [commit])

  const setNote = useCallback((note: string) => {
    commit({ ...stored, note })
  }, [commit, stored])

  // Dismissing the notice is also the moment the dead entries leave storage.
  const dismissRemoved = useCallback(() => {
    const ids = new Set(gone.map((line) => line.product_id))
    if (ids.size === 0) return
    commit({ ...stored, lines: stored.lines.filter((line) => !ids.has(line.product_id)) })
  }, [commit, gone, stored])

  const value = useMemo(() => ({
    lines,
    items: totals.items,
    totalUgx: totals.totalUgx,
    hasUnpriced: totals.hasUnpriced,
    note: stored.note,
    removed,
    quantityOf: (productId: string) => lines.find((line) => line.product.id === productId)?.quantity ?? 0,
    add,
    setQuantity: setQuantityFor,
    remove,
    clear,
    setNote,
    dismissRemoved,
  }), [add, clear, lines, removed, remove, setNote, setQuantityFor, stored.note, totals, dismissRemoved])

  return <EnquiryContext.Provider value={value}>{children}</EnquiryContext.Provider>
}
