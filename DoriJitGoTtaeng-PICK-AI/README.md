# DoriJitGoTtaeng PICK AI

도리짓고땡 바닥 3장 숫자를 입력하면, 누적 데이터를 학습해 **1·2·3번 위치 승리 확률**과 추천 위치를 즉시 계산하는 모바일 우선 PWA입니다.

기존 FlowMate 프로젝트와 **완전히 분리**된 독립 앱입니다. 데이터는 브라우저(LocalStorage)에만 저장됩니다.

## 실행 URL

### 공개 HTTPS (지금 바로 사용)
**https://runic-grid-3r1dfyp.shipstatic.com**

iPhone Safari에서 위 주소를 연 뒤 홈 화면에 추가하면 됩니다.  
(익명 배포는 약 3일 후 만료될 수 있습니다. 영구 보관: [클레임 링크](https://my.shipstatic.com/claim/7ef4eede184c5e9615f226839239fe3d97cad2a1bd99af2d7b0be938c7246dab))

재배포:
```bash
npm run build && npm run deploy:web
```

### 로컬
```bash
cd DoriJitGoTtaeng-PICK-AI
npm install
npm run dev
```
- 개발: `http://localhost:5173/`
- 미리보기: `npm run build && npm run preview` → `http://localhost:4173/`

### GitHub Pages (영구 HTTPS)
목표 URL: **https://khy230306-sys.github.io/intuition-ai/**

1. 저장소 **Settings → Pages**
2. Source: **Deploy from a branch** → branch `gh-pages` / folder `/ (root)`  
   또는 Source: **GitHub Actions** (워크플로 `Deploy PICK AI to GitHub Pages` 사용)
3. 저장 후 1~2분 뒤 위 URL로 접속

`gh-pages` 브랜치에는 최신 정적 빌드가 이미 푸시되어 있습니다.

## iPhone 홈 화면 설치

1. **Safari**로 HTTPS 앱 URL을 엽니다.
2. 공유 버튼(□↑)을 탭합니다.
3. **홈 화면에 추가**를 선택합니다.
4. 추가된 아이콘으로 실행하면 전체 화면(standalone) 앱처럼 동작합니다.
5. Service Worker 캐시로 **오프라인에서도 저장된 데이터 조회·분석**이 가능합니다.

## 사용법

1. 중앙 숫자 버튼(1~10)을 3번 누릅니다 → 자동으로 1·2·3번 슬롯에 입력되고 즉시 AI 분석.
2. 게임 종료 후 **① ② ③** 중 승리 위치를 누르면 저장되며 AI가 재학습합니다.
3. 하단 **통계 / 데이터**에서 승률·검색·CSV·백업·초기화를 사용합니다.

## AI 엔진

| 엔진 | 내용 |
|------|------|
| 1 | 숫자 기반 |
| 2 | 위치 기반 |
| 3 | 숫자+위치 조합 (동일·순서무시) |
| 4 | 최근 흐름 (30/50/100 + 연승) |
| 5 | 전체 누적 (전체·최근300) |

최종 추천은 엔진별 가중 종합입니다.

## 스크립트

| 명령 | 설명 |
|------|------|
| `npm run dev` | 개발 서버 |
| `npm run build` | 타입체크 + 프로덕션 빌드 |
| `npm run preview` | 빌드 결과 미리보기 |
| `npm test` | 단위 테스트 |

## 기술

- Vite + TypeScript
- vite-plugin-pwa (manifest · Service Worker · 오프라인 캐시)
- LocalStorage + 자동 JSON 백업
- GitHub Actions → GitHub Pages 배포
