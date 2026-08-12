import type { AssetSpec } from '../assets/registry'

type Props = {
  asset?: AssetSpec
  title?: string
  detail?: string
}

/** Constitution-compliant empty state — never fills with emoji/temp SVG/crops. */
export function AssetRequired({ asset, title, detail }: Props) {
  const heading = title ?? asset?.labelKo ?? 'Asset'
  return (
    <div className="asset-required cardish" role="status" data-asset-id={asset?.id}>
      <div className="asset-required-badge">ASSET_REQUIRED</div>
      <strong>{heading}</strong>
      {asset && <code className="asset-id">{asset.id}</code>}
      {detail ? <p>{detail}</p> : null}
      {asset && (
        <ul className="asset-spec-list">
          <li>
            <span>사용 위치</span>
            {asset.usage}
          </li>
          <li>
            <span>크기</span>
            {asset.size.w}×{asset.size.h}px
          </li>
          <li>
            <span>투명 배경</span>
            {asset.transparentBackground ? '필요' : '불필요'}
          </li>
          {asset.partStructure && (
            <li>
              <span>파츠 구조</span>
              {asset.partStructure.join(', ')}
            </li>
          )}
          {asset.states && (
            <li>
              <span>상태</span>
              {asset.states.join(', ')}
            </li>
          )}
          {asset.animationRequirements && (
            <li>
              <span>애니메이션</span>
              {asset.animationRequirements}
            </li>
          )}
        </ul>
      )}
      <p className="asset-required-note">
        없는 상태가 잘못된 그래픽보다 낫다. Emoji · 임시 SVG · crop · hue-filter 금지. (VISUAL ASSET
        CONSTITUTION V1)
      </p>
    </div>
  )
}
