#!/usr/bin/env node
/**
 * Smoke checks for LottoLens App Store packaging (no Xcode required).
 */
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
let passed = 0
let failed = 0

function ok(name) {
  passed++
  console.log(`PASS  ${name}`)
}
function bad(name, detail) {
  failed++
  console.error(`FAIL  ${name}: ${detail}`)
}

function mustExist(rel) {
  const p = join(root, rel)
  if (existsSync(p)) ok(`exists ${rel}`)
  else bad(`exists ${rel}`, 'missing')
}

mustExist('capacitor.config.ts')
mustExist('ios/App/App/Info.plist')
mustExist('ios/App/App.xcodeproj/project.pbxproj')
mustExist('resources/icon-1024.png')
mustExist('dist/index.html')
mustExist('src/data/draws.json')

const cap = readFileSync(join(root, 'capacitor.config.ts'), 'utf8')
if (cap.includes("appId: 'com.aizio.lottolens'") || cap.includes('com.aizio.lottolens'))
  ok('bundle id in capacitor config')
else bad('bundle id in capacitor config', 'not found')

const plist = readFileSync(join(root, 'ios/App/App/Info.plist'), 'utf8')
if (plist.includes('<string>로또렌즈</string>')) ok('display name')
else bad('display name', 'missing')
for (const key of [
  'NSCameraUsageDescription',
  'NSPhotoLibraryUsageDescription',
  'NSMicrophoneUsageDescription',
  'NSLocationWhenInUseUsageDescription',
]) {
  if (!plist.includes(key)) ok(`no unused permission ${key}`)
  else bad(`no unused permission ${key}`, 'unexpected declaration')
}

const pbx = readFileSync(join(root, 'ios/App/App.xcodeproj/project.pbxproj'), 'utf8')
if (pbx.includes('PRODUCT_BUNDLE_IDENTIFIER = com.aizio.lottolens;')) ok('pbx bundle id')
else bad('pbx bundle id', 'mismatch')
if (pbx.includes('MARKETING_VERSION = 1.0.0;')) ok('version 1.0.0')
else bad('version 1.0.0', 'mismatch')
if (pbx.includes('CURRENT_PROJECT_VERSION = 1;')) ok('build 1')
else bad('build 1', 'mismatch')

const main = readFileSync(join(root, 'src/main.ts'), 'utf8')
if (main.includes('당첨을 보장하지 않습니다')) ok('disclaimer present')
else bad('disclaimer present', 'missing')
if (!/필승|100%\s*당첨|당첨\s*보장(?!하지)/.test(main)) ok('no exaggerated guarantee copy')
else bad('no exaggerated guarantee copy', 'found')

// Runtime analysis smoke via built modules is heavy; use JSON integrity
const data = JSON.parse(readFileSync(join(root, 'src/data/draws.json'), 'utf8'))
if (data.count > 1000 && Array.isArray(data.draws) && data.draws.length === data.count)
  ok(`draw dataset ${data.count}`)
else bad('draw dataset', 'invalid')

const build = spawnSync('npm', ['run', 'build'], { cwd: root, encoding: 'utf8' })
if (build.status === 0) ok('npm run build')
else bad('npm run build', build.stderr || build.stdout)

const sync = spawnSync('npx', ['cap', 'sync', 'ios'], { cwd: root, encoding: 'utf8' })
if (sync.status === 0) ok('cap sync ios')
else bad('cap sync ios', sync.stderr || sync.stdout)

console.log(`\nSmoke: ${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
