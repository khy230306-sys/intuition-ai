(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const i of document.querySelectorAll('link[rel="modulepreload"]'))s(i);new MutationObserver(i=>{for(const r of i)if(r.type==="childList")for(const o of r.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&s(o)}).observe(document,{childList:!0,subtree:!0});function n(i){const r={};return i.integrity&&(r.integrity=i.integrity),i.referrerPolicy&&(r.referrerPolicy=i.referrerPolicy),i.crossOrigin==="use-credentials"?r.credentials="include":i.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function s(i){if(i.ep)return;i.ep=!0;const r=n(i);fetch(i.href,r)}})();const q=[6,8,10,12,16,20,30],G=1,Y=5,K=4,J=.55,Z=160,D=900,z={exact:.28,runLength:.22,roadShape:.16,recentSegment:.14,mirror:.1,contextLength:.05,recency:.05},V=3,Q=.12,tt=.6,H=35,et=88,nt=50,N={history:"intuitionHistory",predictionRecords:"predictionRecords",patternMemory:"patternMemory"},$=24;function rt(t){const{matchCount:e,historyLength:n,nextSideAgreement:s,expected:i,alternative:r,hidden:o}=t;if(n===0)return nt;if(e===0)return H;const u=Math.min(1,e/24),a=i?.share??0,c=r?.share??0,l=o?.share??0,d=[a,c,l].filter(S=>S>0).sort((S,M)=>M-S),h=d[0]??0,g=d[1]??0,P=g>0&&h-g<.12?.18:g>.28?.12:0,E=s,y=h,p=Math.min(1,n/80);let I=.34*E+.26*y+.22*u+.18*p;I-=P;const f=Math.round(I*100);return Math.max(H,Math.min(et,f))}function C(t){const e=[];for(const n of t)(n==="B"||n==="P")&&e.push(n);return e}function it(t){return t==="B"?"P":"B"}function T(t){return t.map(it)}function x(t){return t.join("")}function st(t){const e=Math.max(G,Math.min(Y,Math.floor(t))),n=[],s=1<<e;for(let i=0;i<s;i+=1){const r=[];for(let o=e-1;o>=0;o-=1)r.push(i>>o&1?"P":"B");n.push(r)}return n}function ot(t){if(t.length===0)return[];const e=[];let n=1;for(let s=1;s<t.length;s+=1)t[s]===t[s-1]?n+=1:(e.push(n),n=1);return e.push(n),e}function ct(t){if(t.length===0)return[];const e=[t[0]];for(let n=1;n<t.length;n+=1)t[n]!==t[n-1]&&e.push(t[n]);return e}function v(t){const e=ot(t),n=ct(t),s=t.length===0?null:t[t.length-1],i=e.length===0?0:e[e.length-1];return{sequence:[...t],runLengths:e,runSides:n,currentRunLength:i,currentSide:s,transitions:Math.max(0,e.length-1)}}function U(t,e){const n=Math.max(t.length,e.length,1);let s=0,i=0;for(let r=0;r<n;r+=1){const o=t[t.length-n+r]??0,u=e[e.length-n+r]??0;s+=Math.abs(o-u),i+=Math.max(o,u,1)}return Math.max(0,1-s/i)}function w(t,e){const n=Math.min(t.length,e.length);if(n===0)return 0;const s=t.slice(-n),i=e.slice(-n);let r=0;for(let o=0;o<n;o+=1)s[o]===i[o]&&(r+=1);return r/n}function at(t,e,n=4){const s=Math.min(n,t.length,e.length);return s===0?0:w(t.slice(-s),e.slice(-s))}function ut(t,e){const n=U(t.runLengths,e.runLengths),s=Math.max(t.transitions,e.transitions,1),i=1-Math.abs(t.transitions-e.transitions)/s,r=Math.max(t.currentRunLength,e.currentRunLength,1),o=1-Math.abs(t.currentRunLength-e.currentRunLength)/r;return n*.55+i*.25+o*.2}function lt(t,e){return w(t,T(e))}function dt(t,e){if(!t.currentSide)return Array.from({length:e},()=>"P");const n=[];for(let s=0;s<e;s+=1)n.push(t.currentSide);return n}function j(t){if(t.length<2)return!1;for(let e=1;e<t.length;e+=1)if(t[e]===t[e-1])return!1;return!0}function ht(t,e){if(e.length===0)return"OTHER";const n=e[0];return t?n===t?"CONTINUE":e.length===1?"FLIP_ONCE":e.length>=3&&j(e)?"ALTERNATING":e[1]===t?"FLIP_RETURN":j(e)?"ALTERNATING":e.every(i=>i===n)?"FLIP_ONCE":"OTHER":"OTHER"}function A(t,e){const n=Math.min(t.length,e.length);if(n===0)return 1;let s=0;for(let i=0;i<n;i+=1)t[i]!==e[i]&&(s+=1);return s/n}function ft(t,e){const n=new Map;for(const r of t){if(r.continuation.length===0)continue;const o=ht(e,r.continuation),u=r.continuation[0],a=x(r.continuation.slice(0,Math.min(4,r.continuation.length))),c=`${o}|${u}|${a}`,l=n.get(c);l?(l.weight+=r.similarity,l.count+=1,l.simSum+=r.similarity,l.paths.push(r.continuation)):n.set(c,{type:o,nextSide:u,key:c,weight:r.similarity,count:1,simSum:r.similarity,paths:[r.continuation]})}const s=[...n.values()].reduce((r,o)=>r+o.weight,0)||1;return[...n.values()].map(r=>{const o=new Map;for(const a of r.paths){const c=x(a),l=o.get(c);l?l.n+=1:o.set(c,{path:a,n:1})}const u=[...o.values()].sort((a,c)=>c.n-a.n)[0].path;return{type:r.type,representative:u,nextSide:r.nextSide,weight:r.weight,count:r.count,avgSimilarity:r.simSum/r.count,share:r.weight/s}}).sort((r,o)=>o.weight-r.weight||o.count-r.count)}function R(t,e){return t?{path:t.representative,type:t.type,nextSide:t.nextSide,weight:t.weight,count:t.count,share:t.share,label:e}:null}function pt(t){return R(t[0],"EXPECTED")}function mt(t,e){if(!e)return R(t[1],"ALTERNATIVE");const n=t.find(s=>s.nextSide!==e.nextSide?!0:A(s.representative,e.path)>=.34);return R(n,"ALTERNATIVE")}function gt(t,e,n,s,i){const r=v(e),o=dt(r,i),a=t.filter(c=>{if(c.count<V||c.share<Q||c.avgSimilarity<tt||A(c.representative,o)<.4||n&&A(c.representative,n.path)<.25||s&&A(c.representative,s.path)<.25)return!1;const l=o[0];return!(c.type==="CONTINUE"&&c.nextSide===l)}).sort((c,l)=>{const d=n&&c.nextSide!==n.nextSide?1:0;return(n&&l.nextSide!==n.nextSide?1:0)-d||l.weight-c.weight});return R(a[0],"HIDDEN")}function St(t,e){const n=t.reduce((i,r)=>i+r.weight,0);return n<=0?.5:t.filter(i=>i.nextSide===e).reduce((i,r)=>i+r.weight,0)/n}function yt(t,e){return e<=0?0:t/e}function xt(t,e){if(e<=1)return 0;const n=e-t;return Math.max(0,1-n/e)}function Et(t){const e=z;return t.exact*e.exact+t.runLength*e.runLength+t.roadShape*e.roadShape+t.recentSegment*e.recentSegment+t.mirror*e.mirror+t.contextLength*e.contextLength+t.recency*e.recency}function Pt(t,e,n,s,i,r){const o=v(n),u=w(t,n),a=lt(t,n),c=a>u+.05,l=c?T(n):n,d=c?v(l):o,h={exact:Math.max(u,a*.92),runLength:U(e.runLengths,d.runLengths),roadShape:ut(e,d),recentSegment:at(t,l),mirror:a,contextLength:yt(n.length,r),recency:xt(s,i)};return{similarity:Et(h),breakdown:h,mirrored:c}}function It(t,e={}){const n=e.asOfIndex??t.length,s=e.horizon??4,i=e.minSimilarity??J,r=e.maxMatches??Z,o=e.contextLengths??q;if(n<=0)return[];const u=t.slice(0,n);if(u.length===0)return[];const a=Math.max(...o),c=[];for(const d of o){if(u.length<Math.min(4,d))continue;const h=Math.min(d,u.length),g=u.slice(-h),P=v(g),E=h,y=n-1,I=y-E+1>D?y-D+1:E;for(let f=Math.max(E,I);f<=y;f+=1){const S=t.slice(f-h,f),M=Math.min(s,n-f);if(M<1)continue;const L=Pt(g,P,S,f,n,a);if(L.similarity<i)continue;const _=t.slice(f,f+M);c.push({endIndex:f,contextLength:h,similarity:L.similarity,breakdown:L.breakdown,mirrored:L.mirrored,continuation:L.mirrored?T(_):_})}}c.sort((d,h)=>h.similarity-d.similarity||h.contextLength-d.contextLength);const l=new Map;for(const d of c){const h=l.get(d.endIndex);(!h||d.similarity>h.similarity)&&l.set(d.endIndex,d)}return[...l.values()].sort((d,h)=>h.similarity-d.similarity).slice(0,r)}function O(t){return!t||t.length===0?null:t.join("")}function Nt(t,e,n,s){const i=[];return s>0&&i.push(`유사 상황 ${s}건`),t&&i.push(`EXPECTED ${x(t.path)}`),e&&i.push(`ALT ${x(e.path)}`),n?i.push(`HIDDEN ${x(n.path)}`):s>0&&i.push("HIDDEN 없음"),i.length===0?"데이터 수집 중 · Future Road 대기":i.slice(0,3).join(" · ")}function Lt(t,e={}){const n=e.horizon??K,s=e.asOfFullIndex===void 0?t.length:e.asOfFullIndex,i=t.slice(0,s),r=C(i);if(st(n),r.length===0)return{pick:"P",confidence:50,reason:"첫 입력 전 기본 분석값",expectedPath:null,alternativePath:null,hiddenPath:null,matchCount:0,nextSideAgreement:.5,debug:{currentContext:[],matchCount:0,topMatches:[],clusters:[],expectedPath:null,alternativePath:null,hiddenPath:null,finalPick:"P",confidence:50,nextSideAgreement:.5,obviousPath:"P".repeat(n)}};const o=It(r,{asOfIndex:r.length,horizon:n}),u=v(r),a=ft(o,u.currentSide),c=pt(a),l=mt(a,c),d=gt(a,r,c,l,n);let h=u.currentSide??"P";if(c)h=c.nextSide;else if(a.length>0){const p=a.filter(f=>f.nextSide==="P").reduce((f,S)=>f+S.weight,0),I=a.filter(f=>f.nextSide==="B").reduce((f,S)=>f+S.weight,0);h=p>=I?"P":"B"}const g=St(a,h),P=rt({matchCount:o.length,historyLength:r.length,nextSideAgreement:g,expected:c,alternative:l,hidden:d}),E=Nt(c,l,d,o.length),y={currentContext:r.slice(-Math.min(20,r.length)),matchCount:o.length,topMatches:o.slice(0,8).map(p=>({endIndex:p.endIndex,contextLength:p.contextLength,similarity:Number(p.similarity.toFixed(4)),continuation:p.continuation.join(""),mirrored:p.mirrored})),clusters:a.slice(0,8).map(p=>({type:p.type,path:p.representative.join(""),nextSide:p.nextSide,weight:Number(p.weight.toFixed(4)),count:p.count,share:Number(p.share.toFixed(4))})),expectedPath:O(c?.path),alternativePath:O(l?.path),hiddenPath:O(d?.path),finalPick:h,confidence:P,nextSideAgreement:Number(g.toFixed(4)),obviousPath:(u.currentSide??"P").repeat(n)};return e.debug&&console.debug("[FutureRoadEngine]",y),{pick:h,confidence:P,reason:E,expectedPath:c,alternativePath:l,hiddenPath:d,matchCount:o.length,nextSideAgreement:g,debug:y}}function vt(t,e){if(!t||e!=="P"&&e!=="B")return null;const n=t.pick===e?"WIN":"LOSE";return{...t,actualResult:e,result:n,judgedAt:new Date().toISOString()}}function Mt(t,e=12){return t.filter(n=>n.result==="WIN"||n.result==="LOSE").slice(-e).map(n=>n.result==="WIN"?"O":"X")}function At(t,e=12){const n=Mt(t,e),s=n.filter(o=>o==="O").length,i=n.filter(o=>o==="X").length,r=n.length===0?0:s/n.length*100;return{marks:n,wins:s,losses:i,rate:r}}function X(t){try{const e=JSON.parse(localStorage.getItem(t)||"[]");return Array.isArray(e)?e:[]}catch{return[]}}function Rt(t){try{const e=JSON.parse(localStorage.getItem(t)||"{}");return e&&typeof e=="object"&&!Array.isArray(e)?e:{}}catch{return{}}}function kt(){const t=X(N.history).filter(s=>s==="P"||s==="B"||s==="T"),e=X(N.predictionRecords),n=Rt(N.patternMemory);return{history:t,predictionRecords:e,patternMemory:n}}function B(t){localStorage.setItem(N.history,JSON.stringify(t.history.slice(-5e3))),localStorage.setItem(N.predictionRecords,JSON.stringify(t.predictionRecords.slice(-1e4))),localStorage.setItem(N.patternMemory,JSON.stringify(t.patternMemory))}function bt(){const t={history:[],predictionRecords:[],patternMemory:{}};return B(t),t}const W=document.querySelector("#app");if(!W)throw new Error("#app missing");W.innerHTML=`
  <main class="app-shell">
    <header class="app-header">
      <p class="eyebrow">AUTO PATTERN LEARNING ENGINE</p>
      <h1>Intuition AI</h1>
      <p class="subtitle">패턴을 자동 학습하고 다음 픽을 출력합니다.</p>
    </header>

    <section class="card prediction-card">
      <p class="section-kicker">NEXT AI PICK</p>
      <h2>다음 예상 픽</h2>

      <div id="aiPick" class="ai-pick player-pick">
        PLAYER
      </div>

      <div class="prediction-info">
        <span>AI 신뢰도</span>
        <strong id="confidenceScore">50%</strong>
      </div>

      <p id="predictionReason" class="prediction-reason">
        결과를 입력하면 자동 분석을 시작합니다.
      </p>

      <div class="success-board" aria-label="AI PICK 성공 실패">
        <p class="success-board-title">AI PICK 성공/실패</p>
        <div id="successMarks" class="success-marks"></div>
        <p id="successSummary" class="success-summary">아직 판정 기록이 없습니다.</p>
      </div>
    </section>

    <section class="card">
      <div class="section-title-row">
        <div>
          <p class="section-kicker">RECENT FLOW</p>
          <h2>최근 20판</h2>
        </div>

        <button id="undoBtn" class="small-button" type="button">
          되돌리기
        </button>
      </div>

      <div id="historyBoard" class="history-board"></div>

      <p class="section-kicker">ACTUAL RESULT</p>

      <div class="result-grid">
        <button id="playerBtn" class="result-button player" type="button">
          PLAYER
        </button>

        <button id="bankerBtn" class="result-button banker" type="button">
          BANKER
        </button>

        <button id="tieBtn" class="result-button tie" type="button">
          TIE
        </button>
      </div>
    </section>

    <section class="card">
      <p class="section-kicker">AUTO LEARNING</p>
      <h2>자동 학습 현황</h2>

      <div class="stats-grid">
        <div class="stat-box">
          <strong id="totalPredictions">0</strong>
          <span>AI 판정</span>
        </div>

        <div class="stat-box">
          <strong id="winPredictions">0</strong>
          <span>적중</span>
        </div>

        <div class="stat-box">
          <strong id="aiAccuracy">0%</strong>
          <span>적중률</span>
        </div>
      </div>

      <div id="learningStatus" class="pending-status">
        자동 학습 준비
      </div>
    </section>

    <button id="resetBtn" class="reset-button" type="button">
      전체 기록 초기화
    </button>
  </main>
`;let m=kt(),k=null;function Ot(){const t=Lt(m.history,{debug:!1}),e=C(m.history);return k={pick:t.pick,confidence:t.confidence,reason:t.reason,pattern:e.slice(-20),createdAt:new Date().toISOString(),expectedPath:t.expectedPath?x(t.expectedPath.path):null,alternativePath:t.alternativePath?x(t.alternativePath.path):null,hiddenPath:t.hiddenPath?x(t.hiddenPath.path):null,matchCount:t.matchCount,nextSideAgreement:t.nextSideAgreement},k}function Ct(){const t=document.querySelector("#historyBoard");if(!t)return;const e=m.history.slice(-20);if(e.length===0){t.innerHTML='<span class="empty-text">아직 기록이 없습니다.</span>';return}t.innerHTML=e.map(n=>`<span class="history-dot ${n==="P"?"player-dot":n==="B"?"banker-dot":"tie-dot"}">${n}</span>`).join("")}function Tt(){const t=Ot(),e=document.querySelector("#aiPick"),n=document.querySelector("#confidenceScore"),s=document.querySelector("#predictionReason");!e||!n||!s||(n.textContent=`${t.confidence}%`,s.textContent=t.reason,t.pick==="P"?(e.textContent="PLAYER",e.className="ai-pick player-pick"):(e.textContent="BANKER",e.className="ai-pick banker-pick"))}function wt(){const t=document.querySelector("#successMarks"),e=document.querySelector("#successSummary");if(!t||!e)return;const{marks:n,wins:s,losses:i,rate:r}=At(m.predictionRecords,$),o=[];for(let u=0;u<$;u+=1){const a=n[u];a?a==="O"?o.push('<span class="success-mark win">O</span>'):o.push('<span class="success-mark lose">X</span>'):o.push('<span class="success-mark empty">·</span>')}t.innerHTML=o.join(""),n.length===0?e.textContent="아직 판정 기록이 없습니다.":e.innerHTML=`최근 ${n.length}회<br><strong>${s}승 ${i}패 · ${r.toFixed(1)}%</strong>`}function Bt(){const t=m.predictionRecords.filter(a=>a.result==="WIN"||a.result==="LOSE"),e=t.filter(a=>a.result==="WIN").length,n=t.length===0?0:Math.round(e/t.length*100),s=document.querySelector("#totalPredictions"),i=document.querySelector("#winPredictions"),r=document.querySelector("#aiAccuracy"),o=document.querySelector("#learningStatus");if(!s||!i||!r||!o)return;s.textContent=String(t.length),i.textContent=String(e),r.textContent=`${n}%`;const u=C(m.history).length;o.textContent=u===0?"새 패턴 자동 수집 중":`Future Road · BP ${u}판 · 판정 ${t.length}건`}function b(){Ct(),Tt(),wt(),Bt()}function F(t){if(t==="P"||t==="B"){const e=vt(k,t);e&&m.predictionRecords.push(e)}m.history.push(t),B(m),b()}document.querySelector("#playerBtn")?.addEventListener("click",()=>F("P"));document.querySelector("#bankerBtn")?.addEventListener("click",()=>F("B"));document.querySelector("#tieBtn")?.addEventListener("click",()=>F("T"));document.querySelector("#undoBtn")?.addEventListener("click",()=>{m.history.length!==0&&(m.history.pop(),B(m),b())});document.querySelector("#resetBtn")?.addEventListener("click",()=>{confirm("전체 기록과 자동 학습 데이터를 초기화할까요?")&&(m=bt(),k=null,b())});b();
