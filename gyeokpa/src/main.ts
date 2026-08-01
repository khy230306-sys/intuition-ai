import "./style.css";
import { Game, weaponLabel, type RunResult, type Weapon } from "./game";
import { isMuted, setMuted, sfx } from "./audio";
import {
  MEDALS,
  dailyProgress,
  loadMeta,
  pushRank,
  saveMeta,
  stageName,
  unlockMedal,
  type MedalId,
} from "./meta";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("#app missing");

let meta = loadMeta();
let selectedStage = Math.min(meta.unlockedStage, 5);
let game: Game | null = null;
let hintVisible = true;

app.innerHTML = `
  <header class="topbar">
    <div class="brand">
      <strong>격파</strong>
      <span>세로 스크롤 슈팅</span>
    </div>
    <div class="chip-row">
      <div class="chip accent" id="bestChip">BEST 0</div>
      <button class="chip" id="muteBtn" type="button">소리</button>
    </div>
  </header>
  <div class="stage">
    <canvas id="cv"></canvas>
    <div class="hud">
      <div class="hud-top">
        <div id="hudScore">0</div>
        <div id="hudWave">WAVE 1</div>
        <div id="hudStage">ST 1</div>
      </div>
      <div></div>
      <div class="hud-bottom">
        <div class="lives" id="lives"></div>
        <div class="weapon" id="weapon">펄스</div>
      </div>
    </div>
    <div class="toast" id="toast"></div>
    <div class="hint" id="hint">드래그해서 이동 · 자동 사격</div>
    <div class="overlay" id="overlay"></div>
  </div>
`;

const canvas = app.querySelector<HTMLCanvasElement>("#cv")!;
const overlay = app.querySelector<HTMLDivElement>("#overlay")!;
const toastEl = app.querySelector<HTMLDivElement>("#toast")!;
const hintEl = app.querySelector<HTMLDivElement>("#hint")!;
const bestChip = app.querySelector<HTMLDivElement>("#bestChip")!;
const muteBtn = app.querySelector<HTMLButtonElement>("#muteBtn")!;
const hudScore = app.querySelector<HTMLDivElement>("#hudScore")!;
const hudWave = app.querySelector<HTMLDivElement>("#hudWave")!;
const hudStage = app.querySelector<HTMLDivElement>("#hudStage")!;
const livesEl = app.querySelector<HTMLDivElement>("#lives")!;
const weaponEl = app.querySelector<HTMLDivElement>("#weapon")!;

let toastTimer = 0;

function showToast(msg: string): void {
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toastEl.classList.remove("show"), 1100);
}

function renderLives(n: number): void {
  livesEl.innerHTML = Array.from({ length: 5 }, (_, i) => `<div class="life ${i < n ? "" : "off"}"></div>`).join("");
}

function refreshBest(): void {
  bestChip.textContent = `BEST ${meta.bestScore.toLocaleString()}`;
}

function applyRun(result: RunResult): MedalId[] {
  const unlocked: MedalId[] = [];
  meta.totalRuns += 1;
  meta.totalKills += result.kills;
  meta.totalBosses += result.bosses;
  meta.bestScore = Math.max(meta.bestScore, result.score);
  meta.bestWave = Math.max(meta.bestWave, result.wave);
  meta.daily.kills += result.kills;
  meta.daily.score = Math.max(meta.daily.score, result.score);
  meta.daily.bosses += result.bosses;

  pushRank(meta, {
    score: result.score,
    wave: result.wave,
    stage: result.stage,
    at: Date.now(),
  });

  if (result.cleared) {
    meta.unlockedStage = Math.max(meta.unlockedStage, Math.min(5, result.stage + 1));
  }

  const tryUnlock = (id: MedalId, ok: boolean) => {
    if (ok && unlockMedal(meta, id)) unlocked.push(id);
  };
  tryUnlock("first-blood", result.kills >= 1 || meta.totalKills >= 1);
  tryUnlock("wave-5", result.wave >= 5);
  tryUnlock("boss-slayer", result.bosses >= 1 || meta.totalBosses >= 1);
  tryUnlock("combo-20", result.maxCombo >= 20);
  tryUnlock("no-hit-stage", result.cleared && result.noHit);
  tryUnlock("score-10k", result.score >= 10000);
  tryUnlock("score-50k", result.score >= 50000);

  const daily = dailyProgress(meta);
  if (daily.done && !meta.daily.claimed) {
    meta.daily.claimed = true;
    meta.dailyClears += 1;
    tryUnlock("daily-3", meta.dailyClears >= 3);
  }

  saveMeta(meta);
  refreshBest();
  return unlocked;
}

function medalTitle(id: MedalId): string {
  return MEDALS.find((m) => m.id === id)?.title ?? id;
}

type Screen = "home" | "stages" | "ranks" | "medals" | "daily" | "result";

function showScreen(kind: Screen, result?: RunResult, unlocked: MedalId[] = []): void {
  overlay.classList.remove("hidden");
  hintEl.style.display = "none";

  if (kind === "home") {
    overlay.innerHTML = `
      <div class="panel">
        <h1>격파</h1>
        <p>손가락으로 기체를 끌고, 몰려오는 적을 쓸어버리세요. 웨이브를 버티고 보스를 격파하면 다음 전선이 열립니다.</p>
        <div class="stats">
          <div class="stat"><b>${meta.bestScore.toLocaleString()}</b><span>최고점</span></div>
          <div class="stat"><b>${meta.bestWave}</b><span>최고 웨이브</span></div>
          <div class="stat"><b>${meta.unlockedStage}</b><span>해금 스테이지</span></div>
        </div>
        <div class="actions">
          <button class="btn" data-act="play" type="button">출격</button>
          <button class="btn secondary" data-act="stages" type="button">스테이지 선택</button>
          <button class="btn secondary" data-act="daily" type="button">일일 미션</button>
          <button class="btn ghost" data-act="ranks" type="button">랭킹</button>
          <button class="btn ghost" data-act="medals" type="button">메달</button>
        </div>
      </div>
    `;
  } else if (kind === "stages") {
    overlay.innerHTML = `
      <div class="panel">
        <h2>스테이지</h2>
        <p>클리어할수록 더 거친 전선이 열립니다.</p>
        <div class="list">
          ${[1, 2, 3, 4, 5]
            .map((n) => {
              const locked = n > meta.unlockedStage;
              return `<button class="row" data-stage="${n}" ${locked ? "disabled" : ""} type="button">
                <div>
                  <strong>${n}. ${stageName(n)}</strong>
                  <small>${locked ? "잠김" : selectedStage === n ? "선택됨" : "출격 가능"}</small>
                </div>
                <span class="badge">${locked ? "LOCK" : "GO"}</span>
              </button>`;
            })
            .join("")}
        </div>
        <div class="actions">
          <button class="btn" data-act="play" type="button">이 스테이지로 출격</button>
          <button class="btn ghost" data-act="home" type="button">뒤로</button>
        </div>
      </div>
    `;
  } else if (kind === "ranks") {
    const rows =
      meta.ranks.length === 0
        ? `<div class="row"><div><strong>기록 없음</strong><small>한 판 뛰어보세요</small></div></div>`
        : meta.ranks
            .map(
              (r, i) => `<div class="row">
                <div><strong>#${i + 1} · ${r.score.toLocaleString()}</strong>
                <small>ST${r.stage} · WAVE ${r.wave}</small></div>
                <span class="badge">${new Date(r.at).toLocaleDateString("ko-KR")}</span>
              </div>`,
            )
            .join("");
    overlay.innerHTML = `
      <div class="panel">
        <h2>랭킹</h2>
        <p>이 기기 최고 기록 TOP 10</p>
        <div class="list">${rows}</div>
        <div class="actions">
          <button class="btn ghost" data-act="home" type="button">뒤로</button>
        </div>
      </div>
    `;
  } else if (kind === "medals") {
    overlay.innerHTML = `
      <div class="panel">
        <h2>메달</h2>
        <p>격파의 증표. 조건을 채우면 자동 해금됩니다.</p>
        <div class="list">
          ${MEDALS.map((m) => {
            const got = Boolean(meta.medals[m.id]);
            return `<div class="row">
              <div><strong>${m.title}</strong><small>${m.desc}</small></div>
              <span class="badge">${got ? "획득" : "미획득"}</span>
            </div>`;
          }).join("")}
        </div>
        <div class="actions">
          <button class="btn ghost" data-act="home" type="button">뒤로</button>
        </div>
      </div>
    `;
  } else if (kind === "daily") {
    const d = dailyProgress(meta);
    const pct = (v: number) => `${Math.round(v * 100)}%`;
    overlay.innerHTML = `
      <div class="panel">
        <h2>일일 미션</h2>
        <p>오늘 목표를 모두 채우면 일일 사수 카운트가 올라갑니다. (${meta.dailyClears}회 완료)</p>
        <div class="list">
          <div class="row"><div><strong>적 40기 격파</strong><small>${meta.daily.kills}/40</small></div><span class="badge">${pct(d.kills)}</span></div>
          <div class="row"><div><strong>한 판 8,000점</strong><small>${meta.daily.score.toLocaleString()}/8,000</small></div><span class="badge">${pct(d.score)}</span></div>
          <div class="row"><div><strong>보스 1기</strong><small>${meta.daily.bosses}/1</small></div><span class="badge">${pct(d.bosses)}</span></div>
        </div>
        <p>${d.done ? (meta.daily.claimed ? "오늘 미션 완료!" : "완료!") : "아직 전선이 남았습니다."}</p>
        <div class="actions">
          <button class="btn" data-act="play" type="button">출격</button>
          <button class="btn ghost" data-act="home" type="button">뒤로</button>
        </div>
      </div>
    `;
  } else if (kind === "result" && result) {
    const title = result.cleared ? "스테이지 클리어" : "격파 실패";
    const medalLine =
      unlocked.length > 0 ? `<p>새 메달: ${unlocked.map(medalTitle).join(", ")}</p>` : "";
    overlay.innerHTML = `
      <div class="panel">
        <h2>${title}</h2>
        <p>${stageName(result.stage)} · 웨이브 ${result.wave}</p>
        <div class="stats">
          <div class="stat"><b>${result.score.toLocaleString()}</b><span>점수</span></div>
          <div class="stat"><b>${result.kills}</b><span>격파</span></div>
          <div class="stat"><b>${result.maxCombo}</b><span>최대 콤보</span></div>
        </div>
        ${medalLine}
        <div class="actions">
          <button class="btn" data-act="play" type="button">다시 출격</button>
          <button class="btn secondary" data-act="stages" type="button">스테이지</button>
          <button class="btn ghost" data-act="home" type="button">홈</button>
        </div>
      </div>
    `;
  }

  overlay.querySelectorAll<HTMLElement>("[data-act]").forEach((el) => {
    el.addEventListener("click", () => {
      const act = el.dataset.act;
      sfx.ui();
      if (act === "play") startGame();
      else if (act === "home") showScreen("home");
      else if (act === "stages") showScreen("stages");
      else if (act === "ranks") showScreen("ranks");
      else if (act === "medals") showScreen("medals");
      else if (act === "daily") showScreen("daily");
    });
  });
  overlay.querySelectorAll<HTMLButtonElement>("[data-stage]").forEach((el) => {
    el.addEventListener("click", () => {
      selectedStage = Number(el.dataset.stage);
      sfx.ui();
      showScreen("stages");
    });
  });
}

function startGame(): void {
  overlay.classList.add("hidden");
  hintVisible = true;
  hintEl.style.display = "block";
  window.setTimeout(() => {
    if (hintVisible) hintEl.style.display = "none";
  }, 2200);

  if (!game) {
    game = new Game(canvas, {
      onHud: (info) => {
        hudScore.textContent = info.score.toLocaleString();
        hudWave.textContent = `WAVE ${info.wave}`;
        hudStage.textContent = `ST ${info.stage}`;
        renderLives(info.lives);
        weaponEl.textContent = weaponLabel(info.weapon as Weapon, info.laserCount);
      },
      onToast: showToast,
      onOver: (result) => {
        const unlocked = applyRun(result);
        showScreen("result", result, unlocked);
      },
      onClear: (result) => {
        const unlocked = applyRun(result);
        showScreen("result", result, unlocked);
      },
    });
  }
  canvas.addEventListener(
    "pointerdown",
    () => {
      hintVisible = false;
      hintEl.style.display = "none";
    },
    { once: true },
  );
  game.start(selectedStage);
}

muteBtn.addEventListener("click", () => {
  setMuted(!isMuted());
  muteBtn.textContent = isMuted() ? "음소거" : "소리";
  sfx.ui();
});

refreshBest();
renderLives(3);
showScreen("home");

setInterval(() => {
  const next = loadMeta();
  if (next.daily.date !== meta.daily.date) meta = next;
}, 60_000);
