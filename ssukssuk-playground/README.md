# 쑥쑥놀이터 NEW · 자동차 공방

상용 어린이 앱 Visual System을 위한 공방 앱입니다.

## 최상위 규칙

[`docs/VISUAL_ASSET_CONSTITUTION.md`](docs/VISUAL_ASSET_CONSTITUTION.md)

**REFERENCE ≠ ASSET** — Visual Bible은 style reference only.  
임시 SVG · Emoji · crop · hue-filter 자동차로 빈 공간을 채우지 않습니다.  
없는 상태가 잘못된 그래픽보다 낫습니다.

## 기준 Asset 트라이어드 (먼저 확정)

1. 쑥쑥이 Character Bible (idle/walk/run/…)
2. `FIRE_TRUCK_01` 파츠 세트
3. 자동차 공방 배경·소품

Quality Gate `APPROVED` 후에만 조립·색칠·운전·미션 그래픽이 활성화되고,  
그 다음에 굴착기·덤프·구급차·경찰차·크레인으로 확장합니다.

## Run

```bash
cd ssukssuk-playground
npm install
npm run dev
npm test
npm run build
```

## Structure

```
docs/VISUAL_ASSET_CONSTITUTION.md
src/assets/registry/          # central Asset Registry (IDs only)
src/entity/                   # Vehicle Entity + paint design persistence
src/components/AssetRequired  # constitution empty state
public/assets/                # APPROVED bitmaps only (slots today)
```
