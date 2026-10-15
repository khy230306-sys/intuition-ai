import { useEffect, useMemo, useState } from 'react'
import { shuffle } from '../data/colors'
import { speak } from '../lib/speech'
import { GameShell } from '../components/GameShell'
import { Confetti } from '../components/Confetti'
import { PaintSubject } from '../components/PaintSubject'
import { PuzzlePart, type PartKind } from '../components/PuzzlePart'
import { useRound } from './useRound'

type PieceDef = { id: number; label: string; part: PartKind }
type Piece = PieceDef & { placed: boolean }

type PuzzleSet = {
  title: string
  vehicle: string
  color: string
  parts: { label: string; part: PartKind }[]
}

const SETS: PuzzleSet[] = [
  {
    title: '소방차',
    vehicle: 'fire',
    color: '#FF2D55',
    parts: [
      { label: '앞', part: 'front' },
      { label: '몸통', part: 'body' },
      { label: '바퀴', part: 'wheel' },
    ],
  },
  {
    title: '버스',
    vehicle: 'bus',
    color: '#FFD400',
    parts: [
      { label: '앞', part: 'front' },
      { label: '창문', part: 'window' },
      { label: '바퀴', part: 'wheel' },
    ],
  },
  {
    title: '경찰차',
    vehicle: 'police',
    color: '#2F6BFF',
    parts: [
      { label: '경광등', part: 'siren' },
      { label: '몸통', part: 'body' },
      { label: '바퀴', part: 'wheel' },
    ],
  },
  {
    title: '덤프트럭',
    vehicle: 'truck',
    color: '#FF7A00',
    parts: [
      { label: '앞', part: 'front' },
      { label: '짐칸', part: 'bed' },
      { label: '바퀴', part: 'wheel' },
    ],
  },
]

export function CarPuzzle() {
  const round = useRound('car-puzzle', 4)
  const set = useMemo(() => SETS[round.score % SETS.length]!, [round.score])
  const [pieces, setPieces] = useState<Piece[]>([])
  const [slots, setSlots] = useState<(number | null)[]>([null, null, null])
  const [selected, setSelected] = useState<number | null>(null)

  useEffect(() => {
    const defs: PieceDef[] = set.parts.map((p, id) => ({ id, label: p.label, part: p.part }))
    setPieces(shuffle(defs.map((d) => ({ ...d, placed: false }))))
    setSlots([null, null, null])
    setSelected(null)
    speak(`${set.title} 퍼즐을 맞춰요. 조각을 골라 자리에 넣어요`)
  }, [set])

  function place(slot: number) {
    if (selected == null) {
      speak('조각을 먼저 골라요')
      return
    }
    if (slots[slot] != null) return
    if (selected !== slot) {
      speak('이 자리가 아니에요')
      setSelected(null)
      return
    }
    const nextSlots = [...slots]
    nextSlots[slot] = selected
    setSlots(nextSlots)
    setPieces((ps) => ps.map((p) => (p.id === selected ? { ...p, placed: true } : p)))
    setSelected(null)
    speak(set.parts[slot]!.label)
    if (nextSlots.every((x) => x != null)) {
      speak(`${set.title} 완성!`)
      round.win('퍼즐 성공!')
    }
  }

  const complete = slots.every((x) => x != null)

  return (
    <GameShell title="자동차 퍼즐" subtitle="다른 조각을 순서대로 맞춰요" progress={round.progress}>
      <Confetti show={round.confetti} />
      {round.toast && <div className="toast">{round.toast}</div>}
      <div className="prompt">
        <div className="prompt-big">{set.title} 만들기</div>
        <div className="prompt-sub">아래 조각은 각각 달라요. 맞는 칸에 넣어요</div>
      </div>
      <div className="play-area">
        <div className="puzzle-goal" aria-hidden>
          {complete ? (
            <PaintSubject kind={set.vehicle} color={set.color} size={140} className="paint-pop" />
          ) : (
            <div className="puzzle-goal-ghost">
              <PaintSubject kind={set.vehicle} color="#d9d2c5" size={110} />
              <span>목표</span>
            </div>
          )}
        </div>

        <div className="puzzle-slots">
          {set.parts.map((p, i) => {
            const filled = slots[i]
            const piece = filled != null ? set.parts[filled] : null
            return (
              <button
                key={p.label}
                type="button"
                className={`puzzle-slot${filled != null ? ' filled' : ''}${selected === i ? ' target' : ''}`}
                onClick={() => place(i)}
              >
                {piece ? (
                  <>
                    <PuzzlePart part={piece.part} color={set.color} size={72} />
                    <span className="puzzle-slot-label">{piece.label}</span>
                  </>
                ) : (
                  <>
                    <PuzzlePart part={p.part} color="#e8e0d4" size={56} />
                    <span className="puzzle-slot-label ghost">
                      {i + 1}. {p.label}
                    </span>
                  </>
                )}
              </button>
            )
          })}
        </div>

        <h3 className="section-title" style={{ marginTop: '0.85rem' }}>
          조각 고르기
        </h3>
        <div className="puzzle-tray">
          {pieces
            .filter((p) => !p.placed)
            .map((p) => (
              <button
                key={p.id}
                type="button"
                className={`puzzle-piece${selected === p.id ? ' on' : ''}`}
                onClick={() => {
                  setSelected(p.id)
                  speak(p.label)
                }}
              >
                <PuzzlePart part={p.part} color={set.color} size={78} />
                <span>{p.label}</span>
              </button>
            ))}
          {!pieces.some((p) => !p.placed) && <p className="section-sub">조각을 모두 넣었어요!</p>}
        </div>

        {round.done && (
          <button type="button" className="btn btn-sunny btn-block" style={{ marginTop: '0.8rem' }} onClick={round.reset}>
            새 퍼즐!
          </button>
        )}
      </div>
    </GameShell>
  )
}
