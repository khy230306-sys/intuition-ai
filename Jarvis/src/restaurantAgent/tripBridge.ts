import { getTrip, upsertTrip } from '../travelAgent/trip'
import type { RestaurantReservationResult, RestaurantSession } from './schema'

/** Attach confirmed restaurant slot to current/linked Trip itinerary notes. */
export function maybeAttachToTrip(
  session: RestaurantSession,
  result: RestaurantReservationResult,
): void {
  if (result.status !== 'CONFIRMED') return
  const tripId = session.tripId
  const trip = tripId ? getTrip(tripId) : null
  if (!trip) return
  const line = `${result.time || session.selectedTime || ''} ${result.restaurantName || session.selectedRestaurant?.name || 'Restaurant'}`.trim()
  const notes = [...(trip.itineraryNotes || [])]
  if (!notes.some((n) => n.includes(line))) notes.push(line)
  upsertTrip({ ...trip, itineraryNotes: notes, updatedAt: Date.now() })
}
