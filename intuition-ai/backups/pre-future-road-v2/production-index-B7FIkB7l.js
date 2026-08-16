(function(){let e=document.createElement(`link`).relList;if(e&&e.supports&&e.supports(`modulepreload`))return;for(let e of document.querySelectorAll(`link[rel="modulepreload"]`))n(e);new MutationObserver(e=>{for(let t of e)if(t.type===`childList`)for(let e of t.addedNodes)e.tagName===`LINK`&&e.rel===`modulepreload`&&n(e)}).observe(document,{childList:!0,subtree:!0});function t(e){let t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),e.crossOrigin===`use-credentials`?t.credentials=`include`:e.crossOrigin===`anonymous`?t.credentials=`omit`:t.credentials=`same-origin`,t}function n(e){if(e.ep)return;e.ep=!0;let n=t(e);fetch(e.href,n)}})();var e=document.querySelector(`#app`);e.innerHTML=`
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
    </section>

    <section class="card">
      <div class="section-title-row">
        <div>
          <p class="section-kicker">RECENT FLOW</p>
          <h2>최근 20판</h2>
        </div>

        <button id="undoBtn" class="small-button">
          되돌리기
        </button>
      </div>

      <div id="historyBoard" class="history-board"></div>

      <p class="section-kicker">ACTUAL RESULT</p>

      <div class="result-grid">
        <button id="playerBtn" class="result-button player">
          PLAYER
        </button>

        <button id="bankerBtn" class="result-button banker">
          BANKER
        </button>

        <button id="tieBtn" class="result-button tie">
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

    <button id="resetBtn" class="reset-button">
      전체 기록 초기화
    </button>
  </main>
`;var t=a(`intuitionHistory`),n=a(`predictionRecords`),r=o(`patternMemory`),i=null;function a(e){try{let t=JSON.parse(localStorage.getItem(e)||`[]`);return Array.isArray(t)?t:[]}catch{return[]}}function o(e){try{let t=JSON.parse(localStorage.getItem(e)||`{}`);return t&&typeof t==`object`&&!Array.isArray(t)?t:{}}catch{return{}}}function s(){localStorage.setItem(`intuitionHistory`,JSON.stringify(t)),localStorage.setItem(`predictionRecords`,JSON.stringify(n)),localStorage.setItem(`patternMemory`,JSON.stringify(r))}function c(){return t.filter(e=>e===`P`||e===`B`)}function l(e,t=8){return e.slice(-t).join(``)}function u(e){return e===`P`?`B`:`P`}function d(e){if(e.length===0)return{side:`P`,length:0};let t=e[e.length-1],n=1;for(let r=e.length-2;r>=0&&e[r]===t;--r)n+=1;return{side:t,length:n}}function f(e,t=7){let n=e.slice(-t),r=0;for(let e=1;e<n.length;e+=1)n[e]!==n[e-1]&&(r+=1);return r}function p(e){let t={P:0,B:0},n=0,r=Math.min(8,e.length-1);for(let i=r;i>=2;--i){let r=e.slice(-i).join(``);for(let a=0;a<=e.length-i-1;a+=1){if(e.slice(a,a+i).join(``)!==r)continue;let o=e[a+i];if(o===`P`||o===`B`){let e=i*i;t[o]+=e,n+=1}}}return{scores:t,matches:n}}function m(e){let t={P:0,B:0},n=0;for(let i=8;i>=3;--i){if(e.length<i)continue;let a=l(e,i),o=r[a];if(!o)continue;let s=i*3;t.P+=(o.P||0)*s,t.B+=(o.B||0)*s,n+=(o.P||0)+(o.B||0)}return{scores:t,learnedCount:n}}function h(){let e=c(),t={P:1,B:1},n=[];if(e.length===0)return{pick:`P`,confidence:50,reason:`첫 입력 전 기본 분석값`};let r=p(e);t.P+=r.scores.P,t.B+=r.scores.B,r.matches>0&&n.push(`반복 패턴 ${r.matches}개`);let i=m(e);t.P+=i.scores.P,t.B+=i.scores.B,i.learnedCount>0&&n.push(`자동 학습 ${i.learnedCount}회`);let a=d(e);a.length>=2&&(t[a.side]+=a.length*5,n.push(`${a.side===`P`?`PLAYER`:`BANKER`} 장줄 ${a.length}`));let o=f(e);if(o>=4){let r=u(e[e.length-1]);t[r]+=o*5,n.push(`퐁당 흐름`)}let s=e.slice(-10),l=s.filter(e=>e===`P`).length,h=s.filter(e=>e===`B`).length;l>h&&(t.P+=(l-h)*3,n.push(`최근 PLAYER 우세`)),h>l&&(t.B+=(h-l)*3,n.push(`최근 BANKER 우세`));let g=t.P>=t.B?`P`:`B`,_=Math.max(t.P,t.B),v=t.P+t.B,y=Math.round(_/v*100);return y=Math.max(50,Math.min(y,85)),{pick:g,confidence:y,reason:n.length>0?n.slice(0,3).join(` · `):`최근 흐름 균형 분석`}}function g(){let e=h(),t=c();return i={pick:e.pick,confidence:e.confidence,reason:e.reason,pattern:t.slice(-20),createdAt:new Date().toISOString()},e}function _(e){if(!i||e!==`P`&&e!==`B`)return;let t=i.pattern.filter(e=>e===`P`||e===`B`);for(let n=3;n<=8;n+=1){if(t.length<n)continue;let i=l(t,n);r[i]||(r[i]={P:0,B:0}),r[i][e]+=1}n.push({...i,actualResult:e,result:i.pick===e?`WIN`:`LOSE`,judgedAt:new Date().toISOString()}),n.length>1e4&&(n=n.slice(-1e4))}function v(){let e=document.querySelector(`#historyBoard`),n=t.slice(-20);if(n.length===0){e.innerHTML=`<span class="empty-text">아직 기록이 없습니다.</span>`;return}e.innerHTML=n.map(e=>`
        <span class="history-dot ${e===`P`?`player-dot`:e===`B`?`banker-dot`:`tie-dot`}">
          ${e}
        </span>
      `).join(``)}function y(){let e=g(),t=document.querySelector(`#aiPick`),n=document.querySelector(`#confidenceScore`),r=document.querySelector(`#predictionReason`);n.textContent=`${e.confidence}%`,r.textContent=e.reason,e.pick===`P`?(t.textContent=`PLAYER`,t.className=`ai-pick player-pick`):(t.textContent=`BANKER`,t.className=`ai-pick banker-pick`)}function b(){let e=n.filter(e=>e.result===`WIN`||e.result===`LOSE`),t=e.filter(e=>e.result===`WIN`).length,i=e.length===0?0:Math.round(t/e.length*100);document.querySelector(`#totalPredictions`).textContent=e.length,document.querySelector(`#winPredictions`).textContent=t,document.querySelector(`#aiAccuracy`).textContent=`${i}%`;let a=Object.keys(r).length;document.querySelector(`#learningStatus`).textContent=a===0?`새 패턴 자동 수집 중`:`학습 패턴 ${a}개 저장됨`}function x(){v(),y(),b()}function S(e){(e===`P`||e===`B`)&&_(e),t.push(e),t.length>5e3&&(t=t.slice(-5e3)),s(),x()}document.querySelector(`#playerBtn`).addEventListener(`click`,()=>{S(`P`)}),document.querySelector(`#bankerBtn`).addEventListener(`click`,()=>{S(`B`)}),document.querySelector(`#tieBtn`).addEventListener(`click`,()=>{S(`T`)}),document.querySelector(`#undoBtn`).addEventListener(`click`,()=>{t.length!==0&&(t.pop(),s(),x())}),document.querySelector(`#resetBtn`).addEventListener(`click`,()=>{confirm(`전체 기록과 자동 학습 데이터를 초기화할까요?`)&&(t=[],n=[],r={},i=null,s(),x())}),x();