import { getAsset } from '../assets/registry'
import type { CareState, RepairIssueId } from '../entity/careOps'
import { careSummary, isRepairComplete, isWashComplete } from '../entity/careOps'
import type { WorkshopStage } from '../types/vehicle'
import { STAGE_HINTS, STAGE_LABELS } from '../workshop/stageFlow'
import { FIRETRUCK_PAINT_SWATCHES } from '../workshop/paintSwatches'
import { AssetRequired } from './AssetRequired'
import { VehicleRenderer } from './VehicleRenderer'

type Props = {
  stage: WorkshopStage
  playable: boolean
  care: CareState
  paintColor: string
  onPaintColor: (hex: string) => void
  onSoap: () => void
  onScrub: () => void
  onRinse: () => void
  onResolveIssue: (id: RepairIssueId) => void
  onLogicAdvance: () => void
  onPersistCustomization: () => void
}

/**
 * Stage body for 쑥쑥놀이터 NEW Prototype 01.
 * Never draws temp vehicle/character art — VehicleRenderer + AssetRequired only.
 */
export function WorkshopStagePanel({
  stage,
  playable,
  care,
  paintColor,
  onPaintColor,
  onSoap,
  onScrub,
  onRinse,
  onResolveIssue,
  onLogicAdvance,
  onPersistCustomization,
}: Props) {
  const washDone = isWashComplete(care)
  const repairDone = isRepairComplete(care)

  return (
    <section className="panel studio-stage" data-stage={stage}>
      <h2>
        {STAGE_LABELS[stage]}
        {!playable && stage !== 'select' && stage !== 'growth' ? ' · BLOCKED' : ''}
      </h2>
      <p className="lead">{STAGE_HINTS[stage]}</p>

      {stage === 'select' && (
        <>
          <VehicleRenderer />
          <p className="hint">
            기준 트라이어드 Quality Gate 후에만 조립으로 진입합니다. 지금은 로직·게이트만 준비됩니다.
          </p>
        </>
      )}

      {stage === 'assemble' && (
        <>
          <VehicleRenderer partId="body" />
          <AssetRequired
            asset={getAsset('ASSET_GARAGE_WORKBENCH')}
            detail="조립 트레이·슬롯은 APPROVED 파츠 비트맵이 연결될 때 활성화됩니다."
          />
        </>
      )}

      {stage === 'paint' && (
        <>
          <VehicleRenderer partId="frontDoor" />
          <div className="swatches" role="list" aria-label="색칠 팔레트">
            {FIRETRUCK_PAINT_SWATCHES.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`swatch${paintColor === s.hex ? ' on' : ''}`}
                style={{ background: s.hex }}
                aria-label={s.ko}
                onClick={() => onPaintColor(s.hex)}
              />
            ))}
          </div>
          <p className="hint">선택 색 {paintColor} — 파츠 단위 저장용 데이터 (렌더 그래픽 아님)</p>
          <button type="button" className="btn ghost" onClick={onPersistCustomization}>
            customization 저장 (로직)
          </button>
        </>
      )}

      {stage === 'wash' && (
        <>
          <AssetRequired
            asset={getAsset('ASSET_WASH_BAY_BACKGROUND')}
            detail="세차 인터랙션(문지르기/물/거품/스펀지) UI는 배경·차량 APPROVED 후 합성됩니다."
          />
          <VehicleRenderer />
          <p className="care-meter" aria-live="polite">
            {careSummary(care)}
            {washDone ? ' · 세차 완료(로직)' : ''}
          </p>
          <div className="care-actions">
            <button type="button" className="btn" onClick={onSoap} disabled={!playable}>
              거품
            </button>
            <button type="button" className="btn" onClick={onScrub} disabled={!playable}>
              스펀지
            </button>
            <button type="button" className="btn" onClick={onRinse} disabled={!playable}>
              물로 헹구기
            </button>
          </div>
          {!playable && (
            <p className="hint">그래픽 승인 전 — 세차 버튼은 잠금. 로직 함수는 테스트로 검증됨.</p>
          )}
          {playable && washDone && (
            <button type="button" className="btn primary" onClick={onLogicAdvance}>
              정비로 이동
            </button>
          )}
        </>
      )}

      {stage === 'repair' && (
        <>
          <AssetRequired
            asset={getAsset('ASSET_REPAIR_BAY_BACKGROUND')}
            detail="정비 찾기/해결 타깃은 APPROVED 파츠 위에 오버레이됩니다."
          />
          <VehicleRenderer partId="ladder" />
          <ul className="issue-list">
            {care.issues.map((issue) => (
              <li key={issue.id} className={issue.resolved ? 'resolved' : ''}>
                <div>
                  <strong>{issue.labelKo}</strong>
                  <p>{issue.hintKo}</p>
                </div>
                <button
                  type="button"
                  className="btn ghost"
                  disabled={!playable || issue.resolved}
                  onClick={() => onResolveIssue(issue.id)}
                >
                  {issue.resolved ? '해결됨' : '고치기'}
                </button>
              </li>
            ))}
          </ul>
          {!playable && <p className="hint">정비 인터랙션은 triad GAME_READY 후 해제됩니다.</p>}
          {playable && repairDone && (
            <button type="button" className="btn primary" onClick={onLogicAdvance}>
              운전으로 이동
            </button>
          )}
        </>
      )}

      {stage === 'drive' && (
        <>
          <VehicleRenderer />
          <AssetRequired
            title="도로/운전 배경"
            detail="drive stage — 도로 배경 ASSET_REQUIRED. 동일 customization 엔티티로 이동."
          />
        </>
      )}

      {stage === 'mission' && (
        <>
          <AssetRequired asset={getAsset('ASSET_EFFECT_FIRE')} />
          <VehicleRenderer partId="hose" />
          <p className="hint">신고 → 출동 → 호스 연결 → 진압 → 구조 완료 루프는 playLoop에 정의됨.</p>
        </>
      )}

      {stage === 'reward' && (
        <AssetRequired
          asset={getAsset('ASSET_REWARD_STAR')}
          detail="보상 비트맵 승인 전 별/트로피 emoji 사용 금지."
        />
      )}

      {stage === 'growth' && (
        <p className="lead">
          Growth Engine은 이벤트·부모 리포트 데이터만 준비합니다. 가혹한 FAIL UX 없음.
        </p>
      )}
    </section>
  )
}
