export { classifyMusicIntent, isLikelyMusicRequest, buildMusicSearchQuery } from './musicIntent'
export { tryHandleMusicSkill, playWithUserGesture } from './musicSkill'
export { controlMusic, sessionSnapshot } from './musicController'
export { loadMusicPreferences, updateMusicPreferences, rememberMusicSearch } from './musicPreferences'
export { getMusicSession, loadPersistedMusicSession, patchMusicSession } from './musicSession'
export { assertSafeMusicUrl, searchMusicForIntent } from './musicSearch'
export { getMusicProvider, registerMusicProvider } from './musicProvider'
export { renderMusicMiniPlayer, renderMusicPlayChip } from './components/MusicMiniPlayer'
export { MusicSkillError, musicErrorUserMessage } from './musicErrors'
export type {
  MusicIntent,
  MusicIntentResult,
  MusicSession,
  MusicSkillReply,
  MusicPreferences,
  MusicProviderId,
} from './types'
