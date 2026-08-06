import type { BookingResult, FlightOffer, HotelOffer } from '../schema'

export type FlightSearchInput = {
  origin: string
  destination: string
  departureDate: string
  returnDate?: string
  adults: number
  children?: number
  infants?: number
  cabinClass?: string
  directOnly?: boolean
  maxPrice?: number
  preferredTimeBand?: 'morning' | 'afternoon' | 'evening' | 'any'
  excludeAirline?: string
  sortBy?: 'price' | 'duration' | 'recommended'
}

export type FlightSearchResult = {
  offers: FlightOffer[]
  searchedAt: string
  provider: string
  demo: boolean
}

export type HotelSearchInput = {
  destination: string
  checkIn: string
  checkOut: string
  adults: number
  children?: number
  rooms?: number
  maxPricePerNight?: number
  seaView?: boolean
  pool?: boolean
  breakfast?: boolean
  parking?: boolean
  starRatingMin?: number
}

export type HotelSearchResult = {
  offers: HotelOffer[]
  searchedAt: string
  provider: string
  demo: boolean
}

export type FlightBookingInput = {
  offerId: string
  bookingAttemptId: string
  adults: number
  children?: number
  infants?: number
}

export type HotelBookingInput = {
  offerId: string
  bookingAttemptId: string
  adults: number
  children?: number
  checkIn: string
  checkOut: string
}

export type FlightCancelResult = { ok: boolean; message: string }
export type HotelCancelResult = { ok: boolean; message: string }
export type HotelDetails = HotelOffer & { description?: string }
export type HotelBookingPreview = { offer: HotelOffer; total: number; currency: string }

export interface FlightProvider {
  id: string
  searchFlights(input: FlightSearchInput): Promise<FlightSearchResult>
  priceOffer?(offerId: string): Promise<FlightOffer>
  createBooking?(input: FlightBookingInput): Promise<BookingResult>
  getBooking?(bookingId: string): Promise<BookingResult>
  cancelBooking?(bookingId: string): Promise<FlightCancelResult>
}

export interface HotelProvider {
  id: string
  searchHotels(input: HotelSearchInput): Promise<HotelSearchResult>
  getHotelDetails?(propertyId: string): Promise<HotelDetails>
  prepareBooking?(input: HotelBookingInput): Promise<HotelBookingPreview>
  createBooking?(input: HotelBookingInput): Promise<BookingResult>
  getBooking?(bookingId: string): Promise<BookingResult>
  cancelBooking?(bookingId: string): Promise<HotelCancelResult>
}
