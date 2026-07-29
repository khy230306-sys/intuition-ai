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
  done: boolean
  createdAt: number
}

export interface JarvisSettings {
  displayName: string
  speakReplies: boolean
  apiKey: string
  apiBase: string
  model: string
}

export interface ActionResult {
  ok: boolean
  message: string
  opened?: string
}

export type View = 'chat' | 'actions' | 'memory' | 'settings'

export interface BrainReply {
  text: string
  speak?: boolean
  action?: () => Promise<ActionResult | void> | ActionResult | void
}
