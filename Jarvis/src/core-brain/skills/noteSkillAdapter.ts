import { findMemory, loadMemory, upsertMemory } from '../../storage'
import type { SkillContext, SkillResult } from '../types'

export function isAvailable(): boolean {
  return true
}

export function canHandle(ctx: SkillContext): boolean {
  return ctx.intent === 'create_note' || ctx.intent === 'search_note'
}

export async function execute(ctx: SkillContext): Promise<SkillResult> {
  const text = ctx.request.normalizedText || ctx.request.text

  if (ctx.intent === 'create_note') {
    const body =
      (typeof ctx.entities.body === 'string' && ctx.entities.body) ||
      text
        .replace(/^(?:기억해|기억해줘|메모해|메모해줘)\s*/i, '')
        .replace(/(?:을|를|은|는)?\s*(?:기억해|기억해줘|메모해)$/i, '')
        .trim()
    if (!body) {
      return {
        success: false,
        status: 'needs_user_action',
        data: {},
        message: '기억할 내용을 함께 말해 주세요. 예: 「기억해 와이파이 비밀번호는 …」',
        error: { code: 'user_action_required' },
      }
    }
    const kv = body.match(/^(.+?)(?:은|는|:)\s*(.+)$/)
    if (kv) {
      upsertMemory(kv[1].trim(), kv[2].trim())
      return {
        success: true,
        status: 'completed',
        data: { key: kv[1].trim() },
        message: `"${kv[1].trim()}" 기억했습니다.`,
        speakText: '기억해 두었어요.',
        error: null,
      }
    }
    upsertMemory(`메모 ${new Date().toLocaleString('ko-KR')}`, body)
    return {
      success: true,
      status: 'completed',
      data: {},
      message: `메모 저장: ${body}`,
      speakText: '메모를 저장했습니다.',
      error: null,
    }
  }

  // search_note
  const q =
    (typeof ctx.entities.query === 'string' && ctx.entities.query) ||
    text.replace(/메모|기억|보여|목록|찾아|검색|뭐였지/g, '').trim()
  if (q) {
    const hits = findMemory(q)
    if (!hits.length) {
      return {
        success: true,
        status: 'completed',
        data: { count: 0 },
        message: '기억이 없습니다. "기억해 키는 값"으로 저장하세요.',
        speakText: '저장된 기억이 없어요.',
        error: null,
      }
    }
    return {
      success: true,
      status: 'completed',
      data: { count: hits.length },
      message: hits
        .slice(0, 8)
        .map((m) => `• ${m.key}: ${m.value}`)
        .join('\n'),
      speakText: `${hits.length}개 찾았어요.`,
      error: null,
    }
  }
  const items = loadMemory()
  return {
    success: true,
    status: 'completed',
    data: { count: items.length },
    message: items.length
      ? items
          .slice(0, 12)
          .map((m) => `• ${m.key}: ${m.value}`)
          .join('\n')
      : '저장된 기억이 없습니다.',
    speakText: items.length ? `메모 ${items.length}개예요.` : '저장된 메모가 없어요.',
    error: null,
  }
}
