import puppeteer from 'puppeteer-core'
import { createServer } from 'node:http'
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs'
import { extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
const __dirname = fileURLToPath(new URL('.', import.meta.url))
const dist = join(__dirname, '..', 'dist')
const OUT = '/opt/cursor/artifacts/quest-verify-cascade'
mkdirSync(OUT, { recursive: true })
const MIME = { '.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2' }
const server = createServer((req,res)=>{ let path=decodeURIComponent(new URL(req.url||'/','http://x').pathname); if(path==='/') path='/index.html'; const file=join(dist,path.replace(/^\//,'')); if(!existsSync(file)){res.writeHead(404);res.end('x');return} res.writeHead(200,{'Content-Type':MIME[extname(file)]||'bin'}); res.end(readFileSync(file)) })
await new Promise(r=>server.listen(4195,'127.0.0.1',r))
const browser=await puppeteer.launch({executablePath:'/usr/local/bin/google-chrome',headless:true,args:['--no-sandbox'],defaultViewport:{width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true}})
const page=await browser.newPage()
await page.evaluateOnNewDocument(()=>{localStorage.setItem('jarvis.geo.granted.v1','1');localStorage.setItem('jarvis.geo.last.v1',JSON.stringify({lat:37.5,lon:127,accuracy:10,at:Date.now()}));localStorage.removeItem('aizio.quest.save.v1');navigator.geolocation.getCurrentPosition=(s)=>s({coords:{latitude:37.5,longitude:127,accuracy:10,altitude:null,altitudeAccuracy:null,heading:null,speed:null},timestamp:Date.now()})})
await page.goto('http://127.0.0.1:4195/?aqdebug=1',{waitUntil:'networkidle0',timeout:90000})
await page.evaluate(()=>location.hash='#games'); await new Promise(r=>setTimeout(r,500))
await page.click('[data-action="open-aizio-quest"]')
await page.waitForSelector('.aq-root')
for(let i=0;i<8;i++){ if(await page.$('[data-aq-board="1"]')) break
  for(const sel of ['[data-aq="new"]','[data-aq="pick-hero"]:not([disabled])','[data-aq="tutorial-start"]','[data-aq="fight"]']){ const el=await page.$(sel); if(el){await el.click(); await new Promise(r=>setTimeout(r,250)); break} } }
await page.waitForSelector('[data-aq-board="1"]')

// Arrow alignment
const arrowInfo=await page.evaluate(()=>{
  const arrow=document.querySelector('.aq-arrow'); const coach=document.querySelector('.aq-gem.coach'); const wrap=document.querySelector('.aq-board-wrap')
  if(!arrow||!coach||!wrap) return {ok:false}
  const ar=arrow.getBoundingClientRect(), cr=coach.getBoundingClientRect(), wr=wrap.getBoundingClientRect()
  return { ok: Math.abs((ar.left+ar.right)/2 - (cr.left+cr.right)/2) < 18, dx: ((ar.left+ar.right)/2)-((cr.left+cr.right)/2), dy: ar.bottom-cr.top, coach:{r:+coach.dataset.r,c:+coach.dataset.c} }
})
await page.screenshot({path:join(OUT,'arrow.png')})

const coach=await page.evaluate(()=>{
  const a=document.querySelector('.aq-gem.coach')?.getBoundingClientRect()
  const b=document.querySelector('.aq-gem.coach-target')?.getBoundingClientRect()
  if(!a||!b) return null
  return {ax:a.left+a.width/2,ay:a.top+a.height/2,bx:b.left+b.width/2,by:b.top+b.height/2}
})
const frames=[]
if(coach){
  await page.mouse.move(coach.ax,coach.ay); await page.mouse.down()
  await page.mouse.move(coach.bx,coach.by,{steps:12}); await page.mouse.up()
  for(let i=0;i<16;i++){
    const fx=await page.evaluate(()=>({
      turn: document.querySelector('.aq-turn')?.textContent||'',
      dbg: document.querySelector('[data-aq-debug]')?.textContent||'',
      matched: document.querySelectorAll('.aq-gem.matched,.aq-gem.popping,.aq-gem.falling').length,
      arrow: !!document.querySelector('.aq-arrow'),
    }))
    frames.push(fx)
    if(i===1||i===2) await page.screenshot({path:join(OUT,`cascade-${i}.png`)})
    await new Promise(r=>setTimeout(r,80))
  }
}
// wait for enemy or player idle
let sawEnemy=false, sawPlayer=false, victoryNext=false
for(let i=0;i<50;i++){
  const s=await page.evaluate(()=>({
    turn:document.querySelector('.aq-turn')?.textContent||'',
    dbg:document.querySelector('[data-aq-debug]')?.textContent||'',
    body:(document.body.innerText||'').slice(0,300),
    next:[...document.querySelectorAll('[data-aq="fight"]')].map(b=>b.textContent?.trim()).filter(Boolean),
  }))
  if(/적 턴|turn=enemy/.test(s.turn+s.dbg)) sawEnemy=true
  if(sawEnemy && /내 턴/.test(s.turn) && !/연결 중|행동 중/.test(s.turn)) sawPlayer=true
  if(/VICTORY/.test(s.body)){
    victoryNext = s.next.some(t=>/다음 전투/.test(t||''))
    await page.screenshot({path:join(OUT,'victory.png')})
    // finish battle if needed by more moves
    break
  }
  if(sawPlayer) break
  if(/내 턴/.test(s.turn) && !/연결 중|행동 중/.test(s.turn)){
    // drag any legal
    const t=await page.evaluate(()=>{
      const gems=[...document.querySelectorAll('.aq-gem')]
      const kind=(r,c)=>gems.find(g=>+g.dataset.r===r&&+g.dataset.c===c)?.dataset.kind
      const rect=(r,c)=>{const g=gems.find(x=>+x.dataset.r===r&&+x.dataset.c===c); if(!g)return null; const b=g.getBoundingClientRect(); return {x:b.left+b.width/2,y:b.top+b.height/2}}
      const base=Array.from({length:8},(_,r)=>Array.from({length:8},(_,c)=>kind(r,c)))
      const wm=(g)=>{for(let r=0;r<8;r++)for(let c=0;c<6;c++)if(g[r][c]&&g[r][c]===g[r][c+1]&&g[r][c]===g[r][c+2])return true; for(let c=0;c<8;c++)for(let r=0;r<6;r++)if(g[r][c]&&g[r][c]===g[r+1][c]&&g[r][c]===g[r+2][c])return true; return false}
      for(let r=0;r<8;r++)for(let c=0;c<8;c++)for(const [dr,dc] of [[0,1],[1,0]]){ const r2=r+dr,c2=c+dc; if(r2>7||c2>7)continue; const g=base.map(row=>row.slice()); const t=g[r][c]; g[r][c]=g[r2][c2]; g[r2][c2]=t; if(!wm(g))continue; const a=rect(r,c),b=rect(r2,c2); if(a&&b) return {ax:a.x,ay:a.y,bx:b.x,by:b.y} }
      return null
    })
    if(t){ await page.mouse.move(t.ax,t.ay); await page.mouse.down(); await page.mouse.move(t.bx,t.by,{steps:10}); await page.mouse.up() }
  }
  await new Promise(r=>setTimeout(r,200))
}

// If still in battle, finish to victory for next CTA check
for(let i=0;i<15 && !(await page.evaluate(()=>/VICTORY/.test(document.body.innerText||''))); i++){
  const t=await page.evaluate(()=>{
    const gems=[...document.querySelectorAll('.aq-gem')]; if(!gems.length) return null
    const kind=(r,c)=>gems.find(g=>+g.dataset.r===r&&+g.dataset.c===c)?.dataset.kind
    const rect=(r,c)=>{const g=gems.find(x=>+x.dataset.r===r&&+x.dataset.c===c); if(!g)return null; const b=g.getBoundingClientRect(); return {x:b.left+b.width/2,y:b.top+b.height/2}}
    const base=Array.from({length:8},(_,r)=>Array.from({length:8},(_,c)=>kind(r,c)))
    const wm=(g)=>{for(let r=0;r<8;r++)for(let c=0;c<6;c++)if(g[r][c]&&g[r][c]===g[r][c+1]&&g[r][c]===g[r][c+2])return true; for(let c=0;c<8;c++)for(let r=0;r<6;r++)if(g[r][c]&&g[r][c]===g[r+1][c]&&g[r][c]===g[r+2][c])return true; return false}
    for(let r=0;r<8;r++)for(let c=0;c<8;c++)for(const [dr,dc] of [[0,1],[1,0]]){ const r2=r+dr,c2=c+dc; if(r2>7||c2>7)continue; const g=base.map(row=>row.slice()); const t=g[r][c]; g[r][c]=g[r2][c2]; g[r2][c2]=t; if(!wm(g))continue; const a=rect(r,c),b=rect(r2,c2); if(a&&b) return {ax:a.x,ay:a.y,bx:b.x,by:b.y} }
    return null
  })
  if(!t) break
  await page.mouse.move(t.ax,t.ay); await page.mouse.down(); await page.mouse.move(t.bx,t.by,{steps:8}); await page.mouse.up()
  await new Promise(r=>setTimeout(r,1200))
}
if(await page.evaluate(()=>/VICTORY/.test(document.body.innerText||''))){
  victoryNext = await page.evaluate(()=>[...document.querySelectorAll('[data-aq="fight"]')].some(b=>/다음 전투/.test(b.textContent||'')))
  await page.screenshot({path:join(OUT,'victory.png')})
}

const duringFx = frames.filter(f=>f.matched>0)
const enemyDuringFx = duringFx.some(f=>/적 턴/.test(f.turn))
const playerDuringFx = duringFx.some(f=>/내 턴/.test(f.turn))
const report={
  arrowInfo,
  frames: frames.slice(0,10),
  duringFx,
  enemyDuringFx,
  playerDuringFx,
  sawEnemy,
  sawPlayer,
  victoryNext,
  pass: arrowInfo.ok && playerDuringFx && !enemyDuringFx && sawEnemy && sawPlayer,
}
writeFileSync(join(OUT,'report.json'), JSON.stringify(report,null,2))
console.log(JSON.stringify(report,null,2))
await browser.close(); server.close()
if(!report.pass) process.exit(1)
