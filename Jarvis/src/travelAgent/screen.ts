import {
  flightProviderStatus,
  hotelProviderStatus,
  loadTravelConfig,
  statusLabelKo,
} from './config'
import { locationLabel } from './locations'
import { loadTravelSession } from './session'
import { currentTrip, loadTrips } from './trip'

function won(n: number): string {
  return `${Math.round(n).toLocaleString('ko-KR')}원`
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function renderTravelScreen(): string {
  const session = loadTravelSession()
  const trip = currentTrip()
  const cfg = loadTravelConfig()
  const demo =
    flightProviderStatus(cfg) === 'demo' ||
    hotelProviderStatus(cfg) === 'demo' ||
    flightProviderStatus(cfg) === 'not_configured'
  const trips = loadTrips().slice(0, 5)

  if (!session && !trip) {
    return `
      <section class="travel-agent-screen" data-travel-screen="1">
        <header class="travel-head">
          <h2>여행</h2>
          ${demo ? '<span class="travel-demo-badge">DEMO</span>' : ''}
        </header>
        <div class="travel-empty">
          <p class="travel-empty-title">어디로 가고 싶으세요?</p>
          <p class="hint">대화창에서 자연어로 요청하거나 아래 버튼을 눌러 주세요.</p>
          <button type="button" class="primary-btn" data-action="travel-ask-aizio">AIZIO에게 여행 요청하기</button>
        </div>
        <p class="hint travel-provider-hint">Flights: ${statusLabelKo(flightProviderStatus(cfg))} · Hotels: ${statusLabelKo(hotelProviderStatus(cfg))}</p>
      </section>`
  }

  const dest = locationLabel(session?.destination) || trip?.destinationLabel || '여행'
  const flight = session?.selectedFlight || trip?.selectedFlight
  const hotel = session?.selectedHotel || trip?.selectedHotel
  const total =
    (flight?.totalPrice || 0) + (hotel?.totalPrice || 0) || trip?.estimatedTotal || 0

  return `
    <section class="travel-agent-screen" data-travel-screen="1">
      <header class="travel-head">
        <h2>여행</h2>
        ${demo ? '<span class="travel-demo-badge">DEMO</span>' : ''}
      </header>
      <div class="travel-current">
        <h3>현재 여행</h3>
        <p class="travel-title">${esc(dest)}${session?.departureDate ? ` · ${esc(session.departureDate)}` : ''}${session?.returnDate ? ` ~ ${esc(session.returnDate)}` : ''}</p>
        <p class="hint">상태: ${esc(session?.status || trip?.bookingStatus || '-')}</p>
      </div>
      <div class="travel-cols">
        <div class="travel-block">
          <h4>항공</h4>
          ${
            flight
              ? `<p>${esc(flight.airline)} ${esc(flight.flightNumber)}</p>
                 <p class="hint">${esc(flight.origin.code)} → ${esc(flight.destination.code)} · ${won(flight.totalPrice)}</p>`
              : '<p class="hint">아직 선택 없음</p>'
          }
        </div>
        <div class="travel-block">
          <h4>호텔</h4>
          ${
            hotel
              ? `<p>${esc(hotel.name)}</p>
                 <p class="hint">${esc(hotel.locationLabel)} · ${won(hotel.totalPrice)}</p>`
              : '<p class="hint">아직 선택 없음</p>'
          }
        </div>
      </div>
      <div class="travel-block">
        <h4>여행 일정</h4>
        <p class="hint">${esc((trip?.itineraryNotes || []).slice(0, 3).join(' · ') || '대화에서 일정을 만들어 보세요.')}</p>
      </div>
      <div class="travel-block travel-cost">
        <h4>예상 비용</h4>
        <p class="travel-total">${won(total)}${demo ? ' <span class="travel-demo-badge">DEMO</span>' : ''}</p>
      </div>
      <div class="travel-actions">
        <button type="button" class="primary-btn" data-action="travel-ask-aizio">AIZIO에게 여행 요청하기</button>
        <button type="button" class="ghost-btn" data-action="travel-clear-session">새 여행</button>
      </div>
      ${
        trips.length
          ? `<div class="travel-block"><h4>저장된 여행</h4><ul class="travel-trip-list">${trips
              .map((x) => `<li>${esc(x.title)} · ${won(x.estimatedTotal)}${x.demo ? ' (DEMO)' : ''}</li>`)
              .join('')}</ul></div>`
          : ''
      }
    </section>`
}
