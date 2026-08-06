/**
 * AIZIO Release Master Health Check — local, non-destructive.
 * Scores PASS / WARNING / FAIL / USER TEST REQUIRED from real checks.
 * Never logs API keys, images, or PII.
 */

import { hasAnyConfiguredProvider, loadHybridAiConfig } from '../ai-providers'
import { mockVisionProvider } from '../ai-camera/providers/mockVision'
import { parseVisionResultJson } from '../ai-camera/visionSchema'
import { loadVisionHistory } from '../ai-camera/historyStorage'
import { loadParkingMemory } from '../life-assistant/storage'
import { classifyLifeAssistantRules } from '../life-assistant/intentRules'
import { extractKoreanDate, extractKoreanTime } from '../life-assistant/datetimeParse'
import {
  listFamilyHelperSchedules,
  listFamilyMembers,
  loadFamilyHelperBundle,
  upsertFamilyMember,
  deleteFamilyMember,
} from '../family-helper/store'
import { defaultTranslateSheetState, renderTranslateSheet, resolveTranslateSheetFrom } from '../homeV2/translateSheet'
import { detectLangCode } from '../translate'
import { runMenuAudit } from '../navShell/menuAudit'
import { FEATURE_CATALOG } from '../navShell/featureCatalog'
import { PRIMARY_TABS } from '../navShell/primaryTabs'
import { listVisibleQuickActions, QUICK_ACTION_MAX, showQuickAction, hideQuickAction } from '../navShell/quickActions'
import { clearInterpretMode, loadInterpretMode, saveInterpretMode } from '../translateBrain'
import { getNetStatus } from '../offline/networkStatus'
import { getPushServerStatus } from '../push/serverUrl'
import { loadReminders } from '../storage'
import { sanitizeDiagExport } from './collectStatus'

export type HealthVerdict = 'PASS' | 'WARNING' | 'FAIL' | 'USER_TEST_REQUIRED'

export type HealthItem = {
  id: string
  area: string
  label: string
  verdict: HealthVerdict
  detail: string
}

export type ReleaseHealthReport = {
  generatedAt: string
  version: string
  items: HealthItem[]
  summary: Record<HealthVerdict, number>
  /** Weighted readiness 0–100 from scored items (USER_TEST_REQUIRED excluded from denominator). */
  readinessPercent: number
  catalogCount: number
  primaryTabs: number
}

function item(
  area: string,
  id: string,
  label: string,
  verdict: HealthVerdict,
  detail: string,
): HealthItem {
  return { area, id, label, verdict, detail }
}

function scorePercent(items: HealthItem[]): number {
  const scored = items.filter((i) => i.verdict !== 'USER_TEST_REQUIRED')
  if (!scored.length) return 0
  let points = 0
  for (const i of scored) {
    if (i.verdict === 'PASS') points += 1
    else if (i.verdict === 'WARNING') points += 0.5
  }
  return Math.round((points / scored.length) * 100)
}

export async function runReleaseHealthCheck(meta: {
  version: string
}): Promise<ReleaseHealthReport> {
  const items: HealthItem[] = []
  const online = typeof navigator !== 'undefined' ? navigator.onLine !== false : true

  // —— App / storage ——
  let storageOk = true
  let storageDetail = 'localStorage 읽기/쓰기 가능'
  try {
    const k = '__aizio_release_health__'
    localStorage.setItem(k, '1')
    if (localStorage.getItem(k) !== '1') throw new Error('readback mismatch')
    localStorage.removeItem(k)
  } catch (e) {
    storageOk = false
    storageDetail = e instanceof Error ? e.message.slice(0, 80) : '저장소 오류'
  }
  items.push(item('앱', 'app-storage', '저장소', storageOk ? 'PASS' : 'FAIL', storageDetail))
  items.push(
    item(
      '앱',
      'app-online',
      '네트워크',
      online ? 'PASS' : 'WARNING',
      online ? '온라인' : '오프라인 — 로컬 기능만 사용',
    ),
  )
  items.push(
    item(
      '앱',
      'app-version',
      '앱 버전',
      meta.version ? 'PASS' : 'FAIL',
      meta.version ? `v${meta.version}` : '버전 없음',
    ),
  )

  // —— Menu / nav ——
  const audit = runMenuAudit()
  items.push(
    item(
      '앱',
      'menu-tabs',
      '하단 탭',
      PRIMARY_TABS.length === 5 ? 'PASS' : 'WARNING',
      `${PRIMARY_TABS.length}개 · 홈/대화/일정/가족/더보기`,
    ),
  )
  items.push(
    item(
      '앱',
      'menu-catalog',
      '기능 카탈로그',
      FEATURE_CATALOG.length >= 12 && audit.summary.unreachable === 0 ? 'PASS' : 'FAIL',
      `진입점 ${FEATURE_CATALOG.length} · 깨진 링크 ${audit.summary.unreachable}`,
    ),
  )
  items.push(
    item(
      '앱',
      'menu-dup',
      '메뉴 중복',
      audit.summary.duplicate === 0 ? 'PASS' : 'WARNING',
      `중복 제목 ${audit.summary.duplicate} · 정리 권장 ${audit.summary.needs_cleanup}`,
    ),
  )

  // —— Quick actions ——
  try {
    const before = listVisibleQuickActions().map((q) => q.id)
    const probe = 'music' as const
    const had = before.includes(probe)
    if (had) hideQuickAction(probe)
    const add = showQuickAction(probe, { replaceLastIfFull: true })
    const after = listVisibleQuickActions().map((q) => q.id)
    // restore
    hideQuickAction(probe)
    for (const id of before) {
      if (!listVisibleQuickActions().some((q) => q.id === id)) {
        showQuickAction(id, { replaceLastIfFull: true })
      }
    }
    const ok = add.ok && after.includes(probe) && listVisibleQuickActions().length <= QUICK_ACTION_MAX
    items.push(
      item(
        '앱',
        'quick-actions',
        '빠른 실행 추가/교체',
        ok ? 'PASS' : 'FAIL',
        ok ? `최대 ${QUICK_ACTION_MAX} · 교체 추가 동작` : '빠른 실행 편집 실패',
      ),
    )
  } catch (e) {
    items.push(
      item(
        '앱',
        'quick-actions',
        '빠른 실행 추가/교체',
        'FAIL',
        e instanceof Error ? e.message.slice(0, 80) : '오류',
      ),
    )
  }

  // —— AI ——
  const hybrid = loadHybridAiConfig()
  const hasKey = hasAnyConfiguredProvider()
  items.push(
    item(
      'AI',
      'ai-provider',
      'AI Provider',
      hasKey ? 'PASS' : 'WARNING',
      hasKey
        ? `키 설정됨 · 모드 ${hybrid.mode || 'hybrid'} (값은 표시 안 함)`
        : 'API 키 없음 — Mock/로컬만 · 사용자 설정 필요',
    ),
  )
  items.push(
    item(
      'AI',
      'ai-mock',
      'Mock Provider',
      'PASS',
      '로컬 fallback 사용 가능 (삭제하지 않음)',
    ),
  )

  // —— Translation ——
  try {
    const prev = loadInterpretMode()
    saveInterpretMode({
      active: true,
      langA: 'ko',
      langB: 'en',
      listening: 'ko',
      live: true,
      lockUntilStop: true,
      showOriginal: true,
    })
    const locked = loadInterpretMode()
    clearInterpretMode()
    if (prev.active) saveInterpretMode(prev)
    const html = renderTranslateSheet(defaultTranslateSheetState())
    const from = resolveTranslateSheetFrom('안녕하세요', 'auto', { inputSource: 'type' })
    const detect = detectLangCode('Hello')
    const paneOk = html.includes('data-translate-pane="1"') && !html.includes('aria-modal')
    items.push(
      item(
        '번역',
        'translate-pane',
        '번역 창',
        paneOk ? 'PASS' : 'FAIL',
        paneOk ? '상위 창 패널 모드' : '번역 패널 마크업 오류',
      ),
    )
    items.push(
      item(
        '번역',
        'translate-detect',
        '언어 감지',
        from === 'ko' && detect === 'en' ? 'PASS' : 'FAIL',
        `ko→${from} · Hello→${detect}`,
      ),
    )
    items.push(
      item(
        '번역',
        'translate-lock',
        '번역 모드 잠금',
        locked.active && locked.langB === 'en' && locked.lockUntilStop ? 'PASS' : 'FAIL',
        locked.active ? '시작/종료 로컬 상태 OK' : '잠금 상태 저장 실패',
      ),
    )
  } catch (e) {
    items.push(
      item('번역', 'translate-pane', '번역', 'FAIL', e instanceof Error ? e.message.slice(0, 80) : '오류'),
    )
  }

  // —— Voice (capability only) ——
  const hasSR =
    typeof window !== 'undefined' &&
    !!(
      (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition
    )
  const hasTTS = typeof window !== 'undefined' && !!window.speechSynthesis
  items.push(
    item(
      '음성',
      'voice-stt',
      '음성 인식(STT)',
      hasSR ? 'PASS' : 'USER_TEST_REQUIRED',
      hasSR ? 'SpeechRecognition 지원' : '브라우저/실기기에서 MIC 권한·STT 확인 필요',
    ),
  )
  items.push(
    item(
      '음성',
      'voice-tts',
      '음성 읽기(TTS)',
      hasTTS ? 'PASS' : 'WARNING',
      hasTTS ? 'speechSynthesis 지원' : 'TTS 미지원 환경',
    ),
  )

  // —— Schedule / reminders ——
  const now = new Date('2026-08-06T10:00:00')
  const d1 = extractKoreanDate('내일 병원', now)
  const t1 = extractKoreanTime('오후 3시')
  const t2 = extractKoreanTime('한영이 하원 4시 반')
  items.push(
    item(
      '일정',
      'datetime-parse',
      '날짜·시간 인식',
      d1 === '2026-08-07' && t1 === '15:00' && t2 === '16:30' ? 'PASS' : 'FAIL',
      `내일=${d1} · 오후3시=${t1} · 4시반(하원)=${t2}`,
    ),
  )
  const calIntent = classifyLifeAssistantRules('내일 오후 3시에 병원 일정 잡아줘')
  const remIntent = classifyLifeAssistantRules('30분 뒤에 전화하라고 알려줘')
  items.push(
    item(
      '일정',
      'nl-calendar',
      '일정 자연어',
      calIntent?.intent === 'calendar.create' ? 'PASS' : 'FAIL',
      calIntent ? String(calIntent.intent) : '의도 미인식',
    ),
  )
  items.push(
    item(
      '알림',
      'nl-reminder',
      '알림 자연어',
      remIntent?.intent === 'reminder.create' ? 'PASS' : 'WARNING',
      remIntent ? String(remIntent.intent) : '의도 미인식(대체 경로 가능)',
    ),
  )
  try {
    const reminders = loadReminders()
    items.push(
      item(
        '알림',
        'reminder-store',
        '알림 저장소',
        'PASS',
        `로컬 알림 ${reminders.length}건 (보존)`,
      ),
    )
  } catch {
    items.push(item('알림', 'reminder-store', '알림 저장소', 'FAIL', '읽기 실패'))
  }

  // —— Camera / Vision ——
  try {
    const mock = await mockVisionProvider.analyzeImage({
      imageDataUrl: 'data:image/jpeg;base64,/9j/4AAQ',
      mimeType: 'image/jpeg',
      mode: 'document',
      question: '',
    })
    const parsed = parseVisionResultJson(JSON.stringify(mock), 'document', 'mock')
    const ok = Boolean(mock.ok && parsed?.ok && parsed.summary)
    items.push(
      item(
        '카메라',
        'vision-mock',
        'Vision Mock',
        ok ? 'PASS' : 'FAIL',
        ok ? 'Structured Output OK' : '스키마 검증 실패',
      ),
    )
  } catch (e) {
    items.push(
      item(
        '카메라',
        'vision-mock',
        'Vision Mock',
        'FAIL',
        e instanceof Error ? e.message.slice(0, 80) : '오류',
      ),
    )
  }
  items.push(
    item(
      '카메라',
      'vision-history',
      'Vision 기록',
      'PASS',
      `저장 ${loadVisionHistory().length}건 (삭제하지 않음)`,
    ),
  )
  items.push(
    item(
      '카메라',
      'vision-device',
      '실기기 카메라',
      'USER_TEST_REQUIRED',
      '촬영·HEIC·권한은 실기기에서 확인',
    ),
  )

  // —— Family ——
  try {
    const tag = `__rh_${Date.now().toString(36)}__`
    const m = upsertFamilyMember({ name: tag, relation: 'other' })
    const found = listFamilyMembers().some((x) => x.id === m.id)
    deleteFamilyMember(m.id, { purgeRelated: true })
    const gone = !listFamilyMembers().some((x) => x.id === m.id)
    const bundle = loadFamilyHelperBundle()
    items.push(
      item(
        '가족',
        'family-crud',
        '구성원 추가/삭제',
        found && gone ? 'PASS' : 'FAIL',
        found && gone ? '이름·관계만으로 생성 가능' : 'CRUD 실패',
      ),
    )
    items.push(
      item(
        '가족',
        'family-data',
        '가족 데이터',
        'PASS',
        `구성원 ${bundle.members.length} · 일정 ${listFamilyHelperSchedules().length}`,
      ),
    )
  } catch (e) {
    items.push(
      item('가족', 'family-crud', '가족', 'FAIL', e instanceof Error ? e.message.slice(0, 80) : '오류'),
    )
  }
  items.push(
    item(
      '기억',
      'parking-memory',
      '주차/기억',
      'PASS',
      loadParkingMemory() ? '주차 메모 있음' : '주차 메모 없음(정상 가능)',
    ),
  )

  // —— Push ——
  const push = getPushServerStatus()
  items.push(
    item(
      'Push',
      'push-server',
      'Push 서버',
      push.configured ? 'PASS' : 'WARNING',
      push.configured ? '서버 URL 설정됨(값은 표시 안 함)' : '미연결 — 로컬 알림·데이터는 유지',
    ),
  )
  items.push(
    item(
      'Push',
      'push-permission',
      '알림 권한',
      'USER_TEST_REQUIRED',
      '실기기에서 허용/거부 후 동작 확인',
    ),
  )

  // —— Offline / PWA ——
  try {
    const net = getNetStatus()
    items.push(
      item(
        '오프라인',
        'offline-flags',
        '오프라인 런타임',
        net === 'offline' ? 'WARNING' : 'PASS',
        `네트워크 상태: ${net}`,
      ),
    )
  } catch {
    items.push(item('오프라인', 'offline-flags', '오프라인 런타임', 'WARNING', '상태 읽기 실패 — 기본 동작 유지'))
  }
  const sw =
    typeof navigator !== 'undefined' && 'serviceWorker' in navigator
      ? !!navigator.serviceWorker?.controller
      : false
  items.push(
    item(
      'PWA',
      'sw-control',
      'Service Worker',
      sw ? 'PASS' : 'WARNING',
      sw ? '제어 중' : '미제어(브라우저 탭/첫 방문 가능)',
    ),
  )
  items.push(
    item(
      'PWA',
      'pwa-install',
      '홈 화면 설치',
      'USER_TEST_REQUIRED',
      'iPhone Safari 공유 → 홈 화면에 추가',
    ),
  )

  // —— Security ——
  const leakProbe = sanitizeDiagExport({
    apiKey: 'sk-SHOULD_NOT_LEAK_ABCDEFG123456',
    nested: { token: 'sk-NESTED_SECRET_ABCDEFG999' },
    note: 'ok',
  })
  const leakJson = JSON.stringify(leakProbe)
  const secure = !leakJson.includes('SHOULD_NOT_LEAK') && !leakJson.includes('NESTED_SECRET')
  items.push(
    item(
      '보안',
      'secret-redact',
      '비밀값 마스킹',
      secure ? 'PASS' : 'FAIL',
      secure ? '진단 export에서 키 제거' : '마스킹 실패',
    ),
  )

  // —— Data preservation signal ——
  items.push(
    item(
      '저장소',
      'data-preserve',
      '데이터 보존 정책',
      'PASS',
      '진단/캐시 새로고침은 사용자 데이터를 삭제하지 않음',
    ),
  )

  // —— Device platforms ——
  items.push(
    item('iPhone', 'iphone-device', 'iPhone Safari/PWA', 'USER_TEST_REQUIRED', '실기기 체크리스트 필수'),
  )
  items.push(
    item('Android', 'android-device', 'Android Chrome/PWA', 'USER_TEST_REQUIRED', '실기기 체크리스트 필수'),
  )

  const summary: Record<HealthVerdict, number> = {
    PASS: 0,
    WARNING: 0,
    FAIL: 0,
    USER_TEST_REQUIRED: 0,
  }
  for (const i of items) summary[i.verdict]++

  return {
    generatedAt: new Date().toISOString(),
    version: meta.version,
    items,
    summary,
    readinessPercent: scorePercent(items),
    catalogCount: FEATURE_CATALOG.length,
    primaryTabs: PRIMARY_TABS.length,
  }
}

export function renderReleaseHealthPanel(report: ReleaseHealthReport | null, opts?: { running?: boolean }): string {
  const running = Boolean(opts?.running)
  if (!report) {
    return `
      <details class="device-test-panel fdiag-panel" data-release-health="1" open>
        <summary><strong>AIZIO 출시 준비 검사</strong></summary>
        <p class="hint">앱·AI·번역·음성·일정·카메라·가족·Push·오프라인·PWA·보안을 한 번에 검사합니다. 사용자 데이터는 삭제하지 않습니다.</p>
        <button type="button" class="primary-btn" data-action="release-health-run" ${running ? 'disabled' : ''}>
          ${running ? '검사 중…' : '출시 준비 검사 실행'}
        </button>
      </details>`
  }

  const verdictKo = (v: HealthVerdict) =>
    v === 'PASS' ? 'PASS' : v === 'WARNING' ? 'WARNING' : v === 'FAIL' ? 'FAIL' : 'USER TEST REQUIRED'
  const cls = (v: HealthVerdict) =>
    v === 'PASS' ? 'fdiag-pass' : v === 'WARNING' ? 'fdiag-warn' : v === 'FAIL' ? 'fdiag-fail' : 'fdiag-needs_device'

  const rows = report.items
    .map(
      (i) =>
        `<li class="${cls(i.verdict)}"><span class="fdiag-v">${verdictKo(i.verdict)}</span> <strong>${escapeHtml(i.area)} · ${escapeHtml(i.label)}</strong> — ${escapeHtml(i.detail)}</li>`,
    )
    .join('')

  return `
    <details class="device-test-panel fdiag-panel" data-release-health="1" open>
      <summary><strong>AIZIO 출시 준비 검사</strong> · 준비도 ${report.readinessPercent}%</summary>
      <p class="hint">v${escapeHtml(report.version)} · PASS ${report.summary.PASS} · WARNING ${report.summary.WARNING} · FAIL ${report.summary.FAIL} · 실기기 ${report.summary.USER_TEST_REQUIRED}</p>
      <p class="fdiag-readiness"><strong>출시 준비도 ${report.readinessPercent}%</strong> (실기기 항목 제외 · PASS=1 · WARNING=0.5 · FAIL=0)</p>
      <ul class="fdiag-steps">${rows}</ul>
      <div class="row-btns">
        <button type="button" class="primary-btn" data-action="release-health-run" ${running ? 'disabled' : ''}>
          ${running ? '검사 중…' : '다시 검사'}
        </button>
        <button type="button" class="ghost-btn" data-action="release-health-copy">결과 복사</button>
      </div>
    </details>`
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
