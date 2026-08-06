import { analyzeImage } from '../visionService'
import { optimizeImageFile, makeThumb } from '../imageOptimize'
import {
  clearVisionHistory,
  deleteVisionHistoryItem,
  loadVisionHistory,
  saveVisionHistoryItem,
} from '../historyStorage'
import type { VisionAnalyzeResult, VisionMode } from '../types'
import { addFamilyHelperTask, addFamilyHelperSchedule, listFamilyMembers } from '../../family-helper/store'
import { addReminder } from '../../storage'
import { copyText, shareText } from '../../actions'

function esc(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export type CameraScreenState = {
  mode: VisionMode
  previewUrl: string
  analyzing: boolean
  status: string
  result: VisionAnalyzeResult | null
  saveHistory: boolean
  question: string
  historyOpen: boolean
}

export function defaultCameraState(): CameraScreenState {
  return {
    mode: 'auto',
    previewUrl: '',
    analyzing: false,
    status: '사진을 촬영하거나 보관함에서 선택하세요.',
    result: null,
    saveHistory: false,
    question: '',
    historyOpen: false,
  }
}

const MODES: Array<[VisionMode, string]> = [
  ['auto', '자동'],
  ['ocr', '글자 읽기'],
  ['translate', '번역'],
  ['product', '제품'],
  ['food', '음식'],
  ['nature', '동식물'],
  ['document', '문서'],
  ['medicine', '약 포장'],
  ['free', '자유 질문'],
]

export function renderCameraScreen(st: CameraScreenState): string {
  const history = st.historyOpen ? loadVisionHistory() : []
  const r = st.result
  const resultHtml = r
    ? `<div class="aicam-result" data-aicam-result="1">
        <strong>${esc(r.summary)}</strong>
        <p class="hint">신뢰도 ${Math.round((r.confidence || 0) * 100)}% · ${esc(r.provider)}${r.sensitive ? ' · 민감 가능' : ''}</p>
        <p>${esc(r.detail)}</p>
        ${r.subjects.length ? `<p>인식: ${esc(r.subjects.join(', '))}</p>` : ''}
        ${r.warnings.map((w) => `<p class="hint aicam-warn">${esc(w)}</p>`).join('')}
        ${r.ocrText ? `<details open><summary>추출 텍스트</summary><pre class="aicam-pre">${esc(r.ocrText)}</pre></details>` : ''}
        ${
          r.translation
            ? `<div class="aicam-block"><p>원문 (${esc(r.translation.sourceLang || '?')})</p><pre class="aicam-pre">${esc(r.translation.sourceText)}</pre><p>번역</p><pre class="aicam-pre">${esc(r.translation.translatedText)}</pre></div>`
            : ''
        }
        ${
          r.document
            ? `<div class="aicam-block"><p>문서: ${esc(r.document.docType || '')}</p><ul>${r.document.keyPoints.map((k) => `<li>${esc(k)}</li>`).join('')}</ul></div>`
            : ''
        }
        ${
          r.medicine
            ? `<div class="aicam-block"><p>${esc(r.medicine.labelName || '')}</p><p class="hint">${esc(r.medicine.disclaimer)}</p></div>`
            : ''
        }
        ${
          r.followUps.length
            ? `<div class="aicam-follow">${r.followUps.map((f) => `<span class="hint">· ${esc(f)}</span>`).join('')}</div>`
            : ''
        }
        <div class="row-btns">
          <button type="button" class="ghost-btn" data-aicam-action="copy">복사</button>
          <button type="button" class="ghost-btn" data-aicam-action="share">공유</button>
          <button type="button" class="ghost-btn" data-aicam-action="save">결과 저장</button>
          <button type="button" class="ghost-btn" data-aicam-action="reanalyze">다시 분석</button>
        </div>
        <div class="row-btns">
          <button type="button" class="primary-btn" data-aicam-action="to-schedule">일정 만들기</button>
          <button type="button" class="ghost-btn" data-aicam-action="to-task">할 일 만들기</button>
          <button type="button" class="ghost-btn" data-aicam-action="to-translate">번역 대화로</button>
          <button type="button" class="ghost-btn" data-aicam-action="to-family">가족 준비물로</button>
        </div>
      </div>`
    : ''

  return `
    <section class="panel aicam-panel" data-aicam="1">
      <header class="navv2-head">
        <button type="button" class="ghost-btn tiny" data-action="aicam-back">뒤로</button>
        <strong>AI 만능 카메라</strong>
        <button type="button" class="ghost-btn tiny" data-aicam-action="history">${st.historyOpen ? '닫기' : '기록'}</button>
      </header>
      <p class="hint">사진은 기기에서 최적화되며, 원본을 서버에 영구 저장하지 않습니다. 분석 시 선택한 AI Provider로 이미지가 전송될 수 있습니다.</p>
      <div class="aicam-modes" role="group" aria-label="분석 모드">
        ${MODES.map(
          ([id, label]) =>
            `<button type="button" class="ghost-btn tiny ${st.mode === id ? 'active' : ''}" data-aicam-mode="${id}">${label}</button>`,
        ).join('')}
      </div>
      ${
        st.mode === 'free'
          ? `<label class="aicam-q">질문 <input type="text" id="aicam-q" value="${esc(st.question)}" placeholder="이 사진에서 무엇이 보이나요?" /></label>`
          : ''
      }
      <div class="aicam-preview ${st.previewUrl ? 'has' : ''}">
        ${
          st.previewUrl
            ? `<img src="${esc(st.previewUrl)}" alt="미리보기" />`
            : `<p class="hint">미리보기 없음</p>`
        }
      </div>
      <div class="row-btns aicam-capture-row">
        <label class="primary-btn aicam-file-btn">후면 촬영
          <input type="file" id="aicam-capture" accept="image/*" capture="environment" hidden />
        </label>
        <label class="ghost-btn aicam-file-btn">전면 촬영
          <input type="file" id="aicam-capture-user" accept="image/*" capture="user" hidden />
        </label>
        <label class="ghost-btn aicam-file-btn">보관함
          <input type="file" id="aicam-gallery" accept="image/*" multiple hidden />
        </label>
        <button type="button" class="ghost-btn" data-aicam-action="clear" ${st.analyzing ? 'disabled' : ''}>다시 촬영</button>
      </div>
      <label class="aicam-save"><input type="checkbox" id="aicam-save-hist" ${st.saveHistory ? 'checked' : ''}/> 분석 기록 저장 (기본 비저장)</label>
      <div class="row-btns">
        <button type="button" class="primary-btn" data-aicam-action="analyze" ${!st.previewUrl || st.analyzing ? 'disabled' : ''}>
          ${st.analyzing ? '분석 중…' : '분석하기'}
        </button>
        <button type="button" class="ghost-btn" data-aicam-action="cancel" ${st.analyzing ? '' : 'disabled'}>취소</button>
      </div>
      <p class="hint" data-aicam-status>${esc(st.status)}</p>
      ${resultHtml}
      ${
        st.historyOpen
          ? `<div class="aicam-hist">
              <div class="row-btns"><button type="button" class="ghost-btn danger-btn" data-aicam-action="clear-hist">기록 전체 삭제</button></div>
              ${
                history.length
                  ? history
                      .map(
                        (h) => `<div class="aicam-hist-item">
                          <strong>${esc(h.summary)}</strong>
                          <p class="hint">${new Date(h.savedAt).toLocaleString('ko-KR')} · ${esc(h.mode)}</p>
                          <button type="button" class="ghost-btn tiny" data-aicam-del="${esc(h.id)}">삭제</button>
                        </div>`,
                      )
                      .join('')
                  : '<p class="hint">저장된 기록이 없습니다.</p>'
              }
            </div>`
          : ''
      }
    </section>
  `
}

let abort: AbortController | null = null
let analyzeInFlight = false

export async function bindCameraScreen(
  root: HTMLElement,
  st: CameraScreenState,
  redraw: (next: Partial<CameraScreenState>) => void,
  opts?: {
    onBack?: () => void
    onSendTranslate?: (text: string) => void
  },
): Promise<void> {
  root.querySelector('[data-action="aicam-back"]')?.addEventListener('click', () => opts?.onBack?.())

  root.querySelectorAll<HTMLButtonElement>('[data-aicam-mode]').forEach((btn) => {
    btn.addEventListener('click', () => redraw({ mode: btn.dataset.aicamMode as VisionMode }))
  })

  const resetInput = (el: HTMLInputElement | null) => {
    if (el) el.value = ''
  }

  const onFiles = async (input: HTMLInputElement | null, files: FileList | null) => {
    // Cancel / empty selection — keep current preview, never blank the screen
    if (!files?.length) {
      resetInput(input)
      redraw({
        status: st.previewUrl
          ? '선택을 취소했어요. 이전 미리보기를 유지합니다.'
          : '촬영·선택이 취소되었어요. 다시 시도해 주세요.',
      })
      return
    }
    try {
      const optimized = await optimizeImageFile(files[0]!)
      redraw({
        previewUrl: optimized.dataUrl,
        result: null,
        status:
          files.length > 1
            ? `${files.length}장 중 첫 사진을 사용합니다. 분석을 눌러 주세요.`
            : '미리보기 준비됨. 분석을 눌러 주세요.',
      })
    } catch (e) {
      // HEIC / decode failures must not crash the Vision screen
      redraw({
        status: e instanceof Error ? e.message : '이미지를 불러오지 못했어요. JPEG/PNG로 다시 선택해 주세요.',
      })
    } finally {
      // Allow re-selecting the same photo on iPhone Safari
      resetInput(input)
    }
  }

  root.querySelector('#aicam-capture')?.addEventListener('change', (e) => {
    const input = e.target as HTMLInputElement
    void onFiles(input, input.files)
  })
  root.querySelector('#aicam-capture-user')?.addEventListener('change', (e) => {
    const input = e.target as HTMLInputElement
    void onFiles(input, input.files)
  })
  root.querySelector('#aicam-gallery')?.addEventListener('change', (e) => {
    const input = e.target as HTMLInputElement
    void onFiles(input, input.files)
  })

  document.addEventListener(
    'visibilitychange',
    () => {
      if (document.visibilityState === 'visible' && st.analyzing) {
        redraw({ status: '앱으로 돌아왔어요. 분석이 계속 중이거나 취소 후 다시 시도할 수 있어요.' })
      }
    },
    { once: true },
  )

  root.querySelector('#aicam-save-hist')?.addEventListener('change', (e) => {
    redraw({ saveHistory: (e.target as HTMLInputElement).checked })
  })
  root.querySelector('#aicam-q')?.addEventListener('input', (e) => {
    redraw({ question: (e.target as HTMLInputElement).value })
  })

  root.querySelector('[data-aicam-action="clear"]')?.addEventListener('click', () => {
    abort?.abort()
    redraw({ previewUrl: '', result: null, status: '다시 촬영하거나 선택해 주세요.', analyzing: false })
  })

  root.querySelector('[data-aicam-action="cancel"]')?.addEventListener('click', () => {
    abort?.abort()
    redraw({ analyzing: false, status: '분석을 취소했어요. 입력은 유지됩니다.' })
  })

  root.querySelector('[data-aicam-action="history"]')?.addEventListener('click', () => {
    redraw({ historyOpen: !st.historyOpen })
  })
  root.querySelector('[data-aicam-action="clear-hist"]')?.addEventListener('click', () => {
    clearVisionHistory()
    redraw({ status: '분석 기록을 모두 삭제했어요.', historyOpen: true })
  })
  root.querySelectorAll<HTMLButtonElement>('[data-aicam-del]').forEach((btn) => {
    btn.addEventListener('click', () => {
      deleteVisionHistoryItem(btn.dataset.aicamDel || '')
      redraw({ status: '기록을 삭제했어요.' })
    })
  })

  root.querySelector('[data-aicam-action="analyze"]')?.addEventListener('click', () => {
    if (!st.previewUrl || st.analyzing || analyzeInFlight) return
    analyzeInFlight = true
    abort?.abort()
    abort = new AbortController()
    redraw({ analyzing: true, status: '이미지를 분석하는 중…', result: null })
    void analyzeImage({
      imageDataUrl: st.previewUrl,
      mimeType: 'image/jpeg',
      mode: st.mode,
      question: st.question,
      targetLang: 'ko',
      signal: abort.signal,
    })
      .then(async (result) => {
        if (st.saveHistory) {
          const thumb = await makeThumb(st.previewUrl)
          saveVisionHistoryItem({
            id: `vh_${Date.now().toString(36)}`,
            savedAt: Date.now(),
            mode: result.mode,
            summary: result.summary,
            thumbDataUrl: thumb || undefined,
            result: { ...result, rawText: undefined },
          })
        }
        redraw({
          analyzing: false,
          result,
          status: result.ok ? '분석 완료' : result.summary,
        })
      })
      .catch((e) => {
        redraw({
          analyzing: false,
          status:
            e instanceof Error && e.name === 'AbortError'
              ? '분석을 취소했어요. 입력은 유지됩니다.'
              : '분석을 끝내지 못했어요. 다시 시도해 주세요. (VISION-PROVIDER-001)',
        })
      })
      .finally(() => {
        analyzeInFlight = false
      })
  })

  root.querySelector('[data-aicam-action="reanalyze"]')?.addEventListener('click', () => {
    root.querySelector<HTMLButtonElement>('[data-aicam-action="analyze"]')?.click()
  })

  root.querySelector('[data-aicam-action="copy"]')?.addEventListener('click', () => {
    if (!st.result) return
    void copyText(formatResultText(st.result))
    redraw({ status: '결과를 복사했어요.' })
  })
  root.querySelector('[data-aicam-action="share"]')?.addEventListener('click', () => {
    if (!st.result) return
    void shareText(formatResultText(st.result))
  })
  root.querySelector('[data-aicam-action="save"]')?.addEventListener('click', async () => {
    if (!st.result || !st.previewUrl) return
    const thumb = await makeThumb(st.previewUrl)
    saveVisionHistoryItem({
      id: `vh_${Date.now().toString(36)}`,
      savedAt: Date.now(),
      mode: st.result.mode,
      summary: st.result.summary,
      thumbDataUrl: thumb || undefined,
      result: { ...st.result, rawText: undefined },
    })
    redraw({ status: '분석 기록을 저장했어요.', saveHistory: true })
  })

  root.querySelector('[data-aicam-action="to-schedule"]')?.addEventListener('click', () => {
    if (!st.result) return
    const title =
      st.result.document?.suggestedTasks[0] ||
      st.result.subjects[0] ||
      st.result.summary.slice(0, 40) ||
      '카메라 일정'
    const date = new Date().toISOString().slice(0, 10)
    addFamilyHelperSchedule({ title, date, category: 'school_event', note: st.result.summary })
    redraw({ status: `일정을 제안·저장했어요: ${title} (확인은 가족 도우미에서)` })
  })

  root.querySelector('[data-aicam-action="to-task"]')?.addEventListener('click', () => {
    if (!st.result) return
    const tasks = st.result.document?.suggestedTasks?.length
      ? st.result.document.suggestedTasks
      : [st.result.summary.slice(0, 60)]
    for (const t of tasks.slice(0, 5)) addReminder(t)
    redraw({ status: `할 일 ${Math.min(5, tasks.length)}개를 추가했어요.` })
  })

  root.querySelector('[data-aicam-action="to-translate"]')?.addEventListener('click', () => {
    const text = st.result?.translation?.translatedText || st.result?.ocrText || st.result?.summary || ''
    opts?.onSendTranslate?.(text)
  })

  root.querySelector('[data-aicam-action="to-family"]')?.addEventListener('click', () => {
    if (!st.result) return
    const members = listFamilyMembers()
    const memberId = members[0]?.id
    const title = st.result.document?.fields.find((f) => /준비/.test(f.label))?.value || '준비물'
    addFamilyHelperTask({
      title: String(title).slice(0, 80),
      body: st.result.ocrText || st.result.summary,
      memberId,
      kind: 'supplies',
      dueDate: new Date().toISOString().slice(0, 10),
    })
    redraw({ status: '가족 준비물로 저장했어요. 가족 도우미에서 확인해 주세요.' })
  })
}

function formatResultText(r: VisionAnalyzeResult): string {
  const parts = [r.summary, r.detail]
  if (r.ocrText) parts.push(r.ocrText)
  if (r.translation) parts.push(r.translation.translatedText)
  return parts.filter(Boolean).join('\n\n')
}
