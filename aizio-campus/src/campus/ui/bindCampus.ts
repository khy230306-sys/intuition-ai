import { analyzeMaterialAi, extractDeadlineCandidates, generateQuizFromSources, summarizeLectureFromTranscript } from '../ai/campusAi'
import { createAssignment, deleteAssignment, setAssignmentStatus } from '../assignments'
import { downloadTextFile, exportCampusBackupJson, importCampusBackupJson } from '../backup'
import { getCampusBlob } from '../blobStore'
import { createCourse, deleteCourseDeep, findCourseByName, updateCourse } from '../courses'
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
import { notifyFlashSummary, syncCampusNotifications } from '../notifications'
import {
  completeOnboarding,
  updateCampusProfileSettings,
  updateGraduationRequirements,
  updateNotifyPrefs,
} from '../profile'
import { ensureNotificationPermission } from '../../notify'
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
let playbackUrl: string | null = null
let playbackAudio: HTMLAudioElement | null = null

function flash(opts: BindOpts, msg: string): void {
  campusUi.status = msg
  opts.onFlash?.(msg)
}

function timeToMinutes(t: string): number {
  const [hh, mm] = t.split(':').map(Number)
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return NaN
  return hh * 60 + mm
}

function resetSessionForm(form: HTMLFormElement): void {
  form.reset()
  const sid = form.elements.namedItem('sessionId') as HTMLInputElement | null
  if (sid) sid.value = ''
  form.hidden = true
}

function stopPlayback(): void {
  if (playbackAudio) {
    playbackAudio.pause()
    playbackAudio = null
  }
  if (playbackUrl) {
    URL.revokeObjectURL(playbackUrl)
    playbackUrl = null
  }
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
        if (action === 'back-aizio' || action === 'open-chat') {
          opts.onBack()
          return
        }
        if (action === 'goto-timetable') {
          campusUi.tab = 'timetable'
          campusUi.sessionFormOpen = true
          repaint(el)
          return
        }
        if (action === 'start-review') {
          const courseId = btn.getAttribute('data-course-id') || ''
          const minutes = Number(btn.getAttribute('data-minutes') || 25)
          campusUi.tab = 'study'
          campusUi.focusCourseId = courseId
          campusUi.focusMinutes = Math.min(180, Math.max(5, Math.round(minutes) || 25))
          campusUi.focusRemaining = campusUi.focusMinutes * 60
          campusUi.focusSessionStartRemaining = campusUi.focusRemaining
          flash(opts, '추천 복습 · 타이머를 시작하세요.')
          repaint(el)
          return
        }
        if (action === 'delete-course') {
          const id = btn.getAttribute('data-course-id') || ''
          if (!confirm('이 과목과 관련 과제·시험·퀴즈·노트 메타데이터를 삭제할까요? (녹음 파일도 삭제)')) return
          await deleteCourseDeep(id)
          campusUi.courseId = null
          flash(opts, '과목을 삭제했습니다.')
          repaint(el)
          return
        }
        if (action === 'export-backup') {
          const json = exportCampusBackupJson()
          const day = new Date().toISOString().slice(0, 10)
          downloadTextFile(`aizio-campus-backup-${day}.json`, json)
          flash(opts, '백업 파일을 저장했습니다. (녹음 원본 제외)')
          return
        }
        if (action === 'more-deadlines') {
          campusUi.morePane = 'deadlines'
          campusUi.tab = 'more'
          repaint(el)
          return
        }
        if (action === 'reject-candidate') {
          const id = btn.getAttribute('data-id') || ''
          updateCampusStore((s) => {
            s.candidates = s.candidates.filter((c) => c.id !== id)
          })
          flash(opts, '후보를 무시했습니다.')
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
          campusUi.sessionFormOpen = true
          const form = el.querySelector<HTMLFormElement>('[data-campus-form="session"]')
          if (form) {
            form.reset()
            const sid = form.elements.namedItem('sessionId') as HTMLInputElement | null
            if (sid) sid.value = ''
            form.hidden = false
          }
          return
        }
        if (action === 'cancel-session-form') {
          campusUi.sessionFormOpen = false
          const form = el.querySelector<HTMLFormElement>('[data-campus-form="session"]')
          if (form) resetSessionForm(form)
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
        if (action === 'rec-play') {
          const id = btn.getAttribute('data-recording-id') || ''
          const rec = loadCampusStore().recordings.find((r) => r.id === id)
          if (!rec) {
            flash(opts, '녹음을 찾을 수 없습니다.')
            return
          }
          const blob = await getCampusBlob(rec.blobKey)
          if (!blob) {
            flash(opts, '녹음 파일이 없습니다.')
            return
          }
          stopPlayback()
          playbackUrl = URL.createObjectURL(blob)
          playbackAudio = new Audio(playbackUrl)
          playbackAudio.onended = () => stopPlayback()
          await playbackAudio.play()
          flash(opts, '녹음 재생 중')
          return
        }
        if (action === 'delete-recording') {
          const id = btn.getAttribute('data-recording-id') || ''
          if (confirm('녹음 파일을 삭제할까요?')) {
            stopPlayback()
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
          const gradeMsg = correct
            ? `정답 · ${question.explanation || ''}`.trim()
            : `오답 · 정답: ${question.answer}${question.explanation ? ` · ${question.explanation}` : ''}`
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
            const attempt = submitQuizAttempt({ quizId: quiz.id, answers: prev })
            sessionStorage.removeItem(key)
            flash(opts, `${gradeMsg} · 퀴즈 완료 ${attempt.score}/${attempt.total}`)
          } else {
            flash(opts, gradeMsg)
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
          campusUi.focusSessionStartRemaining = campusUi.focusRemaining
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
              const elapsedMin = Math.max(
                1,
                Math.round(campusUi.focusSessionStartRemaining / 60),
              )
              const mode =
                elapsedMin === 25
                  ? 'focus25'
                  : elapsedMin === 50
                    ? 'focus50'
                    : 'custom'
              logStudySession({
                courseId: campusUi.focusCourseId,
                minutes: elapsedMin,
                mode,
              })
              flash(opts, `${elapsedMin}분 학습을 저장했습니다.`)
              campusUi.focusRemaining = campusUi.focusMinutes * 60
              campusUi.focusSessionStartRemaining = campusUi.focusRemaining
              const root = document.querySelector('[data-campus-root]') as HTMLElement | null
              if (root) repaint(root)
            },
          )
          repaint(el)
          return
        }
        if (action === 'focus-stop') {
          const started = campusUi.focusSessionStartRemaining
          const left = campusUi.focusRemaining
          const partial = Math.floor((started - left) / 60)
          stopFocusTicker()
          if (partial >= 1 && campusUi.focusCourseId) {
            logStudySession({
              courseId: campusUi.focusCourseId,
              minutes: partial,
              mode: 'custom',
            })
            flash(opts, `${partial}분 학습을 저장했습니다. (중단)`)
          }
          campusUi.focusRemaining = campusUi.focusMinutes * 60
          campusUi.focusSessionStartRemaining = campusUi.focusRemaining
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
          await ensureNotificationPermission()
          const r = syncCampusNotifications()
          flash(opts, notifyFlashSummary(r))
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

  el.querySelectorAll<HTMLInputElement>('[data-campus-import]').forEach((input) => {
    input.addEventListener('change', async () => {
      const file = input.files?.[0]
      if (!file) return
      try {
        const text = await file.text()
        const res = importCampusBackupJson(text)
        if (!res.ok) {
          flash(opts, res.error)
          return
        }
        flash(opts, '백업을 가져왔습니다.')
        campusUi.tab = 'today'
        campusUi.morePane = 'menu'
        repaint(el)
      } catch (e) {
        flash(opts, e instanceof Error ? e.message : '가져오기 실패')
      }
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
        const startM = timeToMinutes(startTime)
        const endM = timeToMinutes(endTime)
        if (!(endM > startM)) {
          flash(opts, '종료 시간은 시작 시간보다 늦어야 합니다.')
          return
        }
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
          let course = findCourseByName(name)
          if (course) {
            updateCourse(course.id, { professor, room, credits })
          } else {
            course = createCourse({ name, professor, room, credits })
          }
          const { conflicts } = addClassSession({
            courseId: course.id,
            weekday,
            startTime,
            endTime,
            room,
          })
          campusUi.sessionFormOpen = false
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
      if (kind === 'onboard-start') {
        const year = Number(fd.get('year')) || new Date().getFullYear()
        completeOnboarding({
          schoolName: String(fd.get('schoolName') || ''),
          year,
          term: (Number(fd.get('term') || 2) === 1 ? 1 : 2) as 1 | 2,
          gradeScale: String(fd.get('gradeScale') || '4.5') as '4.5' | '4.3' | '4.0',
        })
        campusUi.tab = 'timetable'
        campusUi.sessionFormOpen = true
        flash(opts, '온보딩 완료 · 첫 수업을 추가하세요.')
        repaint(el)
        return
      }
      if (kind === 'assignment') {
        const courseId = form.getAttribute('data-course-id') || ''
        const title = String(fd.get('title') || '').trim()
        const due = String(fd.get('dueAt') || '')
        if (!courseId || !title) return
        createAssignment({
          courseId,
          title,
          dueAt: due ? new Date(due + 'T23:59:00').toISOString() : null,
        })
        flash(opts, '과제를 저장했습니다.')
        repaint(el)
        return
      }
      if (kind === 'exam') {
        const courseId = form.getAttribute('data-course-id') || ''
        const name = String(fd.get('name') || '').trim()
        const at = String(fd.get('at') || '')
        const scope = String(fd.get('scope') || '')
        if (!courseId || !name) return
        createExam({
          courseId,
          name,
          at: at ? new Date(at).toISOString() : null,
          scope,
        })
        flash(opts, '시험을 저장했습니다.')
        repaint(el)
        return
      }
      if (kind === 'project') {
        const courseId = String(fd.get('courseId') || '')
        const name = String(fd.get('name') || '').trim()
        const members = String(fd.get('members') || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
        const due = String(fd.get('dueAt') || '')
        if (!courseId || !name) {
          flash(opts, '과목과 프로젝트명이 필요합니다.')
          return
        }
        createProject({
          courseId,
          name,
          members,
          dueAt: due ? new Date(due + 'T23:59:00').toISOString() : null,
        })
        flash(opts, '프로젝트를 추가했습니다.')
        repaint(el)
        return
      }
      if (kind === 'settings' || kind === 'onboard') {
        updateCampusProfileSettings({
          schoolName: String(fd.get('schoolName') || ''),
          gradeScale: String(fd.get('gradeScale') || '4.5') as '4.5' | '4.3' | '4.0',
        })
        flash(opts, '설정을 저장했습니다.')
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
        void (async () => {
          updateNotifyPrefs({
            notifyAssignmentD3: Boolean(fd.get('notifyAssignmentD3')),
            notifyAssignmentD1: Boolean(fd.get('notifyAssignmentD1')),
            notifyExamD7: Boolean(fd.get('notifyExamD7')),
            notifyExamD1: Boolean(fd.get('notifyExamD1')),
            notifyClassStart: Boolean(fd.get('notifyClassStart')),
          })
          await ensureNotificationPermission()
          const r = syncCampusNotifications()
          flash(opts, `알림 설정 저장 · ${notifyFlashSummary(r)}`)
          repaint(el)
        })()
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
