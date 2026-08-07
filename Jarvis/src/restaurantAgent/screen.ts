import { MSG_RESTAURANT_UNAVAILABLE } from '../featureTruth'
import { isDemoRestaurantMode, loadRestaurantConfig, restaurantProviderStatus } from './config'
import { loadRestaurantSession } from './session'

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/** Restaurant screen — DEMO catalog UI disabled. */
export function renderRestaurantScreen(): string {
  const session = loadRestaurantSession()
  const demo = isDemoRestaurantMode()
  const st = restaurantProviderStatus(loadRestaurantConfig())
  const live = st === 'connected' && !demo

  if (!live) {
    return `
      <section class="restaurant-agent-screen" data-restaurant-screen="1" data-restaurant-unavailable="1">
        <header class="travel-head">
          <h2>맛집 · 예약</h2>
          <span class="travel-demo-badge">미연결</span>
        </header>
        <div class="travel-empty">
          <p class="travel-empty-title">실검색 미연결</p>
          <p class="hint">${esc(MSG_RESTAURANT_UNAVAILABLE)}</p>
        </div>
        <p class="hint">Provider: ${esc(st)}</p>
      </section>`
  }

  const sel = session?.selectedRestaurant
  return `
    <section class="restaurant-agent-screen" data-restaurant-screen="1">
      <header class="travel-head">
        <h2>맛집 · 예약</h2>
      </header>
      <div class="travel-block">
        <h3>선택 식당</h3>
        ${
          sel
            ? `<p>${esc(sel.name)}</p><p class="hint">${esc(sel.locationLabel)} · ${esc(sel.cuisine)}</p>`
            : '<p class="hint">아직 선택 없음</p>'
        }
      </div>
      <p class="hint">Provider: connected</p>
    </section>`
}
