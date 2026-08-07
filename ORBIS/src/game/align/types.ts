export type AlignPhase = 'ready' | 'playing' | 'cleared' | 'failed'

export type RingState = {
  id: string
  angle: number
  /** Degrees per second drift while playing */
  drift: number
  color: 'blue' | 'gold' | 'violet'
}

export type StageConfig = {
  level: number
  tolerance: number
  timeLimitSec: number
  drifts: [number, number, number]
}

export type AlignSnapshot = {
  rings: RingState[]
  phase: AlignPhase
  level: number
  tolerance: number
  timeLeft: number
  scoreGain: number
}
