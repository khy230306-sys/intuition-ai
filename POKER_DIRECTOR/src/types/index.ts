export type UserRole = 'admin' | 'director' | 'staff' | 'player'

export type TournamentStatus =
  | 'draft'
  | 'scheduled'
  | 'registration'
  | 'running'
  | 'break'
  | 'final_table'
  | 'completed'
  | 'cancelled'

export type TournamentFormat =
  | 'freezeout'
  | 'rebuy'
  | 'reentry'
  | 'addon'
  | 'bounty'
  | 'progressive_bounty'
  | 'satellite'
  | 'standard'

export type EntryStatus =
  | 'registered'
  | 'checked_in'
  | 'seated'
  | 'eliminated'
  | 'waiting'
  | 'cancelled'

export type PaymentStatus = 'unpaid' | 'paid' | 'refunded' | 'comped'

export type TableStatus = 'active' | 'inactive' | 'locked' | 'breaking' | 'broken'

export type AnnouncementType =
  | 'general'
  | 'registration_close'
  | 'break'
  | 'seat_move'
  | 'final_table'
  | 'prize'
  | 'urgent'

export type StaffRequestType =
  | 'director'
  | 'floor'
  | 'chips'
  | 'cards'
  | 'seat_check'
  | 'other'

export type StaffRequestStatus = 'open' | 'assigned' | 'resolved' | 'cancelled'

export type TimerStatus = 'idle' | 'running' | 'paused' | 'stopped'

export type PayoutMode = 'fixed' | 'percent' | 'auto' | 'custom'

export type DisplayTheme = 'black_gold' | 'black_red' | 'navy_blue' | 'light'

export type AuditAction =
  | 'player_register'
  | 'player_delete'
  | 'seat_assign'
  | 'seat_move'
  | 'table_merge'
  | 'eliminate'
  | 'eliminate_undo'
  | 'rebuy'
  | 'reentry'
  | 'addon'
  | 'prize_change'
  | 'timer_level'
  | 'tournament_end'
  | 'check_in'
  | 'check_out'
  | 'table_break'
  | 'balance'
  | 'announcement'
  | 'other'

export interface BaseEntity {
  id: string
  createdAt: string
  updatedAt: string
  createdBy?: string
  deletedAt?: string | null
}

export interface User extends BaseEntity {
  username: string
  email?: string
  displayName: string
  role: UserRole
  venueIds: string[]
  passwordHash?: string
}

export interface Venue extends BaseEntity {
  name: string
  logoUrl?: string
  phone?: string
  address?: string
  defaultTableCount: number
  defaultSeatsPerTable: number
  currency: string
  language: string
  isActive: boolean
}

export interface VenueMember extends BaseEntity {
  venueId: string
  userId: string
  role: UserRole
}

export interface BlindLevel {
  id: string
  levelNumber: number
  durationMinutes: number
  smallBlind: number
  bigBlind: number
  bigBlindAnte: number
  ante: number
  isBreak: boolean
  breakMinutes?: number
  isRegistrationClose: boolean
  isRebuyEnd: boolean
  isAddonAvailable: boolean
  isChipRace: boolean
}

export interface BlindStructure extends BaseEntity {
  venueId: string
  name: string
  isTemplate: boolean
  levels: BlindLevel[]
}

export interface RebuyConfig {
  enabled: boolean
  maxCount: number
  endLevel: number
  cost: number
  chips: number
}

export interface ReentryConfig {
  enabled: boolean
  maxCount: number
  endLevel: number
  cost: number
  chips: number
  newSeat: boolean
}

export interface AddonConfig {
  enabled: boolean
  availableLevel: number
  cost: number
  chips: number
  maxCount: number
}

export interface BountyConfig {
  enabled: boolean
  progressive: boolean
  defaultAmount: number
  increaseRule?: string
}

export interface Tournament extends BaseEntity {
  venueId: string
  name: string
  date: string
  startTime: string
  location: string
  maxPlayers: number
  tableCount: number
  seatsPerTable: number
  startingStack: number
  buyIn: number
  fee: number
  guaranteedPrize: number
  lateRegLevel: number
  estimatedEndTime?: string
  description?: string
  format: TournamentFormat
  status: TournamentStatus
  rebuy: RebuyConfig
  reentry: ReentryConfig
  addon: AddonConfig
  bounty: BountyConfig
  blindStructureId: string
  finalTableSize: number
  announcement?: string
}

export interface Player extends BaseEntity {
  venueId: string
  name: string
  nickname?: string
  phone?: string
  memberNumber?: string
  avatarUrl?: string
  notes?: string
}

export interface TournamentEntry extends BaseEntity {
  tournamentId: string
  playerId: string
  entryNumber: number
  accessCode: string
  status: EntryStatus
  paymentStatus: PaymentStatus
  buyInAmount: number
  rebuyCount: number
  reentryCount: number
  addonCount: number
  currentTableId?: string | null
  currentSeat?: number | null
  currentChips: number
  bountyAmount: number
  bountyWon: number
  eliminationRank?: number | null
  registeredAt: string
  checkedInAt?: string | null
  eliminatedAt?: string | null
  notes?: string
  isSeatLocked: boolean
  isVipSeat: boolean
  excludeFromBalance: boolean
  avoidPlayerIds: string[]
  lastMovedAt?: string | null
}

export interface Table extends BaseEntity {
  tournamentId: string
  number: number
  maxSeats: number
  status: TableStatus
  dealerButtonSeat: number
  dealerName?: string
  isBreakCandidate: boolean
}

export interface Seat extends BaseEntity {
  tournamentId: string
  tableId: string
  seatNumber: number
  entryId?: string | null
  isLocked: boolean
}

export interface TableMovement extends BaseEntity {
  tournamentId: string
  entryId: string
  fromTableId?: string | null
  fromSeat?: number | null
  toTableId: string
  toSeat: number
  reason: string
  movedAt: string
}

export interface Elimination extends BaseEntity {
  tournamentId: string
  entryId: string
  eliminatedByEntryId?: string | null
  levelNumber: number
  tableId?: string | null
  rank: number
  eliminatedAt: string
  notes?: string
}

export interface RebuyRecord extends BaseEntity {
  tournamentId: string
  entryId: string
  cost: number
  chips: number
  levelNumber: number
}

export interface ReentryRecord extends BaseEntity {
  tournamentId: string
  entryId: string
  cost: number
  chips: number
  levelNumber: number
}

export interface AddonRecord extends BaseEntity {
  tournamentId: string
  entryId: string
  cost: number
  chips: number
  levelNumber: number
}

export interface BountyRecord extends BaseEntity {
  tournamentId: string
  fromEntryId: string
  toEntryId: string
  amount: number
  levelNumber: number
}

export interface PrizePayout {
  place: number
  amount: number
  percent?: number
}

export interface PrizeStructure extends BaseEntity {
  tournamentId: string
  mode: PayoutMode
  templateName?: string
  operatingFee: number
  extraPrize: number
  payouts: PrizePayout[]
}

export interface Payout extends BaseEntity {
  tournamentId: string
  entryId: string
  place: number
  amount: number
  paid: boolean
}

export interface Announcement extends BaseEntity {
  tournamentId: string
  venueId: string
  type: AnnouncementType
  title: string
  body: string
  active: boolean
}

export interface StaffRequest extends BaseEntity {
  tournamentId: string
  tableId?: string | null
  type: StaffRequestType
  message: string
  status: StaffRequestStatus
  assigneeId?: string | null
  resolvedAt?: string | null
}

export interface TimerState extends BaseEntity {
  tournamentId: string
  status: TimerStatus
  currentLevelIndex: number
  levelStartedAt: string | null
  levelEndsAt: string | null
  pausedRemainingMs: number | null
  muted: boolean
  lastTickAt?: string | null
}

export interface AuditLog extends BaseEntity {
  venueId: string
  tournamentId?: string
  action: AuditAction
  summary: string
  payload?: unknown
  undoPayload?: unknown
  canUndo: boolean
  undone: boolean
}

export interface AppSettings extends BaseEntity {
  venueId?: string
  displayTheme: DisplayTheme
  language: string
  soundEnabled: boolean
  voiceEnabled: boolean
  vibrationEnabled: boolean
  chipColors: ChipColor[]
}

export interface ChipColor {
  name: string
  value: number
  color: string
}

export interface BalanceSuggestion {
  entryId: string
  playerName: string
  fromTableId: string
  fromTableNumber: number
  fromSeat: number
  toTableId: string
  toTableNumber: number
  toSeat: number
  reason: string
}

export interface TableBreakPlan {
  breakTableId: string
  breakTableNumber: number
  moves: BalanceSuggestion[]
  resultingCounts: { tableNumber: number; count: number }[]
}

export interface SeatAssignmentPreview {
  tableId: string
  tableNumber: number
  seats: { seatNumber: number; entryId: string; playerName: string; chips: number }[]
}

export interface AuthSession {
  userId: string
  username: string
  displayName: string
  role: UserRole
  venueIds: string[]
  currentVenueId: string
  mode: 'demo' | 'cloud'
}

export interface AppDataSnapshot {
  version: number
  users: User[]
  venues: Venue[]
  venueMembers: VenueMember[]
  tournaments: Tournament[]
  blindStructures: BlindStructure[]
  players: Player[]
  entries: TournamentEntry[]
  tables: Table[]
  seats: Seat[]
  movements: TableMovement[]
  eliminations: Elimination[]
  rebuys: RebuyRecord[]
  reentries: ReentryRecord[]
  addons: AddonRecord[]
  bounties: BountyRecord[]
  prizeStructures: PrizeStructure[]
  payouts: Payout[]
  announcements: Announcement[]
  staffRequests: StaffRequest[]
  timerStates: TimerState[]
  auditLogs: AuditLog[]
  settings: AppSettings[]
  session: AuthSession | null
}
