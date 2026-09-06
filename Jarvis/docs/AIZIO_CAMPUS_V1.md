# AIZIO CAMPUS V1

대학생 전용 **AI 대학생활 비서 + AI 학습관리** 모듈.

## Entry

- HOME v2 헤더 `CAMPUS` 버튼
- 전체 메뉴 → CAMPUS
- 대화: 「캠퍼스 열어줘」, 「오늘 수업 뭐야?」, 「월요일 10시…수업 넣어줘」 등

## Storage

- Metadata: `localStorage` key `aizio_campus_v1` (schema v1, versioned envelope)
- Binary (녹음/자료): IndexedDB `aizio_campus_blobs_v1`
- Backup category: `campus`

## AI / STT

- Summaries / quiz / email: Hybrid AI (`runHybridChat`) when keys configured
- STT: OpenAI Whisper → Groq Whisper (no fake transcript)
- Offline: timetable, assignments, exams, notes, quiz grading, GPA, focus, search work locally; Cloud AI/STT show clear offline messages

## Deterministic (no LLM)

Timetable CRUD/conflict, D-Day, GPA, Focus timer stats, Quiz grading, concept weakness %, Smart Review scores, search

## Lazy load

Campus skill adapter + PDF/docx extractors load on demand; Campus view CSS is a separate stylesheet.
