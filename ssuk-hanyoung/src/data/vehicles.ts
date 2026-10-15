/** Vehicle catalog — visualKey maps into Visual Asset Registry (no emoji in UI). */

export type Vehicle = {
  id: string
  ko: string
  en: string
  /** @deprecated kept for migration; do not render */
  emoji?: string
  sound: string
  img?: string
  visualKey: string
  category: 'car' | 'truck' | 'emergency' | 'bus' | 'fun'
}

export const VEHICLES: Vehicle[] = [
  { id: 'car', ko: '자동차', en: 'Car', sound: '부릉부릉!', visualKey: 'vehicle.car', category: 'car' },
  { id: 'sports', ko: '스포츠카', en: 'Sports car', sound: '쌩!', visualKey: 'vehicle.car', category: 'car' },
  { id: 'taxi', ko: '택시', en: 'Taxi', sound: '빵빵!', visualKey: 'vehicle.car', category: 'car' },
  { id: 'police', ko: '경찰차', en: 'Police car', sound: '삐뽀삐뽀!', visualKey: 'vehicle.police', category: 'emergency' },
  { id: 'fire', ko: '소방차', en: 'Fire truck', sound: '위이잉!', visualKey: 'vehicle.firetruck', category: 'emergency' },
  { id: 'ambulance', ko: '구급차', en: 'Ambulance', sound: '삐용삐용!', visualKey: 'vehicle.ambulance', category: 'emergency' },
  { id: 'bus', ko: '버스', en: 'Bus', sound: '부우웅!', visualKey: 'vehicle.bus', category: 'bus' },
  { id: 'school', ko: '스쿨버스', en: 'School bus', sound: '출발해요!', visualKey: 'vehicle.busFront', category: 'bus' },
  { id: 'truck', ko: '트럭', en: 'Truck', sound: '털털털!', visualKey: 'vehicle.dump', category: 'truck' },
  { id: 'dump', ko: '덤프트럭', en: 'Dump truck', sound: '으쌰!', visualKey: 'vehicle.dump', category: 'truck' },
  { id: 'tractor', ko: '트랙터', en: 'Tractor', sound: '덜컹덜컹!', visualKey: 'vehicle.tractor', category: 'truck' },
  { id: 'mixer', ko: '믹서트럭', en: 'Cement mixer', sound: '윙윙!', visualKey: 'vehicle.dump', category: 'truck' },
  { id: 'train', ko: '기차', en: 'Train', sound: '울릉울릉!', visualKey: 'vehicle.bus', category: 'fun' },
  { id: 'plane', ko: '비행기', en: 'Airplane', sound: '슈우웅!', visualKey: 'nature.cloud', category: 'fun' },
  { id: 'helicopter', ko: '헬리콥터', en: 'Helicopter', sound: '챙챙챙!', visualKey: 'nature.cloud', category: 'fun' },
  { id: 'boat', ko: '배', en: 'Boat', sound: '출렁출렁!', visualKey: 'nature.cloud', category: 'fun' },
  { id: 'bike', ko: '자전거', en: 'Bike', sound: '따르릉!', visualKey: 'vehicle.car', category: 'fun' },
  { id: 'moto', ko: '오토바이', en: 'Motorcycle', sound: '부아아앙!', visualKey: 'vehicle.car', category: 'car' },
]
