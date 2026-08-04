# AI 밸런스 엔진 (AI Balance Engine)

## 목적
실제 PLAYER/BANKER 금액 변화 패턴에서 “낮은 쪽이 유리해질 수 있는 구간”을 조건부로 탐지합니다.

## 데이터 수집(현재 구현)
- `balance_snapshot` 메시지에서 `playerTotal`, `bankerTotal`, `tieTotal`을 저장합니다.
- 예측 대상 라운드 이전까지의 스냅샷을 사용합니다.

## 진입 로직(현재 구현)
1. 최신 스냅샷에서 `ratioDiff = |player-banker| / (player+banker)`를 계산합니다.
2. “낮은 쪽(lowerSide)”을 `player <= banker ? PLAYER : BANKER`로 결정합니다.
3. 과거에 `ratioDiff`가 유사한 스냅샷들에서, lowerSide가 실제 승리였던 비율을 모읍니다.
4. 유사 표본 수가 충분하고, Wilson 하한이 랜덤 기준을 넘는 경우에만 ENTRY,
   아니면 WAIT를 출력합니다.

## 표시
- 이 엔진은 “WAIT일 때도 데이터가 없거나 표본이 부족하면 WAIT”로 명확히 표시합니다.

## 주의
- 예측은 결과 보장을 하지 않습니다.

