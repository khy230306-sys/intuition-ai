import { isLikelyStaticPreviewHost, resolveApiBackendBaseUrl } from '../apiKeys/backendUrl'
import { isServerConfigured } from '../apiKeys/serverFlags'
import { maskApiKey } from './keyVault'
import { isProviderConfigured, loadHybridAiConfig } from './providerConfig'
import { listHybridProviders } from './providerRegistry'
import { usageSummaryLine } from './providerUsage'
import type { HybridProviderId, ProviderHealthStatus } from './types'

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Korean status for settings cards — 저장됨 ≠ 연결 성공. */
export function providerStatusLabelKo(
  status: ProviderHealthStatus | string | undefined,
  configured: boolean,
): string {
  if (!configured) return '미설정'
  const s = status || 'unknown'
  switch (s) {
    case 'ok':
      return '연결됨'
    case 'unknown':
    case 'unconfigured':
      return '설정됨 · 테스트 필요'
    case 'auth':
      return '키 오류'
    case 'rate_limit':
      return '요청 한도'
    case 'quota':
      return '할당량 초과'
    case 'error':
      return '오류'
    default:
      return String(s)
  }
}

export function renderHybridAiSettingsHtml(): string {
  const cfg = loadHybridAiConfig()
  const providers = listHybridProviders()
  const backend = resolveApiBackendBaseUrl()
  const previewHint =
    isLikelyStaticPreviewHost() && !backend
      ? `<p class="hint danger-text">이 Preview는 정적 호스팅입니다. Live API 키 서버 저장을 쓰려면 로컬에서 푸시·API URL(예: http://127.0.0.1:8787)을 설정하세요. 서버 없이 「저장되었습니다」로 표시하지 않습니다.</p>`
      : backend
        ? `<p class="hint">API 백엔드: <strong>${esc(backend)}</strong> · 키는 서버 Secret Store(개발용 JSON 파일)에 저장됩니다. OS Credential Manager 암호화는 아닙니다.</p>`
        : `<p class="hint">API 백엔드 없음 · 키는 이 기기 개발용 저장만 가능합니다 (서버 비밀 보관 아님).</p>`

  const cards = providers
    .map((p) => {
      const slot = p.getSlot()
      const configured = isProviderConfigured(p.id)
      const viaServer = isServerConfigured(p.id)
      const hasDeviceKey = Boolean(slot.apiKey.trim())
      const status = slot.status || (configured ? 'unknown' : 'unconfigured')
      const statusKo = providerStatusLabelKo(status, configured)
      const source = viaServer ? '서버 Secret Store' : hasDeviceKey ? '이 기기 (개발용)' : '없음'
      const masked = hasDeviceKey
        ? maskApiKey(slot.apiKey)
        : viaServer
          ? 'sk-••••••••server'
          : ''
      const cat =
        p.category === 'free' ? '무료 시작 가능' : p.category === 'paid' ? '사용량 기반 유료' : '로컬'
      const modelOptions = p.recommendedModels
        .map(
          (m) =>
            `<option value="${esc(m.id)}" ${slot.model === m.id ? 'selected' : ''}>${esc(m.label)}</option>`,
        )
        .join('')
      return `
      <div class="hybrid-ai-card" data-provider="${p.id}">
        <div class="hybrid-ai-card-head">
          <strong>${esc(p.displayName)}</strong>
          <span class="hybrid-ai-badge ${p.category}">${cat}</span>
        </div>
        <p class="hint">${esc(p.docsHint)}</p>
        <p class="hint" data-hybrid-status="${p.id}">상태: <strong>${esc(statusKo)}</strong> · 키: ${
          masked ? esc(masked) : '없음'
        } · 출처: ${esc(source)}${
          slot.lastSuccessAt ? ` · 마지막 성공 ${esc(slot.lastSuccessAt.slice(0, 16))}` : ''
        }</p>
        ${
          p.id === 'custom' || p.id === 'openai'
            ? `<label>API Base
                <input name="hybridBase_${p.id}" value="${esc(slot.apiBase || p.defaultApiBase || '')}" placeholder="https://..." autocomplete="off" />
              </label>`
            : ''
        }
        <label>API Key
          <input name="hybridKey_${p.id}" type="password" value="" placeholder="${
            configured ? esc(masked || '저장됨 · 변경 시에만 입력') : '키 입력'
          }" autocomplete="off" data-hybrid-key="${p.id}" />
        </label>
        <label>Model
          <select name="hybridModel_${p.id}">
            ${modelOptions}
            ${
              slot.model && !p.recommendedModels.some((m) => m.id === slot.model)
                ? `<option value="${esc(slot.model)}" selected>${esc(slot.model)}</option>`
                : ''
            }
          </select>
        </label>
        <label class="advanced-model">직접 모델 ID
          <input name="hybridModelCustom_${p.id}" value="" placeholder="비우면 위 선택 사용" autocomplete="off" />
        </label>
        <div class="row-btns">
          <button type="button" class="primary-btn" data-hybrid-save="${p.id}">키 저장</button>
          <button type="button" class="ghost-btn" data-hybrid-test="${p.id}">연결 테스트</button>
          <button type="button" class="ghost-btn" data-hybrid-default="${p.id}">기본으로 사용</button>
          <button type="button" class="ghost-btn danger-btn" data-hybrid-clear="${p.id}">삭제</button>
        </div>
        ${
          p.signupUrl
            ? `<p class="hint"><a href="${esc(p.signupUrl)}" target="_blank" rel="noopener">키 발급 페이지 열기</a></p>`
            : ''
        }
        ${slot.lastError ? `<p class="hint danger-text">${esc(slot.lastError)}</p>` : ''}
      </div>`
    })
    .join('')

  return `
    <h3 class="subsection-title">AIZIO 대화</h3>
    <p class="hint"><strong>기본 클라우드:</strong> OpenAI(ChatGPT API) · 부족/오류 시 Gemini로 이어집니다. 키 없이도 내장 대화는 동작합니다.</p>
    <h3 class="subsection-title">클라우드 두뇌 (Hybrid)</h3>
    <p class="hint"><strong>저장됨 ≠ 연결 성공</strong> — 「키 저장」후 「연결 테스트」. 유료 OpenAI는 사용량 결제가 필요합니다.</p>
    ${previewHint}
    <p class="hint">${esc(usageSummaryLine())}</p>
    <label>선택 모드
      <select name="hybridMode">
        <option value="auto" ${cfg.mode === 'auto' ? 'selected' : ''}>자동 선택 (무료 우선)</option>
        <option value="fixed" ${cfg.mode === 'fixed' ? 'selected' : ''}>특정 Provider 고정</option>
      </select>
    </label>
    <label>고정 Provider
      <select name="hybridFixed">
        <option value="">—</option>
        ${providers
          .map(
            (p) =>
              `<option value="${p.id}" ${cfg.fixedProvider === p.id ? 'selected' : ''}>${esc(p.displayName)}</option>`,
          )
          .join('')}
      </select>
    </label>
    <div class="toggle-row">
      <span>유료 Provider 자동 폴백 허용 (기본 끔)</span>
      <input type="checkbox" name="hybridAllowPaid" ${cfg.allowPaidFallback ? 'checked' : ''} />
    </div>
    <div class="hybrid-ai-list">${cards}</div>
    <p class="hint">기존 OpenAI 필드도 아래에서 모델/Base를 맞출 수 있습니다. 비밀 키는 서버 Secret Store를 우선합니다.</p>
  `
}

export function renderAiWizardHtml(): string {
  return `
    <div class="ai-wizard-card" id="ai-wizard">
      <strong>AIZIO와 대화하기</strong>
      <p class="hint">키가 연결되면 대화·조언·레시피·추천을 AI가 우선 답합니다. 키 없이도 날씨·일정 등 기본 기능은 계속 쓸 수 있어요.</p>
      <div class="row-btns">
        <button type="button" class="primary-btn" data-action="ai-wizard-local">AIZIO로 시작</button>
        <button type="button" class="ghost-btn" data-action="ai-wizard-free">클라우드 두뇌 연결</button>
        <button type="button" class="ghost-btn" data-action="ai-wizard-later">나중에</button>
      </div>
      <p class="hint">선택: OpenRouter · Gemini · Groq · OpenAI. 필수는 아닙니다.</p>
    </div>
  `
}

export type HybridFormSave = {
  mode: 'auto' | 'fixed'
  fixedProvider?: HybridProviderId
  allowPaidFallback: boolean
  slots: Partial<
    Record<
      HybridProviderId,
      { apiKeyInput: string; model: string; apiBase?: string }
    >
  >
}
