export type SkillPermission =
  | 'read_goals'
  | 'write_goals'
  | 'read_calendar'
  | 'write_calendar'
  | 'read_projects'
  | 'network_access'
  | 'open_external_url'
  | 'notification'

export type SkillManifest = {
  id: string
  name: string
  version: string
  description: string
  author: string
  supportedIntents: string[]
  permissions: SkillPermission[]
  requiresNetwork: boolean
  requiresApiKey: boolean
  entryType: 'builtin' | 'remote-service'
  status: 'draft' | 'reviewed' | 'approved' | 'disabled'
  enabled: boolean
}

const FORBIDDEN = ['eval', 'remote-code', 'arbitrary-js', 'full-storage', 'api-key-access'] as const

export function validateManifest(m: Partial<SkillManifest>): { ok: boolean; errors: string[] } {
  const errors: string[] = []
  if (!m.id || !/^[a-z0-9._-]+$/i.test(m.id)) errors.push('invalid id')
  if (!m.name) errors.push('missing name')
  if (!m.version) errors.push('missing version')
  if (m.entryType === 'remote-service' && m.status !== 'approved') {
    errors.push('remote-service requires approved status')
  }
  if ((m.permissions || []).includes('network_access') && m.requiresNetwork !== true) {
    errors.push('network_access requires requiresNetwork')
  }
  return { ok: errors.length === 0, errors }
}

export function assertNoRemoteCodeInstall(): { ok: false; message: string } {
  return {
    ok: false,
    message: '원격 코드 다운로드·설치·eval은 Skill Store에서 금지되어 있습니다.',
  }
}

export const BUILTIN_SKILL_CATALOG: SkillManifest[] = [
  {
    id: 'life-os.dna',
    name: 'AIZIO DNA',
    version: '1.0.0',
    description: '명시적 선호·관심 기억',
    author: 'AIZIO',
    supportedIntents: ['remember_preference', 'show_dna', 'forget_preference'],
    permissions: [],
    requiresNetwork: false,
    requiresApiKey: false,
    entryType: 'builtin',
    status: 'approved',
    enabled: true,
  },
  {
    id: 'life-os.goals',
    name: 'Goal Manager',
    version: '1.0.0',
    description: '목표·마일스톤',
    author: 'AIZIO',
    supportedIntents: ['create_goal', 'list_goals', 'complete_goal'],
    permissions: ['read_goals', 'write_goals'],
    requiresNetwork: false,
    requiresApiKey: false,
    entryType: 'builtin',
    status: 'approved',
    enabled: true,
  },
  {
    id: 'life-os.ideas',
    name: 'Idea Bank',
    version: '1.0.0',
    description: '아이디어 저장·검색',
    author: 'AIZIO',
    supportedIntents: ['save_idea', 'search_ideas'],
    permissions: [],
    requiresNetwork: false,
    requiresApiKey: false,
    entryType: 'builtin',
    status: 'approved',
    enabled: true,
  },
]

export function listSkillCatalog(): SkillManifest[] {
  return BUILTIN_SKILL_CATALOG.map((s) => ({ ...s }))
}

export function setSkillEnabled(id: string, enabled: boolean): SkillManifest | null {
  const s = BUILTIN_SKILL_CATALOG.find((x) => x.id === id)
  if (!s) return null
  s.enabled = enabled
  if (!enabled) s.status = 'disabled'
  else if (s.status === 'disabled') s.status = 'approved'
  return { ...s }
}

export function formatSkillCatalog(): string {
  return [
    '【AIZIO Skill Store · 기반】',
    '외부 임의 코드 설치 없음. 기본 builtin Skill만 표시합니다.',
    ...listSkillCatalog().map(
      (s) => `• ${s.name} v${s.version} · ${s.enabled ? 'ON' : 'OFF'} · ${s.status}`,
    ),
    `금지: ${FORBIDDEN.join(', ')}`,
  ].join('\n')
}
