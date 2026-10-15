/** Soft premium kid SVG shapes — never emoji. Strong silhouettes for small cards. */
import type { ReactNode } from 'react'

type Props = { id: string; color: string }

export function SvgShape({ id, color }: Props) {
  const c = color
  const ink = '#1a1510'
  switch (id) {
    case 'back':
      return (
        <svg viewBox="0 0 48 48" width="100%" height="100%" aria-hidden>
          <circle cx="24" cy="24" r="22" fill="#FFF7CC" stroke={ink} strokeWidth="3" />
          <path d="M28 14 L16 24 L28 34" fill="none" stroke={ink} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    case 'speaker':
      return (
        <svg viewBox="0 0 48 48" width="100%" height="100%" aria-hidden>
          <circle cx="24" cy="24" r="22" fill="#D6E4FF" stroke={ink} strokeWidth="3" />
          <path d="M16 20 h6 l8-6 v20 l-8-6 h-6 z" fill={c} stroke={ink} strokeWidth="2" />
          <path d="M34 18 c3 3 3 9 0 12" fill="none" stroke={ink} strokeWidth="3" strokeLinecap="round" />
        </svg>
      )
    case 'lock':
      return (
        <svg viewBox="0 0 48 48" width="100%" height="100%" aria-hidden>
          <rect x="12" y="22" width="24" height="18" rx="5" fill={c} stroke={ink} strokeWidth="3" />
          <path d="M18 22 v-6 a6 6 0 0 1 12 0 v6" fill="none" stroke={ink} strokeWidth="3" />
          <circle cx="24" cy="31" r="2.5" fill={ink} />
        </svg>
      )
    case 'book':
      return bubble(
        c,
        ink,
        <>
          <path d="M20 18 h24 v28 H20 z" fill={c} stroke={ink} strokeWidth="3" rx="4" />
          <path d="M32 18 v28" stroke={ink} strokeWidth="3" />
          <path d="M24 26 h5 M24 34 h5 M35 26 h5 M35 34 h5" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
        </>,
      )
    case 'numbers':
      return (
        <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden>
          <circle cx="32" cy="32" r="28" fill={c} stroke={ink} strokeWidth="3" />
          <text x="32" y="40" textAnchor="middle" fontSize="22" fontWeight="800" fill={ink} fontFamily="Nunito,Jua,sans-serif">
            123
          </text>
        </svg>
      )
    case 'brain':
      return (
        <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden>
          <ellipse cx="32" cy="34" rx="22" ry="18" fill={c} stroke={ink} strokeWidth="3" />
          <path d="M32 16 v36 M20 28 c6 4 18 4 24 0 M20 40 c6 3 18 3 24 0" fill="none" stroke={ink} strokeWidth="2.5" />
        </svg>
      )
    case 'leaf':
      return (
        <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden>
          <path d="M32 8 C48 14 54 34 32 56 C10 34 16 14 32 8Z" fill={c} stroke={ink} strokeWidth="3" />
          <path d="M32 18 v30" stroke={ink} strokeWidth="3" strokeLinecap="round" />
        </svg>
      )
    case 'palette':
      return (
        <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden>
          <path d="M32 8c14 0 24 10 24 22 0 8-6 14-14 14h-4c-3 0-4 2-4 4 0 4-4 8-10 8C14 56 8 44 8 32 8 18 18 8 32 8z" fill={c} stroke={ink} strokeWidth="3" />
          <circle cx="24" cy="24" r="4" fill="#FF3B30" />
          <circle cx="36" cy="20" r="4" fill="#FFD400" />
          <circle cx="44" cy="30" r="4" fill="#2F6BFF" />
        </svg>
      )
    case 'notes':
      return (
        <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden>
          <circle cx="22" cy="42" r="8" fill={c} stroke={ink} strokeWidth="3" />
          <circle cx="44" cy="36" r="8" fill="#FFD400" stroke={ink} strokeWidth="3" />
          <path d="M30 42 V16 l22-6 v26" fill="none" stroke={ink} strokeWidth="3.5" strokeLinecap="round" />
        </svg>
      )
    case 'heart':
      return (
        <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden>
          <path d="M32 54 C14 40 8 28 14 18 c4-6 12-6 18-1 6-5 14-5 18 1 6 10 0 22-18 36z" fill={c} stroke={ink} strokeWidth="3" />
        </svg>
      )
    case 'compass':
      return (
        <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden>
          <circle cx="32" cy="32" r="26" fill="#FFF7CC" stroke={ink} strokeWidth="3" />
          <path d="M32 12 l6 20 -6 20 -6-20z" fill={c} stroke={ink} strokeWidth="2" />
          <circle cx="32" cy="32" r="4" fill={ink} />
        </svg>
      )
    case 'gift':
      return (
        <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden>
          <rect x="12" y="28" width="40" height="28" rx="6" fill={c} stroke={ink} strokeWidth="3" />
          <rect x="10" y="20" width="44" height="12" rx="4" fill="#FFD400" stroke={ink} strokeWidth="3" />
          <path d="M32 20 v36 M22 20 c0-8 10-8 10 0 M42 20 c0-8-10-8-10 0" fill="none" stroke={ink} strokeWidth="3" />
        </svg>
      )
    case 'badge':
      return (
        <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden>
          <circle cx="32" cy="28" r="18" fill={c} stroke={ink} strokeWidth="3" />
          <path d="M22 42 l4 14 6-8 6 8 4-14" fill="#FFD400" stroke={ink} strokeWidth="2.5" />
          <circle cx="32" cy="28" r="7" fill="#FFF7CC" stroke={ink} strokeWidth="2" />
        </svg>
      )
    case 'crown':
      return (
        <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden>
          <path d="M12 40 L16 18 l10 12 6-16 6 16 10-12 4 22z" fill={c} stroke={ink} strokeWidth="3" strokeLinejoin="round" />
          <rect x="12" y="40" width="40" height="8" rx="3" fill="#FFB020" stroke={ink} strokeWidth="2" />
        </svg>
      )
    case 'medal':
      return (
        <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden>
          <path d="M24 8 h16 l-4 18 h-8z" fill="#FF4D6D" stroke={ink} strokeWidth="2" />
          <circle cx="32" cy="40" r="16" fill={c} stroke={ink} strokeWidth="3" />
          <text x="32" y="46" textAnchor="middle" fontSize="16" fontWeight="800" fill={ink} fontFamily="Jua,sans-serif">
            1
          </text>
        </svg>
      )
    case 'sun':
      return (
        <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden>
          <circle cx="32" cy="32" r="14" fill={c} stroke={ink} strokeWidth="3" />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => {
            const r = (a * Math.PI) / 180
            return <line key={a} x1={32 + Math.cos(r) * 20} y1={32 + Math.sin(r) * 20} x2={32 + Math.cos(r) * 28} y2={32 + Math.sin(r) * 28} stroke={ink} strokeWidth="3" strokeLinecap="round" />
          })}
        </svg>
      )
    case 'cloud':
      return (
        <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden>
          <path d="M20 40h28a12 12 0 0 0 0-24 14 14 0 0 0-26-4A10 10 0 0 0 20 40z" fill={c} stroke={ink} strokeWidth="3" />
        </svg>
      )
    case 'rain':
      return (
        <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden>
          <path d="M18 28h28a10 10 0 0 0 0-20 12 12 0 0 0-22-2A9 9 0 0 0 18 28z" fill="#B8D4FF" stroke={ink} strokeWidth="3" />
          <path d="M24 36 v12 M32 38 v12 M40 36 v12" stroke={c} strokeWidth="4" strokeLinecap="round" />
        </svg>
      )
    case 'snow':
      return (
        <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden>
          <circle cx="32" cy="32" r="10" fill={c} stroke={ink} strokeWidth="2" />
          {[0, 60, 120].map((a) => (
            <line key={a} x1="32" y1="12" x2="32" y2="52" stroke={ink} strokeWidth="3" transform={`rotate(${a} 32 32)`} strokeLinecap="round" />
          ))}
        </svg>
      )
    case 'tree':
      return (
        <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden>
          <rect x="28" y="40" width="8" height="14" rx="2" fill="#8B5A2B" stroke={ink} strokeWidth="2" />
          <circle cx="32" cy="28" r="16" fill={c} stroke={ink} strokeWidth="3" />
        </svg>
      )
    case 'flower':
      return (
        <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden>
          {[0, 72, 144, 216, 288].map((a) => {
            const r = ((a - 90) * Math.PI) / 180
            return <circle key={a} cx={32 + Math.cos(r) * 12} cy={32 + Math.sin(r) * 12} r="8" fill={c} stroke={ink} strokeWidth="2" />
          })}
          <circle cx="32" cy="32" r="7" fill="#FFD400" stroke={ink} strokeWidth="2" />
        </svg>
      )
    case 'mountain':
      return (
        <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden>
          <path d="M8 48 L24 18 L36 36 L44 24 L56 48Z" fill={c} stroke={ink} strokeWidth="3" strokeLinejoin="round" />
          <path d="M24 18 l4 8 -8 2z" fill="#fff" opacity="0.85" />
        </svg>
      )
    case 'sea':
      return (
        <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden>
          <rect x="6" y="10" width="52" height="44" rx="12" fill="#E0F2FE" stroke={ink} strokeWidth="3" />
          <path d="M10 34 q8-8 16 0 t16 0 t16 0" fill="none" stroke={c} strokeWidth="4" strokeLinecap="round" />
          <path d="M10 44 q8-8 16 0 t16 0 t16 0" fill="none" stroke={c} strokeWidth="4" strokeLinecap="round" opacity="0.7" />
        </svg>
      )
    case 'moon':
      return (
        <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden>
          <path d="M38 10 a22 22 0 1 0 14 36 A16 16 0 0 1 38 10z" fill={c} stroke={ink} strokeWidth="3" />
        </svg>
      )
    case 'star-shape':
      return (
        <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden>
          <path d="M32 8 l6 16 h17 l-14 11 5 17 -14-10 -14 10 5-17 -14-11 h17z" fill={c} stroke={ink} strokeWidth="3" strokeLinejoin="round" />
        </svg>
      )
    case 'apple':
      return (
        <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden>
          <path d="M32 18c8-10 22-2 22 12 0 16-10 28-22 28S10 46 10 30C10 16 24 8 32 18z" fill={c} stroke={ink} strokeWidth="3" />
          <path d="M32 18c2-8 10-10 14-8" fill="none" stroke="#22C55E" strokeWidth="3" strokeLinecap="round" />
        </svg>
      )
    case 'banana':
      return (
        <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden>
          <path d="M14 20c8 2 28 6 36 28-10 4-28 2-38-8 2-8 2-16 2-20z" fill={c} stroke={ink} strokeWidth="3" />
        </svg>
      )
    case 'strawberry':
      return (
        <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden>
          <path d="M32 56 C14 42 12 24 22 16 c5-4 10-2 10 2 0-4 5-6 10-2 10 8 8 26-10 40z" fill={c} stroke={ink} strokeWidth="3" />
          <path d="M24 14 c4 6 12 6 16 0" fill="#22C55E" stroke={ink} strokeWidth="2" />
        </svg>
      )
    case 'carrot':
      return (
        <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden>
          <path d="M28 14 c-2 18 0 30 4 42 4-12 6-24 4-42z" fill={c} stroke={ink} strokeWidth="3" />
          <path d="M24 12 h16 l-4 8 h-8z" fill="#22C55E" stroke={ink} strokeWidth="2" />
        </svg>
      )
    case 'bread':
      return (
        <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden>
          <ellipse cx="32" cy="36" rx="22" ry="14" fill={c} stroke={ink} strokeWidth="3" />
          <path d="M14 32 q18-16 36 0" fill="#F5D090" stroke={ink} strokeWidth="2" />
        </svg>
      )
    case 'milk':
      return (
        <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden>
          <path d="M22 16 h20 l4 8 v28 a6 6 0 0 1-6 6 H24 a6 6 0 0 1-6-6 V24z" fill={c} stroke={ink} strokeWidth="3" />
          <rect x="24" y="28" width="16" height="12" rx="3" fill="#7DD3FC" stroke={ink} strokeWidth="2" />
        </svg>
      )
    // animals
    case 'dog':
      return animal(c, ink, { ears: 'round', snout: true })
    case 'cat':
      return animal(c, ink, { ears: 'point', whiskers: true })
    case 'rabbit':
      return animal(c, ink, { ears: 'long' })
    case 'lion':
      return animal('#FFB020', ink, { mane: true })
    case 'elephant':
      return (
        <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden>
          <ellipse cx="32" cy="34" rx="18" ry="14" fill={c} stroke={ink} strokeWidth="3" />
          <path d="M18 38 q-8 10 -4 18" fill="none" stroke={c} strokeWidth="8" strokeLinecap="round" />
          <path d="M18 38 q-8 10 -4 18" fill="none" stroke={ink} strokeWidth="3" strokeLinecap="round" />
          <circle cx="26" cy="32" r="2.5" fill={ink} />
          <circle cx="38" cy="32" r="2.5" fill={ink} />
        </svg>
      )
    case 'monkey':
      return animal(c, ink, { ears: 'side' })
    case 'bear':
      return animal(c, ink, { ears: 'round', muzzle: true })
    case 'fox':
      return animal(c, ink, { ears: 'point', snout: true })
    case 'giraffe':
      return (
        <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden>
          <rect x="28" y="10" width="8" height="28" rx="4" fill={c} stroke={ink} strokeWidth="2" />
          <circle cx="32" cy="40" r="14" fill={c} stroke={ink} strokeWidth="3" />
          <circle cx="28" cy="38" r="2" fill={ink} />
          <circle cx="36" cy="38" r="2" fill={ink} />
          <circle cx="26" cy="10" r="3" fill={c} stroke={ink} strokeWidth="2" />
          <circle cx="38" cy="10" r="3" fill={c} stroke={ink} strokeWidth="2" />
        </svg>
      )
    case 'tiger':
      return animal(c, ink, { ears: 'round', stripes: true })
    case 'panda':
      return animal('#F5F5F5', ink, { panda: true })
    case 'penguin':
      return (
        <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden>
          <ellipse cx="32" cy="36" rx="16" ry="20" fill={c} stroke={ink} strokeWidth="3" />
          <ellipse cx="32" cy="40" rx="10" ry="12" fill="#fff" stroke={ink} strokeWidth="2" />
          <circle cx="26" cy="30" r="2.5" fill={ink} />
          <circle cx="38" cy="30" r="2.5" fill={ink} />
          <path d="M28 36 h8 l-4 4z" fill="#FF7A00" stroke={ink} strokeWidth="1.5" />
        </svg>
      )
    case 'dolphin':
      return (
        <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden>
          <path d="M8 36 q16-20 36-8 l12-8 -4 12 q8 8 0 14 -20 4-36-4z" fill={c} stroke={ink} strokeWidth="3" strokeLinejoin="round" />
          <circle cx="40" cy="30" r="2" fill={ink} />
        </svg>
      )
    case 'whale':
      return (
        <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden>
          <ellipse cx="28" cy="34" rx="20" ry="14" fill={c} stroke={ink} strokeWidth="3" />
          <path d="M46 34 l14-10 v20z" fill={c} stroke={ink} strokeWidth="3" />
          <circle cx="18" cy="32" r="2.5" fill={ink} />
          <path d="M22 14 v8" stroke="#7DD3FC" strokeWidth="3" strokeLinecap="round" />
        </svg>
      )
    case 'turtle':
      return (
        <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden>
          <ellipse cx="32" cy="34" rx="18" ry="14" fill={c} stroke={ink} strokeWidth="3" />
          <circle cx="48" cy="34" r="7" fill="#86EFAC" stroke={ink} strokeWidth="2" />
          <circle cx="50" cy="32" r="1.5" fill={ink} />
        </svg>
      )
    case 'fish':
      return (
        <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden>
          <ellipse cx="28" cy="32" rx="16" ry="10" fill={c} stroke={ink} strokeWidth="3" />
          <path d="M42 32 l14-10 v20z" fill={c} stroke={ink} strokeWidth="3" />
          <circle cx="22" cy="30" r="2" fill={ink} />
        </svg>
      )
    case 'butterfly':
      return (
        <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden>
          <ellipse cx="18" cy="24" rx="12" ry="16" fill={c} stroke={ink} strokeWidth="2" />
          <ellipse cx="46" cy="24" rx="12" ry="16" fill="#FFD400" stroke={ink} strokeWidth="2" />
          <ellipse cx="18" cy="44" rx="10" ry="12" fill="#FF8FAB" stroke={ink} strokeWidth="2" />
          <ellipse cx="46" cy="44" rx="10" ry="12" fill="#A78BFA" stroke={ink} strokeWidth="2" />
          <rect x="30" y="16" width="4" height="34" rx="2" fill={ink} />
        </svg>
      )
    case 'bee':
      return (
        <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden>
          <ellipse cx="32" cy="34" rx="16" ry="12" fill={c} stroke={ink} strokeWidth="3" />
          <path d="M20 34 h24 M24 28 h16 M24 40 h16" stroke={ink} strokeWidth="3" />
          <ellipse cx="22" cy="20" rx="8" ry="6" fill="#E0F2FE" stroke={ink} strokeWidth="2" />
          <ellipse cx="42" cy="20" rx="8" ry="6" fill="#E0F2FE" stroke={ink} strokeWidth="2" />
        </svg>
      )
    case 'frog':
      return animal(c, ink, { ears: 'none', eyesUp: true })
    // places
    case 'home':
      return (
        <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden>
          <path d="M8 30 L32 10 L56 30 v22 a4 4 0 0 1-4 4 H12 a4 4 0 0 1-4-4z" fill={c} stroke={ink} strokeWidth="3" strokeLinejoin="round" />
          <rect x="26" y="36" width="12" height="16" fill="#FFF7CC" stroke={ink} strokeWidth="2" />
        </svg>
      )
    case 'school':
      return (
        <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden>
          <rect x="10" y="22" width="44" height="30" rx="4" fill={c} stroke={ink} strokeWidth="3" />
          <path d="M8 22 L32 8 L56 22" fill="#FFD400" stroke={ink} strokeWidth="3" strokeLinejoin="round" />
          <rect x="28" y="34" width="8" height="18" fill="#FFF7CC" stroke={ink} strokeWidth="2" />
        </svg>
      )
    case 'hospital':
      return (
        <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden>
          <rect x="12" y="14" width="40" height="40" rx="6" fill="#fff" stroke={ink} strokeWidth="3" />
          <path d="M32 20 v28 M20 34 h24" stroke={c} strokeWidth="8" strokeLinecap="round" />
        </svg>
      )
    case 'fire-station':
      return placeBuilding(c, ink, '#FFD400')
    case 'police-station':
      return placeBuilding(c, ink, '#FFF')
    case 'market':
      return placeBuilding('#22C55E', ink, '#FFD400')
    case 'farm':
      return (
        <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden>
          <path d="M8 40 h48 v12 H8z" fill="#E8B86D" stroke={ink} strokeWidth="2" />
          <path d="M16 40 L32 16 L48 40" fill={c} stroke={ink} strokeWidth="3" />
          <circle cx="50" cy="18" r="8" fill="#FFD400" stroke={ink} strokeWidth="2" />
        </svg>
      )
    case 'zoo':
      return placeBuilding('#F4C430', ink, '#22C55E')
    case 'park':
      return (
        <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden>
          <rect x="8" y="44" width="48" height="8" rx="2" fill="#86EFAC" stroke={ink} strokeWidth="2" />
          <circle cx="22" cy="28" r="12" fill={c} stroke={ink} strokeWidth="3" />
          <rect x="20" y="36" width="4" height="10" fill="#8B5A2B" />
          <circle cx="44" cy="30" r="10" fill="#4ADE80" stroke={ink} strokeWidth="3" />
          <rect x="42" y="38" width="4" height="8" fill="#8B5A2B" />
        </svg>
      )
    case 'beach':
      return (
        <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden>
          <rect x="6" y="8" width="52" height="48" rx="10" fill="#E0F2FE" stroke={ink} strokeWidth="3" />
          <path d="M6 36 q26 12 52 0 v20 H6z" fill="#FDE68A" stroke={ink} strokeWidth="2" />
          <circle cx="46" cy="18" r="8" fill="#FFD400" stroke={ink} strokeWidth="2" />
        </svg>
      )
    case 'space':
      return (
        <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden>
          <rect x="6" y="6" width="52" height="52" rx="14" fill="#1e1b4b" stroke={ink} strokeWidth="3" />
          <circle cx="22" cy="22" r="3" fill="#FFD400" />
          <circle cx="40" cy="18" r="2" fill="#fff" />
          <circle cx="48" cy="34" r="2.5" fill="#fff" />
          <circle cx="28" cy="40" r="10" fill={c} stroke={ink} strokeWidth="2" />
        </svg>
      )
    case 'museum':
      return (
        <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden>
          <rect x="10" y="28" width="44" height="24" fill={c} stroke={ink} strokeWidth="3" />
          <path d="M8 28 L32 12 L56 28" fill="#E9D5FF" stroke={ink} strokeWidth="3" />
          <rect x="18" y="34" width="8" height="18" fill="#FFF7CC" stroke={ink} strokeWidth="2" />
          <rect x="38" y="34" width="8" height="18" fill="#FFF7CC" stroke={ink} strokeWidth="2" />
        </svg>
      )
    case 'face-happy':
      return face(c, ink, 'happy')
    case 'face-sad':
      return face(c, ink, 'sad')
    case 'face-angry':
      return face(c, ink, 'angry')
    case 'face-surprised':
      return face(c, ink, 'surprised')
    case 'face-shy':
      return face(c, ink, 'shy')
    case 'face-scared':
      return face(c, ink, 'scared')
    case 'face-proud':
      return face(c, ink, 'proud')
    case 'face-calm':
      return face(c, ink, 'calm')
    case 'char-hani':
      return miniChar('#FFE0B2', '#5B8CFF', ink)
    case 'char-youngi':
      return miniChar('#FFD6E8', '#FF8FAB', ink)
    case 'blob':
    default:
      return (
        <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden>
          <rect x="8" y="8" width="48" height="48" rx="16" fill={c} stroke={ink} strokeWidth="3" />
        </svg>
      )
  }
}

function bubble(_c: string, ink: string, children: ReactNode) {
  return (
    <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden>
      <rect x="6" y="6" width="52" height="52" rx="16" fill="#FFFDF5" stroke={ink} strokeWidth="3" />
      <g transform="translate(0,0)">{children}</g>
    </svg>
  )
}

function placeBuilding(c: string, ink: string, roof: string) {
  return (
    <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden>
      <rect x="12" y="24" width="40" height="28" rx="4" fill={c} stroke={ink} strokeWidth="3" />
      <path d="M10 24 L32 10 L54 24" fill={roof} stroke={ink} strokeWidth="3" strokeLinejoin="round" />
      <rect x="28" y="34" width="8" height="18" fill="#FFF7CC" stroke={ink} strokeWidth="2" />
    </svg>
  )
}

function face(c: string, ink: string, mood: string) {
  return (
    <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden>
      <circle cx="32" cy="32" r="26" fill={c} stroke={ink} strokeWidth="3" />
      {mood === 'angry' && <path d="M16 22 l10 4 M48 22 l-10 4" stroke={ink} strokeWidth="3" strokeLinecap="round" />}
      {mood === 'scared' ? (
        <>
          <circle cx="22" cy="28" r="5" fill="#fff" stroke={ink} strokeWidth="2" />
          <circle cx="42" cy="28" r="5" fill="#fff" stroke={ink} strokeWidth="2" />
          <circle cx="22" cy="28" r="2" fill={ink} />
          <circle cx="42" cy="28" r="2" fill={ink} />
        </>
      ) : (
        <>
          <circle cx="22" cy="28" r={mood === 'surprised' ? 4 : 3} fill={ink} />
          <circle cx="42" cy="28" r={mood === 'surprised' ? 4 : 3} fill={ink} />
        </>
      )}
      {mood === 'happy' || mood === 'proud' ? <path d="M20 38c4 8 20 8 24 0" fill="none" stroke={ink} strokeWidth="3" strokeLinecap="round" /> : null}
      {mood === 'sad' ? <path d="M20 44c4-8 20-8 24 0" fill="none" stroke={ink} strokeWidth="3" strokeLinecap="round" /> : null}
      {mood === 'angry' ? <path d="M22 44c4-6 16-6 20 0" fill="none" stroke={ink} strokeWidth="3" strokeLinecap="round" /> : null}
      {mood === 'surprised' || mood === 'scared' ? <ellipse cx="32" cy="42" rx="6" ry="7" fill={ink} /> : null}
      {mood === 'shy' ? (
        <>
          <path d="M24 40 h16" stroke={ink} strokeWidth="3" strokeLinecap="round" />
          <circle cx="18" cy="36" r="4" fill="#FF8A80" opacity="0.7" />
          <circle cx="46" cy="36" r="4" fill="#FF8A80" opacity="0.7" />
        </>
      ) : null}
      {mood === 'calm' ? <path d="M24 40 q8 6 16 0" fill="none" stroke={ink} strokeWidth="3" strokeLinecap="round" /> : null}
      {mood === 'proud' ? <path d="M48 16 l6 2 -2 6" fill="none" stroke="#FFD400" strokeWidth="3" strokeLinecap="round" /> : null}
    </svg>
  )
}

function miniChar(skin: string, shirt: string, ink: string) {
  return (
    <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden>
      <circle cx="32" cy="26" r="14" fill={skin} stroke={ink} strokeWidth="2.5" />
      <circle cx="27" cy="25" r="1.8" fill={ink} />
      <circle cx="37" cy="25" r="1.8" fill={ink} />
      <path d="M27 31 q5 4 10 0" fill="none" stroke={ink} strokeWidth="2" strokeLinecap="round" />
      <path d="M20 42 q12-6 24 0 l3 14 H17z" fill={shirt} stroke={ink} strokeWidth="2.5" />
    </svg>
  )
}

function animal(
  c: string,
  ink: string,
  opts: { ears?: string; snout?: boolean; whiskers?: boolean; mane?: boolean; muzzle?: boolean; stripes?: boolean; panda?: boolean; eyesUp?: boolean },
) {
  return (
    <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden>
      {opts.mane && <circle cx="32" cy="34" r="26" fill="#FF8C00" stroke={ink} strokeWidth="3" />}
      {opts.ears === 'long' && (
        <>
          <ellipse cx="22" cy="12" rx="5" ry="12" fill={c} stroke={ink} strokeWidth="2" />
          <ellipse cx="42" cy="12" rx="5" ry="12" fill={c} stroke={ink} strokeWidth="2" />
        </>
      )}
      {opts.ears === 'point' && (
        <>
          <path d="M16 28 L14 10 L28 22" fill={c} stroke={ink} strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M48 28 L50 10 L36 22" fill={c} stroke={ink} strokeWidth="2.5" strokeLinejoin="round" />
        </>
      )}
      {opts.ears === 'round' && (
        <>
          <circle cx="18" cy="18" r="7" fill={c} stroke={ink} strokeWidth="2.5" />
          <circle cx="46" cy="18" r="7" fill={c} stroke={ink} strokeWidth="2.5" />
        </>
      )}
      {opts.ears === 'side' && (
        <>
          <circle cx="14" cy="32" r="8" fill={c} stroke={ink} strokeWidth="2.5" />
          <circle cx="50" cy="32" r="8" fill={c} stroke={ink} strokeWidth="2.5" />
        </>
      )}
      <ellipse cx="32" cy="36" rx="18" ry="16" fill={opts.panda ? '#F5F5F5' : c} stroke={ink} strokeWidth="3" />
      {opts.panda && (
        <>
          <ellipse cx="24" cy="32" rx="6" ry="7" fill={ink} />
          <ellipse cx="40" cy="32" rx="6" ry="7" fill={ink} />
        </>
      )}
      <circle cx="26" cy={opts.eyesUp ? 30 : 34} r="2.5" fill={opts.panda ? '#fff' : ink} />
      <circle cx="38" cy={opts.eyesUp ? 30 : 34} r="2.5" fill={opts.panda ? '#fff' : ink} />
      {opts.snout && <ellipse cx="32" cy="42" rx="5" ry="3" fill="#FFB4A2" stroke={ink} strokeWidth="1.5" />}
      {opts.muzzle && <ellipse cx="32" cy="42" rx="6" ry="4" fill="#D2B48C" stroke={ink} strokeWidth="1.5" />}
      {opts.whiskers && (
        <g stroke={ink} strokeWidth="2" strokeLinecap="round">
          <path d="M14 36 h10 M14 40 h10 M40 36 h10 M40 40 h10" />
        </g>
      )}
      {opts.stripes && (
        <g stroke={ink} strokeWidth="2.5" strokeLinecap="round">
          <path d="M22 26 v8 M32 24 v10 M42 26 v8" />
        </g>
      )}
    </svg>
  )
}
