import type { AppDataSnapshot } from '@/types'
import { getSupabase, isCloudMode } from '@/services/supabase/client'

export type SyncConflict = {
  localUpdatedAt: string
  remoteUpdatedAt: string
  localSummary: string
  remoteSummary: string
}

export type SyncResult =
  | { status: 'demo' }
  | { status: 'ok'; direction: 'push' | 'pull' | 'noop' }
  | { status: 'conflict'; conflict: SyncConflict }
  | { status: 'error'; message: string }

export async function pullRemoteSnapshot(): Promise<AppDataSnapshot | null> {
  const sb = getSupabase()
  if (!sb) return null
  const { data, error } = await sb.from('app_snapshots').select('payload, updated_at').limit(1).maybeSingle()
  if (error) throw new Error(error.message)
  if (!data?.payload) return null
  return data.payload as AppDataSnapshot
}

export async function pushRemoteSnapshot(snapshot: AppDataSnapshot): Promise<void> {
  const sb = getSupabase()
  if (!sb) return
  const { error } = await sb.from('app_snapshots').upsert({
    id: 'primary',
    payload: snapshot,
    updated_at: new Date().toISOString(),
  })
  if (error) throw new Error(error.message)
}

export async function syncWithCloud(
  local: AppDataSnapshot,
  choice?: 'local' | 'remote',
): Promise<{ result: SyncResult; snapshot?: AppDataSnapshot }> {
  if (!isCloudMode()) return { result: { status: 'demo' } }
  try {
    const remote = await pullRemoteSnapshot()
    if (!remote) {
      await pushRemoteSnapshot(local)
      return { result: { status: 'ok', direction: 'push' } }
    }
    const localTs = getLatestTs(local)
    const remoteTs = getLatestTs(remote)
    if (choice === 'local') {
      await pushRemoteSnapshot(local)
      return { result: { status: 'ok', direction: 'push' }, snapshot: local }
    }
    if (choice === 'remote') {
      return { result: { status: 'ok', direction: 'pull' }, snapshot: remote }
    }
    if (Math.abs(localTs - remoteTs) < 2000) {
      return { result: { status: 'ok', direction: 'noop' } }
    }
    if (localTs !== remoteTs) {
      return {
        result: {
          status: 'conflict',
          conflict: {
            localUpdatedAt: new Date(localTs).toISOString(),
            remoteUpdatedAt: new Date(remoteTs).toISOString(),
            localSummary: summarize(local),
            remoteSummary: summarize(remote),
          },
        },
      }
    }
    return { result: { status: 'ok', direction: 'noop' } }
  } catch (e) {
    return { result: { status: 'error', message: e instanceof Error ? e.message : '동기화 실패' } }
  }
}

function getLatestTs(snapshot: AppDataSnapshot): number {
  const times = [
    ...snapshot.tournaments.map((t) => t.updatedAt),
    ...snapshot.timerStates.map((t) => t.updatedAt),
    ...snapshot.entries.map((t) => t.updatedAt),
    ...snapshot.auditLogs.map((t) => t.updatedAt),
  ]
  return times.reduce((max, t) => Math.max(max, new Date(t).getTime()), 0)
}

function summarize(snapshot: AppDataSnapshot): string {
  const running = snapshot.tournaments.filter((t) => t.status === 'running').length
  return `토너먼트 ${snapshot.tournaments.length}개 / 진행중 ${running} / 참가엔트리 ${snapshot.entries.length}`
}
