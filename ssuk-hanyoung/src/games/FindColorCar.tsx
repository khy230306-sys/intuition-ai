import { useEffect, useState } from 'react'
import { PLAY_COLORS, pick, shuffle } from '../data/colors'
import { speak } from '../lib/speech'
import { GameShell } from '../components/GameShell'
import { Confetti } from '../components/Confetti'
import { CharImg, carImg } from '../components/GameArt'
import { useRound } from './useRound'

type Item = { id: string; colorId: string; hex: string; src: string; found?: boolean }

function makeBoard(targetId: string): Item[] {
  const target = PLAY_COLORS.find((c) => c.id === targetId)!
  const others = shuffle(PLAY_COLORS.filter((c) => c.id !== targetId)).slice(0, 5)
  const items: Item[] = [
    ...[0, 1, 2].map((i) => ({
      id: `t-${i}`,
      colorId: target.id,
      hex: target.hex,
      src: carImg(i),
    })),
    ...others.map((c, i) => ({
      id: `o-${i}`,
      colorId: c.id,
      hex: c.hex,
      src: carImg(i + 3),
    })),
  ]
  return shuffle(items)
}

export function FindColorCar() {
  const round = useRound('find-color-car', 5)
  const [target, setTarget] = useState(() => pick(PLAY_COLORS))
  const [board, setBoard] = useState(() => makeBoard(target.id))

  useEffect(() => {
    speak(`${target.ko} 자동차를 모두 찾아요`)
  }, [target])

  function tap(item: Item) {
    if (item.found || round.done) return
    if (item.colorId !== target.id) {
      speak('이 색깔이 아니에요')
      return
    }
    const next = board.map((x) => (x.id === item.id ? { ...x, found: true } : x))
    setBoard(next)
    speak('찾았어요!')
    const left = next.filter((x) => x.colorId === target.id && !x.found)
    if (left.length === 0) {
      round.win('다 찾았어요!')
      setTimeout(() => {
        const t = pick(PLAY_COLORS)
        setTarget(t)
        setBoard(makeBoard(t.id))
      }, 650)
    }
  }

  const found = board.filter((x) => x.colorId === target.id && x.found).length
  const need = board.filter((x) => x.colorId === target.id).length

  return (
    <GameShell title="색깔 자동차 찾기" subtitle="같은 색 자동차를 모두 찾아요" progress={round.progress}>
      <Confetti show={round.confetti} />
      {round.toast && <div className="toast">{round.toast}</div>}
      <div className="prompt">
        <div className="prompt-big" style={{ color: target.hex }}>
          {target.ko} 찾기! ({found}/{need})
        </div>
      </div>
      <div className="play-area">
        <div className="grid-3">
          {board.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`car-chip photo${item.found ? ' done' : ''}`}
              style={{ background: item.hex }}
              onClick={() => tap(item)}
            >
              <CharImg src={item.src} size={58} />
            </button>
          ))}
        </div>
        {round.done && (
          <button type="button" className="btn btn-sunny btn-block" style={{ marginTop: '0.8rem' }} onClick={round.reset}>
            또 찾기!
          </button>
        )}
      </div>
    </GameShell>
  )
}
