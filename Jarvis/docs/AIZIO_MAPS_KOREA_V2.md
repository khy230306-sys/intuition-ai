# AIZIO 길안내 · 한국 지도 강화 (Maps Korea v2) — legacy external handoff

**Status (1.16+):** Default navigation is **AIZIO Navigation v2 (in-app)**.  
This document describes the **secondary** 「다른 지도에서 열기」 handoff (Kakao / TMAP / Naver).  
See `AIZIO_NAVIGATION_V2_ARCHITECTURE.md` for the current default.

**Version:** 1.15.6 (external-map era)  
**Preview (historical):** https://hyper-cluster-i63ofol.shipstatic.com/?nav=1

## 왜 Apple 기본이 약했나

한국 장소명(예: 사천백천사)은 Apple/Google보다 **카카오·T맵·네이버** POI 데이터가 강합니다.  
v2부터 기본/자동 정책을 한국 지도 우선으로 바꿨습니다.

## 자동 선택

| 조건 | 기본 지도 |
|------|-----------|
| 한국어 또는 Asia/Seoul | **카카오맵** |
| 그 외 iPhone | Apple 지도 |
| 그 외 | Google 지도 |

신규 설정의 기본값: **카카오맵**, 이동수단 **자동차**.

## 지원 지도

| 앱 | 앱 스킴 | 웹 폴백 |
|----|---------|---------|
| 카카오맵 | `kakaomap://` | `map.kakao.com/link/to|search` |
| T맵 | `tmap://route|search` | 카카오맵 웹 (T맵 웹 API키 불필요) |
| 네이버지도 | `nmap://` | `map.naver.com/v5/search` |
| Apple / Google | 기존 | 기존 |

## 사용

- 길안내 시트에서 **카카오맵 / T맵 / 네이버** 버튼 선택 후 길찾기
- 대화: 「사천백천사로 안내해 줘」「티맵으로 열어줘」「카카오맵으로 바꿔줘」
- 설정 → 길안내 및 지도 → 기본 지도 앱

## 지원하지 않음

- AIZIO 내 실시간 턴바이턴·차선·음성 안내 UI
- T맵 Open API 키 기반 서버 경로 계산 (앱 핸드오프만)

경로·교통 정확도는 각 지도 앱을 따릅니다.
