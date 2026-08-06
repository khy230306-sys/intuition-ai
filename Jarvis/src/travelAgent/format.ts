import type { BookingPreview, BookingResult, FlightOffer, HotelOffer, TravelSession, Trip } from './schema'
import { locationLabel } from './locations'

function won(n: number): string {
  return `${Math.round(n).toLocaleString('ko-KR')}원`
}

function timeLabel(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return iso
  }
}

function dur(mins: number): string {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return h ? `${h}시간 ${m}분` : `${m}분`
}

export function formatFlightList(offers: FlightOffer[], demo: boolean): string {
  if (!offers.length) return '조건에 맞는 항공편이 없습니다. 날짜나 조건을 바꿔볼까요?'
  const head = demo ? '【DEMO 항공 검색】실제 요금·좌석과 다를 수 있습니다.\n' : '【항공 검색】\n'
  const lines = offers.map((o, i) => {
    const tags = o.tags.length ? ` · ${o.tags.join('/')}` : ''
    return [
      `${i + 1}. ${o.airline} ${o.flightNumber}${tags}`,
      `   ${o.origin.code} ${timeLabel(o.departAt)} → ${o.destination.code} ${timeLabel(o.arriveAt)} (${dur(o.durationMinutes)}, 경유 ${o.stops}회)`,
      `   ${o.cabinClass} · ${o.baggage} · 1인 ${won(o.pricePerPerson)} / 총 ${won(o.totalPrice)} (${o.priceKind === 'demo' ? 'DEMO' : o.priceKind})`,
      `   환불 ${o.refundable ? '가능' : '불가'} · 변경 ${o.changeable ? '가능' : '불가'} · ${o.provider}`,
    ].join('\n')
  })
  return head + lines.join('\n\n') + '\n\n번호로 고르거나 「더 싼 거」「직항만」이라고 말해 주세요.'
}

export function formatHotelList(offers: HotelOffer[], demo: boolean): string {
  if (!offers.length) return '조건에 맞는 호텔이 없습니다. 가격이나 편의시설 조건을 바꿔볼까요?'
  const head = demo ? '【DEMO 호텔 검색】실제 요금·잔여와 다를 수 있습니다.\n' : '【호텔 검색】\n'
  const lines = offers.map((o, i) => {
    const am = o.amenities.slice(0, 4).join(', ')
    return [
      `${i + 1}. ${o.name} ★${o.starRating ?? '-'} ${o.guestScore ? `(평점 ${o.guestScore})` : ''}`,
      `   ${o.locationLabel} · ${o.roomName} · ${o.nights}박`,
      `   1박 ${won(o.pricePerNight)} / 총 ${won(o.totalPrice)} (세금·수수료 ${won(o.taxesAndFees)} 포함, ${o.priceKind === 'demo' ? 'DEMO' : o.priceKind})`,
      `   ${am}${o.breakfast ? ' · 조식' : ''} · 취소 ${o.cancellable ? '가능' : '불가'} · ${o.provider}`,
    ].join('\n')
  })
  return head + lines.join('\n\n') + '\n\n번호로 고르거나 「바다 보이는」「20만원 이하」로 필터할 수 있어요.'
}

export function formatFlightDetails(o: FlightOffer): string {
  return [
    `【항공 상세${o.priceKind === 'demo' ? ' · DEMO' : ''}】`,
    `${o.airline} ${o.flightNumber}`,
    `${locationLabel(o.origin)}(${o.origin.code}) ${timeLabel(o.departAt)} → ${locationLabel(o.destination)}(${o.destination.code}) ${timeLabel(o.arriveAt)}`,
    `소요 ${dur(o.durationMinutes)} · 경유 ${o.stops}회 · ${o.cabinClass}`,
    `수하물: ${o.baggage}`,
    `1인 ${won(o.pricePerPerson)} / 총 ${won(o.totalPrice)} · 확인시각 ${new Date(o.pricedAt).toLocaleString('ko-KR')}`,
    `환불 ${o.refundable ? '가능' : '불가'} · 변경 ${o.changeable ? '가능' : '불가'} · Provider: ${o.provider}`,
  ].join('\n')
}

export function formatHotelDetails(o: HotelOffer): string {
  return [
    `【호텔 상세${o.priceKind === 'demo' ? ' · DEMO' : ''}】`,
    `${o.name}`,
    `${o.locationLabel} · ★${o.starRating ?? '-'} · ${o.roomName}`,
    `${o.nights}박 · 1박 ${won(o.pricePerNight)} / 총 ${won(o.totalPrice)} (세금 ${won(o.taxesAndFees)})`,
    `조식 ${o.breakfast ? '포함' : '별도'} · 취소 ${o.cancellable ? '가능' : '불가'}`,
    `결제: ${o.paymentTerms}`,
    `편의시설: ${o.amenities.join(', ') || '-'}`,
    `가격종류: ${o.priceKind} · Provider: ${o.provider}`,
  ].join('\n')
}

export function formatTripSummary(session: TravelSession, trip?: Trip | null): string {
  const dest = locationLabel(session.destination) || trip?.destinationLabel || '여행'
  const flight = session.selectedFlight
  const hotel = session.selectedHotel
  const total = (flight?.totalPrice || 0) + (hotel?.totalPrice || 0)
  return [
    `【${dest} 여행 요약${session.demo ? ' · DEMO' : ''}】`,
    `기간: ${session.departureDate || '?'} ~ ${session.returnDate || '?'}`,
    `인원: 성인 ${session.travelers.adults}` +
      (session.travelers.children ? ` · 아동 ${session.travelers.children}` : ''),
    flight
      ? `항공: ${flight.airline} ${flight.flightNumber} · ${won(flight.totalPrice)}`
      : '항공: 미선택',
    hotel ? `호텔: ${hotel.name} · ${won(hotel.totalPrice)}` : '호텔: 미선택',
    `예상 총비용: ${won(total)}`,
    trip?.confirmationCode ? `예약번호: ${trip.confirmationCode}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}

export function formatBookingPreview(p: BookingPreview): string {
  const lines = [
    `【예약 준비${p.providerReady ? '' : ' · DEMO'}】`,
    p.priceChanged
      ? `⚠ 가격이 변경되었습니다. 이전 합계 ${won(p.previousGrandTotal || 0)} → 현재 ${won(p.grandTotal)}`
      : '',
    p.flight
      ? `항공: ${p.flight.airline} ${p.flight.flightNumber} · 승객 ${p.travelers.adults}명 · ${won(p.flightTotal)}\n  수하물 ${p.flight.baggage} · 변경 ${p.flight.changeable ? '가능' : '불가'} · 환불 ${p.flight.refundable ? '가능' : '불가'}`
      : '',
    p.hotel
      ? `호텔: ${p.hotel.name} · ${p.hotel.roomName} · ${won(p.hotelTotal)}\n  세금 ${won(p.hotel.taxesAndFees)} · 취소 ${p.hotel.cancellable ? '가능' : '불가'} · ${p.hotel.paymentTerms}`
      : '',
    `총 예상 결제금액: ${won(p.grandTotal)}`,
    '',
    p.providerReady
      ? '최종 예약을 진행할까요? 「응 예약해」라고 명확히 말씀해 주세요.'
      : '예약 준비가 완료되었습니다. 현재 연결된 예약 Provider가 없어 실제 결제는 진행되지 않습니다.\nDEMO로 확인하려면 「응 예약해」라고 말해 주세요.',
  ]
  return lines.filter((x) => x !== '').join('\n')
}

export function formatBookingResult(r: BookingResult): string {
  return [
    r.message,
    r.confirmationCode ? `예약번호: ${r.confirmationCode}` : '',
    r.flightPnr ? `항공사 예약번호: ${r.flightPnr}` : '',
    r.hotelConfirmation ? `호텔 예약번호: ${r.hotelConfirmation}` : '',
    r.grandTotal != null ? `총액: ${won(r.grandTotal)}` : '',
    r.status === 'CONFIRMED' ? '일정에 추가할까요? 「일정에 저장해줘」라고 말해 주세요.' : '',
  ]
    .filter(Boolean)
    .join('\n')
}

export function compareFlights(a: FlightOffer, b: FlightOffer, ia: number, ib: number): string {
  return [
    `【비교 ${ia + 1}번 vs ${ib + 1}번】`,
    `${ia + 1}) ${a.airline} ${a.flightNumber} · ${dur(a.durationMinutes)} · 경유 ${a.stops} · ${won(a.pricePerPerson)}/인`,
    `${ib + 1}) ${b.airline} ${b.flightNumber} · ${dur(b.durationMinutes)} · 경유 ${b.stops} · ${won(b.pricePerPerson)}/인`,
    a.pricePerPerson <= b.pricePerPerson
      ? `${ia + 1}번이 ${won(b.pricePerPerson - a.pricePerPerson)} 더 저렴합니다.`
      : `${ib + 1}번이 ${won(a.pricePerPerson - b.pricePerPerson)} 더 저렴합니다.`,
  ].join('\n')
}
