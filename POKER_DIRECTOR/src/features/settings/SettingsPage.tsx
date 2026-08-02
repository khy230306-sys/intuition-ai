import { useAppStore, roleLabel } from '@/stores/appStore'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Label, Select } from '@/components/ui/Input'
import { isCloudMode } from '@/services/supabase/client'
import { setLanguage } from '@/i18n'

export function SettingsPage() {
  const session = useAppStore((s) => s.session)
  const venues = useAppStore((s) => s.venues)
  const users = useAppStore((s) => s.users)
  const settings = useAppStore((s) => s.settings[0])
  const updateSettings = useAppStore((s) => s.updateSettings)
  const setVenue = useAppStore((s) => s.setVenue)
  const updateTournament = useAppStore((s) => s.updateTournament)
  const tournaments = useAppStore((s) => s.tournaments)

  if (session?.role !== 'admin' && session?.role !== 'director') {
    return <p className="text-mute">설정은 관리자/디렉터만 접근할 수 있습니다.</p>
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">시스템 설정</h1>
        <p className="text-sm text-mute">매장 · 알림 · 권한</p>
      </div>

      <Card className="space-y-3">
        <h2 className="font-semibold">매장</h2>
        <Select
          value={session?.currentVenueId}
          onChange={(e) => setVenue(e.target.value)}
        >
          {venues.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </Select>
        {venues
          .filter((v) => v.id === session?.currentVenueId)
          .map((v) => (
            <div key={v.id} className="space-y-2 text-sm">
              <div>연락처: {v.phone}</div>
              <div>주소: {v.address}</div>
              <div>
                기본 테이블 {v.defaultTableCount} · 좌석 {v.defaultSeatsPerTable} · {v.currency}
              </div>
              <div>운영 상태: {v.isActive ? '운영중' : '중지'}</div>
            </div>
          ))}
      </Card>

      <Card className="space-y-3">
        <h2 className="font-semibold">알림 / 언어</h2>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={settings?.soundEnabled ?? true}
            onChange={(e) => updateSettings({ soundEnabled: e.target.checked })}
          />
          알림음
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={settings?.voiceEnabled ?? true}
            onChange={(e) => updateSettings({ voiceEnabled: e.target.checked })}
          />
          음성 안내
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={settings?.vibrationEnabled ?? true}
            onChange={(e) => updateSettings({ vibrationEnabled: e.target.checked })}
          />
          진동
        </label>
        <div>
          <Label>언어</Label>
          <Select
            value={settings?.language ?? 'ko'}
            onChange={(e) => {
              const lang = e.target.value as 'ko' | 'en'
              updateSettings({ language: lang })
              setLanguage(lang)
            }}
          >
            <option value="ko">한국어</option>
            <option value="en">English</option>
          </Select>
        </div>
        <div>
          <Label>TV 테마</Label>
          <Select
            value={settings?.displayTheme ?? 'black_gold'}
            onChange={(e) =>
              updateSettings({
                displayTheme: e.target.value as NonNullable<typeof settings>['displayTheme'],
              })
            }
          >
            <option value="black_gold">블랙 골드</option>
            <option value="black_red">블랙 레드</option>
            <option value="navy_blue">네이비 블루</option>
            <option value="light">라이트 모드</option>
          </Select>
        </div>
      </Card>

      {session?.role === 'admin' ? (
        <Card>
          <h2 className="mb-2 font-semibold">직원 계정</h2>
          <div className="space-y-2 text-sm">
            {users.map((u) => (
              <div key={u.id} className="flex justify-between rounded-xl bg-felt-2 px-3 py-2">
                <span>
                  {u.displayName} ({u.username})
                </span>
                <span className="text-mute">{roleLabel(u.role)}</span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-mute">
            데모 모드 비밀번호는 환경변수로만 관리됩니다. 클라우드 모드에서는 Supabase Auth를 사용하세요.
          </p>
        </Card>
      ) : null}

      <Card className="space-y-2">
        <h2 className="font-semibold">연결 상태</h2>
        <p className="text-sm">{isCloudMode() ? 'Supabase 클라우드 모드' : '로컬 데모 모드'}</p>
        <Input readOnly value={isCloudMode() ? 'VITE_SUPABASE_URL 설정됨' : 'Supabase 미설정'} />
        <Button
          onClick={() => {
            const t = tournaments.find((x) => x.id === useAppStore.getState().selectedTournamentId)
            if (t) updateTournament(t.id, { announcement: t.announcement ?? '' })
          }}
        >
          설정 저장됨 (자동 저장)
        </Button>
      </Card>
    </div>
  )
}
