export type LifeOs2ErrorCode =
  | 'flag_disabled'
  | 'insufficient_data'
  | 'not_found'
  | 'unsafe_action'
  | 'user_rejected'
  | 'stale'
  | 'loop_guard'
  | 'partial'

export class LifeOs2Error extends Error {
  code: LifeOs2ErrorCode
  constructor(code: LifeOs2ErrorCode, message: string) {
    super(message)
    this.code = code
    this.name = 'LifeOs2Error'
  }
}

export function userFacingLos2Error(code: LifeOs2ErrorCode): string {
  switch (code) {
    case 'flag_disabled':
      return '이 기능이 꺼져 있습니다. Life OS 2.0 설정에서 켤 수 있어요.'
    case 'insufficient_data':
      return '데이터가 부족해 예측·추천하지 않았습니다.'
    case 'not_found':
      return '해당하는 항목을 찾지 못했어요.'
    case 'unsafe_action':
      return '안전을 위해 이 자동화 행동은 차단했습니다.'
    case 'user_rejected':
      return '이전에 거부하셔서 다시 제안하지 않습니다.'
    case 'stale':
      return '정보가 오래되어 사용하지 않았습니다.'
    case 'loop_guard':
      return '반복 실행을 막아 두었습니다.'
    case 'partial':
      return '일부만 완료되었습니다.'
    default:
      return '요청을 처리하지 못했어요.'
  }
}
