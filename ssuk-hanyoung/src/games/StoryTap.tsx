import { useState } from 'react'
import { speak } from '../lib/speech'
import { sfx } from '../lib/sfx'
import { addStars } from '../lib/store'
import { GameShell } from '../components/GameShell'
import { Confetti } from '../components/Confetti'
import { PaintSubject } from '../components/PaintSubject'

type Page = {
  text: string
  kind: string
  color: string
  choices?: Array<{ label: string; next: number; good?: boolean; kind?: string; color?: string }>
}

const PAGES: Page[] = [
  {
    kind: 'bus',
    color: '#FFD400',
    text: '노란 버스가 인사해요. 오늘 어디로 갈까?',
    choices: [
      { label: '공원!', next: 1, good: true, kind: 'car', color: '#22C55E' },
      { label: '바다!', next: 2, good: true, kind: 'police', color: '#2F6BFF' },
    ],
  },
  {
    kind: 'car',
    color: '#FF2D55',
    text: '공원에서 빨간 차를 만났어요. 같이 달릴까요?',
    choices: [
      { label: '같이 달려요', next: 3, good: true, kind: 'car', color: '#FF2D55' },
      { label: '먼저 쉬어요', next: 4, kind: 'star', color: '#FFD400' },
    ],
  },
  {
    kind: 'police',
    color: '#2F6BFF',
    text: '바다에서 파란 경찰차가 손을 흔들어요!',
    choices: [
      { label: '빵빵 인사', next: 3, good: true, kind: 'police', color: '#2F6BFF' },
      { label: '모래성', next: 5, good: true, kind: 'sand', color: '#E8B86D' },
    ],
  },
  {
    kind: 'fire',
    color: '#FF7A00',
    text: '친구들과 부릉부릉! 신나게 달렸어요.',
    choices: [
      { label: '더 달려요', next: 6, good: true, kind: 'truck', color: '#FF7A00' },
      { label: '이야기 끝', next: 7, good: true, kind: 'star', color: '#FFD400' },
    ],
  },
  {
    kind: 'star',
    color: '#FFD400',
    text: '조금 쉬니 힘이 나요. 다시 출발!',
    choices: [{ label: '다시 달려요', next: 3, good: true, kind: 'car', color: '#FF2D55' }],
  },
  {
    kind: 'sand',
    color: '#E8B86D',
    text: '모래성을 쌓고 트럭 친구도 만났어요.',
    choices: [{ label: '같이 놀아요', next: 6, good: true, kind: 'truck', color: '#FF7A00' }],
  },
  {
    kind: 'truck',
    color: '#FF7A00',
    text: '덤프트럭이 짐칸을 기울여요. 으쌰!',
    choices: [{ label: '집으로!', next: 7, good: true, kind: 'bus', color: '#FFD400' }],
  },
  {
    kind: 'star',
    color: '#FF5DA2',
    text: '오늘 모험 끝! 별이 반짝반짝.',
  },
]

export function StoryTap() {
  const [page, setPage] = useState(0)
  const [confetti, setConfetti] = useState(false)
  const cur = PAGES[page]!

  function choose(next: number, good?: boolean) {
    if (good) {
      addStars(1, 'story-tap')
      sfx.tap()
    }
    speak(PAGES[next]?.text || '끝')
    setPage(next)
    if (next === 7) {
      sfx.win()
      setConfetti(true)
      setTimeout(() => setConfetti(false), 1400)
    }
  }

  return (
    <GameShell title="자동차 동화" subtitle="그림을 보고 골라요">
      <Confetti show={confetti} />
      <div className="play-area story-card">
        <div style={{ display: 'grid', placeItems: 'center', marginBottom: '0.5rem' }}>
          <PaintSubject kind={cur.kind} color={cur.color} size={150} />
        </div>
        <p className="story-text">{cur.text}</p>
        <div className="story-choices">
          {cur.choices?.map((c) => (
            <button key={c.label} type="button" className="story-choice" onClick={() => choose(c.next, c.good)}>
              <PaintSubject kind={c.kind || 'car'} color={c.color || '#FFD400'} size={52} />
              <span>{c.label}</span>
            </button>
          ))}
          {!cur.choices && (
            <button
              type="button"
              className="btn btn-sky"
              onClick={() => {
                setPage(0)
                speak('처음부터!')
              }}
            >
              처음부터
            </button>
          )}
        </div>
        <button type="button" className="btn btn-ghost btn-block" style={{ marginTop: '0.8rem' }} onClick={() => speak(cur.text)}>
          읽어 주세요
        </button>
      </div>
    </GameShell>
  )
}
