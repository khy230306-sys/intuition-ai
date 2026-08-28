export function now(): Date {
  return new Date();
}

export function toIso(d: Date | null | undefined): string | null {
  return d ? d.toISOString() : null;
}

/** Asia/Seoul offset helper without external tz lib (KST = UTC+9, no DST). */
export function kstParts(date = new Date()) {
  const utc = date.getTime() + date.getTimezoneOffset() * 60_000;
  const kst = new Date(utc + 9 * 60 * 60_000);
  return {
    y: kst.getFullYear(),
    m: kst.getMonth() + 1,
    d: kst.getDate(),
    hh: kst.getHours(),
    mm: kst.getMinutes(),
    ss: kst.getSeconds(),
    dateStr: `${kst.getFullYear()}-${String(kst.getMonth() + 1).padStart(2, '0')}-${String(kst.getDate()).padStart(2, '0')}`,
    weekday: kst.getDay(), // 0 Sun
    date: kst,
  };
}

export function parseHm(hm: string): { h: number; m: number } {
  const [h, m] = hm.split(':').map(Number);
  return { h, m };
}
