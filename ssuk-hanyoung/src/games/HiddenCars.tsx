import { useMemo, useState } from 'react'
import { speak } from '../lib/speech'
import { GameShell } from '../components/GameShell'
import { Confetti } from '../components/Confetti'
import { useRound } from './useRound'
import { shuffle } from '../data/colors'

type Item = { id: string; emoji: string; x: number; y: number; isCar: boolean; found?: boolean }

const CARS = ['🚗', '🚕', '🚌', '🚓', '🚒', '🚑', '🚙']
const DECOYS = ['🌳', '🏠', '☁️', '🌻', '🐶', '⭐', '🎈', '🍎']

function makeScene(): Item[] {
  const cars = shuffle(CARS).slice(0, 4).map((emoji, i) => ({
    id: `c${i}`,
    emoji,
    x: 12 + Math.random() * 70,
    y: 15 + Math.random() * 60,
    isCar: true,
  }))
  const decoys = shuffle(DECOYS)
    .slice(0, 8)
    .map((emoji, i) => ({
      id: `d${i}`,
      emoji,
      x: 8 + Math.random() * 78,
      y: 10 + Math.random() * 68,
      isCar: false,
    }))
  return shuffle([...cars, ...decoys])
}

export function HiddenCars() {
  const round = useRound('hidden-cars', 4)
  const [items, setItems] = useState(makeScene)
  const need = useMemo(() => items.filter((i) => i.isCar).length, [items])
  const found = items.filter((i) => i.isCar && i.found).length

  function tap(item: Item) {
    if (item.found || round.done) return
    if (!item.isCar) {
      speak('자동차가 아니에요')
      return
    }
    const next = items.map((x) => (x.id === item.id ? { ...x, found: true } : x))
    setItems(next)
    speak('찾았어요!')
    if (next.filter((x) => x.isCar && x.found).length >= need) {
      round.win('다 찾았어요!')
      setTimeout(() => setItems(makeScene()), 700)
    }
  }

  return (
    <GameShell title="숨은 자동차" subtitle="그림 속에서 자동차만 찾아요" progress={round.progress}>
      <Confetti show={round.confetti} />
      {round.toast && <div className="toast">{round.toast}</div>}
      <div className="prompt">
        <div className="prompt-big">
          자동차 찾기 ({found}/{need})
        </div>
        <div className="prompt-sub">천천히 살펴보아요</div>
      </div>
      <div className="play-area hide-scene">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`hide-item${item.found ? ' found' : ''}`}
            style={{ left: `${item.x}%`, top: `${item.y}%` }}
            onClick={() => tap(item)}
          >
            {item.emoji}
          </button>
        ))}
      </div>
      {round.done && (
        <button type="button" className="btn btn-sunny btn-block" style={{ marginTop: '0.8rem' }} onClick={round.reset}>
          또 찾기!
        </button>
      )}
    </GameShell>
  )
}
