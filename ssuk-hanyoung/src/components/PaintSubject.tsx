import { CHAR_IMG } from './GameArt'
import { TintedChar } from './TintedChar'

/** Recolorable characters — prefers illustrated PNGs over flat SVG */

type Props = {
  kind: string
  color: string
  size?: number
  className?: string
}

const KIND_SRC: Record<string, string> = {
  car: CHAR_IMG.car,
  sedan: CHAR_IMG.car,
  bus: CHAR_IMG.bus,
  fire: CHAR_IMG.fire,
  police: CHAR_IMG.police,
  ambulance: CHAR_IMG.ambulance,
  truck: CHAR_IMG.dump,
  dump: CHAR_IMG.dump,
  tractor: CHAR_IMG.tractor,
  star: CHAR_IMG.star,
  paint: CHAR_IMG.paint,
  sand: CHAR_IMG.sand,
  drum: CHAR_IMG.drum,
}

/** Natural “showroom” colors so pickers don’t all look yellow */
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
  const src = KIND_SRC[kind] || CHAR_IMG.car
  return <TintedChar src={src} color={color} size={size} className={className ? `paint-subject ${className}` : 'paint-subject'} />
}

export function NaturalSubject({ kind, size = 88, className }: { kind: string; size?: number; className?: string }) {
  return <PaintSubject kind={kind} color={KIND_NATURAL[kind] || '#FFD400'} size={size} className={className} />
}
