import { useMemo, useRef, useState, type PointerEvent } from 'react'
import { speak } from '../lib/speech'
import { addStars } from '../lib/store'
import { GameShell } from '../components/GameShell'
import { Confetti } from '../components/Confetti'

/** Simple polyline road points in % */
const ROADS = [
  [
    [12, 80],
    [28, 55],
    [48, 70],
    [68, 40],
    [88, 25],
  ],
  [
    [10, 30],
    [30, 55],
    [50, 35],
    [70, 65],
    [90, 45],
  ],
  [
    [15, 70],
    [35, 70],
    [50, 40],
    [65, 40],
    [85, 20],
  ],
]

function dist(a: number[], b: number[]) {
  const dx = a[0]! - b[0]!
  const dy = a[1]! - b[1]!
  return Math.hypot(dx, dy)
}

export function MazeDrive() {
  const [roadIdx, setRoadIdx] = useState(0)
  const road = useMemo(() => ROADS[roadIdx % ROADS.length]!, [roadIdx])
  const [progress, setProgress] = useState(0)
  const [car, setCar] = useState(road[0]!)
  const [confetti, setConfetti] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const dragging = useRef(false)

  function nearestIndex(p: number[]) {
    let best = 0
    let bestD = Infinity
    road.forEach((pt, i) => {
      const d = dist(p, pt)
      if (d < bestD) {
        bestD = d
        best = i
      }
    })
    return { best, bestD }
  }

  function onMove(e: PointerEvent<HTMLDivElement>) {
    if (!dragging.current) return
    const rect = e.currentTarget.getBoundingClientRect()
    const p = [((e.clientX - rect.left) / rect.width) * 100, ((e.clientY - rect.top) / rect.height) * 100]
    const { best, bestD } = nearestIndex(p)
    if (bestD > 14) {
      speak('길 위로 와요')
      return
    }
    if (best >= progress) {
      setProgress(best)
      setCar(road[best]!)
      if (best >= road.length - 1) {
        speak('도착! 부릉부릉!')
        addStars(2, 'maze-drive')
        setConfetti(true)
        setToast('도착했어요!')
        setTimeout(() => {
          setConfetti(false)
          setToast(null)
          const next = roadIdx + 1
          setRoadIdx(next)
          const r = ROADS[next % ROADS.length]!
          setProgress(0)
          setCar(r[0]!)
        }, 1200)
      }
    }
  }

  const pathD = road.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ')

  return (
    <GameShell title="미로 운전" subtitle="손가락으로 길을 따라 운전해요">
      <Confetti show={confetti} />
      {toast && <div className="toast">{toast}</div>}
      <div className="prompt">
        <div className="prompt-big">길을 따라가요 🛤️</div>
        <div className="prompt-sub">천천히 · 길 밖으로 안 나가게</div>
      </div>
      <div
        className="play-area maze-stage"
        onPointerDown={(e) => {
          dragging.current = true
          e.currentTarget.setPointerCapture(e.pointerId)
          onMove(e)
        }}
        onPointerMove={onMove}
        onPointerUp={() => {
          dragging.current = false
        }}
        onPointerCancel={() => {
          dragging.current = false
        }}
      >
        <svg viewBox="0 0 100 100" className="maze-svg" aria-hidden>
          <path d={pathD} className="maze-road" />
          <circle cx={road[0]![0]} cy={road[0]![1]} r="4" className="maze-start" />
          <circle cx={road.at(-1)![0]} cy={road.at(-1)![1]} r="5" className="maze-goal" />
        </svg>
        <div className="maze-car" style={{ left: `${car[0]}%`, top: `${car[1]}%` }}>
          🚗
        </div>
      </div>
    </GameShell>
  )
}
