/** Travel Offline Pack — snapshot storage (not live prices). */

const KEY = 'aizio.anywhere.travelPack.v1'

export type TravelOfflinePack = {
  id: string
  title: string
  destination?: string
  flights: Array<{ label: string; detail: string }>
  hotels: Array<{ name: string; address: string; reservation?: string }>
  places: Array<{ name: string; note?: string }>
  phrases: Array<{ ko: string; translated: string; lang: string }>
  notes: string[]
  updatedAt: string
  source: 'user' | 'import'
}

function loadAll(): TravelOfflinePack[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const arr = JSON.parse(raw) as TravelOfflinePack[]
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

function saveAll(packs: TravelOfflinePack[]): void {
  localStorage.setItem(KEY, JSON.stringify(packs.slice(0, 20)))
}

export function listTravelPacks(): TravelOfflinePack[] {
  return loadAll()
}

export function upsertTravelPack(pack: Omit<TravelOfflinePack, 'updatedAt'> & { updatedAt?: string }): TravelOfflinePack {
  const all = loadAll()
  const next: TravelOfflinePack = {
    ...pack,
    updatedAt: pack.updatedAt || new Date().toISOString(),
  }
  const idx = all.findIndex((p) => p.id === next.id)
  if (idx >= 0) all[idx] = next
  else all.unshift(next)
  saveAll(all)
  return next
}

export function formatTravelPackReply(pack: TravelOfflinePack): string {
  const lines = [
    `【여행 오프라인 팩 · 스냅샷】`,
    pack.title,
    pack.destination ? `목적지: ${pack.destination}` : '',
    `마지막 업데이트: ${pack.updatedAt.replace('T', ' ').slice(0, 16)}`,
    '',
  ]
  if (pack.flights.length) {
    lines.push('항공')
    for (const f of pack.flights.slice(0, 6)) lines.push(`· ${f.label} — ${f.detail}`)
  }
  if (pack.hotels.length) {
    lines.push('숙소')
    for (const h of pack.hotels.slice(0, 6)) {
      lines.push(`· ${h.name}`)
      if (h.address) lines.push(`  주소: ${h.address}`)
      if (h.reservation) lines.push(`  예약: ${h.reservation}`)
    }
  }
  if (pack.places.length) {
    lines.push('장소')
    for (const p of pack.places.slice(0, 8)) lines.push(`· ${p.name}${p.note ? ` — ${p.note}` : ''}`)
  }
  if (pack.phrases.length) {
    lines.push('자주 쓸 번역')
    for (const ph of pack.phrases.slice(0, 8)) lines.push(`· ${ph.ko} → ${ph.translated}`)
  }
  lines.push('', '※ 실시간 가격·항공 상태가 아닌 저장 스냅샷입니다.')
  return lines.filter(Boolean).join('\n')
}

export function findTravelPack(query: string): TravelOfflinePack | null {
  const q = query.toLowerCase()
  const all = loadAll()
  return (
    all.find((p) => p.title.toLowerCase().includes(q) || (p.destination || '').toLowerCase().includes(q)) ||
    all[0] ||
    null
  )
}

/** Seed helper for demo / user command 「여행 오프라인 준비」 */
export function ensureSampleHochiminhPack(): TravelOfflinePack {
  const existing = loadAll().find((p) => /호치민|hcm|saigon/i.test(p.title + (p.destination || '')))
  if (existing) return existing
  return upsertTravelPack({
    id: 'travel-hcm-sample',
    title: '호치민 여행',
    destination: 'Ho Chi Minh City',
    flights: [{ label: '인천 → 호치민', detail: '저장됨 · 편명/시간은 사용자 메모 기준' }],
    hotels: [
      {
        name: '호치민 시내 숙소 (스냅샷)',
        address: 'District 1, Ho Chi Minh City, Vietnam',
        reservation: '저장 예약번호 없음 · 사용자 입력 권장',
      },
    ],
    places: [{ name: '벤탄 시장', note: '스냅샷' }],
    phrases: [
      { ko: '호텔까지 가주세요', translated: 'Làm ơn đưa tôi đến khách sạn.', lang: 'vi' },
      { ko: '얼마예요?', translated: 'Bao nhiêu tiền?', lang: 'vi' },
    ],
    notes: ['온라인에서 「여행 오프라인 준비」로 실제 일정을 채워 주세요.'],
    source: 'user',
  })
}
