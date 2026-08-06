/**
 * Live provider connection tests — uses stored keys, never key-format-only success.
 */

function classifyHttpError(status, bodyText) {
  const t = String(bodyText || '').toLowerCase()
  if (status === 401 || status === 403 || /invalid_api_key|incorrect api key|invalid.?key|authentication/i.test(t)) {
    return { connectionStatus: 'invalid', code: 'AUTH_INVALID', message: 'API 키가 없거나 인증에 실패했습니다.' }
  }
  if (status === 429 || /rate.?limit|quota|insufficient.?quota|billing|credit/i.test(t)) {
    return { connectionStatus: 'quota_error', code: 'QUOTA', message: '사용 한도/크레딧 문제가 있습니다.' }
  }
  if (status === 404 && /model/i.test(t)) {
    return { connectionStatus: 'provider_error', code: 'MODEL', message: '지원하지 않는 모델이거나 엔드포인트 오류입니다.' }
  }
  return { connectionStatus: 'provider_error', code: `HTTP_${status}`, message: `Provider 오류 (${status})` }
}

async function fetchJson(url, init, timeoutMs = 12_000) {
  const ac = new AbortController()
  const timer = setTimeout(() => ac.abort(), timeoutMs)
  try {
    const res = await fetch(url, { ...init, signal: ac.signal })
    const text = await res.text()
    let json = null
    try {
      json = text ? JSON.parse(text) : null
    } catch {
      json = null
    }
    return { res, text, json }
  } finally {
    clearTimeout(timer)
  }
}

export async function testProviderConnection(id, resolved) {
  const started = Date.now()
  const key = resolved.apiKey
  if (!key) {
    return {
      ok: false,
      connectionStatus: 'invalid',
      code: 'NO_KEY',
      message: 'API 키가 없습니다.',
      latencyMs: 0,
    }
  }

  try {
    if (id === 'openrouter') {
      const { res, text, json } = await fetchJson('https://openrouter.ai/api/v1/models', {
        headers: { Authorization: `Bearer ${key}` },
      })
      if (!res.ok) {
        const c = classifyHttpError(res.status, text)
        return { ok: false, ...c, latencyMs: Date.now() - started }
      }
      const n = Array.isArray(json?.data) ? json.data.length : 0
      return {
        ok: true,
        connectionStatus: 'connected',
        code: 'OK',
        message: `연결 성공 (models ${n})`,
        latencyMs: Date.now() - started,
      }
    }

    if (id === 'openai' || id === 'custom') {
      const base = (resolved.apiBase || 'https://api.openai.com/v1').replace(/\/$/, '')
      const { res, text, json } = await fetchJson(`${base}/models`, {
        headers: { Authorization: `Bearer ${key}` },
      })
      if (!res.ok) {
        const c = classifyHttpError(res.status, text)
        return { ok: false, ...c, latencyMs: Date.now() - started }
      }
      const n = Array.isArray(json?.data) ? json.data.length : 0
      return {
        ok: true,
        connectionStatus: 'connected',
        code: 'OK',
        message: `연결 성공 (models ${n})`,
        latencyMs: Date.now() - started,
      }
    }

    if (id === 'groq') {
      const { res, text, json } = await fetchJson('https://api.groq.com/openai/v1/models', {
        headers: { Authorization: `Bearer ${key}` },
      })
      if (!res.ok) {
        const c = classifyHttpError(res.status, text)
        return { ok: false, ...c, latencyMs: Date.now() - started }
      }
      const n = Array.isArray(json?.data) ? json.data.length : 0
      return {
        ok: true,
        connectionStatus: 'connected',
        code: 'OK',
        message: `연결 성공 (models ${n})`,
        latencyMs: Date.now() - started,
      }
    }

    if (id === 'gemini') {
      const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`
      const { res, text, json } = await fetchJson(url, {})
      if (!res.ok) {
        const c = classifyHttpError(res.status, text)
        return { ok: false, ...c, latencyMs: Date.now() - started }
      }
      const n = Array.isArray(json?.models) ? json.models.length : 0
      return {
        ok: true,
        connectionStatus: 'connected',
        code: 'OK',
        message: `연결 성공 (models ${n})`,
        latencyMs: Date.now() - started,
      }
    }

    if (id === 'duffel' || id === 'amadeus' || id === 'amadeus_secret' || id === 'expedia') {
      return {
        ok: false,
        connectionStatus: 'untested',
        code: 'LIVE_UNAVAILABLE',
        message:
          '키는 저장할 수 있지만 이 빌드에서는 Live 예약 Provider 호출이 Demo stub이라 완전한 연결 검증은 유료 Live 연동 전까지 할 수 없습니다.',
        latencyMs: Date.now() - started,
        partial: true,
      }
    }

    return {
      ok: false,
      connectionStatus: 'provider_error',
      code: 'UNSUPPORTED',
      message: '지원하지 않는 Provider 테스트입니다.',
      latencyMs: Date.now() - started,
    }
  } catch (err) {
    const name = err instanceof Error ? err.name : ''
    const msg = err instanceof Error ? err.message : String(err)
    if (name === 'AbortError' || /abort|timeout/i.test(msg)) {
      return {
        ok: false,
        connectionStatus: 'network_error',
        code: 'TIMEOUT',
        message: 'Provider 응답 시간 초과',
        latencyMs: Date.now() - started,
      }
    }
    return {
      ok: false,
      connectionStatus: 'network_error',
      code: 'NETWORK',
      message: '네트워크 오류로 Provider에 연결하지 못했습니다.',
      latencyMs: Date.now() - started,
    }
  }
}

/** Chat proxy — OpenAI-compatible + Gemini */
export async function proxyChat(id, resolved, messages) {
  const key = resolved.apiKey
  if (!key) {
    const e = new Error('API 키가 없습니다.')
    e.code = 'NO_KEY'
    throw e
  }
  const model =
    resolved.model ||
    (id === 'openrouter'
      ? 'openrouter/free'
      : id === 'groq'
        ? 'llama-3.1-8b-instant'
        : id === 'gemini'
          ? 'gemini-2.0-flash'
          : 'gpt-4o-mini')

  if (id === 'gemini') {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`
    const contents = (messages || [])
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: String(m.content || '') }],
      }))
    const system = (messages || []).find((m) => m.role === 'system')?.content
    const { res, text, json } = await fetchJson(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': key,
      },
      body: JSON.stringify({
        contents,
        ...(system ? { systemInstruction: { parts: [{ text: String(system) }] } } : {}),
      }),
    })
    if (!res.ok) {
      const c = classifyHttpError(res.status, text)
      const e = new Error(c.message)
      e.code = c.code
      throw e
    }
    const out =
      json?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') ||
      json?.candidates?.[0]?.content?.parts?.[0]?.text ||
      ''
    return { text: out, model, providerId: id }
  }

  const base =
    id === 'openrouter'
      ? 'https://openrouter.ai/api/v1'
      : id === 'groq'
        ? 'https://api.groq.com/openai/v1'
        : (resolved.apiBase || 'https://api.openai.com/v1').replace(/\/$/, '')

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${key}`,
  }
  if (id === 'openrouter') {
    headers['HTTP-Referer'] = 'https://jarvis-app.shipstatic.com'
    headers['X-Title'] = 'AIZIO'
  }

  const { res, text, json } = await fetchJson(`${base}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      messages: (messages || []).map((m) => ({
        role: m.role,
        content: String(m.content || ''),
      })),
    }),
  })
  if (!res.ok) {
    const c = classifyHttpError(res.status, text)
    const e = new Error(c.message)
    e.code = c.code
    throw e
  }
  const out = json?.choices?.[0]?.message?.content || ''
  return { text: out, model: json?.model || model, providerId: id }
}
