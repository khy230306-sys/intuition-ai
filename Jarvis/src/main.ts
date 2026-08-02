import { registerSW } from 'virtual:pwa-register'
import './style.css'
import { FIXED_APP_URL, fetchRemoteAppVersion } from './appUpdate'
import {
  clearProviderKey,
  dismissAiWizard,
  hasAnyConfiguredProvider,
  loadHybridAiConfig,
  mergeKeyInput,
  saveHybridAiConfig,
  shouldShowAiWizard,
  testProviderConnection,
  updateProviderSlot,
  type HybridProviderId,
} from './ai-providers'
import { renderAiWizardHtml, renderHybridAiSettingsHtml } from './ai-providers/settingsUi'
import { copyTextNow, quickActions, selectVisibleInviteText, shareText } from './actions'
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
import {
  attemptPwaInstall,
  bindPwaInstallEvents,
  detectInstallPlatform,
  installGuideSteps,
  onPwaInstallChange,
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
import { currentListenLang, loadInterpretMode, clearInterpretMode } from './translateBrain'
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

const APP_VERSION = '1.13.6'
const SEEN_APP_VERSION_KEY = 'jarvis.app.seenVersion'
const PENDING_INVITE_KEY = 'jarvis.pendingInvite.v1'
/** Bumps when MIC is stopped/retargeted so late mic-permission callbacks abort. */
let voiceSessionGen = 0
/** Bumps when a newer chat request supersedes an in-flight think(). */
let thinkGen = 0

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

/** Minimal paint so version-upgrade refresh never leaves a blank white #app. */
function paintBootSplash(message: string): void {
  const app = document.getElementById('app')
  if (!app) return
  app.innerHTML = `
    <section class="location-gate" data-boot-splash="1" style="min-height:70dvh">
      <div class="loc-card">
        <div class="big-orb"></div>
        <h1>AIZIO</h1>
        <p class="loc-lead">${escapeHtml(message)}</p>
        <p class="loc-body muted">잠시만 기다려 주세요…</p>
      </div>
    </section>`
}

async function hardRefreshApp(): Promise<void> {
  // Stuck flag from a previous interrupted refresh — clear and force navigate
  const stuck = sessionStorage.getItem('jarvis.refreshing') === '1'
  sessionStorage.setItem('jarvis.refreshing', '1')
  paintBootSplash(stuck ? '앱을 다시 불러오는 중…' : '최신 버전으로 업데이트하는 중…')
  // Mark version before cache wipe so a hung clear cannot loop forever on next boot
  localStorage.setItem(SEEN_APP_VERSION_KEY, APP_VERSION)
  try {
    await withTimeout(clearAppCaches(), 3500)
  } catch {
    /* still reload */
  }
  const bust = `_v=${encodeURIComponent(APP_VERSION)}&_t=${Date.now()}`
  // Prefer the locked production host if user somehow opened a snapshot URL
  if (/\.shipstatic\.com$/i.test(window.location.hostname) && window.location.hostname !== 'jarvis-app.shipstatic.com') {
    window.location.replace(`${FIXED_APP_URL}/?${bust}`)
    return
  }
  try {
    const url = new URL(window.location.href)
    url.searchParams.set('_v', APP_VERSION)
    url.searchParams.set('_t', String(Date.now()))
    window.location.replace(url.toString())
  } catch {
    window.location.replace(`${FIXED_APP_URL}/?${bust}`)
  }
}

/**
 * Home-screen / Safari update: wipe SW caches, then load the fixed production URL
 * so the installed PWA always pulls the newest deployed build.
 */
async function updateAppToLatest(): Promise<void> {
  showFlash('최신판을 확인하는 중…')
  sessionStorage.removeItem('jarvis.refreshing')
  let remote: string | null = null
  try {
    remote = await fetchRemoteAppVersion()
  } catch {
    remote = null
  }
  state.remoteVersion = remote
  const targetVer = remote || APP_VERSION
  if (remote && remote === APP_VERSION) {
    showFlash(`이미 최신입니다 (v${APP_VERSION}). 캐시를 비우고 다시 불러옵니다…`)
  } else if (remote) {
    showFlash(`서버 최신 v${remote}으로 업데이트합니다…`)
  } else {
    showFlash('서버 확인 실패 · 캐시를 비우고 다시 불러옵니다…')
  }
  paintBootSplash('최신판을 불러오는 중…')
  try {
    await withTimeout(clearAppCaches(), 3500)
  } catch {
    /* still navigate */
  }
  localStorage.setItem(SEEN_APP_VERSION_KEY, targetVer)
  sessionStorage.setItem('jarvis.refreshing', '1')
  window.location.replace(`${FIXED_APP_URL}/?_v=${encodeURIComponent(targetVer)}&_t=${Date.now()}&_update=1`)
}

/** Settings-only update controls (not shown on chat / games / other tabs). */
function renderUpdateCard(): string {
  const remote = state.remoteVersion
  const newer = remote && remote !== APP_VERSION
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
      <p class="hint">${status}. 홈 화면에 추가한 AIZIO도 이 버튼으로 최신판을 받을 수 있습니다.</p>
      <button type="button" class="primary-btn update-btn" data-action="app-update">업데이트</button>
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
  '오늘 날씨 알려줘',
  '조용한 음악 틀어줘',
  '브리핑',
  '지금 몇 시야',
  '삼성전자 시세',
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
  /** Where MIC dictation should land: main Jarvis chat vs space rooms. */
  dictationTarget: 'jarvis' as 'jarvis' | 'family' | 'friends',
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
  /** Deep-link / QR invite waiting for location gate */
  pendingInvite: null as null | { kind: SpaceKind; code: string },
  prefillJoinCode: '',
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

function renderHomeInstallButton(opts?: { compact?: boolean }): string {
  if (!state.showInstall) return ''
  const compact = opts?.compact
  return `
    <button type="button" class="install-home-btn ${compact ? 'compact' : ''}" data-action="install-home" aria-label="홈 화면에 설치">
      <span class="install-home-ico" aria-hidden="true">↓</span>
      <span class="install-home-label">${compact ? '홈 화면 설치' : '홈 화면에 설치'}</span>
    </button>
  `
}

async function handleInstallHomeClick(): Promise<void> {
  const result = await attemptPwaInstall()
  if (result.kind === 'accepted') {
    state.showInstall = false
    state.installGuideOpen = false
    showFlash('홈 화면에 설치했습니다. 아이콘으로 열어 주세요.')
    render()
    return
  }
  if (result.kind === 'already-installed') {
    state.showInstall = false
    state.installGuideOpen = false
    showFlash('이미 홈 화면 앱으로 실행 중입니다.')
    render()
    return
  }
  if (result.kind === 'dismissed') {
    showFlash('설치가 취소되었습니다. 언제든 다시 누를 수 있어요.')
    refreshInstallHint()
    render()
    return
  }
  // Native sheet unavailable — show platform steps (iPhone / Android)
  state.installGuideOpen = result.kind === 'need-guide' ? result.platform : detectInstallPlatform()
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

/** Open family/friends from notification click (?view=family|friends). */
function captureViewFromUrl(): void {
  try {
    const u = new URL(window.location.href)
    const v = u.searchParams.get('view')
    if (
      v === 'family' ||
      v === 'friends' ||
      v === 'chat' ||
      v === 'settings' ||
      v === 'global' ||
      v === 'life' ||
      v === 'invest'
    ) {
      state.view = v
      u.searchParams.delete('view')
      const q = u.searchParams.toString()
      window.history.replaceState({}, '', `${u.pathname}${q ? `?${q}` : ''}${u.hash}`)
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
  extra?: Partial<Pick<ChatMessage, 'musicNeedsGesture' | 'musicPlayUrl' | 'actionHint'>>,
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

async function handleUserText(raw: string, opts?: { source?: 'text' | 'voice' }): Promise<void> {
  const text = raw.trim()
  if (!text || state.busy) return
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
        })
      } else {
        pushMsg('assistant', reply.text, {
          musicNeedsGesture: reply.musicNeedsGesture,
          musicPlayUrl: reply.musicPlayUrl,
        })
      }
      if (result && 'view' in result && result.view) state.view = result.view
    } else {
      pushMsg('assistant', reply.text, {
        musicNeedsGesture: reply.musicNeedsGesture,
        musicPlayUrl: reply.musicPlayUrl,
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
  const micSel =
    target === 'family'
      ? '[data-action="space-mic"][data-space="family"]'
      : target === 'friends'
        ? '[data-action="space-mic"][data-space="friends"]'
        : '[data-action="mic"]'
  const mic = document.querySelector<HTMLButtonElement>(micSel)
  if (mic) {
    mic.classList.toggle('listening', state.listening)
    mic.textContent = state.listening ? 'STOP' : 'MIC'
    mic.setAttribute('aria-pressed', state.listening ? 'true' : 'false')
  }
  // Keep other mic buttons idle-looking while dictating elsewhere
  document.querySelectorAll<HTMLButtonElement>('[data-action="mic"], [data-action="space-mic"]').forEach((btn) => {
    if (btn === mic) return
    btn.classList.remove('listening')
    btn.textContent = 'MIC'
    btn.setAttribute('aria-pressed', 'false')
  })
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
  const captionId =
    target === 'family' ? 'family-voice-caption' : target === 'friends' ? 'friends-voice-caption' : 'voice-caption'
  const caption = document.getElementById(captionId)
  if (caption) {
    caption.hidden = !state.listening && !state.voiceHint
    caption.textContent = state.listening
      ? state.voiceHint || '듣고 있습니다… 말씀해 주세요'
      : state.voiceHint
    caption.classList.toggle('live', state.listening)
  }
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
  return `
    <header class="brand-bar">
      <div class="brand">
        <div class="orb" aria-hidden="true"></div>
        <div>
          <h1>AIZIO</h1>
          <p>${loadInterpretMode().active ? `실시간 통역 · MIC ${escapeHtml(state.listenLang)}` : `아이지오 · 만능·투자 AI 비서 · ${escapeHtml(state.settings.displayName)}`}</p>
        </div>
      </div>
      <div class="status-pill">${status}</div>
    </header>
  `
}

function renderInstall(): string {
  if (!state.showInstall) return ''
  const platform = detectInstallPlatform()
  const tip =
    platform === 'ios'
      ? '아이폰: 버튼 → 공유 → 홈 화면에 추가'
      : platform === 'android'
        ? '안드로이드: 버튼으로 설치하거나 브라우저 메뉴에서 추가'
        : '브라우저 설치 메뉴로 홈 화면에 추가'
  return `
    <div class="install-banner" data-install-banner="1">
      <div class="install-banner-copy">
        <strong>홈 화면에 설치</strong>
        <span>${tip}</span>
      </div>
      ${renderHomeInstallButton()}
    </div>
  `
}

function renderInstallGuideModal(): string {
  if (!state.installGuideOpen) return ''
  const guide = installGuideSteps(state.installGuideOpen)
  const steps = guide.steps.map((s, i) => `<li><span class="step-n">${i + 1}</span>${escapeHtml(s)}</li>`).join('')
  return `
    <div class="share-modal install-guide-modal" role="dialog" aria-modal="true" aria-label="${escapeAttr(guide.title)}" data-action="close-install-guide-backdrop">
      <div class="share-sheet" data-install-guide-sheet="1">
        <div class="share-sheet-head">
          <strong>${escapeHtml(guide.title)}</strong>
          <button type="button" class="ghost-btn tiny" data-action="close-install-guide">닫기</button>
        </div>
        <ol class="install-guide-steps">${steps}</ol>
        <p class="hint">이미 홈 화면 아이콘으로 실행 중이면 이 버튼은 자동으로 숨겨집니다.</p>
        <div class="row-btns">
          <button type="button" class="primary-btn" data-action="close-install-guide">확인</button>
        </div>
      </div>
    </div>
  `
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
            ? `<div class="loc-install">${renderHomeInstallButton()}
                <p class="hint">브라우저로 보셨다면 홈 화면에 설치해 앱처럼 쓰세요.</p></div>`
            : ''
        }
        <p class="loc-help">거부했다면: 설정 → 개인정보 보호 → 위치 서비스 → Safari/AIZIO → 허용</p>
        <p class="translate-hint">v${APP_VERSION}</p>
      </div>
    </section>
  `
}

function renderNav(): string {
  const inbox = getHomeSpaceInbox()
  const items: Array<{ id: View; label: string; ico: string; badge?: number }> = [
    { id: 'chat', label: t('nav.chat'), ico: 'CHAT', badge: inbox.unreadTotal || undefined },
    { id: 'invest', label: t('nav.invest'), ico: 'INV' },
    { id: 'life', label: t('nav.life'), ico: 'LIFE' },
    { id: 'family', label: t('nav.family'), ico: 'FAM', badge: inbox.family.unread || undefined },
    { id: 'friends', label: t('nav.friends'), ico: 'FRD', badge: inbox.friends.unread || undefined },
    { id: 'global', label: t('nav.global'), ico: 'TR' },
    { id: 'games', label: t('nav.games'), ico: 'PLAY' },
    { id: 'actions', label: t('nav.actions'), ico: 'RUN' },
    { id: 'settings', label: t('nav.settings'), ico: 'SET' },
  ]
  return `
    <nav class="nav nav-8">
      ${items
        .map(
          (i) => `
        <button type="button" data-view="${i.id}" class="${state.view === i.id ? 'active' : ''}">
          <span class="nav-ico">${i.ico}${
            i.badge
              ? `<span class="nav-badge">${i.badge > 99 ? '99+' : i.badge}</span>`
              : ''
          }</span>
          <span>${i.label}</span>
        </button>
      `,
        )
        .join('')}
    </nav>
  `
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
      const neu = id === 'gyeokpa'
      return `<button type="button" class="game-tab ${state.arcadeId === id ? 'active' : ''}${neu ? ' is-new' : ''}" data-arcade="${id}">${ARCADE_META[id].title}${neu ? '<span class="game-tab-new">NEW</span>' : ''}</button>`
    })
    .join('')
  const hi = best[state.arcadeId]
  const bestLv = loadArcadeBestLevel()[state.arcadeId]
  const controls =
    state.arcadeId === 'flappy'
      ? `<p class="game-meta">화면 탭으로 점프 · 게임오버 시 화면 탭</p>`
      : state.arcadeId === 'slide'
        ? `<p class="game-meta">타일 탭 또는 스와이프로 빈칸으로 밀기 · 시간 안에 클리어 · 게임오버 시 화면 탭</p>`
        : state.arcadeId === 'gyeokpa'
          ? `<p class="game-meta">드래그 이동 · 자동사격 · 웨이브·보스 · 무기(펄스→트윈→스프레드→장거리 레이저) · 라이프·실드·폭탄 · 게임오버 시 화면 탭</p>`
          : state.arcadeId === 'breakout' || state.arcadeId === 'pong' || state.arcadeId === 'dodge'
            ? `<p class="game-meta">좌우 드래그 · 게임오버 시 화면 탭</p>`
            : `<p class="game-meta">좌우 드래그 · 자동발사 · 초록 M / 금색 W(Lv20+) 아이템 · 게임오버 시 화면 탭</p>`

  return `
    <section class="panel view-scroll games-panel">
      <h2 class="section-title">ARCADE</h2>
      <p class="hint">오프라인 아케이드 · 7종 · v${APP_VERSION}</p>
      <p class="hint arcade-new-hint">새 게임 · 스페이스2 (세로 슈팅)</p>
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
          ${renderHomeInstallButton({ compact: true })}
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

function renderChat(): string {
  const mode = loadInterpretMode()
  const empty = state.messages.length === 0
  const body = empty
    ? `
        <div class="hero-empty">
          <div class="big-orb"></div>
          <h2>AIZIO</h2>
          <p>말로 쓰는 일상 비서입니다.<br/>메시지를 보내거나 MIC로 말해 보세요.<br/><strong>사용설명서</strong>를 누르면 한눈에 볼 수 있어요.</p>
          ${state.showInstall ? `<div class="hero-install">${renderHomeInstallButton()}</div>` : ''}
          <div class="chips">
            ${SUGGESTIONS.map((s) => `<button type="button" data-suggest="${escapeAttr(s)}">${escapeHtml(s)}</button>`).join('')}
          </div>
        </div>
      `
    : state.messages
        .map((m) => {
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
      <div id="voice-caption" class="voice-caption ${state.listening ? 'live' : ''}" ${state.listening || state.voiceHint ? '' : 'hidden'}>${escapeHtml(
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
      <h2 class="section-title">INVEST</h2>
      <p class="hint">실시간 시세(Yahoo) · 포트폴리오 · 관심종목 · 매매노트. 투자 조언이 아닌 참고 도구입니다.</p>
      <div class="chips left">
        <button type="button" data-suggest="주식 종목 추천">냉정 추천</button>
        <button type="button" data-suggest="포트폴리오">포트폴리오 새로고침</button>
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
        <p class="hint">알림 권한: <strong>${escapeHtml(pushPerm)}</strong>. 앱을 쓰지 않을 때(백그라운드) 알림은 iPhone에서 <strong>홈 화면에 추가</strong>한 PWA + 아래 버튼으로 푸시를 켜야 합니다.</p>
        <button type="button" class="primary-btn" data-action="enable-chat-push">알림 권한 · 백그라운드 푸시 켜기</button>
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
      <p class="hint">백업 공유보내기: iPhone 공유 시트로 파일·iCloud·Drive·메일·메모에 저장할 수 있습니다. 전체 JSON이 크면 QR은 앱 링크·요약으로 대체됩니다.</p>
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

/** Update CHAT/FAM/FRD badges without remounting the shell. */
function patchNavBadges(): void {
  const nav = document.querySelector('nav.nav')
  if (!nav) return
  invalidateSpaceInboxCache()
  const inbox = getHomeSpaceInbox()
  const setBadge = (view: View, count: number) => {
    const btn = nav.querySelector<HTMLButtonElement>(`[data-view="${view}"]`)
    if (!btn) return
    const ico = btn.querySelector('.nav-ico')
    if (!ico) return
    const existing = ico.querySelector('.nav-badge')
    if (count > 0) {
      const label = count > 99 ? '99+' : String(count)
      if (existing) existing.textContent = label
      else ico.insertAdjacentHTML('beforeend', `<span class="nav-badge">${label}</span>`)
    } else if (existing) {
      existing.remove()
    }
  }
  setBadge('chat', inbox.unreadTotal)
  setBadge('family', inbox.family.unread)
  setBadge('friends', inbox.friends.unread)
}

function goToView(next: View, ev?: MouseEvent): void {
  const same = next === state.view
  if (same) {
    // Re-tapping FAM/FRD jumps to chat tab (faster than hunting sub-tabs)
    if (next === 'family' && state.familyTab !== 'chat') {
      state.familyTab = 'chat'
      render({ pointer: ev ? { x: ev.clientX, y: ev.clientY } : undefined })
      return
    }
    if (next === 'friends' && state.friendsTab !== 'chat') {
      state.friendsTab = 'chat'
      render({ pointer: ev ? { x: ev.clientX, y: ev.clientY } : undefined })
      return
    }
    return
  }
  stopArcade()
  state.view = next
  if (next === 'family') state.familyTab = 'chat'
  if (next === 'friends') state.friendsTab = 'chat'
  stopSpeaking()
  voice.stop()
  state.listening = false
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
  if (!state.locationReady) {
    refreshInstallHint()
    app.innerHTML = `${renderLocationGate()}${renderInstallGuideModal()}`
    bindLocationGate()
    return
  }
  invalidateSpaceInboxCache()
  const main =
    state.view === 'chat'
      ? renderChat()
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
                    : renderSettings()
  app.innerHTML = `${renderBrand()}${renderInstall()}${main}${renderNav()}${renderShareModal()}${renderInstallGuideModal()}`
  document.body.dataset.jarvisView = state.view
  if (opts.guardNav !== false) {
    if (opts.guardNav === 'async' || !opts.pointer) {
      armNavGuard({ mode: 'async', ms: 260 })
    } else {
      armNavGuard({ mode: 'point', x: opts.pointer.x, y: opts.pointer.y, ms: 340 })
    }
  }
  bind()
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
  document.querySelectorAll('[data-action="install-home"]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault()
      e.stopPropagation()
      void handleInstallHomeClick()
    })
  })
  document.querySelector('[data-action="close-install-guide"]')?.addEventListener('click', () => {
    state.installGuideOpen = false
    render()
  })
  document.querySelector('[data-action="close-install-guide-backdrop"]')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) {
      state.installGuideOpen = false
      render()
    }
  })
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

  document.querySelectorAll('[data-action="install-home"]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault()
      e.stopPropagation()
      void handleInstallHomeClick()
    })
  })
  document.querySelector('[data-action="close-install-guide"]')?.addEventListener('click', () => {
    state.installGuideOpen = false
    render()
  })
  document.querySelector('[data-action="close-install-guide-backdrop"]')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) {
      state.installGuideOpen = false
      render()
    }
  })

  const composer = document.getElementById('composer') as HTMLFormElement | null
  const draft = document.getElementById('draft') as HTMLInputElement | null
  draft?.addEventListener('input', () => {
    state.draft = draft.value
  })
  composer?.addEventListener('submit', (e) => {
    e.preventDefault()
    void handleUserText(state.draft)
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

  document.querySelector('[data-action="mic"]')?.addEventListener('click', () => {
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
    if (state.view !== 'chat' || !document.getElementById('voice-caption')) {
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
            state.draft = text
            patchVoiceUi()
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
        patchVoiceUi()
      }
    })()
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
      apiKey: mergeKeyInput(String(fd.get('apiKey') || ''), state.settings.apiKey),
      apiBase: String(fd.get('apiBase') || 'https://api.openai.com/v1').trim(),
      model: String(fd.get('model') || 'gpt-4o-mini').trim(),
      city: String(fd.get('city') || '서울').trim() || '서울',
      notifyFamilyChat: Boolean(fd.get('notifyFamilyChat')),
      notifyFriendsChat: Boolean(fd.get('notifyFriendsChat')),
      notifyWhileOpen: Boolean(fd.get('notifyWhileOpen')),
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
      showFlash('연결 테스트 중…')
      void testProviderConnection(id).then((r) => {
        showFlash(r.ok ? `${id} 연결 성공${r.latencyMs ? ` (${r.latencyMs}ms)` : ''}` : `${id} 실패: ${r.message}`)
        render()
      })
    })
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
    showFlash('OpenAI 키를 입력한 뒤 설정 저장을 누르세요. ChatGPT Plus와 API 결제는 별개입니다.')
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
      state.settings = {
        ...state.settings,
        notifyFamilyChat: state.settings.notifyFamilyChat !== false,
        notifyFriendsChat: state.settings.notifyFriendsChat !== false,
      }
      saveSettings(state.settings)
      await bootSpaceSyncAndPush()
      showFlash('채팅 알림·백그라운드 푸시가 켜졌습니다.')
      render()
    })()
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
  registerSW({
    immediate: true,
    onNeedRefresh() {
      void hardRefreshApp()
    },
    onRegisteredSW(_url, reg) {
      if (!reg) return
      void reg.update()
      // Single interval — avoid stacking on re-register / HMR
      if (swUpdateTimer != null) window.clearInterval(swUpdateTimer)
      swUpdateTimer = window.setInterval(() => void reg.update(), 60_000)
    },
  })
  const seen = localStorage.getItem(SEEN_APP_VERSION_KEY)
  const refreshing = sessionStorage.getItem('jarvis.refreshing') === '1'
  if (seen && seen !== APP_VERSION) {
    // Old build lingered — refresh caches, but never leave a blank white screen.
    paintBootSplash('최신 버전으로 업데이트하는 중…')
    void hardRefreshApp().catch(() => {
      sessionStorage.removeItem('jarvis.refreshing')
      localStorage.setItem(SEEN_APP_VERSION_KEY, APP_VERSION)
      // Fall through to normal boot if navigation did not happen
      continueBootAfterRefresh()
    })
    // Safety net: if replace never fires (iOS SW hang), continue boot after timeout
    window.setTimeout(() => {
      if (document.getElementById('app')?.querySelector('[data-boot-splash="1"]')) {
        sessionStorage.removeItem('jarvis.refreshing')
        localStorage.setItem(SEEN_APP_VERSION_KEY, APP_VERSION)
        continueBootAfterRefresh()
      }
    }, 5000)
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
  state.messages = loadChat()
  state.settings = loadSettings()
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
