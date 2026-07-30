/** Lazy wrappers so MQTT/WebRTC only load when Friends tab is used. */

import type { FriendsSyncPacket } from './friendsTypes'

type SyncMod = typeof import('./friendsSync')

let modPromise: Promise<SyncMod> | null = null
let cached: SyncMod | null = null

async function loadSync(): Promise<SyncMod> {
  if (cached) return cached
  if (!modPromise) modPromise = import('./friendsSync')
  cached = await modPromise
  return cached
}

export async function connectFriendsSync(): Promise<{ ok: boolean; message: string }> {
  const m = await loadSync()
  return m.connectFriendsSync()
}

export async function ensureFriendsSync(opts?: { force?: boolean }): Promise<{ ok: boolean; message: string }> {
  const m = await loadSync()
  return m.ensureFriendsSync(opts)
}

export async function reconnectFriendsSync(): Promise<{ ok: boolean; message: string }> {
  const m = await loadSync()
  return m.reconnectFriendsSync()
}

export async function disconnectFriendsSync(): Promise<void> {
  if (!cached && !modPromise) return
  const m = await loadSync()
  return m.disconnectFriendsSync()
}

export async function broadcastFriendsPacket(packet: FriendsSyncPacket): Promise<void> {
  if (!cached && !modPromise) return
  const m = await loadSync()
  return m.broadcastFriendsPacket(packet)
}

export function getFriendsPeerCount(): number {
  return cached?.getFriendsPeerCount() ?? 0
}

export function setFriendsSyncListener(
  fn: ((info: { peers: number; status: string }) => void) | null,
): void {
  void loadSync().then((m) => m.setFriendsSyncListener(fn))
}
