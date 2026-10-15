import { useCallback, useRef, useState } from 'react'
import { addStars } from '../lib/store'
import { cheer } from '../lib/speech'
import { sfx } from '../lib/sfx'
import { recordLearningActivity } from '../lib/learningProgress'

export function useRound(gameId: string, total = 5) {
  const [score, setScore] = useState(0)
  const [done, setDone] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [confetti, setConfetti] = useState(false)
  const started = useRef(Date.now())

  const win = useCallback(
    (message = '잘했어요!') => {
      setScore((s) => {
        const next = s + 1
        if (next >= total) {
          setDone(true)
          setConfetti(true)
          addStars(3, gameId)
          sfx.win()
          cheer()
          setTimeout(() => setConfetti(false), 1600)
        } else {
          addStars(1, gameId)
          sfx.cheer()
        }
        return next
      })
      setToast(message)
      window.setTimeout(() => setToast(null), 1200)
    },
    [gameId, total],
  )

  const fail = useCallback(() => {
    recordLearningActivity({
      gameId,
      success: false,
      duration: Math.max(2, (Date.now() - started.current) / 1000),
      score: 0,
    })
    sfx.wrong()
  }, [gameId])

  const reset = useCallback(() => {
    setScore(0)
    setDone(false)
    setConfetti(false)
    setToast(null)
    started.current = Date.now()
  }, [])

  return { score, total, done, toast, confetti, win, fail, reset, progress: score / total }
}
