import type { WorkshopStage } from '../types/vehicle'
import { STAGE_FLOW, STAGE_LABELS } from '../studio/stageFlow'

type Props = {
  stage: WorkshopStage
  unlocked: WorkshopStage[]
  onJump?: (stage: WorkshopStage) => void
}

export function StageBar({ stage, unlocked, onJump }: Props) {
  return (
    <ol className="stage-bar" aria-label="아이지오 스튜디오 공방 단계">
      {STAGE_FLOW.map((id, i) => {
        const open = unlocked.includes(id)
        const current = id === stage
        return (
          <li key={id} className={`stage-step${current ? ' current' : ''}${open ? ' open' : ''}`}>
            <button type="button" disabled={!open} onClick={() => open && onJump?.(id)}>
              <span className="stage-num">{i + 1}</span>
              <span className="stage-label">{STAGE_LABELS[id]}</span>
            </button>
          </li>
        )
      })}
    </ol>
  )
}
