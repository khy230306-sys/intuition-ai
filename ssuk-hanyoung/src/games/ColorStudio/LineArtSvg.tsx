import type { ColorTemplate } from '../../data/colorStudio'

type Props = {
  template: ColorTemplate
  fills?: Record<string, string>
  showDefaultFills?: boolean
  interactive?: boolean
  onRegionTap?: (regionId: string) => void
  className?: string
}

/** Semantic region SVG — each region fills independently. */
export function LineArtSvg({
  template,
  fills = {},
  showDefaultFills = true,
  interactive = false,
  onRegionTap,
  className,
}: Props) {
  return (
    <svg
      className={className}
      viewBox={template.viewBox}
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid meet"
      aria-label={template.title}
    >
      {template.regions.map((r) => {
        const fill = fills[r.id] ?? (showDefaultFills ? r.defaultFill || '#FFFDF8' : '#FFFDF8')
        return (
          <path
            key={r.id}
            d={r.d}
            fill={fill}
            stroke="#1A1510"
            strokeWidth={2.2}
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            style={{ cursor: interactive ? 'pointer' : 'default', touchAction: 'manipulation' }}
            onPointerDown={(e) => {
              if (!interactive || !onRegionTap) return
              e.preventDefault()
              e.stopPropagation()
              onRegionTap(r.id)
            }}
          />
        )
      })}
      {template.outlines.map((d, i) => (
        <path
          key={`o-${i}`}
          d={d}
          fill="none"
          stroke="#1A1510"
          strokeWidth={3}
          strokeLinejoin="round"
          strokeLinecap="round"
          pointerEvents="none"
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  )
}
