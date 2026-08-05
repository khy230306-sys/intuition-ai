const CHAR = '/assets/chars'

/** High-quality illustrated characters (not flat emoji SVGs) */
export const CHAR_IMG = {
  bus: `${CHAR}/bus.png`,
  busFront: `${CHAR}/bus-front.png`,
  /** Prefer illustrated front character when available */
  car: `${CHAR}/char-car.png`,
  fire: `${CHAR}/fire.png`,
  police: `${CHAR}/police.png`,
  ambulance: `${CHAR}/ambulance.png`,
  dump: `${CHAR}/dump.png`,
  tractor: `${CHAR}/tractor.png`,
  star: `${CHAR}/char-star.png`,
  paint: `${CHAR}/char-paint.png`,
  sand: `${CHAR}/char-sand.png`,
  drum: `${CHAR}/char-drum.png`,
} as const

/** Rotate through distinct vehicle characters (no emoji) */
export const CAR_IMGS = [
  CHAR_IMG.car,
  CHAR_IMG.police,
  CHAR_IMG.fire,
  CHAR_IMG.ambulance,
  CHAR_IMG.bus,
  CHAR_IMG.dump,
  CHAR_IMG.tractor,
  CHAR_IMG.busFront,
] as const

export function carImg(index: number): string {
  return CAR_IMGS[index % CAR_IMGS.length]!
}

export function CharImg({
  src,
  alt = '',
  size = 88,
  className,
}: {
  src: string
  alt?: string
  size?: number
  className?: string
}) {
  return (
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={`char-img${className ? ` ${className}` : ''}`}
      draggable={false}
    />
  )
}

/** Game card art: always use illustrated PNGs */
export function GameArt({ id, size = 92 }: { id: string; size?: number }) {
  const map: Record<string, string> = {
    'sound-board': CHAR_IMG.police,
    'story-tap': CHAR_IMG.bus,
    'car-parade': CHAR_IMG.car,
    'car-puzzle': CHAR_IMG.fire,
    'sticker-book': CHAR_IMG.star,
    'color-follow': CHAR_IMG.paint,
    'maze-drive': CHAR_IMG.tractor,
    'hidden-cars': CHAR_IMG.dump,
    'wait-go': CHAR_IMG.car,
    'rhythm-tap': CHAR_IMG.drum,
    'car-paint': CHAR_IMG.paint,
    'sand-play': CHAR_IMG.sand,
    'bubble-pop': CHAR_IMG.star,
    'stamp-pad': CHAR_IMG.paint,
    'finger-paint': CHAR_IMG.paint,
    'pop-it': CHAR_IMG.star,
    'shape-touch': CHAR_IMG.star,
    'color-garage': CHAR_IMG.bus,
    'vroom-race': CHAR_IMG.car,
    parking: CHAR_IMG.police,
    'car-builder': CHAR_IMG.dump,
    'find-color-car': CHAR_IMG.fire,
    'color-mix': CHAR_IMG.paint,
    'car-memory': CHAR_IMG.busFront,
    'car-sounds': CHAR_IMG.ambulance,
    'traffic-light': CHAR_IMG.car,
    'car-wash': CHAR_IMG.ambulance,
    balloons: CHAR_IMG.star,
    'bus-count': CHAR_IMG.bus,
    'color-quiz': CHAR_IMG.paint,
  }
  return <CharImg src={map[id] || CHAR_IMG.car} size={size} />
}
