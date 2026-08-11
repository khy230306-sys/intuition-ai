# AIZIO CAMPUS (Standalone)

대학생 전용 **AI 대학생활 비서 + 학습관리** — AIZIO 메인(`jarvis-app`)과 **분리된 독립 앱**.

## Fixed URL

**https://aizio-campus.shipstatic.com**

## Scripts

```bash
cd aizio-campus
npm install
npm run dev
npm test
npm run build
npm run deploy:preview   # snapshot URL
npm run deploy:web       # fixed domain
```

## Notes

- 데이터는 이 도메인 origin의 localStorage / IndexedDB에 저장됩니다 (메인 AIZIO와 분리).
- AI/STT는 대화 시트에서 OpenAI·Groq 키를 기기에만 저장해 사용합니다.
