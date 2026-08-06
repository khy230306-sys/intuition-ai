import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockVisionProvider } from './providers/mockVision'
import { parseVisionResultJson, fallbackVisionResult } from './visionSchema'
import { analyzeImage, pickVisionProvider } from './visionService'
import {
  clearVisionHistory,
  deleteVisionHistoryItem,
  loadVisionHistory,
  saveVisionHistoryItem,
} from './historyStorage'
import { isSupportedImageFile } from './imageOptimize'

const store = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => store.set(k, v),
  removeItem: (k: string) => store.delete(k),
  clear: () => store.clear(),
})

describe('vision schema healing', () => {
  it('parses valid vision json', () => {
    const r = parseVisionResultJson(
      JSON.stringify({
        ok: true,
        mode: 'ocr',
        summary: '텍스트',
        subjects: ['문서'],
        confidence: 0.8,
        detail: '상세',
        warnings: [],
        followUps: [],
        ocrText: 'hello',
        sensitive: false,
      }),
      'ocr',
      'test',
    )
    expect(r?.ocrText).toBe('hello')
    expect(r?.mode).toBe('ocr')
  })

  it('heals trailing commas', () => {
    const r = parseVisionResultJson(
      `{"ok":true,"mode":"food","summary":"비빔밥","subjects":[],"confidence":0.5,"detail":"d","warnings":[],"followUps":[],"sensitive":false,}`,
      'food',
      'test',
    )
    expect(r?.summary).toMatch(/비빔밥/)
  })

  it('fallback result is safe', () => {
    const r = fallbackVisionResult('auto', 'none', 'offline', 'offline')
    expect(r.ok).toBe(false)
    expect(r.errorCode).toBe('offline')
  })
})

describe('mock vision provider', () => {
  it('returns document OCR demo', async () => {
    const r = await mockVisionProvider.analyzeImage({
      imageDataUrl: 'data:image/jpeg;base64,xx',
      mimeType: 'image/jpeg',
      mode: 'document',
    })
    expect(r.ok).toBe(true)
    expect(r.ocrText).toBeTruthy()
    expect(r.document?.suggestedTasks?.length).toBeGreaterThan(0)
  })

  it('medicine includes disclaimer', async () => {
    const r = await mockVisionProvider.analyzeImage({
      imageDataUrl: 'data:image/jpeg;base64,xx',
      mimeType: 'image/jpeg',
      mode: 'medicine',
    })
    expect(r.medicine?.disclaimer).toMatch(/약사|의료진/)
  })
})

describe('vision service + history', () => {
  beforeEach(() => {
    store.clear()
    clearVisionHistory()
    vi.stubGlobal('navigator', { onLine: true })
  })

  it('picks mock when no keys', () => {
    expect(pickVisionProvider().id).toBe('mock')
  })

  it('analyzeImage works offline with demo', async () => {
    vi.stubGlobal('navigator', { onLine: false })
    const r = await analyzeImage({
      imageDataUrl: 'data:image/jpeg;base64,xx',
      mimeType: 'image/jpeg',
      mode: 'ocr',
    })
    expect(r.errorCode).toBe('offline')
    expect(r.ocrText || r.summary).toBeTruthy()
  })

  it('saves and deletes history without raw dumps', () => {
    saveVisionHistoryItem({
      id: 'h1',
      savedAt: Date.now(),
      mode: 'ocr',
      summary: 'test',
      result: {
        ok: true,
        mode: 'ocr',
        provider: 'mock',
        summary: 'test',
        subjects: [],
        confidence: 0.5,
        detail: 'd',
        warnings: [],
        followUps: [],
        sensitive: false,
      },
    })
    expect(loadVisionHistory()).toHaveLength(1)
    deleteVisionHistoryItem('h1')
    expect(loadVisionHistory()).toHaveLength(0)
  })

  it('supports common image types', () => {
    expect(isSupportedImageFile(new File(['x'], 'a.jpg', { type: 'image/jpeg' }))).toBe(true)
    expect(isSupportedImageFile(new File(['x'], 'a.heic', { type: '' }))).toBe(true)
    expect(isSupportedImageFile(new File(['x'], 'a.pdf', { type: 'application/pdf' }))).toBe(false)
  })
})
