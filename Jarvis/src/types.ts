export type Role = 'user' | 'assistant' | 'system'

export interface ChatMessage {
  id: string
  role: Role
  text: string
  createdAt: number
  actionHint?: string
}

export interface MemoryItem {
  id: string
  key: string
  value: string
  updatedAt: number
}

export interface ReminderItem {
  id: string
  text: string
  when?: string
  /** Absolute fire time (ms) for local alarms */
  whenAt?: number
  done: boolean
  createdAt: number
}

export interface ShoppingItem {
  id: string
  name: string
  done: boolean
  createdAt: number
}

export interface ExpenseItem {
  id: string
  amount: number
  category: string
  note: string
  createdAt: number
}

export interface HabitItem {
  id: string
  name: string
  streak: number
  lastDone?: string
  createdAt: number
}

export interface JournalEntry {
  id: string
  text: string
  mood?: string
  createdAt: number
}

export interface UserProfile {
  city: string
  wakeHour: number
  focus: string
  diet: string
  notes: string
  riskTolerance: 'conservative' | 'balanced' | 'aggressive'
  investHorizon: string
}

export interface WatchItem {
  id: string
  symbol: string
  name: string
  targetPrice?: number
  note?: string
  createdAt: number
}

export interface Holding {
  id: string
  symbol: string
  name: string
  shares: number
  avgPrice: number
  currency: 'KRW' | 'USD'
  note?: string
  updatedAt: number
}

export interface TradeNote {
  id: string
  symbol: string
  side: 'buy' | 'sell' | 'watch' | 'idea'
  thesis: string
  createdAt: number
}

export interface DataSeries {
  id: string
  name: string
  values: number[]
  updatedAt: number
}

export interface QuoteSnapshot {
  symbol: string
  name: string
  price: number
  currency: string
  changePct: number | null
  dayHigh: number | null
  dayLow: number | null
  fiftyTwoHigh: number | null
  fiftyTwoLow: number | null
  volume: number | null
  marketState?: string
  fetchedAt: number
  /** How the quote was obtained — shown so users know if data may be stale. */
  source?: 'live' | 'proxy' | 'snapshot'
}

export interface JarvisSettings {
  displayName: string
  speakReplies: boolean
  apiKey: string
  apiBase: string
  model: string
  city: string
  /** OS alert when family chat arrives (default on). */
  notifyFamilyChat?: boolean
  /** OS alert when friends chat arrives (default on). */
  notifyFriendsChat?: boolean
  /** Also banner while the matching tab is open/focused (default off). */
  notifyWhileOpen?: boolean
}

export interface ActionResult {
  ok: boolean
  message: string
  opened?: string
}

export type View = 'chat' | 'invest' | 'life' | 'family' | 'friends' | 'games' | 'actions' | 'settings'

export interface BrainReply {
  text: string
  speak?: boolean
  speakLang?: string
  listenLang?: string
  view?: View
  arcadeId?: 'breakout' | 'shooter' | 'flappy' | 'dodge' | 'pong'
  /** Wipe main chat history after this reply is applied. */
  clearChat?: boolean
  action?: () => Promise<ActionResult | void> | ActionResult | void
}
