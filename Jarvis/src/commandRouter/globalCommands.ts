/**
 * Global / System / UI Command Layer.
 * Terminal routes — must run BEFORE Active Task / slot resolver / providers.
 */

export type GlobalCommand =
  | 'CLEAR_CHAT'
  | 'RESET_CONVERSATION'
  | 'CANCEL_ACTIVE_TASK'
  | 'RESET_ACTIVE_TASK'
  | 'NEW_CONVERSATION'

export type GlobalCommandHit = {
  type: 'GLOBAL_COMMAND'
  command: GlobalCommand
  terminal: true
  normalized: string
}

function compact(text: string): string {
  return String(text || '')
    .trim()
    .toLowerCase()
    .replace(/[\s\u200B-\u200D\uFEFF]+/g, '')
    .replace(/[.!?~]+$/g, '')
}

/** Detect global/system/UI commands. Spacing-insensitive. */
export function detectGlobalCommand(raw: string): GlobalCommandHit | null {
  const text = String(raw || '').trim()
  if (!text) return null
  const c = compact(text)

  // CANCEL_ACTIVE_TASK — keep chat, end task only (never how-to 「취소하는 방법」)
  // Bare 「취소」 alone is handled inside Action Agent when a task exists —
  // do NOT claim it global here (breaks translation-mode 「취소」 / stop flows).
  if (!/방법|어떻게|알려|설명/.test(c)) {
    if (
      /여행취소|여행준비취소|비행기찾는거(취소|그만)|현재작업취소|지금하던거취소|이작업그만|이여행그만|비행기찾는거그만|작업취소|여행그만/.test(
        c,
      ) ||
      /^(여행|비행기|호텔|작업)(준비|찾는거|찾기)?(취소|그만)(해|하자)?$/.test(c)
    ) {
      return { type: 'GLOBAL_COMMAND', command: 'CANCEL_ACTIVE_TASK', terminal: true, normalized: c }
    }
  }

  // CLEAR_CHAT — wipe visible chat (+ end tasks per product policy)
  if (
    /대화창(을)?(지워|초기화)|채팅창(을)?(지워|비워|초기화)|채팅(을)?지워|대화내용지워|대화(를)?삭제|채팅(을)?삭제|지금대화다지워|메시지(를)?(전부)?삭제|클리어채팅|clearchat/.test(
      c,
    ) ||
    /대화지워줘|채팅지워|화면대화지워|대화창초기화|채팅창초기화/.test(c)
  ) {
    return { type: 'GLOBAL_COMMAND', command: 'CLEAR_CHAT', terminal: true, normalized: c }
  }

  // RESET / NEW conversation
  if (
    /대화초기화|채팅초기화|전체대화초기화|대화초기화시켜|대화초기화해|초기화하자|처음부터다시|새대화|새로시작|새대화시작|처음부터다시대화|resetchat|resetconversation|newchat/.test(
      c,
    ) ||
    /지난대화삭제|기록삭제|대화리셋|채팅리셋/.test(c)
  ) {
    if (/새대화|새로시작|newchat/.test(c)) {
      return { type: 'GLOBAL_COMMAND', command: 'NEW_CONVERSATION', terminal: true, normalized: c }
    }
    if (/처음부터다시|리셋활성|작업다시|여행다시알아/.test(c) && /작업|여행|비행기/.test(c) && !/대화/.test(c)) {
      return { type: 'GLOBAL_COMMAND', command: 'RESET_ACTIVE_TASK', terminal: true, normalized: c }
    }
    return { type: 'GLOBAL_COMMAND', command: 'RESET_CONVERSATION', terminal: true, normalized: c }
  }

  // RESET_ACTIVE_TASK (task only, keep chat) — 「처음부터 다시」 alone resets conversation above;
  // 「여행 다시」「작업 리셋」 style:
  if (/활성작업(초기화|리셋)|태스크(초기화|리셋)|여행(준비)?다시시작/.test(c)) {
    return { type: 'GLOBAL_COMMAND', command: 'RESET_ACTIVE_TASK', terminal: true, normalized: c }
  }

  return null
}

export function isGlobalCommandUtterance(text: string): boolean {
  return detectGlobalCommand(text) != null
}
