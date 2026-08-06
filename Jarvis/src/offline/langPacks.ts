/**
 * Offline language-pack registry (UI + metadata).
 * Built-in offlineDict pairs count as "installed packs".
 * No fake translation engine — missing engine is stated clearly.
 */

export type LangPackStatus = 'installed-builtin' | 'available' | 'engine-pending' | 'not-available'

export type LangPackInfo = {
  id: string
  label: string
  pair: string
  status: LangPackStatus
  sizeLabel: string
  updatedAt: string | null
  note: string
}

/** Priority packs from product plan — built-in offlineDict covers phrases today. */
export function listLanguagePacks(): LangPackInfo[] {
  const builtinAt = 'builtin'
  return [
    {
      id: 'ko-en',
      label: '한국어 ↔ 영어',
      pair: 'ko↔en',
      status: 'installed-builtin',
      sizeLabel: '~40KB (내장 표현)',
      updatedAt: builtinAt,
      note: '내장 여행·일상 표현 사전. 임의 문장 고품질 엔진은 별도 연결 필요.',
    },
    {
      id: 'ko-vi',
      label: '한국어 ↔ 베트남어',
      pair: 'ko↔vi',
      status: 'installed-builtin',
      sizeLabel: '~25KB (내장 표현)',
      updatedAt: builtinAt,
      note: '내장 표현 사전 사용 가능.',
    },
    {
      id: 'ko-ja',
      label: '한국어 ↔ 일본어',
      pair: 'ko↔ja',
      status: 'installed-builtin',
      sizeLabel: '~18KB (내장 표현)',
      updatedAt: builtinAt,
      note: '내장 표현 사전 사용 가능.',
    },
    {
      id: 'ko-zh',
      label: '한국어 ↔ 중국어',
      pair: 'ko↔zh',
      status: 'installed-builtin',
      sizeLabel: '~12KB (내장 표현)',
      updatedAt: builtinAt,
      note: '내장 표현 사전 사용 가능.',
    },
    {
      id: 'engine-neural',
      label: '고품질 오프라인 엔진',
      pair: 'multi',
      status: 'engine-pending',
      sizeLabel: '미정',
      updatedAt: null,
      note: '언어팩 엔진 준비 필요 — 가짜 번역을 하지 않습니다.',
    },
  ]
}

export function langPackStatusLabel(status: LangPackStatus): string {
  switch (status) {
    case 'installed-builtin':
      return '설치됨 (내장)'
    case 'available':
      return '다운로드 가능'
    case 'engine-pending':
      return '엔진 준비 필요'
    default:
      return '없음'
  }
}
