/** Shared P2P join config — TURN + MQTT relays so family/friends can connect across networks. */

import { defaultRelayUrls } from '@trystero-p2p/mqtt'

/** Free public TURN (Open Relay) — needed when family phones are on different NATs. */
export const SPACE_TURN_CONFIG = [
  {
    urls: [
      'turn:openrelay.metered.ca:80',
      'turn:openrelay.metered.ca:443',
      'turn:openrelay.metered.ca:80?transport=tcp',
      'turns:openrelay.metered.ca:443',
    ],
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
]

export function spaceRoomConfig(appId: string, roomCode: string) {
  return {
    appId,
    // Shared secret per room code — keeps strangers on public MQTT out of the data channel
    password: `jarvis-space-${roomCode}`,
    relayConfig: {
      urls: defaultRelayUrls,
      redundancy: Math.min(4, defaultRelayUrls.length),
      warnOnRelayFailure: true,
    },
    turnConfig: SPACE_TURN_CONFIG,
    rtcConfig: {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        ...SPACE_TURN_CONFIG.map((t) => ({
          urls: t.urls,
          username: t.username,
          credential: t.credential,
        })),
      ],
    },
  }
}

export type RelayHealth = { ok: number; total: number; label: string }

export function summarizeRelaySockets(sockets: Record<string, unknown> | null | undefined): RelayHealth {
  const entries = Object.entries(sockets || {})
  const total = entries.length
  let ok = 0
  for (const [, sock] of entries) {
    const ready = (sock as { readyState?: number } | null)?.readyState
    // WebSocket.OPEN === 1
    if (ready === 1) ok += 1
  }
  if (!total) return { ok: 0, total: 0, label: '중계 연결 중…' }
  if (ok === 0) return { ok, total, label: `중계 실패 0/${total} · 네트워크·방화벽 확인` }
  return { ok, total, label: `중계 ${ok}/${total}` }
}
