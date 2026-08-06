import { beforeEach, describe, expect, it, vi } from 'vitest'
import { runReleaseHealthCheck, renderReleaseHealthPanel } from './releaseHealth'
import { resetFamilyHelperStoreForTests } from '../family-helper/store'
import { clearInterpretMode } from '../translateBrain'
import { resetQuickActions } from '../navShell/quickActions'

const store = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => store.set(k, v),
  removeItem: (k: string) => store.delete(k),
  clear: () => store.clear(),
})
vi.stubGlobal('navigator', {
  onLine: true,
  language: 'ko-KR',
  permissions: { query: async () => ({ state: 'prompt' }) },
  serviceWorker: undefined,
})

describe('release health check', () => {
  beforeEach(() => {
    store.clear()
    resetFamilyHelperStoreForTests()
    clearInterpretMode()
    resetQuickActions()
  })

  it('runs without throwing and scores readiness', async () => {
    const report = await runReleaseHealthCheck({ version: '1.23.1' })
    expect(report.version).toBe('1.23.1')
    expect(report.items.length).toBeGreaterThan(15)
    expect(report.summary.PASS + report.summary.WARNING + report.summary.FAIL + report.summary.USER_TEST_REQUIRED).toBe(
      report.items.length,
    )
    expect(report.readinessPercent).toBeGreaterThanOrEqual(50)
    expect(report.readinessPercent).toBeLessThanOrEqual(100)
    expect(report.summary.FAIL).toBe(0)
    // eslint-disable-next-line no-console
    console.log(
      `[release-health] readiness=${report.readinessPercent}% PASS=${report.summary.PASS} WARN=${report.summary.WARNING} FAIL=${report.summary.FAIL} USER=${report.summary.USER_TEST_REQUIRED}`,
    )
    expect(report.items.some((i) => i.id === 'secret-redact' && i.verdict === 'PASS')).toBe(true)
    expect(report.items.some((i) => i.id === 'translate-pane' && i.verdict === 'PASS')).toBe(true)
    expect(report.items.some((i) => i.id === 'family-crud' && i.verdict === 'PASS')).toBe(true)
    expect(report.items.some((i) => i.id === 'quick-actions' && i.verdict === 'PASS')).toBe(true)
    expect(report.items.some((i) => i.verdict === 'USER_TEST_REQUIRED')).toBe(true)
  })

  it('renders panel with readiness percent', async () => {
    const report = await runReleaseHealthCheck({ version: '1.23.1' })
    const html = renderReleaseHealthPanel(report)
    expect(html).toContain('출시 준비도')
    expect(html).toContain('data-release-health')
    expect(html).toContain('data-action="release-health-run"')
    expect(html).not.toMatch(/sk-[A-Za-z0-9]{10,}/)
  })

  it('empty panel has run button', () => {
    const html = renderReleaseHealthPanel(null)
    expect(html).toContain('출시 준비 검사 실행')
    expect(html).toContain('data-action="release-health-run"')
  })
})
