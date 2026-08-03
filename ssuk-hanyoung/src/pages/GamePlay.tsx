import type { ComponentType } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getGame } from '../data/games'
import { ColorGarage } from '../games/ColorGarage'
import { VroomRace } from '../games/VroomRace'
import { ParkingLot } from '../games/ParkingLot'
import { CarPaint } from '../games/CarPaint'
import { CarBuilder } from '../games/CarBuilder'
import { FindColorCar } from '../games/FindColorCar'
import { ColorMix } from '../games/ColorMix'
import { CarMemory } from '../games/CarMemory'
import { CarSounds } from '../games/CarSounds'
import { TrafficLight } from '../games/TrafficLight'
import { CarWash } from '../games/CarWash'
import { Balloons } from '../games/Balloons'
import { BusCount } from '../games/BusCount'
import { ColorQuiz } from '../games/ColorQuiz'

const MAP: Record<string, ComponentType> = {
  'color-garage': ColorGarage,
  'vroom-race': VroomRace,
  parking: ParkingLot,
  'car-paint': CarPaint,
  'car-builder': CarBuilder,
  'find-color-car': FindColorCar,
  'color-mix': ColorMix,
  'car-memory': CarMemory,
  'car-sounds': CarSounds,
  'traffic-light': TrafficLight,
  'car-wash': CarWash,
  balloons: Balloons,
  'bus-count': BusCount,
  'color-quiz': ColorQuiz,
}

export function GamePlay() {
  const { id = '' } = useParams()
  const meta = getGame(id)
  const Comp = MAP[id]

  if (!meta || !Comp) {
    return (
      <div>
        <div className="page-head">
          <Link to="/games" className="icon-btn" aria-label="뒤로">
            ←
          </Link>
          <h1>게임을 찾지 못했어요</h1>
        </div>
        <Link to="/games" className="btn btn-sunny">
          게임 목록으로
        </Link>
      </div>
    )
  }

  return <Comp />
}
