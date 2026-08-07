/** Distinct puzzle piece art — each part looks different (not a full car copy) */

export type PartKind = 'front' | 'body' | 'wheel' | 'window' | 'siren' | 'bed' | 'cabin'

type Props = {
  part: PartKind
  color: string
  size?: number
  className?: string
}

const STROKE = '#1a1510'

export function PuzzlePart({ part, color, size = 88, className }: Props) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 96 96',
    className: className ? `puzzle-part ${className}` : 'puzzle-part',
    'aria-hidden': true as const,
  }

  switch (part) {
    case 'front':
      return (
        <svg {...common}>
          <ellipse cx="48" cy="84" rx="22" ry="4" fill="#000" opacity="0.1" />
          <path
            d="M18 62c0-10 8-18 18-20l6-14c2-4 6-6 10-6h2c4 0 8 2 10 6l6 14c10 2 18 10 18 20v8H18z"
            fill={color}
            stroke={STROKE}
            strokeWidth="3.5"
            strokeLinejoin="round"
          />
          <rect x="34" y="34" width="28" height="16" rx="4" fill="#8FD3FF" stroke={STROKE} strokeWidth="2.5" />
          <circle cx="36" cy="48" r="3" fill="#1a1510" />
          <circle cx="60" cy="48" r="3" fill="#1a1510" />
          <path d="M38 56c3 3 9 3 12 0" stroke={STROKE} strokeWidth="2.4" fill="none" strokeLinecap="round" />
          <rect x="22" y="58" width="10" height="6" rx="2" fill="#FFD60A" stroke={STROKE} strokeWidth="2" />
          <rect x="64" y="58" width="10" height="6" rx="2" fill="#FFD60A" stroke={STROKE} strokeWidth="2" />
        </svg>
      )
    case 'cabin':
      return (
        <svg {...common}>
          <ellipse cx="48" cy="84" rx="18" ry="4" fill="#000" opacity="0.1" />
          <path d="M28 70h40V42c0-8-6-14-14-14H42c-8 0-14 6-14 14z" fill={color} stroke={STROKE} strokeWidth="3.5" />
          <rect x="36" y="36" width="24" height="18" rx="4" fill="#8FD3FF" stroke={STROKE} strokeWidth="2.5" />
          <circle cx="42" cy="44" r="2.5" fill="#1a1510" />
          <circle cx="54" cy="44" r="2.5" fill="#1a1510" />
        </svg>
      )
    case 'body':
      return (
        <svg {...common}>
          <ellipse cx="48" cy="84" rx="28" ry="4" fill="#000" opacity="0.1" />
          <rect x="10" y="34" width="76" height="36" rx="12" fill={color} stroke={STROKE} strokeWidth="3.5" />
          <rect x="18" y="42" width="16" height="12" rx="3" fill="#FFD60A" stroke={STROKE} strokeWidth="2" />
          <rect x="40" y="42" width="16" height="12" rx="3" fill="#FFD60A" stroke={STROKE} strokeWidth="2" />
          <rect x="62" y="42" width="16" height="12" rx="3" fill="#FFD60A" stroke={STROKE} strokeWidth="2" />
          <circle cx="40" cy="50" r="2.8" fill="#1a1510" />
          <circle cx="56" cy="50" r="2.8" fill="#1a1510" />
          <path d="M42 58c3 3 9 3 12 0" stroke={STROKE} strokeWidth="2.4" fill="none" strokeLinecap="round" />
        </svg>
      )
    case 'wheel':
      return (
        <svg {...common}>
          <ellipse cx="48" cy="84" rx="16" ry="4" fill="#000" opacity="0.1" />
          <circle cx="48" cy="48" r="28" fill="#1a1510" stroke={STROKE} strokeWidth="3" />
          <circle cx="48" cy="48" r="16" fill={color} stroke={STROKE} strokeWidth="3" />
          <circle cx="48" cy="48" r="7" fill="#FFD60A" stroke={STROKE} strokeWidth="2.5" />
          <circle cx="48" cy="48" r="3" fill="#1a1510" />
          {[0, 60, 120, 180, 240, 300].map((deg) => {
            const r = ((deg - 90) * Math.PI) / 180
            const x2 = 48 + Math.cos(r) * 14
            const y2 = 48 + Math.sin(r) * 14
            return <line key={deg} x1="48" y1="48" x2={x2} y2={y2} stroke={STROKE} strokeWidth="2.2" />
          })}
        </svg>
      )
    case 'window':
      return (
        <svg {...common}>
          <ellipse cx="48" cy="84" rx="22" ry="4" fill="#000" opacity="0.1" />
          <rect x="14" y="28" width="68" height="44" rx="10" fill={color} stroke={STROKE} strokeWidth="3.5" />
          <rect x="22" y="36" width="22" height="28" rx="4" fill="#8FD3FF" stroke={STROKE} strokeWidth="2.5" />
          <rect x="52" y="36" width="22" height="28" rx="4" fill="#8FD3FF" stroke={STROKE} strokeWidth="2.5" />
          <line x1="48" y1="30" x2="48" y2="70" stroke={STROKE} strokeWidth="3" />
        </svg>
      )
    case 'siren':
      return (
        <svg {...common}>
          <ellipse cx="48" cy="84" rx="18" ry="4" fill="#000" opacity="0.1" />
          <rect x="22" y="48" width="52" height="22" rx="8" fill={color} stroke={STROKE} strokeWidth="3.5" />
          <rect x="28" y="28" width="40" height="24" rx="8" fill="#fff" stroke={STROKE} strokeWidth="3.5" />
          <rect x="32" y="32" width="14" height="16" rx="4" fill="#FF2D55" stroke={STROKE} strokeWidth="2" />
          <rect x="50" y="32" width="14" height="16" rx="4" fill="#2F6BFF" stroke={STROKE} strokeWidth="2" />
          <circle cx="39" cy="58" r="2.5" fill="#1a1510" />
          <circle cx="57" cy="58" r="2.5" fill="#1a1510" />
        </svg>
      )
    case 'bed':
      return (
        <svg {...common}>
          <ellipse cx="48" cy="84" rx="26" ry="4" fill="#000" opacity="0.1" />
          <rect x="12" y="30" width="72" height="40" rx="8" fill={color} stroke={STROKE} strokeWidth="3.5" />
          <path d="M20 30h56l-6 18H26z" fill="#FFD60A" stroke={STROKE} strokeWidth="2.5" strokeLinejoin="round" />
          <circle cx="30" cy="58" r="3" fill="#1a1510" />
          <circle cx="66" cy="58" r="3" fill="#1a1510" />
          <path d="M36 64h24" stroke={STROKE} strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      )
    default:
      return (
        <svg {...common}>
          <rect x="20" y="20" width="56" height="56" rx="12" fill={color} stroke={STROKE} strokeWidth="3.5" />
        </svg>
      )
  }
}
