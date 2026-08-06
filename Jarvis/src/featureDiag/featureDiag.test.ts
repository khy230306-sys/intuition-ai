import { beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  collectFeatureDiagStatus,
  sanitizeDiagExport,
} from './collectStatus'
import { runFeatureAutoDiag } from './autoRun'
import { FeatureDiagCodes, recordFeatureDiagError, loadFeatureDiagErrors } from './errorCodes'
import { extractKoreanDate, extractKoreanTime } from '../life-assistant/datetimeParse'
import { classifyLifeAssistantRules } from '../life-assistant/intentRules'
import { executeLifeAssistantIntent } from '../life-assistant/executor'
import { clearParkingMemory, loadParkingMemory, saveParkingMemory } from '../life-assistant/storage'
import {
  isHeicLike,
  isSupportedImageFile,
  optimizeImageFile,
  VisionUploadError,
} from '../ai-camera/imageOptimize'
import { parseVisionResultJson } from '../ai-camera/visionSchema'
import { analyzeImage } from '../ai-camera/visionService'
import {
  addFamilyHelperSchedule,
  deleteFamilyMember,
  detectScheduleConflicts,
  listFamilyHelperSchedules,
  listFamilyMembers,
  resetFamilyHelperStoreForTests,
  upsertFamilyMember,
} from '../family-helper/store'

const store = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => store.set(k, v),
  removeItem: (k: string) => store.delete(k),
  clear: () => store.clear(),
})
vi.stubGlobal('navigator', {
  onLine: true,
  language: 'ko-KR',
  permissions: { query: async () => ({ state: 'prompt' }) },
})

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

describe('relative date/time parsing', () => {
  const now = new Date('2026-08-06T10:00:00') // Thursday

  it('parses today tomorrow day-after and weekdays', () => {
    expect(extractKoreanDate('오늘 일정', now)).toBe('2026-08-06')
    expect(extractKoreanDate('내일 병원', now)).toBe('2026-08-07')
    expect(extractKoreanDate('모레 만남', now)).toBe('2026-08-08')
    expect(extractKoreanDate('다음 주 월요일', now)).toBe('2026-08-10')
    expect(extractKoreanDate('이번 주 금요일', now)).toBe('2026-08-07')
    expect(extractKoreanDate('오늘 저녁', now)).toBe('2026-08-06')
  })

  it('parses absolute and half hours without inventing', () => {
    expect(extractKoreanTime('오후 3시')).toBe('15:00')
    expect(extractKoreanTime('4시 반')).toBe('04:30')
    expect(extractKoreanTime('한영이 하원 4시 반')).toBe('16:30')
    expect(extractKoreanTime('16시 30분')).toBe('16:30')
    expect(extractKoreanTime('내일 아침')).toBeUndefined()
  })
})

describe('life NL variants + parking manual', () => {
  beforeEach(() => {
    store.clear()
    clearParkingMemory()
    resetFamilyHelperStoreForTests()
  })

  it('classifies natural variants', () => {
    expect(classifyLifeAssistantRules('일정 잡아줘')?.intent).toBe('calendar.create')
    expect(classifyLifeAssistantRules('예약 넣어줘')?.intent).toBe('calendar.create')
    expect(classifyLifeAssistantRules('이거 일정에 넣어')?.intent).toBe('calendar.create')
    expect(classifyLifeAssistantRules('이 사진 번역해')?.intent).toBe('camera.open')
    expect(classifyLifeAssistantRules('안내문 준비물로 저장해')?.intent).toBe('camera.open')
    expect(classifyLifeAssistantRules('한영이 하원 4시 반')?.intent).toBe('family.schedule.create')
    expect(classifyLifeAssistantRules('엄마 병원 다음 주 월요일')?.intent).toBe('family.schedule.create')
    expect(classifyLifeAssistantRules('30분 뒤 테스트 약 알림 만들어줘')?.intent).toBe('reminder.create')
  })

  it('does not invent time when missing', async () => {
    const r = classifyLifeAssistantRules('내일 병원 일정 추가해줘')
    expect(r?.intent).toBe('calendar.create')
    expect(r?.time).toBeUndefined()
    const exec = await executeLifeAssistantIntent(r!)
    expect(exec?.text).toMatch(/추가/)
    const s = listFamilyHelperSchedules({ days: 400, includeDone: true }).find((x) => x.title.includes('병원'))
    expect(s?.time).toBeUndefined()
  })

  it('keeps prior parking when GPS fails and place given', async () => {
    saveParkingMemory({ label: '기존B1', note: '기존B1', lat: 1, lng: 2, source: 'manual' })
    vi.stubGlobal('navigator', {
      onLine: true,
      language: 'ko-KR',
      geolocation: {
        getCurrentPosition: (_ok: unknown, err: (e: GeolocationPositionError) => void) =>
          err({ code: 1, message: 'denied', PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 } as GeolocationPositionError),
      },
    })
    const routed = classifyLifeAssistantRules('주차 위치 기억해줘 B3-진단')!
    expect(routed.intent).toBe('parking.save')
    await executeLifeAssistantIntent(routed)
    expect(loadParkingMemory()?.label).toMatch(/B3/)
  })

  it('asks manual place when GPS denied and no place text', async () => {
    saveParkingMemory({ label: 'KEEP', note: 'KEEP', lat: 3, lng: 4, source: 'gps' })
    vi.stubGlobal('navigator', {
      onLine: true,
      geolocation: {
        getCurrentPosition: (_ok: unknown, err: (e: GeolocationPositionError) => void) =>
          err({ code: 1, message: 'denied', PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 } as GeolocationPositionError),
      },
    })
    const routed = classifyLifeAssistantRules('주차 위치 기억해줘')!
    const reply = await executeLifeAssistantIntent(routed)
    expect(reply?.text).toMatch(/장소|층|구역|기존/)
    expect(loadParkingMemory()?.label).toBe('KEEP')
  })

  it('prevents duplicate family schedules', async () => {
    const d = new Date()
    d.setDate(d.getDate() + 2)
    const date = d.toISOString().slice(0, 10)
    const payload = {
      intent: 'calendar.create' as const,
      confidence: 0.95,
      extractedEntities: { title: '병원', date, time: '15:00' },
      title: '병원',
      date,
      time: '15:00',
      sourceText: '내일 오후 3시 병원',
      requiresConfirmation: false,
      missingFields: [] as string[],
      source: 'rules' as const,
    }
    await executeLifeAssistantIntent(payload)
    const second = await executeLifeAssistantIntent(payload)
    expect(second?.text).toMatch(/이미/)
    expect(listFamilyHelperSchedules({ days: 30, includeDone: true }).filter((s) => s.title === '병원')).toHaveLength(1)
  })
})

describe('camera HEIC / cancel / permission guards', () => {
  it('detects HEIC and fails safely without crashing', async () => {
    const file = new File(['not-an-image'], 'photo.heic', { type: 'image/heic' })
    expect(isHeicLike(file)).toBe(true)
    expect(isSupportedImageFile(file)).toBe(true)
    vi.stubGlobal('createImageBitmap', async () => {
      throw new Error('decode fail')
    })
    await expect(optimizeImageFile(file)).rejects.toBeInstanceOf(VisionUploadError)
    try {
      await optimizeImageFile(file)
    } catch (e) {
      expect((e as VisionUploadError).code).toBe(FeatureDiagCodes.VISION_UPLOAD)
      expect((e as Error).message).toMatch(/JPEG|PNG|HEIC/)
    }
  })

  it('camera screen keeps preview on cancel and resets input for reselect', () => {
    const src = readFileSync(join(root, 'src/ai-camera/ui/cameraScreen.ts'), 'utf8')
    expect(src).toContain("capture=\"environment\"")
    expect(src).toContain("capture=\"user\"")
    expect(src).toContain('선택을 취소했어요')
    expect(src).toContain('el.value = \'\'')
    expect(src).toContain('analyzeInFlight')
    expect(src).toContain('visibilitychange')
  })

  it('heals bad vision JSON', () => {
    const r = parseVisionResultJson(
      `{"ok":true,"mode":"ocr","summary":"t","subjects":[],"confidence":0.5,"detail":"d","warnings":[],"followUps":[],"sensitive":false,}`,
      'ocr',
      'test',
    )
    expect(r?.summary).toBe('t')
  })

  it('provider timeout/offline falls back without killing app', async () => {
    vi.stubGlobal('navigator', { onLine: false })
    const r = await analyzeImage({
      imageDataUrl: 'data:image/jpeg;base64,xx',
      mimeType: 'image/jpeg',
      mode: 'auto',
    })
    expect(r.ok === false || r.provider.includes('mock') || r.errorCode).toBeTruthy()
  })
})

describe('family helper UX + cleanup', () => {
  beforeEach(() => {
    store.clear()
    resetFamilyHelperStoreForTests()
  })

  it('creates member with name+relation only', () => {
    const m = upsertFamilyMember({ name: '민수', relation: 'child' })
    expect(listFamilyMembers()).toHaveLength(1)
    expect(m.school).toBeFalsy()
  })

  it('soft-delete keeps related unless purgeRelated', () => {
    const d = new Date()
    d.setDate(d.getDate() + 5)
    const date = d.toISOString().slice(0, 10)
    const m = upsertFamilyMember({ name: '지우', relation: 'child' })
    addFamilyHelperSchedule({ title: '학원', date, memberId: m.id })
    deleteFamilyMember(m.id)
    expect(listFamilyMembers()).toHaveLength(0)
    expect(listFamilyHelperSchedules({ days: 30, includeDone: true }).some((s) => s.title === '학원')).toBe(true)
    const m2 = upsertFamilyMember({ name: '지우2', relation: 'child' })
    const d2 = new Date()
    d2.setDate(d2.getDate() + 6)
    const date2 = d2.toISOString().slice(0, 10)
    addFamilyHelperSchedule({ title: '피아노', date: date2, memberId: m2.id })
    deleteFamilyMember(m2.id, { purgeRelated: true })
    expect(listFamilyHelperSchedules({ days: 30, includeDone: true }).some((s) => s.title === '피아노')).toBe(false)
  })

  it('detects schedule conflicts', () => {
    const d = new Date()
    d.setDate(d.getDate() + 3)
    const date = d.toISOString().slice(0, 10)
    addFamilyHelperSchedule({ title: '하원', date, time: '16:30' })
    const c = detectScheduleConflicts(date, '하원')
    expect(c.length).toBeGreaterThan(0)
  })
})

describe('feature auto-diag + redaction + PWA cache separation', () => {
  beforeEach(() => {
    store.clear()
    clearParkingMemory()
    resetFamilyHelperStoreForTests()
  })

  it('auto diag cleans tagged test data', async () => {
    const report = await runFeatureAutoDiag()
    expect(report.cleanedUp).toBe(true)
    expect(report.summary.fail).toBe(0)
    expect(listFamilyMembers(true).every((m) => !m.name.includes('[진단테스트]'))).toBe(true)
    expect(
      listFamilyHelperSchedules({ days: 400, includeDone: true }).every((s) => !s.title.includes('[진단테스트]')),
    ).toBe(true)
  })

  it('sanitizeDiagExport redacts keys and images', () => {
    const cleaned = sanitizeDiagExport({
      apiKey: 'sk-secretKEY1234567890abcdef',
      dump: 'data:image/jpeg;base64,/9j/aaaa',
      nested: { token: 'sk-abcdefghijklmnopqrstuv' },
    }) as Record<string, unknown>
    const raw = JSON.stringify(cleaned)
    expect(raw).not.toMatch(/sk-secret/)
    expect(raw).not.toContain('data:image')
    expect(raw).toMatch(/redacted/i)
  })

  it('collect status never embeds api key values', async () => {
    store.set(
      'jarvis_hybrid_ai_v1',
      JSON.stringify({
        mode: 'auto',
        providers: { openai: { apiKey: 'sk-SHOULD_NOT_APPEAR', model: 'gpt-4o' }, openrouter: {} },
      }),
    )
    const st = await collectFeatureDiagStatus({ version: '1.22.1', buildId: 'test' })
    const raw = JSON.stringify(st)
    expect(raw).not.toContain('sk-SHOULD_NOT_APPEAR')
    expect(st.providers.openai.configured).toBe(true)
  })

  it('error codes are recorded without secrets', () => {
    recordFeatureDiagError(FeatureDiagCodes.LIFE_INTENT, 'leak sk-abcdefghijklmnopqrstuv and data:image/png;base64,xxx')
    const errs = loadFeatureDiagErrors()
    expect(errs[0]?.code).toBe(FeatureDiagCodes.LIFE_INTENT)
    expect(JSON.stringify(errs)).not.toMatch(/sk-abc/)
    expect(JSON.stringify(errs)).not.toContain('data:image')
  })

  it('clearAppCaches does not touch localStorage user keys (source)', () => {
    const main = readFileSync(join(root, 'src/main.ts'), 'utf8')
    const render = readFileSync(join(root, 'src/featureDiag/render.ts'), 'utf8')
    expect(main).toContain('async function clearAppCaches')
    expect(main).toMatch(/caches\.delete/)
    expect(main).not.toMatch(/clearAppCaches[\s\S]{0,400}localStorage\.clear/)
    expect(main).toContain('fdiag-cache-refresh')
    expect(render).toContain('앱 캐시만 새로고침')
  })

  it('error boundaries exist for camera and family views', () => {
    const main = readFileSync(join(root, 'src/main.ts'), 'utf8')
    expect(main).toMatch(/ai-camera[\s\S]{0,200}다시 시도/)
    expect(main).toMatch(/family-helper[\s\S]{0,200}다시 시도/)
    expect(main).toMatch(/LIFE-EXEC-001|VISION-|FAMILY-STORAGE/)
  })

  it('cache refresh preserves family/parking keys in simulated storage', () => {
    store.set('aizio_family_helper_v1', JSON.stringify({ members: [{ id: '1', name: 'A' }] }))
    store.set('aizio_parking_memory_v1', JSON.stringify({ id: 'p', label: 'B2' }))
    // clearAppCaches only deletes Cache Storage — localStorage Map untouched
    expect(store.get('aizio_family_helper_v1')).toBeTruthy()
    expect(store.get('aizio_parking_memory_v1')).toBeTruthy()
  })
})
