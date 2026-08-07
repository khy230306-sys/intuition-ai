# HOLDEM EDGE · 홀덤 엣지

홀덤 홀카드·바닥카드를 입력하면 **승률(몬테카를로)** 을 계산하고 **배팅 전략**을 안내하는 웹앱입니다.

## 사용 방법

1. 내 홀카드 2장 입력 (숫자 + 무늬)
2. 상대 수·포지션 선택
3. 플랍 → 턴 → 리버 순으로 바닥 카드 입력
4. 각 단계마다 승률·추천 액션(폴드/콜/레이즈/올인) 확인
5. 핸드가 끝나면 **승/패/폴드**로 저장 → 다음 핸드 계속
6. 상단 **오늘 흐름 분석**에서 당일 승률 추이·모멘텀·누적 패턴 확인

세션 데이터는 브라우저 localStorage에 날짜별로 저장됩니다.

## 접속 주소

**https://holdem-edge.tiiny.site**

(백업 터널) https://device-castle-conf-dealt.trycloudflare.com

## 실행

```bash
cd HOLDEM_STRATEGY
npm install
npm run dev
```

## 테스트

```bash
npm test
npm run build
```
