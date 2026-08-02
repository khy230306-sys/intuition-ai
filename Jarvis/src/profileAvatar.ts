/** Square profile avatar compression for settings + space sync. */

export const MAX_AVATAR_BYTES = 90_000
export const AVATAR_EDGE = 192

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('파일을 읽지 못했습니다.'))
    reader.readAsDataURL(file)
  })
}

/** Center-crop to square JPEG data URL suitable for chat avatars. */
export async function fileToProfileAvatar(file: File): Promise<string> {
  const mime = file.type || ''
  if (!/^image\/(jpeg|jpg|png|webp|gif)$/i.test(mime) && !/\.(jpe?g|png|webp|gif)$/i.test(file.name)) {
    throw new Error('프로필은 사진(JPEG/PNG/WebP)만 선택할 수 있습니다.')
  }
  const rawUrl = await readFileAsDataUrl(file)
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image()
    el.onload = () => resolve(el)
    el.onerror = () => reject(new Error('이미지를 열지 못했습니다.'))
    el.src = rawUrl
  })
  const side = Math.min(img.width, img.height)
  const sx = Math.floor((img.width - side) / 2)
  const sy = Math.floor((img.height - side) / 2)
  const canvas = document.createElement('canvas')
  canvas.width = AVATAR_EDGE
  canvas.height = AVATAR_EDGE
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('프로필 이미지를 처리할 수 없습니다.')
  ctx.drawImage(img, sx, sy, side, side, 0, 0, AVATAR_EDGE, AVATAR_EDGE)

  let quality = 0.82
  let dataUrl = canvas.toDataURL('image/jpeg', quality)
  while (dataUrl.length > MAX_AVATAR_BYTES * 1.37 && quality > 0.4) {
    quality -= 0.08
    dataUrl = canvas.toDataURL('image/jpeg', quality)
  }
  if (dataUrl.length > MAX_AVATAR_BYTES * 1.45) {
    throw new Error('프로필 사진이 너무 큽니다. 다른 사진을 선택해 주세요.')
  }
  return dataUrl
}

export function isAvatarDataUrl(value: string | undefined | null): value is string {
  return Boolean(value && /^data:image\//i.test(value) && value.length < MAX_AVATAR_BYTES * 2)
}
