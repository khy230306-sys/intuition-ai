import { useEffect, useState } from 'react'
import { CharImg } from './GameArt'
import { speak } from '../lib/speech'
import { sfx } from '../lib/sfx'

type Sticker = { id: string; src: string; ko: string }

export function StickerToast() {
  const [sticker, setSticker] = useState<Sticker | null>(null)

  useEffect(() => {
    const onUnlock = (e: Event) => {
      const detail = (e as CustomEvent<Sticker>).detail
      if (!detail) return
      setSticker(detail)
      sfx.cheer()
      speak(`${detail.ko} 스티커!`)
      window.setTimeout(() => setSticker(null), 2200)
    }
    window.addEventListener('ssuk-sticker', onUnlock)
    return () => window.removeEventListener('ssuk-sticker', onUnlock)
  }, [])

  if (!sticker) return null

  return (
    <div className="sticker-toast" role="status">
      <CharImg src={sticker.src} size={72} />
      <div>
        <strong>스티커!</strong>
        <div>{sticker.ko}</div>
      </div>
    </div>
  )
}
