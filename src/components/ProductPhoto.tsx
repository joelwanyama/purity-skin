import { ImageOff } from 'lucide-react'

type Props = {
  name: string
  imagePath: string | null
  photoState: 'pending' | 'ready'
  /** Rendered width hint for the layout box; the file itself is set separately. */
  variant?: 'card' | 'detail'
  priority?: boolean
}

/**
 * Renders an approved product photo, or an intentional photo slot when no
 * approved image exists yet. There are no stock photos and no generated
 * product imagery: an empty slot stays visibly empty on purpose.
 */
export function ProductPhoto({ name, imagePath, photoState, variant = 'card', priority = false }: Props) {
  const hasPhoto = photoState === 'ready' && Boolean(imagePath) && /^(https:\/\/|\/)/.test(imagePath ?? '')

  if (!hasPhoto) {
    return (
      <div
        className={`photo-slot photo-slot-${variant}`}
        role="img"
        aria-label={`Photo slot for ${name || 'this product'}: an approved product photo is needed`}
      >
        <span className="slot-ring" aria-hidden="true" />
        <img className="slot-logo" src="/brand/purity-mark.png" alt="" width={68} height={68} aria-hidden="true" />
        <span className="slot-label">
          <ImageOff size={13} aria-hidden="true" />
          PHOTO SLOT
        </span>
        <span className="slot-hint" aria-hidden="true">4:5 · APPROVED PHOTO NEEDED</span>
      </div>
    )
  }

  return (
    <div className={`photo-frame photo-frame-${variant}`}>
      <img
        src={imagePath ?? ''}
        alt={`${name} — PURITY SKIN product photo`}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        fetchPriority={priority ? 'high' : 'auto'}
      />
    </div>
  )
}
