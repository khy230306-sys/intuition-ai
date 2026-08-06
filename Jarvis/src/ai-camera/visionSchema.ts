import { z } from 'zod'
import type { VisionAnalyzeResult, VisionMode } from './types'

export const VisionAnalyzeResultSchema = z.object({
  ok: z.boolean().default(true),
  mode: z.enum([
    'auto',
    'ocr',
    'translate',
    'product',
    'food',
    'nature',
    'document',
    'medicine',
    'free',
  ]),
  provider: z.string().default('unknown'),
  model: z.string().optional(),
  summary: z.string().default(''),
  subjects: z.array(z.string()).default([]),
  confidence: z.number().min(0).max(1).default(0.5),
  detail: z.string().default(''),
  warnings: z.array(z.string()).default([]),
  followUps: z.array(z.string()).default([]),
  ocrText: z.string().optional(),
  translation: z
    .object({
      sourceLang: z.string().optional(),
      sourceText: z.string(),
      translatedText: z.string(),
    })
    .optional(),
  product: z
    .object({
      name: z.string().optional(),
      brand: z.string().optional(),
      model: z.string().optional(),
      features: z.array(z.string()).default([]),
      keywords: z.array(z.string()).default([]),
    })
    .optional(),
  food: z
    .object({
      name: z.string().optional(),
      ingredients: z.array(z.string()).default([]),
      allergens: z.array(z.string()).default([]),
      nutritionNote: z.string().default('영양 정보는 추정치이며 의료·영양 상담이 아닙니다.'),
    })
    .optional(),
  nature: z
    .object({
      candidates: z.array(z.string()).default([]),
      traits: z.array(z.string()).default([]),
      lookalikes: z.array(z.string()).default([]),
      riskNote: z.string().optional(),
    })
    .optional(),
  document: z
    .object({
      docType: z.string().optional(),
      keyPoints: z.array(z.string()).default([]),
      fields: z.array(z.object({ label: z.string(), value: z.string() })).default([]),
      suggestedTasks: z.array(z.string()).default([]),
      masked: z.boolean().optional(),
    })
    .optional(),
  medicine: z
    .object({
      labelName: z.string().optional(),
      labelLines: z.array(z.string()).default([]),
      disclaimer: z
        .string()
        .default('약은 사진만으로 확정하지 마세요. 약사 또는 의료진에게 확인하세요.'),
    })
    .optional(),
  sensitive: z.boolean().default(false),
  errorCode: z.string().optional(),
  rawText: z.string().optional(),
})

function extractJson(raw: string): string | null {
  const text = String(raw || '').trim()
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const body = (fenced?.[1] || text).trim()
  const start = body.indexOf('{')
  const end = body.lastIndexOf('}')
  if (start < 0 || end <= start) return null
  return body.slice(start, end + 1)
}

function heal(raw: string): string {
  return raw
    .replace(/,\s*([}\]])/g, '$1')
    .replace(/'/g, '"')
    .replace(/\bTrue\b/g, 'true')
    .replace(/\bFalse\b/g, 'false')
}

export function parseVisionResultJson(
  raw: string,
  fallbackMode: VisionMode,
  provider: string,
): VisionAnalyzeResult | null {
  const extracted = extractJson(raw)
  if (!extracted) return null
  for (const attempt of [extracted, heal(extracted)]) {
    try {
      const parsed = JSON.parse(attempt)
      const result = VisionAnalyzeResultSchema.safeParse({
        ...parsed,
        mode: parsed.mode || fallbackMode,
        provider: parsed.provider || provider,
      })
      if (result.success) return result.data as VisionAnalyzeResult
    } catch {
      /* continue */
    }
  }
  return null
}

export function fallbackVisionResult(
  mode: VisionMode,
  provider: string,
  message: string,
  errorCode?: string,
): VisionAnalyzeResult {
  return {
    ok: false,
    mode,
    provider,
    summary: message,
    subjects: [],
    confidence: 0,
    detail: message,
    warnings: [message],
    followUps: ['다른 모드로 다시 시도', '더 밝은 사진으로 촬영'],
    sensitive: false,
    errorCode,
  }
}
