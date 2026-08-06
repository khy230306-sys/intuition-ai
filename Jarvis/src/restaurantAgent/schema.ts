/**
 * Restaurant Agent shared schemas (Zod).
 */

import { z } from 'zod'

export const RestaurantSearchInputSchema = z.object({
  location: z.string().optional(),
  date: z.string().optional(),
  time: z.string().optional(),
  partySize: z.number().int().min(1).optional(),
  cuisine: z.string().optional(),
  priceRange: z.enum(['$', '$$', '$$$', '$$$$']).optional(),
  maxBudgetPerPerson: z.number().optional(),
  ratingMin: z.number().optional(),
  distanceKm: z.number().optional(),
  parking: z.boolean().optional(),
  childFriendly: z.boolean().optional(),
  privateRoom: z.boolean().optional(),
  wheelchairAccessible: z.boolean().optional(),
  smokingPolicy: z.enum(['none', 'separated', 'allowed', 'unknown']).optional(),
  preferredAtmosphere: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  openNow: z.boolean().optional(),
  reservationRequired: z.boolean().optional(),
  sortBy: z.enum(['recommended', 'rating', 'distance', 'price']).optional(),
  nearMe: z.boolean().optional(),
  dietary: z.array(z.string()).optional(),
})

export const RestaurantOfferSchema = z.object({
  id: z.string(),
  provider: z.string(),
  name: z.string(),
  imageUrl: z.string().optional(),
  cuisine: z.string(),
  locationLabel: z.string(),
  address: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  openNow: z.boolean().optional(),
  reservationSupported: z.boolean(),
  reservationMode: z.enum(['api', 'deeplink', 'phone', 'none']).default('none'),
  availableSlots: z.array(z.string()).default([]),
  priceRange: z.string(),
  pricePerPersonEst: z.number().optional(),
  rating: z.number().optional(),
  reviewCount: z.number().optional(),
  signatureMenus: z.array(z.string()).default([]),
  parking: z.boolean().optional(),
  childFriendly: z.boolean().optional(),
  privateRoom: z.boolean().optional(),
  wheelchairAccessible: z.boolean().optional(),
  atmosphere: z.array(z.string()).default([]),
  phone: z.string().optional(),
  bookingUrl: z.string().optional(),
  hoursLabel: z.string().optional(),
  distanceKm: z.number().optional(),
  dietarySupport: z.record(z.string(), z.enum(['yes', 'no', 'unconfirmed'])).optional(),
  depositRequired: z.boolean().default(false),
  depositAmount: z.number().optional(),
  cancellationPolicy: z.string().optional(),
  priceKind: z.enum(['confirmed', 'estimated', 'demo']).default('demo'),
  recommendReason: z.string().optional(),
})

export const ReservationStatusSchema = z.enum([
  'NOT_STARTED',
  'PREPARING',
  'SUBMITTING',
  'UNKNOWN',
  'CONFIRMED',
  'FAILED',
  'CANCELLED',
  'PHONE_REQUIRED',
])

export const RestaurantReservationPreviewSchema = z.object({
  reservationAttemptId: z.string(),
  restaurant: RestaurantOfferSchema,
  date: z.string(),
  time: z.string(),
  partySize: z.number(),
  guestName: z.string().optional(),
  guestPhone: z.string().optional(),
  specialRequests: z.string().optional(),
  depositRequired: z.boolean(),
  depositAmount: z.number().optional(),
  cancellationPolicy: z.string().optional(),
  providerReady: z.boolean(),
  mode: z.enum(['api', 'deeplink', 'phone', 'demo']),
  missingFields: z.array(z.string()).default([]),
  notes: z.array(z.string()).default([]),
})

export const RestaurantReservationResultSchema = z.object({
  reservationAttemptId: z.string(),
  status: ReservationStatusSchema,
  confirmationNumber: z.string().optional(),
  restaurantName: z.string().optional(),
  address: z.string().optional(),
  date: z.string().optional(),
  time: z.string().optional(),
  partySize: z.number().optional(),
  provider: z.string().optional(),
  cancellationPolicy: z.string().optional(),
  contact: z.string().optional(),
  bookingUrl: z.string().optional(),
  message: z.string(),
  reservedAt: z.string().optional(),
})

export const RestaurantSessionSchema = z.object({
  id: z.string(),
  searchInput: RestaurantSearchInputSchema.optional(),
  results: z.array(RestaurantOfferSchema).default([]),
  selectedRestaurant: RestaurantOfferSchema.optional(),
  selectedDate: z.string().optional(),
  selectedTime: z.string().optional(),
  partySize: z.number().optional(),
  guestName: z.string().optional(),
  guestPhone: z.string().optional(),
  specialRequests: z.string().optional(),
  pendingQuestion: z.string().optional(),
  lastReservationAttemptId: z.string().optional(),
  reservationStatus: ReservationStatusSchema.default('NOT_STARTED'),
  status: z.enum([
    'searching',
    'selecting',
    'checking_availability',
    'ready_to_book',
    'reserved',
    'cancelled',
  ]),
  tripId: z.string().optional(),
  demo: z.boolean().default(true),
  createdAt: z.number(),
  updatedAt: z.number(),
})

export type RestaurantSearchInput = z.infer<typeof RestaurantSearchInputSchema>
export type RestaurantOffer = z.infer<typeof RestaurantOfferSchema>
export type RestaurantDetails = RestaurantOffer & { description?: string }
export type ReservationStatus = z.infer<typeof ReservationStatusSchema>
export type RestaurantReservationPreview = z.infer<typeof RestaurantReservationPreviewSchema>
export type RestaurantReservationResult = z.infer<typeof RestaurantReservationResultSchema>
export type RestaurantSession = z.infer<typeof RestaurantSessionSchema>
