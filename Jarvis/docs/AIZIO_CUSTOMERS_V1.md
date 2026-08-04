# AIZIO 손님관리 v1

**Audience:** 소상공인·개인 비즈니스를 위한 간단한 손님(고객) 명단  
**Storage:** 이 기기 `localStorage`만 (`jarvis_customers_v1`) — 서버 동기화 없음  
**Version:** 1.15.5

## Features

- 이름 / 생년월일 / 전화(선택) / 메모(선택) 저장
- 이름·메모·전화로 즉시 검색
- 오늘 생일인 손님 표시
- 대화·음성 명령으로 추가·검색·목록
- 백업 JSON에 `customers` 카테고리 포함 (명시적 내보내기 시)

## Entry points

| Path | How |
|------|-----|
| HOME v2 전체 → 비즈니스 → 손님관리 | `data-view="customers"` |
| URL | `?view=customers` 또는 `?customers=1` |
| Chat | 「손님관리」「손님 추가 …」「손님 ○○ 찾아줘」 |
| Preview | https://encoded-mesh-r5a5fkf.shipstatic.com/?customers=1 |

## Chat examples

- 손님관리 열어줘
- 손님 추가 김철수 1990-05-15 단골
- 손님 김철수 찾아줘
- 오늘 생일인 손님
- 손님 목록
- 손님 삭제 김철수

## Privacy

- 좌표·주소 없음
- 진단 JSON에는 `count` / `withBirthday` / `withPhone`만 (이름·전화·생일 제외)
- 가족·친구 방과 분리 — P2P 동기화 대상 아님

## Not in v1

- 클라우드 CRM / 다중 기기 실시간 동기화
- 예약·방문 이력 그래프
- 마케팅 자동 발송
