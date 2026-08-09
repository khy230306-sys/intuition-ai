# AIZIO + Claude Code (Antigravity) — 터미널 없이 붙이기

스크린샷 가이드와 같이 **검은 화면(터미널) 없이** Claude Code를 붙이는 흐름입니다.  
이 문서는 **AIZIO(`Jarvis/`) 개발**용입니다. 앱 안 아이디어 Claude 심장과는 별개입니다.

| | Antigravity + Claude Code | 앱 · Claude 심장 |
|---|---|---|
| 목적 | PC에서 AIZIO 코드 수정 | 폰 앱에서 아이디어 발전 |
| 위치 | Antigravity 에디터 | 설정 → Anthropic / 생활 → Claude 심장 |

---

## 5분 세팅 (Antigravity)

1. Google에서 **Antigravity**(안티그래비티) 검색 후 설치  
2. **새 폴더**를 만들고 이 저장소를 열기  
   - 권장: 저장소 루트 또는 **`Jarvis/`** 폴더를 열기  
3. 왼쪽 **확장(Extensions)** 에서 **Claude Code** 설치  
4. **Claude 계정**으로 로그인  
5. 아무 파일이나 연 뒤 상단 **별(★) 아이콘** 클릭  
6. 채팅에 **`/init`** 입력  
   - 이미 `Jarvis/CLAUDE.md` 가 있으면 덮어쓰지 말고 **보완**만 하게 두세요  
7. **Plan Mode** 켠 뒤 원하는 기능을 한국어로 설명  

예:

```text
Plan Mode로 AIZIO 호텔 검색이 체크인 루프 없이 나트랑 요약을 내게 해줘.
작업 폴더는 Jarvis/ 야.
```

---

## 이 저장소에 이미 있는 Claude Code 자산

| 파일 | 역할 |
|------|------|
| `CLAUDE.md` (루트) | 모노레포 안내 → Jarvis로 유도 |
| `Jarvis/CLAUDE.md` | 빌드·배포·아키텍처·금지사항 |
| `Jarvis/.claude/rules/` | deploy, ideas 규칙 |
| `Jarvis/.claude/commands/deploy-aizio.md` | `/deploy-aizio` 슬래시 커맨드 |
| `Jarvis/.claude/commands/idea-claude.md` | `/idea-claude` 슬래시 커맨드 |

세션에서 `/context` 또는 `/memory` 로 `CLAUDE.md` 가 로드됐는지 확인하세요.

---

## 앱 쪽 Claude 심장 (아이폰)

1. https://jarvis-app.shipstatic.com 업데이트  
2. **설정 → 클라우드 두뇌** → **Anthropic Claude** 키 저장 · 연결 테스트  
   - 또는 OpenRouter + Claude 모델  
3. **생활** 탭 → **Claude 심장**  
   - 또는 「아이디어 발전시켜줘: …」

---

## 막힐 때

- `/init` 이 프로젝트 사실을 지우면 → git에서 `Jarvis/CLAUDE.md` 복구 후 다시 Plan  
- Claude Code가 폴더를 못 찾으면 → Antigravity에서 **`Jarvis`** 를 루트로 다시 열기  
- 앱 아이디어가 로컬 틀만 나오면 → Anthropic/OpenRouter 키 · 연결 테스트 확인  
