# AIZIO COMMERCE

AI가 상품을 찾고, 코드가 돈을 계산하고, Safety Gate가 발주·환불·판매등록을 막는 **AI 커머스 오퍼레이터**입니다.

가상 매출·가짜 주문을 화면에 섞지 않습니다. API 키가 없으면 해당 연결은 `PENDING_SETUP` / `NOT_CONFIGURED`로 표시됩니다.

## 실행

```bash
cd aizio-commerce
cp .env.example .env   # 키는 나중에 넣어도 됩니다
npm install
npm run dev
```

- Web: http://127.0.0.1:5173
- API: http://127.0.0.1:8787/api/health

## 검사

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

## 구조

```
apps/web     React + Vite PWA
apps/api     Node.js TypeScript API
  engines/   Profit Truth, Risk, Decision, Safety Gate, Scout, ...
  adapters/  CJ, Coupang, Naver, OpenAI, Gemini, Claude
  db/        SQLite + PostgreSQL로 옮길 수 있는 Repository
```

금액 계산은 LLM이 하지 않습니다. `engines/profit/profit-truth.ts`가 유일한 마진 계산기입니다.

## 사용자가 직접 넣어야 하는 값

- OpenAI / Gemini / Claude API Key
- CJdropshipping 이메일 + API Password 또는 Access Token
- Coupang Access Key, Secret Key, Vendor ID (Wing Open API, IP 허용 필요)
- Naver Commerce Application ID / Secret
- `AIZIO_ENCRYPTION_KEY` (없으면 로컬 키가 생성됩니다)
