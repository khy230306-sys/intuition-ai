# AIZIO 고정 주소

## 프로덕션 (정식)

## https://jarvis-app.shipstatic.com

**공유·정식 사용 주소는 이것입니다.**  
앱을 연 뒤 **메뉴**에서 기능을 선택합니다.

- 재배포: `cd Jarvis && npm run deploy:web` (소유자 승인 후에만)

## Preview (검증 전용 · 고정)

## https://lightlab-92m8bq7.shipstatic.com

`npm run deploy:preview`는 스냅샷을 올린 뒤 **이 도메인(+ alias `light-lab`)** 만 다시 가리킵니다.  
프로덕션 `jarvis-app`은 건드리지 않습니다.

### 홈 화면 앱

1. Safari로 https://lightlab-92m8bq7.shipstatic.com 접속  
2. 공유 → **홈 화면에 추가**  
3. 이후 설정 → **앱 업데이트** → 같은 주소에서 캐시 지우고 최신판을 한 번에 받음  

### 예전 주소 `light-lab-92m8bq7` (하이픈 포함)

ShipStatic이 배포 ID 형태 이름을 도메인으로 고정할 수 없습니다.  
예전 북마크/홈 화면 아이콘은 Safari에서 **lightlab-92m8bq7** 로 다시 추가하세요.
