import { getAsset, isWorkshopPlayable, type FireTruck01PartId } from '../assets/registry'
import { AssetRequired } from './AssetRequired'

type Props = {
  /** When true, only render if triad is Quality-Gate approved. */
  partId?: FireTruck01PartId
}

/**
 * Production vehicle rendering — registry paths only.
 * Temp SVG / CSS cars / emoji are constitution-forbidden and never drawn here.
 */
export function VehicleRenderer({ partId }: Props) {
  if (!isWorkshopPlayable()) {
    const sample = getAsset('ASSET_FIRETRUCK_BODY')
    return (
      <AssetRequired
        asset={sample}
        detail={
          partId
            ? `파츠 ${partId} 포함 FIRE_TRUCK_01 전체가 Quality Gate 승인 전입니다.`
            : 'FIRE_TRUCK_01 + 쑥쑥이 + 공방 승인 전 — 임시 그래픽으로 조립/운전을 시연하지 않습니다.'
        }
      />
    )
  }

  // Future: resolve APPROVED paths via getAsset(...).path and compose parts.
  return (
    <AssetRequired
      title="Renderer awaiting approved bitmaps"
      detail="Registry APPROVED 경로가 연결되면 파츠 합성 렌더러가 활성화됩니다."
    />
  )
}
