/**
 * Canonical feature catalog for More-search, redirects, and menu audits.
 * Does not delete features — only organizes entry points.
 * FAKE surfaces (travel/restaurant DEMO) are hidden from user menus via featureTruth.
 */

import { isHiddenFromUserMenu } from '../featureTruth'
import type { View } from '../types'

export type FeatureGroup =
  | 'primary'
  | 'ai'
  | 'schedule'
  | 'family'
  | 'lifeos'
  | 'space'
  | 'leisure'
  | 'settings'
  | 'tools'

export type FeatureEntry = {
  id: string
  title: string
  description: string
  group: FeatureGroup
  /** Target view when opened from More / search */
  view: View
  /** Optional action attribute instead of data-view */
  action?: string
  keywords: string[]
  /** Hide from recent-features tracking */
  excludeFromRecent?: boolean
  /** Primary bottom-tab destination */
  primaryTab?: 'home' | 'chat' | 'schedule' | 'family' | 'more'
}

export const FEATURE_CATALOG: FeatureEntry[] = [
  {
    id: 'home',
    title: '홈',
    description: '브리핑 · 빠른 실행 · 최근 기능',
    group: 'primary',
    view: 'home',
    keywords: ['홈', 'home', '브리핑', '시작'],
    primaryTab: 'home',
    excludeFromRecent: true,
  },
  {
    id: 'chat',
    title: '대화',
    description: 'AI 채팅 · 음성 · 생활비서',
    group: 'primary',
    view: 'chat',
    keywords: ['대화', '채팅', 'chat', '음성', '생활비서'],
    primaryTab: 'chat',
  },
  {
    id: 'schedule',
    title: '일정',
    description: '개인·가족 일정 · 할 일 · 알림',
    group: 'schedule',
    view: 'schedule',
    keywords: ['일정', '캘린더', '할일', '알림', '기념일', '약', '예방접종', '준비물', '숙제'],
    primaryTab: 'schedule',
  },
  {
    id: 'family-helper',
    title: '가족 도우미',
    description: '일정 · 준비물 · 약 · 성장 (멤버와 별도)',
    group: 'schedule',
    view: 'family-helper',
    keywords: ['가족', '가족도우미', '구성원', '하원', '준비물', '숙제', '약', '접종', '성장', '긴급'],
    primaryTab: 'schedule',
  },
  {
    id: 'more',
    title: '더보기',
    description: '전체 기능 · 설정 · 검색',
    group: 'primary',
    view: 'more',
    keywords: ['더보기', '메뉴', '전체', '검색'],
    primaryTab: 'more',
    excludeFromRecent: true,
  },
  {
    id: 'ai-camera',
    title: 'AI 카메라',
    description: '사진 분석 · OCR · 번역 · 문서',
    group: 'ai',
    view: 'ai-camera',
    keywords: ['카메라', '사진', 'OCR', '비전', '문서', 'vision'],
  },
  {
    id: 'translate',
    title: '번역',
    description: '상위 창을 번역 창으로 전환',
    group: 'ai',
    view: 'chat',
    action: 'home-v2-quick',
    keywords: ['번역', '통역', '번역하기', 'translate'],
  },
  {
    id: 'life',
    title: '생활 · 할 일 · 알림',
    description: '상세 생활 패널 (일정 허브에서도 접근)',
    group: 'schedule',
    view: 'life',
    keywords: ['생활', '투두', '리마인더', '스마트알림'],
  },
  {
    id: 'family-room',
    title: '멤버',
    description: '멤버 채팅 · 공지 · 초대 · 공유 일정',
    group: 'space',
    view: 'family',
    keywords: [
      '멤버',
      '맴버',
      '가족방',
      '가족공간',
      '가족채팅',
      '친구',
      '친구방',
      '초대',
      'family',
      'friends',
    ],
    primaryTab: 'family',
  },
  {
    id: 'friends',
    title: '멤버',
    description: '멤버 공간 (통합 진입)',
    group: 'space',
    view: 'family',
    keywords: ['친구', '친구방', 'friends'],
    excludeFromRecent: true,
  },
  {
    id: 'travel',
    title: '여행',
    description: '실검색 미연결 (메뉴 숨김)',
    group: 'leisure',
    view: 'travel',
    keywords: ['여행', '항공', '호텔', '비행기', 'travel', 'flight', 'hotel', '오사카', '제주'],
  },
  {
    id: 'restaurant',
    title: '맛집 · 예약',
    description: '실검색 미연결 (메뉴 숨김)',
    group: 'lifeos',
    view: 'restaurant',
    keywords: ['맛집', '식당', '예약', '외식', '레스토랑', 'restaurant', '삼산'],
  },
  {
    id: 'navigation',
    title: '길안내',
    description: '내부 지도 · 경로',
    group: 'tools',
    view: 'navigation',
    keywords: ['길안내', '지도', '네비', 'navigation'],
  },
  {
    id: 'customers',
    title: '손님관리',
    description: 'CRM · 손님 기록',
    group: 'tools',
    view: 'customers',
    keywords: ['손님', 'CRM', '고객'],
  },
  {
    id: 'actions',
    title: '빠른 실행 (앱 연결)',
    description: '외부 앱·웹 바로가기',
    group: 'tools',
    view: 'actions',
    keywords: ['빠른실행', '바로가기', '유튜브', '카카오'],
  },
  {
    id: 'invest',
    title: '투자 · 주식엔진',
    description: '관심종목 · 시세',
    group: 'leisure',
    view: 'invest',
    keywords: ['투자', '주식', '시세'],
  },
  {
    id: 'games',
    title: 'AIZIO PLAY',
    description: 'AIZIO QUEST · 클래식 아케이드',
    group: 'leisure',
    view: 'games',
    keywords: ['게임', '아케이드', '퀘스트', 'PLAY', '퍼즐'],
  },
  {
    id: 'global',
    title: '번역 · 언어 설정',
    description: '앱 언어 · 메시지 번역',
    group: 'settings',
    view: 'global',
    keywords: ['언어', 'locale', '번역설정'],
    excludeFromRecent: true,
  },
  {
    id: 'settings',
    title: '설정',
    description: 'AI Provider · 알림 · 백업 · 진단',
    group: 'settings',
    view: 'settings',
    keywords: ['설정', 'API', '키', '백업', '진단', '업데이트', 'Provider', '푸시'],
    excludeFromRecent: true,
  },
  {
    id: 'lifeos',
    title: 'Life OS',
    description: '목표 · 아이디어 · 루틴 · 타임라인',
    group: 'lifeos',
    view: 'life',
    action: 'lifeos-open',
    keywords: ['라이프', 'lifeos', '목표', '아이디어', '루틴', '타임라인', 'DNA', '관계'],
  },
  {
    id: 'backup',
    title: '백업 및 복원',
    description: '설정 화면의 백업',
    group: 'settings',
    view: 'settings',
    action: 'goto-backup',
    keywords: ['백업', '복원', 'backup'],
    excludeFromRecent: true,
  },
  {
    id: 'diag',
    title: '진단',
    description: '출시 준비 검사 · 기능·기기 진단',
    group: 'settings',
    view: 'settings',
    action: 'home-v2-goto-diag',
    keywords: ['진단', '테스트', '오류', '출시', '헬스'],
    excludeFromRecent: true,
  },
]

export const GROUP_LABELS: Record<FeatureGroup, string> = {
  primary: '기본',
  ai: 'AI 도구',
  schedule: '일정',
  family: '가족',
  lifeos: 'Life OS',
  space: '공간',
  leisure: '투자 · 여가',
  settings: '설정',
  tools: '도구',
}

/** User-visible catalog entries (excludes FAKE/unwired menu surfaces). */
export function userVisibleFeatures(): FeatureEntry[] {
  return FEATURE_CATALOG.filter((f) => !isHiddenFromUserMenu(f.id))
}

export function searchFeatures(query: string): FeatureEntry[] {
  const q = query.trim().toLowerCase()
  const pool = userVisibleFeatures()
  if (!q) return pool.filter((f) => f.group !== 'primary')
  return pool.filter((f) => {
    const blob = `${f.title} ${f.description} ${f.keywords.join(' ')}`.toLowerCase()
    return blob.includes(q)
  })
}

export function getFeatureById(id: string): FeatureEntry | undefined {
  return FEATURE_CATALOG.find((f) => f.id === id)
}

/** All View targets that must remain reachable. */
export function catalogTargetViews(): View[] {
  const set = new Set<View>()
  for (const f of FEATURE_CATALOG) set.add(f.view)
  return [...set]
}
