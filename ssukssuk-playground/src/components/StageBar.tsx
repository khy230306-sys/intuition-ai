import type { WorkshopStage } from '../types/vehicle'

const STAGES: { id: WorkshopStage; ko: string }[] = [
  { id: 'select', ko: '선택' },
  { id: 'assemble', ko: '조립' },
  { id: 'paint', ko: '색칠' },
  { id: 'drive', ko: '운전' },
  { id: 'mission', ko: '미션' },
  { id: 'reward', ko: '보상' },
]

type Props = {
  stage: WorkshopStage
  unlocked: WorkshopStage[]
  onJump?: (stage: WorkshopStage) => void
}

export function StageBar({ stage, unlocked, onJump }: Props) {
  return (
    <ol className="stage-bar" aria-label="공방 단계">
      {STAGES.map((s, i) => {
        const open = unlocked.includes(s.id)
        const current = s.id === stage
        return (
          <li key={s.id} className={`stage-step${current ? ' current' : ''}${open ? ' open' : ''}`}>
            <button
              type="button"
              disabled={!open}
              onClick={() => open && onJump?.(s.id)}
            >
              <span className="stage-num">{i + 1}</span>
              <span className="stage-label">{s.ko}</span>
            </button>
          </li>
        )
      })}
    </ol>
  )
}
