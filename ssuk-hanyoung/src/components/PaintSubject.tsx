/** Recolorable toddler vehicles — body fill follows the chosen paint color */

type Props = {
  kind: string
  color: string
  size?: number
  className?: string
}

function Face({ cx = 48, cy = 40 }: { cx?: number; cy?: number }) {
  return (
    <g>
      <circle cx={cx - 7} cy={cy} r="3.2" fill="#1a1510" />
      <circle cx={cx + 7} cy={cy} r="3.2" fill="#1a1510" />
      <circle cx={cx - 6.2} cy={cy - 0.8} r="1" fill="#fff" />
      <circle cx={cx + 7.8} cy={cy - 0.8} r="1" fill="#fff" />
      <path d={`M${cx - 8} ${cy + 10}c4 5 12 5 16 0`} stroke="#1a1510" strokeWidth="2.6" fill="none" strokeLinecap="round" />
      <circle cx={cx - 11} cy={cy + 6} r="2.2" fill="#FF8FB8" opacity="0.85" />
      <circle cx={cx + 11} cy={cy + 6} r="2.2" fill="#FF8FB8" opacity="0.85" />
    </g>
  )
}

function Wheel({ cx, cy = 78 }: { cx: number; cy?: number }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r="10" fill="#1a1510" />
      <circle cx={cx} cy={cy} r="5.5" fill="#FFD60A" stroke="#1a1510" strokeWidth="2" />
      <circle cx={cx} cy={cy} r="2" fill="#1a1510" />
    </g>
  )
}

export function PaintSubject({ kind, color, size = 220, className }: Props) {
  const stroke = '#1a1510'
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 96 96',
    className: className ? `paint-subject ${className}` : 'paint-subject',
    'aria-hidden': true as const,
  }

  switch (kind) {
    case 'bus':
      return (
        <svg {...common}>
          <ellipse cx="48" cy="86" rx="30" ry="4" fill="#000" opacity="0.12" />
          <rect x="12" y="24" width="72" height="44" rx="12" fill={color} stroke={stroke} strokeWidth="3.5" />
          <rect x="18" y="30" width="14" height="14" rx="3" fill="#8FD3FF" stroke={stroke} strokeWidth="2.5" />
          <rect x="36" y="30" width="14" height="14" rx="3" fill="#8FD3FF" stroke={stroke} strokeWidth="2.5" />
          <rect x="54" y="30" width="14" height="14" rx="3" fill="#8FD3FF" stroke={stroke} strokeWidth="2.5" />
          <rect x="16" y="50" width="64" height="8" rx="3" fill="#FFD60A" stroke={stroke} strokeWidth="2" />
          <Face cx={48} cy={52} />
          <Wheel cx={30} />
          <Wheel cx={66} />
        </svg>
      )
    case 'fire':
      return (
        <svg {...common}>
          <ellipse cx="48" cy="86" rx="30" ry="4" fill="#000" opacity="0.12" />
          <rect x="10" y="38" width="76" height="30" rx="10" fill={color} stroke={stroke} strokeWidth="3.5" />
          <rect x="46" y="18" width="32" height="26" rx="8" fill={color} stroke={stroke} strokeWidth="3.5" />
          <rect x="52" y="24" width="18" height="12" rx="3" fill="#8FD3FF" stroke={stroke} strokeWidth="2.5" />
          <rect x="16" y="22" width="12" height="22" rx="4" fill="#FFD60A" stroke={stroke} strokeWidth="2.5" />
          <circle cx="22" cy="18" r="7" fill="#FF8A3D" stroke={stroke} strokeWidth="2.5" />
          <Face cx={36} cy={48} />
          <Wheel cx={28} />
          <Wheel cx={68} />
        </svg>
      )
    case 'police':
      return (
        <svg {...common}>
          <ellipse cx="48" cy="86" rx="30" ry="4" fill="#000" opacity="0.12" />
          <rect x="12" y="36" width="72" height="32" rx="12" fill={color} stroke={stroke} strokeWidth="3.5" />
          <path d="M26 36h44l-6-16H32z" fill={color} stroke={stroke} strokeWidth="3.5" strokeLinejoin="round" />
          <rect x="34" y="24" width="28" height="12" rx="3" fill="#8FD3FF" stroke={stroke} strokeWidth="2.5" />
          <rect x="36" y="14" width="24" height="10" rx="4" fill="#fff" stroke={stroke} strokeWidth="2.5" />
          <rect x="38" y="16" width="9" height="6" rx="2" fill="#FF2D55" />
          <rect x="49" y="16" width="9" height="6" rx="2" fill="#2F6BFF" />
          <Face cx={48} cy={46} />
          <Wheel cx={30} />
          <Wheel cx={66} />
        </svg>
      )
    case 'ambulance':
      return (
        <svg {...common}>
          <ellipse cx="48" cy="86" rx="30" ry="4" fill="#000" opacity="0.12" />
          <rect x="10" y="30" width="76" height="38" rx="12" fill={color} stroke={stroke} strokeWidth="3.5" />
          <rect x="18" y="38" width="28" height="18" rx="4" fill="#8FD3FF" stroke={stroke} strokeWidth="2.5" />
          <rect x="54" y="40" width="22" height="22" rx="4" fill="#fff" stroke={stroke} strokeWidth="2.5" />
          <rect x="62" y="44" width="6" height="14" rx="1.5" fill="#FF2D55" />
          <rect x="58" y="48" width="14" height="6" rx="1.5" fill="#FF2D55" />
          <rect x="40" y="20" width="16" height="10" rx="3" fill="#FF2D55" stroke={stroke} strokeWidth="2" />
          <Face cx={32} cy={46} />
          <Wheel cx={28} />
          <Wheel cx={68} />
        </svg>
      )
    case 'truck':
      return (
        <svg {...common}>
          <ellipse cx="48" cy="86" rx="30" ry="4" fill="#000" opacity="0.12" />
          <rect x="8" y="34" width="46" height="34" rx="8" fill={color} stroke={stroke} strokeWidth="3.5" />
          <path d="M54 48h26l4 20H54z" fill={color} stroke={stroke} strokeWidth="3.5" strokeLinejoin="round" />
          <rect x="62" y="52" width="14" height="12" rx="3" fill="#8FD3FF" stroke={stroke} strokeWidth="2.5" />
          <Face cx={30} cy={48} />
          <Wheel cx={24} />
          <Wheel cx={68} />
        </svg>
      )
    case 'tractor':
      return (
        <svg {...common}>
          <ellipse cx="48" cy="86" rx="30" ry="4" fill="#000" opacity="0.12" />
          <rect x="28" y="28" width="40" height="36" rx="10" fill={color} stroke={stroke} strokeWidth="3.5" />
          <rect x="36" y="18" width="24" height="16" rx="6" fill={color} stroke={stroke} strokeWidth="3.5" />
          <rect x="40" y="22" width="16" height="10" rx="3" fill="#8FD3FF" stroke={stroke} strokeWidth="2.5" />
          <circle cx="26" cy="72" r="14" fill="#1a1510" stroke={stroke} strokeWidth="3" />
          <circle cx="26" cy="72" r="7" fill="#FFD60A" />
          <circle cx="70" cy="74" r="10" fill="#1a1510" stroke={stroke} strokeWidth="3" />
          <circle cx="70" cy="74" r="5" fill="#FFD60A" />
          <Face cx={48} cy={42} />
        </svg>
      )
    case 'star':
      return (
        <svg {...common}>
          <ellipse cx="48" cy="86" rx="22" ry="4" fill="#000" opacity="0.12" />
          <path
            d="M48 12l9 20 22 2-17 14 5 22-19-12-19 12 5-22-17-14 22-2z"
            fill={color}
            stroke={stroke}
            strokeWidth="3.5"
            strokeLinejoin="round"
          />
          <Face cx={48} cy={46} />
        </svg>
      )
    case 'paint':
      return (
        <svg {...common}>
          <ellipse cx="48" cy="86" rx="26" ry="4" fill="#000" opacity="0.12" />
          <ellipse cx="48" cy="50" rx="34" ry="28" fill={color} stroke={stroke} strokeWidth="3.5" />
          <circle cx="30" cy="40" r="7" fill="#FF2D55" stroke={stroke} strokeWidth="2" />
          <circle cx="48" cy="32" r="7" fill="#FFD400" stroke={stroke} strokeWidth="2" />
          <circle cx="66" cy="40" r="7" fill="#2F6BFF" stroke={stroke} strokeWidth="2" />
          <circle cx="58" cy="58" r="7" fill="#22C55E" stroke={stroke} strokeWidth="2" />
          <Face cx={42} cy={52} />
        </svg>
      )
    case 'sand':
      return (
        <svg {...common}>
          <ellipse cx="48" cy="86" rx="30" ry="4" fill="#000" opacity="0.12" />
          <path d="M16 72h64L68 40H28z" fill={color} stroke={stroke} strokeWidth="3.5" strokeLinejoin="round" />
          <rect x="36" y="24" width="24" height="18" rx="4" fill={color} stroke={stroke} strokeWidth="3.5" />
          <rect x="42" y="30" width="6" height="8" rx="1.5" fill="#8FD3FF" stroke={stroke} strokeWidth="2" />
          <rect x="52" y="30" width="6" height="8" rx="1.5" fill="#8FD3FF" stroke={stroke} strokeWidth="2" />
          <Face cx={48} cy={52} />
        </svg>
      )
    case 'drum':
      return (
        <svg {...common}>
          <ellipse cx="48" cy="86" rx="24" ry="4" fill="#000" opacity="0.12" />
          <ellipse cx="48" cy="34" rx="28" ry="12" fill="#FFE08A" stroke={stroke} strokeWidth="3.5" />
          <path d="M20 34v28c0 8 12.5 14 28 14s28-6 28-14V34" fill={color} stroke={stroke} strokeWidth="3.5" />
          <ellipse cx="48" cy="34" rx="28" ry="12" fill="#FFF3C4" stroke={stroke} strokeWidth="3.5" />
          <line x1="20" y1="48" x2="76" y2="48" stroke={stroke} strokeWidth="2.5" />
          <Face cx={48} cy={56} />
        </svg>
      )
    case 'car':
    default:
      return (
        <svg {...common}>
          <ellipse cx="48" cy="86" rx="30" ry="4" fill="#000" opacity="0.12" />
          <path
            d="M14 56c0-8 6-14 14-16l8-14c3-5 8-8 14-8h6c6 0 11 3 14 8l8 14c8 2 14 8 14 16v8c0 4-3 8-8 8H22c-5 0-8-4-8-8z"
            fill={color}
            stroke={stroke}
            strokeWidth="3.5"
            strokeLinejoin="round"
          />
          <path d="M34 28h24c3 0 6 2 7 5l4 9H27l4-9c1-3 4-5 7-5z" fill="#8FD3FF" stroke={stroke} strokeWidth="2.5" />
          <rect x="18" y="54" width="10" height="6" rx="2" fill="#FFD60A" stroke={stroke} strokeWidth="2" />
          <rect x="68" y="54" width="10" height="6" rx="2" fill="#FFD60A" stroke={stroke} strokeWidth="2" />
          <Face cx={48} cy={42} />
          <Wheel cx={30} />
          <Wheel cx={66} />
        </svg>
      )
  }
}
