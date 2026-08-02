import type { SkillContext, SkillResult } from '../types'

/** No project entity exists in storage yet — register as unavailable. */
export function isAvailable(): boolean {
  return false
}

export function canHandle(ctx: SkillContext): boolean {
  return ctx.intent === 'project_status' || ctx.intent === 'project_planning'
}

export async function execute(ctx: SkillContext): Promise<SkillResult> {
  const name =
    (typeof ctx.entities.projectName === 'string' && ctx.entities.projectName) || '해당 프로젝트'
  return {
    success: false,
    status: 'unavailable',
    data: { projectName: name },
    message: `현재 프로젝트 기능이 연결되지 않아 「${name}」 상태를 조회할 수 없습니다.`,
    speakText: '프로젝트 기능이 아직 연결되지 않았어요.',
    error: { code: 'no_skill_available' },
  }
}
