import { speak } from '../lib/speech'
import { addStars } from '../lib/store'
import { GameShell } from '../components/GameShell'
import { useRef, useState } from 'react'

const SOUNDS = [
  { id: 'horn', emoji: '🚗', ko: '빵빵', say: '빵빵!' },
  { id: 'vroom', emoji: '🏎️', ko: '부릉', say: '부릉부릉!' },
  { id: 'siren', emoji: '🚓', ko: '삐뽀', say: '삐뽀삐뽀!' },
  { id: 'fire', emoji: '🚒', ko: '위잉', say: '위이잉!' },
  { id: 'bus', emoji: '🚌', ko: '버스', say: '버스가 출발해요!' },
  { id: 'train', emoji: '🚂', ko: '기차', say: '울릉울릉!' },
  { id: 'plane', emoji: '✈️', ko: '비행기', say: '슈우웅!' },
  { id: 'bike', emoji: '🚲', ko: '따르릉', say: '따르릉!' },
  { id: 'truck', emoji: '🚚', ko: '트럭', say: '털털털!' },
  { id: 'amb', emoji: '🚑', ko: '삐용', say: '삐용삐용!' },
  { id: 'cheer', emoji: '🎉', ko: '야호', say: '야호! 잘했어요!' },
  { id: 'sleep', emoji: '🌙', ko: '쿨쿨', say: '쿨쿨… 잘 자요' },
]

export function SoundBoard() {
  const [active, setActive] = useState<string | null>(null)
  const taps = useRef(0)

  function play(s: (typeof SOUNDS)[number]) {
    setActive(s.id)
    speak(s.say)
    taps.current += 1
    if (taps.current % 6 === 0) addStars(1, 'sound-board')
    setTimeout(() => setActive(null), 350)
  }

  return (
    <GameShell title="사운드보드" subtitle="버튼을 누르면 소리가 나요">
      <div className="prompt">
        <div className="prompt-big">크게 눌러 보아요!</div>
        <div className="prompt-sub">자동차 소리를 마음대로 내요</div>
      </div>
      <div className="play-area">
        <div className="grid-3">
          {SOUNDS.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`sound-btn${active === s.id ? ' on' : ''}`}
              onClick={() => play(s)}
            >
              <span className="card-emoji">{s.emoji}</span>
              <span className="card-title">{s.ko}</span>
            </button>
          ))}
        </div>
      </div>
    </GameShell>
  )
}
