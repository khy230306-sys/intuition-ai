const KEY = "gyeokpa-meta-v1";

export type MedalId =
  | "first-blood"
  | "wave-5"
  | "boss-slayer"
  | "combo-20"
  | "no-hit-stage"
  | "score-10k"
  | "score-50k"
  | "daily-3";

export interface MedalDef {
  id: MedalId;
  title: string;
  desc: string;
}

export const MEDALS: MedalDef[] = [
  { id: "first-blood", title: "첫 격파", desc: "적 1기 파괴" },
  { id: "wave-5", title: "전선 유지", desc: "웨이브 5 도달" },
  { id: "boss-slayer", title: "보스 헌터", desc: "보스 격파" },
  { id: "combo-20", title: "연쇄 사격", desc: "콤보 20 달성" },
  { id: "no-hit-stage", title: "무상해 돌파", desc: "피격 없이 스테이지 클리어" },
  { id: "score-10k", title: "만점 사수", desc: "한 판 10,000점" },
  { id: "score-50k", title: "전설의 격파", desc: "한 판 50,000점" },
  { id: "daily-3", title: "일일 사수", desc: "일일 미션 3회 완료" },
];

export interface RankEntry {
  score: number;
  wave: number;
  stage: number;
  at: number;
}

export interface MetaState {
  bestScore: number;
  bestWave: number;
  unlockedStage: number;
  totalKills: number;
  totalBosses: number;
  totalRuns: number;
  medals: Partial<Record<MedalId, number>>;
  ranks: RankEntry[];
  daily: {
    date: string;
    kills: number;
    score: number;
    bosses: number;
    claimed: boolean;
  };
  dailyClears: number;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function defaultMeta(): MetaState {
  return {
    bestScore: 0,
    bestWave: 0,
    unlockedStage: 1,
    totalKills: 0,
    totalBosses: 0,
    totalRuns: 0,
    medals: {},
    ranks: [],
    daily: {
      date: today(),
      kills: 0,
      score: 0,
      bosses: 0,
      claimed: false,
    },
    dailyClears: 0,
  };
}

export function loadMeta(): MetaState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultMeta();
    const parsed = JSON.parse(raw) as MetaState;
    const base = defaultMeta();
    const merged: MetaState = { ...base, ...parsed, daily: { ...base.daily, ...parsed.daily } };
    if (merged.daily.date !== today()) {
      merged.daily = { date: today(), kills: 0, score: 0, bosses: 0, claimed: false };
    }
    return merged;
  } catch {
    return defaultMeta();
  }
}

export function saveMeta(meta: MetaState): void {
  localStorage.setItem(KEY, JSON.stringify(meta));
}

export function unlockMedal(meta: MetaState, id: MedalId): boolean {
  if (meta.medals[id]) return false;
  meta.medals[id] = Date.now();
  return true;
}

export function pushRank(meta: MetaState, entry: RankEntry): void {
  meta.ranks.push(entry);
  meta.ranks.sort((a, b) => b.score - a.score || b.wave - a.wave);
  meta.ranks = meta.ranks.slice(0, 10);
}

export function dailyProgress(meta: MetaState): { kills: number; score: number; bosses: number; done: boolean } {
  const kills = Math.min(1, meta.daily.kills / 40);
  const score = Math.min(1, meta.daily.score / 8000);
  const bosses = Math.min(1, meta.daily.bosses / 1);
  const done = kills >= 1 && score >= 1 && bosses >= 1;
  return { kills, score, bosses, done };
}

export const MAX_STAGE = 10;

export function stageName(n: number): string {
  const names = [
    "입문 전선",
    "도시 상공",
    "심야 공역",
    "요새 돌파",
    "해안 포격",
    "성층권 돌입",
    "궤도 경계",
    "적진 중심",
    "최후 방어선",
    "최종 격파",
  ];
  return names[Math.min(names.length - 1, Math.max(0, n - 1))] ?? `스테이지 ${n}`;
}
