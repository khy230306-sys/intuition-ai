import puppeteer from 'puppeteer-core'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
const OUT='/opt/cursor/artifacts/quest-deep-play'
mkdirSync(OUT,{recursive:true})
const TARGET='https://lightlab-92m8bq7.shipstatic.com'
const browser=await puppeteer.launch({executablePath:'/usr/local/bin/google-chrome',headless:true,args:['--no-sandbox'],defaultViewport:{width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true}})
const page=await browser.newPage()
await page.evaluateOnNewDocument(()=>{
  localStorage.setItem('jarvis.geo.granted.v1','1')
  localStorage.setItem('jarvis.geo.last.v1',JSON.stringify({lat:37.5,lon:127,accuracy:10,at:Date.now()}))
  localStorage.removeItem('aizio.quest.save.v1')
  navigator.geolocation.getCurrentPosition=(s)=>s({coords:{latitude:37.5,longitude:127,accuracy:10,altitude:null,altitudeAccuracy:null,heading:null,speed:null},timestamp:Date.now()})
})
await page.goto(TARGET+'/?aqdebug=1',{waitUntil:'networkidle0',timeout:90000})
await page.evaluate(()=>location.hash='#games'); await new Promise(r=>setTimeout(r,600))
await page.click('[data-action="open-aizio-quest"]')
await page.waitForSelector('.aq-root')
for(let i=0;i<8;i++){
  if(await page.$('[data-aq-board="1"]')) break
  for(const sel of ['[data-aq="new"]','[data-aq="pick-hero"]:not([disabled])','[data-aq="tutorial-start"]','[data-aq="fight"]']){
    const el=await page.$(sel); if(el){await el.click(); await new Promise(r=>setTimeout(r,300)); break}
  }
}
await page.waitForSelector('[data-aq-board="1"]')

const analyze=async(tag)=>{
  const info=await page.evaluate(()=>{
    const coach=document.querySelector('.aq-gem.coach')
    const target=document.querySelector('.aq-gem.coach-target')
    const arrow=document.querySelector('.aq-arrow')
    const board=document.querySelector('[data-aq-board="1"]')
    const wrap=document.querySelector('.aq-board-wrap')
    const br=board?.getBoundingClientRect()
    const cr=coach?.getBoundingClientRect()
    const tr=target?.getBoundingClientRect()
    const ar=arrow?.getBoundingClientRect()
    const wr=wrap?.getBoundingClientRect()
    const gems=[...document.querySelectorAll('.aq-gem')]
    const grid=Array.from({length:8},()=>Array(8).fill(''))
    for(const g of gems) grid[+g.dataset.r][+g.dataset.c]=g.dataset.kind
    let runs=[]
    for(let r=0;r<8;r++){let c=0;while(c<8){let e=c+1;while(e<8&&grid[r][e]===grid[r][c])e++; if(e-c>=3) runs.push({dir:'h',r,c,e,kind:grid[r][c]}); c=e}}
    for(let c=0;c<8;c++){let r=0;while(r<8){let e=r+1;while(e<8&&grid[e][c]===grid[r][c])e++; if(e-r>=3) runs.push({dir:'v',c,r,e,kind:grid[r][c]}); r=e}}
    return {
      turn: document.querySelector('.aq-turn')?.textContent,
      coach: coach?{r:+coach.dataset.r,c:+coach.dataset.c,kind:coach.dataset.kind}:null,
      target: target?{r:+target.dataset.r,c:+target.dataset.c,kind:target.dataset.kind}:null,
      arrowDir: arrow?.getAttribute('data-dir'),
      arrowCenter: ar?{x:(ar.left+ar.right)/2,y:(ar.top+ar.bottom)/2}:null,
      coachCenter: cr?{x:(cr.left+cr.right)/2,y:(cr.top+cr.bottom)/2}:null,
      targetCenter: tr?{x:(tr.left+tr.right)/2,y:(tr.top+tr.bottom)/2}:null,
      boardTop: br?.top, wrapTop: wr?.top,
      arrowOffsetFromCoach: ar&&cr?{dx:((ar.left+ar.right)/2)-((cr.left+cr.right)/2), dy:((ar.top+ar.bottom)/2)-((cr.top+cr.bottom)/2)}:null,
      matchRuns: runs,
      ehp: document.querySelector('[data-aq-ehp-text]')?.textContent,
      dbg: document.querySelector('[data-aq-debug]')?.textContent,
      skillsVisible: [...document.querySelectorAll('[data-aq="skill"]')].map(b=>({dis:b.disabled, t:b.querySelector('strong')?.textContent})),
      toast: document.querySelector('.aq-toast')?.textContent,
    }
  })
  await page.screenshot({path:join(OUT, tag+'.png')})
  writeFileSync(join(OUT, tag+'.json'), JSON.stringify(info,null,2))
  console.log(tag, JSON.stringify(info,null,2))
  return info
}

const start=await analyze('01-tutorial')
// Capture cascade frames during a coach swap
const coach=await page.evaluate(()=>{
  const a=document.querySelector('.aq-gem.coach')?.getBoundingClientRect()
  const b=document.querySelector('.aq-gem.coach-target')?.getBoundingClientRect()
  if(!a||!b) return null
  return {ax:a.left+a.width/2,ay:a.top+a.height/2,bx:b.left+b.width/2,by:b.top+b.height/2}
})
if(coach){
  await page.mouse.move(coach.ax,coach.ay); await page.mouse.down()
  await page.mouse.move(coach.bx,coach.by,{steps:10}); await page.mouse.up()
  for(let i=0;i<12;i++){
    const fx=await page.evaluate(()=>({
      turn:document.querySelector('.aq-turn')?.textContent,
      matched:[...document.querySelectorAll('.aq-gem.matched')].map(g=>g.dataset.r+','+g.dataset.c),
      popping:[...document.querySelectorAll('.aq-gem.popping')].length,
      falling:[...document.querySelectorAll('.aq-gem.falling')].length,
      swapOk:[...document.querySelectorAll('.aq-gem.swap-ok')].length,
    }))
    await page.screenshot({path:join(OUT, `02-cascade-f${i}.png`)})
    writeFileSync(join(OUT, `02-cascade-f${i}.json`), JSON.stringify(fx))
    console.log('frame',i,fx)
    await new Promise(r=>setTimeout(r,90))
  }
}
await new Promise(r=>setTimeout(r,1500))
await analyze('03-after-cascade')

// skip tut, continue to next stages
const skip=await page.$('[data-aq="tutorial-skip-battle"]')
if(skip) await skip.click()

// play until victory then enter campaign and fight stage 2
async function playMoves(n){
  for(let m=0;m<n;m++){
    const has=await page.$('[data-aq-board="1"]')
    if(!has) return 'ended'
    const busy=await page.evaluate(()=>/처리|행동|연결/.test(document.querySelector('.aq-turn')?.textContent||''))
    if(busy){ await new Promise(r=>setTimeout(r,400)); continue }
    const t=await page.evaluate(()=>{
      const gems=[...document.querySelectorAll('.aq-gem')]
      const kind=(r,c)=>gems.find(g=>+g.dataset.r===r&&+g.dataset.c===c)?.dataset.kind
      const rect=(r,c)=>{const g=gems.find(x=>+x.dataset.r===r&&+x.dataset.c===c); if(!g)return null; const b=g.getBoundingClientRect(); return {x:b.left+b.width/2,y:b.top+b.height/2}}
      const base=Array.from({length:8},(_,r)=>Array.from({length:8},(_,c)=>kind(r,c)))
      const wm=(g)=>{for(let r=0;r<8;r++)for(let c=0;c<6;c++)if(g[r][c]&&g[r][c]===g[r][c+1]&&g[r][c]===g[r][c+2])return true; for(let c=0;c<8;c++)for(let r=0;r<6;r++)if(g[r][c]&&g[r][c]===g[r+1][c]&&g[r][c]===g[r+2][c])return true; return false}
      for(let r=0;r<8;r++)for(let c=0;c<8;c++)for(const [dr,dc] of [[0,1],[1,0]]){
        const r2=r+dr,c2=c+dc; if(r2>7||c2>7)continue
        const g=base.map(row=>row.slice()); const t=g[r][c]; g[r][c]=g[r2][c2]; g[r2][c2]=t
        if(!wm(g)) continue
        const a=rect(r,c), b=rect(r2,c2); if(a&&b) return {ax:a.x,ay:a.y,bx:b.x,by:b.y}
      }
      return null
    })
    if(!t){ console.log('no move',m); break }
    await page.mouse.move(t.ax,t.ay); await page.mouse.down(); await page.mouse.move(t.bx,t.by,{steps:10}); await page.mouse.up()
    for(let w=0;w<40;w++){
      const b=await page.evaluate(()=>/처리|행동|연결/.test(document.querySelector('.aq-turn')?.textContent||''))
      if(!b) break
      await new Promise(r=>setTimeout(r,100))
    }
    await new Promise(r=>setTimeout(r,200))
  }
  return await page.evaluate(()=>({text:(document.body.innerText||'').slice(0,200), hasBoard:!!document.querySelector('[data-aq-board="1"]')}))
}
let r=await playMoves(12)
console.log('play1', r)
await page.screenshot({path:join(OUT,'04-post-battle.png')})

// go campaign / next
for(const sel of ['[data-aq="campaign"]','[data-aq="fight"]','[data-aq="next"]','[data-aq="start-stage"]']){
  const el=await page.$(sel); if(el){await el.click(); await new Promise(r=>setTimeout(r,400))}
}
// click second unlocked stage if present
const stages=await page.$$('.aq-stage button, [data-aq="fight"], [data-stage]')
console.log('stages', stages.length)
await page.screenshot({path:join(OUT,'05-campaign.png')})
const camp=await page.evaluate(()=>({text:(document.body.innerText||'').slice(0,1200), buttons:[...document.querySelectorAll('button')].map(b=>({aq:b.getAttribute('data-aq'), t:b.textContent?.trim().slice(0,40)})).slice(0,40)}))
writeFileSync(join(OUT,'05-campaign.json'), JSON.stringify(camp,null,2))
console.log(JSON.stringify(camp,null,2))

// start next fight
for(const b of camp.buttons){
  if(b.aq==='fight' || (b.t&&/전투|도전|입장/.test(b.t))){
    await page.evaluate((aq,t)=>{
      const bt=[...document.querySelectorAll('button')].find(x=> (aq&&x.getAttribute('data-aq')===aq) || (t&&x.textContent?.includes(t)))
      bt?.click()
    }, b.aq, b.t)
    await new Promise(r=>setTimeout(r,500))
    break
  }
}
if(await page.$('[data-aq-board="1"]')){
  await analyze('06-stage2')
  // play a few moves watching for unresolved matches
  for(let m=0;m<8;m++){
    await playMoves(1)
    const s=await page.evaluate(()=>{
      const gems=[...document.querySelectorAll('.aq-gem')]
      const grid=Array.from({length:8},()=>Array(8).fill(''))
      for(const g of gems) grid[+g.dataset.r][+g.dataset.c]=g.dataset.kind
      let runs=0
      for(let r=0;r<8;r++){let c=0;while(c<8){let e=c+1;while(e<8&&grid[r][e]===grid[r][c])e++; if(e-c>=3)runs++; c=e}}
      for(let c=0;c<8;c++){let r=0;while(r<8){let e=r+1;while(e<8&&grid[e][c]===grid[r][c])e++; if(e-r>=3)runs++; r=e}}
      return {runs, turn:document.querySelector('.aq-turn')?.textContent, ehp:document.querySelector('[data-aq-ehp-text]')?.textContent, php:document.querySelector('[data-aq-php-text]')?.textContent}
    })
    console.log('stage2 move',m,s)
    if(s.runs>0 && /내 턴/.test(s.turn||'') && !/처리|연결|행동/.test(s.turn||'')){
      console.log('BUG unresolved matches')
      await page.screenshot({path:join(OUT,`07-unresolved-${m}.png`)})
      writeFileSync(join(OUT,`07-unresolved-${m}.json`), JSON.stringify(s))
    }
  }
  await page.screenshot({path:join(OUT,'08-stage2-mid.png')})
}
await browser.close()
console.log('DONE')
