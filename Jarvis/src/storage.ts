import { loadFamilyRoom, saveFamilyRoom } from './familyStore'
import type { FamilyRoom } from './familyTypes'
import { loadFriendsRoom, saveFriendsRoom } from './friendsStore'
import type { FriendsRoom } from './friendsTypes'
import type {
  ChatMessage,
  DataSeries,
  ExpenseItem,
  HabitItem,
  Holding,
  JarvisSettings,
  JournalEntry,
  MemoryItem,
  ReminderItem,
  ShoppingItem,
  TradeNote,
  UserProfile,
  WatchItem,
} from './types'

const KEYS = {
  chat: 'jarvis_chat_v1',
  memory: 'jarvis_memory_v1',
  reminders: 'jarvis_reminders_v1',
  shopping: 'jarvis_shopping_v1',
  expenses: 'jarvis_expenses_v1',
  habits: 'jarvis_habits_v1',
  journal: 'jarvis_journal_v1',
  profile: 'jarvis_profile_v1',
  watchlist: 'jarvis_watchlist_v1',
  holdings: 'jarvis_holdings_v1',
  trades: 'jarvis_trades_v1',
  series: 'jarvis_series_v1',
  activeSeries: 'jarvis_active_series_v1',
  settings: 'jarvis_settings_v1',
  installDismiss: 'jarvis_install_dismissed',
} as const

export const INSTALL_DISMISS_KEY = KEYS.installDismiss

const defaultSettings: JarvisSettings = {
  displayName: '주인님',
  speakReplies: true,
  apiKey: '',
  apiBase: 'https://api.openai.com/v1',
  model: 'gpt-4o-mini',
  city: '서울',
  notifyFamilyChat: true,
  notifyFriendsChat: true,
  notifyWhileOpen: false,
  appLocale: undefined,
  translationLocale: 'ko',
  autoTranslateMessages: true,
  showOriginalText: false,
  detectMessageLanguage: true,
}

const defaultProfile: UserProfile = {
  city: '서울',
  wakeHour: 7,
  focus: '일과 건강의 균형',
  diet: '특별히 없음',
  notes: '',
  riskTolerance: 'balanced',
  investHorizon: '5년+',
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (err) {
    // QuotaExceeded or private-mode write failures must not crash UI mid-action
    console.warn('[jarvis] localStorage write failed', key, err)
  }
}

function dayKey(d = new Date()): string {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

export function loadChat(): ChatMessage[] {
  return readJson(KEYS.chat, [])
}

export function saveChat(messages: ChatMessage[]): void {
  writeJson(KEYS.chat, messages.slice(-200))
}

export function clearChat(): void {
  localStorage.removeItem(KEYS.chat)
}

export function loadMemory(): MemoryItem[] {
  return readJson(KEYS.memory, [])
}

export function saveMemory(items: MemoryItem[]): void {
  writeJson(KEYS.memory, items)
}

export function upsertMemory(key: string, value: string): MemoryItem {
  const items = loadMemory()
  const normalized = key.trim().toLowerCase()
  const existing = items.find((m) => m.key.toLowerCase() === normalized)
  if (existing) {
    existing.value = value
    existing.key = key.trim()
    existing.updatedAt = Date.now()
    saveMemory(items)
    return existing
  }
  const item: MemoryItem = {
    id: crypto.randomUUID(),
    key: key.trim(),
    value,
    updatedAt: Date.now(),
  }
  items.unshift(item)
  saveMemory(items)
  return item
}

export function findMemory(query: string): MemoryItem[] {
  const q = query.trim().toLowerCase()
  if (!q) return loadMemory()
  return loadMemory().filter(
    (m) => m.key.toLowerCase().includes(q) || m.value.toLowerCase().includes(q),
  )
}

export function deleteMemory(id: string): void {
  saveMemory(loadMemory().filter((m) => m.id !== id))
}

export function loadReminders(): ReminderItem[] {
  return readJson(KEYS.reminders, [])
}

export function saveReminders(items: ReminderItem[]): void {
  writeJson(KEYS.reminders, items)
}

export function addReminder(text: string, when?: string, whenAt?: number): ReminderItem {
  const item: ReminderItem = {
    id: crypto.randomUUID(),
    text: text.trim(),
    when,
    whenAt,
    done: false,
    createdAt: Date.now(),
  }
  const items = loadReminders()
  items.unshift(item)
  saveReminders(items)
  return item
}

export function toggleReminder(id: string): void {
  const items = loadReminders()
  const found = items.find((r) => r.id === id)
  if (found) {
    found.done = !found.done
    saveReminders(items)
  }
}

export function deleteReminder(id: string): void {
  saveReminders(loadReminders().filter((r) => r.id !== id))
}

export function loadShopping(): ShoppingItem[] {
  return readJson(KEYS.shopping, [])
}

export function saveShopping(items: ShoppingItem[]): void {
  writeJson(KEYS.shopping, items)
}

export function addShoppingItems(names: string[]): ShoppingItem[] {
  const items = loadShopping()
  const created: ShoppingItem[] = []
  for (const name of names) {
    const n = name.trim()
    if (!n) continue
    const exists = items.find((i) => !i.done && i.name.toLowerCase() === n.toLowerCase())
    if (exists) continue
    const item: ShoppingItem = {
      id: crypto.randomUUID(),
      name: n,
      done: false,
      createdAt: Date.now(),
    }
    items.unshift(item)
    created.push(item)
  }
  saveShopping(items)
  return created
}

export function toggleShopping(id: string): void {
  const items = loadShopping()
  const found = items.find((i) => i.id === id)
  if (found) {
    found.done = !found.done
    saveShopping(items)
  }
}

export function clearDoneShopping(): number {
  const before = loadShopping()
  const next = before.filter((i) => !i.done)
  const removed = before.length - next.length
  saveShopping(next)
  return removed
}

export function deleteShopping(id: string): void {
  saveShopping(loadShopping().filter((i) => i.id !== id))
}

export function loadExpenses(): ExpenseItem[] {
  return readJson(KEYS.expenses, [])
}

export function saveExpenses(items: ExpenseItem[]): void {
  writeJson(KEYS.expenses, items.slice(0, 500))
}

export function addExpense(amount: number, category: string, note = ''): ExpenseItem {
  const item: ExpenseItem = {
    id: crypto.randomUUID(),
    amount,
    category: category.trim() || '기타',
    note: note.trim(),
    createdAt: Date.now(),
  }
  const items = loadExpenses()
  items.unshift(item)
  saveExpenses(items)
  return item
}

export function deleteExpense(id: string): void {
  saveExpenses(loadExpenses().filter((e) => e.id !== id))
}

export function expenseTotals(): { today: number; month: number; byCategory: Record<string, number> } {
  const items = loadExpenses()
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
  let today = 0
  let month = 0
  const byCategory: Record<string, number> = {}
  for (const e of items) {
    if (e.createdAt >= monthStart) {
      month += e.amount
      byCategory[e.category] = (byCategory[e.category] || 0) + e.amount
    }
    if (e.createdAt >= todayStart) today += e.amount
  }
  return { today, month, byCategory }
}

export function loadHabits(): HabitItem[] {
  return readJson(KEYS.habits, [])
}

export function saveHabits(items: HabitItem[]): void {
  writeJson(KEYS.habits, items)
}

export function addHabit(name: string): HabitItem {
  const items = loadHabits()
  const existing = items.find((h) => h.name.toLowerCase() === name.trim().toLowerCase())
  if (existing) return existing
  const item: HabitItem = {
    id: crypto.randomUUID(),
    name: name.trim(),
    streak: 0,
    createdAt: Date.now(),
  }
  items.unshift(item)
  saveHabits(items)
  return item
}

export function checkHabit(nameOrId: string): HabitItem | null {
  const items = loadHabits()
  const today = dayKey()
  const found = items.find(
    (h) => h.id === nameOrId || h.name.toLowerCase() === nameOrId.trim().toLowerCase(),
  )
  if (!found) return null
  if (found.lastDone === today) return found
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yKey = dayKey(yesterday)
  found.streak = found.lastDone === yKey ? found.streak + 1 : 1
  found.lastDone = today
  saveHabits(items)
  return found
}

export function deleteHabit(id: string): void {
  saveHabits(loadHabits().filter((h) => h.id !== id))
}

export function habitsDueToday(): HabitItem[] {
  const today = dayKey()
  return loadHabits().filter((h) => h.lastDone !== today)
}

export function loadJournal(): JournalEntry[] {
  return readJson(KEYS.journal, [])
}

export function saveJournal(items: JournalEntry[]): void {
  writeJson(KEYS.journal, items.slice(0, 200))
}

export function addJournal(text: string, mood?: string): JournalEntry {
  const item: JournalEntry = {
    id: crypto.randomUUID(),
    text: text.trim(),
    mood,
    createdAt: Date.now(),
  }
  const items = loadJournal()
  items.unshift(item)
  saveJournal(items)
  return item
}

export function loadProfile(): UserProfile {
  return { ...defaultProfile, ...readJson(KEYS.profile, {}) }
}

export function saveProfile(profile: UserProfile): void {
  writeJson(KEYS.profile, profile)
}

export function loadWatchlist(): WatchItem[] {
  return readJson(KEYS.watchlist, [])
}

export function saveWatchlist(items: WatchItem[]): void {
  writeJson(KEYS.watchlist, items)
}

export function addWatch(symbol: string, name: string, targetPrice?: number, note?: string): WatchItem {
  const items = loadWatchlist()
  const existing = items.find((w) => w.symbol.toUpperCase() === symbol.toUpperCase())
  if (existing) {
    if (targetPrice != null) existing.targetPrice = targetPrice
    if (note) existing.note = note
    saveWatchlist(items)
    return existing
  }
  const item: WatchItem = {
    id: crypto.randomUUID(),
    symbol,
    name,
    targetPrice,
    note,
    createdAt: Date.now(),
  }
  items.unshift(item)
  saveWatchlist(items)
  return item
}

export function removeWatch(idOrSymbol: string): boolean {
  const before = loadWatchlist()
  const next = before.filter(
    (w) => w.id !== idOrSymbol && w.symbol.toUpperCase() !== idOrSymbol.toUpperCase(),
  )
  saveWatchlist(next)
  return next.length !== before.length
}

export function loadHoldings(): Holding[] {
  return readJson(KEYS.holdings, [])
}

export function saveHoldings(items: Holding[]): void {
  writeJson(KEYS.holdings, items)
}

export function upsertHolding(input: {
  symbol: string
  name: string
  shares: number
  avgPrice: number
  currency: 'KRW' | 'USD'
  note?: string
}): Holding {
  const items = loadHoldings()
  const existing = items.find((h) => h.symbol.toUpperCase() === input.symbol.toUpperCase())
  if (existing) {
    const totalShares = existing.shares + input.shares
    if (totalShares <= 0) {
      saveHoldings(items.filter((h) => h.id !== existing.id))
      return { ...existing, shares: 0 }
    }
    const totalCost = existing.avgPrice * existing.shares + input.avgPrice * input.shares
    existing.shares = totalShares
    existing.avgPrice = totalCost / totalShares
    existing.name = input.name
    existing.currency = input.currency
    if (input.note) existing.note = input.note
    existing.updatedAt = Date.now()
    saveHoldings(items)
    return existing
  }
  const item: Holding = {
    id: crypto.randomUUID(),
    symbol: input.symbol,
    name: input.name,
    shares: input.shares,
    avgPrice: input.avgPrice,
    currency: input.currency,
    note: input.note,
    updatedAt: Date.now(),
  }
  items.unshift(item)
  saveHoldings(items)
  return item
}

export function setHolding(input: {
  symbol: string
  name: string
  shares: number
  avgPrice: number
  currency: 'KRW' | 'USD'
  note?: string
}): Holding {
  const items = loadHoldings().filter((h) => h.symbol.toUpperCase() !== input.symbol.toUpperCase())
  const item: Holding = {
    id: crypto.randomUUID(),
    ...input,
    updatedAt: Date.now(),
  }
  items.unshift(item)
  saveHoldings(items)
  return item
}

export function removeHolding(idOrSymbol: string): boolean {
  const before = loadHoldings()
  const next = before.filter(
    (h) => h.id !== idOrSymbol && h.symbol.toUpperCase() !== idOrSymbol.toUpperCase(),
  )
  saveHoldings(next)
  return next.length !== before.length
}

export function loadTrades(): TradeNote[] {
  return readJson(KEYS.trades, [])
}

export function saveTrades(items: TradeNote[]): void {
  writeJson(KEYS.trades, items.slice(0, 300))
}

export function addTradeNote(
  symbol: string,
  side: TradeNote['side'],
  thesis: string,
): TradeNote {
  const item: TradeNote = {
    id: crypto.randomUUID(),
    symbol,
    side,
    thesis: thesis.trim(),
    createdAt: Date.now(),
  }
  const items = loadTrades()
  items.unshift(item)
  saveTrades(items)
  return item
}

export function deleteTrade(id: string): void {
  saveTrades(loadTrades().filter((t) => t.id !== id))
}

export function loadSeriesList(): DataSeries[] {
  return readJson(KEYS.series, [])
}

export function saveSeriesList(items: DataSeries[]): void {
  writeJson(KEYS.series, items)
}

export function getActiveSeriesName(): string {
  return localStorage.getItem(KEYS.activeSeries) || '기본'
}

export function setActiveSeriesName(name: string): void {
  localStorage.setItem(KEYS.activeSeries, name.trim() || '기본')
}

export function getSeries(name?: string): DataSeries {
  const n = (name || getActiveSeriesName()).trim() || '기본'
  const list = loadSeriesList()
  const found = list.find((s) => s.name.toLowerCase() === n.toLowerCase())
  if (found) return found
  const created: DataSeries = {
    id: crypto.randomUUID(),
    name: n,
    values: [],
    updatedAt: Date.now(),
  }
  list.unshift(created)
  saveSeriesList(list)
  setActiveSeriesName(n)
  return created
}

export function replaceSeriesValues(name: string, values: number[]): DataSeries {
  const list = loadSeriesList()
  const idx = list.findIndex((s) => s.name.toLowerCase() === name.toLowerCase())
  const item: DataSeries = {
    id: idx >= 0 ? list[idx].id : crypto.randomUUID(),
    name,
    values: values.slice(-5000),
    updatedAt: Date.now(),
  }
  if (idx >= 0) list[idx] = item
  else list.unshift(item)
  saveSeriesList(list)
  setActiveSeriesName(name)
  return item
}

export function appendSeriesValues(name: string, values: number[]): DataSeries {
  const current = getSeries(name)
  return replaceSeriesValues(current.name, [...current.values, ...values])
}

export function clearSeries(name?: string): void {
  const n = name || getActiveSeriesName()
  replaceSeriesValues(n, [])
}

export function deleteSeries(name: string): void {
  saveSeriesList(loadSeriesList().filter((s) => s.name.toLowerCase() !== name.toLowerCase()))
  if (getActiveSeriesName().toLowerCase() === name.toLowerCase()) {
    const rest = loadSeriesList()
    setActiveSeriesName(rest[0]?.name || '기본')
  }
}

export function loadSettings(): JarvisSettings {
  const raw = readJson<Partial<JarvisSettings>>(KEYS.settings, {})
  return {
    ...defaultSettings,
    ...raw,
    notifyFamilyChat: raw.notifyFamilyChat !== false,
    notifyFriendsChat: raw.notifyFriendsChat !== false,
    notifyWhileOpen: raw.notifyWhileOpen === true,
    autoTranslateMessages: raw.autoTranslateMessages !== false,
    showOriginalText: raw.showOriginalText === true,
    detectMessageLanguage: raw.detectMessageLanguage !== false,
    translationLocale: raw.translationLocale || raw.appLocale || 'ko',
  }
}

export function saveSettings(settings: JarvisSettings): void {
  writeJson(KEYS.settings, settings)
}

export function exportBackup(): string {
  return JSON.stringify(
    {
      version: 6,
      exportedAt: new Date().toISOString(),
      chat: loadChat(),
      memory: loadMemory(),
      reminders: loadReminders(),
      shopping: loadShopping(),
      expenses: loadExpenses(),
      habits: loadHabits(),
      journal: loadJournal(),
      profile: loadProfile(),
      watchlist: loadWatchlist(),
      holdings: loadHoldings(),
      trades: loadTrades(),
      series: loadSeriesList(),
      activeSeries: getActiveSeriesName(),
      family: loadFamilyRoom(),
      friends: loadFriendsRoom(),
      settings: { ...loadSettings(), apiKey: '' },
    },
    null,
    2,
  )
}

export function importBackup(json: string): { ok: boolean; message: string } {
  try {
    const data = JSON.parse(json) as {
      chat?: ChatMessage[]
      memory?: MemoryItem[]
      reminders?: ReminderItem[]
      shopping?: ShoppingItem[]
      expenses?: ExpenseItem[]
      habits?: HabitItem[]
      journal?: JournalEntry[]
      profile?: Partial<UserProfile>
      watchlist?: WatchItem[]
      holdings?: Holding[]
      trades?: TradeNote[]
      series?: DataSeries[]
      activeSeries?: string
      family?: FamilyRoom | null
      friends?: FriendsRoom | null
      settings?: Partial<JarvisSettings>
    }
    if (data.chat) saveChat(data.chat)
    if (data.memory) saveMemory(data.memory)
    if (data.reminders) saveReminders(data.reminders)
    if (data.shopping) saveShopping(data.shopping)
    if (data.expenses) saveExpenses(data.expenses)
    if (data.habits) saveHabits(data.habits)
    if (data.journal) saveJournal(data.journal)
    if (data.profile) saveProfile({ ...loadProfile(), ...data.profile })
    if (data.watchlist) saveWatchlist(data.watchlist)
    if (data.holdings) saveHoldings(data.holdings)
    if (data.trades) saveTrades(data.trades)
    if (data.series) saveSeriesList(data.series)
    if (data.activeSeries) setActiveSeriesName(data.activeSeries)
    if (data.family) saveFamilyRoom(data.family)
    if (data.friends) saveFriendsRoom(data.friends)
    if (data.settings) {
      const current = loadSettings()
      saveSettings({
        ...current,
        ...data.settings,
        apiKey: current.apiKey,
      })
    }
    return { ok: true, message: '백업을 가져왔습니다.' }
  } catch {
    return { ok: false, message: '백업 파일이 올바르지 않습니다.' }
  }
}

export function lifeContextBlock(): string {
  const profile = loadProfile()
  const settings = loadSettings()
  const openReminders = loadReminders().filter((r) => !r.done).slice(0, 8)
  const shopping = loadShopping().filter((s) => !s.done).slice(0, 12)
  const habits = habitsDueToday()
  const totals = expenseTotals()
  const memories = loadMemory().slice(0, 8)
  const holdings = loadHoldings().slice(0, 10)
  const watch = loadWatchlist().slice(0, 10)
  const active = getSeries()
  return [
    `사용자 호칭: ${settings.displayName}`,
    `도시: ${settings.city || profile.city}`,
    `목표/포커스: ${profile.focus}`,
    `투자 성향: ${profile.riskTolerance} · horizon: ${profile.investHorizon}`,
    `식습관: ${profile.diet}`,
    profile.notes ? `메모: ${profile.notes}` : '',
    `오늘 지출: ${totals.today.toLocaleString('ko-KR')}원 / 이번달: ${totals.month.toLocaleString('ko-KR')}원`,
    openReminders.length ? `할 일: ${openReminders.map((r) => r.text).join(', ')}` : '할 일: 없음',
    shopping.length ? `장바구니: ${shopping.map((s) => s.name).join(', ')}` : '장바구니: 비어 있음',
    habits.length ? `오늘 습관 미완료: ${habits.map((h) => h.name).join(', ')}` : '습관: 오늘 전부 완료 또는 없음',
    holdings.length
      ? `보유: ${holdings.map((h) => `${h.name} ${h.shares}주@${h.avgPrice}`).join(' | ')}`
      : '보유 종목: 없음',
    watch.length ? `관심: ${watch.map((w) => w.name).join(', ')}` : '관심종목: 없음',
    `통계 데이터셋 "${active.name}" n=${active.values.length}` +
      (active.values.length ? ` 최근값=${active.values.slice(-5).join(',')}` : ''),
    memories.length
      ? `기억: ${memories.map((m) => `${m.key}=${m.value}`).join(' | ')}`
      : '기억: 없음',
  ]
    .filter(Boolean)
    .join('\n')
}
