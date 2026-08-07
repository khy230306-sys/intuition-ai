import type { VehicleColoringTemplate } from '../../data/vehicleColoringTemplates'

type Props = {
  template: VehicleColoringTemplate
  fills?: Record<string, string>
  showDefaultFills?: boolean
  showNumbers?: boolean
  interactive?: boolean
  onRegionTap?: (regionId: string) => void
  className?: string
}

/** Semantic region SVG — each region fills independently. TEMP line-art, not premium REAL. */
export function LineArtSvg({
  template,
  fills = {},
  showDefaultFills = true,
  showNumbers = false,
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
      aria-label={template.name}
    >
      {template.regions.map((r) => {
        const fill = fills[r.id] ?? (showDefaultFills ? r.defaultFill || '#FFFDF8' : '#FFFDF8')
        return (
          <g key={r.id}>
            <path
              data-region={r.id}
              d={r.d}
              fill={fill}
              stroke="#1A1510"
              strokeWidth={2.4}
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
            {showNumbers && r.number != null && (
              <text
                x={centroidX(r.d)}
                y={centroidY(r.d)}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="14"
                fontWeight="800"
                fill="#1A1510"
                pointerEvents="none"
                opacity={0.7}
              >
                {r.number}
              </text>
            )}
          </g>
        )
      })}
      {(template.outlines || []).map((d, i) => (
        <path
          key={`o-${i}`}
          d={d}
          fill="none"
          stroke="#1A1510"
          strokeWidth={3}
          strokeLinejoin="round"
          pointerEvents="none"
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  )
}

/** Rough centroid from first M x y in path — good enough for kid number badges */
function centroidX(d: string) {
  const m = /M\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/i.exec(d)
  if (!m) return 160
  return Number(m[1]) + 20
}
function centroidY(d: string) {
  const m = /M\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/i.exec(d)
  if (!m) return 110
  return Number(m[2]) + 16
}
