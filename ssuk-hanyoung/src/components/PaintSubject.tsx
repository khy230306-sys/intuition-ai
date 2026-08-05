import { CHAR_IMG, CHAR_IMG_MD } from './GameArt'
import { TintedChar } from './TintedChar'

type Props = {
  kind: string
  color: string
  size?: number
  className?: string
}

const KIND_KEY: Record<string, keyof typeof CHAR_IMG> = {
  car: 'car',
  sedan: 'car',
  bus: 'bus',
  fire: 'fire',
  police: 'police',
  ambulance: 'ambulance',
  truck: 'dump',
  dump: 'dump',
  tractor: 'tractor',
  star: 'star',
  paint: 'paint',
  sand: 'sand',
  drum: 'drum',
}

export const KIND_NATURAL: Record<string, string> = {
  car: '#FF2D55',
  sedan: '#FF2D55',
  bus: '#FFD400',
  fire: '#FF3B30',
  police: '#2F6BFF',
  ambulance: '#FFF8E7',
  truck: '#FF7A00',
  dump: '#FF7A00',
  tractor: '#22C55E',
  star: '#FFD400',
  paint: '#FF8FAB',
  sand: '#E8B86D',
  drum: '#FF2D55',
}

export function PaintSubject({ kind, color, size = 220, className }: Props) {
  const key = KIND_KEY[kind] || 'car'
  const src = size >= 140 ? CHAR_IMG_MD[key] : CHAR_IMG[key]
  return <TintedChar src={src} color={color} size={size} className={className ? `paint-subject ${className}` : 'paint-subject'} />
}

export function NaturalSubject({ kind, size = 88, className }: { kind: string; size?: number; className?: string }) {
  return <PaintSubject kind={kind} color={KIND_NATURAL[kind] || '#FFD400'} size={size} className={className} />
}
