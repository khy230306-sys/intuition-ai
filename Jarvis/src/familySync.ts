import { getRelaySockets, joinRoom, selfId, type MessageAction } from '@trystero-p2p/mqtt'
import type { FamilySyncPacket } from './familyTypes'
import {
  applyFamilyChatClearedAt,
  loadFamilyRoom,
  mergeFamilySnapshot,
  saveFamilyRoom,
  upsertMember,
} from './familyStore'
import { preferSpaceName } from './inviteJoin'
import { createSpacePacketRelay, type SpacePacketRelay } from './spacePacketRelay'
import { isRelayLinkDead, spaceRoomConfig, summarizeRelaySockets, type RelayHealth } from './spaceSyncConfig'

const APP_ID = 'jarvis-family-space-v1'

type RoomHandle = ReturnType<typeof joinRoom>

let roomHandle: RoomHandle | null = null
let packetRelay: SpacePacketRelay | null = null
let syncAction: MessageAction<FamilySyncPacket> | null = null
let peerCount = 0
let relayLabel = '중계 대기'
let announceTimer = 0
let healthTimer = 0
let unhealthyTicks = 0
let reconnecting = false
let lastEmitted = ''
let onChange: ((info: { peers: number; status: string; reason: 'health' | 'peer' | 'data' | 'conn' }) => void) | null =
  null

export function getFamilyPeerCount(): number {
  return peerCount
}

export function getFamilySelfPeerId(): string {
  return selfId
}

export function getFamilyRelayLabel(): string {
  return relayLabel
}

export function setFamilySyncListener(
  fn: ((info: { peers: number; status: string; reason: 'health' | 'peer' | 'data' | 'conn' }) => void) | null,
): void {
  onChange = fn
}

function emit(status: string, reason: 'health' | 'peer' | 'data' | 'conn' = 'conn'): void {
  refreshPeers()
  lastEmitted = status
  onChange?.({ peers: peerCount, status, reason })
}

function refreshPeers(): number {
  peerCount = Object.keys(roomHandle?.getPeers() || {}).length
  return peerCount
}

function readRelayHealth(): RelayHealth {
  try {
    return summarizeRelaySockets(getRelaySockets?.() as Record<string, unknown>)
  } catch {
    return { ok: 0, total: 0, label: '중계 상태 확인 불가' }
  }
}

function refreshRelayHealth(): void {
  relayLabel = readRelayHealth().label
}

function applyPacket(packet: FamilySyncPacket): void {
  const local = loadFamilyRoom()
  if (!local) return

  if (packet.type === 'hello') {
    upsertMember(local, packet.member)
    if (packet.roomName) {
      local.name = preferSpaceName(local.name, packet.roomName, local.updatedAt, packet.updatedAt || Date.now())
    }
    saveFamilyRoom(local)
    return
  }

  if (packet.type === 'snapshot') {
    if (packet.room.code && local.code && packet.room.code !== local.code) return
    const merged = mergeFamilySnapshot(local, packet.room)
    saveFamilyRoom(merged)
    return
  }

  if (packet.type === 'chat-clear') {
    applyFamilyChatClearedAt(packet.clearedAt)
    return
  }

  if (packet.type === 'chat') {
    if ((local.chatClearedAt || 0) >= packet.message.createdAt) return
    if (!local.messages.some((m) => m.id === packet.message.id)) {
      local.messages.push(packet.message)
      saveFamilyRoom(local)
      if (packet.message.authorId !== local.memberId) {
        void import('./chatNotify').then((m) =>
          m.showChatNotification({
            kind: 'family',
            title: `가족 · ${packet.message.authorName}`,
            body: packet.message.text,
            tag: `family-${packet.message.id}`,
          }),
        )
      }
    }
    return
  }

  if (packet.type === 'notice') {
    const idx = local.notices.findIndex((n) => n.id === packet.notice.id)
    if (idx >= 0) {
      if ((packet.notice.updatedAt || 0) < (local.notices[idx]!.updatedAt || 0)) return
      local.notices[idx] = packet.notice
    } else local.notices.unshift(packet.notice)
    saveFamilyRoom(local)
    return
  }

  if (packet.type === 'event') {
    const idx = local.events.findIndex((e) => e.id === packet.event.id)
    if (idx >= 0) {
      if ((packet.event.updatedAt || 0) < (local.events[idx]!.updatedAt || 0)) return
      local.events[idx] = packet.event
    } else local.events.unshift(packet.event)
    saveFamilyRoom(local)
    return
  }

  if (packet.type === 'notice-del') {
    local.notices = local.notices.filter((n) => n.id !== packet.id)
    saveFamilyRoom(local)
    return
  }

  if (packet.type === 'event-del') {
    local.events = local.events.filter((e) => e.id !== packet.id)
    saveFamilyRoom(local)
  }
}

function snapshotPacket(): FamilySyncPacket | null {
  const room = loadFamilyRoom()
  if (!room) return null
  const { memberId: _m, memberName: _n, ...shared } = room
  return { type: 'snapshot', room: shared }
}

async function send(packet: FamilySyncPacket): Promise<void> {
  const tasks: Promise<void>[] = []
  if (syncAction) {
    tasks.push(
      syncAction.send(packet).then(
        () => undefined,
        () => undefined,
      ),
    )
  }
  if (packetRelay) {
    tasks.push(
      packetRelay.publish(packet).then(
        () => undefined,
        () => undefined,
      ),
    )
  }
  if (tasks.length) await Promise.all(tasks)
}

async function announceSelf(): Promise<void> {
  const current = loadFamilyRoom()
  if (!current) return
  if (!syncAction && !packetRelay) return
  const { loadStoredPushSubscription } = await import('./chatNotify')
  const { loadSettings } = await import('./storage')
  const push = loadStoredPushSubscription()
  const avatarUrl = loadSettings().avatarDataUrl || null
  const member = {
    id: current.memberId,
    name: current.memberName,
    joinedAt: Date.now(),
    push,
    avatarUrl,
  }
  upsertMember(current, member)
  saveFamilyRoom(current)
  await send({
    type: 'hello',
    member,
    roomName: current.name,
    updatedAt: current.updatedAt,
  })
  const snap = snapshotPacket()
  if (snap) {
    if (snap.type === 'snapshot') {
      snap.room = {
        ...snap.room,
        messages: snap.room.messages.slice(-80),
        notices: snap.room.notices.slice(0, 30),
        events: snap.room.events.slice(0, 50),
      }
    }
    await send(snap)
  }
}

function statusLine(): string {
  const n = refreshPeers()
  refreshRelayHealth()
  const mqtt = packetRelay?.connected() ? '대화중계 ON' : '대화중계 대기'
  if (n > 0) return `온라인 ${n}명 · ${mqtt} · ${relayLabel}`
  return `${mqtt} · ${relayLabel} · 상대도 AIZIO를 열어 두면 메시지가 옵니다`
}

function emitStatus(reason: 'health' | 'peer' | 'data' | 'conn' = 'health'): void {
  const status = statusLine()
  if (reason === 'health' && status === lastEmitted) return
  lastEmitted = status
  onChange?.({ peers: peerCount, status, reason })
}

function startWatchdogs(): void {
  window.clearInterval(announceTimer)
  window.clearInterval(healthTimer)
  unhealthyTicks = 0
  announceTimer = window.setInterval(() => {
    if (!roomHandle || reconnecting) return
    void announceSelf().then(() => emitStatus('health'))
  }, 20_000)
  healthTimer = window.setInterval(() => {
    if (!roomHandle || reconnecting) return
    const health = readRelayHealth()
    relayLabel = health.label
    refreshPeers()
    const mqttOk = Boolean(packetRelay?.connected())
    if (isRelayLinkDead(health) && !mqttOk) unhealthyTicks += 1
    else unhealthyTicks = 0
    emitStatus('health')
    // ~12s of dead MQTT after iOS suspend → hard rejoin
    if (unhealthyTicks >= 3) {
      unhealthyTicks = 0
      void ensureFamilySync({ force: true }).then((r) => {
        lastEmitted = ''
        onChange?.({ peers: peerCount, status: r.message, reason: 'conn' })
      })
    }
  }, 4_000)
}

async function fanoutChatPush(message: {
  id: string
  authorId: string
  authorName: string
  text: string
}): Promise<void> {
  const room = loadFamilyRoom()
  if (!room) return
  const subs = room.members.filter((m) => m.id !== room.memberId).map((m) => m.push)
  const { pushChatToSubscriptions } = await import('./chatNotify')
  await pushChatToSubscriptions(subs, {
    kind: 'family',
    title: `가족 · ${message.authorName}`,
    body: message.text,
    tag: `family-${message.id}`,
  })
}

export async function broadcastFamilyPacket(packet: FamilySyncPacket): Promise<void> {
  await send(packet)
  if (packet.type === 'chat') void fanoutChatPush(packet.message)
}

export function isFamilySyncConnected(): boolean {
  return Boolean(roomHandle)
}

export function isFamilySyncHealthy(): boolean {
  if (packetRelay?.connected()) return true
  if (!roomHandle) return false
  return !isRelayLinkDead(readRelayHealth())
}

export async function disconnectFamilySync(): Promise<void> {
  window.clearInterval(announceTimer)
  window.clearInterval(healthTimer)
  announceTimer = 0
  healthTimer = 0
  unhealthyTicks = 0
  // Null handles first so a concurrent joinFresh cannot be wiped after await leave()
  const relay = packetRelay
  const handle = roomHandle
  packetRelay = null
  roomHandle = null
  syncAction = null
  peerCount = 0
  relayLabel = '연결 해제'
  lastEmitted = ''
  try {
    relay?.close()
  } catch {
    /* ignore */
  }
  try {
    await handle?.leave()
  } catch {
    /* ignore */
  }
  emit('연결 해제', 'conn')
}

async function joinFresh(): Promise<{ ok: boolean; message: string }> {
  const room = loadFamilyRoom()
  if (!room) return { ok: false, message: '먼저 가족 공간을 만들거나 코드로 참여하세요.' }

  try {
    packetRelay = await createSpacePacketRelay({
      kind: 'family',
      code: room.code,
      onPacket: (raw) => {
        applyPacket(raw as FamilySyncPacket)
        emit(`동기화 · ${statusLine()}`, 'data')
      },
    })

    roomHandle = joinRoom(spaceRoomConfig(APP_ID, room.code), `fam-${room.code}`)
    syncAction = roomHandle.makeAction<FamilySyncPacket>('fam-sync', {
      onMessage: (data) => {
        applyPacket(data)
        emit(`동기화 · ${statusLine()}`, 'data')
      },
    })

    roomHandle.onPeerJoin = (peerId) => {
      refreshPeers()
      void announceSelf()
      emit(`동료 접속 ${peerId.slice(0, 4)}… · ${statusLine()}`, 'peer')
    }

    roomHandle.onPeerLeave = () => {
      emit(`동료 나감 · ${statusLine()}`, 'peer')
    }

    startWatchdogs()
    await announceSelf()
    await new Promise((r) => setTimeout(r, 600))
    const msg = `가족 동기화 연결 · 코드 ${room.code} · ${statusLine()}`
    emit(msg, 'conn')
    return { ok: true, message: msg }
  } catch (err) {
    try {
      packetRelay?.close()
    } catch {
      /* ignore */
    }
    packetRelay = null
    const orphan = roomHandle
    roomHandle = null
    syncAction = null
    try {
      await orphan?.leave()
    } catch {
      /* ignore */
    }
    const msg = err instanceof Error ? err.message : '동기화 연결 실패'
    emit(msg, 'conn')
    return { ok: false, message: msg }
  }
}

let ensureWait: Promise<{ ok: boolean; message: string }> | null = null
let pendingForce = false

/** Connect, or heal a zombie handle after backgrounding. */
export async function ensureFamilySync(opts?: { force?: boolean }): Promise<{ ok: boolean; message: string }> {
  const room = loadFamilyRoom()
  if (!room) return { ok: false, message: '먼저 가족 공간을 만들거나 코드로 참여하세요.' }

  if (opts?.force) pendingForce = true
  if (ensureWait) return ensureWait

  if (roomHandle && !pendingForce && isFamilySyncHealthy()) {
    const status = statusLine()
    return { ok: true, message: `이미 연결됨 · ${status}` }
  }

  reconnecting = true
  ensureWait = (async () => {
    try {
      let last = { ok: false, message: '연결 대기' }
      do {
        pendingForce = false
        if (roomHandle) await disconnectFamilySync()
        last = await joinFresh()
      } while (pendingForce)
      return last
    } finally {
      reconnecting = false
      ensureWait = null
    }
  })()
  return ensureWait
}

export async function connectFamilySync(): Promise<{ ok: boolean; message: string }> {
  return ensureFamilySync()
}

export async function reconnectFamilySync(): Promise<{ ok: boolean; message: string }> {
  return ensureFamilySync({ force: true })
}
