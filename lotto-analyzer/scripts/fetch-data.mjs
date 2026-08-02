#!/usr/bin/env node
/**
 * 동행복권 실제 당첨 데이터를 내려받아 src/data/draws.json 으로 저장합니다.
 */
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const URL =
  'https://www.dhlottery.co.kr/lt645/selectPstLt645Info.do?srchLtEpsd=all&_=' +
  Date.now()

const res = await fetch(URL, {
  headers: {
    'X-Requested-With': 'XMLHttpRequest',
    Referer: 'https://www.dhlottery.co.kr/',
  },
})

if (!res.ok) {
  console.error('fetch failed', res.status)
  process.exit(1)
}

const raw = await res.json()
const list = raw?.data?.list
if (!Array.isArray(list) || list.length === 0) {
  console.error('unexpected payload')
  process.exit(1)
}

const draws = list.map((row) => {
  const ymd = String(row.ltRflYmd)
  const date = `${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6, 8)}`
  return [
    Number(row.ltEpsd),
    date,
    Number(row.tm1WnNo),
    Number(row.tm2WnNo),
    Number(row.tm3WnNo),
    Number(row.tm4WnNo),
    Number(row.tm5WnNo),
    Number(row.tm6WnNo),
    Number(row.bnsWnNo),
  ]
})

const today = new Date().toISOString().slice(0, 10)
const out = {
  source: 'dhlottery.co.kr',
  updated: today,
  count: draws.length,
  draws,
}

const path = join(ROOT, 'src/data/draws.json')
writeFileSync(path, JSON.stringify(out))
console.log(`saved ${draws.length} draws → ${path}`)
console.log('latest', draws.at(-1))
