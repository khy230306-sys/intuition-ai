import { campusId, nowIso } from './id'
import { updateCampusStore } from './storage'
import type { CampusProject, ProjectTask, ProjectTaskStatus } from './types'

export function createProject(input: {
  courseId: string
  name: string
  members?: string[]
  dueAt?: string | null
  memo?: string
}): CampusProject {
  const now = nowIso()
  const project: CampusProject = {
    id: campusId('prj'),
    courseId: input.courseId,
    name: input.name.trim().slice(0, 80),
    members: (input.members || []).map((m) => m.trim()).filter(Boolean),
    dueAt: input.dueAt || null,
    tasks: [],
    memo: (input.memo || '').trim().slice(0, 1000),
    createdAt: now,
    updatedAt: now,
  }
  updateCampusStore((s) => {
    s.projects.unshift(project)
  })
  return project
}

export function addProjectTask(
  projectId: string,
  input: { title: string; assignee?: string },
): ProjectTask | null {
  let task: ProjectTask | null = null
  updateCampusStore((s) => {
    const p = s.projects.find((x) => x.id === projectId)
    if (!p) return
    task = {
      id: campusId('ptk'),
      title: input.title.trim().slice(0, 120),
      assignee: (input.assignee || '').trim(),
      status: 'TODO',
      memo: '',
    }
    p.tasks.push(task)
    p.updatedAt = nowIso()
  })
  return task
}

export function setProjectTaskStatus(
  projectId: string,
  taskId: string,
  status: ProjectTaskStatus,
): boolean {
  let ok = false
  updateCampusStore((s) => {
    const p = s.projects.find((x) => x.id === projectId)
    const t = p?.tasks.find((x) => x.id === taskId)
    if (!t) return
    t.status = status
    if (p) p.updatedAt = nowIso()
    ok = true
  })
  return ok
}
