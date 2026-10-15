# PIP

PIP는 숫자 대신 점(PIP)으로 구성된 독창 카드 데모 게임입니다.

> DEMO POINT는 금전적 가치가 없으며 현금으로 교환할 수 없습니다.  
> 입금/출금/환전/결제/외부 도박 연결은 구현하지 않습니다.

## 설치

```bash
cd PIP
npm install
```

## 실행

```bash
npm run dev
```

기본 주소: `http://localhost:5174`

## 검증

```bash
npm run lint
npm run test
npm run build
npm run simulate
```

## 규칙 요약

- 카드 50장: 1~5 PIP 각 10장
- SHOE 시작 시 셔플 후 Hidden 6장 제거 → Playing 44장
- 라운드마다 2장 사용 → 22라운드
- CARD DUEL: DOWN / SAME / UP
- TOTAL: LOW(2~5) / CENTER(6) / HIGH(7~10)
- MORE: ODD/EVEN, PAIR, EXACT TOTAL

## 폴더

```text
src/game/        엔진 (deck/shuffle/shoe/rules/state)
src/components/  UI
src/hooks/       게임 컨트롤러
src/simulation/  대규모 시뮬레이션
docs/            문서
```
