/** AIZIO CAMPUS V1 domain types — sync-ready ids + timestamps. */

export type IsoDate = string
export type CampusId = string

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6 // Sun=0 … Sat=6

export type AssignmentStatus = 'TODO' | 'DOING' | 'DONE'
export type AssignmentPriority = 'low' | 'medium' | 'high'
export type ProjectTaskStatus = 'TODO' | 'DOING' | 'DONE'
export type StudyPlanBlockStatus = 'pending' | 'done' | 'deferred'
export type GradeScale = '4.5' | '4.3' | '4.0'
export type LetterGrade =
  | 'A+'
  | 'A'
  | 'A-'
  | 'B+'
  | 'B'
  | 'B-'
  | 'C+'
  | 'C'
  | 'C-'
  | 'D+'
  | 'D'
  | 'D-'
  | 'F'
  | 'P'
  | 'NP'

export type MaterialKind = 'pdf' | 'txt' | 'markdown' | 'docx' | 'other'
export type QuestionType = 'mcq' | 'ox' | 'short' | 'essay' | 'flash'
export type TranscriptStatus = 'idle' | 'processing' | 'ready' | 'failed'
export type RecordingStatus = 'recording' | 'paused' | 'stopped' | 'saved'
export type AiJobStatus = 'idle' | 'running' | 'done' | 'failed' | 'offline'

export type CampusTab = 'today' | 'timetable' | 'study' | 'courses' | 'more'

export interface CampusMeta {
  schemaVersion: number
  updatedAt: IsoDate
  version: number
}

export interface CampusProfile {
  id: CampusId
  schoolName: string
  gradeScale: GradeScale
  onboardedAt: IsoDate | null
  graduationCredits?: number | null
  majorCredits?: number | null
  generalCredits?: number | null
  notifyAssignmentD3: boolean
  notifyAssignmentD1: boolean
  notifyExamD7: boolean
  notifyExamD1: boolean
  notifyClassStart: boolean
  createdAt: IsoDate
  updatedAt: IsoDate
}

export interface Semester {
  id: CampusId
  year: number
  term: 1 | 2 | 'summer' | 'winter'
  label: string
  active: boolean
  createdAt: IsoDate
  updatedAt: IsoDate
}

export interface Course {
  id: CampusId
  semesterId: CampusId
  name: string
  professor: string
  room: string
  color: string
  credits: number
  memo: string
  grade: LetterGrade | ''
  createdAt: IsoDate
  updatedAt: IsoDate
}

/** One weekly class slot (recurring). */
export interface ClassSession {
  id: CampusId
  courseId: CampusId
  weekday: Weekday
  startTime: string // HH:mm
  endTime: string
  room: string
  createdAt: IsoDate
  updatedAt: IsoDate
}

export interface Material {
  id: CampusId
  courseId: CampusId
  name: string
  kind: MaterialKind
  mimeType: string
  sizeBytes: number
  blobKey: string
  textExtract: string
  extractStatus: 'pending' | 'ready' | 'unsupported' | 'failed'
  analysisJson: string
  analysisStatus: AiJobStatus
  createdAt: IsoDate
  updatedAt: IsoDate
}

export interface NoteMarker {
  id: CampusId
  atMs: number
  kind: 'important' | 'exam' | 'question' | 'confused'
  note: string
}

export interface LectureRecording {
  id: CampusId
  courseId: CampusId
  title: string
  blobKey: string
  durationMs: number
  status: RecordingStatus
  markers: NoteMarker[]
  createdAt: IsoDate
  updatedAt: IsoDate
}

export interface Transcript {
  id: CampusId
  recordingId: CampusId
  courseId: CampusId
  text: string
  provider: string
  status: TranscriptStatus
  error: string
  createdAt: IsoDate
  updatedAt: IsoDate
}

export interface LectureNote {
  id: CampusId
  courseId: CampusId
  recordingId: string
  title: string
  threeLine: string
  fullSummary: string
  concepts: string[]
  professorEmphasis: string[]
  definitions: string[]
  examples: string[]
  examPoints: string[]
  reviewQuestions: string[]
  sourceRefs: Array<{ claim: string; excerpt: string }>
  status: AiJobStatus
  createdAt: IsoDate
  updatedAt: IsoDate
}

export interface Assignment {
  id: CampusId
  courseId: CampusId
  title: string
  description: string
  dueAt: IsoDate | null
  priority: AssignmentPriority
  status: AssignmentStatus
  memo: string
  attachmentNames: string[]
  source: 'user' | 'ai_candidate'
  confirmed: boolean
  createdAt: IsoDate
  updatedAt: IsoDate
}

export interface Exam {
  id: CampusId
  courseId: CampusId
  name: string
  at: IsoDate | null
  durationMinutes: number
  scope: string
  place: string
  memo: string
  source: 'user' | 'ai_candidate'
  confirmed: boolean
  createdAt: IsoDate
  updatedAt: IsoDate
}

export interface DeadlineCandidate {
  id: CampusId
  courseId: CampusId
  kind: 'assignment' | 'exam' | 'presentation' | 'project'
  title: string
  dueHint: string
  dueAt: IsoDate | null
  confidence: 'certain' | 'inferred'
  excerpt: string
  accepted: boolean
  createdAt: IsoDate
}

export interface Question {
  id: CampusId
  courseId: CampusId
  type: QuestionType
  prompt: string
  choices: string[]
  answer: string
  explanation: string
  concepts: string[]
  sourceMaterialIds: string[]
  createdAt: IsoDate
}

export interface Quiz {
  id: CampusId
  courseId: CampusId
  title: string
  questionIds: string[]
  createdAt: IsoDate
}

export interface QuizAttempt {
  id: CampusId
  quizId: CampusId
  courseId: CampusId
  answers: Array<{
    questionId: string
    userAnswer: string
    correct: boolean
    concepts: string[]
  }>
  score: number
  total: number
  createdAt: IsoDate
}

export interface StudyPlanBlock {
  id: CampusId
  title: string
  courseId: string
  minutes: number
  status: StudyPlanBlockStatus
  dayOffset: number
}

export interface StudyPlan {
  id: CampusId
  courseId: CampusId
  examId: string
  title: string
  days: number
  blocks: StudyPlanBlock[]
  createdAt: IsoDate
  updatedAt: IsoDate
}

export interface StudySession {
  id: CampusId
  courseId: CampusId
  minutes: number
  mode: 'focus25' | 'focus50' | 'custom'
  startedAt: IsoDate
  endedAt: IsoDate
}

export interface ProjectTask {
  id: CampusId
  title: string
  assignee: string
  status: ProjectTaskStatus
  memo: string
}

export interface CampusProject {
  id: CampusId
  courseId: CampusId
  name: string
  members: string[]
  dueAt: IsoDate | null
  tasks: ProjectTask[]
  memo: string
  createdAt: IsoDate
  updatedAt: IsoDate
}

export interface CampusStore {
  meta: CampusMeta
  profile: CampusProfile
  semesters: Semester[]
  courses: Course[]
  sessions: ClassSession[]
  materials: Material[]
  recordings: LectureRecording[]
  transcripts: Transcript[]
  notes: LectureNote[]
  assignments: Assignment[]
  exams: Exam[]
  candidates: DeadlineCandidate[]
  quizzes: Quiz[]
  questions: Question[]
  attempts: QuizAttempt[]
  studyPlans: StudyPlan[]
  studySessions: StudySession[]
  projects: CampusProject[]
}

export const COURSE_COLORS = [
  '#1f6feb',
  '#0f766e',
  '#b45309',
  '#be123c',
  '#6d28d9',
  '#0369a1',
  '#15803d',
  '#c2410c',
] as const

export const WEEKDAY_KO = ['일', '월', '화', '수', '목', '금', '토'] as const
export const WEEKDAY_FULL_KO = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'] as const
