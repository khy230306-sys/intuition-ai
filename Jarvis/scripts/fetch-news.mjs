#!/usr/bin/env node
/**
 * Build-time Korean news snapshot for offline / CORS-blocked clients.
 */
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outPath = join(__dirname, '..', 'public', 'news-snapshot.json')
const RSS = 'https://news.google.com/rss?hl=ko&gl=KR&ceid=KR:ko'

function decodeXml(s) {
  return String(s || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

function strip(s) {
  return decodeXml(s)
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function parse(xml, limit = 8) {
  const items = []
  const blocks = xml.match(/<item[\s\S]*?<\/item>/gi) || []
  for (const block of blocks) {
    const title = strip((block.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '')
    const link = strip((block.match(/<link[^>]*>([\s\S]*?)<\/link>/i) || [])[1] || '')
    const pubRaw = strip((block.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i) || [])[1] || '')
    const source = strip((block.match(/<source[^>]*>([\s\S]*?)<\/source>/i) || [])[1] || '') || '뉴스'
    if (!title) continue
    let clean = title
    let src = source
    const dash = title.lastIndexOf(' - ')
    if (dash > 8) {
      clean = title.slice(0, dash).trim()
      src = title.slice(dash + 3).trim() || source
    }
    items.push({
      id: `snap-${items.length}`,
      title: clean.slice(0, 90),
      source: src.slice(0, 40),
      link: link.startsWith('http') ? link : '',
      publishedAt: pubRaw ? Date.parse(pubRaw) || null : null,
    })
    if (items.length >= limit) break
  }
  return items
}

async function main() {
  let news = []
  try {
    const res = await fetch(RSS, { headers: { Accept: 'application/rss+xml, text/xml, */*' } })
    if (res.ok) news = parse(await res.text(), 8)
  } catch (e) {
    console.warn('[news-snapshot] fetch failed', e?.message || e)
  }
  const payload = { fetchedAt: Date.now(), count: news.length, news }
  writeFileSync(outPath, JSON.stringify(payload))
  console.log(`[news-snapshot] wrote ${news.length} → ${outPath}`)
}

main()
