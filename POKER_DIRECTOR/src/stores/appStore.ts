import { create } from 'zustand'
import type {
  Announcement,
  AnnouncementType,
  AppDataSnapshot,
  AppSettings,
  AuditAction,
  AuditLog,
  AuthSession,
  BalanceSuggestion,
  BlindLevel,
  BlindStructure,
  DisplayTheme,
  EntryStatus,
  Player,
  PrizePayout,
  PrizeStructure,
  SeatAssignmentPreview,
  StaffRequest,
  StaffRequestType,
  Table,
  TableBreakPlan,
  Tournament,
  TournamentEntry,
  TournamentFormat,
  UserRole,
} from '@/types'
import { createDemoSnapshot, getDemoCredentials } from '@/data/demo'
import { loadSnapshot, resetToDemo, saveSnapshot } from '@/services/storage/localDb'
import { isCloudMode } from '@/services/supabase/client'
import { syncWithCloud, type SyncConflict } from '@/services/sync/syncService'
import { createAccessCode, createId } from '@/utils/id'
import { nowIso, todayDateString } from '@/utils/time'
import {
  advanceLevelIfExpired,
  goToLevel,
  pauseTimerState,
  resumeTimerState,
  setRemainingMs,
  startTimerState,
  stopTimerState,
} from '@/utils/timer'
import { previewSeatAssignment } from '@/utils/seating'
import { suggestBalance, suggestTableBreak } from '@/utils/balancing'
import {
  calculatePrizePool,
  percentsToPayouts,
  validatePayouts,
  buildPrizeTemplate,
  type PrizeTemplateKey,
} from '@/utils/payouts'
import { createBlindTemplate, renumber, type BlindTemplateKey } from '@/utils/blinds'

type PersistSlice = Omit<AppDataSnapshot, 'session'> & { session: AuthSession | null }

interface UiState {
  hydrated: boolean
  selectedTournamentId: string | null
  seatPreview: SeatAssignmentPreview[] | null
  balanceSuggestions: BalanceSuggestion[]
  breakPlan: TableBreakPlan | null
  syncConflict: SyncConflict | null
  lastError: string | null
  flash: boolean
}

interface AppStore extends PersistSlice, UiState {
  hydrate: () => Promise<void>
  persist: () => Promise<void>
  login: (username: string, password: string) => boolean
  logout: () => void
  setVenue: (venueId: string) => void
  selectTournament: (id: string | null) => void
  getSelectedTournament: () => Tournament | null
  createTournament: (input: Partial<Tournament> & { name: string; blindTemplate?: BlindTemplateKey }) => string
  updateTournament: (id: string, patch: Partial<Tournament>) => void
  startTournament: (id: string) => void
  endTournament: (id: string) => void
  saveBlindStructure: (structure: BlindStructure) => void
  applyBlindTemplate: (structureId: string, key: BlindTemplateKey) => void
  updateBlindLevels: (structureId: string, levels: BlindLevel[]) => void
  registerPlayer: (
    tournamentId: string,
    data: { name: string; nickname?: string; phone?: string; memberNumber?: string },
  ) => { ok: boolean; message?: string; entryId?: string }
  quickRegisterNames: (tournamentId: string, names: string[]) => number
  importPlayersCsv: (tournamentId: string, rows: Record<string, string>[]) => number
  updateEntry: (entryId: string, patch: Partial<TournamentEntry>) => void
  deleteEntry: (entryId: string) => void
  setEntryStatus: (entryId: string, status: EntryStatus) => void
  checkIn: (entryId: string) => void
  checkOut: (entryId: string) => void
  previewSeating: (tournamentId: string) => SeatAssignmentPreview[]
  confirmSeating: (tournamentId: string) => void
  movePlayer: (
    entryId: string,
    toTableId: string,
    toSeat: number,
    reason?: string,
  ) => void
  swapSeats: (entryA: string, entryB: string) => void
  addTable: (tournamentId: string) => void
  setTableStatus: (tableId: string, status: Table['status']) => void
  rotateDealer: (tableId: string) => void
  suggestBalancing: (tournamentId: string) => BalanceSuggestion[]
  applyBalancing: (suggestions: BalanceSuggestion[]) => void
  suggestBreak: (tournamentId: string) => TableBreakPlan | null
  applyBreak: (plan: TableBreakPlan) => void
  eliminatePlayer: (input: {
    entryId: string
    eliminatedByEntryId?: string
    notes?: string
  }) => void
  undoElimination: (entryId: string) => void
  rebuy: (entryId: string) => void
  reentry: (entryId: string) => void
  addon: (entryId: string) => void
  updateChips: (entryId: string, chips: number) => void
  timerStart: (tournamentId: string) => void
  timerPause: (tournamentId: string) => void
  timerResume: (tournamentId: string) => void
  timerStop: (tournamentId: string) => void
  timerNext: (tournamentId: string) => void
  timerPrev: (tournamentId: string) => void
  timerGoTo: (tournamentId: string, index: number) => void
  timerSetRemaining: (tournamentId: string, ms: number) => void
  timerExtend: (tournamentId: string, minutes: number) => void
  timerTick: (tournamentId: string) => void
  timerToggleMute: (tournamentId: string) => void
  setPrizeStructure: (
    tournamentId: string,
    mode: PrizeStructure['mode'],
    payouts: PrizePayout[],
    operatingFee?: number,
    extraPrize?: number,
    templateName?: string,
  ) => { ok: boolean; message?: string }
  applyPrizeTemplate: (tournamentId: string, key: PrizeTemplateKey) => { ok: boolean; message?: string }
  addAnnouncement: (
    tournamentId: string,
    type: AnnouncementType,
    title: string,
    body: string,
  ) => void
  createStaffRequest: (
    tournamentId: string,
    type: StaffRequestType,
    message: string,
    tableId?: string,
  ) => void
  resolveStaffRequest: (id: string) => void
  undoLast: () => void
  getPlayerName: (playerId: string) => string
  getEntryName: (entryId: string) => string
  nameMapForTournament: (tournamentId: string) => Record<string, string>
  statsForVenue: (venueId: string) => {
    tournamentCount: number
    avgPlayers: number
    totalEntries: number
    totalBuyIns: number
    totalPrize: number
  }
  updateSettings: (patch: Partial<AppSettings>) => void
  setDisplayTheme: (theme: DisplayTheme) => void
  backupJson: () => string
  restoreJson: (text: string) => void
  resetDemo: () => Promise<void>
  syncCloud: (choice?: 'local' | 'remote') => Promise<void>
  canManageTimer: () => boolean
  canSeePhone: () => boolean
  drawFinalTable: (tournamentId: string) => SeatAssignmentPreview | null
  finalizeWinner: (tournamentId: string, entryId: string) => void
}

function stamp(): string {
  return nowIso()
}

function emptyUi(): UiState {
  return {
    hydrated: false,
    selectedTournamentId: null,
    seatPreview: null,
    balanceSuggestions: [],
    breakPlan: null,
    syncConflict: null,
    lastError: null,
    flash: false,
  }
}

function fromSnapshot(snapshot: AppDataSnapshot): PersistSlice {
  const { session, ...rest } = snapshot
  return { ...rest, session }
}

export const useAppStore = create<AppStore>((set, get) => {
  const pushAudit = (
    action: AuditAction,
    summary: string,
    payload?: unknown,
    undoPayload?: unknown,
    canUndo = false,
  ) => {
    const state = get()
    const venueId = state.session?.currentVenueId ?? state.venues[0]?.id ?? ''
    const log: AuditLog = {
      id: createId('audit'),
      venueId,
      tournamentId: state.selectedTournamentId ?? undefined,
      action,
      summary,
      payload,
      undoPayload,
      canUndo,
      undone: false,
      createdAt: stamp(),
      updatedAt: stamp(),
      createdBy: state.session?.userId,
    }
    set({ auditLogs: [log, ...state.auditLogs].slice(0, 200) })
  }

  const persistSoon = () => {
    void get().persist()
  }

  return {
    ...fromSnapshot(createDemoSnapshot()),
    ...emptyUi(),

    hydrate: async () => {
      const snapshot = await loadSnapshot()
      const selected =
        snapshot.tournaments.find((t) => t.status === 'running')?.id ??
        snapshot.tournaments[0]?.id ??
        null
      set({
        ...fromSnapshot(snapshot),
        hydrated: true,
        selectedTournamentId: selected,
      })
    },

    persist: async () => {
      const s = get()
      const snapshot: AppDataSnapshot = {
        version: s.version,
        users: s.users,
        venues: s.venues,
        venueMembers: s.venueMembers,
        tournaments: s.tournaments,
        blindStructures: s.blindStructures,
        players: s.players,
        entries: s.entries,
        tables: s.tables,
        seats: s.seats,
        movements: s.movements,
        eliminations: s.eliminations,
        rebuys: s.rebuys,
        reentries: s.reentries,
        addons: s.addons,
        bounties: s.bounties,
        prizeStructures: s.prizeStructures,
        payouts: s.payouts,
        announcements: s.announcements,
        staffRequests: s.staffRequests,
        timerStates: s.timerStates,
        auditLogs: s.auditLogs,
        settings: s.settings,
        session: s.session,
      }
      await saveSnapshot(snapshot)
    },

    login: (username, password) => {
      const creds = getDemoCredentials()
      const id = username.trim()
      const pw = password.trim()
      // Ensure demo users exist even if local storage was wiped/corrupted
      if (get().users.length === 0) {
        const demo = createDemoSnapshot()
        set({
          ...demo,
          session: get().session,
          hydrated: true,
          selectedTournamentId:
            demo.tournaments.find((t) => t.status === 'running')?.id ??
            demo.tournaments[0]?.id ??
            null,
        })
      }
      if (isCloudMode()) {
        const user = get().users.find((u) => u.username === id)
        if (!user) {
          // Keep demo credentials usable until Supabase Auth UI is connected
          if (id !== creds.username || pw !== creds.password) {
            set({ lastError: '클라우드 모드: Supabase 로그인 연동 후 이용하세요.' })
            return false
          }
        } else if (pw !== creds.password) {
          set({ lastError: '아이디 또는 비밀번호가 올바르지 않습니다.' })
          return false
        }
      } else if (id !== creds.username || pw !== creds.password) {
        const user = get().users.find((u) => u.username === id)
        if (!user || pw !== creds.password) {
          set({ lastError: '아이디 또는 비밀번호가 올바르지 않습니다.' })
          return false
        }
      }
      const user =
        get().users.find((u) => u.username === id) ??
        get().users.find((u) => u.role === 'admin')
      if (!user) {
        set({ lastError: '사용자 데이터를 불러오지 못했습니다. 새로고침 후 다시 시도하세요.' })
        return false
      }
      const session: AuthSession = {
        userId: user.id,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
        venueIds: user.venueIds,
        currentVenueId: user.venueIds[0] ?? get().venues[0]?.id ?? '',
        mode: isCloudMode() ? 'cloud' : 'demo',
      }
      set({ session, lastError: null })
      persistSoon()
      return true
    },

    logout: () => {
      set({ session: null })
      persistSoon()
    },

    setVenue: (venueId) => {
      const session = get().session
      if (!session) return
      set({ session: { ...session, currentVenueId: venueId } })
      persistSoon()
    },

    selectTournament: (id) => set({ selectedTournamentId: id }),

    getSelectedTournament: () => {
      const id = get().selectedTournamentId
      return get().tournaments.find((t) => t.id === id) ?? null
    },

    createTournament: (input) => {
      const state = get()
      const venueId = state.session?.currentVenueId ?? state.venues[0]?.id
      if (!venueId) return ''
      const structureId = createId('blinds')
      const template = input.blindTemplate ?? 'standard'
      const levels = createBlindTemplate(template)
      const structure: BlindStructure = {
        id: structureId,
        venueId,
        name: `${input.name} 블라인드`,
        isTemplate: false,
        levels,
        createdAt: stamp(),
        updatedAt: stamp(),
      }
      const id = createId('tournament')
      const t: Tournament = {
        id,
        venueId,
        name: input.name,
        date: input.date ?? todayDateString(),
        startTime: input.startTime ?? '19:00',
        location: input.location ?? state.venues.find((v) => v.id === venueId)?.name ?? '',
        maxPlayers: input.maxPlayers ?? 36,
        tableCount: input.tableCount ?? 4,
        seatsPerTable: input.seatsPerTable ?? 9,
        startingStack: input.startingStack ?? 30000,
        buyIn: input.buyIn ?? 100000,
        fee: input.fee ?? 10000,
        guaranteedPrize: input.guaranteedPrize ?? 0,
        lateRegLevel: input.lateRegLevel ?? 6,
        estimatedEndTime: input.estimatedEndTime,
        description: input.description,
        format: (input.format as TournamentFormat) ?? 'standard',
        status: 'draft',
        rebuy: input.rebuy ?? {
          enabled: false,
          maxCount: 0,
          endLevel: 0,
          cost: 0,
          chips: 0,
        },
        reentry: input.reentry ?? {
          enabled: false,
          maxCount: 0,
          endLevel: 0,
          cost: 0,
          chips: 0,
          newSeat: true,
        },
        addon: input.addon ?? {
          enabled: false,
          availableLevel: 0,
          cost: 0,
          chips: 0,
          maxCount: 0,
        },
        bounty: input.bounty ?? {
          enabled: false,
          progressive: false,
          defaultAmount: 0,
        },
        blindStructureId: structureId,
        finalTableSize: input.finalTableSize ?? 9,
        createdAt: stamp(),
        updatedAt: stamp(),
      }
      const tables: Table[] = Array.from({ length: t.tableCount }, (_, i) => ({
        id: createId('table'),
        tournamentId: id,
        number: i + 1,
        maxSeats: t.seatsPerTable,
        status: 'active',
        dealerButtonSeat: 1,
        isBreakCandidate: false,
        createdAt: stamp(),
        updatedAt: stamp(),
      }))
      set({
        tournaments: [t, ...state.tournaments],
        blindStructures: [structure, ...state.blindStructures],
        tables: [...tables, ...state.tables],
        timerStates: [
          {
            id: createId('timer'),
            tournamentId: id,
            status: 'idle',
            currentLevelIndex: 0,
            levelStartedAt: null,
            levelEndsAt: null,
            pausedRemainingMs: (levels[0]?.durationMinutes ?? 15) * 60 * 1000,
            muted: false,
            createdAt: stamp(),
            updatedAt: stamp(),
          },
          ...state.timerStates,
        ],
        prizeStructures: [
          {
            id: createId('prize'),
            tournamentId: id,
            mode: 'percent',
            operatingFee: 0,
            extraPrize: 0,
            payouts: [],
            createdAt: stamp(),
            updatedAt: stamp(),
          },
          ...state.prizeStructures,
        ],
        selectedTournamentId: id,
      })
      pushAudit('other', `토너먼트 생성: ${t.name}`)
      persistSoon()
      return id
    },

    updateTournament: (id, patch) => {
      set({
        tournaments: get().tournaments.map((t) =>
          t.id === id ? { ...t, ...patch, updatedAt: stamp() } : t,
        ),
      })
      persistSoon()
    },

    startTournament: (id) => {
      get().updateTournament(id, { status: 'running' })
      pushAudit('other', '토너먼트 시작')
    },

    endTournament: (id) => {
      get().updateTournament(id, { status: 'completed' })
      get().timerStop(id)
      pushAudit('tournament_end', '토너먼트 종료', { id }, undefined, false)
      persistSoon()
    },

    saveBlindStructure: (structure) => {
      const exists = get().blindStructures.some((b) => b.id === structure.id)
      set({
        blindStructures: exists
          ? get().blindStructures.map((b) =>
              b.id === structure.id ? { ...structure, updatedAt: stamp() } : b,
            )
          : [{ ...structure, updatedAt: stamp() }, ...get().blindStructures],
      })
      persistSoon()
    },

    applyBlindTemplate: (structureId, key) => {
      const levels = createBlindTemplate(key)
      get().updateBlindLevels(structureId, levels)
    },

    updateBlindLevels: (structureId, levels) => {
      set({
        blindStructures: get().blindStructures.map((b) =>
          b.id === structureId
            ? { ...b, levels: renumber(levels), updatedAt: stamp() }
            : b,
        ),
      })
      persistSoon()
    },

    registerPlayer: (tournamentId, data) => {
      const state = get()
      const tournament = state.tournaments.find((t) => t.id === tournamentId)
      if (!tournament) return { ok: false, message: '토너먼트를 찾을 수 없습니다.' }
      const dup = state.players.some(
        (p) =>
          p.venueId === tournament.venueId &&
          !p.deletedAt &&
          p.name.trim() === data.name.trim() &&
          state.entries.some(
            (e) =>
              e.tournamentId === tournamentId &&
              e.playerId === p.id &&
              e.status !== 'cancelled',
          ),
      )
      if (dup) return { ok: false, message: '동일 토너먼트에 이미 등록된 이름입니다.' }
      const player: Player = {
        id: createId('player'),
        venueId: tournament.venueId,
        name: data.name.trim(),
        nickname: data.nickname,
        phone: data.phone,
        memberNumber: data.memberNumber,
        createdAt: stamp(),
        updatedAt: stamp(),
      }
      const entryNumber =
        state.entries.filter((e) => e.tournamentId === tournamentId).reduce((m, e) => Math.max(m, e.entryNumber), 0) +
        1
      const entry: TournamentEntry = {
        id: createId('entry'),
        tournamentId,
        playerId: player.id,
        entryNumber,
        accessCode: createAccessCode(),
        status: 'registered',
        paymentStatus: 'unpaid',
        buyInAmount: tournament.buyIn,
        rebuyCount: 0,
        reentryCount: 0,
        addonCount: 0,
        currentChips: tournament.startingStack,
        bountyAmount: tournament.bounty.enabled ? tournament.bounty.defaultAmount : 0,
        bountyWon: 0,
        registeredAt: stamp(),
        isSeatLocked: false,
        isVipSeat: false,
        excludeFromBalance: false,
        avoidPlayerIds: [],
        createdAt: stamp(),
        updatedAt: stamp(),
      }
      set({
        players: [player, ...state.players],
        entries: [entry, ...state.entries],
      })
      pushAudit('player_register', `참가자 등록: ${player.name}`, { entry }, { entryId: entry.id }, true)
      persistSoon()
      return { ok: true, entryId: entry.id }
    },

    quickRegisterNames: (tournamentId, names) => {
      let count = 0
      for (const name of names) {
        const trimmed = name.trim()
        if (!trimmed) continue
        const res = get().registerPlayer(tournamentId, { name: trimmed })
        if (res.ok) count += 1
      }
      return count
    },

    importPlayersCsv: (tournamentId, rows) => {
      let count = 0
      for (const row of rows) {
        const name = row['이름'] || row['name'] || row['Name']
        if (!name) continue
        const res = get().registerPlayer(tournamentId, {
          name,
          nickname: row['닉네임'] || row['nickname'],
          phone: row['전화번호'] || row['phone'],
          memberNumber: row['회원번호'] || row['memberNumber'],
        })
        if (res.ok) count += 1
      }
      return count
    },

    updateEntry: (entryId, patch) => {
      set({
        entries: get().entries.map((e) =>
          e.id === entryId ? { ...e, ...patch, updatedAt: stamp() } : e,
        ),
      })
      persistSoon()
    },

    deleteEntry: (entryId) => {
      const entry = get().entries.find((e) => e.id === entryId)
      set({
        entries: get().entries.map((e) =>
          e.id === entryId ? { ...e, status: 'cancelled', deletedAt: stamp(), updatedAt: stamp() } : e,
        ),
      })
      pushAudit('player_delete', `참가자 삭제/취소: ${entry ? get().getEntryName(entry.id) : entryId}`, { entry }, { entry }, true)
      persistSoon()
    },

    setEntryStatus: (entryId, status) => get().updateEntry(entryId, { status }),

    checkIn: (entryId) => {
      get().updateEntry(entryId, { status: 'checked_in', checkedInAt: stamp() })
      pushAudit('check_in', `체크인: ${get().getEntryName(entryId)}`)
    },

    checkOut: (entryId) => {
      get().updateEntry(entryId, { status: 'registered', checkedInAt: null })
      pushAudit('check_out', `체크인 취소: ${get().getEntryName(entryId)}`)
    },

    previewSeating: (tournamentId) => {
      const state = get()
      const entries = state.entries.filter(
        (e) => e.tournamentId === tournamentId && e.status !== 'cancelled' && e.status !== 'eliminated',
      )
      const tables = state.tables.filter((t) => t.tournamentId === tournamentId)
      const names = state.nameMapForTournament(tournamentId)
      const locked = entries
        .filter((e) => e.isSeatLocked && e.currentTableId && e.currentSeat != null)
        .map((e) => ({
          entryId: e.id,
          tableId: e.currentTableId!,
          seatNumber: e.currentSeat!,
        }))
      const preview = previewSeatAssignment(entries, tables, names, {
        lockedSeats: locked,
        avoidPairs: entries.flatMap((e) => e.avoidPlayerIds.map((id) => [e.id, id] as [string, string])),
      })
      set({ seatPreview: preview })
      return preview
    },

    confirmSeating: (tournamentId) => {
      const preview = get().seatPreview ?? get().previewSeating(tournamentId)
      let entries = [...get().entries]
      for (const table of preview) {
        for (const seat of table.seats) {
          entries = entries.map((e) =>
            e.id === seat.entryId
              ? {
                  ...e,
                  currentTableId: table.tableId,
                  currentSeat: seat.seatNumber,
                  status: 'seated' as const,
                  updatedAt: stamp(),
                }
              : e,
          )
        }
      }
      set({ entries, seatPreview: null })
      pushAudit('seat_assign', '좌석 자동 배정 확정', { preview }, { preview }, true)
      persistSoon()
    },

    movePlayer: (entryId, toTableId, toSeat, reason = '수동 이동') => {
      const state = get()
      const entry = state.entries.find((e) => e.id === entryId)
      if (!entry) return
      const occupied = state.entries.find(
        (e) =>
          e.id !== entryId &&
          e.currentTableId === toTableId &&
          e.currentSeat === toSeat &&
          e.status === 'seated',
      )
      if (occupied) {
        set({ lastError: '이미 사용 중인 좌석입니다.' })
        return
      }
      const movement = {
        id: createId('move'),
        tournamentId: entry.tournamentId,
        entryId,
        fromTableId: entry.currentTableId,
        fromSeat: entry.currentSeat,
        toTableId,
        toSeat,
        reason,
        movedAt: stamp(),
        createdAt: stamp(),
        updatedAt: stamp(),
      }
      set({
        entries: state.entries.map((e) =>
          e.id === entryId
            ? {
                ...e,
                currentTableId: toTableId,
                currentSeat: toSeat,
                status: 'seated',
                lastMovedAt: stamp(),
                updatedAt: stamp(),
              }
            : e,
        ),
        movements: [movement, ...state.movements],
        lastError: null,
      })
      pushAudit('seat_move', `${get().getEntryName(entryId)} 좌석 이동`, { movement }, { entry }, true)
      persistSoon()
    },

    swapSeats: (entryA, entryB) => {
      const a = get().entries.find((e) => e.id === entryA)
      const b = get().entries.find((e) => e.id === entryB)
      if (!a || !b) return
      set({
        entries: get().entries.map((e) => {
          if (e.id === entryA) {
            return {
              ...e,
              currentTableId: b.currentTableId,
              currentSeat: b.currentSeat,
              lastMovedAt: stamp(),
              updatedAt: stamp(),
            }
          }
          if (e.id === entryB) {
            return {
              ...e,
              currentTableId: a.currentTableId,
              currentSeat: a.currentSeat,
              lastMovedAt: stamp(),
              updatedAt: stamp(),
            }
          }
          return e
        }),
      })
      pushAudit('seat_move', '좌석 교환', { entryA, entryB }, { a, b }, true)
      persistSoon()
    },

    addTable: (tournamentId) => {
      const tables = get().tables.filter((t) => t.tournamentId === tournamentId)
      const number = tables.reduce((m, t) => Math.max(m, t.number), 0) + 1
      const tournament = get().tournaments.find((t) => t.id === tournamentId)
      const table: Table = {
        id: createId('table'),
        tournamentId,
        number,
        maxSeats: tournament?.seatsPerTable ?? 9,
        status: 'active',
        dealerButtonSeat: 1,
        isBreakCandidate: false,
        createdAt: stamp(),
        updatedAt: stamp(),
      }
      set({ tables: [...get().tables, table] })
      persistSoon()
    },

    setTableStatus: (tableId, status) => {
      set({
        tables: get().tables.map((t) =>
          t.id === tableId ? { ...t, status, updatedAt: stamp() } : t,
        ),
      })
      persistSoon()
    },

    rotateDealer: (tableId) => {
      set({
        tables: get().tables.map((t) =>
          t.id === tableId
            ? {
                ...t,
                dealerButtonSeat: (t.dealerButtonSeat % t.maxSeats) + 1,
                updatedAt: stamp(),
              }
            : t,
        ),
      })
      persistSoon()
    },

    suggestBalancing: (tournamentId) => {
      const state = get()
      const suggestions = suggestBalance(
        state.tables.filter((t) => t.tournamentId === tournamentId),
        state.entries.filter((e) => e.tournamentId === tournamentId),
        state.nameMapForTournament(tournamentId),
      )
      set({ balanceSuggestions: suggestions })
      return suggestions
    },

    applyBalancing: (suggestions) => {
      for (const s of suggestions) {
        get().movePlayer(s.entryId, s.toTableId, s.toSeat, s.reason)
      }
      set({ balanceSuggestions: [] })
      pushAudit('balance', `밸런싱 ${suggestions.length}건 적용`)
    },

    suggestBreak: (tournamentId) => {
      const state = get()
      const plan = suggestTableBreak(
        state.tables.filter((t) => t.tournamentId === tournamentId),
        state.entries.filter((e) => e.tournamentId === tournamentId),
        state.nameMapForTournament(tournamentId),
      )
      set({ breakPlan: plan })
      return plan
    },

    applyBreak: (plan) => {
      for (const m of plan.moves) {
        get().movePlayer(m.entryId, m.toTableId, m.toSeat, m.reason)
      }
      get().setTableStatus(plan.breakTableId, 'broken')
      const names = plan.moves
        .map((m) => `${m.playerName}님은 ${m.toTableNumber}번 테이블 ${m.toSeat}번 좌석으로 이동하십시오.`)
        .join(' ')
      const tid = get().entries.find((e) => e.id === plan.moves[0]?.entryId)?.tournamentId
      if (tid) {
        get().addAnnouncement(tid, 'seat_move', '테이블 브레이크 이동 안내', names)
      }
      set({ breakPlan: null })
      pushAudit('table_break', `${plan.breakTableNumber}번 테이블 브레이크`)
      persistSoon()
    },

    eliminatePlayer: ({ entryId, eliminatedByEntryId, notes }) => {
      const state = get()
      const entry = state.entries.find((e) => e.id === entryId)
      if (!entry || entry.status === 'eliminated') return
      const remaining = state.entries.filter(
        (e) => e.tournamentId === entry.tournamentId && e.status === 'seated',
      )
      const rank = remaining.length
      const timer = state.timerStates.find((t) => t.tournamentId === entry.tournamentId)
      const structure = state.blindStructures.find(
        (b) => b.id === state.tournaments.find((t) => t.id === entry.tournamentId)?.blindStructureId,
      )
      const levelNumber = structure?.levels[timer?.currentLevelIndex ?? 0]?.levelNumber ?? 1
      const elim = {
        id: createId('elim'),
        tournamentId: entry.tournamentId,
        entryId,
        eliminatedByEntryId,
        levelNumber,
        tableId: entry.currentTableId,
        rank,
        eliminatedAt: stamp(),
        notes,
        createdAt: stamp(),
        updatedAt: stamp(),
      }
      let entries = state.entries.map((e) =>
        e.id === entryId
          ? {
              ...e,
              status: 'eliminated' as const,
              eliminationRank: rank,
              eliminatedAt: stamp(),
              currentTableId: null,
              currentSeat: null,
              currentChips: 0,
              updatedAt: stamp(),
            }
          : e,
      )
      if (eliminatedByEntryId && entry.bountyAmount > 0) {
        entries = entries.map((e) =>
          e.id === eliminatedByEntryId
            ? {
                ...e,
                bountyWon: e.bountyWon + entry.bountyAmount,
                currentChips: e.currentChips,
                updatedAt: stamp(),
              }
            : e,
        )
      }
      const tournament = state.tournaments.find((t) => t.id === entry.tournamentId)
      const left = entries.filter(
        (e) => e.tournamentId === entry.tournamentId && e.status === 'seated',
      ).length
      let tournaments = state.tournaments
      if (tournament && left <= tournament.finalTableSize && left > 1) {
        tournaments = tournaments.map((t) =>
          t.id === tournament.id ? { ...t, status: 'final_table', updatedAt: stamp() } : t,
        )
      }
      set({
        entries,
        eliminations: [elim, ...state.eliminations],
        tournaments,
      })
      pushAudit('eliminate', `탈락: ${get().getEntryName(entryId)} (${rank}위)`, { elim, entry }, { entry }, true)
      persistSoon()
    },

    undoElimination: (entryId) => {
      const state = get()
      const entry = state.entries.find((e) => e.id === entryId)
      const elim = state.eliminations.find((e) => e.entryId === entryId && !e.deletedAt)
      if (!entry || !elim) return
      set({
        entries: state.entries.map((e) =>
          e.id === entryId
            ? {
                ...e,
                status: 'checked_in',
                eliminationRank: null,
                eliminatedAt: null,
                currentChips: state.tournaments.find((t) => t.id === e.tournamentId)?.startingStack ?? 30000,
                updatedAt: stamp(),
              }
            : e,
        ),
        eliminations: state.eliminations.map((e) =>
          e.id === elim.id ? { ...e, deletedAt: stamp(), updatedAt: stamp() } : e,
        ),
      })
      pushAudit('eliminate_undo', `탈락 취소: ${get().getEntryName(entryId)}`)
      persistSoon()
    },

    rebuy: (entryId) => {
      const state = get()
      const entry = state.entries.find((e) => e.id === entryId)
      const tournament = state.tournaments.find((t) => t.id === entry?.tournamentId)
      if (!entry || !tournament?.rebuy.enabled) return
      if (entry.rebuyCount >= tournament.rebuy.maxCount) {
        set({ lastError: '리바이 가능 횟수를 초과했습니다.' })
        return
      }
      set({
        entries: state.entries.map((e) =>
          e.id === entryId
            ? {
                ...e,
                rebuyCount: e.rebuyCount + 1,
                currentChips: e.currentChips + tournament.rebuy.chips,
                status: e.status === 'eliminated' ? 'seated' : e.status,
                updatedAt: stamp(),
              }
            : e,
        ),
        rebuys: [
          {
            id: createId('rebuy'),
            tournamentId: entry.tournamentId,
            entryId,
            cost: tournament.rebuy.cost,
            chips: tournament.rebuy.chips,
            levelNumber: 1,
            createdAt: stamp(),
            updatedAt: stamp(),
          },
          ...state.rebuys,
        ],
        lastError: null,
      })
      pushAudit('rebuy', `리바이: ${get().getEntryName(entryId)}`)
      persistSoon()
    },

    reentry: (entryId) => {
      const state = get()
      const entry = state.entries.find((e) => e.id === entryId)
      const tournament = state.tournaments.find((t) => t.id === entry?.tournamentId)
      if (!entry || !tournament?.reentry.enabled) return
      if (entry.reentryCount >= tournament.reentry.maxCount) {
        set({ lastError: '리엔트리 가능 횟수를 초과했습니다.' })
        return
      }
      set({
        entries: state.entries.map((e) =>
          e.id === entryId
            ? {
                ...e,
                reentryCount: e.reentryCount + 1,
                currentChips: tournament.reentry.chips,
                status: 'checked_in',
                eliminationRank: null,
                eliminatedAt: null,
                currentTableId: tournament.reentry.newSeat ? null : e.currentTableId,
                currentSeat: tournament.reentry.newSeat ? null : e.currentSeat,
                updatedAt: stamp(),
              }
            : e,
        ),
        reentries: [
          {
            id: createId('reentry'),
            tournamentId: entry.tournamentId,
            entryId,
            cost: tournament.reentry.cost,
            chips: tournament.reentry.chips,
            levelNumber: 1,
            createdAt: stamp(),
            updatedAt: stamp(),
          },
          ...state.reentries,
        ],
        lastError: null,
      })
      pushAudit('reentry', `리엔트리: ${get().getEntryName(entryId)}`)
      persistSoon()
    },

    addon: (entryId) => {
      const state = get()
      const entry = state.entries.find((e) => e.id === entryId)
      const tournament = state.tournaments.find((t) => t.id === entry?.tournamentId)
      if (!entry || !tournament?.addon.enabled) return
      if (entry.addonCount >= tournament.addon.maxCount) {
        set({ lastError: '애드온 가능 횟수를 초과했습니다.' })
        return
      }
      set({
        entries: state.entries.map((e) =>
          e.id === entryId
            ? {
                ...e,
                addonCount: e.addonCount + 1,
                currentChips: e.currentChips + tournament.addon.chips,
                updatedAt: stamp(),
              }
            : e,
        ),
        addons: [
          {
            id: createId('addon'),
            tournamentId: entry.tournamentId,
            entryId,
            cost: tournament.addon.cost,
            chips: tournament.addon.chips,
            levelNumber: tournament.addon.availableLevel,
            createdAt: stamp(),
            updatedAt: stamp(),
          },
          ...state.addons,
        ],
        lastError: null,
      })
      pushAudit('addon', `애드온: ${get().getEntryName(entryId)}`)
      persistSoon()
    },

    updateChips: (entryId, chips) => {
      get().updateEntry(entryId, { currentChips: Math.max(0, chips) })
    },

    timerStart: (tournamentId) => {
      if (!get().canManageTimer()) return
      const state = get()
      const timer = state.timerStates.find((t) => t.tournamentId === tournamentId)
      const tournament = state.tournaments.find((t) => t.id === tournamentId)
      const structure = state.blindStructures.find((b) => b.id === tournament?.blindStructureId)
      if (!timer || !structure) return
      set({
        timerStates: state.timerStates.map((t) =>
          t.tournamentId === tournamentId ? startTimerState(t, structure.levels) : t,
        ),
      })
      persistSoon()
    },

    timerPause: (tournamentId) => {
      if (!get().canManageTimer()) return
      set({
        timerStates: get().timerStates.map((t) =>
          t.tournamentId === tournamentId ? pauseTimerState(t) : t,
        ),
      })
      persistSoon()
    },

    timerResume: (tournamentId) => {
      if (!get().canManageTimer()) return
      set({
        timerStates: get().timerStates.map((t) =>
          t.tournamentId === tournamentId ? resumeTimerState(t) : t,
        ),
      })
      persistSoon()
    },

    timerStop: (tournamentId) => {
      if (!get().canManageTimer()) return
      const state = get()
      const tournament = state.tournaments.find((t) => t.id === tournamentId)
      const structure = state.blindStructures.find((b) => b.id === tournament?.blindStructureId)
      if (!structure) return
      set({
        timerStates: state.timerStates.map((t) =>
          t.tournamentId === tournamentId ? stopTimerState(t, structure.levels) : t,
        ),
      })
      persistSoon()
    },

    timerNext: (tournamentId) => {
      if (!get().canManageTimer()) return
      const state = get()
      const timer = state.timerStates.find((t) => t.tournamentId === tournamentId)
      const tournament = state.tournaments.find((t) => t.id === tournamentId)
      const structure = state.blindStructures.find((b) => b.id === tournament?.blindStructureId)
      if (!timer || !structure) return
      const next = goToLevel(timer, structure.levels, timer.currentLevelIndex + 1, timer.status === 'running')
      set({
        timerStates: state.timerStates.map((t) => (t.tournamentId === tournamentId ? next : t)),
      })
      pushAudit('timer_level', `다음 레벨: ${next.currentLevelIndex + 1}`)
      persistSoon()
    },

    timerPrev: (tournamentId) => {
      if (!get().canManageTimer()) return
      const state = get()
      const timer = state.timerStates.find((t) => t.tournamentId === tournamentId)
      const tournament = state.tournaments.find((t) => t.id === tournamentId)
      const structure = state.blindStructures.find((b) => b.id === tournament?.blindStructureId)
      if (!timer || !structure) return
      const next = goToLevel(timer, structure.levels, timer.currentLevelIndex - 1, timer.status === 'running')
      set({
        timerStates: state.timerStates.map((t) => (t.tournamentId === tournamentId ? next : t)),
      })
      pushAudit('timer_level', `이전 레벨: ${next.currentLevelIndex + 1}`)
      persistSoon()
    },

    timerGoTo: (tournamentId, index) => {
      if (!get().canManageTimer()) return
      const state = get()
      const timer = state.timerStates.find((t) => t.tournamentId === tournamentId)
      const tournament = state.tournaments.find((t) => t.id === tournamentId)
      const structure = state.blindStructures.find((b) => b.id === tournament?.blindStructureId)
      if (!timer || !structure) return
      const next = goToLevel(timer, structure.levels, index, timer.status === 'running')
      set({
        timerStates: state.timerStates.map((t) => (t.tournamentId === tournamentId ? next : t)),
      })
      pushAudit('timer_level', `레벨 이동: ${index + 1}`)
      persistSoon()
    },

    timerSetRemaining: (tournamentId, ms) => {
      if (!get().canManageTimer()) return
      set({
        timerStates: get().timerStates.map((t) =>
          t.tournamentId === tournamentId ? setRemainingMs(t, ms) : t,
        ),
      })
      persistSoon()
    },

    timerExtend: (tournamentId, minutes) => {
      const timer = get().timerStates.find((t) => t.tournamentId === tournamentId)
      if (!timer) return
      const current =
        timer.status === 'running'
          ? Math.max(0, (timer.levelEndsAt ? new Date(timer.levelEndsAt).getTime() : Date.now()) - Date.now())
          : (timer.pausedRemainingMs ?? 0)
      get().timerSetRemaining(tournamentId, current + minutes * 60 * 1000)
    },

    timerTick: (tournamentId) => {
      const state = get()
      const timer = state.timerStates.find((t) => t.tournamentId === tournamentId)
      const tournament = state.tournaments.find((t) => t.id === tournamentId)
      const structure = state.blindStructures.find((b) => b.id === tournament?.blindStructureId)
      if (!timer || !structure || timer.status !== 'running') return
      const { timer: next, advanced } = advanceLevelIfExpired(timer, structure.levels)
      if (advanced || next !== timer) {
        set({
          timerStates: state.timerStates.map((t) => (t.tournamentId === tournamentId ? next : t)),
          flash: advanced,
        })
        if (advanced) persistSoon()
      }
    },

    timerToggleMute: (tournamentId) => {
      set({
        timerStates: get().timerStates.map((t) =>
          t.tournamentId === tournamentId ? { ...t, muted: !t.muted, updatedAt: stamp() } : t,
        ),
      })
      persistSoon()
    },

    setPrizeStructure: (tournamentId, mode, payouts, operatingFee = 0, extraPrize = 0, templateName) => {
      const state = get()
      const tournament = state.tournaments.find((t) => t.id === tournamentId)
      if (!tournament) return { ok: false, message: '토너먼트 없음' }
      const entries = state.entries.filter(
        (e) => e.tournamentId === tournamentId && e.status !== 'cancelled',
      )
      const rebuyRevenue = state.rebuys
        .filter((r) => r.tournamentId === tournamentId)
        .reduce((s, r) => s + r.cost, 0)
      const reentryRevenue = state.reentries
        .filter((r) => r.tournamentId === tournamentId)
        .reduce((s, r) => s + r.cost, 0)
      const addonRevenue = state.addons
        .filter((r) => r.tournamentId === tournamentId)
        .reduce((s, r) => s + r.cost, 0)
      const { netPrizePool } = calculatePrizePool({
        entriesCount: entries.length,
        buyIn: tournament.buyIn,
        fee: tournament.fee,
        rebuyRevenue,
        reentryRevenue,
        addonRevenue,
        guaranteedPrize: tournament.guaranteedPrize,
        operatingFee,
        extraPrize,
      })
      const validation = validatePayouts(netPrizePool, payouts)
      if (!validation.ok) return { ok: false, message: validation.message }
      const existing = state.prizeStructures.find((p) => p.tournamentId === tournamentId)
      const next: PrizeStructure = {
        id: existing?.id ?? createId('prize'),
        tournamentId,
        mode,
        templateName,
        operatingFee,
        extraPrize,
        payouts,
        createdAt: existing?.createdAt ?? stamp(),
        updatedAt: stamp(),
      }
      set({
        prizeStructures: existing
          ? state.prizeStructures.map((p) => (p.tournamentId === tournamentId ? next : p))
          : [next, ...state.prizeStructures],
      })
      pushAudit('prize_change', '상금 구조 변경')
      persistSoon()
      return { ok: true }
    },

    applyPrizeTemplate: (tournamentId, key) => {
      const state = get()
      const tournament = state.tournaments.find((t) => t.id === tournamentId)
      if (!tournament) return { ok: false, message: '토너먼트 없음' }
      const entries = state.entries.filter(
        (e) => e.tournamentId === tournamentId && e.status !== 'cancelled',
      )
      const rebuyRevenue = entries.reduce((s, e) => s + e.rebuyCount * tournament.rebuy.cost, 0)
      const reentryRevenue = entries.reduce((s, e) => s + e.reentryCount * tournament.reentry.cost, 0)
      const addonRevenue = entries.reduce((s, e) => s + e.addonCount * tournament.addon.cost, 0)
      const { netPrizePool } = calculatePrizePool({
        entriesCount: entries.length,
        buyIn: tournament.buyIn,
        fee: tournament.fee,
        rebuyRevenue,
        reentryRevenue,
        addonRevenue,
        guaranteedPrize: tournament.guaranteedPrize,
        operatingFee: 0,
        extraPrize: 0,
      })
      const tpl = buildPrizeTemplate(key, entries.length)
      const payouts = percentsToPayouts(netPrizePool, tpl.percents)
      return get().setPrizeStructure(tournamentId, 'percent', payouts, 0, 0, key)
    },

    addAnnouncement: (tournamentId, type, title, body) => {
      const venueId =
        get().tournaments.find((t) => t.id === tournamentId)?.venueId ??
        get().session?.currentVenueId ??
        ''
      const ann: Announcement = {
        id: createId('ann'),
        tournamentId,
        venueId,
        type,
        title,
        body,
        active: true,
        createdAt: stamp(),
        updatedAt: stamp(),
      }
      set({ announcements: [ann, ...get().announcements] })
      pushAudit('announcement', `공지: ${title}`)
      persistSoon()
    },

    createStaffRequest: (tournamentId, type, message, tableId) => {
      const req: StaffRequest = {
        id: createId('req'),
        tournamentId,
        tableId,
        type,
        message,
        status: 'open',
        createdAt: stamp(),
        updatedAt: stamp(),
      }
      set({ staffRequests: [req, ...get().staffRequests] })
      persistSoon()
    },

    resolveStaffRequest: (id) => {
      set({
        staffRequests: get().staffRequests.map((r) =>
          r.id === id
            ? {
                ...r,
                status: 'resolved',
                resolvedAt: stamp(),
                assigneeId: get().session?.userId,
                updatedAt: stamp(),
              }
            : r,
        ),
      })
      persistSoon()
    },

    undoLast: () => {
      const log = get().auditLogs.find((l) => l.canUndo && !l.undone)
      if (!log || !log.undoPayload) return
      // Best-effort undo for key actions
      if (log.action === 'eliminate' && log.undoPayload && typeof log.undoPayload === 'object') {
        const payload = log.undoPayload as { entry?: TournamentEntry }
        if (payload.entry) get().undoElimination(payload.entry.id)
      } else if (log.action === 'player_register' && log.payload && typeof log.payload === 'object') {
        const payload = log.payload as { entry?: TournamentEntry }
        if (payload.entry) get().deleteEntry(payload.entry.id)
      }
      set({
        auditLogs: get().auditLogs.map((l) =>
          l.id === log.id ? { ...l, undone: true, updatedAt: stamp() } : l,
        ),
      })
      persistSoon()
    },

    getPlayerName: (playerId) => get().players.find((p) => p.id === playerId)?.name ?? 'Unknown',

    getEntryName: (entryId) => {
      const entry = get().entries.find((e) => e.id === entryId)
      if (!entry) return 'Unknown'
      return get().getPlayerName(entry.playerId)
    },

    nameMapForTournament: (tournamentId) => {
      const map: Record<string, string> = {}
      for (const e of get().entries.filter((x) => x.tournamentId === tournamentId)) {
        map[e.id] = get().getPlayerName(e.playerId)
      }
      return map
    },

    statsForVenue: (venueId) => {
      const tournaments = get().tournaments.filter((t) => t.venueId === venueId && !t.deletedAt)
      const entries = get().entries.filter((e) =>
        tournaments.some((t) => t.id === e.tournamentId) && e.status !== 'cancelled',
      )
      const avgPlayers =
        tournaments.length === 0
          ? 0
          : Math.round(
              tournaments.reduce(
                (s, t) => s + entries.filter((e) => e.tournamentId === t.id).length,
                0,
              ) / tournaments.length,
            )
      const totalBuyIns = entries.reduce((s, e) => s + e.buyInAmount, 0)
      const totalPrize = tournaments.reduce((s, t) => {
        const ps = get().prizeStructures.find((p) => p.tournamentId === t.id)
        return s + (ps?.payouts.reduce((a, p) => a + p.amount, 0) ?? 0)
      }, 0)
      return {
        tournamentCount: tournaments.length,
        avgPlayers,
        totalEntries: entries.length,
        totalBuyIns,
        totalPrize,
      }
    },

    updateSettings: (patch) => {
      const venueId = get().session?.currentVenueId
      set({
        settings: get().settings.map((s) =>
          s.venueId === venueId || !venueId ? { ...s, ...patch, updatedAt: stamp() } : s,
        ),
      })
      persistSoon()
    },

    setDisplayTheme: (theme) => get().updateSettings({ displayTheme: theme }),

    backupJson: () => {
      const s = get()
      return JSON.stringify(
        {
          version: s.version,
          users: s.users,
          venues: s.venues,
          venueMembers: s.venueMembers,
          tournaments: s.tournaments,
          blindStructures: s.blindStructures,
          players: s.players,
          entries: s.entries,
          tables: s.tables,
          seats: s.seats,
          movements: s.movements,
          eliminations: s.eliminations,
          rebuys: s.rebuys,
          reentries: s.reentries,
          addons: s.addons,
          bounties: s.bounties,
          prizeStructures: s.prizeStructures,
          payouts: s.payouts,
          announcements: s.announcements,
          staffRequests: s.staffRequests,
          timerStates: s.timerStates,
          auditLogs: s.auditLogs,
          settings: s.settings,
          session: null,
        },
        null,
        2,
      )
    },

    restoreJson: (text) => {
      const parsed = JSON.parse(text) as AppDataSnapshot
      set({ ...fromSnapshot(parsed), session: get().session })
      persistSoon()
    },

    resetDemo: async () => {
      const demo = await resetToDemo()
      set({
        ...fromSnapshot(demo),
        ...emptyUi(),
        hydrated: true,
        selectedTournamentId: demo.tournaments.find((t) => t.status === 'running')?.id ?? null,
        session: get().session,
      })
    },

    syncCloud: async (choice) => {
      const s = get()
      const snapshot: AppDataSnapshot = {
        version: s.version,
        users: s.users,
        venues: s.venues,
        venueMembers: s.venueMembers,
        tournaments: s.tournaments,
        blindStructures: s.blindStructures,
        players: s.players,
        entries: s.entries,
        tables: s.tables,
        seats: s.seats,
        movements: s.movements,
        eliminations: s.eliminations,
        rebuys: s.rebuys,
        reentries: s.reentries,
        addons: s.addons,
        bounties: s.bounties,
        prizeStructures: s.prizeStructures,
        payouts: s.payouts,
        announcements: s.announcements,
        staffRequests: s.staffRequests,
        timerStates: s.timerStates,
        auditLogs: s.auditLogs,
        settings: s.settings,
        session: s.session,
      }
      const { result, snapshot: remote } = await syncWithCloud(snapshot, choice)
      if (result.status === 'conflict') {
        set({ syncConflict: result.conflict })
        return
      }
      if (remote) {
        set({ ...fromSnapshot(remote), syncConflict: null, session: s.session })
        persistSoon()
      } else {
        set({ syncConflict: null })
      }
    },

    canManageTimer: () => {
      const role = get().session?.role
      return role === 'admin' || role === 'director'
    },

    canSeePhone: () => get().session?.role === 'admin',

    drawFinalTable: (tournamentId) => {
      const state = get()
      const tournament = state.tournaments.find((t) => t.id === tournamentId)
      if (!tournament) return null
      const remaining = state.entries.filter(
        (e) => e.tournamentId === tournamentId && e.status === 'seated',
      )
      if (remaining.length > tournament.finalTableSize) return null
      let ft = state.tables.find((t) => t.tournamentId === tournamentId && t.number === 1)
      if (!ft) return null
      // Ensure final table capacity
      if (ft.maxSeats < remaining.length) {
        ft = { ...ft, maxSeats: remaining.length }
        set({
          tables: state.tables.map((t) => (t.id === ft!.id ? ft! : t)),
        })
      }
      const names = state.nameMapForTournament(tournamentId)
      const preview = previewSeatAssignment(remaining, [ft], names)
      set({ seatPreview: preview })
      get().updateTournament(tournamentId, { status: 'final_table' })
      get().addAnnouncement(
        tournamentId,
        'final_table',
        '파이널 테이블',
        '파이널 테이블 좌석이 추첨되었습니다.',
      )
      return preview[0] ?? null
    },

    finalizeWinner: (tournamentId, entryId) => {
      const remaining = get().entries.filter(
        (e) => e.tournamentId === tournamentId && e.status === 'seated',
      )
      for (const e of remaining) {
        if (e.id !== entryId) get().eliminatePlayer({ entryId: e.id })
      }
      get().updateEntry(entryId, { eliminationRank: 1, status: 'seated' })
      get().endTournament(tournamentId)
      get().addAnnouncement(
        tournamentId,
        'prize',
        '우승자 확정',
        `${get().getEntryName(entryId)}님이 우승했습니다.`,
      )
    },
  }
})

export function roleLabel(role: UserRole): string {
  switch (role) {
    case 'admin':
      return '최고 관리자'
    case 'director':
      return '토너먼트 디렉터'
    case 'staff':
      return '딜러/스태프'
    case 'player':
      return '플레이어'
  }
}
