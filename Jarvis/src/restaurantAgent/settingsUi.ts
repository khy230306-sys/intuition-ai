import { loadRestaurantConfig, restaurantProviderStatus } from './config'

export function renderRestaurantServicesSettingsHtml(): string {
  const cfg = loadRestaurantConfig()
  const st = restaurantProviderStatus(cfg)
  return `
    <section class="settings-card travel-services-card" data-restaurant-services="1">
      <h3>Restaurant Services</h3>
      <p class="hint">Status: <strong>${st === 'connected' ? 'Connected' : st === 'demo' ? 'Demo' : 'Not configured'}</strong></p>
      <p class="hint">API Key는 저장만 하며 화면에 다시 보여주지 않습니다. 키가 없으면 Demo로 동작합니다.</p>
      <label>Provider
        <select id="restaurant-provider">
          <option value="demo" ${cfg.provider === 'demo' ? 'selected' : ''}>Demo</option>
          <option value="deeplink" ${cfg.provider === 'deeplink' ? 'selected' : ''}>Deep Link</option>
          <option value="external" ${cfg.provider === 'external' ? 'selected' : ''}>External (Naver/Catchtable/OpenTable…)</option>
        </select>
      </label>
      <label>External API Key (입력 시에만 갱신)
        <input type="password" id="restaurant-external-key" autocomplete="off" placeholder="••••" />
      </label>
      <button type="button" class="primary-btn" data-action="restaurant-services-save">Restaurant Services 저장</button>
    </section>`
}
