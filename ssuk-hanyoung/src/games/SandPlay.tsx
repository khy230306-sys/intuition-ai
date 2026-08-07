import { useMemo, useState } from 'react'
import { speak } from '../lib/speech'
import { sfx } from '../lib/sfx'
import { addStars } from '../lib/store'
import { GameShell } from '../components/GameShell'
import { Confetti } from '../components/Confetti'
import { PaintSubject } from '../components/PaintSubject'
import { shuffle } from '../data/colors'

type Cell = {
  id: number
  dug: boolean
  treasure?: { kind: string; color: string; ko: string }
}

const TREASURES = [
  { kind: 'car', color: '#FF2D55', ko: '자동차' },
  { kind: 'bus', color: '#FFD400', ko: '버스' },
  { kind: 'police', color: '#2F6BFF', ko: '경찰차' },
  { kind: 'fire', color: '#FF7A00', ko: '소방차' },
  { kind: 'star', color: '#FFD400', ko: '별' },
]

function makeBoard(): Cell[] {
  const spots = shuffle([...Array(12).keys()]).slice(0, 5)
  return Array.from({ length: 12 }, (_, id) => ({
    id,
    dug: false,
    treasure: spots.includes(id) ? TREASURES[spots.indexOf(id) % TREASURES.length] : undefined,
  }))
}

export function SandPlay() {
  const [mode, setMode] = useState<'dig' | 'castle'>('dig')
  const [board, setBoard] = useState(makeBoard)
  const [castle, setCastle] = useState(0)
  const [found, setFound] = useState(0)
  const [confetti, setConfetti] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const need = useMemo(() => board.filter((c) => c.treasure).length, [board])

  function dig(cell: Cell) {
    if (cell.dug) return
    const next = board.map((c) => (c.id === cell.id ? { ...c, dug: true } : c))
    setBoard(next)
    if (cell.treasure) {
      sfx.cheer()
      speak(`${cell.treasure.ko}!`)
      const n = found + 1
      setFound(n)
      setToast('보물!')
      addStars(1, 'sand-play')
      if (n >= need) {
        setConfetti(true)
        sfx.win()
        speak('다 찾았어요!')
        setTimeout(() => setConfetti(false), 1400)
      }
    } else {
      sfx.tap()
      speak('모래예요')
    }
    setTimeout(() => setToast(null), 900)
  }

  function stackCastle() {
    const n = Math.min(5, castle + 1)
    setCastle(n)
    sfx.tap()
    speak(n >= 5 ? '모래성 완성!' : '쌓아요')
    if (n >= 5) {
      addStars(2, 'sand-play')
      sfx.win()
      setConfetti(true)
      setToast('완성!')
      setTimeout(() => {
        setConfetti(false)
        setToast(null)
        setCastle(0)
      }, 1400)
    }
  }

  return (
    <GameShell title="모래놀이" subtitle="파고, 쌓아요">
      <Confetti show={confetti} />
      {toast && <div className="toast">{toast}</div>}
      <div className="filter-row">
        <button type="button" className={`chip${mode === 'dig' ? ' on' : ''}`} onClick={() => setMode('dig')}>
          보물 찾기
        </button>
        <button type="button" className={`chip${mode === 'castle' ? ' on' : ''}`} onClick={() => setMode('castle')}>
          모래성
        </button>
      </div>
      <div className="play-area">
        {mode === 'dig' ? (
          <>
            <div className="prompt-big" style={{ marginBottom: '0.6rem' }}>
              보물 {found}/{need}
            </div>
            <div className="grid-3">
              {board.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className="sand-cell"
                  onClick={() => dig(c)}
                  style={{ background: c.dug ? '#f5e6c8' : '#e8c07a' }}
                >
                  {c.dug ? (
                    c.treasure ? (
                      <PaintSubject kind={c.treasure.kind} color={c.treasure.color} size={48} />
                    ) : (
                      <span style={{ color: 'var(--muted)' }}>·</span>
                    )
                  ) : (
                    <PaintSubject kind="sand" color="#D4A574" size={40} />
                  )}
                </button>
              ))}
            </div>
            {found >= need && (
              <button
                type="button"
                className="btn btn-sunny btn-block"
                style={{ marginTop: '0.8rem' }}
                onClick={() => {
                  setBoard(makeBoard())
                  setFound(0)
                }}
              >
                또 찾기!
              </button>
            )}
          </>
        ) : (
          <>
            <div className="prompt-big">모래성 {castle}/5</div>
            <div style={{ display: 'grid', placeItems: 'center', minHeight: '10rem' }}>
              <PaintSubject kind="sand" color="#E8B86D" size={80 + castle * 16} />
            </div>
            <button type="button" className="btn btn-sunny btn-lg btn-block" onClick={stackCastle}>
              모래 쌓기
            </button>
          </>
        )}
      </div>
    </GameShell>
  )
}
