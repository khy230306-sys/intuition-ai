(function(){const n=document.createElement("link").relList;if(n&&n.supports&&n.supports("modulepreload"))return;for(const r of document.querySelectorAll('link[rel="modulepreload"]'))s(r);new MutationObserver(r=>{for(const i of r)if(i.type==="childList")for(const u of i.addedNodes)u.tagName==="LINK"&&u.rel==="modulepreload"&&s(u)}).observe(document,{childList:!0,subtree:!0});function a(r){const i={};return r.integrity&&(i.integrity=r.integrity),r.referrerPolicy&&(i.referrerPolicy=r.referrerPolicy),r.crossOrigin==="use-credentials"?i.credentials="include":r.crossOrigin==="anonymous"?i.credentials="omit":i.credentials="same-origin",i}function s(r){if(r.ep)return;r.ep=!0;const i=a(r);fetch(r.href,i)}})();const at=6;function X(t){const n=[],a=t.trim().toUpperCase();if(!a)return n;const s=a.match(/뱅커|플레이어|타이|BANKER|PLAYER|TIE|[BPT]|빨강|파랑|빨간|파란/g);if(s&&s.length>0){for(const r of s)r==="B"||r==="BANKER"||r==="뱅커"||r==="빨강"||r==="빨간"?n.push("B"):r==="P"||r==="PLAYER"||r==="플레이어"||r==="파랑"||r==="파란"?n.push("P"):n.push("T");return n}for(const r of a.replace(/[^BPT]/g,""))(r==="B"||r==="P"||r==="T")&&n.push(r);return n}function j(t){return t.join("")}function $(t){return t.filter(n=>n!=="T").length}function rt(t){const n=[];let a=null;for(const s of t){if(s==="T"){a&&(a.tiesAfter+=1);continue}if(!a||a.outcome!==s){const i=[{outcome:s,tiesAfter:0}];n.push(i),a=i[0];continue}const r=n[n.length-1];if(r.length<at){const i={outcome:s,tiesAfter:0};r.push(i),a=i}else{const i={outcome:s,tiesAfter:0};n.push([i]),a=i}}return n}function it(t,n){if(n<=0)return[];let a=0;const s=[];for(const r of t)if(s.push(r),r!=="T"&&(a+=1,a>=n))break;return s}function P(t,n){let a=n,s=0;for(;a<t.length&&t[a]==="T";)s+=1,a+=1;return{index:a,ties:s}}function ot(t,n,a){const{index:s}=P(t,n);if(s>=t.length)return{ok:!1,nextIndex:s,expected:null};const r=t[s];if(r==="T")return{ok:!1,nextIndex:s,expected:r};const i=r===a;return{ok:i,nextIndex:i?s+1:s,expected:r}}function E(t){const n=t.filter(r=>r==="O").length,a=t.filter(r=>r==="X").length,s=n+a;return{hits:n,misses:a,rate:s===0?null:n/s}}const K="baccarat_return_sessions_v1",Y="baccarat_return_last_pattern_v1";function G(){try{const t=localStorage.getItem(K);if(!t)return[];const n=JSON.parse(t);return Array.isArray(n)?n:[]}catch{return[]}}function ct(t){localStorage.setItem(K,JSON.stringify(t.slice(0,100)))}function lt(t){const n=[t,...G()].slice(0,100);return ct(n),n}function dt(){localStorage.removeItem(K)}function C(t){localStorage.setItem(Y,t)}function W(){return localStorage.getItem(Y)??""}function ut(t){return new Promise((n,a)=>{const s=URL.createObjectURL(t),r=new Image;r.onload=()=>{URL.revokeObjectURL(s),n(r)},r.onerror=()=>{URL.revokeObjectURL(s),a(new Error("이미지를 불러오지 못했습니다"))},r.src=s})}function J(t,n,a){const s=Math.max(t,n,a),r=Math.min(t,n,a),i=s===0?0:(s-r)/s,u=(t+n+a)/3;return u>210||u<35||i<.22?"empty":t>140&&t>n+30&&t>a+30?"B":a>140&&a>t+25&&a>=n-10?"P":n>130&&n>t+20&&n>a+10?"T":"empty"}async function pt(t){const n=await ut(t),s=Math.min(1,960/n.width),r=Math.max(1,Math.round(n.width*s)),i=Math.max(1,Math.round(n.height*s)),u=document.createElement("canvas");u.width=r,u.height=i;const c=u.getContext("2d",{willReadFrequently:!0});if(!c)throw new Error("캔버스를 사용할 수 없습니다");c.drawImage(n,0,0,r,i);const h=Math.floor(i*.45),d=c.getImageData(0,h,r,i-h),{width:o,height:f,data:v}=d,S=28,L=7,k=o/S,T=f/L,M=Array.from({length:S},()=>Array.from({length:L},()=>"empty"));for(let l=0;l<S;l++)for(let p=0;p<L;p++){const g={B:0,P:0,T:0,empty:0},H=Math.floor(l*k+k*.25),N=Math.floor(l*k+k*.75),_=Math.floor(p*T+T*.25),D=Math.floor(p*T+T*.75);for(let x=_;x<D;x++)for(let w=H;w<N;w++){const R=(x*o+w)*4,st=J(v[R],v[R+1],v[R+2]);g[st]+=1}const tt=Object.entries(g).sort((x,w)=>w[1]-x[1]),[F,et]=tt[0],nt=Math.max(1,(N-H)*(D-_));M[l][p]=et/nt>.12&&F!=="empty"?F:"empty"}const I=[];for(let l=0;l<S;l++)M[l].some(p=>p==="B"||p==="P")&&I.push(l);if(I.length===0)return ft(c,r,i);const B=[];for(const l of I)for(let p=0;p<L;p++){const g=M[l][p];(g==="B"||g==="P"||g==="T")&&B.push({col:l,row:p,kind:g})}B.sort((l,p)=>l.col-p.col||l.row-p.row);const y=[];let O=-1,A=null;for(const l of B){if(l.kind==="T"){y.length>0&&y.push("T");continue}(l.col===O&&l.kind===A||l.col!==O||l.kind!==A)&&y.push(l.kind),O=l.col,A=l.kind}return z(y)}function ft(t,n,a){const s=t.getImageData(0,0,n,a),r=4,i=[];for(let d=0;d<a;d+=r)for(let o=0;o<n;o+=r){const f=(d*n+o)*4,v=J(s.data[f],s.data[f+1],s.data[f+2]);(v==="B"||v==="P")&&i.push({x:o,y:d,kind:v})}if(i.length<3)return[];i.sort((d,o)=>d.x-o.x||d.y-o.y);const u=Math.max(8,n*.02),c=[];for(const d of i){const o=c.find(f=>Math.abs(f.x-d.x)<u);o?(o.items.push(d),o.x=(o.x*(o.items.length-1)+d.x)/o.items.length):c.push({x:d.x,items:[d]})}c.sort((d,o)=>d.x-o.x);const h=[];for(const d of c){d.items.sort((f,v)=>f.y-v.y);const o=[];for(const f of d.items){const v=o[o.length-1];v&&Math.abs(v.y-f.y)<a*.02&&v.kind===f.kind||o.push(f)}for(const f of o)h.push(f.kind)}return z(h)}function z(t){return t.length>120?t.slice(0,120):t}const Q="baccarat_return_install_dismissed",e={view:"setup",patternText:W(),pattern:X(W()),previewUrl:"",source:"manual",scanning:!1,status:"idle",cursor:0,revealed:0,marks:[],banner:"",bannerKind:"",sessions:G(),online:typeof navigator>"u"?!0:navigator.onLine,showInstall:!1};function ht(){const t=window.matchMedia("(display-mode: standalone)").matches,n="standalone"in navigator&&!!navigator.standalone;return t||n}function mt(){const t=navigator.userAgent,n=/iPad|iPhone|iPod/.test(t)||navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1,a=/WebKit/.test(t),s=!/CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo/.test(t);return n&&a&&s}function vt(){const t=localStorage.getItem(Q)==="1";e.showInstall=!t&&!ht()&&(mt()||/Android/i.test(navigator.userAgent))}function V(t,n=1){return t===null||Number.isNaN(t)?"—":`${(t*100).toFixed(n)}%`}function b(t){const n=document.getElementById("flash");n&&(n.textContent=t,n.classList.add("show"),window.setTimeout(()=>n.classList.remove("show"),1600))}function q(t){e.patternText=t,e.pattern=X(t),C(j(e.pattern))}function bt(t=!0){t||(e.pattern=[],e.patternText="",C("")),e.status="idle",e.cursor=0,e.revealed=0,e.marks=[],e.banner="",e.bannerKind=""}function Z(){if(q(e.patternText),$(e.pattern)===0){b("B/P 패턴을 먼저 입력하세요");return}bt(!0),e.status="playing",e.view="play";const t=P(e.pattern,0);e.cursor=t.index,t.ties>0?(e.banner=t.ties===1?"타이":`타이 ×${t.ties}`,e.bannerKind="tie",b(e.banner)):(e.banner="처음부터 맞춰보세요",e.bannerKind=""),m()}function U(t){e.status=t;const{hits:n,misses:a}=E(e.marks),s={id:`${Date.now()}`,createdAt:Date.now(),pattern:[...e.pattern],marks:[...e.marks],status:t,hitCount:n,missCount:a,source:e.source};e.sessions=lt(s),e.banner=t==="cleared"?"클리어 · 전체 적중":"실패",e.bannerKind=t==="cleared"?"ok":"fail",b(e.banner)}function gt(t){if(e.status!=="playing")return;const n=P(e.pattern,e.cursor);if(n.ties>0&&(e.cursor=n.index,e.banner=n.ties===1?"타이":`타이 ×${n.ties}`,e.bannerKind="tie",b(e.banner)),e.cursor>=e.pattern.length){U("cleared"),m();return}const a=ot(e.pattern,e.cursor,t);if(!a.expected||a.expected==="T"){m();return}if(a.ok){e.marks.push("O"),e.revealed+=1,e.cursor=a.nextIndex,e.banner="적중",e.bannerKind="ok",b("적중");const s=P(e.pattern,e.cursor);s.ties>0&&(e.cursor=s.index,e.banner=s.ties===1?"타이":`타이 ×${s.ties}`,e.bannerKind="tie",b(e.banner)),e.cursor>=e.pattern.length&&U("cleared")}else e.marks.push("X"),U("failed");m()}async function yt(t){e.previewUrl&&URL.revokeObjectURL(e.previewUrl),e.previewUrl=URL.createObjectURL(t),e.scanning=!0,e.source="photo",m();try{const n=await pt(t);n.length===0?b("패턴을 찾지 못했습니다 · 직접 입력하세요"):(e.pattern=n,e.patternText=j(n),C(e.patternText),b(`패턴 ${$(n)}칸 인식 · 확인 후 시작`))}catch(n){b(n instanceof Error?n.message:"인식 실패")}finally{e.scanning=!1,m()}}function xt(t){const n=e.sessions.slice(0,20),a=n.flatMap(c=>c.marks),s=E(a),r=n.filter(c=>c.status==="cleared").length,i=e.online?"":'<div class="offline-badge">오프라인 · 저장된 패턴으로 복귀 가능</div>',u=e.showInstall?`<div class="install-banner" id="install-banner">
        <div><strong>홈 화면에 추가</strong><br/>Safari 공유(□↑) → 「홈 화면에 추가」하면 앱처럼 실행됩니다.</div>
        <button type="button" id="dismiss-install" aria-label="닫기">×</button>
      </div>`:"";t.innerHTML=`
    <header class="header">
      <h1 class="brand">Baccarat<span>RETURN · 복귀</span></h1>
      ${i}
      ${u}
      <div class="stats-row">
        <div class="stat-chip"><span class="label">패턴</span><span class="value">${$(e.pattern)}</span></div>
        <div class="stat-chip"><span class="label">세션</span><span class="value">${e.sessions.length}</span></div>
        <div class="stat-chip"><span class="label">적중률</span><span class="value">${V(s.rate,0)}</span></div>
        <div class="stat-chip"><span class="label">클리어</span><span class="value">${r}</span></div>
      </div>
    </header>
  `,t.querySelector("#dismiss-install")?.addEventListener("click",()=>{localStorage.setItem(Q,"1"),e.showInstall=!1,m()})}function wt(t){const n=rt(t);return n.length===0?'<div class="road-wrap"><div class="big-road"></div></div>':`<div class="road-wrap"><div class="big-road">${n.map(s=>`<div class="road-col">${Array.from({length:6},(i,u)=>{const c=s[u];if(!c)return'<div class="bead" style="visibility:hidden"></div>';const h=c.tiesAfter>0?`<span class="tie-mark">${c.tiesAfter>1?c.tiesAfter:"/"}</span>`:"";return`<div class="bead ${c.outcome}">${h}</div>`}).join("")}</div>`).join("")}</div></div>`}function $t(t){return t.length===0?'<div class="ox-board"><span class="ox-empty">아직 없음</span></div>':`<div class="ox-board">${t.map(n=>`<span class="ox-cell ${n}">${n}</span>`).join("")}</div>`}function St(t){const n=e.pattern.slice(0,48).map(s=>`<span class="seq-chip ${s}">${s}</span>`).join(""),a=e.pattern.length>48?`<span class="ox-empty">+${e.pattern.length-48}</span>`:"";t.innerHTML=`
    <section class="panel">
      <h2>1. 사진으로 패턴 기억</h2>
      <p class="hint">로비/테이블 대로표를 찍어서 올리면 빨간(B)·파란(P) 패턴을 읽습니다. 화면 사진도 가능하지만, 시작 전 한 번 확인해 주세요.</p>
      ${e.previewUrl?`<img class="preview" src="${e.previewUrl}" alt="업로드 미리보기" />`:""}
      <label class="btn btn-gold file-btn" style="margin-bottom:10px;text-align:center;">
        ${e.scanning?"인식 중…":"사진 업로드"}
        <input id="photo" type="file" accept="image/*" capture="environment" ${e.scanning?"disabled":""} />
      </label>
      <div class="legend">
        <span><i class="b"></i>B 뱅커</span>
        <span><i class="p"></i>P 플레이어</span>
        <span><i class="t"></i>T 타이(안내만)</span>
      </div>
    </section>

    <section class="panel">
      <h2>2. 패턴 확인 · 수정</h2>
      <p class="hint">B / P / T 또는 뱅커·플레이어·타이 텍스트로 수정할 수 있습니다. 타이는 복귀 중 「타이」안내만 하고 성공/실패에 넣지 않습니다.</p>
      <textarea id="pattern" class="pattern-input" placeholder="예: BBP T PBBP">${e.patternText}</textarea>
      <div class="chip-row">${n||'<span class="ox-empty">패턴 없음</span>'}${a}</div>
      <div class="actions">
        <button type="button" class="btn" id="btn-clear-pattern">패턴 지우기</button>
        <button type="button" class="btn btn-gold" id="btn-start">복귀 시작</button>
      </div>
    </section>
  `,t.querySelector("#photo")?.addEventListener("change",s=>{const i=s.target.files?.[0];i&&yt(i)}),t.querySelector("#pattern")?.addEventListener("input",s=>{const r=s.target.value;e.source="manual",q(r);const i=t.querySelector(".chip-row");if(i){const c=e.pattern,h=c.slice(0,48).map(o=>`<span class="seq-chip ${o}">${o}</span>`).join(""),d=c.length>48?`<span class="ox-empty">+${c.length-48}</span>`:"";i.innerHTML=h?h+d:'<span class="ox-empty">패턴 없음</span>'}const u=document.querySelector(".stats-row .stat-chip .value");u&&(u.textContent=String($(e.pattern)))}),t.querySelector("#btn-clear-pattern")?.addEventListener("click",()=>{q(""),e.previewUrl&&(URL.revokeObjectURL(e.previewUrl),e.previewUrl=""),e.source="manual",m()}),t.querySelector("#btn-start")?.addEventListener("click",()=>Z())}function Lt(t){const n=e.status==="playing",a=e.status==="cleared"||e.status==="failed",s=it(e.pattern,e.revealed),r=E(e.marks),i=$(e.pattern),u=e.bannerKind?` status-banner ${e.bannerKind}`:" status-banner";t.innerHTML=`
    <section class="panel">
      <div class="${u.trim()}">${e.banner||(n?"B / P 를 입력하세요":"패턴을 준비하고 시작하세요")}</div>
      <div class="board-label">
        <h2>대로표</h2>
        <span class="meta">${e.revealed} / ${i}</span>
      </div>
      ${wt(s)}
      <p class="hint">맞출 때마다 정답이 대로표에 하나씩 표시됩니다.</p>
    </section>

    <section class="panel">
      <div class="board-label">
        <h2>성공 · 실패 표</h2>
        <span class="meta">O ${r.hits} · X ${r.misses}</span>
      </div>
      ${$t(e.marks)}
      <p class="hint">성공 O / 실패 X · 타이는 표에 넣지 않습니다.</p>
    </section>

    <section class="panel">
      <h2>입력</h2>
      <div class="guess-pad">
        <button type="button" class="banker" data-guess="B" ${n?"":"disabled"}>B 뱅커</button>
        <button type="button" class="player" data-guess="P" ${n?"":"disabled"}>P 플레이어</button>
      </div>
      <div class="actions" style="margin-top:10px;">
        <button type="button" class="btn" id="btn-retry" ${a||e.status==="idle"?"":"disabled"}>다시 복귀</button>
        <button type="button" class="btn btn-danger" id="btn-to-setup">패턴 수정</button>
      </div>
    </section>
  `,t.querySelectorAll("[data-guess]").forEach(c=>{c.addEventListener("click",()=>{const h=c.dataset.guess;(h==="B"||h==="P")&&gt(h)})}),t.querySelector("#btn-retry")?.addEventListener("click",()=>Z()),t.querySelector("#btn-to-setup")?.addEventListener("click",()=>{e.view="setup",m()})}function kt(t){if(e.sessions.length===0){t.innerHTML='<section class="panel"><div class="empty">아직 복귀 기록이 없습니다.</div></section>';return}const n=e.sessions.map(a=>{const s=new Date(a.createdAt),r=`${s.getMonth()+1}/${s.getDate()} ${String(s.getHours()).padStart(2,"0")}:${String(s.getMinutes()).padStart(2,"0")}`,i=E(a.marks).rate;return`<tr>
        <td>${r}</td>
        <td>${a.status==="cleared"?"클리어":"실패"}</td>
        <td>${a.hitCount}/${a.hitCount+a.missCount}</td>
        <td>${V(i,0)}</td>
        <td>${a.source==="photo"?"사진":"수동"}</td>
      </tr>`}).join("");t.innerHTML=`
    <section class="panel">
      <h2>복귀 기록</h2>
      <div class="table-wrap">
        <table>
          <thead><tr><th>시간</th><th>결과</th><th>적중</th><th>비율</th><th>출처</th></tr></thead>
          <tbody>${n}</tbody>
        </table>
      </div>
      <div class="actions" style="margin-top:12px;">
        <button type="button" class="btn btn-danger" id="btn-clear-history">기록 삭제</button>
        <button type="button" class="btn" id="btn-export">요약 복사</button>
      </div>
    </section>
  `,t.querySelector("#btn-clear-history")?.addEventListener("click",()=>{confirm("모든 복귀 기록을 삭제할까요?")&&(dt(),e.sessions=[],b("기록 삭제됨"),m())}),t.querySelector("#btn-export")?.addEventListener("click",async()=>{const a=e.sessions.map(s=>`${new Date(s.createdAt).toISOString()}	${s.status}	${s.hitCount}/${s.hitCount+s.missCount}	${j(s.pattern)}`).join(`
`);try{await navigator.clipboard.writeText(a),b("기록을 복사했습니다")}catch{b("복사 실패")}})}function Tt(t){const n=[{id:"setup",label:"패턴"},{id:"play",label:"복귀"},{id:"history",label:"기록"}];t.innerHTML=n.map(a=>`<button type="button" data-view="${a.id}" class="${e.view===a.id?"active":""}">${a.label}</button>`).join(""),t.querySelectorAll("[data-view]").forEach(a=>{a.addEventListener("click",()=>{e.view=a.dataset.view,m()})})}function m(){const t=document.getElementById("app");if(!t)return;t.innerHTML='<div id="header"></div><div id="main"></div><nav class="nav" id="nav"></nav>',xt(t.querySelector("#header"));const n=t.querySelector("#main");e.view==="setup"?St(n):e.view==="play"?Lt(n):kt(n),Tt(t.querySelector("#nav"))}function Pt(){vt(),window.addEventListener("online",()=>{e.online=!0,m()}),window.addEventListener("offline",()=>{e.online=!1,m()}),e.pattern.length>0&&(e.status="idle"),m()}Pt();
