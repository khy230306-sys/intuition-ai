/**
 * Helpers so every Jarvis MIC control (HOME orb, composer, nav) stays wired
 * and visually in sync — never bind only the first querySelector match.
 */

/** Attach one click handler to every `[data-action="mic"]` in root. */
export function attachMicClickHandlers(
  root: ParentNode,
  handler: (ev: Event) => void,
): number {
  const nodes = root.querySelectorAll<HTMLElement>('[data-action="mic"]')
  nodes.forEach((el) => el.addEventListener('click', handler))
  return nodes.length
}

/** Sync listening chrome on all Jarvis mic buttons (orb keeps its "A" label). */
export function syncJarvisMicButtons(root: ParentNode, listening: boolean): void {
  root.querySelectorAll<HTMLButtonElement>('[data-action="mic"]').forEach((mic) => {
    mic.classList.toggle('listening', listening)
    if (!mic.hasAttribute('data-home-v2-orb')) {
      mic.textContent = listening ? 'STOP' : 'MIC'
    }
    mic.setAttribute('aria-pressed', listening ? 'true' : 'false')
  })
}

/** Idle look for space-room mics while Jarvis (or another room) is dictating. */
export function syncSpaceMicButtons(
  root: ParentNode,
  opts: { listening: boolean; space: 'family' | 'friends' | null },
): void {
  root.querySelectorAll<HTMLButtonElement>('[data-action="space-mic"]').forEach((btn) => {
    const space = btn.dataset.space === 'family' ? 'family' : 'friends'
    const on = opts.listening && opts.space === space
    btn.classList.toggle('listening', on)
    btn.textContent = on ? 'STOP' : 'MIC'
    btn.setAttribute('aria-pressed', on ? 'true' : 'false')
  })
}

/** Update every voice caption node (avoids silent failure when ids collide). */
export function syncVoiceCaptions(
  root: ParentNode,
  opts: {
    captionId: string
    listening: boolean
    hint: string
    idleHomePrompt?: string
  },
): void {
  const nodes =
    opts.captionId === 'voice-caption'
      ? root.querySelectorAll<HTMLElement>(
          '#voice-caption, [data-voice-caption="1"], [data-home-v2-prompt="1"]',
        )
      : root.querySelectorAll<HTMLElement>(`#${opts.captionId}`)
  const text = opts.listening
    ? opts.hint || '듣고 있습니다… 말씀해 주세요'
    : opts.hint || opts.idleHomePrompt || ''
  nodes.forEach((caption) => {
    const onHomeV2 = caption.hasAttribute('data-home-v2-prompt')
    if (!onHomeV2) caption.hidden = !opts.listening && !opts.hint
    if (opts.listening || opts.hint || onHomeV2) {
      caption.textContent =
        opts.listening
          ? text
          : opts.hint || (onHomeV2 ? opts.idleHomePrompt || '무엇을 도와드릴까요?' : opts.hint)
    }
    caption.classList.toggle('live', opts.listening)
  })
}
