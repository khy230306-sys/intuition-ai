import { analyzeMaterialAi, extractDeadlineCandidates, generateQuizFromSources, summarizeLectureFromTranscript } from '../ai/campusAi'
import { createAssignment, deleteAssignment, setAssignmentStatus } from '../assignments'
import { createCourse, updateCourse } from '../courses'
import { createExam, deleteExam } from '../exams'
import { logStudySession } from '../focus'
import {
  addRecordingMarker,
  deleteLectureRecording,
  getRecorderState,
  pauseLectureRecording,
  resumeLectureRecording,
  startLectureRecording,
  stopLectureRecording,
} from '../media/recorder'
import { transcribeRecording } from '../media/stt'
import { addMaterial, deleteMaterial } from '../materials'
import { syncCampusNotifications } from '../notifications'
import { completeOnboarding, updateGraduationRequirements, updateNotifyPrefs } from '../profile'
import { addProjectTask, createProject, setProjectTaskStatus } from '../projects'
import { gradeAnswer, submitQuizAttempt } from '../quiz'
import { loadCampusStore, updateCampusStore } from '../storage'
import { setStudyPlanBlockStatus } from '../studyPlan'
import { addClassSession, deleteClassSession, updateClassSession } from '../timetable'
import type { LetterGrade, ProjectTaskStatus, Weekday } from '../types'
import { renderCampusShell } from './renderCampus'
import { campusUi, startFocusTicker, stopFocusTicker } from './state'

type BindOpts = {
  onBack: () => void
  onFlash?: (msg: string) => void
}

let recPaint: number | null = null

function flash(opts: BindOpts, msg: string): void {
  campusUi.status = msg
  opts.onFlash?.(msg)
}

function repaint(root: HTMLElement): void {
  const host = root.closest('#app') || root.parentElement
  if (!host) return
  // Replace campus shell only
  const wrap = document.createElement('div')
  wrap.innerHTML = renderCampusShell()
  const next = wrap.firstElementChild as HTMLElement
  const cur = document.querySelector('[data-campus-root]')
  if (cur && next) {
    cur.replaceWith(next)
    bindCampus(optsRef!, next)
  }
}

let optsRef: BindOpts | null = null

function ensureRecPaint(): void {
  if (recPaint) return
  recPaint = window.setInterval(() => {
    if (!getRecorderState().active) {
      if (recPaint) window.clearInterval(recPaint)
      recPaint = null
      return
    }
    const root = document.querySelector('[data-campus-root]') as HTMLElement | null
    if (root) repaint(root)
  }, 1000)
}

export function bindCampus(opts: BindOpts, root?: HTMLElement): void {
  optsRef = opts
  const el = root || (document.querySelector('[data-campus-root]') as HTMLElement | null)
  if (!el) return

  el.querySelectorAll<HTMLElement>('[data-campus-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      campusUi.tab = btn.getAttribute('data-campus-tab') as typeof campusUi.tab
      campusUi.courseId = campusUi.tab === 'courses' ? campusUi.courseId : campusUi.courseId
      if (campusUi.tab !== 'courses') {
        /* keep courseId for return */
      }
      if (campusUi.tab !== 'more') campusUi.morePane = 'menu'
      repaint(el)
    })
  })

  el.querySelectorAll<HTMLElement>('[data-campus-action]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const action = btn.getAttribute('data-campus-action') || ''
      try {
        if (action === 'back-aizio') {
          stopFocusTicker()
          opts.onBack()
          return
        }
        if (action === 'goto-timetable') {
          campusUi.tab = 'timetable'
          repaint(el)
          return
        }
        if (action === 'courses-list') {
          campusUi.courseId = null
          campusUi.tab = 'courses'
          repaint(el)
          return
        }
        if (action === 'open-course') {
          campusUi.courseId = btn.getAttribute('data-course-id')
          campusUi.tab = 'courses'
          repaint(el)
          return
        }
        if (action === 'add-session') {
          const form = el.querySelector<HTMLFormElement>('[data-campus-form="session"]')
          if (form) form.hidden = false
          return
        }
        if (action === 'cancel-session-form') {
          const form = el.querySelector<HTMLFormElement>('[data-campus-form="session"]')
          if (form) form.hidden = true
          return
        }
        if (action === 'delete-session') {
          const id = btn.getAttribute('data-session-id') || ''
          if (confirm('이 수업을 삭제할까요?')) {
            deleteClassSession(id)
            flash(opts, '수업을 삭제했습니다.')
            repaint(el)
          }
          return
        }
        if (action === 'edit-session') {
          const id = btn.getAttribute('data-session-id') || ''
          const store = loadCampusStore()
          const s = store.sessions.find((x) => x.id === id)
          const c = s && store.courses.find((x) => x.id === s.courseId)
          const form = el.querySelector<HTMLFormElement>('[data-campus-form="session"]')
          if (form && s && c) {
            form.hidden = false
            ;(form.elements.namedItem('sessionId') as HTMLInputElement).value = s.id
            ;(form.elements.namedItem('name') as HTMLInputElement).value = c.name
            ;(form.elements.namedItem('professor') as HTMLInputElement).value = c.professor
            ;(form.elements.namedItem('weekday') as HTMLSelectElement).value = String(s.weekday)
            ;(form.elements.namedItem('startTime') as HTMLInputElement).value = s.startTime
            ;(form.elements.namedItem('endTime') as HTMLInputElement).value = s.endTime
            ;(form.elements.namedItem('room') as HTMLInputElement).value = s.room || c.room
            ;(form.elements.namedItem('credits') as HTMLInputElement).value = String(c.credits)
          }
          return
        }
        if (action === 'rec-start') {
          const courseId = btn.getAttribute('data-course-id') || ''
          await startLectureRecording(courseId)
          campusUi.recordingCourseId = courseId
          flash(opts, '녹음 중 — 권한/규정은 사용자가 확인해야 합니다.')
          ensureRecPaint()
          repaint(el)
          return
        }
        if (action === 'rec-pause') {
          pauseLectureRecording()
          repaint(el)
          return
        }
        if (action === 'rec-resume') {
          resumeLectureRecording()
          repaint(el)
          return
        }
        if (action === 'rec-stop') {
          flash(opts, '녹음 저장 중…')
          const rec = await stopLectureRecording()
          flash(opts, `녹음 저장됨 (${Math.round(rec.durationMs / 1000)}초)`)
          repaint(el)
          return
        }
        if (action === 'rec-mark') {
          const kind = btn.getAttribute('data-mark') as 'important' | 'exam' | 'question' | 'confused'
          addRecordingMarker(kind)
          flash(opts, `마커: ${kind}`)
          return
        }
        if (action === 'delete-recording') {
          const id = btn.getAttribute('data-recording-id') || ''
          if (confirm('녹음 파일을 삭제할까요?')) {
            await deleteLectureRecording(id)
            flash(opts, '녹음을 삭제했습니다.')
            repaint(el)
          }
          return
        }
        if (action === 'transcribe') {
          const id = btn.getAttribute('data-recording-id') || ''
          flash(opts, '음성을 텍스트로 변환 중…')
          repaint(el)
          const tr = await transcribeRecording(id)
          flash(
            opts,
            tr.status === 'ready' ? 'Transcript 완료' : tr.error || 'Transcript 실패',
          )
          repaint(el)
          return
        }
        if (action === 'summarize-lecture') {
          const id = btn.getAttribute('data-transcript-id') || ''
          flash(opts, 'AI 정리 중…')
          const res = await summarizeLectureFromTranscript(id)
          flash(opts, res.message)
          repaint(el)
          return
        }
        if (action === 'analyze-material') {
          const id = btn.getAttribute('data-material-id') || ''
          flash(opts, 'AI 분석 중…')
          const res = await analyzeMaterialAi(id)
          flash(opts, res.message)
          repaint(el)
          return
        }
        if (action === 'extract-deadlines') {
          const id = btn.getAttribute('data-material-id') || ''
          flash(opts, '과제/시험 후보 추출 중…')
          const res = await extractDeadlineCandidates(id)
          flash(opts, res.message)
          repaint(el)
          return
        }
        if (action === 'delete-material') {
          const id = btn.getAttribute('data-material-id') || ''
          await deleteMaterial(id)
          flash(opts, '자료 삭제')
          repaint(el)
          return
        }
        if (action === 'add-assignment') {
          const courseId = btn.getAttribute('data-course-id') || ''
          const title = prompt('과제 제목')
          if (!title) return
          const due = prompt('마감일 (YYYY-MM-DD, 선택)') || ''
          createAssignment({
            courseId,
            title,
            dueAt: due ? new Date(due + 'T23:59:00').toISOString() : null,
          })
          flash(opts, '과제 저장')
          repaint(el)
          return
        }
        if (action === 'asg-status') {
          setAssignmentStatus(btn.getAttribute('data-id') || '', 'DONE')
          repaint(el)
          return
        }
        if (action === 'delete-assignment') {
          deleteAssignment(btn.getAttribute('data-id') || '')
          repaint(el)
          return
        }
        if (action === 'add-exam') {
          const courseId = btn.getAttribute('data-course-id') || ''
          const name = prompt('시험명', '중간고사')
          if (!name) return
          const when = prompt('일시 (YYYY-MM-DDTHH:mm)', '') || ''
          const scope = prompt('범위 (선택)', '') || ''
          createExam({
            courseId,
            name,
            at: when ? new Date(when).toISOString() : null,
            scope,
          })
          flash(opts, '시험 저장')
          repaint(el)
          return
        }
        if (action === 'delete-exam') {
          deleteExam(btn.getAttribute('data-id') || '')
          repaint(el)
          return
        }
        if (action === 'accept-candidate') {
          const id = btn.getAttribute('data-id') || ''
          const store = loadCampusStore()
          const c = store.candidates.find((x) => x.id === id)
          if (!c) return
          if (c.kind === 'exam') {
            createExam({
              courseId: c.courseId,
              name: c.title,
              at: c.dueAt,
              source: 'user',
              confirmed: true,
            })
          } else {
            createAssignment({
              courseId: c.courseId,
              title: c.title,
              dueAt: c.dueAt,
              source: 'user',
              confirmed: true,
            })
          }
          updateCampusStore((s) => {
            const x = s.candidates.find((i) => i.id === id)
            if (x) x.accepted = true
          })
          flash(opts, '일정에 추가했습니다.')
          repaint(el)
          return
        }
        if (action === 'gen-quiz' || action === 'gen-quiz-wrong') {
          const courseId = btn.getAttribute('data-course-id') || ''
          flash(opts, '문제 생성 중…')
          const res = await generateQuizFromSources({
            courseId,
            count: Number(btn.getAttribute('data-count') || 10),
            wrongOnly: action === 'gen-quiz-wrong',
          })
          if (res.quizId) {
            campusUi.quizId = res.quizId
            campusUi.quizIndex = 0
            campusUi.tab = 'study'
          }
          flash(opts, res.message)
          repaint(el)
          return
        }
        if (action === 'quiz-submit') {
          const qid = btn.getAttribute('data-question-id') || ''
          const store = loadCampusStore()
          const question = store.questions.find((q) => q.id === qid)
          if (!question || !campusUi.quizId) return
          const checked = el.querySelector<HTMLInputElement>('input[name="quizAns"]:checked')
          const text = el.querySelector<HTMLInputElement>('input[name="quizAnsText"]')
          const userAnswer = checked?.value || text?.value || ''
          const correct = gradeAnswer(question, userAnswer)
          flash(opts, correct ? `정답 · ${question.explanation || ''}` : `오답 · 정답: ${question.answer}${question.explanation ? ` · ${question.explanation}` : ''}`)
          const quiz = store.quizzes.find((q) => q.id === campusUi.quizId)
          // accumulate in sessionStorage-like memory on campusUi
          const key = `campus_quiz_ans_${campusUi.quizId}`
          const prev = JSON.parse(sessionStorage.getItem(key) || '[]') as Array<{
            questionId: string
            userAnswer: string
          }>
          prev.push({ questionId: qid, userAnswer })
          sessionStorage.setItem(key, JSON.stringify(prev))
          campusUi.quizIndex += 1
          if (quiz && campusUi.quizIndex >= quiz.questionIds.length) {
            submitQuizAttempt({ quizId: quiz.id, answers: prev })
            sessionStorage.removeItem(key)
            flash(opts, '퀴즈 결과를 저장했습니다.')
          }
          repaint(el)
          return
        }
        if (action === 'quiz-close') {
          campusUi.quizId = null
          campusUi.quizIndex = 0
          repaint(el)
          return
        }
        if (action === 'focus-set') {
          const min = btn.getAttribute('data-min')
          let minutes = 25
          if (min === '50') minutes = 50
          if (min === 'custom') {
            const v = Number(prompt('분', '30'))
            if (!Number.isFinite(v) || v <= 0) return
            minutes = Math.min(180, Math.round(v))
          }
          if (min === '25') minutes = 25
          campusUi.focusMinutes = minutes
          campusUi.focusRemaining = minutes * 60
          repaint(el)
          return
        }
        if (action === 'focus-start') {
          const sel = el.querySelector<HTMLSelectElement>('[data-campus-focus-course]')
          campusUi.focusCourseId = sel?.value || ''
          if (!campusUi.focusCourseId) {
            flash(opts, '과목을 선택하세요.')
            return
          }
          if (campusUi.focusRemaining <= 0) campusUi.focusRemaining = campusUi.focusMinutes * 60
          startFocusTicker(
            () => {
              const t = document.querySelector('.campus-focus-time')
              if (t) {
                const mm = Math.floor(campusUi.focusRemaining / 60)
                const ss = campusUi.focusRemaining % 60
                t.textContent = `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
              }
            },
            () => {
              logStudySession({
                courseId: campusUi.focusCourseId,
                minutes: campusUi.focusMinutes,
                mode:
                  campusUi.focusMinutes === 25
                    ? 'focus25'
                    : campusUi.focusMinutes === 50
                      ? 'focus50'
                      : 'custom',
              })
              flash(opts, `${campusUi.focusMinutes}분 학습을 저장했습니다.`)
              campusUi.focusRemaining = campusUi.focusMinutes * 60
              const root = document.querySelector('[data-campus-root]') as HTMLElement | null
              if (root) repaint(root)
            },
          )
          repaint(el)
          return
        }
        if (action === 'focus-stop') {
          stopFocusTicker()
          repaint(el)
          return
        }
        if (action === 'plan-status') {
          setStudyPlanBlockStatus(
            btn.getAttribute('data-plan') || '',
            btn.getAttribute('data-block') || '',
            (btn.getAttribute('data-status') as 'done' | 'deferred') || 'done',
          )
          repaint(el)
          return
        }
        if (action === 'more-menu') {
          campusUi.morePane = 'menu'
          repaint(el)
          return
        }
        if (action === 'more-search') {
          campusUi.morePane = 'search'
          repaint(el)
          return
        }
        if (action === 'more-gpa') {
          campusUi.morePane = 'gpa'
          repaint(el)
          return
        }
        if (action === 'more-projects') {
          campusUi.morePane = 'projects'
          repaint(el)
          return
        }
        if (action === 'more-settings') {
          campusUi.morePane = 'settings'
          repaint(el)
          return
        }
        if (action === 'sync-notify') {
          const r = syncCampusNotifications()
          flash(opts, `알림 동기화: 등록 ${r.armed} · 스킵 ${r.skipped}`)
          return
        }
        if (action === 'add-project') {
          const courses = loadCampusStore().courses
          if (!courses.length) {
            flash(opts, '먼저 과목을 등록하세요.')
            return
          }
          const name = prompt('프로젝트명')
          if (!name) return
          const members = (prompt('팀원 (쉼표 구분)', '') || '')
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
          createProject({ courseId: courses[0].id, name, members })
          repaint(el)
          return
        }
        if (action === 'add-task') {
          const title = prompt('Task')
          if (!title) return
          addProjectTask(btn.getAttribute('data-project') || '', { title })
          repaint(el)
          return
        }
        if (action === 'task-next') {
          const st = btn.getAttribute('data-status') as ProjectTaskStatus
          const next: ProjectTaskStatus = st === 'TODO' ? 'DOING' : st === 'DOING' ? 'DONE' : 'TODO'
          setProjectTaskStatus(
            btn.getAttribute('data-project') || '',
            btn.getAttribute('data-task') || '',
            next,
          )
          repaint(el)
          return
        }
      } catch (e) {
        flash(opts, e instanceof Error ? e.message : '오류')
        repaint(el)
      }
    })
  })

  el.querySelectorAll<HTMLInputElement>('[data-campus-file]').forEach((input) => {
    input.addEventListener('change', async () => {
      const file = input.files?.[0]
      const courseId = input.getAttribute('data-campus-file') || ''
      if (!file || !courseId) return
      flash(opts, '파일 저장 · 텍스트 추출 중…')
      try {
        const mat = await addMaterial(courseId, file)
        flash(
          opts,
          mat.extractStatus === 'ready'
            ? `저장·추출 완료: ${mat.name}`
            : mat.extractStatus === 'unsupported'
              ? '지원하지 않는 형식입니다. (PDF/TXT/MD/DOCX만)'
              : `저장됨 · 추출 ${mat.extractStatus}`,
        )
      } catch (e) {
        flash(opts, e instanceof Error ? e.message : '업로드 실패')
      }
      repaint(el)
    })
  })

  el.querySelectorAll<HTMLFormElement>('[data-campus-form]').forEach((form) => {
    form.addEventListener('submit', (ev) => {
      ev.preventDefault()
      const kind = form.getAttribute('data-campus-form')
      const fd = new FormData(form)
      if (kind === 'session') {
        const sessionId = String(fd.get('sessionId') || '')
        const name = String(fd.get('name') || '').trim()
        const professor = String(fd.get('professor') || '')
        const room = String(fd.get('room') || '')
        const credits = Number(fd.get('credits') || 0)
        const weekday = Number(fd.get('weekday')) as Weekday
        const startTime = String(fd.get('startTime') || '')
        const endTime = String(fd.get('endTime') || '')
        if (!name || !startTime || !endTime) return
        if (sessionId) {
          const store = loadCampusStore()
          const s = store.sessions.find((x) => x.id === sessionId)
          if (s) {
            updateCourse(s.courseId, { name, professor, room, credits })
            const { conflicts } = updateClassSession(sessionId, {
              weekday,
              startTime,
              endTime,
              room,
            })
            flash(
              opts,
              conflicts.length ? `수정됨 · 충돌 ${conflicts.length}건` : '수정 저장',
            )
          }
        } else {
          const course = createCourse({ name, professor, room, credits })
          const { conflicts } = addClassSession({
            courseId: course.id,
            weekday,
            startTime,
            endTime,
            room,
          })
          flash(
            opts,
            conflicts.length
              ? `저장됨 · 시간 충돌 ${conflicts.length}건 경고`
              : '시간표에 저장했습니다.',
          )
        }
        repaint(el)
        return
      }
      if (kind === 'onboard-start' || kind === 'onboard') {
        completeOnboarding({
          schoolName: String(fd.get('schoolName') || ''),
          year: 2026,
          term: (Number(fd.get('term') || 2) === 1 ? 1 : 2) as 1 | 2,
          gradeScale: String(fd.get('gradeScale') || '4.5') as '4.5' | '4.3' | '4.0',
        })
        campusUi.tab = 'timetable'
        flash(opts, '온보딩 완료 · 시간표를 추가하세요.')
        repaint(el)
        return
      }
      if (kind === 'gpa-scale') {
        updateCampusStore((s) => {
          s.profile.gradeScale = String(fd.get('scale') || '4.5') as '4.5' | '4.3' | '4.0'
        })
        flash(opts, '학점 기준 저장')
        repaint(el)
        return
      }
      if (kind === 'course-grade') {
        const id = form.getAttribute('data-course-id') || ''
        updateCourse(id, {
          credits: Number(fd.get('credits') || 0),
          grade: String(fd.get('grade') || '') as LetterGrade | '',
        })
        flash(opts, '성적 저장')
        repaint(el)
        return
      }
      if (kind === 'grad') {
        updateGraduationRequirements({
          graduationCredits: fd.get('graduationCredits')
            ? Number(fd.get('graduationCredits'))
            : null,
          majorCredits: fd.get('majorCredits') ? Number(fd.get('majorCredits')) : null,
          generalCredits: fd.get('generalCredits') ? Number(fd.get('generalCredits')) : null,
        })
        flash(opts, '졸업요건 저장')
        repaint(el)
        return
      }
      if (kind === 'notify') {
        updateNotifyPrefs({
          notifyAssignmentD3: Boolean(fd.get('notifyAssignmentD3')),
          notifyAssignmentD1: Boolean(fd.get('notifyAssignmentD1')),
          notifyExamD7: Boolean(fd.get('notifyExamD7')),
          notifyExamD1: Boolean(fd.get('notifyExamD1')),
          notifyClassStart: Boolean(fd.get('notifyClassStart')),
        })
        const r = syncCampusNotifications()
        flash(opts, `알림 설정 저장 · 등록 ${r.armed}`)
        repaint(el)
        return
      }
      if (kind === 'search') {
        campusUi.searchQ = String(fd.get('q') || '')
        campusUi.morePane = 'search'
        repaint(el)
      }
    })
  })
}

export function openCampusToQuiz(quizId: string): void {
  campusUi.tab = 'study'
  campusUi.quizId = quizId
  campusUi.quizIndex = 0
}
