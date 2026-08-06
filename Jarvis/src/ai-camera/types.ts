export type VisionMode =
  | 'auto'
  | 'ocr'
  | 'translate'
  | 'product'
  | 'food'
  | 'nature'
  | 'document'
  | 'medicine'
  | 'free'

export type VisionAnalyzeInput = {
  imageDataUrl: string
  mimeType: string
  mode: VisionMode
  question?: string
  targetLang?: string
  signal?: AbortSignal
}

export type VisionAnalyzeResult = {
  ok: boolean
  mode: VisionMode
  provider: string
  model?: string
  summary: string
  subjects: string[]
  confidence: number
  detail: string
  warnings: string[]
  followUps: string[]
  /** Mode-specific payload */
  ocrText?: string
  translation?: { sourceLang?: string; sourceText: string; translatedText: string }
  product?: { name?: string; brand?: string; model?: string; features: string[]; keywords: string[] }
  food?: {
    name?: string
    ingredients: string[]
    allergens: string[]
    nutritionNote: string
  }
  nature?: { candidates: string[]; traits: string[]; lookalikes: string[]; riskNote?: string }
  document?: {
    docType?: string
    keyPoints: string[]
    fields: Array<{ label: string; value: string }>
    suggestedTasks: string[]
    masked?: boolean
  }
  medicine?: {
    labelName?: string
    labelLines: string[]
    disclaimer: string
  }
  sensitive: boolean
  errorCode?: string
  rawText?: string
}

export type VisionHistoryItem = {
  id: string
  savedAt: number
  mode: VisionMode
  summary: string
  /** Thumbnail only — never log full image */
  thumbDataUrl?: string
  result: VisionAnalyzeResult
}

export interface VisionProvider {
  id: string
  label: string
  isAvailable(): boolean
  analyzeImage(input: VisionAnalyzeInput): Promise<VisionAnalyzeResult>
}
