import type { MusicIntent, MusicSearchResult, MusicSession, MusicSessionStatus } from './types'

const KEY = 'jarvis.music.session.v1'

const idleSession = (): MusicSession => ({
  status: 'idle',
  provider: 'youtube',
  query: '',
  title: null,
  url: null,
  results: [],
  resultIndex: 0,
  startedAt: null,
  lastAction: null,
  volume: 0.8,
})

let memory: MusicSession = idleSession()

export function getMusicSession(): MusicSession {
  return { ...memory, results: [...memory.results] }
}

export function setMusicSession(next: MusicSession): MusicSession {
  memory = { ...next, results: [...next.results] }
  try {
    const persist = {
      status: memory.status === 'playing' ? 'unknown' : memory.status,
      provider: memory.provider,
      query: memory.query,
      title: memory.title,
      url: memory.url,
      resultIndex: memory.resultIndex,
      lastAction: memory.lastAction,
      volume: memory.volume,
      // do not persist full results (may be large); keep current url/title only
    }
    localStorage.setItem(KEY, JSON.stringify(persist))
  } catch {
    /* ignore */
  }
  return getMusicSession()
}

export function loadPersistedMusicSession(): MusicSession {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return getMusicSession()
    const saved = JSON.parse(raw) as Partial<MusicSession>
    memory = {
      ...idleSession(),
      ...saved,
      results: [],
      status: (saved.status as MusicSessionStatus) || 'idle',
      startedAt: null,
    }
  } catch {
    memory = idleSession()
  }
  return getMusicSession()
}

export function resetMusicSession(): MusicSession {
  return setMusicSession(idleSession())
}

export function patchMusicSession(patch: Partial<MusicSession>): MusicSession {
  return setMusicSession({ ...memory, ...patch })
}

export function applyReadyResults(
  query: string,
  results: MusicSearchResult[],
  action: MusicIntent,
): MusicSession {
  const first = results[0]
  return setMusicSession({
    ...memory,
    status: first ? 'ready' : 'error',
    provider: first?.provider || memory.provider,
    query,
    title: first?.title || null,
    url: first?.url || null,
    results,
    resultIndex: 0,
    startedAt: null,
    lastAction: action,
    errorCode: first ? undefined : 'no_results',
  })
}
