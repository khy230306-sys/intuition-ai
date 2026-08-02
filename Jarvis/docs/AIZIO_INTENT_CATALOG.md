# AIZIO Intent Catalog

| Intent | Local cues (examples) | Skill | Notes |
|--------|----------------------|-------|-------|
| `general_chat` | soft chat, unclear | chat → **legacy think** | Existing AI / handlers |
| `ask_information` | 알려줘, 날씨, 시세… | chat → **legacy** | Keep invest/weather path |
| `summarize` | 요약해 | chat → legacy | |
| `translate` | 번역, 일본어로… | translation | `handleTranslate` |
| `play_music` | 음악 틀어줘, 추천 | music | Music Skill |
| `control_music` | 멈춰, 다음 곡, 더 신나게 | music | + context follow-up |
| `create_note` | 기억해, 메모해 | note | `upsertMemory` |
| `search_note` | 메모 보여줘 | note | `findMemory` / list |
| `create_todo` | 할 일 … | todo | `addReminder` |
| `list_todo` | 할 일 목록 | todo | |
| `update_todo` | (classified) | todo | **unavailable** honest message |
| `create_calendar_event` | 일정 추가 | calendar | **unavailable** (no personal CRUD) |
| `list_calendar` | 오늘 일정 | calendar | family/friends + holidays |
| `project_status` | NEXUS 어디까지 | project | **unavailable** |
| `project_planning` | 다음 작업은 | project | **unavailable** / follow-up |
| `app_navigation` | 가족 화면 가줘 | navigation | `BrainReply.view` |
| `change_setting` | 설정 열어줘 | settings | view=settings |
| `help` | 도움말 | → **legacy** `helpText` | Skill adapter kept for direct use |
| `remember_relationship` | 엄마 이름은 … | relationship | |
| `list_relationships` | 가족 관계 목록 | relationship | |
| `create_reminder` | 오후 2시 엄마 병원 예약 | smartReminder | local alarm |
| `ask_person_schedule` | 엄마 오늘 일정 | smartReminder | |
| `update_reminder` / `cancel_reminder` / `snooze_reminder` | 후속 명령 | smartReminder | context 15분 |
| `unknown` | — | → general_chat | |

Classifier: local rules first (`intentClassifier` + music classifier). Ambiguous → `general_chat`.
