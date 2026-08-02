import { APP_BRAND_KO } from '../../brand'
import { loadSettings } from '../../storage'
import type { SkillContext, SkillResult } from '../types'

export function isAvailable(): boolean {
  return true
}

export function canHandle(ctx: SkillContext): boolean {
  return ctx.intent === 'help'
}

export async function execute(_ctx: SkillContext): Promise<SkillResult> {
  const name = loadSettings().displayName || APP_BRAND_KO
  // Keep overlapping with brain.helpText themes so Core Brain help stays useful if invoked directly
  const text = [
    `${name}, ${APP_BRAND_KO}는 말로 쓰는 일상 비서입니다.`,
    '앱 소개는 「사용설명서」, 명령어 목록은 「도움말」을 입력하세요.',
    '【일상】 날씨 · 브리핑 · 할 일 · 장바구니 · 지출 · 알림',
    '【투자】 시세 · 냉정 종목추천 · 포트폴리오',
    '【음악】 조용한 음악 틀어줘 · 음악 멈춰',
    '【번역】 일본어로 번역해줘 · 통역 모드',
    '【메모】 기억해 … · 메모 보여줘',
    '【설정】 설정 열어줘',
  ].join('\n')
  return {
    success: true,
    status: 'completed',
    data: {},
    message: text,
    speakText: '사용설명서나 도움말을 말해 보세요. 날씨, 할 일, 음악도 됩니다.',
    error: null,
  }
}
