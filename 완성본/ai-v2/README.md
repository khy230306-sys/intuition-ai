# Intuition AI v2 — Future Road / Hidden Path Engine

CURRENT ROAD → FUTURE PATH → HISTORICAL SIMILARITY →  
EXPECTED / ALTERNATIVE / HIDDEN PATH → NEXT PICK (P/B)

## 사용

```ts
import { predictNext, walkForwardEvaluate } from './src/engine/index.ts'

const history = ['P', 'B', 'B', 'B', 'P', 'B'] // Outcome[]
const result = predictNext(history)

console.log(result.pick)        // 'P' | 'B'
console.log(result.confidence)
console.log(result.expectedPath)
console.log(result.alternativePath)
console.log(result.hiddenPath)
```

## 테스트

```bash
npm install
npm test
```

## 파일

- `src/engine/` — Future Road Engine V2 핵심
- `src/types.ts` — 타입
- `src/judgment.ts` — 성공/실패 판정 (TIE 제외)
