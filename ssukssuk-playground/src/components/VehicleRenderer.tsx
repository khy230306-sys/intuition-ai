import { useId, type PointerEventHandler, type ReactNode } from 'react'
import {
  FIRETRUCK_PART_META,
  FIRETRUCK_VIEWBOX,
} from '../assets/vehicles/firetruck/manifest'
import { FIRETRUCK_PART_RENDERERS } from '../assets/vehicles/firetruck/parts'
import type { FiretruckPartId, VehicleEntity, WorkshopStage } from '../types/vehicle'

type Props = {
  entity: VehicleEntity
  stage: WorkshopStage
  selectedPartId?: FiretruckPartId | null
  ghostSlots?: boolean
  mode?: 'tray' | 'paint' | 'world'
  onPointerDown?: PointerEventHandler<SVGSVGElement>
  onPointerMove?: PointerEventHandler<SVGSVGElement>
  onPointerUp?: PointerEventHandler<SVGSVGElement>
  onPointerCancel?: PointerEventHandler<SVGSVGElement>
}

export function VehicleRenderer({
  entity,
  stage,
  selectedPartId = null,
  ghostSlots = false,
  mode = 'paint',
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
}: Props) {
  const glowId = `part-glow-${useId().replace(/:/g, '')}`

  if (entity.type !== 'firetruck' || entity.assetStatus !== 'READY') {
    return (
      <div className="asset-required" role="status">
        <strong>Asset Required</strong>
        <span>{entity.labelKo} 파츠 에셋이 아직 없습니다.</span>
      </div>
    )
  }

  const partIds = (Object.keys(FIRETRUCK_PART_META) as FiretruckPartId[]).sort(
    (a, b) => FIRETRUCK_PART_META[a].z - FIRETRUCK_PART_META[b].z,
  )

  const sirenOn = entity.sirenPhase > 0.5 || entity.animation === 'celebrate'
  const vbH = mode === 'tray' ? FIRETRUCK_VIEWBOX.h + 40 : FIRETRUCK_VIEWBOX.h

  const body = (
    <>
      <defs>
        <filter id={glowId} x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#FFD54F" floodOpacity="0.85" />
        </filter>
      </defs>
      {ghostSlots &&
        entity.assembleOrder.map((id) => {
          const part = entity.parts[id]
          if (!part || part.assembled) return null
          const meta = FIRETRUCK_PART_META[id]
          return (
            <g key={`ghost-${id}`} transform={`translate(${meta.slotPos.x} ${meta.slotPos.y})`} opacity="0.25">
              <ellipse
                cx="0"
                cy="0"
                rx="42"
                ry="30"
                fill="none"
                stroke="#1565C0"
                strokeWidth="3"
                strokeDasharray="8 6"
              />
            </g>
          )
        })}

      {mode === 'tray' &&
        partIds.map((id) => {
          const part = entity.parts[id]
          if (!part || part.assembled || id === 'shadow') return null
          return (
            <PartGroup
              key={`tray-${id}`}
              id={id}
              color={part.color}
              x={part.trayPos.x}
              y={part.trayPos.y}
              scale={part.scale}
              selected={selectedPartId === id}
              glowId={glowId}
            />
          )
        })}

      {partIds.map((id) => {
        const part = entity.parts[id]
        if (!part) return null
        if (mode === 'tray' && !part.assembled) return null
        if ((mode === 'paint' || mode === 'world') && !part.assembled && id !== 'shadow') return null
        return (
          <PartGroup
            key={`slot-${id}`}
            id={id}
            color={part.color}
            x={part.slotPos.x}
            y={part.slotPos.y}
            scale={part.scale}
            selected={selectedPartId === id && (stage === 'paint' || stage === 'assemble')}
            glowId={glowId}
            wheelAngle={id === 'frontWheel' || id === 'rearWheel' ? entity.wheelAngle : 0}
            sirenOn={id === 'light' ? sirenOn : false}
          />
        )
      })}
    </>
  )

  if (mode === 'world') {
    return (
      <div
        className={`vehicle-world anim-${entity.animation}`}
        style={{
          left: entity.position.x,
          top: entity.position.y,
          transform: `translate(-50%, -50%) rotate(${entity.rotation}deg)`,
        }}
      >
        <svg
          className="vehicle-svg"
          viewBox={`0 0 ${FIRETRUCK_VIEWBOX.w} ${FIRETRUCK_VIEWBOX.h}`}
          role="img"
          aria-label={`${entity.labelKo} Vehicle Entity`}
        >
          {body}
        </svg>
      </div>
    )
  }

  return (
    <svg
      className={`vehicle-svg stage-svg anim-${entity.animation}`}
      viewBox={`0 0 ${FIRETRUCK_VIEWBOX.w} ${vbH}`}
      role="img"
      aria-label={`${entity.labelKo} Vehicle Entity`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    >
      {body}
    </svg>
  )
}

function PartGroup({
  id,
  color,
  x,
  y,
  scale,
  selected,
  glowId,
  wheelAngle = 0,
  sirenOn = false,
}: {
  id: FiretruckPartId
  color: string
  x: number
  y: number
  scale: number
  selected: boolean
  glowId: string
  wheelAngle?: number
  sirenOn?: boolean
}) {
  const render = FIRETRUCK_PART_RENDERERS[id]
  return (
    <g
      data-part={id}
      transform={`translate(${x} ${y}) scale(${scale})`}
      style={selected ? { filter: `url(#${glowId})` } : undefined}
    >
      {render({ color, selected: false, wheelAngle, sirenOn }) as ReactNode}
    </g>
  )
}
