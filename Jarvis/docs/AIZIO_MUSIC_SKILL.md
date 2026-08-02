# AIZIO Music Skill

독립 모듈 경로: `src/music/`

## 구현 완료

- 음악 의도 분류 (`musicIntent.ts`) — 애매하면 일반 AI로 통과
- 분위기·상황 추출 및 검색어 생성
- 제공자 어댑터 (`youtube`, `youtube_music`, `spotify`, `apple_music` 검색 URL)
- 세션·선호 저장 (`jarvis.music.session.v1`, `jarvis.music.preferences.v1`)
- 대화창 재생 칩 + 하단 미니 플레이어 (Safe Area 고려)
- 사용자 터치 후에만 외부 URL 오픈 (`navigateHref`)
- ko / en / ja / vi 문구
- HTTPS·허용 도메인 URL 검증
- 단위 테스트 (`musicIntent`, `musicSearch`, `musicSkill`)

## 연결되지 않은 항목 (의도적)

| 항목 | 상태 |
|------|------|
| YouTube Data API 검색 | 미연결 — API 키 필요 (`MUSIC_PROVIDER_SETUP.md`) |
| Spotify / Apple Music OAuth·재생 | 인터페이스만 — 계정·키 필요 |
| 기기 볼륨 직접 제어 | 불가 — 외부 앱은 휴대폰 볼륨 안내 |
| 자동재생 | 모바일 정책상 차단 — 재생 버튼 필수 |
| 비공식 스트림/다운로드 | 구현하지 않음 |

## 재생 방식 (v1)

1. 사용자가 “조용한 음악 틀어줘” 등 요청
2. AIZIO가 검색어를 만들고 YouTube(또는 설정한 제공자) **검색 URL**을 준비
3. “재생할 음악을 준비했어요” + **음악 재생** 버튼
4. 탭하면 공식 웹/앱으로 이동 (`opened_external` — 실제 재생 성공으로 단정하지 않음)

## 실기기 미확인

- iPhone Safari / Android Chrome 실기기: **미확인** (Cloud Agent 환경)
- 수동 절차: `docs/MOBILE_AUTOPLAY_LIMITATIONS.md` 참고
