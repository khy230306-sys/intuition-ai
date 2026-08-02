# DoriJitGoTtaeng PICK AI

도리짓고땡 바닥 3장 숫자를 입력하면, 누적 데이터를 학습해 **1·2·3번 위치 승리 확률**과 추천 위치를 즉시 계산하는 모바일 우선 PWA입니다.

기존 FlowMate 프로젝트와 **완전히 분리**된 독립 앱입니다. 데이터는 브라우저(LocalStorage)에만 저장됩니다.

## 실행 URL

### 지금 바로
**https://flashy-shard-5dq95av.shipstatic.com**

### 영구 사용 (택 1, 약 1분)
자세한 단계: [PERMANENT_HOSTING.md](./PERMANENT_HOSTING.md)

1. **GitHub Pages (권장)**  
   https://github.com/khy230306-sys/intuition-ai/settings/pages  
   → Source: Deploy from a branch → `gh-pages` / `/ (root)` → Save  
   → **https://khy230306-sys.github.io/intuition-ai/**

2. **ShipStatic 클레임**  
   https://my.shipstatic.com/claim/0d8c19e85c2519a9a113887f982cc346b4a138cb07037da579797e78dfea11ca  
   → Google 로그인 1회 → 현재 URL 영구 유지

## 로컬 실행
```bash
cd DoriJitGoTtaeng-PICK-AI
npm install
npm run dev
```
- 개발: `http://localhost:5173/`
- 미리보기: `npm run build && npm run preview` → `http://localhost:4173/`

## iPhone 홈 화면 설치

1. **Safari**로 HTTPS 앱 URL을 엽니다.
2. 공유 버튼(□↑)을 탭합니다.
3. **홈 화면에 추가**를 선택합니다.
4. 추가된 아이콘으로 실행하면 전체 화면(standalone) 앱처럼 동작합니다.

## 사용법

1. 중앙 숫자 버튼(1~10)을 3번 누릅니다 → 즉시 AI 분석.
2. 게임 종료 후 **① ② ③** 중 승리 위치를 누르면 저장·재학습.
3. 하단 **통계 / 데이터**에서 승률·검색·CSV·백업·초기화.

## 스크립트

| 명령 | 설명 |
|------|------|
| `npm run dev` | 개발 서버 |
| `npm run build` | 프로덕션 빌드 |
| `npm run preview` | 미리보기 |
| `npm run deploy:web` | ShipStatic 미러 배포 |
| `npm test` | 단위 테스트 |
