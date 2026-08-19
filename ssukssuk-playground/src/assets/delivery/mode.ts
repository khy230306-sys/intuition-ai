/**
 * External production art delivery — Provider stays NOT_CONFIGURED.
 * Never assume generation is available.
 */

export const ASSET_DELIVERY_MODE = 'EXTERNAL_PRODUCTION_ART' as const

export type AssetDeliveryMode = typeof ASSET_DELIVERY_MODE

/** Set true only after all 3 masters pass Quality Gate + explicit approve step. */
export const BASELINE_VISUAL_APPROVED = false

export const IMPORT_DIRECTORY = 'incoming/external-production'

export const SUPPORTED_FORMATS = ['png'] as const

export type DeliverySlotId =
  | 'SSUKSSUK_CHARACTER_BASE'
  | 'FIRE_TRUCK_01_MASTER'
  | 'CAR_WORKSHOP_MASTER'
  | 'FIRETRUCK_BODY'
  | 'FIRETRUCK_FRONT_DOOR'
  | 'FIRETRUCK_REAR_DOOR'
  | 'FIRETRUCK_FRONT_WHEEL'
  | 'FIRETRUCK_REAR_WHEEL'
  | 'FIRETRUCK_FRONT_RIM'
  | 'FIRETRUCK_REAR_RIM'
  | 'FIRETRUCK_FRONT_WINDOW'
  | 'FIRETRUCK_SIDE_WINDOW'
  | 'FIRETRUCK_BUMPER'
  | 'FIRETRUCK_LADDER'
  | 'FIRETRUCK_EMERGENCY_LIGHT'
  | 'FIRETRUCK_HOSE'
  | 'FIRETRUCK_HEADLIGHT'
  | 'FIRETRUCK_SHADOW'
