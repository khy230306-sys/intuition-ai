import type { CSSProperties } from 'react'

/** High-quality PNG character with live body tint (keeps face/detail) */

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
      <img src={src} alt="" className="tinted-shade" width={size} height={size} draggable={false} />
      <img src={src} alt="" className="tinted-gloss" width={size} height={size} draggable={false} />
    </span>
  )
}
