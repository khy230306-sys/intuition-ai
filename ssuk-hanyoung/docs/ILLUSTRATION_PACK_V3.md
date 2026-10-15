# Premium Illustration Pack V3

> **GRAPHIC FREEZE ACTIVE** — 자세한 금지/허용 목록은 [`GRAPHIC_FREEZE.md`](./GRAPHIC_FREEZE.md).  
> 승인 파일 전달 전까지 신규 일러스트 생성·스타일 변경·TEMP→REAL 승격 금지.

## 정책

- **REAL**: 승인된 WebP/PNG 일러스트 (프로덕션 우선)
- **TEMP**: 개발용 SVG 슬롯 (교체 대기) — “완료”로 간주하지 않음
- **FALLBACK**: REAL 누락 시 동일 카테고리 REAL 또는 안전 TEMP

emoji fallback 금지. 조악한 자동 SVG를 REAL로 올리지 않음.

## 디렉터리 규약

```
public/assets/suksuk/
  characters/hani/hani-{idle,happy,celebrate,thinking,encourage,sad,surprised}.webp
  characters/youngi/youngi-{...}.webp
  categories/{language,math,cognition,science,creativity,music,life,exploration}.webp
  animals/{dog,cat,...}.webp
  emotions/{happy,sad,...}.webp
  nature/{sun,cloud,...}.webp
  food/{apple,banana,...}.webp
  places/{home,school,...}.webp
  rewards/{badge,gift,crown,medal,sticker}.webp
```

권장 크기: 카드 256–384px, 캐릭터 원본 768–1024px, WebP, 투명 배경.

## 현재 REAL

기존 승인 자동차·보상 WebP (`/assets/chars/sm|md/*`)만 REAL.

## 실제 일러스트 필요 (TEMP)

한이/영이 14상태, 카테고리 8, 동물 19, 감정 8, 자연 10, 음식 6, 장소 12, 보상 일부(badge/gift/crown/medal).
