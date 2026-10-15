export const brandColors = {
  deepBlack: '#05070f',
  midnight: '#0b1224',
  navy: '#101b33',
  neonBlue: '#3aa9ff',
  gold: '#d4b26a',
  violet: '#9b6bff',
  textPrimary: '#f4f7ff',
  textMuted: '#9aa6c3',
} as const

export const orbPalette = {
  blue: {
    name: 'BLUE',
    color: brandColors.neonBlue,
    glow: 'rgba(58, 169, 255, 0.55)',
  },
  gold: {
    name: 'GOLD',
    color: brandColors.gold,
    glow: 'rgba(212, 178, 106, 0.55)',
  },
  violet: {
    name: 'VIOLET',
    color: brandColors.violet,
    glow: 'rgba(155, 107, 255, 0.55)',
  },
} as const
