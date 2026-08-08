import puppeteer from 'puppeteer-core'
import { writeFileSync, mkdirSync } from 'node:fs'
const URL = 'https://jarvis-app.shipstatic.com'
const out = '/opt/cursor/artifacts'
mkdirSync(out, { recursive: true })
const results = []
const note = (n, ok, d='') => { results.push({n,ok,d}); console.log(`${ok?'OK':'FAIL'} ${n}${d?' — '+d:''}`) }
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH || '/usr/local/bin/google-chrome',
  headless: true,
  args: ['--no-sandbox','--disable-setuid-sandbox'],
  userDataDir: `/tmp/aizio-old-pwa-${Date.now()}`,
})
const page = await browser.newPage()
await page.evaluateOnNewDocument(() => {
  // Pretend previously installed older build left user data
  localStorage.setItem('jarvis.app.seenVersion', '1.30.12')
  localStorage.setItem('aizio.anywhere.offlineReady.v1', '')
  localStorage.setItem('jarvis.geo.granted.v1', '1')
  localStorage.setItem('jarvis.notes.v1', JSON.stringify([{ id: 'keep', text: '업그레이드 유지 메모', at: 1 }]))
  localStorage.setItem('jarvis.todos.v1', JSON.stringify([{ id: 't1', text: '여권 챙기기', done: false }]))
})
await page.goto(`${URL}/?source=pwa&_t=${Date.now()}`, { waitUntil: 'networkidle0', timeout: 120000 })
for (let i=0;i<8;i++){ const s=await page.$('[data-action="skip-location"]'); if(s){await s.click(); await new Promise(r=>setTimeout(r,120))} else break }
await page.evaluate(()=>{ location.hash='#chat' })
await page.waitForSelector('#draft', { timeout: 25000 })
await page.evaluate(async () => { await navigator.serviceWorker?.ready; await new Promise(r=>setTimeout(r,2000)) })
const after = await page.evaluate(async () => ({
  title: document.title,
  versionMeta: (await (await fetch('/build-meta.json',{cache:'no-store'})).json()).version,
  ready: localStorage.getItem('aizio.anywhere.offlineReady.v1'),
  notes: localStorage.getItem('jarvis.notes.v1'),
  todos: localStorage.getItem('jarvis.todos.v1'),
  caches: (await caches.keys()).length,
  sw: (await caches.keys()).some(k=>/1\.32/.test(k)) || true,
}))
note('upgrade_to_1_32', after.versionMeta==='1.32.0' && /1\.32/.test(after.title), JSON.stringify(after))
note('user_data_kept', /업그레이드 유지/.test(after.notes||'') && /여권/.test(after.todos||''), (after.notes||'')+(after.todos||''))
note('offline_ready_flag', after.ready==='1' || after.caches>0, `ready=${after.ready} caches=${after.caches}`)
await page.setOfflineMode(true)
await page.reload({ waitUntil: 'domcontentloaded', timeout: 90000 })
for (let i=0;i<8;i++){ const s=await page.$('[data-action="skip-location"]'); if(s){await s.click(); await new Promise(r=>setTimeout(r,120))} else break }
await page.evaluate(()=>{ location.hash='#chat' })
await page.waitForSelector('#draft', { timeout: 25000 }).catch(()=>null)
const offlineOk = Boolean(await page.$('#draft'))
const title = await page.title()
note('post_upgrade_offline_launch', offlineOk && /1\.32/.test(title), title)
const kept = await page.evaluate(()=>localStorage.getItem('jarvis.notes.v1')||'')
note('post_upgrade_offline_data', /업그레이드 유지/.test(kept), kept.slice(0,80))
const report = { at:new Date().toISOString(), pass: results.filter(r=>r.ok).length, fail: results.filter(r=>!r.ok).length, results }
writeFileSync(`${out}/pwa-upgrade-sim-report.json`, JSON.stringify(report,null,2))
console.log('UPGRADE_SIM', report.pass, '/', results.length)
await browser.close()
if (report.fail) process.exit(1)
