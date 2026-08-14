import { useEffect, useState, useTransition } from 'react';
import type { AutopilotPublicState, RiskLevel, TradingMode } from '@aizio/trade-shared';
import { api } from './lib/api';

function money(n: number) {
  const sign = n > 0 ? '+' : '';
  return `${sign}₩${Math.round(n).toLocaleString('ko-KR')}`;
}

function sessionLabel(s: AutopilotPublicState['marketSession']) {
  if (!s) return '확인중';
  if (!s.isTradingDay) return `휴장 (${s.reason ?? ''})`;
  if (s.session === 'REGULAR') return '정규장 진행중';
  if (s.session === 'PRE_MARKET') return '장전';
  if (s.session === 'AFTER_HOURS') return '장후/시간외';
  return '장마감';
}

function stateLabel(state: string, enabled: boolean, opts?: { shadowWaiting?: boolean }) {
  if (!enabled && state === 'OFF') return '중지';
  if (opts?.shadowWaiting) return 'MARKET CLOSED · SHADOW WAITING';
  if (state === 'MARKET_CLOSED') return '실행중 · 휴장대기';
  if (state === 'RUNNING') return '실행중';
  if (state === 'STARTING') return '시작중';
  if (state === 'PAUSED') return '신규매수 중지';
  if (state === 'HALTED') return '정지';
  if (state === 'ERROR') return '오류';
  return state;
}

function laneBadge(lane?: string) {
  return lane ?? 'PAPER';
}

function resultClass(r: string) {
  if (r === 'PASS' || r === 'FALSE' || r === 'LOCKED') return r === 'PASS' ? 'pass' : 'locked';
  if (r === 'WARN') return 'warn';
  if (r === 'FAIL') return 'fail';
  return '';
}

export function App() {
  const [status, setStatus] = useState<AutopilotPublicState | null>(null);
  const [capital, setCapital] = useState(3_000_000);
  const [riskLevel, setRiskLevel] = useState<RiskLevel>('BALANCED');
  const [mode, setMode] = useState<TradingMode>('PAPER');
  const [error, setError] = useState<string | null>(null);
  const [diagnostics, setDiagnostics] = useState<string>('');
  const [pending, startTransition] = useTransition();

  const refresh = () => {
    startTransition(() => {
      void api
        .status()
        .then((s) => {
          setStatus(s);
          setCapital(s.capital);
          setRiskLevel(s.riskLevel);
          setMode(s.mode);
          setError(null);
        })
        .catch((e: Error) => setError(e.message));
    });
  };

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 4000);
    return () => clearInterval(t);
  }, []);

  const running = Boolean(status?.enabled && status.state !== 'OFF');
  const shadowWaiting =
    status?.mode === 'SHADOW' &&
    status.enabled &&
    (Boolean(status.marketWaiting) || status.state === 'MARKET_CLOSED');

  return (
    <div className="app">
      <section className="hero">
        <h1 className="brand">
          AIZIO TRADE
          <span>AUTOPILOT</span>
        </h1>
        <p className="headline">
          서버에서 계속 도는 완전자동매매. 앱을 닫아도 멈추지 않습니다.
        </p>

        {status?.credentialGuidance && (
          <pre className="cred-guidance">{status.credentialGuidance}</pre>
        )}

        {status && (
          <div className="status-row">
            <span
              className={`dot ${
                status.state === 'RUNNING' || status.state === 'MARKET_CLOSED'
                  ? 'on'
                  : status.state === 'HALTED' || status.state === 'ERROR'
                    ? 'warn'
                    : 'off'
              }`}
            />
            <strong>{stateLabel(status.state, status.enabled, { shadowWaiting })}</strong>
            <span style={{ color: 'var(--muted)' }}>· {status.mode}</span>
            <span className="lane-pill">{laneBadge(status.health.dataLane)}</span>
          </div>
        )}

        {status && (
          <div className="panel-grid">
            <div>
              <span>AUTOPILOT</span>
              <strong>{status.enabled ? 'ON' : 'OFF'}</strong>
            </div>
            <div>
              <span>BROKER</span>
              <strong>{String(status.health.broker)}</strong>
            </div>
            <div>
              <span>MARKET DATA</span>
              <strong>{String(status.health.marketData)}</strong>
            </div>
            <div>
              <span>AI</span>
              <strong>{status.health.ai === 'NOT_CONFIGURED' ? 'NOT_CONFIGURED' : 'READY'}</strong>
            </div>
            <div>
              <span>MARKET</span>
              <strong>{sessionLabel(status.marketSession)}</strong>
            </div>
            <div>
              <span>LIVE GATE</span>
              <strong>{status.health.liveGate}</strong>
            </div>
            <div>
              <span>UNIVERSE</span>
              <strong>
                {status.universeLabel ?? 'REPLAY'} · {status.universeCount ?? 0}
              </strong>
            </div>
            <div>
              <span>ALLOW_LIVE</span>
              <strong>{status.health.liveGate === 'READY' ? 'CHECK' : 'FALSE'}</strong>
            </div>
          </div>
        )}

        {status && running ? (
          <>
            <div className="metrics">
              <div className="metric">
                <label>시장</label>
                <strong>{sessionLabel(status.marketSession)}</strong>
              </div>
              {status.venueSessions && (
                <div className="metric">
                  <label>KRX / NXT</label>
                  <strong style={{ fontSize: '1rem' }}>
                    {status.venueSessions.krx.session} / {status.venueSessions.nxt.session}
                  </strong>
                </div>
              )}
              <div className="metric">
                <label>운용금액</label>
                <strong>₩{Math.round(status.capital).toLocaleString('ko-KR')}</strong>
              </div>
              <div className="metric">
                <label>오늘 손익 ({laneBadge(status.health.dataLane)})</label>
                <strong className={status.todayPnl >= 0 ? 'pos' : 'neg'}>{money(status.todayPnl)}</strong>
              </div>
              <div className="metric">
                <label>누적 손익</label>
                <strong className={status.cumulativePnl >= 0 ? 'pos' : 'neg'}>
                  {money(status.cumulativePnl)}
                </strong>
              </div>
              <div className="metric">
                <label>현재 보유</label>
                <strong>{status.openPositions}종목</strong>
              </div>
              <div className="metric">
                <label>UNIVERSE</label>
                <strong>
                  {status.universeLabel ?? 'REPLAY'} · {(status.universeCount ?? 0).toLocaleString('ko-KR')}
                </strong>
              </div>
              <div className="metric">
                <label>AI 상태</label>
                <strong style={{ fontSize: '1.05rem' }}>{status.aiStatusText}</strong>
              </div>
            </div>

            <div className="account-split">
              <div className="account-box real">
                <div className="account-title">
                  REAL ACCOUNT <span className="lane-pill">LIVE</span>
                </div>
                {status.realAccount ? (
                  <div className="account-grid">
                    <div>총 자산 ₩{Math.round(status.realAccount.totalEquity ?? 0).toLocaleString('ko-KR')}</div>
                    <div>현금 ₩{Math.round(status.realAccount.cash ?? 0).toLocaleString('ko-KR')}</div>
                    <div>
                      매수가능 ₩{Math.round(status.realAccount.buyingPower ?? 0).toLocaleString('ko-KR')}
                    </div>
                    <div>보유주식 {status.realAccount.positionsCount ?? 0}종목</div>
                    <div>미체결 {status.realAccount.openOrdersCount ?? 0}</div>
                  </div>
                ) : (
                  <div className="account-grid">
                    <div>Toss 미연결 / 자격증명 없음</div>
                  </div>
                )}
              </div>
              <div className="account-box shadow">
                <div className="account-title">
                  SHADOW ACCOUNT <span className="lane-pill">SHADOW</span>
                </div>
                {status.shadowAccount ? (
                  <div className="account-grid">
                    <div>
                      가상 운용금 ₩{Math.round(status.shadowAccount.totalEquity ?? status.capital).toLocaleString('ko-KR')}
                    </div>
                    <div>가상 현금 ₩{Math.round(status.shadowAccount.cash ?? 0).toLocaleString('ko-KR')}</div>
                    <div>가상 보유 {status.shadowAccount.positionsCount ?? 0}종목</div>
                    <div>가상 손익 {money(status.shadowAccount.unrealizedPnl ?? 0)}</div>
                    <div>Shadow P/L {money(status.shadowResearch?.shadowPnl ?? 0)}</div>
                  </div>
                ) : (
                  <div className="account-grid">
                    <div>가상 운용금 ₩{Math.round(status.capital).toLocaleString('ko-KR')}</div>
                    <div>가상 보유 0종목</div>
                  </div>
                )}
              </div>
            </div>

            <div className="cta-row">
              <button
                className="secondary"
                disabled={pending}
                onClick={() => void api.stop('STOP_NEW_ENTRIES').then(refresh)}
              >
                신규매수만 중지
              </button>
              <button
                className="primary"
                disabled={pending}
                onClick={() => void api.stop('CLOSE_AND_STOP').then(refresh)}
              >
                자동매매 중지
              </button>
              <button className="danger" disabled={pending} onClick={() => void api.emergency().then(refresh)}>
                EMERGENCY STOP
              </button>
            </div>
          </>
        ) : (
          <div className="setup">
            <label>
              운용금액
              <input
                type="number"
                value={capital}
                min={100000}
                step={100000}
                onChange={(e) => setCapital(Number(e.target.value))}
              />
            </label>
            <div>
              <div style={{ color: 'var(--muted)', marginBottom: 8 }}>위험 수준</div>
              <div className="risk-options">
                {(
                  [
                    ['STABLE', '안정형'],
                    ['BALANCED', '균형형'],
                    ['AGGRESSIVE', '적극형'],
                  ] as const
                ).map(([id, label]) => (
                  <label key={id}>
                    <input
                      type="radio"
                      name="risk"
                      checked={riskLevel === id}
                      onChange={() => setRiskLevel(id)}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <div style={{ color: 'var(--muted)', marginBottom: 8 }}>모드</div>
              <div className="risk-options">
                {(
                  [
                    ['PAPER', 'PAPER (리플레이 시세)'],
                    ['SHADOW', 'SHADOW (실세세+페이퍼체결)'],
                    ['LIVE_OBSERVE', 'LIVE_OBSERVE (실계좌 관찰, 주문금지)'],
                  ] as const
                ).map(([id, label]) => (
                  <label key={id}>
                    <input
                      type="radio"
                      name="mode"
                      checked={mode === id}
                      onChange={() => setMode(id)}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>
            <div className="cta-row">
              <button
                className="primary"
                disabled={pending}
                onClick={() =>
                  void api
                    .start({ capital, riskLevel, mode })
                    .then(refresh)
                    .catch((e: Error) => setError(e.message))
                }
              >
                자동매매 시작
              </button>
            </div>
            <p style={{ color: 'var(--muted)', margin: 0, fontSize: '0.9rem' }}>
              LIVE 실주문은 LIVE GATE READY + ALLOW_LIVE=true 가 필요합니다. 기본 잠금입니다.
            </p>
          </div>
        )}

        {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}
      </section>

      {status?.diagnosticsPanel && status.diagnosticsPanel.length > 0 && (
        <section className="section">
          <h2>Diagnostics</h2>
          <div className="diag-panel">
            {status.diagnosticsPanel.map((row) => (
              <div key={row.name} className={`diag-row ${resultClass(String(row.result))}`}>
                <span className="diag-name">{row.name}</span>
                <span className="diag-result">{row.result}</span>
                <span className="diag-detail">{row.detail}</span>
              </div>
            ))}
          </div>
          {status.shadowResearch?.funnelChain && (
            <p className="funnel-line">
              Scanner funnel: {status.shadowResearch.funnelChain.join(' → ')}
            </p>
          )}
          {status.universeStats && (
            <p className="funnel-line">
              Universe {status.universeStats.liveLabel}: total={status.universeStats.total} KOSPI=
              {status.universeStats.kospi} KOSDAQ={status.universeStats.kosdaq} tradable=
              {status.universeStats.tradable}
            </p>
          )}
        </section>
      )}

      {status && (
        <section className="section">
          <h2>Activity</h2>
          <ul className="feed">
            {status.activity.map((a) => (
              <li key={a.id} className={a.level}>
                <time>
                  {new Date(a.at).toLocaleTimeString('ko-KR', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false,
                  })}
                </time>
                <span>{a.message}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <details className="expert">
        <summary>전문가 설정 / 진단</summary>
        <div className="cta-row" style={{ marginTop: 12 }}>
          <button
            className="secondary"
            onClick={() =>
              void api.diagnosticsPanel().then((d) => setDiagnostics(JSON.stringify(d, null, 2)))
            }
          >
            진단 패널 새로고침
          </button>
          <button
            className="secondary"
            onClick={() =>
              void api.shadowVerify().then((d) => setDiagnostics(JSON.stringify(d, null, 2)))
            }
          >
            SHADOW 연결 검증
          </button>
          <button
            className="secondary"
            onClick={() =>
              void api.liveDiagnostics().then((d) => setDiagnostics(JSON.stringify(d, null, 2)))
            }
          >
            LIVE 진단 실행
          </button>
          <button
            className="secondary"
            onClick={() => void api.performance().then((d) => setDiagnostics(JSON.stringify(d, null, 2)))}
          >
            성과 보기
          </button>
          <button
            className="secondary"
            onClick={() => void api.journal().then((d) => setDiagnostics(JSON.stringify(d, null, 2)))}
          >
            저널 보기
          </button>
        </div>
        {diagnostics && <pre>{diagnostics}</pre>}
      </details>
    </div>
  );
}
