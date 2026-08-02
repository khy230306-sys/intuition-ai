import QRCode from 'qrcode'
import { exportBackup } from './storage'
import type { ActionResult } from './types'

/** Soft limit for reliable phone-camera QR scans */
export const QR_SAFE_CHARS = 800

/** Always share the fixed production URL so invites never point at stale snapshot hosts. */
export const FIXED_APP_URL = 'https://jarvis-app.shipstatic.com'

export function appShareUrl(): string {
  if (typeof window === 'undefined') return FIXED_APP_URL
  try {
    const host = window.location.hostname
    if (host === 'localhost' || host === '127.0.0.1') {
      return new URL('.', window.location.href).href.replace(/\/$/, '') || window.location.origin
    }
    return FIXED_APP_URL
  } catch {
    return FIXED_APP_URL
  }
}

export function appShareMessage(url = appShareUrl()): string {
  return [
    'JARVIS — iPhone 만능·투자 AI 비서',
    '',
    'Safari로 열고 → 공유 → 홈 화면에 추가',
    url,
  ].join('\n')
}

export async function qrSvg(data: string, size = 220): Promise<string> {
  return QRCode.toString(data, {
    type: 'svg',
    width: size,
    margin: 1,
    color: { dark: '#0b121c', light: '#ffffff' },
    errorCorrectionLevel: data.length > 400 ? 'L' : 'M',
  })
}

export async function qrDataUrl(data: string, size = 280): Promise<string> {
  return QRCode.toDataURL(data, {
    width: size,
    margin: 1,
    color: { dark: '#0b121c', light: '#ffffff' },
    errorCorrectionLevel: data.length > 400 ? 'L' : 'M',
  })
}

export type BackupQrResult =
  | { kind: 'full'; payload: string; bytes: number }
  | { kind: 'invite'; payload: string; bytes: number; reason: string }

/** Full JSON only if small; otherwise invite QR with app URL + counts. */
export function buildBackupQrPayload(): BackupQrResult {
  const json = exportBackup()
  if (json.length <= QR_SAFE_CHARS) {
    return { kind: 'full', payload: json, bytes: json.length }
  }
  let counts = { reminders: 0, expenses: 0, holdings: 0, memory: 0 }
  try {
    const data = JSON.parse(json) as {
      reminders?: unknown[]
      expenses?: unknown[]
      holdings?: unknown[]
      memory?: unknown[]
    }
    counts = {
      reminders: data.reminders?.length || 0,
      expenses: data.expenses?.length || 0,
      holdings: data.holdings?.length || 0,
      memory: data.memory?.length || 0,
    }
  } catch {
    /* ignore */
  }
  const invite = [
    'JARVIS 백업 안내',
    `일시 ${new Date().toISOString().slice(0, 16)}`,
    `할일 ${counts.reminders} · 지출 ${counts.expenses} · 보유 ${counts.holdings} · 기억 ${counts.memory}`,
    '전체 백업은 설정 → 공유보내기 사용',
    appShareUrl(),
  ].join('\n')
  return {
    kind: 'invite',
    payload: invite,
    bytes: json.length,
    reason: `전체 백업 ${Math.round(json.length / 1024)}KB → QR 용량 초과. 앱 링크·요약 QR로 대체합니다.`,
  }
}

export async function shareAppLink(): Promise<ActionResult> {
  const url = appShareUrl()
  const text = appShareMessage(url)
  if (navigator.share) {
    try {
      await navigator.share({ title: 'JARVIS', text, url })
      return { ok: true, message: '공유 시트를 열었습니다.' }
    } catch {
      return { ok: false, message: '공유가 취소되었습니다.' }
    }
  }
  try {
    await navigator.clipboard.writeText(text)
    return { ok: true, message: '앱 링크를 클립보드에 복사했습니다.' }
  } catch {
    return { ok: false, message: '공유를 지원하지 않는 환경입니다.' }
  }
}

export async function shareBackupFile(): Promise<ActionResult> {
  const json = exportBackup()
  const name = `jarvis-backup-${new Date().toISOString().slice(0, 10)}.json`
  const file = new File([json], name, { type: 'application/json' })

  const nav = navigator as Navigator & {
    canShare?: (data?: ShareData) => boolean
  }

  if (nav.share && typeof nav.canShare === 'function') {
    try {
      if (nav.canShare({ files: [file] })) {
        await nav.share({
          files: [file],
          title: 'JARVIS 백업',
          text: 'JARVIS 데이터 백업 JSON — 파일/드라이브/메모에 저장하세요.',
        })
        return { ok: true, message: '백업 파일 공유 시트를 열었습니다. (파일·드라이브·메일)' }
      }
    } catch {
      /* fall through */
    }
  }

  if (nav.share) {
    try {
      // iOS may reject huge text; share a short pointer + download fallback below
      const summary = `JARVIS 백업 ${name}\n크기 ${Math.round(json.length / 1024)}KB\n설정에서 파일로 저장하거나, 아래 복원으로 가져오세요.\n${appShareUrl()}`
      await nav.share({ title: 'JARVIS 백업', text: summary })
      downloadBackupBlob(json, name)
      return {
        ok: true,
        message: '공유 시트 + 파일 다운로드를 실행했습니다. iCloud/Drive/메일로 옮기세요.',
      }
    } catch {
      /* fall through */
    }
  }

  downloadBackupBlob(json, name)
  return { ok: true, message: '백업 파일을 다운로드했습니다.' }
}

export function downloadBackupBlob(json = exportBackup(), name?: string): void {
  const filename = name || `jarvis-backup-${new Date().toISOString().slice(0, 10)}.json`
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export type ShareModalKind = 'app' | 'backup' | 'arcade'
type ShareModalFn = (kind: ShareModalKind) => Promise<void>
let shareModalFn: ShareModalFn | null = null

export function registerShareModal(fn: ShareModalFn): void {
  shareModalFn = fn
}

export async function openShareUi(kind: ShareModalKind): Promise<string> {
  if (!shareModalFn) {
    if (kind === 'app') {
      const r = await shareAppLink()
      return r.message
    }
    if (kind === 'arcade') {
      return '게임 탭에서 내 기록 공유를 사용해 주세요.'
    }
    const r = await shareBackupFile()
    return r.message
  }
  await shareModalFn(kind)
  if (kind === 'app') return '앱 공유 QR을 열었습니다. 스캔하거나 공유하기를 누르세요.'
  if (kind === 'arcade') return '아케이드 기록 QR을 열었습니다. 친구에게 공유하거나 코드를 복사하세요.'
  return '백업 QR/공유 화면을 열었습니다. 큰 백업은 공유보내기를 사용하세요.'
}
