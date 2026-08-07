import { useEffect, useState } from 'react'
import { PLAY_COLORS, pick, shuffle } from '../data/colors'
import { speak } from '../lib/speech'
import { GameShell } from '../components/GameShell'
import { Confetti } from '../components/Confetti'
import { PaintSubject } from '../components/PaintSubject'
import { useRound } from './useRound'

type Racer = { id: string; colorId: string; hex: string; kind: string; left: number }

const KINDS = ['car', 'bus', 'fire', 'police', 'truck', 'ambulance']

function makeRacers(targetId: string): Racer[] {
  const others = shuffle(PLAY_COLORS.filter((c) => c.id !== targetId)).slice(0, 3)
  const target = PLAY_COLORS.find((c) => c.id === targetId)!
  const kinds = shuffle([...KINDS])
  return shuffle([target, ...others]).map((c, i) => ({
    id: `${c.id}-${i}`,
    colorId: c.id,
    hex: c.hex,
    kind: kinds[i % kinds.length]!,
    left: 8 + i * 2,
  }))
}

export function VroomRace() {
  const round = useRound('vroom-race', 6)
  const [target, setTarget] = useState(() => pick(PLAY_COLORS))
  const [racers, setRacers] = useState(() => makeRacers(target.id))
  const [wrong, setWrong] = useState<string | null>(null)

  useEffect(() => {
    speak(`${target.ko} 자동차를 탭해요! 부릉부릉!`)
  }, [target])

  function tap(r: Racer) {
    if (round.done) return
    if (r.colorId !== target.id) {
      setWrong(r.id)
      speak('다른 색깔이에요')
      setTimeout(() => setWrong(null), 350)
      return
    }
    setRacers((list) => list.map((x) => (x.id === r.id ? { ...x, left: 78 } : x)))
    speak('부릉부릉! 우승!')
    round.win('1등이에요!')
    setTimeout(() => {
      const next = pick(PLAY_COLORS)
      setTarget(next)
      setRacers(makeRacers(next.id))
    }, 650)
  }

  return (
    <GameShell title="부릉부릉 레이스" subtitle="말한 색깔 자동차를 탭해요" progress={round.progress}>
      <Confetti show={round.confetti} />
      {round.toast && <div className="toast">{round.toast}</div>}
      <div className="prompt">
        <div className="prompt-big" style={{ color: target.hex }}>
          {target.ko} 자동차!
        </div>
      </div>
      <div className="play-area">
        <div className="grid-2">
          {racers.map((r) => (
            <button
              key={r.id}
              type="button"
              className={`car-chip photo${wrong === r.id ? ' wrong' : ''}`}
              style={{ background: `${r.hex}33`, boxShadow: `0 0 0 5px ${r.hex}` }}
              onClick={() => tap(r)}
            >
              <PaintSubject kind={r.kind} color={r.hex} size={100} />
            </button>
          ))}
        </div>
        <div className="road" aria-hidden>
          {racers.map((r, i) => (
            <span key={r.id} className="racer photo" style={{ left: `${r.left}%`, bottom: `${0.15 + i * 1.5}rem` }}>
              <PaintSubject kind={r.kind} color={r.hex} size={44} />
            </span>
          ))}
        </div>
        <button type="button" className="btn btn-ghost btn-block" style={{ marginTop: '0.75rem' }} onClick={() => speak(`${target.ko} 자동차를 탭해요!`)}>
          다시 듣기
        </button>
        {round.done && (
          <button type="button" className="btn btn-sunny btn-block" style={{ marginTop: '0.6rem' }} onClick={round.reset}>
            다시 레이스!
          </button>
        )}
      </div>
    </GameShell>
  )
}
