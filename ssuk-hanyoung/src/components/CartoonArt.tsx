type ArtKind =
  | 'car'
  | 'bus'
  | 'fire'
  | 'police'
  | 'ambulance'
  | 'truck'
  | 'train'
  | 'plane'
  | 'house'
  | 'cat'
  | 'dog'
  | 'flower'
  | 'star'
  | 'rocket'
  | 'fish'
  | 'dinosaur'

const FACE = (
  <>
    <circle cx="38" cy="36" r="3.2" fill="#1a1510" />
    <circle cx="52" cy="36" r="3.2" fill="#1a1510" />
    <path d="M40 44c3 3 7 3 10 0" stroke="#1a1510" strokeWidth="2.5" fill="none" strokeLinecap="round" />
  </>
)

function Wheel({ cx, cy }: { cx: number; cy: number }) {
  return (
    <>
      <circle cx={cx} cy={cy} r="9" fill="#1a1510" stroke="#1a1510" strokeWidth="2" />
      <circle cx={cx} cy={cy} r="4" fill="#FFD60A" />
    </>
  )
}

export function CartoonArt({
  kind,
  color = '#FF4D6D',
  size = 120,
  className,
}: {
  kind: ArtKind | string
  color?: string
  size?: number
  className?: string
}) {
  const stroke = '#1a1510'
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 96 96',
    className,
    'aria-hidden': true as const,
  }

  switch (kind) {
    case 'bus':
      return (
        <svg {...common}>
          <rect x="14" y="22" width="68" height="42" rx="10" fill={color} stroke={stroke} strokeWidth="4" />
          <rect x="20" y="28" width="14" height="14" rx="3" fill="#7DD3FC" stroke={stroke} strokeWidth="3" />
          <rect x="38" y="28" width="14" height="14" rx="3" fill="#7DD3FC" stroke={stroke} strokeWidth="3" />
          <rect x="56" y="28" width="14" height="14" rx="3" fill="#7DD3FC" stroke={stroke} strokeWidth="3" />
          <rect x="18" y="48" width="60" height="8" fill="#FFD60A" stroke={stroke} strokeWidth="2" />
          {FACE}
          <Wheel cx={30} cy={70} />
          <Wheel cx={66} cy={70} />
        </svg>
      )
    case 'fire':
      return (
        <svg {...common}>
          <rect x="12" y="34" width="72" height="28" rx="8" fill={color} stroke={stroke} strokeWidth="4" />
          <rect x="48" y="18" width="28" height="22" rx="6" fill={color} stroke={stroke} strokeWidth="4" />
          <rect x="54" y="24" width="16" height="12" rx="3" fill="#7DD3FC" stroke={stroke} strokeWidth="3" />
          <rect x="18" y="24" width="10" height="18" rx="3" fill="#FFD60A" stroke={stroke} strokeWidth="3" />
          <circle cx="23" cy="20" r="6" fill="#FF8A3D" stroke={stroke} strokeWidth="3" />
          {FACE}
          <Wheel cx={28} cy={70} />
          <Wheel cx={68} cy={70} />
        </svg>
      )
    case 'police':
      return (
        <svg {...common}>
          <rect x="12" y="36" width="72" height="26" rx="8" fill={color} stroke={stroke} strokeWidth="4" />
          <rect x="28" y="22" width="40" height="18" rx="6" fill={color} stroke={stroke} strokeWidth="4" />
          <rect x="34" y="26" width="28" height="10" rx="3" fill="#7DD3FC" stroke={stroke} strokeWidth="3" />
          <rect x="40" y="14" width="16" height="10" rx="3" fill="#FF4D6D" stroke={stroke} strokeWidth="3" />
          <rect x="18" y="48" width="60" height="7" fill="#fff" stroke={stroke} strokeWidth="2" />
          {FACE}
          <Wheel cx={28} cy={70} />
          <Wheel cx={68} cy={70} />
        </svg>
      )
    case 'ambulance':
      return (
        <svg {...common}>
          <rect x="12" y="30" width="72" height="32" rx="8" fill={color} stroke={stroke} strokeWidth="4" />
          <rect x="52" y="20" width="26" height="18" rx="5" fill={color} stroke={stroke} strokeWidth="4" />
          <rect x="58" y="24" width="14" height="10" rx="2" fill="#7DD3FC" stroke={stroke} strokeWidth="3" />
          <rect x="28" y="38" width="22" height="8" fill="#FF4D6D" stroke={stroke} strokeWidth="2" />
          <rect x="35" y="31" width="8" height="22" fill="#FF4D6D" stroke={stroke} strokeWidth="2" />
          {FACE}
          <Wheel cx={28} cy={70} />
          <Wheel cx={68} cy={70} />
        </svg>
      )
    case 'truck':
      return (
        <svg {...common}>
          <rect x="10" y="30" width="42" height="30" rx="6" fill={color} stroke={stroke} strokeWidth="4" />
          <rect x="52" y="38" width="30" height="22" rx="6" fill="#5B8CFF" stroke={stroke} strokeWidth="4" />
          <rect x="58" y="44" width="14" height="10" rx="2" fill="#7DD3FC" stroke={stroke} strokeWidth="3" />
          {FACE}
          <Wheel cx={26} cy={70} />
          <Wheel cx={66} cy={70} />
        </svg>
      )
    case 'train':
      return (
        <svg {...common}>
          <rect x="18" y="24" width="44" height="40" rx="8" fill={color} stroke={stroke} strokeWidth="4" />
          <rect x="26" y="32" width="28" height="14" rx="3" fill="#7DD3FC" stroke={stroke} strokeWidth="3" />
          <rect x="62" y="34" width="16" height="30" rx="4" fill="#FFD60A" stroke={stroke} strokeWidth="3" />
          <circle cx="40" cy="18" r="6" fill="#FF4D6D" stroke={stroke} strokeWidth="3" />
          {FACE}
          <Wheel cx={30} cy={72} />
          <Wheel cx={52} cy={72} />
        </svg>
      )
    case 'plane':
      return (
        <svg {...common}>
          <ellipse cx="48" cy="48" rx="34" ry="12" fill={color} stroke={stroke} strokeWidth="4" />
          <path d="M48 20v28" stroke={stroke} strokeWidth="4" />
          <path d="M20 48h56" stroke={stroke} strokeWidth="4" />
          <path d="M18 40l30 8 30-8" fill="#5B8CFF" stroke={stroke} strokeWidth="3" />
          <circle cx="70" cy="48" r="5" fill="#7DD3FC" stroke={stroke} strokeWidth="3" />
          <circle cx="40" cy="44" r="3" fill="#1a1510" />
          <circle cx="50" cy="44" r="3" fill="#1a1510" />
        </svg>
      )
    case 'house':
      return (
        <svg {...common}>
          <path d="M12 44L48 16l36 28" fill="#FF4D6D" stroke={stroke} strokeWidth="4" strokeLinejoin="round" />
          <rect x="22" y="44" width="52" height="34" fill={color} stroke={stroke} strokeWidth="4" />
          <rect x="40" y="54" width="16" height="24" fill="#5B8CFF" stroke={stroke} strokeWidth="3" />
          <rect x="28" y="52" width="10" height="10" fill="#7DD3FC" stroke={stroke} strokeWidth="3" />
          <rect x="58" y="52" width="10" height="10" fill="#7DD3FC" stroke={stroke} strokeWidth="3" />
        </svg>
      )
    case 'cat':
      return (
        <svg {...common}>
          <circle cx="48" cy="50" r="26" fill={color} stroke={stroke} strokeWidth="4" />
          <path d="M24 34l10 14M72 34L62 48" stroke={stroke} strokeWidth="4" fill="none" />
          <path d="M24 34l12-16 8 18M72 34L60 18 52 36" fill={color} stroke={stroke} strokeWidth="3" />
          <circle cx="38" cy="48" r="3.5" fill="#1a1510" />
          <circle cx="58" cy="48" r="3.5" fill="#1a1510" />
          <ellipse cx="48" cy="58" rx="4" ry="3" fill="#FF8FAB" stroke={stroke} strokeWidth="2" />
        </svg>
      )
    case 'dog':
      return (
        <svg {...common}>
          <circle cx="48" cy="50" r="26" fill={color} stroke={stroke} strokeWidth="4" />
          <ellipse cx="22" cy="42" rx="10" ry="14" fill="#C48A5A" stroke={stroke} strokeWidth="3" />
          <ellipse cx="74" cy="42" rx="10" ry="14" fill="#C48A5A" stroke={stroke} strokeWidth="3" />
          <circle cx="38" cy="48" r="3.5" fill="#1a1510" />
          <circle cx="58" cy="48" r="3.5" fill="#1a1510" />
          <ellipse cx="48" cy="58" rx="7" ry="5" fill="#FFF8E7" stroke={stroke} strokeWidth="3" />
          <circle cx="48" cy="56" r="2.5" fill="#1a1510" />
        </svg>
      )
    case 'flower':
      return (
        <svg {...common}>
          {[0, 60, 120, 180, 240, 300].map((a) => {
            const rad = (a * Math.PI) / 180
            const cx = 48 + Math.cos(rad) * 18
            const cy = 42 + Math.sin(rad) * 18
            return <circle key={a} cx={cx} cy={cy} r="12" fill={color} stroke={stroke} strokeWidth="3" />
          })}
          <circle cx="48" cy="42" r="11" fill="#FFD60A" stroke={stroke} strokeWidth="3" />
          <path d="M48 54v28" stroke="#3DDC84" strokeWidth="5" strokeLinecap="round" />
        </svg>
      )
    case 'star':
      return (
        <svg {...common}>
          <path
            d="M48 12l10 22 24 2-18 16 6 24-22-14-22 14 6-24-18-16 24-2z"
            fill={color}
            stroke={stroke}
            strokeWidth="4"
            strokeLinejoin="round"
          />
        </svg>
      )
    case 'rocket':
      return (
        <svg {...common}>
          <path d="M48 10c14 18 16 40 16 52H32c0-12 2-34 16-52z" fill={color} stroke={stroke} strokeWidth="4" />
          <circle cx="48" cy="40" r="8" fill="#7DD3FC" stroke={stroke} strokeWidth="3" />
          <path d="M32 54l-10 16h16zM64 54l10 16H58z" fill="#5B8CFF" stroke={stroke} strokeWidth="3" />
          <path d="M40 72h16l-4 14h-8z" fill="#FF8A3D" stroke={stroke} strokeWidth="3" />
        </svg>
      )
    case 'fish':
      return (
        <svg {...common}>
          <ellipse cx="44" cy="48" rx="28" ry="18" fill={color} stroke={stroke} strokeWidth="4" />
          <path d="M70 48l18-14v28z" fill="#5B8CFF" stroke={stroke} strokeWidth="3" />
          <circle cx="32" cy="44" r="4" fill="#1a1510" />
          <path d="M20 48h10" stroke="#1a1510" strokeWidth="3" strokeLinecap="round" />
        </svg>
      )
    case 'dinosaur':
      return (
        <svg {...common}>
          <ellipse cx="48" cy="56" rx="30" ry="18" fill={color} stroke={stroke} strokeWidth="4" />
          <circle cx="70" cy="36" r="14" fill={color} stroke={stroke} strokeWidth="4" />
          <circle cx="74" cy="34" r="3" fill="#1a1510" />
          <path d="M30 40l6-14 8 10 8-12 8 12" fill="none" stroke="#3DDC84" strokeWidth="4" strokeLinecap="round" />
          <path d="M20 62c-8 2-12 10-8 14" stroke={stroke} strokeWidth="4" fill="none" />
        </svg>
      )
    case 'car':
    default:
      return (
        <svg {...common}>
          <rect x="10" y="40" width="76" height="24" rx="10" fill={color} stroke={stroke} strokeWidth="4" />
          <path d="M26 40c4-14 40-14 44 0" fill={color} stroke={stroke} strokeWidth="4" />
          <rect x="34" y="28" width="28" height="12" rx="3" fill="#7DD3FC" stroke={stroke} strokeWidth="3" />
          <rect x="16" y="48" width="64" height="6" fill="#FFD60A" stroke={stroke} strokeWidth="2" />
          {FACE}
          <Wheel cx={28} cy={70} />
          <Wheel cx={68} cy={70} />
        </svg>
      )
  }
}

export type { ArtKind }
