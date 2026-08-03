export type Vehicle = {
  id: string
  ko: string
  en: string
  emoji: string
  sound: string
  img?: string
  category: 'car' | 'truck' | 'emergency' | 'bus' | 'fun'
}

export const VEHICLES: Vehicle[] = [
  { id: 'car', ko: '자동차', en: 'Car', emoji: '🚗', sound: '부릉부릉!', category: 'car' },
  { id: 'sports', ko: '스포츠카', en: 'Sports car', emoji: '🏎️', sound: '쌩!', category: 'car' },
  { id: 'taxi', ko: '택시', en: 'Taxi', emoji: '🚕', sound: '빵빵!', category: 'car' },
  { id: 'police', ko: '경찰차', en: 'Police car', emoji: '🚓', sound: '삐뽀삐뽀!', img: '/assets/car-police.png', category: 'emergency' },
  { id: 'fire', ko: '소방차', en: 'Fire truck', emoji: '🚒', sound: '위이잉!', img: '/assets/car-fire.png', category: 'emergency' },
  { id: 'ambulance', ko: '구급차', en: 'Ambulance', emoji: '🚑', sound: '삐용삐용!', img: '/assets/car-ambulance.png', category: 'emergency' },
  { id: 'bus', ko: '버스', en: 'Bus', emoji: '🚌', sound: '부우웅!', img: '/assets/car-bus.png', category: 'bus' },
  { id: 'school', ko: '스쿨버스', en: 'School bus', emoji: '🏫🚌', sound: '출발해요!', category: 'bus' },
  { id: 'truck', ko: '트럭', en: 'Truck', emoji: '🚚', sound: '털털털!', category: 'truck' },
  { id: 'dump', ko: '덤프트럭', en: 'Dump truck', emoji: '🚛', sound: '으쌰!', img: '/assets/car-dump.png', category: 'truck' },
  { id: 'tractor', ko: '트랙터', en: 'Tractor', emoji: '🚜', sound: '덜컹덜컹!', img: '/assets/car-tractor.png', category: 'truck' },
  { id: 'mixer', ko: '믹서트럭', en: 'Cement mixer', emoji: '🚧', sound: '윙윙!', category: 'truck' },
  { id: 'train', ko: '기차', en: 'Train', emoji: '🚂', sound: '칙릉울릉!', category: 'fun' },
  { id: 'plane', ko: '비행기', en: 'Airplane', emoji: '✈️', sound: '슈우웅!', category: 'fun' },
  { id: 'helicopter', ko: '헬리콥터', en: 'Helicopter', emoji: '🚁', sound: '챙챙챙!', category: 'fun' },
  { id: 'boat', ko: '배', en: 'Boat', emoji: '⛵', sound: '출렁출렁!', category: 'fun' },
  { id: 'bike', ko: '자전거', en: 'Bike', emoji: '🚲', sound: '따르릉!', category: 'fun' },
  { id: 'moto', ko: '오토바이', en: 'Motorcycle', emoji: '🏍️', sound: '부아아앙!', category: 'car' },
]

export const CAR_EMOJIS = ['🚗', '🚕', '🚙', '🚓', '🚑', '🚒', '🚐', '🛻', '🏎️', '🚌']
