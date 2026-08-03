import { dnaContextSnippet } from './dna/dnaService'
import { nextActions } from './goals/goalService'
import { loadProjects, mostUrgentProject, computeProjectHealth } from './projects/projectService'
import { ensureLifeOsSchema } from './lifeRepository'
import { loadLifeFlags } from './featureFlags'
import { hasAnyConfiguredProvider } from '../ai-providers'

/** Compact world context for “오늘 뭐 해야 해?” — never invent missing data. */
export function buildLifeWorldContext(): {
  dna: string
  nextGoalActions: string[]
  urgentProject: string | null
  aiReady: boolean
  flags: ReturnType<typeof loadLifeFlags>
} {
  ensureLifeOsSchema()
  const urgent = mostUrgentProject()
  let urgentProject: string | null = null
  if (urgent) {
    const h = computeProjectHealth(urgent)
    urgentProject = `${urgent.name} (미완료 ${h.openTasks}, 버그 ${h.openBugs})`
  }
  return {
    dna: dnaContextSnippet(5),
    nextGoalActions: nextActions(5),
    urgentProject,
    aiReady: hasAnyConfiguredProvider(),
    flags: loadLifeFlags(),
  }
}

export function formatTodayBrief(): string {
  const ctx = buildLifeWorldContext()
  const lines = ['【오늘 할 일 · AIZIO World】']
  if (ctx.nextGoalActions.length) {
    lines.push('목표 다음 행동:')
    lines.push(...ctx.nextGoalActions.map((a) => `• ${a}`))
  } else {
    lines.push('목표 다음 행동: (없음)')
  }
  lines.push(ctx.urgentProject ? `우선 프로젝트: ${ctx.urgentProject}` : '우선 프로젝트: (없음)')
  lines.push('일정·할 일·가족 일정은 각 탭/명령으로 확인하세요. 없는 항목은 만들지 않습니다.')
  if (ctx.dna) lines.push(`DNA 힌트: ${ctx.dna}`)
  return lines.join('\n')
}

export function listProjectsCount(): number {
  return loadProjects().length
}
