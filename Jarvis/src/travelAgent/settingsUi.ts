import {
  flightProviderStatus,
  hotelProviderStatus,
  loadTravelConfig,
  statusLabelKo,
  type FlightProviderId,
  type HotelProviderId,
} from './config'

export function renderTravelServicesSettingsHtml(): string {
  const cfg = loadTravelConfig()
  const fStatus = statusLabelKo(flightProviderStatus(cfg))
  const hStatus = statusLabelKo(hotelProviderStatus(cfg))

  const flightOpts: Array<{ id: FlightProviderId; label: string }> = [
    { id: 'demo', label: 'Demo' },
    { id: 'duffel', label: 'Duffel' },
    { id: 'amadeus', label: 'Amadeus' },
  ]
  const hotelOpts: Array<{ id: HotelProviderId; label: string }> = [
    { id: 'demo', label: 'Demo' },
    { id: 'expedia_rapid', label: 'Expedia Rapid' },
    { id: 'amadeus', label: 'Amadeus' },
  ]

  return `
    <section class="settings-card travel-services-card" data-travel-services="1">
      <h3>Travel Services</h3>
      <p class="hint">API Key는 저장만 하며 화면에 다시 보여주지 않습니다. 키가 없으면 Demo로 동작합니다.</p>
      <div class="travel-svc-block">
        <h4>Flights</h4>
        <p class="hint">Status: <strong>${fStatus}</strong></p>
        <label>Provider
          <select id="travel-flight-provider">
            ${flightOpts
              .map(
                (o) =>
                  `<option value="${o.id}" ${cfg.flightProvider === o.id ? 'selected' : ''}>${o.label}</option>`,
              )
              .join('')}
          </select>
        </label>
        <label class="travel-key-label">Duffel / Amadeus Key (입력 시에만 갱신)
          <input type="password" id="travel-flight-key" autocomplete="off" placeholder="••••" />
        </label>
      </div>
      <div class="travel-svc-block">
        <h4>Hotels</h4>
        <p class="hint">Status: <strong>${hStatus}</strong></p>
        <label>Provider
          <select id="travel-hotel-provider">
            ${hotelOpts
              .map(
                (o) =>
                  `<option value="${o.id}" ${cfg.hotelProvider === o.id ? 'selected' : ''}>${o.label}</option>`,
              )
              .join('')}
          </select>
        </label>
        <label class="travel-key-label">Expedia / Amadeus Key (입력 시에만 갱신)
          <input type="password" id="travel-hotel-key" autocomplete="off" placeholder="••••" />
        </label>
      </div>
      <label class="travel-auto-cal">
        <input type="checkbox" id="travel-auto-calendar" ${cfg.autoAddCalendar ? 'checked' : ''} />
        예약 후 일정 자동 등록
      </label>
      <button type="button" class="primary-btn" data-action="travel-services-save">Travel Services 저장</button>
    </section>`
}
