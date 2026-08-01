/** Compact world geography knowledge for offline-first answers. */
export interface CountryInfo {
  name: string
  nameEn: string
  capital: string
  continent: string
  region: string
  currency: string
  language: string
  population: number // millions approx
  area: number // thousand km² approx
  lat: number
  lon: number
  aliases: string[]
}

export const COUNTRIES: CountryInfo[] = [
  { name: '대한민국', nameEn: 'South Korea', capital: '서울', continent: '아시아', region: '동아시아', currency: 'KRW(원)', language: '한국어', population: 51.7, area: 100.4, lat: 37.57, lon: 126.98, aliases: ['한국', '남한', 'korea', 'south korea'] },
  { name: '일본', nameEn: 'Japan', capital: '도쿄', continent: '아시아', region: '동아시아', currency: 'JPY(엔)', language: '일본어', population: 124, area: 378, lat: 35.68, lon: 139.69, aliases: ['japan', '닛폰'] },
  { name: '중국', nameEn: 'China', capital: '베이징', continent: '아시아', region: '동아시아', currency: 'CNY(위안)', language: '중국어', population: 1412, area: 9597, lat: 39.9, lon: 116.4, aliases: ['china', '중화인민공화국'] },
  { name: '북한', nameEn: 'North Korea', capital: '평양', continent: '아시아', region: '동아시아', currency: 'KPW', language: '한국어', population: 26, area: 120.5, lat: 39.04, lon: 125.75, aliases: ['조선', 'north korea', 'dprk'] },
  { name: '대만', nameEn: 'Taiwan', capital: '타이베이', continent: '아시아', region: '동아시아', currency: 'TWD', language: '중국어', population: 23.4, area: 36.2, lat: 25.03, lon: 121.57, aliases: ['taiwan', '중화민국'] },
  { name: '몽골', nameEn: 'Mongolia', capital: '울란바토르', continent: '아시아', region: '동아시아', currency: 'MNT', language: '몽골어', population: 3.4, area: 1564, lat: 47.92, lon: 106.92, aliases: ['mongolia'] },
  { name: '베트남', nameEn: 'Vietnam', capital: '하노이', continent: '아시아', region: '동남아시아', currency: 'VND', language: '베트남어', population: 98, area: 331, lat: 21.03, lon: 105.85, aliases: ['vietnam'] },
  { name: '태국', nameEn: 'Thailand', capital: '방콕', continent: '아시아', region: '동남아시아', currency: 'THB', language: '태국어', population: 72, area: 513, lat: 13.75, lon: 100.5, aliases: ['thailand'] },
  { name: '싱가포르', nameEn: 'Singapore', capital: '싱가포르', continent: '아시아', region: '동남아시아', currency: 'SGD', language: '영어/중국어/말레이어/타밀어', population: 5.9, area: 0.73, lat: 1.29, lon: 103.85, aliases: ['singapore'] },
  { name: '인도네시아', nameEn: 'Indonesia', capital: '자카르타', continent: '아시아', region: '동남아시아', currency: 'IDR', language: '인도네시아어', population: 277, area: 1905, lat: -6.2, lon: 106.85, aliases: ['indonesia'] },
  { name: '필리핀', nameEn: 'Philippines', capital: '마닐라', continent: '아시아', region: '동남아시아', currency: 'PHP', language: '필리핀어/영어', population: 117, area: 300, lat: 14.6, lon: 120.98, aliases: ['philippines'] },
  { name: '말레이시아', nameEn: 'Malaysia', capital: '쿠알라룸푸르', continent: '아시아', region: '동남아시아', currency: 'MYR', language: '말레이어', population: 34, area: 330, lat: 3.14, lon: 101.69, aliases: ['malaysia'] },
  { name: '인도', nameEn: 'India', capital: '뉴델리', continent: '아시아', region: '남아시아', currency: 'INR', language: '힌디어/영어 등', population: 1428, area: 3287, lat: 28.61, lon: 77.21, aliases: ['india'] },
  { name: '파키스탄', nameEn: 'Pakistan', capital: '이슬라마바드', continent: '아시아', region: '남아시아', currency: 'PKR', language: '우르두어/영어', population: 240, area: 881, lat: 33.69, lon: 73.04, aliases: ['pakistan'] },
  { name: '방글라데시', nameEn: 'Bangladesh', capital: '다카', continent: '아시아', region: '남아시아', currency: 'BDT', language: '벵골어', population: 173, area: 148, lat: 23.81, lon: 90.41, aliases: ['bangladesh'] },
  { name: '사우디아라비아', nameEn: 'Saudi Arabia', capital: '리야드', continent: '아시아', region: '중동', currency: 'SAR', language: '아랍어', population: 36, area: 2150, lat: 24.71, lon: 46.68, aliases: ['saudi', 'saudi arabia', '사우디'] },
  { name: '아랍에미리트', nameEn: 'United Arab Emirates', capital: '아부다비', continent: '아시아', region: '중동', currency: 'AED', language: '아랍어', population: 9.5, area: 83.6, lat: 24.45, lon: 54.38, aliases: ['uae', '아랍에미레이트', '두바이'] },
  { name: '이스라엘', nameEn: 'Israel', capital: '예루살렘', continent: '아시아', region: '중동', currency: 'ILS', language: '히브리어/아랍어', population: 9.8, area: 22.1, lat: 31.77, lon: 35.23, aliases: ['israel'] },
  { name: '이란', nameEn: 'Iran', capital: '테헤란', continent: '아시아', region: '중동', currency: 'IRR', language: '페르시아어', population: 89, area: 1648, lat: 35.69, lon: 51.39, aliases: ['iran'] },
  { name: '터키', nameEn: 'Turkey', capital: '앙카라', continent: '아시아/유럽', region: '서아시아', currency: 'TRY', language: '터키어', population: 85, area: 783, lat: 39.93, lon: 32.86, aliases: ['turkiye', 'turkey', '튀르키예'] },
  { name: '러시아', nameEn: 'Russia', capital: '모스크바', continent: '유럽/아시아', region: '동유럽', currency: 'RUB', language: '러시아어', population: 144, area: 17098, lat: 55.76, lon: 37.62, aliases: ['russia', '러시아연방'] },
  { name: '영국', nameEn: 'United Kingdom', capital: '런던', continent: '유럽', region: '서유럽', currency: 'GBP', language: '영어', population: 67, area: 243.6, lat: 51.51, lon: -0.13, aliases: ['uk', 'britain', '영국', 'united kingdom'] },
  { name: '프랑스', nameEn: 'France', capital: '파리', continent: '유럽', region: '서유럽', currency: 'EUR', language: '프랑스어', population: 68, area: 551.7, lat: 48.86, lon: 2.35, aliases: ['france'] },
  { name: '독일', nameEn: 'Germany', capital: '베를린', continent: '유럽', region: '서유럽', currency: 'EUR', language: '독일어', population: 84, area: 357.6, lat: 52.52, lon: 13.41, aliases: ['germany', '도이칠란트'] },
  { name: '이탈리아', nameEn: 'Italy', capital: '로마', continent: '유럽', region: '남유럽', currency: 'EUR', language: '이탈리아어', population: 59, area: 301.3, lat: 41.9, lon: 12.5, aliases: ['italy'] },
  { name: '스페인', nameEn: 'Spain', capital: '마드리드', continent: '유럽', region: '남유럽', currency: 'EUR', language: '스페인어', population: 48, area: 506, lat: 40.42, lon: -3.7, aliases: ['spain'] },
  { name: '포르투갈', nameEn: 'Portugal', capital: '리스본', continent: '유럽', region: '남유럽', currency: 'EUR', language: '포르투갈어', population: 10.4, area: 92.2, lat: 38.72, lon: -9.14, aliases: ['portugal'] },
  { name: '네덜란드', nameEn: 'Netherlands', capital: '암스테르담', continent: '유럽', region: '서유럽', currency: 'EUR', language: '네덜란드어', population: 17.9, area: 41.5, lat: 52.37, lon: 4.9, aliases: ['netherlands', 'holland', '홀란드'] },
  { name: '벨기에', nameEn: 'Belgium', capital: '브뤼셀', continent: '유럽', region: '서유럽', currency: 'EUR', language: '네덜란드어/프랑스어/독일어', population: 11.7, area: 30.5, lat: 50.85, lon: 4.35, aliases: ['belgium'] },
  { name: '스위스', nameEn: 'Switzerland', capital: '베른', continent: '유럽', region: '서유럽', currency: 'CHF', language: '독일어/프랑스어/이탈리아어', population: 8.9, area: 41.3, lat: 46.95, lon: 7.45, aliases: ['switzerland'] },
  { name: '오스트리아', nameEn: 'Austria', capital: '빈', continent: '유럽', region: '서유럽', currency: 'EUR', language: '독일어', population: 9.1, area: 83.9, lat: 48.21, lon: 16.37, aliases: ['austria'] },
  { name: '스웨덴', nameEn: 'Sweden', capital: '스톡홀름', continent: '유럽', region: '북유럽', currency: 'SEK', language: '스웨덴어', population: 10.5, area: 450.3, lat: 59.33, lon: 18.07, aliases: ['sweden'] },
  { name: '노르웨이', nameEn: 'Norway', capital: '오슬로', continent: '유럽', region: '북유럽', currency: 'NOK', language: '노르웨이어', population: 5.5, area: 385.2, lat: 59.91, lon: 10.75, aliases: ['norway'] },
  { name: '덴마크', nameEn: 'Denmark', capital: '코펜하겐', continent: '유럽', region: '북유럽', currency: 'DKK', language: '덴마크어', population: 5.9, area: 42.9, lat: 55.68, lon: 12.57, aliases: ['denmark'] },
  { name: '핀란드', nameEn: 'Finland', capital: '헬싱키', continent: '유럽', region: '북유럽', currency: 'EUR', language: '핀란드어/스웨덴어', population: 5.6, area: 338.5, lat: 60.17, lon: 24.94, aliases: ['finland'] },
  { name: '폴란드', nameEn: 'Poland', capital: '바르샤바', continent: '유럽', region: '동유럽', currency: 'PLN', language: '폴란드어', population: 37.7, area: 312.7, lat: 52.23, lon: 21.01, aliases: ['poland'] },
  { name: '우크라이나', nameEn: 'Ukraine', capital: '키이우', continent: '유럽', region: '동유럽', currency: 'UAH', language: '우크라이나어', population: 37, area: 603.5, lat: 50.45, lon: 30.52, aliases: ['ukraine'] },
  { name: '그리스', nameEn: 'Greece', capital: '아테네', continent: '유럽', region: '남유럽', currency: 'EUR', language: '그리스어', population: 10.4, area: 132, lat: 37.98, lon: 23.73, aliases: ['greece'] },
  { name: '아일랜드', nameEn: 'Ireland', capital: '더블린', continent: '유럽', region: '서유럽', currency: 'EUR', language: '영어/아일랜드어', population: 5.2, area: 70.3, lat: 53.35, lon: -6.26, aliases: ['ireland'] },
  { name: '미국', nameEn: 'United States', capital: '워싱턴 D.C.', continent: '북아메리카', region: '북미', currency: 'USD', language: '영어', population: 333, area: 9834, lat: 38.9, lon: -77.04, aliases: ['usa', 'us', 'america', '미합중국', 'united states'] },
  { name: '캐나다', nameEn: 'Canada', capital: '오타와', continent: '북아메리카', region: '북미', currency: 'CAD', language: '영어/프랑스어', population: 40, area: 9985, lat: 45.42, lon: -75.7, aliases: ['canada'] },
  { name: '멕시코', nameEn: 'Mexico', capital: '멕시코시티', continent: '북아메리카', region: '중미', currency: 'MXN', language: '스페인어', population: 129, area: 1964, lat: 19.43, lon: -99.13, aliases: ['mexico'] },
  { name: '브라질', nameEn: 'Brazil', capital: '브라질리아', continent: '남아메리카', region: '남미', currency: 'BRL', language: '포르투갈어', population: 216, area: 8516, lat: -15.79, lon: -47.88, aliases: ['brazil'] },
  { name: '아르헨티나', nameEn: 'Argentina', capital: '부에노스아이레스', continent: '남아메리카', region: '남미', currency: 'ARS', language: '스페인어', population: 46, area: 2780, lat: -34.6, lon: -58.38, aliases: ['argentina'] },
  { name: '칠레', nameEn: 'Chile', capital: '산티아고', continent: '남아메리카', region: '남미', currency: 'CLP', language: '스페인어', population: 19.6, area: 756.1, lat: -33.45, lon: -70.67, aliases: ['chile'] },
  { name: '페루', nameEn: 'Peru', capital: '리마', continent: '남아메리카', region: '남미', currency: 'PEN', language: '스페인어', population: 34, area: 1285, lat: -12.05, lon: -77.04, aliases: ['peru'] },
  { name: '콜롬비아', nameEn: 'Colombia', capital: '보고타', continent: '남아메리카', region: '남미', currency: 'COP', language: '스페인어', population: 52, area: 1142, lat: 4.71, lon: -74.07, aliases: ['colombia'] },
  { name: '이집트', nameEn: 'Egypt', capital: '카이로', continent: '아프리카', region: '북아프리카', currency: 'EGP', language: '아랍어', population: 112, area: 1001, lat: 30.04, lon: 31.24, aliases: ['egypt'] },
  { name: '남아프리카공화국', nameEn: 'South Africa', capital: '프리토리아', continent: '아프리카', region: '남아프리카', currency: 'ZAR', language: '영어/줄루어 등', population: 60, area: 1221, lat: -25.75, lon: 28.19, aliases: ['south africa', '남아공'] },
  { name: '나이지리아', nameEn: 'Nigeria', capital: '아부자', continent: '아프리카', region: '서아프리카', currency: 'NGN', language: '영어', population: 223, area: 923.8, lat: 9.08, lon: 7.53, aliases: ['nigeria'] },
  { name: '케냐', nameEn: 'Kenya', capital: '나이로비', continent: '아프리카', region: '동아프리카', currency: 'KES', language: '영어/스와힐리어', population: 55, area: 580.4, lat: -1.29, lon: 36.82, aliases: ['kenya'] },
  { name: '모로코', nameEn: 'Morocco', capital: '라바트', continent: '아프리카', region: '북아프리카', currency: 'MAD', language: '아랍어/베르베르어', population: 37, area: 446.6, lat: 34.02, lon: -6.84, aliases: ['morocco'] },
  { name: '에티오피아', nameEn: 'Ethiopia', capital: '아디스아바바', continent: '아프리카', region: '동아프리카', currency: 'ETB', language: '암하라어', population: 126, area: 1104, lat: 9.03, lon: 38.74, aliases: ['ethiopia'] },
  { name: '호주', nameEn: 'Australia', capital: '캔버라', continent: '오세아니아', region: '호주', currency: 'AUD', language: '영어', population: 26.8, area: 7692, lat: -35.28, lon: 149.13, aliases: ['australia', '오스트레일리아'] },
  { name: '뉴질랜드', nameEn: 'New Zealand', capital: '웰링턴', continent: '오세아니아', region: '오세아니아', currency: 'NZD', language: '영어/마오리어', population: 5.2, area: 268, lat: -41.29, lon: 174.78, aliases: ['new zealand'] },
]

export interface CityInfo {
  name: string
  country: string
  lat: number
  lon: number
  aliases: string[]
  note?: string
}

export const CITIES: CityInfo[] = [
  { name: '도쿄', country: '일본', lat: 35.68, lon: 139.69, aliases: ['tokyo'] },
  { name: '오사카', country: '일본', lat: 34.69, lon: 135.5, aliases: ['osaka'] },
  { name: '베이징', country: '중국', lat: 39.9, lon: 116.4, aliases: ['beijing', '북경'] },
  { name: '상하이', country: '중국', lat: 31.23, lon: 121.47, aliases: ['shanghai'] },
  { name: '홍콩', country: '중국', lat: 22.32, lon: 114.17, aliases: ['hong kong'] },
  { name: '방콕', country: '태국', lat: 13.76, lon: 100.5, aliases: ['bangkok'] },
  { name: '하노이', country: '베트남', lat: 21.03, lon: 105.85, aliases: ['hanoi'] },
  { name: '호치민', country: '베트남', lat: 10.82, lon: 106.63, aliases: ['호치민시', 'saigon'] },
  { name: '싱가포르', country: '싱가포르', lat: 1.29, lon: 103.85, aliases: ['singapore city'] },
  { name: '델리', country: '인도', lat: 28.61, lon: 77.21, aliases: ['new delhi', '뉴델리'] },
  { name: '뭄바이', country: '인도', lat: 19.08, lon: 72.88, aliases: ['mumbai', '봄베이'] },
  { name: '두바이', country: '아랍에미리트', lat: 25.2, lon: 55.27, aliases: ['dubai'] },
  { name: '런던', country: '영국', lat: 51.51, lon: -0.13, aliases: ['london'] },
  { name: '파리', country: '프랑스', lat: 48.86, lon: 2.35, aliases: ['paris'] },
  { name: '베를린', country: '독일', lat: 52.52, lon: 13.41, aliases: ['berlin'] },
  { name: '로마', country: '이탈리아', lat: 41.9, lon: 12.5, aliases: ['rome'] },
  { name: '마드리드', country: '스페인', lat: 40.42, lon: -3.7, aliases: ['madrid'] },
  { name: '바르셀로나', country: '스페인', lat: 41.39, lon: 2.17, aliases: ['barcelona'] },
  { name: '암스테르담', country: '네덜란드', lat: 52.37, lon: 4.9, aliases: ['amsterdam'] },
  { name: '모스크바', country: '러시아', lat: 55.76, lon: 37.62, aliases: ['moscow'] },
  { name: '뉴욕', country: '미국', lat: 40.71, lon: -74.01, aliases: ['new york', 'nyc'] },
  { name: '로스앤젤레스', country: '미국', lat: 34.05, lon: -118.24, aliases: ['la', 'los angeles'] },
  { name: '샌프란시스코', country: '미국', lat: 37.77, lon: -122.42, aliases: ['san francisco', 'sf'] },
  { name: '시카고', country: '미국', lat: 41.88, lon: -87.63, aliases: ['chicago'] },
  { name: '시애틀', country: '미국', lat: 47.61, lon: -122.33, aliases: ['seattle'] },
  { name: '워싱턴', country: '미국', lat: 38.91, lon: -77.04, aliases: ['washington', '워싱턴dc'] },
  { name: '토론토', country: '캐나다', lat: 43.65, lon: -79.38, aliases: ['toronto'] },
  { name: '밴쿠버', country: '캐나다', lat: 49.28, lon: -123.12, aliases: ['vancouver'] },
  { name: '멕시코시티', country: '멕시코', lat: 19.43, lon: -99.13, aliases: ['mexico city'] },
  { name: '상파울루', country: '브라질', lat: -23.55, lon: -46.63, aliases: ['sao paulo'] },
  { name: '리우데자네이루', country: '브라질', lat: -22.91, lon: -43.17, aliases: ['rio', '리우'] },
  { name: '부에노스아이레스', country: '아르헨티나', lat: -34.6, lon: -58.38, aliases: ['buenos aires'] },
  { name: '카이로', country: '이집트', lat: 30.04, lon: 31.24, aliases: ['cairo'] },
  { name: '케이프타운', country: '남아프리카공화국', lat: -33.92, lon: 18.42, aliases: ['cape town'] },
  { name: '시드니', country: '호주', lat: -33.87, lon: 151.21, aliases: ['sydney'] },
  { name: '멜버른', country: '호주', lat: -37.81, lon: 144.96, aliases: ['melbourne'] },
  { name: '오클랜드', country: '뉴질랜드', lat: -36.85, lon: 174.76, aliases: ['auckland'] },
  { name: '이스탄불', country: '터키', lat: 41.01, lon: 28.98, aliases: ['istanbul'] },
]

export const WORLD_FACTS: Array<{ keys: string[]; text: string }> = [
  { keys: ['에베레스트', 'everest'], text: '에베레스트는 히말라야(네팔·중국 국경)에 있으며 해발 약 8,849m로 세계 최고봉입니다.' },
  { keys: ['아마존', 'amazon'], text: '아마존 강·우림은 남아메리카(주로 브라질)에 있으며 세계 최대 열대우림·유량 규모를 가집니다.' },
  { keys: ['사하라', 'sahara'], text: '사하라 사막은 북아프리카에 있는 세계 최대의 핫 데저트입니다.' },
  { keys: ['나일', 'nile'], text: '나일 강은 아프리카 동북부를 지나며 전통적으로 세계 최장강으로 꼽힙니다(측정법에 따라 아마존과 경쟁).' },
  { keys: ['태평양', 'pacific'], text: '태평양은 세계 최대·최심 해양으로, 지구 표면의 약 1/3을 덮습니다.' },
  { keys: ['대서양', 'atlantic'], text: '대서양은 아메리카와 유럽·아프리카 사이의 해양입니다.' },
  { keys: ['인도양', 'indian ocean'], text: '인도양은 아프리카·아시아·호주 사이의 해양입니다.' },
  { keys: ['북극', 'arctic'], text: '북극해·북극권은 지구 최북단 지역으로, 대부분 해빙으로 덮여 있습니다.' },
  { keys: ['남극', 'antarctica', '앤트아크티카'], text: '남극대륙은 남반구 최남단의 대륙으로, 세계 담수(빙하)의 상당 부분을 보유합니다.' },
  { keys: ['그랜드캐니언', 'grand canyon'], text: '그랜드캐니언은 미국 애리조나에 있는 거대한 협곡으로 콜로라도 강이 깎아 만들었습니다.' },
  { keys: ['알프스', 'alps'], text: '알프스는 유럽 중부의 산맥으로 프랑스·스위스·이탈리아·오스트리아 등에 걸쳐 있습니다.' },
  { keys: ['히말라야', 'himalaya'], text: '히말라야는 인도 아대륙과 유라시아판 충돌로 형성된 세계 최고 고도 산맥대입니다.' },
  { keys: ['대륙', 'continents'], text: '일반적으로 7대륙: 아시아, 아프리카, 북아메리카, 남아메리카, 남극, 유럽, 오세아니아(호주).' },
  { keys: ['적도', 'equator'], text: '적도는 위도 0° 선으로 지구를 북·남반구로 나눕니다.' },
  { keys: ['본초자오선', 'prime meridian', '그리니치'], text: '본초자오선(경도 0°)은 영국 그리니치를 지나며 동·서경의 기준입니다.' },
]

function norm(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, '')
}

export function findCountry(query: string): CountryInfo | null {
  const q = norm(query)
  if (!q) return null
  for (const c of COUNTRIES) {
    if (norm(c.name) === q || norm(c.nameEn) === q) return c
    if (c.aliases.some((a) => norm(a) === q)) return c
  }
  for (const c of COUNTRIES) {
    if (q.includes(norm(c.name)) || norm(c.name).includes(q)) return c
    if (c.aliases.some((a) => q.includes(norm(a)) || norm(a).includes(q))) return c
    if (q.includes(norm(c.nameEn))) return c
  }
  return null
}

export function findCity(query: string): CityInfo | null {
  const q = norm(query)
  if (!q) return null
  for (const c of CITIES) {
    if (norm(c.name) === q || c.aliases.some((a) => norm(a) === q)) return c
  }
  for (const c of CITIES) {
    if (q.includes(norm(c.name)) || c.aliases.some((a) => q.includes(norm(a)))) return c
  }
  return null
}

export function findWorldFact(query: string): string | null {
  const q = norm(query)
  for (const f of WORLD_FACTS) {
    if (f.keys.some((k) => q.includes(norm(k)))) return f.text
  }
  return null
}

export function extractPlaceQuery(text: string): string {
  return text
    .replace(
      /(?:에\s*대해|대해서|알려줘|알려|정보|지리|수도|인구|면적|통화|언어|시차|어디|위치|좌표|지도|날씨|개요|요약|설명해|뭐야|어디에\s*있어|어디에\s*있니)/gi,
      ' ',
    )
    .replace(/[?？]/g, ' ')
    .trim()
}

/** Approximate local time offset from UTC using longitude (15° ≈ 1h). */
export function approxUtcOffsetHours(lon: number): number {
  return Math.round(lon / 15)
}

export function seoulTimeDiffHours(lon: number): number {
  // Seoul ≈ UTC+9
  return approxUtcOffsetHours(lon) - 9
}

export function formatTimeDiff(hours: number): string {
  if (hours === 0) return '서울과 거의 같은 시간대(근사)'
  if (hours > 0) return `서울보다 약 ${hours}시간 빠름(경도 근사)`
  return `서울보다 약 ${Math.abs(hours)}시간 느림(경도 근사)`
}

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

export function formatCountry(c: CountryInfo): string {
  const diff = formatTimeDiff(seoulTimeDiffHours(c.lon))
  const dist = haversineKm(37.57, 126.98, c.lat, c.lon)
  return [
    `【국가 정보】 ${c.name} (${c.nameEn})`,
    `수도: ${c.capital}`,
    `대륙/지역: ${c.continent} · ${c.region}`,
    `인구(약): ${c.population}백만 · 면적(약): ${c.area}천 km²`,
    `통화: ${c.currency} · 언어: ${c.language}`,
    `좌표: ${c.lat.toFixed(2)}, ${c.lon.toFixed(2)}`,
    `서울에서 직선거리 약 ${Math.round(dist).toLocaleString('ko-KR')} km`,
    `시차: ${diff}`,
    '수치·시차는 근사값이며 행정·서머타임에 따라 달라질 수 있습니다.',
  ].join('\n')
}

export function formatCity(city: CityInfo): string {
  const country = findCountry(city.country)
  const diff = formatTimeDiff(seoulTimeDiffHours(city.lon))
  const dist = haversineKm(37.57, 126.98, city.lat, city.lon)
  return [
    `【도시 정보】 ${city.name}`,
    `국가: ${city.country}${country ? ` (${country.nameEn})` : ''}`,
    country ? `수도/통화 참고: 수도 ${country.capital} · ${country.currency}` : '',
    `좌표: ${city.lat.toFixed(2)}, ${city.lon.toFixed(2)}`,
    `서울에서 직선거리 약 ${Math.round(dist).toLocaleString('ko-KR')} km`,
    `시차: ${diff}`,
    city.note || '',
  ]
    .filter(Boolean)
    .join('\n')
}
