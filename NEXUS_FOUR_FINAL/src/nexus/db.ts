import Dexie, { type Table } from 'dexie'
import { z } from 'zod'
import type { AppSettings, BalanceSnapshot, EngineSelection, RoundResult } from './types'
import { DEFAULT_APP_SETTINGS } from './types'

export type AppSettingsRow = { key: string; value: any; updatedAt: number }
export type MartingaleStateRow = { key: string; value: any; updatedAt: number }

export class NexusDb extends Dexie {
  appSettings!: Table<AppSettingsRow, string>
  gameResults!: Table<RoundResult, string>
  balanceSnapshots!: Table<BalanceSnapshot, string>
  engineSelectionHistory!: Table<EngineSelection, string>
  martingaleState!: Table<MartingaleStateRow, string>
  scannerEvents!: Table<{ id: string; timestamp: number; payload: any }, string>

  constructor() {
    super('nexus_four_final')
    this.version(1).stores({
      appSettings: 'key',
      gameResults: 'id, shoeId, [shoeId+roundIndex], [tableId+roundId], timestamp',
      balanceSnapshots: 'id, shoeId, [tableId+roundIndex], timestamp',
      engineSelectionHistory: 'id, shoeId, selectedAt',
      martingaleState: 'key',
      scannerEvents: 'id, timestamp',
    })
  }
}

export const db = new NexusDb()

const GameResultSchema = z.object({
  id: z.string(),
  shoeId: z.number().int(),
  tableId: z.string(),
  roundId: z.number().int(),
  roundIndex: z.number().int(),
  tableChangedAt: z.number(),
  timestamp: z.number(),
  actual: z.union([z.enum(['PLAYER', 'BANKER']), z.literal('TIE')]),
  dataSource: z.enum(['local', 'scanner']),
})

const AppSettingsSchema = z.object({
  schemaVersion: z.number().int(),
  tableId: z.string(),
  tieMode: z.enum(['EXCLUDE_FOR_DIRECTION', 'INCLUDE_AS_TIE']),
  allowWait: z.boolean(),
  enableScanner: z.boolean(),
  websocketUrl: z.string(),
  scannerHeartbeatMs: z.number(),
  autoBetMasterSwitch: z.boolean(),
  autoBetTestingMode: z.boolean(),
  autoBetHysteresisMs: z.number(),
  multiEnsemble: z.object({
    minSampleDefault: z.number(),
    reevaluateEveryRounds: z.number(),
    replacementMinDelta: z.number(),
    minKeepRounds: z.number(),
    maxEnginesToCompare: z.number(),
  }),
  martingale: z.object({
    activeStrategyId: z.enum(['classic', 'aiShortRecovery', 'aiIntervalRecovery', 'aiProbabilityOptimize', 'aiIncomeAccelerate', 'multiEnsembleBet']),
    steps: z.array(z.number()),
    startAmount: z.number(),
    targetProfit: z.number(),
    dailyMaxLoss: z.number(),
    dailyTargetProfit: z.number(),
    maxConsecutiveFail: z.number(),
    bettingPerCycleLimit: z.number(),
    cycleLimit: z.number(),
    winBehavior: z.enum(['resetTo1', 'stop']),
    failBehaviorAfterMaxStep: z.enum(['stop', 'resetTo1']),
    engineSwitchBehavior: z.enum(['lockUntilCycleEnd', 'immediate']),
  }),
})

export type BackupPayload = {
  exportedAt: number
  schemaVersion: number
  appSettings: AppSettings
  gameResults: RoundResult[]
  engineSelectionHistory: EngineSelection[]
  balanceSnapshots: BalanceSnapshot[]
  martingaleState: any
}

export async function loadAppSettings(): Promise<AppSettings> {
  const row = await db.appSettings.get('appSettings')
  if (!row?.value) return DEFAULT_APP_SETTINGS
  const parsed = AppSettingsSchema.safeParse(row.value)
  return parsed.success ? (parsed.data as AppSettings) : DEFAULT_APP_SETTINGS
}

export async function saveAppSettings(settings: AppSettings) {
  await db.appSettings.put({
    key: 'appSettings',
    value: settings,
    updatedAt: Date.now(),
  })
}

export async function loadMartingaleState(): Promise<any> {
  const row = await db.martingaleState.get('martingaleState')
  return row?.value ?? null
}

export async function saveMartingaleState(value: any) {
  await db.martingaleState.put({ key: 'martingaleState', value, updatedAt: Date.now() })
}

export async function loadShoeResults(shoeId: number) {
  return db.gameResults.where('shoeId').equals(shoeId).sortBy('roundIndex')
}

export async function getLatestShoeId() {
  const last = await db.gameResults.orderBy('shoeId').last()
  if (!last) return 1
  return last.shoeId
}

export async function exportBackup(): Promise<BackupPayload> {
  const settings = await loadAppSettings()
  const gameResults = await db.gameResults.toArray()
  const engineSelectionHistory = await db.engineSelectionHistory.toArray()
  const balanceSnapshots = await db.balanceSnapshots.toArray()
  const martingaleState = (await loadMartingaleState()) ?? {}

  return {
    exportedAt: Date.now(),
    schemaVersion: 1,
    appSettings: settings,
    gameResults,
    engineSelectionHistory,
    balanceSnapshots,
    martingaleState,
  }
}

export async function importBackup(payload: unknown) {
  const BackupSchema = z.object({
    exportedAt: z.number(),
    schemaVersion: z.number(),
    appSettings: AppSettingsSchema,
    gameResults: z.array(GameResultSchema),
    engineSelectionHistory: z.array(
      z.object({
        id: z.string(),
        shoeId: z.number().int(),
        tableId: z.string(),
        selectedEngineId: z.string(),
        previousEngineId: z.union([z.string(), z.null()]),
        selectedAt: z.number(),
        selectionRoundIndex: z.number().int(),
        selectedAfterPlays: z.number().int(),
        reevaluateIn: z.number().int(),
        reason: z.string(),
        engineScores: z.array(z.any()),
        switchDecision: z.any(),
      })
    ),
    balanceSnapshots: z.array(
      z.object({
        id: z.string(),
        shoeId: z.number().int(),
        tableId: z.string(),
        roundIndex: z.number().int(),
        timestamp: z.number(),
        playerTotal: z.number(),
        bankerTotal: z.number(),
        tieTotal: z.number(),
        meta: z.any().optional(),
      })
    ),
    martingaleState: z.any(),
  })

  const parsed = BackupSchema.safeParse(payload)
  if (!parsed.success) {
    throw new Error('백업 파일 스키마가 올바르지 않습니다.')
  }
  const data = parsed.data

  // 손상 데이터 격리: import 시 기존 데이터를 모두 지우지 않고 upsert 위주로 적재
  await saveAppSettings(data.appSettings)
  await db.gameResults.bulkPut(data.gameResults)
  await db.engineSelectionHistory.bulkPut(data.engineSelectionHistory as any)
  await db.balanceSnapshots.bulkPut(data.balanceSnapshots as any)
  await saveMartingaleState(data.martingaleState)
}

