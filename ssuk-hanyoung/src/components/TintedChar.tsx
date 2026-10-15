import type { CSSProperties } from 'react'
import { memo } from 'react'

/**
 * Lightweight tinted character: one image + one masked color wash.
 * Uses small/medium WebP sources from callers.
 */

type Props = {
  src: string
  color: string
  size?: number
  className?: string
  alt?: string
}

export const TintedChar = memo(function TintedChar({ src, color, size = 120, className, alt = '' }: Props) {
  const style = {
    width: size,
    height: size,
    '--tint': color,
    '--char': `url("${src}")`,
  } as CSSProperties

  return (
    <span className={`tinted-char${className ? ` ${className}` : ''}`} style={style} aria-hidden={alt ? undefined : true}>
      <img
        src={src}
        alt={alt}
        className="tinted-base"
        width={size}
        height={size}
        draggable={false}
        loading="lazy"
        decoding="async"
      />
      <span className="tinted-wash" />
    </span>
  )
})
