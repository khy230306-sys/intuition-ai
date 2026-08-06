/** iPhone device validation checklist (local progress only). */

export type ChecklistItem = {
  id: string
  label: string
  status: 'unset' | 'ok' | 'issue'
}

const KEY = 'aizio_feature_device_checklist_v1'

export const DEVICE_CHECKLIST_DEFAULT: ChecklistItem[] = [
  { id: '1', label: '앱 실행', status: 'unset' },
  { id: '2', label: '버전 확인 (설정·진단 화면)', status: 'unset' },
  { id: '3', label: '오늘의 브리핑 확인', status: 'unset' },
  { id: '4', label: '채팅: 내일 오후 3시에 병원 일정 추가해줘', status: 'unset' },
  { id: '5', label: '생성된 일정 확인 (가족 도우미)', status: 'unset' },
  { id: '6', label: '카메라 열기', status: 'unset' },
  { id: '7', label: '문서/안내문 촬영', status: 'unset' },
  { id: '8', label: 'OCR 결과 확인', status: 'unset' },
  { id: '9', label: '일정 만들기 실행', status: 'unset' },
  { id: '10', label: '가족 도우미 열기', status: 'unset' },
  { id: '11', label: '가족 구성원 추가', status: 'unset' },
  { id: '12', label: '가족 일정 추가', status: 'unset' },
  { id: '13', label: '앱 완전 종료', status: 'unset' },
  { id: '14', label: '다시 실행', status: 'unset' },
  { id: '15', label: '데이터 복원 확인', status: 'unset' },
  { id: '16', label: '비행기 모드에서 앱 실행', status: 'unset' },
  { id: '17', label: '로컬 가족 일정 조회', status: 'unset' },
  { id: '18', label: '온라인 복귀', status: 'unset' },
  { id: '19', label: 'Vision 재시도', status: 'unset' },
  { id: '20', label: '진단 JSON 내보내기', status: 'unset' },
]

export function loadDeviceChecklist(): ChecklistItem[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return DEVICE_CHECKLIST_DEFAULT.map((x) => ({ ...x }))
    const parsed = JSON.parse(raw) as ChecklistItem[]
    if (!Array.isArray(parsed) || parsed.length < 10) {
      return DEVICE_CHECKLIST_DEFAULT.map((x) => ({ ...x }))
    }
    // Merge with defaults (ids)
    return DEVICE_CHECKLIST_DEFAULT.map((d) => {
      const hit = parsed.find((p) => p.id === d.id)
      return hit ? { ...d, status: hit.status || 'unset' } : { ...d }
    })
  } catch {
    return DEVICE_CHECKLIST_DEFAULT.map((x) => ({ ...x }))
  }
}

export function saveDeviceChecklist(items: ChecklistItem[]): void {
  localStorage.setItem(KEY, JSON.stringify(items))
}

export function setChecklistStatus(id: string, status: ChecklistItem['status']): ChecklistItem[] {
  const items = loadDeviceChecklist().map((it) => (it.id === id ? { ...it, status } : it))
  saveDeviceChecklist(items)
  return items
}
