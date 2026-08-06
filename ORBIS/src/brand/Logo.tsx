import type { CSSProperties } from 'react'
import styles from './Logo.module.css'

type LogoProps = {
  size?: number
  showWordmark?: boolean
  className?: string
}

export function Logo({ size = 40, showWordmark = true, className = '' }: LogoProps) {
  const style = { '--logo-size': `${size}px` } as CSSProperties

  return (
    <div className={`${styles.logo} ${className}`.trim()} style={style} aria-label="ORBIS">
      <LogoMark size={size} />
      {showWordmark ? <span className={styles.wordmark}>ORBIS</span> : null}
    </div>
  )
}

export function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <svg
      className={styles.mark}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-hidden={true}
    >
      <defs>
        <radialGradient id="orbisCoreGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="35%" stopColor="#3aa9ff" stopOpacity="0.9" />
          <stop offset="70%" stopColor="#9b6bff" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#05070f" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="orbisOrbit" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3aa9ff" />
          <stop offset="50%" stopColor="#d4b26a" />
          <stop offset="100%" stopColor="#9b6bff" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="28" fill="none" stroke="url(#orbisOrbit)" strokeWidth="1.4" opacity="0.55" />
      <ellipse
        cx="32"
        cy="32"
        rx="22"
        ry="10"
        fill="none"
        stroke="url(#orbisOrbit)"
        strokeWidth="1.2"
        opacity="0.8"
        transform="rotate(-28 32 32)"
      />
      <ellipse
        cx="32"
        cy="32"
        rx="18"
        ry="8"
        fill="none"
        stroke="#9b6bff"
        strokeWidth="1"
        opacity="0.55"
        transform="rotate(42 32 32)"
      />
      <circle cx="32" cy="32" r="8" fill="url(#orbisCoreGlow)" />
      <circle cx="32" cy="32" r="3.2" fill="#ffffff" opacity="0.95" />
      <circle cx="48" cy="24" r="2.1" fill="#3aa9ff" />
      <circle cx="18" cy="40" r="1.8" fill="#d4b26a" />
      <circle cx="42" cy="46" r="1.6" fill="#9b6bff" />
    </svg>
  )
}
