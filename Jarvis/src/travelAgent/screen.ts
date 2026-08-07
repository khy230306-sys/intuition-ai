import { MSG_TRAVEL_UNAVAILABLE } from '../featureTruth'
import {
  flightProviderStatus,
  hotelProviderStatus,
  loadTravelConfig,
  statusLabelKo,
} from './config'
import { loadTravelSession } from './session'
import { currentTrip, loadTrips } from './trip'

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Travel screen — DEMO search UI disabled; honest unavailable state. */
export function renderTravelScreen(): string {
  const session = loadTravelSession()
  const trip = currentTrip()
  const cfg = loadTravelConfig()
  const fSt = flightProviderStatus(cfg)
  const hSt = hotelProviderStatus(cfg)
  const liveReady = fSt === 'connected' || hSt === 'connected'
  const trips = loadTrips().filter((x) => !x.demo).slice(0, 5)

  if (!liveReady) {
    return `
      <section class="travel-agent-screen" data-travel-screen="1" data-travel-unavailable="1">
        <header class="travel-head">
          <h2>여행</h2>
          <span class="travel-demo-badge">미연결</span>
        </header>
        <div class="travel-empty">
          <p class="travel-empty-title">실검색 미연결</p>
          <p class="hint">${esc(MSG_TRAVEL_UNAVAILABLE)}</p>
        </div>
        <p class="hint travel-provider-hint">Flights: ${statusLabelKo(fSt)} · Hotels: ${statusLabelKo(hSt)}</p>
      </section>`
  }

  const dest = session?.destination?.city || trip?.destinationLabel || '여행'
  const flight = session?.selectedFlight || trip?.selectedFlight
  const hotel = session?.selectedHotel || trip?.selectedHotel

  return `
    <section class="travel-agent-screen" data-travel-screen="1">
      <header class="travel-head">
        <h2>여행</h2>
      </header>
      <div class="travel-current">
        <h3>현재 여행</h3>
        <p class="travel-title">${esc(String(dest))}${session?.departureDate ? ` · ${esc(session.departureDate)}` : ''}</p>
        <p class="hint">상태: ${esc(session?.status || trip?.bookingStatus || '-')}</p>
      </div>
      <div class="travel-cols">
        <div class="travel-block">
          <h4>항공</h4>
          ${
            flight
              ? `<p>${esc(flight.airline)} ${esc(flight.flightNumber)}</p>`
              : '<p class="hint">아직 선택 없음</p>'
          }
        </div>
        <div class="travel-block">
          <h4>호텔</h4>
          ${hotel ? `<p>${esc(hotel.name)}</p>` : '<p class="hint">아직 선택 없음</p>'}
        </div>
      </div>
      ${
        trips.length
          ? `<div class="travel-block"><h4>저장된 여행</h4><ul class="travel-trip-list">${trips
              .map((x) => `<li>${esc(x.title)}</li>`)
              .join('')}</ul></div>`
          : ''
      }
      <p class="hint travel-provider-hint">Flights: ${statusLabelKo(fSt)} · Hotels: ${statusLabelKo(hSt)}</p>
    </section>`
}
