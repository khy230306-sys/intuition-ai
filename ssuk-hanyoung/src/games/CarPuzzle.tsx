import { useEffect, useMemo, useState } from 'react'
import { shuffle } from '../data/colors'
import { speak } from '../lib/speech'
import { GameShell } from '../components/GameShell'
import { Confetti } from '../components/Confetti'
import { useRound } from './useRound'

type Piece = { id: number; label: string; placed: boolean }

const SETS = [
  { title: '소방차', emoji: '🚒', parts: ['앞', '몸통', '바퀴'] },
  { title: '버스', emoji: '🚌', parts: ['앞', '창문', '바퀴'] },
  { title: '경찰차', emoji: '🚓', parts: ['경광등', '몸통', '바퀴'] },
  { title: '기차', emoji: '🚂', parts: ['기관차', '칸', '바퀴'] },
]

export function CarPuzzle() {
  const round = useRound('car-puzzle', 4)
  const set = useMemo(() => SETS[round.score % SETS.length]!, [round.score])
  const [pieces, setPieces] = useState<Piece[]>([])
  const [slots, setSlots] = useState<(number | null)[]>([null, null, null])
  const [selected, setSelected] = useState<number | null>(null)

  useEffect(() => {
    setPieces(shuffle(set.parts.map((label, id) => ({ id, label, placed: false }))))
    setSlots([null, null, null])
    setSelected(null)
    speak(`${set.title} 퍼즐을 맞춰요`)
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
    speak(set.parts[slot]!)
    if (nextSlots.every((x) => x != null)) {
      speak(`${set.title} 완성!`)
      round.win('퍼즐 성공!')
    }
  }

  return (
    <GameShell title="자동차 퍼즐" subtitle="조각을 순서대로 맞춰요" progress={round.progress}>
      <Confetti show={round.confetti} />
      {round.toast && <div className="toast">{round.toast}</div>}
      <div className="prompt">
        <div className="prompt-big">
          {set.emoji} {set.title} 만들기
        </div>
      </div>
      <div className="play-area">
        <div className="grid-3" style={{ marginBottom: '0.8rem' }}>
          {set.parts.map((label, i) => (
            <button key={label} type="button" className="slot" onClick={() => place(i)}>
              {slots[i] != null ? (
                <span style={{ fontSize: '1.8rem' }}>{set.emoji}</span>
              ) : (
                <span>
                  {i + 1}. {label}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="parts">
          {pieces
            .filter((p) => !p.placed)
            .map((p) => (
              <button
                key={p.id}
                type="button"
                className="part"
                style={{ outline: selected === p.id ? '3px solid var(--sunny)' : undefined }}
                onClick={() => {
                  setSelected(p.id)
                  speak(p.label)
                }}
              >
                {p.label}
              </button>
            ))}
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
