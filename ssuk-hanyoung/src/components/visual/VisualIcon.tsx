import { getVisualAsset } from '../../design/visualAssets'
import { SvgShape } from './SvgShapes'

type Props = {
  name: string
  size?: number
  className?: string
  alt?: string
  title?: string
}

/** Registry-backed icon — image WebP or soft SVG illustration (never emoji). */
export function VisualIcon({ name, size, className, alt, title }: Props) {
  const asset = getVisualAsset(name)
  const px = size ?? asset.recommendedSize
  const label = alt ?? asset.alt ?? asset.label

  if (asset.type === 'image') {
    return (
      <span
        className={`visual-icon visual-img${asset.animated ? ' anim-float' : ''}${className ? ` ${className}` : ''}`}
        style={{ width: px, height: px }}
        title={title || label}
      >
        <img
          src={asset.primary}
          alt={label}
          width={px}
          height={px}
          loading="lazy"
          decoding="async"
          draggable={false}
          onError={(e) => {
            const el = e.currentTarget
            el.style.display = 'none'
            const parent = el.parentElement
            if (parent && !parent.querySelector('.visual-fallback')) {
              const f = document.createElement('span')
              f.className = 'visual-fallback'
              f.style.background = asset.fallbackColor
              f.setAttribute('aria-hidden', 'true')
              parent.appendChild(f)
            }
          }}
        />
      </span>
    )
  }

  return (
    <span
      className={`visual-icon visual-svg svg-${asset.primary}${asset.animated ? ' anim-float' : ''}${className ? ` ${className}` : ''}`}
      style={{ width: px, height: px, ['--viz' as string]: asset.fallbackColor }}
      role="img"
      aria-label={label}
      title={title || label}
    >
      <SvgShape id={asset.primary} color={asset.fallbackColor} />
    </span>
  )
}
