import { getSkillById } from './skillRegistry'
import type { AizioSkill, SkillContext, SkillResult } from './types'

function withTimeout<T>(promise: Promise<T>, ms: number, signal?: AbortSignal): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    if (signal?.aborted) {
      reject(Object.assign(new Error('cancelled'), { code: 'cancelled' }))
      return
    }
    const timer = setTimeout(() => {
      reject(Object.assign(new Error('timeout'), { code: 'skill_timeout' }))
    }, ms)
    const onAbort = () => {
      clearTimeout(timer)
      reject(Object.assign(new Error('cancelled'), { code: 'cancelled' }))
    }
    signal?.addEventListener('abort', onAbort, { once: true })
    promise.then(
      (v) => {
        clearTimeout(timer)
        signal?.removeEventListener('abort', onAbort)
        resolve(v)
      },
      (e) => {
        clearTimeout(timer)
        signal?.removeEventListener('abort', onAbort)
        reject(e)
      },
    )
  })
}

export async function executeSkill(skill: AizioSkill, ctx: SkillContext): Promise<SkillResult> {
  try {
    const mod = await skill.load()
    if (!mod.isAvailable() || !skill.available) {
      // Still allow execute for project-style adapters that explain unavailability
      if (!mod.canHandle(ctx) && !skill.available) {
        return {
          success: false,
          status: 'unavailable',
          data: { skillId: skill.id },
          message: `현재 ${skill.displayName} 기능이 연결되어 있지 않습니다.`,
          error: { code: 'no_skill_available' },
        }
      }
    }
    if (!mod.canHandle(ctx)) {
      return {
        success: false,
        status: 'unavailable',
        data: { skillId: skill.id },
        message: `${skill.displayName}이(가) 이 요청을 처리할 수 없습니다.`,
        error: { code: 'no_skill_available' },
      }
    }
    return await withTimeout(mod.execute(ctx), skill.timeoutMs, ctx.signal)
  } catch (err) {
    const code =
      err && typeof err === 'object' && 'code' in err
        ? String((err as { code: string }).code)
        : 'skill_failed'
    if (code === 'skill_timeout') {
      return {
        success: false,
        status: 'failed',
        data: { skillId: skill.id },
        message: '요청 시간이 초과되었습니다. 다시 시도해 주세요.',
        error: { code: 'skill_timeout' },
      }
    }
    if (code === 'cancelled') {
      return {
        success: false,
        status: 'cancelled',
        data: { skillId: skill.id },
        message: '요청이 취소되었습니다.',
        error: { code: 'cancelled' },
      }
    }
    return {
      success: false,
      status: 'failed',
      data: { skillId: skill.id },
      message: `${skill.displayName} 실행에 실패했습니다.`,
      error: { code: 'skill_failed', detail: err instanceof Error ? err.message : String(err) },
    }
  }
}

export async function executeSkillById(id: string, ctx: SkillContext): Promise<SkillResult> {
  const skill = getSkillById(id)
  if (!skill) {
    return {
      success: false,
      status: 'unavailable',
      data: {},
      message: '등록되지 않은 기능입니다.',
      error: { code: 'no_skill_available' },
    }
  }
  return executeSkill(skill, ctx)
}
