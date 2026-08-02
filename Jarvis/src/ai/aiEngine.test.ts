import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { __resetAiEngineInFlight, runAiEngine, aiEngineErrorText } from './aiEngine'
import { selectAiMode } from './modeSelect'
import { buildAiContext } from './contextManager'
import { validateAiResponse } from './responseValidator'
import { routeAiRequest } from './aiRouter'
import { AiError, redactSecrets, userFacingAiError } from './errors'
import { buildSystemPrompt } from './promptBuilder'

describe('selectAiMode', () => {
  it('picks coding for code/debug requests', () => {
    expect(selectAiMode('이 타입스크립트 오류 고쳐줘')).toBe('coding')
    expect(selectAiMode('unit test 작성해줘')).toBe('coding')
  })
  it('picks planning for plans', () => {
    expect(selectAiMode('목표를 단계로 나눠 계획 세워줘')).toBe('planning')
  })
  it('picks analysis for compare/risk', () => {
    expect(selectAiMode('두 방식의 장단점 분석해줘')).toBe('analysis')
  })
  it('defaults to chat', () => {
    expect(selectAiMode('오늘 기분 어때?')).toBe('chat')
  })
})

describe('buildAiContext', () => {
  it('drops empty and duplicate turns and keeps recent', () => {
    const ctx = buildAiContext(
      [
        { role: 'user', text: '안녕' },
        { role: 'user', text: '안녕' },
        { role: 'assistant', text: '' },
        { role: 'assistant', text: '네' },
        { role: 'user', text: '날씨' },
      ],
      { maxMessages: 10 },
    )
    expect(ctx.map((m) => m.content)).toEqual(['안녕', '네', '날씨'])
  })

  it('enforces char budget', () => {
    const big = '가'.repeat(500)
    const history = Array.from({ length: 20 }, (_, i) => ({
      role: i % 2 ? 'assistant' : 'user',
      text: `${big}-${i}`,
    }))
    const ctx = buildAiContext(history, { maxMessages: 14, maxChars: 2_000 })
    const total = ctx.reduce((n, m) => n + m.content.length, 0)
    expect(total).toBeLessThanOrEqual(2_500)
    expect(ctx.length).toBeGreaterThan(0)
  })
})

describe('validateAiResponse', () => {
  it('rejects empty and html', () => {
    expect(validateAiResponse('').ok).toBe(false)
    expect(validateAiResponse('<!DOCTYPE html><html></html>').ok).toBe(false)
  })
  it('redacts secrets and accepts normal text', () => {
    const r = validateAiResponse('키는 sk-abcdefghijklmnopqrstuvwxyz123456 입니다. 안녕하세요.')
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.text).not.toMatch(/sk-abc/)
      expect(r.warnings).toContain('secret_redacted')
    }
  })
  it('detects repeat loops', () => {
    const line = '같은문장반복테스트입니다요'
    expect(validateAiResponse(Array(6).fill(line).join('\n')).ok).toBe(false)
  })
})

describe('promptBuilder', () => {
  it('states mobile PWA and not Electron/OpenClaw', () => {
    const p = buildSystemPrompt({ message: 'hi', displayName: '성규' }, 'chat')
    expect(p).toMatch(/PWA/)
    expect(p).toMatch(/OpenClaw/)
    expect(p).toMatch(/성규/)
    expect(p).toMatch(/모드: chat/)
  })
})

describe('routeAiRequest', () => {
  it('returns none without api key', () => {
    const d = routeAiRequest({ message: '안녕' })
    expect(d.provider).toBe('none')
  })
  it('routes to openai-compatible when key present', () => {
    const d = routeAiRequest({ message: '코드 고쳐줘', apiKey: 'sk-test' })
    expect(d.provider).toBe('openai-compatible')
    expect(d.mode).toBe('coding')
  })
})

describe('errors', () => {
  it('maps kinds to Korean user text', () => {
    expect(userFacingAiError(new AiError('timeout', 'x'))).toMatch(/초과/)
    expect(userFacingAiError(new AiError('auth', 'x'))).toMatch(/API 키|인증/)
    expect(aiEngineErrorText(new AiError('rate_limit', 'x'))).toMatch(/요청이 너무 많|한도|사용량/)
    expect(aiEngineErrorText(new AiError('rate_limit', '무료 한도'))).toMatch(/한도/)
  })
  it('redacts bearer tokens', () => {
    expect(redactSecrets('Authorization Bearer sk-abcdefghijklmnop')).not.toMatch(/sk-abcdef/)
  })
})

describe('runAiEngine', () => {
  beforeEach(() => {
    __resetAiEngineInFlight()
    vi.stubGlobal('fetch', vi.fn())
  })
  afterEach(() => {
    __resetAiEngineInFlight()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('blocks empty input', async () => {
    await expect(runAiEngine({ message: '  ', apiKey: 'sk-x' })).rejects.toBeInstanceOf(AiError)
  })

  it('completes happy path', async () => {
    ;(fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        model: 'gpt-4o-mini',
        choices: [{ message: { content: '안녕하세요. AIZIO입니다.' }, finish_reason: 'stop' }],
      }),
    })
    const res = await runAiEngine({
      message: '안녕',
      apiKey: 'sk-test',
      history: [{ role: 'user', text: '이전' }],
    })
    expect(res.text).toMatch(/AIZIO/)
    expect(res.provider).toBe('openai-compatible')
    expect(res.mode).toBe('chat')
    expect(res.latencyMs).toBeGreaterThanOrEqual(0)
  })

  it('does not auto-retry 401', async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => 'unauthorized',
    })
    await expect(runAiEngine({ message: '안녕', apiKey: 'sk-bad' })).rejects.toMatchObject({
      kind: 'auth',
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('retries network errors up to limit then fails', async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))
    await expect(runAiEngine({ message: '안녕', apiKey: 'sk-x' })).rejects.toMatchObject({
      kind: 'network',
    })
    expect(fetchMock.mock.calls.length).toBeGreaterThan(1)
  })

  it('surfaces clear text for 429', async () => {
    ;(fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 429,
      text: async () => 'rate',
    })
    try {
      await runAiEngine({ message: '안녕', apiKey: 'sk-x' })
      expect.unreachable()
    } catch (err) {
      expect(aiEngineErrorText(err)).toMatch(/한도|사용량|요청이 너무 많/)
    }
  })
})
