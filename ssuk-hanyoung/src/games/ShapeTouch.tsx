import { useEffect, useMemo } from 'react'
import { speak } from '../lib/speech'
import { sfx } from '../lib/sfx'
import { GameShell } from '../components/GameShell'
import { Confetti } from '../components/Confetti'
import { useRound } from './useRound'
import { shuffle } from '../data/colors'

const SHAPES = [
  { id: 'circle', ko: '동그라미', color: '#2F6BFF' },
  { id: 'square', ko: '네모', color: '#22C55E' },
  { id: 'triangle', ko: '세모', color: '#FF7A00' },
  { id: 'star', ko: '별', color: '#FFD400' },
  { id: 'heart', ko: '하트', color: '#FF2D55' },
] as const

function ShapeArt({ id, color, size = 88 }: { id: string; color: string; size?: number }) {
  const s = { width: size, height: size, viewBox: '0 0 96 96', 'aria-hidden': true as const }
  switch (id) {
    case 'square':
      return (
        <svg {...s}>
          <rect x="18" y="18" width="60" height="60" rx="10" fill={color} stroke="#1a1510" strokeWidth="4" />
        </svg>
      )
    case 'triangle':
      return (
        <svg {...s}>
          <path d="M48 14l34 64H14z" fill={color} stroke="#1a1510" strokeWidth="4" strokeLinejoin="round" />
        </svg>
      )
    case 'star':
      return (
        <svg {...s}>
          <path
            d="M48 12l9 20 22 2-17 14 5 22-19-12-19 12 5-22-17-14 22-2z"
            fill={color}
            stroke="#1a1510"
            strokeWidth="3.5"
            strokeLinejoin="round"
          />
        </svg>
      )
    case 'heart':
      return (
        <svg {...s}>
          <path
            d="M48 78C22 58 14 42 14 30c0-10 8-18 18-18 8 0 14 4 16 10 2-6 8-10 16-10 10 0 18 8 18 18 0 12-8 28-34 48z"
            fill={color}
            stroke="#1a1510"
            strokeWidth="3.5"
          />
        </svg>
      )
    default:
      return (
        <svg {...s}>
          <circle cx="48" cy="48" r="30" fill={color} stroke="#1a1510" strokeWidth="4" />
        </svg>
      )
  }
}

export function ShapeTouch() {
  const round = useRound('shape-touch', 6)
  const target = useMemo(() => {
    void round.score
    return shuffle([...SHAPES])[0]!
  }, [round.score])
  const choices = useMemo(() => shuffle([...SHAPES]).slice(0, 4), [target])

  useEffect(() => {
    speak(`${target.ko}를 찾아요`)
  }, [target])

  function pick(id: string) {
    if (round.done) return
    if (id === target.id) {
      sfx.win()
      speak(`맞아요! ${target.ko}`)
      round.win('잘했어요!')
    } else {
      round.fail()
      speak('다시 찾아 보아요')
    }
  }

  return (
    <GameShell title="모양 찾기" subtitle="들은 모양을 찾아요" progress={round.progress}>
      <Confetti show={round.confetti} />
      {round.toast && <div className="toast">{round.toast}</div>}
      <div className="prompt">
        <div className="prompt-big">{target.ko} 찾기!</div>
        <button type="button" className="btn btn-ghost" style={{ marginTop: 8 }} onClick={() => speak(`${target.ko}를 찾아요`)}>
          다시 듣기
        </button>
      </div>
      <div className="play-area">
        <div className="grid-2">
          {choices.map((s) => (
            <button key={s.id} type="button" className="card big-touch art-card" onClick={() => pick(s.id)}>
              <div style={{ display: 'grid', placeItems: 'center' }}>
                <ShapeArt id={s.id} color={s.color} size={96} />
              </div>
              <div className="card-title" style={{ textAlign: 'center' }}>
                {s.ko}
              </div>
            </button>
          ))}
        </div>
        {round.done && (
          <button type="button" className="btn btn-sunny btn-block" style={{ marginTop: '0.8rem' }} onClick={round.reset}>
            또 해요!
          </button>
        )}
      </div>
    </GameShell>
  )
}
