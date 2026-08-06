import type {
  RestaurantDetails,
  RestaurantOffer,
  RestaurantReservationPreview,
  RestaurantReservationResult,
  RestaurantSearchInput,
} from '../schema'

export type RestaurantSearchResult = {
  offers: RestaurantOffer[]
  searchedAt: string
  provider: string
  demo: boolean
}

export type RestaurantAvailabilityInput = {
  restaurantId: string
  date: string
  time: string
  partySize: number
}

export type RestaurantAvailabilityResult = {
  available: boolean
  requestedTime: string
  alternatives: string[]
  message: string
}

export type RestaurantReservationInput = {
  restaurantId: string
  reservationAttemptId: string
  date: string
  time: string
  partySize: number
  guestName?: string
  guestPhone?: string
  specialRequests?: string
}

export type RestaurantCancelResult = { ok: boolean; message: string }

export interface RestaurantProvider {
  id: string
  searchRestaurants(input: RestaurantSearchInput): Promise<RestaurantSearchResult>
  getRestaurantDetails(restaurantId: string): Promise<RestaurantDetails>
  checkAvailability?(input: RestaurantAvailabilityInput): Promise<RestaurantAvailabilityResult>
  prepareReservation?(input: RestaurantReservationInput): Promise<RestaurantReservationPreview>
  createReservation?(input: RestaurantReservationInput): Promise<RestaurantReservationResult>
  getReservation?(reservationId: string): Promise<RestaurantReservationResult>
  cancelReservation?(reservationId: string): Promise<RestaurantCancelResult>
}

/** Future: Voice Agent may drive phone reservations — no auto-call in this stage. */
export interface PhoneReservationProvider {
  id: string
  buildCallPayload(input: RestaurantReservationInput & { phone: string }): {
    phone: string
    scriptSummary: string
  }
}
