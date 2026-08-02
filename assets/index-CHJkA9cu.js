(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))n(s);new MutationObserver(s=>{for(const r of s)if(r.type==="childList")for(const a of r.addedNodes)a.tagName==="LINK"&&a.rel==="modulepreload"&&n(a)}).observe(document,{childList:!0,subtree:!0});function o(s){const r={};return s.integrity&&(r.integrity=s.integrity),s.referrerPolicy&&(r.referrerPolicy=s.referrerPolicy),s.crossOrigin==="use-credentials"?r.credentials="include":s.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function n(s){if(s.ep)return;s.ep=!0;const r=o(s);fetch(s.href,r)}})();const W="modulepreload",K=function(t,e){return new URL(t,e).href},q={},U=function(e,o,n){let s=Promise.resolve();if(o&&o.length>0){let l=function(i){return Promise.all(i.map(p=>Promise.resolve(p).then(f=>({status:"fulfilled",value:f}),f=>({status:"rejected",reason:f}))))};const a=document.getElementsByTagName("link"),c=document.querySelector("meta[property=csp-nonce]"),d=c?.nonce||c?.getAttribute("nonce");s=l(o.map(i=>{if(i=K(i,n),i in q)return;q[i]=!0;const p=i.endsWith(".css"),f=p?'[rel="stylesheet"]':"";if(n)for(let m=a.length-1;m>=0;m--){const v=a[m];if(v.href===i&&(!p||v.rel==="stylesheet"))return}else if(document.querySelector(`link[href="${i}"]${f}`))return;const h=document.createElement("link");if(h.rel=p?"stylesheet":W,p||(h.as="script"),h.crossOrigin="",h.href=i,d&&h.setAttribute("nonce",d),document.head.appendChild(h),p)return new Promise((m,v)=>{h.addEventListener("load",m),h.addEventListener("error",()=>v(new Error(`Unable to preload CSS for ${i}`)))})}))}function r(a){const c=new Event("vite:preloadError",{cancelable:!0});if(c.payload=a,window.dispatchEvent(c),!c.defaultPrevented)throw a}return s.then(a=>{for(const c of a||[])c.status==="rejected"&&r(c.reason);return e().catch(r)})};function I(t){return Math.max(0,Math.min(1,t))}function k(t){const e=t[0]+t[1]+t[2];return e<=0?[1/3,1/3,1/3]:[t[0]/e,t[1]/e,t[2]/e]}function E(t){let e=1,o=t[0];for(let n=1;n<3;n++)t[n]>o&&(o=t[n],e=n+1);return e}function w(t,e,o=.5,n=2){return(t+o*n)/(e+n)}function L(t,e){return t.length<=e?t:t.slice(t.length-e)}function S(t){const e=t.filter(n=>n.hit!==null);return e.length?e.filter(n=>n.hit).length/e.length:null}function N(t){return`${t[0]}-${t[1]}-${t[2]}`}function _(t){return[...t].sort((e,o)=>e-o).join("-")}function G(t,e){const o=[0,0,0];let n=0;for(let s=0;s<3;s++){const r=e[s];let a=0,c=0;for(const d of t)d.cards[s]===r&&(c++,d.winner===s+1&&a++);n+=c,o[s]=w(a,c)}return{name:"숫자 기반",probs:k(o),weight:Math.min(1,n/60),sample:n,reason:`각 위치 숫자(${e.join(",")})의 과거 승률`}}function V(t){const e=[0,0,0];for(const s of t)e[s.winner-1]++;const o=t.length,n=[w(e[0],o),w(e[1],o),w(e[2],o)];return{name:"위치 기반",probs:k(n),weight:Math.min(1,o/40)*.6,sample:o,reason:"전체 위치별 승률 분포"}}function Y(t,e){const o=N(e),n=_(e),s=[0,0,0];let r=0,a=0;const c=[0,0,0];for(const l of t){const i=N(l.cards),p=_(l.cards);i===o?(r++,s[l.winner-1]++):p===n&&(a++,c[l.winner-1]++)}const d=[0,0,0];for(let l=0;l<3;l++){const i=w(s[l],r,.3333333333333333,Math.max(1,r?1:3)),p=w(c[l],a,1/3,3);d[l]=r>=3?i*.75+p*.25:p*.55+i*.45}return{name:"숫자+위치 조합",probs:k(d),weight:Math.min(1.2,(r*2+a)/20),sample:r+a,reason:r>0?`동일조합 ${r}판 · 순서무시 ${a}판`:a>0?`순서무시 조합 ${a}판`:"유사 조합 표본 부족 → 약한 신호"}}function z(t,e){const o=[30,50,100],n=[0,0,0];let s=0;for(const c of o){const d=L(t,c),l=c===30?1.4:c===50?1:.7;for(let i=0;i<3;i++){const p=e[i];let f=0,h=0;for(const x of d)x.cards[i]===p&&(h++,x.winner===i+1&&f++);let m=0;for(const x of d)x.winner===i+1&&m++;const v=w(m,d.length),J=w(f,h);n[i]+=(J*.65+v*.35)*l,s+=h}}let r=0,a=null;for(let c=t.length-1;c>=0;c--){const d=t[c];if(a===null)a=d.winner,r=1;else if(d.winner===a)r++;else break}if(a&&r>=2){const c=Math.min(.15,r*.03);n[a-1]+=c}return{name:"최근 흐름",probs:k(n),weight:Math.min(1.1,t.length/50),sample:s,reason:r>=2&&a?`최근 ${a}번 ${r}연승 · 단기 모멘텀 반영`:"최근 30/50/100판 숫자·위치 흐름"}}function Q(t,e){const o=t,n=L(t,300),s=[0,0,0];let r=0;for(let a=0;a<3;a++){const c=e[a];let d=0,l=0;for(const f of o)for(let h=0;h<3;h++)f.cards[h]===c&&(l++,f.winner===h+1&&d++);let i=0,p=0;for(const f of n)f.cards[a]===c&&(p++,f.winner===a+1&&i++);s[a]=w(d,l)*.45+w(i,p)*.55,r+=l+p}return{name:"전체 누적",probs:k(s),weight:Math.min(1,o.length/80),sample:r,reason:`전체 ${o.length}판 · 최근300 누적 승률`}}function X(t,e,o){const n=t.length,s=I(n/200),r=(()=>{const i=e.map(h=>E(h.probs)),p=E(o);return i.filter(h=>h===p).length/Math.max(1,i.length)})(),a=Math.max(...o)-Math.min(...o),c=S(t),d=c===null?.5:.35+c*.65,l=s*.35+r*.3+a*.2+d*.15;return Math.round(I(l)*1e3)/10}function Z(t,e){if(t.length===0)return{probs:[.3333333333333333,.3333333333333333,.3333333333333333],recommended:2,confidence:5,sample:0,recent50Rate:null,overallRate:null,reason:"저장된 데이터가 없습니다. 결과 입력으로 학습을 시작하세요.",engines:[]};const o=[G(t,e),V(t),Y(t,e),z(t,e),Q(t,e)],n=[0,0,0];let s=0;for(const m of o){const v=Math.max(.05,m.weight);n[0]+=m.probs[0]*v,n[1]+=m.probs[1]*v,n[2]+=m.probs[2]*v,s+=v}const r=k([n[0]/s,n[1]/s,n[2]/s]),a=E(r),c=X(t,o,r),d=L(t,50),l=S(d),i=S(t),p=[...o].sort((m,v)=>v.weight-m.weight)[0],f=m=>`${(m*100).toFixed(1)}%`,h=[`${a}번 ${(r[a-1]*100).toFixed(1)}%로 최고`,p?`주요신호: ${p.name}`:"",p?.reason||"",i!==null?`AI 적중 ${f(i)}`:""].filter(Boolean).join(" · ");return{probs:r,recommended:a,confidence:c,sample:t.length,recent50Rate:l,overallRate:i,reason:h,engines:o}}function C(t){const e=S(t),o=S(L(t,50)),n=I(t.length/200),s=e===null?.4:e,r=Math.round((n*.55+s*.45)*1e3)/10;return{total:t.length,recentHitRate:o,overallHitRate:e,confidence:r}}function tt(t){const e=[];for(let o=1;o<=10;o++){let n=0,s=0;for(const r of t)for(let a=0;a<3;a++)r.cards[a]===o&&(s++,r.winner===a+1&&n++);e.push({n:o,rate:s?n/s:0,total:s})}return e}function et(t){const e=[0,0,0];for(const n of t)e[n.winner-1]++;const o=t.length||1;return[1,2,3].map(n=>({pos:n,rate:e[n-1]/o,total:e[n-1]}))}function nt(t,e=20){const o=new Map;for(const n of t){const s=N(n.cards),r=o.get(s)||[0,0,0];r[n.winner-1]++,o.set(s,r)}return[...o.entries()].map(([n,s])=>{const r=s[0]+s[1]+s[2],a=E([s[0]/r,s[1]/r,s[2]/r]);return{key:n,wins:s,total:r,best:a}}).sort((n,s)=>s.total-n.total).slice(0,e)}function st(t){return[30,50,100,300].map(e=>{const o=L(t,e);return{label:`최근${e}판`,rate:S(o),n:o.length}})}const O="djgt_pick_ai_v1",j="djgt_pick_ai_backup_v1";function M(){return`${Date.now().toString(36)}_${Math.random().toString(36).slice(2,9)}`}function A(){try{const t=localStorage.getItem(O);if(!t)return[];const e=JSON.parse(t);return Array.isArray(e)?e:[]}catch{return[]}}function R(t){localStorage.setItem(O,JSON.stringify(t)),localStorage.setItem(j,JSON.stringify({savedAt:Date.now(),count:t.length,records:t}))}function at(t,e,o){const n=A(),s=o===null?null:o===e,r={id:M(),cards:t,winner:e,recommended:o,hit:s,createdAt:Date.now()};return n.push(r),R(n),r}function ot(){localStorage.removeItem(O),localStorage.removeItem(j)}function it(){const t=A();return JSON.stringify({app:"DoriJitGoTtaeng PICK AI",version:1,exportedAt:new Date().toISOString(),count:t.length,records:t},null,2)}function rt(t){const e=JSON.parse(t),o=Array.isArray(e)?e:e.records;if(!Array.isArray(o))throw new Error("유효하지 않은 백업 파일입니다.");const n=A(),s=new Set(n.map(a=>a.id));let r=0;for(const a of o)!a||!a.cards||!a.winner||!a.createdAt||s.has(a.id)||(n.push({id:a.id||M(),cards:a.cards,winner:a.winner,recommended:a.recommended??null,hit:a.hit??null,createdAt:a.createdAt}),s.add(a.id),r++);return n.sort((a,c)=>a.createdAt-c.createdAt),R(n),r}function T(){try{const t=localStorage.getItem(j);if(!t)return 0;const e=JSON.parse(t);return e.records?.length?(R(e.records),e.records.length):0}catch{return 0}}function ct(t){const e="id,card1,card2,card3,winner,recommended,hit,createdAt,iso",o=t.map(n=>[n.id,n.cards[0],n.cards[1],n.cards[2],n.winner,n.recommended??"",n.hit===null?"":n.hit?"1":"0",n.createdAt,new Date(n.createdAt).toISOString()].join(","));return[e,...o].join(`
`)}function lt(t){const e=t.trim().split(/\r?\n/);if(e.length<2)return[];const n=e[0].toLowerCase().includes("card1")?1:0,s=[];for(let r=n;r<e.length;r++){const a=e[r].split(",");if(a.length<5)continue;const c=[Number(a[1]),Number(a[2]),Number(a[3])],d=Number(a[4]);if(![1,2,3].includes(d)||c.some(f=>f<1||f>10||Number.isNaN(f)))continue;const l=a[5]?Number(a[5]):null,i=a[6],p=i===""||i===void 0?l===null?null:l===d:i==="1"||i.toLowerCase()==="true";s.push({id:a[0]||M(),cards:c,winner:d,recommended:l,hit:p,createdAt:Number(a[7])||Date.now()})}return s}function P(t,e,o){const n=new Blob([e],{type:o}),s=URL.createObjectURL(n),r=document.createElement("a");r.href=s,r.download=t,r.click(),URL.revokeObjectURL(s)}const D="djgt_pick_ai_install_dismissed",u={cards:[null,null,null],analysis:null,view:"play",records:[],search:"",online:typeof navigator>"u"?!0:navigator.onLine,showInstall:!1};function dt(){const t=window.matchMedia("(display-mode: standalone)").matches,e="standalone"in navigator&&!!navigator.standalone;return t||e}function ut(){const t=navigator.userAgent,e=/iPad|iPhone|iPod/.test(t)||navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1,o=/WebKit/.test(t),n=!/CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo/.test(t);return e&&o&&n}function pt(){const t=localStorage.getItem(D)==="1";u.showInstall=!t&&!dt()&&(ut()||/Android/i.test(navigator.userAgent))}function y(t,e=1){return t===null||Number.isNaN(t)?"—":`${(t*100).toFixed(e)}%`}function g(t){const e=document.getElementById("flash");e&&(e.textContent=t,e.classList.add("show"),window.setTimeout(()=>e.classList.remove("show"),1600))}function $(){u.records=A()}function F(){return u.cards.findIndex(t=>t===null)}function ft(t){const e=F();e<0||(u.cards[e]=t,e===2?mt():u.analysis=null,b())}function ht(){for(let t=2;t>=0;t--)if(u.cards[t]!==null){u.cards[t]=null,u.analysis=null;break}b()}function H(){u.cards=[null,null,null],u.analysis=null,b()}function mt(){const[t,e,o]=u.cards;t===null||e===null||o===null||(u.analysis=Z(u.records,[t,e,o]))}function vt(t){const[e,o,n]=u.cards;if(e===null||o===null||n===null){g("숫자를 먼저 입력하세요");return}const s=u.analysis?.recommended??null;at([e,o,n],t,s),$(),g(s===t?"저장 완료 · 적중 ✓":`저장 완료 · ${t}번 승리`),u.cards=[null,null,null],u.analysis=null,b()}function bt(t){const e=C(u.records),o=u.online?"":'<div class="offline-badge">오프라인 · 저장된 데이터로 분석 가능</div>',n=u.showInstall?`<div class="install-banner" id="install-banner">
        <div><strong>홈 화면에 추가</strong><br/>Safari 공유(□↑) → 「홈 화면에 추가」하면 앱처럼 실행됩니다.</div>
        <button type="button" id="dismiss-install" aria-label="닫기">×</button>
      </div>`:"";t.innerHTML=`
    <header class="header">
      <h1 class="brand">DoriJitGoTtaeng<span>PICK AI</span></h1>
      ${o}
      ${n}
      <div class="stats-row">
        <div class="stat-chip"><span class="label">데이터</span><span class="value">${e.total}</span></div>
        <div class="stat-chip"><span class="label">최근 적중</span><span class="value">${y(e.recentHitRate,0)}</span></div>
        <div class="stat-chip"><span class="label">전체 적중</span><span class="value">${y(e.overallHitRate,1)}</span></div>
        <div class="stat-chip"><span class="label">AI 신뢰도</span><span class="value">${e.confidence.toFixed(0)}%</span></div>
      </div>
    </header>
  `,t.querySelector("#dismiss-install")?.addEventListener("click",()=>{localStorage.setItem(D,"1"),u.showInstall=!1,b()})}function gt(t){const e=F(),o=u.cards.every(c=>c!==null),n=u.analysis,s=[0,1,2].map(c=>{const d=u.cards[c];return`<div class="${["slot",d!==null?"filled":"",e===c?"active":""].filter(Boolean).join(" ")}"><span class="pos">${c+1}번</span><span class="num">${d??"·"}</span></div>`}).join(""),r=Array.from({length:10},(c,d)=>d+1).map(c=>`<button type="button" data-num="${c}" ${o?"disabled":""}>${c}</button>`).join("");let a="";if(n){const c=n.probs.map((l,i)=>`<div class="prob-card ${n.recommended===i+1?"best":""}"><div class="pos-label">${i+1}번</div><div class="pct">${(l*100).toFixed(1)}%</div></div>`).join(""),d=n.engines.length>0?`<div class="engine-list">${n.engines.map(l=>`<div class="engine-row"><strong>${l.name}</strong><span>${(l.probs[0]*100).toFixed(0)}%</span><span>${(l.probs[1]*100).toFixed(0)}%</span><span>${(l.probs[2]*100).toFixed(0)}%</span></div>`).join("")}</div>`:"";a=`
      <section class="panel" style="animation-delay:0.05s">
        <h2>AI 분석 결과</h2>
        <div class="recommend-banner">추천 ${n.recommended}번</div>
        <div class="result-grid">${c}</div>
        <div class="meta-grid">
          <div class="meta-item"><span class="k">신뢰도</span><span class="v">${n.confidence}%</span></div>
          <div class="meta-item"><span class="k">표본</span><span class="v">${n.sample}</span></div>
          <div class="meta-item"><span class="k">최근50판</span><span class="v">${y(n.recent50Rate,0)}</span></div>
          <div class="meta-item"><span class="k">전체</span><span class="v">${y(n.overallRate,1)}</span></div>
        </div>
        <div class="reason">${n.reason}</div>
        ${d}
      </section>
    `}t.innerHTML=`
    <section class="panel">
      <h2>바닥 카드 입력</h2>
      <div class="slots">${s}</div>
      <div class="pad">${r}</div>
      <div class="actions">
        <button type="button" class="btn btn-ghost" id="btn-undo">UNDO</button>
        <button type="button" class="btn btn-danger" id="btn-clear">CLEAR</button>
      </div>
      <p class="hint">숫자 3번만 누르면 즉시 분석합니다.</p>
    </section>
    ${a}
    <section class="panel">
      <h2>결과 입력</h2>
      <div class="winner-pad">
        <button type="button" data-win="1" ${o?"":"disabled"}>①</button>
        <button type="button" data-win="2" ${o?"":"disabled"}>②</button>
        <button type="button" data-win="3" ${o?"":"disabled"}>③</button>
      </div>
      <p class="hint">승리한 위치를 누르면 저장되며 AI가 즉시 재학습합니다.</p>
    </section>
  `,t.querySelectorAll("[data-num]").forEach(c=>{c.addEventListener("click",()=>ft(Number(c.dataset.num)))}),t.querySelector("#btn-undo")?.addEventListener("click",ht),t.querySelector("#btn-clear")?.addEventListener("click",H),t.querySelectorAll("[data-win]").forEach(c=>{c.addEventListener("click",()=>vt(Number(c.dataset.win)))})}function B(t){const e=u.records,o=tt(e),n=et(e),s=nt(e,25),r=st(e),a=C(e),c=u.search.trim().toLowerCase(),d=e.slice().reverse().filter(i=>c?`${i.cards.join(" ")} ${i.winner} ${i.recommended??""} ${i.id}`.toLowerCase().includes(c):!0).slice(0,200);t.innerHTML=`
    <section class="panel">
      <h2>요약</h2>
      <div class="meta-grid">
        <div class="meta-item"><span class="k">표본</span><span class="v">${e.length}</span></div>
        <div class="meta-item"><span class="k">AI 적중</span><span class="v">${y(a.overallHitRate)}</span></div>
        <div class="meta-item"><span class="k">최근 적중</span><span class="v">${y(a.recentHitRate)}</span></div>
        <div class="meta-item"><span class="k">신뢰도</span><span class="v">${a.confidence.toFixed(0)}%</span></div>
      </div>
    </section>

    <section class="panel">
      <h2>위치별 승률</h2>
      ${n.map(i=>`
        <div style="margin-bottom:10px">
          <div class="meta-item"><span class="k">${i.pos}번</span><span class="v">${y(i.rate)} (${i.total})</span></div>
          <div class="bar"><i style="width:${(i.rate*100).toFixed(1)}%"></i></div>
        </div>`).join("")}
    </section>

    <section class="panel">
      <h2>숫자별 승률</h2>
      <div class="table-wrap">
        <table>
          <thead><tr><th>숫자</th><th>승률</th><th>표본</th></tr></thead>
          <tbody>
            ${o.map(i=>`<tr><td>${i.n}</td><td>${y(i.rate)}</td><td>${i.total}</td></tr>`).join("")}
          </tbody>
        </table>
      </div>
    </section>

    <section class="panel">
      <h2>최근 승률 (AI 적중)</h2>
      ${r.map(i=>`<div class="meta-item" style="margin-bottom:6px"><span class="k">${i.label}</span><span class="v">${y(i.rate)} · ${i.n}판</span></div>`).join("")}
      <div class="meta-item"><span class="k">전체</span><span class="v">${y(a.overallHitRate)}</span></div>
    </section>

    <section class="panel">
      <h2>조합별 승률 (상위)</h2>
      <div class="table-wrap">
        <table>
          <thead><tr><th>조합</th><th>표본</th><th>유리</th><th>1/2/3</th></tr></thead>
          <tbody>
            ${s.length?s.map(i=>{const p=i.wins.map(f=>i.total?(f/i.total*100).toFixed(0):"0");return`<tr><td>${i.key}</td><td>${i.total}</td><td>${i.best}번</td><td>${p.join("/")}</td></tr>`}).join(""):'<tr><td colspan="4">데이터 없음</td></tr>'}
          </tbody>
        </table>
      </div>
    </section>

    <section class="panel">
      <h2>데이터 검색</h2>
      <input class="search" id="stats-search" type="search" placeholder="숫자·위치·ID 검색" value="${yt(u.search)}" />
      <div class="table-wrap">
        <table>
          <thead><tr><th>카드</th><th>승</th><th>추천</th><th>적중</th><th>시간</th></tr></thead>
          <tbody>
            ${d.length?d.map(i=>{const p=i.hit===null?"—":i.hit?"✓":"✗",f=new Date(i.createdAt).toLocaleString("ko-KR",{month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"});return`<tr><td>${i.cards.join("-")}</td><td>${i.winner}</td><td>${i.recommended??"—"}</td><td>${p}</td><td>${f}</td></tr>`}).join(""):'<tr><td colspan="5">결과 없음</td></tr>'}
          </tbody>
        </table>
      </div>
    </section>
  `;const l=t.querySelector("#stats-search");l?.addEventListener("input",()=>{u.search=l.value,B(t);const i=t.querySelector("#stats-search");if(i?.focus(),i){const p=i.value.length;i.setSelectionRange(p,p)}})}function yt(t){return t.replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;")}function wt(t){t.innerHTML=`
    <section class="panel">
      <h2>데이터 관리</h2>
      <p class="hint" style="margin-top:0;margin-bottom:12px">
        모든 데이터는 이 기기 브라우저에만 저장됩니다. 자동 저장 · 자동 백업됩니다.
      </p>
      <div class="data-actions">
        <button type="button" class="btn btn-gold" id="export-csv">CSV 내보내기</button>
        <button type="button" class="btn btn-ghost" id="import-csv">CSV 가져오기</button>
        <button type="button" class="btn btn-gold" id="export-bak">백업 (JSON)</button>
        <button type="button" class="btn btn-ghost" id="import-bak">복원 (JSON)</button>
        <button type="button" class="btn btn-ghost" id="restore-auto">자동백업 복원</button>
        <button type="button" class="btn btn-danger" id="reset-all">초기화</button>
      </div>
      <input type="file" id="file-csv" accept=".csv,text/csv" class="hidden" />
      <input type="file" id="file-bak" accept=".json,application/json" class="hidden" />
      <p class="hint">현재 저장: ${u.records.length}건</p>
    </section>

    <section class="panel">
      <h2>홈 화면 설치 (iPhone)</h2>
      <ol class="hint" style="padding-left:18px;margin:0">
        <li>Safari로 이 페이지를 엽니다.</li>
        <li>공유 버튼(□↑)을 탭합니다.</li>
        <li>「홈 화면에 추가」를 선택합니다.</li>
        <li>추가 후 아이콘으로 앱처럼 실행합니다.</li>
      </ol>
    </section>
  `;const e=t.querySelector("#file-csv"),o=t.querySelector("#file-bak");t.querySelector("#export-csv")?.addEventListener("click",()=>{P(`pick-ai-${Date.now()}.csv`,ct(u.records),"text/csv;charset=utf-8"),g("CSV 내보내기 완료")}),t.querySelector("#import-csv")?.addEventListener("click",()=>e.click()),e.addEventListener("change",async()=>{const n=e.files?.[0];if(n)try{const s=await n.text(),r=lt(s);if(!r.length)throw new Error("가져올 행이 없습니다.");const a=A(),c=new Set(a.map(l=>l.id));let d=0;for(const l of r)c.has(l.id)||(a.push(l),c.add(l.id),d++);a.sort((l,i)=>l.createdAt-i.createdAt),R(a),$(),g(`${d}건 가져오기 완료`),b()}catch(s){g(s instanceof Error?s.message:"가져오기 실패")}finally{e.value=""}}),t.querySelector("#export-bak")?.addEventListener("click",()=>{P(`pick-ai-backup-${Date.now()}.json`,it(),"application/json"),g("백업 완료")}),t.querySelector("#import-bak")?.addEventListener("click",()=>o.click()),o.addEventListener("change",async()=>{const n=o.files?.[0];if(n)try{const s=await n.text(),r=rt(s);$(),g(`${r}건 복원`),b()}catch(s){g(s instanceof Error?s.message:"복원 실패")}finally{o.value=""}}),t.querySelector("#restore-auto")?.addEventListener("click",()=>{const n=T();$(),g(n?`${n}건 자동백업 복원`:"자동백업 없음"),b()}),t.querySelector("#reset-all")?.addEventListener("click",()=>{confirm("모든 학습 데이터를 삭제할까요? 이 작업은 되돌릴 수 없습니다.")&&(ot(),$(),H(),g("초기화 완료"),b())})}function $t(t){t.innerHTML=`
    <nav class="nav">
      <button type="button" data-view="play" class="${u.view==="play"?"active":""}">분석</button>
      <button type="button" data-view="stats" class="${u.view==="stats"?"active":""}">통계</button>
      <button type="button" data-view="data" class="${u.view==="data"?"active":""}">데이터</button>
    </nav>
  `,t.querySelectorAll("[data-view]").forEach(e=>{e.addEventListener("click",()=>{u.view=e.dataset.view,b()})})}function b(){const t=document.getElementById("app");if(!t)return;t.innerHTML=`
    <div id="header-root"></div>
    <div id="view-root"></div>
    <div id="nav-root"></div>
  `,bt(t.querySelector("#header-root"));const e=t.querySelector("#view-root");u.view==="play"?gt(e):u.view==="stats"?B(e):wt(e),$t(t.querySelector("#nav-root"))}function St(){$(),pt(),u.records.length===0&&T()&&$(),window.addEventListener("online",()=>{u.online=!0,b()}),window.addEventListener("offline",()=>{u.online=!1,b()}),b()}St();"serviceWorker"in navigator&&U(async()=>{const{registerSW:t}=await import("./virtual_pwa-register-BQ-FLKW7.js");return{registerSW:t}},[],import.meta.url).then(({registerSW:t})=>{t({immediate:!0})}).catch(()=>{});export{U as _};
