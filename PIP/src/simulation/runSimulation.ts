import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildRoundResult } from '../game/rules'
import {
  consumeRound,
  createShoe,
  isShoeComplete,
  peekNextPair,
  validateShoeIntegrity,
} from '../game/shoe'
import { ROUNDS_PER_SHOE } from '../game/types'

const SHOE_COUNT = 100_000

type Counters = {
  values: Record<number, number>
  duel: Record<string, number>
  total: Record<string, number>
  integrityErrors: number
  rounds: number
}

function emptyCounters(): Counters {
  return {
    values: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    duel: { UP: 0, DOWN: 0, SAME: 0 },
    total: { LOW: 0, CENTER: 0, HIGH: 0 },
    integrityErrors: 0,
    rounds: 0,
  }
}

function run() {
  const started = Date.now()
  const counters = emptyCounters()

  for (let s = 1; s <= SHOE_COUNT; s += 1) {
    let shoe = createShoe(s)
    const errors = validateShoeIntegrity(shoe)
    if (errors.length) counters.integrityErrors += 1

    for (let r = 0; r < ROUNDS_PER_SHOE; r += 1) {
      const pair = peekNextPair(shoe)
      const result = buildRoundResult(r + 1, pair.cardA.value, pair.cardB.value)
      counters.values[result.cardA] += 1
      counters.values[result.cardB] += 1
      counters.duel[result.cardDuel] += 1
      counters.total[result.totalBand] += 1
      counters.rounds += 1
      shoe = consumeRound(shoe, result)
    }

    if (!isShoeComplete(shoe) || shoe.history.length !== 22) {
      counters.integrityErrors += 1
    }
    if (validateShoeIntegrity(shoe).length) {
      counters.integrityErrors += 1
    }
  }

  const elapsedMs = Date.now() - started
  const totalPips = Object.values(counters.values).reduce((a, b) => a + b, 0)
  const totalRounds = counters.rounds

  const report = `# PIP Simulation Report

- Shoes simulated: **${SHOE_COUNT.toLocaleString()}**
- Rounds simulated: **${totalRounds.toLocaleString()}**
- Elapsed: **${elapsedMs} ms**
- Integrity errors: **${counters.integrityErrors}**

## PIP value distribution (playing cards only)

| Value | Count | Ratio |
| --- | ---: | ---: |
| 1 | ${counters.values[1]} | ${((counters.values[1]! / totalPips) * 100).toFixed(3)}% |
| 2 | ${counters.values[2]} | ${((counters.values[2]! / totalPips) * 100).toFixed(3)}% |
| 3 | ${counters.values[3]} | ${((counters.values[3]! / totalPips) * 100).toFixed(3)}% |
| 4 | ${counters.values[4]} | ${((counters.values[4]! / totalPips) * 100).toFixed(3)}% |
| 5 | ${counters.values[5]} | ${((counters.values[5]! / totalPips) * 100).toFixed(3)}% |

## CARD DUEL distribution

| Result | Count | Ratio |
| --- | ---: | ---: |
| UP | ${counters.duel.UP} | ${((counters.duel.UP! / totalRounds) * 100).toFixed(3)}% |
| SAME | ${counters.duel.SAME} | ${((counters.duel.SAME! / totalRounds) * 100).toFixed(3)}% |
| DOWN | ${counters.duel.DOWN} | ${((counters.duel.DOWN! / totalRounds) * 100).toFixed(3)}% |

## TOTAL band distribution

| Band | Count | Ratio |
| --- | ---: | ---: |
| LOW | ${counters.total.LOW} | ${((counters.total.LOW! / totalRounds) * 100).toFixed(3)}% |
| CENTER | ${counters.total.CENTER} | ${((counters.total.CENTER! / totalRounds) * 100).toFixed(3)}% |
| HIGH | ${counters.total.HIGH} | ${((counters.total.HIGH! / totalRounds) * 100).toFixed(3)}% |

## Notes

- Hidden 6 cards are excluded from value distribution because they are never dealt during the 22 rounds.
- No mid-shoe reshuffle is performed.
- Integrity checks validate deck composition, hidden/playing split, cursor/history sync, and 22-round completion.
`

  const here = dirname(fileURLToPath(import.meta.url))
  const out = resolve(here, '../../docs/SIMULATION_REPORT.md')
  mkdirSync(dirname(out), { recursive: true })
  writeFileSync(out, report, 'utf8')
  console.log(report)
  console.log(`Wrote ${out}`)

  if (counters.integrityErrors > 0) {
    process.exitCode = 1
  }
}

run()
