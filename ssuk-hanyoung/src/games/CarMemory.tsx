import { useState } from 'react'
import { shuffle } from '../data/colors'
import { speak } from '../lib/speech'
import { GameShell } from '../components/GameShell'
import { Confetti } from '../components/Confetti'
import { useRound } from './useRound'

const ICONS = ['🚗', '🚕', '🚓', '🚑', '🚒', '🚌']

type Card = { id: string; icon: string; open: boolean; matched: boolean }

function deal(): Card[] {
  const pair = shuffle(ICONS).slice(0, 6)
  return shuffle(
    pair.flatMap((icon, i) => [
      { id: `${i}a`, icon, open: false, matched: false },
      { id: `${i}b`, icon, open: false, matched: false },
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
    const nextOpen = [...openIds, card.id]
    const next = cards.map((c) => (c.id === card.id ? { ...c, open: true } : c))
    setCards(next)
    setOpenIds(nextOpen)
    if (nextOpen.length < 2) return
    setLock(true)
    const [a, b] = nextOpen
    const ca = next.find((c) => c.id === a)!
    const cb = next.find((c) => c.id === b)!
    if (ca.icon === cb.icon) {
      speak('짝이 맞아요!')
      const matched = next.map((c) => (c.id === a || c.id === b ? { ...c, matched: true } : c))
      setCards(matched)
      setOpenIds([])
      setLock(false)
      if (matched.every((c) => c.matched)) round.win('모두 맞췄어요!')
    } else {
      speak('다시!')
      setTimeout(() => {
        setCards((cur) => cur.map((c) => (c.id === a || c.id === b ? { ...c, open: false } : c)))
        setOpenIds([])
        setLock(false)
      }, 700)
    }
  }

  return (
    <GameShell title="자동차 기억카드" subtitle="같은 자동차 짝을 맞춰요" progress={cards.filter((c) => c.matched).length / cards.length}>
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
              {c.open || c.matched ? c.icon : '?'}
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
