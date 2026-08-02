import { useEffect } from 'react'
import { HashRouter } from 'react-router-dom'
import { AppRouter } from '@/app/router'
import { useAppStore } from '@/stores/appStore'
import { SNAPSHOT_LS_KEY } from '@/services/storage/localDb'
import type { AppDataSnapshot } from '@/types'

export default function App() {
  const hydrate = useAppStore((s) => s.hydrate)
  const hydrated = useAppStore((s) => s.hydrated)
  const applyRemoteSnapshot = useAppStore((s) => s.applyRemoteSnapshot)

  useEffect(() => {
    void hydrate()
  }, [hydrate])

  // Keep TV / buy-in board tabs in sync with operator tab.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== SNAPSHOT_LS_KEY || !event.newValue) return
      try {
        const parsed = JSON.parse(event.newValue) as AppDataSnapshot
        if (parsed?.version) applyRemoteSnapshot(parsed)
      } catch {
        // ignore malformed payloads
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [applyRemoteSnapshot])

  if (!hydrated) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <div className="text-center">
          <div className="pd-title text-4xl text-gold">POKER DIRECTOR</div>
          <p className="mt-2 text-sm text-mute">불러오는 중…</p>
        </div>
      </div>
    )
  }

  return (
    <HashRouter>
      <AppRouter />
    </HashRouter>
  )
}
