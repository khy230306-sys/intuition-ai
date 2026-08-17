# 아이지오 스튜디오 고정 주소

## 고정 URL (항상 이것만 공유)

**https://aizio-studio.shipstatic.com**

Campus 고정 주소(`https://aizio-campus.shipstatic.com`)와 같은 ShipStatic 패턴입니다.  
랜덤 스냅샷 URL(`*.shipstatic.com` 일회성)은 공유하지 마세요.

## 배포

```bash
cd ssukssuk-playground
# SHIP_API_KEY 필요 (환경 시크릿 또는 ~/.ship-api-key)
npm run deploy:web
```

스크립트가 빌드 → 업로드 → `aizio-studio` 도메인을 최신 스냅샷으로 연결합니다.

## 상태

| 항목 | 값 |
|------|-----|
| Fixed host | `aizio-studio.shipstatic.com` |
| App | AIZIO STUDIO · 쑥쑥놀이터 NEW |
| Deploy command | `npm run deploy:web` |
| API key env | `SHIP_API_KEY` |

키가 없으면 고정 도메인 연결이 불가합니다. 키를 넣은 뒤 위 명령을 실행하면 주소가 살아납니다.

## 현재 스냅샷 (2026-08-17)

고정 도메인 연결 전 임시 배포:

- **Live:** https://blazing-bead-x2m8625.shipstatic.com
- **Claim (소유권 → aizio-studio 연결):** https://my.shipstatic.com/claim/e658135c60584382f02ce905eecc3241

Claim 후 대시보드에서 이름을 `aizio-studio`로 지정하면 고정 URL이 활성화됩니다.
