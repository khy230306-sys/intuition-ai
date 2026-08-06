/**
 * Active mode + translation session.
 * Backed by existing interpret-mode storage for compatibility.
 */

import { resolveActiveMode } from '../reliability/activeMode'
import {
  clearInterpretMode,
  loadInterpretMode,
  saveInterpretMode,
  type InterpretMode,
} from '../translateBrain'
import type { ActiveMode } from './types'

export type TranslationSession = {
  enabled: boolean
  targetLanguage: string
  sourceLanguage: string
  targetName: string
}

export function getActiveMode(): ActiveMode {
  return resolveActiveMode()
}

export function getTranslationSession(): TranslationSession {
  const m = loadInterpretMode()
  return {
    enabled: Boolean(m.active && m.lockUntilStop),
    targetLanguage: m.langB || 'en',
    sourceLanguage: m.langA || 'auto',
    targetName: m.langB === 'en' ? '영어' : m.langB === 'ja' ? '일본어' : m.langB === 'zh-CN' ? '중국어' : m.langB || '영어',
  }
}

export function startTranslationSession(targetCode: string, _targetName?: string): TranslationSession {
  const next: InterpretMode = {
    active: true,
    langA: 'ko',
    langB: targetCode === 'ko' ? 'en' : targetCode,
    listening: 'ko',
    live: true,
    lockUntilStop: true,
    showOriginal: false,
    updatedAt: new Date().toISOString(),
  }
  saveInterpretMode(next)
  void _targetName
  return getTranslationSession()
}

export function changeTranslationTarget(targetCode: string, _targetName?: string): TranslationSession {
  const prev = loadInterpretMode()
  saveInterpretMode({
    ...prev,
    active: true,
    langB: targetCode === 'ko' ? 'en' : targetCode,
    live: true,
    lockUntilStop: true,
    showOriginal: false,
    updatedAt: new Date().toISOString(),
  })
  void _targetName
  return getTranslationSession()
}

export function endTranslationSession(): void {
  clearInterpretMode()
}

export function translationBadgeLabel(): string {
  const s = getTranslationSession()
  if (!s.enabled) return ''
  const name =
    s.targetLanguage === 'en'
      ? 'English'
      : s.targetLanguage === 'ja'
        ? 'Japanese'
        : s.targetLanguage === 'zh-CN'
          ? 'Chinese'
          : s.targetLanguage === 'vi'
            ? 'Vietnamese'
            : s.targetName || s.targetLanguage
  return `번역 중 · 한국어 → ${name}`
}
