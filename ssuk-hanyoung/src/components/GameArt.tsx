const SM = '/assets/chars/sm'
const MD = '/assets/chars/md'

/** Optimized WebP characters (small for lists, medium for stages) */
export const CHAR_IMG = {
  bus: `${SM}/bus.webp`,
  busFront: `${SM}/bus-front.webp`,
  car: `${SM}/char-car.webp`,
  fire: `${SM}/fire.webp`,
  police: `${SM}/police.webp`,
  ambulance: `${SM}/ambulance.webp`,
  dump: `${SM}/dump.webp`,
  tractor: `${SM}/tractor.webp`,
  star: `${SM}/char-star.webp`,
  paint: `${SM}/char-paint.webp`,
  sand: `${SM}/char-sand.webp`,
  drum: `${SM}/char-drum.webp`,
} as const

export const CHAR_IMG_MD = {
  bus: `${MD}/bus.webp`,
  busFront: `${MD}/bus-front.webp`,
  car: `${MD}/char-car.webp`,
  fire: `${MD}/fire.webp`,
  police: `${MD}/police.webp`,
  ambulance: `${MD}/ambulance.webp`,
  dump: `${MD}/dump.webp`,
  tractor: `${MD}/tractor.webp`,
  star: `${MD}/char-star.webp`,
  paint: `${MD}/char-paint.webp`,
  sand: `${MD}/char-sand.webp`,
  drum: `${MD}/char-drum.webp`,
} as const

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
  eager = false,
}: {
  src: string
  alt?: string
  size?: number
  className?: string
  eager?: boolean
}) {
  // Prefer md asset automatically for large on-screen sizes
  const resolved = size >= 140 ? src.replace('/chars/sm/', '/chars/md/') : src
  return (
    <img
      src={resolved}
      alt={alt}
      width={size}
      height={size}
      className={`char-img${className ? ` ${className}` : ''}`}
      draggable={false}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      fetchPriority={eager ? 'high' : 'auto'}
    />
  )
}

const GAME_ART: Record<string, string> = {
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

/** Game card art — small WebP, lazy by default */
export function GameArt({ id, size = 92, eager = false }: { id: string; size?: number; eager?: boolean }) {
  return <CharImg src={GAME_ART[id] || CHAR_IMG.car} size={size} eager={eager} />
}
