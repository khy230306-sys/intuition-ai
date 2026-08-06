/** Client-side image optimize for Vision (no permanent server store). */

export const VISION_MAX_EDGE = 1280
export const VISION_MAX_BYTES = 900_000

export type OptimizedImage = {
  dataUrl: string
  mimeType: string
  width: number
  height: number
  bytes: number
}

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('파일을 읽지 못했습니다.'))
    reader.readAsDataURL(file)
  })
}

export function isSupportedImageFile(file: File): boolean {
  const mime = file.type || ''
  if (/^image\/(jpeg|jpg|png|webp|gif)$/i.test(mime)) return true
  // HEIC often has empty/odd mime in Safari — allow by extension, then try decode
  if (/^image\/heic$/i.test(mime) || /\.(heic|heif)$/i.test(file.name)) return true
  if (!mime && /\.(jpe?g|png|webp|gif)$/i.test(file.name)) return true
  return false
}

export async function optimizeImageFile(file: File): Promise<OptimizedImage> {
  if (!isSupportedImageFile(file)) {
    throw new Error('지원하지 않는 이미지 형식입니다. JPEG/PNG/WebP를 사용해 주세요.')
  }
  if (file.size > 12 * 1024 * 1024) {
    throw new Error('이미지가 너무 큽니다. 12MB 이하로 선택해 주세요.')
  }
  const rawUrl = await readFile(file)
  return optimizeDataUrl(rawUrl)
}

export async function optimizeDataUrl(dataUrl: string): Promise<OptimizedImage> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image()
    el.onload = () => resolve(el)
    el.onerror = () =>
      reject(new Error('이미지를 열지 못했습니다. HEIC는 JPEG로 변환 후 다시 시도해 주세요.'))
    el.src = dataUrl
  })
  let { width, height } = img
  const scale = Math.min(1, VISION_MAX_EDGE / Math.max(width, height, 1))
  width = Math.max(1, Math.round(width * scale))
  height = Math.max(1, Math.round(height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('이미지 처리를 사용할 수 없습니다.')
  ctx.drawImage(img, 0, 0, width, height)
  let quality = 0.82
  let out = canvas.toDataURL('image/jpeg', quality)
  while (out.length > VISION_MAX_BYTES * 1.37 && quality > 0.4) {
    quality -= 0.08
    out = canvas.toDataURL('image/jpeg', quality)
  }
  return {
    dataUrl: out,
    mimeType: 'image/jpeg',
    width,
    height,
    bytes: Math.round(out.length * 0.75),
  }
}

export function makeThumb(dataUrl: string, edge = 160): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, edge / Math.max(img.width, img.height, 1))
      const w = Math.max(1, Math.round(img.width * scale))
      const h = Math.max(1, Math.round(img.height * scale))
      const c = document.createElement('canvas')
      c.width = w
      c.height = h
      c.getContext('2d')?.drawImage(img, 0, 0, w, h)
      resolve(c.toDataURL('image/jpeg', 0.7))
    }
    img.onerror = () => resolve('')
    img.src = dataUrl
  })
}
