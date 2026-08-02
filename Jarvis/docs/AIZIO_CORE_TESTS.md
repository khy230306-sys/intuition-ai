# AIZIO Core Brain — Tests

## Automated (`src/core-brain/coreBrain.test.ts`)

Covered:

1. Wake-word strip / mid-sentence preserve  
2. General chat → `fallbackLegacy`  
3. Calm music → music skill  
4. Music stop → control_music  
5. Translate entity (`ja`)  
6. Notes / todos skills  
7. Calendar list + create unavailable (no fake success)  
8. Project unavailable  
9. Settings open  
10. Help  
11. Context: “더 신나는 걸로”  
12. Context: “다음 작업은?”  
13. Compound plan  
14. Level-3 block  
15. External URL allowlist  
16. Skill metadata without loading bodies  
17. Duplicate request guard  
18. Abort signal path  
19. `think()` integration (music + settings)

## Full suite / build

- `npm test` — includes Core Brain + existing regression suites  
- `npx tsc --noEmit`  
- `npm run build`  

## Manual / device (Cloud Agent: 미확인)

On iPhone Safari / Android Chrome after deploy:

1. General AI question (with API key)  
2. 「조용한 음악 틀어줘」 / 「음악 멈춰」  
3. 「일본어로 번역해줘」  
4. 「메모 보여줘」 / 「할 일 목록」 / 「오늘 일정 알려줘」  
5. 「NEXUS 어디까지 됐어?」 → unavailable copy  
6. 「설정 열어줘」  
7. Voice + wake word 「아이지오, …」  
8. Refresh → chat history preserved  
9. Bottom tabs still work  

Do not mark device items as passed unless run on hardware.
