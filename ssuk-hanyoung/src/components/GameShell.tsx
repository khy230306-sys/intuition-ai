import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import { CHAR_IMG, CharImg } from './GameArt'

export function GameShell({
  title,
  subtitle,
  progress,
  children,
  footer,
}: {
  title: string
  subtitle?: string
  progress?: number
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <div>
      <div className="page-head">
        <Link to="/games" className="icon-btn" aria-label="게임 목록">
          ←
        </Link>
        <h1>{title}</h1>
        <Link to="/" className="icon-btn photo" aria-label="홈">
          <CharImg src={CHAR_IMG.bus} size={28} />
        </Link>
      </div>
      {subtitle && (
        <p className="section-sub" style={{ marginTop: '-0.5rem' }}>
          {subtitle}
        </p>
      )}
      {typeof progress === 'number' && (
        <div className="progress" aria-label={`진행 ${Math.round(progress * 100)}%`}>
          <span style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }} />
        </div>
      )}
      {children}
      {footer && <div style={{ marginTop: '0.9rem' }}>{footer}</div>}
    </div>
  )
}
