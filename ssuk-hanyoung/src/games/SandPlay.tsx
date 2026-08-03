import { useMemo, useState } from 'react'
import { speak } from '../lib/speech'
import { addStars } from '../lib/store'
import { GameShell } from '../components/GameShell'
import { Confetti } from '../components/Confetti'
import { shuffle } from '../data/colors'

type Cell = {
  id: number
  dug: boolean
  treasure?: string
}

const TREASURES = ['🚗', '🚌', '🚓', '🚒', '⭐', '🐚', '🦴', '🔑', '💎', '🧸']

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
      speak(`우와! ${cell.treasure}`)
      const n = found + 1
      setFound(n)
      setToast('보물 발견!')
      addStars(1, 'sand-play')
      if (n >= need) {
        setConfetti(true)
        speak('모래 속 보물을 다 찾았어요!')
        setTimeout(() => setConfetti(false), 1400)
      }
    } else {
      speak('모래만 나왔어요')
    }
    setTimeout(() => setToast(null), 900)
  }

  function stackCastle() {
    const n = Math.min(5, castle + 1)
    setCastle(n)
    speak(n >= 5 ? '모래성 완성!' : '모래를 쌓아요')
    if (n >= 5) {
      addStars(2, 'sand-play')
      setConfetti(true)
      setToast('멋진 모래성!')
      setTimeout(() => {
        setConfetti(false)
        setToast(null)
        setCastle(0)
      }, 1400)
    }
  }

  return (
    <GameShell title="모래놀이" subtitle="모래를 파고, 모래성을 쌓아요">
      <Confetti show={confetti} />
      {toast && <div className="toast">{toast}</div>}
      <div className="filter-row">
        <button type="button" className={`chip${mode === 'dig' ? ' on' : ''}`} onClick={() => setMode('dig')}>
          🏖️ 보물 찾기
        </button>
        <button type="button" className={`chip${mode === 'castle' ? ' on' : ''}`} onClick={() => setMode('castle')}>
          🏰 모래성
        </button>
      </div>

      {mode === 'dig' ? (
        <>
          <div className="prompt">
            <div className="prompt-big">
              모래를 터치! ({found}/{need})
            </div>
            <div className="prompt-sub">숨겨진 자동차와 보물을 찾아요</div>
          </div>
          <div className="play-area sand-box">
            <div className="sand-grid">
              {board.map((cell) => (
                <button
                  key={cell.id}
                  type="button"
                  className={`sand-cell${cell.dug ? ' dug' : ''}`}
                  onClick={() => dig(cell)}
                >
                  {cell.dug ? cell.treasure || '·' : '모래'}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="btn btn-sunny btn-block"
              style={{ marginTop: '0.8rem' }}
              onClick={() => {
                setBoard(makeBoard())
                setFound(0)
                speak('새 모래판이에요')
              }}
            >
              새 모래판
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="prompt">
            <div className="prompt-big">모래성을 쌓아요 ({castle}/5)</div>
            <div className="prompt-sub">화면을 계속 터치해요</div>
          </div>
          <div className="play-area sand-box castle-area" onClick={stackCastle} role="button" tabIndex={0}>
            <div className="castle-stack">
              {Array.from({ length: castle }, (_, i) => (
                <div key={i} className="castle-block" style={{ width: `${70 - i * 8}%` }}>
                  {i === castle - 1 ? '🚩' : ''}
                </div>
              ))}
              {castle === 0 && <p className="prompt-sub">여기를 터치해서 쌓기!</p>}
            </div>
          </div>
        </>
      )}
    </GameShell>
  )
}
