/** Protect URLs, code, mentions, etc. during translation. */

type Slot = { token: string; value: string }

export function protectForTranslation(text: string): { masked: string; slots: Slot[] } {
  const slots: Slot[] = []
  let i = 0
  const push = (value: string) => {
    const token = `⟦T${i++}⟧`
    slots.push({ token, value })
    return token
  }

  let masked = text
  masked = masked.replace(/```[\s\S]*?```/g, (m) => push(m))
  masked = masked.replace(/`[^`\n]+`/g, (m) => push(m))
  masked = masked.replace(/https?:\/\/\S+/gi, (m) => push(m))
  masked = masked.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, (m) => push(m))
  masked = masked.replace(/@[A-Za-z0-9_\uac00-\ud7af.]{2,40}/g, (m) => push(m))
  masked = masked.replace(/#[\w\uac00-\ud7af]{2,40}/g, (m) => push(m))
  return { masked, slots }
}

export function restoreProtected(text: string, slots: Slot[]): string {
  let out = text
  for (const s of slots) {
    out = out.split(s.token).join(s.value)
  }
  return out
}
