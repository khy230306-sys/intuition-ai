import { executeCampusIntent, openCampusToQuiz, parseCampusIntent } from '../../campus'
import type { View } from '../../types'
import type { SkillContext, SkillResult } from '../types'

const CAMPUS_FIXED_URL = 'https://aizio-campus.shipstatic.com'

export function isAvailable(): boolean {
  return true
}

export function canHandle(ctx: SkillContext): boolean {
  return String(ctx.intent).startsWith('campus_') || ctx.intent === 'open_campus'
}

export async function execute(ctx: SkillContext): Promise<SkillResult> {
  const fromEntities = ctx.entities.campusKind
    ? {
        kind: ctx.entities.campusKind as Parameters<typeof executeCampusIntent>[0]['kind'],
        confidence: 0.9,
        courseHint: ctx.entities.courseHint as string | undefined,
        query: ctx.entities.query as string | undefined,
        count: ctx.entities.count as number | undefined,
        days: ctx.entities.days as number | undefined,
        emailRequest: ctx.entities.emailRequest as string | undefined,
        timetable: ctx.entities.timetable as Parameters<typeof executeCampusIntent>[0]['timetable'],
      }
    : parseCampusIntent(ctx.request.text)

  if (!fromEntities) {
    return {
      success: false,
      status: 'needs_user_action',
      data: {},
      message: 'Campus 요청을 이해하지 못했습니다. 예: 「오늘 수업 뭐야?」',
      error: { code: 'user_action_required' },
    }
  }

  // Open dedicated Campus app (separate product / fixed URL)
  if (fromEntities.kind === 'open_campus') {
    return {
      success: true,
      status: 'completed',
      data: { url: CAMPUS_FIXED_URL },
      message: `AIZIO CAMPUS를 엽니다.\n${CAMPUS_FIXED_URL}`,
      speakText: '캠퍼스를 엽니다.',
      uiActions: [{ type: 'OPEN_EXTERNAL_URL', payload: { url: CAMPUS_FIXED_URL, label: 'CAMPUS' } }],
      brainPatch: {
        speak: true,
        action: () => {
          window.open(CAMPUS_FIXED_URL, '_blank', 'noopener,noreferrer')
        },
      },
      error: null,
    }
  }

  const result = await executeCampusIntent(fromEntities)
  if (result.quizId) openCampusToQuiz(result.quizId)
  const open = Boolean(result.openCampus || result.quizId)
  const uiActions = open
    ? [
        {
          type: 'OPEN_EXTERNAL_URL' as const,
          payload: { url: CAMPUS_FIXED_URL, label: 'CAMPUS' },
        },
      ]
    : []

  return {
    success: true,
    status: 'completed',
    data: {
      quizId: result.quizId || null,
      campusKind: fromEntities.kind,
      url: open ? CAMPUS_FIXED_URL : null,
    },
    message: open ? `${result.message}\n\n앱: ${CAMPUS_FIXED_URL}` : result.message,
    speakText: result.speak === false ? undefined : result.message.slice(0, 160),
    uiActions,
    brainPatch: {
      // Keep in-app campus view as fallback; prefer external app link in message
      view: open ? ('campus' as View) : undefined,
      speak: result.speak !== false,
      action: open
        ? () => {
            window.open(CAMPUS_FIXED_URL, '_blank', 'noopener,noreferrer')
          }
        : undefined,
    },
    error: null,
  }
}
