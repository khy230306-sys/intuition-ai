# ORBIS Prototype

**ORBIS** — Every Round Creates a New Story

Stage 1 프로토타입입니다. 브랜드 아이덴티티, 반응형 UI, 궤도 애니메이션, 설정, 다국어, PWA 구조를 제공합니다.

> 실제 금전 거래, 입금, 출금, 환전, 결제, 배당, 게임 결과, 외부 베팅 연결은 포함하지 않습니다.

## 설치

```bash
cd ORBIS
npm install
```

## 실행

```bash
npm run dev
```

기본 주소: `http://localhost:5173`

같은 Wi-Fi의 모바일에서는 터미널에 표시되는 Network 주소로 접속합니다.

## 빌드

```bash
npm run build
npm run preview
```

## 테스트 / 린트

```bash
npm run lint
npm run test
```

## 주요 기능

- ORBIS 브랜드 로고 / 색상 / 슬로건
- Home 중앙 CORE + BLUE / GOLD / VIOLET Orb 궤도 애니메이션
- **ORBIS ALIGN** (`/play`) — 궤도 게이트를 CORE 광선에 맞추는 스킬/퍼즐 게임
- Brand / About / Settings / 404 페이지
- 한국어 / 영어 전환
- 사운드 토글 (Web Audio API, 기본 무음)
- 애니메이션 품질 및 모션 감소 옵션
- localStorage 설정 및 데모 에너지 저장
- PWA manifest + 서비스 워커

## 폴더 구조

```text
ORBIS/
  docs/
  public/
  src/
    app/
    brand/
    components/
    pages/
    layout/
    animation/
    i18n/
    storage/
    styles/
    assets/
    tests/
```

## 기술 스택

- React + TypeScript + Vite
- React Router
- ESLint + Oxlint
- Vitest + Testing Library
- vite-plugin-pwa
