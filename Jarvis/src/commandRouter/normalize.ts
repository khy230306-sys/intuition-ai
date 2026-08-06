export function normalizeCommandInput(text: string): string {
  return String(text || '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/알려\s*줘/g, '알려줘')
    .replace(/해\s*줘/g, '해줘')
    .replace(/번역\s*해\s*줘/g, '번역해줘')
    .replace(/통역\s*해\s*줘/g, '통역해줘')
}
