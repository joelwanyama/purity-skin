import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'

type Props = { title: string; onClose: () => void; children: ReactNode; width?: 'normal' | 'wide' }
export function Modal({ title, onClose, children, width = 'normal' }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const onCloseRef = useRef(onClose)
  useEffect(() => { onCloseRef.current = onClose }, [onClose])
  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (!dialog.open) dialog.showModal()
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') onCloseRef.current() }
    document.addEventListener('keydown', closeOnEscape)
    return () => { document.removeEventListener('keydown', closeOnEscape); if (dialog.open) dialog.close() }
  }, [])
  return <dialog ref={ref} className={`modal-dialog ${width === 'wide' ? 'modal-wide' : ''}`} aria-labelledby="modal-title" onCancel={(event) => { event.preventDefault(); onClose() }}>
    <div className="modal-heading"><h2 id="modal-title">{title}</h2><button type="button" className="icon-button" onClick={onClose} aria-label="Close dialog"><X size={18} /></button></div>
    {children}
  </dialog>
}
