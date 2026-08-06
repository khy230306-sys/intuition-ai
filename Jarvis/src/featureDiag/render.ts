import type { FeatureDiagStatus } from './collectStatus'
import { permLabel } from './collectStatus'
import type { AutoDiagReport, DiagVerdict } from './autoRun'
import type { ChecklistItem } from './checklist'

function esc(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function verdictKo(v: DiagVerdict): string {
  if (v === 'pass') return '성공'
  if (v === 'warn') return '경고'
  if (v === 'fail') return '실패'
  return '사용자 실기기 확인 필요'
}

function verdictClass(v: DiagVerdict): string {
  return `fdiag-${v}`
}

export function renderFeatureDiagPanel(opts: {
  status: FeatureDiagStatus | null
  report: AutoDiagReport | null
  checklist: ChecklistItem[]
  running: boolean
  statusText?: string
}): string {
  const st = opts.status
  const report = opts.report
  const appBlock = st
    ? `<ul class="fdiag-list">
        <li>앱 버전: <strong>${esc(st.app.version)}</strong></li>
        <li>빌드 번호: ${esc(st.app.buildId || '—')}</li>
        <li>Service Worker: ${st.app.swControlled ? '제어 중' : '미제어'}${st.app.swReady ? ' · ready' : ''}</li>
        <li>온라인/오프라인: ${st.app.online ? '온라인' : '오프라인'}</li>
        <li>PWA 설치: ${st.app.standalonePwa ? '홈 화면(standalone)' : '브라우저 탭'}</li>
        <li>저장소: ${st.app.storageWritable ? '사용 가능' : '오류'}${st.app.storageError ? ` · ${esc(st.app.storageError)}` : ''}</li>
      </ul>`
    : `<p class="hint">상태 불러오는 중…</p>`

  const prov = st
    ? `<ul class="fdiag-list">
        <li>모드: ${esc(st.providers.mode)}</li>
        <li>OpenAI: ${st.providers.openai.configured ? '키 있음' : '키 없음'} · ${esc(st.providers.openai.model || '—')} · Vision ${st.providers.openai.visionCapable ? '가능(키 기준)' : '대기'}</li>
        <li>OpenRouter: ${st.providers.openrouter.configured ? '키 있음' : '키 없음'} · ${esc(st.providers.openrouter.model || '—')}</li>
        <li>Mock: ${st.providers.mock.available ? '연결(로컬)' : '없음'}</li>
        <li>활성 Vision Provider: <strong>${esc(st.providers.activeVision)}</strong></li>
        <li>API 키 존재: ${st.providers.hasAnyKey ? '있음(값은 표시하지 않음)' : '없음'}</li>
      </ul>`
    : ''

  const perms = st
    ? `<ul class="fdiag-list">
        <li>카메라: ${esc(permLabel(st.permissions.camera))}</li>
        <li>사진 선택: 파일 선택 UI 사용(취소 시 화면 유지)</li>
        <li>위치: ${esc(permLabel(st.permissions.geolocation))}</li>
        <li>알림: ${esc(permLabel(st.permissions.notifications))}</li>
        <li>마이크: ${esc(permLabel(st.permissions.microphone))}</li>
      </ul>`
    : ''

  const data = st
    ? `<ul class="fdiag-list">
        <li>생활비서 저장 데이터 수: ${st.data.lifeAssistantStoredCount}</li>
        <li>주차 메모: ${st.data.parkingSaved ? '있음' : '없음'}</li>
        <li>Vision 기록: ${st.data.visionHistoryCount}</li>
        <li>가족 구성원: ${st.data.familyMembers}</li>
        <li>가족 일정: ${st.data.familySchedules}</li>
        <li>준비물·숙제: ${st.data.familyTasks}</li>
        <li>약 복용: ${st.data.medications}</li>
        <li>예방접종: ${st.data.vaccinations}</li>
        <li>성장기록: ${st.data.growthRecords}</li>
      </ul>`
    : ''

  const errs = st
    ? `<ul class="fdiag-list">
        <li>생활비서: ${st.recentErrors.life[0] ? esc(st.recentErrors.life[0]) : '없음'}</li>
        <li>Vision: ${st.recentErrors.vision[0] ? esc(st.recentErrors.vision[0]) : '없음'}</li>
        <li>가족: ${st.recentErrors.family[0] ? esc(st.recentErrors.family[0]) : '없음'}</li>
        <li>저장소: ${st.recentErrors.storage[0] ? esc(st.recentErrors.storage[0]) : '없음'}</li>
        <li>Provider: ${st.recentErrors.provider[0] ? esc(st.recentErrors.provider[0]) : '없음'}</li>
      </ul>`
    : ''

  const reportHtml = report
    ? `<div class="fdiag-report">
        <p><strong>자동 진단</strong> · 성공 ${report.summary.pass} · 경고 ${report.summary.warn} · 실패 ${report.summary.fail} · 실기기 ${report.summary.needs_device}</p>
        <ul class="fdiag-steps">
          ${report.steps
            .map(
              (s) =>
                `<li class="${verdictClass(s.verdict)}"><span class="fdiag-v">${verdictKo(s.verdict)}</span> <strong>${esc(s.label)}</strong> — ${esc(s.detail)}${s.code ? ` <code>${esc(s.code)}</code>` : ''}</li>`,
            )
            .join('')}
        </ul>
      </div>`
    : `<p class="hint">「3개 기능 전체 자동 진단」을 누르면 Mock·로컬 검증을 실행합니다. 사용자 데이터는 보존하고 테스트 항목만 정리합니다.</p>`

  const checklistHtml = `
    <ol class="fdiag-check">
      ${opts.checklist
        .map(
          (c) => `<li>
            <span>${esc(c.id)}. ${esc(c.label)}</span>
            <span class="row-btns">
              <button type="button" class="ghost-btn tiny ${c.status === 'ok' ? 'active' : ''}" data-fdiag-check="${esc(c.id)}" data-status="ok">정상</button>
              <button type="button" class="ghost-btn tiny ${c.status === 'issue' ? 'active' : ''}" data-fdiag-check="${esc(c.id)}" data-status="issue">문제 있음</button>
            </span>
          </li>`,
        )
        .join('')}
    </ol>`

  return `
    <details class="device-test-panel fdiag-panel" data-feature-diag="1" open>
      <summary><strong>생활비서·카메라·가족 기능 진단</strong></summary>
      <p class="hint">Stage 7 실기기 검증용. API 키·원본 사진·민감정보는 표시하지 않습니다. 현재 v${esc(st?.app.version || '')}</p>
      ${opts.statusText ? `<p class="hint" data-fdiag-status>${esc(opts.statusText)}</p>` : ''}

      <h3 class="subsection-title">앱 상태</h3>
      ${appBlock}
      <h3 class="subsection-title">AI Provider</h3>
      ${prov}
      <h3 class="subsection-title">권한 상태</h3>
      ${perms}
      <h3 class="subsection-title">데이터 상태</h3>
      ${data}
      <h3 class="subsection-title">최근 오류</h3>
      ${errs}

      <div class="row-btns">
        <button type="button" class="primary-btn" data-action="fdiag-refresh" ${opts.running ? 'disabled' : ''}>상태 새로고침</button>
        <button type="button" class="primary-btn" data-action="fdiag-autorun" ${opts.running ? 'disabled' : ''}>
          ${opts.running ? '진단 중…' : '3개 기능 전체 자동 진단'}
        </button>
      </div>
      <div class="row-btns">
        <button type="button" class="ghost-btn" data-action="fdiag-check-update">새 버전 확인</button>
        <button type="button" class="ghost-btn" data-action="fdiag-cache-refresh">앱 캐시만 새로고침</button>
        <button type="button" class="ghost-btn" data-action="fdiag-copy">진단 정보 복사</button>
        <button type="button" class="ghost-btn" data-action="fdiag-export">진단 JSON 내보내기</button>
      </div>
      <p class="hint">앱 캐시만 새로고침은 가족·일정·주차·Vision 기록 등 <strong>사용자 데이터를 삭제하지 않습니다</strong>.</p>

      <h3 class="subsection-title">자동 진단 결과</h3>
      ${reportHtml}

      <h3 class="subsection-title">아이폰 실기기 체크리스트</h3>
      <p class="hint">아래 순서로 확인한 뒤 정상/문제 있음을 눌러 주세요. 진행 상태는 이 기기에만 저장됩니다.</p>
      ${checklistHtml}
    </details>
  `
}
