type Props = {
  value: number
  max?: number
  label?: string
  color?: string
  className?: string
}

export function ProgressBar({ value, max = 100, label, color = '#5B8CFF', className }: Props) {
  const pct = Math.max(0, Math.min(100, Math.round((value / max) * 100)))
  return (
    <div className={`ssuk-progress${className ? ` ${className}` : ''}`}>
      {label && (
        <div className="ssuk-progress-label">
          <span>{label}</span>
          <span>{pct}%</span>
        </div>
      )}
      <div className="ssuk-progress-track" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className="ssuk-progress-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}
