import { registerSW } from 'virtual:pwa-register'
import './style.css'
import {
  UPDATE_RETRY_KEY,
  buildUpdateUrl,
  clearPendingUpdate,
  compareAppVersions,
  fetchRemoteAppVersion,
  fetchRemoteAppVersionFromHtml,
  fetchRemoteBuildMeta,
  readPendingUpdate,
  resolveUpdateBaseUrl,
  updateCrossesOrigin,
  writePendingUpdate,
} from './appUpdate'
import {
  buildAppHash,
  hashScreenToView,
  migratePathnameToHashUrl,
  openInternalNavigation,
  parseLocationHash,
  sanitizeNavQuery,
  viewToHashScreen,
  writeAppHash,
} from './appRouting'
import {
  clearProviderKey,
  dismissAiWizard,
  getProviderSlot,
  hasAnyConfiguredProvider,
  loadHybridAiConfig,
  maskApiKey,
  mergeKeyInput,
  saveHybridAiConfig,
  shouldShowAiWizard,
  testProviderConnection,
  updateProviderSlot,
  type HybridProviderId,
} from './ai-providers'
import {
  providerStatusLabelKo,
  renderAiWizardHtml,
  renderHybridAiSettingsHtml,
} from './ai-providers/settingsUi'
import {
  copyTextNow,
  navigateHref,
  openUrl,
  quickActions,
  selectVisibleInviteText,
  shareText,
} from './actions'
import {
  buildSpaceInviteUrl,
  detectInviteKind,
  parseInviteCode,
  parseInviteFromLocation,
  stripInviteParamsFromUrl,
  type SpaceKind,
} from './inviteJoin'
import { canUseCameraScan, decodeQrFromFile, decodeQrFromVideo } from './qrDecode'
import { think } from './brain'
import { renderLifeOs2CardsHtml } from './life-os-2/ui/cardRender'
import {
  isAllowedLos2CardAction,
  isSafeExternalUrl,
  LOS2_ALLOWED_VIEWS,
} from './life-os-2/ui/uiActions'
import { buildHomeLos2Signals, renderHomeLos2StripHtml } from './life-os-2/ui/homeStrip'
import {
  attemptPwaInstall,
  bindPwaInstallEvents,
  copyAppUrl,
  copyRecommendedInstallUrl,
  getRecommendedInstallUrl,
  hasNativeInstallPrompt,
  detectInstallPlatform,
  installGuideSteps,
  installMethodSummary,
  isFixedPreviewInstallHost,
  isPreviewInstallHost,
  markPwaInstalled,
  onPwaInstallChange,
  FIXED_PREVIEW_INSTALL_URL,
  shouldShowInstallButton,
  type InstallPlatform,
} from './pwaInstall'
import { fetchQuote, formatMoney, formatQuote } from './finance'
import { formatDescriptive, parseNumbers } from './stats'
import { extractTickerFromText, resolveTicker } from './tickers'
import {
  addExpense,
  addHabit,
  addJournal,
  addReminder,
  addShoppingItems,
  addTradeNote,
  addWatch,
  appendSeriesValues,
  checkHabit,
  clearChat,
  deleteExpense,
  deleteHabit,
  deleteMemory,
  deleteReminder,
  deleteSeries,
  deleteShopping,
  deleteTrade,
  expenseTotals,
  getActiveSeriesName,
  importBackup,
  loadChat,
  loadExpenses,
  loadHabits,
  loadHoldings,
  loadJournal,
  loadMemory,
  loadReminders,
  loadSeriesList,
  loadSettings,
  loadShopping,
  loadTrades,
  loadWatchlist,
  removeHolding,
  removeWatch,
  replaceSeriesValues,
  saveChat,
  saveSettings,
  setActiveSeriesName,
  toggleReminder,
  toggleShopping,
  upsertHolding,
  upsertMemory,
} from './storage'
import type { ChatMessage, JarvisSettings, QuoteSnapshot, View } from './types'
import { VoiceListener, canListen, ensureMicPermission, probeVoiceSupport, speakAsync, stopSpeaking } from './voice'
import {
  attachMicClickHandlers,
  syncJarvisMicButtons,
  syncSpaceMicButtons,
  syncVoiceCaptions,
} from './voiceUi'
import { currentListenLang, loadInterpretMode, clearInterpretMode } from './translateBrain'
import { nextChatSendGuard, shouldAcceptChatSend, type ChatSendGuardState } from './chatSendGuard'
import { bcp47, detectLangCode, translateText } from './translate'
import {
  canUseGeolocation,
  queryPermissionState,
  requestLocation,
  wasLocationGranted,
  type GeoFix,
} from './location'

import {
  ARCADE_META,
  loadArcadeBest,
  loadArcadeBestLevel,
  mountArcade,
  type ArcadeHandle,
  type ArcadeId,
} from './arcadeGames'
import {
  buildMyScoreCard,
  getArcadePlayerName,
  importScoreCard,
  rankingForGame,
  setArcadePlayerName,
  syncSelfBestsToBoard,
} from './arcadeRank'
import {
  ensureNotificationPermission,
  setAlarmUiHandler,
  startAlarmScheduler,
} from './notify'
import { buildHomeSummary } from './homeSummary'
import {
  appShareMessage,
  appShareUrl,
  buildBackupQrPayload,
  downloadBackupBlob,
  qrSvg,
  registerShareModal,
  shareAppLink,
  shareBackupFile,
} from './shareKit'
import { fetchWeather, type WeatherSnap } from './weather'
import {
  addFamilyEvent,
  addFamilyNotice,
  applyFamilyJoinReceipt,
  clearFamilyChat,
  createFamilyRoom,
  deleteFamilyEvent,
  deleteFamilyNotice,
  familyInviteText,
  joinFamilyRoomLocal,
  leaveFamilyRoom,
  loadFamilyRoom,
  postFamilyChat,
  saveFamilyRoom,
  upsertMember as upsertFamilyMember,
} from './familyStore'
import {
  broadcastFamilyPacket,
  canBroadcastFamilyNow,
  disconnectFamilySync,
  ensureFamilySync,
  getFamilyPeerCount,
  reconnectFamilySync,
  setFamilySyncListener,
} from './familySyncLazy'
import {
  addFriendsEvent,
  addFriendsNotice,
  applyFriendsJoinReceipt,
  clearFriendsChat,
  createFriendsRoom,
  deleteFriendsEvent,
  deleteFriendsNotice,
  friendsInviteText,
  joinFriendsRoomLocal,
  leaveFriendsRoom,
  loadFriendsRoom,
  postFriendsChat,
  saveFriendsRoom,
  upsertMember as upsertFriendsMember,
} from './friendsStore'
import {
  broadcastFriendsPacket,
  canBroadcastFriendsNow,
  disconnectFriendsSync,
  ensureFriendsSync,
  getFriendsPeerCount,
  reconnectFriendsSync,
  setFriendsSyncListener,
} from './friendsSyncLazy'
import { buildJoinReceipt } from './joinReceipt'
import { uniqueMemberNames } from './spaceMembers'
import { fileToChatMedia, mediaCaption, type ChatMedia } from './chatMedia'
import { fileToProfileAvatar, isAvatarDataUrl } from './profileAvatar'
import {
  getHomeSpaceInbox,
  invalidateSpaceInboxCache,
  markSpaceInboxSeen,
  type SpaceInboxSummary,
} from './spaceInbox'
import {
  getAppLocale,
  initAppLocale,
  localeNativeName,
  setAppLocale,
  supportedAppLocales,
  t,
  type AppLocale,
} from './i18n'
import {
  detectMessageLanguage,
  getCachedTranslation,
  translateChatMessage,
  translationSourceLabel,
} from './globalChat'
import {
  controlMusic,
  loadMusicPreferences,
  loadPersistedMusicSession,
  playWithUserGesture,
  renderMusicMiniPlayer,
  renderMusicPlayChip,
  resetMusicSession,
  sessionSnapshot,
  updateMusicPreferences,
  type MusicSession,
} from './music'
import {
  HOME_V2_MUSIC_COMMAND,
  HOME_V2_QUICK_COMMANDS,
  buildHomeV2Model,
  clearHomeV2Prefs,
  getCachedBuildChannel,
  isDesignLabVisible,
  loadBuildMetaLite,
  readBootDefaultHome,
  readStoredHomeVariant,
  renderDesignLabSection,
  renderHomeV2MoreSheet,
  renderHomeV2NavWithPane,
  renderTopNavActions,
  renderHomeV2Shell,
  renderNavigationSheet,
  renderTranslateSheet,
  defaultTranslateSheetState,
  langNameForCode,
  resolveTranslateSheetFrom,
  sttLangForTranslateSheet,
  saveStoredSpeakLang,
  defaultSpeakLang,
  loadStoredSpeakLang,
  resolveHomeVariant,
  writeBootDefaultHome,
  writeStoredHomeVariant,
  type HomeVariant,
  type HomeV2Pane,
  type HomeV2QuickId,
  type TranslateSheetState,
} from './homeV2'
import {
  loadNavigationSettings,
  queryGeoPermission,
  resetNavigationLocalState,
  setSavedPlace,
  clearSavedPlace,
  removeFavorite,
  updateNavigationSettings,
  buildMapTestSearchUrl,
  isSafeMapUrl,
  type MapProviderId,
  type TravelMode,
} from './navigation'
import {
  bindNavigationScreen,
  clearAllNavV2LocalData,
  clearRecentSearches,
  destroyNavigationScreen,
  getNavV2Context,
  loadNavV2Settings,
  patchNavV2Context,
  renderNavigationScreen,
  saveNavV2Settings,
  type NavScreenState,
} from './navigationV2'
import {
  customersWithBirthdayToday,
  deleteCustomer,
  findCustomers,
  formatBirthdayDisplay,
  loadCustomers,
  upsertCustomer,
} from './customers'
import { recordDiagError } from './diagnostics/deviceDiagnostics'

const APP_VERSION = '1.20.15'
const SEEN_APP_VERSION_KEY = 'jarvis.app.seenVersion'
const SEEN_BUILD_ID_KEY = 'jarvis.app.seenBuildId'
const PENDING_INVITE_KEY = 'jarvis.pendingInvite.v1'
/** Bumps when MIC is stopped/retargeted so late mic-permission callbacks abort. */
let voiceSessionGen = 0
/** Bumps when a newer chat request supersedes an in-flight think(). */
let thinkGen = 0

/**
 * Persist one Hybrid Provider card from the live DOM (key/model/base).
 * Used by 「키 저장」·「연결 테스트」·blur so users need not scroll to 「설정 저장」.
 */
function flushHybridProviderFromDom(id: HybridProviderId): { hasKey: boolean; apiKey: string } {
  const form = document.getElementById('settings-form') as HTMLFormElement | null
  const card = document.querySelector(`[data-provider="${id}"]`) as HTMLElement | null
  const read = (name: string): string => {
    const fromForm = form?.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement | null
    if (fromForm && 'value' in fromForm) return String(fromForm.value || '')
    const fromCard = card?.querySelector(`[name="${name}"]`) as HTMLInputElement | HTMLSelectElement | null
    return String(fromCard?.value || '')
  }
  const existing = getProviderSlot(id)
  const apiKey = mergeKeyInput(read(`hybridKey_${id}`), existing.apiKey)
  const modelCustom = read(`hybridModelCustom_${id}`).trim()
  const modelSel = read(`hybridModel_${id}`).trim()
  const base = read(`hybridBase_${id}`).trim()
  updateProviderSlot(id, {
    apiKey,
    model: modelCustom || modelSel || existing.model || '',
    ...(base || id === 'openai' || id === 'custom' ? { apiBase: base || existing.apiBase } : {}),
    enabled: true,
  })
  if (id === 'openai') {
    state.settings = { ...state.settings, apiKey, apiBase: base || state.settings.apiBase, model: modelCustom || modelSel || state.settings.model }
    saveSettings(state.settings)
  }
  const slot = getProviderSlot(id)
  const hasKey = Boolean(slot.apiKey.trim())
  const statusEl = document.querySelector(`[data-hybrid-status="${id}"]`)
  if (statusEl) {
    const ko = providerStatusLabelKo(slot.status, hasKey)
    statusEl.innerHTML = `상태: <strong>${escapeHtml(ko)}</strong>${
      hasKey ? ` · 키 ${escapeHtml(maskApiKey(slot.apiKey))}` : ' · 키 없음'
    }`
  }
  const keyInput = document.querySelector(`[data-hybrid-key="${id}"]`) as HTMLInputElement | null
  if (keyInput && hasKey) {
    keyInput.value = ''
    keyInput.placeholder = `${maskApiKey(slot.apiKey)} · 저장됨`
  }
  return { hasKey, apiKey: slot.apiKey }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | void> {
  return new Promise((resolve) => {
    let done = false
    const timer = window.setTimeout(() => {
      if (!done) {
        done = true
        resolve(undefined)
      }
    }, ms)
    promise.then(
      (v) => {
        if (!done) {
          done = true
          window.clearTimeout(timer)
          resolve(v)
        }
      },
      () => {
        if (!done) {
          done = true
          window.clearTimeout(timer)
          resolve(undefined)
        }
      },
    )
  })
}

async function clearAppCaches(): Promise<void> {
  if ('serviceWorker' in navigator) {
    try {
      const regs = await navigator.serviceWorker.getRegistrations()
      await Promise.all(
        regs.map(async (r) => {
          try {
            await r.unregister()
          } catch {
            /* ignore */
          }
        }),
      )
    } catch {
      /* ignore */
    }
  }
  if ('caches' in window) {
    try {
      const keys = await caches.keys()
      await Promise.all(keys.map((k) => caches.delete(k)))
    } catch {
      /* ignore */
    }
  }
}

/** Wait until SW controller is gone so the next navigation/fetch is not lied to by precache. */
async function waitForServiceWorkerGone(maxMs = 2500): Promise<void> {
  if (!('serviceWorker' in navigator)) return
  const start = Date.now()
  while (Date.now() - start < maxMs) {
    try {
      const regs = await navigator.serviceWorker.getRegistrations()
      if (!regs.length && !navigator.serviceWorker.controller) return
    } catch {
      return
    }
    await new Promise((r) => setTimeout(r, 120))
  }
}

/** Minimal paint so version-upgrade refresh never leaves a blank white #app. */
function paintBootSplash(message: string): void {
  const app = document.getElementById('app')
  if (!app) return
  // Inline styles: must remain visible even if CSS chunk failed to load.
  app.innerHTML = `
    <section class="location-gate boot-inline" data-boot-splash="1" style="min-height:70dvh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:28px 20px;color:#e8eef7;background:#070b12">
      <div class="loc-card" style="max-width:22rem">
        <div class="big-orb" aria-hidden="true"></div>
        <h1 style="margin:0 0 10px;letter-spacing:0.14em">AIZIO</h1>
        <p class="loc-lead" style="margin:0;opacity:0.9">${escapeHtml(message)}</p>
        <p class="loc-body muted" style="margin:10px 0 0;opacity:0.65">잠시만 기다려 주세요…</p>
      </div>
    </section>`
}

function markAppBooted(): void {
  try {
    ;(window as unknown as { __aizioMarkBooted?: () => void }).__aizioMarkBooted?.()
  } catch {
    /* ignore */
  }
  const app = document.getElementById('app')
  if (app) app.setAttribute('data-boot-ready', '1')
}

async function hardRefreshApp(opts?: { targetVersion?: string; targetBuildId?: string | null }): Promise<void> {
  // Stuck flag from a previous interrupted refresh — clear and force navigate
  const stuck = sessionStorage.getItem('jarvis.refreshing') === '1'
  sessionStorage.setItem('jarvis.refreshing', '1')
  paintBootSplash(stuck ? '앱을 다시 불러오는 중…' : '최신 버전으로 업데이트하는 중…')
  try {
    await withTimeout(clearAppCaches(), 5000)
    await waitForServiceWorkerGone(2500)
  } catch {
    /* still reload */
  }
  const targetVer = opts?.targetVersion || APP_VERSION
  // Always land on the fixed production host (snapshot URLs stay stale after domain repoint)
  window.location.replace(
    buildUpdateUrl({
      version: targetVer,
      buildId: opts?.targetBuildId,
      step: stuck ? 3 : 1,
    }),
  )
}

/**
 * Home-screen / Safari update: wipe SW first (so version check is not precache-lied),
 * read live build-meta, then hard-navigate to the fixed host for this channel
 * (production → jarvis-app; fixed Preview → same origin; legacy snapshot → lightlab-92m8bq7).
 */
async function updateAppToLatest(): Promise<void> {
  const base = resolveUpdateBaseUrl()
  const crosses = updateCrossesOrigin()
  showFlash(crosses ? '고정 Preview로 이동해 최신판을 받습니다…' : '최신판을 확인하는 중…')
  sessionStorage.removeItem('jarvis.refreshing')
  sessionStorage.removeItem('jarvis.buildReloaded')
  paintBootSplash(crosses ? '고정 Preview 주소로 옮기는 중…' : '캐시를 비우고 최신판을 확인하는 중…')

  // 1) Kill SW/precache BEFORE asking the server — old SW served stale index/build-meta.
  try {
    await withTimeout(clearAppCaches(), 5000)
    await waitForServiceWorkerGone(2500)
  } catch {
    /* continue */
  }

  let remote = null as Awaited<ReturnType<typeof fetchRemoteBuildMeta>>
  try {
    remote = await fetchRemoteBuildMeta(8000, base)
  } catch {
    remote = null
  }
  const remoteVer =
    remote?.version ||
    (await fetchRemoteAppVersionFromHtml(6000, base).catch(() => null)) ||
    (await fetchRemoteAppVersion().catch(() => null))
  state.remoteVersion = remoteVer
  const targetVer = remoteVer || APP_VERSION
  const targetBid = remote?.buildId || null

  if (remoteVer && remoteVer === APP_VERSION && (!targetBid || targetBid === localStorage.getItem(SEEN_BUILD_ID_KEY))) {
    showFlash(`이미 최신입니다 (v${APP_VERSION}). 그래도 깨끗이 다시 불러옵니다…`)
  } else if (remoteVer) {
    showFlash(`서버 최신 v${remoteVer}으로 업데이트합니다…`)
  } else {
    showFlash('서버 확인 실패 · 캐시를 비우고 다시 불러옵니다…')
  }

  // Pending target — do NOT mark SEEN as remote until this bundle actually matches
  writePendingUpdate(targetVer, targetBid)
  sessionStorage.setItem('jarvis.refreshing', '1')
  paintBootSplash(crosses ? `고정 Preview로 최신판 불러오는 중…` : '최신판을 불러오는 중…')
  window.location.replace(buildUpdateUrl({ version: targetVer, buildId: targetBid, step: 1, baseUrl: base }))
}

/** Settings-only update controls (not shown on chat / games / other tabs). */
function renderUpdateCard(): string {
  const remote = state.remoteVersion
  const newer = remote && remote !== APP_VERSION
  const updateHost = resolveUpdateBaseUrl().replace(/^https?:\/\//, '')
  const status = !state.online
    ? '오프라인 · 연결 후 업데이트하세요'
    : newer
      ? `새 버전 있음 · 서버 v${escapeHtml(remote)}`
      : remote
        ? `최신 확인됨 · v${escapeHtml(remote)}`
        : `현재 v${APP_VERSION}`
  return `
    <div class="update-card ${newer ? 'has-update' : ''}">
      <div class="update-card-head">
        <strong>앱 업데이트</strong>
        <span class="ver">이 기기 v${APP_VERSION}</span>
      </div>
      <p class="hint">${status}. 홈 화면 앱도 이 버튼으로 캐시를 지우고 <strong>${escapeHtml(updateHost)}</strong> 에서 다시 받습니다. 그래도 버전이 안 바뀌면 아래 «앱 캐시 새로고침»을 한 번 더 누르세요.</p>
      <button type="button" class="primary-btn update-btn" data-action="app-update">최신 빌드로 업데이트</button>
      <button type="button" class="ghost-btn tiny" data-action="check-update">최신 버전만 확인</button>
    </div>`
}

async function refreshRemoteVersionBadge(opts?: { announce?: boolean }): Promise<void> {
  if (!state.online) return
  const remote = await fetchRemoteAppVersion()
  state.remoteVersion = remote
  if (opts?.announce) {
    if (!remote) showFlash('서버 버전을 확인하지 못했습니다. 연결을 확인해 주세요.')
    else if (remote === APP_VERSION) showFlash(`이미 최신입니다 (v${APP_VERSION})`)
    else showFlash(`새 버전 v${remote}이 있습니다. 업데이트를 눌러 주세요.`)
  }
  document.querySelectorAll('[data-remote-version]').forEach((el) => {
    el.textContent = remote ? `서버 v${remote}` : '서버 확인 실패'
  })
  // Update card lives only on settings
  if (state.view === 'settings' && document.querySelector('.update-card')) {
    render()
  }
}

const SUGGESTIONS = [
  '사용설명서',
  'API 키',
  '오늘 날씨 알려줘',
  '조용한 음악 틀어줘',
  '브리핑',
  '지금 몇 시야',
]

/** Clear main chat history (settings button, chat toolbar, or voice). */
function resetChatHistory(opts?: { confirm?: boolean }): boolean {
  const needConfirm = opts?.confirm !== false
  if (needConfirm && state.messages.length > 0) {
    const ok = window.confirm('지난 대화를 모두 삭제하고 초기화할까요?')
    if (!ok) return false
  }
  clearChat()
  state.messages = []
  state.draft = ''
  state.voiceHint = ''
  state.busy = false
  dismissMusicMiniPlayer()
  showFlash('대화 초기화 완료')
  render()
  scrollChat()
  return true
}

const TRANSLATE_LANGS: Array<{ code: string; label: string; cmd: string }> = [
  { code: 'vi', label: '베트남어', cmd: '지금부터 스톱할 때까지 베트남어로 번역해줘' },
  { code: 'en', label: '영어', cmd: '지금부터 스톱할 때까지 영어로 번역해줘' },
  { code: 'ja', label: '일본어', cmd: '지금부터 스톱할 때까지 일본어로 번역해줘' },
  { code: 'zh-CN', label: '중국어', cmd: '지금부터 스톱할 때까지 중국어로 번역해줘' },
  { code: 'es', label: '스페인어', cmd: '지금부터 스톱할 때까지 스페인어로 번역해줘' },
]

const state = {
  view: 'chat' as View,
  messages: [] as ChatMessage[],
  draft: '',
  busy: false,
  listening: false,
  /** Where MIC dictation should land: main chat, space rooms, or translate sheet. */
  dictationTarget: 'jarvis' as 'jarvis' | 'family' | 'friends' | 'translate-sheet',
  voiceHint: '',
  online: typeof navigator === 'undefined' ? true : navigator.onLine,
  /** Latest version string from jarvis-app.shipstatic.com, if checked. */
  remoteVersion: null as string | null,
  showInstall: false,
  /** Step-by-step home-screen install sheet (iOS / Android manual). */
  installGuideOpen: false as false | InstallPlatform,
  settings: loadSettings(),
  quoteCache: {} as Record<string, QuoteSnapshot | null>,
  listenLang: 'ko-KR',
  /** App stays locked until device location is allowed (or offline continue) */
  locationReady: false,
  locationSkipped: false,
  locationError: '',
  locationBusy: false,
  lastFix: null as GeoFix | null,
  arcadeId: 'shooter' as ArcadeId,
  arcadeScore: 0,
  arcadeLevel: 1,
  weather: null as WeatherSnap | null,
  shareModal: null as null | 'app' | 'backup' | 'arcade' | 'invite',
  /** AIZIO Music Skill mini player visibility */
  musicPlayerOpen: false,
  musicSession: null as MusicSession | null,
  shareQrSvg: '',
  shareHint: '',
  shareArcadePayload: '',
  shareInviteKind: null as null | 'family' | 'friends',
  shareInviteCode: '',
  shareInviteText: '',
  shareStatus: '',
  shareStatusOk: null as boolean | null,
  arcadeImportOpen: false,
  familyTab: 'chat' as 'chat' | 'notices' | 'events',
  familySyncStatus: '대기',
  friendsTab: 'chat' as 'chat' | 'notices' | 'events',
  friendsSyncStatus: '대기',
  /** Persist home "대화방" panel open/closed across remounts (null = auto). */
  homeRoomsOpen: null as boolean | null,
  /** HOME v2 preview pane (home dashboard vs conversation thread). */
  homeV2Pane: 'home' as HomeV2Pane,
  /** App menu sheet (HOME v2 + legacy) */
  homeV2MoreOpen: false,
  /** AI 길안내 bottom sheet (legacy helper; v2 uses full Navigation view) */
  homeV2NavSheetOpen: false,
  /** Dedicated translate window (HOME 번역하기) */
  homeV2TranslateSheetOpen: false,
  translateSheet: defaultTranslateSheetState() as TranslateSheetState,
  /** Navigation v2 UI state */
  navV2: {
    phase: 'idle',
    query: '',
    candidates: [],
    selected: null,
    catalogOnly: true,
    status: '목적지를 검색해 주세요.',
    showAll: false,
  } as NavScreenState,
  /** 손님관리 search filter */
  customerQuery: '',
  /** Deep-link / QR invite waiting for location gate */
  pendingInvite: null as null | { kind: SpaceKind; code: string },
  prefillJoinCode: '',
}

function activeHomeVariant(): HomeVariant {
  let queryHome: string | null = null
  try {
    queryHome = new URL(window.location.href).searchParams.get('home')
  } catch {
    queryHome = null
  }
  const host = typeof location !== 'undefined' ? location.hostname : ''
  return resolveHomeVariant({
    queryHome,
    channel: getCachedBuildChannel(),
    hostname: host,
    stored: readStoredHomeVariant(),
    bootDefault: readBootDefaultHome(),
  })
}

function designLabVisibleNow(): boolean {
  const host = typeof location !== 'undefined' ? location.hostname : ''
  return isDesignLabVisible(getCachedBuildChannel(), host)
}

async function refreshNavPermStatus(): Promise<void> {
  const el = document.querySelector('[data-nav-perm-status]')
  if (!el) return
  try {
    const p = await queryGeoPermission()
    const label =
      p === 'granted'
        ? '허용됨'
        : p === 'denied'
          ? '거부됨'
          : p === 'prompt'
            ? '미요청'
            : p === 'unsupported'
              ? '미지원'
              : '확인 불가'
    el.textContent = `위치 권한: ${label}`
  } catch {
    el.textContent = '위치 권한: 확인 불가'
  }
}

/** Suppress hashchange → render loops while we write the hash ourselves. */
let suppressHashSync = false
let navRouteError: string | null = null

function syncHashFromApp(opts?: { query?: string; replace?: boolean; view?: View }): void {
  const view = opts?.view || state.view
  const homeV2 = activeHomeVariant() === 'v2'
  const screen = viewToHashScreen(view, {
    homeV2,
    homeV2Pane: state.homeV2Pane,
  })
  const query =
    screen === 'navigation'
      ? sanitizeNavQuery(opts?.query ?? state.navV2.query)
      : ''
  const hash = buildAppHash(screen, { query })
  suppressHashSync = true
  writeAppHash(hash, opts?.replace ? 'replace' : 'push')
}

/**
 * Open AIZIO internal Navigation without pathname navigation.
 * All 길안내 entry points should call this — never location.href='/navigation'.
 */
function openNavInternal(options?: {
  query?: string
  travelMode?: string
  source?: string
  preserveConversationContext?: boolean
  pushHistory?: boolean
  runSearchText?: boolean
}): void {
  const intent = openInternalNavigation({
    query: options?.query,
    travelMode: options?.travelMode,
    source: options?.source,
    preserveConversationContext: options?.preserveConversationContext,
    pushHistory: options?.pushHistory,
  })
  navRouteError = null
  state.homeV2MoreOpen = false
  state.homeV2NavSheetOpen = false
  state.homeV2TranslateSheetOpen = false
  state.view = 'navigation'
  state.homeV2Pane = 'home'
  const ctx = getNavV2Context()
  const q = intent.query || ctx.lastQuery || state.navV2.query
  state.navV2 = {
    ...state.navV2,
    query: q,
    candidates:
      options?.preserveConversationContext === false
        ? state.navV2.candidates
        : ctx.candidates.length
          ? ctx.candidates
          : state.navV2.candidates,
    selected: ctx.selected,
    status: q
      ? state.navV2.status || '목적지를 검색해 주세요.'
      : ctx.candidates.length
        ? `${ctx.candidates.length}곳 후보`
        : '목적지를 검색해 주세요.',
    phase: ctx.candidates.length ? 'candidates' : q ? 'idle' : 'idle',
  }
  syncHashFromApp({
    query: q,
    replace: options?.pushHistory === false,
    view: 'navigation',
  })
  render()
  if (options?.runSearchText && q) void handleUserText(q)
}

async function runNavigationFromUi(dest: string, _nearby = false): Promise<void> {
  const q = sanitizeNavQuery(dest)
  openNavInternal({
    query: q,
    source: 'nav_ui',
    pushHistory: true,
    runSearchText: false,
  })
  state.navV2 = {
    ...state.navV2,
    query: q,
    phase: 'searching',
    status: '관련 장소를 찾고 있어요.',
  }
  render()
  void handleUserText(q)
}

function openTranslateSheet(opts?: { seedText?: string }): void {
  state.homeV2MoreOpen = false
  state.homeV2NavSheetOpen = false
  state.installGuideOpen = false
  state.homeV2TranslateSheetOpen = true
  const storedSpeak = loadStoredSpeakLang()
  if (opts?.seedText?.trim()) {
    const to = state.translateSheet.to || 'en'
    state.translateSheet = {
      ...state.translateSheet,
      sourceText: opts.seedText.trim().slice(0, 2000),
      from: state.translateSheet.from || 'auto',
      speakLang: state.translateSheet.speakLang || defaultSpeakLang(to, storedSpeak),
      result: '',
      status: '번역할 문장을 확인한 뒤 번역하기를 누르세요.',
      busy: false,
      lastInputSource: 'type',
    }
  } else if (!state.translateSheet.sourceText) {
    const to = state.translateSheet.to || 'en'
    state.translateSheet = {
      ...defaultTranslateSheetState(),
      from: 'auto',
      to,
      speakLang: defaultSpeakLang(to, storedSpeak),
    }
  } else if (!state.translateSheet.speakLang) {
    state.translateSheet = {
      ...state.translateSheet,
      speakLang: defaultSpeakLang(state.translateSheet.to || 'en', storedSpeak),
    }
  }
  render()
}

function closeTranslateSheet(): void {
  if (state.listening && state.dictationTarget === 'translate-sheet') {
    voiceSessionGen += 1
    voice.stop()
    state.listening = false
    state.voiceHint = ''
  }
  state.homeV2TranslateSheetOpen = false
  state.translateSheet = { ...state.translateSheet, busy: false }
  render()
}

async function runTranslateSheet(opts?: { inputSource?: 'mic' | 'type' }): Promise<void> {
  const text = state.translateSheet.sourceText.trim()
  if (!text) {
    state.translateSheet = { ...state.translateSheet, status: '번역할 문장을 입력해 주세요.', result: '' }
    render()
    return
  }
  const fromPicker = state.translateSheet.from || 'auto'
  const inputSource = opts?.inputSource || state.translateSheet.lastInputSource || 'type'
  const speakLang = state.translateSheet.speakLang || defaultSpeakLang(state.translateSheet.to || 'en')
  let from = resolveTranslateSheetFrom(text, fromPicker, {
    speakLang,
    inputSource,
  })
  let to = state.translateSheet.to || 'en'
  if (fromPicker !== 'auto' && from === to) {
    state.translateSheet = {
      ...state.translateSheet,
      status: '원문 언어와 번역 언어가 같습니다. 다른 언어를 골라 주세요.',
    }
    render()
    return
  }
  state.translateSheet = { ...state.translateSheet, busy: true, status: '번역 중…' }
  render()
  try {
    if (from === to) {
      to = to === 'ko' ? 'en' : 'ko'
    }
    const result = await translateText(text, from, to)
    const detectedNote =
      inputSource === 'mic'
        ? `${langNameForCode(from)}(음성)`
        : fromPicker === 'auto'
          ? `자동 감지(${langNameForCode(from)})`
          : langNameForCode(from)
    state.translateSheet = {
      ...state.translateSheet,
      busy: false,
      from: fromPicker === 'auto' ? 'auto' : from,
      to,
      speakLang,
      result: result.ok ? result.text : '',
      status: result.ok
        ? result.offline
          ? `${detectedNote} → ${langNameForCode(to)} · 오프라인`
          : `${detectedNote} → ${langNameForCode(to)} · 번역 완료`
        : result.error || '번역에 실패했습니다.',
      lastFrom: detectedNote,
      lastTo: langNameForCode(to),
      offline: result.offline,
      lastInputSource: inputSource,
    }
    if (inputSource === 'mic' && speakLang) saveStoredSpeakLang(speakLang)
  } catch (err) {
    const msg = err instanceof Error ? err.message : '번역 오류'
    state.translateSheet = {
      ...state.translateSheet,
      busy: false,
      result: '',
      status: msg.slice(0, 120),
    }
  }
  render()
}

/** MIC inside 번역하기 sheet — STT in speakLang → translate to target. */
function startTranslateSheetDictation(): void {
  if (!state.homeV2TranslateSheetOpen) {
    openTranslateSheet()
  }
  if (state.translateSheet.busy) {
    showFlash('번역 중입니다. 잠시 후 MIC를 눌러 주세요.')
    return
  }
  if (typeof window !== 'undefined' && !window.isSecureContext) {
    showFlash('음성 인식은 HTTPS(홈 화면 앱)에서만 됩니다.')
    return
  }
  if (!canListen()) {
    showFlash('이 브라우저는 음성 인식을 지원하지 않습니다. iPhone Safari를 사용해 주세요.')
    return
  }
  if (state.listening && state.dictationTarget === 'translate-sheet') {
    voiceSessionGen += 1
    const partial = voice.consumeTranscript()
    state.listening = false
    state.voiceHint = ''
    if (partial.trim()) {
      state.translateSheet = {
        ...state.translateSheet,
        sourceText: partial.trim().slice(0, 2000),
        result: '',
        status: '인식 완료 · 번역 중…',
        lastInputSource: 'mic',
      }
      render()
      void runTranslateSheet({ inputSource: 'mic' })
    } else {
      render()
    }
    return
  }
  if (state.listening) {
    voiceSessionGen += 1
    voice.stop()
    state.listening = false
  }
  stopSpeaking()
  const fromEl = document.getElementById('tr-sheet-from') as HTMLSelectElement | null
  const toEl = document.getElementById('tr-sheet-to') as HTMLSelectElement | null
  if (fromEl?.value) state.translateSheet = { ...state.translateSheet, from: fromEl.value }
  if (toEl?.value) state.translateSheet = { ...state.translateSheet, to: toEl.value }
  if (!state.translateSheet.from) {
    state.translateSheet = { ...state.translateSheet, from: 'auto' }
  }
  if (!state.translateSheet.speakLang) {
    state.translateSheet = {
      ...state.translateSheet,
      speakLang: defaultSpeakLang(state.translateSheet.to || 'en', loadStoredSpeakLang()),
    }
  }

  const session = ++voiceSessionGen
  state.dictationTarget = 'translate-sheet'
  const speakLang = state.translateSheet.speakLang
  const listenLang = sttLangForTranslateSheet(speakLang, state.translateSheet.from, state.translateSheet.to)
  state.listenLang = listenLang
  state.voiceHint = `${langNameForCode(speakLang)}로 듣는 중 (${listenLang}) → ${langNameForCode(state.translateSheet.to)}`
  state.listening = true
  state.draft = ''
  render()
  void (async () => {
    const micOk = await ensureMicPermission()
    if (session !== voiceSessionGen || state.dictationTarget !== 'translate-sheet' || !state.listening)
      return
    if (!micOk) {
      state.listening = false
      state.voiceHint = ''
      showFlash('마이크 권한이 필요합니다. 설정 → AIZIO/Safari → 마이크 허용')
      render()
      return
    }
    const ok = voice.start(
      {
        onInterim: (text) => {
          if (session !== voiceSessionGen || state.dictationTarget !== 'translate-sheet') return
          state.draft = text
          state.voiceHint = text || state.voiceHint
          const ta = document.getElementById('tr-sheet-input') as HTMLTextAreaElement | null
          if (ta) ta.value = text
          const status = document.getElementById('tr-sheet-status')
          if (status) status.textContent = text || `${langNameForCode(speakLang)}로 듣는 중…`
          const mic = document.querySelector<HTMLButtonElement>('[data-action="tr-sheet-mic"]')
          if (mic) {
            mic.classList.add('listening')
            mic.textContent = 'STOP'
            mic.setAttribute('aria-pressed', 'true')
          }
        },
        onFinal: (text) => {
          if (session !== voiceSessionGen || state.dictationTarget !== 'translate-sheet') return
          state.listening = false
          state.voiceHint = ''
          state.draft = ''
          const cleaned = text.trim().slice(0, 2000)
          state.translateSheet = {
            ...state.translateSheet,
            sourceText: cleaned,
            result: '',
            status: cleaned
              ? `${langNameForCode(speakLang)} 인식 완료 · 번역 중…`
              : '음성을 이해하지 못했습니다. 말할 언어 칩을 확인한 뒤 다시 MIC를 눌러 주세요.',
            lastInputSource: 'mic',
          }
          render()
          if (cleaned) void runTranslateSheet({ inputSource: 'mic' })
        },
        onState: (s) => {
          if (session !== voiceSessionGen) return
          state.listening = s === 'listening' || s === 'processing'
          if (s === 'idle' && !state.translateSheet.busy) state.listening = false
          const mic = document.querySelector<HTMLButtonElement>('[data-action="tr-sheet-mic"]')
          if (mic) {
            const on = state.listening
            mic.classList.toggle('listening', on)
            mic.textContent = on ? 'STOP' : 'MIC'
            mic.setAttribute('aria-pressed', on ? 'true' : 'false')
          }
        },
        onError: (err) => {
          if (session !== voiceSessionGen) return
          state.listening = false
          state.voiceHint = ''
          showFlash(err)
          render()
        },
      },
      listenLang,
    )
    if (!ok) {
      state.listening = false
      state.voiceHint = ''
      showFlash('음성 인식을 시작하지 못했습니다. 다시 MIC를 눌러 주세요.')
      render()
    }
  })()
}

function applyHashRouteFromLocation(opts?: { replace?: boolean }): void {
  const parsed = parseLocationHash(window.location.hash)
  const view = hashScreenToView(parsed.valid ? parsed.screen : 'home') as View
  state.view = view
  if (parsed.screen === 'home' || (!parsed.valid && view === 'chat')) {
    state.homeV2Pane = 'home'
  }
  if (view === 'navigation') {
    navRouteError = null
    state.homeV2NavSheetOpen = false
    state.homeV2Pane = 'home'
    if (parsed.query) {
      state.navV2 = {
        ...state.navV2,
        query: parsed.query,
        phase: state.navV2.candidates.length ? state.navV2.phase : 'idle',
        status: state.navV2.status || '목적지를 검색해 주세요.',
      }
    }
  }
  if (!parsed.valid && opts?.replace !== false) {
    syncHashFromApp({ replace: true, view })
  }
}

function handleNavV2Back(): void {
  const phase = state.navV2.phase
  const ctx = getNavV2Context()
  if (ctx.guiding || phase === 'guiding') {
    const ok = window.confirm('안내를 종료하고 경로 미리보기로 돌아갈까요?')
    if (!ok) return
    patchNavV2Context({ guiding: false })
    state.navV2 = { ...state.navV2, phase: 'route_preview', status: '안내를 종료했어요.' }
    render()
    return
  }
  if (phase === 'route_preview') {
    state.navV2 = {
      ...state.navV2,
      phase: state.navV2.selected ? 'place_detail' : 'candidates',
      status: state.navV2.selected ? `${state.navV2.selected.name} 선택됨` : '목적지를 선택해 주세요.',
    }
    render()
    return
  }
  if (phase === 'place_detail') {
    state.navV2 = {
      ...state.navV2,
      selected: null,
      phase: state.navV2.candidates.length ? 'candidates' : 'idle',
      status: state.navV2.candidates.length
        ? `${state.navV2.candidates.length}곳 후보`
        : '목적지를 검색해 주세요.',
    }
    render()
    return
  }
  if (phase === 'candidates' || phase === 'searching' || phase === 'error') {
    state.navV2 = {
      ...state.navV2,
      candidates: [],
      selected: null,
      query: '',
      phase: 'idle',
      status: '목적지를 검색해 주세요.',
    }
    syncHashFromApp({ query: '', replace: true, view: 'navigation' })
    render()
    return
  }
  // Navigation idle → previous screen (HOME v2)
  goToView('chat')
}

let arcade: ArcadeHandle | null = null

const voice = new VoiceListener()

function stopArcade(): void {
  arcade?.stop()
  arcade = null
}

function uid(): string {
  return crypto.randomUUID()
}

function refreshInstallHint(): void {
  // Browser tab only — hide when already launched from the home-screen icon.
  state.showInstall = shouldShowInstallButton()
  if (!state.showInstall) state.installGuideOpen = false
}

async function handleInstallHomeClick(): Promise<void> {
  state.homeV2MoreOpen = false
  const result = await attemptPwaInstall()
  if (result.kind === 'accepted' || result.kind === 'already-installed') {
    markPwaInstalled()
    state.showInstall = false
    state.installGuideOpen = false
    showFlash(
      result.kind === 'accepted'
        ? '홈 화면에 설치했습니다. 아이콘으로 열어 주세요.'
        : '이미 홈 화면에 설치되어 안내를 숨깁니다.',
    )
    render()
    return
  }
  if (result.kind === 'shared') {
    // Share sheet opened — user completes with 「홈 화면에 추가」
    state.installGuideOpen = false
    showFlash(
      isFixedPreviewInstallHost()
        ? '공유 창에서 「홈 화면에 추가」→「추가」를 누르세요. (고정 Preview 주소 그대로)'
        : isPreviewInstallHost()
          ? `공유 창에서 「홈 화면에 추가」를 누르세요. (고정 Preview: ${FIXED_PREVIEW_INSTALL_URL.replace(/^https?:\/\//, '')})`
          : '공유 창에서 「홈 화면에 추가」→「추가」를 누르면 설치됩니다.',
    )
    refreshInstallHint()
    render()
    return
  }
  if (result.kind === 'dismissed') {
    showFlash('설치가 취소되었습니다. 언제든 다시 누를 수 있어요.')
    refreshInstallHint()
    render()
    return
  }
  // Share/prompt unavailable — show platform steps
  state.installGuideOpen = result.kind === 'need-guide' ? result.platform : detectInstallPlatform()
  showFlash('공유 창을 열 수 없어 설치 방법을 표시합니다.')
  render()
}

function showFlash(msg: string): void {
  const el = document.getElementById('flash')
  if (!el) return
  el.textContent = msg
  el.classList.add('show')
  window.setTimeout(() => el.classList.remove('show'), 2200)
}

/** In-modal status — visible above share sheet; avoids relying only on flash. */
function setShareStatus(msg: string, ok: boolean | null = true): void {
  state.shareStatus = msg
  state.shareStatusOk = ok
  const el = document.querySelector('[data-share-status]')
  if (el) {
    el.textContent = msg
    el.classList.toggle('ok', ok === true)
    el.classList.toggle('err', ok === false)
  }
  showFlash(msg)
}

async function openShareModal(kind: 'app' | 'backup' | 'arcade'): Promise<void> {
  state.shareModal = kind
  state.shareQrSvg = ''
  state.shareArcadePayload = ''
  state.shareInviteKind = null
  state.shareInviteCode = ''
  state.shareInviteText = ''
  state.shareStatus = ''
  state.shareStatusOk = null
  state.shareHint = kind === 'app' ? appShareUrl() : 'QR 생성 중…'
  render()
  try {
    if (kind === 'app') {
      const url = appShareUrl()
      state.shareQrSvg = await qrSvg(url)
      state.shareHint = url
    } else if (kind === 'arcade') {
      syncSelfBestsToBoard(state.arcadeId)
      const built = buildMyScoreCard(state.arcadeId)
      if (!built) {
        state.shareHint = '이 게임의 기록이 없습니다. 먼저 플레이해 주세요.'
        state.shareQrSvg = ''
      } else {
        state.shareArcadePayload = built.payload
        state.shareQrSvg = await qrSvg(built.payload)
        state.shareHint = `${ARCADE_META[state.arcadeId].title} · ${built.card.name} · Lv.${built.card.level} · ${built.card.score}`
      }
    } else {
      const built = buildBackupQrPayload()
      state.shareQrSvg = await qrSvg(built.payload)
      state.shareHint =
        built.kind === 'full'
          ? `전체 백업 QR (${built.bytes}B) — 카메라로 스캔해 저장하세요.`
          : built.reason
    }
  } catch (err) {
    state.shareHint = err instanceof Error ? err.message : 'QR 생성 실패'
  }
  render()
}

async function openInviteModal(kind: 'family' | 'friends'): Promise<void> {
  const room = kind === 'family' ? loadFamilyRoom() : loadFriendsRoom()
  if (!room) {
    showFlash(kind === 'family' ? '먼저 가족 공간을 만들어 주세요.' : '먼저 친구 공간을 만들어 주세요.')
    return
  }
  const link = buildSpaceInviteUrl(kind, room.code, appShareUrl())
  const text =
    kind === 'family' ? familyInviteText(room, appShareUrl()) : friendsInviteText(room, appShareUrl())
  state.shareModal = 'invite'
  state.shareInviteKind = kind
  state.shareInviteCode = room.code
  state.shareInviteText = text
  state.shareQrSvg = ''
  state.shareStatus = ''
  state.shareStatusOk = null
  state.shareHint = `친구가 링크를 열고 «승인하고 입장»만 누르면 끝입니다.\n초대자도 AIZIO를 열어 두면 멤버가 자동 표시됩니다.\n${link}`
  render()
  try {
    // Deep-link URL only — phone camera can open it
    state.shareQrSvg = await qrSvg(link)
  } catch (err) {
    state.shareHint = err instanceof Error ? err.message : 'QR 생성 실패'
  }
  render()
}

function savePendingInvite(inv: { kind: SpaceKind; code: string } | null): void {
  try {
    if (!inv) sessionStorage.removeItem(PENDING_INVITE_KEY)
    else sessionStorage.setItem(PENDING_INVITE_KEY, JSON.stringify(inv))
  } catch {
    /* ignore */
  }
}

function restorePendingInvite(): void {
  if (state.pendingInvite) return
  try {
    const raw = sessionStorage.getItem(PENDING_INVITE_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw) as { kind?: string; code?: string }
    if ((parsed.kind === 'family' || parsed.kind === 'friends') && parsed.code) {
      state.pendingInvite = { kind: parsed.kind, code: parsed.code }
      state.prefillJoinCode = parsed.code
    }
  } catch {
    /* ignore */
  }
}

function captureInviteFromUrl(): void {
  const found = parseInviteFromLocation(window.location.href)
  if (!found) {
    restorePendingInvite()
    return
  }
  state.pendingInvite = found
  state.prefillJoinCode = found.code
  savePendingInvite(found)
  try {
    const cleaned = stripInviteParamsFromUrl(window.location.href)
    window.history.replaceState({}, '', cleaned)
  } catch {
    /* ignore */
  }
}

/** Open family/friends from notification click (?view=family|friends) or hash (#navigation). */
function captureViewFromUrl(): void {
  try {
    // Pathname /navigation|/map → root + #navigation (also handled in index.html).
    const migrated = migratePathnameToHashUrl(window.location.href)
    if (migrated) {
      window.history.replaceState({}, '', migrated)
    }
    const u = new URL(window.location.href)
    const v = u.searchParams.get('view')
    if (
      v === 'family' ||
      v === 'friends' ||
      v === 'chat' ||
      v === 'settings' ||
      v === 'global' ||
      v === 'life' ||
      v === 'invest' ||
      v === 'customers' ||
      v === 'navigation'
    ) {
      state.view = v
      u.searchParams.delete('view')
      // Prefer hash for navigation; keep other views on query-stripped URL.
      if (v === 'navigation') {
        window.history.replaceState(
          {},
          '',
          `${u.pathname}${u.searchParams.toString() ? `?${u.searchParams}` : ''}${buildAppHash('navigation')}`,
        )
      } else {
        const q = u.searchParams.toString()
        window.history.replaceState({}, '', `${u.pathname}${q ? `?${q}` : ''}${u.hash}`)
      }
    }
    // Keep ?home= for shareable compare URLs; sync stored preference when present.
    const homeQ = u.searchParams.get('home')
    if (homeQ) {
      const resolved = resolveHomeVariant({
        queryHome: homeQ,
        channel: getCachedBuildChannel(),
        hostname: location.hostname,
      })
      writeStoredHomeVariant(resolved)
      if (resolved === 'v2') state.homeV2Pane = 'home'
    }
    if (u.searchParams.get('customers') === '1' || u.searchParams.get('crm') === '1') {
      state.view = 'customers'
    }
    if (
      u.searchParams.get('nav') === '1' ||
      u.searchParams.get('navigation') === '1' ||
      u.searchParams.get('navv2') === '1'
    ) {
      state.view = 'navigation'
      state.homeV2NavSheetOpen = false
      state.homeV2Pane = 'home'
      u.searchParams.delete('nav')
      u.searchParams.delete('navigation')
      u.searchParams.delete('navv2')
      const q = u.searchParams.toString()
      window.history.replaceState(
        {},
        '',
        `${u.pathname}${q ? `?${q}` : ''}${buildAppHash('navigation')}`,
      )
    }
    // Hash is the canonical deep-link for SPA screens on ShipStatic.
    if (window.location.hash && window.location.hash !== '#') {
      applyHashRouteFromLocation({ replace: true })
    } else if (state.view === 'navigation') {
      syncHashFromApp({ replace: true, view: 'navigation' })
    }
  } catch {
    /* ignore */
  }
}

type InviteApplyResult = 'joined' | 'needs-switch' | 'failed' | 'none'

/**
 * Apply a pending invite without yanking the user away from an active screen.
 * - Same room already joined: clear pending, keep current view.
 * - Different room: stash switch banner code, only jump to that tab if already there
 *   or if `forceView` (location-gate accept / first join).
 */
function applyPendingInvite(opts?: { forceView?: boolean }): InviteApplyResult {
  const pending = state.pendingInvite
  if (!pending || !state.locationReady) return 'none'
  const forceView = opts?.forceView === true
  state.pendingInvite = null
  savePendingInvite(null)
  const member = state.settings.displayName || '나'
  try {
    if (pending.kind === 'friends') {
      const current = loadFriendsRoom()
      if (current && current.code === pending.code) {
        state.prefillJoinCode = ''
        return 'joined'
      }
      if (current && current.code !== pending.code) {
        state.prefillJoinCode = pending.code
        state.pendingInvite = pending
        savePendingInvite(pending)
        if (forceView || state.view === 'friends') state.view = 'friends'
        showFlash(`초대 ${pending.code} 수신 · 친구 탭에서 «전환 참여»`)
        return 'needs-switch'
      }
      joinFriendsRoomLocal(pending.code, '친구 공간', member)
      state.view = 'friends'
      state.friendsTab = 'chat'
      state.prefillJoinCode = ''
      postJoinPresence('friends')
      showFlash(`친구 초대 승인 · 코드 ${pending.code} 입장 완료`)
      void ensureFriendsSyncOnce(true)
      return 'joined'
    }
    const current = loadFamilyRoom()
    if (current && current.code === pending.code) {
      state.prefillJoinCode = ''
      return 'joined'
    }
    if (current && current.code !== pending.code) {
      state.prefillJoinCode = pending.code
      state.pendingInvite = pending
      savePendingInvite(pending)
      if (forceView || state.view === 'family') state.view = 'family'
      showFlash(`초대 ${pending.code} 수신 · 가족 탭에서 «전환 참여»`)
      return 'needs-switch'
    }
    joinFamilyRoomLocal(pending.code, '가족 공간', member)
    state.view = 'family'
    state.familyTab = 'chat'
    state.prefillJoinCode = ''
    postJoinPresence('family')
    showFlash(`가족 초대 승인 · 코드 ${pending.code} 입장 완료`)
    void ensureFamilySyncOnce(true)
    return 'joined'
  } catch (err) {
    state.pendingInvite = pending
    savePendingInvite(pending)
    showFlash(err instanceof Error ? err.message : '초대 참여에 실패했습니다.')
    if (forceView) {
      state.view = pending.kind
      state.prefillJoinCode = pending.code
    }
    return 'failed'
  }
}

function inviteSwitchBanner(kind: SpaceKind, currentCode: string): string {
  const code = state.prefillJoinCode.trim().toUpperCase()
  if (!code || code === currentCode) return ''
  const label = kind === 'friends' ? '친구' : '가족'
  return `
    <div class="invite-switch" role="status">
      <p><strong>새 ${label} 초대</strong> · 코드 <span class="invite-switch-code">${escapeHtml(code)}</span></p>
      <p class="hint">지금 공간(${escapeHtml(currentCode)})과 다릅니다. 전환하면 현재 공간에서 나갑니다.</p>
      <div class="row-btns">
        <button type="button" class="primary-btn" data-action="switch-${kind}-invite">전환 참여</button>
        <button type="button" class="ghost-btn" data-action="dismiss-${kind}-invite">무시</button>
      </div>
    </div>`
}

/** Tell peers we joined — registers us on inviter via sync hello + visible chat line. */
function postJoinPresence(kind: SpaceKind): void {
  const name = state.settings.displayName || '나'
  if (kind === 'friends') {
    const msg = postFriendsChat(`${name}님이 초대에 참여했습니다.`)
    void ensureFriendsSyncOnce(true).then(() => {
      if (msg) void broadcastFriendsPacket({ type: 'chat', message: msg })
    })
  } else {
    const msg = postFamilyChat(`${name}님이 초대에 참여했습니다.`)
    void ensureFamilySyncOnce(true).then(() => {
      if (msg) void broadcastFamilyPacket({ type: 'chat', message: msg })
    })
  }
}

async function switchToInvite(kind: SpaceKind): Promise<void> {
  const code = state.prefillJoinCode.trim()
  if (!code) {
    showFlash('전환할 초대 코드가 없습니다.')
    return
  }
  const member = state.settings.displayName || '나'
  try {
    if (kind === 'friends') {
      await disconnectFriendsSync()
      leaveFriendsRoom()
      joinFriendsRoomLocal(code, '친구 공간', member)
      state.friendsTab = 'chat'
      state.view = 'friends'
      postJoinPresence('friends')
    } else {
      await disconnectFamilySync()
      leaveFamilyRoom()
      joinFamilyRoomLocal(code, '가족 공간', member)
      state.familyTab = 'chat'
      state.view = 'family'
      postJoinPresence('family')
    }
    state.prefillJoinCode = ''
    savePendingInvite(null)
    showFlash(`초대 승인 · 코드 ${parseInviteCode(code) || code} 입장 완료`)
    render()
  } catch (err) {
    showFlash(err instanceof Error ? err.message : '전환에 실패했습니다.')
    render()
  }
}

async function detectQrFromFile(file: File): Promise<string | null> {
  return decodeQrFromFile(file)
}

function closeQrScannerOverlay(): void {
  document.getElementById('qr-scan-overlay')?.remove()
}

function closeMediaLightbox(): void {
  document.getElementById('media-lightbox')?.remove()
}

/** Full-screen photo viewer for family/friends chat images. */
function openMediaLightbox(src: string, alt = '사진'): void {
  if (!src) return
  closeMediaLightbox()
  const overlay = document.createElement('div')
  overlay.id = 'media-lightbox'
  overlay.className = 'media-lightbox'
  overlay.setAttribute('role', 'dialog')
  overlay.setAttribute('aria-modal', 'true')
  overlay.setAttribute('aria-label', '사진 보기')
  overlay.innerHTML = `
    <button type="button" class="media-lightbox-close" data-media-lightbox-close="1" aria-label="닫기">×</button>
    <img class="media-lightbox-img" src="${escapeAttr(src)}" alt="${escapeAttr(alt)}" />
  `
  const close = () => {
    closeMediaLightbox()
    window.removeEventListener('keydown', onKey)
  }
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') close()
  }
  overlay.addEventListener('click', (e) => {
    const t = e.target as HTMLElement
    if (t === overlay || t.closest('[data-media-lightbox-close]')) close()
  })
  window.addEventListener('keydown', onKey)
  document.body.appendChild(overlay)
}

let mediaPreviewDelegationReady = false
function bootMediaPreviewDelegation(): void {
  if (mediaPreviewDelegationReady) return
  mediaPreviewDelegationReady = true
  document.addEventListener('click', (e) => {
    const t = e.target as HTMLElement | null
    const profile = t?.closest?.('[data-profile-open]') as HTMLElement | null
    if (profile) {
      e.preventDefault()
      e.stopPropagation()
      openProfileSheet({
        name: profile.getAttribute('data-profile-name') || '나',
        src: profile.getAttribute('data-profile-src') || undefined,
        mine: profile.getAttribute('data-profile-mine') === '1',
      })
      return
    }
    const btn = t?.closest?.('[data-media-preview]') as HTMLElement | null
    if (!btn) return
    e.preventDefault()
    e.stopPropagation()
    const src = btn.getAttribute('data-media-preview') || ''
    const img = btn.querySelector('img')
    openMediaLightbox(src, img?.alt || '사진')
  })
}

/** Life OS 2.0 card actions — allowlisted only. */
let los2CardDelegationReady = false
function bootLos2CardDelegation(): void {
  if (los2CardDelegationReady) return
  los2CardDelegationReady = true
  document.addEventListener('click', (e) => {
    const t = e.target as HTMLElement | null
    const homeHint = t?.closest?.('[data-los2-home-hint]') as HTMLElement | null
    if (homeHint) {
      const hint = homeHint.getAttribute('data-los2-home-hint') || ''
      if (hint) {
        e.preventDefault()
        void handleUserText(hint)
      }
      return
    }
    const btn = t?.closest?.('[data-los2-action]') as HTMLElement | null
    if (!btn) return
    e.preventDefault()
    e.stopPropagation()
    const action = btn.getAttribute('data-los2-action') || ''
    if (!isAllowedLos2CardAction(action)) return
    const cardId = btn.getAttribute('data-los2-card') || ''
    let payload: Record<string, string> = {}
    try {
      const raw = btn.getAttribute('data-los2-payload') || ''
      if (raw) payload = JSON.parse(decodeURIComponent(raw)) as Record<string, string>
    } catch {
      payload = {}
    }
    void handleLos2CardAction(action, cardId, payload)
  })
}

async function handleLos2CardAction(
  action: string,
  cardId: string,
  payload: Record<string, string>,
): Promise<void> {
  const safeCardSel = (id: string) =>
    `[data-los2-card-root="${id.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"]`
  if (action === 'TOGGLE_EXPAND') {
    document.querySelector(safeCardSel(cardId))?.classList.toggle('is-collapsed')
    return
  }
  if (action === 'DISMISS_CARD') {
    document.querySelector(safeCardSel(cardId))?.remove()
    return
  }
  if (action === 'OPEN_ROUTE') {
    const view = payload.view || 'life'
    if (LOS2_ALLOWED_VIEWS.has(view)) {
      state.view = view as View
      render()
    }
    return
  }
  if (action === 'OPEN_SAFE_EXTERNAL_URL') {
    const url = payload.url || ''
    if (isSafeExternalUrl(url)) void openUrl(url, '링크')
    else showFlash('허용되지 않은 링크입니다.')
    return
  }
  if (action === 'STOP_FOCUS') {
    await handleUserText('집중 끝')
    return
  }
  if (action === 'START_FOCUS') {
    await handleUserText(payload.hint || '집중 모드 시작')
    return
  }
  if (action === 'SAVE_AUTOMATION' || action === 'RUN_AUTOMATION' || action === 'CANCEL_AUTOMATION') {
    await handleUserText(payload.hint || (action === 'SAVE_AUTOMATION' ? '자동화 저장' : action === 'RUN_AUTOMATION' ? '자동화 실행' : '자동화 중지'))
    return
  }
  if (action === 'CONFIRM_HABIT') {
    await handleUserText('습관 확인')
    return
  }
  if (action === 'REJECT_HABIT') {
    await handleUserText('습관 거절')
    return
  }
  if (action === 'IGNORE_HABIT_ONCE') {
    document.querySelector(safeCardSel(cardId))?.remove()
    showFlash('이번 제안만 숨겼습니다.')
    return
  }
  if (action === 'SEND_HINT' && payload.hint) {
    await handleUserText(payload.hint)
  }
}

/** One-time nav/tab delegation — survives remounts; faster than rebinding every render. */
let navDelegationReady = false
function bootNavDelegation(): void {
  if (navDelegationReady) return
  navDelegationReady = true

  document.addEventListener(
    'pointerdown',
    (e) => {
      const t = e.target as HTMLElement | null
      const hit = t?.closest?.(
        '[data-view], [data-family-tab], [data-friends-tab], .home-room-card',
      ) as HTMLElement | null
      if (!hit || isNavGuarded(e)) return
      hit.classList.add('tap-flash')
      window.setTimeout(() => hit.classList.remove('tap-flash'), 160)
    },
    { passive: true },
  )

  document.addEventListener(
    'click',
    (e) => {
      const t = e.target as HTMLElement | null
      if (!t) return

      const famTab = t.closest?.('[data-family-tab]') as HTMLElement | null
      if (famTab) {
        if (isNavGuarded(e)) {
          e.preventDefault()
          e.stopPropagation()
          return
        }
        const next = famTab.getAttribute('data-family-tab') as 'chat' | 'notices' | 'events' | null
        if (!next) return
        e.preventDefault()
        goToSpaceTab('family', next, e)
        return
      }

      const frTab = t.closest?.('[data-friends-tab]') as HTMLElement | null
      if (frTab) {
        if (isNavGuarded(e)) {
          e.preventDefault()
          e.stopPropagation()
          return
        }
        const next = frTab.getAttribute('data-friends-tab') as 'chat' | 'notices' | 'events' | null
        if (!next) return
        e.preventDefault()
        goToSpaceTab('friends', next, e)
        return
      }

      const viewBtn = t.closest?.('[data-view]') as HTMLElement | null
      if (viewBtn) {
        if (isNavGuarded(e)) {
          e.preventDefault()
          e.stopPropagation()
          return
        }
        const next = viewBtn.getAttribute('data-view') as View | null
        if (!next) return
        e.preventDefault()
        goToView(next, e)
      }
    },
    true,
  )

  document.addEventListener(
    'toggle',
    (e) => {
      const d = e.target as HTMLDetailsElement | null
      if (!d || !d.matches?.('[data-home-rooms]')) return
      state.homeRoomsOpen = d.open
    },
    true,
  )
}

async function scanInviteWithCamera(kind: SpaceKind): Promise<void> {
  if (!canUseCameraScan()) {
    showFlash('카메라를 쓸 수 없습니다. 사진 QR 또는 코드/링크 붙여넣기를 사용해 주세요.')
    return
  }
  closeQrScannerOverlay()
  let stream: MediaStream | null = null
  let stopped = false
  const overlay = document.createElement('div')
  overlay.id = 'qr-scan-overlay'
  overlay.className = 'qr-scan-overlay'
  overlay.innerHTML = `
    <div class="qr-scan-card">
      <p class="qr-scan-title">초대 QR 스캔</p>
      <video playsinline muted autoplay class="qr-scan-video"></video>
      <p class="hint">QR을 네모 안에 맞춰 주세요</p>
      <button type="button" class="ghost-btn" data-qr-cancel="1">취소</button>
    </div>`
  document.body.appendChild(overlay)
  const video = overlay.querySelector('video') as HTMLVideoElement
  const stopAll = () => {
    if (stopped) return
    stopped = true
    stream?.getTracks().forEach((t) => t.stop())
    closeQrScannerOverlay()
  }
  overlay.querySelector('[data-qr-cancel]')?.addEventListener('click', () => {
    stopAll()
    showFlash('QR 스캔을 취소했습니다.')
  })
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' } },
      audio: false,
    })
    video.srcObject = stream
    await video.play()
    const started = Date.now()
    while (!stopped && Date.now() - started < 20_000) {
      const raw = await decodeQrFromVideo(video)
      if (raw) {
        const code = parseInviteCode(raw)
        if (code) {
          stopAll()
          completeJoinFromRaw(kind, raw, state.settings.displayName || '나')
          return
        }
      }
      await new Promise((r) => setTimeout(r, 220))
    }
    if (!stopped) {
      stopAll()
      showFlash('QR을 읽지 못했습니다. 사진 QR 또는 코드 붙여넣기를 사용해 주세요.')
    }
  } catch {
    stopAll()
    showFlash('카메라 권한이 필요합니다. 사진 QR·코드 붙여넣기를 사용해 주세요.')
  }
}

function persistMemberName(memberName: string): void {
  const name = memberName.trim().slice(0, 20)
  if (!name) return
  if (state.settings.displayName === name) return
  state.settings = { ...state.settings, displayName: name }
  saveSettings(state.settings)
}

async function completeJoinFromRaw(kind: SpaceKind, raw: string, memberName: string): Promise<void> {
  const detected = detectInviteKind(raw)
  if (detected && detected !== kind) {
    showFlash(`${detected === 'friends' ? '친구' : '가족'} 초대로 전환합니다…`)
    kind = detected
  }
  const code = parseInviteCode(raw)
  if (!code) {
    showFlash('유효한 초대 코드/링크가 아닙니다.')
    return
  }
  persistMemberName(memberName)
  try {
    if (kind === 'friends') {
      const current = loadFriendsRoom()
      if (current && current.code !== code) {
        const ok = window.confirm(
          `지금 친구 공간 코드 ${current.code}에 있습니다.\n코드 ${code}로 바꾸면 현재 대화·공지·일정이 이 기기에서 사라집니다. 계속할까요?`,
        )
        if (!ok) return
        await disconnectFriendsSync()
        leaveFriendsRoom()
      }
      const wasSame = Boolean(current && current.code === code)
      joinFriendsRoomLocal(code, '친구 공간', memberName)
      state.friendsTab = 'chat'
      state.view = 'friends'
      state.prefillJoinCode = ''
      if (!wasSame) postJoinPresence('friends')
      else void ensureFriendsSyncOnce(true)
      showFlash(`친구 초대 승인 · 코드 ${code} 입장 완료`)
    } else {
      const current = loadFamilyRoom()
      if (current && current.code !== code) {
        const ok = window.confirm(
          `지금 가족 공간 코드 ${current.code}에 있습니다.\n코드 ${code}로 바꾸면 현재 대화·공지·일정이 이 기기에서 사라집니다. 계속할까요?`,
        )
        if (!ok) return
        await disconnectFamilySync()
        leaveFamilyRoom()
      }
      const wasSame = Boolean(current && current.code === code)
      joinFamilyRoomLocal(code, '가족 공간', memberName)
      state.familyTab = 'chat'
      state.view = 'family'
      state.prefillJoinCode = ''
      if (!wasSame) postJoinPresence('family')
      else void ensureFamilySyncOnce(true)
      showFlash(`가족 초대 승인 · 코드 ${code} 입장 완료`)
    }
    render()
  } catch (err) {
    showFlash(err instanceof Error ? err.message : '참여에 실패했습니다.')
  }
}

async function refreshWeather(): Promise<void> {
  const fix = state.lastFix
  if (!fix) return
  const place = state.settings.city || '현재 위치'
  const w = await fetchWeather(fix.lat, fix.lon, place)
  if (w) {
    state.weather = w
    if (state.locationReady && state.view === 'chat' && !state.busy) {
      const widget = document.querySelector('[data-home-widget] .home-weather')
      if (widget) {
        const s = buildHomeSummary(w)
        widget.textContent = s.weatherLine
      } else {
        render()
      }
    }
  }
}

function pushMsg(
  role: ChatMessage['role'],
  text: string,
  extra?: Partial<Pick<ChatMessage, 'musicNeedsGesture' | 'musicPlayUrl' | 'actionHint' | 'lifeCards'>>,
): ChatMessage {
  const msg: ChatMessage = { id: uid(), role, text, createdAt: Date.now(), ...extra }
  state.messages.push(msg)
  saveChat(state.messages)
  return msg
}

function syncMusicUiFromSession(opts?: { forceOpen?: boolean; forceHide?: boolean }): void {
  state.musicSession = sessionSnapshot()
  if (opts?.forceHide) {
    state.musicPlayerOpen = false
    return
  }
  const st = state.musicSession.status
  if (st === 'idle' || st === 'stopped' || st === 'error') {
    state.musicPlayerOpen = false
    return
  }
  if (
    opts?.forceOpen ||
    st === 'ready' ||
    st === 'opened_external' ||
    st === 'paused' ||
    st === 'unknown' ||
    st === 'searching'
  ) {
    state.musicPlayerOpen = true
  }
}

function dismissMusicMiniPlayer(): void {
  resetMusicSession()
  state.musicSession = sessionSnapshot()
  state.musicPlayerOpen = false
}

async function handleMusicAction(action: string): Promise<void> {
  if (action === 'close') {
    dismissMusicMiniPlayer()
    render()
    return
  }
  const locale = getAppLocale()
  let reply
  if (action === 'play' || action === 'open') {
    reply = await playWithUserGesture(locale)
  } else if (action === 'pause') {
    reply = await controlMusic('pause', locale)
  } else if (action === 'stop') {
    reply = await controlMusic('stop', locale)
  } else if (action === 'next') {
    reply = await controlMusic('next', locale)
  } else {
    return
  }
  if (reply.showMiniPlayer === false || action === 'stop') {
    dismissMusicMiniPlayer()
  } else {
    syncMusicUiFromSession({ forceOpen: true })
  }
  if (reply.text) {
    pushMsg('assistant', reply.text, {
      musicNeedsGesture: reply.needsGesture,
      musicPlayUrl: reply.playUrl,
    })
  }
  render()
  scrollChat()
}

/** Prefer translated body / skip lock instructions for TTS. */
function speakableReplyText(text: string): string {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
  const body = lines.find(
    (l) =>
      !/^【/.test(l) &&
      !/^—/.test(l) &&
      !/끝:\s*「?스톱/.test(l) &&
      !/계속 말하세요/.test(l) &&
      !/이어서 말하면/.test(l) &&
      !/번역 모드/.test(l),
  )
  if (body) return body
  if (text.includes('번역:')) {
    return text.split('번역:').pop()?.split('\n')[0]?.trim() || text
  }
  return text
}

/** Blocks double-tap / ghost-click / voice+전송 races that duplicate translate bubbles. */
let lastChatSend: ChatSendGuardState | null = null

async function handleUserText(raw: string, opts?: { source?: 'text' | 'voice' }): Promise<void> {
  const text = raw.trim()
  if (!shouldAcceptChatSend(text, state.busy, lastChatSend)) return
  lastChatSend = nextChatSendGuard(text)
  const gen = ++thinkGen
  state.busy = true
  state.listening = false
  state.voiceHint = ''
  state.draft = ''
  stopSpeaking()
  pushMsg('user', text)
  render()
  scrollChat()

  let timedOut = false
  const heavy =
    /포트폴리오|관심\s*종목|워치|종목\s*추천|시세|차트|보유|분석/.test(text) ||
    hasAnyConfiguredProvider()
  const thinkMs = heavy ? 22_000 : 12_000
  const timeoutId = window.setTimeout(() => {
    timedOut = true
    if (gen !== thinkGen) return
    pushMsg('assistant', '응답 시간이 초과되었습니다. 다시 시도해 주세요.')
    state.busy = false
    render()
    scrollChat()
  }, thinkMs)

  try {
    const history = state.messages.map((m) => ({ role: m.role, text: m.text }))
    const reply = await think(text, history.slice(0, -1), { source: opts?.source || 'text' })
    if (gen !== thinkGen || timedOut) return
    window.clearTimeout(timeoutId)
    if (reply.clearChat) {
      clearChat()
      state.messages = []
      state.draft = ''
      dismissMusicMiniPlayer()
      showFlash(reply.text || '대화 초기화 완료')
      if (reply.speak !== false && state.settings.speakReplies) {
        void speakAsync(reply.text, reply.speakLang || 'ko-KR')
      }
      return
    }
    if (reply.action) {
      const result = await Promise.race([
        Promise.resolve(reply.action()),
        new Promise<never>((_, reject) => {
          window.setTimeout(() => reject(new Error('실행 시간이 초과되었습니다.')), 8_000)
        }),
      ])
      if (gen !== thinkGen) return
      if (result && 'message' in result && result.message && result.message !== reply.text) {
        pushMsg('assistant', `${reply.text}\n(${result.message})`, {
          musicNeedsGesture: reply.musicNeedsGesture,
          musicPlayUrl: reply.musicPlayUrl,
          lifeCards: reply.lifeCards,
        })
      } else {
        pushMsg('assistant', reply.text, {
          musicNeedsGesture: reply.musicNeedsGesture,
          musicPlayUrl: reply.musicPlayUrl,
          lifeCards: reply.lifeCards,
        })
      }
      if (result && 'view' in result && result.view) state.view = result.view
    } else {
      pushMsg('assistant', reply.text, {
        musicNeedsGesture: reply.musicNeedsGesture,
        musicPlayUrl: reply.musicPlayUrl,
        lifeCards: reply.lifeCards,
      })
    }
    if (reply.musicShowMiniPlayer) {
      syncMusicUiFromSession({ forceOpen: true })
    } else {
      // Stop / dismiss from conversation — hide panel when session is done
      const st = sessionSnapshot().status
      if (st === 'stopped' || st === 'idle' || st === 'error') {
        dismissMusicMiniPlayer()
      }
    }
    if (reply.view) state.view = reply.view
    // Unified HOME already shows chat — keep pane on home.
    if (reply.view === 'navigation') {
      navRouteError = null
      const ctx = getNavV2Context()
      state.navV2 = {
        ...state.navV2,
        query: ctx.lastQuery || state.navV2.query,
        candidates: ctx.candidates.length ? ctx.candidates : state.navV2.candidates,
        selected: ctx.selected,
        catalogOnly: true,
        phase: ctx.guiding
          ? 'guiding'
          : ctx.routes.length
            ? 'route_preview'
            : ctx.selected
              ? 'place_detail'
              : ctx.candidates.length
                ? 'candidates'
                : 'idle',
        status: ctx.candidates.length
          ? `${ctx.candidates.length}곳 후보`
          : state.navV2.status || '목적지를 검색해 주세요.',
      }
      syncHashFromApp({
        view: 'navigation',
        query: state.navV2.query,
        replace: false,
      })
    } else if (reply.view) {
      syncHashFromApp({ view: reply.view, replace: false })
    }
    if (reply.arcadeId) state.arcadeId = reply.arcadeId
    if (reply.listenLang) state.listenLang = reply.listenLang
    if (reply.speak !== false && state.settings.speakReplies) {
      const lang = reply.speakLang || 'ko-KR'
      const speakText = speakableReplyText(reply.text)
      void speakAsync(speakText.replace(/\n+/g, '. ').slice(0, 220), lang)
    }
  } catch (err) {
    if (gen !== thinkGen || timedOut) return
    window.clearTimeout(timeoutId)
    const msg = err instanceof Error ? err.message : '처리 중 오류가 발생했습니다.'
    pushMsg('assistant', msg)
  } finally {
    if (gen === thinkGen && !timedOut) {
      window.clearTimeout(timeoutId)
      state.busy = false
      render()
      scrollChat()
    }
  }
}

/** Update mic/caption/draft without destroying the recognition session via full remount. */
function patchVoiceUi(): void {
  const target = state.dictationTarget
  if (target === 'jarvis') {
    syncJarvisMicButtons(document, state.listening)
    syncSpaceMicButtons(document, { listening: false, space: null })
  } else if (target === 'family' || target === 'friends') {
    syncJarvisMicButtons(document, false)
    syncSpaceMicButtons(document, { listening: state.listening, space: target })
  } else {
    syncJarvisMicButtons(document, false)
    syncSpaceMicButtons(document, { listening: false, space: null })
  }
  document.querySelectorAll<HTMLButtonElement>('[data-action="tr-sheet-mic"]').forEach((mic) => {
    const on = state.listening && target === 'translate-sheet'
    mic.classList.toggle('listening', on)
    mic.textContent = on ? 'STOP' : 'MIC'
    mic.setAttribute('aria-pressed', on ? 'true' : 'false')
  })
  if (target === 'translate-sheet') {
    const ta = document.getElementById('tr-sheet-input') as HTMLTextAreaElement | null
    if (ta && state.listening) ta.value = state.draft || ta.value
    const status = document.getElementById('tr-sheet-status')
    if (status && state.listening) status.textContent = state.voiceHint || '듣고 있습니다…'
  }
  document.querySelectorAll<HTMLElement>('[data-home-v2-orb]').forEach((orb) => {
    orb.classList.toggle('listening', state.listening && target === 'jarvis')
    orb.classList.toggle('busy', state.busy && !state.listening)
  })
  const voiceWrap = document.querySelector<HTMLElement>('.home-v2-voice')
  if (voiceWrap) {
    voiceWrap.dataset.voiceState = state.listening ? 'listening' : state.busy ? 'busy' : 'idle'
  }
  const status = document.querySelector('.status-pill')
  if (status) {
    status.textContent = state.listening
      ? '듣는 중'
      : state.busy
        ? '분석 중'
        : state.online
          ? '대기'
          : '오프라인'
  }
  if (target === 'translate-sheet') {
    // Sheet has its own status line — skip main chat captions while dictating here.
    return
  }
  const captionId =
    target === 'family' ? 'family-voice-caption' : target === 'friends' ? 'friends-voice-caption' : 'voice-caption'
  syncVoiceCaptions(document, {
    captionId,
    listening: state.listening,
    hint: state.voiceHint,
    idleHomePrompt: '무엇을 도와드릴까요?',
  })
  const inputId = target === 'family' ? 'family-draft' : target === 'friends' ? 'friends-draft' : 'draft'
  const input = document.getElementById(inputId) as HTMLInputElement | null
  if (input && state.listening) {
    // Space rooms: keep draft out of the text field so 전송 + auto-final cannot both send.
    if (target === 'jarvis') {
      input.value = state.draft
      input.placeholder = '음성 인식 중…'
    } else {
      input.value = ''
      input.placeholder = state.draft ? '말씀하는 중… (자동 전송)' : '음성 인식 중…'
    }
  }
}

/** Keep the latest space chat bubble in view (layout may settle after paint). */
function scrollSpaceChat(space?: 'family' | 'friends'): void {
  const kind = space || (state.view === 'friends' ? 'friends' : 'family')
  const box = document.querySelector(kind === 'friends' ? '.friends-chat' : '.fam-chat')
  if (!box) return
  const go = () => {
    box.scrollTop = box.scrollHeight
  }
  go()
  requestAnimationFrame(() => {
    go()
    requestAnimationFrame(go)
  })
}

function spaceChatBubbleHtml(
  m: {
    id: string
    authorId: string
    authorName: string
    text: string
    createdAt?: number
    media?: { kind: 'image' | 'video'; dataUrl: string; mime: string; name?: string }
    sourceLanguage?: string
  },
  memberId: string,
): string {
  const mine = m.authorId === memberId
  const mediaHtml = m.media
    ? m.media.kind === 'video'
      ? `<video class="fam-media fam-media-video" controls playsinline preload="metadata" src="${escapeAttr(m.media.dataUrl)}"></video>`
      : `<button type="button" class="fam-media-btn" data-media-preview="${escapeAttr(m.media.dataUrl)}" aria-label="${escapeAttr(t('chat.media.photo'))} 크게 보기">
          <img class="fam-media" src="${escapeAttr(m.media.dataUrl)}" alt="${escapeAttr(m.media.name || t('chat.media.photo'))}" loading="lazy" />
        </button>`
    : ''
  const s = state.settings
  const wantTranslate =
    !mine &&
    s.autoTranslateMessages !== false &&
    Boolean((m.text || '').trim()) &&
    !/^\[(사진|동영상)\]$/.test(m.text.trim())
  const clock = formatChatClock(m.createdAt || 0)
  const avatarSrc = lookupSpaceAvatar(m.authorId, memberId)
  const avatar = avatarButtonHtml({
    name: m.authorName,
    src: avatarSrc,
    mine,
  })
  const nameRow = mine ? '' : `<span class="meta">${escapeHtml(m.authorName)}</span>`
  const bareMediaLabel = /^\[(사진|동영상)\]$/.test((m.text || '').trim())
  const textHtml =
    bareMediaLabel && mediaHtml
      ? `<div class="fam-msg-text" data-role="body" hidden>${escapeHtml(m.text)}</div>`
      : `<div class="fam-msg-text" data-role="body">${escapeHtml(m.text)}</div>`
  // Keep bubble markup on one line so layout whitespace cannot inflate height.
  return `<div class="fam-msg-row ${mine ? 'mine' : 'theirs'}">${avatar}<div class="fam-msg ${mine ? 'mine' : 'theirs'}" data-msg-id="${escapeAttr(m.id)}" data-author="${escapeAttr(m.authorId)}" data-src-lang="${escapeAttr(m.sourceLanguage || '')}" data-orig="${escapeAttr(encodeURIComponent(m.text))}" ${wantTranslate ? 'data-need-translate="1"' : ''}>${nameRow}${mediaHtml}${textHtml}<div class="fam-msg-tr" data-role="tr" hidden></div>${clock ? `<time class="msg-time">${clock}</time>` : ''}</div></div>`
}

async function hydrateSpaceTranslations(): Promise<void> {
  const s = state.settings
  if (s.autoTranslateMessages === false) return
  if (state.view !== 'family' && state.view !== 'friends') return
  const target = (s.translationLocale || s.appLocale || getAppLocale() || 'ko').split('-')[0]!
  const nodes = [...document.querySelectorAll<HTMLElement>('.fam-msg[data-need-translate="1"]')]
  for (const el of nodes.slice(-40)) {
    const id = el.dataset.msgId || ''
    let original = el.dataset.orig || ''
    try {
      original = decodeURIComponent(original)
    } catch {
      /* keep raw */
    }
    const body = el.querySelector<HTMLElement>('[data-role="body"]')
    const trBox = el.querySelector<HTMLElement>('[data-role="tr"]')
    if (!id || !original || !body || !trBox) continue

    const cached = getCachedTranslation(id, target)
    const apply = (translated: string, from: string, status: string) => {
      if (status === 'skipped' || translated === original) {
        trBox.hidden = true
        return
      }
      const showOrig = s.showOriginalText === true
      body.textContent = translated
      trBox.hidden = false
      trBox.innerHTML = `<button type="button" class="linkish" data-toggle-orig="${escapeAttr(id)}">${escapeHtml(t('chat.translation.showOriginal'))}</button>
        <span class="hint">${escapeHtml(t('chat.translation.from', { from: translationSourceLabel(from) }))}</span>
        ${showOrig ? `<pre class="fam-orig">${escapeHtml(original)}</pre>` : ''}`
      trBox.dataset.translated = translated
      trBox.dataset.original = original
      trBox.dataset.showing = 'translated'
    }

    if (cached) {
      apply(cached.translatedText, cached.sourceLanguage || el.dataset.srcLang || '', 'completed')
      continue
    }
    trBox.hidden = false
    trBox.textContent = t('chat.translation.pending')
    try {
      const result = await translateChatMessage({
        messageId: id,
        originalText: original,
        sourceLanguage: el.dataset.srcLang || undefined,
        targetLanguage: target,
      })
      if (result.status === 'failed' || result.status === 'offline' || result.status === 'unavailable') {
        body.textContent = original
        trBox.textContent = t('chat.translation.failed')
        continue
      }
      apply(result.translatedText, result.detectedSourceLanguage, result.status)
    } catch {
      body.textContent = original
      trBox.textContent = t('chat.translation.failed')
    }
  }
}

/** Sync space chat DOM: prune cleared rows + append new ones (keeps composer mounted). */
function appendLiveSpaceChats(kind: 'family' | 'friends'): void {
  const onChat =
    kind === 'family'
      ? state.view === 'family' && state.familyTab === 'chat'
      : state.view === 'friends' && state.friendsTab === 'chat'
  if (!onChat) return
  const room = kind === 'family' ? loadFamilyRoom() : loadFriendsRoom()
  const wrap = document.querySelector(kind === 'friends' ? '.friends-chat' : '.fam-chat')
  if (!room || !wrap) return
  const keep = new Set(room.messages.slice(-80).map((m) => m.id))
  let changed = false
  for (const el of [...wrap.querySelectorAll<HTMLElement>('[data-msg-id]')]) {
    const id = el.dataset.msgId || ''
    if (keep.has(id)) continue
    const row = el.closest('.fam-msg-row') || el
    row.remove()
    changed = true
  }
  const existing = new Set(
    [...wrap.querySelectorAll<HTMLElement>('[data-msg-id]')].map((el) => el.dataset.msgId || ''),
  )
  for (const m of room.messages.slice(-80)) {
    if (existing.has(m.id)) continue
    if (wrap.querySelector('.empty')) wrap.innerHTML = ''
    wrap.insertAdjacentHTML('beforeend', spaceChatBubbleHtml(m, room.memberId))
    existing.add(m.id)
    changed = true
  }
  if (room.messages.length === 0 && !wrap.querySelector('.empty')) {
    wrap.innerHTML =
      '<div class="empty">첫 메시지를 남겨 보세요.</div>'
    changed = true
  }
  if (changed) {
    scrollSpaceChat(kind)
    requestAnimationFrame(() => {
      void hydrateSpaceTranslations()
    })
  }
}

function spaceSourceLang(text: string): string | undefined {
  if (state.settings.detectMessageLanguage === false) {
    return (state.settings.translationLocale || state.settings.appLocale || getAppLocale()).split('-')[0]
  }
  const d = detectMessageLanguage(text, {
    prefer: (state.settings.appLocale || getAppLocale()).split('-')[0],
  })
  return d.language === 'und' ? undefined : d.language
}

/** Prevent voice auto-final + MIC STOP / 전송 from posting the same line twice. */
let lastSpaceSend = { key: '', at: 0 }

function normalizeSpaceChatText(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

function isRecentDuplicateSpaceChat(space: 'family' | 'friends', caption: string): boolean {
  const norm = normalizeSpaceChatText(caption)
  if (!norm) return false
  const key = `${space}:${norm}`
  const now = Date.now()
  if (key === lastSpaceSend.key && now - lastSpaceSend.at < 2500) return true
  const room = space === 'family' ? loadFamilyRoom() : loadFriendsRoom()
  if (!room) return false
  for (let i = room.messages.length - 1; i >= 0 && i >= room.messages.length - 6; i--) {
    const m = room.messages[i]!
    if (m.authorId !== room.memberId) continue
    if (normalizeSpaceChatText(m.text) === norm && now - m.createdAt < 2500) return true
    break
  }
  return false
}

async function publishSpaceChat(
  space: 'family' | 'friends',
  packet: { type: 'chat'; message: { id: string; authorId: string; authorName: string; text: string; createdAt: number } },
): Promise<void> {
  // Send immediately if relay/WebRTC is up — do not wait for reconnect first
  const ready = space === 'family' ? canBroadcastFamilyNow() : canBroadcastFriendsNow()
  if (ready) {
    if (space === 'family') await broadcastFamilyPacket(packet)
    else await broadcastFriendsPacket(packet)
    void (space === 'family' ? ensureFamilySyncOnce() : ensureFriendsSyncOnce())
    return
  }
  if (space === 'family') {
    await ensureFamilySyncOnce()
    await broadcastFamilyPacket(packet)
  } else {
    await ensureFriendsSyncOnce()
    await broadcastFriendsPacket(packet)
  }
}

function sendSpaceChat(space: 'family' | 'friends', text: string, media?: ChatMedia): void {
  const trimmed = text.trim()
  if (!trimmed && !media) return
  const caption = media ? mediaCaption(media, trimmed) : trimmed
  if (!media && isRecentDuplicateSpaceChat(space, caption)) return
  if (!media) {
    lastSpaceSend = { key: `${space}:${normalizeSpaceChatText(caption)}`, at: Date.now() }
  }
  const sourceLanguage = spaceSourceLang(caption)
  if (space === 'family') {
    const msg = postFamilyChat(caption, { media, sourceLanguage })
    if (!msg) return
    invalidateSpaceInboxCache()
    const form = document.getElementById('family-chat-form') as HTMLFormElement | null
    form?.reset()
    softRefreshSpaceChat('family')
    void publishSpaceChat('family', { type: 'chat', message: msg })
    return
  }
  const msg = postFriendsChat(caption, { media, sourceLanguage })
  if (!msg) return
  invalidateSpaceInboxCache()
  const form = document.getElementById('friends-chat-form') as HTMLFormElement | null
  form?.reset()
  softRefreshSpaceChat('friends')
  void publishSpaceChat('friends', { type: 'chat', message: msg })
}

/** MIC listening + 전송 tap must not double-post. */
function submitSpaceChatFromForm(space: 'family' | 'friends', formText: string): void {
  if (state.listening && state.dictationTarget === space) {
    voiceSessionGen += 1
    const partial = voice.consumeTranscript() || formText.trim()
    state.listening = false
    state.voiceHint = ''
    state.draft = ''
    patchVoiceUi()
    if (partial) sendSpaceChat(space, partial)
    return
  }
  sendSpaceChat(space, formText)
}

async function sendSpaceMedia(space: 'family' | 'friends', file: File): Promise<void> {
  try {
    const media = await fileToChatMedia(file)
    const draftId = space === 'family' ? 'family-draft' : 'friends-draft'
    const draft = (document.getElementById(draftId) as HTMLInputElement | null)?.value || ''
    sendSpaceChat(space, draft, media)
  } catch (err) {
    showFlash(err instanceof Error ? err.message : t('chat.media.tooLarge'))
  }
}

/** Jarvis chat MIC (HOME orb, composer MIC, nav MIC) — shared by every data-action="mic". */
function startJarvisDictation(): void {
  // Never block MIC on TTS; only soft-block while thinking
  if (state.busy) {
    stopSpeaking()
    showFlash('답변 준비 중… 곧 MIC를 쓸 수 있습니다')
    return
  }
  if (typeof window !== 'undefined' && !window.isSecureContext) {
    showFlash('음성 인식은 HTTPS(홈 화면 앱)에서만 됩니다.')
    return
  }
  if (!canListen()) {
    showFlash('이 브라우저는 음성 인식을 지원하지 않습니다. iPhone Safari를 사용해 주세요.')
    return
  }
  if (state.listening && state.dictationTarget === 'jarvis') {
    voiceSessionGen += 1
    const partial = voice.consumeTranscript()
    state.listening = false
    state.voiceHint = ''
    patchVoiceUi()
    if (partial) void handleUserText(partial, { source: 'voice' })
    else render()
    return
  }
  if (state.listening) {
    voiceSessionGen += 1
    voice.stop()
    state.listening = false
  }
  stopSpeaking()
  const session = ++voiceSessionGen
  state.dictationTarget = 'jarvis'
  state.draft = ''
  // Outside interpret lock, always listen in Korean so weather/life commands STT cleanly
  const listenLang = currentListenLang() || 'ko-KR'
  state.listenLang = listenLang
  state.voiceHint = loadInterpretMode().active
    ? `통역 듣는 중 (${listenLang}) · 말씀 끝나면 잠시 기다려 주세요`
    : '듣고 있습니다… «오늘 날씨 알려줘»처럼 또박또박 (끝나면 잠깐 대기)'
  // Ensure chat shell exists without heavy remount when already on chat
  if (state.view !== 'chat' || !document.querySelector('#voice-caption, [data-home-v2-prompt="1"]')) {
    state.view = 'chat'
    state.listening = true
    render()
  } else {
    state.listening = true
    patchVoiceUi()
  }
  void (async () => {
    const micOk = await ensureMicPermission()
    if (session !== voiceSessionGen || state.dictationTarget !== 'jarvis' || !state.listening) return
    if (!micOk) {
      state.listening = false
      state.voiceHint = ''
      showFlash('마이크 권한이 필요합니다. 설정 → AIZIO/Safari → 마이크 허용')
      patchVoiceUi()
      return
    }
    const ok = voice.start(
      {
        onInterim: (text) => {
          state.draft = text
          state.voiceHint = text || state.voiceHint
          patchVoiceUi()
        },
        onFinal: (text) => {
          if (session !== voiceSessionGen || state.dictationTarget !== 'jarvis') return
          state.listening = false
          state.voiceHint = '인식 완료'
          // Clear draft so 전송 cannot resend the same utterance after auto-final.
          state.draft = ''
          patchVoiceUi()
          const input = document.getElementById('draft') as HTMLInputElement | null
          if (input) input.value = ''
          void handleUserText(text, { source: 'voice' })
        },
        onState: (s) => {
          if (session !== voiceSessionGen) return
          state.listening = s === 'listening' || s === 'processing'
          if (s === 'idle' && !state.busy) state.listening = false
          patchVoiceUi()
        },
        onError: (err) => {
          if (session !== voiceSessionGen) return
          state.listening = false
          state.voiceHint = ''
          showFlash(err)
          patchVoiceUi()
        },
      },
      listenLang,
    )
    if (!ok) {
      state.listening = false
      state.voiceHint = ''
      showFlash('음성 인식을 시작하지 못했습니다. 다시 MIC를 눌러 주세요.')
      patchVoiceUi()
    }
  })()
}

function startSpaceDictation(space: 'family' | 'friends'): void {
  if (state.busy) {
    stopSpeaking()
    showFlash('잠시 후 다시 MIC를 눌러 주세요')
    return
  }
  if (typeof window !== 'undefined' && !window.isSecureContext) {
    showFlash('음성 인식은 HTTPS(홈 화면 앱)에서만 됩니다.')
    return
  }
  if (!canListen()) {
    showFlash('이 브라우저는 음성 인식을 지원하지 않습니다. iPhone Safari를 사용해 주세요.')
    return
  }
  if (state.listening && state.dictationTarget === space) {
    voiceSessionGen += 1
    // consumeTranscript suppresses silence-timer onFinal (avoids double send)
    const partial = voice.consumeTranscript()
    state.listening = false
    state.voiceHint = ''
    patchVoiceUi()
    if (partial) sendSpaceChat(space, partial)
    else render()
    return
  }
  if (state.listening) {
    voiceSessionGen += 1
    voice.stop()
    state.listening = false
  }
  stopSpeaking()
  const session = ++voiceSessionGen
  state.dictationTarget = space
  state.draft = ''
  state.voiceHint = '듣고 있습니다… 천천히 말씀하세요 (끝나면 자동 전송)'
  state.listening = true
  patchVoiceUi()
  void (async () => {
    const micOk = await ensureMicPermission()
    if (session !== voiceSessionGen || state.dictationTarget !== space || !state.listening) return
    if (!micOk) {
      state.listening = false
      state.voiceHint = ''
      showFlash('마이크 권한이 필요합니다. 설정 → AIZIO/Safari → 마이크 허용')
      patchVoiceUi()
      return
    }
    const ok = voice.start(
      {
        onInterim: (text) => {
          state.draft = text
          state.voiceHint = text || state.voiceHint
          patchVoiceUi()
        },
        onFinal: (text) => {
          if (session !== voiceSessionGen || state.dictationTarget !== space) return
          state.listening = false
          state.voiceHint = '인식 완료'
          state.draft = text
          patchVoiceUi()
          sendSpaceChat(space, text)
        },
        onState: (s) => {
          if (session !== voiceSessionGen) return
          state.listening = s === 'listening' || s === 'processing'
          if (s === 'idle') state.listening = false
          patchVoiceUi()
        },
        onError: (err) => {
          if (session !== voiceSessionGen) return
          state.listening = false
          state.voiceHint = ''
          showFlash(err)
          patchVoiceUi()
        },
      },
      'ko-KR',
    )
    if (!ok) {
      state.listening = false
      state.voiceHint = ''
      patchVoiceUi()
    }
  })()
}

function scrollChat(): void {
  const el = document.querySelector('.messages')
  if (el) el.scrollTop = el.scrollHeight
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/'/g, '&#39;')
}

/** HH:mm for Cursor/Kakao-style chat timestamps. */
function formatChatClock(ts: number): string {
  if (!ts || !Number.isFinite(ts)) return ''
  const d = new Date(ts)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function chatAvatarLetter(name: string): string {
  const t = name.trim()
  return t ? t.slice(0, 1).toUpperCase() : '?'
}

function lookupSpaceAvatar(authorId: string, memberId: string): string | undefined {
  if (authorId === memberId && isAvatarDataUrl(state.settings.avatarDataUrl)) {
    return state.settings.avatarDataUrl
  }
  const room =
    state.view === 'friends'
      ? loadFriendsRoom()
      : state.view === 'family'
        ? loadFamilyRoom()
        : loadFamilyRoom() || loadFriendsRoom()
  const url = room?.members.find((m) => m.id === authorId)?.avatarUrl
  return isAvatarDataUrl(url) ? url : undefined
}

function avatarButtonHtml(opts: {
  name: string
  src?: string
  mine?: boolean
}): string {
  const letter = chatAvatarLetter(opts.name)
  const src = isAvatarDataUrl(opts.src) ? opts.src : ''
  const inner = src
    ? `<img class="msg-avatar-img" src="${escapeAttr(src)}" alt="" />`
    : `<span class="msg-avatar-letter">${escapeHtml(letter)}</span>`
  return `<button type="button" class="msg-avatar-btn ${src ? 'has-photo' : ''}" data-profile-open="1" data-profile-name="${escapeAttr(opts.name)}" data-profile-src="${escapeAttr(src)}" data-profile-mine="${opts.mine ? '1' : '0'}" aria-label="${escapeAttr(opts.name)} 프로필">
    ${inner}
  </button>`
}

async function applyMyAvatar(dataUrl: string | undefined): Promise<void> {
  const next = {
    ...state.settings,
    avatarDataUrl: dataUrl && isAvatarDataUrl(dataUrl) ? dataUrl : undefined,
  }
  state.settings = next
  saveSettings(next)
  const avatarUrl = next.avatarDataUrl || null
  const fam = loadFamilyRoom()
  if (fam) {
    upsertFamilyMember(fam, {
      id: fam.memberId,
      name: fam.memberName,
      joinedAt: Date.now(),
      avatarUrl,
    })
    saveFamilyRoom(fam)
  }
  const fr = loadFriendsRoom()
  if (fr) {
    upsertFriendsMember(fr, {
      id: fr.memberId,
      name: fr.memberName,
      joinedAt: Date.now(),
      avatarUrl,
    })
    saveFriendsRoom(fr)
  }
  showFlash(avatarUrl ? '프로필 사진을 저장했습니다.' : '프로필 사진을 제거했습니다.')
  render()
  void ensureFamilySyncOnce(true)
  void ensureFriendsSyncOnce(true)
}

function pickProfileAvatarFile(): void {
  let input = document.getElementById('profile-avatar-input') as HTMLInputElement | null
  if (!input) {
    input = document.createElement('input')
    input.id = 'profile-avatar-input'
    input.type = 'file'
    input.accept = 'image/*'
    input.hidden = true
    document.body.appendChild(input)
    input.addEventListener('change', () => {
      const file = input!.files?.[0]
      input!.value = ''
      if (!file) return
      void fileToProfileAvatar(file)
        .then((url) => applyMyAvatar(url))
        .catch((err) => showFlash(err instanceof Error ? err.message : '프로필 선택 실패'))
    })
  }
  input.click()
}

function closeProfileSheet(): void {
  document.getElementById('profile-sheet')?.remove()
}

function openProfileSheet(opts: { name: string; src?: string; mine?: boolean }): void {
  closeProfileSheet()
  const src = isAvatarDataUrl(opts.src) ? opts.src : ''
  const letter = chatAvatarLetter(opts.name)
  const overlay = document.createElement('div')
  overlay.id = 'profile-sheet'
  overlay.className = 'profile-sheet'
  overlay.setAttribute('role', 'dialog')
  overlay.setAttribute('aria-modal', 'true')
  overlay.setAttribute('aria-label', '프로필')
  overlay.innerHTML = `
    <div class="profile-sheet-card" data-profile-card="1">
      <button type="button" class="profile-sheet-close" data-profile-close="1" aria-label="닫기">×</button>
      <button type="button" class="profile-sheet-avatar ${src ? 'has-photo' : ''}" data-profile-zoom="${src ? '1' : '0'}" aria-label="프로필 사진 크게 보기">
        ${
          src
            ? `<img src="${escapeAttr(src)}" alt="${escapeAttr(opts.name)}" />`
            : `<span>${escapeHtml(letter)}</span>`
        }
      </button>
      <strong class="profile-sheet-name">${escapeHtml(opts.name)}</strong>
      ${
        opts.mine
          ? `<div class="profile-sheet-actions">
              <button type="button" class="primary-btn" data-profile-pick="1">프로필 사진 선택</button>
              ${src ? `<button type="button" class="ghost-btn" data-profile-clear="1">사진 제거</button>` : ''}
            </div>`
          : src
            ? `<p class="hint">사진을 누르면 크게 볼 수 있습니다.</p>`
            : `<p class="hint">아직 프로필 사진이 없습니다.</p>`
      }
    </div>
  `
  const close = () => closeProfileSheet()
  overlay.addEventListener('click', (e) => {
    const t = e.target as HTMLElement
    if (t === overlay || t.closest('[data-profile-close]')) {
      close()
      return
    }
    if (t.closest('[data-profile-pick]')) {
      close()
      pickProfileAvatarFile()
      return
    }
    if (t.closest('[data-profile-clear]')) {
      close()
      void applyMyAvatar(undefined)
      return
    }
    if (t.closest('[data-profile-zoom="1"]') && src) {
      openMediaLightbox(src, opts.name)
    }
  })
  document.body.appendChild(overlay)
}

function renderBrand(): string {
  const status = state.listening
    ? '듣는 중'
    : state.busy
      ? '분석 중'
      : loadInterpretMode().active
        ? '통역'
        : state.online
          ? '대기'
          : '오프라인'
  const inbox = getHomeSpaceInbox()
  const topActions = renderTopNavActions({
    moreOpen: state.homeV2MoreOpen,
    unread: inbox.unreadTotal || 0,
  })
  return `
    <header class="brand-bar">
      <div class="brand">
        <div class="orb" aria-hidden="true"></div>
        <div>
          <h1>AIZIO</h1>
          <p>${loadInterpretMode().active ? `실시간 통역 · MIC ${escapeHtml(state.listenLang)}` : `아이지오 · 만능·투자 AI 비서 · ${escapeHtml(state.settings.displayName)}`}</p>
        </div>
      </div>
      <div class="brand-bar-right">
        <div class="status-pill">${status}</div>
        ${topActions}
      </div>
    </header>
  `
}

function renderInstall(): string {
  if (!state.showInstall) return ''
  const platform = detectInstallPlatform()
  const fixedPreview = isFixedPreviewInstallHost()
  const method = installMethodSummary(platform, {
    previewHost: isPreviewInstallHost(),
    fixedPreviewHost: fixedPreview,
  })
  const lines = method.lines
    .map((line, i) => `<li><span class="install-step-n">${i + 1}</span>${escapeHtml(line)}</li>`)
    .join('')
  return `
    <div class="install-banner install-banner-method" data-install-banner="1">
      <div class="install-banner-copy">
        <strong>${escapeHtml(method.title)}</strong>
        <ol class="install-banner-steps">${lines}</ol>
      </div>
      <div class="install-banner-actions">
        <button type="button" class="ghost-btn tiny" data-action="install-show-guide">자세히</button>
        <button type="button" class="ghost-btn tiny install-already-btn" data-action="install-already-done">숨기기</button>
      </div>
    </div>
  `
}

function renderInstallGuideModal(): string {
  if (!state.installGuideOpen) return ''
  const preview = isPreviewInstallHost()
  const fixedPreview = isFixedPreviewInstallHost()
  const guide = installGuideSteps(state.installGuideOpen, {
    previewHost: preview,
    fixedPreviewHost: fixedPreview,
  })
  const steps = guide.steps.map((s, i) => `<li><span class="step-n">${i + 1}</span>${escapeHtml(s)}</li>`).join('')
  const native = hasNativeInstallPrompt()
  const recUrl = getRecommendedInstallUrl()
  const previewWarn = fixedPreview
    ? `<p class="hint install-preview-warn">고정 Preview <strong>${escapeHtml(recUrl)}</strong> — 이 주소로 홈 화면에 추가하면 이후 「앱 업데이트」가 같은 앱에서 한 번에 됩니다.</p>`
    : preview
      ? `<p class="hint install-preview-warn">⚠ 임시 스냅샷(${escapeHtml(location.hostname)})입니다. 홈 화면에는 고정 Preview <strong>${escapeHtml(FIXED_PREVIEW_INSTALL_URL)}</strong> 를 추가하세요.</p>`
      : ''
  return `
    <div class="share-modal install-guide-modal" role="dialog" aria-modal="true" aria-label="${escapeAttr(guide.title)}" data-action="close-install-guide-backdrop">
      <div class="share-sheet" data-install-guide-sheet="1">
        <div class="share-sheet-head">
          <strong>${escapeHtml(guide.title)}</strong>
          <button type="button" class="ghost-btn tiny" data-action="close-install-guide">닫기</button>
        </div>
        ${previewWarn}
        <ol class="install-guide-steps">${steps}</ol>
        <p class="hint">추가할 주소: <code>${escapeHtml(recUrl)}</code></p>
        <p class="hint">홈 화면 아이콘으로 실행하면(주소창 없음) 이 안내는 자동으로 숨겨집니다.</p>
        <div class="row-btns install-guide-actions">
          ${native ? `<button type="button" class="primary-btn" data-action="install-home">설치 창 열기</button>` : ''}
          <button type="button" class="primary-btn" data-action="install-copy-prod-url">${fixedPreview || preview ? '고정 주소 복사' : '정식 주소 복사'}</button>
          ${preview && !fixedPreview ? `<button type="button" class="ghost-btn" data-action="install-open-prod">고정 주소 열기</button>` : ''}
          <button type="button" class="ghost-btn" data-action="install-copy-url">지금 주소 복사</button>
          <button type="button" class="ghost-btn" data-action="install-already-done">이미 설치함</button>
          <button type="button" class="ghost-btn" data-action="close-install-guide">확인</button>
        </div>
      </div>
    </div>
  `
}

function bindInstallUi(): void {
  document.querySelectorAll('[data-action="install-home"]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault()
      e.stopPropagation()
      void handleInstallHomeClick()
    })
  })
  document.querySelectorAll('[data-action="install-show-guide"]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault()
      e.stopPropagation()
      state.homeV2MoreOpen = false
      state.installGuideOpen = detectInstallPlatform()
      render()
    })
  })
  document.querySelectorAll('[data-action="close-install-guide"]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault()
      e.stopPropagation()
      state.installGuideOpen = false
      render()
    })
  })
  document.querySelectorAll('[data-action="close-install-guide-backdrop"]').forEach((el) => {
    el.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) {
        state.installGuideOpen = false
        render()
      }
    })
  })
  document.querySelectorAll('[data-action="install-copy-url"]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault()
      e.stopPropagation()
      void copyAppUrl().then((ok) => {
        showFlash(ok ? '지금 주소를 복사했습니다.' : '복사에 실패했습니다. 주소창의 링크를 길게 누르세요.')
      })
    })
  })
  document.querySelectorAll('[data-action="install-copy-prod-url"]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault()
      e.stopPropagation()
      void copyRecommendedInstallUrl().then(({ ok, url }) => {
        showFlash(
          ok
            ? `복사됨: ${url} — Safari에 붙여넣고 공유 → 홈 화면에 추가`
            : `복사 실패. Safari에서 ${getRecommendedInstallUrl().replace(/^https?:\/\//, '')} 을 직접 여세요.`,
        )
      })
    })
  })
  document.querySelectorAll('[data-action="install-open-prod"]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault()
      e.stopPropagation()
      window.location.href = getRecommendedInstallUrl()
    })
  })
  document.querySelectorAll('[data-action="install-already-done"]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault()
      e.stopPropagation()
      markPwaInstalled()
      state.showInstall = false
      state.installGuideOpen = false
      showFlash('홈 화면 설치 방법 안내를 숨겼습니다.')
      render()
    })
  })
}

function renderLocationGate(): string {
  restorePendingInvite()
  const err = state.locationError
    ? `<p class="loc-error">${escapeHtml(state.locationError)}</p>`
    : ''
  const invite = state.pendingInvite
  const inviteBlock = invite
    ? `<p class="loc-invite"><strong>${invite.kind === 'friends' ? '친구' : '가족'} 초대</strong> · 코드 <strong>${escapeHtml(invite.code)}</strong></p>
        <p class="loc-body">한 번만 승인하면 AIZIO ${invite.kind === 'friends' ? '친구' : '가족'} 공간으로 바로 입장합니다.</p>
        <button type="button" class="primary-btn loc-invite-go" data-action="accept-invite-start" ${
          state.locationBusy ? 'disabled' : ''
        }>승인하고 입장</button>`
    : ''
  return `
    <section class="location-gate">
      <div class="loc-card">
        <div class="big-orb"></div>
        <h1>AIZIO</h1>
        <p class="loc-lead">위치를 허용하면 날씨·주변 기능이 정확해집니다.</p>
        <p class="loc-body">
          홈 화면에 추가한 뒤 앱을 실행하면,<br/>
          위치 허용을 권장합니다.<br/>
          <span class="muted">위치는 이 아이폰의 AIZIO 안에서만 쓰입니다.</span>
        </p>
        ${err}
        ${inviteBlock}
        <button type="button" class="primary-btn loc-allow" data-action="allow-location" ${
          state.locationBusy ? 'disabled' : ''
        }>
          ${state.locationBusy ? '확인 중…' : '위치 허용하고 시작'}
        </button>
        <button type="button" class="ghost-btn loc-skip" data-action="skip-location" ${
          state.locationBusy ? 'disabled' : ''
        }>
          오프라인으로 계속 (대화·투자·생활·가족·친구·게임)
        </button>
        ${
          state.showInstall
            ? `<div class="loc-install loc-install-method">
                <p class="hint"><strong>홈 화면 설치 방법</strong> — 화면 위 안내를 따라 Safari 공유 → 홈 화면에 추가하세요. 설치 후 아이콘으로 열면 안내가 사라집니다.</p>
              </div>`
            : ''
        }
        <p class="loc-help">거부했다면: 설정 → 개인정보 보호 → 위치 서비스 → Safari/AIZIO → 허용</p>
        <p class="translate-hint">v${APP_VERSION}</p>
      </div>
    </section>
  `
}

/** Bottom tabs removed — 홈/메뉴 are in the header; all destinations live in the 메뉴 sheet. */
function renderNav(): string {
  return ''
}

function renderGlobal(): string {
  const s = state.settings
  const locales = supportedAppLocales()
  return `
    <section class="panel view-scroll">
      <h2 class="section-title">${escapeHtml(t('global.title'))}</h2>
      <p class="hint">${escapeHtml(t('global.subtitle'))}</p>
      <p class="hint">${escapeHtml(t('global.noCentralServer'))}</p>
      <p class="hint">${escapeHtml(t('global.usesFamilyFriends'))}</p>
      <div class="row-btns">
        <button type="button" class="primary-btn" data-view="family">${escapeHtml(t('global.openFamily'))}</button>
        <button type="button" class="ghost-btn" data-view="friends">${escapeHtml(t('global.openFriends'))}</button>
      </div>
      <h3 class="subsection-title">${escapeHtml(t('settings.translation.title'))}</h3>
      <form id="global-translation-form" class="settings-form life-input-form">
        <div class="toggle-row"><span>${escapeHtml(t('settings.translation.auto'))}</span>
          <input type="checkbox" name="autoTranslateMessages" ${s.autoTranslateMessages !== false ? 'checked' : ''} /></div>
        <div class="toggle-row"><span>${escapeHtml(t('settings.translation.showOriginal'))}</span>
          <input type="checkbox" name="showOriginalText" ${s.showOriginalText ? 'checked' : ''} /></div>
        <div class="toggle-row"><span>${escapeHtml(t('settings.translation.detect'))}</span>
          <input type="checkbox" name="detectMessageLanguage" ${s.detectMessageLanguage !== false ? 'checked' : ''} /></div>
        <label>${escapeHtml(t('settings.translation.target'))}
          <select name="translationLocale">
            ${locales
              .map(
                (code) =>
                  `<option value="${code}" ${(s.translationLocale || 'ko') === code ? 'selected' : ''}>${localeNativeName(code)}</option>`,
              )
              .join('')}
          </select>
        </label>
        <label>${escapeHtml(t('settings.language.title'))}
          <select name="appLocale">
            ${locales
              .map(
                (code) =>
                  `<option value="${code}" ${getAppLocale() === code ? 'selected' : ''}>${localeNativeName(code)}</option>`,
              )
              .join('')}
          </select>
        </label>
        <button class="primary-btn" type="submit">${escapeHtml(t('common.save'))}</button>
      </form>
      <p class="hint">${escapeHtml(t('global.privacyNote'))}</p>
    </section>
  `
}

function renderArcadeRank(): string {
  syncSelfBestsToBoard(state.arcadeId)
  const ranks = rankingForGame(state.arcadeId, 8)
  const myName = getArcadePlayerName()
  const rows =
    ranks.length === 0
      ? `<li class="arcade-rank-empty">아직 기록이 없습니다. 플레이 후 공유하세요.</li>`
      : ranks
          .map((e, i) => {
            const me = e.source === 'self' ? ' me' : ''
            return `<li class="arcade-rank-row${me}"><span class="arcade-rank-pos">${i + 1}</span><span class="arcade-rank-name">${escapeHtml(e.name)}</span><span class="arcade-rank-score">Lv.${e.level} · ${e.score}</span></li>`
          })
          .join('')
  const importBlock = state.arcadeImportOpen
    ? `
      <form id="arcade-import-form" class="arcade-import">
        <textarea name="code" rows="4" placeholder="카톡으로 받은 기록 문구 전체, 또는 AIZIO-ARCADE|… 코드" required></textarea>
        <div class="row-btns">
          <button type="submit" class="primary-btn">순위 반영</button>
          <button type="button" class="ghost-btn" data-action="close-arcade-import">취소</button>
        </div>
      </form>`
    : ''
  return `
    <div class="arcade-rank" data-arcade-rank="1">
      <div class="arcade-rank-head">
        <strong>친구 순위 · ${escapeHtml(ARCADE_META[state.arcadeId].title)}</strong>
        <form id="arcade-name-form" class="arcade-name-form">
          <input id="arcade-name" name="name" maxlength="16" value="${escapeAttr(myName)}" placeholder="닉네임" aria-label="닉네임" />
          <button type="submit" class="ghost-btn tiny">저장</button>
        </form>
      </div>
      <ol class="arcade-rank-list">${rows}</ol>
      <div class="row-btns arcade-rank-actions">
        <button type="button" class="primary-btn" data-action="share-arcade-score">내 기록 공유</button>
        <button type="button" class="ghost-btn" data-action="open-arcade-import">친구 기록 받기</button>
      </div>
      ${importBlock}
      <p class="hint arcade-rank-hint">카톡 공유 문구 전체를 붙여넣어도 됩니다. QR·코드로 친구 기록을 모아 순위를 만듭니다. 이 기기에만 저장됩니다.</p>
    </div>
  `
}

function renderGames(): string {
  const best = loadArcadeBest()
  const meta = ARCADE_META[state.arcadeId]
  // Guard removed games (과일받기/두더지/차피하기) from older sessions
  if (!(state.arcadeId in ARCADE_META)) state.arcadeId = 'shooter'
  const tabs = (Object.keys(ARCADE_META) as ArcadeId[])
    .map((id) => {
      const neu = id === 'dash'
      return `<button type="button" class="game-tab ${state.arcadeId === id ? 'active' : ''}${neu ? ' is-new' : ''}" data-arcade="${id}">${ARCADE_META[id].title}${neu ? '<span class="game-tab-new">NEW</span>' : ''}</button>`
    })
    .join('')
  const hi = best[state.arcadeId]
  const bestLv = loadArcadeBestLevel()[state.arcadeId]
  const controls =
    state.arcadeId === 'flappy' || state.arcadeId === 'dash'
      ? `<p class="game-meta">${state.arcadeId === 'dash' ? '자동 스크롤 · 지면에서 탭 점프 · 가시·블록 피하기 · 효과음' : '화면 탭으로 점프'} · 게임오버 시 화면 탭</p>`
      : state.arcadeId === 'slide'
        ? `<p class="game-meta">타일 탭 또는 스와이프로 빈칸으로 밀기 · 시간 안에 클리어 · 게임오버 시 화면 탭</p>`
        : state.arcadeId === 'gyeokpa'
          ? `<p class="game-meta">드래그 이동 · 자동사격 · 웨이브·보스 · 무기(펄스→트윈→스프레드) · 라이프·실드·폭탄 · 게임오버 시 화면 탭</p>`
          : state.arcadeId === 'breakout' || state.arcadeId === 'pong' || state.arcadeId === 'dodge'
            ? `<p class="game-meta">좌우 드래그 · 게임오버 시 화면 탭</p>`
            : `<p class="game-meta">좌우 드래그 · 자동발사 · 초록 M / 금색 W(Lv20+) 아이템 · 게임오버 시 화면 탭</p>`

  return `
    <section class="panel view-scroll games-panel">
      <h2 class="section-title">ARCADE</h2>
      <p class="hint">오프라인 아케이드 · 8종 · v${APP_VERSION}</p>
      <p class="hint arcade-new-hint">새 게임 · 지오대시 (탭 점프 · 효과음)</p>
      <div class="game-tabs">${tabs}</div>
      <div class="arcade-toolbar">
        <div class="arcade-hud">Lv.${state.arcadeLevel} · SCORE ${state.arcadeScore} · BEST ${hi ?? '—'} · BEST Lv.${bestLv ?? '—'}</div>
        <button type="button" class="arcade-restart-btn" data-arcade-restart="1">다시 시작</button>
      </div>
      <p class="hint">${escapeHtml(meta.blurb)}</p>
      ${renderArcadeRank()}
      <div class="arcade-stage">
        <canvas id="arcade-canvas" width="360" height="440"></canvas>
      </div>
      ${controls}
    </section>
  `
}

function mountActiveArcade(): void {
  stopArcade()
  const canvas = document.getElementById('arcade-canvas') as HTMLCanvasElement | null
  if (!canvas || state.view !== 'games') return
  state.arcadeScore = 0
  state.arcadeLevel = 1
  arcade = mountArcade(state.arcadeId, canvas, (n, lv) => {
    state.arcadeScore = n
    state.arcadeLevel = lv
    const hud = document.querySelector('.arcade-hud')
    if (hud) {
      const best = loadArcadeBest()[state.arcadeId]
      const bestLv = loadArcadeBestLevel()[state.arcadeId]
      hud.textContent = `Lv.${lv} · SCORE ${n} · BEST ${best ?? '—'} · BEST Lv.${bestLv ?? '—'}`
    }
  })

  const toLocal = (ev: TouchEvent | MouseEvent) => {
    const rect = canvas.getBoundingClientRect()
    if ('touches' in ev) {
      const t = ev.touches[0] || ev.changedTouches[0]
      if (!t) return null
      return { x: t.clientX - rect.left, y: t.clientY - rect.top }
    }
    return { x: ev.clientX - rect.left, y: ev.clientY - rect.top }
  }

  const onDown = (ev: TouchEvent | MouseEvent) => {
    const p = toLocal(ev)
    if (!p) return
    ev.preventDefault()
    if (arcade?.isOver()) {
      arcade.restart()
      state.arcadeScore = 0
      state.arcadeLevel = 1
      const hud = document.querySelector('.arcade-hud')
      const best = loadArcadeBest()[state.arcadeId]
      const bestLv = loadArcadeBestLevel()[state.arcadeId]
      if (hud) hud.textContent = `Lv.1 · SCORE 0 · BEST ${best ?? '—'} · BEST Lv.${bestLv ?? '—'}`
      return
    }
    arcade?.pointer(p.x, p.y, 'down')
  }
  const onMove = (ev: TouchEvent | MouseEvent) => {
    const p = toLocal(ev)
    if (!p) return
    ev.preventDefault()
    arcade?.pointer(p.x, p.y, 'move')
  }
  const onUp = (ev: TouchEvent | MouseEvent) => {
    const p = toLocal(ev)
    if (!p) return
    arcade?.pointer(p.x, p.y, 'up')
  }
  canvas.addEventListener('touchstart', onDown, { passive: false })
  canvas.addEventListener('touchmove', onMove, { passive: false })
  canvas.addEventListener('touchend', onUp)
  canvas.addEventListener('mousedown', onDown)
  canvas.addEventListener('mousemove', onMove)
  canvas.addEventListener('mouseup', onUp)
}

function renderHomeRoomCard(box: SpaceInboxSummary): string {
  if (!box.hasRoom) {
    return `
      <button type="button" class="home-room-card empty" data-view="${box.kind}">
        <div class="home-room-head">
          <strong>${box.kind === 'family' ? '가족 방' : '친구 방'}</strong>
          <span class="home-room-count">없음</span>
        </div>
        <p class="hint">${box.kind === 'family' ? '가족' : '친구'} 탭에서 방을 만들거나 참여하세요.</p>
      </button>`
  }
  const recent =
    box.recent.length > 0
      ? box.recent
          .map(
            (m) =>
              `<li><span class="home-room-who">${escapeHtml(m.mine ? '나' : m.authorName)}</span> ${escapeHtml(m.text)}</li>`,
          )
          .join('')
      : '<li class="muted">아직 대화가 없습니다.</li>'
  const unread =
    box.unread > 0 ? `<span class="home-room-badge">${box.unread > 99 ? '99+' : box.unread}</span>` : ''
  return `
    <button type="button" class="home-room-card ${box.unread ? 'has-unread' : ''}" data-view="${box.kind}">
      <div class="home-room-head">
        <strong>${escapeHtml(box.name)}</strong>
        ${unread}
        <span class="home-room-count">대화 ${box.total}개</span>
      </div>
      <ul class="home-room-recent">${recent}</ul>
    </button>`
}

/** Expandable family/friends inbox on the chat home. */
function renderHomeRoomsPanel(compact = false): string {
  const inbox = getHomeSpaceInbox()
  const famLabel = inbox.family.hasRoom
    ? `가족 ${inbox.family.total}${inbox.family.unread ? ` · 새 ${inbox.family.unread}` : ''}`
    : '가족 없음'
  const frLabel = inbox.friends.hasRoom
    ? `친구 ${inbox.friends.total}${inbox.friends.unread ? ` · 새 ${inbox.friends.unread}` : ''}`
    : '친구 없음'
  const autoOpen = inbox.unreadTotal > 0 || !compact
  const open =
    state.homeRoomsOpen === null ? autoOpen : state.homeRoomsOpen
  const openAttr = open ? ' open' : ''
  return `
    <details class="home-rooms ${compact ? 'compact' : ''}" data-home-rooms="1"${openAttr}>
      <summary class="home-rooms-summary">
        <span class="home-rooms-title">대화방</span>
        <span class="home-rooms-stats">
          <span class="${inbox.family.unread ? 'hot' : ''}">${escapeHtml(famLabel)}</span>
          <span class="dot">·</span>
          <span class="${inbox.friends.unread ? 'hot' : ''}">${escapeHtml(frLabel)}</span>
        </span>
        <span class="home-rooms-chevron" aria-hidden="true"></span>
      </summary>
      <div class="home-rooms-body">
        ${renderHomeRoomCard(inbox.family)}
        ${renderHomeRoomCard(inbox.friends)}
      </div>
    </details>
  `
}

function renderHomeWidget(): string {
  const s = buildHomeSummary(state.weather)
  const todos =
    s.todos.length > 0
      ? s.todos.map((t) => `<li>${escapeHtml(t)}</li>`).join('')
      : '<li class="muted">할 일 없음</li>'
  return `
    <div class="home-widget" data-home-widget="1">
      <div class="home-widget-top">
        <div>
          <p class="home-kicker">TODAY</p>
          <strong class="home-weather">${escapeHtml(s.weatherLine)}</strong>
        </div>
        <div class="home-widget-actions">
          <button type="button" class="ghost-btn tiny" data-action="open-share-app" aria-label="앱 공유">QR</button>
        </div>
      </div>
      <div class="home-grid">
        <div>
          <span class="home-label">할 일</span>
          <ul class="home-todos">${todos}</ul>
        </div>
        <div>
          <span class="home-label">오늘 지출</span>
          <p class="home-value">${escapeHtml(s.spendLabel)}</p>
          <span class="home-label">다음 알림</span>
          <p class="home-value small">${escapeHtml(s.nextAlarm || '없음')}</p>
        </div>
      </div>
      ${renderHomeRoomsPanel(false)}
    </div>
  `
}

function renderShareModal(): string {
  if (!state.shareModal) return ''
  const title =
    state.shareModal === 'app'
      ? '앱 공유 QR'
      : state.shareModal === 'arcade'
        ? '게임 기록 공유'
        : state.shareModal === 'invite'
          ? state.shareInviteKind === 'family'
            ? '가족 초대'
            : '친구 초대'
          : '백업 QR / 공유'
  const actions =
    state.shareModal === 'app'
      ? `
            <button type="button" class="primary-btn" data-action="share-app-native">공유하기</button>
            <button type="button" class="ghost-btn" data-action="copy-app-link">링크 복사</button>
          `
      : state.shareModal === 'arcade'
        ? `
            <button type="button" class="primary-btn" data-action="share-arcade-native">공유하기</button>
            <button type="button" class="ghost-btn" data-action="copy-arcade-score">코드 복사</button>
          `
        : state.shareModal === 'invite'
          ? `
            <button type="button" class="primary-btn" data-action="share-invite-native">공유하기</button>
            <button type="button" class="ghost-btn" data-action="copy-invite-code">코드 복사</button>
            <button type="button" class="ghost-btn" data-action="copy-invite-text">초대 문구 복사</button>
            <button type="button" class="ghost-btn" data-action="copy-invite-link">링크 복사</button>
          `
          : `
            <button type="button" class="primary-btn" data-action="share-backup-native">백업 공유</button>
            <button type="button" class="ghost-btn" data-action="export">파일 저장</button>
          `
  const inviteBlock =
    state.shareModal === 'invite'
      ? `
        <div class="invite-code-block">
          <span class="invite-code-label">초대 코드 · v${APP_VERSION}</span>
          <input class="invite-code-input" data-invite-select="code" readonly value="${escapeAttr(state.shareInviteCode)}" aria-label="초대 코드" />
          <p class="hint">친구가 링크를 열어 <strong>승인하고 입장</strong>하면 끝입니다.</p>
        </div>`
      : ''
  const statusClass =
    state.shareStatusOk === true ? ' ok' : state.shareStatusOk === false ? ' err' : ''
  const inviteFallback =
    state.shareModal === 'invite'
      ? `<label class="hint">초대 문구 (길게 눌러 복사 가능)</label>
         <textarea class="invite-copy-box" data-invite-select="text" readonly rows="5" aria-label="초대 문구">${escapeHtml(state.shareInviteText)}</textarea>
         <p class="hint">복사 버튼이 막힌 환경(일부 인앱 브라우저)에서는 <strong>공유하기</strong>를 쓰세요.</p>`
      : ''
  return `
    <div class="share-modal" role="dialog" aria-modal="true" aria-label="${title}" data-action="close-share-backdrop">
      <div class="share-sheet" data-share-sheet="1">
        <div class="share-sheet-head">
          <strong>${title} <span class="ver">v${APP_VERSION}</span></strong>
          <button type="button" class="ghost-btn tiny" data-action="close-share">닫기</button>
        </div>
        ${inviteBlock}
        <div class="share-qr">${state.shareQrSvg || '<p class="hint">QR 생성 중…</p>'}</div>
        <p class="hint share-hint">${escapeHtml(state.shareHint || appShareUrl())}</p>
        <div class="row-btns">
          ${actions}
        </div>
        <p class="share-status${statusClass}" data-share-status="1">${escapeHtml(state.shareStatus || '복사·공유 버튼을 눌러 보세요')}</p>
        ${inviteFallback}
      </div>
    </div>
  `
}

/** Message list HTML shared by unified HOME and legacy chat. */
function renderChatMessagesHtml(): string {
  const empty = state.messages.length === 0
  const navCards = empty ? '' : renderNavChatCardsHtml()
  if (empty) {
    return `
      <div class="home-v2-voice" data-voice-state="${escapeAttr(
        state.listening ? 'listening' : state.busy ? 'thinking' : 'idle',
      )}">
        <button type="button"
          class="home-v2-orb ${state.listening ? 'listening' : ''} ${state.busy ? 'busy' : ''}"
          data-action="mic"
          data-home-v2-orb="1"
          aria-label="AIZIO 음성 입력"
          aria-pressed="${state.listening ? 'true' : 'false'}">
          <span class="home-v2-orb-ring" aria-hidden="true"></span>
          <span class="home-v2-orb-core">A</span>
        </button>
        <p class="home-v2-brand">AIZIO</p>
        <p class="home-v2-prompt" id="voice-caption" data-home-v2-prompt="1">${escapeHtml(
          state.listening ? state.voiceHint || '듣고 있습니다…' : '무엇을 도와드릴까요?',
        )}</p>
      </div>`
  }
  return state.messages
    .map((m, idx, arr) => {
      const mine = m.role === 'user'
      const name = mine ? state.settings.displayName || 'YOU' : 'AIZIO'
      const clock = formatChatClock(m.createdAt)
      const avatar = mine
        ? avatarButtonHtml({
            name,
            src: state.settings.avatarDataUrl,
            mine: true,
          })
        : `<button type="button" class="msg-avatar-btn aizio" data-profile-open="1" data-profile-name="AIZIO" data-profile-src="" data-profile-mine="0" aria-label="AIZIO">
            <span class="msg-avatar-letter">A</span>
          </button>`
      const attachCards = !mine && idx === arr.length - 1 && navCards ? navCards : ''
      return `
          <div class="msg-row ${mine ? 'user' : 'assistant'}">
            ${avatar}
            <div class="msg-col">
              <div class="msg-head">
                <span class="msg-name">${escapeHtml(name)}</span>
                ${clock ? `<time class="msg-time">${clock}</time>` : ''}
              </div>
              <div class="msg-bubble ${mine ? 'user' : 'assistant'}">${escapeHtml(m.text)}${
                !mine && m.musicNeedsGesture ? renderMusicPlayChip(m.musicPlayUrl, true) : ''
              }</div>
              ${!mine && m.lifeCards?.length ? renderLos2CardsForMessage(m) : ''}
              ${attachCards}
            </div>
          </div>`
    })
    .join('')
}

function renderLos2CardsForMessage(m: ChatMessage): string {
  try {
    return renderLifeOs2CardsHtml(m.lifeCards)
  } catch {
    return ''
  }
}

/** Unified HOME — dashboard + conversation on one screen. */
function renderHomeV2View(): string {
  try {
    const model = buildHomeV2Model({
      weather: state.weather,
      listening: state.listening,
      busy: state.busy,
      draft: state.draft,
    })
    // Translate chips live behind the single badge (no duplicate 번역 잠금 + version bar)
    const wizard = shouldShowAiWizard() ? renderAiWizardHtml() : ''
    const tools =
      state.messages.length > 0
        ? `<div class="chat-tools home-v2-chat-tools">
            <button type="button" class="ghost-btn tiny danger-btn" data-action="clear-chat" aria-label="지난 대화 삭제">대화 초기화</button>
          </div>`
        : ''
    // Empty HOME already has #voice-caption on the orb — do not duplicate the id.
    const voiceHint =
      state.messages.length === 0
        ? ''
        : `<div id="voice-caption" class="voice-caption ${state.listening ? 'live' : ''}" data-voice-caption="1" ${
            state.listening || state.voiceHint ? '' : 'hidden'
          }>${escapeHtml(state.listening ? state.voiceHint || '듣고 있습니다… 말씀해 주세요' : state.voiceHint)}</div>`
    return renderHomeV2Shell(model, {
      draft: state.draft,
      busy: state.busy,
      listening: state.listening,
      appVersion: APP_VERSION,
      moreOpen: state.homeV2MoreOpen,
      composerExtraHtml: `${renderMusicMiniPlayer(
        state.musicSession || sessionSnapshot(),
        state.musicPlayerOpen,
      )}`,
      threadHtml: renderChatMessagesHtml(),
      aboveThreadHtml: `${wizard}${tools}${renderHomeLos2StripHtml(buildHomeLos2Signals())}`,
      voiceHintHtml: voiceHint,
    })
  } catch (err) {
    const code = err instanceof Error ? err.name || 'HomeV2Error' : 'HomeV2Error'
    recordDiagError(`home_v2_fallback:${code}`)
    writeStoredHomeVariant('legacy')
    showFlash('새 홈 화면을 불러오지 못해 기존 홈으로 전환했습니다.')
    return renderChat()
  }
}

function renderNavSettingsSection(): string {
  const nav = loadNavigationSettings()
  const homeAddr = nav.home?.addressText || ''
  const workAddr = nav.work?.addressText || ''
  const favList =
    nav.favorites.length === 0
      ? '<p class="hint">저장된 즐겨찾기가 없습니다.</p>'
      : `<ul class="home-v2-card-list" data-nav-fav-list>
          ${nav.favorites
            .map(
              (f) => `<li>
                <span>${escapeHtml(f.label || f.placeName || '즐겨찾기')}</span>
                <button type="button" class="ghost-btn tiny" data-action="nav-remove-fav" data-fav-id="${escapeAttr(f.id)}" aria-label="즐겨찾기 삭제">삭제</button>
              </li>`,
            )
            .join('')}
        </ul>`
  return `
    <details class="device-test-panel" data-nav-settings="1" open>
      <summary><strong>길안내 및 지도</strong></summary>
      <p class="hint">기본은 <strong>AIZIO 내부 지도</strong>입니다. 외부 앱(카카오·T맵 등)은 보조 「다른 지도에서 열기」로만 사용합니다. 좌표·경로는 서버에 저장하지 않습니다.</p>
      <div class="row-btns">
        <button type="button" class="primary-btn" data-view="navigation">내부 길안내 열기</button>
      </div>
      <p class="hint">음성 안내: ${loadNavV2Settings().voiceEnabled ? '켜짐' : '꺼짐'} · 기본 이동수단: ${loadNavV2Settings().travelMode}</p>
      <div class="row-btns">
        <button type="button" class="ghost-btn" data-action="navv2-toggle-voice">음성 안내 켜기/끄기</button>
        <button type="button" class="ghost-btn" data-action="navv2-clear-recent">최근 검색 초기화</button>
        <button type="button" class="ghost-btn danger-btn" data-action="navv2-clear-all">길안내 데이터 전체 삭제</button>
      </div>
      <p class="hint">지도 타일: OpenFreeMap(또는 VITE_AIZIO_MAP_STYLE_URL) · 장소검색: 로컬 카탈로그(+선택 원격) · 경로: OSRM/대략 · 실시간 교통 미반영</p>
      <h3 class="subsection-title">보조 · 다른 지도에서 열기 기본값</h3>
      <label>기본 지도 앱
        <select name="navDefaultMap" data-nav-field="defaultMap">
          <option value="kakao" ${nav.defaultMap === 'kakao' ? 'selected' : ''}>카카오맵 (추천)</option>
          <option value="tmap" ${nav.defaultMap === 'tmap' ? 'selected' : ''}>T맵</option>
          <option value="naver" ${nav.defaultMap === 'naver' ? 'selected' : ''}>네이버지도</option>
          <option value="apple" ${nav.defaultMap === 'apple' ? 'selected' : ''}>Apple 지도</option>
          <option value="google" ${nav.defaultMap === 'google' ? 'selected' : ''}>Google 지도</option>
          <option value="system" ${nav.defaultMap === 'system' ? 'selected' : ''}>자동 (한국어→카카오)</option>
        </select>
      </label>
      <label>기본 이동수단
        <select name="navDefaultTravel" data-nav-field="defaultTravel">
          <option value="unspecified" ${nav.defaultTravelMode === 'unspecified' ? 'selected' : ''}>지정 없음</option>
          <option value="driving" ${nav.defaultTravelMode === 'driving' ? 'selected' : ''}>자동차</option>
          <option value="walking" ${nav.defaultTravelMode === 'walking' ? 'selected' : ''}>도보</option>
          <option value="transit" ${nav.defaultTravelMode === 'transit' ? 'selected' : ''}>대중교통</option>
          <option value="bicycling" ${nav.defaultTravelMode === 'bicycling' ? 'selected' : ''}>자전거</option>
        </select>
      </label>
      <label>집 주소
        <input type="text" data-nav-home-addr value="${escapeAttr(homeAddr)}" placeholder="예: 울산광역시 …" autocomplete="street-address" />
      </label>
      <div class="row-btns">
        <button type="button" class="ghost-btn" data-action="nav-save-home">집 저장</button>
        <button type="button" class="ghost-btn" data-action="nav-clear-home">집 지우기</button>
      </div>
      <label>회사 주소
        <input type="text" data-nav-work-addr value="${escapeAttr(workAddr)}" placeholder="예: 서울특별시 …" autocomplete="street-address" />
      </label>
      <div class="row-btns">
        <button type="button" class="ghost-btn" data-action="nav-save-work">회사 저장</button>
        <button type="button" class="ghost-btn" data-action="nav-clear-work">회사 지우기</button>
      </div>
      <h3 class="subsection-title">즐겨찾는 장소</h3>
      ${favList}
      <label>이름
        <input type="text" data-nav-fav-label placeholder="예: 헬스장" autocomplete="off" />
      </label>
      <label>주소 · 장소
        <input type="text" data-nav-fav-addr placeholder="예: 울산역" autocomplete="off" />
      </label>
      <div class="row-btns">
        <button type="button" class="ghost-btn" data-action="nav-add-fav">즐겨찾기 추가</button>
      </div>
      <p class="hint" data-nav-perm-status>위치 권한: 확인 중…</p>
      <div class="row-btns">
        <button type="button" class="ghost-btn" data-action="nav-request-location">위치 권한 요청</button>
        <button type="button" class="ghost-btn" data-action="nav-clear-session">최근 길안내 상태 초기화</button>
        <button type="button" class="ghost-btn" data-action="nav-test-map">지도 연결 테스트</button>
      </div>
    </details>
  `
}

function renderChatOrHomeV2(): string {
  if (activeHomeVariant() !== 'v2') {
    return renderChat()
  }
  // Single unified home (dashboard + chat) — no separate 대화 pane.
  state.homeV2Pane = 'home'
  return renderHomeV2View()
}

function renderNavChatCardsHtml(): string {
  try {
    const raw = sessionStorage.getItem('aizio.navV2.chatCards.v1')
    if (!raw) return ''
    const data = JSON.parse(raw) as {
      query?: string
      candidates?: Array<{ id: string; name: string; address: string; distanceM?: number | null; category?: string }>
      catalogOnly?: boolean
      showAll?: boolean
    }
    const all = Array.isArray(data.candidates) ? data.candidates : []
    if (!all.length) return ''
    const showAll = Boolean(data.showAll)
    const list = showAll ? all.slice(0, 10) : all.slice(0, 3)
    const cards = list
      .map((c, i) => {
        const dist =
          c.distanceM != null && Number.isFinite(c.distanceM)
            ? `${(c.distanceM / 1000).toFixed(1)}km`
            : '거리 미확인'
        return `<article class="navv2-chat-card" data-navv2-chat-pick="${i + 1}">
          <span class="navv2-chat-n">${i + 1}</span>
          <div class="navv2-chat-body">
            <strong>${escapeHtml(c.name)}</strong>
            <small>${escapeHtml(c.category || '장소')} · ${escapeHtml(c.address)}</small>
            <small>${escapeHtml(dist)}</small>
          </div>
          <button type="button" class="ghost-btn tiny" data-navv2-chat-select="${i + 1}">선택</button>
        </article>`
      })
      .join('')
    const more =
      !showAll && all.length > 3
        ? `<button type="button" class="ghost-btn tiny" data-navv2-chat-more="1">나머지 ${all.length - 3}곳 보기</button>`
        : ''
    return `<div class="navv2-chat-cards" data-navv2-chat-cards="1">
      <div class="navv2-chat-cards-head">
        <strong>「${escapeHtml(data.query || '검색')}」 후보 ${all.length}곳</strong>
        ${data.catalogOnly ? '<span class="navv2-catalog-note">로컬 카탈로그</span>' : ''}
      </div>
      <div class="navv2-chat-cards-list">${cards}</div>
      <div class="row-btns">
        ${more}
        <button type="button" class="primary-btn tiny" data-navv2-chat-map="1">지도에서 보기</button>
        <button type="button" class="ghost-btn tiny" data-navv2-chat-dismiss="1">닫기</button>
      </div>
    </div>`
  } catch {
    return ''
  }
}

function renderChat(): string {
  const mode = loadInterpretMode()
  const empty = state.messages.length === 0
  const navCards = empty ? '' : renderNavChatCardsHtml()
  const body = empty
    ? `
        <div class="hero-empty">
          <div class="big-orb"></div>
          <h2>AIZIO</h2>
          <p>말로 쓰는 일상 비서입니다.<br/>메시지를 보내거나 MIC로 말해 보세요.<br/><strong>사용설명서</strong>를 누르면 한눈에 볼 수 있어요.</p>
          ${state.showInstall ? `<p class="hint hero-install-hint">홈 화면 설치 방법은 화면 위 안내를 보세요. 아이콘으로 실행하면 안내가 사라집니다.</p>` : ''}
          <div class="chips">
            ${SUGGESTIONS.map((s) => `<button type="button" data-suggest="${escapeAttr(s)}">${escapeHtml(s)}</button>`).join('')}
          </div>
        </div>
      `
    : state.messages
        .map((m, idx, arr) => {
          const mine = m.role === 'user'
          const name = mine ? state.settings.displayName || 'YOU' : 'AIZIO'
          const clock = formatChatClock(m.createdAt)
          const avatar = mine
            ? avatarButtonHtml({
                name,
                src: state.settings.avatarDataUrl,
                mine: true,
              })
            : `<button type="button" class="msg-avatar-btn aizio" data-profile-open="1" data-profile-name="AIZIO" data-profile-src="" data-profile-mine="0" aria-label="AIZIO">
                <span class="msg-avatar-letter">A</span>
              </button>`
          const attachCards = !mine && idx === arr.length - 1 && navCards ? navCards : ''
          return `
          <div class="msg-row ${mine ? 'user' : 'assistant'}">
            ${avatar}
            <div class="msg-col">
              <div class="msg-head">
                <span class="msg-name">${escapeHtml(name)}</span>
                ${clock ? `<time class="msg-time">${clock}</time>` : ''}
              </div>
              <div class="msg-bubble ${mine ? 'user' : 'assistant'}">${escapeHtml(m.text)}${
                !mine && m.musicNeedsGesture
                  ? renderMusicPlayChip(m.musicPlayUrl, true)
                  : ''
              }</div>
              ${!mine && m.lifeCards?.length ? renderLos2CardsForMessage(m) : ''}
              ${attachCards}
            </div>
          </div>`
        })
        .join('')

  const lockBar = `
    <details class="translate-bar ${mode.active ? 'on' : ''}" ${mode.active ? 'open' : ''}>
      <summary class="translate-bar-head">
        <strong>${mode.active ? `번역 중 → ${escapeHtml(mode.langB.toUpperCase())}` : '번역 잠금'}</strong>
        <span class="ver">v${APP_VERSION}</span>
      </summary>
      <div class="translate-chips">
        ${TRANSLATE_LANGS.map(
          (l) =>
            `<button type="button" class="${mode.active && mode.langB === l.code ? 'active' : ''}" data-translate-cmd="${escapeAttr(l.cmd)}">${escapeHtml(l.label)}</button>`,
        ).join('')}
        <button type="button" class="stop-btn" data-translate-stop="1">스톱</button>
      </div>
      <p class="translate-hint">${
        mode.active
          ? 'MIC로 한국말만 하세요. 끝내려면 스톱을 누르세요.'
          : '언어 버튼 → 말한 뒤 스톱 · v' + APP_VERSION
      }</p>
    </details>
  `

  // Always show on chat home (empty hero) and in active threads — was hidden when empty
  const chatTools = `
      <div class="chat-tools">
        <button type="button" class="ghost-btn tiny danger-btn" data-action="clear-chat" aria-label="지난 대화 삭제">대화 초기화</button>
      </div>`

  const wizard = shouldShowAiWizard() ? renderAiWizardHtml() : ''

  return `
    <section class="panel chat-panel chat-shell">
      ${empty ? renderHomeWidget() : renderHomeRoomsPanel(true)}
      ${wizard}
      ${chatTools}
      <div class="messages chat-thread" id="chat-thread">${body}</div>
      <div id="voice-caption" class="voice-caption ${state.listening ? 'live' : ''}" data-voice-caption="1" ${state.listening || state.voiceHint ? '' : 'hidden'}>${escapeHtml(
        state.listening ? state.voiceHint || '듣고 있습니다… 말씀해 주세요' : state.voiceHint,
      )}</div>
      <div class="composer-dock">
        ${lockBar}
        ${renderMusicMiniPlayer(state.musicSession || sessionSnapshot(), state.musicPlayerOpen)}
        <form class="composer chat-composer" id="composer">
          <button type="button" class="icon-btn ${state.listening ? 'listening' : ''}" data-action="mic" aria-label="음성 입력" aria-pressed="${state.listening ? 'true' : 'false'}">${state.listening ? 'STOP' : 'MIC'}</button>
          <input id="draft" type="text" enterkeyhint="send" autocomplete="off" placeholder="${
            mode.active ? '한국말로 입력 → 번역' : state.listening ? '음성 인식 중…' : 'AIZIO에게 메시지…'
          }" value="${escapeAttr(state.draft)}" ${state.busy ? 'disabled' : ''} />
          <button class="primary-btn send-btn" type="submit" ${state.busy ? 'disabled' : ''}>전송</button>
        </form>
      </div>
    </section>
  `
}

function renderInvest(): string {
  const holdings = loadHoldings()
  const watch = loadWatchlist()
  const trades = loadTrades().slice(0, 8)

  return `
    <section class="panel view-scroll">
      <h2 class="section-title">INVEST · 주식엔진</h2>
      <p class="hint">AIZIO 주식엔진 v2 — 멀티팩터 스크리닝 · 종목분석 · 포트 비중. Yahoo 시세 참고용(투자 권유 아님).</p>
      <div class="chips left">
        <button type="button" data-suggest="주식 종목 추천">엔진 스크리닝</button>
        <button type="button" data-suggest="반도체 종목 추천">반도체</button>
        <button type="button" data-suggest="미국 보수 종목 추천">미국·보수</button>
        <button type="button" data-suggest="삼성전자 종목분석">종목분석</button>
        <button type="button" data-suggest="포트폴리오">포트폴리오</button>
        <button type="button" data-suggest="관심종목 목록">관심 시세</button>
        <button type="button" data-suggest="장시간">장 시간</button>
        <button type="button" data-suggest="환율">환율</button>
      </div>

      <h2 class="section-title">HOLDINGS</h2>
      <form id="invest-holding-form" class="settings-form life-input-form">
        <label>종목 <input name="ticker" required maxlength="40" placeholder="삼성전자 또는 AAPL" autocomplete="off" /></label>
        <label>수량(주) <input name="shares" type="number" inputmode="decimal" step="any" min="0" required placeholder="10" /></label>
        <label>평단가 <input name="avg" type="number" inputmode="decimal" step="any" min="0" required placeholder="70000" /></label>
        <button class="primary-btn" type="submit">보유 등록</button>
      </form>
      ${
        holdings.length === 0
          ? '<div class="empty">위에서 종목·수량·평단을 입력하세요.</div>'
          : holdings
              .map((h) => {
                const q = state.quoteCache[h.symbol]
                const price = q?.price ?? h.avgPrice
                const pnl = (price - h.avgPrice) * h.shares
                const pnlPct = h.avgPrice ? ((price - h.avgPrice) / h.avgPrice) * 100 : 0
                return `
                <div class="list-item">
                  <div class="body">
                    <strong>${escapeHtml(h.name)} <span class="tag">${escapeHtml(h.symbol)}</span></strong>
                    <p>${h.shares}주 · 평단 ${formatMoney(h.avgPrice, h.currency)}
                    ${q ? ` · 현재 ${formatMoney(q.price, q.currency)}` : ''}
                    <br/><span class="${pnl >= 0 ? 'up' : 'down'}">${pnl >= 0 ? '+' : ''}${formatMoney(pnl, h.currency)} (${pnlPct.toFixed(1)}%)</span></p>
                  </div>
                  <button type="button" data-del-holding="${escapeAttr(h.symbol)}">삭제</button>
                </div>`
              })
              .join('')
      }

      <h2 class="section-title">WATCHLIST</h2>
      <form id="invest-watch-form" class="settings-form life-input-form">
        <label>종목 <input name="ticker" required maxlength="40" placeholder="엔비디아 / NVDA" autocomplete="off" /></label>
        <label>목표가 (선택) <input name="target" type="number" inputmode="decimal" step="any" min="0" placeholder="선택" /></label>
        <button class="primary-btn" type="submit">관심종목 추가</button>
      </form>
      ${
        watch.length === 0
          ? '<div class="empty">위에서 관심 종목을 추가하세요.</div>'
          : watch
              .map((w) => {
                const q = state.quoteCache[w.symbol]
                return `
                <div class="list-item">
                  <div class="body">
                    <strong>${escapeHtml(w.name)}</strong>
                    <p>${q ? escapeHtml(formatQuote(q).split('\n').slice(0, 2).join(' · ')) : escapeHtml(w.symbol)}
                    ${w.targetPrice ? `<br/>목표가 ${w.targetPrice}` : ''}</p>
                  </div>
                  <button type="button" data-quote="${escapeAttr(w.symbol)}">시세</button>
                  <button type="button" data-del-watch="${escapeAttr(w.symbol)}">삭제</button>
                </div>`
              })
              .join('')
      }

      <h2 class="section-title">TRADE NOTES</h2>
      <form id="invest-trade-form" class="settings-form life-input-form">
        <label>종목 <input name="ticker" required maxlength="40" placeholder="삼성전자" autocomplete="off" /></label>
        <label>구분
          <select name="side">
            <option value="buy">매수</option>
            <option value="sell">매도</option>
            <option value="watch">관망</option>
            <option value="idea">아이디어</option>
          </select>
        </label>
        <label>메모 <input name="thesis" required maxlength="200" placeholder="반도체 회복 기대" /></label>
        <button class="primary-btn" type="submit">노트 저장</button>
      </form>
      ${
        trades.length === 0
          ? '<div class="empty">위에서 매매 노트를 남기세요.</div>'
          : trades
              .map(
                (t) => `
          <div class="list-item">
            <div class="body">
              <strong>[${t.side}] ${escapeHtml(t.symbol)}</strong>
              <p>${escapeHtml(t.thesis)}</p>
            </div>
            <button type="button" data-del-trade="${t.id}">삭제</button>
          </div>`,
              )
              .join('')
      }
      <button type="button" class="ghost-btn" data-action="refresh-quotes">시세 새로고침</button>
    </section>
  `
}

function renderLife(): string {
  const shopping = loadShopping()
  const expenses = loadExpenses().slice(0, 8)
  const habits = loadHabits()
  const reminders = loadReminders().slice(0, 8)
  const memories = loadMemory().slice(0, 6)
  const journals = loadJournal().slice(0, 5)
  const totals = expenseTotals()
  const seriesList = loadSeriesList()
  const activeName = getActiveSeriesName()
  const active = seriesList.find((s) => s.name.toLowerCase() === activeName.toLowerCase())
  const activeStats = active && active.values.length ? formatDescriptive(active.name, active.values) : ''

  return `
    <section class="panel view-scroll">
      <details class="life-os-panel" open>
        <summary><strong>내 생활 · AIZIO Life OS</strong></summary>
        <p class="hint">대화로 DNA·목표·아이디어·프로젝트를 관리합니다. 예: 「나는 짧은 답변이 좋아」「내 목표는 …」「아이디어 저장」</p>
        <div class="chips left">
          <button type="button" data-suggest="내가 무엇을 좋아한다고 기억하고 있어?">DNA</button>
          <button type="button" data-suggest="목표 목록 보여줘">목표</button>
          <button type="button" data-suggest="아이디어 목록">아이디어</button>
          <button type="button" data-suggest="AIZIO 프로젝트 어디까지 됐어?">프로젝트</button>
          <button type="button" data-suggest="오늘 뭐 해야 해?">오늘</button>
          <button type="button" data-suggest="스킬 목록">Skill</button>
        </div>
      </details>
      <h2 class="section-title">STATS</h2>
      <p class="hint">아래에 숫자를 직접 입력하세요. 활성: <strong>${escapeHtml(activeName)}</strong> (n=${active?.values.length ?? 0})</p>
      <form id="life-stats-form" class="settings-form life-input-form">
        <label>데이터셋 이름
          <input name="name" maxlength="40" value="${escapeAttr(activeName)}" placeholder="기본" autocomplete="off" />
        </label>
        <label>숫자 입력 (공백·쉼표로 구분)
          <input name="values" inputmode="decimal" required placeholder="예: 1.2 -0.5 3.1 4" autocomplete="off" />
        </label>
        <div class="toggle-row"><span>기존 값 덮어쓰기</span><input type="checkbox" name="replace" /></div>
        <button class="primary-btn" type="submit">숫자 넣기</button>
      </form>
      <div class="chips left">
        <button type="button" data-action="life-stats-analyze">지금 분석</button>
        <button type="button" data-suggest="데이터셋 목록">데이터셋</button>
        <button type="button" data-suggest="통계 도움말">사용법</button>
        <button type="button" data-suggest="시세기록 삼성전자">시세 기록</button>
      </div>
      ${
        seriesList.length === 0
          ? '<div class="empty">숫자를 입력하면 데이터셋이 생깁니다.</div>'
          : seriesList
              .slice(0, 8)
              .map((s) => {
                const preview = s.values.slice(-4).join(', ')
                return `
                <div class="list-item">
                  <div class="body">
                    <strong>${s.name === activeName ? '▶ ' : ''}${escapeHtml(s.name)} <span class="tag">n=${s.values.length}</span></strong>
                    <p>${preview ? escapeHtml(preview) : '비어 있음'}</p>
                  </div>
                  <button type="button" data-stats-use="${escapeAttr(s.name)}">분석</button>
                  <button type="button" data-del-series="${escapeAttr(s.name)}">삭제</button>
                </div>`
              })
              .join('')
      }
      ${activeStats ? `<pre class="stats-report">${escapeHtml(activeStats)}</pre>` : ''}

      <h2 class="section-title">LIFE</h2>
      <p class="hint">오늘 ${formatMoney(totals.today, 'KRW')} · 이번달 ${formatMoney(totals.month, 'KRW')}</p>
      <div class="chips left">
        <button type="button" data-suggest="오늘 날씨 알려줘">오늘 날씨</button>
        <button type="button" data-suggest="브리핑">브리핑</button>
        <button type="button" data-suggest="환율">환율</button>
        <button type="button" data-suggest="알림 30분 뒤 약">30분 알림</button>
      </div>

      <h2 class="section-title">TODO</h2>
      <form id="life-todo-form" class="settings-form life-input-form">
        <label>할 일
          <input name="text" required maxlength="120" placeholder="운동하기" autocomplete="off" />
        </label>
        <button class="primary-btn" type="submit">추가</button>
      </form>
      ${
        reminders.length === 0
          ? '<div class="empty">할 일을 입력해 추가하세요.</div>'
          : reminders
              .map(
                (r) => `
          <div class="list-item">
            <button type="button" data-toggle-reminder="${r.id}">${r.done ? '✓' : '○'}</button>
            <div class="body"><strong style="${r.done ? 'opacity:.5;text-decoration:line-through' : ''}">${escapeHtml(r.text)}</strong>${
              r.when ? `<p class="hint">${escapeHtml(r.when)}</p>` : ''
            }</div>
            <button type="button" data-del-reminder="${r.id}">삭제</button>
          </div>`,
              )
              .join('')
      }

      <h2 class="section-title">SHOPPING</h2>
      <form id="life-shop-form" class="settings-form life-input-form">
        <label>장바구니 품목 (공백으로 여러 개)
          <input name="items" required maxlength="200" placeholder="우유 계란 빵" autocomplete="off" />
        </label>
        <button class="primary-btn" type="submit">담기</button>
      </form>
      ${
        shopping.length === 0
          ? '<div class="empty">품목을 입력해 담으세요.</div>'
          : shopping
              .map(
                (s) => `
          <div class="list-item">
            <button type="button" data-toggle-shop="${s.id}">${s.done ? '✓' : '○'}</button>
            <div class="body"><strong style="${s.done ? 'opacity:.5;text-decoration:line-through' : ''}">${escapeHtml(s.name)}</strong></div>
            <button type="button" data-del-shop="${s.id}">삭제</button>
          </div>`,
              )
              .join('')
      }

      <h2 class="section-title">HABITS</h2>
      <form id="life-habit-form" class="settings-form life-input-form">
        <label>습관 이름
          <input name="name" required maxlength="40" placeholder="운동" autocomplete="off" />
        </label>
        <button class="primary-btn" type="submit">습관 추가</button>
      </form>
      ${
        habits.length === 0
          ? '<div class="empty">습관을 추가한 뒤 «완료»를 누르세요.</div>'
          : habits
              .map(
                (h) => `
          <div class="list-item">
            <div class="body"><strong>${escapeHtml(h.name)}</strong><p>연속 ${h.streak}일 ${h.lastDone ? `· 최근 ${h.lastDone}` : ''}</p></div>
            <button type="button" data-check-habit="${escapeAttr(h.id)}">완료</button>
            <button type="button" data-del-habit="${h.id}">삭제</button>
          </div>`,
              )
              .join('')
      }

      <h2 class="section-title">EXPENSES</h2>
      <form id="life-expense-form" class="settings-form life-input-form">
        <label>금액
          <input name="amount" type="number" inputmode="numeric" min="1" step="1" required placeholder="4500" />
        </label>
        <label>항목
          <input name="category" required maxlength="40" placeholder="커피 / 택시 / 식비" autocomplete="off" />
        </label>
        <label>메모 (선택)
          <input name="note" maxlength="80" placeholder="선택" autocomplete="off" />
        </label>
        <button class="primary-btn" type="submit">지출 기록</button>
      </form>
      <p class="hint">오늘 ${formatMoney(totals.today, 'KRW')} · 이번달 ${formatMoney(totals.month, 'KRW')}</p>
      ${
        expenses.length === 0
          ? '<div class="empty">금액과 항목을 입력해 기록하세요.</div>'
          : expenses
              .map(
                (e) => `
          <div class="list-item">
            <div class="body"><strong>${escapeHtml(e.category)} ${formatMoney(e.amount, 'KRW')}</strong><p>${escapeHtml(e.note || '')}</p></div>
            <button type="button" data-del-expense="${e.id}">삭제</button>
          </div>`,
              )
              .join('')
      }

      <h2 class="section-title">JOURNAL</h2>
      <form id="life-journal-form" class="settings-form life-input-form">
        <label>오늘 일기
          <textarea name="text" rows="3" required maxlength="1000" placeholder="오늘 있었던 일을 적어 주세요"></textarea>
        </label>
        <label>기분 (선택)
          <input name="mood" maxlength="20" placeholder="좋음 / 보통 / 피곤" autocomplete="off" />
        </label>
        <button class="primary-btn" type="submit">일기 저장</button>
      </form>
      ${
        journals.length === 0
          ? '<div class="empty">일기를 입력해 저장하세요.</div>'
          : journals
              .map(
                (j) => `
          <div class="list-item">
            <div class="body">
              <strong>${j.mood ? escapeHtml(j.mood) + ' · ' : ''}${new Date(j.createdAt).toLocaleString('ko-KR')}</strong>
              <p>${escapeHtml(j.text)}</p>
            </div>
          </div>`,
              )
              .join('')
      }

      <h2 class="section-title">MEMORY</h2>
      <form id="life-memory-form" class="settings-form life-input-form">
        <label>키
          <input name="key" required maxlength="40" placeholder="와이파이" autocomplete="off" />
        </label>
        <label>값
          <input name="value" required maxlength="200" placeholder="cafe123" autocomplete="off" />
        </label>
        <button class="primary-btn" type="submit">기억하기</button>
      </form>
      ${
        memories.length === 0
          ? '<div class="empty">키와 값을 입력해 기억하세요.</div>'
          : memories
              .map(
                (m) => `
          <div class="list-item">
            <div class="body"><strong>${escapeHtml(m.key)}</strong><p>${escapeHtml(m.value)}</p></div>
            <button type="button" data-del-memory="${m.id}">삭제</button>
          </div>`,
              )
              .join('')
      }
    </section>
  `
}

function renderCustomers(): string {
  const q = state.customerQuery.trim()
  const all = loadCustomers()
  const items = q ? findCustomers(q) : all
  const today = customersWithBirthdayToday()
  const list =
    items.length === 0
      ? `<div class="empty">${q ? '검색 결과가 없습니다.' : '아직 손님이 없습니다. 이름과 생일을 추가해 보세요.'}</div>`
      : items
          .map((c) => {
            const bday = formatBirthdayDisplay(c.birthday)
            const meta = [bday, c.phone, c.memo].filter(Boolean).join(' · ')
            return `
          <div class="list-item customer-item" data-customer-id="${escapeAttr(c.id)}">
            <div class="body">
              <strong>${escapeHtml(c.name)}</strong>
              <p>${escapeHtml(meta || '메모 없음')}</p>
            </div>
            <button type="button" class="ghost-btn tiny" data-action="customer-delete" data-customer-id="${escapeAttr(c.id)}">삭제</button>
          </div>`
          })
          .join('')
  const todayBlock =
    today.length === 0
      ? '<p class="hint">오늘 생일인 손님은 없습니다.</p>'
      : `<ul class="customer-today-list">${today
          .map((c) => `<li><strong>${escapeHtml(c.name)}</strong> · ${escapeHtml(formatBirthdayDisplay(c.birthday))}</li>`)
          .join('')}</ul>`

  return `
    <section class="panel view-scroll customers-panel" data-customers="1">
      <h2 class="section-title">손님관리</h2>
      <p class="hint">비즈니스용 손님 명단입니다. 이름·생년월일로 바로 찾을 수 있어요. 이 기기 로컬에만 저장되며 서버로 보내지 않습니다.</p>
      <div class="customer-today">
        <h3 class="subsection-title">오늘 생일</h3>
        ${todayBlock}
      </div>
      <form id="customer-search-form" class="settings-form life-input-form">
        <label>바로 찾기
          <input name="q" value="${escapeAttr(state.customerQuery)}" placeholder="이름 · 메모 · 전화" autocomplete="off" />
        </label>
        <div class="row-btns">
          <button class="primary-btn" type="submit">검색</button>
          <button type="button" class="ghost-btn" data-action="customer-clear-search">전체</button>
        </div>
      </form>
      <h3 class="subsection-title">손님 추가</h3>
      <form id="customer-add-form" class="settings-form life-input-form">
        <label>이름
          <input name="name" required maxlength="40" placeholder="예: 김철수" autocomplete="name" />
        </label>
        <label>생년월일
          <input name="birthday" inputmode="numeric" placeholder="예: 1990-05-15 또는 05-15" autocomplete="bday" />
        </label>
        <label>전화 (선택)
          <input name="phone" inputmode="tel" maxlength="40" placeholder="010-…" autocomplete="tel" />
        </label>
        <label>메모 (선택)
          <input name="memo" maxlength="200" placeholder="단골 · 선호 메뉴 등" autocomplete="off" />
        </label>
        <button class="primary-btn" type="submit">저장</button>
      </form>
      <h3 class="subsection-title">목록 ${q ? `· 검색 ${items.length}명` : `· ${all.length}명`}</h3>
      ${list}
      <p class="hint">대화로도 가능: 「손님 추가 김철수 1990-05-15」「손님 김철수 찾아줘」「오늘 생일인 손님」</p>
    </section>
  `
}

function todayIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function renderFamily(): string {
  const room = loadFamilyRoom()
  if (!room) {
    return `
      <section class="panel view-scroll family-panel">
        <h2 class="section-title">FAMILY</h2>
        <p class="hint">가족 단체 대화 · 공지 · 일정을 한곳에서. 같은 코드로 참여하면 온라인일 때 서로 동기화됩니다.</p>
        <div class="family-setup">
          <h3>새 가족 공간</h3>
          <form id="family-create" class="settings-form">
            <label>공간 이름
              <input name="name" value="우리 가족" maxlength="40" required />
            </label>
            <label>내 이름
              <input name="member" value="${escapeAttr(state.settings.displayName)}" maxlength="20" required />
            </label>
            <button class="primary-btn" type="submit">만들기</button>
          </form>
          <h3>코드·링크로 참여</h3>
          <form id="family-join" class="settings-form">
            <label>가족 코드 또는 초대 링크·문구
              <textarea name="code" rows="3" placeholder="K7M2PQ 또는 초대 링크/카톡 문구 전체 붙여넣기" autocapitalize="characters" autocomplete="off" spellcheck="false" required>${escapeHtml(state.view === 'family' ? state.prefillJoinCode : '')}</textarea>
            </label>
            <label>내 이름
              <input name="member" value="${escapeAttr(state.settings.displayName)}" maxlength="20" required />
            </label>
            <button class="primary-btn" type="submit">참여</button>
          </form>
          <div class="row-btns invite-scan-row">
            <button type="button" class="ghost-btn" data-action="scan-family-qr">카메라 QR</button>
            <label class="ghost-btn file-scan-btn">사진 QR
              <input type="file" accept="image/*" capture="environment" data-scan-family-file="1" hidden />
            </label>
          </div>
          <p class="hint">iPhone: 사진 QR이 가장 확실합니다. 시스템 카메라로 QR을 스캔하면 링크로 자동 참여합니다.</p>
        </div>
      </section>
    `
  }

  const tabs = (
    [
      ['chat', '대화'],
      ['notices', '공지'],
      ['events', '일정'],
    ] as const
  )
    .map(
      ([id, label]) =>
        `<button type="button" class="family-tab ${state.familyTab === id ? 'active' : ''}" data-family-tab="${id}">${label}</button>`,
    )
    .join('')

  let body = ''
  if (state.familyTab === 'chat') {
    const msgs = room.messages
      .slice(-80)
      .map((m) => spaceChatBubbleHtml(m, room.memberId))
      .join('')
    body = `
      <div class="space-chat-shell">
        <div class="fam-chat chat-thread">${msgs || '<div class="empty">첫 메시지를 남겨 보세요.<br/><span class="hint">가족이 같은 코드로 앱을 열면 대화·이름이 동기화됩니다.</span></div>'}</div>
        <div id="family-voice-caption" class="voice-caption ${state.listening && state.dictationTarget === 'family' ? 'live' : ''}" ${
          state.listening && state.dictationTarget === 'family' || state.voiceHint && state.dictationTarget === 'family' ? '' : 'hidden'
        }>${escapeHtml(
          state.dictationTarget === 'family'
            ? state.listening
              ? state.voiceHint || '듣고 있습니다… 말씀해 주세요'
              : state.voiceHint
            : '',
        )}</div>
        <div class="composer-dock">
          <form id="family-chat-form" class="composer family-composer chat-composer">
            <button type="button" class="icon-btn ${state.listening && state.dictationTarget === 'family' ? 'listening' : ''}" data-action="space-mic" data-space="family" aria-label="음성 입력" aria-pressed="${state.listening && state.dictationTarget === 'family' ? 'true' : 'false'}">${state.listening && state.dictationTarget === 'family' ? 'STOP' : 'MIC'}</button>
            <label class="icon-btn file-scan-btn" title="${escapeAttr(t('chat.media.add'))}">＋
              <input type="file" accept="image/*,video/mp4,video/webm,video/quicktime" data-space-media="family" hidden />
            </label>
            <input id="family-draft" name="text" type="text" placeholder="가족에게 메시지…" maxlength="500" autocomplete="off" />
            <button class="primary-btn send-btn" type="submit">${escapeHtml(t('common.send'))}</button>
          </form>
          <div class="row-btns space-chat-tools">
            <button type="button" class="ghost-btn tiny danger-btn" data-action="family-clear-chat">대화 초기화</button>
          </div>
        </div>
      </div>
    `
  } else if (state.familyTab === 'notices') {
    const list = [...room.notices]
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt - a.updatedAt)
      .map(
        (n) => `
        <div class="list-item fam-notice ${n.pinned ? 'pinned' : ''}">
          <div class="body">
            <strong>${n.pinned ? '[고정] ' : ''}${escapeHtml(n.title)}</strong>
            <p>${escapeHtml(n.body)}</p>
            <p class="hint">${escapeHtml(n.authorName)}</p>
          </div>
          <button type="button" data-del-notice="${escapeAttr(n.id)}">삭제</button>
        </div>`,
      )
      .join('')
    body = `
      <form id="family-notice-form" class="settings-form">
        <label>제목 <input name="title" required maxlength="80" placeholder="주말 가족 회의" /></label>
        <label>내용 <textarea name="body" rows="3" maxlength="1000" placeholder="일요일 오후 2시 거실"></textarea></label>
        <div class="toggle-row"><span>상단 고정</span><input type="checkbox" name="pinned" /></div>
        <button class="primary-btn" type="submit">공지 등록</button>
      </form>
      ${list || '<div class="empty">등록된 공지가 없습니다.</div>'}
    `
  } else {
    const list = [...room.events]
      .sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || ''))
      .map(
        (e) => `
        <div class="list-item">
          <div class="body">
            <strong>${escapeHtml(e.date)}${e.time ? ` ${escapeHtml(e.time)}` : ''} · ${escapeHtml(e.title)}</strong>
            <p>${escapeHtml(e.note || e.authorName)}</p>
          </div>
          <button type="button" data-del-event="${escapeAttr(e.id)}">삭제</button>
        </div>`,
      )
      .join('')
    body = `
      <form id="family-event-form" class="settings-form">
        <label>제목 <input name="title" required maxlength="80" placeholder="병원 예약" /></label>
        <label>날짜 <input name="date" type="date" value="${todayIso()}" required /></label>
        <label>시간 <input name="time" type="time" /></label>
        <label>메모 <input name="note" maxlength="500" placeholder="선택" /></label>
        <button class="primary-btn" type="submit">일정 추가</button>
      </form>
      ${list || '<div class="empty">등록된 일정이 없습니다.</div>'}
    `
  }

  const memberNames = uniqueMemberNames(room.members, room.memberName)
  const members = memberNames.map((n) => escapeHtml(n)).join(' · ')
  const online = getFamilyPeerCount()
  const chatMode = state.familyTab === 'chat'

  return `
    <section class="panel family-panel ${chatMode ? 'space-chat-panel' : 'view-scroll'}">
      <div class="family-head ${chatMode ? 'compact' : ''}">
        <div>
          <h2 class="section-title">${escapeHtml(room.name)}</h2>
          <p class="hint">코드 <strong>${escapeHtml(room.code)}</strong> · ${escapeHtml(state.familySyncStatus)} · 온라인 <strong>${online}</strong></p>
          ${chatMode ? '' : `<p class="hint">등록 멤버 ${memberNames.length}명: ${members}</p>`}
        </div>
      </div>
      ${inviteSwitchBanner('family', room.code)}
      <div class="row-btns ${chatMode ? 'compact-actions' : ''}">
        <button type="button" class="primary-btn" data-action="family-invite">초대 공유</button>
        <button type="button" class="ghost-btn" data-action="family-reconnect">동기화</button>
        <button type="button" class="ghost-btn" data-action="family-leave">나가기</button>
      </div>
      <details class="space-switch ${chatMode ? 'chat-more' : ''}">
        <summary>${chatMode ? '방 설정 · 오프라인 등록' : '오프라인일 때만 · 멤버 수동 등록'}</summary>
        <div class="row-btns">
          <button type="button" class="ghost-btn" data-action="family-join-share">내 참여 확인 보내기</button>
        </div>
        <form id="family-join-receipt" class="settings-form">
          <label>가족이 보낸 참여 확인 문구
            <textarea name="receipt" rows="3" placeholder="AIZIO 가족 참여 확인 … 붙여넣기" required></textarea>
          </label>
          <button class="primary-btn" type="submit">멤버로 등록</button>
        </form>
        <p class="hint">보통은 초대 링크만으로 멤버가 자동 등록됩니다.</p>
        <form id="family-switch" class="settings-form">
          <label>다른 코드로 전환
            <textarea name="code" rows="2" placeholder="새 가족 코드 또는 링크" required></textarea>
          </label>
          <button class="primary-btn" type="submit">전환 참여</button>
        </form>
      </details>
      <div class="family-tabs">${tabs}</div>
      ${body}
    </section>
  `
}

function renderFriends(): string {
  const room = loadFriendsRoom()
  if (!room) {
    return `
      <section class="panel view-scroll family-panel friends-panel">
        <h2 class="section-title">FRIENDS</h2>
        <p class="hint">친구 단체 대화 · 공지 · 일정을 한곳에서. 같은 코드로 참여하면 온라인일 때 서로 동기화됩니다. 게임 순위는 게임 탭에서 공유하세요.</p>
        <div class="family-setup">
          <h3>새 친구 공간</h3>
          <form id="friends-create" class="settings-form">
            <label>공간 이름
              <input name="name" value="우리 친구" maxlength="40" required />
            </label>
            <label>내 이름
              <input name="member" value="${escapeAttr(state.settings.displayName)}" maxlength="20" required />
            </label>
            <button class="primary-btn" type="submit">만들기</button>
          </form>
          <h3>코드·링크로 참여</h3>
          <form id="friends-join" class="settings-form">
            <label>친구 코드 또는 초대 링크·문구
              <textarea name="code" rows="3" placeholder="K7M2PQ 또는 초대 링크/카톡 문구 전체 붙여넣기" autocapitalize="characters" autocomplete="off" spellcheck="false" required>${escapeHtml(state.view === 'friends' ? state.prefillJoinCode : '')}</textarea>
            </label>
            <label>내 이름
              <input name="member" value="${escapeAttr(state.settings.displayName)}" maxlength="20" required />
            </label>
            <button class="primary-btn" type="submit">참여</button>
          </form>
          <div class="row-btns invite-scan-row">
            <button type="button" class="ghost-btn" data-action="scan-friends-qr">카메라 QR</button>
            <label class="ghost-btn file-scan-btn">사진 QR
              <input type="file" accept="image/*" capture="environment" data-scan-friends-file="1" hidden />
            </label>
          </div>
          <p class="hint">iPhone: 사진 QR이 가장 확실합니다. 시스템 카메라로 QR을 스캔하면 링크로 자동 참여합니다.</p>
        </div>
      </section>
    `
  }

  const tabs = (
    [
      ['chat', '대화'],
      ['notices', '공지'],
      ['events', '일정'],
    ] as const
  )
    .map(
      ([id, label]) =>
        `<button type="button" class="family-tab ${state.friendsTab === id ? 'active' : ''}" data-friends-tab="${id}">${label}</button>`,
    )
    .join('')

  let body = ''
  if (state.friendsTab === 'chat') {
    const msgs = room.messages
      .slice(-80)
      .map((m) => spaceChatBubbleHtml(m, room.memberId))
      .join('')
    body = `
      <div class="space-chat-shell">
        <div class="fam-chat friends-chat chat-thread">${msgs || '<div class="empty">첫 메시지를 남겨 보세요.<br/><span class="hint">친구가 같은 코드로 앱을 열면 대화·이름이 동기화됩니다.</span></div>'}</div>
        <div id="friends-voice-caption" class="voice-caption ${state.listening && state.dictationTarget === 'friends' ? 'live' : ''}" ${
          state.listening && state.dictationTarget === 'friends' || state.voiceHint && state.dictationTarget === 'friends' ? '' : 'hidden'
        }>${escapeHtml(
          state.dictationTarget === 'friends'
            ? state.listening
              ? state.voiceHint || '듣고 있습니다… 말씀해 주세요'
              : state.voiceHint
            : '',
        )}</div>
        <div class="composer-dock">
          <form id="friends-chat-form" class="composer family-composer chat-composer">
            <button type="button" class="icon-btn ${state.listening && state.dictationTarget === 'friends' ? 'listening' : ''}" data-action="space-mic" data-space="friends" aria-label="음성 입력" aria-pressed="${state.listening && state.dictationTarget === 'friends' ? 'true' : 'false'}">${state.listening && state.dictationTarget === 'friends' ? 'STOP' : 'MIC'}</button>
            <label class="icon-btn file-scan-btn" title="${escapeAttr(t('chat.media.add'))}">＋
              <input type="file" accept="image/*,video/mp4,video/webm,video/quicktime" data-space-media="friends" hidden />
            </label>
            <input id="friends-draft" name="text" type="text" placeholder="친구에게 메시지…" maxlength="500" autocomplete="off" />
            <button class="primary-btn send-btn" type="submit">${escapeHtml(t('common.send'))}</button>
          </form>
          <div class="row-btns space-chat-tools">
            <button type="button" class="ghost-btn tiny danger-btn" data-action="friends-clear-chat">대화 초기화</button>
          </div>
        </div>
      </div>
    `
  } else if (state.friendsTab === 'notices') {
    const list = [...room.notices]
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt - a.updatedAt)
      .map(
        (n) => `
        <div class="list-item fam-notice ${n.pinned ? 'pinned' : ''}">
          <div class="body">
            <strong>${n.pinned ? '[고정] ' : ''}${escapeHtml(n.title)}</strong>
            <p>${escapeHtml(n.body)}</p>
            <p class="hint">${escapeHtml(n.authorName)}</p>
          </div>
          <button type="button" data-del-friends-notice="${escapeAttr(n.id)}">삭제</button>
        </div>`,
      )
      .join('')
    body = `
      <form id="friends-notice-form" class="settings-form">
        <label>제목 <input name="title" required maxlength="80" placeholder="주말 모임" /></label>
        <label>내용 <textarea name="body" rows="3" maxlength="1000" placeholder="토요일 오후 3시 카페"></textarea></label>
        <div class="toggle-row"><span>상단 고정</span><input type="checkbox" name="pinned" /></div>
        <button class="primary-btn" type="submit">공지 등록</button>
      </form>
      ${list || '<div class="empty">등록된 공지가 없습니다.</div>'}
    `
  } else {
    const list = [...room.events]
      .sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || ''))
      .map(
        (e) => `
        <div class="list-item">
          <div class="body">
            <strong>${escapeHtml(e.date)}${e.time ? ` ${escapeHtml(e.time)}` : ''} · ${escapeHtml(e.title)}</strong>
            <p>${escapeHtml(e.note || e.authorName)}</p>
          </div>
          <button type="button" data-del-friends-event="${escapeAttr(e.id)}">삭제</button>
        </div>`,
      )
      .join('')
    body = `
      <form id="friends-event-form" class="settings-form">
        <label>제목 <input name="title" required maxlength="80" placeholder="영화 보기" /></label>
        <label>날짜 <input name="date" type="date" value="${todayIso()}" required /></label>
        <label>시간 <input name="time" type="time" /></label>
        <label>메모 <input name="note" maxlength="500" placeholder="선택" /></label>
        <button class="primary-btn" type="submit">일정 추가</button>
      </form>
      ${list || '<div class="empty">등록된 일정이 없습니다.</div>'}
    `
  }

  const memberNames = uniqueMemberNames(room.members, room.memberName)
  const members = memberNames.map((n) => escapeHtml(n)).join(' · ')
  const online = getFriendsPeerCount()
  const chatMode = state.friendsTab === 'chat'

  return `
    <section class="panel family-panel friends-panel ${chatMode ? 'space-chat-panel' : 'view-scroll'}">
      <div class="family-head friends-head ${chatMode ? 'compact' : ''}">
        <div>
          <h2 class="section-title">${escapeHtml(room.name)}</h2>
          <p class="hint">코드 <strong>${escapeHtml(room.code)}</strong> · ${escapeHtml(state.friendsSyncStatus)} · 온라인 <strong>${online}</strong></p>
          ${chatMode ? '' : `<p class="hint">등록 멤버 ${memberNames.length}명: ${members}</p>`}
        </div>
      </div>
      ${inviteSwitchBanner('friends', room.code)}
      <div class="row-btns ${chatMode ? 'compact-actions' : ''}">
        <button type="button" class="primary-btn" data-action="friends-invite">초대 공유</button>
        <button type="button" class="ghost-btn" data-action="friends-reconnect">동기화</button>
        <button type="button" class="ghost-btn" data-action="friends-leave">나가기</button>
      </div>
      <details class="space-switch ${chatMode ? 'chat-more' : ''}">
        <summary>${chatMode ? '방 설정 · 오프라인 등록' : '오프라인일 때만 · 멤버 수동 등록'}</summary>
        <div class="row-btns">
          <button type="button" class="ghost-btn" data-action="friends-join-share">내 참여 확인 보내기</button>
        </div>
        <form id="friends-join-receipt" class="settings-form">
          <label>친구가 보낸 참여 확인 문구
            <textarea name="receipt" rows="3" placeholder="AIZIO 친구 참여 확인 … 붙여넣기" required></textarea>
          </label>
          <button class="primary-btn" type="submit">멤버로 등록</button>
        </form>
        <p class="hint">보통은 초대 링크만으로 멤버가 자동 등록됩니다.</p>
        <form id="friends-switch" class="settings-form">
          <label>다른 코드로 전환
            <textarea name="code" rows="2" placeholder="새 친구 코드 또는 링크" required></textarea>
          </label>
          <button class="primary-btn" type="submit">전환 참여</button>
        </form>
      </details>
      <div class="family-tabs">${tabs}</div>
      ${body}
    </section>
  `
}

function renderActions(): string {
  return `
    <section class="panel view-scroll">
      <h2 class="section-title">QUICK RUN</h2>
      <p class="hint">버튼을 누르면 앱·웹·카메라·AIZIO 설정으로 바로 연결됩니다. 카카오톡·메모·캘린더는 iPhone에 해당 앱이 있어야 열립니다.</p>
      <div class="action-grid">
        <button type="button" class="action-card" data-view="customers">
          <span>CRM</span>
          <span>손님관리</span>
        </button>
        <button type="button" class="action-card" data-action="open-share-app">
          <span>QR</span>
          <span>앱 공유</span>
        </button>
        <button type="button" class="action-card" data-action="share-backup-native">
          <span>BK</span>
          <span>백업 공유</span>
        </button>
        ${quickActions
          .map(
            (a) => `
          <button type="button" class="action-card" data-quick="${a.id}">
            <span>${a.icon}</span>
            <span>${a.label}</span>
          </button>
        `,
          )
          .join('')}
      </div>
    </section>
  `
}

function renderSettings(): string {
  const s = state.settings
  const pushPerm =
    typeof Notification === 'undefined'
      ? '미지원'
      : Notification.permission === 'granted'
        ? '허용됨'
        : Notification.permission === 'denied'
          ? '차단됨'
          : '미요청'
  return `
    <section class="panel view-scroll">
      <h2 class="section-title">SETTINGS</h2>
      ${renderUpdateCard()}
      <form class="settings-form" id="settings-form">
        <div class="profile-picker">
          <button type="button" class="profile-picker-avatar ${s.avatarDataUrl ? 'has-photo' : ''}" data-profile-open="1" data-profile-name="${escapeAttr(s.displayName)}" data-profile-src="${escapeAttr(s.avatarDataUrl || '')}" data-profile-mine="1" aria-label="내 프로필">
            ${
              s.avatarDataUrl
                ? `<img src="${escapeAttr(s.avatarDataUrl)}" alt="" />`
                : `<span>${escapeHtml(chatAvatarLetter(s.displayName))}</span>`
            }
          </button>
          <div class="profile-picker-meta">
            <strong>프로필 사진</strong>
            <p class="hint">대화창 아바타에 표시됩니다. 탭해서 선택하세요.</p>
            <div class="row-btns">
              <button type="button" class="primary-btn" data-action="pick-avatar">사진 선택</button>
              ${s.avatarDataUrl ? `<button type="button" class="ghost-btn" data-action="clear-avatar">제거</button>` : ''}
            </div>
          </div>
        </div>
        <label>호칭
          <input name="displayName" value="${escapeAttr(s.displayName)}" />
        </label>
        <label>기본 도시
          <input name="city" value="${escapeAttr(s.city)}" placeholder="서울" />
        </label>
        <label>${escapeHtml(t('settings.language.title'))}
          <select name="appLocale">
            ${supportedAppLocales()
              .map(
                (code) =>
                  `<option value="${code}" ${getAppLocale() === code ? 'selected' : ''}>${localeNativeName(code)}</option>`,
              )
              .join('')}
          </select>
        </label>
        <p class="hint">${escapeHtml(t('settings.language.help'))}</p>
        <h3 class="subsection-title">${escapeHtml(t('settings.translation.title'))}</h3>
        <div class="toggle-row"><span>${escapeHtml(t('settings.translation.auto'))}</span>
          <input type="checkbox" name="autoTranslateMessages" ${s.autoTranslateMessages !== false ? 'checked' : ''} /></div>
        <div class="toggle-row"><span>${escapeHtml(t('settings.translation.showOriginal'))}</span>
          <input type="checkbox" name="showOriginalText" ${s.showOriginalText ? 'checked' : ''} /></div>
        <label>${escapeHtml(t('settings.translation.target'))}
          <select name="translationLocale">
            ${supportedAppLocales()
              .map(
                (code) =>
                  `<option value="${code}" ${(s.translationLocale || 'ko') === code ? 'selected' : ''}>${localeNativeName(code)}</option>`,
              )
              .join('')}
          </select>
        </label>
        <div class="toggle-row">
          <span>답변 읽어주기</span>
          <input type="checkbox" name="speakReplies" ${s.speakReplies ? 'checked' : ''} />
        </div>
        <h3 class="subsection-title">${escapeHtml(t('music.settingsTitle'))}</h3>
        <p class="hint">대화·음성으로 음악을 요청하면 YouTube 검색으로 연결합니다. API 키 없이 안전한 검색 링크를 엽니다.</p>
        ${(() => {
          const mp = loadMusicPreferences()
          return `
        <label>${escapeHtml(t('music.preferredProvider'))}
          <select name="musicProvider">
            <option value="youtube" ${mp.preferredMusicProvider === 'youtube' ? 'selected' : ''}>YouTube</option>
            <option value="youtube_music" ${mp.preferredMusicProvider === 'youtube_music' ? 'selected' : ''}>YouTube Music</option>
            <option value="spotify" ${mp.preferredMusicProvider === 'spotify' ? 'selected' : ''}>Spotify (검색 링크)</option>
            <option value="apple_music" ${mp.preferredMusicProvider === 'apple_music' ? 'selected' : ''}>Apple Music (검색 링크)</option>
          </select>
        </label>
        <div class="toggle-row"><span>${escapeHtml(t('music.openExternal'))}</span>
          <input type="checkbox" name="musicOpenExternal" ${mp.openInExternalApp ? 'checked' : ''} /></div>
        <div class="toggle-row"><span>${escapeHtml(t('music.rememberSearches'))}</span>
          <input type="checkbox" name="musicRememberSearches" ${mp.rememberRecentMusicSearches !== false ? 'checked' : ''} /></div>
        <div class="toggle-row"><span>${escapeHtml(t('music.preferInstrumental'))}</span>
          <input type="checkbox" name="musicPreferInstrumental" ${mp.preferInstrumental ? 'checked' : ''} /></div>`
        })()}
        <h3 class="subsection-title">채팅 알림</h3>
        <div class="toggle-row">
          <span>가족 대화 알림</span>
          <input type="checkbox" name="notifyFamilyChat" ${s.notifyFamilyChat !== false ? 'checked' : ''} />
        </div>
        <div class="toggle-row">
          <span>친구 대화 알림</span>
          <input type="checkbox" name="notifyFriendsChat" ${s.notifyFriendsChat !== false ? 'checked' : ''} />
        </div>
        <div class="toggle-row">
          <span>해당 탭을 보고 있을 때도 알림</span>
          <input type="checkbox" name="notifyWhileOpen" ${s.notifyWhileOpen ? 'checked' : ''} />
        </div>
        <p class="hint">알림 권한: <strong>${escapeHtml(pushPerm)}</strong>. 가족·친구 채팅 백그라운드 푸시는 홈 화면 PWA + 아래 버튼으로 켤 수 있습니다. 개인 일정(스마트 리마인더)의 앱 종료 알림은 푸시 서버가 필요하며, 서버 없이는 완성되지 않습니다.</p>
        <label>일정 알림 내용 표시
          <select name="notifyPrivacyMode">
            <option value="simple" ${(s.notifyPrivacyMode || 'simple') === 'simple' ? 'selected' : ''}>간단히 (예약된 일정 시간입니다)</option>
            <option value="hidden" ${s.notifyPrivacyMode === 'hidden' ? 'selected' : ''}>숨기기 (AIZIO 알림이 있습니다)</option>
            <option value="full" ${s.notifyPrivacyMode === 'full' ? 'selected' : ''}>전체 내용</option>
          </select>
        </label>
        <p class="hint">기본은 간단 표시입니다. 가족·건강 관련 일정은 「전체」를 고르지 않으면 잠금 화면에 세부 내용을 넣지 않습니다.</p>
        <label>푸시 서버 URL (선택 · 종료 상태 개인 알림)
          <input name="pushServerBaseUrl" value="${escapeAttr(s.pushServerBaseUrl || '')}" placeholder="https://your-push-server.example" autocomplete="off" />
        </label>
        <button type="button" class="primary-btn" data-action="enable-chat-push">알림 권한 · 백그라운드 푸시 켜기</button>
        <button type="button" class="ghost-btn" data-action="reminder-push-status">개인 알림(종료 상태) 준비 상태</button>
        <details class="device-test-panel" open>
          <summary><strong>실기기 테스트 모드 · 푸시</strong></summary>
          <p class="hint">버전·권한·푸시·스토리지 진단. API 키·VAPID 비밀키·endpoint 전체값은 표시하지 않습니다. 완전 종료 수신은 사용자가 확인하기 전까지 <strong>실기기 검증 대기</strong>입니다.</p>
          <pre class="device-diag-out hint" data-device-diag-out>진단을 불러오려면 아래 버튼을 누르세요.</pre>
          <div class="row-btns">
            <button type="button" class="primary-btn" data-action="device-diag-refresh">진단 새로고침</button>
            <button type="button" class="ghost-btn" data-action="device-diag-export">진단 JSON 내보내기</button>
          </div>
          <h3 class="subsection-title">푸시 실기기 테스트</h3>
          <div class="row-btns">
            <button type="button" class="ghost-btn" data-action="push-test-health">서버 연결 확인</button>
            <button type="button" class="ghost-btn" data-action="push-test-subscribe">권한·구독</button>
          </div>
          <div class="row-btns">
            <button type="button" class="primary-btn" data-action="push-test-1m">1분 후 테스트 알림</button>
            <button type="button" class="ghost-btn" data-action="push-test-5m">5분 후 테스트 알림</button>
          </div>
          <div class="row-btns">
            <button type="button" class="ghost-btn" data-action="push-test-update">예약 변경(+3분)</button>
            <button type="button" class="ghost-btn" data-action="push-test-cancel">예약 취소</button>
            <button type="button" class="ghost-btn" data-action="push-test-unsub">구독 해제</button>
          </div>
          <div class="row-btns">
            <button type="button" class="ghost-btn" data-action="push-test-copy">테스트 결과 복사</button>
          </div>
          <pre class="device-diag-out hint" data-push-test-out>푸시 테스트 결과가 여기에 표시됩니다.</pre>
        </details>
        ${renderNavSettingsSection()}
        ${renderDesignLabSection({
          active: activeHomeVariant(),
          bootDefault: readBootDefaultHome(),
          visible: designLabVisibleNow(),
        })}
        ${renderHybridAiSettingsHtml()}
        <h3 class="subsection-title">OpenAI (레거시 호환)</h3>
        <label>OpenAI API Key (심화 분석용)
          <input name="apiKey" type="password" value="" placeholder="${escapeAttr(s.apiKey ? '저장됨 · 변경 시에만 입력' : 'sk-...')}" autocomplete="off" />
        </label>
        <label>API Base
          <input name="apiBase" value="${escapeAttr(s.apiBase)}" />
        </label>
        <label>Model
          <input name="model" value="${escapeAttr(s.model)}" />
        </label>
        <button class="primary-btn" type="submit">설정 저장</button>
      </form>
      <div class="row-btns">
        <button type="button" class="primary-btn" data-action="open-share-app">앱 QR 공유</button>
        <button type="button" class="ghost-btn" data-action="open-share-backup">백업 QR</button>
      </div>
      <div class="row-btns">
        <button type="button" class="ghost-btn" data-action="share-backup-native">백업 공유보내기</button>
        <button type="button" class="ghost-btn" data-action="export">파일 저장</button>
        <button type="button" class="ghost-btn" data-action="import">복원</button>
      </div>
      <p class="hint">백업 v8: 대화·생활·투자·가족/친구·관계기억·스마트알림·Life OS·Life OS 2.0·아케이드 포함. API 키는 제외됩니다. 클라우드 자동 복구는 없습니다. 전체 JSON이 크면 QR은 앱 링크·요약으로 대체됩니다.</p>
      <button type="button" class="ghost-btn" data-action="voice-test">음성 시스템 테스트</button>
      <button type="button" class="ghost-btn danger-btn" data-action="clear-chat">지난 대화 삭제 · 대화 초기화</button>
      <button type="button" class="ghost-btn" data-action="hard-refresh">앱 캐시 새로고침 (v${APP_VERSION})</button>
      <p class="hint">홈 화면에 추가한 앱이 예전 버전이면 위쪽 <strong>앱 업데이트</strong>를 누르세요. 시세는 Yahoo Finance 공개 API · 음성은 iPhone Safari + HTTPS가 가장 안정적입니다.</p>
    </section>
  `
}

/**
 * iOS ghost-click guard after innerHTML remount.
 * Prefer point-based blocking (same finger spot) so nearby nav/tab taps stay instant.
 */
let ghostNavGuard = { until: 0, x: -1, y: -1, mode: 'none' as 'none' | 'point' | 'async' }

function armNavGuard(opts?: { x?: number; y?: number; ms?: number; mode?: 'point' | 'async' }): void {
  const mode = opts?.mode || (opts?.x != null && opts?.y != null ? 'point' : 'async')
  const ms = opts?.ms ?? (mode === 'point' ? 340 : 260)
  ghostNavGuard = {
    until: Date.now() + ms,
    x: opts?.x ?? -1,
    y: opts?.y ?? -1,
    mode,
  }
}

function isNavGuarded(ev?: Pick<MouseEvent, 'clientX' | 'clientY'>): boolean {
  if (Date.now() >= ghostNavGuard.until) return false
  if (!ev || ghostNavGuard.mode === 'async' || ghostNavGuard.x < 0 || ghostNavGuard.y < 0) {
    return true
  }
  const dx = ev.clientX - ghostNavGuard.x
  const dy = ev.clientY - ghostNavGuard.y
  return dx * dx + dy * dy < 52 * 52
}

type RenderOpts = {
  /** Pointer that triggered remount — used for point-based ghost guard. */
  pointer?: { x: number; y: number }
  /** false = no guard (rare); 'async' = short blanket; default point/async auto */
  guardNav?: boolean | 'async'
}

/** Soft-refresh space chat without remounting nav (avoids accidental tab jumps). */
function softRefreshSpaceChat(kind: 'family' | 'friends', opts?: { badges?: boolean }): void {
  patchSpaceHead(kind, {
    status: kind === 'family' ? state.familySyncStatus : state.friendsSyncStatus,
    peers: kind === 'family' ? getFamilyPeerCount() : getFriendsPeerCount(),
  })
  appendLiveSpaceChats(kind)
  if (opts?.badges !== false) patchNavBadges()
}

/** Update unread badge on top 메뉴 buttons without remounting the shell. */
function patchNavBadges(): void {
  invalidateSpaceInboxCache()
  const inbox = getHomeSpaceInbox()
  const total = inbox.unreadTotal || 0
  const label = total > 99 ? '99+' : String(total)
  document.querySelectorAll<HTMLElement>('[data-action="home-v2-nav-more"]').forEach((btn) => {
    const existing = btn.querySelector('.nav-badge, .header-menu-badge')
    if (total > 0) {
      if (existing) existing.textContent = label
      else btn.insertAdjacentHTML('beforeend', `<span class="nav-badge header-menu-badge">${label}</span>`)
    } else if (existing) {
      existing.remove()
    }
  })
}

function goToView(next: View, ev?: MouseEvent): void {
  const same = next === state.view
  if (same) {
    // Re-tapping FAM/FRD jumps to chat tab (faster than hunting sub-tabs)
    if (next === 'family' && state.familyTab !== 'chat') {
      state.familyTab = 'chat'
      state.homeV2MoreOpen = false
      state.homeV2NavSheetOpen = false
      state.homeV2TranslateSheetOpen = false
      render({ pointer: ev ? { x: ev.clientX, y: ev.clientY } : undefined })
      return
    }
    if (next === 'friends' && state.friendsTab !== 'chat') {
      state.friendsTab = 'chat'
      state.homeV2MoreOpen = false
      state.homeV2NavSheetOpen = false
      state.homeV2TranslateSheetOpen = false
      render({ pointer: ev ? { x: ev.clientX, y: ev.clientY } : undefined })
      return
    }
    if (state.homeV2MoreOpen || state.homeV2NavSheetOpen || state.homeV2TranslateSheetOpen) {
      state.homeV2MoreOpen = false
      state.homeV2NavSheetOpen = false
      state.homeV2TranslateSheetOpen = false
      render({ pointer: ev ? { x: ev.clientX, y: ev.clientY } : undefined })
    }
    return
  }
  stopArcade()
  stopSpeaking()
  voice.stop()
  state.listening = false
  // Navigation must never use pathname routes — hash + view state only.
  if (next === 'navigation') {
    state.homeV2TranslateSheetOpen = false
    openNavInternal({ source: 'go_to_view', pushHistory: true })
    return
  }
  state.homeV2MoreOpen = false
  state.homeV2NavSheetOpen = false
  state.homeV2TranslateSheetOpen = false
  state.view = next
  if (next === 'family') state.familyTab = 'chat'
  if (next === 'friends') state.friendsTab = 'chat'
  syncHashFromApp({ view: next, replace: false })
  render({ pointer: ev ? { x: ev.clientX, y: ev.clientY } : undefined })
  if (state.view === 'invest') void refreshQuotes()
}

function goToSpaceTab(kind: 'family' | 'friends', next: 'chat' | 'notices' | 'events', ev?: MouseEvent): void {
  if (kind === 'family') {
    if (next === state.familyTab) return
    state.familyTab = next
  } else {
    if (next === state.friendsTab) return
    state.friendsTab = next
  }
  render({ pointer: ev ? { x: ev.clientX, y: ev.clientY } : undefined })
}

function render(opts: RenderOpts = {}): void {
  const app = document.getElementById('app')
  if (!app) return
  try {
    renderUnsafe(opts, app)
    markAppBooted()
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    recordDiagError(`render_fail:${msg.slice(0, 80)}`)
    paintBootSplash(`화면 오류: ${msg.slice(0, 100)}`)
    app.insertAdjacentHTML(
      'beforeend',
      `<p style="text-align:center;margin-top:12px"><button type="button" class="primary-btn" id="render-retry">다시 시도</button></p>`,
    )
    document.getElementById('render-retry')?.addEventListener('click', () => {
      try {
        renderUnsafe(opts, app)
        markAppBooted()
      } catch {
        window.location.reload()
      }
    })
  }
}

function renderUnsafe(opts: RenderOpts, app: HTMLElement): void {
  if (!state.locationReady) {
    refreshInstallHint()
    app.innerHTML = `${renderLocationGate()}${renderInstallGuideModal()}`
    bindLocationGate()
    return
  }
  invalidateSpaceInboxCache()
  const homeV2On = activeHomeVariant() === 'v2'
  const main =
    state.view === 'chat'
      ? renderChatOrHomeV2()
      : state.view === 'invest'
        ? renderInvest()
        : state.view === 'life'
          ? renderLife()
          : state.view === 'family'
            ? renderFamily()
            : state.view === 'friends'
              ? renderFriends()
              : state.view === 'global'
                ? renderGlobal()
                : state.view === 'games'
                  ? renderGames()
                  : state.view === 'actions'
                    ? renderActions()
                    : state.view === 'customers'
                      ? renderCustomers()
                      : state.view === 'navigation'
                        ? navRouteError
                          ? `<section class="panel navv2-panel" data-navv2-error="1">
                              <header class="navv2-head">
                                <button type="button" class="ghost-btn tiny" data-action="navv2-home">홈으로</button>
                                <strong>AIZIO 길안내</strong>
                                <span></span>
                              </header>
                              <p class="hint">길안내 화면을 불러오지 못했습니다.</p>
                              <div class="row-btns">
                                <button type="button" class="primary-btn" data-action="navv2-retry">다시 시도</button>
                                <button type="button" class="ghost-btn" data-action="navv2-home">홈으로</button>
                                <button type="button" class="ghost-btn" data-action="navv2-copy-diag">진단 복사</button>
                              </div>
                            </section>`
                          : renderNavigationScreen(state.navV2)
                        : renderSettings()
  const nav = homeV2On
    ? renderHomeV2NavWithPane(state.view, state.homeV2Pane, state.homeV2MoreOpen)
    : renderNav()
  const more = state.homeV2MoreOpen ? renderHomeV2MoreSheet({ showInstall: state.showInstall }) : ''
  const navSheet =
    state.homeV2NavSheetOpen
      ? renderNavigationSheet({
          defaultMap: loadNavigationSettings().defaultMap,
          defaultTravel: loadNavigationSettings().defaultTravelMode,
        })
      : ''
  const translateSheet = state.homeV2TranslateSheetOpen
    ? renderTranslateSheet(state.translateSheet, {
        listening: state.listening && state.dictationTarget === 'translate-sheet',
        voiceHint: state.dictationTarget === 'translate-sheet' ? state.voiceHint : '',
      })
    : ''
  const hideBrand = homeV2On && state.view === 'chat'
  // Install CTA stays visible on HOME — users must be able to add to home screen.
  refreshInstallHint()
  const installHtml = renderInstall()
  app.innerHTML = `${hideBrand ? '' : renderBrand()}${installHtml}${main}${nav}${more}${navSheet}${translateSheet}${renderShareModal()}${renderInstallGuideModal()}`
  document.body.dataset.jarvisView = state.view
  document.body.dataset.homeV2Pane = homeV2On ? 'home' : ''
  document.body.classList.toggle('home-v2-active', homeV2On)
  if (opts.guardNav !== false) {
    if (opts.guardNav === 'async' || !opts.pointer) {
      armNavGuard({ mode: 'async', ms: 260 })
    } else {
      armNavGuard({ mode: 'point', x: opts.pointer.x, y: opts.pointer.y, ms: 340 })
    }
  }
  bind()
  void refreshNavPermStatus()
  if (state.view === 'navigation') {
    if (navRouteError) {
      const panel = document.querySelector('[data-navv2-error="1"]')
      panel?.querySelector('[data-action="navv2-retry"]')?.addEventListener('click', () => {
        navRouteError = null
        openNavInternal({ source: 'nav_retry', query: state.navV2.query, pushHistory: false })
      })
      panel?.querySelector('[data-action="navv2-home"]')?.addEventListener('click', () => goToView('chat'))
      panel?.querySelector('[data-action="navv2-copy-diag"]')?.addEventListener('click', () => {
        const copied = copyTextNow(`nav_error:${navRouteError || 'unknown'}`)
        showFlash(copied.ok ? '진단을 복사했습니다.' : '복사에 실패했습니다.')
      })
    } else {
      const panel = document.querySelector('[data-navv2="1"]') as HTMLElement | null
      if (panel) {
        void bindNavigationScreen(panel, state.navV2, (next) => {
          state.navV2 = { ...state.navV2, ...next }
          if (typeof next.query === 'string') {
            syncHashFromApp({ view: 'navigation', query: next.query, replace: true })
          }
          render({ guardNav: false })
        }).catch((err) => {
          const msg = err instanceof Error ? err.message : String(err)
          navRouteError = msg.slice(0, 120)
          recordDiagError(`navv2_bind_fail:${navRouteError}`)
          render({ guardNav: false })
        })
      }
    }
  } else {
    destroyNavigationScreen()
  }
  if (state.view === 'games') {
    // remount after DOM ready
    requestAnimationFrame(() => mountActiveArcade())
  } else {
    stopArcade()
  }
  if (state.view === 'family' && loadFamilyRoom()) {
    void ensureFamilySyncOnce()
    if (state.familyTab === 'chat') {
      markSpaceInboxSeen('family')
      patchNavBadges()
      scrollSpaceChat('family')
      requestAnimationFrame(() => {
        void hydrateSpaceTranslations()
      })
    }
  }
  if (state.view === 'friends' && loadFriendsRoom()) {
    void ensureFriendsSyncOnce()
    if (state.friendsTab === 'chat') {
      markSpaceInboxSeen('friends')
      patchNavBadges()
      scrollSpaceChat('friends')
      requestAnimationFrame(() => {
        void hydrateSpaceTranslations()
      })
    }
  }
}

let familySyncInFlight: Promise<void> | null = null
let familySyncForceQueued = false
async function ensureFamilySyncOnce(force = false): Promise<void> {
  if (!loadFamilyRoom()) return
  if (force) familySyncForceQueued = true
  if (familySyncInFlight) return familySyncInFlight
  familySyncInFlight = (async () => {
    do {
      const useForce = familySyncForceQueued
      familySyncForceQueued = false
      const r = useForce ? await reconnectFamilySync() : await ensureFamilySync()
      state.familySyncStatus = r.message
      patchSpaceHead('family', { status: r.message, peers: getFamilyPeerCount() })
    } while (familySyncForceQueued)
  })().finally(() => {
    familySyncInFlight = null
  })
  return familySyncInFlight
}

let friendsSyncInFlight: Promise<void> | null = null
let friendsSyncForceQueued = false
async function ensureFriendsSyncOnce(force = false): Promise<void> {
  if (!loadFriendsRoom()) return
  if (force) friendsSyncForceQueued = true
  if (friendsSyncInFlight) return friendsSyncInFlight
  friendsSyncInFlight = (async () => {
    do {
      const useForce = friendsSyncForceQueued
      friendsSyncForceQueued = false
      const r = useForce ? await reconnectFriendsSync() : await ensureFriendsSync()
      state.friendsSyncStatus = r.message
      patchSpaceHead('friends', { status: r.message, peers: getFriendsPeerCount() })
    } while (friendsSyncForceQueued)
  })().finally(() => {
    friendsSyncInFlight = null
  })
  return friendsSyncInFlight
}

/** Patch sync status text without wiping the whole view (avoids rise-animation flicker). */
function patchSpaceHead(
  kind: 'family' | 'friends',
  info: { status: string; peers: number },
): void {
  const room = kind === 'family' ? loadFamilyRoom() : loadFriendsRoom()
  if (!room) return
  const head = document.querySelector(
    kind === 'family' ? '.family-head:not(.friends-head)' : '.friends-head',
  )
  if (!head) return
  // Markup is a single hint: "코드 · status · 온라인 N"
  const hint = head.querySelector('.hint')
  if (hint) {
    hint.innerHTML = `코드 <strong>${escapeHtml(room.code)}</strong> · ${escapeHtml(info.status)} · 온라인 <strong>${info.peers}</strong>`
  }
}

/** Keep MQTT/WebRTC alive for chat alerts even when not on family/friends tab. */
async function bootSpaceSyncAndPush(): Promise<void> {
  const s = loadSettings()
  if (s.notifyFamilyChat !== false || s.notifyFriendsChat !== false) {
    try {
      const { subscribeChatPush } = await import('./chatNotify')
      await subscribeChatPush()
    } catch {
      /* permission may be default until user taps settings */
    }
  }
  if (loadFamilyRoom()) await ensureFamilySyncOnce()
  if (loadFriendsRoom()) await ensureFriendsSyncOnce()
}

/**
 * After app leave/return or network restore.
 * Prefer soft ensure; force only when coming back from background (visibility).
 * Never full-render unless chat data may have arrived — patch status instead.
 */
let resumeSyncTimer = 0
let lastResumeAt = 0
function scheduleResumeSpaceSync(mode: 'soft' | 'force' = 'soft'): void {
  window.clearTimeout(resumeSyncTimer)
  resumeSyncTimer = window.setTimeout(() => {
    if (!state.locationReady) return
    const now = Date.now()
    // Avoid reconnect storms from iOS focus/visibility thrash
    if (mode === 'force' && now - lastResumeAt < 8_000) mode = 'soft'
    if (mode === 'soft' && now - lastResumeAt < 1_200) return
    lastResumeAt = now
    const force = mode === 'force'
    void (async () => {
      if (loadFamilyRoom()) await ensureFamilySyncOnce(force)
      if (loadFriendsRoom()) await ensureFriendsSyncOnce(force)
    })()
  }, mode === 'force' ? 250 : 120)
}

function bindLocationGate(): void {
  document.querySelector('[data-action="allow-location"]')?.addEventListener('click', () => {
    void ensureLocation(true)
  })
  document.querySelector('[data-action="skip-location"]')?.addEventListener('click', () => {
    state.locationSkipped = true
    state.locationReady = true
    state.locationError = ''
    state.locationBusy = false
    applyPendingInvite({ forceView: Boolean(state.pendingInvite) })
    showFlash('오프라인 모드로 시작합니다. 날씨·위치 기능은 제한됩니다.')
    render()
    void bootSpaceSyncAndPush()
  })
  document.querySelector('[data-action="accept-invite-start"]')?.addEventListener('click', () => {
    state.locationSkipped = true
    state.locationReady = true
    state.locationError = ''
    state.locationBusy = false
    const invited = applyPendingInvite({ forceView: true })
    if (invited === 'joined') showFlash('초대 승인 · AIZIO 입장 완료')
    else if (invited === 'needs-switch') {
      /* applyPendingInvite already flashed switch banner */
    } else if (invited === 'failed') {
      /* error flash already set */
    } else {
      showFlash('초대를 처리하지 못했습니다. 친구/가족 탭에서 코드를 붙여넣으세요.')
    }
    render()
    void bootSpaceSyncAndPush()
  })
  bindInstallUi()
}

async function ensureLocation(interactive: boolean): Promise<boolean> {
  if (!canUseGeolocation()) {
    state.locationError = '이 브라우저는 위치를 지원하지 않습니다. iPhone Safari를 사용해 주세요.'
    state.locationReady = false
    render()
    return false
  }
  state.locationBusy = true
  state.locationError = ''
  render()
  try {
    const perm = await queryPermissionState()
    if (perm === 'denied') {
      throw new Error('위치가 차단되어 있습니다. 설정 → 위치 서비스에서 AIZIO/Safari를 허용해 주세요.')
    }
    const fix = await requestLocation()
    state.lastFix = fix
    state.locationReady = true
    state.locationError = ''
    const invited = applyPendingInvite({
      forceView: interactive || Boolean(state.pendingInvite),
    })
    if (interactive && invited === 'none') showFlash('위치 허용 완료')
    render()
    void refreshWeather()
    void bootSpaceSyncAndPush()
    return true
  } catch (err) {
    state.locationReady = false
    state.locationError = err instanceof Error ? err.message : '위치 권한이 필요합니다.'
    render()
    return false
  } finally {
    state.locationBusy = false
    if (!state.locationReady) render()
  }
}

async function refreshQuotes(): Promise<void> {
  const symbols = [
    ...loadHoldings().map((h) => h.symbol),
    ...loadWatchlist().map((w) => w.symbol),
  ]
  await Promise.all(
    [...new Set(symbols)].map(async (sym) => {
      try {
        state.quoteCache[sym] = await fetchQuote(sym)
      } catch {
        state.quoteCache[sym] = null
      }
    }),
  )
  if (state.view === 'invest') render()
}

function bind(): void {
  document.querySelectorAll<HTMLButtonElement>('[data-music-action]').forEach((btn) => {
    btn.addEventListener('click', (ev) => {
      ev.preventDefault()
      ev.stopPropagation()
      const action = btn.dataset.musicAction || ''
      void handleMusicAction(action)
    })
  })

  // [data-view] / family·friends tabs: document delegation in bootNavDelegation()

  document.getElementById('family-create')?.addEventListener('submit', (e) => {
    e.preventDefault()
    void (async () => {
      const existing = loadFamilyRoom()
      if (existing) {
        const ok = window.confirm(
          `이미 가족 공간 «${existing.name}»(코드 ${existing.code})이 있습니다.\n새로 만들면 대화·공지·일정이 이 기기에서 사라집니다. 계속할까요?`,
        )
        if (!ok) return
        await disconnectFamilySync()
        leaveFamilyRoom()
      }
      const fd = new FormData(e.target as HTMLFormElement)
      const member = String(fd.get('member') || '')
      persistMemberName(member)
      createFamilyRoom(String(fd.get('name') || ''), member)
      state.familyTab = 'chat'
      showFlash('가족 공간을 만들었습니다. «초대 공유»로 가족을 초대하세요.')
      render()
    })()
  })

  document.getElementById('family-join')?.addEventListener('submit', (e) => {
    e.preventDefault()
    const fd = new FormData(e.target as HTMLFormElement)
    completeJoinFromRaw('family', String(fd.get('code') || ''), String(fd.get('member') || ''))
  })

  document.getElementById('family-switch')?.addEventListener('submit', (e) => {
    e.preventDefault()
    const fd = new FormData(e.target as HTMLFormElement)
    completeJoinFromRaw('family', String(fd.get('code') || ''), state.settings.displayName || '나')
  })

  document.getElementById('family-chat-form')?.addEventListener('submit', (e) => {
    e.preventDefault()
    const fd = new FormData(e.target as HTMLFormElement)
    submitSpaceChatFromForm('family', String(fd.get('text') || ''))
  })
  document.getElementById('family-draft')?.addEventListener('focus', () => scrollSpaceChat('family'))

  document.getElementById('family-notice-form')?.addEventListener('submit', (e) => {
    e.preventDefault()
    const fd = new FormData(e.target as HTMLFormElement)
    const notice = addFamilyNotice(
      String(fd.get('title') || ''),
      String(fd.get('body') || ''),
      Boolean(fd.get('pinned')),
    )
    if (notice) {
      void broadcastFamilyPacket({ type: 'notice', notice })
      showFlash('공지를 등록했습니다.')
      render()
    }
  })

  document.getElementById('family-event-form')?.addEventListener('submit', (e) => {
    e.preventDefault()
    const fd = new FormData(e.target as HTMLFormElement)
    const event = addFamilyEvent(
      String(fd.get('title') || ''),
      String(fd.get('date') || ''),
      String(fd.get('time') || ''),
      String(fd.get('note') || ''),
    )
    if (event) {
      void broadcastFamilyPacket({ type: 'event', event })
      showFlash('일정을 추가했습니다.')
      render()
    }
  })

  document.querySelectorAll<HTMLButtonElement>('[data-del-notice]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.delNotice || ''
      if (deleteFamilyNotice(id)) {
        void broadcastFamilyPacket({ type: 'notice-del', id })
        render()
      }
    })
  })

  document.querySelectorAll<HTMLButtonElement>('[data-del-event]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.delEvent || ''
      if (deleteFamilyEvent(id)) {
        void broadcastFamilyPacket({ type: 'event-del', id })
        render()
      }
    })
  })

  document.querySelector('[data-action="family-invite"]')?.addEventListener('click', () => {
    void openInviteModal('family')
  })

  document.querySelector('[data-action="family-join-share"]')?.addEventListener('click', () => {
    const room = loadFamilyRoom()
    if (!room) return
    const built = buildJoinReceipt({
      kind: 'family',
      code: room.code,
      memberId: room.memberId,
      memberName: room.memberName,
    })
    void shareText(built.message, { title: 'AIZIO 가족 참여 확인' }).then((r) => {
      if (r.ok) {
        showFlash('참여 확인을 공유했습니다. (오프라인 등록용)')
        return
      }
      void Promise.resolve(copyTextNow(built.message)).then((c) => {
        showFlash(c.ok ? '참여 확인을 복사했습니다. (오프라인 등록용)' : '공유에 실패했습니다.')
      })
    })
  })

  document.getElementById('family-join-receipt')?.addEventListener('submit', (e) => {
    e.preventDefault()
    const fd = new FormData(e.target as HTMLFormElement)
    const result = applyFamilyJoinReceipt(String(fd.get('receipt') || ''))
    showFlash(result.message)
    if (result.ok) render()
  })

  document.querySelector('[data-action="family-leave"]')?.addEventListener('click', () => {
    void (async () => {
      await disconnectFamilySync()
      leaveFamilyRoom()
      showFlash('가족 공간에서 나갔습니다.')
      render()
    })()
  })

  document.querySelector('[data-action="family-clear-chat"]')?.addEventListener('click', () => {
    const room = loadFamilyRoom()
    if (!room) return
    const ok = window.confirm(
      `가족 대화 ${room.messages.length}개를 지울까요?\n공지·일정·멤버는 그대로 둡니다.`,
    )
    if (!ok) return
    const clearedAt = Date.now()
    if (clearFamilyChat(clearedAt)) {
      showFlash('가족 대화를 초기화했습니다.')
      render()
      scrollSpaceChat('family')
      void (async () => {
        await ensureFamilySyncOnce()
        await broadcastFamilyPacket({ type: 'chat-clear', clearedAt })
      })()
    }
  })

  document.querySelector('[data-action="family-reconnect"]')?.addEventListener('click', () => {
    void ensureFamilySyncOnce(true).then(() => {
      showFlash(state.familySyncStatus)
      render()
    })
  })

  document.getElementById('friends-create')?.addEventListener('submit', (e) => {
    e.preventDefault()
    void (async () => {
      const existing = loadFriendsRoom()
      if (existing) {
        const ok = window.confirm(
          `이미 친구 공간 «${existing.name}»(코드 ${existing.code})이 있습니다.\n새로 만들면 대화·공지·일정이 이 기기에서 사라집니다. 계속할까요?`,
        )
        if (!ok) return
        await disconnectFriendsSync()
        leaveFriendsRoom()
      }
      const fd = new FormData(e.target as HTMLFormElement)
      const member = String(fd.get('member') || '')
      persistMemberName(member)
      createFriendsRoom(String(fd.get('name') || ''), member)
      state.friendsTab = 'chat'
      showFlash('친구 공간을 만들었습니다. «초대 공유»로 친구를 초대하세요.')
      render()
    })()
  })

  document.getElementById('friends-join')?.addEventListener('submit', (e) => {
    e.preventDefault()
    const fd = new FormData(e.target as HTMLFormElement)
    completeJoinFromRaw('friends', String(fd.get('code') || ''), String(fd.get('member') || ''))
  })

  document.getElementById('friends-switch')?.addEventListener('submit', (e) => {
    e.preventDefault()
    const fd = new FormData(e.target as HTMLFormElement)
    completeJoinFromRaw('friends', String(fd.get('code') || ''), state.settings.displayName || '나')
  })

  document.querySelector('[data-action="scan-friends-qr"]')?.addEventListener('click', () => {
    void scanInviteWithCamera('friends')
  })
  document.querySelector('[data-action="scan-family-qr"]')?.addEventListener('click', () => {
    void scanInviteWithCamera('family')
  })
  document.querySelector<HTMLInputElement>('[data-scan-friends-file]')?.addEventListener('change', (ev) => {
    const input = ev.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return
    void detectQrFromFile(file).then((raw) => {
      if (!raw) {
        showFlash('사진에서 QR을 읽지 못했습니다. 코드를 붙여넣어 주세요.')
        return
      }
      const member =
        (document.querySelector('#friends-join input[name="member"]') as HTMLInputElement | null)?.value ||
        state.settings.displayName
      completeJoinFromRaw('friends', raw, member)
    })
  })
  document.querySelector<HTMLInputElement>('[data-scan-family-file]')?.addEventListener('change', (ev) => {
    const input = ev.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return
    void detectQrFromFile(file).then((raw) => {
      if (!raw) {
        showFlash('사진에서 QR을 읽지 못했습니다. 코드를 붙여넣어 주세요.')
        return
      }
      const member =
        (document.querySelector('#family-join input[name="member"]') as HTMLInputElement | null)?.value ||
        state.settings.displayName
      completeJoinFromRaw('family', raw, member)
    })
  })

  document.getElementById('friends-chat-form')?.addEventListener('submit', (e) => {
    e.preventDefault()
    const fd = new FormData(e.target as HTMLFormElement)
    submitSpaceChatFromForm('friends', String(fd.get('text') || ''))
  })
  document.getElementById('friends-draft')?.addEventListener('focus', () => scrollSpaceChat('friends'))

  document.getElementById('friends-notice-form')?.addEventListener('submit', (e) => {
    e.preventDefault()
    const fd = new FormData(e.target as HTMLFormElement)
    const notice = addFriendsNotice(
      String(fd.get('title') || ''),
      String(fd.get('body') || ''),
      Boolean(fd.get('pinned')),
    )
    if (notice) {
      void broadcastFriendsPacket({ type: 'notice', notice })
      showFlash('공지를 등록했습니다.')
      render()
    }
  })

  document.getElementById('friends-event-form')?.addEventListener('submit', (e) => {
    e.preventDefault()
    const fd = new FormData(e.target as HTMLFormElement)
    const event = addFriendsEvent(
      String(fd.get('title') || ''),
      String(fd.get('date') || ''),
      String(fd.get('time') || ''),
      String(fd.get('note') || ''),
    )
    if (event) {
      void broadcastFriendsPacket({ type: 'event', event })
      showFlash('일정을 추가했습니다.')
      render()
    }
  })

  document.querySelectorAll<HTMLButtonElement>('[data-del-friends-notice]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.delFriendsNotice || ''
      if (deleteFriendsNotice(id)) {
        void broadcastFriendsPacket({ type: 'notice-del', id })
        render()
      }
    })
  })

  document.querySelectorAll<HTMLButtonElement>('[data-del-friends-event]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.delFriendsEvent || ''
      if (deleteFriendsEvent(id)) {
        void broadcastFriendsPacket({ type: 'event-del', id })
        render()
      }
    })
  })

  document.querySelector('[data-action="friends-invite"]')?.addEventListener('click', () => {
    void openInviteModal('friends')
  })

  document.querySelector('[data-action="friends-join-share"]')?.addEventListener('click', () => {
    const room = loadFriendsRoom()
    if (!room) return
    const built = buildJoinReceipt({
      kind: 'friends',
      code: room.code,
      memberId: room.memberId,
      memberName: room.memberName,
    })
    void shareText(built.message, { title: 'AIZIO 친구 참여 확인' }).then((r) => {
      if (r.ok) {
        showFlash('참여 확인을 공유했습니다. (오프라인 등록용)')
        return
      }
      void Promise.resolve(copyTextNow(built.message)).then((c) => {
        showFlash(c.ok ? '참여 확인을 복사했습니다. (오프라인 등록용)' : '공유에 실패했습니다.')
      })
    })
  })

  document.getElementById('friends-join-receipt')?.addEventListener('submit', (e) => {
    e.preventDefault()
    const fd = new FormData(e.target as HTMLFormElement)
    const result = applyFriendsJoinReceipt(String(fd.get('receipt') || ''))
    showFlash(result.message)
    if (result.ok) render()
  })

  document.querySelector('[data-action="switch-friends-invite"]')?.addEventListener('click', () => {
    void switchToInvite('friends')
  })
  document.querySelector('[data-action="dismiss-friends-invite"]')?.addEventListener('click', () => {
    state.prefillJoinCode = ''
    state.pendingInvite = null
    savePendingInvite(null)
    showFlash('초대를 무시했습니다.')
    render()
  })
  document.querySelector('[data-action="switch-family-invite"]')?.addEventListener('click', () => {
    void switchToInvite('family')
  })
  document.querySelector('[data-action="dismiss-family-invite"]')?.addEventListener('click', () => {
    state.prefillJoinCode = ''
    state.pendingInvite = null
    savePendingInvite(null)
    showFlash('초대를 무시했습니다.')
    render()
  })

  const runInviteCopy = (kind: 'code' | 'text' | 'link') => {
    const code = state.shareInviteCode
    const text = state.shareInviteText
    const space = state.shareInviteKind
    if (!code || !text || !space) {
      setShareStatus('초대 정보가 없습니다. 초대 공유를 다시 열어 주세요.', false)
      return
    }
    const link = buildSpaceInviteUrl(space, code, appShareUrl())
    const payload = kind === 'code' ? code : kind === 'link' ? link : text
    const label = kind === 'code' ? `코드 ${code}` : kind === 'link' ? '초대 링크' : '초대 문구'
    const fromSelector =
      kind === 'code' ? '[data-invite-select="code"]' : kind === 'text' ? '[data-invite-select="text"]' : undefined
    const r = copyTextNow(payload, fromSelector ? { fromSelector } : {})
    if (r.ok) {
      setShareStatus(`${label} 복사됨`, true)
      return
    }
    // WebView / blocked clipboard → select visible text, then try native share
    selectVisibleInviteText(kind === 'text' ? text : `${label}\n${payload}`)
    const title = space === 'family' ? 'AIZIO 가족 초대' : 'AIZIO 친구 초대'
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      void navigator
        .share({ title, text: payload, url: kind === 'text' ? link : undefined })
        .then(() => setShareStatus(`${label} · 공유 시트 열림`, true))
        .catch(() => setShareStatus(`${label} 선택됨 · 길게 눌러 복사하세요`, false))
      return
    }
    setShareStatus(`${label} 선택됨 · 길게 눌러 복사하세요`, false)
  }

  document.querySelector('[data-action="share-invite-native"]')?.addEventListener('click', (ev) => {
    ev.preventDefault()
    ev.stopPropagation()
    const text = state.shareInviteText
    const code = state.shareInviteCode
    const kind = state.shareInviteKind
    if (!text || !code || !kind) {
      setShareStatus('초대 문구가 없습니다.', false)
      return
    }
    const title = kind === 'family' ? 'AIZIO 가족 초대' : 'AIZIO 친구 초대'
    const url = buildSpaceInviteUrl(kind, code, appShareUrl())
    void shareText(text, { title, url }).then((r) => setShareStatus(r.message, r.ok))
  })

  // pointerup helps some iOS WebViews that drop click; debounce avoids double fire
  const bindInviteCopy = (action: string, kind: 'code' | 'text' | 'link') => {
    const el = document.querySelector(`[data-action="${action}"]`)
    if (!el) return
    let last = 0
    const handler = (ev: Event) => {
      ev.preventDefault()
      ev.stopPropagation()
      const now = Date.now()
      if (now - last < 450) return
      last = now
      runInviteCopy(kind)
    }
    el.addEventListener('pointerup', handler)
    el.addEventListener('click', handler)
  }
  bindInviteCopy('copy-invite-code', 'code')
  bindInviteCopy('copy-invite-text', 'text')
  bindInviteCopy('copy-invite-link', 'link')

  // Tap code field to select for manual copy
  document.querySelector<HTMLInputElement>('[data-invite-select="code"]')?.addEventListener('focus', (ev) => {
    const input = ev.target as HTMLInputElement
    input.select()
    setShareStatus('코드 선택됨 · 길게 눌러 복사할 수 있습니다', true)
  })
  document.querySelector<HTMLTextAreaElement>('[data-invite-select="text"]')?.addEventListener('focus', (ev) => {
    const ta = ev.target as HTMLTextAreaElement
    ta.select()
  })

  document.querySelector('[data-action="friends-leave"]')?.addEventListener('click', () => {
    void (async () => {
      await disconnectFriendsSync()
      leaveFriendsRoom()
      showFlash('친구 공간에서 나갔습니다.')
      render()
    })()
  })

  document.querySelector('[data-action="friends-clear-chat"]')?.addEventListener('click', () => {
    const room = loadFriendsRoom()
    if (!room) return
    const ok = window.confirm(
      `친구 대화 ${room.messages.length}개를 지울까요?\n공지·일정·멤버는 그대로 둡니다.`,
    )
    if (!ok) return
    const clearedAt = Date.now()
    if (clearFriendsChat(clearedAt)) {
      showFlash('친구 대화를 초기화했습니다.')
      render()
      scrollSpaceChat('friends')
      void (async () => {
        await ensureFriendsSyncOnce()
        await broadcastFriendsPacket({ type: 'chat-clear', clearedAt })
      })()
    }
  })

  document.querySelector('[data-action="friends-reconnect"]')?.addEventListener('click', () => {
    void ensureFriendsSyncOnce(true).then(() => {
      showFlash(state.friendsSyncStatus)
      render()
    })
  })

  bindInstallUi()

  const composer = document.getElementById('composer') as HTMLFormElement | null
  const draft = document.getElementById('draft') as HTMLInputElement | null
  draft?.addEventListener('input', () => {
    state.draft = draft.value
  })
  composer?.addEventListener('submit', (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (state.busy) return
    const input = document.getElementById('draft') as HTMLInputElement | null
    const text = (input?.value ?? state.draft).trim()
    if (!text) return
    // Clear before async work so a remount/ghost click cannot resubmit the same draft.
    state.draft = ''
    if (input) input.value = ''
    const sendBtn = composer.querySelector<HTMLButtonElement>('.send-btn, [type="submit"]')
    if (sendBtn) sendBtn.disabled = true
    void handleUserText(text)
  })

  document.querySelectorAll<HTMLButtonElement>('[data-action="home-v2-set"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const v = btn.dataset.homeVariant === 'v2' ? 'v2' : 'legacy'
      writeStoredHomeVariant(v)
      state.homeV2MoreOpen = false
      state.homeV2Pane = 'home'
      state.view = 'chat'
      try {
        const u = new URL(window.location.href)
        u.searchParams.set('home', v)
        window.history.replaceState({}, '', `${u.pathname}?${u.searchParams.toString()}${u.hash}`)
      } catch {
        /* ignore */
      }
      showFlash(v === 'v2' ? 'HOME v2로 전환했습니다' : '기존 홈으로 전환했습니다')
      render()
    })
  })
  document.querySelectorAll<HTMLButtonElement>('[data-action="home-v2-boot-default"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const v = btn.dataset.homeVariant === 'v2' ? 'v2' : 'legacy'
      writeBootDefaultHome(v)
      showFlash(v === 'v2' ? '실행 시 기본: HOME v2 (Preview)' : '실행 시 기본: 기존 홈')
      render()
    })
  })
  document.querySelector('[data-action="home-v2-reset-prefs"]')?.addEventListener('click', () => {
    clearHomeV2Prefs()
    state.homeV2Pane = 'home'
    state.homeV2MoreOpen = false
    try {
      const u = new URL(window.location.href)
      u.searchParams.delete('home')
      const q = u.searchParams.toString()
      window.history.replaceState({}, '', `${u.pathname}${q ? `?${q}` : ''}${u.hash}`)
    } catch {
      /* ignore */
    }
    showFlash('HOME v2 설정을 초기화했습니다.')
    render()
  })
  document.querySelector('[data-action="home-v2-feedback"]')?.addEventListener('click', () => {
    showFlash('검토 메모: 디자인·배치 의견을 알려 주세요. (기능은 기존과 동일)')
  })
  document.querySelectorAll('[data-action="home-v2-nav-home"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.view = 'chat'
      state.homeV2Pane = 'home'
      state.homeV2MoreOpen = false
      render()
      scrollChat()
    })
  })
  document.querySelectorAll('[data-action="home-v2-nav-more"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.homeV2TranslateSheetOpen = false
      state.homeV2MoreOpen = !state.homeV2MoreOpen
      render()
    })
  })
  document.querySelector('[data-action="home-v2-more-close"]')?.addEventListener('click', () => {
    state.homeV2MoreOpen = false
    render()
  })
  document.querySelector('[data-home-v2-more="1"]')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) {
      state.homeV2MoreOpen = false
      render()
    }
  })
  document.querySelectorAll<HTMLButtonElement>('[data-action="home-v2-quick"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.quickId as HomeV2QuickId | undefined
      if (id === 'navigate') {
        openNavInternal({ source: 'home_v2_quick' })
        return
      }
      if (id === 'translate') {
        openTranslateSheet()
        return
      }
      const cmd = id ? HOME_V2_QUICK_COMMANDS[id] : ''
      if (!cmd || cmd.startsWith('__')) return
      state.view = 'chat'
      state.homeV2Pane = 'home'
      state.homeV2MoreOpen = false
      void handleUserText(cmd)
    })
  })
  document.querySelector('[data-action="home-v2-open-nav"]')?.addEventListener('click', () => {
    openNavInternal({ source: 'home_v2_open_nav' })
  })
  document.querySelector('[data-action="navv2-back"]')?.addEventListener('click', () => {
    handleNavV2Back()
  })
  // —— Translate sheet ——
  document.querySelector('[data-action="tr-sheet-close"]')?.addEventListener('click', () => {
    closeTranslateSheet()
  })
  document.querySelector('[data-tr-sheet="1"]')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeTranslateSheet()
  })
  document.getElementById('tr-sheet-form')?.addEventListener('submit', (e) => {
    e.preventDefault()
    const input = document.getElementById('tr-sheet-input') as HTMLTextAreaElement | null
    const fromEl = document.getElementById('tr-sheet-from') as HTMLSelectElement | null
    const toEl = document.getElementById('tr-sheet-to') as HTMLSelectElement | null
    state.translateSheet = {
      ...state.translateSheet,
      sourceText: input?.value || '',
      from: fromEl?.value || 'auto',
      to: toEl?.value || 'en',
      lastInputSource: 'type',
    }
    void runTranslateSheet({ inputSource: 'type' })
  })
  document.querySelectorAll<HTMLButtonElement>('[data-action="tr-sheet-speak-lang"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const code = btn.dataset.speakLang || ''
      if (!code) return
      state.translateSheet = { ...state.translateSheet, speakLang: code }
      saveStoredSpeakLang(code)
      showFlash(`말할 언어: ${langNameForCode(code)}`)
      render()
    })
  })
  document.querySelector('[data-action="tr-sheet-swap"]')?.addEventListener('click', () => {
    const fromEl = document.getElementById('tr-sheet-from') as HTMLSelectElement | null
    const toEl = document.getElementById('tr-sheet-to') as HTMLSelectElement | null
    const input = document.getElementById('tr-sheet-input') as HTMLTextAreaElement | null
    let from = fromEl?.value || state.translateSheet.from
    let to = toEl?.value || state.translateSheet.to
    if (from === 'auto') from = detectLangCode(input?.value || state.translateSheet.sourceText || 'en')
    state.translateSheet = {
      ...state.translateSheet,
      from: to,
      to: from === 'auto' ? 'en' : from,
      sourceText: input?.value ?? state.translateSheet.sourceText,
      result: '',
      status: '언어를 바꿨습니다. 다시 번역하기를 누르세요.',
    }
    render()
  })
  document.querySelector('[data-action="tr-sheet-clear"]')?.addEventListener('click', () => {
    state.translateSheet = {
      ...state.translateSheet,
      sourceText: '',
      result: '',
      status: '말할 언어를 고른 뒤 MIC를 누르거나, 문장을 입력하세요.',
    }
    render()
  })
  document.querySelector('[data-action="tr-sheet-mic"]')?.addEventListener('click', () => {
    startTranslateSheetDictation()
  })
  document.querySelector('[data-action="tr-sheet-clear-result"]')?.addEventListener('click', () => {
    state.translateSheet = { ...state.translateSheet, result: '', status: '결과를 지웠습니다.' }
    render()
  })
  document.querySelector('[data-action="tr-sheet-copy"]')?.addEventListener('click', () => {
    const text = state.translateSheet.result
    if (!text) {
      showFlash('복사할 번역 결과가 없습니다.')
      return
    }
    const r = copyTextNow(text)
    showFlash(r.ok ? '번역 결과를 복사했습니다.' : '복사에 실패했습니다.')
  })
  document.querySelector('[data-action="tr-sheet-speak"]')?.addEventListener('click', () => {
    const text = state.translateSheet.result
    if (!text) {
      showFlash('읽어줄 번역 결과가 없습니다.')
      return
    }
    const lang = bcp47(state.translateSheet.to || 'en')
    void speakAsync(text.slice(0, 400), lang)
  })
  document.getElementById('tr-sheet-input')?.addEventListener('input', (e) => {
    const v = (e.target as HTMLTextAreaElement).value
    state.translateSheet = { ...state.translateSheet, sourceText: v, lastInputSource: 'type' }
  })
  document.getElementById('tr-sheet-from')?.addEventListener('change', (e) => {
    state.translateSheet = { ...state.translateSheet, from: (e.target as HTMLSelectElement).value }
  })
  document.getElementById('tr-sheet-to')?.addEventListener('change', (e) => {
    const to = (e.target as HTMLSelectElement).value
    state.translateSheet = {
      ...state.translateSheet,
      to,
      speakLang: state.translateSheet.speakLang || defaultSpeakLang(to, loadStoredSpeakLang()),
    }
  })
  document.querySelector('[data-action="home-v2-music"]')?.addEventListener('click', () => {
    state.homeV2MoreOpen = false
    state.view = 'chat'
    state.homeV2Pane = 'home'
    void handleUserText(HOME_V2_MUSIC_COMMAND)
  })
  document.querySelector('[data-action="nav-sheet-close"]')?.addEventListener('click', () => {
    state.homeV2NavSheetOpen = false
    render()
  })
  document.querySelector('[data-nav-sheet="1"]')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) {
      state.homeV2NavSheetOpen = false
      render()
    }
  })
  document.querySelectorAll<HTMLButtonElement>('[data-action="nav-chip"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.navChip || ''
      const input = document.getElementById('nav-dest-input') as HTMLInputElement | null
      const map: Record<string, { text: string; nearby?: boolean }> = {
        home: { text: '집' },
        work: { text: '회사' },
        parking: { text: '주차장', nearby: true },
        gas: { text: '주유소', nearby: true },
        hospital: { text: '병원', nearby: true },
        pharmacy: { text: '약국', nearby: true },
      }
      const hit = map[key]
      if (!hit) return
      if (input) input.value = hit.nearby ? `가까운 ${hit.text}` : hit.text
      void runNavigationFromUi(hit.nearby ? hit.text : hit.text, Boolean(hit.nearby))
    })
  })
  document.querySelectorAll<HTMLButtonElement>('[data-action="nav-map-pick"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.navMap || 'kakao'
      const sel = document.getElementById('nav-map-select') as HTMLSelectElement | null
      if (sel) sel.value = key
      document.querySelectorAll<HTMLButtonElement>('[data-action="nav-map-pick"]').forEach((b) => {
        b.classList.toggle('active', b === btn)
      })
      updateNavigationSettings({ defaultMap: key as MapProviderId })
    })
  })
  document.querySelector('[data-action="nav-sheet-start"]')?.addEventListener('click', () => {
    const input = document.getElementById('nav-dest-input') as HTMLInputElement | null
    const dest = (input?.value || '').trim()
    if (!dest) {
      showFlash('목적지를 입력해 주세요.')
      return
    }
    const nearby = /가까운|근처|주변/.test(dest)
    void runNavigationFromUi(dest.replace(/^(?:가장\s*)?(?:가까운|근처|주변)\s*/, ''), nearby)
  })
  document.querySelector('[data-action="nav-save-home"]')?.addEventListener('click', () => {
    const v = (document.querySelector('[data-nav-home-addr]') as HTMLInputElement | null)?.value || ''
    if (!v.trim()) {
      showFlash('집 주소를 입력해 주세요.')
      return
    }
    setSavedPlace('home', { addressText: v.trim() })
    showFlash('집 주소를 저장했습니다.')
  })
  document.querySelector('[data-action="nav-save-work"]')?.addEventListener('click', () => {
    const v = (document.querySelector('[data-nav-work-addr]') as HTMLInputElement | null)?.value || ''
    if (!v.trim()) {
      showFlash('회사 주소를 입력해 주세요.')
      return
    }
    setSavedPlace('work', { addressText: v.trim() })
    showFlash('회사 주소를 저장했습니다.')
  })
  document.querySelector('[data-action="nav-clear-home"]')?.addEventListener('click', () => {
    clearSavedPlace('home')
    showFlash('집 주소를 지웠습니다.')
    render()
  })
  document.querySelector('[data-action="nav-clear-work"]')?.addEventListener('click', () => {
    clearSavedPlace('work')
    showFlash('회사 주소를 지웠습니다.')
    render()
  })
  document.querySelector('[data-action="nav-add-fav"]')?.addEventListener('click', () => {
    const label = (document.querySelector('[data-nav-fav-label]') as HTMLInputElement | null)?.value || ''
    const addr = (document.querySelector('[data-nav-fav-addr]') as HTMLInputElement | null)?.value || ''
    if (!addr.trim()) {
      showFlash('즐겨찾기 주소를 입력해 주세요.')
      return
    }
    setSavedPlace('favorite', { label: label.trim() || '즐겨찾기', addressText: addr.trim() })
    showFlash('즐겨찾기를 추가했습니다.')
    render()
  })
  document.querySelectorAll<HTMLButtonElement>('[data-action="nav-remove-fav"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.favId || ''
      if (!id) return
      removeFavorite(id)
      showFlash('즐겨찾기를 삭제했습니다.')
      render()
    })
  })
  document.querySelector('[data-action="nav-request-location"]')?.addEventListener('click', () => {
    void import('./navigation').then(async (m) => {
      const r = await m.requestCurrentPosition()
      showFlash(r.ok ? '위치를 확인했습니다. (좌표는 저장하지 않습니다)' : `위치 확인 실패 · ${r.errorCode || 'denied'}`)
      void refreshNavPermStatus()
    })
  })
  document.querySelector('[data-action="navv2-toggle-voice"]')?.addEventListener('click', () => {
    const cur = loadNavV2Settings()
    saveNavV2Settings({ voiceEnabled: !cur.voiceEnabled })
    showFlash(`음성 안내 ${!cur.voiceEnabled ? '켜짐' : '꺼짐'}`)
    render()
  })
  document.querySelector('[data-action="navv2-clear-recent"]')?.addEventListener('click', () => {
    clearRecentSearches()
    showFlash('최근 검색을 초기화했습니다.')
    render()
  })
  document.querySelector('[data-action="navv2-clear-all"]')?.addEventListener('click', () => {
    clearAllNavV2LocalData()
    try {
      sessionStorage.removeItem('aizio.navV2.chatCards.v1')
      sessionStorage.removeItem('aizio.navV2.context.v1')
    } catch {
      /* ignore */
    }
    showFlash('길안내 로컬 데이터를 삭제했습니다.')
    render()
  })
  document.querySelector('[data-navv2-chat-map="1"]')?.addEventListener('click', () => {
    openNavInternal({ source: 'chat_map_card', query: state.navV2.query })
  })
  document.querySelector('[data-navv2-chat-dismiss="1"]')?.addEventListener('click', () => {
    try {
      sessionStorage.removeItem('aizio.navV2.chatCards.v1')
    } catch {
      /* ignore */
    }
    render()
  })
  document.querySelector('[data-navv2-chat-more="1"]')?.addEventListener('click', () => {
    try {
      const raw = sessionStorage.getItem('aizio.navV2.chatCards.v1')
      if (!raw) return
      const data = JSON.parse(raw) as Record<string, unknown>
      data.showAll = true
      sessionStorage.setItem('aizio.navV2.chatCards.v1', JSON.stringify(data))
    } catch {
      /* ignore */
    }
    render()
  })
  document.querySelectorAll<HTMLButtonElement>('[data-navv2-chat-select]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const n = btn.dataset.navv2ChatSelect || ''
      if (!n) return
      void handleUserText(`${n}번`)
    })
  })
  document.querySelector('[data-action="nav-clear-session"]')?.addEventListener('click', () => {
    resetNavigationLocalState()
    showFlash('최근 길안내 상태를 초기화했습니다.')
  })
  document.querySelector('[data-action="nav-test-map"]')?.addEventListener('click', () => {
    const sel = document.querySelector('[data-nav-field="defaultMap"]') as HTMLSelectElement | null
    const provider = (sel?.value || loadNavigationSettings().defaultMap) as MapProviderId
    const links = buildMapTestSearchUrl(provider)
    if (!isSafeMapUrl(links.webUrl)) {
      showFlash('허용되지 않은 지도 링크입니다.')
      return
    }
    if (links.appUrl && isSafeMapUrl(links.appUrl)) navigateHref(links.appUrl, { newTab: false })
    openUrl(links.webUrl, links.label)
    showFlash(`${links.label} 검색 화면을 엽니다. (테스트용 · 서울역)`)
  })
  document.querySelectorAll<HTMLSelectElement>('[data-nav-field]').forEach((sel) => {
    sel.addEventListener('change', () => {
      const field = sel.dataset.navField
      if (field === 'defaultMap') {
        updateNavigationSettings({ defaultMap: sel.value as MapProviderId })
        showFlash('기본 지도 앱을 저장했습니다.')
      }
      if (field === 'defaultTravel') {
        updateNavigationSettings({ defaultTravelMode: sel.value as TravelMode })
        showFlash('기본 이동수단을 저장했습니다.')
      }
    })
  })
  document.querySelectorAll<HTMLButtonElement>('[data-action="home-v2-go"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const go = btn.dataset.homeGo
      state.homeV2MoreOpen = false
      if (go === 'todos' || go === 'alarms') {
        goToView('life')
        return
      }
      if (go === 'messages') {
        const inbox = getHomeSpaceInbox()
        if (inbox.family.unread > 0) goToView('family')
        else if (inbox.friends.unread > 0) goToView('friends')
        else {
          state.view = 'chat'
          state.homeV2Pane = 'home'
          render()
        }
      }
    })
  })
  document.querySelector('[data-action="home-v2-smart"]')?.addEventListener('click', () => {
    const btn = document.querySelector<HTMLButtonElement>('[data-action="home-v2-smart"]')
    const hint = btn?.dataset.smartHint || ''
    const v = (btn?.dataset.smartView || 'life') as View
    state.homeV2MoreOpen = false
    if (hint) {
      void handleUserText(hint)
      return
    }
    if (v === 'chat') {
      state.view = 'chat'
      state.homeV2Pane = 'home'
      render()
      return
    }
    goToView(v)
  })
  document.querySelector('[data-action="home-v2-translate"]')?.addEventListener('click', () => {
    state.homeV2MoreOpen = false
    openTranslateSheet()
  })
  document.querySelector('[data-action="home-v2-guide"]')?.addEventListener('click', () => {
    state.homeV2MoreOpen = false
    state.view = 'chat'
    state.homeV2Pane = 'home'
    void handleUserText('사용설명서')
  })
  document.querySelector('[data-action="home-v2-goto-push"]')?.addEventListener('click', () => {
    state.homeV2MoreOpen = false
    goToView('settings')
    showFlash('설정 → 실기기 테스트 모드 · 푸시')
  })
  document.querySelector('[data-action="home-v2-goto-diag"]')?.addEventListener('click', () => {
    state.homeV2MoreOpen = false
    goToView('settings')
    showFlash('설정 → 진단 새로고침 / JSON 내보내기')
  })

  document.querySelectorAll<HTMLButtonElement>('[data-suggest]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.view = 'chat'
      void handleUserText(btn.dataset.suggest || '')
    })
  })

  document.querySelectorAll<HTMLButtonElement>('[data-translate-cmd]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.view = 'chat'
      void handleUserText(btn.dataset.translateCmd || '')
    })
  })

  document.querySelector('[data-translate-stop]')?.addEventListener('click', () => {
    state.view = 'chat'
    if (loadInterpretMode().active) {
      void handleUserText('스톱')
    } else {
      clearInterpretMode()
      pushMsg('assistant', '번역이 꺼져 있습니다. 위에서 언어 버튼을 먼저 눌러 주세요.')
      render()
      scrollChat()
    }
  })

  // —— Arcade ——
  document.querySelectorAll<HTMLButtonElement>('[data-arcade]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.arcade
      if (!id || !(id in ARCADE_META)) return
      stopArcade()
      state.arcadeId = id as ArcadeId
      state.arcadeScore = 0
      state.arcadeLevel = 1
      render()
    })
  })

  document.querySelectorAll<HTMLButtonElement>('[data-dir]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const raw = btn.dataset.dir || '0,0'
      const [dx, dy] = raw.split(',').map(Number)
      arcade?.setDir?.(dx, dy)
    })
  })

  document.querySelector('[data-arcade-restart]')?.addEventListener('click', (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!arcade) {
      mountActiveArcade()
      return
    }
    arcade.restart()
    state.arcadeScore = 0
    state.arcadeLevel = 1
    const hud = document.querySelector('.arcade-hud')
    const best = loadArcadeBest()[state.arcadeId]
    const bestLv = loadArcadeBestLevel()[state.arcadeId]
    if (hud) hud.textContent = `Lv.1 · SCORE 0 · BEST ${best ?? '—'} · BEST Lv.${bestLv ?? '—'}`
  })

  // Bind EVERY Jarvis MIC (HOME orb + composer + nav). querySelector alone left composer dead.
  attachMicClickHandlers(document, () => {
    startJarvisDictation()
  })

  document.querySelectorAll<HTMLButtonElement>('[data-action="space-mic"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const space = btn.dataset.space === 'family' ? 'family' : 'friends'
      startSpaceDictation(space)
    })
  })

  document.querySelector('[data-action="voice-test"]')?.addEventListener('click', () => {
    const probe = probeVoiceSupport()
    const lines = [
      '【음성 시스템 점검】',
      probe.details,
      canListen() ? 'MIC 버튼을 눌러 실제 인식도 확인해 주세요.' : 'Safari(iPhone)에서 다시 열어 주세요.',
    ]
    showFlash(probe.recognition && probe.secureContext ? '음성 준비 완료' : '음성 환경 확인 필요')
    state.view = 'chat'
    pushMsg('assistant', lines.join('\n'))
    render()
  })

  document.querySelectorAll<HTMLButtonElement>('[data-quick]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const action = quickActions.find((a) => a.id === btn.dataset.quick)
      if (!action) return
      const result = action.run()
      showFlash(result.message)
      if (result.view) {
        state.view = result.view
        render()
      }
    })
  })

  document.getElementById('life-stats-form')?.addEventListener('submit', (e) => {
    e.preventDefault()
    const fd = new FormData(e.target as HTMLFormElement)
    const name = String(fd.get('name') || '').trim() || getActiveSeriesName() || '기본'
    const values = parseNumbers(String(fd.get('values') || ''))
    if (!values.length) {
      showFlash('숫자를 하나 이상 입력해 주세요.')
      return
    }
    const series = fd.get('replace')
      ? replaceSeriesValues(name, values)
      : appendSeriesValues(name, values)
    showFlash(`${series.name}에 ${values.length}개 ${fd.get('replace') ? '저장' : '추가'} · n=${series.values.length}`)
    render()
  })
  document.querySelector('[data-action="life-stats-analyze"]')?.addEventListener('click', () => {
    const active = loadSeriesList().find(
      (s) => s.name.toLowerCase() === getActiveSeriesName().toLowerCase(),
    )
    if (!active?.values.length) {
      showFlash('먼저 숫자를 입력해 주세요.')
      return
    }
    render()
    showFlash(`${active.name} 분석 완료 (n=${active.values.length})`)
  })
  document.getElementById('life-todo-form')?.addEventListener('submit', (e) => {
    e.preventDefault()
    const fd = new FormData(e.target as HTMLFormElement)
    const text = String(fd.get('text') || '').trim()
    if (!text) return
    addReminder(text)
    showFlash('할 일을 추가했습니다.')
    render()
  })
  document.getElementById('customer-search-form')?.addEventListener('submit', (e) => {
    e.preventDefault()
    const fd = new FormData(e.target as HTMLFormElement)
    state.customerQuery = String(fd.get('q') || '').trim()
    render()
  })
  document.querySelector('[data-action="customer-clear-search"]')?.addEventListener('click', () => {
    state.customerQuery = ''
    render()
  })
  document.getElementById('customer-add-form')?.addEventListener('submit', (e) => {
    e.preventDefault()
    const fd = new FormData(e.target as HTMLFormElement)
    const name = String(fd.get('name') || '').trim()
    if (!name) return
    try {
      upsertCustomer({
        name,
        birthday: String(fd.get('birthday') || '').trim() || null,
        phone: String(fd.get('phone') || '').trim() || null,
        memo: String(fd.get('memo') || '').trim(),
      })
      state.customerQuery = ''
      showFlash(`${name} 님을 손님 목록에 저장했습니다.`)
      render()
    } catch {
      showFlash('이름을 확인해 주세요.')
    }
  })
  document.querySelectorAll<HTMLButtonElement>('[data-action="customer-delete"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.customerId || ''
      if (!id) return
      const hit = loadCustomers().find((c) => c.id === id)
      if (!deleteCustomer(id)) return
      showFlash(hit ? `${hit.name} 님을 삭제했습니다.` : '삭제했습니다.')
      render()
    })
  })
  document.getElementById('life-shop-form')?.addEventListener('submit', (e) => {
    e.preventDefault()
    const fd = new FormData(e.target as HTMLFormElement)
    const raw = String(fd.get('items') || '').trim()
    if (!raw) return
    const created = addShoppingItems(raw.split(/[\s,，、]+/).filter(Boolean))
    showFlash(created.length ? `${created.length}개 담았습니다.` : '이미 담긴 품목입니다.')
    render()
  })
  document.getElementById('life-habit-form')?.addEventListener('submit', (e) => {
    e.preventDefault()
    const fd = new FormData(e.target as HTMLFormElement)
    const name = String(fd.get('name') || '').trim()
    if (!name) return
    addHabit(name)
    showFlash(`습관 «${name}»을 추가했습니다.`)
    render()
  })
  document.getElementById('life-expense-form')?.addEventListener('submit', (e) => {
    e.preventDefault()
    const fd = new FormData(e.target as HTMLFormElement)
    const amount = Number(fd.get('amount'))
    const category = String(fd.get('category') || '').trim()
    const note = String(fd.get('note') || '').trim()
    if (!Number.isFinite(amount) || amount <= 0 || !category) {
      showFlash('금액과 항목을 확인해 주세요.')
      return
    }
    addExpense(amount, category, note)
    showFlash(`${category} ${formatMoney(amount, 'KRW')} 기록`)
    render()
  })
  document.getElementById('life-journal-form')?.addEventListener('submit', (e) => {
    e.preventDefault()
    const fd = new FormData(e.target as HTMLFormElement)
    const text = String(fd.get('text') || '').trim()
    const mood = String(fd.get('mood') || '').trim()
    if (!text) return
    addJournal(text, mood || undefined)
    showFlash('일기를 저장했습니다.')
    render()
  })
  document.getElementById('life-memory-form')?.addEventListener('submit', (e) => {
    e.preventDefault()
    const fd = new FormData(e.target as HTMLFormElement)
    const key = String(fd.get('key') || '').trim()
    const value = String(fd.get('value') || '').trim()
    if (!key || !value) return
    upsertMemory(key, value)
    showFlash(`기억: ${key}`)
    render()
  })

  document.getElementById('invest-holding-form')?.addEventListener('submit', (e) => {
    e.preventDefault()
    const fd = new FormData(e.target as HTMLFormElement)
    const raw = String(fd.get('ticker') || '').trim()
    const shares = Number(fd.get('shares'))
    const avg = Number(fd.get('avg'))
    const ticker = extractTickerFromText(raw) || resolveTicker(raw)
    if (!ticker || !Number.isFinite(shares) || shares <= 0 || !Number.isFinite(avg) || avg < 0) {
      showFlash('종목·수량·평단을 확인해 주세요.')
      return
    }
    upsertHolding({
      symbol: ticker.symbol,
      name: ticker.name,
      shares,
      avgPrice: avg,
      currency: ticker.currency,
    })
    addTradeNote(ticker.symbol, 'buy', `보유 등록 ${shares}주 @ ${avg}`)
    showFlash(`${ticker.name} ${shares}주 보유 반영`)
    render()
  })
  document.getElementById('invest-watch-form')?.addEventListener('submit', (e) => {
    e.preventDefault()
    const fd = new FormData(e.target as HTMLFormElement)
    const raw = String(fd.get('ticker') || '').trim()
    const targetRaw = String(fd.get('target') || '').trim()
    const ticker = extractTickerFromText(raw) || resolveTicker(raw)
    if (!ticker) {
      showFlash('종목을 인식하지 못했습니다.')
      return
    }
    const target = targetRaw ? Number(targetRaw) : undefined
    addWatch(ticker.symbol, ticker.name, Number.isFinite(target) ? target : undefined)
    showFlash(`관심종목: ${ticker.name}`)
    render()
  })
  document.getElementById('invest-trade-form')?.addEventListener('submit', (e) => {
    e.preventDefault()
    const fd = new FormData(e.target as HTMLFormElement)
    const raw = String(fd.get('ticker') || '').trim()
    const side = String(fd.get('side') || 'buy') as 'buy' | 'sell' | 'watch' | 'idea'
    const thesis = String(fd.get('thesis') || '').trim()
    const ticker = extractTickerFromText(raw) || resolveTicker(raw)
    if (!ticker || !thesis) {
      showFlash('종목과 메모를 입력해 주세요.')
      return
    }
    addTradeNote(ticker.symbol, side, thesis)
    showFlash('매매 노트를 저장했습니다.')
    render()
  })

  document.querySelectorAll<HTMLButtonElement>('[data-del-memory]').forEach((btn) => {
    btn.addEventListener('click', () => {
      deleteMemory(btn.dataset.delMemory || '')
      render()
    })
  })
  document.querySelectorAll<HTMLButtonElement>('[data-del-reminder]').forEach((btn) => {
    btn.addEventListener('click', () => {
      deleteReminder(btn.dataset.delReminder || '')
      render()
    })
  })
  document.querySelectorAll<HTMLButtonElement>('[data-toggle-reminder]').forEach((btn) => {
    btn.addEventListener('click', () => {
      toggleReminder(btn.dataset.toggleReminder || '')
      render()
    })
  })
  document.querySelectorAll<HTMLButtonElement>('[data-del-shop]').forEach((btn) => {
    btn.addEventListener('click', () => {
      deleteShopping(btn.dataset.delShop || '')
      render()
    })
  })
  document.querySelectorAll<HTMLButtonElement>('[data-toggle-shop]').forEach((btn) => {
    btn.addEventListener('click', () => {
      toggleShopping(btn.dataset.toggleShop || '')
      render()
    })
  })
  document.querySelectorAll<HTMLButtonElement>('[data-check-habit]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const h = checkHabit(btn.dataset.checkHabit || '')
      showFlash(h ? `${h.name} 완료 · 연속 ${h.streak}일` : '습관을 찾지 못했습니다.')
      render()
    })
  })
  document.querySelectorAll<HTMLButtonElement>('[data-del-habit]').forEach((btn) => {
    btn.addEventListener('click', () => {
      deleteHabit(btn.dataset.delHabit || '')
      render()
    })
  })
  document.querySelectorAll<HTMLButtonElement>('[data-del-expense]').forEach((btn) => {
    btn.addEventListener('click', () => {
      deleteExpense(btn.dataset.delExpense || '')
      render()
    })
  })
  document.querySelectorAll<HTMLButtonElement>('[data-del-holding]').forEach((btn) => {
    btn.addEventListener('click', () => {
      removeHolding(btn.dataset.delHolding || '')
      render()
    })
  })
  document.querySelectorAll<HTMLButtonElement>('[data-del-watch]').forEach((btn) => {
    btn.addEventListener('click', () => {
      removeWatch(btn.dataset.delWatch || '')
      render()
    })
  })
  document.querySelectorAll<HTMLButtonElement>('[data-del-trade]').forEach((btn) => {
    btn.addEventListener('click', () => {
      deleteTrade(btn.dataset.delTrade || '')
      render()
    })
  })
  document.querySelectorAll<HTMLButtonElement>('[data-del-series]').forEach((btn) => {
    btn.addEventListener('click', () => {
      deleteSeries(btn.dataset.delSeries || '')
      render()
    })
  })
  document.querySelectorAll<HTMLButtonElement>('[data-stats-use]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const name = btn.dataset.statsUse || ''
      if (!name) return
      setActiveSeriesName(name)
      state.view = 'life'
      render()
      showFlash(`${name} 분석`)
    })
  })
  document.querySelectorAll<HTMLButtonElement>('[data-quote]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.view = 'chat'
      void handleUserText(`${btn.dataset.quote} 시세`)
    })
  })
  document.querySelector('[data-action="refresh-quotes"]')?.addEventListener('click', () => {
    void refreshQuotes().then(() => showFlash('시세를 갱신했습니다.'))
  })

  const settingsForm = document.getElementById('settings-form') as HTMLFormElement | null
  settingsForm?.addEventListener('submit', (e) => {
    e.preventDefault()
    const fd = new FormData(settingsForm)
    const appLocale = String(fd.get('appLocale') || getAppLocale()) as AppLocale
    const hybrid = loadHybridAiConfig()
    const ids: HybridProviderId[] = ['openrouter', 'gemini', 'groq', 'openai', 'custom']
    for (const id of ids) {
      const existing = hybrid.providers[id]?.apiKey || ''
      const keyIn = String(fd.get(`hybridKey_${id}`) || '')
      const modelCustom = String(fd.get(`hybridModelCustom_${id}`) || '').trim()
      const modelSel = String(fd.get(`hybridModel_${id}`) || '').trim()
      const base = String(fd.get(`hybridBase_${id}`) || '').trim()
      updateProviderSlot(id, {
        apiKey: mergeKeyInput(keyIn, existing),
        model: modelCustom || modelSel || hybrid.providers[id]?.model || '',
        ...(base || id === 'openai' || id === 'custom' ? { apiBase: base || hybrid.providers[id]?.apiBase } : {}),
        enabled: true,
      })
    }
    const mode = String(fd.get('hybridMode') || 'auto') === 'fixed' ? 'fixed' : 'auto'
    const fixed = String(fd.get('hybridFixed') || '') as HybridProviderId | ''
    saveHybridAiConfig({
      ...loadHybridAiConfig(),
      mode,
      fixedProvider: fixed || undefined,
      allowPaidFallback: Boolean(fd.get('hybridAllowPaid')),
    })

    const next: JarvisSettings = {
      ...state.settings,
      displayName: String(fd.get('displayName') || '주인님').trim() || '주인님',
      speakReplies: Boolean(fd.get('speakReplies')),
      // Prefer hybrid OpenAI slot so a blank legacy field cannot wipe a just-saved key.
      apiKey: mergeKeyInput(
        String(fd.get('apiKey') || ''),
        getProviderSlot('openai').apiKey || state.settings.apiKey,
      ),
      apiBase: String(fd.get('apiBase') || 'https://api.openai.com/v1').trim(),
      model: String(fd.get('model') || 'gpt-4o-mini').trim(),
      city: String(fd.get('city') || '서울').trim() || '서울',
      notifyFamilyChat: Boolean(fd.get('notifyFamilyChat')),
      notifyFriendsChat: Boolean(fd.get('notifyFriendsChat')),
      notifyWhileOpen: Boolean(fd.get('notifyWhileOpen')),
      notifyPrivacyMode: (['full', 'simple', 'hidden'] as const).includes(
        String(fd.get('notifyPrivacyMode') || 'simple') as 'full' | 'simple' | 'hidden',
      )
        ? (String(fd.get('notifyPrivacyMode') || 'simple') as 'full' | 'simple' | 'hidden')
        : 'simple',
      pushServerBaseUrl: String(fd.get('pushServerBaseUrl') || '').trim(),
      appLocale,
      translationLocale: String(fd.get('translationLocale') || appLocale),
      autoTranslateMessages: Boolean(fd.get('autoTranslateMessages')),
      showOriginalText: Boolean(fd.get('showOriginalText')),
    }
    state.settings = next
    saveSettings(next)
    // Sync OpenAI slot ↔ legacy fields (also refreshes settings openai fields)
    updateProviderSlot('openai', {
      apiKey: next.apiKey,
      apiBase: next.apiBase,
      model: next.model,
    })
    state.settings = loadSettings()
    setAppLocale(appLocale)
    const musicProvider = String(fd.get('musicProvider') || 'youtube') as
      | 'youtube'
      | 'youtube_music'
      | 'spotify'
      | 'apple_music'
    updateMusicPreferences({
      preferredMusicProvider: musicProvider,
      preferredMusicLanguage: appLocale,
      openInExternalApp: Boolean(fd.get('musicOpenExternal')),
      rememberRecentMusicSearches: Boolean(fd.get('musicRememberSearches')),
      preferInstrumental: Boolean(fd.get('musicPreferInstrumental')),
    })
    void import('./push').then((m) => {
      const url = (next.pushServerBaseUrl || '').trim()
      if (!url) {
        m.setPushServerBaseUrl(null)
        return
      }
      const r = m.setPushServerBaseUrl(url, { allowHttpLocalhost: true })
      if (!r.ok) {
        showFlash(r.error === 'https_required' ? '푸시 서버는 HTTPS URL만 저장됩니다.' : '푸시 서버 URL이 올바르지 않습니다.')
      }
    })
    if (next.notifyFamilyChat || next.notifyFriendsChat) {
      void import('./chatNotify').then((m) => m.subscribeChatPush()).then((sub) => {
        if (sub) {
          void bootSpaceSyncAndPush()
        }
      })
    }
    showFlash('설정을 저장했습니다.')
    render()
  })

  document.getElementById('global-translation-form')?.addEventListener('submit', (e) => {
    e.preventDefault()
    const fd = new FormData(e.target as HTMLFormElement)
    const appLocale = String(fd.get('appLocale') || getAppLocale()) as AppLocale
    const next: JarvisSettings = {
      ...state.settings,
      appLocale,
      translationLocale: String(fd.get('translationLocale') || appLocale),
      autoTranslateMessages: Boolean(fd.get('autoTranslateMessages')),
      showOriginalText: Boolean(fd.get('showOriginalText')),
      detectMessageLanguage: Boolean(fd.get('detectMessageLanguage')),
    }
    state.settings = next
    saveSettings(next)
    setAppLocale(appLocale)
    showFlash(t('common.save'))
    render()
  })

  document.querySelectorAll<HTMLInputElement>('[data-space-media]').forEach((input) => {
    input.addEventListener('change', () => {
      const file = input.files?.[0]
      const space = input.dataset.spaceMedia as 'family' | 'friends' | undefined
      input.value = ''
      if (!file || !space) return
      void sendSpaceMedia(space, file)
    })
  })

  // Media preview uses document delegation (see bootMediaPreviewDelegation).

  document.querySelectorAll<HTMLButtonElement>('[data-toggle-orig]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const wrap = btn.closest('.fam-msg-tr') as HTMLElement | null
      if (!wrap) return
      const body = wrap.parentElement?.querySelector<HTMLElement>('[data-role="body"]')
      if (!body) return
      const showing = wrap.dataset.showing || 'translated'
      if (showing === 'translated') {
        body.textContent = wrap.dataset.original || body.textContent || ''
        wrap.dataset.showing = 'original'
        btn.textContent = t('chat.translation.showTranslated')
      } else {
        body.textContent = wrap.dataset.translated || body.textContent || ''
        wrap.dataset.showing = 'translated'
        btn.textContent = t('chat.translation.showOriginal')
      }
    })
  })

  document.querySelectorAll<HTMLButtonElement>('[data-hybrid-test]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-hybrid-test') as HybridProviderId | null
      if (!id) return
      const flushed = flushHybridProviderFromDom(id)
      if (!flushed.hasKey) {
        showFlash('API 키를 먼저 입력해 주세요.')
        return
      }
      showFlash('연결 테스트 중…')
      void testProviderConnection(id).then((r) => {
        showFlash(r.ok ? `${id} 연결 성공${r.latencyMs ? ` (${r.latencyMs}ms)` : ''}` : `${id} 실패: ${r.message}`)
        render()
      })
    })
  })
  document.querySelectorAll<HTMLButtonElement>('[data-hybrid-save]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-hybrid-save') as HybridProviderId | null
      if (!id) return
      const flushed = flushHybridProviderFromDom(id)
      showFlash(
        flushed.hasKey
          ? `${id} 키를 저장했습니다. 연결 테스트로 확인할 수 있어요.`
          : '저장할 키가 없습니다. 키를 입력해 주세요.',
      )
      if (flushed.hasKey) render()
    })
  })
  document.querySelectorAll<HTMLInputElement>('[data-hybrid-key]').forEach((input) => {
    const persist = () => {
      const id = (input.getAttribute('data-hybrid-key') || '') as HybridProviderId
      if (!id) return
      if (!input.value.trim()) return
      flushHybridProviderFromDom(id)
    }
    input.addEventListener('change', persist)
    input.addEventListener('blur', persist)
  })
  document.querySelectorAll<HTMLButtonElement>('[data-hybrid-clear]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-hybrid-clear') as HybridProviderId | null
      if (!id) return
      clearProviderKey(id)
      if (id === 'openai') {
        state.settings = { ...state.settings, apiKey: '' }
        saveSettings(state.settings)
      }
      showFlash(`${id} 키를 삭제했습니다.`)
      render()
    })
  })
  document.querySelectorAll<HTMLButtonElement>('[data-hybrid-default]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-hybrid-default') as HybridProviderId | null
      if (!id) return
      flushHybridProviderFromDom(id)
      const cfg = loadHybridAiConfig()
      saveHybridAiConfig({ ...cfg, mode: 'fixed', fixedProvider: id })
      showFlash(`${id}를 기본 Provider로 고정했습니다.`)
      render()
    })
  })

  document.querySelector('[data-action="ai-wizard-free"]')?.addEventListener('click', () => {
    dismissAiWizard()
    state.view = 'settings'
    showFlash('OpenRouter · Gemini · Groq 중 하나를 연결하세요.')
    render()
  })
  document.querySelector('[data-action="ai-wizard-openai"]')?.addEventListener('click', () => {
    dismissAiWizard()
    state.view = 'settings'
    showFlash('OpenAI 키를 입력한 뒤 「키 저장」또는 「연결 테스트」를 누르세요. ChatGPT Plus와 API 결제는 별개입니다.')
    render()
  })
  document.querySelector('[data-action="ai-wizard-later"]')?.addEventListener('click', () => {
    dismissAiWizard()
    showFlash('나중에 설정에서 AI를 연결할 수 있습니다.')
    render()
  })
  document.querySelector('[data-action="ai-wizard-local"]')?.addEventListener('click', () => {
    dismissAiWizard()
    showFlash('AI 없이 일정·메모·알림 등 기본 기능을 사용합니다.')
    render()
  })

  document.querySelector('[data-action="enable-chat-push"]')?.addEventListener('click', () => {
    void (async () => {
      const m = await import('./chatNotify')
      const perm = await m.ensureChatNotificationPermission()
      if (perm !== 'granted') {
        showFlash(
          perm === 'denied'
            ? '알림이 차단되어 있습니다. iPhone 설정 → AIZIO(또는 Safari) → 알림을 켜 주세요.'
            : '알림 권한을 허용해 주세요.',
        )
        render()
        return
      }
      const sub = await m.subscribeChatPush()
      if (!sub) {
        showFlash('푸시 구독에 실패했습니다. 홈 화면에 추가한 앱에서 다시 시도해 주세요.')
        render()
        return
      }
      const push = await import('./push')
      await push.ensureReminderPushSubscription(['smart_reminder', 'chat_family', 'chat_friends'])
      state.settings = {
        ...state.settings,
        notifyFamilyChat: state.settings.notifyFamilyChat !== false,
        notifyFriendsChat: state.settings.notifyFriendsChat !== false,
      }
      saveSettings(state.settings)
      await bootSpaceSyncAndPush()
      showFlash('채팅 알림·백그라운드 푸시가 켜졌습니다. (개인 종료 알림은 서버 필요)')
      render()
    })()
  })

  document.querySelector('[data-action="reminder-push-status"]')?.addEventListener('click', () => {
    void import('./push').then((m) => {
      const summary = m.reminderPushReadinessSummary()
      showFlash('개인 종료 알림 준비 상태를 대화에 표시했습니다.')
      pushMsg('assistant', summary)
      state.view = 'chat'
      render()
    })
  })

  document.querySelector('[data-action="device-diag-refresh"]')?.addEventListener('click', () => {
    void import('./diagnostics/deviceDiagnostics').then(async (m) => {
      const diag = await m.collectDeviceDiagnostics(APP_VERSION)
      const el = document.querySelector('[data-device-diag-out]')
      if (el) {
        el.textContent = [
          `v${diag.version} · build ${diag.buildId} · ${diag.commit} · ${diag.channel}`,
          `${diag.osHint} / ${diag.browser} · PWA ${diag.standalonePwa ? '설치됨' : '브라우저'} · net ${diag.online ? 'on' : 'off'}`,
          `알림 ${diag.notificationPermission} · mic ${diag.microphoneHint} · SW ${diag.serviceWorker.ready ? 'ready' : 'no'}`,
          `push chat=${diag.push.chatSubscription} rem=${diag.push.reminderSubscription} server=${diag.push.pushServerConfigured}`,
          `user ${diag.user.userId.slice(0, 8)}… · providers ${diag.providers.configured.join(',') || 'none'}`,
        ].join('\n')
      }
      showFlash('진단을 갱신했습니다.')
    })
  })

  document.querySelector('[data-action="device-diag-export"]')?.addEventListener('click', () => {
    void import('./diagnostics/deviceDiagnostics').then(async (m) => {
      const diag = await m.collectDeviceDiagnostics(APP_VERSION)
      m.downloadDiagnosticsJson(diag)
      showFlash('진단 JSON을 저장했습니다. (API 키 제외)')
    })
  })

  const pushOut = () => document.querySelector('[data-push-test-out]')
  const writePushOut = (text: string) => {
    const el = pushOut()
    if (el) el.textContent = text
  }
  document.querySelector('[data-action="push-test-health"]')?.addEventListener('click', () => {
    void import('./push/devicePushTest').then(async (m) => {
      const meta = await fetch(`./build-meta.json?_=${Date.now()}`).then((r) => r.json()).catch(() => ({}))
      const r = await m.runPushConnectionCheck(APP_VERSION, String(meta.commit || 'local'))
      writePushOut(JSON.stringify(r, null, 2))
      showFlash(r.serverHealthOk ? '서버 health OK' : '서버 연결 실패 — URL·네트워크 확인')
      ;(window as unknown as { __aizioPushTest?: unknown }).__aizioPushTest = r
    })
  })
  document.querySelector('[data-action="push-test-subscribe"]')?.addEventListener('click', () => {
    void import('./push/devicePushTest').then(async (m) => {
      const r = await m.requestPermissionAndSubscribe(APP_VERSION)
      writePushOut(r.message)
      showFlash(r.message)
    })
  })
  document.querySelector('[data-action="push-test-1m"]')?.addEventListener('click', () => {
    void import('./push/devicePushTest').then(async (m) => {
      const r = await m.scheduleTestReminder(1)
      writePushOut(`1분 예약: ${r.ok ? 'OK' : 'FAIL'} · id ${m.maskScheduleId(r.reminderId)} · ${r.message}\n상태: 실기기 검증 대기 (앱 완전 종료 후 수신 확인)`)
      showFlash(r.ok ? '1분 후 테스트 알림을 서버에 예약했습니다.' : r.message)
    })
  })
  document.querySelector('[data-action="push-test-5m"]')?.addEventListener('click', () => {
    void import('./push/devicePushTest').then(async (m) => {
      const r = await m.scheduleTestReminder(5)
      writePushOut(`5분 예약: ${r.ok ? 'OK' : 'FAIL'} · ${r.message}`)
      showFlash(r.ok ? '5분 후 테스트 알림 예약' : r.message)
    })
  })
  document.querySelector('[data-action="push-test-update"]')?.addEventListener('click', () => {
    void import('./push/devicePushTest').then(async (m) => {
      const r = await m.updateLastTestReminder(3)
      writePushOut(r.message)
      showFlash(r.message)
    })
  })
  document.querySelector('[data-action="push-test-cancel"]')?.addEventListener('click', () => {
    void import('./push/devicePushTest').then(async (m) => {
      const r = await m.cancelLastTestReminder()
      writePushOut(r.message)
      showFlash(r.message)
    })
  })
  document.querySelector('[data-action="push-test-unsub"]')?.addEventListener('click', () => {
    void import('./push').then(async (m) => {
      const r = await m.unsubscribeReminderPush()
      writePushOut(r.message)
      showFlash(r.message)
    })
  })
  document.querySelector('[data-action="push-test-copy"]')?.addEventListener('click', () => {
    const text = pushOut()?.textContent || ''
    void navigator.clipboard?.writeText(text).then(
      () => showFlash('테스트 결과를 복사했습니다.'),
      () => showFlash('복사에 실패했습니다.'),
    )
  })

  document.querySelector('[data-action="export"]')?.addEventListener('click', () => {
    downloadBackupBlob()
    showFlash('백업을 내보냈습니다.')
  })

  document.querySelector('[data-action="share-backup-native"]')?.addEventListener('click', () => {
    void shareBackupFile().then((r) => showFlash(r.message))
  })

  document.querySelector('[data-action="share-app-native"]')?.addEventListener('click', () => {
    void shareAppLink().then((r) => showFlash(r.message))
  })

  document.querySelector('[data-action="copy-app-link"]')?.addEventListener('click', () => {
    void navigator.clipboard.writeText(appShareMessage()).then(
      () => showFlash('앱 링크를 복사했습니다.'),
      () => showFlash('복사에 실패했습니다.'),
    )
  })

  document.querySelector('[data-action="share-arcade-score"]')?.addEventListener('click', () => {
    void openShareModal('arcade')
  })

  document.querySelector('[data-action="open-arcade-import"]')?.addEventListener('click', () => {
    state.arcadeImportOpen = true
    render()
  })

  document.querySelector('[data-action="close-arcade-import"]')?.addEventListener('click', () => {
    state.arcadeImportOpen = false
    render()
  })

  document.getElementById('arcade-name-form')?.addEventListener('submit', (e) => {
    e.preventDefault()
    const fd = new FormData(e.target as HTMLFormElement)
    const name = setArcadePlayerName(String(fd.get('name') || ''))
    syncSelfBestsToBoard()
    showFlash(`닉네임 «${name}» 저장`)
    render()
  })

  document.getElementById('arcade-import-form')?.addEventListener('submit', (e) => {
    e.preventDefault()
    const fd = new FormData(e.target as HTMLFormElement)
    const result = importScoreCard(String(fd.get('code') || ''))
    showFlash(result.message)
    if (result.ok) {
      state.arcadeImportOpen = false
      if (result.entry.game !== state.arcadeId) state.arcadeId = result.entry.game
      render()
    }
  })

  document.querySelector('[data-action="share-arcade-native"]')?.addEventListener('click', () => {
    const built = buildMyScoreCard(state.arcadeId)
    if (!built) {
      showFlash('공유할 기록이 없습니다.')
      return
    }
    void shareText(built.message).then((r) => showFlash(r.message))
  })

  document.querySelector('[data-action="copy-arcade-score"]')?.addEventListener('click', () => {
    const payload = state.shareArcadePayload || buildMyScoreCard(state.arcadeId)?.payload
    if (!payload) {
      showFlash('복사할 기록이 없습니다.')
      return
    }
    void navigator.clipboard.writeText(payload).then(
      () => showFlash('기록 코드를 복사했습니다.'),
      () => showFlash('복사에 실패했습니다.'),
    )
  })

  document.querySelector('[data-action="close-share"]')?.addEventListener('click', () => {
    state.shareModal = null
    state.shareQrSvg = ''
    state.shareArcadePayload = ''
    state.shareInviteKind = null
    state.shareInviteCode = ''
    state.shareInviteText = ''
    state.shareStatus = ''
    state.shareStatusOk = null
    render()
  })

  document.querySelector('[data-action="close-share-backdrop"]')?.addEventListener('click', (ev) => {
    if ((ev.target as HTMLElement).dataset.action === 'close-share-backdrop') {
      state.shareModal = null
      state.shareQrSvg = ''
      state.shareArcadePayload = ''
      state.shareInviteKind = null
      state.shareInviteCode = ''
      state.shareInviteText = ''
      state.shareStatus = ''
      state.shareStatusOk = null
      render()
    }
  })

  document.querySelector('[data-action="open-share-app"]')?.addEventListener('click', () => {
    void openShareModal('app')
  })

  document.querySelector('[data-action="open-share-backup"]')?.addEventListener('click', () => {
    void openShareModal('backup')
  })

  document.querySelector('[data-action="import"]')?.addEventListener('click', () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json,.json'
    input.addEventListener('change', async () => {
      const file = input.files?.[0]
      if (!file) return
      const result = importBackup(await file.text())
      state.settings = loadSettings()
      state.messages = loadChat()
      showFlash(result.message)
      render()
    })
    input.click()
  })

  document.querySelector('[data-action="pick-avatar"]')?.addEventListener('click', () => {
    pickProfileAvatarFile()
  })
  document.querySelector('[data-action="clear-avatar"]')?.addEventListener('click', () => {
    void applyMyAvatar(undefined)
  })

  document.querySelectorAll('[data-action="clear-chat"]').forEach((btn) => {
    btn.addEventListener('click', (ev) => {
      ev.preventDefault()
      ev.stopPropagation()
      resetChatHistory({ confirm: true })
    })
  })
  document.querySelectorAll('[data-action="hard-refresh"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      showFlash('앱을 새로고침합니다…')
      void hardRefreshApp()
    })
  })
  document.querySelectorAll('[data-action="app-update"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      void updateAppToLatest()
    })
  })
  document.querySelectorAll('[data-action="check-update"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      void refreshRemoteVersionBadge({ announce: true })
    })
  })
}

let swUpdateTimer: number | null = null

function boot(): void {
  bootMediaPreviewDelegation()
  bootNavDelegation()
  bootLos2CardDelegation()
  // Soft SW apply on update — hard cache wipe caused intermittent white screens on iPhone.
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      paintBootSplash('새 버전을 적용하는 중…')
      void Promise.resolve(updateSW(true)).catch(() => {
        void hardRefreshApp()
      })
    },
    onRegisteredSW(_url, reg) {
      if (!reg) return
      void reg.update()
      // Single interval — avoid stacking on re-register / HMR
      if (swUpdateTimer != null) window.clearInterval(swUpdateTimer)
      swUpdateTimer = window.setInterval(() => void reg.update(), 60_000)
    },
  })
  const pending = readPendingUpdate()
  if (pending?.version) {
    if (pending.version === APP_VERSION) {
      // Update navigation landed on the intended bundle
      clearPendingUpdate()
    } else if (compareAppVersions(pending.version, APP_VERSION) > 0) {
      // Still running an older bundle after "업데이트" — wipe + retry once
      const retried = sessionStorage.getItem(UPDATE_RETRY_KEY) === '1'
      if (!retried) {
        sessionStorage.setItem(UPDATE_RETRY_KEY, '1')
        paintBootSplash(`최신 v${pending.version}을 다시 받는 중…`)
        void hardRefreshApp({ targetVersion: pending.version, targetBuildId: pending.buildId }).catch(() => {
          sessionStorage.removeItem('jarvis.refreshing')
          continueBootAfterRefresh()
        })
        window.setTimeout(() => {
          if (document.getElementById('app')?.querySelector('[data-boot-splash="1"]')) {
            sessionStorage.removeItem('jarvis.refreshing')
            continueBootAfterRefresh()
          }
        }, 6000)
        return
      }
      // Retry already used — boot old build rather than loop forever
      clearPendingUpdate()
      showFlash(`최신 v${pending.version} 수신 실패 · 현재 v${APP_VERSION}으로 실행`)
    } else {
      // Pending was older than this bundle — discard
      clearPendingUpdate()
    }
  }

  const seen = localStorage.getItem(SEEN_APP_VERSION_KEY)
  const refreshing = sessionStorage.getItem('jarvis.refreshing') === '1'
  if (seen && seen !== APP_VERSION && compareAppVersions(seen, APP_VERSION) > 0) {
    // Recorded a newer version but this process still has old JS — force production reload
    paintBootSplash(`최신 v${seen}으로 업데이트하는 중…`)
    void hardRefreshApp({ targetVersion: seen }).catch(() => {
      sessionStorage.removeItem('jarvis.refreshing')
      continueBootAfterRefresh()
    })
    window.setTimeout(() => {
      if (document.getElementById('app')?.querySelector('[data-boot-splash="1"]')) {
        sessionStorage.removeItem('jarvis.refreshing')
        localStorage.setItem(SEEN_APP_VERSION_KEY, APP_VERSION)
        continueBootAfterRefresh()
      }
    }, 6000)
    return
  }
  if (refreshing) {
    // Reload completed (or interrupted) — clear latch and boot normally
    sessionStorage.removeItem('jarvis.refreshing')
  }
  localStorage.setItem(SEEN_APP_VERSION_KEY, APP_VERSION)
  continueBootAfterRefresh()
}

let bootCoreStarted = false

function continueBootAfterRefresh(): void {
  if (bootCoreStarted) return
  bootCoreStarted = true
  try {
    bootAppCore()
  } catch (err) {
    bootCoreStarted = false
    const msg = err instanceof Error ? err.message : String(err)
    paintBootSplash(`시작 오류: ${msg.slice(0, 120)}`)
    const app = document.getElementById('app')
    if (app) {
      app.insertAdjacentHTML(
        'beforeend',
        `<p style="text-align:center;margin-top:12px"><button type="button" class="primary-btn" id="boot-retry">다시 시도</button></p>`,
      )
      document.getElementById('boot-retry')?.addEventListener('click', () => {
        sessionStorage.removeItem('jarvis.refreshing')
        window.location.reload()
      })
    }
  }
}

function bootAppCore(): void {
  // Guest local userId/deviceId — does not change legacy jarvis_* keys.
  void import('./account').then((m) => m.ensureGuestIdentity())
  void import('./smartReminder').then((m) => m.migrateSmartRemindersPushFields())
  state.messages = loadChat()
  state.settings = loadSettings()
  void loadBuildMetaLite().then((meta) => {
    // When production buildId changes, hard-navigate (reload alone often kept stale SW HTML).
    try {
      const buildId = meta.buildId
      if (buildId) {
        const seenBuild = localStorage.getItem(SEEN_BUILD_ID_KEY)
        if (seenBuild && seenBuild !== buildId && sessionStorage.getItem('jarvis.buildReloaded') !== '1') {
          sessionStorage.setItem('jarvis.buildReloaded', '1')
          writePendingUpdate(meta.version || APP_VERSION, buildId)
          paintBootSplash('최신 빌드를 불러오는 중…')
          void hardRefreshApp({
            targetVersion: meta.version || APP_VERSION,
            targetBuildId: buildId,
          })
          return
        }
        localStorage.setItem(SEEN_BUILD_ID_KEY, buildId)
      }
    } catch {
      /* ignore storage */
    }
    // Refresh once channel is known so HOME v2 / design-lab resolve correctly.
    if (state.locationReady) render({ guardNav: false })
  })
  try {
    if (sessionStorage.getItem('aizio.nav.openSheet.v1') === '1') {
      sessionStorage.removeItem('aizio.nav.openSheet.v1')
      state.homeV2NavSheetOpen = true
    }
  } catch {
    /* ignore */
  }
  void import('./push').then(async (m) => {
    try {
      const url = (state.settings.pushServerBaseUrl || '').trim()
      if (url) m.setPushServerBaseUrl(url, { allowHttpLocalhost: true })
      else await m.applyPreviewPushServerDefault({ allowHttpLocalhost: true })
    } catch {
      /* push default is optional — HOME design preview must not fail */
    }
  })
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (ev) => {
      const data = ev.data as { type?: string } | null
      if (data?.type === 'aizio-push-received') {
        void import('./push/devicePushTest').then((m) => m.markPushReceived())
      }
    })
  }
  // Restore last query for sticky intent, but never auto-open the panel on launch.
  // Mini player appears only after the user asks for music in this session.
  state.musicSession = loadPersistedMusicSession()
  state.musicPlayerOpen = false
  initAppLocale(state.settings.appLocale)
  if (!state.settings.appLocale) {
    state.settings = { ...state.settings, appLocale: getAppLocale() }
    saveSettings(state.settings)
  }
  captureViewFromUrl()
  captureInviteFromUrl()
  window.addEventListener('hashchange', () => {
    if (suppressHashSync) {
      suppressHashSync = false
      return
    }
    applyHashRouteFromLocation({ replace: false })
    render({ guardNav: 'async' })
  })
  window.addEventListener('popstate', () => {
    if (suppressHashSync) return
    applyHashRouteFromLocation({ replace: false })
    render({ guardNav: 'async' })
  })
  bindPwaInstallEvents()
  onPwaInstallChange(() => {
    refreshInstallHint()
    if (state.locationReady || document.querySelector('.location-gate')) render()
  })
  refreshInstallHint()
  window.addEventListener('aizio-app-update', () => {
    void updateAppToLatest()
  })
  registerShareModal(openShareModal)
  setFamilySyncListener((info) => {
    state.familySyncStatus = info.status
    if (state.view !== 'family' || !state.locationReady) return
    if (state.shareModal) return
    // Health/peer: status text only — avoid storage thrash that delays chat paint
    if (info.reason === 'health' || info.reason === 'conn' || info.reason === 'peer') {
      patchSpaceHead('family', { status: info.status, peers: getFamilyPeerCount() })
      return
    }
    // New chat/notice data: append immediately on chat tab
    if (state.familyTab === 'chat' || state.listening) {
      softRefreshSpaceChat('family')
      return
    }
    const active = document.activeElement as HTMLElement | null
    if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
      softRefreshSpaceChat('family', { badges: false })
      return
    }
    window.clearTimeout((window as unknown as { __famRefresh?: number }).__famRefresh)
    ;(window as unknown as { __famRefresh?: number }).__famRefresh = window.setTimeout(() => {
      if (state.view === 'family' && state.familyTab !== 'chat' && !state.shareModal && !state.listening) {
        render({ guardNav: 'async' })
      }
    }, 180)
  })
  setFriendsSyncListener((info) => {
    state.friendsSyncStatus = info.status
    if (state.view !== 'friends' || !state.locationReady) return
    if (state.shareModal) return
    if (info.reason === 'health' || info.reason === 'conn' || info.reason === 'peer') {
      patchSpaceHead('friends', { status: info.status, peers: getFriendsPeerCount() })
      return
    }
    if (state.friendsTab === 'chat' || state.listening) {
      softRefreshSpaceChat('friends')
      return
    }
    const active = document.activeElement as HTMLElement | null
    if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
      softRefreshSpaceChat('friends', { badges: false })
      return
    }
    window.clearTimeout((window as unknown as { __frdRefresh?: number }).__frdRefresh)
    ;(window as unknown as { __frdRefresh?: number }).__frdRefresh = window.setTimeout(() => {
      if (state.view === 'friends' && state.friendsTab !== 'chat' && !state.shareModal && !state.listening) {
        render({ guardNav: 'async' })
      }
    }, 180)
  })
  startAlarmScheduler()
  setAlarmUiHandler((alarm) => {
    void import('./smartReminder/storage').then(({ loadSmartReminders, updateSmartReminder }) => {
      const hit = loadSmartReminders().find(
        (r) => r.mainAlarmId === alarm.id || r.advanceAlarmIds.includes(alarm.id),
      )
      if (hit && (hit.status === 'scheduled' || hit.status === 'snoozed')) {
        updateSmartReminder(hit.id, {
          status: hit.mainAlarmId === alarm.id ? 'triggered' : hit.status,
          notificationStatus: 'fired',
        })
      }
    })
    pushMsg('assistant', `⏰ AIZIO 알림: ${alarm.body}`)
    if (state.settings.speakReplies) {
      void speakAsync(`알림. ${alarm.body}`.slice(0, 160), 'ko-KR')
    }
    showFlash(`알림: ${alarm.body}`)
    if (!state.locationReady) return
    if (state.listening) {
      patchVoiceUi()
      return
    }
    // Chat: append bubble without remounting nav (prevents ghost tab jumps).
    if (state.view === 'chat') {
      const thread = document.getElementById('chat-thread') || document.querySelector('.messages')
      if (thread && !thread.querySelector('.hero-empty')) {
        const last = state.messages[state.messages.length - 1]
        if (last) {
          const name = 'AIZIO'
          const clock = formatChatClock(last.createdAt)
          thread.insertAdjacentHTML(
            'beforeend',
            `<div class="msg-row assistant"><button type="button" class="msg-avatar-btn aizio" data-profile-open="1" data-profile-name="AIZIO" data-profile-src="" data-profile-mine="0" aria-label="AIZIO"><span class="msg-avatar-letter">A</span></button><div class="msg-col"><div class="msg-head"><span class="msg-name">${escapeHtml(name)}</span>${clock ? `<time class="msg-time">${clock}</time>` : ''}</div><div class="msg-bubble assistant">${escapeHtml(last.text)}</div></div></div>`,
          )
          scrollChat()
          return
        }
      }
    }
    render()
  })
  void ensureNotificationPermission()
  window.addEventListener('online', () => {
    state.online = true
    if (state.locationReady) {
      scheduleResumeSpaceSync('force')
      const pill = document.querySelector('.status-pill')
      if (pill) pill.textContent = '대기'
    }
  })
  window.addEventListener('offline', () => {
    state.online = false
    const pill = document.querySelector('.status-pill')
    if (pill) pill.textContent = '오프라인'
  })
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      scheduleResumeSpaceSync('force')
      void refreshRemoteVersionBadge()
    }
  })
  window.addEventListener('pageshow', (ev) => {
    const persisted = 'persisted' in ev && Boolean((ev as PageTransitionEvent).persisted)
    if (persisted) scheduleResumeSpaceSync('force')
  })
  // Do NOT hook window "focus" — iOS fires it on taps and caused reconnect/render flicker.

  // Always require a fresh location grant on launch (standalone / Safari)
  void (async () => {
    const perm = await queryPermissionState()
    if (perm === 'granted' || wasLocationGranted()) {
      const ok = await ensureLocation(false)
      if (ok) {
        void refreshWeather()
        // ensureLocation already applies pending invite + render + space sync/push
      } else {
        render()
      }
      return
    }
    state.locationReady = false
    render()
  })()
  render()
  void refreshRemoteVersionBadge()
}

boot()
