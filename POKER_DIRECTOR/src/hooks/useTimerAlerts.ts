import { useEffect, useRef } from 'react'
import { useAppStore } from '@/stores/appStore'
import { detectAlerts, getRemainingMs } from '@/utils/timer'
import { flashScreen, speakAlert, vibrateAlert } from '@/utils/alerts'

export function useTimerAlerts(tournamentId: string | null | undefined) {
  const timerStatus = useAppStore(
    (s) => s.timerStates.find((t) => t.tournamentId === tournamentId)?.status,
  )
  const timerMuted = useAppStore(
    (s) => s.timerStates.find((t) => t.tournamentId === tournamentId)?.muted ?? false,
  )
  const settings = useAppStore((s) => s.settings[0])
  const timerTick = useAppStore((s) => s.timerTick)
  const prevMs = useRef<number | null>(null)
  const prevIndex = useRef<number | null>(null)

  useEffect(() => {
    if (!tournamentId) return

    const id = window.setInterval(() => {
      timerTick(tournamentId)
      const current = useAppStore.getState().timerStates.find((t) => t.tournamentId === tournamentId)
      const t = useAppStore.getState().tournaments.find((x) => x.id === tournamentId)
      const struct = useAppStore.getState().blindStructures.find((b) => b.id === t?.blindStructureId)
      if (!current || !struct) return

      const ms = getRemainingMs(current)
      const advanced =
        prevIndex.current != null && current.currentLevelIndex !== prevIndex.current
      const level = struct.levels[current.currentLevelIndex] ?? null
      const prevLevel =
        prevIndex.current != null ? (struct.levels[prevIndex.current] ?? null) : null

      if (prevMs.current != null) {
        const alerts = detectAlerts(prevMs.current, ms, level, advanced, prevLevel)
        const soundOn = settings?.soundEnabled !== false
        const voiceOn = settings?.voiceEnabled !== false
        for (const kind of alerts) {
          if (!current.muted && soundOn) {
            speakAlert(kind, current.muted, voiceOn)
          }
          if (settings?.vibrationEnabled !== false) vibrateAlert(true)
          flashScreen()
        }
      }
      prevMs.current = ms
      prevIndex.current = current.currentLevelIndex
    }, 250)

    return () => window.clearInterval(id)
  }, [
    tournamentId,
    timerStatus,
    timerMuted,
    settings?.soundEnabled,
    settings?.voiceEnabled,
    settings?.vibrationEnabled,
    timerTick,
  ])
}
