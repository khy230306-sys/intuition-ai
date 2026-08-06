import type { RestaurantSearchInput } from './schema'

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function tomorrowIso(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().slice(0, 10)
}

export function parseRestaurantQuery(
  text: string,
  base: Partial<RestaurantSearchInput> = {},
): RestaurantSearchInput {
  const t = text.trim()
  const next: RestaurantSearchInput = {
    ...base,
    keywords: [...(base.keywords || [])],
    dietary: [...(base.dietary || [])],
  }

  if (/오늘/.test(t)) next.date = todayIso()
  if (/내일/.test(t)) next.date = tomorrowIso()

  const timeH =
    t.match(/(?:오후|저녁)?\s*(\d{1,2})\s*시\s*(반)?/) ||
    t.match(/(\d{1,2})\s*:\s*(\d{2})/) ||
    t.match(/(\d{1,2})시\s*반/)
  if (timeH) {
    if (timeH[0].includes(':')) {
      next.time = `${String(Number(timeH[1])).padStart(2, '0')}:${timeH[2]}`
    } else {
      let h = Number(timeH[1])
      if (/저녁|오후/.test(t) && h < 12) h += 12
      if (/저녁/.test(t) && h < 17) h = 19
      const m = /반/.test(timeH[0]) || timeH[2] === '반' ? '30' : '00'
      next.time = `${String(h).padStart(2, '0')}:${m}`
    }
  } else if (/저녁|외식/.test(t) && !next.time) {
    next.time = '19:00'
  }

  const party =
    t.match(/(\d+)\s*명/) ||
    t.match(/네\s*명|네명/) ||
    t.match(/두\s*명|세\s*명|다섯\s*명/)
  if (party) {
    if (/네\s*명|네명/.test(t)) next.partySize = 4
    else if (/두\s*명/.test(t)) next.partySize = 2
    else if (/세\s*명/.test(t)) next.partySize = 3
    else if (/다섯\s*명/.test(t)) next.partySize = 5
    else next.partySize = Number(party[1])
  } else if (/가족/.test(t) && !next.partySize) {
    next.partySize = undefined // ask later
  }

  if (/한식|한정식/.test(t)) next.cuisine = '한식'
  else if (/고기|고깃집|삼겹|한우/.test(t)) next.cuisine = '고깃집'
  else if (/일식|스시|라멘|초밥/.test(t)) next.cuisine = '일식'
  else if (/중식|짜장|짬뽕/.test(t)) next.cuisine = '중식'
  else if (/양식|스테이크|파스타/.test(t)) next.cuisine = '양식'
  else if (/카페|커피/.test(t)) next.cuisine = '카페'

  if (/주차/.test(t)) next.parking = true
  if (/아이|어린이|키즈/.test(t)) next.childFriendly = true
  if (/룸|개별실|프라이빗/.test(t)) next.privateRoom = true
  if (/조용/.test(t)) next.preferredAtmosphere = 'quiet'
  if (/부모님|모시고/.test(t)) next.preferredAtmosphere = next.preferredAtmosphere || 'parents'
  if (/휠체어|장애인/.test(t)) next.wheelchairAccessible = true
  if (/지금\s*영업|영업\s*중|open\s*now/i.test(t)) next.openNow = true
  if (/근처|내\s*주변|near\s*me/i.test(t)) next.nearMe = true

  const budget = t.match(/(\d+)\s*만\s*원\s*이하/)
  if (budget) next.maxBudgetPerPerson = Number(budget[1]) * 10000

  if (/평점\s*높은|평점\s*순|별점/.test(t)) next.sortBy = 'rating'
  if (/가까운|거리\s*순/.test(t)) next.sortBy = 'distance'
  if (/싼|저렴|가격\s*순/.test(t)) next.sortBy = 'price'

  // Location phrases
  const loc =
    t.match(/(울산\s*삼산|삼산동|삼산)/) ||
    t.match(/(오사카)/) ||
    t.match(/(성남\s*모란|모란)/) ||
    t.match(/([가-힣]{2,8})에서/) ||
    t.match(/([가-힣]{2,8})\s*맛집/)
  if (loc) {
    let L = loc[1].replace(/맛집$/, '').trim()
    if (/삼산/.test(L) && !/울산/.test(L)) L = '울산 삼산'
    if (L === '울산삼산') L = '울산 삼산'
    next.location = L
  }

  if (/채식|비건|vegetarian|vegan/i.test(t)) next.dietary = [...(next.dietary || []), 'vegetarian']
  if (/할랄|halal/i.test(t)) next.dietary = [...(next.dietary || []), 'halal']
  if (/글루텐|gluten/i.test(t)) next.dietary = [...(next.dietary || []), 'gluten-free']

  return next
}

export function parseOrdinal(text: string): number | null {
  if (/첫\s*번째|1\s*번/.test(text)) return 1
  if (/두\s*번째|2\s*번/.test(text)) return 2
  if (/세\s*번째|3\s*번/.test(text)) return 3
  if (/네\s*번째|4\s*번/.test(text)) return 4
  if (/다섯\s*번째|5\s*번/.test(text)) return 5
  const m = text.match(/([1-5])\s*번/)
  return m ? Number(m[1]) : null
}

export function parseTimeOnly(text: string): string | null {
  if (/7\s*시\s*반|일곱\s*시\s*반|19\s*:\s*30/.test(text)) return '19:30'
  if (/6\s*시\s*반|18\s*:\s*30/.test(text)) return '18:30'
  if (/7\s*시(?!\s*반)|19\s*:\s*00|저녁\s*7/.test(text)) return '19:00'
  const m = text.match(/(\d{1,2})\s*시\s*(반)?/)
  if (!m) return null
  let h = Number(m[1])
  if (h < 12 && (/저녁|오후/.test(text) || h <= 10)) h += h < 12 ? 12 : 0
  if (h < 12) h += 12
  return `${String(h).padStart(2, '0')}:${m[2] ? '30' : '00'}`
}
