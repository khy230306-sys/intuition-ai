import { MusicSkillError } from './musicErrors'
import { getMusicProvider, resolveProviderId } from './musicProvider'
import { isAllowedMusicUrl } from './providers/externalAppProvider'
import type { MusicIntentResult, MusicProviderId, MusicSearchBundle, MusicSearchResult } from './types'

export function assertSafeMusicUrl(url: string): string {
  const trimmed = url.trim()
  if (!trimmed) throw new MusicSkillError('invalid_url', 'Empty URL')
  if (/^(javascript|data|vbscript|file):/i.test(trimmed)) {
    throw new MusicSkillError('invalid_url', 'Blocked scheme')
  }
  if (!isAllowedMusicUrl(trimmed)) {
    throw new MusicSkillError('invalid_url', 'Domain not allowed')
  }
  return trimmed
}

export function sanitizeMusicTitle(title: string): string {
  return title.replace(/[<>&"'`]/g, '').trim().slice(0, 160)
}

/** Rank results: prefer non-empty titles; keep search links last if mixed (API future). */
export function rankMusicResults(tracks: MusicSearchResult[]): MusicSearchResult[] {
  return [...tracks].sort((a, b) => {
    const aScore = (a.isSearchUrl ? 0 : 2) + (a.title ? 1 : 0)
    const bScore = (b.isSearchUrl ? 0 : 2) + (b.title ? 1 : 0)
    return bScore - aScore
  })
}

export async function searchMusicForIntent(
  intent: MusicIntentResult,
  opts: { providerId?: MusicProviderId; signal?: AbortSignal; locale?: string } = {},
): Promise<MusicSearchBundle> {
  const query = (intent.searchQuery || intent.rawText || '').trim()
  if (!query) throw new MusicSkillError('no_results', 'Empty query')

  const providerId = resolveProviderId(opts.providerId || intent.providerPreference)
  const provider = getMusicProvider(providerId)
  if (!(await provider.isAvailable())) {
    throw new MusicSkillError('provider_unavailable', provider.label)
  }

  const bundle = await provider.search({
    query,
    mood: intent.mood,
    locale: opts.locale,
    limit: 5,
    signal: opts.signal,
    preferMusicHost: providerId === 'youtube_music',
  })

  const safeTracks = rankMusicResults(bundle.tracks)
    .map((t) => {
      try {
        return {
          ...t,
          title: sanitizeMusicTitle(t.title) || query,
          url: assertSafeMusicUrl(t.url),
        }
      } catch {
        return null
      }
    })
    .filter((t): t is MusicSearchResult => Boolean(t))

  if (!safeTracks.length) {
    throw new MusicSkillError('no_results', 'No safe results')
  }

  return { ...bundle, tracks: safeTracks }
}
