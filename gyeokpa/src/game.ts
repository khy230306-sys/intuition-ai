import { sfx } from "./audio";

export type Weapon = "pulse" | "twin" | "spread" | "laser";

export interface GameHooks {
  onHud: (info: HudInfo) => void;
  onToast: (msg: string) => void;
  onOver: (result: RunResult) => void;
  onClear: (result: RunResult) => void;
}

export interface HudInfo {
  score: number;
  wave: number;
  stage: number;
  lives: number;
  weapon: Weapon;
  combo: number;
  bossHp?: number;
  bossMax?: number;
}

export interface RunResult {
  score: number;
  wave: number;
  stage: number;
  kills: number;
  bosses: number;
  maxCombo: number;
  noHit: boolean;
  cleared: boolean;
}

interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  dmg: number;
  friendly: boolean;
  laser?: boolean;
  life?: number;
}

interface Enemy {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  hp: number;
  maxHp: number;
  kind: "scout" | "tank" | "zig" | "boss";
  score: number;
  shootCd: number;
  phase: number;
  flash: number;
}

interface Power {
  x: number;
  y: number;
  kind: "weapon" | "life" | "shield" | "bomb";
  life: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: string;
  size: number;
}

interface Star {
  x: number;
  y: number;
  z: number;
  s: number;
}

const WEAPON_LABEL: Record<Weapon, string> = {
  pulse: "펄스",
  twin: "트윈",
  spread: "스프레드",
  laser: "레이저",
};

export function weaponLabel(w: Weapon): string {
  return WEAPON_LABEL[w];
}

export class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private hooks: GameHooks;
  private running = false;
  private raf = 0;
  private last = 0;
  private w = 360;
  private h = 640;
  private dpr = 1;

  private player = { x: 180, y: 520, r: 14, inv: 0, shield: 0 };
  private targetX = 180;
  private targetY = 520;
  private dragging = false;
  private lives = 3;
  private score = 0;
  private combo = 0;
  private comboT = 0;
  private maxCombo = 0;
  private kills = 0;
  private bosses = 0;
  private noHit = true;
  private weapon: Weapon = "pulse";
  private fireCd = 0;
  private stage = 1;
  private wave = 1;
  private spawnLeft = 0;
  private spawnCd = 0;
  private betweenWaves = 1.2;
  private bossActive = false;
  private cleared = false;

  private bullets: Bullet[] = [];
  private enemies: Enemy[] = [];
  private powers: Power[] = [];
  private particles: Particle[] = [];
  private stars: Star[] = [];
  private shake = 0;
  private flash = 0;

  constructor(canvas: HTMLCanvasElement, hooks: GameHooks) {
    this.canvas = canvas;
    const c = canvas.getContext("2d");
    if (!c) throw new Error("2d context missing");
    this.ctx = c;
    this.hooks = hooks;
    this.bindInput();
    this.resize();
    window.addEventListener("resize", () => this.resize());
  }

  start(stage: number): void {
    this.stage = Math.max(1, Math.min(5, stage));
    this.resetRun();
    this.running = true;
    this.last = performance.now();
    cancelAnimationFrame(this.raf);
    const loop = (t: number) => {
      if (!this.running) return;
      const dt = Math.min(0.033, (t - this.last) / 1000);
      this.last = t;
      this.update(dt);
      this.draw();
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
    this.emitHud();
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  private resetRun(): void {
    this.lives = 3;
    this.score = 0;
    this.combo = 0;
    this.comboT = 0;
    this.maxCombo = 0;
    this.kills = 0;
    this.bosses = 0;
    this.noHit = true;
    this.weapon = "pulse";
    this.fireCd = 0;
    this.wave = 1;
    this.betweenWaves = 1.2;
    this.spawnLeft = 0;
    this.spawnCd = 0;
    this.bossActive = false;
    this.cleared = false;
    this.bullets = [];
    this.enemies = [];
    this.powers = [];
    this.particles = [];
    this.shake = 0;
    this.flash = 0;
    this.player = { x: this.w / 2, y: this.h * 0.82, r: 14, inv: 1.2, shield: 0 };
    this.targetX = this.player.x;
    this.targetY = this.player.y;
    this.stars = Array.from({ length: 60 }, () => ({
      x: Math.random() * this.w,
      y: Math.random() * this.h,
      z: 0.3 + Math.random() * 1.4,
      s: 0.6 + Math.random() * 1.8,
    }));
    this.queueWave();
  }

  private resize(): void {
    const parent = this.canvas.parentElement;
    const cw = parent?.clientWidth || 360;
    const ch = parent?.clientHeight || 640;
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.w = cw;
    this.h = ch;
    this.canvas.width = Math.floor(cw * this.dpr);
    this.canvas.height = Math.floor(ch * this.dpr);
    this.canvas.style.width = `${cw}px`;
    this.canvas.style.height = `${ch}px`;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.player.x = Math.min(this.w - 20, Math.max(20, this.player.x));
    this.player.y = Math.min(this.h - 30, Math.max(this.h * 0.55, this.player.y));
  }

  private bindInput(): void {
    const setTarget = (clientX: number, clientY: number) => {
      const rect = this.canvas.getBoundingClientRect();
      this.targetX = ((clientX - rect.left) / rect.width) * this.w;
      this.targetY = ((clientY - rect.top) / rect.height) * this.h;
      this.targetX = Math.max(18, Math.min(this.w - 18, this.targetX));
      this.targetY = Math.max(this.h * 0.45, Math.min(this.h - 28, this.targetY));
    };

    this.canvas.addEventListener(
      "pointerdown",
      (e) => {
        this.dragging = true;
        this.canvas.setPointerCapture(e.pointerId);
        setTarget(e.clientX, e.clientY);
      },
      { passive: true },
    );
    this.canvas.addEventListener(
      "pointermove",
      (e) => {
        if (!this.dragging) return;
        setTarget(e.clientX, e.clientY);
      },
      { passive: true },
    );
    const end = () => {
      this.dragging = false;
    };
    this.canvas.addEventListener("pointerup", end);
    this.canvas.addEventListener("pointercancel", end);
  }

  private result(cleared: boolean): RunResult {
    return {
      score: this.score,
      wave: this.wave,
      stage: this.stage,
      kills: this.kills,
      bosses: this.bosses,
      maxCombo: this.maxCombo,
      noHit: this.noHit,
      cleared,
    };
  }

  private emitHud(): void {
    const boss = this.enemies.find((e) => e.kind === "boss");
    this.hooks.onHud({
      score: this.score,
      wave: this.wave,
      stage: this.stage,
      lives: this.lives,
      weapon: this.weapon,
      combo: this.combo,
      bossHp: boss?.hp,
      bossMax: boss?.maxHp,
    });
  }

  private queueWave(): void {
    const base = 6 + this.wave * 2 + this.stage;
    this.spawnLeft = base;
    this.spawnCd = 0.35;
    this.betweenWaves = 0;
    if (this.wave % 5 === 0) {
      this.spawnLeft = 0;
      this.spawnBoss();
    } else {
      this.hooks.onToast(`웨이브 ${this.wave}`);
    }
  }

  private spawnBoss(): void {
    this.bossActive = true;
    const hp = 80 + this.stage * 40 + this.wave * 12;
    this.enemies.push({
      x: this.w / 2,
      y: -60,
      vx: 40 + this.stage * 6,
      vy: 40,
      r: 36,
      hp,
      maxHp: hp,
      kind: "boss",
      score: 1200 + this.stage * 200,
      shootCd: 0.8,
      phase: 0,
      flash: 0,
    });
    this.hooks.onToast("보스 출현!");
    sfx.ui();
  }

  private spawnEnemy(): void {
    const roll = Math.random();
    let kind: Enemy["kind"] = "scout";
    if (roll > 0.78) kind = "tank";
    else if (roll > 0.52) kind = "zig";
    const x = 28 + Math.random() * (this.w - 56);
    const speed = 50 + this.wave * 8 + this.stage * 10;
    if (kind === "scout") {
      this.enemies.push({
        x,
        y: -20,
        vx: (Math.random() - 0.5) * 40,
        vy: speed,
        r: 12,
        hp: 1 + Math.floor(this.stage / 2),
        maxHp: 1 + Math.floor(this.stage / 2),
        kind,
        score: 100,
        shootCd: 1.2 + Math.random(),
        phase: Math.random() * Math.PI * 2,
        flash: 0,
      });
    } else if (kind === "zig") {
      this.enemies.push({
        x,
        y: -24,
        vx: 90 + this.stage * 10,
        vy: speed * 0.75,
        r: 13,
        hp: 2,
        maxHp: 2,
        kind,
        score: 140,
        shootCd: 1.4,
        phase: 0,
        flash: 0,
      });
    } else {
      this.enemies.push({
        x,
        y: -28,
        vx: 20,
        vy: speed * 0.55,
        r: 18,
        hp: 4 + this.stage,
        maxHp: 4 + this.stage,
        kind,
        score: 220,
        shootCd: 1.8,
        phase: 0,
        flash: 0,
      });
    }
  }

  private fire(): void {
    const p = this.player;
    const mk = (ox: number, oy: number, vx: number, vy: number, dmg: number, r = 3.5) => {
      this.bullets.push({ x: p.x + ox, y: p.y + oy, vx, vy, r, dmg, friendly: true });
    };
    if (this.weapon === "pulse") {
      mk(0, -12, 0, -620, 1);
      sfx.shot();
    } else if (this.weapon === "twin") {
      mk(-8, -8, 0, -640, 1);
      mk(8, -8, 0, -640, 1);
      sfx.shot();
    } else if (this.weapon === "spread") {
      mk(0, -10, 0, -600, 1);
      mk(-4, -8, -160, -560, 1);
      mk(4, -8, 160, -560, 1);
      sfx.shot();
    } else {
      this.bullets.push({
        x: p.x,
        y: p.y - 16,
        vx: 0,
        vy: -900,
        r: 4,
        dmg: 0.55,
        friendly: true,
        laser: true,
        life: 0.08,
      });
      sfx.shot();
    }
  }

  private hurtPlayer(): void {
    if (this.player.inv > 0) return;
    if (this.player.shield > 0) {
      this.player.shield = 0;
      this.player.inv = 1;
      this.hooks.onToast("실드 파괴!");
      sfx.hurt();
      return;
    }
    this.noHit = false;
    this.lives -= 1;
    this.combo = 0;
    this.player.inv = 1.6;
    this.shake = 10;
    this.flash = 0.25;
    sfx.hurt();
    this.emitHud();
    if (this.lives <= 0) {
      this.running = false;
      this.hooks.onOver(this.result(false));
    }
  }

  private killEnemy(e: Enemy, idx: number): void {
    this.enemies.splice(idx, 1);
    this.kills += 1;
    this.combo += 1;
    this.comboT = 1.6;
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    const mult = 1 + Math.floor(this.combo / 5) * 0.15;
    this.score += Math.floor(e.score * mult);
    this.burst(e.x, e.y, e.kind === "boss" ? 28 : 12, e.kind === "boss" ? "#ff5a4a" : "#3de0c5");
    sfx.boom();
    if (e.kind === "boss") {
      this.bosses += 1;
      this.bossActive = false;
      this.hooks.onToast("보스 격파!");
      this.powers.push({ x: e.x, y: e.y, kind: "weapon", life: 8 });
      this.powers.push({ x: e.x + 24, y: e.y + 10, kind: "life", life: 8 });
    } else if (Math.random() < 0.12 + this.stage * 0.02) {
      const kinds: Power["kind"][] = ["weapon", "shield", "bomb", "life"];
      this.powers.push({
        x: e.x,
        y: e.y,
        kind: kinds[Math.floor(Math.random() * kinds.length)]!,
        life: 7,
      });
    }
    this.emitHud();
  }

  private burst(x: number, y: number, n: number, color: string): void {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 40 + Math.random() * 160;
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 0.35 + Math.random() * 0.35,
        max: 0.7,
        color,
        size: 1.5 + Math.random() * 2.5,
      });
    }
  }

  private nextWeapon(): void {
    const order: Weapon[] = ["pulse", "twin", "spread", "laser"];
    const i = order.indexOf(this.weapon);
    this.weapon = order[(i + 1) % order.length]!;
    this.hooks.onToast(`무기: ${weaponLabel(this.weapon)}`);
    sfx.power();
  }

  private update(dt: number): void {
    this.shake = Math.max(0, this.shake - dt * 28);
    this.flash = Math.max(0, this.flash - dt);
    this.player.inv = Math.max(0, this.player.inv - dt);
    this.player.shield = Math.max(0, this.player.shield - dt);
    this.comboT = Math.max(0, this.comboT - dt);
    if (this.comboT <= 0) this.combo = 0;

    this.player.x += (this.targetX - this.player.x) * Math.min(1, dt * 14);
    this.player.y += (this.targetY - this.player.y) * Math.min(1, dt * 14);

    this.fireCd -= dt;
    const rate =
      this.weapon === "laser" ? 0.05 : this.weapon === "spread" ? 0.16 : this.weapon === "twin" ? 0.12 : 0.14;
    if (this.fireCd <= 0) {
      this.fire();
      this.fireCd = rate;
    }

    for (const s of this.stars) {
      s.y += (40 + s.z * 90) * dt;
      if (s.y > this.h) {
        s.y = -4;
        s.x = Math.random() * this.w;
      }
    }

    if (!this.bossActive && this.betweenWaves > 0) {
      this.betweenWaves -= dt;
      if (this.betweenWaves <= 0) this.queueWave();
    } else if (!this.bossActive && this.spawnLeft > 0) {
      this.spawnCd -= dt;
      if (this.spawnCd <= 0) {
        this.spawnEnemy();
        this.spawnLeft -= 1;
        this.spawnCd = Math.max(0.22, 0.55 - this.wave * 0.02 - this.stage * 0.03);
      }
    } else if (!this.bossActive && this.spawnLeft <= 0 && this.enemies.length === 0 && !this.cleared) {
      if (this.wave >= 10 + this.stage * 2) {
        this.cleared = true;
        this.running = false;
        sfx.clear();
        this.hooks.onClear(this.result(true));
        return;
      }
      this.wave += 1;
      this.betweenWaves = 1.1;
      this.hooks.onToast(`다음 웨이브 준비`);
      this.emitHud();
    }

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i]!;
      e.flash = Math.max(0, e.flash - dt * 4);
      e.phase += dt;
      if (e.kind === "zig") {
        e.x += Math.sin(e.phase * 4) * e.vx * dt;
        e.y += e.vy * dt;
      } else if (e.kind === "boss") {
        if (e.y < 90) e.y += e.vy * dt;
        else {
          e.x += e.vx * dt;
          if (e.x < 50 || e.x > this.w - 50) e.vx *= -1;
        }
        e.shootCd -= dt;
        if (e.shootCd <= 0) {
          const pattern = Math.floor(e.phase) % 3;
          if (pattern === 0) {
            for (let a = -2; a <= 2; a++) {
              const ang = Math.PI / 2 + a * 0.22;
              this.bullets.push({
                x: e.x,
                y: e.y + 20,
                vx: Math.cos(ang) * 180,
                vy: Math.sin(ang) * 220,
                r: 4,
                dmg: 1,
                friendly: false,
              });
            }
          } else if (pattern === 1) {
            const dx = this.player.x - e.x;
            const dy = this.player.y - e.y;
            const len = Math.hypot(dx, dy) || 1;
            this.bullets.push({
              x: e.x,
              y: e.y + 16,
              vx: (dx / len) * 260,
              vy: (dy / len) * 260,
              r: 5,
              dmg: 1,
              friendly: false,
            });
          } else {
            for (let k = 0; k < 8; k++) {
              const ang = (k / 8) * Math.PI * 2 + e.phase;
              this.bullets.push({
                x: e.x,
                y: e.y,
                vx: Math.cos(ang) * 140,
                vy: Math.sin(ang) * 140,
                r: 3.5,
                dmg: 1,
                friendly: false,
              });
            }
          }
          e.shootCd = Math.max(0.55, 1.1 - this.stage * 0.08);
        }
      } else {
        e.x += e.vx * dt;
        e.y += e.vy * dt;
        if (e.x < 16 || e.x > this.w - 16) e.vx *= -1;
        e.shootCd -= dt;
        if (e.shootCd <= 0 && e.y > 40 && e.y < this.h * 0.7) {
          const dx = this.player.x - e.x;
          const dy = this.player.y - e.y;
          const len = Math.hypot(dx, dy) || 1;
          this.bullets.push({
            x: e.x,
            y: e.y + 8,
            vx: (dx / len) * (140 + this.stage * 15),
            vy: (dy / len) * (140 + this.stage * 15),
            r: 3.5,
            dmg: 1,
            friendly: false,
          });
          e.shootCd = 1.6 + Math.random() * 1.2;
        }
      }
      if (e.y > this.h + 40) {
        this.enemies.splice(i, 1);
        continue;
      }
      const dx = e.x - this.player.x;
      const dy = e.y - this.player.y;
      if (dx * dx + dy * dy < (e.r + this.player.r) * (e.r + this.player.r)) {
        this.hurtPlayer();
        if (e.kind !== "boss") this.killEnemy(e, i);
      }
    }

    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i]!;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.life != null) {
        b.life -= dt;
        if (b.life <= 0) {
          this.bullets.splice(i, 1);
          continue;
        }
      }
      if (b.x < -20 || b.x > this.w + 20 || b.y < -40 || b.y > this.h + 40) {
        this.bullets.splice(i, 1);
        continue;
      }
      if (b.friendly) {
        for (let j = this.enemies.length - 1; j >= 0; j--) {
          const e = this.enemies[j]!;
          const dx = e.x - b.x;
          const dy = e.y - b.y;
          if (dx * dx + dy * dy < (e.r + b.r) * (e.r + b.r)) {
            e.hp -= b.dmg;
            e.flash = 1;
            if (!b.laser) this.bullets.splice(i, 1);
            sfx.hit();
            if (e.hp <= 0) this.killEnemy(e, j);
            break;
          }
        }
      } else {
        const dx = this.player.x - b.x;
        const dy = this.player.y - b.y;
        if (dx * dx + dy * dy < (this.player.r + b.r) * (this.player.r + b.r)) {
          this.bullets.splice(i, 1);
          this.hurtPlayer();
        }
      }
    }

    for (let i = this.powers.length - 1; i >= 0; i--) {
      const p = this.powers[i]!;
      p.y += 70 * dt;
      p.life -= dt;
      if (p.life <= 0 || p.y > this.h + 20) {
        this.powers.splice(i, 1);
        continue;
      }
      const dx = p.x - this.player.x;
      const dy = p.y - this.player.y;
      if (dx * dx + dy * dy < (18 + this.player.r) * (18 + this.player.r)) {
        if (p.kind === "weapon") this.nextWeapon();
        else if (p.kind === "life") {
          this.lives = Math.min(5, this.lives + 1);
          this.hooks.onToast("라이프 +1");
          sfx.power();
        } else if (p.kind === "shield") {
          this.player.shield = 6;
          this.hooks.onToast("실드 ON");
          sfx.power();
        } else {
          for (let j = this.enemies.length - 1; j >= 0; j--) {
            const e = this.enemies[j]!;
            if (e.kind === "boss") {
              e.hp -= 18;
              e.flash = 1;
              if (e.hp <= 0) this.killEnemy(e, j);
            } else this.killEnemy(e, j);
          }
          this.flash = 0.2;
          this.hooks.onToast("전방 소탕!");
          sfx.boom();
        }
        this.powers.splice(i, 1);
        this.emitHud();
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]!;
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.96;
      p.vy *= 0.96;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
  }

  private draw(): void {
    const c = this.ctx;
    const sx = this.shake ? (Math.random() - 0.5) * this.shake : 0;
    const sy = this.shake ? (Math.random() - 0.5) * this.shake : 0;
    c.save();
    c.translate(sx, sy);
    c.clearRect(-20, -20, this.w + 40, this.h + 40);

    const g = c.createLinearGradient(0, 0, 0, this.h);
    g.addColorStop(0, "#0b1a2b");
    g.addColorStop(0.55, "#071018");
    g.addColorStop(1, "#050b12");
    c.fillStyle = g;
    c.fillRect(0, 0, this.w, this.h);

    for (const s of this.stars) {
      c.globalAlpha = 0.35 + s.z * 0.35;
      c.fillStyle = "#cfe7ff";
      c.fillRect(s.x, s.y, s.s, s.s * (1 + s.z * 0.4));
    }
    c.globalAlpha = 1;

    // ground glow strip
    const glow = c.createLinearGradient(0, this.h * 0.7, 0, this.h);
    glow.addColorStop(0, "rgba(255,90,74,0)");
    glow.addColorStop(1, "rgba(255,90,74,0.12)");
    c.fillStyle = glow;
    c.fillRect(0, this.h * 0.7, this.w, this.h * 0.3);

    for (const p of this.powers) {
      c.save();
      c.translate(p.x, p.y);
      c.rotate(performance.now() / 400);
      c.fillStyle =
        p.kind === "weapon" ? "#3de0c5" : p.kind === "life" ? "#ff5a4a" : p.kind === "shield" ? "#f0c35a" : "#e8f2ff";
      c.beginPath();
      c.moveTo(0, -10);
      c.lineTo(10, 0);
      c.lineTo(0, 10);
      c.lineTo(-10, 0);
      c.closePath();
      c.fill();
      c.restore();
    }

    for (const b of this.bullets) {
      if (b.friendly) {
        c.fillStyle = b.laser ? "#7cffef" : "#ffd1c8";
        if (b.laser) {
          c.fillRect(b.x - 2, b.y - 18, 4, 28);
        } else {
          c.beginPath();
          c.arc(b.x, b.y, b.r, 0, Math.PI * 2);
          c.fill();
        }
      } else {
        c.fillStyle = "#ff7a6b";
        c.beginPath();
        c.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        c.fill();
      }
    }

    for (const e of this.enemies) {
      c.save();
      c.translate(e.x, e.y);
      if (e.flash > 0) c.globalAlpha = 0.55 + Math.sin(e.flash * 20) * 0.45;
      if (e.kind === "boss") {
        c.fillStyle = "#ff5a4a";
        c.beginPath();
        c.moveTo(0, -34);
        c.lineTo(40, 10);
        c.lineTo(22, 28);
        c.lineTo(-22, 28);
        c.lineTo(-40, 10);
        c.closePath();
        c.fill();
        c.fillStyle = "#102033";
        c.fillRect(-14, -8, 28, 16);
        const ratio = e.hp / e.maxHp;
        c.fillStyle = "rgba(0,0,0,0.45)";
        c.fillRect(-40, -48, 80, 6);
        c.fillStyle = "#3de0c5";
        c.fillRect(-40, -48, 80 * ratio, 6);
      } else if (e.kind === "tank") {
        c.fillStyle = "#8aa3bd";
        c.fillRect(-16, -12, 32, 24);
        c.fillStyle = "#ff5a4a";
        c.fillRect(-6, 4, 12, 14);
      } else if (e.kind === "zig") {
        c.fillStyle = "#3de0c5";
        c.beginPath();
        c.moveTo(0, 14);
        c.lineTo(14, -10);
        c.lineTo(0, -4);
        c.lineTo(-14, -10);
        c.closePath();
        c.fill();
      } else {
        c.fillStyle = "#f0c35a";
        c.beginPath();
        c.moveTo(0, 12);
        c.lineTo(11, -10);
        c.lineTo(-11, -10);
        c.closePath();
        c.fill();
      }
      c.restore();
    }

    // player
    const p = this.player;
    c.save();
    c.translate(p.x, p.y);
    if (p.inv > 0 && Math.floor(p.inv * 20) % 2 === 0) c.globalAlpha = 0.35;
    if (p.shield > 0) {
      c.strokeStyle = "rgba(240,195,90,0.75)";
      c.lineWidth = 2;
      c.beginPath();
      c.arc(0, 0, 22, 0, Math.PI * 2);
      c.stroke();
    }
    c.fillStyle = "#e8f2ff";
    c.beginPath();
    c.moveTo(0, -16);
    c.lineTo(12, 12);
    c.lineTo(0, 6);
    c.lineTo(-12, 12);
    c.closePath();
    c.fill();
    c.fillStyle = "#ff5a4a";
    c.fillRect(-3, 8, 6, 8);
    c.restore();

    for (const part of this.particles) {
      c.globalAlpha = Math.max(0, part.life / part.max);
      c.fillStyle = part.color;
      c.fillRect(part.x, part.y, part.size, part.size);
    }
    c.globalAlpha = 1;

    if (this.flash > 0) {
      c.fillStyle = `rgba(255,240,230,${this.flash * 0.35})`;
      c.fillRect(0, 0, this.w, this.h);
    }

    if (this.combo >= 5) {
      c.fillStyle = "rgba(61,224,197,0.9)";
      c.font = "800 16px Outfit, sans-serif";
      c.textAlign = "center";
      c.fillText(`COMBO x${this.combo}`, this.w / 2, 48);
    }

    c.restore();
  }
}
