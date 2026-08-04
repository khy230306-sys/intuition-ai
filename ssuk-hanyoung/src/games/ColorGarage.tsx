import { useMemo, useState } from 'react'
import { PLAY_COLORS, shuffle } from '../data/colors'
import { speak } from '../lib/speech'
import { GameShell } from '../components/GameShell'
import { Confetti } from '../components/Confetti'
import { useRound } from './useRound'
import { CartoonArt } from '../components/CartoonArt'

type Car = { id: string; colorId: string; hex: string }

function makeCars(colorIds: string[]): Car[] {
  return shuffle(
    colorIds.flatMap((cid, i) => {
      const c = PLAY_COLORS.find((x) => x.id === cid)!
      return [0, 1].map((j) => ({
        id: `${cid}-${i}-${j}-${Math.random().toString(36).slice(2, 6)}`,
        colorId: cid,
        hex: c.hex,
      }))
    }),
  )
}

export function ColorGarage() {
  const round = useRound('color-garage', 4)
  const [palette, setPalette] = useState(() => shuffle(PLAY_COLORS).slice(0, 3))
  const [cars, setCars] = useState(() => makeCars(palette.map((c) => c.id)))
  const [selected, setSelected] = useState<string | null>(null)
  const [garages, setGarages] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(palette.map((c) => [c.id, []])),
  )

  const remaining = useMemo(() => cars.filter((c) => !Object.values(garages).flat().includes(c.id)), [cars, garages])

  function place(garageId: string) {
    if (!selected) {
      speak('먼저 자동차를 골라 주세요')
      return
    }
    const car = cars.find((c) => c.id === selected)
    if (!car) return
    if (car.colorId !== garageId) {
      speak('이 색깔 차고가 아니에요')
      setSelected(null)
      return
    }
    const next = { ...garages, [garageId]: [...garages[garageId]!, car.id] }
    setGarages(next)
    setSelected(null)
    speak(`${PLAY_COLORS.find((c) => c.id === garageId)!.ko} 차고!`)
    const left = cars.filter((c) => !Object.values(next).flat().includes(c.id))
    if (left.length === 0) {
      round.win('차고가 꽉 찼어요!')
      const nextPalette = shuffle(PLAY_COLORS).slice(0, 3)
      setTimeout(() => {
        setPalette(nextPalette)
        setGarages(Object.fromEntries(nextPalette.map((c) => [c.id, []])))
        setCars(makeCars(nextPalette.map((c) => c.id)))
      }, 700)
    }
  }

  return (
    <GameShell title="색깔 차고" subtitle="같은 색 차고에 자동차를 넣어요" progress={round.progress}>
      <Confetti show={round.confetti} />
      {round.toast && <div className="toast">{round.toast}</div>}
      <div className="prompt">
        <div className="prompt-big">{selected ? '같은 색 차고를 눌러요!' : '자동차를 먼저 눌러요!'}</div>
        <div className="prompt-sub">
          {round.score}/{round.total} 라운드
        </div>
      </div>
      <div className="play-area">
        <div className="grid-3" style={{ marginBottom: '0.8rem' }}>
          {remaining.map((car) => (
            <button
              key={car.id}
              type="button"
              className={`car-chip art${selected === car.id ? ' selected' : ''}`}
              style={{ background: `${car.hex}33` }}
              onClick={() => {
                setSelected(car.id)
                speak('이 자동차를 어디로 넣을까요?')
              }}
            >
              <CartoonArt kind="car" color={car.hex} size={72} />
            </button>
          ))}
        </div>
        <div className="grid-3">
          {palette.map((g) => (
            <button key={g.id} type="button" onClick={() => place(g.id)} style={{ textAlign: 'left' }}>
              <div style={{ fontFamily: 'var(--font-display)', marginBottom: 4 }}>{g.ko} 차고</div>
              <div className={`garage${garages[g.id]!.length ? ' ok' : ''}`} style={{ background: `${g.hex}55`, borderColor: g.hex }}>
                {garages[g.id]!.map((id) => {
                  const car = cars.find((c) => c.id === id)!
                  return <CartoonArt key={id} kind="car" color={car.hex} size={36} />
                })}
                {!garages[g.id]!.length && <span style={{ color: 'var(--muted)' }}>비어 있어요</span>}
              </div>
            </button>
          ))}
        </div>
        {round.done && (
          <button type="button" className="btn btn-sunny btn-block" style={{ marginTop: '0.8rem' }} onClick={round.reset}>
            한 판 더!
          </button>
        )}
      </div>
    </GameShell>
  )
}
