import puppeteer from 'puppeteer-core'
import { createServer } from 'node:http'
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs'
import { extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
const __dirname = fileURLToPath(new URL('.', import.meta.url))
const dist = join(__dirname, '..', 'dist')
const OUT = '/opt/cursor/artifacts/briefing-live'
mkdirSync(OUT, { recursive: true })
const MIME = { '.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2' }
const server = createServer((req,res)=>{ let path=decodeURIComponent(new URL(req.url||'/','http://x').pathname); if(path==='/') path='/index.html'; const file=join(dist,path.replace(/^\//,'')); if(!existsSync(file)){res.writeHead(404);res.end('x');return} res.writeHead(200,{'Content-Type':MIME[extname(file)]||'bin'}); res.end(readFileSync(file)) })
await new Promise(r=>server.listen(4197,'127.0.0.1',r))
const browser=await puppeteer.launch({executablePath:'/usr/local/bin/google-chrome',headless:true,args:['--no-sandbox'],defaultViewport:{width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true}})
const page=await browser.newPage()
await page.evaluateOnNewDocument(()=>{
  localStorage.setItem('jarvis.geo.granted.v1','1')
  localStorage.setItem('jarvis.geo.last.v1',JSON.stringify({lat:37.5,lon:127,accuracy:10,at:Date.now()}))
  navigator.geolocation.getCurrentPosition=(s)=>s({coords:{latitude:37.5,longitude:127,accuracy:10,altitude:null,altitudeAccuracy:null,heading:null,speed:null},timestamp:Date.now()})
})
await page.goto('http://127.0.0.1:4197/',{waitUntil:'networkidle0',timeout:90000})
await page.waitForSelector('[data-life-brief="1"]',{timeout:20000})
// wait for live refresh
let gotMarket=false, gotNews=false, weather=false
for(let i=0;i<40;i++){
  const s=await page.evaluate(()=>{
    const chips=[...document.querySelectorAll('.life-brief-chip')].map(c=>({cls:c.className,t:c.textContent}))
    return {
      chips,
      market: !!document.querySelector('.life-brief-chip-market'),
      news: !!document.querySelector('.life-brief-chip-news'),
      weather: !!document.querySelector('.life-brief-chip-weather'),
      age: document.querySelector('[data-brief-live-age]')?.textContent||'',
      body: (document.body.innerText||'').includes('코스피') || (document.body.innerText||'').includes('코스닥'),
      pending: /불러오는 중/.test(document.body.innerText||''),
    }
  })
  weather = s.weather
  gotMarket = s.market && s.body && !/시세 불러오는/.test(s.chips.find(c=>c.cls.includes('market'))?.t||'시세 불러오는')
  gotNews = s.news && !/헤드라인 불러오는/.test(s.chips.filter(c=>c.cls.includes('news')).map(c=>c.t).join(' '))
  if(gotMarket && gotNews) break
  await new Promise(r=>setTimeout(r,500))
}
await page.screenshot({path:join(OUT,'home-briefing.png'),fullPage:false})
// click refresh
await page.click('[data-action="life-brief-refresh"]')
await new Promise(r=>setTimeout(r,2500))
await page.screenshot({path:join(OUT,'after-refresh.png'),fullPage:false})
const final=await page.evaluate(()=>({
  text:(document.body.innerText||'').slice(0,1200),
  markets:[...document.querySelectorAll('.life-brief-chip-market')].map(c=>c.textContent?.trim()),
  news:[...document.querySelectorAll('.life-brief-chip-news')].map(c=>c.textContent?.trim()),
  age:document.querySelector('[data-brief-live-age]')?.textContent,
  cache: localStorage.getItem('aizio.briefing.live.v1')?.slice(0,200),
}))
const report={gotMarket,gotNews,weather,final,pass:gotMarket&&gotNews&&weather}
writeFileSync(join(OUT,'report.json'),JSON.stringify(report,null,2))
console.log(JSON.stringify(report,null,2))
await browser.close(); server.close()
process.exit(report.pass?0:1)
