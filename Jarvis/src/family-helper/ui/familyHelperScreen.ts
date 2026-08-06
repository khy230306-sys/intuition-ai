import {
  addFamilyHelperSchedule,
  addFamilyHelperTask,
  addGrowthRecord,
  addMedication,
  addVaccination,
  deleteFamilyHelperSchedule,
  deleteFamilyMember,
  detectScheduleConflicts,
  getEmergencyCard,
  listFamilyHelperSchedules,
  listFamilyHelperTasks,
  listFamilyMembers,
  listGrowth,
  listMedications,
  listVaccinations,
  logMedication,
  updateFamilyHelperSchedule,
  updateFamilyHelperTask,
  upsertEmergencyCard,
  upsertFamilyMember,
} from '../store'
import type { FamilyRelation, FamilyScheduleCategory } from '../types'

function esc(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export type FamilyHelperTab = 'overview' | 'members' | 'schedule' | 'tasks' | 'meds' | 'growth' | 'emergency'

export type FamilyHelperState = {
  tab: FamilyHelperTab
  filterMemberId: string
  status: string
  showHealth: boolean
  unlockEmergency: boolean
}

export function defaultFamilyHelperState(): FamilyHelperState {
  return {
    tab: 'overview',
    filterMemberId: '',
    status: '',
    showHealth: false,
    unlockEmergency: false,
  }
}

const REL_LABEL: Record<FamilyRelation, string> = {
  self: '본인',
  spouse: '배우자',
  child: '자녀',
  parent: '부모',
  sibling: '형제자매',
  grandparent: '조부모',
  other: '기타',
}

export function renderFamilyHelperScreen(st: FamilyHelperState): string {
  const members = listFamilyMembers(true)
  const schedules = listFamilyHelperSchedules({
    days: 31,
    memberId: st.filterMemberId || undefined,
    includeDone: true,
  })
  const tasks = listFamilyHelperTasks(true)
  const meds = listMedications(false)
  const vax = listVaccinations()
  const tabs: Array<[FamilyHelperTab, string]> = [
    ['overview', '요약'],
    ['members', '구성원'],
    ['schedule', '일정'],
    ['tasks', '준비물·숙제'],
    ['meds', '약·접종'],
    ['growth', '성장기록'],
    ['emergency', '긴급카드'],
  ]

  let body = ''
  if (st.tab === 'overview') {
    body = `
      <p class="hint">구성원 ${members.filter((m) => m.active).length}명 · 다가오는 일정 ${schedules.filter((s) => !s.done).length}건 · 할 일 ${tasks.filter((t) => !t.done).length}건</p>
      <ul class="fh-list">
        ${schedules
          .filter((s) => !s.done)
          .slice(0, 6)
          .map((s) => `<li><strong>${esc(s.date)}${s.time ? ' ' + esc(s.time) : ''}</strong> ${esc(s.title)}</li>`)
          .join('') || '<li class="hint">일정이 없어요. 채팅으로 「내일 하원 알림」처럼 말해 보세요.</li>'}
      </ul>
      <div class="row-btns">
        <button type="button" class="primary-btn" data-fh-tab="schedule">일정 관리</button>
        <button type="button" class="ghost-btn" data-fh-tab="members">구성원</button>
        <button type="button" class="ghost-btn" data-action="open-ai-camera">안내문 촬영</button>
      </div>
    `
  } else if (st.tab === 'members') {
    body = `
      <form id="fh-member-form" class="fh-form">
        <input name="name" required placeholder="이름/별칭" />
        <select name="relation">
          ${Object.entries(REL_LABEL)
            .map(([k, v]) => `<option value="${k}">${v}</option>`)
            .join('')}
        </select>
        <input name="birthDate" type="date" placeholder="생년월일" />
        <input name="school" placeholder="학교/기관" />
        <input name="grade" placeholder="학년/반" />
        <input name="phone" placeholder="연락처" inputmode="tel" />
        <input name="note" placeholder="메모" />
        <button class="primary-btn" type="submit">구성원 추가</button>
      </form>
      <ul class="fh-list">
        ${members
          .map(
            (m) => `<li class="fh-card" style="border-left:4px solid ${esc(m.color)}">
              <strong>${esc(m.name)}</strong> · ${esc(REL_LABEL[m.relation] || m.relation)}
              ${m.school ? `<br/><span class="hint">${esc(m.school)} ${esc(m.grade || '')}</span>` : ''}
              ${st.showHealth && m.healthNote ? `<br/><span class="hint">건강메모: ${esc(m.healthNote)}</span>` : ''}
              <div class="row-btns">
                <button type="button" class="ghost-btn tiny" data-fh-del-member="${esc(m.id)}">삭제</button>
              </div>
            </li>`,
          )
          .join('') || '<li class="hint">구성원을 추가해 주세요.</li>'}
      </ul>
      <label class="hint"><input type="checkbox" id="fh-show-health" ${st.showHealth ? 'checked' : ''}/> 건강 메모 표시 (기본 숨김)</label>
    `
  } else if (st.tab === 'schedule') {
    body = `
      <div class="row-btns">
        <select id="fh-filter-member">
          <option value="">전체 구성원</option>
          ${members.map((m) => `<option value="${esc(m.id)}" ${st.filterMemberId === m.id ? 'selected' : ''}>${esc(m.name)}</option>`).join('')}
        </select>
      </div>
      <form id="fh-sched-form" class="fh-form">
        <input name="title" required placeholder="제목 (하원, 병원…)" />
        <input name="date" type="date" required />
        <input name="time" type="time" />
        <select name="memberId">
          <option value="">구성원 선택(선택)</option>
          ${members.map((m) => `<option value="${esc(m.id)}">${esc(m.name)}</option>`).join('')}
        </select>
        <select name="category">
          ${(['pickup', 'dropoff', 'academy', 'hospital', 'vaccination', 'medication', 'homework', 'supplies', 'school_event', 'birthday', 'anniversary', 'parent', 'general'] as FamilyScheduleCategory[])
            .map((c) => `<option value="${c}">${c}</option>`)
            .join('')}
        </select>
        <input name="note" placeholder="메모" />
        <button class="primary-btn" type="submit">일정 추가</button>
      </form>
      <ul class="fh-list">
        ${schedules
          .map(
            (s) => `<li class="fh-card ${s.done ? 'done' : ''}">
              <strong>${esc(s.date)}${s.time ? ' ' + esc(s.time) : ''}</strong> ${esc(s.title)}
              <span class="hint"> · ${esc(s.category)}</span>
              <div class="row-btns">
                <button type="button" class="ghost-btn tiny" data-fh-done-sched="${esc(s.id)}" data-done="${s.done ? '0' : '1'}">${s.done ? '미완료' : '완료'}</button>
                <button type="button" class="ghost-btn tiny" data-fh-del-sched="${esc(s.id)}">삭제</button>
              </div>
            </li>`,
          )
          .join('') || '<li class="hint">일정이 없습니다.</li>'}
      </ul>
    `
  } else if (st.tab === 'tasks') {
    body = `
      <form id="fh-task-form" class="fh-form">
        <input name="title" required placeholder="준비물/숙제 제목" />
        <textarea name="body" rows="2" placeholder="내용"></textarea>
        <input name="dueDate" type="date" />
        <select name="kind"><option value="supplies">준비물</option><option value="homework">숙제</option><option value="other">기타</option></select>
        <select name="memberId">
          <option value="">구성원</option>
          ${members.map((m) => `<option value="${esc(m.id)}">${esc(m.name)}</option>`).join('')}
        </select>
        <button class="primary-btn" type="submit">추가</button>
      </form>
      <ul class="fh-list">
        ${tasks
          .map(
            (t) => `<li class="fh-card ${t.done ? 'done' : ''}">
              <strong>${esc(t.title)}</strong> <span class="hint">${esc(t.kind)}${t.dueDate ? ' · ' + esc(t.dueDate) : ''}</span>
              ${t.body ? `<p class="hint">${esc(t.body)}</p>` : ''}
              <div class="row-btns">
                <button type="button" class="ghost-btn tiny" data-fh-done-task="${esc(t.id)}" data-done="${t.done ? '0' : '1'}">${t.done ? '미완료' : '완료'}</button>
              </div>
            </li>`,
          )
          .join('') || '<li class="hint">항목이 없습니다. AI 카메라로 안내문을 촬영해 추가할 수 있어요.</li>'}
      </ul>
    `
  } else if (st.tab === 'meds') {
    body = `
      <p class="hint">복용 용량·지시를 AI가 만들지 않습니다. 처방/라벨 정보만 기록하세요.</p>
      <form id="fh-med-form" class="fh-form">
        <select name="memberId" required>
          ${members.map((m) => `<option value="${esc(m.id)}">${esc(m.name)}</option>`).join('') || '<option value="">구성원 먼저 추가</option>'}
        </select>
        <input name="name" required placeholder="약 이름(라벨)" />
        <input name="times" placeholder="복용 시각 예: 09:00,21:00" />
        <input name="startDate" type="date" required />
        <input name="note" placeholder="메모(용량 직접 입력)" />
        <button class="primary-btn" type="submit">약 일정 추가</button>
      </form>
      <ul class="fh-list">
        ${meds
          .map(
            (m) => `<li class="fh-card">
              <strong>${esc(m.name)}</strong> · ${esc(m.times.join(', '))}
              <div class="row-btns">
                <button type="button" class="ghost-btn tiny" data-fh-med-log="${esc(m.id)}" data-status="taken">복용</button>
                <button type="button" class="ghost-btn tiny" data-fh-med-log="${esc(m.id)}" data-status="skipped">건너뜀</button>
              </div>
            </li>`,
          )
          .join('') || '<li class="hint">약 일정이 없습니다.</li>'}
      </ul>
      <form id="fh-vax-form" class="fh-form">
        <strong>예방접종</strong>
        <select name="memberId" required>
          ${members.map((m) => `<option value="${esc(m.id)}">${esc(m.name)}</option>`).join('')}
        </select>
        <input name="name" required placeholder="접종명" />
        <input name="date" type="date" required />
        <input name="nextDate" type="date" placeholder="다음 예정" />
        <button class="primary-btn" type="submit">접종 일정 추가</button>
      </form>
      <ul class="fh-list">
        ${vax.map((v) => `<li>${esc(v.date)} ${esc(v.name)}${v.nextDate ? ` · 다음 ${esc(v.nextDate)}` : ''}</li>`).join('') || '<li class="hint">접종 일정 없음</li>'}
      </ul>
    `
  } else if (st.tab === 'growth') {
    const growth = listGrowth().slice(0, 20)
    body = `
      <p class="hint">단순 기록·추세용입니다. 의료 진단/성장 이상 판정은 하지 않습니다.</p>
      <form id="fh-growth-form" class="fh-form">
        <select name="memberId" required>
          ${members.map((m) => `<option value="${esc(m.id)}">${esc(m.name)}</option>`).join('')}
        </select>
        <input name="heightCm" type="number" step="0.1" placeholder="키(cm)" />
        <input name="weightKg" type="number" step="0.1" placeholder="몸무게(kg)" />
        <input name="sleepHours" type="number" step="0.1" placeholder="수면(시간)" />
        <input name="mealNote" placeholder="식사 메모" />
        <input name="lifeNote" placeholder="생활 메모" />
        <input name="specialDay" placeholder="특별한 날" />
        <button class="primary-btn" type="submit">기록 추가</button>
      </form>
      <ul class="fh-list">
        ${growth
          .map(
            (g) =>
              `<li class="hint">${new Date(g.recordedAt).toLocaleDateString('ko-KR')} · ${g.heightCm != null ? g.heightCm + 'cm ' : ''}${g.weightKg != null ? g.weightKg + 'kg ' : ''}${esc(g.lifeNote || g.mealNote || '')}</li>`,
          )
          .join('') || '<li class="hint">기록이 없습니다.</li>'}
      </ul>
    `
  } else {
    const m = members[0]
    const card = m ? getEmergencyCard(m.id) : null
    body = `
      <p class="hint">긴급 정보 카드는 별도 잠금으로 보호할 수 있습니다. 위치 추적·감시 기능은 없습니다.</p>
      ${
        !st.unlockEmergency
          ? `<button type="button" class="primary-btn" data-fh-action="unlock-emergency">잠금 해제 후 보기</button>`
          : `<form id="fh-emerg-form" class="fh-form">
              <select name="memberId">${members.map((x) => `<option value="${esc(x.id)}">${esc(x.name)}</option>`).join('')}</select>
              <input name="guardianPhone" placeholder="보호자 연락처" value="${esc(card?.guardianPhone || '')}" />
              <input name="emergencyPhone" placeholder="긴급 연락처" value="${esc(card?.emergencyPhone || '')}" />
              <input name="allergyNote" placeholder="알레르기 메모" value="${esc(card?.allergyNote || '')}" />
              <input name="cautionNote" placeholder="전달할 주의사항" value="${esc(card?.cautionNote || '')}" />
              <label><input type="checkbox" name="locked" ${card?.locked !== false ? 'checked' : ''}/> 다시 잠금</label>
              <button class="primary-btn" type="submit">저장</button>
            </form>`
      }
    `
  }

  return `
    <section class="panel fh-panel" data-family-helper="1">
      <header class="navv2-head">
        <button type="button" class="ghost-btn tiny" data-action="fh-back">뒤로</button>
        <strong>가족 도우미</strong>
        <button type="button" class="ghost-btn tiny" data-view="family">가족 공간</button>
      </header>
      <p class="hint">로컬 우선 저장 · 기존 가족 채팅 공간과 별도로 구성원·일정·준비물을 관리합니다.</p>
      <div class="fh-tabs" role="tablist">
        ${tabs
          .map(
            ([id, label]) =>
              `<button type="button" class="ghost-btn tiny ${st.tab === id ? 'active' : ''}" data-fh-tab="${id}">${label}</button>`,
          )
          .join('')}
      </div>
      ${st.status ? `<p class="hint" data-fh-status>${esc(st.status)}</p>` : ''}
      <div class="fh-body">${body}</div>
    </section>
  `
}

export function bindFamilyHelperScreen(
  root: HTMLElement,
  _st: FamilyHelperState,
  redraw: (next: Partial<FamilyHelperState>) => void,
  opts?: { onBack?: () => void },
): void {
  root.querySelector('[data-action="fh-back"]')?.addEventListener('click', () => opts?.onBack?.())
  root.querySelectorAll<HTMLButtonElement>('[data-fh-tab]').forEach((btn) => {
    btn.addEventListener('click', () => redraw({ tab: btn.dataset.fhTab as FamilyHelperTab, status: '' }))
  })

  root.querySelector('#fh-filter-member')?.addEventListener('change', (e) => {
    redraw({ filterMemberId: (e.target as HTMLSelectElement).value })
  })
  root.querySelector('#fh-show-health')?.addEventListener('change', (e) => {
    redraw({ showHealth: (e.target as HTMLInputElement).checked })
  })

  root.querySelector('#fh-member-form')?.addEventListener('submit', (e) => {
    e.preventDefault()
    const fd = new FormData(e.target as HTMLFormElement)
    upsertFamilyMember({
      name: String(fd.get('name') || ''),
      relation: String(fd.get('relation') || 'other') as FamilyRelation,
      birthDate: String(fd.get('birthDate') || '') || undefined,
      school: String(fd.get('school') || '') || undefined,
      grade: String(fd.get('grade') || '') || undefined,
      phone: String(fd.get('phone') || '') || undefined,
      note: String(fd.get('note') || '') || undefined,
    })
    redraw({ status: '구성원을 저장했어요.', tab: 'members' })
  })

  root.querySelectorAll<HTMLButtonElement>('[data-fh-del-member]').forEach((btn) => {
    btn.addEventListener('click', () => {
      deleteFamilyMember(btn.dataset.fhDelMember || '')
      redraw({ status: '구성원을 삭제했어요.' })
    })
  })

  root.querySelector('#fh-sched-form')?.addEventListener('submit', (e) => {
    e.preventDefault()
    const fd = new FormData(e.target as HTMLFormElement)
    const title = String(fd.get('title') || '')
    const date = String(fd.get('date') || '')
    const conflicts = detectScheduleConflicts(date, title)
    addFamilyHelperSchedule({
      title,
      date,
      time: String(fd.get('time') || '') || undefined,
      memberId: String(fd.get('memberId') || '') || undefined,
      category: String(fd.get('category') || 'general') as FamilyScheduleCategory,
      note: String(fd.get('note') || '') || undefined,
      notifyMinutesBefore: 30,
    })
    redraw({
      status: conflicts.length ? `저장했어요. 주의: ${conflicts.join(' / ')}` : '일정을 추가했어요.',
      tab: 'schedule',
    })
  })

  root.querySelectorAll<HTMLButtonElement>('[data-fh-done-sched]').forEach((btn) => {
    btn.addEventListener('click', () => {
      updateFamilyHelperSchedule(btn.dataset.fhDoneSched || '', { done: btn.dataset.done === '1' })
      redraw({ status: '일정을 업데이트했어요.' })
    })
  })
  root.querySelectorAll<HTMLButtonElement>('[data-fh-del-sched]').forEach((btn) => {
    btn.addEventListener('click', () => {
      deleteFamilyHelperSchedule(btn.dataset.fhDelSched || '')
      redraw({ status: '일정을 삭제했어요.' })
    })
  })

  root.querySelector('#fh-task-form')?.addEventListener('submit', (e) => {
    e.preventDefault()
    const fd = new FormData(e.target as HTMLFormElement)
    addFamilyHelperTask({
      title: String(fd.get('title') || ''),
      body: String(fd.get('body') || ''),
      dueDate: String(fd.get('dueDate') || '') || undefined,
      kind: String(fd.get('kind') || 'supplies') as 'supplies' | 'homework' | 'other',
      memberId: String(fd.get('memberId') || '') || undefined,
    })
    redraw({ status: '준비물/숙제를 추가했어요.', tab: 'tasks' })
  })
  root.querySelectorAll<HTMLButtonElement>('[data-fh-done-task]').forEach((btn) => {
    btn.addEventListener('click', () => {
      updateFamilyHelperTask(btn.dataset.fhDoneTask || '', { done: btn.dataset.done === '1' })
      redraw({ status: '항목을 업데이트했어요.' })
    })
  })

  root.querySelector('#fh-med-form')?.addEventListener('submit', (e) => {
    e.preventDefault()
    const fd = new FormData(e.target as HTMLFormElement)
    const memberId = String(fd.get('memberId') || '')
    if (!memberId) {
      redraw({ status: '구성원을 먼저 추가해 주세요.' })
      return
    }
    const times = String(fd.get('times') || '09:00')
      .split(/[,，\s]+/)
      .filter(Boolean)
    addMedication({
      memberId,
      name: String(fd.get('name') || ''),
      times,
      startDate: String(fd.get('startDate') || ''),
      note: String(fd.get('note') || '') || undefined,
    })
    redraw({ status: '약 일정을 추가했어요.', tab: 'meds' })
  })
  root.querySelectorAll<HTMLButtonElement>('[data-fh-med-log]').forEach((btn) => {
    btn.addEventListener('click', () => {
      logMedication(btn.dataset.fhMedLog || '', (btn.dataset.status as 'taken' | 'skipped') || 'taken')
      redraw({ status: '복용 기록을 남겼어요.' })
    })
  })
  root.querySelector('#fh-vax-form')?.addEventListener('submit', (e) => {
    e.preventDefault()
    const fd = new FormData(e.target as HTMLFormElement)
    addVaccination({
      memberId: String(fd.get('memberId') || ''),
      name: String(fd.get('name') || ''),
      date: String(fd.get('date') || ''),
      nextDate: String(fd.get('nextDate') || '') || undefined,
    })
    redraw({ status: '예방접종 일정을 추가했어요.', tab: 'meds' })
  })

  root.querySelector('#fh-growth-form')?.addEventListener('submit', (e) => {
    e.preventDefault()
    const fd = new FormData(e.target as HTMLFormElement)
    addGrowthRecord({
      memberId: String(fd.get('memberId') || ''),
      heightCm: fd.get('heightCm') ? Number(fd.get('heightCm')) : undefined,
      weightKg: fd.get('weightKg') ? Number(fd.get('weightKg')) : undefined,
      sleepHours: fd.get('sleepHours') ? Number(fd.get('sleepHours')) : undefined,
      mealNote: String(fd.get('mealNote') || '') || undefined,
      lifeNote: String(fd.get('lifeNote') || '') || undefined,
      specialDay: String(fd.get('specialDay') || '') || undefined,
    })
    redraw({ status: '성장/생활 기록을 저장했어요.', tab: 'growth' })
  })

  root.querySelector('[data-fh-action="unlock-emergency"]')?.addEventListener('click', () => {
    redraw({ unlockEmergency: true, status: '긴급 카드를 표시합니다. 사용 후 다시 잠가 주세요.' })
  })
  root.querySelector('#fh-emerg-form')?.addEventListener('submit', (e) => {
    e.preventDefault()
    const fd = new FormData(e.target as HTMLFormElement)
    const memberId = String(fd.get('memberId') || '')
    upsertEmergencyCard({
      memberId,
      guardianPhone: String(fd.get('guardianPhone') || '') || undefined,
      emergencyPhone: String(fd.get('emergencyPhone') || '') || undefined,
      allergyNote: String(fd.get('allergyNote') || '') || undefined,
      cautionNote: String(fd.get('cautionNote') || '') || undefined,
      locked: fd.get('locked') === 'on',
      updatedAt: Date.now(),
    })
    redraw({
      status: '긴급 카드를 저장했어요.',
      unlockEmergency: fd.get('locked') !== 'on',
    })
  })
}
