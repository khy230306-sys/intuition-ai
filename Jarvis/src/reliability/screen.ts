/**
 * AIZIO 신뢰성 센터 — Settings panel (metadata KPIs only).
 */

import { activeModeLabel, resolveActiveMode } from './activeMode'
import { describeErrorCode } from './errorCodes'
import { goldenSetStats } from './goldenSet'
import {
  computeKpis,
  isReliabilityOptIn,
  loadMetricEvents,
} from './metrics'
import { multiTurnCount } from './multiTurn'
import { offlineCapabilityReport } from './offlineRecovery'
import type { SuiteReport } from './runner'

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function pct(n: number): string {
  return `${Number.isFinite(n) ? n : 0}%`
}

export function renderReliabilityCenterPanel(
  report: SuiteReport | null,
  opts?: { running?: boolean },
): string {
  const running = Boolean(opts?.running)
  const kpis = computeKpis()
  const optIn = isReliabilityOptIn()
  const mode = resolveActiveMode()
  const offline = offlineCapabilityReport()
  const stats = goldenSetStats()
  const events = loadMetricEvents()

  const byCat = Object.entries(kpis.byCategory)
    .map(([k, v]) => `<li><strong>${escapeHtml(k)}</strong> ${v.success}/${v.total} (${pct(v.rate)})</li>`)
    .join('')

  const errors = (kpis.recentErrorCodes.length
    ? kpis.recentErrorCodes
    : report?.failures?.slice(0, 5).map(() => 'ROUTER-001') || []
  )
    .slice(0, 8)
    .map((c) => `<li><code>${escapeHtml(c)}</code> · ${escapeHtml(describeErrorCode(c))}</li>`)
    .join('')

  const suiteBlock = !report
    ? `<p class="hint">아직 전체 명령 신뢰성 테스트를 실행하지 않았습니다.</p>`
    : `
      <ul class="fdiag-steps">
        <li class="${report.goldenPassRate >= 95 ? 'fdiag-pass' : 'fdiag-fail'}">
          Golden ${report.goldenPass}/${report.goldenTotal} (${pct(report.goldenPassRate)})
        </li>
        <li class="${report.adversarialPass === report.adversarialTotal ? 'fdiag-pass' : 'fdiag-fail'}">
          Adversarial ${report.adversarialPass}/${report.adversarialTotal}
        </li>
        <li class="${report.multiTurnPass === report.multiTurnTotal ? 'fdiag-pass' : 'fdiag-fail'}">
          Multi-turn ${report.multiTurnPass}/${report.multiTurnTotal}
        </li>
        <li>평균 라우팅 ${report.avgRoutingMs}ms · 충돌 ${report.collisionViolations}</li>
        <li>Intent 정확도 ${pct(report.intentPassRate)}</li>
      </ul>`

  return `
    <details class="device-test-panel fdiag-panel" data-reliability-center="1" open>
      <summary><strong>AIZIO 신뢰성 센터</strong> · 성공률 ${pct(kpis.successRate)}</summary>
      <p class="hint">명령 성공·Intent 회귀·Provider 상태를 측정합니다. 사용자 원문·가족 이름·위치·API 키·카드·사진은 저장하지 않습니다.</p>
      <p class="hint">활성 모드: <strong>${escapeHtml(activeModeLabel(mode))}</strong> · 네트워크: <strong>${offline.online ? '온라인' : '오프라인'}</strong> · 메타 이벤트 ${events.length}건</p>
      <ul class="fdiag-steps">
        <li><strong>Command Success Rate</strong> ${pct(kpis.successRate)} (목표 ≥95%)</li>
        <li><strong>평균 응답시간</strong> ${kpis.avgDurationMs}ms</li>
        <li><strong>Provider 실패율</strong> ${pct(kpis.providerFailRate)}</li>
        <li><strong>fallback 비율</strong> ${pct(kpis.fallbackRate)}</li>
        <li><strong>재시도 성공률</strong> ${pct(kpis.retrySuccessRate)}</li>
        <li>Golden Set ${stats.total || 0} · Multi-turn ${multiTurnCount()}</li>
      </ul>
      <h3 class="subsection-title">기능별 성공률</h3>
      <ul class="fdiag-steps">${byCat || '<li class="hint">아직 기록이 없습니다.</li>'}</ul>
      <h3 class="subsection-title">최근 오류 코드</h3>
      <ul class="fdiag-steps">${errors || '<li class="hint">최근 오류 없음</li>'}</ul>
      <h3 class="subsection-title">Golden / Multi-turn 결과</h3>
      ${suiteBlock}
      <div class="toggle-row">
        <span>실사용 테스트 기록 (기본 OFF · 메타데이터만)</span>
        <input type="checkbox" data-reliability-opt-in ${optIn ? 'checked' : ''} />
      </div>
      <div class="row-btns">
        <button type="button" class="primary-btn" data-action="reliability-run" ${running ? 'disabled' : ''}>
          ${running ? '테스트 중…' : '전체 명령 신뢰성 테스트'}
        </button>
        <button type="button" class="ghost-btn" data-action="reliability-clear">기록 전체 삭제</button>
        <button type="button" class="ghost-btn" data-action="reliability-copy">결과 복사</button>
      </div>
      <pre class="device-diag-out hint" data-reliability-out>${report ? escapeHtml(JSON.stringify({
        at: report.at,
        goldenPassRate: report.goldenPassRate,
        multiTurnPass: report.multiTurnPass,
        avgRoutingMs: report.avgRoutingMs,
        collisions: report.collisionViolations,
      }, null, 2)) : '테스트를 실행하면 요약이 여기에 표시됩니다.'}</pre>
    </details>`
}
