import type { FusedContext } from './contextTypes'

const TTL_MS = 25_000
const DEBOUNCE_MS = 350

let mem: { at: number; ctx: FusedContext } | null = null
let lastBuild = 0

export function getCachedContext(): FusedContext | null {
  if (!mem) return null
  if (Date.now() - mem.at > TTL_MS) return null
  return mem.ctx
}

export function setCachedContext(ctx: FusedContext): void {
  mem = { at: Date.now(), ctx }
  lastBuild = Date.now()
}

export function shouldDebounce(): boolean {
  return Boolean(mem && Date.now() - lastBuild < DEBOUNCE_MS)
}

export function invalidateContextCache(sources?: string[]): void {
  // Partial invalidation: for now clear all (sources reserved for future)
  void sources
  mem = null
  lastBuild = 0
}
