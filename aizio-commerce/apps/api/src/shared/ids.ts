export function nowIso(now: Date = new Date()): string {
  return now.toISOString();
}

export function id(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now().toString(36)}_${rand}`;
}
