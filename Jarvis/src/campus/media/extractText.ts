import type { MaterialKind } from '../types'

/** Extract plain text from supported material types. Runs off main path where possible. */

async function extractPdf(file: File): Promise<string> {
  const pdfjs = await import('pdfjs-dist')
  // Vite-friendly worker
  try {
    const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default
  } catch {
    /* worker optional in some environments */
  }
  const data = new Uint8Array(await file.arrayBuffer())
  const doc = await pdfjs.getDocument({ data }).promise
  const parts: string[] = []
  const maxPages = Math.min(doc.numPages, 80)
  for (let i = 1; i <= maxPages; i++) {
    const page = await doc.getPage(i)
    const content = await page.getTextContent()
    const line = content.items
      .map((it) => ('str' in it ? String((it as { str: string }).str) : ''))
      .join(' ')
    if (line.trim()) parts.push(line)
    // yield to UI thread between pages
    await new Promise((r) => setTimeout(r, 0))
  }
  return parts.join('\n')
}

async function extractDocx(file: File): Promise<string> {
  const mammoth = await import('mammoth')
  const buf = await file.arrayBuffer()
  const result = await mammoth.extractRawText({ arrayBuffer: buf })
  return result.value || ''
}

export async function extractMaterialText(file: File, kind: MaterialKind): Promise<string> {
  if (kind === 'txt' || kind === 'markdown') {
    return await file.text()
  }
  if (kind === 'pdf') return extractPdf(file)
  if (kind === 'docx') return extractDocx(file)
  throw new Error('unsupported')
}
