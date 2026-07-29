import { joinRoom, selfId, type MessageAction } from '@trystero-p2p/mqtt'
import type { FamilySyncPacket } from './familyTypes'
import {
  loadFamilyRoom,
  mergeFamilySnapshot,
  saveFamilyRoom,
  upsertMember,
} from './familyStore'

const APP_ID = 'jarvis-family-space-v1'

type RoomHandle = ReturnType<typeof joinRoom>

let roomHandle: RoomHandle | null = null
let syncAction: MessageAction<FamilySyncPacket> | null = null
let peerCount = 0
let onChange: ((info: { peers: number; status: string }) => void) | null = null

export function getFamilyPeerCount(): number {
  return peerCount
}

export function getFamilySelfPeerId(): string {
  return selfId
}

export function setFamilySyncListener(fn: ((info: { peers: number; status: string }) => void) | null): void {
  onChange = fn
}

function emit(status: string): void {
  onChange?.({ peers: peerCount, status })
}

function applyPacket(packet: FamilySyncPacket): void {
  const local = loadFamilyRoom()
  if (!local) return

  if (packet.type === 'hello') {
    upsertMember(local, packet.member)
    if (packet.roomName && !local.name) local.name = packet.roomName
    saveFamilyRoom(local)
    return
  }

  if (packet.type === 'snapshot') {
    if (packet.room.code && local.code && packet.room.code !== local.code) return
    const merged = mergeFamilySnapshot(local, packet.room)
    saveFamilyRoom(merged)
    return
  }

  if (packet.type === 'chat') {
    if (!local.messages.some((m) => m.id === packet.message.id)) {
      local.messages.push(packet.message)
      saveFamilyRoom(local)
    }
    return
  }

  if (packet.type === 'notice') {
    const idx = local.notices.findIndex((n) => n.id === packet.notice.id)
    if (idx >= 0) local.notices[idx] = packet.notice
    else local.notices.unshift(packet.notice)
    saveFamilyRoom(local)
    return
  }

  if (packet.type === 'event') {
    const idx = local.events.findIndex((e) => e.id === packet.event.id)
    if (idx >= 0) local.events[idx] = packet.event
    else local.events.unshift(packet.event)
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
  if (!syncAction) return
  try {
    await syncAction.send(packet)
  } catch {
    /* peer may be offline */
  }
}

export async function broadcastFamilyPacket(packet: FamilySyncPacket): Promise<void> {
  await send(packet)
}

export async function connectFamilySync(): Promise<{ ok: boolean; message: string }> {
  const room = loadFamilyRoom()
  if (!room) return { ok: false, message: '먼저 가족 공간을 만들거나 코드로 참여하세요.' }
  if (roomHandle) {
    emit(`연결됨 · 동료 ${peerCount}`)
    return { ok: true, message: `이미 연결됨 (동료 ${peerCount}명)` }
  }

  try {
    roomHandle = joinRoom({ appId: APP_ID }, `fam-${room.code}`)
    syncAction = roomHandle.makeAction<FamilySyncPacket>('fam-sync', {
      onMessage: (data) => {
        applyPacket(data)
        emit(`동기화 · 동료 ${peerCount}`)
      },
    })

    roomHandle.onPeerJoin = (peerId) => {
      peerCount = Object.keys(roomHandle?.getPeers() || {}).length
      const current = loadFamilyRoom()
      if (!current) return
      void send({
        type: 'hello',
        member: {
          id: current.memberId,
          name: current.memberName,
          joinedAt: Date.now(),
        },
        roomName: current.name,
        updatedAt: current.updatedAt,
      })
      const snap = snapshotPacket()
      if (snap) void send(snap)
      emit(`동료 접속 ${peerId.slice(0, 4)}… · ${peerCount}명`)
    }

    roomHandle.onPeerLeave = () => {
      peerCount = Object.keys(roomHandle?.getPeers() || {}).length
      emit(`동료 나감 · ${peerCount}명`)
    }

    peerCount = Object.keys(roomHandle.getPeers()).length
    emit(`연결 중 · 코드 ${room.code}`)
    // Announce ourselves
    await send({
      type: 'hello',
      member: { id: room.memberId, name: room.memberName, joinedAt: Date.now() },
      roomName: room.name,
      updatedAt: room.updatedAt,
    })
    const snap = snapshotPacket()
    if (snap) await send(snap)
    return { ok: true, message: `가족 동기화 연결 · 코드 ${room.code}` }
  } catch (err) {
    roomHandle = null
    syncAction = null
    const msg = err instanceof Error ? err.message : '동기화 연결 실패'
    emit(msg)
    return { ok: false, message: msg }
  }
}

export async function disconnectFamilySync(): Promise<void> {
  try {
    await roomHandle?.leave()
  } catch {
    /* ignore */
  }
  roomHandle = null
  syncAction = null
  peerCount = 0
  emit('연결 해제')
}

export function isFamilySyncConnected(): boolean {
  return Boolean(roomHandle)
}
