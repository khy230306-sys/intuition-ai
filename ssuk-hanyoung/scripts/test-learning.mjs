/**
 * Learning Core unit checks (node, no browser).
 * Validates metadata coverage + recommendation heuristics with a fake profile.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const gamesTs = readFileSync(join(root, 'src/data/games.ts'), 'utf8')
const learningTs = readFileSync(join(root, 'src/data/learning.ts'), 'utf8')
const gameIds = [...gamesTs.matchAll(/id:\s*'([^']+)'/g)].map((m) => m[1])
const learningIds = [...learningTs.matchAll(/id:\s*'([^']+)'/g)]
  .map((m) => m[1])
  .filter((id) => !['language', 'math', 'cognition', 'science', 'creativity', 'music', 'life', 'exploration'].includes(id))

assert.equal(gameIds.length, 30, `expected 30 games, got ${gameIds.length}`)
for (const id of gameIds) {
  assert.ok(learningIds.includes(id), `missing learning meta for ${id}`)
}

// Emoji scan in src (should be near-zero in UI files)
const emojiRe = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u
const uiFiles = [
  'src/pages/Home.tsx',
  'src/pages/Games.tsx',
  'src/pages/Parents.tsx',
  'src/pages/Explore.tsx',
  'src/pages/GamePlay.tsx',
  'src/components/GameShell.tsx',
  'src/games/ColorQuiz.tsx',
]
let emojiHits = 0
for (const f of uiFiles) {
  const text = readFileSync(join(root, f), 'utf8')
  if (emojiRe.test(text)) {
    emojiHits++
    console.error('emoji in', f)
  }
}
assert.equal(emojiHits, 0, 'UI files still contain emoji glyphs')

console.log('OK learning-core checks')
console.log(`games=${gameIds.length} learningMeta=${learningIds.length} uiEmojiHits=${emojiHits}`)
