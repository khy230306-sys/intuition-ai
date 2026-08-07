import { useState } from 'react'
import { shuffle } from '../data/colors'
import { speak } from '../lib/speech'
import { sfx } from '../lib/sfx'
import { GameShell } from '../components/GameShell'
import { Confetti } from '../components/Confetti'
import { PaintSubject } from '../components/PaintSubject'
import { useRound } from './useRound'

const PAIRS = [
  { kind: 'car', color: '#FF2D55' },
  { kind: 'bus', color: '#FFD400' },
  { kind: 'police', color: '#2F6BFF' },
  { kind: 'fire', color: '#FF7A00' },
]

type Card = { id: string; kind: string; color: string; open: boolean; matched: boolean }

function deal(): Card[] {
  const pair = shuffle(PAIRS).slice(0, 4)
  return shuffle(
    pair.flatMap((p, i) => [
      { id: `${i}a`, kind: p.kind, color: p.color, open: false, matched: false },
      { id: `${i}b`, kind: p.kind, color: p.color, open: false, matched: false },
    ]),
  )
}

export function CarMemory() {
  const round = useRound('car-memory', 1)
  const [cards, setCards] = useState(deal)
  const [openIds, setOpenIds] = useState<string[]>([])
  const [lock, setLock] = useState(false)

  function flip(card: Card) {
    if (lock || card.open || card.matched || round.done) return
    sfx.tap()
    const nextOpen = [...openIds, card.id]
    const next = cards.map((c) => (c.id === card.id ? { ...c, open: true } : c))
    setCards(next)
    setOpenIds(nextOpen)
    if (nextOpen.length < 2) return
    setLock(true)
    const [a, b] = nextOpen
    const ca = next.find((c) => c.id === a)!
    const cb = next.find((c) => c.id === b)!
    if (ca.kind === cb.kind) {
      sfx.cheer()
      speak('짝!')
      const matched = next.map((c) => (c.id === a || c.id === b ? { ...c, matched: true } : c))
      setCards(matched)
      setOpenIds([])
      setLock(false)
      if (matched.every((c) => c.matched)) {
        sfx.win()
        round.win('모두 맞췄어요!')
      }
    } else {
      round.fail()
      speak('다시!')
      setTimeout(() => {
        setCards((cur) => cur.map((c) => (c.id === a || c.id === b ? { ...c, open: false } : c)))
        setOpenIds([])
        setLock(false)
      }, 700)
    }
  }

  return (
    <GameShell title="짝 맞추기" subtitle="같은 차를 찾아요" progress={cards.filter((c) => c.matched).length / cards.length}>
      <Confetti show={round.confetti} />
      {round.toast && <div className="toast">{round.toast}</div>}
      <div className="play-area">
        <div className="memory-grid">
          {cards.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`mem-card${c.open || c.matched ? '' : ' back'}${c.matched ? ' matched' : ''}`}
              onClick={() => flip(c)}
            >
              {c.open || c.matched ? <PaintSubject kind={c.kind} color={c.color} size={56} /> : '?'}
            </button>
          ))}
        </div>
        {round.done && (
          <button
            type="button"
            className="btn btn-sunny btn-block"
            style={{ marginTop: '0.8rem' }}
            onClick={() => {
              round.reset()
              setCards(deal())
              setOpenIds([])
            }}
          >
            새 카드!
          </button>
        )}
      </div>
    </GameShell>
  )
}
