import { useCallback, useState } from 'react'
import { addStars } from '../lib/store'
import { cheer } from '../lib/speech'

export function useRound(gameId: string, total = 5) {
  const [score, setScore] = useState(0)
  const [done, setDone] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [confetti, setConfetti] = useState(false)

  const win = useCallback(
    (message = '잘했어요!') => {
      setScore((s) => {
        const next = s + 1
        if (next >= total) {
          setDone(true)
          setConfetti(true)
          addStars(3, gameId)
          cheer()
          setTimeout(() => setConfetti(false), 1600)
        } else {
          addStars(1, gameId)
        }
        return next
      })
      setToast(message)
      window.setTimeout(() => setToast(null), 1200)
    },
    [gameId, total],
  )

  const reset = useCallback(() => {
    setScore(0)
    setDone(false)
    setConfetti(false)
    setToast(null)
  }, [])

  return { score, total, done, toast, confetti, win, reset, progress: score / total }
}
