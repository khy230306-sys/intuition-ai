import { maskApiKey } from './keyVault'
import { loadHybridAiConfig } from './providerConfig'
import { listHybridProviders } from './providerRegistry'
import { usageSummaryLine } from './providerUsage'
import type { HybridProviderId } from './types'

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function renderHybridAiSettingsHtml(): string {
  const cfg = loadHybridAiConfig()
  const providers = listHybridProviders()
  const cards = providers
    .map((p) => {
      const slot = p.getSlot()
      const hasKey = Boolean(slot.apiKey.trim())
      const status = slot.status || (hasKey ? 'unknown' : 'unconfigured')
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
        <p class="hint">상태: <strong>${esc(status)}</strong>${
          hasKey ? ` · 키 ${esc(maskApiKey(slot.apiKey))}` : ' · 키 없음'
        }${slot.lastSuccessAt ? ` · 성공 ${esc(slot.lastSuccessAt.slice(0, 16))}` : ''}</p>
        ${
          p.id === 'custom' || p.id === 'openai'
            ? `<label>API Base
                <input name="hybridBase_${p.id}" value="${esc(slot.apiBase || p.defaultApiBase || '')}" placeholder="https://..." autocomplete="off" />
              </label>`
            : ''
        }
        <label>API Key
          <input name="hybridKey_${p.id}" type="password" value="" placeholder="${
            hasKey ? esc(maskApiKey(slot.apiKey)) : '키 입력'
          }" autocomplete="off" />
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
          <button type="button" class="ghost-btn" data-hybrid-test="${p.id}">연결 테스트</button>
          <button type="button" class="ghost-btn" data-hybrid-default="${p.id}">기본으로 사용</button>
          <button type="button" class="ghost-btn danger-btn" data-hybrid-clear="${p.id}">키 삭제</button>
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
    <h3 class="subsection-title">AI 연결 (Hybrid Provider)</h3>
    <p class="hint">무료 AI를 먼저 연결하세요. 유료 Provider는 기본값으로 자동 사용되지 않습니다. 클라이언트 저장은 서버 비밀 보관과 다릅니다.</p>
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
    <p class="hint">기존 OpenAI 필드도 아래에서 계속 사용할 수 있으며 Hybrid OpenAI 슬롯과 동기화됩니다.</p>
  `
}

export function renderAiWizardHtml(): string {
  return `
    <div class="ai-wizard-card" id="ai-wizard">
      <strong>AI 연결 마법사</strong>
      <p class="hint">무료 AI를 연결하면 자유 대화가 가능합니다. 일정·메모·알림은 키 없이 사용할 수 있습니다.</p>
      <div class="row-btns">
        <button type="button" class="primary-btn" data-action="ai-wizard-free">무료 AI 연결하기</button>
        <button type="button" class="ghost-btn" data-action="ai-wizard-openai">OpenAI 연결</button>
        <button type="button" class="ghost-btn" data-action="ai-wizard-later">나중에</button>
        <button type="button" class="ghost-btn" data-action="ai-wizard-local">AI 없이 기본 기능</button>
      </div>
      <p class="hint">추천: OpenRouter · Gemini · Groq 중 하나를 설정에서 연결하세요. 가짜 자동 계정 생성은 하지 않습니다.</p>
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
