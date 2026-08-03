import { useState } from 'react'
import { speak } from '../lib/speech'
import { addStars } from '../lib/store'
import { GameShell } from '../components/GameShell'
import { Confetti } from '../components/Confetti'

type Page = {
  text: string
  emoji: string
  choices?: Array<{ label: string; next: number; good?: boolean }>
}

const PAGES: Page[] = [
  {
    emoji: '🚌',
    text: '노란 버스가 아침 인사를 해요. “오늘 어디로 갈까?”',
    choices: [
      { label: '공원으로!', next: 1, good: true },
      { label: '바다로!', next: 2, good: true },
    ],
  },
  {
    emoji: '🌳',
    text: '공원에서 빨간 자동차 친구를 만났어요. 함께 달릴까요?',
    choices: [
      { label: '같이 달려요', next: 3, good: true },
      { label: '먼저 쉬어요', next: 4 },
    ],
  },
  {
    emoji: '🌊',
    text: '바다에서 파란 경찰차가 손을 흔들어요. 인사할까요?',
    choices: [
      { label: '빵빵! 인사', next: 3, good: true },
      { label: '모래성 쌓기', next: 4, good: true },
    ],
  },
  {
    emoji: '🏁',
    text: '친구들과 신나게 달렸어요. 부릉부릉! 정말 즐거워요.',
    choices: [{ label: '이야기 끝!', next: 5, good: true }],
  },
  {
    emoji: '😴',
    text: '조금 쉬고 나니 힘이 나요. 다시 출발!',
    choices: [{ label: '다시 달려요', next: 3, good: true }],
  },
  {
    emoji: '⭐',
    text: '오늘 모험 끝! 별이 반짝반짝 인사해요.',
  },
]

export function StoryTap() {
  const [page, setPage] = useState(0)
  const [confetti, setConfetti] = useState(false)
  const cur = PAGES[page]!

  function choose(next: number, good?: boolean) {
    if (good) addStars(1, 'story-tap')
    speak(PAGES[next]?.text.slice(0, 24) || '끝')
    setPage(next)
    if (next === 5) {
      setConfetti(true)
      setTimeout(() => setConfetti(false), 1400)
    }
  }

  return (
    <GameShell title="자동차 동화" subtitle="선택을 눌러 이야기를 진행해요">
      <Confetti show={confetti} />
      <div className="play-area story-card">
        <div className="story-emoji">{cur.emoji}</div>
        <p className="story-text">{cur.text}</p>
        <div className="parts" style={{ marginTop: '1rem' }}>
          {cur.choices?.map((c) => (
            <button key={c.label} type="button" className="btn btn-sunny" onClick={() => choose(c.next, c.good)}>
              {c.label}
            </button>
          ))}
          {!cur.choices && (
            <button
              type="button"
              className="btn btn-sky"
              onClick={() => {
                setPage(0)
                speak('처음부터 다시!')
              }}
            >
              처음부터
            </button>
          )}
        </div>
        <button type="button" className="btn btn-ghost btn-block" style={{ marginTop: '0.8rem' }} onClick={() => speak(cur.text)}>
          읽어 주세요 🔊
        </button>
      </div>
    </GameShell>
  )
}
