# 쑥쑥놀이터 전수 분석 (Learning Core V1 기준)

## 놀이 목록 (30)

| id | title | 목적 | 난이도(1-3) | Learning 영역 |
|---|---|---|---|---|
| sound-board | 사운드보드 | 차량 소리·어휘 | 1 | music / exploration |
| car-puzzle | 자동차 퍼즐 | 부분-전체·집중 | 2 | cognition |
| color-follow | 부릉 따라하기 | 순서 기억 | 2 | cognition |
| car-paint | 색칠놀이 | 색 선택·표현 | 1 | creativity |
| story-tap | 자동차 동화 | 이야기·언어 | 1 | language |
| maze-drive | 미로 운전 | 경로·손눈협응 | 2 | cognition |
| wait-go | 참았다가 출발 | 자기조절 | 2 | life |
| car-parade | 색깔 줄세우기 | 분류 | 2 | math / cognition |
| car-builder | 자동차 만들기 | 선택·조합 | 1 | creativity / exploration |
| sand-play | 모래놀이 | 탐색·감각 | 1 | science / exploration |
| balloons | 색깔 풍선 | 색 매칭 | 1 | cognition |
| color-mix | 색깔 섞기 | 색 혼합 개념 | 2 | science / creativity |
| sticker-book | 스티커 차고 | 수집·보상 | 1 | exploration |
| hidden-cars | 숨은 자동차 | 시각 탐색 | 2 | cognition |
| rhythm-tap | 톡톡 리듬 | 박자 | 2 | music |
| vroom-race | 부릉 레이스 | 빠른 색 반응 | 2 | cognition |
| color-garage | 색깔 차고 | 색 분류 | 1 | math |
| parking | 주차 놀이 | 색 매칭 | 1 | cognition |
| find-color-car | 색깔 찾기 | 색 변별 | 1 | cognition |
| car-memory | 짝 맞추기 | 작업기억 | 2 | cognition |
| car-sounds | 소리 맞추기 | 청각·어휘 | 2 | language / music |
| shape-touch | 모양 찾기 | 도형 | 1 | math |
| bubble-pop | 방울 팡팡 | 터치·색 | 1 | creativity |
| stamp-pad | 스탬프 | 표현 | 1 | creativity |
| finger-paint | 손가락 그림 | 자유 표현 | 1 | creativity |
| pop-it | 톡톡 팝잇 | 감각·색 | 1 | life |
| traffic-light | 신호등 | 규칙·안전 | 1 | life |
| car-wash | 세차 놀이 | 역할놀이 | 1 | exploration / life |
| bus-count | 버스 세기 | 수량 1~10 | 1 | math |
| color-quiz | 색깔 퀴즈 | 색 이름 | 1 | language |

## 홈 / 선택 / 보상 / 미션 / 부모

- **홈:** 히어로 → 오늘 미션 → 지금 놀아요 → 더보기 → 탐험
- **게임 선택:** core/car/color/focus/more 필터
- **별:** `addStars`; 미션 완료 시 +1 보너스
- **스티커:** 별이 4의 배수일 때 랜덤 해금
- **오늘 미션:** 날짜 해시로 풀에서 3개
- **부모:** 이름, mute speech/sfx, 별·스티커, 자주 한 놀이

## 저장 키

- `ssuk-hanyoung-v3` (v2 마이그레이션 읽기)

## Emoji 전수

| 분류 | 위치 | 조치 |
|---|---|---|
| A UI | GameShell/Explore/GamePlay `←`, ColorQuiz `🔊` | Visual/SVG로 교체 |
| B 게임오브젝트 | vehicles `CAR_EMOJIS` (미사용) | 제거/레지스트리 |
| C 캐릭터 | vehicles.ts emoji 필드 | 데이터 정리, 렌더 없음 |
| D 보상 | 없음 (이미지 사용) | — |
| E 장식 | ColorQuiz 🔊 | VisualIcon |
| F placeholder | 없음 | — |
