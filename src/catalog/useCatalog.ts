import { useCallback, useEffect, useState } from 'react'
import type { CatalogProduct, CatalogSettings, CatalogSnapshot } from './types'
import { STORAGE_KEY, clearLocal, loadSnapshot, saveLocal } from './storage'

/**
 * Reads the catalogue from this browser (if a draft exists) or the committed
 * JSON. `reload` re-reads after a save; the storage listener keeps a second tab
 * in step.
 */
export function useCatalog() {
  const [snapshot, setSnapshot] = useState<CatalogSnapshot>(() => loadSnapshot())

  const reload = useCallback(() => setSnapshot(loadSnapshot()), [])

  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key === STORAGE_KEY || event.key === null) reload()
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [reload])

  const persist = useCallback((products: CatalogProduct[], settings: CatalogSettings) => {
    const result = saveLocal({ products, settings })
    if (result.ok) reload()
    return result
  }, [reload])

  const discard = useCallback(() => {
    clearLocal()
    reload()
  }, [reload])

  return { ...snapshot, reload, persist, discard }
}
