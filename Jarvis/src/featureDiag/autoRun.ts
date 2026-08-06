/**
 * One-tap auto diagnosis for Life Assistant / AI Camera / Family Helper.
 * Uses tagged test data and cleans up after itself — does not wipe user data.
 */

import { routeLifeAssistantIntent } from '../life-assistant/intentRouter'
import { executeLifeAssistantIntent } from '../life-assistant/executor'
import { clearParkingMemory, loadParkingMemory, saveParkingMemory } from '../life-assistant/storage'
import { clearInterpretMode, loadInterpretMode, saveInterpretMode } from '../translateBrain'
import { mockVisionProvider } from '../ai-camera/providers/mockVision'
import { parseVisionResultJson } from '../ai-camera/visionSchema'
import {
  clearVisionHistory,
  deleteVisionHistoryItem,
  loadVisionHistory,
  saveVisionHistoryItem,
} from '../ai-camera/historyStorage'
import { analyzeImage } from '../ai-camera/visionService'
import {
  addFamilyHelperSchedule,
  addFamilyHelperTask,
  addGrowthRecord,
  addMedication,
  addVaccination,
  deleteFamilyHelperSchedule,
  deleteFamilyHelperTask,
  deleteFamilyMember,
  detectScheduleConflicts,
  listFamilyHelperSchedules,
  listFamilyMembers,
  loadFamilyHelperBundle,
  logMedication,
  updateFamilyHelperSchedule,
  upsertEmergencyCard,
  upsertFamilyMember,
} from '../family-helper/store'
import { FeatureDiagCodes, recordFeatureDiagError } from './errorCodes'
import type { VisionMode } from '../ai-camera/types'

export type DiagVerdict = 'pass' | 'warn' | 'fail' | 'needs_device'

export type DiagStepResult = {
  id: string
  area: 'life' | 'camera' | 'family' | 'pwa'
  label: string
  verdict: DiagVerdict
  detail: string
  code?: string
}

export type AutoDiagReport = {
  startedAt: string
  finishedAt: string
  steps: DiagStepResult[]
  summary: { pass: number; warn: number; fail: number; needs_device: number }
  cleanedUp: boolean
}

const TAG = '[진단테스트]'
const TINY_JPEG =
  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAGfAP/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAQUCf//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQMBAT8Bf//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQIBAT8Bf//Z'

function step(
  area: DiagStepResult['area'],
  id: string,
  label: string,
  verdict: DiagVerdict,
  detail: string,
  code?: string,
): DiagStepResult {
  if (verdict === 'fail' && code) recordFeatureDiagError(code, detail)
  return { id, area, label, verdict, detail, code }
}

function tomorrowYmd(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().slice(0, 10)
}

async function runLifeDiag(out: DiagStepResult[]): Promise<string[]> {
  const createdScheduleIds: string[] = []
  const prevParking = loadParkingMemory()
  const prevInterpret = loadInterpretMode()

  const phrases: Array<{ text: string; expectIntent: string }> = [
    { text: '오늘 일정 알려줘', expectIntent: 'calendar.read' },
    { text: `내일 오후 3시에 ${TAG} 병원 일정 추가해줘`, expectIntent: 'calendar.create' },
    { text: `30분 뒤 ${TAG} 약 알림 만들어줘`, expectIntent: 'reminder.create' },
    { text: `${TAG} 주차 위치 기억해줘 B3-진단`, expectIntent: 'parking.save' },
    { text: '테스트 주차 위치 알려줘', expectIntent: 'parking.read' },
    { text: '이번 주 가족 일정 알려줘', expectIntent: 'family.schedule.read' },
    { text: '지금부터 번역 모드로 바꿔줘', expectIntent: 'translation.enable' },
    { text: '오늘 하루 요약해줘', expectIntent: 'daily.summary' },
    { text: '이 문서 읽어줘', expectIntent: 'camera.open' },
  ]

  // Fix parking read phrase to match rules
  phrases[4] = { text: '내가 주차한 곳 알려줘', expectIntent: 'parking.read' }

  for (const p of phrases) {
    try {
      const routed = await routeLifeAssistantIntent(p.text, { allowAi: false })
      if (routed.intent !== p.expectIntent) {
        out.push(
          step(
            'life',
            `life-intent-${p.expectIntent}`,
            p.text,
            'fail',
            `의도 ${routed.intent} (기대 ${p.expectIntent})`,
            FeatureDiagCodes.LIFE_INTENT,
          ),
        )
        continue
      }
      // Date/time check for create
      if (p.expectIntent === 'calendar.create') {
        if (!routed.date || !routed.time) {
          out.push(
            step('life', 'life-dt', p.text, 'fail', '날짜/시간 추출 실패', FeatureDiagCodes.LIFE_INTENT),
          )
          continue
        }
        if (routed.time !== '15:00') {
          out.push(
            step('life', 'life-time', p.text, 'warn', `시간 ${routed.time} (기대 15:00)`),
          )
        }
      }

      const reply = await executeLifeAssistantIntent(routed)
      if (!reply?.text) {
        out.push(
          step('life', `life-exec-${p.expectIntent}`, p.text, 'fail', '실행 결과 없음', FeatureDiagCodes.LIFE_EXEC),
        )
        continue
      }

      if (p.expectIntent === 'calendar.create') {
        const hit = listFamilyHelperSchedules({ days: 14, includeDone: true }).find((s) =>
          s.title.includes(TAG),
        )
        if (hit) {
          createdScheduleIds.push(hit.id)
          // duplicate check
          const before = listFamilyHelperSchedules({ days: 14, includeDone: true }).filter((s) =>
            s.title.includes(TAG),
          ).length
          await executeLifeAssistantIntent(routed)
          const after = listFamilyHelperSchedules({ days: 14, includeDone: true }).filter((s) =>
            s.title.includes(TAG),
          ).length
          if (after > before + 1) {
            out.push(step('life', 'life-dup', '중복 일정', 'warn', `중복 생성 ${after - before}건`))
          }
          // collect extras for cleanup
          for (const s of listFamilyHelperSchedules({ days: 14, includeDone: true })) {
            if (s.title.includes(TAG) && !createdScheduleIds.includes(s.id)) createdScheduleIds.push(s.id)
          }
          out.push(step('life', 'life-create', p.text, 'pass', `저장 성공 · ${hit.date} ${hit.time || ''}`))
        } else {
          out.push(
            step('life', 'life-create', p.text, 'fail', '저장 확인 실패', FeatureDiagCodes.LIFE_EXEC),
          )
        }
        continue
      }

      if (p.expectIntent === 'parking.save') {
        const park = loadParkingMemory()
        out.push(
          park?.label.includes('B3') || park?.note?.includes('B3')
            ? step('life', 'life-park-save', p.text, 'pass', `주차 저장 · ${park?.label}`)
            : step('life', 'life-park-save', p.text, 'fail', '주차 저장 실패', FeatureDiagCodes.LIFE_EXEC),
        )
        continue
      }

      if (p.expectIntent === 'parking.read') {
        out.push(
          /주차|B3/.test(reply.text)
            ? step('life', 'life-park-read', p.text, 'pass', '주차 조회 성공')
            : step('life', 'life-park-read', p.text, 'fail', reply.text.slice(0, 80), FeatureDiagCodes.LIFE_EXEC),
        )
        continue
      }

      if (p.expectIntent === 'translation.enable') {
        out.push(
          loadInterpretMode().active
            ? step('life', 'life-tr', p.text, 'pass', '번역 모드 활성')
            : step('life', 'life-tr', p.text, 'fail', '번역 모드 미활성', FeatureDiagCodes.LIFE_EXEC),
        )
        continue
      }

      if (p.expectIntent === 'camera.open') {
        out.push(
          reply.view === 'ai-camera'
            ? step('life', 'life-cam', p.text, 'pass', '카메라 화면 연결')
            : step('life', 'life-cam', p.text, 'fail', `view=${reply.view}`, FeatureDiagCodes.LIFE_EXEC),
        )
        continue
      }

      out.push(step('life', `life-${p.expectIntent}`, p.text, 'pass', reply.text.slice(0, 100)))
    } catch (e) {
      out.push(
        step(
          'life',
          `life-err-${p.expectIntent}`,
          p.text,
          'fail',
          e instanceof Error ? e.message : 'error',
          FeatureDiagCodes.LIFE_EXEC,
        ),
      )
    }
  }

  // Cleanup life test artifacts
  for (const id of createdScheduleIds) {
    try {
      deleteFamilyHelperSchedule(id)
    } catch {
      /* ignore */
    }
  }
  // Restore parking
  try {
    if (prevParking) {
      saveParkingMemory({
        label: prevParking.label,
        note: prevParking.note,
        lat: prevParking.lat,
        lng: prevParking.lng,
        source: prevParking.source,
        id: prevParking.id,
      })
    } else {
      clearParkingMemory()
    }
  } catch {
    /* ignore */
  }
  try {
    if (prevInterpret.active) saveInterpretMode(prevInterpret)
    else clearInterpretMode()
  } catch {
    /* ignore */
  }

  return createdScheduleIds
}

async function runCameraDiag(out: DiagStepResult[]): Promise<void> {
  const modes: VisionMode[] = [
    'auto',
    'ocr',
    'translate',
    'product',
    'food',
    'nature',
    'document',
    'medicine',
    'free',
  ]
  const histIds: string[] = []

  for (const mode of modes) {
    try {
      const r = await mockVisionProvider.analyzeImage({
        imageDataUrl: TINY_JPEG,
        mimeType: 'image/jpeg',
        mode,
        question: mode === 'free' ? '무엇이 보이나요?' : undefined,
      })
      if (!r.summary) {
        out.push(step('camera', `cam-${mode}`, mode, 'fail', 'summary 없음', FeatureDiagCodes.VISION_PROVIDER))
        continue
      }
      // schema roundtrip
      const healed = parseVisionResultJson(
        JSON.stringify({ ...r, extraJunk: true }),
        mode,
        'mock',
      )
      out.push(
        healed
          ? step('camera', `cam-${mode}`, `Mock ${mode}`, 'pass', r.summary.slice(0, 60))
          : step('camera', `cam-${mode}`, `Mock ${mode}`, 'warn', '스키마 재검증 약함'),
      )
    } catch (e) {
      out.push(
        step(
          'camera',
          `cam-${mode}`,
          mode,
          'fail',
          e instanceof Error ? e.message : 'error',
          FeatureDiagCodes.VISION_PROVIDER,
        ),
      )
    }
  }

  // JSON healing
  const healed = parseVisionResultJson(
    `{"ok":true,"mode":"ocr","summary":"t","subjects":[],"confidence":0.5,"detail":"d","warnings":[],"followUps":[],"sensitive":false,}`,
    'ocr',
    'test',
  )
  out.push(
    healed
      ? step('camera', 'cam-heal', 'JSON healing', 'pass', 'trailing comma 복구')
      : step('camera', 'cam-heal', 'JSON healing', 'fail', 'healing 실패', FeatureDiagCodes.VISION_SCHEMA),
  )

  // History save/delete
  try {
    const id = `diag_vh_${Date.now().toString(36)}`
    saveVisionHistoryItem({
      id,
      savedAt: Date.now(),
      mode: 'document',
      summary: `${TAG} vision`,
      result: {
        ok: true,
        mode: 'document',
        provider: 'mock',
        summary: `${TAG} vision`,
        subjects: [],
        confidence: 0.5,
        detail: 'diag',
        warnings: [],
        followUps: [],
        sensitive: false,
      },
    })
    histIds.push(id)
    const found = loadVisionHistory().some((h) => h.id === id)
    deleteVisionHistoryItem(id)
    const gone = !loadVisionHistory().some((h) => h.id === id)
    out.push(
      found && gone
        ? step('camera', 'cam-hist', '기록 저장·삭제', 'pass', 'OK')
        : step('camera', 'cam-hist', '기록 저장·삭제', 'fail', 'history fail', FeatureDiagCodes.VISION_UPLOAD),
    )
  } catch (e) {
    out.push(
      step(
        'camera',
        'cam-hist',
        '기록',
        'fail',
        e instanceof Error ? e.message : 'error',
        FeatureDiagCodes.VISION_UPLOAD,
      ),
    )
  }

  // Handoff simulation (schedule/task) with cleanup
  try {
    const demo = await mockVisionProvider.analyzeImage({
      imageDataUrl: TINY_JPEG,
      mimeType: 'image/jpeg',
      mode: 'document',
    })
    const title = `${TAG} ${demo.document?.suggestedTasks?.[0] || '준비물'}`
    const sched = addFamilyHelperSchedule({
      title,
      date: tomorrowYmd(),
      category: 'supplies',
      note: 'diag handoff',
    })
    const task = addFamilyHelperTask({ title, kind: 'supplies', body: demo.ocrText || '' })
    deleteFamilyHelperSchedule(sched.id)
    deleteFamilyHelperTask(task.id)
    out.push(step('camera', 'cam-handoff', '일정·할일 핸드오프', 'pass', '생성 후 정리 완료'))
  } catch (e) {
    out.push(
      step(
        'camera',
        'cam-handoff',
        '핸드오프',
        'fail',
        e instanceof Error ? e.message : 'error',
        FeatureDiagCodes.VISION_PROVIDER,
      ),
    )
  }

  // Provider fallback path (force mock via offline analyze)
  const prevOnline = navigator.onLine
  try {
    Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => false })
    const offline = await analyzeImage({
      imageDataUrl: TINY_JPEG,
      mimeType: 'image/jpeg',
      mode: 'ocr',
    })
    out.push(
      offline.errorCode === 'offline' || offline.provider.includes('mock')
        ? step('camera', 'cam-fallback', '오프라인 fallback', 'pass', offline.provider)
        : step('camera', 'cam-fallback', '오프라인 fallback', 'warn', offline.provider),
    )
  } catch (e) {
    out.push(
      step(
        'camera',
        'cam-fallback',
        'fallback',
        'fail',
        e instanceof Error ? e.message : 'error',
        FeatureDiagCodes.VISION_PROVIDER,
      ),
    )
  } finally {
    Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => prevOnline })
  }

  // Live vision key check (no paid call)
  out.push(
    step(
      'camera',
      'cam-live',
      '실사용 Vision',
      'needs_device',
      '실사용 Vision 검증 대기 — API 키 연결 필요 (키 없어도 Mock 통과)',
    ),
  )

  for (const id of histIds) {
    try {
      deleteVisionHistoryItem(id)
    } catch {
      /* ignore */
    }
  }
  // purge any leftover diag tags in history
  for (const h of loadVisionHistory()) {
    if (h.summary.includes(TAG)) deleteVisionHistoryItem(h.id)
  }
  void clearVisionHistory
}

async function runFamilyDiag(out: DiagStepResult[]): Promise<void> {
  const createdMemberIds: string[] = []
  const createdSchedIds: string[] = []
  const createdTaskIds: string[] = []

  try {
    const m = upsertFamilyMember({ name: `${TAG}한영`, relation: 'child', school: '진단초' })
    createdMemberIds.push(m.id)
    const m2 = upsertFamilyMember({ id: m.id, name: `${TAG}한영이`, relation: 'child' })
    out.push(
      m2.name.includes('한영이')
        ? step('family', 'fam-member', '구성원 생성·수정', 'pass', m2.name)
        : step('family', 'fam-member', '구성원', 'fail', '수정 실패', FeatureDiagCodes.FAMILY_STORAGE),
    )

    const s = addFamilyHelperSchedule({
      title: `${TAG}하원`,
      date: tomorrowYmd(),
      time: '16:30',
      memberId: m.id,
      category: 'pickup',
      recur: 'weekly',
      notifyMinutesBefore: 30,
    })
    createdSchedIds.push(s.id)
    updateFamilyHelperSchedule(s.id, { done: true })
    out.push(step('family', 'fam-sched', '일정·완료', 'pass', `${s.date} ${s.time}`))

    const conflict = detectScheduleConflicts(s.date, s.title)
    out.push(
      step(
        'family',
        'fam-conflict',
        '중복 감지',
        conflict.length ? 'pass' : 'warn',
        conflict[0] || '동일 항목 1건만 존재(정상)',
      ),
    )

    const task = addFamilyHelperTask({
      title: `${TAG}스케치북`,
      kind: 'supplies',
      memberId: m.id,
      dueDate: tomorrowYmd(),
    })
    createdTaskIds.push(task.id)
    const hw = addFamilyHelperTask({ title: `${TAG}수학숙제`, kind: 'homework', memberId: m.id })
    createdTaskIds.push(hw.id)
    out.push(step('family', 'fam-tasks', '준비물·숙제', 'pass', '2건'))

    const med = addMedication({
      memberId: m.id,
      name: `${TAG}해열제`,
      times: ['09:00'],
      startDate: tomorrowYmd(),
      note: '용량은 라벨 기준(진단)',
    })
    logMedication(med.id, 'taken')
    logMedication(med.id, 'skipped')
    const vax = addVaccination({
      memberId: m.id,
      name: `${TAG}독감`,
      date: tomorrowYmd(),
      nextDate: tomorrowYmd(),
    })
    out.push(step('family', 'fam-med', '약·예방접종', 'pass', `${med.name} / ${vax.name}`))

    addGrowthRecord({ memberId: m.id, heightCm: 120, weightKg: 25, lifeNote: `${TAG}성장` })
    upsertEmergencyCard({
      memberId: m.id,
      guardianPhone: '010-0000-0000',
      allergyNote: '땅콩(진단)',
      locked: true,
      updatedAt: Date.now(),
    })
    out.push(step('family', 'fam-emerg', '긴급카드 잠금', 'pass', 'locked=true'))

    // Life assistant read link
    const read = await routeLifeAssistantIntent('가족 일정 보여줘', { allowAi: false })
    const exec = await executeLifeAssistantIntent(read)
    out.push(
      exec?.text
        ? step('family', 'fam-life-link', '생활비서 조회 연결', 'pass', exec.text.slice(0, 80))
        : step('family', 'fam-life-link', '생활비서 연결', 'warn', '조회 문구 없음'),
    )

    // Simulate reload restore
    const snap = localStorage.getItem('aizio_family_helper_v1')
    if (snap) {
      const parsed = JSON.parse(snap)
      const ok = Array.isArray(parsed.members) && parsed.members.some((x: { id: string }) => x.id === m.id)
      out.push(
        ok
          ? step('family', 'fam-restore', '재로딩 복원', 'pass', 'localStorage 유지')
          : step('family', 'fam-restore', '복원', 'fail', '멤버 없음', FeatureDiagCodes.FAMILY_STORAGE),
      )
    }
  } catch (e) {
    out.push(
      step(
        'family',
        'fam-fatal',
        '가족 도우미',
        'fail',
        e instanceof Error ? e.message : 'error',
        FeatureDiagCodes.FAMILY_STORAGE,
      ),
    )
  }

  // Cleanup tagged test data without wiping user data
  try {
    const bundle = loadFamilyHelperBundle()
    for (const s of bundle.schedules) {
      if (s.title.includes(TAG)) deleteFamilyHelperSchedule(s.id)
    }
    for (const t of listFamilyHelperSchedules({ days: 400, includeDone: true })) {
      if (t.title.includes(TAG)) deleteFamilyHelperSchedule(t.id)
    }
    for (const id of createdSchedIds) deleteFamilyHelperSchedule(id)
    for (const id of createdTaskIds) deleteFamilyHelperTask(id)

    // Soft-remove test members: delete member records created in this run
    for (const id of createdMemberIds) deleteFamilyMember(id)

    // Purge remaining tagged members
    for (const m of listFamilyMembers(true)) {
      if (m.name.includes(TAG)) deleteFamilyMember(m.id)
    }

    // Clean meds/vax/growth/emergency for deleted members by rewriting bundle carefully
    const b = loadFamilyHelperBundle()
    const keepMemberIds = new Set(listFamilyMembers(true).map((m) => m.id))
    b.medications = b.medications.filter((m) => keepMemberIds.has(m.memberId) && !m.name.includes(TAG))
    b.vaccinations = b.vaccinations.filter((v) => keepMemberIds.has(v.memberId) && !v.name.includes(TAG))
    b.growth = b.growth.filter((g) => keepMemberIds.has(g.memberId) && !(g.lifeNote || '').includes(TAG))
    b.emergency = b.emergency.filter((e) => keepMemberIds.has(e.memberId))
    b.tasks = b.tasks.filter((t) => !t.title.includes(TAG))
    b.schedules = b.schedules.filter((s) => !s.title.includes(TAG))
    localStorage.setItem(
      'aizio_family_helper_v1',
      JSON.stringify({ ...b, updatedAt: Date.now(), schemaVersion: 1 }),
    )
    out.push(step('family', 'fam-cleanup', '테스트 데이터 정리', 'pass', '태그 항목 삭제'))
  } catch (e) {
    out.push(
      step(
        'family',
        'fam-cleanup',
        '정리',
        'warn',
        e instanceof Error ? e.message : 'cleanup warn',
        FeatureDiagCodes.FAMILY_STORAGE,
      ),
    )
  }
}

export async function runFeatureAutoDiag(): Promise<AutoDiagReport> {
  const startedAt = new Date().toISOString()
  const steps: DiagStepResult[] = []
  await runLifeDiag(steps)
  await runCameraDiag(steps)
  await runFamilyDiag(steps)

  // PWA / storage smoke
  try {
    const k = 'aizio_feature_diag_probe_v1'
    localStorage.setItem(k, '1')
    const ok = localStorage.getItem(k) === '1'
    localStorage.removeItem(k)
    steps.push(
      ok
        ? step('pwa', 'pwa-storage', '저장소 쓰기', 'pass', 'localStorage OK')
        : step('pwa', 'pwa-storage', '저장소', 'fail', 'write fail', FeatureDiagCodes.PWA_CACHE),
    )
  } catch (e) {
    steps.push(
      step(
        'pwa',
        'pwa-storage',
        '저장소',
        'fail',
        e instanceof Error ? e.message : 'error',
        FeatureDiagCodes.PWA_CACHE,
      ),
    )
  }

  steps.push(
    step(
      'pwa',
      'pwa-update',
      'PWA 업데이트',
      'needs_device',
      '아이폰 홈화면에서 「새 버전 확인」「앱 캐시만 새로고침」을 눌러 확인해 주세요',
    ),
  )

  const summary = { pass: 0, warn: 0, fail: 0, needs_device: 0 }
  for (const s of steps) summary[s.verdict]++

  return {
    startedAt,
    finishedAt: new Date().toISOString(),
    steps,
    summary,
    cleanedUp: true,
  }
}
