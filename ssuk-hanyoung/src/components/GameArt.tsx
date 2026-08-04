import { CartoonArt } from '../components/CartoonArt'

/** Map game ids to bold cartoon art for cards */
export function GameArt({ id, size = 64 }: { id: string; size?: number }) {
  const map: Record<string, { kind: string; color: string }> = {
    'sound-board': { kind: 'police', color: '#2F6BFF' },
    'story-tap': { kind: 'bus', color: '#FFD400' },
    'car-parade': { kind: 'car', color: '#FF2D55' },
    'car-puzzle': { kind: 'fire', color: '#FF2D55' },
    'sticker-book': { kind: 'star', color: '#FFD400' },
    'color-follow': { kind: 'car', color: '#8B5CF6' },
    'maze-drive': { kind: 'car', color: '#22C55E' },
    'hidden-cars': { kind: 'truck', color: '#FF7A00' },
    'wait-go': { kind: 'car', color: '#22C55E' },
    'rhythm-tap': { kind: 'star', color: '#FF5DA2' },
    'car-paint': { kind: 'car', color: '#FF2D55' },
    'sand-play': { kind: 'truck', color: '#FFD400' },
    'bubble-pop': { kind: 'fish', color: '#38BDF8' },
    'stamp-pad': { kind: 'dog', color: '#B86B3C' },
    'finger-paint': { kind: 'flower', color: '#FF5DA2' },
    'pop-it': { kind: 'star', color: '#8B5CF6' },
    'shape-touch': { kind: 'star', color: '#2F6BFF' },
    'color-garage': { kind: 'house', color: '#FF2D55' },
    'vroom-race': { kind: 'car', color: '#2F6BFF' },
    parking: { kind: 'car', color: '#22C55E' },
    'car-builder': { kind: 'truck', color: '#FF7A00' },
    'find-color-car': { kind: 'car', color: '#FF2D55' },
    'color-mix': { kind: 'flower', color: '#8B5CF6' },
    'car-memory': { kind: 'bus', color: '#FFD400' },
    'car-sounds': { kind: 'ambulance', color: '#FFF8E7' },
    'traffic-light': { kind: 'car', color: '#22C55E' },
    'car-wash': { kind: 'car', color: '#38BDF8' },
    balloons: { kind: 'star', color: '#FF5DA2' },
    'bus-count': { kind: 'bus', color: '#FFD400' },
    'color-quiz': { kind: 'flower', color: '#FF2D55' },
  }
  const m = map[id] || { kind: 'car', color: '#FF2D55' }
  return <CartoonArt kind={m.kind} color={m.color} size={size} />
}
