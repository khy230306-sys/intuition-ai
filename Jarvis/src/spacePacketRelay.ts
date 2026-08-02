/**
 * MQTT side-channel for family/friends sync packets.
 * Trystero only delivers makeAction over WebRTC; when peers=0 chat never leaves the device.
 * This relay publishes encrypted packets on public MQTT brokers so both phones can sync
 * whenever they have a broker connection — even without a WebRTC datachannel.
 */

import mqtt, { type MqttClient } from 'mqtt'
import { defaultRelayUrls, selfId } from '@trystero-p2p/mqtt'

export type SpaceRelayKind = 'family' | 'friends'

type Envelope = {
  v: 1
  from: string
  kind: SpaceRelayKind
  code: string
  /** base64(iv||ciphertext) AES-GCM */
  payload: string
  ts: number
}

export type SpacePacketRelay = {
  publish: (packet: unknown) => Promise<void>
  close: () => void
  connected: () => boolean
}

const RELAY_URLS = defaultRelayUrls.slice(0, 3)

function topicFor(kind: SpaceRelayKind, code: string): string {
  return `jarvis/v1/${kind}/${code.toUpperCase()}/pkg`
}

function b64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
  let s = ''
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]!)
  return btoa(s)
}

function fromB64(s: string): Uint8Array {
  const bin = atob(s)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

async function deriveKey(code: string): Promise<CryptoKey> {
  const enc = new TextEncoder()
  const material = await crypto.subtle.importKey(
    'raw',
    enc.encode(`jarvis-space-${code.toUpperCase()}`),
    'PBKDF2',
    false,
    ['deriveKey'],
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: enc.encode('jarvis-mqtt-relay-v1'), iterations: 120_000, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

async function seal(key: CryptoKey, obj: unknown): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const plain = new TextEncoder().encode(JSON.stringify(obj))
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plain)
  const mixed = new Uint8Array(iv.length + ct.byteLength)
  mixed.set(iv, 0)
  mixed.set(new Uint8Array(ct), iv.length)
  return b64(mixed)
}

async function open(key: CryptoKey, sealed: string): Promise<unknown | null> {
  try {
    const mixed = fromB64(sealed)
    if (mixed.length < 13) return null
    const iv = mixed.slice(0, 12)
    const ct = mixed.slice(12)
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct)
    return JSON.parse(new TextDecoder().decode(plain)) as unknown
  } catch {
    return null
  }
}

function packetDedupeKey(packet: unknown): string {
  if (!packet || typeof packet !== 'object') return JSON.stringify(packet)
  const p = packet as { type?: string; message?: { id?: string }; notice?: { id?: string }; event?: { id?: string }; id?: string; member?: { id?: string }; updatedAt?: number }
  if (p.type === 'chat' && p.message?.id) return `chat:${p.message.id}`
  if (p.type === 'notice' && p.notice?.id) return `notice:${p.notice.id}`
  if (p.type === 'event' && p.event?.id) return `event:${p.event.id}`
  if (p.type === 'notice-del' && p.id) return `notice-del:${p.id}`
  if (p.type === 'event-del' && p.id) return `event-del:${p.id}`
  if (p.type === 'hello' && p.member?.id) return `hello:${p.member.id}:${p.updatedAt || 0}`
  if (p.type === 'snapshot') return `snap:${p.updatedAt || Date.now()}:${Math.random()}`
  return `${p.type || 'x'}:${JSON.stringify(packet).slice(0, 120)}`
}

export async function createSpacePacketRelay(input: {
  kind: SpaceRelayKind
  code: string
  onPacket: (packet: unknown) => void
}): Promise<SpacePacketRelay> {
  const code = input.code.trim().toUpperCase()
  const topic = topicFor(input.kind, code)
  const key = await deriveKey(code)
  const seen = new Set<string>()
  const clients: MqttClient[] = []
  let alive = 0

  const handleRaw = async (raw: string) => {
    let env: Envelope
    try {
      env = JSON.parse(raw) as Envelope
    } catch {
      return
    }
    if (env?.v !== 1 || env.from === selfId || env.kind !== input.kind || env.code !== code) return
    const packet = await open(key, env.payload)
    if (!packet) return
    const dedupe = packetDedupeKey(packet)
    // snapshots always apply (merge is idempotent); still skip exact repeats briefly
    if (seen.has(dedupe)) return
    seen.add(dedupe)
    if (seen.size > 400) {
      const first = seen.values().next().value
      if (first) seen.delete(first)
    }
    input.onPacket(packet)
  }

  await Promise.all(
    RELAY_URLS.map(
      (url) =>
        new Promise<void>((resolve) => {
          let settled = false
          const done = () => {
            if (settled) return
            settled = true
            resolve()
          }
          try {
            const client = mqtt.connect(url, {
              reconnectPeriod: 4_000,
              connectTimeout: 8_000,
              clean: true,
              protocolVersion: 4,
            })
            clients.push(client)
            client.on('connect', () => {
              alive += 1
              client.subscribe(topic, { qos: 0 }, () => done())
            })
            client.on('message', (_t, buf) => {
              void handleRaw(buf.toString())
            })
            client.on('close', () => {
              alive = Math.max(0, alive - 1)
            })
            client.on('error', () => done())
            // Don't block UI long — publish will use whichever connects
            window.setTimeout(done, 3_500)
          } catch {
            done()
          }
        }),
    ),
  )

  return {
    connected: () => alive > 0 || clients.some((c) => c.connected),
    publish: async (packet: unknown) => {
      const dedupe = packetDedupeKey(packet)
      seen.add(dedupe)
      const payload = await seal(key, packet)
      const env: Envelope = {
        v: 1,
        from: selfId,
        kind: input.kind,
        code,
        payload,
        ts: Date.now(),
      }
      const body = JSON.stringify(env)
      await Promise.all(
        clients.map(
          (c) =>
            new Promise<void>((resolve) => {
              if (!c.connected) {
                resolve()
                return
              }
              // qos 1: at-least-once for chat/sync catch-up (dedupe keys drop duplicates)
              c.publish(topic, body, { qos: 1 }, () => resolve())
              window.setTimeout(resolve, 1_200)
            }),
        ),
      )
    },
    close: () => {
      for (const c of clients) {
        try {
          c.end(true)
        } catch {
          /* ignore */
        }
      }
      clients.length = 0
      alive = 0
    },
  }
}

/** Test helpers */
export async function __testEncryptRoundtrip(code: string, obj: unknown): Promise<unknown | null> {
  const key = await deriveKey(code)
  const sealed = await seal(key, obj)
  return open(key, sealed)
}

export function __testDedupeKey(packet: unknown): string {
  return packetDedupeKey(packet)
}
