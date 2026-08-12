type Props = {
  title: string
  detail?: string
}

export function AssetRequired({ title, detail }: Props) {
  return (
    <div className="asset-required cardish" role="status">
      <div className="asset-required-badge">Asset Required</div>
      <strong>{title}</strong>
      {detail ? <p>{detail}</p> : null}
      <p className="asset-required-note">
        Visual Bible / 스크린샷 crop / emoji / 저품질 placeholder는 사용하지 않습니다.
        독립 production 에셋이 준비되면 활성화됩니다.
      </p>
    </div>
  )
}
