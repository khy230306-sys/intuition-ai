import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAppStore } from '@/stores/appStore'
import { isCloudMode } from '@/services/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input, Label } from '@/components/ui/Input'
import { t } from '@/i18n'
import { getDemoCredentials } from '@/data/demo'

export function LoginPage() {
  const session = useAppStore((s) => s.session)
  const login = useAppStore((s) => s.login)
  const lastError = useAppStore((s) => s.lastError)
  const navigate = useNavigate()
  const creds = getDemoCredentials()
  const [username, setUsername] = useState(creds.username)
  const [password, setPassword] = useState('')

  if (session) return <Navigate to="/" replace />

  return (
    <div className="pd-safe mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4">
      <div className="mb-8 text-center">
        <div className="pd-title text-5xl text-gold sm:text-6xl">{t('appName')}</div>
        <p className="mt-2 text-sm text-mute sm:text-base">{t('subtitle')}</p>
        <p className="mt-3 text-xs text-mute">
          {isCloudMode() ? '클라우드 모드' : '로컬 데모 모드'}
        </p>
      </div>

      <form
        className="rounded-2xl border border-line bg-panel/90 p-5"
        onSubmit={(e) => {
          e.preventDefault()
          if (login(username.trim(), password.trim())) navigate('/')
        }}
      >
        <div className="mb-3">
          <Label htmlFor="username">{t('username')}</Label>
          <Input
            id="username"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>
        <div className="mb-4">
          <Label htmlFor="password">{t('password')}</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="1234"
          />
        </div>
        {lastError ? <p className="mb-3 text-sm text-rose-300">{lastError}</p> : null}
        <Button type="submit" variant="gold" block size="lg">
          {t('login')}
        </Button>
        <Button
          type="button"
          variant="secondary"
          block
          className="mt-2"
          onClick={() => {
            setUsername(creds.username)
            setPassword(creds.password)
            if (login(creds.username, creds.password)) navigate('/')
          }}
        >
          데모 계정으로 바로 입장
        </Button>
        {!isCloudMode() ? (
          <p className="mt-4 text-center text-xs text-mute">{t('demoHint')}</p>
        ) : (
          <p className="mt-4 text-center text-xs text-mute">
            Supabase Auth 연동 후 이메일 로그인을 사용할 수 있습니다.
          </p>
        )}
        <p className="mt-3 text-center text-xs text-mute">
          로그인 후 더보기 → 사용 설명서에서 전체 안내를 볼 수 있습니다.
        </p>
      </form>
    </div>
  )
}
