import type {
  Announcement,
  AppDataSnapshot,
  AppSettings,
  BlindStructure,
  Player,
  PrizeStructure,
  Table,
  TimerState,
  Tournament,
  TournamentEntry,
  User,
  Venue,
} from '@/types'
import { createAccessCode, createId } from '@/utils/id'
import { demoBlindLevels } from '@/utils/blinds'
import { defaultPrizeForTournament } from '@/utils/payouts'
import { todayDateString, nowIso } from '@/utils/time'

const FIRST = [
  '김',
  '이',
  '박',
  '최',
  '정',
  '강',
  '조',
  '윤',
  '장',
  '임',
  '한',
  '오',
  '서',
  '신',
  '권',
  '황',
  '안',
  '송',
]
const LAST = [
  '민수',
  '서연',
  '지훈',
  '하은',
  '도윤',
  '수아',
  '예준',
  '지우',
  '시우',
  '채원',
  '준서',
  '다은',
  '현우',
  '유진',
  '건우',
  '소율',
  '우진',
  '예린',
]

function demoNames(count: number): string[] {
  const names: string[] = []
  for (let i = 0; i < count; i += 1) {
    names.push(`${FIRST[i % FIRST.length]}${LAST[i % LAST.length]}${i > 17 ? i : ''}`)
  }
  return names
}

export function createDemoSnapshot(): AppDataSnapshot {
  const now = nowIso()
  const venueId = createId('venue')
  const adminId = createId('user')
  const directorId = createId('user')
  const staffId = createId('user')
  const tournamentId = createId('tournament')
  const structureId = createId('blinds')

  const users: User[] = [
    {
      id: adminId,
      username: 'admin',
      displayName: '최고 관리자',
      role: 'admin',
      venueIds: [venueId],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: directorId,
      username: 'director',
      displayName: '토너먼트 디렉터',
      role: 'director',
      venueIds: [venueId],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: staffId,
      username: 'staff',
      displayName: '딜러 스태프',
      role: 'staff',
      venueIds: [venueId],
      createdAt: now,
      updatedAt: now,
    },
  ]

  const venue: Venue = {
    id: venueId,
    name: 'POKER DIRECTOR 홀덤펍',
    phone: '02-1234-5678',
    address: '서울시 강남구 데모로 1',
    defaultTableCount: 4,
    defaultSeatsPerTable: 9,
    currency: 'KRW',
    language: 'ko',
    isActive: true,
    createdAt: now,
    updatedAt: now,
  }

  const levels = demoBlindLevels()
  const blindStructure: BlindStructure = {
    id: structureId,
    venueId,
    name: '일반 표준 구조',
    isTemplate: true,
    levels,
    createdAt: now,
    updatedAt: now,
  }

  const tournament: Tournament = {
    id: tournamentId,
    venueId,
    name: 'POKER DIRECTOR 오픈',
    date: todayDateString(),
    startTime: '19:00',
    location: venue.name,
    maxPlayers: 36,
    tableCount: 4,
    seatsPerTable: 9,
    startingStack: 30000,
    buyIn: 100000,
    fee: 10000,
    guaranteedPrize: 3000000,
    lateRegLevel: 6,
    estimatedEndTime: '23:30',
    description: '데모 토너먼트 — 현장 운영 기능을 바로 확인할 수 있습니다.',
    format: 'rebuy',
    status: 'running',
    rebuy: {
      enabled: true,
      maxCount: 2,
      endLevel: 6,
      cost: 100000,
      chips: 30000,
    },
    reentry: {
      enabled: true,
      maxCount: 1,
      endLevel: 6,
      cost: 100000,
      chips: 30000,
      newSeat: true,
    },
    addon: {
      enabled: true,
      availableLevel: 6,
      cost: 50000,
      chips: 15000,
      maxCount: 1,
    },
    bounty: {
      enabled: false,
      progressive: false,
      defaultAmount: 0,
    },
    blindStructureId: structureId,
    finalTableSize: 9,
    announcement: '데모 토너먼트가 진행 중입니다.',
    createdAt: now,
    updatedAt: now,
  }

  const names = demoNames(36)
  const players: Player[] = names.map((name, i) => ({
    id: createId('player'),
    venueId,
    name,
    nickname: `P${String(i + 1).padStart(2, '0')}`,
    phone: i % 5 === 0 ? `010-1000-${String(1000 + i).slice(-4)}` : undefined,
    memberNumber: `M${1000 + i}`,
    createdAt: now,
    updatedAt: now,
  }))

  const tables: Table[] = Array.from({ length: 4 }, (_, i) => ({
    id: createId('table'),
    tournamentId,
    number: i + 1,
    maxSeats: 9,
    status: 'active' as const,
    dealerButtonSeat: 1,
    dealerName: `딜러 ${i + 1}`,
    isBreakCandidate: i === 3,
    createdAt: now,
    updatedAt: now,
  }))

  // 31 remaining seated, 5 eliminated
  const entries: TournamentEntry[] = players.map((player, i) => {
    const eliminated = i >= 31
    const tableIndex = eliminated ? null : i % 4
    const seatNumber = eliminated ? null : Math.floor(i / 4) + 1
    return {
      id: createId('entry'),
      tournamentId,
      playerId: player.id,
      entryNumber: i + 1,
      accessCode: createAccessCode(),
      status: eliminated ? 'eliminated' : 'seated',
      paymentStatus: 'paid',
      buyInAmount: 100000,
      rebuyCount: i % 11 === 0 ? 1 : 0,
      reentryCount: 0,
      addonCount: 0,
      currentTableId: tableIndex == null ? null : tables[tableIndex]?.id,
      currentSeat: seatNumber,
      currentChips: eliminated ? 0 : 28000 + ((i * 1379) % 40000),
      bountyAmount: 0,
      bountyWon: 0,
      eliminationRank: eliminated ? 36 - (i - 31) : null,
      registeredAt: now,
      checkedInAt: now,
      eliminatedAt: eliminated ? now : null,
      isSeatLocked: i === 0,
      isVipSeat: i === 0,
      excludeFromBalance: false,
      avoidPlayerIds: [],
      createdAt: now,
      updatedAt: now,
    }
  })

  // Normalize seat numbers per table 1..n
  tables.forEach((table) => {
    const seated = entries
      .filter((e) => e.currentTableId === table.id && e.status === 'seated')
      .sort((a, b) => (a.entryNumber ?? 0) - (b.entryNumber ?? 0))
    seated.forEach((e, idx) => {
      e.currentSeat = idx + 1
    })
  })

  const level3Index = Math.max(
    0,
    levels.findIndex((l) => l.levelNumber === 3),
  )
  const remainingMs = 12 * 60 * 1000
  const timer: TimerState = {
    id: createId('timer'),
    tournamentId,
    status: 'paused',
    currentLevelIndex: level3Index,
    levelStartedAt: null,
    levelEndsAt: null,
    pausedRemainingMs: remainingMs,
    muted: false,
    createdAt: now,
    updatedAt: now,
  }

  const prize = defaultPrizeForTournament(
    tournament,
    36,
    entries.reduce((s, e) => s + e.rebuyCount * tournament.rebuy.cost, 0),
    0,
    0,
  )

  const prizeStructure: PrizeStructure = {
    id: createId('prize'),
    tournamentId,
    mode: 'percent',
    templateName: 'top3',
    operatingFee: 0,
    extraPrize: 0,
    payouts: prize.payouts,
    createdAt: now,
    updatedAt: now,
  }

  const announcement: Announcement = {
    id: createId('ann'),
    tournamentId,
    venueId,
    type: 'general',
    title: '환영합니다',
    body: 'POKER DIRECTOR 오픈 토너먼트가 진행 중입니다. 휴대폰에서도 타이머와 좌석을 확인하세요.',
    active: true,
    createdAt: now,
    updatedAt: now,
  }

  const settings: AppSettings = {
    id: createId('settings'),
    venueId,
    displayTheme: 'black_gold',
    language: 'ko',
    soundEnabled: true,
    voiceEnabled: true,
    vibrationEnabled: true,
    chipColors: [
      { name: '화이트', value: 100, color: '#f5f5f5' },
      { name: '레드', value: 500, color: '#dc2626' },
      { name: '블루', value: 1000, color: '#2563eb' },
      { name: '그린', value: 5000, color: '#16a34a' },
      { name: '블랙', value: 25000, color: '#111827' },
    ],
    createdAt: now,
    updatedAt: now,
  }

  // Scheduled + completed demos for dashboard
  const scheduled: Tournament = {
    ...tournament,
    id: createId('tournament'),
    name: '나이트리 프리즈아웃',
    startTime: '21:30',
    status: 'scheduled',
    format: 'freezeout',
  }
  const completed: Tournament = {
    ...tournament,
    id: createId('tournament'),
    name: '점심 딥스택',
    date: todayDateString(),
    startTime: '13:00',
    status: 'completed',
    format: 'deepstack' as Tournament['format'],
  }
  // fix format type - deepstack isn't in format enum, use standard
  completed.format = 'standard'

  return {
    version: 1,
    users,
    venues: [venue],
    venueMembers: users.map((u) => ({
      id: createId('vm'),
      venueId,
      userId: u.id,
      role: u.role,
      createdAt: now,
      updatedAt: now,
    })),
    tournaments: [tournament, scheduled, completed],
    blindStructures: [
      blindStructure,
      {
        ...blindStructure,
        id: createId('blinds'),
        name: '터보 템플릿',
        levels: demoBlindLevels().map((l) => ({ ...l, id: createId('lvl'), durationMinutes: 10 })),
      },
    ],
    players,
    entries,
    tables,
    seats: [],
    movements: [],
    eliminations: entries
      .filter((e) => e.status === 'eliminated' && e.eliminationRank != null)
      .map((e) => ({
        id: createId('elim'),
        tournamentId,
        entryId: e.id,
        levelNumber: 2,
        tableId: null,
        rank: e.eliminationRank!,
        eliminatedAt: now,
        createdAt: now,
        updatedAt: now,
      })),
    rebuys: [],
    reentries: [],
    addons: [],
    bounties: [],
    prizeStructures: [prizeStructure],
    payouts: [],
    announcements: [announcement],
    staffRequests: [],
    timerStates: [timer],
    auditLogs: [],
    settings: [settings],
    session: null,
  }
}

export function getDemoCredentials() {
  return {
    username: import.meta.env.VITE_DEMO_ADMIN_ID || 'admin',
    password: import.meta.env.VITE_DEMO_ADMIN_PASSWORD || '1234',
  }
}
