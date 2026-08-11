import type { Course, GradeScale, LetterGrade } from './types'

const POINTS_45: Record<LetterGrade, number | null> = {
  'A+': 4.5,
  A: 4.0,
  'A-': 3.7,
  'B+': 3.5,
  B: 3.0,
  'B-': 2.7,
  'C+': 2.5,
  C: 2.0,
  'C-': 1.7,
  'D+': 1.5,
  D: 1.0,
  'D-': 0.7,
  F: 0,
  P: null,
  NP: null,
}

const POINTS_43: Record<LetterGrade, number | null> = {
  'A+': 4.3,
  A: 4.0,
  'A-': 3.7,
  'B+': 3.3,
  B: 3.0,
  'B-': 2.7,
  'C+': 2.3,
  C: 2.0,
  'C-': 1.7,
  'D+': 1.3,
  D: 1.0,
  'D-': 0.7,
  F: 0,
  P: null,
  NP: null,
}

const POINTS_40: Record<LetterGrade, number | null> = {
  'A+': 4.0,
  A: 4.0,
  'A-': 3.7,
  'B+': 3.3,
  B: 3.0,
  'B-': 2.7,
  'C+': 2.3,
  C: 2.0,
  'C-': 1.7,
  'D+': 1.3,
  D: 1.0,
  'D-': 0.7,
  F: 0,
  P: null,
  NP: null,
}

function table(scale: GradeScale): Record<LetterGrade, number | null> {
  if (scale === '4.3') return POINTS_43
  if (scale === '4.0') return POINTS_40
  return POINTS_45
}

export function gradeToPoints(grade: LetterGrade | '', scale: GradeScale): number | null {
  if (!grade) return null
  return table(scale)[grade] ?? null
}

export type GpaResult = {
  gpa: number | null
  earnedCredits: number
  gradedCredits: number
  countedCourses: number
}

/** Deterministic GPA — never via LLM. */
export function computeGpa(courses: Course[], scale: GradeScale): GpaResult {
  let quality = 0
  let gradedCredits = 0
  let earnedCredits = 0
  let countedCourses = 0
  for (const c of courses) {
    const pts = gradeToPoints(c.grade, scale)
    const cr = Number(c.credits) || 0
    if (cr <= 0) continue
    if (pts === null) {
      if (c.grade === 'P') earnedCredits += cr
      continue
    }
    quality += pts * cr
    gradedCredits += cr
    earnedCredits += cr
    countedCourses += 1
  }
  if (gradedCredits <= 0) {
    return { gpa: null, earnedCredits, gradedCredits: 0, countedCourses: 0 }
  }
  return {
    gpa: Math.round((quality / gradedCredits) * 100) / 100,
    earnedCredits,
    gradedCredits,
    countedCourses,
  }
}
