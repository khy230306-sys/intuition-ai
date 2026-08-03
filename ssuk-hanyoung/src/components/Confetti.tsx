import { useMemo } from 'react'

const COLORS = ['#FF4D6D', '#FFD60A', '#5B8CFF', '#3DDC84', '#A78BFA', '#FF8A3D']

export function Confetti({ show }: { show: boolean }) {
  const bits = useMemo(
    () =>
      Array.from({ length: 28 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.4,
        color: COLORS[i % COLORS.length]!,
        rotate: Math.random() * 40,
      })),
    [show],
  )

  if (!show) return null
  return (
    <div className="confetti" aria-hidden>
      {bits.map((b) => (
        <i
          key={b.id}
          style={{
            left: `${b.left}%`,
            background: b.color,
            animationDelay: `${b.delay}s`,
            transform: `rotate(${b.rotate}deg)`,
          }}
        />
      ))}
    </div>
  )
}
