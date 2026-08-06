/**
 * Shared Travel Agent schemas (Zod) — all providers adapt into these.
 */

import { z } from 'zod'

export const TravelLocationSchema = z.object({
  code: z.string(),
  name: z.string(),
  city: z.string().optional(),
  country: z.string().optional(),
  kind: z.enum(['airport', 'city', 'region']).default('city'),
})

export const TravelerSummarySchema = z.object({
  adults: z.number().int().min(1).default(1),
  children: z.number().int().min(0).default(0),
  infants: z.number().int().min(0).default(0),
  total: z.number().int().min(1).optional(),
})

export const FlightOfferSchema = z.object({
  id: z.string(),
  provider: z.string(),
  airline: z.string(),
  airlineCode: z.string().optional(),
  flightNumber: z.string(),
  origin: TravelLocationSchema,
  destination: TravelLocationSchema,
  departAt: z.string(),
  arriveAt: z.string(),
  durationMinutes: z.number(),
  stops: z.number().int().min(0),
  cabinClass: z.string(),
  baggage: z.string(),
  totalPrice: z.number(),
  pricePerPerson: z.number(),
  currency: z.string().default('KRW'),
  refundable: z.boolean(),
  changeable: z.boolean(),
  pricedAt: z.string(),
  priceKind: z.enum(['confirmed', 'estimated', 'demo']).default('demo'),
  tags: z.array(z.string()).default([]),
})

export const HotelOfferSchema = z.object({
  id: z.string(),
  provider: z.string(),
  name: z.string(),
  imageUrl: z.string().optional(),
  locationLabel: z.string(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  starRating: z.number().optional(),
  guestScore: z.number().optional(),
  roomName: z.string(),
  totalPrice: z.number(),
  pricePerNight: z.number(),
  nights: z.number().int().min(1),
  taxesAndFees: z.number().default(0),
  currency: z.string().default('KRW'),
  breakfast: z.boolean().default(false),
  cancellable: z.boolean().default(false),
  paymentTerms: z.string().default(''),
  amenities: z.array(z.string()).default([]),
  seaView: z.boolean().default(false),
  pool: z.boolean().default(false),
  parking: z.boolean().default(false),
  pricedAt: z.string(),
  priceKind: z.enum(['confirmed', 'estimated', 'demo']).default('demo'),
})

export const BookingStatusSchema = z.enum([
  'NOT_STARTED',
  'PREPARING',
  'SUBMITTING',
  'UNKNOWN',
  'CONFIRMED',
  'FAILED',
  'CANCELLED',
])

export const BookingPreviewSchema = z.object({
  bookingAttemptId: z.string(),
  flight: FlightOfferSchema.optional(),
  hotel: HotelOfferSchema.optional(),
  travelers: TravelerSummarySchema,
  flightTotal: z.number().default(0),
  hotelTotal: z.number().default(0),
  grandTotal: z.number(),
  currency: z.string().default('KRW'),
  priceChanged: z.boolean().default(false),
  previousGrandTotal: z.number().optional(),
  notes: z.array(z.string()).default([]),
  providerReady: z.boolean().default(false),
})

export const BookingResultSchema = z.object({
  bookingAttemptId: z.string(),
  status: BookingStatusSchema,
  confirmationCode: z.string().optional(),
  flightPnr: z.string().optional(),
  hotelConfirmation: z.string().optional(),
  grandTotal: z.number().optional(),
  currency: z.string().optional(),
  message: z.string(),
  bookedAt: z.string().optional(),
})

export const TripSchema = z.object({
  id: z.string(),
  title: z.string(),
  destinationLabel: z.string(),
  originLabel: z.string().optional(),
  departureDate: z.string().optional(),
  returnDate: z.string().optional(),
  checkIn: z.string().optional(),
  checkOut: z.string().optional(),
  travelers: TravelerSummarySchema,
  selectedFlight: FlightOfferSchema.optional(),
  selectedHotel: HotelOfferSchema.optional(),
  estimatedTotal: z.number().default(0),
  currency: z.string().default('KRW'),
  bookingStatus: BookingStatusSchema.default('NOT_STARTED'),
  confirmationCode: z.string().optional(),
  flightPnr: z.string().optional(),
  hotelConfirmation: z.string().optional(),
  itineraryNotes: z.array(z.string()).default([]),
  calendarEventIds: z.array(z.string()).default([]),
  demo: z.boolean().default(true),
  createdAt: z.number(),
  updatedAt: z.number(),
})

export const TravelSessionSchema = z.object({
  id: z.string(),
  status: z.enum(['planning', 'searching', 'selecting', 'ready_to_book', 'booked', 'cancelled']),
  origin: TravelLocationSchema.optional(),
  destination: TravelLocationSchema.optional(),
  departureDate: z.string().optional(),
  returnDate: z.string().optional(),
  tripType: z.enum(['one_way', 'round_trip', 'unknown']).default('unknown'),
  cabinClass: z.string().default('economy'),
  travelers: TravelerSummarySchema,
  flightPreferences: z
    .object({
      directOnly: z.boolean().optional(),
      maxPrice: z.number().optional(),
      preferredAirline: z.string().optional(),
      excludeAirline: z.string().optional(),
      preferredTimeBand: z.enum(['morning', 'afternoon', 'evening', 'any']).optional(),
      sortBy: z.enum(['price', 'duration', 'recommended']).optional(),
    })
    .optional(),
  hotelPreferences: z
    .object({
      maxPricePerNight: z.number().optional(),
      seaView: z.boolean().optional(),
      pool: z.boolean().optional(),
      breakfast: z.boolean().optional(),
      parking: z.boolean().optional(),
      starRatingMin: z.number().optional(),
      preferredArea: z.string().optional(),
    })
    .optional(),
  flightSearchResults: z.array(FlightOfferSchema).default([]),
  selectedFlight: FlightOfferSchema.optional(),
  hotelSearchResults: z.array(HotelOfferSchema).default([]),
  selectedHotel: HotelOfferSchema.optional(),
  tripId: z.string().optional(),
  pendingQuestion: z.string().optional(),
  /** When user said 「다음 달」 before giving day numbers */
  dateMonthHint: z.enum(['current', 'next']).optional(),
  lastBookingAttemptId: z.string().optional(),
  bookingStatus: BookingStatusSchema.default('NOT_STARTED'),
  demo: z.boolean().default(true),
  createdAt: z.number(),
  updatedAt: z.number(),
})

export type TravelLocation = z.infer<typeof TravelLocationSchema>
export type TravelerSummary = z.infer<typeof TravelerSummarySchema>
export type FlightOffer = z.infer<typeof FlightOfferSchema>
export type HotelOffer = z.infer<typeof HotelOfferSchema>
export type BookingStatus = z.infer<typeof BookingStatusSchema>
export type BookingPreview = z.infer<typeof BookingPreviewSchema>
export type BookingResult = z.infer<typeof BookingResultSchema>
export type Trip = z.infer<typeof TripSchema>
export type TravelSession = z.infer<typeof TravelSessionSchema>
