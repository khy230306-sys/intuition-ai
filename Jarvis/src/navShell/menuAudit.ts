/**
 * Menu accessibility audit for diagnostics.
 */

import { FEATURE_CATALOG, catalogTargetViews, type FeatureEntry } from './featureCatalog'
import { PRIMARY_TABS } from './primaryTabs'
import type { View } from '../types'

export type AuditStatus = 'ok' | 'needs_cleanup' | 'unreachable' | 'duplicate'

export type AuditItem = {
  id: string
  label: string
  status: AuditStatus
  detail: string
}

export type MenuAuditReport = {
  generatedAt: string
  menuCount: number
  screenCount: number
  primaryTabs: number
  items: AuditItem[]
  summary: Record<AuditStatus, number>
}

const KNOWN_VIEWS: View[] = [
  'home',
  'chat',
  'schedule',
  'more',
  'invest',
  'life',
  'family',
  'friends',
  'games',
  'actions',
  'settings',
  'global',
  'customers',
  'navigation',
  'ai-camera',
  'family-helper',
  'travel',
  'restaurant',
]

export function runMenuAudit(): MenuAuditReport {
  const items: AuditItem[] = []
  const titleMap = new Map<string, FeatureEntry[]>()

  for (const f of FEATURE_CATALOG) {
    const key = f.title.trim()
    const arr = titleMap.get(key) || []
    arr.push(f)
    titleMap.set(key, arr)

    if (!KNOWN_VIEWS.includes(f.view)) {
      items.push({
        id: f.id,
        label: f.title,
        status: 'unreachable',
        detail: `알 수 없는 view: ${f.view}`,
      })
    } else {
      items.push({
        id: f.id,
        label: f.title,
        status: 'ok',
        detail: `→ ${f.view}${f.action ? ` · ${f.action}` : ''}`,
      })
    }
  }

  for (const [title, list] of titleMap) {
    if (list.length > 1) {
      items.push({
        id: `dup-${title}`,
        label: title,
        status: 'duplicate',
        detail: `동일 제목 진입점 ${list.length}개: ${list.map((x) => x.id).join(', ')}`,
      })
    }
  }

  // Duplicate family-helper style entries flagged as cleanup if multiple primary paths
  const familyPaths = FEATURE_CATALOG.filter((f) => f.view === 'family-helper' || f.view === 'family')
  if (familyPaths.length > 2) {
    items.push({
      id: 'family-paths',
      label: '가족 진입점',
      status: 'needs_cleanup',
      detail: `${familyPaths.length}개 경로 (의도된 통합 진입 허용)`,
    })
  }

  items.push({
    id: 'primary-tabs',
    label: '하단 탭',
    status: PRIMARY_TABS.length <= 5 ? 'ok' : 'needs_cleanup',
    detail: `${PRIMARY_TABS.length}개 (최대 5)`,
  })

  const summary: Record<AuditStatus, number> = {
    ok: 0,
    needs_cleanup: 0,
    unreachable: 0,
    duplicate: 0,
  }
  for (const i of items) summary[i.status]++

  return {
    generatedAt: new Date().toISOString(),
    menuCount: FEATURE_CATALOG.length,
    screenCount: catalogTargetViews().length,
    primaryTabs: PRIMARY_TABS.length,
    items,
    summary,
  }
}

export function exportMenuStructureJson(): string {
  return JSON.stringify(
    {
      primaryTabs: PRIMARY_TABS,
      features: FEATURE_CATALOG.map((f) => ({
        id: f.id,
        title: f.title,
        group: f.group,
        view: f.view,
        action: f.action || null,
        keywords: f.keywords,
      })),
      audit: runMenuAudit(),
    },
    null,
    2,
  )
}
