# AIZIO 고정 주소

## 프로덕션 (정식)

## https://jarvis-app.shipstatic.com

**공유·정식 사용 주소는 이것입니다.**  
별도의 `?nav=1` / `?customers=1` 주소를 나누어 쓰지 않습니다.  
앱을 연 뒤 **메뉴**에서 기능을 선택합니다.

### 사용 방법

1. https://jarvis-app.shipstatic.com 접속  
2. 하단 또는 상단 **메뉴** 탭  
3. 원하는 기능 선택  

| 메뉴 | 기능 |
| --- | --- |
| 길안내 | AIZIO 내부 지도 · 경로 |
| 손님관리 | 로컬 CRM |
| 일정 · 할 일 | 생활 |
| 가족 / 친구 | 소통 |
| 번역 | 글로벌 번역 |
| 설정 | API 키 · 푸시 · 진단 등 |

- 재배포: `cd Jarvis && npm run deploy:web` (소유자 승인 후에만)

## Preview (검증 전용 · 고정)

## https://light-lab.shipstatic.com

`npm run deploy:preview`는 스냅샷을 올린 뒤 **이 도메인만** 다시 가리킵니다.  
프로덕션 `jarvis-app`은 건드리지 않습니다.

- 예전 북마크 `https://light-lab-92m8bq7.shipstatic.com` 은 배포 ID 스냅샷이라 도메인으로 고정할 수 없습니다.
- 그 주소에서 **앱 업데이트**를 누르면 `https://light-lab.shipstatic.com` 으로 한 번에 이동합니다.
- 랜덤 `*.shipstatic.com` 스냅샷 URL은 공유하지 마세요.
