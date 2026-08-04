import { CartoonArt, type ArtKind } from './CartoonArt'

/** Bright color chips used across toddler UI */
export const BOLD_COLORS = [
  { id: 'red', ko: '빨강', hex: '#FF2D55' },
  { id: 'orange', ko: '주황', hex: '#FF7A00' },
  { id: 'yellow', ko: '노랑', hex: '#FFD400' },
  { id: 'green', ko: '초록', hex: '#22C55E' },
  { id: 'blue', ko: '파랑', hex: '#2F6BFF' },
  { id: 'purple', ko: '보라', hex: '#8B5CF6' },
  { id: 'pink', ko: '분홍', hex: '#FF5DA2' },
]

export function BigCarButton({
  kind,
  color,
  label,
  selected,
  onClick,
  size = 88,
}: {
  kind: ArtKind | string
  color: string
  label?: string
  selected?: boolean
  onClick?: () => void
  size?: number
}) {
  return (
    <button type="button" className={`toy-btn${selected ? ' on' : ''}`} onClick={onClick} style={{ background: `${color}33` }}>
      <CartoonArt kind={kind} color={color} size={size} />
      {label && <span className="toy-label">{label}</span>}
    </button>
  )
}
