import { nowIso } from './id'
import { ensureActiveSemester } from './courses'
import { loadCampusStore, updateCampusStore } from './storage'
import type { CampusProfile, GradeScale } from './types'

export function getCampusProfile(): CampusProfile {
  return loadCampusStore().profile
}

export function completeOnboarding(input: {
  schoolName?: string
  year?: number
  term?: 1 | 2
  gradeScale?: GradeScale
}): CampusProfile {
  ensureActiveSemester({
    year: input.year,
    term: input.term,
  })
  let profile: CampusProfile = loadCampusStore().profile
  updateCampusStore((s) => {
    s.profile = {
      ...s.profile,
      schoolName: (input.schoolName || '').trim().slice(0, 80),
      gradeScale: input.gradeScale || s.profile.gradeScale || '4.5',
      onboardedAt: s.profile.onboardedAt || nowIso(),
      updatedAt: nowIso(),
    }
    profile = s.profile
  })
  return profile
}

/** Settings-only update — never switches active semester. */
export function updateCampusProfileSettings(input: {
  schoolName?: string
  gradeScale?: GradeScale
}): CampusProfile {
  let profile = loadCampusStore().profile
  updateCampusStore((s) => {
    s.profile = {
      ...s.profile,
      schoolName:
        input.schoolName !== undefined
          ? input.schoolName.trim().slice(0, 80)
          : s.profile.schoolName,
      gradeScale: input.gradeScale || s.profile.gradeScale || '4.5',
      updatedAt: nowIso(),
    }
    profile = s.profile
  })
  return profile
}

export function updateGraduationRequirements(input: {
  graduationCredits?: number | null
  majorCredits?: number | null
  generalCredits?: number | null
}): CampusProfile {
  let profile = loadCampusStore().profile
  updateCampusStore((s) => {
    s.profile = {
      ...s.profile,
      graduationCredits:
        input.graduationCredits === undefined
          ? s.profile.graduationCredits
          : input.graduationCredits,
      majorCredits:
        input.majorCredits === undefined ? s.profile.majorCredits : input.majorCredits,
      generalCredits:
        input.generalCredits === undefined
          ? s.profile.generalCredits
          : input.generalCredits,
      updatedAt: nowIso(),
    }
    profile = s.profile
  })
  return profile
}

export function updateNotifyPrefs(
  patch: Partial<
    Pick<
      CampusProfile,
      | 'notifyAssignmentD3'
      | 'notifyAssignmentD1'
      | 'notifyExamD7'
      | 'notifyExamD1'
      | 'notifyClassStart'
    >
  >,
): CampusProfile {
  let profile = loadCampusStore().profile
  updateCampusStore((s) => {
    s.profile = { ...s.profile, ...patch, updatedAt: nowIso() }
    profile = s.profile
  })
  return profile
}
