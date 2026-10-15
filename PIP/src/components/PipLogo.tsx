export function PipLogo({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <radialGradient id="pipGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="45%" stopColor="#7ee0ff" />
          <stop offset="100%" stopColor="#05070f" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x="4" y="4" width="56" height="56" rx="16" fill="#0b1220" stroke="#7ee0ff" strokeOpacity="0.45" />
      <circle cx="32" cy="32" r="14" fill="url(#pipGlow)" />
      <circle cx="20" cy="20" r="3.2" fill="#d4b26a" />
      <circle cx="44" cy="20" r="3.2" fill="#9b6bff" />
      <circle cx="20" cy="44" r="3.2" fill="#9b6bff" />
      <circle cx="44" cy="44" r="3.2" fill="#d4b26a" />
      <circle cx="32" cy="32" r="4" fill="#ffffff" />
    </svg>
  )
}
