import type { Side } from './types'

export type ScannerConnectionState = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'ERROR'

export type ScannerMessage =
  | { type: 'scanner_status'; tableId?: string; status: string; timestamp: number }
  | { type: 'round_result'; tableId: string; roundId: number; roundIndex: number; timestamp: number; result: Side | 'TIE' }
  | {
      type: 'balance_snapshot'
      tableId: string
      roundIndex: number
      timestamp: number
      playerTotal: number
      bankerTotal: number
      tieTotal: number
      meta?: Record<string, any>
    }
  | { type: 'betting_open'; tableId: string; timestamp: number }
  | { type: 'betting_closed'; tableId: string; timestamp: number }
  | { type: 'table_changed'; tableId: string; timestamp: number }
  | { type: 'auto_bet_result'; tableId: string; timestamp: number; ok: boolean; message?: string }
  | { type: 'scanner_error'; timestamp: number; message: string }
  | { type: 'heartbeat'; timestamp: number }

export type ScannerState = {
  connectionState: ScannerConnectionState
  lastHeartbeatAt: number | null
  lastError: string | null
  tableId: string
  bettingOpenAt: number | null
  bettingCloseAt: number | null
}

export function createInitialScannerState(tableId: string): ScannerState {
  return {
    connectionState: 'DISCONNECTED',
    lastHeartbeatAt: null,
    lastError: null,
    tableId,
    bettingOpenAt: null,
    bettingCloseAt: null,
  }
}

export class ScannerClient {
  private ws: WebSocket | null = null
  private heartbeatTimer: any = null
  private url: string
  private onMessage: (msg: ScannerMessage) => void
  private getScannerState: () => ScannerState
  private setScannerState: (next: ScannerState) => void

  constructor(
    url: string,
    onMessage: (msg: ScannerMessage) => void,
    getScannerState: () => ScannerState,
    setScannerState: (next: ScannerState) => void,
  ) {
    this.url = url
    this.onMessage = onMessage
    this.getScannerState = getScannerState
    this.setScannerState = setScannerState
  }

  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) return
    this.setScannerState({ ...this.getScannerState(), connectionState: 'CONNECTING', lastError: null })
    this.ws = new WebSocket(this.url)

    this.ws.onopen = () => {
      this.setScannerState({ ...this.getScannerState(), connectionState: 'CONNECTED', lastError: null })
      this.startHeartbeat()
    }
    this.ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data) as ScannerMessage
        this.onMessage(data)
        if (data.type === 'heartbeat') {
          this.setScannerState({ ...this.getScannerState(), lastHeartbeatAt: Date.now() })
        }
      } catch {
        // ignore
      }
    }
    this.ws.onerror = () => {
      this.setScannerState({ ...this.getScannerState(), connectionState: 'ERROR', lastError: '웹소켓 오류' })
      this.stopHeartbeat()
    }
    this.ws.onclose = () => {
      this.setScannerState({ ...this.getScannerState(), connectionState: 'DISCONNECTED' })
      this.stopHeartbeat()
    }
  }

  disconnect() {
    this.stopHeartbeat()
    try {
      this.ws?.close()
    } catch {
      // ignore
    }
    this.ws = null
    this.setScannerState({ ...this.getScannerState(), connectionState: 'DISCONNECTED' })
  }

  private startHeartbeat() {
    if (this.heartbeatTimer) return
    this.heartbeatTimer = setInterval(() => {
      const st = this.getScannerState()
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return
      // 앱→스캐너 heartbeat: 연결 확인용
      try {
        this.ws.send(JSON.stringify({ type: 'heartbeat', timestamp: Date.now(), tableId: st.tableId }))
      } catch {
        // ignore
      }
      // heartbeat timeout 감지
      if (st.lastHeartbeatAt && Date.now() - st.lastHeartbeatAt > 15000) {
        this.setScannerState({ ...st, connectionState: 'DISCONNECTED', lastError: 'heartbeat timeout' })
      }
    }, 5000)
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer)
    this.heartbeatTimer = null
  }

  sendAutoBet(params: { tableId: string; roundIndex: number; side: Side; amount: number; mode: 'ENTRY' | 'WAIT' }) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return false
    const payload = { type: 'auto_bet_cmd', tableId: params.tableId, roundIndex: params.roundIndex, side: params.side, amount: params.amount, mode: params.mode }
    try {
      this.ws.send(JSON.stringify(payload))
      return true
    } catch {
      return false
    }
  }
}

