/** Offline join receipts — prove invite acceptance without waiting for live P2P. */

import type { SpaceKind } from './inviteJoin'

export const JOIN_RECEIPT_PREFIX = 'JARVIS-JOIN'

export type JoinReceipt = {
  v: 1
  kind: SpaceKind
  code: string
  memberId: string
  memberName: string
  at: number
}

export function buildJoinReceipt(input: {
  kind: SpaceKind
  code: string
  memberId: string
  memberName: string
  at?: number
}): { receipt: JoinReceipt; payload: string; message: string } {
  const receipt: JoinReceipt = {
    v: 1,
    kind: input.kind,
    code: input.code.trim().toUpperCase(),
    memberId: input.memberId.slice(0, 64),
    memberName: (input.memberName || '친구').trim().slice(0, 20) || '친구',
    at: input.at ?? Date.now(),
  }
  const payload = [
    JOIN_RECEIPT_PREFIX,
    'v1',
    receipt.kind,
    receipt.code,
    receipt.memberId,
    receipt.memberName.replace(/\|/g, ' '),
    String(receipt.at),
  ].join('|')
  const label = receipt.kind === 'family' ? '가족' : '친구'
  const message = [
    `JARVIS ${label} 참여 확인 (오프라인용)`,
    `${receipt.memberName} · 코드 ${receipt.code}`,
    '',
    '보통은 초대 링크만으로 충분합니다. 초대자가 앱을 못 열 때만 아래를 «오프라인 멤버 등록»에 붙여넣으세요.',
    payload,
  ].join('\n')
  return { receipt, payload, message }
}

export function extractJoinReceiptPayload(raw: string): string {
  const text = String(raw || '').replace(/[\u200B-\u200D\uFEFF]/g, '').trim()
  if (!text) return ''
  for (const line of text.split(/\r?\n/)) {
    const i = line.indexOf(`${JOIN_RECEIPT_PREFIX}|`)
    if (i >= 0) return line.slice(i).trim().split(/\s+/)[0] || ''
  }
  const m = text.match(/JARVIS-JOIN\|v1\|(?:family|friends)\|[A-Z0-9]{4,8}\|[^\s|]+\|[^|\n]{0,32}\|\d{10,}/)
  return m ? m[0] : text
}

export function parseJoinReceipt(raw: string): { ok: true; receipt: JoinReceipt } | { ok: false; message: string } {
  const payload = extractJoinReceiptPayload(raw)
  if (!payload) return { ok: false, message: '참여 확인 코드를 붙여넣어 주세요.' }
  const parts = payload.split('|')
  if (parts[0] !== JOIN_RECEIPT_PREFIX || parts[1] !== 'v1' || parts.length < 7) {
    return { ok: false, message: 'JARVIS 참여 확인 형식이 아닙니다. 공유 문구 전체를 붙여넣어도 됩니다.' }
  }
  const kind = parts[2]
  const code = (parts[3] || '').toUpperCase()
  const memberId = parts[4] || ''
  const memberName = parts[5] || '친구'
  const at = Number(parts[6])
  if ((kind !== 'family' && kind !== 'friends') || !code || !memberId) {
    return { ok: false, message: '참여 확인 필드를 읽지 못했습니다.' }
  }
  return {
    ok: true,
    receipt: {
      v: 1,
      kind,
      code,
      memberId: memberId.slice(0, 64),
      memberName: memberName.slice(0, 20) || '친구',
      at: Number.isFinite(at) ? at : Date.now(),
    },
  }
}
