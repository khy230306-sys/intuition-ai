# JARVIS — iPhone 만능 AI 비서

iPhone Safari에서 앱처럼 쓰는 개인 AI 비서 PWA입니다.

## 주요 기능

- **대화형 비서** — 한국어 명령/질문
- **음성 입·출력** — 마이크 인식 + 답변 TTS
- **빠른 실행** — YouTube, 카카오톡, 지도, 날씨, 메모 등
- **기억 / 할 일** — 로컬 저장 (오프라인 가능)
- **계산 · 검색 · 번역 · 전화/문자**
- **선택적 OpenAI API** — 설정에 키를 넣으면 자유 대화

## 바로 사용 (iPhone)

**앱 URL:** https://hypnotic-ion-ll4e700.shipstatic.com

1. iPhone **Safari**로 위 주소를 엽니다.
2. 공유 버튼 → **홈 화면에 추가**
3. 홈 화면의 **JARVIS** 아이콘으로 실행

> ShipStatic 무료 배포는 만료될 수 있습니다. 만료 전 claim 하거나 `npm run deploy:web`으로 다시 배포하세요.

## 로컬 실행

```bash
cd Jarvis
npm install
npm run dev
```

```bash
npm test
npm run build
npm run deploy:web
```

## 예시 명령

- `지금 몇 시야`
- `계산 25*8`
- `기억해 와이파이는 cafe1234`
- `와이파이 뭐였지`
- `할 일 장보기`
- `유튜브 열어`
- `강남역 지도`
- `서울 날씨`
- `도움말`

## 참고

API 키 없이도 로컬 비서 기능은 동작합니다. 키는 기기의 브라우저에만 저장되며 백업 내보내기에는 포함되지 않습니다.
