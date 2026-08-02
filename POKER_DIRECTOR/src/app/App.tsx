import { useEffect } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { AppRouter } from '@/app/router'
import { useAppStore } from '@/stores/appStore'

export default function App() {
  const hydrate = useAppStore((s) => s.hydrate)
  const hydrated = useAppStore((s) => s.hydrated)

  useEffect(() => {
    void hydrate()
  }, [hydrate])

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
    <BrowserRouter>
      <AppRouter />
    </BrowserRouter>
  )
}
