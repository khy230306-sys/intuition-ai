import { useCallback, useEffect, useRef, useState } from 'react'
import { addStars } from '../lib/store'
import { cheer } from '../lib/speech'
import { sfx } from '../lib/sfx'
import { recordAbandon, recordFailure, recordRetry } from '../lib/learningEvents'

export function useRound(gameId: string, total = 5) {
  const [score, setScore] = useState(0)
  const [done, setDone] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [confetti, setConfetti] = useState(false)
  const started = useRef(Date.now())
  const finished = useRef(false)

  useEffect(() => {
    return () => {
      if (!finished.current && Date.now() - started.current > 4000) {
        recordAbandon(gameId, (Date.now() - started.current) / 1000)
      }
    }
  }, [gameId])

  const win = useCallback(
    (message = '잘했어요!') => {
      setScore((s) => {
        const next = s + 1
        if (next >= total) {
          finished.current = true
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
    recordFailure(gameId, { duration: Math.max(2, (Date.now() - started.current) / 1000) })
    sfx.wrong()
  }, [gameId])

  const retry = useCallback(() => {
    recordRetry(gameId)
  }, [gameId])

  const reset = useCallback(() => {
    setScore(0)
    setDone(false)
    setConfetti(false)
    setToast(null)
    started.current = Date.now()
    finished.current = false
  }, [])

  return { score, total, done, toast, confetti, win, fail, retry, reset, progress: score / total }
}
