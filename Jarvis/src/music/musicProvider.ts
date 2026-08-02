import { createExternalAppProvider } from './providers/externalAppProvider'
import { createYoutubeProvider } from './providers/youtubeProvider'
import type { MusicProvider, MusicProviderId } from './types'
import { loadMusicPreferences } from './musicPreferences'

const registry = new Map<MusicProviderId, MusicProvider>()

function ensureDefaults(): void {
  if (registry.size) return
  registry.set('youtube', createYoutubeProvider('youtube'))
  registry.set('youtube_music', createYoutubeProvider('youtube_music'))
  registry.set('spotify', createExternalAppProvider('spotify'))
  registry.set('apple_music', createExternalAppProvider('apple_music'))
}

/** Register or replace a provider (tests / future API adapters). */
export function registerMusicProvider(provider: MusicProvider): void {
  registry.set(provider.id, provider)
}

export function getMusicProvider(id?: MusicProviderId): MusicProvider {
  ensureDefaults()
  const prefs = loadMusicPreferences()
  const want = id || prefs.preferredMusicProvider || 'youtube'
  return registry.get(want) || registry.get('youtube')!
}

export function listMusicProviders(): MusicProvider[] {
  ensureDefaults()
  return [...registry.values()]
}

export function resolveProviderId(preferred?: MusicProviderId): MusicProviderId {
  const prefs = loadMusicPreferences()
  return preferred || prefs.preferredMusicProvider || 'youtube'
}
