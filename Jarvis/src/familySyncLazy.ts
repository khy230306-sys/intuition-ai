/** Lazy wrappers so MQTT/WebRTC only load when Family tab is used. */

import type { FamilySyncPacket } from './familyTypes'

type SyncMod = typeof import('./familySync')

let modPromise: Promise<SyncMod> | null = null
let cached: SyncMod | null = null

async function loadSync(): Promise<SyncMod> {
  if (cached) return cached
  if (!modPromise) modPromise = import('./familySync')
  cached = await modPromise
  return cached
}

export async function connectFamilySync(): Promise<{ ok: boolean; message: string }> {
  const m = await loadSync()
  return m.connectFamilySync()
}

export async function disconnectFamilySync(): Promise<void> {
  if (!cached && !modPromise) return
  const m = await loadSync()
  return m.disconnectFamilySync()
}

export async function broadcastFamilyPacket(packet: FamilySyncPacket): Promise<void> {
  if (!cached && !modPromise) return
  const m = await loadSync()
  return m.broadcastFamilyPacket(packet)
}

export function getFamilyPeerCount(): number {
  return cached?.getFamilyPeerCount() ?? 0
}

export function setFamilySyncListener(
  fn: ((info: { peers: number; status: string }) => void) | null,
): void {
  void loadSync().then((m) => m.setFamilySyncListener(fn))
}
