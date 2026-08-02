import { getAppLocale } from '../../i18n'
import { tryHandleMusicSkill } from '../../music'
import type { SkillContext, SkillResult } from '../types'

export function isAvailable(): boolean {
  return true
}

export function canHandle(ctx: SkillContext): boolean {
  return ctx.intent === 'play_music' || ctx.intent === 'control_music'
}

export async function execute(ctx: SkillContext): Promise<SkillResult> {
  try {
    const music = await tryHandleMusicSkill(ctx.request.normalizedText || ctx.request.text, getAppLocale())
    if (!music) {
      return {
        success: false,
        status: 'unavailable',
        data: {},
        message: '음악 요청으로 처리하지 못했습니다. 예: 「조용한 음악 틀어줘」',
        error: { code: 'no_skill_available' },
      }
    }
    const showPlayer =
      music.showMiniPlayer !== false &&
      music.session.status !== 'stopped' &&
      music.session.status !== 'idle' &&
      (ctx.intent === 'play_music' ||
        music.needsGesture === true ||
        music.showMiniPlayer === true ||
        music.session.status === 'ready' ||
        music.session.status === 'paused' ||
        music.session.status === 'opened_external' ||
        music.session.status === 'searching')
    return {
      success: true,
      status: music.needsGesture ? 'needs_user_action' : 'completed',
      data: { playUrl: music.playUrl ?? null },
      message: music.text,
      speakText: music.text.slice(0, 160),
      uiActions: showPlayer
        ? [
            {
              type: 'SHOW_MUSIC_PLAYER',
              payload: { playUrl: music.playUrl, needsGesture: music.needsGesture },
            },
          ]
        : [],
      brainPatch: {
        text: music.text,
        speak: music.speak !== false,
        musicNeedsGesture: music.needsGesture,
        musicPlayUrl: music.playUrl,
        musicShowMiniPlayer: showPlayer,
      },
      error: null,
    }
  } catch (err) {
    return {
      success: false,
      status: 'failed',
      data: {},
      message: '음악 기능을 실행하지 못했습니다.',
      error: { code: 'skill_failed', detail: err instanceof Error ? err.message : String(err) },
    }
  }
}
