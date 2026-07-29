import type { ChatMessage, JarvisSettings, MemoryItem, ReminderItem } from './types'

const KEYS = {
  chat: 'jarvis_chat_v1',
  memory: 'jarvis_memory_v1',
  reminders: 'jarvis_reminders_v1',
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
  localStorage.setItem(key, JSON.stringify(value))
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

export function addReminder(text: string, when?: string): ReminderItem {
  const item: ReminderItem = {
    id: crypto.randomUUID(),
    text: text.trim(),
    when,
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

export function loadSettings(): JarvisSettings {
  return { ...defaultSettings, ...readJson(KEYS.settings, {}) }
}

export function saveSettings(settings: JarvisSettings): void {
  writeJson(KEYS.settings, settings)
}

export function exportBackup(): string {
  return JSON.stringify(
    {
      version: 1,
      exportedAt: new Date().toISOString(),
      chat: loadChat(),
      memory: loadMemory(),
      reminders: loadReminders(),
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
      settings?: Partial<JarvisSettings>
    }
    if (data.chat) saveChat(data.chat)
    if (data.memory) saveMemory(data.memory)
    if (data.reminders) saveReminders(data.reminders)
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
