/** AIZIO Music Skill — shared types (independent of chat/AI engine). */

export type MusicIntent =
  | 'play_music'
  | 'search_music'
  | 'pause_music'
  | 'resume_music'
  | 'stop_music'
  | 'next_track'
  | 'previous_track'
  | 'change_mood'
  | 'lower_volume'
  | 'raise_volume'
  | 'show_current_track'
  | 'open_music_app'
  | 'none'

export type MusicMood =
  | 'calm'
  | 'relaxing'
  | 'focus'
  | 'sleep'
  | 'cafe'
  | 'rain'
  | 'healing'
  | 'meditation'
  | 'upbeat'
  | 'romantic'
  | 'sad'
  | 'happy'
  | 'workout'
  | 'driving'
  | 'study'
  | 'kids'
  | 'unknown'

export type MusicProviderId = 'youtube' | 'youtube_music' | 'spotify' | 'apple_music' | 'mock'

export type MusicSessionStatus =
  | 'idle'
  | 'searching'
  | 'ready'
  | 'playing'
  | 'paused'
  | 'stopped'
  | 'opened_external'
  | 'unknown'
  | 'error'

export type MusicIntentResult = {
  intent: MusicIntent
  confidence: number
  mood?: MusicMood
  activity?: string
  genre?: string
  energy?: 'low' | 'medium' | 'high'
  tempo?: 'slow' | 'medium' | 'fast'
  language?: string
  instrumental?: boolean | 'preferred'
  artist?: string
  track?: string
  searchQuery?: string
  providerPreference?: MusicProviderId
  rawText: string
}

export type MusicSearchResult = {
  id: string
  title: string
  subtitle?: string
  url: string
  provider: MusicProviderId
  /** true when this is a search landing URL, not a specific track */
  isSearchUrl?: boolean
}

export type MusicSearchParams = {
  query: string
  mood?: MusicMood
  locale?: string
  limit?: number
  signal?: AbortSignal
  preferMusicHost?: boolean
}

export type MusicSearchBundle = {
  query: string
  tracks: MusicSearchResult[]
  provider: MusicProviderId
  /** true only when a real search API returned track metadata */
  viaApi: boolean
}

export type MusicProvider = {
  id: MusicProviderId
  label: string
  isAvailable(): Promise<boolean>
  search(params: MusicSearchParams): Promise<MusicSearchBundle>
  play(opts: { result: MusicSearchResult; userGesture: boolean }): Promise<{ openedExternal: boolean }>
  control(action: MusicControlAction): Promise<{ ok: boolean; reason?: string }>
}

export type MusicSession = {
  status: MusicSessionStatus
  provider: MusicProviderId
  query: string
  title: string | null
  url: string | null
  results: MusicSearchResult[]
  resultIndex: number
  startedAt: number | null
  lastAction: MusicIntent | null
  errorCode?: string
  volume: number
}

export type MusicPreferences = {
  preferredMusicProvider: MusicProviderId
  preferredMusicLanguage: string
  preferInstrumental: boolean
  preferredMoods: MusicMood[]
  explicitContentAllowed: boolean
  openInExternalApp: boolean
  rememberRecentMusicSearches: boolean
  recentSearches: string[]
}

export type MusicControlAction = 'play' | 'pause' | 'resume' | 'stop' | 'next' | 'previous' | 'open'

export type MusicSkillReply = {
  text: string
  speak?: boolean
  /** UI should show a gesture-required play button */
  needsGesture?: boolean
  /** Open provider in external app/tab after user taps */
  playUrl?: string | null
  /** When false, chat should hide the mini player (stop / done). Default: keep current. */
  showMiniPlayer?: boolean
  session: MusicSession
}
