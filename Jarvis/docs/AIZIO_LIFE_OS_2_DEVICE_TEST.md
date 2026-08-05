# AIZIO Life OS 2.0 — Device Test (cards UI)

**App version target:** 1.20.2+  
**Channel:** Preview snapshot preferred (not production).

**Preview (v1.20.3):** https://melded-tide-8l99bvg.shipstatic.com  
**Commit:** `d0fedb7`  
**홈 화면 추가:** Preview가 아니라 https://jarvis-app.shipstatic.com (Safari 공유)
**Production URL (do not overwrite in this task):** https://jarvis-app.shipstatic.com

## Status legend

- 통과 / 실패 / **미확인**

## Prep

1. Open Preview URL from deploy report (or local `npm run preview`).
2. Confirm `build-meta.json`: version, commit, `channel: preview`.
3. Grant mic / notifications only when a case needs them (user action).

## Cases

| # | Input | Expected card | Buttons | Actual | Pass | Capture | Diag JSON |
|---|-------|---------------|---------|--------|------|---------|-----------|
| 1 | 오늘 뭐 해야 해? | `context_summary` | 자세히 | 미확인 | | chat | optional |
| 2 | 지금 가장 중요한 일이 뭐야? | `priority_recommendation` | 자세히 | 미확인 | | chat | |
| 3 | 오늘 일정이 바빠? | `context_summary` (busy) | 자세히 | 미확인 | | chat | |
| 4 | 30분 동안 AIZIO 개발에 집중할래. | `focus_session` active | 종료 | 미확인 | | chat | |
| 5 | 집중 상태 보여줘. | `focus_session` | 종료/자세히 | phrase-smoke 통과 (실기기 미확인) | | chat | |
| 6 | Background 10s then reopen | remaining time from timestamp | — | 미확인 | | | |
| 7 | 집중 끝. | `focus_session` completed | — | 미확인 | | chat | |
| 8 | 출근 Routine 후보 보여줘. | `habit_candidate` or empty text | 저장/무시/거절 | phrase-smoke 통과 (실기기 미확인) | | chat | |
| 9 | Habit 거절 후 다시 후보 | 재표시 없음 | — | 미확인 | | | |
| 10 | 퇴근하면 집으로 길 안내하고 잔잔한 음악 준비해줘. | `automation_plan` | 저장/취소 | 미확인 | | chat | |
| 11 | 자동화 저장 | plan saved message | — | 미확인 | | | |
| 12 | AIZIO 출시 목표 다음 할 일 알려줘. | `goal_coach` | 자세히 | 미확인 | | chat | |
| 13 | 네비게이션 관련 아이디어 찾아줘. | `knowledge_results` or empty | 더 보기 | phrase-smoke 통과 (실기기 미확인) | | chat | |
| 14 | 모닝 브리프. | `morning_brief` | 펼쳐보기 | phrase-smoke 통과 · 명시 요청 시 quiet hours 우회 (실기기 미확인) | | chat | |
| 15 | 저녁 요약. | `evening_summary` | 펼쳐보기 | phrase-smoke 통과 · 명시 요청 시 quiet hours 우회 (실기기 미확인) | | chat | |
| 16 | Home strip / smart Focus | ≤2 signals; Focus when active | chip tap | 미확인 | | home | |
| 17 | Proactive OFF | no auto promo strip | — | 미확인 | | home | |
| 18 | 조용한 음악 틀어줘 | music (no los2 steal) | play chip | 미확인 | | | |
| 19 | Keyboard open + card | composer not covered | — | 미확인 | | | |
| 20 | Music mini + card | no overlap | — | 미확인 | | | |
| 21 | Nav UI + card | no overlap | — | 미확인 | | | |
| 22 | Safe Area (notch) | padding OK | — | 미확인 | | | |
| 23 | Offline + 오늘 뭐 해야 해? | local context card | — | 미확인 | | | |
| 24 | Locale en/ja/vi UI shell | cards still render (KO content OK) | — | 미확인 | | | |

## iPhone checklist

- Safari PWA / home screen: **미확인**
- Safe Area: **미확인**
- Background focus timer: **미확인**

## Android checklist

- Chrome PWA: **미확인**
- Back gesture vs card buttons: **미확인**
- Keyboard inset: **미확인**

## Out of scope this pass (still 미구현)

- Emotion / Trust engines
- Geofence arrival trigger
- Live traffic ETA / live weather pull
- Contacts sync
- Conversation transcript auto-index
