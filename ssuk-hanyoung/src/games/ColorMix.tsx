import { useMemo, useState } from 'react'
import { speak } from '../lib/speech'
import { GameShell } from '../components/GameShell'
import { Confetti } from '../components/Confetti'
import { useRound } from './useRound'
import { shuffle } from '../data/colors'

type Mix = { a: string; b: string; result: string; aHex: string; bHex: string; rHex: string; label: string }

const MIXES: Mix[] = [
  { a: '빨강', b: '노랑', result: '주황', aHex: '#FF2D55', bHex: '#FFD400', rHex: '#FF7A00', label: '주황색' },
  { a: '파랑', b: '노랑', result: '초록', aHex: '#2F6BFF', bHex: '#FFD400', rHex: '#22C55E', label: '초록색' },
  { a: '빨강', b: '파랑', result: '보라', aHex: '#FF2D55', bHex: '#2F6BFF', rHex: '#8B5CF6', label: '보라색' },
  { a: '빨강', b: '하얀', result: '분홍', aHex: '#FF2D55', bHex: '#FFF8E7', rHex: '#FF5DA2', label: '분홍색' },
]

const DECOY_HEX: Record<string, string> = {
  검정: '#1A1510',
  하늘: '#38BDF8',
  갈색: '#B86B3C',
  주황: '#FF7A00',
  초록: '#22C55E',
  보라: '#8B5CF6',
  분홍: '#FF5DA2',
}

export function ColorMix() {
  const round = useRound('color-mix', 4)
  const mix = useMemo(() => {
    void round.score
    return shuffle(MIXES)[0]!
  }, [round.score])
  const [picked, setPicked] = useState<string[]>([])
  const choices = useMemo(() => shuffle([mix.result, ...shuffle(['검정', '하늘', '갈색']).slice(0, 2)]), [mix])

  function add(color: 'a' | 'b') {
    const name = color === 'a' ? mix.a : mix.b
    if (picked.includes(name)) return
    const next = [...picked, name]
    setPicked(next)
    speak(name)
  }

  function answer(result: string) {
    if (picked.length < 2) {
      speak('먼저 두 색깔을 섞어요')
      return
    }
    if (result === mix.result) {
      speak(`${mix.label}이 되었어요!`)
      round.win('색깔 마법!')
      setPicked([])
    } else {
      speak('다른 색깔이에요')
    }
  }

  const pot =
    picked.length === 0
      ? '#eee5d4'
      : picked.length === 1
        ? picked[0] === mix.a
          ? mix.aHex
          : mix.bHex
        : mix.rHex

  return (
    <GameShell title="색깔 섞기" subtitle="두 색을 섞어 새 색을 만들어요" progress={round.progress}>
      <Confetti show={round.confetti} />
      {round.toast && <div className="toast">{round.toast}</div>}
      <div className="prompt">
        <div className="prompt-big">
          {mix.a} + {mix.b} = ?
        </div>
      </div>
      <div className="play-area">
        <div className="mix-pot" style={{ background: pot }}>
          {picked.length < 2 ? '섞어 보아요' : '?'}
        </div>
        <div className="parts">
          <button type="button" className="part" style={{ background: mix.aHex, color: '#fff' }} onClick={() => add('a')}>
            {mix.a}
          </button>
          <button
            type="button"
            className="part"
            style={{ background: mix.bHex, color: mix.b === '하얀' || mix.b === '노랑' ? '#1a1510' : '#fff' }}
            onClick={() => add('b')}
          >
            {mix.b}
          </button>
          <button type="button" className="part" onClick={() => setPicked([])}>
            비우기
          </button>
        </div>
        <h3 className="section-title">무엇이 됐을까요?</h3>
        <div className="grid-3">
          {choices.map((c) => {
            const hex = c === mix.result ? mix.rHex : DECOY_HEX[c] || '#ccc'
            return (
              <button
                key={c}
                type="button"
                className="swatch bold"
                style={{ background: hex, color: c === '노랑' || c === '하늘' || hex === '#FFF8E7' ? '#1a1510' : '#fff' }}
                onClick={() => answer(c)}
              >
                {c}
              </button>
            )
          })}
        </div>
        {round.done && (
          <button type="button" className="btn btn-sunny btn-block" style={{ marginTop: '0.8rem' }} onClick={round.reset}>
            또 섞어요!
          </button>
        )}
      </div>
    </GameShell>
  )
}
