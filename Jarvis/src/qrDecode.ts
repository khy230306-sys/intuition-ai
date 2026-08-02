/** Decode QR from image files / video frames — BarcodeDetector with jsQR fallback (iOS Safari). */

import jsQR from 'jsqr'

type Detector = {
  detect: (source: ImageBitmap | HTMLVideoElement | HTMLCanvasElement) => Promise<Array<{ rawValue?: string }>>
}

function getBarcodeDetector(): (new (opts: { formats: string[] }) => Detector) | null {
  return (
    (window as unknown as { BarcodeDetector?: new (opts: { formats: string[] }) => Detector }).BarcodeDetector ||
    null
  )
}

function canvasFromBitmap(bmp: ImageBitmap): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = bmp.width
  canvas.height = bmp.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2d context unavailable')
  ctx.drawImage(bmp, 0, 0)
  return canvas
}

function decodeWithJsQR(canvas: HTMLCanvasElement): string | null {
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const result = jsQR(image.data, image.width, image.height, { inversionAttempts: 'attemptBoth' })
  return result?.data || null
}

export async function decodeQrFromFile(file: File): Promise<string | null> {
  try {
    const bmp = await createImageBitmap(file)
    const BD = getBarcodeDetector()
    if (BD) {
      try {
        const detector = new BD({ formats: ['qr_code'] })
        const codes = await detector.detect(bmp)
        const raw = codes[0]?.rawValue
        if (raw) {
          bmp.close?.()
          return raw
        }
      } catch {
        /* fall through to jsQR */
      }
    }
    const canvas = canvasFromBitmap(bmp)
    bmp.close?.()
    return decodeWithJsQR(canvas)
  } catch {
    return null
  }
}

export async function decodeQrFromVideo(video: HTMLVideoElement): Promise<string | null> {
  const BD = getBarcodeDetector()
  if (BD) {
    try {
      const detector = new BD({ formats: ['qr_code'] })
      const codes = await detector.detect(video)
      const raw = codes[0]?.rawValue
      if (raw) return raw
    } catch {
      /* fall through */
    }
  }
  if (!video.videoWidth || !video.videoHeight) return null
  const canvas = document.createElement('canvas')
  canvas.width = video.videoWidth
  canvas.height = video.videoHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.drawImage(video, 0, 0)
  return decodeWithJsQR(canvas)
}

export function canUseCameraScan(): boolean {
  return Boolean(navigator.mediaDevices?.getUserMedia)
}
