import { isLifeFeatureEnabled } from '../../life-os/featureFlags'
import {
  addFinanceRecord,
  addHealthLog,
  addProjectBug,
  addTimelineEvent,
  assessEmergencyUtterance,
  autoPlanGoal,
  createGoal,
  createLearningPlan,
  createTravelPlan,
  findGoalByTitleHint,
  findRoutineByPhrase,
  forgetDna,
  formatDnaList,
  formatEmergencyHelp,
  formatFamilyOverview,
  formatFinanceSummary,
  formatGoals,
  formatHealthLogs,
  formatIdeas,
  formatLearningPlans,
  formatProjectStatus,
  formatRoutineRun,
  formatSkillCatalog,
  formatTimeline,
  formatTodayBrief,
  formatTravelPlans,
  markTaskDone,
  mostUrgentProject,
  nextActions,
  parseLifeOsIntent,
  planMilestones,
  previewRoutine,
  rememberDnaFromText,
  runAiMeeting,
  runRoutine,
  saveIdea,
  setSkillEnabled,
  updateGoalStatus,
  upsertFamilyMember,
  upsertProject,
  assertNoRemoteCodeInstall,
} from '../../life-os'
import type { SkillContext, SkillResult } from '../types'

export function isAvailable(): boolean {
  return true
}

export function canHandle(ctx: SkillContext): boolean {
  const lifeIntents = new Set([
    'remember_preference',
    'update_preference',
    'forget_preference',
    'show_dna',
    'create_goal',
    'update_goal',
    'list_goals',
    'complete_goal',
    'create_project_item',
    'project_status',
    'project_planning',
    'save_idea',
    'search_ideas',
    'run_ai_meeting',
    'create_routine',
    'run_routine',
    'show_timeline',
    'add_timeline_event',
    'family_overview',
    'emergency_help',
    'health_log',
    'finance_log',
    'create_travel_plan',
    'create_learning_plan',
    'list_skills',
    'enable_skill',
    'disable_skill',
    'life_today_brief',
  ])
  return lifeIntents.has(ctx.intent)
}

function ok(message: string, data: Record<string, unknown> = {}): SkillResult {
  return {
    success: true,
    status: 'completed',
    data,
    message,
    speakText: message.split('\n')[0]?.slice(0, 160),
    error: null,
  }
}

function fail(message: string): SkillResult {
  return {
    success: false,
    status: 'failed',
    data: {},
    message,
    speakText: message.slice(0, 120),
    error: { code: 'skill_failed' },
  }
}

export async function execute(ctx: SkillContext): Promise<SkillResult> {
  const text = ctx.request.normalizedText || ctx.request.text
  const parsed = parseLifeOsIntent(text)

  // Emergency first when classifier sent us here
  if (ctx.intent === 'emergency_help' || parsed?.intent === 'emergency_help') {
    if (!isLifeFeatureEnabled('emergencyModeEnabled')) {
      return fail('비상 모드가 꺼져 있습니다.')
    }
    const raw = parsed && parsed.intent === 'emergency_help' ? parsed.text : text
    const a = assessEmergencyUtterance(raw)
    if (!a.showPanel) {
      return ok('긴급 모드로 보이지 않아요. 필요하면 바로 119/112에 전화하세요.')
    }
    return ok(formatEmergencyHelp(raw), { level: a.level })
  }

  if (ctx.intent === 'life_today_brief' || parsed?.intent === 'today_brief') {
    return ok(formatTodayBrief())
  }

  if (ctx.intent === 'show_dna' || parsed?.intent === 'show_dna') {
    if (!isLifeFeatureEnabled('dnaEnabled')) return fail('DNA 기능이 꺼져 있습니다.')
    return ok(formatDnaList())
  }
  if (ctx.intent === 'forget_preference' || parsed?.intent === 'forget_preference') {
    const q = parsed && parsed.intent === 'forget_preference' ? parsed.query : text
    const r = forgetDna(q)
    return r.ok ? ok(r.message) : fail(r.message)
  }
  if (ctx.intent === 'remember_preference' || ctx.intent === 'update_preference' || parsed?.intent === 'remember_preference') {
    if (!isLifeFeatureEnabled('dnaEnabled')) return fail('DNA 기능이 꺼져 있습니다.')
    const r = rememberDnaFromText(text)
    return r.ok ? ok(r.message) : fail(r.message)
  }

  if (ctx.intent === 'list_goals' || parsed?.intent === 'list_goals') {
    return ok(formatGoals())
  }
  if (ctx.intent === 'create_goal' || parsed?.intent === 'create_goal') {
    if (!isLifeFeatureEnabled('goalsEnabled')) return fail('목표 기능이 꺼져 있습니다.')
    const title =
      parsed && parsed.intent === 'create_goal'
        ? parsed.title
        : text.replace(/^내\s*목표는\s*/i, '').replace(/(야|이야|입니다)$/i, '')
    const g = createGoal(title)
    return ok(`목표를 만들었어요: ${g.title}`)
  }
  if (parsed?.intent === 'plan_goal') {
    const g = findGoalByTitleHint(parsed.hint) || findGoalByTitleHint('')
    if (!g) return fail('나눌 목표가 없습니다.')
    const steps = autoPlanGoal(g)
    planMilestones(g.id, steps)
    return ok(`「${g.title}」 단계를 나눴어요.\n` + steps.map((s, i) => `${i + 1}. ${s}`).join('\n'))
  }
  if (parsed?.intent === 'goal_next' || ctx.intent === 'update_goal') {
    const n = nextActions(8)
    return ok(n.length ? ['【이번 할 일·다음 행동】', ...n.map((x) => `• ${x}`)].join('\n') : '다음 행동이 없습니다.')
  }
  if (parsed?.intent === 'goal_progress') {
    const g = findGoalByTitleHint(parsed.hint) || findGoalByTitleHint('')
    if (!g) return fail('목표가 없습니다.')
    return ok(`「${g.title}」 진행률 ${Math.round(g.progress * 100)}% · 상태 ${g.status}`)
  }
  if (ctx.intent === 'complete_goal' || parsed?.intent === 'complete_goal') {
    const g = findGoalByTitleHint(parsed && parsed.intent === 'complete_goal' ? parsed.hint : text)
    if (!g) return fail('완료할 목표가 없습니다.')
    updateGoalStatus(g.id, 'completed')
    return ok(`목표 완료 처리: ${g.title}`)
  }
  if (parsed?.intent === 'pause_goal') {
    const g = findGoalByTitleHint(parsed.hint)
    if (!g) return fail('중단할 목표가 없습니다.')
    updateGoalStatus(g.id, 'paused')
    return ok(`목표 일시중지: ${g.title}`)
  }

  if (ctx.intent === 'save_idea' || parsed?.intent === 'save_idea') {
    if (!isLifeFeatureEnabled('ideasEnabled')) return fail('아이디어 은행이 꺼져 있습니다.')
    const content = parsed && parsed.intent === 'save_idea' ? parsed.content : text
    const idea = saveIdea(content)
    return ok(`아이디어를 저장했어요: ${idea.title}\n원문 보존됨.`)
  }
  if (ctx.intent === 'search_ideas' || parsed?.intent === 'search_ideas') {
    const q = parsed && parsed.intent === 'search_ideas' ? parsed.query : ''
    return ok(formatIdeas(q))
  }

  if (ctx.intent === 'project_status' || parsed?.intent === 'project_status') {
    if (!isLifeFeatureEnabled('projectsEnabled')) return fail('프로젝트 기능이 꺼져 있습니다.')
    const hint = parsed && parsed.intent === 'project_status' ? parsed.hint : ''
    if (hint) upsertProject(hint)
    return ok(formatProjectStatus(hint))
  }
  if (ctx.intent === 'project_planning' || parsed?.intent === 'project_urgent') {
    const u = mostUrgentProject()
    return ok(u ? formatProjectStatus(u.name) : '시급한 프로젝트가 없습니다.')
  }
  if (parsed?.intent === 'project_bug' || ctx.intent === 'create_project_item') {
    const project = parsed && parsed.intent === 'project_bug' ? parsed.project : 'AIZIO'
    const title = parsed && parsed.intent === 'project_bug' ? parsed.title : text
    addProjectBug(project, title)
    return ok(`버그를 저장했습니다: [${project}] ${title}`)
  }
  if (parsed?.intent === 'project_done') {
    markTaskDone(parsed.project, parsed.title)
    return ok(`작업 완료로 기록했습니다: ${parsed.title}`)
  }

  if (ctx.intent === 'run_ai_meeting' || parsed?.intent === 'run_ai_meeting') {
    const topic = parsed && parsed.intent === 'run_ai_meeting' ? parsed.topic : text
    const { text: out } = await runAiMeeting(topic)
    return ok(out)
  }

  if (ctx.intent === 'show_timeline' || parsed?.intent === 'show_timeline') {
    const days = parsed && parsed.intent === 'show_timeline' ? parsed.sinceDays || 90 : 90
    const since = new Date(Date.now() - days * 86400000).toISOString()
    return ok(formatTimeline({ since }))
  }
  if (ctx.intent === 'add_timeline_event' || parsed?.intent === 'add_timeline') {
    const title = parsed && parsed.intent === 'add_timeline' ? parsed.title : text
    addTimelineEvent({ type: 'custom', title, summary: title, userPinned: true, importance: 0.8 })
    return ok('타임라인에 저장했습니다.')
  }

  if (ctx.intent === 'run_routine' || parsed?.intent === 'run_routine') {
    if (!isLifeFeatureEnabled('routinesEnabled')) return fail('자동화 Routine이 꺼져 있습니다.')
    const phrase = parsed && parsed.intent === 'run_routine' ? parsed.phrase : text
    const routine = findRoutineByPhrase(phrase)
    if (!routine) return fail('등록된 Routine이 없습니다.')
    const plan = previewRoutine(routine)
    const run = runRoutine(routine)
    return ok(`${plan}\n\n${formatRoutineRun(run, routine.name)}`)
  }

  if (ctx.intent === 'family_overview' || parsed?.intent === 'family_overview') {
    return ok(formatFamilyOverview())
  }
  if (parsed?.intent === 'family_add') {
    upsertFamilyMember(parsed.name, parsed.relation)
    return ok(`로컬 가족 프로필에 추가: ${parsed.name} (${parsed.relation})`)
  }

  if (ctx.intent === 'health_log' || parsed?.intent === 'health_log') {
    if (!isLifeFeatureEnabled('healthEnabled')) return fail('건강 Skill이 꺼져 있습니다.')
    if (parsed?.intent === 'health_log') {
      const r = addHealthLog(parsed.kind, parsed.note)
      return r.ok ? ok(`${r.message}\n${formatHealthLogs()}`) : fail(r.message)
    }
    return ok(formatHealthLogs())
  }
  if (ctx.intent === 'finance_log' || parsed?.intent === 'finance_log') {
    if (!isLifeFeatureEnabled('financeEnabled')) return fail('재무 Skill이 꺼져 있습니다.')
    if (parsed?.intent === 'finance_log') {
      const r = addFinanceRecord('expense', parsed.label, parsed.amount)
      return r.ok ? ok(`${r.message}\n${formatFinanceSummary()}`) : fail(r.message)
    }
    return ok(formatFinanceSummary())
  }
  if (ctx.intent === 'create_travel_plan' || parsed?.intent === 'create_travel_plan') {
    const title = parsed && parsed.intent === 'create_travel_plan' ? parsed.title : text
    createTravelPlan(title)
    return ok(formatTravelPlans())
  }
  if (ctx.intent === 'create_learning_plan' || parsed?.intent === 'create_learning_plan') {
    const title = parsed && parsed.intent === 'create_learning_plan' ? parsed.title : text
    createLearningPlan(title)
    return ok(formatLearningPlans())
  }

  if (ctx.intent === 'list_skills' || parsed?.intent === 'list_skills') {
    return ok(formatSkillCatalog())
  }
  if (ctx.intent === 'enable_skill' || parsed?.intent === 'enable_skill') {
    const id = parsed && parsed.intent === 'enable_skill' ? parsed.id : ''
    const hit = setSkillEnabled(id.startsWith('life-os.') ? id : `life-os.${id}`, true)
    return hit ? ok(`Skill 활성화: ${hit.name}`) : fail('Skill을 찾지 못했습니다.')
  }
  if (ctx.intent === 'disable_skill' || parsed?.intent === 'disable_skill') {
    const id = parsed && parsed.intent === 'disable_skill' ? parsed.id : ''
    const hit = setSkillEnabled(id.startsWith('life-os.') ? id : `life-os.${id}`, false)
    return hit ? ok(`Skill 비활성화: ${hit.name}`) : fail('Skill을 찾지 못했습니다.')
  }

  // Block remote install attempts
  if (/원격\s*스킬\s*설치|코드\s*설치|eval\s*실행/i.test(text)) {
    const blocked = assertNoRemoteCodeInstall()
    return fail(blocked.message)
  }

  return fail('Life OS에서 처리할 명령을 이해하지 못했어요.')
}
