/**
 * Situation smart-card priority for HOME v2 (pure logic).
 */

export type SmartCardKind = 'schedule' | 'todos' | 'messages' | 'empty'

export type SmartCardItem = {
  id: string
  label: string
}

export type SmartCardModel = {
  kind: SmartCardKind
  title: string
  items: SmartCardItem[]
  /** Existing view to open on card tap */
  targetView: 'life' | 'family' | 'friends' | 'chat'
}

export type SmartCardInput = {
  nextScheduleLines: string[]
  importantTodos: string[]
  familyUnread: number
  friendsUnread: number
  familyName?: string
  friendsName?: string
}

export function buildSmartCard(input: SmartCardInput): SmartCardModel {
  if (input.nextScheduleLines.length > 0) {
    return {
      kind: 'schedule',
      title: '다음 일정',
      items: input.nextScheduleLines.slice(0, 3).map((label, i) => ({ id: `sch-${i}`, label })),
      targetView: 'life',
    }
  }
  if (input.importantTodos.length > 0) {
    return {
      kind: 'todos',
      title: '오늘 해야 할 일',
      items: input.importantTodos.slice(0, 3).map((label, i) => ({ id: `todo-${i}`, label })),
      targetView: 'life',
    }
  }
  const fam = input.familyUnread || 0
  const fr = input.friendsUnread || 0
  if (fam + fr > 0) {
    const items: SmartCardItem[] = []
    if (fam > 0) {
      items.push({
        id: 'msg-fam',
        label: `${input.familyName || '가족방'} · 새 메시지 ${fam}개`,
      })
    }
    if (fr > 0) {
      items.push({
        id: 'msg-fr',
        label: `${input.friendsName || '친구방'} · 새 메시지 ${fr}개`,
      })
    }
    return {
      kind: 'messages',
      title: '새로운 메시지',
      items: items.slice(0, 3),
      targetView: fam > 0 ? 'family' : 'friends',
    }
  }
  return {
    kind: 'empty',
    title: '여유로운 하루예요',
    items: [{ id: 'cta-brief', label: '브리핑으로 하루를 시작해 보세요 · 탭해서 생활 열기' }],
    targetView: 'life',
  }
}
