export type ColorItem = {
  id: string
  ko: string
  en: string
  hex: string
  speak: string
}

export const COLORS: ColorItem[] = [
  { id: 'red', ko: '빨간색', en: 'Red', hex: '#FF4D6D', speak: '빨간색' },
  { id: 'orange', ko: '주황색', en: 'Orange', hex: '#FF8A3D', speak: '주황색' },
  { id: 'yellow', ko: '노란색', en: 'Yellow', hex: '#FFD60A', speak: '노란색' },
  { id: 'green', ko: '초록색', en: 'Green', hex: '#3DDC84', speak: '초록색' },
  { id: 'blue', ko: '파란색', en: 'Blue', hex: '#5B8CFF', speak: '파란색' },
  { id: 'purple', ko: '보라색', en: 'Purple', hex: '#A78BFA', speak: '보라색' },
  { id: 'pink', ko: '분홍색', en: 'Pink', hex: '#FF8FAB', speak: '분홍색' },
  { id: 'brown', ko: '갈색', en: 'Brown', hex: '#C48A5A', speak: '갈색' },
  { id: 'black', ko: '검은색', en: 'Black', hex: '#2A2420', speak: '검은색' },
  { id: 'white', ko: '하얀색', en: 'White', hex: '#FFF8E7', speak: '하얀색' },
  { id: 'sky', ko: '하늘색', en: 'Sky blue', hex: '#7DD3FC', speak: '하늘색' },
  { id: 'lime', ko: '연두색', en: 'Lime', hex: '#A3E635', speak: '연두색' },
]

export const PLAY_COLORS = COLORS.filter((c) =>
  ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink'].includes(c.id),
)

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!
}
