# 쑥쑥놀이터 NEW · 자동차 공방

상용 어린이 앱 Visual System을 위한 공방 앱입니다.

**이 앱은 아이지오 스튜디오(AIZIO Studio)와 다른 프로그램입니다.**  
아이지오 스튜디오는 별도 폴더 [`../aizio-studio`](../aizio-studio)에 있습니다.

## 최상위 규칙

[`docs/VISUAL_ASSET_CONSTITUTION.md`](docs/VISUAL_ASSET_CONSTITUTION.md)

**REFERENCE ≠ ASSET** — Visual Bible은 style reference only.  
임시 SVG · Emoji · crop · hue-filter 자동차로 빈 공간을 채우지 않습니다.

## Prototype 01 flow

`선택 → 조립 → 색칠 → 세차 → 정비 → 운전 → 미션 → 보상 → 성장`

## 기준 Asset 트라이어드 (먼저 확정)

1. 쑥쑥이 Character Bible
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
