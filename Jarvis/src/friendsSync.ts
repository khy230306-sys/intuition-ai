import { getRelaySockets, joinRoom, selfId, type MessageAction } from '@trystero-p2p/mqtt'
import type { FriendsSyncPacket } from './friendsTypes'
import {
  loadFriendsRoom,
  mergeFriendsSnapshot,
  saveFriendsRoom,
  upsertMember,
} from './friendsStore'
import { preferSpaceName } from './inviteJoin'
import { isRelayLinkDead, spaceRoomConfig, summarizeRelaySockets, type RelayHealth } from './spaceSyncConfig'

const APP_ID = 'jarvis-friends-space-v1'

type RoomHandle = ReturnType<typeof joinRoom>

let roomHandle: RoomHandle | null = null
let syncAction: MessageAction<FriendsSyncPacket> | null = null
let peerCount = 0
let relayLabel = '중계 대기'
let announceTimer = 0
let healthTimer = 0
let unhealthyTicks = 0
let reconnecting = false
let lastEmitted = ''
let onChange: ((info: { peers: number; status: string; reason: 'health' | 'peer' | 'data' | 'conn' }) => void) | null =
  null

export function getFriendsPeerCount(): number {
  return peerCount
}

export function getFriendsSelfPeerId(): string {
  return selfId
}

export function getFriendsRelayLabel(): string {
  return relayLabel
}

export function setFriendsSyncListener(
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

function applyPacket(packet: FriendsSyncPacket): void {
  const local = loadFriendsRoom()
  if (!local) return

  if (packet.type === 'hello') {
    upsertMember(local, packet.member)
    if (packet.roomName) {
      local.name = preferSpaceName(local.name, packet.roomName, local.updatedAt, packet.updatedAt || Date.now())
    }
    saveFriendsRoom(local)
    return
  }

  if (packet.type === 'snapshot') {
    if (packet.room.code && local.code && packet.room.code !== local.code) return
    const merged = mergeFriendsSnapshot(local, packet.room)
    saveFriendsRoom(merged)
    return
  }

  if (packet.type === 'chat') {
    if (!local.messages.some((m) => m.id === packet.message.id)) {
      local.messages.push(packet.message)
      saveFriendsRoom(local)
      if (packet.message.authorId !== local.memberId) {
        void import('./chatNotify').then((m) =>
          m.showChatNotification({
            kind: 'friends',
            title: `친구 · ${packet.message.authorName}`,
            body: packet.message.text,
            tag: `friends-${packet.message.id}`,
          }),
        )
      }
    }
    return
  }

  if (packet.type === 'notice') {
    const idx = local.notices.findIndex((n) => n.id === packet.notice.id)
    if (idx >= 0) local.notices[idx] = packet.notice
    else local.notices.unshift(packet.notice)
    saveFriendsRoom(local)
    return
  }

  if (packet.type === 'event') {
    const idx = local.events.findIndex((e) => e.id === packet.event.id)
    if (idx >= 0) local.events[idx] = packet.event
    else local.events.unshift(packet.event)
    saveFriendsRoom(local)
    return
  }

  if (packet.type === 'notice-del') {
    local.notices = local.notices.filter((n) => n.id !== packet.id)
    saveFriendsRoom(local)
    return
  }

  if (packet.type === 'event-del') {
    local.events = local.events.filter((e) => e.id !== packet.id)
    saveFriendsRoom(local)
  }
}

function snapshotPacket(): FriendsSyncPacket | null {
  const room = loadFriendsRoom()
  if (!room) return null
  const { memberId: _m, memberName: _n, ...shared } = room
  return { type: 'snapshot', room: shared }
}

async function send(packet: FriendsSyncPacket): Promise<void> {
  if (!syncAction) return
  try {
    await syncAction.send(packet)
  } catch {
    /* peer may be offline */
  }
}

async function announceSelf(): Promise<void> {
  const current = loadFriendsRoom()
  if (!current || !syncAction) return
  const { loadStoredPushSubscription } = await import('./chatNotify')
  const push = loadStoredPushSubscription()
  const member = {
    id: current.memberId,
    name: current.memberName,
    joinedAt: Date.now(),
    push,
  }
  upsertMember(current, member)
  saveFriendsRoom(current)
  await send({
    type: 'hello',
    member,
    roomName: current.name,
    updatedAt: current.updatedAt,
  })
  const snap = snapshotPacket()
  if (snap) await send(snap)
}

function statusLine(): string {
  const n = refreshPeers()
  refreshRelayHealth()
  if (n > 0) return `온라인 ${n}명 · ${relayLabel}`
  return `온라인 대기 · ${relayLabel} · 상대도 JARVIS를 열어 두면 자동 연결`
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
    if (isRelayLinkDead(health)) unhealthyTicks += 1
    else unhealthyTicks = 0
    emitStatus('health')
    if (unhealthyTicks >= 3) {
      unhealthyTicks = 0
      void ensureFriendsSync({ force: true }).then((r) => {
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
  const room = loadFriendsRoom()
  if (!room) return
  const subs = room.members.filter((m) => m.id !== room.memberId).map((m) => m.push)
  const { pushChatToSubscriptions } = await import('./chatNotify')
  await pushChatToSubscriptions(subs, {
    kind: 'friends',
    title: `친구 · ${message.authorName}`,
    body: message.text,
    tag: `friends-${message.id}`,
  })
}

export async function broadcastFriendsPacket(packet: FriendsSyncPacket): Promise<void> {
  await send(packet)
  if (packet.type === 'chat') void fanoutChatPush(packet.message)
}

export function isFriendsSyncConnected(): boolean {
  return Boolean(roomHandle)
}

export function isFriendsSyncHealthy(): boolean {
  if (!roomHandle) return false
  return !isRelayLinkDead(readRelayHealth())
}

export async function disconnectFriendsSync(): Promise<void> {
  window.clearInterval(announceTimer)
  window.clearInterval(healthTimer)
  announceTimer = 0
  healthTimer = 0
  unhealthyTicks = 0
  try {
    await roomHandle?.leave()
  } catch {
    /* ignore */
  }
  roomHandle = null
  syncAction = null
  peerCount = 0
  relayLabel = '연결 해제'
  lastEmitted = ''
  emit('연결 해제', 'conn')
}

async function joinFresh(): Promise<{ ok: boolean; message: string }> {
  const room = loadFriendsRoom()
  if (!room) return { ok: false, message: '먼저 친구 공간을 만들거나 코드로 참여하세요.' }

  try {
    roomHandle = joinRoom(spaceRoomConfig(APP_ID, room.code), `fr-${room.code}`)
    syncAction = roomHandle.makeAction<FriendsSyncPacket>('fr-sync', {
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
    const msg = `친구 동기화 연결 · 코드 ${room.code} · ${statusLine()}`
    emit(msg, 'conn')
    return { ok: true, message: msg }
  } catch (err) {
    roomHandle = null
    syncAction = null
    const msg = err instanceof Error ? err.message : '동기화 연결 실패'
    emit(msg, 'conn')
    return { ok: false, message: msg }
  }
}

export async function ensureFriendsSync(opts?: { force?: boolean }): Promise<{ ok: boolean; message: string }> {
  const room = loadFriendsRoom()
  if (!room) return { ok: false, message: '먼저 친구 공간을 만들거나 코드로 참여하세요.' }

  if (reconnecting) {
    return { ok: true, message: `재연결 중 · ${statusLine()}` }
  }

  const force = opts?.force === true
  if (roomHandle && !force && isFriendsSyncHealthy()) {
    const status = statusLine()
    return { ok: true, message: `이미 연결됨 · ${status}` }
  }

  reconnecting = true
  try {
    if (roomHandle) await disconnectFriendsSync()
    return await joinFresh()
  } finally {
    reconnecting = false
  }
}

export async function connectFriendsSync(): Promise<{ ok: boolean; message: string }> {
  return ensureFriendsSync()
}

export async function reconnectFriendsSync(): Promise<{ ok: boolean; message: string }> {
  return ensureFriendsSync({ force: true })
}
