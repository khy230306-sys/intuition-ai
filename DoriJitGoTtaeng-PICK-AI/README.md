# DoriJitGoTtaeng PICK AI

도리짓고땡 바닥 3장 숫자를 입력하면, 누적 데이터를 학습해 **1·2·3번 위치 승리 확률**과 추천 위치를 즉시 계산하는 모바일 우선 PWA입니다.

## 실행 URL (지금 바로)

**https://astral-mirror-pbs5r5h.shipstatic.com**

> 이전 URL은 만료되었습니다. 404가 나오면 아래 명령으로 재배포하세요.

```bash
cd DoriJitGoTtaeng-PICK-AI
npm install
npm run build && npm run deploy:web
```

영구 보관(클레임): https://my.shipstatic.com/claim/5f0761fa2716f2481ca4ddfb78b6be0f

## GitHub Pages (영구 · 설정 1회 필요)

**https://khy230306-sys.github.io/intuition-ai/**

Settings → Pages → Deploy from branch → `gh-pages` / `/ (root)` → Save  
자세한 안내: [PERMANENT_HOSTING.md](./PERMANENT_HOSTING.md)

## 로컬 실행

```bash
cd DoriJitGoTtaeng-PICK-AI
npm install
npm run dev
```

- 개발: `http://localhost:5173/`
- 미리보기: `npm run build && npm run preview`

## iPhone 홈 화면 설치

1. Safari로 HTTPS URL 열기
2. 공유(□↑) → **홈 화면에 추가**
3. 아이콘으로 앱처럼 실행

## 사용법

1. 숫자 버튼(1~10) 3번 → 즉시 AI 분석
2. 게임 후 **① ② ③** 승리 위치 입력 → 저장·재학습
3. **통계 / 데이터**에서 승률·CSV·백업
