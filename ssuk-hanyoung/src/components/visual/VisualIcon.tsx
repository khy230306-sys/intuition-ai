import { getVisual } from '../../design/visualAssets'

type Props = {
  name: string
  size?: number
  className?: string
  alt?: string
  title?: string
}

/** Registry-backed icon — image WebP or soft SVG illustration (never emoji). */
export function VisualIcon({ name, size = 48, className, alt, title }: Props) {
  const asset = getVisual(name)
  const label = alt ?? asset.label

  if (asset.kind === 'image') {
    return (
      <span className={`visual-icon visual-img${className ? ` ${className}` : ''}`} style={{ width: size, height: size }} title={title || label}>
        <img
          src={asset.src}
          alt={label}
          width={size}
          height={size}
          loading="lazy"
          decoding="async"
          draggable={false}
          onError={(e) => {
            const el = e.currentTarget
            el.style.display = 'none'
            const parent = el.parentElement
            if (parent && !parent.querySelector('.visual-fallback')) {
              const f = document.createElement('span')
              f.className = 'visual-fallback'
              f.style.background = asset.fallbackColor
              f.setAttribute('aria-hidden', 'true')
              parent.appendChild(f)
            }
          }}
        />
      </span>
    )
  }

  return (
    <span
      className={`visual-icon visual-svg svg-${asset.src}${className ? ` ${className}` : ''}`}
      style={{ width: size, height: size, ['--viz' as string]: asset.fallbackColor }}
      role="img"
      aria-label={label}
      title={title || label}
    >
      <SvgShape id={asset.src} color={asset.fallbackColor} />
    </span>
  )
}

function SvgShape({ id, color }: { id: string; color: string }) {
  const c = color
  switch (id) {
    case 'back':
      return (
        <svg viewBox="0 0 48 48" width="100%" height="100%" aria-hidden>
          <circle cx="24" cy="24" r="22" fill="#FFF7CC" stroke="#1a1510" strokeWidth="3" />
          <path d="M28 14 L16 24 L28 34" fill="none" stroke="#1a1510" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    case 'speaker':
      return (
        <svg viewBox="0 0 48 48" width="100%" height="100%" aria-hidden>
          <circle cx="24" cy="24" r="22" fill="#D6E4FF" stroke="#1a1510" strokeWidth="3" />
          <path d="M16 20 h6 l8-6 v20 l-8-6 h-6 z" fill={c} stroke="#1a1510" strokeWidth="2" />
          <path d="M34 18 c3 3 3 9 0 12" fill="none" stroke="#1a1510" strokeWidth="3" strokeLinecap="round" />
        </svg>
      )
    case 'book':
      return (
        <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden>
          <rect x="10" y="12" width="44" height="40" rx="8" fill={c} stroke="#1a1510" strokeWidth="3" />
          <path d="M32 12 v40" stroke="#1a1510" strokeWidth="3" />
          <path d="M18 24 h10 M18 34 h10 M36 24 h10 M36 34 h10" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
        </svg>
      )
    case 'numbers':
      return (
        <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden>
          <circle cx="32" cy="32" r="28" fill={c} stroke="#1a1510" strokeWidth="3" />
          <text x="32" y="40" textAnchor="middle" fontSize="26" fontWeight="800" fill="#1a1510" fontFamily="Nunito, sans-serif">
            123
          </text>
        </svg>
      )
    case 'brain':
      return (
        <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden>
          <ellipse cx="32" cy="34" rx="22" ry="18" fill={c} stroke="#1a1510" strokeWidth="3" />
          <path d="M32 16 v36 M20 28 c6 4 18 4 24 0 M20 40 c6 3 18 3 24 0" fill="none" stroke="#1a1510" strokeWidth="2.5" />
        </svg>
      )
    case 'leaf':
      return (
        <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden>
          <path d="M32 8 C48 14 54 34 32 56 C10 34 16 14 32 8Z" fill={c} stroke="#1a1510" strokeWidth="3" />
          <path d="M32 18 v30" stroke="#1a1510" strokeWidth="3" strokeLinecap="round" />
        </svg>
      )
    case 'palette':
      return (
        <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden>
          <path d="M32 8c14 0 24 10 24 22 0 8-6 14-14 14h-4c-3 0-4 2-4 4 0 4-4 8-10 8C14 56 8 44 8 32 8 18 18 8 32 8z" fill={c} stroke="#1a1510" strokeWidth="3" />
          <circle cx="24" cy="24" r="4" fill="#FF3B30" />
          <circle cx="36" cy="20" r="4" fill="#FFD400" />
          <circle cx="44" cy="30" r="4" fill="#2F6BFF" />
        </svg>
      )
    case 'notes':
      return (
        <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden>
          <circle cx="22" cy="42" r="8" fill={c} stroke="#1a1510" strokeWidth="3" />
          <circle cx="44" cy="36" r="8" fill="#FFD400" stroke="#1a1510" strokeWidth="3" />
          <path d="M30 42 V16 l22-6 v26" fill="none" stroke="#1a1510" strokeWidth="3.5" strokeLinecap="round" />
        </svg>
      )
    case 'heart':
      return (
        <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden>
          <path d="M32 54 C14 40 8 28 14 18 c4-6 12-6 18-1 6-5 14-5 18 1 6 10 0 22-18 36z" fill={c} stroke="#1a1510" strokeWidth="3" />
        </svg>
      )
    case 'compass':
      return (
        <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden>
          <circle cx="32" cy="32" r="26" fill="#FFF7CC" stroke="#1a1510" strokeWidth="3" />
          <path d="M32 12 l6 20 -6 20 -6-20z" fill={c} stroke="#1a1510" strokeWidth="2" />
          <circle cx="32" cy="32" r="4" fill="#1a1510" />
        </svg>
      )
    case 'gift':
      return (
        <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden>
          <rect x="12" y="28" width="40" height="28" rx="6" fill={c} stroke="#1a1510" strokeWidth="3" />
          <rect x="10" y="20" width="44" height="12" rx="4" fill="#FFD400" stroke="#1a1510" strokeWidth="3" />
          <path d="M32 20 v36 M22 20 c0-8 10-8 10 0 M42 20 c0-8-10-8-10 0" fill="none" stroke="#1a1510" strokeWidth="3" />
        </svg>
      )
    case 'sun':
      return (
        <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden>
          <circle cx="32" cy="32" r="14" fill={c} stroke="#1a1510" strokeWidth="3" />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => {
            const r = (a * Math.PI) / 180
            return <line key={a} x1={32 + Math.cos(r) * 20} y1={32 + Math.sin(r) * 20} x2={32 + Math.cos(r) * 28} y2={32 + Math.sin(r) * 28} stroke="#1a1510" strokeWidth="3" strokeLinecap="round" />
          })}
        </svg>
      )
    case 'cloud':
      return (
        <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden>
          <path d="M20 40h28a12 12 0 0 0 0-24 14 14 0 0 0-26-4A10 10 0 0 0 20 40z" fill={c} stroke="#1a1510" strokeWidth="3" />
        </svg>
      )
    case 'tree':
      return (
        <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden>
          <rect x="28" y="40" width="8" height="14" rx="2" fill="#8B5A2B" stroke="#1a1510" strokeWidth="2" />
          <circle cx="32" cy="28" r="16" fill={c} stroke="#1a1510" strokeWidth="3" />
        </svg>
      )
    case 'flower':
      return (
        <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden>
          {[0, 72, 144, 216, 288].map((a) => {
            const r = ((a - 90) * Math.PI) / 180
            return <circle key={a} cx={32 + Math.cos(r) * 12} cy={32 + Math.sin(r) * 12} r="8" fill={c} stroke="#1a1510" strokeWidth="2" />
          })}
          <circle cx="32" cy="32" r="7" fill="#FFD400" stroke="#1a1510" strokeWidth="2" />
        </svg>
      )
    case 'apple':
      return (
        <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden>
          <path d="M32 18c8-10 22-2 22 12 0 16-10 28-22 28S10 46 10 30C10 16 24 8 32 18z" fill={c} stroke="#1a1510" strokeWidth="3" />
          <path d="M32 18c2-8 10-10 14-8" fill="none" stroke="#22C55E" strokeWidth="3" strokeLinecap="round" />
        </svg>
      )
    case 'banana':
      return (
        <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden>
          <path d="M14 20c8 2 28 6 36 28-10 4-28 2-38-8 2-8 2-16 2-20z" fill={c} stroke="#1a1510" strokeWidth="3" />
        </svg>
      )
    case 'dog':
      return (
        <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden>
          <ellipse cx="32" cy="36" rx="18" ry="16" fill={c} stroke="#1a1510" strokeWidth="3" />
          <circle cx="18" cy="22" r="8" fill={c} stroke="#1a1510" strokeWidth="3" />
          <circle cx="46" cy="22" r="8" fill={c} stroke="#1a1510" strokeWidth="3" />
          <circle cx="26" cy="34" r="2.5" fill="#1a1510" />
          <circle cx="38" cy="34" r="2.5" fill="#1a1510" />
          <ellipse cx="32" cy="42" rx="4" ry="3" fill="#1a1510" />
        </svg>
      )
    case 'cat':
      return (
        <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden>
          <ellipse cx="32" cy="36" rx="18" ry="16" fill={c} stroke="#1a1510" strokeWidth="3" />
          <path d="M16 28 L14 12 L26 24 M48 28 L50 12 L38 24" fill={c} stroke="#1a1510" strokeWidth="3" strokeLinejoin="round" />
          <circle cx="26" cy="34" r="2.5" fill="#1a1510" />
          <circle cx="38" cy="34" r="2.5" fill="#1a1510" />
          <path d="M28 42 h8" stroke="#1a1510" strokeWidth="3" strokeLinecap="round" />
        </svg>
      )
    case 'rabbit':
      return (
        <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden>
          <ellipse cx="24" cy="16" rx="6" ry="14" fill={c} stroke="#1a1510" strokeWidth="3" />
          <ellipse cx="40" cy="16" rx="6" ry="14" fill={c} stroke="#1a1510" strokeWidth="3" />
          <circle cx="32" cy="38" r="16" fill={c} stroke="#1a1510" strokeWidth="3" />
          <circle cx="26" cy="36" r="2.5" fill="#1a1510" />
          <circle cx="38" cy="36" r="2.5" fill="#1a1510" />
          <ellipse cx="32" cy="44" rx="3" ry="2" fill="#FF8FAB" />
        </svg>
      )
    case 'face-happy':
      return (
        <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden>
          <circle cx="32" cy="32" r="26" fill={c} stroke="#1a1510" strokeWidth="3" />
          <circle cx="22" cy="28" r="3" fill="#1a1510" />
          <circle cx="42" cy="28" r="3" fill="#1a1510" />
          <path d="M20 38c4 8 20 8 24 0" fill="none" stroke="#1a1510" strokeWidth="3" strokeLinecap="round" />
        </svg>
      )
    case 'face-sad':
      return (
        <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden>
          <circle cx="32" cy="32" r="26" fill={c} stroke="#1a1510" strokeWidth="3" />
          <circle cx="22" cy="28" r="3" fill="#1a1510" />
          <circle cx="42" cy="28" r="3" fill="#1a1510" />
          <path d="M20 44c4-8 20-8 24 0" fill="none" stroke="#1a1510" strokeWidth="3" strokeLinecap="round" />
        </svg>
      )
    case 'face-angry':
      return (
        <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden>
          <circle cx="32" cy="32" r="26" fill={c} stroke="#1a1510" strokeWidth="3" />
          <path d="M16 22 l10 4 M48 22 l-10 4" stroke="#1a1510" strokeWidth="3" strokeLinecap="round" />
          <circle cx="22" cy="30" r="3" fill="#1a1510" />
          <circle cx="42" cy="30" r="3" fill="#1a1510" />
          <path d="M22 44c4-6 16-6 20 0" fill="none" stroke="#1a1510" strokeWidth="3" strokeLinecap="round" />
        </svg>
      )
    case 'face-surprised':
      return (
        <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden>
          <circle cx="32" cy="32" r="26" fill={c} stroke="#1a1510" strokeWidth="3" />
          <circle cx="22" cy="26" r="4" fill="#1a1510" />
          <circle cx="42" cy="26" r="4" fill="#1a1510" />
          <circle cx="32" cy="42" r="6" fill="#1a1510" />
        </svg>
      )
    default:
      return (
        <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden>
          <rect x="8" y="8" width="48" height="48" rx="14" fill={c} stroke="#1a1510" strokeWidth="3" />
        </svg>
      )
  }
}
