# 종합 멀티 엔진 (NEXUS FOUR FINAL)

## 개요
종합 멀티 엔진은 여러 독립 엔진들의 최근 성과를 비교하여,
현재 가장 신뢰할 수 있는 엔진을 선택하고, 선택 엔진의 방향/ENTRY 상태를 다음 라운드 신호로 사용합니다.

## 최소 표본
- 엔진별 최근 샘플 수(total)가 `multiEnsemble.minSampleDefault` 이상일 때만 “선택 대상”으로 강하게 반영합니다.
- 최소 표본이 충족되지 않으면 UI에서는 다음 신호를 **WAIT**로 강제합니다.

## 평가 지표(현재 구현)
- Wilson 95% 하한(wilsonLowerBound): `successes/total` 기반 보수적 적중률
- 최근 20/50/100 적중률(단순 비율)
- 연속 미적중 수 / 최대 낙폭 근사
- 랜덤 기준 대비 초과 성과(약한 가중치)

## 과적합 방지(간단 히스테리시스)
- reevaluateEveryRounds에 따라 재평가
- 교체 임계값(replacementMinDelta)은 기본 3점으로 적용
- 최소 유지 판수(minKeepRounds)는 기본 10판으로 적용

## 선택 결과 출력
- 선택 엔진
- 엔진별 점수 목록(엔진 카드)
- 관망/진입(ENTRY/WAIT)

