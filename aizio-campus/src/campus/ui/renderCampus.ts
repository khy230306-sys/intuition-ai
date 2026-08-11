import { upcomingAssignments } from '../assignments'
import { listCourses } from '../courses'
import { upcomingExams } from '../exams'
import { focusStats } from '../focus'
import { computeGpa } from '../gpa'
import { buildCampusHome } from '../home'
import { conceptStats } from '../quiz'
import { buildSmartReview } from '../review'
import { searchCampus } from '../search'
import { loadCampusStore } from '../storage'
import { findConflicts, weekSessions } from '../timetable'
import { WEEKDAY_FULL_KO, WEEKDAY_KO } from '../types'
import { getRecorderState } from '../media/recorder'
import { campusUi } from './state'

function esc(s: string): string {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function bar(rate: number): string {
  const n = Math.max(0, Math.min(100, rate))
  const filled = Math.round(n / 20)
  return '█'.repeat(filled) + '░'.repeat(5 - filled)
}

function nav(): string {
  const items: Array<{ id: typeof campusUi.tab; label: string }> = [
    { id: 'today', label: '오늘' },
    { id: 'timetable', label: '시간표' },
    { id: 'study', label: '공부' },
    { id: 'courses', label: '과목' },
    { id: 'more', label: '더보기' },
  ]
  return `
    <nav class="campus-nav" data-campus-nav="1">
      ${items
        .map(
          (i) => `
        <button type="button" data-campus-tab="${i.id}" class="${campusUi.tab === i.id ? 'active' : ''}">
          <span>${esc(i.label)}</span>
        </button>`,
        )
        .join('')}
    </nav>`
}

function renderToday(): string {
  const home = buildCampusHome()
  if (home.empty) {
    return `
      <section class="campus-panel">
        <h2>${esc(home.greeting)}</h2>
        <p class="campus-date">${esc(home.dateLine)}</p>
        <div class="campus-empty">
          <p>첫 과목을 등록해보세요.</p>
          <button type="button" class="primary-btn" data-campus-action="goto-timetable">시간표 만들기</button>
          <p class="hint">대화창 예: 「월요일 10시부터 11시 반까지 자료구조 수업 넣어줘」</p>
        </div>
      </section>`
  }
  return `
    <section class="campus-panel">
      <h2>${esc(home.greeting)}</h2>
      <p class="campus-date">${esc(home.dateLine)}</p>
      <h3>오늘 수업</h3>
      ${
        home.classes.length
          ? `<ul class="campus-list">${home.classes
              .map(
                (c) =>
                  `<li><button type="button" data-campus-action="open-course" data-course-id="${esc(c.courseId)}"><strong>${esc(c.time)}</strong> ${esc(c.name)}${c.room ? ` · ${esc(c.room)}` : ''}</button></li>`,
              )
              .join('')}</ul>`
          : '<p class="hint">오늘 등록된 수업이 없습니다.</p>'
      }
      <h3>오늘 할 일</h3>
      ${
        home.todos.length
          ? `<ul class="campus-list">${home.todos.map((t) => `<li>${esc(t.label)}</li>`).join('')}</ul>`
          : '<p class="hint">할 일이 없습니다.</p>'
      }
      <h3>다가오는 일정</h3>
      ${
        home.upcoming.length
          ? `<ul class="campus-list">${home.upcoming
              .map((u) => `<li>${esc(u.label)}${u.dDay === null ? '' : ` D-${u.dDay}`}</li>`)
              .join('')}</ul>`
          : '<p class="hint">다가오는 시험이 없습니다.</p>'
      }
      ${home.aiCard ? `<div class="campus-ai-card">${esc(home.aiCard)}</div>` : ''}
    </section>`
}

function renderTimetable(): string {
  const store = loadCampusStore()
  const rows = weekSessions()
  const conflicts = findConflicts(store.sessions, store.courses)
  const byDay = [1, 2, 3, 4, 5, 6, 0].map((wd) => ({
    wd,
    items: rows.filter((r) => r.session.weekday === wd),
  }))
  return `
    <section class="campus-panel">
      <div class="campus-row">
        <h2>시간표</h2>
        <button type="button" class="primary-btn tiny" data-campus-action="add-session">추가</button>
      </div>
      ${
        conflicts.length
          ? `<p class="campus-warn">시간 충돌 ${conflicts.length}건 — ${conflicts
              .map((c) => `${esc(c.courseA)}↔${esc(c.courseB)}`)
              .join(', ')}</p>`
          : ''
      }
      ${
        !rows.length
          ? `<div class="campus-empty"><p>등록된 수업이 없습니다.</p>
             <p class="hint">예: 월요일 10:00–11:30 자료구조</p></div>`
          : byDay
              .filter((d) => d.items.length)
              .map(
                (d) => `
            <h3>${WEEKDAY_FULL_KO[d.wd]}</h3>
            <ul class="campus-list">
              ${d.items
                .map(
                  (r) => `
                <li class="campus-session" style="border-left:4px solid ${esc(r.course!.color)}">
                  <div><strong>${esc(r.session.startTime)}–${esc(r.session.endTime)}</strong> ${esc(r.course!.name)}</div>
                  <div class="hint">${esc(r.session.room || r.course!.room || '')} ${esc(r.course!.professor || '')}</div>
                  <div class="campus-inline">
                    <button type="button" class="ghost-btn tiny" data-campus-action="edit-session" data-session-id="${esc(r.session.id)}">수정</button>
                    <button type="button" class="ghost-btn tiny" data-campus-action="delete-session" data-session-id="${esc(r.session.id)}">삭제</button>
                  </div>
                </li>`,
                )
                .join('')}
            </ul>`,
              )
              .join('')
      }
      <form class="campus-form" data-campus-form="session" hidden>
        <h3>수업 추가/수정</h3>
        <input type="hidden" name="sessionId" value="" />
        <label>과목명 <input name="name" required maxlength="80" placeholder="자료구조" /></label>
        <label>교수 <input name="professor" maxlength="60" /></label>
        <label>요일
          <select name="weekday" required>
            ${[1, 2, 3, 4, 5, 6, 0]
              .map((d) => `<option value="${d}">${WEEKDAY_KO[d]}</option>`)
              .join('')}
          </select>
        </label>
        <label>시작 <input name="startTime" type="time" required value="10:00" /></label>
        <label>종료 <input name="endTime" type="time" required value="11:30" /></label>
        <label>강의실 <input name="room" maxlength="40" /></label>
        <label>학점 <input name="credits" type="number" min="0" max="6" step="0.5" value="3" /></label>
        <div class="campus-inline">
          <button type="submit" class="primary-btn">저장</button>
          <button type="button" class="ghost-btn" data-campus-action="cancel-session-form">취소</button>
        </div>
      </form>
    </section>`
}

function renderCourseWorkspace(courseId: string): string {
  const store = loadCampusStore()
  const course = store.courses.find((c) => c.id === courseId)
  if (!course) return `<section class="campus-panel"><p>과목을 찾을 수 없습니다.</p></section>`
  const materials = store.materials.filter((m) => m.courseId === courseId)
  const notes = store.notes.filter((n) => n.courseId === courseId)
  const recordings = store.recordings.filter((r) => r.courseId === courseId)
  const asg = store.assignments.filter((a) => a.courseId === courseId)
  const exams = store.exams.filter((e) => e.courseId === courseId)
  const recState = getRecorderState()
  const stats = conceptStats(courseId)
  return `
    <section class="campus-panel">
      <button type="button" class="ghost-btn tiny" data-campus-action="courses-list">← 과목 목록</button>
      <h2>${esc(course.name)}</h2>
      <p class="hint">${esc(course.professor || '')} · ${esc(course.room || '')} · ${course.credits}학점</p>

      <h3>강의자료</h3>
      <p class="hint">지원: PDF, TXT, Markdown, DOCX</p>
      <input type="file" accept=".pdf,.txt,.md,.markdown,.docx,application/pdf,text/plain,text/markdown,application/vnd.openxmlformats-officedocument.wordprocessingml.document" data-campus-file="${esc(courseId)}" />
      <ul class="campus-list">
        ${
          materials.length
            ? materials
                .map(
                  (m) => `<li>
              <strong>${esc(m.name)}</strong>
              <span class="hint"> · ${esc(m.kind)} · 추출 ${esc(m.extractStatus)}</span>
              ${
                m.extractStatus === 'ready'
                  ? `<button type="button" class="ghost-btn tiny" data-campus-action="analyze-material" data-material-id="${esc(m.id)}">AI 분석</button>
                     <button type="button" class="ghost-btn tiny" data-campus-action="extract-deadlines" data-material-id="${esc(m.id)}">과제/시험 추출</button>`
                  : ''
              }
              <button type="button" class="ghost-btn tiny" data-campus-action="delete-material" data-material-id="${esc(m.id)}">삭제</button>
              ${m.analysisStatus === 'done' && m.analysisJson ? `<pre class="campus-pre">${esc(m.analysisJson.slice(0, 1200))}</pre>` : ''}
            </li>`,
                )
                .join('')
            : '<li class="hint">자료 없음</li>'
        }
      </ul>

      <h3>녹음</h3>
      <p class="campus-warn">녹음 전: 학교/교수/지역 규칙을 확인하세요. 앱이 녹음 권한을 대신 판단하지 않습니다.</p>
      ${
        recState.active && recState.courseId === courseId
          ? `<div class="campus-rec">
              <strong>녹음 중</strong> ${Math.floor(recState.elapsedMs / 60000)}:${String(
                Math.floor((recState.elapsedMs / 1000) % 60),
              ).padStart(2, '0')}
              ${recState.paused ? '(일시정지)' : ''}
              <div class="campus-inline">
                <button type="button" class="ghost-btn tiny" data-campus-action="rec-pause">일시정지</button>
                <button type="button" class="ghost-btn tiny" data-campus-action="rec-resume">재개</button>
                <button type="button" class="primary-btn tiny" data-campus-action="rec-stop">종료</button>
              </div>
              <div class="campus-inline">
                <button type="button" class="ghost-btn tiny" data-campus-action="rec-mark" data-mark="important">중요</button>
                <button type="button" class="ghost-btn tiny" data-campus-action="rec-mark" data-mark="exam">시험</button>
                <button type="button" class="ghost-btn tiny" data-campus-action="rec-mark" data-mark="question">질문</button>
                <button type="button" class="ghost-btn tiny" data-campus-action="rec-mark" data-mark="confused">이해 안 됨</button>
              </div>
            </div>`
          : `<button type="button" class="primary-btn" data-campus-action="rec-start" data-course-id="${esc(courseId)}">강의 녹음 시작</button>`
      }
      <ul class="campus-list">
        ${recordings
          .map((r) => {
            const tr = store.transcripts.find((t) => t.recordingId === r.id)
            return `<li>
              ${esc(r.title)} · ${Math.round(r.durationMs / 60000)}분 · 마커 ${r.markers.length}
              <button type="button" class="ghost-btn tiny" data-campus-action="transcribe" data-recording-id="${esc(r.id)}">Transcript</button>
              ${
                tr?.status === 'ready'
                  ? `<button type="button" class="ghost-btn tiny" data-campus-action="summarize-lecture" data-transcript-id="${esc(tr.id)}">AI 정리</button>`
                  : tr?.status === 'processing'
                    ? '<span class="hint">음성을 텍스트로 변환 중…</span>'
                    : tr?.status === 'failed'
                      ? `<span class="campus-warn">${esc(tr.error)}</span>`
                      : ''
              }
              <button type="button" class="ghost-btn tiny" data-campus-action="delete-recording" data-recording-id="${esc(r.id)}">삭제</button>
            </li>`
          })
          .join('') || '<li class="hint">녹음 없음</li>'}
      </ul>

      <h3>AI 요약 / 노트</h3>
      <ul class="campus-list">
        ${
          notes
            .map(
              (n) => `<li><strong>${esc(n.title)}</strong><div class="hint">${esc(n.threeLine)}</div>
              <pre class="campus-pre">${esc(n.fullSummary.slice(0, 800))}</pre></li>`,
            )
            .join('') || '<li class="hint">요약 없음</li>'
        }
      </ul>

      <h3>과제</h3>
      <button type="button" class="ghost-btn tiny" data-campus-action="add-assignment" data-course-id="${esc(courseId)}">과제 추가</button>
      <ul class="campus-list">
        ${
          asg
            .map(
              (a) => `<li>${esc(a.title)} · ${esc(a.status)}${a.dueAt ? ` · ${esc(a.dueAt.slice(0, 10))}` : ''}
              <button type="button" class="ghost-btn tiny" data-campus-action="asg-status" data-id="${esc(a.id)}" data-status="DONE">완료</button>
              <button type="button" class="ghost-btn tiny" data-campus-action="delete-assignment" data-id="${esc(a.id)}">삭제</button></li>`,
            )
            .join('') || '<li class="hint">과제 없음</li>'
        }
      </ul>

      <h3>시험</h3>
      <button type="button" class="ghost-btn tiny" data-campus-action="add-exam" data-course-id="${esc(courseId)}">시험 추가</button>
      <ul class="campus-list">
        ${
          exams
            .map(
              (e) => `<li>${esc(e.name)}${e.at ? ` · ${esc(e.at.slice(0, 16).replace('T', ' '))}` : ''}
              <button type="button" class="ghost-btn tiny" data-campus-action="delete-exam" data-id="${esc(e.id)}">삭제</button></li>`,
            )
            .join('') || '<li class="hint">시험 없음</li>'
        }
      </ul>

      <h3>문제은행 / 약점</h3>
      <button type="button" class="primary-btn tiny" data-campus-action="gen-quiz" data-course-id="${esc(courseId)}" data-count="10">Quiz 10문제</button>
      <button type="button" class="ghost-btn tiny" data-campus-action="gen-quiz-wrong" data-course-id="${esc(courseId)}">틀린 것만</button>
      <ul class="campus-list">
        ${
          stats
            .map((s) => `<li>${esc(s.concept)} ${bar(s.rate)} ${s.rate}% (${s.correct}/${s.total})</li>`)
            .join('') || '<li class="hint">Quiz 기록이 없습니다.</li>'
        }
      </ul>

      ${
        store.candidates.filter((c) => c.courseId === courseId && !c.accepted).length
          ? `<h3>AI 추출 후보 (확인 후 추가)</h3>
             <ul class="campus-list">${store.candidates
               .filter((c) => c.courseId === courseId && !c.accepted)
               .map(
                 (c) => `<li>${esc(c.kind)} · ${esc(c.title)} · ${esc(c.dueHint)} · ${esc(c.confidence)}
                   <button type="button" class="primary-btn tiny" data-campus-action="accept-candidate" data-id="${esc(c.id)}">일정에 추가</button>
                 </li>`,
               )
               .join('')}</ul>`
          : ''
      }
    </section>`
}

function renderCourses(): string {
  if (campusUi.courseId) return renderCourseWorkspace(campusUi.courseId)
  const courses = listCourses()
  return `
    <section class="campus-panel">
      <div class="campus-row">
        <h2>과목</h2>
        <button type="button" class="primary-btn tiny" data-campus-action="goto-timetable">과목 추가</button>
      </div>
      ${
        courses.length
          ? `<ul class="campus-list">${courses
              .map(
                (c) => `<li><button type="button" data-campus-action="open-course" data-course-id="${esc(c.id)}">
                  <span class="campus-dot" style="background:${esc(c.color)}"></span>
                  <strong>${esc(c.name)}</strong>
                  <span class="hint"> · ${esc(c.professor || '')}</span>
                </button></li>`,
              )
              .join('')}</ul>`
          : `<div class="campus-empty"><p>등록된 과목이 없습니다.</p>
             <button type="button" class="primary-btn" data-campus-action="goto-timetable">시간표 만들기</button></div>`
      }
    </section>`
}

function renderStudy(): string {
  const store = loadCampusStore()
  const review = buildSmartReview(5)
  const stats = focusStats()
  const quiz = campusUi.quizId ? store.quizzes.find((q) => q.id === campusUi.quizId) : null
  const question =
    quiz && store.questions.find((q) => q.id === quiz.questionIds[campusUi.quizIndex])

  let quizHtml = ''
  if (quiz && question) {
    quizHtml = `
      <div class="campus-quiz">
        <h3>${esc(quiz.title)} (${campusUi.quizIndex + 1}/${quiz.questionIds.length})</h3>
        <p>${esc(question.prompt)}</p>
        ${
          question.type === 'mcq'
            ? question.choices
                .map(
                  (c, i) =>
                    `<label class="campus-choice"><input type="radio" name="quizAns" value="${esc(c)}" /> ${esc(String.fromCharCode(65 + i))}. ${esc(c)}</label>`,
                )
                .join('')
            : question.type === 'ox'
              ? `<label class="campus-choice"><input type="radio" name="quizAns" value="O" /> O</label>
                 <label class="campus-choice"><input type="radio" name="quizAns" value="X" /> X</label>`
              : `<input name="quizAnsText" placeholder="답변" />`
        }
        <button type="button" class="primary-btn" data-campus-action="quiz-submit" data-question-id="${esc(question.id)}">제출</button>
      </div>`
  } else if (campusUi.quizId && quiz && !question) {
    quizHtml = `<p>퀴즈를 완료했습니다.</p><button type="button" class="ghost-btn" data-campus-action="quiz-close">닫기</button>`
  }

  const mm = Math.floor(campusUi.focusRemaining / 60)
  const ss = campusUi.focusRemaining % 60

  return `
    <section class="campus-panel">
      <h2>공부</h2>
      <h3>오늘 추천</h3>
      ${
        review.length
          ? `<ol class="campus-list">${review
              .map(
                (r) =>
                  `<li>${esc(r.courseName)} · ${esc(r.title)} · ${r.minutes}분<div class="hint">${esc(r.reasons.join(' · '))}</div></li>`,
              )
              .join('')}</ol>`
          : '<p class="hint">추천을 만들 데이터가 없습니다.</p>'
      }

      <h3>Focus Timer</h3>
      <div class="campus-focus">
        <div class="campus-focus-time">${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}</div>
        <div class="campus-inline">
          <button type="button" class="ghost-btn tiny" data-campus-action="focus-set" data-min="25">25분</button>
          <button type="button" class="ghost-btn tiny" data-campus-action="focus-set" data-min="50">50분</button>
          <button type="button" class="ghost-btn tiny" data-campus-action="focus-set" data-min="custom">설정</button>
        </div>
        <label>과목
          <select data-campus-focus-course>
            <option value="">선택</option>
            ${listCourses()
              .map(
                (c) =>
                  `<option value="${esc(c.id)}" ${campusUi.focusCourseId === c.id ? 'selected' : ''}>${esc(c.name)}</option>`,
              )
              .join('')}
          </select>
        </label>
        ${
          campusUi.focusRunning
            ? `<button type="button" class="ghost-btn" data-campus-action="focus-stop">중단</button>`
            : `<button type="button" class="primary-btn" data-campus-action="focus-start">시작</button>`
        }
        <p class="hint">오늘 ${stats.today}분 · 이번 주 ${stats.week}분</p>
      </div>

      <h3>Quiz</h3>
      ${quizHtml || '<p class="hint">과목 Workspace에서 문제를 생성하세요.</p>'}

      <h3>공부 계획</h3>
      <ul class="campus-list">
        ${
          store.studyPlans
            .slice(0, 3)
            .map((p) => {
              const done = p.blocks.filter((b) => b.status === 'done').length
              return `<li><strong>${esc(p.title)}</strong> · ${done}/${p.blocks.length}
                <ul>${p.blocks
                  .slice(0, 6)
                  .map(
                    (b) =>
                      `<li>${esc(b.title)} (${b.minutes}분)
                        <button type="button" class="ghost-btn tiny" data-campus-action="plan-status" data-plan="${esc(p.id)}" data-block="${esc(b.id)}" data-status="done">완료</button>
                        <button type="button" class="ghost-btn tiny" data-campus-action="plan-status" data-plan="${esc(p.id)}" data-block="${esc(b.id)}" data-status="deferred">연기</button>
                      </li>`,
                  )
                  .join('')}</ul></li>`
            })
            .join('') || '<li class="hint">계획 없음 · 대화로 「자료구조 시험까지 10일 계획 짜줘」</li>'
        }
      </ul>
    </section>`
}

function renderMore(): string {
  const store = loadCampusStore()
  const gpa = computeGpa(store.courses, store.profile.gradeScale)
  if (campusUi.morePane === 'search') {
    const hits = searchCampus(campusUi.searchQ)
    return `
      <section class="campus-panel">
        <button type="button" class="ghost-btn tiny" data-campus-action="more-menu">← 더보기</button>
        <h2>검색</h2>
        <form data-campus-form="search" class="campus-form">
          <input name="q" value="${esc(campusUi.searchQ)}" placeholder="Tree, 과제…" />
          <button class="primary-btn" type="submit">검색</button>
        </form>
        <ul class="campus-list">
          ${
            hits.map((h) => `<li>[${esc(h.kind)}] ${esc(h.title)} <span class="hint">${esc(h.subtitle)}</span></li>`).join('') ||
            '<li class="hint">결과 없음</li>'
          }
        </ul>
      </section>`
  }
  if (campusUi.morePane === 'gpa') {
    return `
      <section class="campus-panel">
        <button type="button" class="ghost-btn tiny" data-campus-action="more-menu">← 더보기</button>
        <h2>학점</h2>
        <p>기준 ${esc(store.profile.gradeScale)} · GPA ${gpa.gpa ?? '—'} · 이수학점 ${gpa.earnedCredits}</p>
        <form data-campus-form="gpa-scale" class="campus-form">
          <label>학점 기준
            <select name="scale">
              <option value="4.5" ${store.profile.gradeScale === '4.5' ? 'selected' : ''}>4.5</option>
              <option value="4.3" ${store.profile.gradeScale === '4.3' ? 'selected' : ''}>4.3</option>
              <option value="4.0" ${store.profile.gradeScale === '4.0' ? 'selected' : ''}>4.0</option>
            </select>
          </label>
          <button class="primary-btn" type="submit">저장</button>
        </form>
        <ul class="campus-list">
          ${store.courses
            .map(
              (c) => `<li>
              <form data-campus-form="course-grade" data-course-id="${esc(c.id)}" class="campus-inline">
                <strong>${esc(c.name)}</strong>
                <input name="credits" type="number" step="0.5" min="0" value="${c.credits}" style="width:4rem" />학점
                <select name="grade">
                  ${['', 'A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'F', 'P', 'NP']
                    .map(
                      (g) =>
                        `<option value="${g}" ${c.grade === g ? 'selected' : ''}>${g || '-'}</option>`,
                    )
                    .join('')}
                </select>
                <button class="ghost-btn tiny" type="submit">저장</button>
              </form>
            </li>`,
            )
            .join('') || '<li class="hint">과목 없음</li>'}
        </ul>
        <h3>졸업요건 (직접 설정)</h3>
        <form data-campus-form="grad" class="campus-form">
          <label>졸업 필요학점 <input name="graduationCredits" type="number" value="${store.profile.graduationCredits ?? ''}" /></label>
          <label>전공 필요학점 <input name="majorCredits" type="number" value="${store.profile.majorCredits ?? ''}" /></label>
          <label>교양 필요학점 <input name="generalCredits" type="number" value="${store.profile.generalCredits ?? ''}" /></label>
          <button class="primary-btn" type="submit">저장</button>
        </form>
      </section>`
  }
  if (campusUi.morePane === 'projects') {
    return `
      <section class="campus-panel">
        <button type="button" class="ghost-btn tiny" data-campus-action="more-menu">← 더보기</button>
        <h2>팀플</h2>
        <p class="hint">외부 메시지 전송은 연동되지 않습니다. 로컬 Kanban만 제공합니다.</p>
        <button type="button" class="primary-btn tiny" data-campus-action="add-project">프로젝트 추가</button>
        <ul class="campus-list">
          ${
            store.projects
              .map(
                (p) => `<li>
                <strong>${esc(p.name)}</strong>
                <div class="hint">팀원: ${esc(p.members.join(', ') || '—')}</div>
                <div class="campus-kanban">
                  ${(['TODO', 'DOING', 'DONE'] as const)
                    .map(
                      (st) => `<div><h4>${st}</h4>${p.tasks
                        .filter((t) => t.status === st)
                        .map(
                          (t) =>
                            `<div>${esc(t.title)} <button type="button" class="ghost-btn tiny" data-campus-action="task-next" data-project="${esc(p.id)}" data-task="${esc(t.id)}" data-status="${st}">→</button></div>`,
                        )
                        .join('')}</div>`,
                    )
                    .join('')}
                </div>
                <button type="button" class="ghost-btn tiny" data-campus-action="add-task" data-project="${esc(p.id)}">Task 추가</button>
              </li>`,
              )
              .join('') || '<li class="hint">프로젝트 없음</li>'
          }
        </ul>
      </section>`
  }
  if (campusUi.morePane === 'settings') {
    const p = store.profile
    return `
      <section class="campus-panel">
        <button type="button" class="ghost-btn tiny" data-campus-action="more-menu">← 더보기</button>
        <h2>Campus 설정</h2>
        <form data-campus-form="onboard" class="campus-form">
          <label>학교명(선택) <input name="schoolName" value="${esc(p.schoolName)}" /></label>
          <label>학점 기준
            <select name="gradeScale">
              <option value="4.5" ${p.gradeScale === '4.5' ? 'selected' : ''}>4.5</option>
              <option value="4.3" ${p.gradeScale === '4.3' ? 'selected' : ''}>4.3</option>
              <option value="4.0" ${p.gradeScale === '4.0' ? 'selected' : ''}>4.0</option>
            </select>
          </label>
          <button class="primary-btn" type="submit">저장</button>
        </form>
        <h3>알림</h3>
        <form data-campus-form="notify" class="campus-form">
          <label><input type="checkbox" name="notifyAssignmentD3" ${p.notifyAssignmentD3 ? 'checked' : ''}/> 과제 D-3</label>
          <label><input type="checkbox" name="notifyAssignmentD1" ${p.notifyAssignmentD1 ? 'checked' : ''}/> 과제 D-1</label>
          <label><input type="checkbox" name="notifyExamD7" ${p.notifyExamD7 ? 'checked' : ''}/> 시험 D-7</label>
          <label><input type="checkbox" name="notifyExamD1" ${p.notifyExamD1 ? 'checked' : ''}/> 시험 D-1</label>
          <label><input type="checkbox" name="notifyClassStart" ${p.notifyClassStart ? 'checked' : ''}/> 수업 시작(10분 전)</label>
          <button class="primary-btn" type="submit">알림 설정 저장</button>
        </form>
      </section>`
  }

  return `
    <section class="campus-panel">
      <h2>더보기</h2>
      <ul class="campus-list campus-menu">
        <li><button type="button" data-campus-action="more-search">검색</button></li>
        <li><button type="button" data-campus-action="more-gpa">학점 / 졸업요건</button></li>
        <li><button type="button" data-campus-action="more-projects">팀플</button></li>
        <li><button type="button" data-campus-action="more-settings">설정 · 온보딩</button></li>
        <li><button type="button" data-campus-action="sync-notify">알림 동기화</button></li>
      </ul>
      <p class="hint">과제 ${upcomingAssignments(99).length} · 시험 ${upcomingExams(99).length}</p>
    </section>`
}

function renderOnboarding(): string {
  const store = loadCampusStore()
  if (store.profile.onboardedAt || store.courses.length) return ''
  return `
    <section class="campus-onboard">
      <h2>AIZIO CAMPUS</h2>
      <p>대학생활 비서 · 학습관리. 2~3분이면 시작할 수 있습니다.</p>
      <form data-campus-form="onboard-start" class="campus-form">
        <label>학교명(선택) <input name="schoolName" placeholder="예: ○○대학교" /></label>
        <label>학기
          <select name="term">
            <option value="2">2026년 2학기</option>
            <option value="1">2026년 1학기</option>
          </select>
        </label>
        <label>학점 기준
          <select name="gradeScale">
            <option value="4.5">4.5</option>
            <option value="4.3">4.3</option>
            <option value="4.0">4.0</option>
          </select>
        </label>
        <button class="primary-btn" type="submit">시작 · 시간표 추가</button>
      </form>
    </section>`
}

export function renderCampusShell(): string {
  const body =
    campusUi.tab === 'today'
      ? renderToday()
      : campusUi.tab === 'timetable'
        ? renderTimetable()
        : campusUi.tab === 'study'
          ? renderStudy()
          : campusUi.tab === 'courses'
            ? renderCourses()
            : renderMore()

  return `
    <main class="panel campus-shell" data-campus-root="1">
      <header class="campus-head">
        <button type="button" class="ghost-btn tiny" data-campus-action="open-chat">대화</button>
        <strong>AIZIO CAMPUS</strong>
        <span class="hint">${esc(campusUi.status)}</span>
      </header>
      ${renderOnboarding()}
      ${body}
      ${nav()}
    </main>`
}
