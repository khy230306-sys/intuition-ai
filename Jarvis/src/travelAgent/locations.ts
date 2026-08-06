import type { TravelLocation } from './schema'

const LOCATIONS: Array<TravelLocation & { aliases: string[] }> = [
  {
    code: 'ICN',
    name: '인천국제공항',
    city: '인천',
    country: 'KR',
    kind: 'airport',
    aliases: ['인천', '인천공항', '서울인천', 'icn', 'incheon'],
  },
  {
    code: 'GMP',
    name: '김포국제공항',
    city: '서울',
    country: 'KR',
    kind: 'airport',
    aliases: ['김포', '김포공항', '서울', '서울김포', 'gmp', 'gimpo', 'seoul'],
  },
  {
    code: 'CJU',
    name: '제주국제공항',
    city: '제주',
    country: 'KR',
    kind: 'airport',
    aliases: ['제주', '제주도', '제주공항', 'cju', 'jeju'],
  },
  {
    code: 'PUS',
    name: '김해국제공항',
    city: '부산',
    country: 'KR',
    kind: 'airport',
    aliases: ['부산', '김해', 'pus', 'busan'],
  },
  {
    code: 'NRT',
    name: '나리타국제공항',
    city: '도쿄',
    country: 'JP',
    kind: 'airport',
    aliases: ['도쿄', '동경', '나리타', 'tokyo', 'nrt'],
  },
  {
    code: 'HND',
    name: '하네다공항',
    city: '도쿄',
    country: 'JP',
    kind: 'airport',
    aliases: ['하네다', 'hnd'],
  },
  {
    code: 'KIX',
    name: '간사이국제공항',
    city: '오사카',
    country: 'JP',
    kind: 'airport',
    aliases: ['오사카', '간사이', 'osaka', 'kix'],
  },
]

export function findLocation(text: string): TravelLocation | null {
  const t = text.trim().toLowerCase().replace(/\s+/g, '')
  if (!t) return null
  for (const loc of LOCATIONS) {
    if (loc.code.toLowerCase() === t) return strip(loc)
    for (const a of loc.aliases) {
      if (t.includes(a.toLowerCase().replace(/\s+/g, '')) || a.toLowerCase().replace(/\s+/g, '').includes(t)) {
        return strip(loc)
      }
    }
  }
  // Phrase scan
  for (const loc of LOCATIONS) {
    for (const a of loc.aliases) {
      if (text.includes(a)) return strip(loc)
    }
  }
  return null
}

export function findOriginDestination(text: string): {
  origin?: TravelLocation
  destination?: TravelLocation
} {
  // 「인천 출발」「김포에서 출발」→ origin only
  const originOnly = text.match(/^(.+?)\s*출발\s*$/) || text.match(/(.+?)에서\s*출발/)
  if (originOnly) {
    const o = findLocation(originOnly[1])
    if (o) return { origin: o }
  }

  const fromTo =
    text.match(/(.+?)에서\s*(.+?)(?:가|행|으로|로|까지)/) ||
    text.match(/(.+?)\s*(?:→|->|→)\s*(.+)/) ||
    text.match(/(.+?)발\s*(.+)/)
  if (fromTo) {
    const o = findLocation(fromTo[1])
    const d = findLocation(fromTo[2])
    if (o || d) return { origin: o || undefined, destination: d || undefined }
  }
  const toOnly =
    text.match(/(?:가는|갈|행)\s*(.+?)(?:\s|$)/) ||
    text.match(/(.+?)(?:가는|갈래|여행|비행|항공|호텔)/)
  // Collect all mentioned
  const hits: TravelLocation[] = []
  for (const loc of LOCATIONS) {
    for (const a of loc.aliases) {
      if (text.includes(a) && !hits.some((h) => h.code === loc.code)) {
        hits.push(strip(loc))
        break
      }
    }
  }
  if (hits.length >= 2) {
    // Prefer first as origin if "에서" pattern otherwise last as destination
    if (/에서/.test(text)) {
      return { origin: hits[0], destination: hits[1] }
    }
    // Domestic default: first non-jeju/osaka as origin if destination clear
    return { origin: hits[0], destination: hits[hits.length - 1] }
  }
  if (hits.length === 1) {
    const dest = hits[0]
    // 「오사카 가려고」— destination only; leave origin for a later question on plans
    if (/가려고|여행\s*준비|여행\s*계획/.test(text)) {
      return { destination: dest }
    }
    const intl = dest.country && dest.country !== 'KR'
    return {
      origin: intl
        ? strip(LOCATIONS.find((l) => l.code === 'ICN')!)
        : strip(LOCATIONS.find((l) => l.code === 'GMP')!),
      destination: dest,
    }
  }
  void toOnly
  return {}
}

function strip(loc: TravelLocation & { aliases?: string[] }): TravelLocation {
  return {
    code: loc.code,
    name: loc.name,
    city: loc.city,
    country: loc.country,
    kind: loc.kind || 'airport',
  }
}

export function locationLabel(loc?: TravelLocation): string {
  if (!loc) return ''
  return loc.city || loc.name || loc.code
}
