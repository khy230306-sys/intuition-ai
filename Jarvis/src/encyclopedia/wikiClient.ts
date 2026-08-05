/**
 * Wikipedia / Wiktionary lookup for encyclopedia-style answers (no API key).
 * Prefer Korean wiki; fall back to English for Latin topics.
 */

export type WikiHit = {
  title: string
  extract: string
  url: string
  lang: 'ko' | 'en'
  source: 'wikipedia' | 'wiktionary'
}

const UA = 'AIZIO-PWA/1.20 (https://jarvis-app.shipstatic.com; personal assistant)'

async function fetchJson(url: string): Promise<unknown | null> {
  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json', 'Api-User-Agent': UA },
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

async function openSearch(lang: 'ko' | 'en', query: string, host = 'wikipedia'): Promise<string[]> {
  const base = `https://${lang}.${host}.org/w/api.php`
  const url =
    `${base}?action=opensearch&search=${encodeURIComponent(query)}` +
    `&limit=5&namespace=0&format=json&origin=*`
  const data = await fetchJson(url)
  if (!Array.isArray(data) || !Array.isArray(data[1])) return []
  return (data[1] as unknown[]).map((x) => String(x || '')).filter(Boolean)
}

async function pageSummary(
  lang: 'ko' | 'en',
  title: string,
  host: 'wikipedia' | 'wiktionary' = 'wikipedia',
): Promise<WikiHit | null> {
  const url = `https://${lang}.${host}.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}`
  const data = (await fetchJson(url)) as {
    type?: string
    title?: string
    extract?: string
    content_urls?: { desktop?: { page?: string } }
    description?: string
  } | null
  if (!data || data.type === 'disambiguation') return null
  const extract = String(data.extract || data.description || '').trim()
  if (extract.length < 12) return null
  return {
    title: String(data.title || title),
    extract: extract.slice(0, 900),
    url: data.content_urls?.desktop?.page || `https://${lang}.${host}.org/wiki/${encodeURIComponent(title)}`,
    lang,
    source: host,
  }
}

export async function lookupEncyclopedia(topic: string): Promise<WikiHit | null> {
  const q = topic.trim()
  if (!q) return null
  const latinHeavy = /^[A-Za-z0-9][A-Za-z0-9\s.\-]{0,50}$/.test(q)

  const attempts: Array<{ lang: 'ko' | 'en'; host: 'wikipedia' | 'wiktionary'; query: string }> = latinHeavy
    ? [
        { lang: 'en', host: 'wikipedia', query: q },
        { lang: 'en', host: 'wiktionary', query: q },
        { lang: 'ko', host: 'wikipedia', query: q },
      ]
    : [
        { lang: 'ko', host: 'wikipedia', query: q },
        { lang: 'ko', host: 'wiktionary', query: q },
        { lang: 'en', host: 'wikipedia', query: q },
      ]

  for (const a of attempts) {
    const titles = await openSearch(a.lang, a.query, a.host)
    const candidates = [a.query, ...titles].filter((x, i, arr) => arr.indexOf(x) === i).slice(0, 4)
    for (const title of candidates) {
      const hit = await pageSummary(a.lang, title, a.host)
      if (hit) return hit
    }
  }
  return null
}

export function formatWikiAnswer(topic: string, hit: WikiHit): string {
  const src =
    hit.source === 'wiktionary'
      ? hit.lang === 'ko'
        ? '위키낱말사전'
        : 'Wiktionary'
      : hit.lang === 'ko'
        ? '위키백과'
        : 'Wikipedia'
  return [
    `【${hit.title}】`,
    hit.extract,
    '',
    `출처: ${src} · ${hit.url}`,
    `「${topic}」에 대해 더 깊게 물어보시면 이어서 설명해 드릴게요.`,
  ].join('\n')
}
