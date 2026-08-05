import type { CSSProperties } from 'react'

/**
 * Illustrated PNG tinted to `color`.
 * Grayscale base + masked multiply wash keeps outlines/faces readable
 * without the original baked body color fighting the tint.
 */

type Props = {
  src: string
  color: string
  size?: number
  className?: string
  alt?: string
}

export function TintedChar({ src, color, size = 120, className, alt = '' }: Props) {
  const style = {
    width: size,
    height: size,
    '--tint': color,
    '--char': `url("${src}")`,
  } as CSSProperties

  return (
    <span className={`tinted-char${className ? ` ${className}` : ''}`} style={style} aria-hidden={alt ? undefined : true}>
      <img src={src} alt={alt} className="tinted-base" width={size} height={size} draggable={false} />
      <span className="tinted-wash" />
      <img src={src} alt="" className="tinted-line" width={size} height={size} draggable={false} />
    </span>
  )
}
