/**
 * Claude heart for Idea Bank — prefer Anthropic Claude, then OpenRouter Claude,
 * then any Hybrid AI. Offline falls back to a structured local scaffold.
 */

import {
  ANTHROPIC_DEFAULT_MODEL,
  OPENROUTER_CLAUDE_MODEL,
  getHybridProvider,
  hasAnyConfiguredProvider,
  isProviderConfigured,
  runHybridChat,
} from '../../ai-providers'
import { isLifeFeatureEnabled } from '../featureFlags'
import { saveIdea, searchIdeas } from './ideaService'
import type { IdeaRecord } from './ideaTypes'

const CLAUDE_HEART_SYSTEM = [
  '당신은 AIZIO 아이디어 은행의 Claude 심장입니다.',
  '사용자의 씨앗 아이디어를 따뜻하고 구체적으로 키워 주세요.',
  '한국어로, 과한 미사여구 없이, 실행 가능한 형태로.',
  '응답 형식(이 순서·헤더를 지키세요):',
  '## 한 줄 핵심',
  '## 왜 좋은가',
  '## 구체화 (3~5가지)',
  '## 다음 행동 (3가지)',
  '## 태그',
  '(태그는 쉼표로 3~6개)',
].join('\n')

export type IdeaBrainMode = 'generate' | 'expand' | 'brainstorm'

export type IdeaBrainResult = {
  text: string
  idea: IdeaRecord
  providerId: string
  model: string
  usedClaude: boolean
}

function localScaffold(seed: string, mode: IdeaBrainMode): string {
  const verb =
    mode === 'brainstorm' ? '브레인스토밍' : mode === 'expand' ? '발전' : '생성'
  return [
    `【아이디어 ${verb} · 로컬】`,
    `## 한 줄 핵심`,
    seed.trim().slice(0, 120) || '새 아이디어',
    ``,
    `## 왜 좋은가`,
    `- 사용자가 직접 떠올린 씨앗을 잃지 않고 다듬습니다.`,
    `- AI 키가 없어 Claude 심장 대신 로컬 틀만 사용했습니다.`,
    ``,
    `## 구체화 (3~5가지)`,
    `1. 문제를 한 문장으로 다시 쓰기`,
    `2. 누구에게 도움이 되는지 정하기`,
    `3. 최소 실행(오늘 30분) 정하기`,
    `4. 위험·반대 의견 한 가지 적기`,
    ``,
    `## 다음 행동 (3가지)`,
    `1. 설정 → Anthropic Claude 또는 OpenRouter Claude 키 연결`,
    `2. 「아이디어 발전시켜줘: …」로 다시 말하기`,
    `3. 마음에 들면 「아이디어로 저장해」`,
    ``,
    `## 태그`,
    `아이디어, 로컬, 씨앗`,
  ].join('\n')
}

function parseTags(aiText: string): string[] {
  const m = aiText.match(/##\s*태그\s*\n+([^\n#]+)/i)
  if (!m?.[1]) return ['아이디어', 'claude']
  return m[1]
    .split(/[,，、]/)
    .map((t) => t.trim().replace(/^#/, ''))
    .filter(Boolean)
    .slice(0, 8)
}

function parseSummary(aiText: string, seed: string): string {
  const m = aiText.match(/##\s*한\s*줄\s*핵심\s*\n+([^\n#]+)/i)
  return (m?.[1] || seed).trim().slice(0, 160)
}

function extractSeed(text: string): string {
  return text
    .replace(
      /^(아이디어\s*)?(만들어|생성|발전|키워|브레인스토밍|확장)(줘|주세요|해줘|해\s*줘)?[:\s]*/i,
      '',
    )
    .replace(/^클로드(야|에게)?[:\s]*/i, '')
    .replace(/^claude[:\s]*/i, '')
    .trim()
}

async function callClaudeHeart(seed: string, mode: IdeaBrainMode): Promise<{
  text: string
  providerId: string
  model: string
  usedClaude: boolean
}> {
  const userMsg = [
    mode === 'brainstorm'
      ? '이 주제로 서로 다른 각도 아이디어를 키워 주세요.'
      : mode === 'expand'
        ? '이 씨앗 아이디어를 더 깊게 발전시켜 주세요.'
        : '이 씨앗으로 새 아이디어를 구체화해 주세요.',
    '',
    `씨앗: ${seed}`,
  ].join('\n')

  const messages = [
    { role: 'system' as const, content: CLAUDE_HEART_SYSTEM },
    { role: 'user' as const, content: userMsg },
  ]

  // 1) Native Anthropic Claude
  if (isProviderConfigured('anthropic')) {
    const p = getHybridProvider('anthropic')
    if (p) {
      const r = await p.sendChat({
        messages,
        model: p.getSlot().model || ANTHROPIC_DEFAULT_MODEL,
      })
      return { text: r.text, providerId: 'anthropic', model: r.model, usedClaude: true }
    }
  }

  // 2) OpenRouter Claude model id
  if (isProviderConfigured('openrouter')) {
    const p = getHybridProvider('openrouter')
    if (p) {
      try {
        const r = await p.sendChat({
          messages,
          model: OPENROUTER_CLAUDE_MODEL,
        })
        return {
          text: r.text,
          providerId: 'openrouter',
          model: r.model,
          usedClaude: true,
        }
      } catch {
        /* fall through */
      }
    }
  }

  // 3) Any hybrid provider
  if (hasAnyConfiguredProvider()) {
    const r = await runHybridChat({
      message: `${CLAUDE_HEART_SYSTEM}\n\n${userMsg}`,
      history: [],
      displayName: 'AIZIO',
      locale: 'ko-KR',
    })
    const usedClaude = /claude|anthropic/i.test(r.providerId + r.model)
    return {
      text: r.text,
      providerId: r.providerId,
      model: r.model,
      usedClaude,
    }
  }

  return {
    text: localScaffold(seed, mode),
    providerId: 'local',
    model: 'scaffold',
    usedClaude: false,
  }
}

export async function runIdeaBrain(
  rawText: string,
  mode: IdeaBrainMode = 'expand',
): Promise<IdeaBrainResult> {
  if (!isLifeFeatureEnabled('ideasEnabled')) {
    throw new Error('아이디어 은행이 꺼져 있습니다.')
  }
  let seed = extractSeed(rawText)
  if (!seed || seed.length < 2) {
    const recent = searchIdeas('').slice(0, 1)[0]
    seed = recent?.content || recent?.title || '일상에서 쓸모 있는 작은 자동화'
  }

  const ai = await callClaudeHeart(seed, mode)
  const summary = parseSummary(ai.text, seed)
  const tags = parseTags(ai.text)
  if (ai.usedClaude && !tags.includes('claude')) tags.unshift('claude')

  const idea = saveIdea(seed, {
    title: summary.slice(0, 48),
    summary: ai.text.slice(0, 800),
    tags,
    category: mode === 'brainstorm' ? 'brainstorm' : 'claude-heart',
    importance: 0.7,
  })

  const heart = ai.usedClaude ? 'Claude 심장' : ai.providerId === 'local' ? '로컬 틀' : `AI(${ai.providerId})`
  const text = [
    `【아이디어 · ${heart}】`,
    ai.text.trim(),
    '',
    `💾 씨앗을 아이디어 은행에 저장했어요: ${idea.title}`,
    ai.usedClaude ? '' : '💡 설정에서 Anthropic Claude 키를 연결하면 진짜 Claude 심장으로 키워 줍니다.',
  ]
    .filter(Boolean)
    .join('\n')

  return {
    text,
    idea,
    providerId: ai.providerId,
    model: ai.model,
    usedClaude: ai.usedClaude,
  }
}
