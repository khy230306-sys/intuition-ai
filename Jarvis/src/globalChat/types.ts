export type TranslationStatus = 'pending' | 'completed' | 'failed' | 'unavailable' | 'offline' | 'skipped'

export type MessageTranslation = {
  messageId: string
  targetLanguage: string
  translatedText: string
  provider: string
  model?: string
  status: TranslationStatus
  sourceLanguage?: string
  createdAt: number
  updatedAt: number
  qualityFlags?: string[]
}

export type TranslateMessageInput = {
  messageId: string
  originalText: string
  sourceLanguage?: string
  targetLanguage: string
  force?: boolean
  signal?: AbortSignal
}

export type TranslateMessageResult = {
  translatedText: string
  detectedSourceLanguage: string
  provider: string
  model?: string
  latencyMs: number
  cached: boolean
  status: TranslationStatus
  warnings: string[]
}
