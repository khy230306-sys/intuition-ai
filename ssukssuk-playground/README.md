# 아이지오 스튜디오 · 쑥쑥놀이터 NEW · 자동차 공방

**AIZIO Studio** kids production shell for Prototype 01 (firetruck workshop).

## 최상위 규칙

[`docs/VISUAL_ASSET_CONSTITUTION.md`](docs/VISUAL_ASSET_CONSTITUTION.md)

**REFERENCE ≠ ASSET** — Visual Bible은 style reference only.  
임시 SVG · Emoji · crop · hue-filter 자동차로 빈 공간을 채우지 않습니다.  
없는 상태가 잘못된 그래픽보다 낫습니다.

## Prototype 01 flow

`선택 → 조립 → 색칠 → 세차 → 정비 → 운전 → 미션 → 보상 → 성장`

세차·정비 **로직**은 준비되어 있고, 그래픽은 Baseline Triad Quality Gate 후에만 열립니다.

## 기준 Asset 트라이어드 (먼저 확정)

1. 쑥쑥이 Character Bible (idle/walk/run/…)
2. `FIRE_TRUCK_01` 파츠 세트
3. 자동차 공방 배경·소품

Drop masters → [`incoming/external-production/README.md`](incoming/external-production/README.md)

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
docs/audits/STUDIO_CONTINUE_01.md
src/studio/stageFlow.ts          # wash/repair included
src/entity/careOps.ts            # wash + repair logic
src/assets/registry/             # central Asset Registry (IDs only)
src/components/StudioStagePanel  # gated stage UI
public/assets/                   # APPROVED bitmaps only (slots today)
```
