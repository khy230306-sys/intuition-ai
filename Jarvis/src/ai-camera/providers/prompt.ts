import type { VisionAnalyzeInput, VisionMode } from '../types'

export function visionSystemPrompt(mode: VisionMode): string {
  return `You are AIZIO Vision. Analyze the image for mode=${mode}.
Return ONLY JSON matching:
{
  "ok": true,
  "mode": "${mode}",
  "summary": "short Korean summary",
  "subjects": ["..."],
  "confidence": 0.0-1.0,
  "detail": "Korean detail",
  "warnings": [],
  "followUps": ["..."],
  "ocrText": "optional",
  "translation": {"sourceLang":"","sourceText":"","translatedText":""},
  "product": {"name":"","brand":"","model":"","features":[],"keywords":[]},
  "food": {"name":"","ingredients":[],"allergens":[],"nutritionNote":"추정치"},
  "nature": {"candidates":[],"traits":[],"lookalikes":[],"riskNote":""},
  "document": {"docType":"","keyPoints":[],"fields":[{"label":"","value":""}],"suggestedTasks":[]},
  "medicine": {"labelName":"","labelLines":[],"disclaimer":"약사/의료진 확인"},
  "sensitive": false
}
Rules:
- Korean responses for user-facing fields.
- Do not invent prices or sellers.
- Food nutrition is estimate only; not medical advice.
- Medicine: only label text; never prescribe.
- If uncertain, say so. Set sensitive=true for ID/face/address/phone.`
}

export function visionUserText(input: VisionAnalyzeInput): string {
  const parts = [`모드: ${input.mode}`]
  if (input.targetLang) parts.push(`번역 목표 언어: ${input.targetLang}`)
  if (input.question) parts.push(`추가 질문: ${input.question}`)
  parts.push('JSON만 출력하세요.')
  return parts.join('\n')
}
