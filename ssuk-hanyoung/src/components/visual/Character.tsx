type CharName = 'hani' | 'youngi' | 'yeongi'
type CharState = 'idle' | 'happy' | 'celebrate' | 'thinking' | 'encourage' | 'sad' | 'surprised'
type CharSize = 'sm' | 'md' | 'large'

type Props = {
  name?: CharName
  state?: CharState
  size?: CharSize | number
  className?: string
  label?: string
  animate?: boolean
}

const SIZE_MAP = { sm: 72, md: 120, large: 168 }

const STATE_LABEL: Record<CharState, string> = {
  idle: '평온',
  happy: '기쁨',
  celebrate: '축하',
  thinking: '생각',
  encourage: '응원',
  sad: '아쉬움',
  surprised: '놀람',
}

/**
 * Hani / Youngi character — state-based SVG (swappable to image assets later).
 * Never uses emoji.
 */
export function Character({ name = 'hani', state = 'idle', size = 'md', className, label, animate = true }: Props) {
  const who = name === 'yeongi' ? 'youngi' : name
  const px = typeof size === 'number' ? size : SIZE_MAP[size]
  const skin = who === 'hani' ? '#FFE0B2' : '#FFD6E8'
  const hair = who === 'hani' ? '#5B3A29' : '#3D2B1F'
  const shirt = who === 'hani' ? '#5B8CFF' : '#FF8FAB'
  const aria = label || `${who === 'hani' ? '한이' : '영이'} ${STATE_LABEL[state]}`
  const motion = animate ? ` state-${state}` : ''

  return (
    <span
      className={`ssuk-character${motion}${className ? ` ${className}` : ''}`}
      style={{ width: px, height: px }}
      role="img"
      aria-label={aria}
    >
      <svg viewBox="0 0 120 120" width="100%" height="100%" aria-hidden>
        <ellipse cx="60" cy="96" rx="28" ry="12" fill="rgba(26,21,16,0.12)" />
        {/* pose offset via group */}
        <g className={`char-pose pose-${state}`}>
          <path d="M38 70 Q60 58 82 70 L88 100 Q60 110 32 100Z" fill={shirt} stroke="#1a1510" strokeWidth="3" />
          {state === 'celebrate' && (
            <g stroke="#FFD400" strokeWidth="3" strokeLinecap="round">
              <path d="M18 58 l-8-10" />
              <path d="M102 58 l8-10" />
            </g>
          )}
          <circle cx="60" cy="46" r="30" fill={skin} stroke="#1a1510" strokeWidth="3" />
          <path d="M32 42 Q36 18 60 16 Q84 18 88 42 Q76 28 60 28 Q44 28 32 42Z" fill={hair} stroke="#1a1510" strokeWidth="2.5" />
          {face(state)}
          <circle cx="42" cy="52" r="4" fill="#FF8A80" opacity="0.55" />
          <circle cx="78" cy="52" r="4" fill="#FF8A80" opacity="0.55" />
        </g>
      </svg>
    </span>
  )
}

function face(state: CharState) {
  switch (state) {
    case 'happy':
    case 'celebrate':
      return (
        <g>
          <path d="M48 44 q4 5 8 0" fill="none" stroke="#1a1510" strokeWidth="3" strokeLinecap="round" />
          <path d="M64 44 q4 5 8 0" fill="none" stroke="#1a1510" strokeWidth="3" strokeLinecap="round" />
          <path d="M48 58 c4 8 20 8 24 0" fill="none" stroke="#1a1510" strokeWidth="3" strokeLinecap="round" />
        </g>
      )
    case 'thinking':
      return (
        <g>
          <circle cx="50" cy="46" r="3" fill="#1a1510" />
          <circle cx="70" cy="46" r="3" fill="#1a1510" />
          <path d="M52 60 h16" stroke="#1a1510" strokeWidth="3" strokeLinecap="round" />
          <circle cx="92" cy="28" r="4" fill="#FFF" stroke="#1a1510" strokeWidth="2" />
          <circle cx="100" cy="18" r="2.5" fill="#FFF" stroke="#1a1510" strokeWidth="2" />
        </g>
      )
    case 'encourage':
      return (
        <g>
          <circle cx="50" cy="46" r="3" fill="#1a1510" />
          <circle cx="70" cy="46" r="3" fill="#1a1510" />
          <path d="M48 56 c5 10 19 10 24 0" fill="none" stroke="#1a1510" strokeWidth="3" strokeLinecap="round" />
          <path d="M86 40 l8-2" stroke="#FF4D6D" strokeWidth="3" strokeLinecap="round" />
        </g>
      )
    case 'sad':
      return (
        <g>
          <circle cx="50" cy="48" r="3" fill="#1a1510" />
          <circle cx="70" cy="48" r="3" fill="#1a1510" />
          <path d="M48 64 c5-8 19-8 24 0" fill="none" stroke="#1a1510" strokeWidth="3" strokeLinecap="round" />
        </g>
      )
    case 'surprised':
      return (
        <g>
          <circle cx="50" cy="44" r="4" fill="#1a1510" />
          <circle cx="70" cy="44" r="4" fill="#1a1510" />
          <ellipse cx="60" cy="60" rx="6" ry="7" fill="#1a1510" />
        </g>
      )
    default:
      return (
        <g>
          <circle cx="50" cy="46" r="3" fill="#1a1510" />
          <circle cx="70" cy="46" r="3" fill="#1a1510" />
          <path d="M50 58 c3 6 17 6 20 0" fill="none" stroke="#1a1510" strokeWidth="3" strokeLinecap="round" />
        </g>
      )
  }
}
