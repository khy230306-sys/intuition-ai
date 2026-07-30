import { openMaps, openSearch, openWeather } from './actions'
import {
  CITIES,
  COUNTRIES,
  extractPlaceQuery,
  findCity,
  findCountry,
  findWorldFact,
  formatCity,
  formatCountry,
  type CountryInfo,
} from './geoData'
import type { BrainReply } from './types'

interface WikiSummary {
  title?: string
  extract?: string
  description?: string
  content_urls?: { desktop?: { page?: string } }
}

interface NominatimHit {
  display_name?: string
  lat?: string
  lon?: string
  type?: string
  importance?: number
}

const wikiCache = new Map<string, { at: number; text: string | null }>()
const CACHE_MS = 10 * 60_000

async function fetchWiki(title: string): Promise<string | null> {
  const key = title.trim()
  const hit = wikiCache.get(key)
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.text
  try {
    const url = `https://ko.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(key)}`
    const res = await fetch(url, { headers: { Accept: 'application/json' } })
    if (!res.ok) {
      wikiCache.set(key, { at: Date.now(), text: null })
      return null
    }
    const data = (await res.json()) as WikiSummary
    const extract = data.extract?.trim()
    if (!extract) {
      wikiCache.set(key, { at: Date.now(), text: null })
      return null
    }
    const text = `【위키 요약】 ${data.title || key}\n${extract.slice(0, 520)}${extract.length > 520 ? '…' : ''}`
    wikiCache.set(key, { at: Date.now(), text })
    return text
  } catch {
    wikiCache.set(key, { at: Date.now(), text: null })
    return null
  }
}

async function fetchNominatim(query: string): Promise<NominatimHit | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&accept-language=ko&q=${encodeURIComponent(query)}`
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'JarvisGeoAssistant/1.0 (iphone-pwa)',
      },
    })
    if (!res.ok) return null
    const data = (await res.json()) as NominatimHit[]
    return data[0] || null
  } catch {
    return null
  }
}

function continentList(): string {
  const map = new Map<string, string[]>()
  for (const c of COUNTRIES) {
    const key = c.continent.split('/')[0]
    const arr = map.get(key) || []
    arr.push(c.name)
    map.set(key, arr)
  }
  return [...map.entries()]
    .map(([k, names]) => `· ${k}: ${names.slice(0, 8).join(', ')}${names.length > 8 ? '…' : ''}`)
    .join('\n')
}

export function wantsGeo(text: string): boolean {
  // Device GPS intents are handled in brain — do not treat as world-geo
  if (
    /^(내\s*위치|지금\s*어디|현재\s*위치|위치\s*알려|where\s*am\s*i)/i.test(text) ||
    /내\s*위치|지금\s*어디야|현재\s*위치|위치\s*알려\s*줘?/.test(text)
  ) {
    return false
  }
  if (
    /지리|대륙|수도|인구|면적|시차|좌표|어디에\s*있|위치|국가\s*정보|세계\s*정보|나라\s*알려|나라\s*정보/.test(
      text,
    )
  ) {
    return true
  }
  if (/지도\s*(보여|열어|검색)/.test(text)) return true
  const place = extractPlaceQuery(text)
  if (place && (findCountry(place) || findCity(place) || findWorldFact(text))) return true
  // "프랑스 정보", "도쿄는"
  if (findCountry(text) || findCity(text)) return true
  return false
}

function capitalQuestion(text: string): CountryInfo | null {
  const m =
    text.match(/(.+?)\s*수도/) ||
    text.match(/수도\s*(?:가\s*)?(?:어디|알려|뭐)/) ||
    text.match(/(.+?)의\s*수도/)
  if (!m) return null
  if (m[1]) return findCountry(m[1])
  return null
}

export async function handleGeo(text: string): Promise<BrainReply | null> {
  const t = text.trim()
  if (!wantsGeo(t) && !findCountry(extractPlaceQuery(t)) && !findCity(extractPlaceQuery(t))) {
    // still allow bare country/city names as info requests when short
    const bare = extractPlaceQuery(t)
    if (!(bare && (findCountry(bare) || findCity(bare)) && bare.length <= 20)) return null
  }

  if (/대륙\s*목록|세계\s*대륙|어떤\s*대륙/.test(t) || /^대륙$/.test(t)) {
    return {
      text: `【대륙 개요】\n일반적으로 7대륙입니다.\n${continentList()}\n\n특정 국가: "프랑스 정보" · 도시: "뉴욕 시차"`,
      speak: true,
    }
  }

  if (/지리\s*도움말|세계\s*도움말|국가\s*도움말/.test(t)) {
    return {
      text: [
        '【세계·지리】',
        '• 프랑스 정보 / 브라질 수도 / 이집트 인구',
        '• 도쿄 시차 / 뉴욕 위치 / 파리 지도',
        '• 에베레스트 / 아마존 / 사하라',
        '• 대륙 목록',
        `${COUNTRIES.length}개국 · ${CITIES.length}개 주요 도시 DB + 위키 요약`,
      ].join('\n'),
    }
  }

  const fact = findWorldFact(t)
  if (fact) {
    const wiki = await fetchWiki(extractPlaceQuery(t).split(/\s+/)[0] || t)
    return { text: wiki ? `${fact}\n\n${wiki}` : fact, speak: true }
  }

  const capCountry = capitalQuestion(t)
  if (capCountry && /수도/.test(t)) {
    return {
      text: `${capCountry.name}의 수도는 ${capCountry.capital}입니다.\n\n${formatCountry(capCountry)}`,
      speak: true,
    }
  }

  const place = extractPlaceQuery(t) || t
  const country = findCountry(place) || findCountry(t)
  const city = findCity(place) || findCity(t)

  if (/지도/.test(t)) {
    const label = city?.name || country?.name || place
    const q = city ? `${city.name} ${city.country}` : country ? country.nameEn : label
    return {
      text: `${label} 지도를 엽니다.`,
      speak: true,
      action: () => openMaps(q),
    }
  }

  if (/날씨/.test(t) && (city || country)) {
    const label = city?.name || country?.capital || country?.name || place
    return {
      text: `${label} 날씨 검색을 엽니다.`,
      speak: true,
      action: () => openWeather(label),
    }
  }

  if (city) {
    let textOut = formatCity(city)
    if (/인구|면적|통화|언어|정보|지리|개요|알려|시차|위치|좌표|뭐야/.test(t) || place === city.name) {
      const wiki = await fetchWiki(city.name)
      if (wiki) textOut += `\n\n${wiki}`
      const parent = findCountry(city.country)
      if (parent && /정보|지리|개요/.test(t)) textOut += `\n\n${formatCountry(parent)}`
    }
    return { text: textOut, speak: true }
  }

  if (country) {
    let textOut = formatCountry(country)
    if (/인구/.test(t)) {
      return {
        text: `${country.name} 인구(약): ${country.population}백만 명\n\n${textOut}`,
        speak: true,
      }
    }
    if (/면적/.test(t)) {
      return {
        text: `${country.name} 면적(약): ${country.area}천 km²\n\n${textOut}`,
        speak: true,
      }
    }
    if (/통화|화폐/.test(t)) {
      return { text: `${country.name} 통화: ${country.currency}`, speak: true }
    }
    if (/언어|공용어/.test(t)) {
      return { text: `${country.name} 주요 언어: ${country.language}`, speak: true }
    }
    if (/시차/.test(t)) {
      return { text: textOut, speak: true }
    }
    const wiki = await fetchWiki(country.name)
    if (wiki) textOut += `\n\n${wiki}`
    return { text: textOut, speak: true }
  }

  // Unknown place: try nominatim + wiki
  if (/정보|지리|어디|위치|나라|도시|수도|시차|알려/.test(t) || wantsGeo(t)) {
    const q = place || t
    if (q.length >= 2 && q.length <= 40) {
      const [wiki, nom] = await Promise.all([fetchWiki(q), fetchNominatim(q)])
      const lines: string[] = []
      if (nom?.display_name) {
        lines.push(`【위치】 ${nom.display_name}`)
        if (nom.lat && nom.lon) lines.push(`좌표: ${Number(nom.lat).toFixed(3)}, ${Number(nom.lon).toFixed(3)}`)
      }
      if (wiki) lines.push(wiki)
      if (lines.length) {
        return {
          text: lines.join('\n\n') + `\n\n지도: "${q} 지도" · 검색: 웹에서 더 찾기 가능`,
          speak: true,
          action: nom ? () => openMaps(q) : undefined,
        }
      }
      return {
        text: `"${q}"를 내장 DB에서 찾지 못했습니다. 웹 검색을 엽니다.`,
        action: () => openSearch(`${q} 지리 정보`),
      }
    }
  }

  return null
}

export function geoCoverageSummary(): string {
  return `내장: 국가 ${COUNTRIES.length} · 도시 ${CITIES.length} · 지형/해양 팩트 ${CITIES.length ? '포함' : ''}`
}
