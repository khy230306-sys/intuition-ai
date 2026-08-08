/**
 * AIZIO QUEST UI — playable Match-3 combat surface.
 * Input is board-delegated Pointer Events; never remount DOM mid-gesture.
 */

import './quest.css'
import type { BattleRuntime, GemKind, QuestSave, QuestScreen, SkillDef } from '../types'
import { HEROES, heroById } from '../content/heroes'
import { CHAPTER1_STAGES, nextStageAfter, stageById } from '../content/stages'
import { rollLoot } from '../content/equipment'
import { ACHIEVEMENTS, checkAchievements } from '../content/achievements'
import {
  applyXp,
  loadQuestSave,
  saveQuestSave,
  todayKey,
  unlockHeroesForStage,
  xpToNext,
} from '../save/saveStore'
import {
  applyPlayerSwap,
  castSkill,
  isDefeat,
  isVictory,
  runEnemyTurn,
  startBattle,
} from '../battle/combat'
import { findAllMoves, type Move } from '../match3/board'
import { hashSeed } from '../match3/rng'
import { haptic, playQuestSfx } from '../audio/questAudio'
import { attachBoardInput, dirLabel, pickTutorialMove, type CellPos } from './boardInput'

const GEM_SYM: Record<GemKind, string> = {
  fire: '▲',
  water: '●',
  nature: '❀',
  light: '✦',
  dark: '◼',
  guard: '▣',
}

const HINT_MS = 5000
const DEV_DEBUG =
  typeof location !== 'undefined' &&
  (location.hostname === 'localhost' ||
    location.hostname === '127.0.0.1' ||
    /[?&]aqdebug=1(?:&|$)/.test(location.search))

type MountApi = { destroy: () => void }

export function mountAizioQuest(root: HTMLElement, opts?: { onExit?: () => void }): MountApi {
  let save = loadQuestSave()
  let screen: QuestScreen = save.heroId ? 'campaign' : 'title'
  let battle: BattleRuntime | null = null
  let selected: CellPos | null = null
  let toast = ''
  let toastTimer: number | null = null
  let lastReward: { xp: number; credit: number; itemName?: string; ach: string[] } | null = null
  let floatText = ''
  let destroyed = false
  let detachBoard: (() => void) | null = null
  let hintTimer: number | null = null
  let hintMove: Move | null = null
  let lastSwap: string = ''
  let tutorialCoach: Move | null = null
  let statusLine = ''

  const showToast = (msg: string) => {
    toast = msg
    if (toastTimer) window.clearTimeout(toastTimer)
    toastTimer = window.setTimeout(() => {
      toast = ''
      if (screen !== 'battle') paint()
      else patchToast()
    }, 2200)
    if (screen !== 'battle') paint()
    else patchToast()
  }

  const persist = () => saveQuestSave(save)

  const canInteract = () =>
    !!battle && battle.turn === 'player' && !battle.animLock && screen === 'battle'

  function clearHintTimer(): void {
    if (hintTimer) {
      window.clearTimeout(hintTimer)
      hintTimer = null
    }
  }

  function scheduleHint(): void {
    clearHintTimer()
    hintMove = null
    if (!battle || battle.tutorialStep != null) return
    hintTimer = window.setTimeout(() => {
      if (!canInteract() || !battle) return
      const moves = findAllMoves(battle.board)
      hintMove = moves[0] || null
      paintBoardClasses()
    }, HINT_MS)
  }

  function paint(): void {
    if (destroyed) return
    detachBoard?.()
    detachBoard = null
    root.innerHTML = render()
    bindChrome()
    if (screen === 'battle' && battle) {
      bindBoard()
      scheduleHint()
    }
  }

  function patchToast(): void {
    const el = root.querySelector('.aq-toast')
    if (toast) {
      if (el) el.textContent = toast
      else root.insertAdjacentHTML('beforeend', `<div class="aq-toast">${esc(toast)}</div>`)
    } else el?.remove()
  }

  function paintBoardClasses(): void {
    if (!battle) return
    const boardEl = root.querySelector('[data-aq-board="1"]')
    if (!boardEl) return
    boardEl.querySelectorAll('.aq-gem').forEach((g) => {
      g.classList.remove('selected', 'hint', 'coach', 'coach-target')
    })
    if (selected) {
      boardEl
        .querySelector(`.aq-gem[data-r="${selected.r}"][data-c="${selected.c}"]`)
        ?.classList.add('selected')
    }
    const coach = battle.tutorialStep === 0 ? tutorialCoach : null
    if (coach) {
      boardEl
        .querySelector(`.aq-gem[data-r="${coach.a.r}"][data-c="${coach.a.c}"]`)
        ?.classList.add('coach')
      boardEl
        .querySelector(`.aq-gem[data-r="${coach.b.r}"][data-c="${coach.b.c}"]`)
        ?.classList.add('coach-target')
    }
    if (hintMove && battle.tutorialStep == null) {
      boardEl
        .querySelector(`.aq-gem[data-r="${hintMove.a.r}"][data-c="${hintMove.a.c}"]`)
        ?.classList.add('hint')
      boardEl
        .querySelector(`.aq-gem[data-r="${hintMove.b.r}"][data-c="${hintMove.b.c}"]`)
        ?.classList.add('hint')
    }
    const turnEl = root.querySelector('.aq-turn')
    if (turnEl) turnEl.innerHTML = turnBannerHtml()
    const coachEl = root.querySelector('[data-aq-coach]')
    if (coachEl) coachEl.innerHTML = coachHtml()
    const dbg = root.querySelector('[data-aq-debug]')
    if (dbg) dbg.innerHTML = debugHtml()
  }

  function turnBannerHtml(): string {
    if (!battle) return ''
    if (battle.animLock) return `<span class="aq-turn-busy">처리 중…</span>`
    if (battle.turn === 'player') return `<span class="aq-turn-me">내 턴 · GEM을 밀어 맞추세요</span>`
    return `<span class="aq-turn-enemy">적 턴</span>`
  }

  function coachHtml(): string {
    if (!battle || battle.tutorialStep == null) return ''
    const step = battle.tutorialStep
    if (step === 0 && tutorialCoach) {
      return `이 보석을 <strong>${dirLabel(tutorialCoach)}</strong>으로 밀어보세요`
    }
    if (step === 1) return `같은 보석 3개를 맞추면 공격합니다`
    if (step === 2) return `ENERGY가 모이면 아래 스킬을 쓰세요`
    if (step === 3) return `내 행동이 끝나면 적이 움직입니다`
    return ''
  }

  function debugHtml(): string {
    if (!DEV_DEBUG || !battle) return ''
    const moves = findAllMoves(battle.board).length
    return `turn=${battle.turn} lock=${battle.animLock} sel=${selected ? `${selected.r},${selected.c}` : '-'} moves=${moves} last=${lastSwap || '-'} tut=${battle.tutorialStep ?? '-'} ${statusLine}`
  }

  function render(): string {
    const top = `
      <div class="aq-topbar">
        <button type="button" class="aq-btn" data-aq="back">← PLAY</button>
        <h1>AIZIO QUEST</h1>
        <span class="aq-muted">Lv.${save.level}</span>
      </div>`

    if (screen === 'title') {
      return `${top}
        <div class="aq-card">
          <h2>기억과 CORE의 세계</h2>
          <p class="aq-muted">흩어진 심핵(CORE)에 공명하는 탐험가가 되어, 퍼즐로 전장을 뒤흔드세요. 완전 오프라인 플레이.</p>
          <div style="display:grid;gap:8px;margin-top:12px">
            <button type="button" class="aq-btn primary" data-aq="new">${save.heroId ? '이어하기' : '새 게임'}</button>
            ${save.heroId ? `<button type="button" class="aq-btn" data-aq="campaign">캠페인</button>` : ''}
            <button type="button" class="aq-btn" data-aq="daily">데일리 챌린지</button>
            <button type="button" class="aq-btn" data-aq="inventory">장비 · 성장</button>
            <button type="button" class="aq-btn" data-aq="settings">설정</button>
          </div>
        </div>
        <div class="aq-card"><p class="aq-muted">CREDIT ${save.credit} · 클리어 ${save.stageCleared}/19 · 승 ${save.battlesWon}</p></div>
        ${toastHtml()}`
    }

    if (screen === 'heroSelect') {
      return `${top}
        <div class="aq-card"><h2>영웅 선택</h2><p class="aq-muted">처음엔 카엘로 시작합니다. 진행하며 동료가 합류합니다.</p></div>
        <div class="aq-hero-grid">
          ${HEROES.map((h) => {
            const locked = !save.unlockedHeroes.includes(h.id)
            return `<button type="button" class="aq-btn aq-hero" data-aq="pick-hero" data-id="${h.id}" ${locked ? 'disabled' : ''} style="--h-accent:${h.accent}">
              <div class="aq-portrait" style="--h-accent:${h.accent}"></div>
              <div>
                <strong>${esc(h.name)}</strong>
                <div class="aq-muted">${esc(h.title)} · ${h.role}</div>
                <div class="aq-muted">${esc(h.blurb)}</div>
                ${locked ? `<div class="aq-muted">스테이지 ${h.unlockStage} 클리어 후 해금</div>` : ''}
              </div>
            </button>`
          }).join('')}
        </div>${toastHtml()}`
    }

    if (screen === 'campaign') {
      const next = nextStageAfter(save.stageCleared)
      return `${top}
        <div class="aq-card">
          <h2>CHAPTER 1 · 잔광 전선</h2>
          <p class="aq-muted">${esc(heroById(save.heroId || 'kael')?.name || '')} · XP ${save.xp}/${xpToNext(save.level)}</p>
          ${next ? `<button type="button" class="aq-btn primary" data-aq="fight" data-stage="${next.id}" style="width:100%;margin-top:8px">다음 전투 · ${esc(next.name)}</button>` : `<p class="aq-muted">챕터 1 완료.</p>`}
          ${!save.tutorialDone ? `<button type="button" class="aq-btn" data-aq="tutorial" style="width:100%;margin-top:8px">튜토리얼</button>` : ''}
        </div>
        <div class="aq-stage-list">
          ${CHAPTER1_STAGES.map((s) => {
            const locked = s.index > save.stageCleared + 1
            const cleared = s.index <= save.stageCleared
            return `<div class="aq-stage ${locked ? 'locked' : ''} ${s.isBoss ? 'boss' : ''} ${s.isElite ? 'elite' : ''}">
              <div><strong>${s.index}. ${esc(s.name)}</strong><div class="aq-muted">${s.difficulty}${cleared ? ' · CLEARED' : ''}</div></div>
              <button type="button" class="aq-btn" data-aq="fight" data-stage="${s.id}" ${locked ? 'disabled' : ''}>${cleared ? '재도전' : '출격'}</button>
            </div>`
          }).join('')}
        </div>${toastHtml()}`
    }

    if (screen === 'battle' && battle) return renderBattle()

    if (screen === 'victory' && lastReward) {
      return `${top}
        <div class="aq-card">
          <h2>VICTORY</h2>
          <p>XP +${lastReward.xp} · CREDIT +${lastReward.credit}</p>
          ${lastReward.itemName ? `<p class="aq-muted">획득: ${esc(lastReward.itemName)}</p>` : ''}
          ${lastReward.ach.length ? `<p class="aq-muted">업적: ${lastReward.ach.map((id) => ACHIEVEMENTS.find((a) => a.id === id)?.title || id).join(', ')}</p>` : ''}
          <div style="display:grid;gap:8px;margin-top:12px">
            <button type="button" class="aq-btn primary" data-aq="campaign">캠페인</button>
            <button type="button" class="aq-btn" data-aq="inventory">장비 확인</button>
          </div>
        </div>${toastHtml()}`
    }

    if (screen === 'defeat') {
      return `${top}
        <div class="aq-card">
          <h2>DEFEAT</h2>
          <p class="aq-muted">공명이 끊겼습니다. 장비를 강화하거나 다시 도전하세요.</p>
          <div style="display:grid;gap:8px;margin-top:12px">
            <button type="button" class="aq-btn primary" data-aq="retry">다시 도전</button>
            <button type="button" class="aq-btn" data-aq="inventory">성장 · 장비</button>
            <button type="button" class="aq-btn" data-aq="campaign">나가기</button>
          </div>
        </div>${toastHtml()}`
    }

    if (screen === 'inventory') {
      const hero = heroById(save.heroId || 'kael')
      return `${top}
        <div class="aq-card">
          <h2>성장 · 장비</h2>
          <p class="aq-muted">${esc(hero?.name || '')} Lv.${save.level} · CREDIT ${save.credit}</p>
          <p class="aq-muted">장착: ${Object.entries(save.equipped)
            .map(([slot, id]) => `${slot}:${save.inventory.find((i) => i.id === id)?.name || '-'}`)
            .join(' · ')}</p>
        </div>
        <div class="aq-card">
          <h3>인벤토리</h3>
          ${save.inventory
            .map(
              (it) => `<button type="button" class="aq-btn" data-aq="equip" data-id="${it.id}" style="width:100%;margin:4px 0;text-align:left">
                [${it.rarity}] ${esc(it.name)} · ${it.slot} · ATK ${it.atk || 0} DEF ${it.def || 0} HP ${it.hp || 0}
              </button>`,
            )
            .join('') || '<p class="aq-muted">장비 없음</p>'}
        </div>
        <div class="aq-card">
          <h3>업적 ${save.achievements.length}/${ACHIEVEMENTS.length}</h3>
          <p class="aq-muted">${ACHIEVEMENTS.map((a) => (save.achievements.includes(a.id) ? `✓ ${a.title}` : `○ ${a.title}`)).join(' · ')}</p>
        </div>
        <button type="button" class="aq-btn" data-aq="campaign">뒤로</button>${toastHtml()}`
    }

    if (screen === 'daily') {
      return `${top}
        <div class="aq-card">
          <h2>데일리 챌린지</h2>
          <p class="aq-muted">${todayKey()} · 시드 고정 오프라인 전투. 최고 ${save.dailyBest}</p>
          <button type="button" class="aq-btn primary" data-aq="daily-fight" style="width:100%">오늘 도전</button>
        </div>${toastHtml()}`
    }

    if (screen === 'settings') {
      return `${top}
        <div class="aq-card">
          <h2>설정</h2>
          <label class="aq-muted"><input type="checkbox" data-aq="set-sfx" ${save.settings.sfx ? 'checked' : ''}/> 효과음</label><br/>
          <label class="aq-muted"><input type="checkbox" data-aq="set-music" ${save.settings.music ? 'checked' : ''}/> 음악(절차적 톤)</label><br/>
          <label class="aq-muted"><input type="checkbox" data-aq="set-haptic" ${save.settings.haptic ? 'checked' : ''}/> 햅틱</label>
        </div>
        <button type="button" class="aq-btn" data-aq="title">타이틀</button>${toastHtml()}`
    }

    if (screen === 'tutorial') {
      return `${top}
        <div class="aq-card">
          <h2>튜토리얼</h2>
          <p class="aq-muted">보드 위에서 직접 배웁니다. 강조된 보석을 밀어 맞추세요.</p>
          <button type="button" class="aq-btn primary" data-aq="tutorial-start">실전으로 배우기</button>
          <button type="button" class="aq-btn" data-aq="tutorial-skip" style="margin-top:8px;width:100%">건너뛰기</button>
        </div>${toastHtml()}`
    }

    return `${top}<div class="aq-card">로딩…</div>`
  }

  function toastHtml(): string {
    return toast ? `<div class="aq-toast">${esc(toast)}</div>` : ''
  }

  function renderBattle(): string {
    const b = battle!
    const hero = heroById(save.heroId || 'kael')!
    const skills = [...hero.skills, hero.ultimate]
    const pPct = Math.max(0, Math.round((b.player.hp / b.player.maxHp) * 100))
    const ePct = Math.max(0, Math.round((b.enemy.hp / b.enemy.maxHp) * 100))
    const enPct = Math.max(0, Math.round((b.player.energy / b.player.maxEnergy) * 100))
    const stage = stageById(b.stageId)
    const coach = b.tutorialStep === 0 ? tutorialCoach : null
    return `
      <div class="aq-topbar">
        <button type="button" class="aq-btn" data-aq="flee">후퇴</button>
        <h1>${esc(stage?.name || '전투')}</h1>
        <span class="aq-muted">C${b.combo}</span>
      </div>
      <div class="aq-battle">
        <div class="aq-card" style="padding:10px">
          <div class="aq-fighter">
            <div class="aq-portrait" style="--h-accent:#ff6b4a;width:56px;height:56px"></div>
            <div>
              <strong>${esc(b.enemy.name)}</strong>
              <div class="aq-bar"><i style="width:${ePct}%" data-aq-ehp></i></div>
              <div class="aq-muted" data-aq-ehp-text>HP ${b.enemy.hp}/${b.enemy.maxHp}${b.phase ? ` · P${b.phase + 1}` : ''}</div>
            </div>
          </div>
        </div>
        <div class="aq-turn">${turnBannerHtml()}</div>
        ${b.tutorialStep != null ? `<div class="aq-coach" data-aq-coach>${coachHtml()}</div>
          <button type="button" class="aq-btn aq-skip-tut" data-aq="tutorial-skip-battle">튜토리얼 건너뛰기</button>` : ''}
        <div class="aq-board-wrap">
          <div class="aq-board" data-aq-board="1" style="touch-action:none">
            ${b.board
              .map((row, r) =>
                row
                  .map((cell, c) => {
                    const sel = selected && selected.r === r && selected.c === c ? ' selected' : ''
                    const isCoach = coach && coach.a.r === r && coach.a.c === c ? ' coach' : ''
                    const isTarget = coach && coach.b.r === r && coach.b.c === c ? ' coach-target' : ''
                    return `<button type="button" class="aq-gem${sel}${isCoach}${isTarget}" data-kind="${cell.kind}" data-special="${cell.special || 'none'}" data-r="${r}" data-c="${c}" aria-label="${cell.kind}"><span class="aq-sym">${GEM_SYM[cell.kind]}</span></button>`
                  })
                  .join(''),
              )
              .join('')}
          </div>
          ${coach ? `<div class="aq-arrow" data-dir="${dirLabel(coach)}" aria-hidden="true">➜</div>` : ''}
          <div class="aq-float" data-aq-float style="${floatText ? '' : 'display:none'}">${esc(floatText)}</div>
        </div>
        <div class="aq-card" style="padding:10px">
          <div class="aq-fighter">
            <div class="aq-portrait" style="--h-accent:${hero.accent};width:56px;height:56px"></div>
            <div>
              <strong>${esc(b.player.name)}</strong>
              <div class="aq-bar"><i style="width:${pPct}%" data-aq-php></i></div>
              <div class="aq-bar energy"><i style="width:${enPct}%" data-aq-pen></i></div>
              <div class="aq-muted" data-aq-php-text>HP ${b.player.hp} · EN ${b.player.energy}/${b.player.maxEnergy} · SH ${b.player.shield}</div>
            </div>
          </div>
          <div class="aq-skills" style="margin-top:8px">
            ${skills
              .map(
                (sk) =>
                  `<button type="button" class="aq-btn" data-aq="skill" data-id="${sk.id}" ${b.turn !== 'player' || b.player.energy < sk.energyCost || b.animLock ? 'disabled' : ''}><strong>${esc(sk.name)}</strong><div class="aq-muted">EN ${sk.energyCost} · ${esc(sk.desc)}</div></button>`,
              )
              .join('')}
          </div>
        </div>
        ${DEV_DEBUG ? `<pre class="aq-debug" data-aq-debug>${debugHtml()}</pre>` : ''}
      </div>${toastHtml()}`
  }

  function bindBoard(): void {
    const boardEl = root.querySelector('[data-aq-board="1"]') as HTMLElement | null
    if (!boardEl || !battle) return
    detachBoard = attachBoardInput(boardEl, {
      canInteract,
      forcedMove: () => (battle?.tutorialStep === 0 ? tutorialCoach : null),
      onSelect: (cell) => {
        selected = cell
        // class-only update — no remount
        paintBoardClasses()
      },
      onSwap: (a, b) => {
        void playerMove(a, b)
      },
    })
  }

  function bindChrome(): void {
    root.querySelector('[data-aq="back"]')?.addEventListener('click', () => {
      if (screen === 'battle') {
        clearHintTimer()
        screen = 'campaign'
        battle = null
        paint()
        return
      }
      opts?.onExit?.()
    })
    root.querySelector('[data-aq="flee"]')?.addEventListener('click', () => {
      clearHintTimer()
      screen = 'campaign'
      battle = null
      paint()
    })
    root.querySelector('[data-aq="new"]')?.addEventListener('click', () => {
      if (!save.heroId) screen = 'heroSelect'
      else screen = 'campaign'
      paint()
    })
    root.querySelector('[data-aq="campaign"]')?.addEventListener('click', () => {
      screen = 'campaign'
      paint()
    })
    root.querySelector('[data-aq="title"]')?.addEventListener('click', () => {
      screen = 'title'
      paint()
    })
    root.querySelector('[data-aq="inventory"]')?.addEventListener('click', () => {
      screen = 'inventory'
      paint()
    })
    root.querySelector('[data-aq="daily"]')?.addEventListener('click', () => {
      screen = 'daily'
      paint()
    })
    root.querySelector('[data-aq="settings"]')?.addEventListener('click', () => {
      screen = 'settings'
      paint()
    })
    root.querySelector('[data-aq="tutorial"]')?.addEventListener('click', () => {
      screen = 'tutorial'
      paint()
    })
    const skipTut = () => {
      save = { ...save, tutorialDone: true }
      persist()
      if (battle) {
        battle = { ...battle, tutorialStep: undefined }
        tutorialCoach = null
        paint()
      } else {
        screen = 'campaign'
        paint()
      }
    }
    root.querySelector('[data-aq="tutorial-skip"]')?.addEventListener('click', skipTut)
    root.querySelector('[data-aq="tutorial-skip-battle"]')?.addEventListener('click', skipTut)
    root.querySelector('[data-aq="tutorial-start"]')?.addEventListener('click', () => {
      beginStage('c1-s1', true)
    })
    root.querySelectorAll('[data-aq="pick-hero"]').forEach((el) => {
      el.addEventListener('click', () => {
        const id = (el as HTMLElement).dataset.id as QuestSave['heroId']
        if (!id || !save.unlockedHeroes.includes(id)) return
        save = { ...save, heroId: id }
        persist()
        // First play always starts interactive tutorial battle
        if (!save.tutorialDone) beginStage('c1-s1', true)
        else {
          screen = 'campaign'
          paint()
        }
        playQuestSfx('ui', save.settings.sfx)
      })
    })
    root.querySelectorAll('[data-aq="fight"]').forEach((el) => {
      el.addEventListener('click', () => {
        const id = (el as HTMLElement).dataset.stage || ''
        // Force tutorial on first ever battle
        const needTut = !save.tutorialDone && id === 'c1-s1'
        beginStage(id, needTut)
      })
    })
    root.querySelector('[data-aq="daily-fight"]')?.addEventListener('click', () => {
      const seed = hashSeed(`daily-${todayKey()}`)
      const stage = CHAPTER1_STAGES[Math.min(10, save.stageCleared)] || CHAPTER1_STAGES[0]!
      battle = startBattle(save, stage, seed, false)
      battle.stageId = stage.id
      screen = 'battle'
      save = { ...save, dailyDate: todayKey() }
      const ach = checkAchievements(save, { daily: true })
      if (ach.length) save = { ...save, achievements: [...save.achievements, ...ach] }
      persist()
      if (stage.isBoss) playQuestSfx('boss', save.settings.sfx)
      paint()
    })
    root.querySelector('[data-aq="retry"]')?.addEventListener('click', () => {
      if (battle) beginStage(battle.stageId, false)
      else {
        screen = 'campaign'
        paint()
      }
    })
    root.querySelectorAll('[data-aq="equip"]').forEach((el) => {
      el.addEventListener('click', () => {
        const id = (el as HTMLElement).dataset.id || ''
        const item = save.inventory.find((i) => i.id === id)
        if (!item) return
        save = { ...save, equipped: { ...save.equipped, [item.slot]: item.id } }
        persist()
        showToast(`${item.name} 장착`)
      })
    })
    root.querySelector('[data-aq="set-sfx"]')?.addEventListener('change', (e) => {
      save = { ...save, settings: { ...save.settings, sfx: (e.target as HTMLInputElement).checked } }
      persist()
    })
    root.querySelector('[data-aq="set-music"]')?.addEventListener('change', (e) => {
      save = { ...save, settings: { ...save.settings, music: (e.target as HTMLInputElement).checked } }
      persist()
    })
    root.querySelector('[data-aq="set-haptic"]')?.addEventListener('change', (e) => {
      save = { ...save, settings: { ...save.settings, haptic: (e.target as HTMLInputElement).checked } }
      persist()
    })
    root.querySelectorAll('[data-aq="skill"]').forEach((el) => {
      el.addEventListener('click', () => {
        if (!battle || !canInteract()) return
        const id = (el as HTMLElement).dataset.id || ''
        const hero = heroById(save.heroId || 'kael')!
        const skill = [...hero.skills, hero.ultimate].find((s) => s.id === id)
        if (!skill) return
        void useSkill(skill)
      })
    })
  }

  function beginStage(stageId: string, tutorial: boolean): void {
    const stage = stageById(stageId)
    if (!stage) return
    if (!save.heroId) {
      screen = 'heroSelect'
      paint()
      return
    }
    const seed = hashSeed(`${stageId}-${save.battlesWon}-${Date.now() % 10000}`)
    battle = startBattle(save, stage, seed, tutorial)
    selected = null
    hintMove = null
    tutorialCoach = null
    if (tutorial) {
      battle.tutorialStep = 0
      tutorialCoach = pickTutorialMove(findAllMoves(battle.board))
      if (!tutorialCoach) {
        // ensure a playable board for tutorial
        battle.board = battle.board
        tutorialCoach = pickTutorialMove(findAllMoves(battle.board))
      }
    }
    screen = 'battle'
    if (stage.isBoss) {
      playQuestSfx('boss', save.settings.sfx)
      haptic([30, 40, 30], save.settings.haptic)
      showToast('보스 등장 · 에테르리온')
    }
    paint()
  }

  async function flashInvalidSwap(a: CellPos, b: CellPos): Promise<void> {
    const boardEl = root.querySelector('[data-aq-board="1"]')
    if (!boardEl) return
    const ga = boardEl.querySelector(`.aq-gem[data-r="${a.r}"][data-c="${a.c}"]`)
    const gb = boardEl.querySelector(`.aq-gem[data-r="${b.r}"][data-c="${b.c}"]`)
    ga?.classList.add('swap-fail')
    gb?.classList.add('swap-fail')
    playQuestSfx('swap', save.settings.sfx)
    await wait(180)
    ga?.classList.remove('swap-fail')
    gb?.classList.remove('swap-fail')
  }

  async function playerMove(a: CellPos, b: CellPos): Promise<void> {
    if (!battle || battle.animLock || battle.turn !== 'player') return
    clearHintTimer()
    hintMove = null
    lastSwap = `${a.r},${a.c}->${b.r},${b.c}`
    // Resolve swap BEFORE locking UI state into the engine call.
    const res = applyPlayerSwap(battle, save, a, b)
    if (!res.ok) {
      battle = { ...battle, animLock: true }
      paintBoardClasses()
      await flashInvalidSwap(a, b)
      battle = { ...battle, animLock: false }
      selected = null
      const moves = findAllMoves(battle.board)
      if (!moves.length) {
        showToast('움직일 수 있는 보석이 없어 섞습니다')
        const { ensurePlayable } = await import('../match3/board')
        battle = {
          ...battle,
          board: ensurePlayable(battle.board, battle.seed + battle.moves + 77),
          animLock: false,
        }
        if (battle.tutorialStep === 0) tutorialCoach = pickTutorialMove(findAllMoves(battle.board))
        paint()
        return
      }
      if (battle.tutorialStep === 0) showToast('강조된 보석을 안내 방향으로 밀어주세요')
      paintBoardClasses()
      scheduleHint()
      return
    }
    battle = { ...res.battle, animLock: true }
    paintBoardClasses()

    statusLine = `dmg=${res.fx.damageToEnemy} heal=${res.fx.heal} en=${res.fx.energyGain} combo=${res.fx.combo}`
    playQuestSfx(res.fx.combo > 1 ? 'cascade' : 'match', save.settings.sfx)
    if (res.fx.hadFive) {
      playQuestSfx('critical', save.settings.sfx)
      haptic([20, 30, 20], save.settings.haptic)
    } else haptic(10, save.settings.haptic)

    floatText = res.fx.damageToEnemy ? `-${res.fx.damageToEnemy}` : res.fx.heal ? `+${res.fx.heal}` : 'MATCH'
    save = {
      ...save,
      gemsCleared: save.gemsCleared + Math.max(3, res.fx.combo * 3),
      bestCombo: Math.max(save.bestCombo, res.fx.combo),
    }

    // Advance tutorial steps on successful interactive actions
    if (battle.tutorialStep != null) {
      if (battle.tutorialStep === 0) {
        battle = { ...battle, tutorialStep: 1 }
        tutorialCoach = null
      } else if (battle.tutorialStep === 1) {
        battle = { ...battle, tutorialStep: 2 }
      }
    }

    paint() // remount after resolved board — gesture already finished
    await wait(320)
    floatText = ''
    const floatEl = root.querySelector('[data-aq-float]') as HTMLElement | null
    if (floatEl) floatEl.style.display = 'none'

    if (isVictory(battle)) {
      finishVictory(res.fx)
      return
    }

    if (battle.turn === 'enemy') {
      if (battle.tutorialStep === 2) {
        battle = { ...battle, tutorialStep: 3 }
        paint()
        await wait(600)
      }
      await enemyPhase()
    } else {
      // extra turn
      battle = { ...battle, animLock: false }
      if (battle.tutorialStep === 0) tutorialCoach = pickTutorialMove(findAllMoves(battle.board))
      paint()
      scheduleHint()
    }
  }

  async function useSkill(skill: SkillDef): Promise<void> {
    if (!battle || battle.animLock || battle.turn !== 'player') return
    clearHintTimer()
    battle = { ...battle, animLock: true }
    const res = castSkill(battle, save, skill)
    if (!res.ok) {
      battle = { ...battle, animLock: false }
      showToast('에너지가 부족하거나 사용할 수 없습니다')
      paintBoardClasses()
      return
    }
    battle = res.battle
    if (battle.tutorialStep === 2) battle = { ...battle, tutorialStep: 3 }
    playQuestSfx('skill', save.settings.sfx)
    haptic(25, save.settings.haptic)
    floatText = res.fx.damageToEnemy ? `SKL -${res.fx.damageToEnemy}` : skill.name
    paint()
    await wait(320)
    floatText = ''
    if (isVictory(battle)) {
      finishVictory(res.fx)
      return
    }
    if (battle.turn === 'enemy') await enemyPhase()
    else {
      battle = { ...battle, animLock: false }
      paint()
      scheduleHint()
    }
  }

  async function enemyPhase(): Promise<void> {
    if (!battle) return
    battle = { ...battle, turn: 'enemy', animLock: true }
    paint()
    await wait(550)
    const res = runEnemyTurn(battle, save)
    battle = res.battle
    if (res.fx.damageToPlayer) {
      playQuestSfx('damage', save.settings.sfx)
      floatText = `-${res.fx.damageToPlayer}`
    } else {
      floatText = 'ENEMY MOVE'
    }
    paint()
    await wait(500)
    floatText = ''
    if (isDefeat(battle)) {
      finishDefeat()
      return
    }
    // Complete tutorial after first enemy turn
    if (battle.tutorialStep === 3) {
      battle = { ...battle, tutorialStep: undefined }
      save = { ...save, tutorialDone: true }
      persist()
      showToast('튜토리얼 완료 · 계속 전투하세요')
    }
    battle = { ...battle, animLock: false, turn: 'player' }
    selected = null
    paint()
    scheduleHint()
  }

  function finishVictory(fx: { combo: number; hadFive: boolean }): void {
    if (!battle) return
    clearHintTimer()
    const stage = stageById(battle.stageId)!
    playQuestSfx('victory', save.settings.sfx)
    const item = rollLoot(battle.seed + 99, Boolean(stage.isElite || stage.isBoss))
    let next: QuestSave = {
      ...save,
      credit: save.credit + stage.credit,
      battlesWon: save.battlesWon + 1,
      stageCleared: Math.max(save.stageCleared, stage.index),
      inventory: [...save.inventory, item].slice(-40),
      tutorialDone: true,
    }
    next = applyXp(next, stage.xp)
    next = unlockHeroesForStage(next, next.stageCleared)
    const ach = checkAchievements(next, {
      combo: Math.max(fx.combo, battle.combo),
      hadFive: fx.hadFive,
      perfect: !battle.damagedThisBattle,
      boss: Boolean(stage.isBoss),
      elite: Boolean(stage.isElite),
      legendary: item.rarity === 'LEGENDARY',
    })
    if (ach.length) next = { ...next, achievements: [...new Set([...next.achievements, ...ach])] }
    if (next.dailyDate === todayKey()) {
      next = { ...next, dailyBest: Math.max(next.dailyBest, stage.xp + battle.player.hp) }
    }
    save = next
    persist()
    lastReward = { xp: stage.xp, credit: stage.credit, itemName: item.name, ach }
    battle = null
    screen = 'victory'
    if (ach.length) showToast(`업적: ${ACHIEVEMENTS.find((a) => a.id === ach[0])?.title}`)
    paint()
  }

  function finishDefeat(): void {
    clearHintTimer()
    playQuestSfx('defeat', save.settings.sfx)
    save = { ...save, battlesLost: save.battlesLost + 1 }
    persist()
    screen = 'defeat'
    paint()
  }

  paint()
  return {
    destroy: () => {
      destroyed = true
      clearHintTimer()
      detachBoard?.()
      root.innerHTML = ''
    },
  }
}

function esc(s: string): string {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function wait(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}
