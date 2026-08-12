/**
 * Independent firetruck production SVG parts.
 * Soft plastic / toy shading — not Visual Bible crops, not geometric placeholders.
 */

import { useId, type ReactNode } from 'react'
import type { FiretruckPartId } from '../../../types/vehicle'

export type PartRenderProps = {
  color: string
  selected?: boolean
  wheelAngle?: number
  sirenOn?: boolean
  className?: string
}

function shade(hex: string, amount: number): string {
  const n = hex.replace('#', '')
  const full = n.length === 3 ? n.split('').map((c) => c + c).join('') : n
  const num = Number.parseInt(full, 16)
  const r = Math.min(255, Math.max(0, ((num >> 16) & 255) + amount))
  const g = Math.min(255, Math.max(0, ((num >> 8) & 255) + amount))
  const b = Math.min(255, Math.max(0, (num & 255) + amount))
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}

function PartFrame({
  selected,
  children,
  className,
}: {
  selected?: boolean
  children: ReactNode
  className?: string
}) {
  return (
    <g className={className} style={selected ? { filter: 'url(#part-glow)' } : undefined}>
      {children}
    </g>
  )
}

export function FiretruckShadow() {
  return <ellipse cx="0" cy="0" rx="150" ry="18" fill="#1A237E" opacity="0.18" />
}

export function FiretruckBody({ color, selected }: PartRenderProps) {
  const uid = useId().replace(/:/g, '')
  const dark = shade(color, -28)
  const light = shade(color, 36)
  const grad = `ft-body-${uid}`
  return (
    <PartFrame selected={selected}>
      <defs>
        <linearGradient id={grad} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={light} />
          <stop offset="55%" stopColor={color} />
          <stop offset="100%" stopColor={dark} />
        </linearGradient>
      </defs>
      <path
        d="M-110 -42 C-110 -58 -96 -70 -78 -70 H42 C58 -70 68 -58 68 -42 V28 H-110 Z"
        fill={`url(#${grad})`}
        stroke="#5D1A17"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="M-72 -70 H38 C48 -70 54 -64 54 -56 H-72 C-80 -56 -84 -62 -84 -68 C-84 -70 -78 -70 -72 -70 Z"
        fill="#FFF8E7"
        opacity="0.92"
      />
      <rect x="-96" y="-28" width="140" height="42" rx="12" fill={dark} opacity="0.22" />
      {[-88, -56, -24, 8, 36].map((x) => (
        <circle key={x} cx={x} cy="-48" r="3.2" fill={light} opacity="0.85" />
      ))}
      <circle cx="-70" cy="4" r="14" fill={dark} opacity="0.35" />
      <circle cx="-70" cy="4" r="8" fill="#FFF8E7" opacity="0.35" />
      <path
        d="M-100 -52 C-90 -62 -60 -66 -20 -66 H30"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="6"
        strokeLinecap="round"
        opacity="0.28"
      />
    </PartFrame>
  )
}

export function FiretruckDoor({ color, selected }: PartRenderProps) {
  const uid = useId().replace(/:/g, '')
  const dark = shade(color, -32)
  const light = shade(color, 30)
  const grad = `ft-door-${uid}`
  return (
    <PartFrame selected={selected}>
      <defs>
        <linearGradient id={grad} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={light} />
          <stop offset="100%" stopColor={dark} />
        </linearGradient>
      </defs>
      <path
        d="M-46 -58 C-46 -70 -36 -78 -22 -78 H34 C52 -78 66 -58 70 -36 L74 28 H-46 Z"
        fill={`url(#${grad})`}
        stroke="#8D6E00"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <rect x="-28" y="-34" width="56" height="48" rx="10" fill={dark} opacity="0.18" />
      <rect x="18" y="-6" width="14" height="6" rx="3" fill="#ECEFF1" stroke="#78909C" strokeWidth="1.5" />
      <circle cx="-2" cy="-8" r="14" fill="#FFF8E7" stroke="#EF6C00" strokeWidth="2.5" />
      <text
        x="-2"
        y="-2"
        textAnchor="middle"
        fontFamily="Jua, Nunito, sans-serif"
        fontSize="16"
        fill="#E53935"
      >
        S
      </text>
      <path
        d="M-34 -62 C-20 -70 10 -72 40 -64"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="5"
        strokeLinecap="round"
        opacity="0.35"
      />
    </PartFrame>
  )
}

export function FiretruckWindow({ color, selected }: PartRenderProps) {
  const uid = useId().replace(/:/g, '')
  const grad = `ft-glass-${uid}`
  return (
    <PartFrame selected={selected}>
      <defs>
        <linearGradient id={grad} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#E3F2FD" />
          <stop offset="40%" stopColor={color} />
          <stop offset="100%" stopColor={shade(color, -40)} />
        </linearGradient>
      </defs>
      <path
        d="M-42 -28 C-42 -40 -30 -48 -16 -48 H34 C48 -48 56 -36 56 -24 L52 18 H-42 Z"
        fill={`url(#${grad})`}
        stroke="#1565C0"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <ellipse cx="-8" cy="-8" rx="11" ry="13" fill="#FFFDF8" />
      <ellipse cx="22" cy="-8" rx="11" ry="13" fill="#FFFDF8" />
      <circle cx="-6" cy="-6" r="5.5" fill="#263238" />
      <circle cx="24" cy="-6" r="5.5" fill="#263238" />
      <circle cx="-4" cy="-8" r="2" fill="#FFFFFF" />
      <circle cx="26" cy="-8" r="2" fill="#FFFFFF" />
      <path
        d="M0 8 Q14 16 28 8"
        fill="none"
        stroke="#FFFDF8"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.7"
      />
      <path
        d="M-30 -36 H40"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="4"
        strokeLinecap="round"
        opacity="0.4"
      />
    </PartFrame>
  )
}

export function FiretruckBumper({ color, selected }: PartRenderProps) {
  const uid = useId().replace(/:/g, '')
  const dark = shade(color, -24)
  const light = shade(color, 28)
  const grad = `ft-bumper-${uid}`
  return (
    <PartFrame selected={selected}>
      <defs>
        <linearGradient id={grad} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={light} />
          <stop offset="100%" stopColor={dark} />
        </linearGradient>
      </defs>
      <rect
        x="-28"
        y="-16"
        width="56"
        height="32"
        rx="10"
        fill={`url(#${grad})`}
        stroke="#607D8B"
        strokeWidth="2.5"
      />
      <rect x="-20" y="-4" width="40" height="8" rx="3" fill="#90A4AE" opacity="0.55" />
      <circle cx="-14" cy="-22" r="7" fill="#FFF59D" stroke="#F9A825" strokeWidth="2" />
      <circle cx="14" cy="-22" r="7" fill="#FFF59D" stroke="#F9A825" strokeWidth="2" />
      <circle cx="-14" cy="-22" r="3" fill="#FFFFFF" opacity="0.8" />
      <circle cx="14" cy="-22" r="3" fill="#FFFFFF" opacity="0.8" />
    </PartFrame>
  )
}

export function FiretruckLadder({ color, selected }: PartRenderProps) {
  const uid = useId().replace(/:/g, '')
  const dark = shade(color, -20)
  const light = shade(color, 30)
  const grad = `ft-ladder-${uid}`
  return (
    <PartFrame selected={selected}>
      <defs>
        <linearGradient id={grad} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={light} />
          <stop offset="100%" stopColor={dark} />
        </linearGradient>
      </defs>
      <rect
        x="-88"
        y="-14"
        width="176"
        height="28"
        rx="8"
        fill={`url(#${grad})`}
        stroke="#546E7A"
        strokeWidth="2.5"
      />
      {[-60, -30, 0, 30, 60].map((x) => (
        <rect key={x} x={x - 3} y="-10" width="6" height="20" rx="2" fill="#ECEFF1" opacity="0.85" />
      ))}
      <rect x="-80" y="-10" width="8" height="20" rx="2" fill="#78909C" />
      <rect x="72" y="-10" width="8" height="20" rx="2" fill="#78909C" />
    </PartFrame>
  )
}

export function FiretruckLight({ color, selected, sirenOn }: PartRenderProps) {
  const glow = sirenOn ? shade(color, 40) : color
  return (
    <PartFrame selected={selected}>
      <ellipse cx="0" cy="10" rx="22" ry="6" fill="#1A237E" opacity="0.15" />
      <rect x="-18" y="-4" width="36" height="12" rx="4" fill="#455A64" />
      <ellipse
        cx="0"
        cy="-10"
        rx="16"
        ry="14"
        fill={glow}
        stroke="#0277BD"
        strokeWidth="2.5"
        opacity={sirenOn ? 1 : 0.85}
      />
      <ellipse cx="-4" cy="-14" rx="6" ry="4" fill="#FFFFFF" opacity="0.55" />
      {sirenOn && <ellipse cx="0" cy="-10" rx="26" ry="22" fill={glow} opacity="0.25" />}
    </PartFrame>
  )
}

function Wheel({ color, selected, wheelAngle = 0 }: PartRenderProps) {
  const hub = shade(color, 50)
  return (
    <PartFrame selected={selected}>
      <g transform={`rotate(${(wheelAngle * 180) / Math.PI})`}>
        <circle cx="0" cy="0" r="34" fill={color} stroke="#102027" strokeWidth="4" />
        <circle cx="0" cy="0" r="22" fill="#263238" />
        <circle cx="0" cy="0" r="14" fill={hub} stroke="#90A4AE" strokeWidth="2" />
        <circle cx="0" cy="0" r="5" fill="#ECEFF1" />
        {[0, 60, 120].map((deg) => (
          <rect
            key={deg}
            x="-2.5"
            y="-20"
            width="5"
            height="12"
            rx="2"
            fill="#78909C"
            transform={`rotate(${deg})`}
          />
        ))}
      </g>
      <path
        d="M-18 -22 A28 28 0 0 1 18 -22"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="4"
        strokeLinecap="round"
        opacity="0.2"
      />
    </PartFrame>
  )
}

export function FiretruckFrontWheel(props: PartRenderProps) {
  return <Wheel {...props} />
}

export function FiretruckRearWheel(props: PartRenderProps) {
  return <Wheel {...props} />
}

export const FIRETRUCK_PART_RENDERERS: Record<
  FiretruckPartId,
  (props: PartRenderProps) => ReactNode
> = {
  shadow: () => <FiretruckShadow />,
  body: (p) => <FiretruckBody {...p} />,
  door: (p) => <FiretruckDoor {...p} />,
  window: (p) => <FiretruckWindow {...p} />,
  bumper: (p) => <FiretruckBumper {...p} />,
  ladder: (p) => <FiretruckLadder {...p} />,
  light: (p) => <FiretruckLight {...p} />,
  frontWheel: (p) => <FiretruckFrontWheel {...p} />,
  rearWheel: (p) => <FiretruckRearWheel {...p} />,
}

export const FIRETRUCK_PART_HIT: Record<FiretruckPartId, { rx: number; ry: number }> = {
  shadow: { rx: 150, ry: 18 },
  body: { rx: 95, ry: 55 },
  door: { rx: 60, ry: 55 },
  window: { rx: 50, ry: 40 },
  bumper: { rx: 32, ry: 28 },
  ladder: { rx: 95, ry: 22 },
  light: { rx: 28, ry: 28 },
  frontWheel: { rx: 36, ry: 36 },
  rearWheel: { rx: 36, ry: 36 },
}
