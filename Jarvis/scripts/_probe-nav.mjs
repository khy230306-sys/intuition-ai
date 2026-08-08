import puppeteer from 'puppeteer-core'
import { createServer } from 'node:http'
import { readFileSync, existsSync } from 'node:fs'
import { extname, join } from 'node:path'

const dist = '/workspace/Jarvis/dist'
const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
}
const server = createServer((req, res) => {
  let path = decodeURIComponent(new URL(req.url || '/', 'http://x').pathname)
  if (path === '/') path = '/index.html'
  const file = join(dist, path.replace(/^\//, ''))
  if (!existsSync(file)) {
    res.writeHead(404)
    res.end('x')
    return
  }
  res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'bin' })
  res.end(readFileSync(file))
})
await new Promise((r) => server.listen(4191, '127.0.0.1', r))
const browser = await puppeteer.launch({
  executablePath: '/usr/local/bin/google-chrome',
  headless: true,
  args: ['--no-sandbox'],
})
const page = await browser.newPage()
await page.evaluateOnNewDocument(() => {
  localStorage.setItem('jarvis.geo.granted.v1', '1')
  localStorage.setItem('jarvis.geo.last.v1', JSON.stringify({ lat: 37.5, lon: 127, accuracy: 10, at: Date.now() }))
  navigator.geolocation.getCurrentPosition = (s) =>
    s({
      coords: {
        latitude: 37.5,
        longitude: 127,
        accuracy: 10,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
      },
      timestamp: Date.now(),
    })
})
await page.goto('http://127.0.0.1:4191/', { waitUntil: 'networkidle0', timeout: 60000 })
await new Promise((r) => setTimeout(r, 800))
const info = await page.evaluate(() => ({
  views: [...document.querySelectorAll('[data-view]')].map((e) => e.getAttribute('data-view')),
  actions: [...document.querySelectorAll('[data-action]')].slice(0, 50).map((e) => e.getAttribute('data-action')),
  text: (document.body.innerText || '').slice(0, 600),
  hash: location.hash,
}))
console.log(JSON.stringify(info, null, 2))
await browser.close()
server.close()
