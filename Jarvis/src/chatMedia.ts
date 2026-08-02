/** Compress / validate photo & video for space chat (family/friends). */

export type ChatMediaKind = 'image' | 'video'

export type ChatMedia = {
  kind: ChatMediaKind
  mime: string
  name?: string
  dataUrl: string
  bytes: number
}

export const MAX_IMAGE_BYTES = 450_000
export const MAX_VIDEO_BYTES = 2_200_000
export const MAX_IMAGE_EDGE = 1280

export function isImageMime(mime: string): boolean {
  return /^image\/(jpeg|jpg|png|webp|gif)$/i.test(mime)
}

export function isVideoMime(mime: string): boolean {
  return /^video\/(mp4|webm|quicktime)$/i.test(mime)
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('파일을 읽지 못했습니다.'))
    reader.readAsDataURL(file)
  })
}

async function compressImage(file: File): Promise<ChatMedia> {
  const rawUrl = await readFileAsDataUrl(file)
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image()
    el.onload = () => resolve(el)
    el.onerror = () => reject(new Error('이미지를 열지 못했습니다.'))
    el.src = rawUrl
  })
  let { width, height } = img
  const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(width, height, 1))
  width = Math.max(1, Math.round(width * scale))
  height = Math.max(1, Math.round(height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('이미지 압축을 사용할 수 없습니다.')
  ctx.drawImage(img, 0, 0, width, height)

  let quality = 0.82
  let dataUrl = canvas.toDataURL('image/jpeg', quality)
  while (dataUrl.length > MAX_IMAGE_BYTES * 1.37 && quality > 0.45) {
    quality -= 0.08
    dataUrl = canvas.toDataURL('image/jpeg', quality)
  }
  if (dataUrl.length > MAX_IMAGE_BYTES * 1.4) {
    throw new Error('사진이 너무 큽니다. 더 작은 사진을 선택해 주세요.')
  }
  return {
    kind: 'image',
    mime: 'image/jpeg',
    name: file.name || 'photo.jpg',
    dataUrl,
    bytes: Math.round(dataUrl.length * 0.75),
  }
}

export async function fileToChatMedia(file: File): Promise<ChatMedia> {
  const mime = file.type || ''
  if (isImageMime(mime) || (!mime && /\.(jpe?g|png|webp|gif)$/i.test(file.name))) {
    return compressImage(file)
  }
  if (isVideoMime(mime) || (!mime && /\.(mp4|webm|mov)$/i.test(file.name))) {
    if (file.size > MAX_VIDEO_BYTES) {
      throw new Error('동영상은 약 2MB 이하만 보낼 수 있습니다.')
    }
    const dataUrl = await readFileAsDataUrl(file)
    if (dataUrl.length > MAX_VIDEO_BYTES * 1.4) {
      throw new Error('동영상이 너무 큽니다.')
    }
    return {
      kind: 'video',
      mime: mime || 'video/mp4',
      name: file.name || 'video.mp4',
      dataUrl,
      bytes: file.size,
    }
  }
  throw new Error('사진(JPEG/PNG/WebP) 또는 짧은 동영상(MP4/WebM)만 가능합니다.')
}

export function mediaCaption(media: ChatMedia, text: string): string {
  const cap = text.trim()
  if (cap) return cap.slice(0, 500)
  return media.kind === 'video' ? '[동영상]' : '[사진]'
}
