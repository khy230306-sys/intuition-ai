/**
 * Local parsers for Life OS utterances. Returns null when not a Life OS command.
 */

export type LifeOsParsedIntent =
  | { intent: 'remember_preference'; text: string }
  | { intent: 'show_dna' }
  | { intent: 'forget_preference'; query: string }
  | { intent: 'create_goal'; title: string }
  | { intent: 'list_goals' }
  | { intent: 'complete_goal'; hint: string }
  | { intent: 'pause_goal'; hint: string }
  | { intent: 'plan_goal'; hint: string }
  | { intent: 'goal_progress'; hint: string }
  | { intent: 'goal_next' }
  | { intent: 'save_idea'; content: string }
  | { intent: 'search_ideas'; query: string }
  | { intent: 'project_status'; hint: string }
  | { intent: 'project_bug'; project: string; title: string }
  | { intent: 'project_done'; project: string; title: string }
  | { intent: 'project_urgent' }
  | { intent: 'run_ai_meeting'; topic: string }
  | { intent: 'show_timeline'; sinceDays?: number }
  | { intent: 'add_timeline'; title: string }
  | { intent: 'run_routine'; phrase: string }
  | { intent: 'family_overview' }
  | { intent: 'family_add'; name: string; relation: string }
  | { intent: 'emergency_help'; text: string }
  | { intent: 'health_log'; kind: 'water' | 'sleep' | 'exercise' | 'other'; note: string }
  | { intent: 'finance_log'; label: string; amount: number }
  | { intent: 'create_travel_plan'; title: string }
  | { intent: 'create_learning_plan'; title: string }
  | { intent: 'list_skills' }
  | { intent: 'enable_skill'; id: string }
  | { intent: 'disable_skill'; id: string }
  | { intent: 'today_brief' }

export function parseLifeOsIntent(raw: string): LifeOsParsedIntent | null {
  const text = String(raw || '').trim()
  if (!text) return null

  if (/오늘\s*뭐\s*해야|오늘\s*할\s*일\s*알려|오늘\s*브리핑\s*생활/i.test(text)) {
    return { intent: 'today_brief' }
  }

  if (/무엇을\s*좋아|dna|내\s*선호|기억하고\s*있어|내가\s*무엇을\s*좋아/i.test(text)) {
    return { intent: 'show_dna' }
  }
  if (/그\s*기억(?:은|을)?\s*삭제|기억\s*삭제|dna\s*삭제|선호\s*삭제/i.test(text)) {
    return { intent: 'forget_preference', query: text }
  }
  if (
    /나는\s*.+좋아|짧은\s*답변|긴\s*답변|취미는|명령어는\s*한\s*번에/i.test(text) ||
    // 「잔잔한 음악」 alone is often a play request — require preference framing
    (/(잔잔한|조용한)\s*음악/.test(text) && /나는|좋아|선호|기억해/.test(text))
  ) {
    return { intent: 'remember_preference', text }
  }

  if (/진행률|얼마나\s*됐/i.test(text) && /목표/.test(text)) {
    return { intent: 'goal_progress', hint: text }
  }
  if (/목표.*중단|목표는\s*잠시/i.test(text)) {
    return { intent: 'pause_goal', hint: text }
  }
  if (/목표.*완료|목표는\s*완료/i.test(text)) {
    return { intent: 'complete_goal', hint: text }
  }
  if (/단계별로\s*나눠|목표.*나눠|마일스톤/i.test(text)) {
    return { intent: 'plan_goal', hint: text }
  }
  if (/이번\s*주에\s*해야|다음\s*행동|목표.*다음/i.test(text)) {
    return { intent: 'goal_next' }
  }
  if (/목표\s*목록|내\s*목표\s*보여|목표\s*보여/i.test(text)) {
    return { intent: 'list_goals' }
  }
  const goalM = text.match(/내\s*목표는\s*(.+)$/i) || text.match(/목표는\s*(.+?)(?:야|이야|입니다)/i)
  if (goalM?.[1]) return { intent: 'create_goal', title: goalM[1].trim() }

  if (/아이디어\s*(은행|목록|보여|검색)|예전에\s*.*아이디어|음악\s*관련\s*아이디어/i.test(text)) {
    const q = text.replace(/.*아이디어\s*/i, '').replace(/보여줘|검색|찾아/g, '').trim()
    return { intent: 'search_ideas', query: q || '음악' }
  }
  if (/아이디어(?:로|를)?\s*저장|좋은\s*아이디어|나중에\s*검토할\s*아이디어/i.test(text)) {
    return { intent: 'save_idea', content: text }
  }

  if (/가장\s*시급한\s*프로젝트/i.test(text)) return { intent: 'project_urgent' }
  const bugM = text.match(/(.+?)\s*프로젝트\s*버그(?:로)?\s*(?:저장)?[:\s]*(.+)$/i) || text.match(/이\s*오류를\s*(.+?)\s*버그/i)
  if (bugM) {
    return {
      intent: 'project_bug',
      project: (bugM[1] || 'AIZIO').trim(),
      title: (bugM[2] || text).trim(),
    }
  }
  if (/오늘\s*작업\s*완료|작업\s*완료로\s*기록/i.test(text)) {
    return { intent: 'project_done', project: 'AIZIO', title: '오늘 작업' }
  }
  if (/프로젝트\s*(상태|현황|진행|어디까지)|nexus/i.test(text)) {
    const hint = /nexus/i.test(text) ? 'NEXUS' : /aizio|아이지오/i.test(text) ? 'AIZIO' : ''
    return { intent: 'project_status', hint }
  }

  if (/ai\s*회의|회의로\s*검토|개발·?ux·?보안|반대\s*의견도/i.test(text)) {
    return { intent: 'run_ai_meeting', topic: text.replace(/.*검토해\s*줘\s*/i, '').trim() || text }
  }

  if (/타임라인에\s*저장|인생\s*타임라인/i.test(text)) {
    return { intent: 'add_timeline', title: text }
  }
  if (/지난달\s*중요|올해\s*완료한\s*목표|타임라인\s*보여|중요한\s*일\s*보여/i.test(text)) {
    const sinceDays = /지난달/.test(text) ? 31 : /올해/.test(text) ? 370 : 90
    return { intent: 'show_timeline', sinceDays }
  }

  if (/^(잘\s*자|잘자|굿나잇|좋은\s*아침|굿모닝|출근)[!.,\s]*$/i.test(text) || /good\s*night|good\s*morning/i.test(text)) {
    return { intent: 'run_routine', phrase: text }
  }

  if (/가족\s*(공간|프로필|구성원)|family\s*overview/i.test(text)) {
    return { intent: 'family_overview' }
  }
  const fam = text.match(/가족\s*프로필에\s*(.+?)\s*(?:추가|등록).*?(엄마|아빠|아들|딸|배우자|형제|친구)?/i)
  if (fam) {
    return { intent: 'family_add', name: fam[1].trim(), relation: fam[2] || '가족' }
  }

  if (
    /119|112|긴급\s*상황|숨을\s*못|쓰러졌|피가\s*나/i.test(text) ||
    /^(도와줘|살려줘|help)[!?.,\s]*$/i.test(text)
  ) {
    return { intent: 'emergency_help', text }
  }

  if (/물\s*마셨|수분\s*기록/i.test(text)) return { intent: 'health_log', kind: 'water', note: text }
  if (/운동\s*했|운동\s*기록/i.test(text)) return { intent: 'health_log', kind: 'exercise', note: text }
  if (/수면\s*기록|잠\s*잤/i.test(text)) return { intent: 'health_log', kind: 'sleep', note: text }

  const exp = text.match(/(?:재무\s*)?지출\s*기록\s*(.+?)\s*(\d+)\s*원?/i)
  if (exp) return { intent: 'finance_log', label: exp[1].trim(), amount: Number(exp[2]) }

  const travel = text.match(/여행\s*계획\s*(?:세워|만들)?\s*(.+)$/i)
  if (travel?.[1]) return { intent: 'create_travel_plan', title: travel[1].trim() }

  const learn = text.match(/학습\s*계획\s*(?:세워|만들)?\s*(.+)$/i)
  if (learn?.[1]) return { intent: 'create_learning_plan', title: learn[1].trim() }

  if (/skill\s*store|스킬\s*(목록|스토어)|설치된\s*스킬/i.test(text)) return { intent: 'list_skills' }
  const en = text.match(/스킬\s*(.+?)\s*(켜|활성화)/i)
  if (en) return { intent: 'enable_skill', id: en[1].trim() }
  const dis = text.match(/스킬\s*(.+?)\s*(끄|비활성화)/i)
  if (dis) return { intent: 'disable_skill', id: dis[1].trim() }

  return null
}
