import { useEffect, useMemo, useRef, useState } from 'react'
import type { AppSettings, BalanceSnapshot, RoundResult, Side } from './nexus/types'
import { DEFAULT_APP_SETTINGS, type ActualResult } from './nexus/types'
import { analyzeSession, type SessionAnalysis } from './nexus/engines'
import { db, exportBackup, importBackup, getLatestShoeId, loadAppSettings, saveAppSettings, saveMartingaleState } from './nexus/db'
import { simulateMartingale } from './nexus/martingale'
import { createInitialScannerState, ScannerClient, type ScannerState } from './nexus/scannerClient'
import { deriveSeedFromString } from './nexus/prng'
import { resolveScannerWebSocketUrl } from './nexus/wsUrl'
import './nexus/app.css'

function formatSide(s: Side | null) {
  if (!s) return 'WAIT'
  return s === 'PLAYER' ? 'PLAYER' : 'BANKER'
}

function colorForSide(s: Side | null) {
  if (!s) return 'var(--text)'
  return s === 'PLAYER' ? '#4f46e5' : '#ef4444'
}

function toActualResult(actual: RoundResult['actual']): ActualResult {
  if (actual === 'TIE') return { type: 'TIE', side: 'TIE' }
  if (actual === 'PLAYER') return { type: 'PLAYER', side: 'PLAYER' }
  return { type: 'BANKER', side: 'BANKER' }
}

function connLabel(state: ScannerState['connectionState']) {
  switch (state) {
    case 'CONNECTED':
      return '연결됨'
    case 'CONNECTING':
      return '연결 중…'
    case 'ERROR':
      return '오류'
    default:
      return '끊김'
  }
}

export default function App() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS)
  const [shoeId, setShoeId] = useState<number>(1)
  const [rounds, setRounds] = useState<RoundResult[]>([])
  const [analysis, setAnalysis] = useState<SessionAnalysis | null>(null)
  const [martingaleState, setMartingaleState] = useState<ReturnType<typeof simulateMartingale> | null>(null)

  const [autoBetOn, setAutoBetOn] = useState<boolean>(false)
  const [scannerState, setScannerState] = useState<ScannerState>(createInitialScannerState(DEFAULT_APP_SETTINGS.tableId))
  const [wsUrlDraft, setWsUrlDraft] = useState<string>('auto')
  const [tableIdDraft, setTableIdDraft] = useState<string>('LOCAL')
  const [lastScannerMsg, setLastScannerMsg] = useState<string>('스캐너 대기 중')

  const scannerClientRef = useRef<ScannerClient | null>(null)
  const scannerStateRef = useRef(scannerState)
  const lastAutoBetRoundRef = useRef<number | null>(null)

  useEffect(() => {
    scannerStateRef.current = scannerState
  }, [scannerState])

  const randomSeed = useMemo(() => deriveSeedFromString(`nexus-four-final|${settings.tableId}|seed1`), [settings.tableId])
  const resolvedWsUrl = useMemo(() => resolveScannerWebSocketUrl(settings.websocketUrl), [settings.websocketUrl])

  async function refreshFromDb() {
    const latest = await getLatestShoeId()
    setShoeId(latest)

    const loadedSettings = await loadAppSettings()
    setSettings(loadedSettings)
    setWsUrlDraft(loadedSettings.websocketUrl || 'auto')
    setTableIdDraft(loadedSettings.tableId || 'LOCAL')

    const allRounds = await db.gameResults.toArray()
    const tableRounds = allRounds
      .filter((r) => r.tableId === loadedSettings.tableId)
      .sort((a, b) => a.roundIndex - b.roundIndex || a.timestamp - b.timestamp)
    setRounds(tableRounds)

    const allSnaps = await db.balanceSnapshots.toArray()
    const tableSnaps = allSnaps
      .filter((s) => s.tableId === loadedSettings.tableId)
      .sort((a, b) => a.roundIndex - b.roundIndex || a.timestamp - b.timestamp)
    const next = analyzeSession({
      rounds: tableRounds,
      balanceSnapshots: tableSnaps,
      settings: loadedSettings,
      shoeId: latest,
      tableId: loadedSettings.tableId,
      randomSeed,
    })
    setAnalysis(next)

    const currentShoeRounds = tableRounds.filter((r) => r.shoeId === latest).sort((a, b) => a.roundIndex - b.roundIndex)
    const shoeRoundIndexSet = new Set(currentShoeRounds.map((r) => r.roundIndex))
    const multiSlice = next.multiHistory.filter((m) => shoeRoundIndexSet.has(m.roundIndex))

    const mart = simulateMartingale({
      settings: loadedSettings,
      rounds: currentShoeRounds.map((r) => ({ roundIndex: r.roundIndex, actual: r.actual })),
      multiHistory: multiSlice.map((m) => ({ roundIndex: m.roundIndex, entryState: m.entryState, predictedSide: m.predictedSide })),
    })
    await saveMartingaleState(mart)
    setMartingaleState(mart)
  }

  useEffect(() => {
    refreshFromDb().catch(console.error)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!settings.enableScanner) {
      scannerClientRef.current?.disconnect()
      scannerClientRef.current = null
      setScannerState(createInitialScannerState(settings.tableId))
      setLastScannerMsg('스캐너 OFF')
      return
    }

    const url = resolveScannerWebSocketUrl(settings.websocketUrl)
    scannerClientRef.current?.disconnect()

    const initState = createInitialScannerState(settings.tableId)
    setScannerState(initState)
    scannerStateRef.current = initState
    setLastScannerMsg(`연결 시도: ${url}`)

    const client = new ScannerClient(
      url,
      (msg) => {
        if (msg.type === 'scanner_status') {
          setLastScannerMsg(`스캐너 상태: ${msg.status}`)
          if (msg.tableId) {
            setScannerState((s) => ({ ...s, tableId: msg.tableId! }))
          }
        }
        if (msg.type === 'heartbeat') {
          setScannerState((s) => ({ ...s, lastHeartbeatAt: Date.now(), connectionState: 'CONNECTED' }))
        }
        if (msg.type === 'betting_open') {
          setScannerState((s) => ({ ...s, bettingOpenAt: msg.timestamp, bettingCloseAt: null }))
          setLastScannerMsg('배팅 OPEN')
        }
        if (msg.type === 'betting_closed') {
          setScannerState((s) => ({ ...s, bettingCloseAt: msg.timestamp }))
          setLastScannerMsg('배팅 CLOSED')
        }
        if (msg.type === 'round_result') {
          ;(async () => {
            const currentShoe = await getLatestShoeId()
            const id = `${msg.tableId}-${msg.roundId}-${msg.timestamp}`
            const row: RoundResult = {
              id,
              shoeId: currentShoe,
              tableId: msg.tableId,
              roundId: msg.roundId,
              roundIndex: msg.roundIndex,
              tableChangedAt: Date.now(),
              timestamp: msg.timestamp,
              actual: msg.result,
              dataSource: 'scanner',
            }
            await db.gameResults.put(row)
            setLastScannerMsg(`라운드 수신: ${msg.result} (#${msg.roundIndex})`)
            await refreshFromDb()
          })().catch(console.error)
        }
        if (msg.type === 'balance_snapshot') {
          ;(async () => {
            const currentShoe = await getLatestShoeId()
            const id = `${msg.tableId}-${msg.roundIndex}-${msg.timestamp}`
            const row: BalanceSnapshot = {
              id,
              shoeId: currentShoe,
              tableId: msg.tableId,
              roundIndex: msg.roundIndex,
              timestamp: msg.timestamp,
              playerTotal: msg.playerTotal,
              bankerTotal: msg.bankerTotal,
              tieTotal: msg.tieTotal,
              meta: msg.meta,
            }
            await db.balanceSnapshots.put(row)
            if (msg.meta?.bettingOpenAt) {
              setScannerState((s) => ({
                ...s,
                bettingOpenAt: Number(msg.meta?.bettingOpenAt) || s.bettingOpenAt,
                bettingCloseAt: Number(msg.meta?.bettingCloseAt) || s.bettingCloseAt,
              }))
            }
          })().catch(console.error)
        }
        if (msg.type === 'auto_bet_result') {
          setLastScannerMsg(`자동배팅 응답: ${msg.ok ? 'OK' : 'FAIL'} ${msg.message || ''}`)
        }
        if (msg.type === 'scanner_error') {
          setScannerState((s) => ({ ...s, lastError: msg.message, connectionState: 'ERROR' }))
          setLastScannerMsg(`오류: ${msg.message}`)
          setAutoBetOn(false)
        }
      },
      () => scannerStateRef.current,
      (next) => {
        scannerStateRef.current = next
        setScannerState(next)
      },
    )

    scannerClientRef.current = client
    client.connect()

    return () => {
      client.disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.enableScanner, settings.websocketUrl, settings.tableId])

  useEffect(() => {
    if (!autoBetOn) return
    if (!settings.enableScanner) return
    if (!scannerClientRef.current) return
    if (!analysis || !martingaleState) return

    const nextRoundIndex = analysis.nextRoundIndex
    if (lastAutoBetRoundRef.current === nextRoundIndex) return
    if (analysis.multiPick.entryState !== 'ENTRY' || !analysis.multiPick.predictedSide) return
    if (scannerState.connectionState !== 'CONNECTED') {
      setAutoBetOn(false)
      return
    }
    // betting window이 아직 없으면(스텁 초기) 전송 허용하지 않음
    if (!scannerState.bettingOpenAt) return
    if (scannerState.bettingCloseAt && Date.now() > scannerState.bettingCloseAt) return

    const ok = scannerClientRef.current.sendAutoBet({
      tableId: settings.tableId,
      roundIndex: nextRoundIndex,
      side: analysis.multiPick.predictedSide,
      amount: martingaleState.currentAmount,
      mode: 'ENTRY',
    })
    if (ok) lastAutoBetRoundRef.current = nextRoundIndex
    else setAutoBetOn(false)
  }, [autoBetOn, analysis, martingaleState, scannerState.bettingCloseAt, scannerState.bettingOpenAt, scannerState.connectionState, settings.enableScanner, settings.tableId])

  async function persistSettings(next: AppSettings) {
    await saveAppSettings(next)
    setSettings(next)
  }

  async function connectScanner() {
    const next: AppSettings = {
      ...settings,
      enableScanner: true,
      websocketUrl: (wsUrlDraft || 'auto').trim() || 'auto',
      tableId: (tableIdDraft || 'LOCAL').trim() || 'LOCAL',
    }
    await persistSettings(next)
  }

  async function disconnectScanner() {
    setAutoBetOn(false)
    const next: AppSettings = { ...settings, enableScanner: false }
    await persistSettings(next)
  }

  async function addRound(actual: Side | 'TIE') {
    const loadedSettings = await loadAppSettings()
    const nextRoundIndex = (rounds.length ? Math.max(...rounds.map((r) => r.roundIndex)) : 0) + 1
    const nextRoundId = (rounds.length ? Math.max(...rounds.map((r) => r.roundId)) : 0) + 1

    const row: RoundResult = {
      id: `${loadedSettings.tableId}-${nextRoundId}-${Date.now()}`,
      shoeId: shoeId,
      tableId: loadedSettings.tableId,
      roundId: nextRoundId,
      roundIndex: nextRoundIndex,
      tableChangedAt: Date.now(),
      timestamp: Date.now(),
      actual,
      dataSource: 'local',
    }

    await db.gameResults.put(row)
    await refreshFromDb()
  }

  async function undoLastRound() {
    const loadedSettings = await loadAppSettings()
    const currentShoe = await getLatestShoeId()
    const tableRounds = (await db.gameResults.toArray())
      .filter((r) => r.tableId === loadedSettings.tableId && r.shoeId === currentShoe)
      .sort((a, b) => b.roundIndex - a.roundIndex)
    const last = tableRounds[0]
    if (!last) return
    await db.gameResults.delete(last.id)
    await refreshFromDb()
  }

  async function newShoe() {
    const latest = await getLatestShoeId()
    setShoeId(latest + 1)
  }

  async function handleExport() {
    const payload = await exportBackup()
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `NEXUS_FOUR_FINAL_backup_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleImport(file: File) {
    const text = await file.text()
    const json = JSON.parse(text)
    await importBackup(json)
    await refreshFromDb()
  }

  const lastResultBlock = useMemo(() => rounds.slice(Math.max(0, rounds.length - 20)).map((r) => toActualResult(r.actual)), [rounds])

  return (
    <div className="nexusRoot">
      <header className="nexusTop">
        <div className="nexusTitle">NEXUS FOUR FINAL</div>
        <div className="nexusStatusRow">
          <span className={`pill ${scannerState.connectionState === 'CONNECTED' ? 'ok' : ''}`}>
            스캐너: {connLabel(scannerState.connectionState)}
          </span>
          <span className="pill">테이블: {settings.tableId}</span>
          <span className="pill">슈 번호: {shoeId}</span>
          <span className="pill">{autoBetOn ? '자동배팅 ON' : '자동배팅 OFF'}</span>
        </div>
      </header>

      <main className="nexusGrid">
        <section className="card cardConnect">
          <h2>웹사이트 / 스캐너 연동</h2>
          <p className="connectHelp">
            카지노 사이트에 직접 임베드하지 않습니다. 스캐너(WebSocket)가 결과를 보내면 앱이 수신·분석합니다.
            아래 <b>연결</b>을 누르면 로컬 스캐너(`:8765`, Vite 프록시 `/scanner-ws`)에 붙습니다.
          </p>
          <div className="formRow">
            <label>
              WebSocket URL
              <input
                value={wsUrlDraft}
                onChange={(e) => setWsUrlDraft(e.target.value)}
                placeholder="auto 또는 ws://호스트:8765"
              />
            </label>
            <label>
              테이블 ID
              <input value={tableIdDraft} onChange={(e) => setTableIdDraft(e.target.value)} placeholder="LOCAL" />
            </label>
          </div>
          <div className="btnRow">
            <button className="btn p" type="button" onClick={() => connectScanner().catch(console.error)} disabled={settings.enableScanner && scannerState.connectionState === 'CONNECTED'}>
              연결
            </button>
            <button className="btn neutral" type="button" onClick={() => disconnectScanner().catch(console.error)}>
              끊기
            </button>
            <button
              className="btn neutral"
              type="button"
              onClick={() => {
                // 재연결
                disconnectScanner()
                  .then(() => connectScanner())
                  .catch(console.error)
              }}
            >
              재연결
            </button>
          </div>
          <div className="connectMeta">
            <div>실제 연결 URL: <code>{resolvedWsUrl}</code></div>
            <div>상태: {connLabel(scannerState.connectionState)}</div>
            <div>최근 메시지: {lastScannerMsg}</div>
            {scannerState.lastError ? <div className="stopReason">오류: {scannerState.lastError}</div> : null}
          </div>
          <div className="note">
            * 실제 사이트 자동 클릭/로그인은 별도 스캐너가 필요합니다. 현재 기본 스캐너는 연동 테스트용이며, 시뮬레이션 데이터를 보낼 수 있습니다.
          </div>
        </section>

        <section className="card cardFinal">
          <h2>종합 멀티 최종픽</h2>
          <div className="bigSide" style={{ color: colorForSide(analysis?.multiPick.predictedSide ?? null) }}>
            {analysis ? `${analysis.multiPick.predictedSide ? formatSide(analysis.multiPick.predictedSide) : 'WAIT'}` : 'WAIT'}
          </div>
          <div className="subRow">
            <div>신뢰도: {analysis ? (analysis.multiPick.confidence ?? 0).toFixed(3) : '—'}</div>
            <div>선택 엔진: {analysis ? String(analysis.multiPick.selectedEngineId) : '—'}</div>
          </div>
          <div className="reason">{analysis ? analysis.multiPick.reason : '데이터를 입력하면 즉시 분석합니다.'}</div>
          <div className="subRow">
            <div>최소 표본: {analysis ? (analysis.multiPick.minSampleReached ? '충족' : '미충족') : '—'}</div>
            <div>다음 재평가: {analysis ? `${analysis.multiPick.reevaluateIn} 라운드` : '—'}</div>
          </div>
        </section>

        <section className="card cardLast">
          <h2>최근 결과</h2>
          <div className="miniList">
            {lastResultBlock.slice(-20).map((r, idx) => {
              const label = r.type === 'TIE' ? 'T' : r.type === 'PLAYER' ? 'P' : 'B'
              const cls = r.type === 'TIE' ? 't' : r.type === 'PLAYER' ? 'p' : 'b'
              return (
                <span key={idx} className={`mini ${cls}`}>
                  {label}
                </span>
              )
            })}
          </div>
        </section>

        <section className="card cardEngines">
          <h2>엔진 성과</h2>
          <div className="engineList">
            {analysis?.engineStatsForCards.map((s) => (
              <div key={s.engineId} className="engineRow">
                <div className="engineName">{String(s.engineId)}</div>
                <div className="engineMetrics">
                  <div>표본 {s.totalN}</div>
                  <div>Wilson {s.wilsonLower.toFixed(3)}</div>
                  <div>최근50 {s.recent50SuccessRate.toFixed(2)}</div>
                  <div className="engineScore">점수 {s.score.toFixed(1)}</div>
                </div>
                <div className={`badge ${s.minSampleReached ? 'ok' : 'na'}`}>{s.minSampleReached ? '표본충족' : '미충족'}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="card cardMartingale">
          <h2>마틴 시스템</h2>
          <div className="martLine">
            <div>전략: {settings.martingale.activeStrategyId}</div>
            <div>현재 단계: {martingaleState ? martingaleState.martingaleStepIndex + 1 : 1}</div>
            <div>현재 배팅액: {martingaleState ? martingaleState.currentAmount : settings.martingale.startAmount}</div>
          </div>
          <div className="martLine">
            <div>누적 손익: {martingaleState ? martingaleState.totalProfit : 0}</div>
            <div>연속 실패: {martingaleState ? martingaleState.consecutiveFail : 0}</div>
            <div>최고 연속 실패: {martingaleState ? martingaleState.maxConsecutiveFail : 0}</div>
          </div>
          {martingaleState?.stopReason ? <div className="stopReason">중지 사유: {martingaleState.stopReason}</div> : null}
        </section>

        <section className="card cardInput">
          <h2>데이터 입력</h2>
          <div className="btnRow">
            <button className="btn p" onClick={() => addRound('PLAYER')} type="button">
              PLAYER
            </button>
            <button className="btn b" onClick={() => addRound('BANKER')} type="button">
              BANKER
            </button>
            <button className="btn t" onClick={() => addRound('TIE')} type="button">
              TIE
            </button>
            <button className="btn neutral" onClick={() => undoLastRound()} type="button">
              Undo
            </button>
            <button className="btn neutral" onClick={() => newShoe()} type="button">
              새 슈
            </button>
          </div>
          <div className="btnRow">
            <button className="btn neutral" onClick={() => refreshFromDb()} type="button">
              데이터 불러오기
            </button>
            <button className="btn neutral" onClick={() => handleExport()} type="button">
              데이터 내보내기
            </button>
            <label className="btn neutral file">
              가져오기
              <input
                type="file"
                accept="application/json"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) handleImport(f).catch(console.error)
                  e.currentTarget.value = ''
                }}
              />
            </label>
          </div>

          <div className="autoRow">
            <label className="toggle">
              <input
                type="checkbox"
                checked={autoBetOn}
                onChange={(e) => setAutoBetOn(e.target.checked)}
                disabled={scannerState.connectionState !== 'CONNECTED'}
              />
              <span>자동배팅 ON/OFF (스캐너 연결 시에만)</span>
            </label>
          </div>

          <div className="note">* 확률/적중률은 결과를 보장하지 않습니다. 표시 지표는 현재까지 누적된 샘플 기반입니다.</div>
        </section>
      </main>
    </div>
  )
}
