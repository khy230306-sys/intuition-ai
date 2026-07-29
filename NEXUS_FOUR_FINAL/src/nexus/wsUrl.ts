/** 브라우저에서 스캐너 WebSocket URL을 결정합니다. */
export function resolveScannerWebSocketUrl(configured: string): string {
  const raw = (configured || '').trim()
  if (!raw || raw === 'auto') {
    if (typeof window === 'undefined') return 'ws://127.0.0.1:8765'
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
    // Vite 개발 서버 프록시: /scanner-ws → ws://127.0.0.1:8765
    return `${proto}://${window.location.host}/scanner-ws`
  }
  return raw
}
