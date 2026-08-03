import { useState } from 'react'
import { PLAY_COLORS, shuffle } from '../data/colors'
import { CAR_EMOJIS } from '../data/vehicles'
import { speak } from '../lib/speech'
import { GameShell } from '../components/GameShell'
import { Confetti } from '../components/Confetti'
import { useRound } from './useRound'

type Spot = { id: string; colorId: string; hex: string; filled?: string }
type Car = { id: string; colorId: string; hex: string; emoji: string }

function setup() {
  const colors = shuffle(PLAY_COLORS).slice(0, 4)
  const spots: Spot[] = colors.map((c) => ({ id: `s-${c.id}`, colorId: c.id, hex: c.hex }))
  const cars: Car[] = shuffle(
    colors.map((c, i) => ({
      id: `c-${c.id}`,
      colorId: c.id,
      hex: c.hex,
      emoji: CAR_EMOJIS[i % CAR_EMOJIS.length]!,
    })),
  )
  return { spots, cars }
}

export function ParkingLot() {
  const round = useRound('parking', 5)
  const [{ spots, cars }, setBoard] = useState(setup)
  const [selected, setSelected] = useState<string | null>(null)
  const [parked, setParked] = useState<Record<string, string>>({})

  function park(spot: Spot) {
    if (!selected) {
      speak('자동차를 먼저 골라 주세요')
      return
    }
    const car = cars.find((c) => c.id === selected)
    if (!car) return
    if (car.colorId !== spot.colorId) {
      speak('이 자리는 다른 색깔이에요')
      return
    }
    const next = { ...parked, [spot.id]: car.id }
    setParked(next)
    setSelected(null)
    speak('주차 완료! 빵빵!')
    if (Object.keys(next).length === spots.length) {
      round.win('주차장 만석!')
      setTimeout(() => {
        setBoard(setup())
        setParked({})
      }, 700)
    }
  }

  const freeCars = cars.filter((c) => !Object.values(parked).includes(c.id))

  return (
    <GameShell title="주차 놀이" subtitle="같은 색깔 자리에 주차해요" progress={round.progress}>
      <Confetti show={round.confetti} />
      {round.toast && <div className="toast">{round.toast}</div>}
      <div className="prompt">
        <div className="prompt-big">🅿️ 색깔 주차!</div>
        <div className="prompt-sub">자동차를 고르고 같은 색 자리에 넣어요</div>
      </div>
      <div className="play-area">
        <div className="grid-2" style={{ marginBottom: '0.8rem' }}>
          {spots.map((s) => {
            const carId = parked[s.id]
            const car = cars.find((c) => c.id === carId)
            return (
              <button
                key={s.id}
                type="button"
                className="slot"
                style={{ background: `${s.hex}66`, borderColor: s.hex }}
                onClick={() => park(s)}
              >
                {car ? <span style={{ fontSize: '2.2rem' }}>{car.emoji}</span> : <span>{PLAY_COLORS.find((c) => c.id === s.colorId)!.ko}</span>}
              </button>
            )
          })}
        </div>
        <div className="parts">
          {freeCars.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`car-chip${selected === c.id ? ' selected' : ''}`}
              style={{ background: c.hex, minWidth: '4.5rem' }}
              onClick={() => {
                setSelected(c.id)
                speak('어디에 주차할까요?')
              }}
            >
              <span className="emoji">{c.emoji}</span>
            </button>
          ))}
        </div>
        {round.done && (
          <button type="button" className="btn btn-sunny btn-block" style={{ marginTop: '0.8rem' }} onClick={round.reset}>
            또 주차해요!
          </button>
        )}
      </div>
    </GameShell>
  )
}
