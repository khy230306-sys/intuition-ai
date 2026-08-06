import { isDemoRestaurantMode, loadRestaurantConfig, restaurantProviderStatus } from './config'
import { loadRestaurantSession } from './session'

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export function renderRestaurantScreen(): string {
  const session = loadRestaurantSession()
  const demo = isDemoRestaurantMode()
  const st = restaurantProviderStatus(loadRestaurantConfig())

  if (!session || !session.results.length) {
    return `
      <section class="restaurant-agent-screen" data-restaurant-screen="1">
        <header class="travel-head">
          <h2>맛집 · 예약</h2>
          ${demo ? '<span class="travel-demo-badge">DEMO</span>' : ''}
        </header>
        <div class="travel-empty">
          <p class="travel-empty-title">어디로 외식할까요?</p>
          <p class="hint">대화창에서 「울산 삼산 맛집」처럼 말해 보세요.</p>
          <button type="button" class="primary-btn" data-action="restaurant-ask-aizio">AIZIO에게 맛집 요청하기</button>
        </div>
        <p class="hint">Provider: ${st}</p>
      </section>`
  }

  const sel = session.selectedRestaurant
  return `
    <section class="restaurant-agent-screen" data-restaurant-screen="1">
      <header class="travel-head">
        <h2>맛집 · 예약</h2>
        ${demo ? '<span class="travel-demo-badge">DEMO</span>' : ''}
      </header>
      <div class="travel-block">
        <h3>검색 조건</h3>
        <p class="hint">${esc(session.searchInput?.location || '-')} · ${esc(session.searchInput?.cuisine || '전체')} · ${session.partySize || session.searchInput?.partySize || '?'}명 · ${esc(session.selectedTime || session.searchInput?.time || '')}</p>
      </div>
      <div class="travel-block">
        <h3>선택 식당</h3>
        ${
          sel
            ? `<p>${esc(sel.name)}</p><p class="hint">${esc(sel.locationLabel)} · ${esc(sel.cuisine)}</p>`
            : '<p class="hint">아직 선택 없음</p>'
        }
      </div>
      <div class="travel-block">
        <h4>결과 ${session.results.length}곳</h4>
        <ul class="travel-trip-list">
          ${session.results.map((r, i) => `<li>${i + 1}. ${esc(r.name)} ★${r.rating ?? '-'}</li>`).join('')}
        </ul>
      </div>
      <div class="travel-actions">
        <button type="button" class="primary-btn" data-action="restaurant-ask-aizio">AIZIO에게 이어서 말하기</button>
        <button type="button" class="ghost-btn" data-action="restaurant-clear-session">새 검색</button>
      </div>
    </section>`
}
