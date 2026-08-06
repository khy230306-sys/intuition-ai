import type {
  RestaurantOffer,
  RestaurantReservationPreview,
  RestaurantReservationResult,
  RestaurantSearchInput,
} from './schema'

function won(n?: number): string {
  if (n == null) return '-'
  return `${Math.round(n).toLocaleString('ko-KR')}원`
}

export function formatRestaurantList(offers: RestaurantOffer[], demo: boolean, input?: RestaurantSearchInput): string {
  if (!offers.length) return '조건에 맞는 식당이 없습니다. 지역이나 조건을 바꿔볼까요?'
  const head = demo ? '【DEMO 맛집 검색】실제 예약·영업과 다를 수 있습니다.\n' : '【맛집 검색】\n'
  const lines = offers.map((o, i) => {
    const flags = [
      o.parking ? '주차' : null,
      o.childFriendly ? '아이' : null,
      o.privateRoom ? '룸' : null,
      o.reservationSupported ? '예약가능' : '전화/현장',
      o.openNow === false ? '영업종료' : o.openNow ? '영업중' : null,
    ]
      .filter(Boolean)
      .join(' · ')
    const slots =
      o.availableSlots.length && input?.time
        ? o.availableSlots.includes(input.time)
          ? `${input.time} OK`
          : `요청시간 없음 → ${o.availableSlots.slice(0, 3).join(', ')}`
        : o.availableSlots.slice(0, 3).join(', ') || '-'
    return [
      `${i + 1}. ${o.name} (${o.cuisine}) ★${o.rating ?? '-'}${o.reviewCount != null ? ` · 리뷰 ${o.reviewCount}` : ''}`,
      `   ${o.locationLabel}${o.distanceKm != null ? ` · ${o.distanceKm}km` : ''} · ${o.priceRange} · 1인 약 ${won(o.pricePerPersonEst)}`,
      `   메뉴: ${o.signatureMenus.slice(0, 3).join(', ') || '-'} · ${flags}`,
      `   예약시간: ${slots} · ${o.provider}${o.priceKind === 'demo' ? ' · DEMO' : ''}`,
      o.recommendReason ? `   👉 ${o.recommendReason}` : '',
    ]
      .filter(Boolean)
      .join('\n')
  })
  return head + lines.join('\n\n') + '\n\n번호로 고르거나 「주차되는 곳만」「더 싼 곳」으로 말해 주세요.'
}

export function formatRestaurantDetails(o: RestaurantOffer): string {
  return [
    `【식당 상세${o.priceKind === 'demo' ? ' · DEMO' : ''}】`,
    o.name,
    `${o.cuisine} · ${o.locationLabel}`,
    o.address ? `주소: ${o.address}` : '',
    `평점 ★${o.rating ?? '-'} (${o.reviewCount ?? 0}리뷰) · ${o.priceRange} · 1인 약 ${won(o.pricePerPersonEst)}`,
    `영업: ${o.hoursLabel || '-'} · 지금 ${o.openNow === false ? '닫음' : o.openNow ? '열림' : '확인필요'}`,
    `예약: ${o.reservationSupported ? o.reservationMode : '불가/전화'} · 슬롯 ${o.availableSlots.join(', ') || '-'}`,
    `주차 ${o.parking ? '가능' : o.parking === false ? '어려움' : '확인필요'} · 아이 ${o.childFriendly ? '가능' : '확인필요'} · 룸 ${o.privateRoom ? '있음' : '확인필요'}`,
    o.phone ? `전화: ${o.phone}` : '',
    o.bookingUrl ? `예약페이지: ${o.bookingUrl}` : '',
    o.cancellationPolicy ? `취소: ${o.cancellationPolicy}` : '',
    o.depositRequired ? `⚠ 예약금 ${won(o.depositAmount)}` : '',
    o.recommendReason ? `추천: ${o.recommendReason}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}

export function compareRestaurants(a: RestaurantOffer, b: RestaurantOffer, ia: number, ib: number): string {
  return [
    `【비교 ${ia + 1}번 vs ${ib + 1}번】`,
    `${ia + 1}) ${a.name} ★${a.rating ?? '-'} · ${won(a.pricePerPersonEst)}/인 · 주차 ${a.parking ? 'O' : 'X'}`,
    `${ib + 1}) ${b.name} ★${b.rating ?? '-'} · ${won(b.pricePerPersonEst)}/인 · 주차 ${b.parking ? 'O' : 'X'}`,
    a.recommendReason ? `${ia + 1}번: ${a.recommendReason}` : '',
    b.recommendReason ? `${ib + 1}번: ${b.recommendReason}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}

export function formatReservationPreview(p: RestaurantReservationPreview): string {
  const missKo: Record<string, string> = {
    date: '날짜',
    time: '시간',
    partySize: '인원',
    guestName: '예약자 이름',
    guestPhone: '연락처',
  }
  const lines = [
    `【예약 준비${p.mode === 'demo' ? ' · DEMO' : ''}】`,
    `식당: ${p.restaurant.name}`,
    p.restaurant.address ? `주소: ${p.restaurant.address}` : '',
    `일시: ${p.date || '?'} ${p.time || '?'} · ${p.partySize || '?'}명`,
    p.guestName ? `예약자: ${p.guestName}` : '',
    p.guestPhone ? `연락처: ${p.guestPhone}` : '',
    p.specialRequests ? `요청: ${p.specialRequests}` : '',
    p.depositRequired ? `⚠ 예약금 ${won(p.depositAmount)}이 결제됩니다.` : '예약금 없음',
    p.cancellationPolicy ? `취소정책: ${p.cancellationPolicy}` : '',
    ...p.notes,
    p.missingFields.length
      ? `아직 필요: ${p.missingFields.map((f) => missKo[f] || f).join(', ')}`
      : `${p.date} ${p.time}, ${p.partySize}명으로 ${p.restaurant.name}을(를) 예약할까요? 「응 예약해」라고 확인해 주세요.`,
  ]
  return lines.filter(Boolean).join('\n')
}

export function formatReservationResult(r: RestaurantReservationResult): string {
  return [
    r.message,
    r.confirmationNumber ? `확인번호: ${r.confirmationNumber}` : '',
    r.restaurantName ? `식당: ${r.restaurantName}` : '',
    r.date && r.time ? `${r.date} ${r.time} · ${r.partySize || ''}명` : '',
    r.contact ? `연락처: ${r.contact}` : '',
    r.bookingUrl ? `예약 페이지: ${r.bookingUrl}` : '',
    r.status === 'PHONE_REQUIRED' ? '전화 연결만 가능하며, 통화 완료·예약을 가장하지 않습니다.' : '',
    r.status === 'CONFIRMED' ? '일정에 추가할까요? 「예약 일정에 추가해줘」라고 말해 주세요.' : '',
  ]
    .filter(Boolean)
    .join('\n')
}
