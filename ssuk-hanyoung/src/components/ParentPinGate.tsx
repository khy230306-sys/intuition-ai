import { useState, type ReactNode } from 'react'
import { getParentSettings, resetParentSettingsOnly, setParentSettings } from '../lib/learningProgress'
import { hashPin, isParentUnlocked, lockParentSession, makeRecoveryToken, randomSalt, unlockParentSession, verifyPin } from '../lib/pin'
import { VisualIcon } from './visual/VisualIcon'
import { Character } from './visual/Character'

type Mode = 'entry' | 'setup' | 'confirm' | 'change' | 'recover'

export function ParentPinGate({ children }: { children: ReactNode }) {
  const settings = getParentSettings()
  const [unlocked, setUnlocked] = useState(() => !settings.parentPinEnabled || isParentUnlocked())
  const [mode, setMode] = useState<Mode>(() => (settings.parentPinEnabled ? 'entry' : 'setup'))
  const [pin, setPin] = useState('')
  const [pending, setPending] = useState('')
  const [error, setError] = useState('')
  const [recoveryInput, setRecoveryInput] = useState('')
  const [showRecovery, setShowRecovery] = useState(false)

  if (unlocked) {
    return (
      <div>
        {settings.parentPinEnabled && (
          <div className="pin-toolbar">
            <button type="button" className="btn btn-ghost" onClick={() => { lockParentSession(); setUnlocked(false); setMode('entry'); setPin('') }}>
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
    setError('')
    const s = getParentSettings()
    if (!(await verifyPin(pin, s.parentPinSalt, s.parentPinHash))) {
      setError('PIN이 맞지 않아요')
      setPin('')
      return
    }
    unlockParentSession()
    setUnlocked(true)
    setPin('')
  }

  async function submitSetup() {
    setError('')
    if (!/^\d{4}$/.test(pin)) {
      setError('숫자 4자리를 입력해요')
      return
    }
    setPending(pin)
    setPin('')
    setMode('confirm')
  }

  async function submitConfirm() {
    setError('')
    if (pin !== pending) {
      setError('PIN이 서로 달라요. 다시 설정해요')
      setPin('')
      setPending('')
      setMode('setup')
      return
    }
    const salt = randomSalt()
    const hash = await hashPin(pin, salt)
    const token = makeRecoveryToken()
    setParentSettings({
      parentPinEnabled: true,
      parentPinSalt: salt,
      parentPinHash: hash,
      parentRecoveryToken: token,
    })
    unlockParentSession()
    setUnlocked(true)
    setPin('')
    setPending('')
    setShowRecovery(true)
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
    setShowRecovery(false)
  }

  return (
    <div className="pin-gate">
      <Character name="youngi" state="thinking" size="md" animate />
      <h1>부모님 공간</h1>
      <p className="section-sub">아이 화면과 분리된 설정이에요</p>
      <VisualIcon name="ui.lock" size={48} />

      {mode === 'entry' && (
        <>
          <p className="card-title">PIN 4자리</p>
          <PinPad value={pin} onChange={setPin} onSubmit={submitEntry} />
          {error && <p className="pin-error">{error}</p>}
          <button type="button" className="btn btn-ghost btn-block" style={{ marginTop: '0.7rem' }} onClick={() => setMode('recover')}>
            PIN을 잊었어요 (부모 설정만 초기화)
          </button>
        </>
      )}

      {mode === 'setup' && (
        <>
          <p className="card-title">새 PIN 설정</p>
          <p className="card-sub">숫자 4자리를 정해요</p>
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
            지금은 PIN 없이 쓸게요
          </button>
        </>
      )}

      {mode === 'confirm' && (
        <>
          <p className="card-title">한 번 더 입력</p>
          <PinPad value={pin} onChange={setPin} onSubmit={submitConfirm} />
          {error && <p className="pin-error">{error}</p>}
        </>
      )}

      {mode === 'recover' && (
        <>
          <p className="card-title">복구 코드</p>
          <p className="card-sub">별·스티커·놀이 기록은 그대로 두고, 부모 설정(PIN 포함)만 지워요.</p>
          <input className="parent-input" value={recoveryInput} onChange={(e) => setRecoveryInput(e.target.value)} placeholder="복구 코드" />
          <button type="button" className="btn btn-sunny btn-block" style={{ marginTop: '0.7rem' }} onClick={submitRecover}>
            부모 설정 초기화
          </button>
          {error && <p className="pin-error">{error}</p>}
          <button type="button" className="btn btn-ghost btn-block" onClick={() => setMode('entry')}>
            돌아가기
          </button>
        </>
      )}

      {showRecovery && (
        <div className="card soft-card" style={{ marginTop: '1rem' }}>
          <div className="card-title">복구 코드를 저장하세요</div>
          <p className="card-sub">PIN을 잊었을 때 부모 설정만 초기화할 수 있어요.</p>
          <code className="recovery-code">{getParentSettings().parentRecoveryToken}</code>
          <button type="button" className="btn btn-sky btn-block" style={{ marginTop: '0.6rem' }} onClick={() => setShowRecovery(false)}>
            확인했어요
          </button>
        </div>
      )}
    </div>
  )
}

function PinPad({ value, onChange, onSubmit }: { value: string; onChange: (v: string) => void; onSubmit: () => void }) {
  function press(d: string) {
    if (value.length >= 4) return
    const next = value + d
    onChange(next)
    if (next.length === 4) setTimeout(onSubmit, 80)
  }
  return (
    <div>
      <div className="pin-slots" aria-label="PIN 입력">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={`pin-slot${value.length > i ? ' filled' : ''}`} />
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

  if (mode === 'idle') {
    return (
      <div className="card" style={{ marginTop: '1rem', marginBottom: '0.9rem' }}>
        <div className="card-title">부모 PIN</div>
        <p className="card-sub">{s.parentPinEnabled ? 'PIN 잠금이 켜져 있어요' : 'PIN 잠금이 꺼져 있어요'}</p>
        <div className="chip-row">
          {!s.parentPinEnabled && (
            <button type="button" className="chip on" onClick={() => setMode('change1')}>
              PIN 설정
            </button>
          )}
          {s.parentPinEnabled && (
            <>
              <button type="button" className="chip" onClick={() => setMode('change1')}>
                PIN 변경
              </button>
              <button
                type="button"
                className="chip"
                onClick={() => {
                  setParentSettings({ parentPinEnabled: false, parentPinHash: null, parentPinSalt: null })
                  setMsg('PIN을 껐어요')
                }}
              >
                PIN 끄기
              </button>
            </>
          )}
        </div>
        {msg && <p className="card-sub">{msg}</p>}
        {s.parentRecoveryToken && (
          <p className="card-sub" style={{ marginTop: '0.5rem' }}>
            복구 코드: <code>{s.parentRecoveryToken}</code>
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="card" style={{ marginTop: '1rem' }}>
      <div className="card-title">{mode === 'change1' ? '새 PIN' : '확인'}</div>
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
          const hash = await hashPin(pin, salt)
          const token = s.parentRecoveryToken || makeRecoveryToken()
          setParentSettings({ parentPinEnabled: true, parentPinSalt: salt, parentPinHash: hash, parentRecoveryToken: token })
          setMsg('PIN을 저장했어요')
          setMode('idle')
          setPin('')
        }}
      />
      <button type="button" className="btn btn-ghost btn-block" onClick={() => { setMode('idle'); setPin('') }}>
        취소
      </button>
    </div>
  )
}
