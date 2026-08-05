import { useMemo, useRef, useState, type PointerEvent } from 'react'
import { speak } from '../lib/speech'
import { sfx } from '../lib/sfx'
import { addStars } from '../lib/store'
import { GameShell } from '../components/GameShell'
import { Confetti } from '../components/Confetti'
import { PaintSubject } from '../components/PaintSubject'

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
  return Math.hypot(a[0]! - b[0]!, a[1]! - b[1]!)
}

export function MazeDrive() {
  const [roadIdx, setRoadIdx] = useState(0)
  const road = useMemo(() => ROADS[roadIdx % ROADS.length]!, [roadIdx])
  const [progress, setProgress] = useState(0)
  const [car, setCar] = useState(road[0]!)
  const [confetti, setConfetti] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const dragging = useRef(false)
  const lastWarn = useRef(0)

  function onMove(e: PointerEvent<HTMLDivElement>) {
    if (!dragging.current || confetti) return
    const rect = e.currentTarget.getBoundingClientRect()
    const p = [((e.clientX - rect.left) / rect.width) * 100, ((e.clientY - rect.top) / rect.height) * 100]
    const nextIdx = Math.min(progress + 1, road.length - 1)
    const target = road[nextIdx]!
    const d = dist(p, target)
    const onPath = road.some((pt, i) => i >= progress && i <= progress + 1 && dist(p, pt) < 16)

    if (!onPath) {
      if (Date.now() - lastWarn.current > 1400) {
        lastWarn.current = Date.now()
        sfx.wrong()
        speak('길 위로 와요')
      }
      return
    }

    if (d < 14 && nextIdx > progress) {
      setProgress(nextIdx)
      setCar(target)
      sfx.tap()
      if (nextIdx >= road.length - 1) {
        sfx.win()
        speak('도착!')
        addStars(2, 'maze-drive')
        setConfetti(true)
        setToast('도착!')
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
    } else {
      // soft follow toward next point while near path
      const cur = road[progress]!
      const t = Math.min(1, dist(p, cur) / 20)
      setCar([cur[0]! + (target[0]! - cur[0]!) * t * 0.35, cur[1]! + (target[1]! - cur[1]!) * t * 0.35])
    }
  }

  const pathD = road.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ')

  return (
    <GameShell title="미로 운전" subtitle="길을 따라 손가락으로 가요">
      <Confetti show={confetti} />
      {toast && <div className="toast">{toast}</div>}
      <div className="prompt">
        <div className="prompt-big">길을 따라가요</div>
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
          <path d={pathD} className="maze-road soft" />
          <path d={pathD} className="maze-road" />
          <circle cx={road[0]![0]} cy={road[0]![1]} r="5" className="maze-start" />
          <circle cx={road.at(-1)![0]} cy={road.at(-1)![1]} r="6" className="maze-goal" />
        </svg>
        <div className="maze-car" style={{ left: `${car[0]}%`, top: `${car[1]}%` }}>
          <PaintSubject kind="car" color="#2F6BFF" size={44} />
        </div>
      </div>
    </GameShell>
  )
}
