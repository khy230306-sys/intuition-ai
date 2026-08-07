/**
 * Open-Meteo weather provider — no API key. Used via registry (engine still
 * calls weatherTool which uses the same upstream; registry exposes health).
 */

import type { ProviderAvailability, ProviderHealth } from '../types'

export type WeatherProvider = {
  readonly id: string
  readonly label: string
  readonly isTestDouble?: boolean
  healthCheck(): Promise<ProviderHealth>
}

export class OpenMeteoWeatherProvider implements WeatherProvider {
  readonly id = 'open-meteo'
  readonly label = 'Open-Meteo'

  async healthCheck(): Promise<ProviderHealth> {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return {
        providerId: this.id,
        availability: 'UNAVAILABLE' as ProviderAvailability,
        message: '오프라인',
        checkedAt: Date.now(),
      }
    }
    return {
      providerId: this.id,
      availability: 'READY',
      message: 'Open-Meteo 공개 API',
      checkedAt: Date.now(),
    }
  }
}

export const openMeteoWeatherProvider = new OpenMeteoWeatherProvider()
