import { createMapController, type MapController } from '../mapController'
import {
  getNavV2Context,
  patchNavV2Context,
  selectCandidateByIndex,
  setCandidates,
  setRoutes,
} from '../navigationContext'
import { formatDistance, formatDuration, requestCurrentPosition, watchPosition } from '../geolocationService'
import { searchPlaces } from '../placeSearchService'
import { calculateRoutes, findOffRoute, nextStepIndex } from '../routingService'
import {
  loadNavV2Settings,
  loadRecentSearches,
  pushRecentSearch,
  saveNavV2Settings,
} from '../navigationStorage'
import type { NavScreenPhase, NavTravelMode, PlaceCandidate } from '../types'
import { buildMapLinks, isSafeMapUrl } from '../../navigation/navigationUrlBuilder'
import type { MapProviderId } from '../../navigation/navigationTypes'
import { navigateHref, openUrl } from '../../actions'

function esc(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export type NavScreenState = {
  phase: NavScreenPhase
  query: string
  candidates: PlaceCandidate[]
  selected: PlaceCandidate | null
  catalogOnly: boolean
  status: string
  showAll: boolean
}

let mapCtl: MapController | null = null
let watch: { stop: () => void } | null = null
let lastSpoken = ''
let searchTimer: ReturnType<typeof setTimeout> | null = null
let abort: AbortController | null = null

export function renderNavigationScreen(st: NavScreenState): string {
  const settings = loadNavV2Settings()
  const ctx = getNavV2Context()
  const route = ctx.routes.find((r) => r.id === ctx.activeRouteId) || ctx.routes[0] || null
  const recent = loadRecentSearches()
  const list = st.showAll ? st.candidates : st.candidates.slice(0, 5)
  const candHtml =
    st.phase === 'searching'
      ? `<p class="hint">관련 장소를 찾고 있어요…</p>`
      : list.length
        ? list
            .map(
              (c, i) => `
          <button type="button" class="navv2-cand ${st.selected?.id === c.id ? 'active' : ''}" data-navv2-pick="${i}">
            <span class="navv2-cand-n">${i + 1}</span>
            <span class="navv2-cand-body">
              <strong>${esc(c.name)}</strong>
              <small>${esc(c.category)} · ${esc(c.address)}</small>
              <small>${c.distanceM != null ? esc(formatDistance(c.distanceM)) : '위치 권한을 허용하면 가까운 순서로 볼 수 있어요'}</small>
            </span>
          </button>`,
            )
            .join('')
        : st.query
          ? `<div class="navv2-empty">
              <p class="hint">검색 결과가 없어요. 검색어를 바꿔 보거나, 아래 지도 앱에서 바로 찾아보세요.</p>
              <div class="row-btns navv2-ext-maps">
                <button type="button" class="primary-btn" data-navv2-ext="kakao">카카오맵</button>
                <button type="button" class="ghost-btn" data-navv2-ext="tmap">T맵</button>
                <button type="button" class="ghost-btn" data-navv2-ext="naver">네이버지도</button>
              </div>
            </div>`
          : `<p class="hint">목적지를 검색하거나 말해 주세요. 예: 덕신 소공원, 역삼동, 근처 약국</p>`

  const recentHtml =
    !st.query && recent.length
      ? `<div class="navv2-recent"><p class="hint">최근 검색</p>${recent
          .map((r) => `<button type="button" class="ghost-btn tiny" data-navv2-recent="${esc(r.query)}">${esc(r.name)}</button>`)
          .join('')}</div>`
      : ''

  const routeHtml = route
    ? `<div class="navv2-route">
        <strong>${esc(route.summary)}</strong>
        <p>${esc(formatDistance(route.distanceM))} · ${esc(formatDuration(route.durationSec))}${route.approximate ? ' · 대략 경로' : ''}</p>
        <div class="row-btns">
          <button type="button" class="primary-btn" data-navv2-action="start">안내 시작</button>
          <button type="button" class="ghost-btn" data-navv2-action="recalc">경로 다시 계산</button>
          <button type="button" class="ghost-btn" data-navv2-action="external">다른 지도에서 열기</button>
        </div>
      </div>`
    : ''

  const guideHtml =
    ctx.guiding && route
      ? (() => {
          const step = route.steps[ctx.stepIndex] || route.steps[0]
          return `<div class="navv2-guide">
            <strong>${esc(step?.instruction || '경로를 따라가세요')}</strong>
            <p>남은 거리 ${esc(formatDistance(route.distanceM))} · 단계 ${ctx.stepIndex + 1}/${route.steps.length}</p>
            <div class="row-btns">
              <button type="button" class="ghost-btn" data-navv2-action="stop">안내 종료</button>
              <button type="button" class="ghost-btn" data-navv2-action="recenter">현재 위치</button>
            </div>
          </div>`
        })()
      : ''

  return `
    <section class="panel navv2-panel" data-navv2="1">
      <header class="navv2-head">
        <button type="button" class="ghost-btn tiny" data-action="navv2-back" aria-label="뒤로">뒤로</button>
        <strong>AIZIO 길안내</strong>
        <button type="button" class="ghost-btn tiny" data-action="mic" aria-label="음성 검색">MIC</button>
      </header>
      <form id="navv2-search-form" class="navv2-search">
        <input id="navv2-q" type="search" value="${esc(st.query)}" placeholder="역삼동, 강남역, 근처 약국…" autocomplete="off" enterkeyhint="search" />
        <button class="primary-btn" type="submit">검색</button>
        <button type="button" class="ghost-btn" data-navv2-action="clear" aria-label="지우기">×</button>
      </form>
      <div class="navv2-modes" role="group" aria-label="이동수단">
        ${(['driving', 'walking', 'cycling'] as NavTravelMode[])
          .map((m) => {
            const label = m === 'driving' ? '자동차' : m === 'walking' ? '도보' : '자전거'
            return `<button type="button" class="home-v2-nav-map-btn ${settings.travelMode === m ? 'active' : ''}" data-navv2-mode="${m}">${label}</button>`
          })
          .join('')}
      </div>
      <div id="navv2-map" class="navv2-map" role="application" aria-label="지도"></div>
      <p class="navv2-attr hint">© OpenStreetMap · OpenFreeMap · AIZIO Navigation v2</p>
      ${
        st.catalogOnly && st.candidates.length
          ? `<p class="hint navv2-catalog-note">로컬 카탈로그 결과 · 전국 검색은 검색 버튼으로 실행됩니다.</p>`
          : !st.catalogOnly && st.candidates.length
            ? `<p class="hint navv2-catalog-note">전국 장소 검색(Photon/OSM) · 필요 시 카카오맵·T맵으로 이어갈 수 있어요.</p>`
            : ''
      }
      <p class="hint" data-navv2-status>${esc(st.status)}</p>
      <div class="navv2-sheet">
        ${guideHtml || routeHtml}
        ${recentHtml}
        <div class="navv2-cands">${candHtml}</div>
        ${
          st.candidates.length > 5 && !st.showAll
            ? `<button type="button" class="ghost-btn" data-navv2-action="more">나머지 ${st.candidates.length - 5}곳 보기</button>`
            : ''
        }
        ${
          st.selected
            ? `<div class="navv2-detail">
                <strong>${esc(st.selected.name)}</strong>
                <p>${esc(st.selected.address)}</p>
                <div class="row-btns">
                  <button type="button" class="primary-btn" data-navv2-action="route">여기로 안내</button>
                  <button type="button" class="ghost-btn" data-navv2-action="external">다른 지도에서 열기</button>
                </div>
              </div>`
            : ''
        }
      </div>
    </section>
  `
}

export async function bindNavigationScreen(
  root: HTMLElement,
  st: NavScreenState,
  redraw: (next: Partial<NavScreenState>) => void,
): Promise<void> {
  const mapEl = root.querySelector('#navv2-map') as HTMLElement | null
  if (mapEl) {
    if (!mapCtl) mapCtl = createMapController()
    if (!mapCtl.ready) await mapCtl.mount(mapEl)
    const ctx = getNavV2Context()
    if (ctx.origin) mapCtl.setUserLocation(ctx.origin)
    mapCtl.setCandidates(st.candidates, st.selected?.id || null)
    const route = ctx.routes.find((r) => r.id === ctx.activeRouteId) || ctx.routes[0]
    if (route) {
      mapCtl.setRoute(
        route,
        ctx.routes.filter((r) => r.id !== route.id),
      )
      mapCtl.fitRoute(route)
    } else if (st.candidates.length) {
      mapCtl.fitPlaces(st.candidates)
    }
  }

  root.querySelector('#navv2-search-form')?.addEventListener('submit', (e) => {
    e.preventDefault()
    const q = (root.querySelector('#navv2-q') as HTMLInputElement | null)?.value || ''
    void doSearch(q, redraw, true)
  })

  const input = root.querySelector('#navv2-q') as HTMLInputElement | null
  input?.addEventListener('input', () => {
    const q = input.value
    if (searchTimer) clearTimeout(searchTimer)
    if (q.trim().length < 2) return
    searchTimer = setTimeout(() => {
      // debounce local catalog only — no remote on keystroke
      void doSearch(q, redraw, false)
    }, 400)
  })

  root.querySelectorAll<HTMLButtonElement>('[data-navv2-pick]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const i = Number(btn.dataset.navv2Pick)
      const c = selectCandidateByIndex(i + 1)
      if (!c) return
      mapCtl?.setCandidates(st.candidates, c.id)
      mapCtl?.flyTo({ lat: c.lat, lng: c.lng }, 15)
      redraw({ selected: c, phase: 'place_detail', status: `${c.name} 선택됨` })
    })
  })

  root.querySelectorAll<HTMLButtonElement>('[data-navv2-recent]').forEach((btn) => {
    btn.addEventListener('click', () => {
      void doSearch(btn.dataset.navv2Recent || '', redraw, true)
    })
  })

  root.querySelectorAll<HTMLButtonElement>('[data-navv2-ext]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const provider = (btn.dataset.navv2Ext || 'kakao') as Exclude<MapProviderId, 'system'>
      const q = st.query.trim()
      if (!q) return
      openExternalSearch(q, provider, redraw)
    })
  })

  root.querySelectorAll<HTMLButtonElement>('[data-navv2-mode]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.navv2Mode as NavTravelMode
      saveNavV2Settings({ travelMode: mode })
      patchNavV2Context({ travelMode: mode })
      redraw({ status: `이동수단: ${mode === 'walking' ? '도보' : mode === 'cycling' ? '자전거' : '자동차'}` })
      if (getNavV2Context().selected) void buildRoute(redraw)
    })
  })

  root.querySelector('[data-navv2-action="clear"]')?.addEventListener('click', () => {
    abort?.abort()
    redraw({ query: '', candidates: [], selected: null, phase: 'idle', status: '검색을 지웠어요.', catalogOnly: true })
  })
  root.querySelector('[data-navv2-action="more"]')?.addEventListener('click', () => redraw({ showAll: true }))
  root.querySelector('[data-navv2-action="route"]')?.addEventListener('click', () => void buildRoute(redraw))
  root.querySelector('[data-navv2-action="recalc"]')?.addEventListener('click', () => void buildRoute(redraw))
  root.querySelector('[data-navv2-action="start"]')?.addEventListener('click', () => startGuide(redraw))
  root.querySelector('[data-navv2-action="stop"]')?.addEventListener('click', () => {
    watch?.stop()
    watch = null
    patchNavV2Context({ guiding: false })
    redraw({ phase: 'route_preview', status: '안내를 종료했어요.' })
  })
  root.querySelector('[data-navv2-action="recenter"]')?.addEventListener('click', () => {
    const o = getNavV2Context().origin
    if (o) mapCtl?.flyTo(o, 16)
  })
  root.querySelector('[data-navv2-action="external"]')?.addEventListener('click', () => {
    const dest = getNavV2Context().destination || getNavV2Context().selected
    if (!dest) return
    const provider = loadNavV2Settings().externalMapDefault
    const links = buildMapLinks({
      query: `${dest.name} ${dest.address}`,
      travelMode: loadNavV2Settings().travelMode === 'walking' ? 'walking' : 'driving',
      preferredMap: provider,
    })
    if (links.appUrl && isSafeMapUrl(links.appUrl)) navigateHref(links.appUrl, { newTab: false })
    if (isSafeMapUrl(links.webUrl)) openUrl(links.webUrl, links.label)
    redraw({ status: `보조 기능: ${links.label}에서 열었어요.` })
  })
}

function openExternalSearch(
  query: string,
  preferred: Exclude<MapProviderId, 'system'>,
  redraw: (next: Partial<NavScreenState>) => void,
): void {
  const links = buildMapLinks({
    query,
    travelMode: 'unspecified',
    preferredMap: preferred,
    nearby: true,
    origin: getNavV2Context().origin,
  })
  if (links.appUrl && isSafeMapUrl(links.appUrl)) navigateHref(links.appUrl, { newTab: false })
  if (isSafeMapUrl(links.webUrl)) openUrl(links.webUrl, links.label)
  redraw({ status: `${links.label}에서 「${query}」검색을 열었어요.` })
}

async function doSearch(
  query: string,
  redraw: (next: Partial<NavScreenState>) => void,
  allowRemote = true,
): Promise<void> {
  const q = query.trim()
  if (!q) return
  abort?.abort()
  abort = new AbortController()
  redraw({
    query: q,
    phase: 'searching',
    status: allowRemote ? '전국 장소를 찾고 있어요…' : '관련 장소를 찾고 있어요.',
    selected: null,
  })
  const loc = await requestCurrentPosition({ timeoutMs: 5000 })
  const origin = loc.ok && loc.fix ? loc.fix.coords : null
  if (origin) {
    patchNavV2Context({ origin })
    mapCtl?.setUserLocation(origin)
  }
  const result = await searchPlaces(q, {
    origin,
    limit: 8,
    signal: abort.signal,
    allowRemote,
  })
  pushRecentSearch(q)
  setCandidates(q, result.candidates, origin)
  mapCtl?.setCandidates(result.candidates, null)
  if (result.candidates.length) mapCtl?.fitPlaces(result.candidates)
  const providerNote =
    result.provider.includes('photon') || result.provider.includes('remote')
      ? ' · 전국 검색'
      : result.catalogOnly
        ? ' · 로컬'
        : ''
  redraw({
    query: q,
    candidates: result.candidates,
    catalogOnly: result.catalogOnly,
    phase: result.candidates.length ? 'candidates' : 'error',
    status: result.candidates.length
      ? `${result.candidates.length}곳 후보${providerNote}`
      : '검색 결과가 없어요. 카카오맵·T맵에서 바로 찾아보세요.',
    showAll: false,
    selected: null,
  })
}

async function buildRoute(redraw: (next: Partial<NavScreenState>) => void): Promise<void> {
  const ctx = getNavV2Context()
  const dest = ctx.selected || ctx.destination
  if (!dest) {
    redraw({ status: '먼저 후보를 선택해 주세요.' })
    return
  }
  patchNavV2Context({ destination: dest })
  redraw({ status: '경로를 계산하는 중…', phase: 'route_preview' })
  let origin = ctx.origin
  if (!origin) {
    const loc = await requestCurrentPosition({ timeoutMs: 6000 })
    origin = loc.ok && loc.fix ? loc.fix.coords : { lat: dest.lat + 0.012, lng: dest.lng + 0.008 }
    patchNavV2Context({ origin })
  }
  const mode = loadNavV2Settings().travelMode
  const calc = await calculateRoutes(origin, dest, mode)
  if (!calc.routes.length) {
    redraw({ status: '경로를 계산하지 못했어요.', phase: 'error' })
    return
  }
  setRoutes(calc.routes, mode)
  const route = calc.routes[0]!
  mapCtl?.setRoute(route, calc.routes.slice(1))
  mapCtl?.fitRoute(route)
  redraw({
    selected: dest,
    phase: 'route_preview',
    status: `${dest.name} · ${formatDistance(route.distanceM)} · ${formatDuration(route.durationSec)}${route.approximate ? ' · 대략 경로' : ''}`,
  })
}

function startGuide(redraw: (next: Partial<NavScreenState>) => void): void {
  const ctx = getNavV2Context()
  const route = ctx.routes.find((r) => r.id === ctx.activeRouteId) || ctx.routes[0]
  if (!route) {
    void buildRoute(redraw).then(() => startGuide(redraw))
    return
  }
  patchNavV2Context({ guiding: true, stepIndex: 0 })
  speakOnce(route.steps[0]?.instruction || '안내를 시작합니다')
  watch?.stop()
  watch = watchPosition(
    (fix) => {
      patchNavV2Context({ origin: fix.coords })
      mapCtl?.setUserLocation(fix.coords)
      const r = getNavV2Context().routes.find((x) => x.id === getNavV2Context().activeRouteId)
      if (!r) return
      if (findOffRoute(fix.coords, r)) {
        redraw({ status: '경로를 벗어났습니다. 새 경로를 찾고 있습니다.' })
        speakOnce('경로를 벗어났습니다. 새 경로를 찾고 있습니다')
        void buildRoute(redraw)
        return
      }
      const idx = nextStepIndex(fix.coords, r, getNavV2Context().stepIndex)
      if (idx !== getNavV2Context().stepIndex) {
        patchNavV2Context({ stepIndex: idx })
        const ins = r.steps[idx]?.instruction
        if (ins) speakOnce(ins)
        redraw({ phase: 'guiding', status: ins || '' })
      }
      if (fix.accuracyM > 80) {
        redraw({ status: '현재 위치 정확도가 낮아 안내가 지연될 수 있습니다.' })
      }
    },
    (code) => redraw({ status: `위치 오류: ${code}` }),
  )
  redraw({ phase: 'guiding', status: route.steps[0]?.instruction || '안내 중' })
}

function speakOnce(text: string): void {
  if (!loadNavV2Settings().voiceEnabled) return
  if (text === lastSpoken) return
  lastSpoken = text
  try {
    if (typeof speechSynthesis === 'undefined') return
    speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'ko-KR'
    u.rate = 1.05
    speechSynthesis.speak(u)
  } catch {
    /* ignore */
  }
}

export function destroyNavigationScreen(): void {
  watch?.stop()
  watch = null
  mapCtl?.destroy()
  mapCtl = null
  abort?.abort()
}
