import { useEffect, useRef } from 'react'

type ParallaxOptions = {
  enabled: boolean
  intensity?: number
}

export function useParallax<T extends HTMLElement>({
  enabled,
  intensity = 8,
}: ParallaxOptions) {
  const ref = useRef<T | null>(null)

  useEffect(() => {
    const node = ref.current
    if (!node || !enabled) {
      if (node) {
        node.style.transform = 'translate3d(0,0,0)'
      }
      return
    }

    let frame = 0

    const apply = (x: number, y: number) => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        node.style.transform = `translate3d(${x}px, ${y}px, 0)`
      })
    }

    const onPointerMove = (event: PointerEvent) => {
      const { innerWidth, innerHeight } = window
      const nx = (event.clientX / innerWidth - 0.5) * intensity
      const ny = (event.clientY / innerHeight - 0.5) * intensity
      apply(nx, ny)
    }

    const onDeviceOrientation = (event: DeviceOrientationEvent) => {
      const nx = ((event.gamma ?? 0) / 45) * intensity * 0.6
      const ny = ((event.beta ?? 0) / 45) * intensity * 0.35
      apply(nx, ny)
    }

    window.addEventListener('pointermove', onPointerMove, { passive: true })
    window.addEventListener('deviceorientation', onDeviceOrientation)

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('deviceorientation', onDeviceOrientation)
      node.style.transform = 'translate3d(0,0,0)'
    }
  }, [enabled, intensity])

  return ref
}
