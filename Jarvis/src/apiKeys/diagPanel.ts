import { probeApiBackend } from './backendUrl'
import { listProviderKeyStatuses, sourceLabelKo } from './keyService'
import type { ProviderKeyStatus } from './types'

function esc(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export type ApiKeyDiagReport = {
  at: string
  backend: Awaited<ReturnType<typeof probeApiBackend>>
  providers: ProviderKeyStatus[]
}

export async function runApiKeyDiagnosis(): Promise<ApiKeyDiagReport> {
  const backend = await probeApiBackend()
  const providers = await listProviderKeyStatuses(true)
  return { at: new Date().toISOString(), backend, providers }
}

export function renderApiKeyDiagPanel(report: ApiKeyDiagReport | null, opts?: { running?: boolean }): string {
  const running = Boolean(opts?.running)
  if (!report) {
    return `
      <details class="device-test-panel fdiag-panel" data-api-key-diag="1" open>
        <summary><strong>API 연결 진단</strong></summary>
        <p class="hint">설정 UI · 서버 저장 · 키 출처 · 연결 상태를 검사합니다. 키 값은 표시하지 않습니다.</p>
        <button type="button" class="primary-btn" data-action="api-key-diag-run" ${running ? 'disabled' : ''}>
          ${running ? '진단 중…' : 'API 연결 진단'}
        </button>
      </details>`
  }

  const rows = report.providers
    .map((p) => {
      const cls =
        p.connectionStatus === 'connected'
          ? 'fdiag-pass'
          : p.configured
            ? 'fdiag-warn'
            : 'fdiag-fail'
      return `<li class="${cls}"><strong>${esc(p.provider)}</strong> · ${
        p.configured ? '설정됨' : '미설정'
      } · 출처 ${esc(sourceLabelKo(p.source))} · 연결 ${esc(p.connectionStatus)}${
        p.maskedKey ? ` · ${esc(p.maskedKey)}` : ''
      }${p.lastErrorCode ? ` · ${esc(p.lastErrorCode)}` : ''}</li>`
    })
    .join('')

  return `
    <details class="device-test-panel fdiag-panel" data-api-key-diag="1" open>
      <summary><strong>API 연결 진단</strong></summary>
      <p class="hint">백엔드: <strong>${report.backend.reachable ? '연결됨' : '불가'}</strong> · ${esc(
        report.backend.reason,
      )}</p>
      <p class="hint">Secret Store: <strong>${
        report.backend.supportsSecretStore ? '가능' : '불가'
      }</strong> · URL ${esc(report.backend.baseUrl || '—')}</p>
      <ul class="fdiag-steps">${rows || '<li class="hint">Provider 상태 없음</li>'}</ul>
      <div class="row-btns">
        <button type="button" class="primary-btn" data-action="api-key-diag-run" ${running ? 'disabled' : ''}>다시 진단</button>
        <button type="button" class="ghost-btn" data-action="api-key-diag-copy">진단 결과 복사</button>
      </div>
      <pre class="device-diag-out hint" data-api-key-diag-out>${esc(
        JSON.stringify(
          {
            at: report.at,
            backend: {
              reachable: report.backend.reachable,
              supportsSecretStore: report.backend.supportsSecretStore,
              baseUrl: report.backend.baseUrl,
              previewStaticOnly: report.backend.previewStaticOnly,
            },
            providers: report.providers.map((p) => ({
              provider: p.provider,
              configured: p.configured,
              source: p.source,
              maskedKey: p.maskedKey,
              connectionStatus: p.connectionStatus,
              lastErrorCode: p.lastErrorCode,
            })),
          },
          null,
          2,
        ),
      )}</pre>
    </details>`
}
