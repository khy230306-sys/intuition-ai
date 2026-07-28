import { useEffect, useMemo, useRef, useState } from 'react'
import type { AppSettings, BalanceSnapshot, RoundResult, Side } from './nexus/types'
import { DEFAULT_APP_SETTINGS, type ActualResult } from './nexus/types'
import { analyzeSession, type SessionAnalysis } from './nexus/engines'
import { db, exportBackup, importBackup, getLatestShoeId, loadAppSettings, saveMartingaleState } from './nexus/db'
import { simulateMartingale } from './nexus/martingale'
import { createInitialScannerState, ScannerClient, type ScannerState } from './nexus/scannerClient'
import { deriveSeedFromString } from './nexus/prng'
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

export default function App() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS)
  const [shoeId, setShoeId] = useState<number>(1)
  const [rounds, setRounds] = useState<RoundResult[]>([])
  const [analysis, setAnalysis] = useState<SessionAnalysis | null>(null)
  const [martingaleState, setMartingaleState] = useState<ReturnType<typeof simulateMartingale> | null>(null)

  const [autoBetOn, setAutoBetOn] = useState<boolean>(false)
  const [scannerState, setScannerState] = useState<ScannerState>(createInitialScannerState(DEFAULT_APP_SETTINGS.tableId))

  const scannerClientRef = useRef<ScannerClient | null>(null)
  const lastAutoBetRoundRef = useRef<number | null>(null)

  const randomSeed = useMemo(() => deriveSeedFromString(`nexus-four-final|${settings.tableId}|seed1`), [settings.tableId])

  async function refreshFromDb() {
    const latest = await getLatestShoeId()
    setShoeId(latest)

    const loadedSettings = await loadAppSettings()
    setSettings(loadedSettings)

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

    // 현재 shoe 구간만 마틴을 재구성
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
    if (!settings.enableScanner || !settings.websocketUrl.startsWith('ws')) {
      scannerClientRef.current?.disconnect()
      scannerClientRef.current = null
      setScannerState(createInitialScannerState(settings.tableId))
      return
    }

    scannerClientRef.current?.disconnect()

    const initState = createInitialScannerState(settings.tableId)
    setScannerState(initState)

    const client = new ScannerClient(
      settings.websocketUrl,
      (msg) => {
        if (msg.type === 'round_result') {
          ;(async () => {
            // 스캐너가 제공한 shoeId/roundIndex를 그대로 신뢰하기 어렵기 때문에,
            // 현재 구현은 "현재 최신 shoe"로 묶되, 라운드 인덱스는 스캐너 값을 우선합니다.
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
            await refreshFromDb()
          })().catch(console.error)
        }
        if (msg.type === 'scanner_error') setScannerState((s) => ({ ...s, lastError: msg.message }))
      },
      () => scannerState,
      (next) => setScannerState(next),
    )

    scannerClientRef.current = client
    client.connect()

    return () => {
      client.disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.enableScanner, settings.websocketUrl])

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
    if (!scannerState.bettingOpenAt || !scannerState.bettingCloseAt) return
    if (Date.now() > scannerState.bettingCloseAt) return

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
    // 스캐너 밸런스 스냅샷까지 완벽히 연동하는 것은 스캐너 규약에 의존합니다.
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
          <span className="pill">스캐너: {scannerState.connectionState}</span>
          <span className="pill">테이블: {settings.tableId}</span>
          <span className="pill">슈 번호: {shoeId}</span>
          <span className="pill">{autoBetOn ? '자동배팅 ON' : '자동배팅 OFF'}</span>
        </div>
      </header>

      <main className="nexusGrid">
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
              />
              <span>자동배팅 ON/OFF</span>
            </label>
          </div>

          <div className="note">* 확률/적중률은 결과를 보장하지 않습니다. 표시 지표는 현재까지 누적된 샘플 기반입니다.</div>
        </section>
      </main>
    </div>
  )
}
