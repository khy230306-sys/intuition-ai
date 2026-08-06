import { TripSchema, type TravelSession, type Trip } from './schema'
import { locationLabel } from './locations'

const KEY = 'aizio_travel_trips_v1'

function newId(): string {
  return `trip_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

export function loadTrips(): Trip[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const arr = JSON.parse(raw) as unknown[]
    return arr.map((t) => TripSchema.parse(t))
  } catch {
    return []
  }
}

export function saveTrips(trips: Trip[]): void {
  localStorage.setItem(KEY, JSON.stringify(trips.slice(0, 40)))
}

export function getTrip(id: string): Trip | null {
  return loadTrips().find((t) => t.id === id) || null
}

export function upsertTrip(trip: Trip): Trip {
  const list = loadTrips().filter((t) => t.id !== trip.id)
  list.unshift(trip)
  saveTrips(list)
  return trip
}

export function tripFromSession(session: TravelSession): Trip {
  const flightTotal = session.selectedFlight?.totalPrice || 0
  const hotelTotal = session.selectedHotel?.totalPrice || 0
  const dest = locationLabel(session.destination) || '여행'
  const now = Date.now()
  const existing = session.tripId ? getTrip(session.tripId) : null
  const trip: Trip = TripSchema.parse({
    id: existing?.id || session.tripId || newId(),
    title: `${dest} 여행`,
    destinationLabel: dest,
    originLabel: locationLabel(session.origin) || undefined,
    departureDate: session.departureDate,
    returnDate: session.returnDate,
    checkIn: session.departureDate,
    checkOut: session.returnDate,
    travelers: session.travelers,
    selectedFlight: session.selectedFlight,
    selectedHotel: session.selectedHotel,
    estimatedTotal: flightTotal + hotelTotal,
    currency: 'KRW',
    bookingStatus: session.bookingStatus,
    confirmationCode: existing?.confirmationCode,
    flightPnr: existing?.flightPnr,
    hotelConfirmation: existing?.hotelConfirmation,
    itineraryNotes: existing?.itineraryNotes || [],
    calendarEventIds: existing?.calendarEventIds || [],
    demo: session.demo,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  })
  return upsertTrip(trip)
}

export function currentTrip(): Trip | null {
  const trips = loadTrips()
  return trips[0] || null
}
