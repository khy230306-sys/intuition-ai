/** Client-side image optimize for Vision (no permanent server store). */

import { FeatureDiagCodes, recordFeatureDiagError } from '../featureDiag/errorCodes'

export const VISION_MAX_EDGE = 1280
export const VISION_MAX_BYTES = 900_000

export type OptimizedImage = {
  dataUrl: string
  mimeType: string
  width: number
  height: number
  bytes: number
}

export class VisionUploadError extends Error {
  code: string
  constructor(message: string, code = FeatureDiagCodes.VISION_UPLOAD) {
    super(message)
    this.code = code
    this.name = 'VisionUploadError'
  }
}

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new VisionUploadError('파일을 읽지 못했습니다.'))
    reader.readAsDataURL(file)
  })
}

export function isSupportedImageFile(file: File): boolean {
  const mime = file.type || ''
  if (/^image\/(jpeg|jpg|png|webp|gif)$/i.test(mime)) return true
  if (/^image\/heic$/i.test(mime) || /\.(heic|heif)$/i.test(file.name)) return true
  if (!mime && /\.(jpe?g|png|webp|gif)$/i.test(file.name)) return true
  return false
}

export function isHeicLike(file: File): boolean {
  return /^image\/heic$/i.test(file.type || '') || /\.(heic|heif)$/i.test(file.name || '')
}

async function drawToCanvas(source: CanvasImageSource, width: number, height: number): Promise<OptimizedImage> {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new VisionUploadError('이미지 처리를 사용할 수 없습니다.')
  ctx.drawImage(source as CanvasImageSource, 0, 0, width, height)
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

export async function optimizeImageFile(file: File): Promise<OptimizedImage> {
  if (!file) throw new VisionUploadError('선택된 사진이 없습니다.')
  if (!isSupportedImageFile(file)) {
    throw new VisionUploadError('지원하지 않는 이미지 형식입니다. JPEG/PNG/WebP를 사용해 주세요.')
  }
  if (file.size > 12 * 1024 * 1024) {
    throw new VisionUploadError('이미지가 너무 큽니다. 12MB 이하로 선택해 주세요.')
  }

  // Prefer createImageBitmap — respects EXIF orientation on supporting browsers
  try {
    if (typeof createImageBitmap === 'function') {
      const bmp = await createImageBitmap(file)
      try {
        const scale = Math.min(1, VISION_MAX_EDGE / Math.max(bmp.width, bmp.height, 1))
        const w = Math.max(1, Math.round(bmp.width * scale))
        const h = Math.max(1, Math.round(bmp.height * scale))
        return await drawToCanvas(bmp, w, h)
      } finally {
        bmp.close?.()
      }
    }
  } catch (e) {
    if (isHeicLike(file)) {
      recordFeatureDiagError(FeatureDiagCodes.VISION_UPLOAD, 'heic_decode_failed')
      throw new VisionUploadError(
        '이 기기에서 HEIC를 열지 못했어요. 사진앱에서 JPEG/PNG로 변환하거나 「가장 호환성 높은」 형식으로 다시 선택해 주세요.',
      )
    }
    // fall through to Image()
    void e
  }

  try {
    const rawUrl = await readFile(file)
    return await optimizeDataUrl(rawUrl)
  } catch (e) {
    if (isHeicLike(file)) {
      recordFeatureDiagError(FeatureDiagCodes.VISION_UPLOAD, 'heic_fallback_failed')
      throw new VisionUploadError(
        'HEIC 사진을 열지 못했어요. JPEG 또는 PNG로 다시 선택해 주세요. (Vision 화면은 계속 사용할 수 있습니다.)',
      )
    }
    recordFeatureDiagError(
      FeatureDiagCodes.VISION_UPLOAD,
      e instanceof Error ? e.message : 'upload_fail',
    )
    throw e instanceof VisionUploadError
      ? e
      : new VisionUploadError(e instanceof Error ? e.message : '이미지를 불러오지 못했어요.')
  }
}

export async function optimizeDataUrl(dataUrl: string): Promise<OptimizedImage> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image()
    el.onload = () => resolve(el)
    el.onerror = () =>
      reject(
        new VisionUploadError(
          '이미지를 열지 못했습니다. HEIC는 JPEG로 변환 후 다시 시도해 주세요.',
        ),
      )
    el.src = dataUrl
  })
  const scale = Math.min(1, VISION_MAX_EDGE / Math.max(img.width, img.height, 1))
  const width = Math.max(1, Math.round(img.width * scale))
  const height = Math.max(1, Math.round(img.height * scale))
  return drawToCanvas(img, width, height)
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
