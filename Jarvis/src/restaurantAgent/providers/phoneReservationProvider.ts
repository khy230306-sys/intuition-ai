import type { PhoneReservationProvider } from './types'
import type { RestaurantReservationInput } from './types'

/** Interface-only for future Voice Agent — this stage never auto-dials. */
export class StubPhoneReservationProvider implements PhoneReservationProvider {
  id = 'phone_stub'

  buildCallPayload(input: RestaurantReservationInput & { phone: string }) {
    return {
      phone: input.phone,
      scriptSummary: `${input.date} ${input.time} ${input.partySize}명 예약 문의 (자동 통화 미지원)`,
    }
  }
}

export const stubPhoneReservationProvider = new StubPhoneReservationProvider()
