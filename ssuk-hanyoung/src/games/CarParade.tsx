import { useState } from 'react'
import { PLAY_COLORS, shuffle } from '../data/colors'
import { speak } from '../lib/speech'
import { GameShell } from '../components/GameShell'
import { Confetti } from '../components/Confetti'
import { CharImg, carImg } from '../components/GameArt'
import { useRound } from './useRound'

function setup() {
  const colors = shuffle(PLAY_COLORS).slice(0, 4)
  const order = colors.map((c, i) => ({
    id: `t-${c.id}`,
    colorId: c.id,
    hex: c.hex,
    src: carImg(i),
    ko: c.ko,
  }))
  const cars = shuffle(order.map((c) => ({ ...c, id: `c-${c.colorId}` })))
  return { order, cars }
}

export function CarParade() {
  const round = useRound('car-parade', 4)
  const [{ order, cars }, setBoard] = useState(setup)
  const [filled, setFilled] = useState<(string | null)[]>([null, null, null, null])
  const [selected, setSelected] = useState<string | null>(null)

  function put(slot: number) {
    if (!selected) {
      speak('자동차를 먼저 골라요')
      return
    }
    const car = cars.find((c) => c.id === selected)
    const need = order[slot]
    if (!car || !need) return
    if (car.colorId !== need.colorId) {
      speak('이 자리가 아니에요')
      return
    }
    if (filled[slot]) return
    const next = [...filled]
    next[slot] = car.id
    setFilled(next)
    setSelected(null)
    speak(`${need.ko}!`)
    if (next.every(Boolean)) {
      round.win('퍼레이드 출발!')
      setTimeout(() => {
        setBoard(setup())
        setFilled([null, null, null, null])
      }, 700)
    }
  }

  const free = cars.filter((c) => !filled.includes(c.id))

  return (
    <GameShell title="자동차 퍼레이드" subtitle="같은 색깔 자리에 줄을 세워요" progress={round.progress}>
      <Confetti show={round.confetti} />
      {round.toast && <div className="toast">{round.toast}</div>}
      <div className="prompt">
        <div className="prompt-big">퍼레이드 줄 세우기</div>
        <div className="prompt-sub">색깔에 맞게 자동차를 놓아요</div>
      </div>
      <div className="play-area">
        <div className="grid-2" style={{ marginBottom: '0.8rem' }}>
          {order.map((slot, i) => {
            const carId = filled[i]
            const car = cars.find((c) => c.id === carId)
            return (
              <button
                key={slot.id}
                type="button"
                className="slot"
                style={{ background: `${slot.hex}55`, borderColor: slot.hex }}
                onClick={() => put(i)}
              >
                {car ? <CharImg src={car.src} size={64} /> : <span>{slot.ko}</span>}
              </button>
            )
          })}
        </div>
        <div className="parts">
          {free.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`car-chip photo${selected === c.id ? ' selected' : ''}`}
              style={{ background: c.hex, minWidth: '5.2rem' }}
              onClick={() => {
                setSelected(c.id)
                speak('어디에 세울까요?')
              }}
            >
              <CharImg src={c.src} size={56} />
            </button>
          ))}
        </div>
        {round.done && (
          <button type="button" className="btn btn-sunny btn-block" style={{ marginTop: '0.8rem' }} onClick={round.reset}>
            또 퍼레이드!
          </button>
        )}
      </div>
    </GameShell>
  )
}
