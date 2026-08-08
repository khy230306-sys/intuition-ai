/**
 * Inventory AIZIO features from code. Runtime verdicts come from simulation.
 */
import { writeFileSync, mkdirSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..')
const outDir = '/opt/cursor/artifacts'
mkdirSync(outDir, { recursive: true })

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'dist' || name === '.git') continue
    const p = join(dir, name)
    const st = statSync(p)
    if (st.isDirectory()) walk(p, acc)
    else if (/\.(ts|tsx|js|mjs)$/.test(name)) acc.push(p)
  }
  return acc
}

const files = walk(join(root, 'src'))
const textBlob = files.map((f) => readFileSync(f, 'utf8')).join('\n')

const FEATURES = [
  { id: 'weather', patterns: [/weatherTool|isClearWeatherQuery|weather\.query/] },
  { id: 'places', patterns: [/placesTool|isPlaceSeekUtterance/] },
  { id: 'calendar', patterns: [/calendarTool|isCalendarWriteUtterance/] },
  { id: 'reminder', patterns: [/reminder|리마인더/] },
  { id: 'travel', patterns: [/travelAgent/] },
  { id: 'restaurant', patterns: [/restaurantAgent/] },
  { id: 'translation', patterns: [/loadInterpretMode|handleTranslate/] },
  { id: 'music', patterns: [/musicNeedsGesture|play_music/] },
  { id: 'hybrid_ai', patterns: [/runHybridChat|seedAppOwnedProvidersFromBuild/] },
  { id: 'provider_cooldown', patterns: [/markProviderCooldown|cooldownUntil/] },
  { id: 'orchestrator', patterns: [/planConversationTurn|conversationOrchestrator/] },
  { id: 'todo', patterns: [/할\s*일|todo/i] },
  { id: 'expense', patterns: [/지출|expense/i] },
  { id: 'stocks', patterns: [/시세|quote/i] },
  { id: 'fx', patterns: [/환율/] },
  { id: 'briefing', patterns: [/브리핑|briefing/i] },
  { id: 'offline', patterns: [/navigator\.onLine/] },
  { id: 'pwa_sw', patterns: [/serviceWorker|workbox/] },
  { id: 'settings_hybrid', patterns: [/settingsUi/] },
  { id: 'arcade', patterns: [/arcade|breakout/] },
  { id: 'home_v2', patterns: [/home-v2|HomeV2/] },
  { id: 'action_agent', patterns: [/tryHandleRoutedCommand|actionAgent/] },
  { id: 'aizio_engine', patterns: [/tryHandleAizioEngine|runAizioEngineTurn/] },
  { id: 'memory_context', patterns: [/SessionContext|resolveContextRef/] },
]

const inventory = FEATURES.map((f) => ({
  id: f.id,
  codePresent: f.patterns.some((re) => re.test(textBlob)),
  runtime: f.patterns.some((re) => re.test(textBlob)) ? 'NEEDS_RUNTIME' : 'NOT_REACHABLE',
}))

writeFileSync(
  join(outDir, 'feature-inventory.json'),
  JSON.stringify({ at: new Date().toISOString(), inventory }, null, 2),
)
console.log('WROTE feature-inventory.json', inventory.length)
