import { ImageOff } from 'lucide-react'
import photoVariants from '../catalog/photo-variants.json'

type Props = {
  name: string
  imagePath: string | null
  photoState: 'pending' | 'ready'
  /** Rendered width hint for the layout box; the file itself is set separately. */
  variant?: 'card' | 'detail'
  priority?: boolean
}

type Variant = { card: string; share: string; width: number; height: number; card_width: number }

const variants = photoVariants as Record<string, Variant>

/**
 * The width the layout box actually occupies, so the browser downloads the
 * small file on a phone and the big one on a desktop retina screen.
 */
const SIZES: Record<'card' | 'detail', string> = {
  // Card grid: one column on phones, two from 760px, and the grid tops out
  // around 1200px of content width.
  card: '(min-width: 1200px) 430px, (min-width: 760px) 44vw, 92vw',
  detail: '(min-width: 980px) 520px, 92vw',
}

/**
 * Renders an approved product photo, or an intentional photo slot when no
 * approved image exists yet. There are no stock photos and no generated
 * product imagery: an empty slot stays visibly empty on purpose.
 *
 * Sizing: the box always reserves a 4:5 area in CSS, and width/height are set
 * from the real measured file, so the page never shifts as photos arrive. When
 * the photo pipeline has produced a 480 px card copy (`npm run photos`), phones
 * fetch that instead of the full-size file.
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

  const path = imagePath as string
  const variantInfo = variants[path]
  // Only offer the small file when it was actually built for this exact photo.
  const srcSet = variantInfo ? `${variantInfo.card} ${variantInfo.card_width}w, ${path} ${variantInfo.width}w` : undefined

  return (
    <div className={`photo-frame photo-frame-${variant}`}>
      <img
        src={path}
        srcSet={srcSet}
        sizes={srcSet ? SIZES[variant] : undefined}
        alt={`${name} — PURITY SKIN product photo`}
        width={variantInfo?.width ?? 1200}
        height={variantInfo?.height ?? 1500}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        fetchPriority={priority ? 'high' : 'auto'}
      />
    </div>
  )
}
