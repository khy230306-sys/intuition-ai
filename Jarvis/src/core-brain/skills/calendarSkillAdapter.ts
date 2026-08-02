import { upcomingFamilyEvents } from '../../familyStore'
import { upcomingFriendsEvents } from '../../friendsStore'
import { holidayToday, nextHoliday } from '../../smart'
import type { SkillContext, SkillResult } from '../types'

export function isAvailable(): boolean {
  return true
}

export function canHandle(ctx: SkillContext): boolean {
  return ctx.intent === 'list_calendar' || ctx.intent === 'create_calendar_event'
}

export async function execute(ctx: SkillContext): Promise<SkillResult> {
  if (ctx.intent === 'create_calendar_event') {
    return {
      success: false,
      status: 'unavailable',
      data: {
        hint: 'Personal calendar create is not wired; use family/friends tabs for shared events.',
      },
      message:
        '현재 개인 일정 추가 기능은 연결되어 있지 않습니다. 가족·친구 공간 일정은 각 탭에서 추가해 주세요.',
      speakText: '개인 일정 추가는 아직 연결되지 않았어요.',
      error: { code: 'no_skill_available' },
    }
  }

  const text = ctx.request.normalizedText || ctx.request.text
  if (/공휴일|휴일/.test(text)) {
    const today = holidayToday()
    const msg = today
      ? `오늘은 ${today}입니다.\n다음: ${nextHoliday()}`
      : `오늘은 평일 캘린더 기준입니다.\n다음 공휴일: ${nextHoliday()}`
    return {
      success: true,
      status: 'completed',
      data: {},
      message: msg,
      speakText: msg.slice(0, 120),
      error: null,
    }
  }

  const family = upcomingFamilyEvents(5)
  const friends = upcomingFriendsEvents(5)
  const lines: string[] = []
  if (family.length) {
    lines.push('【가족 일정】')
    for (const e of family) {
      lines.push(`• ${e.date}${e.time ? ' ' + e.time : ''} ${e.title}`)
    }
  }
  if (friends.length) {
    lines.push('【친구 일정】')
    for (const e of friends) {
      lines.push(`• ${e.date}${e.time ? ' ' + e.time : ''} ${e.title}`)
    }
  }
  if (!lines.length) {
    return {
      success: true,
      status: 'partial',
      data: { count: 0 },
      message:
        '다가오는 가족·친구 일정이 없습니다. 개인 전용 캘린더는 아직 연결되지 않았습니다. 가족/친구 탭에서 일정을 추가할 수 있어요.',
      speakText: '등록된 일정이 없어요.',
      error: null,
    }
  }
  return {
    success: true,
    status: 'completed',
    data: { family: family.length, friends: friends.length },
    message: lines.join('\n'),
    speakText: `일정 ${family.length + friends.length}건이에요.`,
    error: null,
  }
}
