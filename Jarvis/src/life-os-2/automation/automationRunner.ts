import { addReminder } from '../../storage'
import { loadItems, saveItems, LOS2_KEYS, los2Id, nowIso } from '../repository'
import type { AutomationAction, AutomationRun, AutomationV2 } from './automationTypes'

const recentRuns = new Map<string, number>()
const LOOP_MS = 60_000

export function loadAutomations(): AutomationV2[] {
  return loadItems<AutomationV2>(LOS2_KEYS.automations)
}

export function saveAutomations(items: AutomationV2[]): void {
  saveItems(LOS2_KEYS.automations, items, 40)
}

export function loadRuns(): AutomationRun[] {
  return loadItems<AutomationRun>(LOS2_KEYS.automationRuns)
}

function saveRuns(items: AutomationRun[]): void {
  saveItems(LOS2_KEYS.automationRuns, items, 80)
}

async function runAction(a: AutomationAction): Promise<{ ok: boolean; message: string }> {
  switch (a.kind) {
    case 'noop_blocked':
      return { ok: false, message: a.label }
    case 'show_brief':
      return { ok: true, message: '브리핑을 준비했습니다. 「브리핑」으로 확인하세요.' }
    case 'show_todos':
      return { ok: true, message: '할 일 목록을 준비했습니다. 「할 일 목록」으로 확인하세요.' }
    case 'show_family':
      return { ok: true, message: '가족 정보를 준비했습니다. 「가족」으로 확인하세요.' }
    case 'prepare_music':
      return {
        ok: true,
        message: '음악 준비 안내: 「잔잔한 음악 틀어줘」를 실행해 주세요. (자동 재생 성공을 단정하지 않음)',
      }
    case 'prepare_navigation':
      return {
        ok: true,
        message: `길안내 준비: 「${a.payload?.destination || '목적지'} 길안내」를 실행해 주세요.`,
      }
    case 'open_project':
      return { ok: true, message: '프로젝트 화면 안내만 제공합니다.' }
    case 'start_focus':
      return { ok: true, message: '「집중 모드 시작」을 말씀해 주세요.' }
    case 'create_reminder': {
      try {
        addReminder(a.payload?.text || '자동화 알림')
        return { ok: true, message: '리마인더를 추가했습니다.' }
      } catch (e) {
        return { ok: false, message: e instanceof Error ? e.message : '리마인더 실패' }
      }
    }
    default:
      return { ok: false, message: '알 수 없는 Action' }
  }
}

export async function runAutomation(auto: AutomationV2): Promise<AutomationRun> {
  const last = recentRuns.get(auto.id) || 0
  if (Date.now() - last < LOOP_MS) {
    const blocked: AutomationRun = {
      id: los2Id('arun'),
      automationId: auto.id,
      at: nowIso(),
      results: [{ action: 'noop_blocked', ok: false, message: '반복 실행 방지 (1분)' }],
      overall: 'failed',
    }
    const runs = loadRuns()
    runs.unshift(blocked)
    saveRuns(runs)
    return blocked
  }
  recentRuns.set(auto.id, Date.now())

  const results: AutomationRun['results'] = []
  for (const a of auto.actions) {
    const r = await runAction(a)
    results.push({ action: a.kind, ok: r.ok, message: r.message })
  }
  const okCount = results.filter((r) => r.ok).length
  const overall =
    okCount === results.length ? 'success' : okCount === 0 ? 'failed' : 'partial'

  const run: AutomationRun = {
    id: los2Id('arun'),
    automationId: auto.id,
    at: nowIso(),
    results,
    overall,
  }
  const runs = loadRuns()
  runs.unshift(run)
  saveRuns(runs)

  const all = loadAutomations()
  const hit = all.find((x) => x.id === auto.id)
  if (hit) {
    hit.lastRunAt = run.at
    saveAutomations(all)
  }
  return run
}

export function formatRun(run: AutomationRun): string {
  return [
    `【자동화 실행 · ${run.overall}】`,
    ...run.results.map((r) => `• ${r.action}: ${r.ok ? '성공' : '실패'} — ${r.message}`),
    run.overall === 'partial' ? '일부만 성공했습니다. 전체를 성공으로 표시하지 않습니다.' : '',
  ]
    .filter(Boolean)
    .join('\n')
}
