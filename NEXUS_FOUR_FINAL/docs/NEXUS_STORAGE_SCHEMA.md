# 저장 구조 (IndexedDB / Dexie)

## 기본 원칙
- IndexedDB(Dexie)를 기본 저장소로 사용합니다.
- localStorage는 본 구현에서 최소화되어 있으며, UI 설정/마이그레이션은 주로 IndexedDB에 저장합니다.

## Dexie 스키마(버전 1)
- `appSettings` : key = 'appSettings'
- `gameResults` :  
  - `id` (unique)
  - `shoeId`
  - `tableId`
  - `roundId`
  - `roundIndex` (순서/정렬용)
  - `tableChangedAt`
  - `timestamp`
  - `actual` : 'PLAYER' | 'BANKER' | 'TIE'
  - `dataSource` : 'local' | 'scanner'
- `balanceSnapshots` :  
  - `id`, `shoeId`, `tableId`, `roundIndex`, `timestamp`, `playerTotal`, `bankerTotal`, `tieTotal`, `meta?`
- `engineSelectionHistory` : (현재 UI에서 선택 히스토리 표시는 최소화, 기본 적재 구조만 존재)
- `martingaleState` : key = 'martingaleState'
- `scannerEvents` : 스캐너 이벤트 로그

## JSON 백업/복원
- UI에서 “데이터 내보내기” → JSON 다운로드
- “가져오기” → JSON 파일 업로드 후 스키마 검증(zod) 및 저장

## 손상 데이터 격리
- import 시 zod 스키마가 맞지 않으면 예외를 발생시켜 중단합니다.

