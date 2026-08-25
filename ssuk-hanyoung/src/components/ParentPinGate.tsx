import { useEffect, useState, type ReactNode } from 'react'
import { getParentSettings, resetParentSettingsOnly, setParentSettings } from '../lib/learningProgress'
import { hashPin, isParentUnlocked, lockParentSession, makeRecoveryToken, randomSalt, unlockParentSession, verifyPin } from '../lib/pin'
import { VisualIcon } from './visual/VisualIcon'
import { Character } from './visual/Character'

type Mode = 'entry' | 'setup' | 'confirm' | 'recover'

const LOCK_AFTER = 5
const LOCK_MS = 20_000

export function ParentPinGate({ children }: { children: ReactNode }) {
  const settings = getParentSettings()
  const [unlocked, setUnlocked] = useState(() => !settings.parentPinEnabled || isParentUnlocked())
  const [mode, setMode] = useState<Mode>(() => (settings.parentPinEnabled ? 'entry' : 'setup'))
  const [pin, setPin] = useState('')
  const [pending, setPending] = useState('')
  const [error, setError] = useState('')
  const [okMsg, setOkMsg] = useState('')
  const [fails, setFails] = useState(0)
  const [lockedUntil, setLockedUntil] = useState(0)
  const [now, setNow] = useState(Date.now())
  const [recoveryInput, setRecoveryInput] = useState('')
  const [showRecoveryCode, setShowRecoveryCode] = useState(false)

  useEffect(() => {
    if (lockedUntil <= Date.now()) return
    const t = window.setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(t)
  }, [lockedUntil])

  const waitSec = Math.max(0, Math.ceil((lockedUntil - now) / 1000))

  if (unlocked) {
    return (
      <div>
        {getParentSettings().parentPinEnabled && (
          <div className="pin-toolbar">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                lockParentSession()
                setUnlocked(false)
                setMode('entry')
                setPin('')
              }}
            >
              잠금
            </button>
          </div>
        )}
        {children}
        <PinSettingsPanel />
      </div>
    )
  }

  async function submitEntry() {
    if (waitSec > 0) return
    setError('')
    setOkMsg('')
    const s = getParentSettings()
    if (!(await verifyPin(pin, s.parentPinSalt, s.parentPinHash))) {
      const next = fails + 1
      setFails(next)
      setError('번호가 달라요. 다시 눌러 주세요')
      setPin('')
      if (next >= LOCK_AFTER) {
        setLockedUntil(Date.now() + LOCK_MS)
        setFails(0)
        setError('조금 쉬었다가 다시 해 보세요')
      }
      return
    }
    setFails(0)
    setOkMsg('열렸어요!')
    unlockParentSession()
    setUnlocked(true)
    setPin('')
  }

  async function submitSetup() {
    setError('')
    if (!/^\d{4}$/.test(pin)) {
      setError('숫자 네 자리를 눌러 주세요')
      return
    }
    setPending(pin)
    setPin('')
    setMode('confirm')
  }

  async function submitConfirm() {
    setError('')
    if (pin !== pending) {
      setError('두 번호가 달라요. 처음부터 다시요')
      setPin('')
      setPending('')
      setMode('setup')
      return
    }
    const salt = randomSalt()
    const digest = await hashPin(pin, salt)
    const token = makeRecoveryToken()
    setParentSettings({
      parentPinEnabled: true,
      parentPinSalt: salt,
      parentPinHash: digest,
      parentRecoveryToken: token,
    })
    unlockParentSession()
    setUnlocked(true)
    setPin('')
    setPending('')
    setShowRecoveryCode(true)
    setOkMsg('부모님 비밀번호를 저장했어요')
  }

  async function submitRecover() {
    const s = getParentSettings()
    if (!s.parentRecoveryToken || recoveryInput.trim() !== s.parentRecoveryToken) {
      setError('복구 코드가 맞지 않아요')
      return
    }
    resetParentSettingsOnly()
    lockParentSession()
    setError('')
    setMode('setup')
    setPin('')
    setRecoveryInput('')
  }

  return (
    <div className="pin-gate">
      <Character name="youngi" state={error ? 'sad' : okMsg ? 'happy' : 'thinking'} size="md" animate />
      <h1>부모님 공간</h1>
      <p className="section-sub">아이 놀이 화면과 따로 되어 있어요</p>
      <VisualIcon name="ui.lock" size={48} />

      {mode === 'entry' && (
        <>
          <p className="card-title">비밀번호 네 자리</p>
          {waitSec > 0 ? (
            <p className="pin-error">{waitSec}초 뒤에 다시 눌러 주세요</p>
          ) : (
            <PinPad value={pin} onChange={setPin} onSubmit={submitEntry} disabled={waitSec > 0} />
          )}
          {error && <p className="pin-error">{error}</p>}
          {okMsg && <p className="pin-ok">{okMsg}</p>}
          <button type="button" className="btn btn-ghost btn-block" style={{ marginTop: '0.7rem' }} onClick={() => setMode('recover')}>
            비밀번호를 잊었어요
          </button>
        </>
      )}

      {mode === 'setup' && (
        <>
          <p className="card-title">부모님 비밀번호 만들기</p>
          <p className="card-sub">숫자 네 자리를 정해요. 아이 화면에는 안 보여요.</p>
          <PinPad value={pin} onChange={setPin} onSubmit={submitSetup} />
          {error && <p className="pin-error">{error}</p>}
          <button
            type="button"
            className="btn btn-ghost btn-block"
            style={{ marginTop: '0.7rem' }}
            onClick={() => {
              setParentSettings({ parentPinEnabled: false, parentPinHash: null, parentPinSalt: null })
              unlockParentSession()
              setUnlocked(true)
            }}
          >
            지금은 비밀번호 없이 쓸게요
          </button>
        </>
      )}

      {mode === 'confirm' && (
        <>
          <p className="card-title">한 번 더 눌러 주세요</p>
          <PinPad value={pin} onChange={setPin} onSubmit={submitConfirm} />
          {error && <p className="pin-error">{error}</p>}
        </>
      )}

      {mode === 'recover' && (
        <>
          <p className="card-title">복구 코드</p>
          <p className="card-sub">별·스티커·놀이 기록은 그대로 두고, 부모님 설정만 지워요.</p>
          <input className="parent-input" value={recoveryInput} onChange={(e) => setRecoveryInput(e.target.value)} placeholder="복구 코드" />
          <button type="button" className="btn btn-sunny btn-block" style={{ marginTop: '0.7rem' }} onClick={submitRecover}>
            부모님 설정만 초기화
          </button>
          {error && <p className="pin-error">{error}</p>}
          <button type="button" className="btn btn-ghost btn-block" onClick={() => setMode('entry')}>
            돌아가기
          </button>
        </>
      )}

      {showRecoveryCode && (
        <div className="card soft-card" style={{ marginTop: '1rem' }}>
          <div className="card-title">복구 코드를 적어 두세요</div>
          <p className="card-sub">비밀번호를 잊었을 때 부모님 설정만 지울 수 있어요.</p>
          <code className="recovery-code">{getParentSettings().parentRecoveryToken}</code>
          <button type="button" className="btn btn-sky btn-block" style={{ marginTop: '0.6rem' }} onClick={() => setShowRecoveryCode(false)}>
            확인했어요
          </button>
        </div>
      )}
    </div>
  )
}

function PinPad({
  value,
  onChange,
  onSubmit,
  disabled,
}: {
  value: string
  onChange: (v: string) => void
  onSubmit: () => void
  disabled?: boolean
}) {
  function press(d: string) {
    if (disabled || value.length >= 4) return
    const next = value + d
    onChange(next)
    if (next.length === 4) setTimeout(onSubmit, 80)
  }
  return (
    <div>
      <div className="pin-slots" aria-label="비밀번호 입력">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={`pin-slot${value.length > i ? ' filled' : ''}${disabled ? ' locked' : ''}`} />
        ))}
      </div>
      <div className="pin-pad">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map((k) =>
          k === '' ? (
            <span key="sp" />
          ) : (
            <button
              key={k}
              type="button"
              className="pin-key anim-tap"
              disabled={disabled}
              onClick={() => {
                if (k === '⌫') onChange(value.slice(0, -1))
                else press(k)
              }}
            >
              {k}
            </button>
          ),
        )}
      </div>
    </div>
  )
}

function PinSettingsPanel() {
  const s = getParentSettings()
  const [mode, setMode] = useState<'idle' | 'change1' | 'change2'>('idle')
  const [pin, setPin] = useState('')
  const [pending, setPending] = useState('')
  const [msg, setMsg] = useState('')
  const [revealCode, setRevealCode] = useState(false)

  if (mode === 'idle') {
    return (
      <div className="card" style={{ marginTop: '1rem', marginBottom: '0.9rem' }}>
        <div className="card-title">부모님 비밀번호</div>
        <p className="card-sub">{s.parentPinEnabled ? '잠금이 켜져 있어요' : '잠금이 꺼져 있어요'}</p>
        <div className="chip-row">
          {!s.parentPinEnabled && (
            <button type="button" className="chip on" onClick={() => setMode('change1')}>
              비밀번호 만들기
            </button>
          )}
          {s.parentPinEnabled && (
            <>
              <button type="button" className="chip" onClick={() => setMode('change1')}>
                바꾸기
              </button>
              <button
                type="button"
                className="chip"
                onClick={() => {
                  setParentSettings({ parentPinEnabled: false, parentPinHash: null, parentPinSalt: null })
                  setMsg('잠금을 껐어요')
                }}
              >
                끄기
              </button>
              <button type="button" className="chip" onClick={() => setRevealCode((v) => !v)}>
                복구 코드
              </button>
            </>
          )}
        </div>
        {msg && <p className="card-sub">{msg}</p>}
        {revealCode && s.parentRecoveryToken && (
          <p className="card-sub" style={{ marginTop: '0.5rem' }}>
            복구 코드: <code>{s.parentRecoveryToken}</code>
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="card" style={{ marginTop: '1rem' }}>
      <div className="card-title">{mode === 'change1' ? '새 비밀번호' : '확인'}</div>
      <PinPad
        value={pin}
        onChange={setPin}
        onSubmit={async () => {
          if (mode === 'change1') {
            if (!/^\d{4}$/.test(pin)) return
            setPending(pin)
            setPin('')
            setMode('change2')
            return
          }
          if (pin !== pending) {
            setMsg('서로 달라요')
            setMode('change1')
            setPin('')
            return
          }
          const salt = randomSalt()
          const digest = await hashPin(pin, salt)
          const token = s.parentRecoveryToken || makeRecoveryToken()
          setParentSettings({ parentPinEnabled: true, parentPinSalt: salt, parentPinHash: digest, parentRecoveryToken: token })
          setMsg('저장했어요')
          setMode('idle')
          setPin('')
        }}
      />
      <button
        type="button"
        className="btn btn-ghost btn-block"
        onClick={() => {
          setMode('idle')
          setPin('')
        }}
      >
        취소
      </button>
    </div>
  )
}
