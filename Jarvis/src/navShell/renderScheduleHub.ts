/** Schedule hub — personal, family, todos, meds as filters (not separate main tabs). */

export type ScheduleHubTab = 'today' | 'schedule' | 'todos' | 'family'

function esc(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export type ScheduleHubLine = {
  id: string
  title: string
  when: string
  kind: string
  done?: boolean
}

export function renderScheduleHub(opts: {
  tab: ScheduleHubTab
  lines: ScheduleHubLine[]
  status?: string
}): string {
  const tabs: Array<[ScheduleHubTab, string]> = [
    ['today', '오늘'],
    ['schedule', '일정'],
    ['todos', '할 일'],
    ['family', '가족'],
  ]
  const body =
    opts.lines.length > 0
      ? `<ul class="nav-sched-list">
          ${opts.lines
            .map(
              (l) => `<li class="${l.done ? 'done' : ''}">
                <span class="nav-sched-when">${esc(l.when)}</span>
                <strong>${esc(l.title)}</strong>
                <span class="hint">${esc(l.kind)}</span>
              </li>`,
            )
            .join('')}
        </ul>`
      : `<p class="hint nav-home-empty">등록된 항목이 없어요. 「일정 추가」또는 대화에서 「내일 오후 3시 병원」처럼 말해 보세요.</p>`

  return `
    <section class="panel view-scroll nav-sched-hub" data-nav-schedule="1">
      <header class="nav-hub-head">
        <h1 class="section-title">일정</h1>
        <p class="hint">개인·가족 일정, 할 일, 알림, 약·접종·준비물을 한곳에서 봅니다.</p>
      </header>
      <div class="nav-hub-tabs" role="tablist">
        ${tabs
          .map(
            ([id, label]) =>
              `<button type="button" class="ghost-btn tiny ${opts.tab === id ? 'active' : ''}" data-sched-tab="${id}" role="tab" aria-selected="${opts.tab === id}">${esc(label)}</button>`,
          )
          .join('')}
      </div>
      ${opts.status ? `<p class="hint" data-sched-status>${esc(opts.status)}</p>` : ''}
      ${body}
      <div class="row-btns nav-hub-actions">
        <button type="button" class="primary-btn" data-view="chat" data-home-cmd="내일 오후 3시 일정 추가해줘">대화로 추가</button>
        <button type="button" class="ghost-btn" data-view="life">생활 상세</button>
        <button type="button" class="ghost-btn" data-view="family-helper" data-fh-open-tab="schedule">가족 일정</button>
        <button type="button" class="ghost-btn" data-view="family-helper" data-fh-open-tab="meds">약·접종</button>
        <button type="button" class="ghost-btn" data-view="family-helper" data-fh-open-tab="tasks">준비물·숙제</button>
      </div>
    </section>
  `
}
