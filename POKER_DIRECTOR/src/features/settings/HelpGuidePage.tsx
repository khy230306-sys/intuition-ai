import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import clsx from 'clsx'

type Section = {
  id: string
  title: string
  summary: string
  steps: string[]
  tips?: string[]
  link?: { to: string; label: string }
}

const sections: Section[] = [
  {
    id: 'start',
    title: '1. 시작하기',
    summary: '로그인 후 바로 데모 토너먼트를 조작할 수 있습니다.',
    steps: [
      '앱을 열고 데모 계정으로 로그인합니다. (admin / 1234)',
      '또는 로그인 화면의 「데모 계정으로 바로 입장」을 누릅니다.',
      '홈(대시보드)에서 「POKER DIRECTOR 오픈」 데모 토너먼트를 확인합니다.',
      '하단 메뉴: 홈 · 타이머 · 참가자 · 테이블 · 더보기',
    ],
    tips: ['휴대폰에서는 브라우저 메뉴로 홈 화면에 추가하면 PWA처럼 사용할 수 있습니다.'],
  },
  {
    id: 'money',
    title: '2. 게임 금액 설정',
    summary: '바이인, 참가비, 리바이, 애드온, 보장상금을 원하는 대로 바꿉니다.',
    steps: [
      '더보기 → 「게임 금액 설정」으로 이동합니다.',
      '대상 토너먼트를 선택합니다.',
      '바이인 / 참가비 / 보장 상금 / 시작 스택을 입력합니다.',
      '리바이·리엔트리·애드온 비용과 지급 칩을 각각 설정합니다.',
      '바운티를 쓰면 기본 바운티 금액을 입력합니다.',
      '「금액 설정 저장」을 누릅니다.',
    ],
    tips: [
      '금액은 원 단위 숫자로 입력합니다. (예: 100000)',
      '저장 후 상금이 자동 재계산됩니다. 필요하면 「상금 계산」에서 다시 확인하세요.',
    ],
    link: { to: '/money', label: '금액 설정 열기' },
  },
  {
    id: 'create',
    title: '3. 새 토너먼트 만들기',
    summary: '현장 규칙에 맞는 토너먼트를 새로 만듭니다.',
    steps: [
      '홈 또는 더보기에서 「새 토너먼트」를 누릅니다.',
      '이름, 날짜, 시작 시간, 테이블 수, 좌석 수를 입력합니다.',
      '게임 금액(바이인·참가비·보장상금)을 설정합니다.',
      '리바이/리엔트리/애드온 허용 여부와 금액을 정합니다.',
      '블라인드 템플릿을 고른 뒤 「임시 저장 후 블라인드 편집」 또는 「즉시 시작」합니다.',
    ],
    link: { to: '/tournaments/new', label: '새 토너먼트 만들기' },
  },
  {
    id: 'blinds',
    title: '4. 블라인드 구조',
    summary: '레벨 시간, SB/BB, 앤티, 브레이크를 편집합니다.',
    steps: [
      '토너먼트 상세 → 「블라인드 편집」으로 이동합니다.',
      '템플릿 불러오기 / 자동 생성으로 기본 구조를 만듭니다.',
      '각 레벨의 시간·블라인드·앤티를 수정합니다.',
      '레벨 추가, 복제, 순서 변경, 브레이크 삽입이 가능합니다.',
      '전체 시간 일괄 수정으로 모든 레벨 길이를 한번에 바꿀 수 있습니다.',
    ],
  },
  {
    id: 'timer',
    title: '5. 타이머 조작',
    summary: '현장에서 가장 자주 쓰는 블라인드 타이머입니다.',
    steps: [
      '하단 「타이머」로 이동합니다.',
      '「시작」을 누르면 시간이 초 단위로 감소합니다.',
      '「일시정지」로 멈출 수 있고, 다시 「시작」하면 이어서 진행됩니다.',
      '다음/이전 레벨, 레벨 선택으로 현재 단계를 바꿉니다.',
      '시간 조절: +1/+5분, -1/-5분, 분·초 입력, 12:30 형식 입력을 지원합니다.',
      '큰 숫자(남은 시간)를 탭하면 시간 수정 안내가 표시됩니다.',
      '「전체 화면 TV」로 TV/보조 모니터용 화면을 엽니다.',
    ],
    tips: [
      '새로고침해도 타이머 상태가 복구됩니다.',
      '탭을 백그라운드로 보내도 실제 경과 시간 기준으로 계산됩니다.',
    ],
    link: { to: '/timer', label: '타이머 열기' },
  },
  {
    id: 'players',
    title: '6. 참가자 등록·관리',
    summary: '등록, 체크인, 탈락, 리바이/애드온을 처리합니다.',
    steps: [
      '「참가자」메뉴로 이동합니다.',
      '이름 입력 후 등록하거나, 여러 명을 줄바꿈으로 일괄 등록합니다.',
      'CSV 가져오기/내보내기를 사용할 수 있습니다.',
      '참가자를 탭하면 상세에서 체크인, 탈락, 리바이, 리엔트리, 애드온을 처리합니다.',
      '좌석 미리보기 → 좌석 배정 확정으로 자동 배석합니다.',
      '참가자 상세의 조회 코드로 플레이어 화면을 공유합니다.',
    ],
    link: { to: '/players', label: '참가자 관리 열기' },
  },
  {
    id: 'tables',
    title: '7. 테이블·밸런싱·브레이크',
    summary: '테이블 인원을 맞추고 이동을 안내합니다.',
    steps: [
      '「테이블」메뉴에서 각 테이블 인원과 칩을 확인합니다.',
      '플레이어를 탭해 다른 테이블/좌석으로 수동 이동합니다.',
      '「밸런싱 추천」→ 추천 확인 후 「추천 적용」.',
      '인원이 줄면 「브레이크 추천」→ 이동 안내 확인 후 「브레이크 확정」.',
      '파이널 테이블 인원이 되면 「파이널 테이블」로 좌석을 추첨할 수 있습니다.',
    ],
    link: { to: '/tables', label: '테이블 관리 열기' },
  },
  {
    id: 'payouts',
    title: '8. 상금 계산',
    summary: '총 상금을 나누고 저장합니다.',
    steps: [
      '더보기 → 「상금 계산」또는 「게임 금액 수정」에서 금액을 맞춥니다.',
      '템플릿(상위 1/2/3명, 상위 10% 등)을 적용합니다.',
      '퍼센트·금액을 직접 수정할 수 있습니다.',
      '합계가 총 상금과 일치할 때만 저장됩니다.',
    ],
    link: { to: '/payouts', label: '상금 계산 열기' },
  },
  {
    id: 'tv-player',
    title: '9. TV 화면 / 바인 체크판 / 플레이어 조회',
    summary: '듀얼 모니터: 왼쪽 시계, 오른쪽 바인(正) 체크.',
    steps: [
      '왼쪽 모니터: 홈/타이머/더보기에서 「TV 화면 열기」→ 전체화면.',
      '오른쪽 모니터: 「바인 체크판 열기」→ 전체화면. 종이 장부처럼 正으로 바인 횟수가 표시됩니다.',
      '체크 모드에서 +/− 를 누르면 바인이 바로 반영되고, 다른 탭/모니터에도 동기화됩니다.',
      '正 하나 = 바인 5회. 리바이/리엔트리를 해도 체크 수가 같이 올라갑니다.',
      '참가자 상세의 조회 코드 링크로 플레이어가 자신의 좌석·블라인드를 확인합니다.',
    ],
  },
  {
    id: 'notice',
    title: '10. 공지·호출·Undo',
    summary: '현장 안내와 실수 복구입니다.',
    steps: [
      '더보기 → 「공지 / 호출」에서 전체 공지를 올립니다.',
      '스태프 화면에서 디렉터 호출, 칩/카드 요청을 보낼 수 있습니다.',
      '주요 작업은 자동으로 기록되며, 상단/더보기의 Undo로 최근 작업을 취소할 수 있습니다.',
      '더보기에서 백업 내보내기/복구, 데모 초기화가 가능합니다.',
    ],
    link: { to: '/announcements', label: '공지 화면 열기' },
  },
  {
    id: 'mobile',
    title: '11. 휴대폰 사용 팁',
    summary: '한 대로 현장에서 운영할 때 참고하세요.',
    steps: [
      '하단 메뉴로 주요 화면에 바로 이동합니다.',
      '화면이 길면 손가락으로 위아래로 스크롤하세요. 하단 메뉴에 가려지지 않도록 여백이 있습니다.',
      '위험 작업(탈락, 브레이크 확정 등)은 확인 창이 뜹니다.',
      '가로/세로 화면 모두 지원합니다.',
    ],
    tips: [
      'iPhone: Safari 공유 → 홈 화면에 추가',
      'Android: Chrome 메뉴 → 앱 설치 / 홈 화면에 추가',
    ],
  },
]

function GuideSection({ section, open, onToggle }: { section: Section; open: boolean; onToggle: () => void }) {
  return (
    <Card className="!p-0 overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start justify-between gap-3 px-4 py-4 text-left"
      >
        <div>
          <div className="font-semibold">{section.title}</div>
          <div className="mt-1 text-sm text-mute">{section.summary}</div>
        </div>
        <span className="pd-num mt-1 text-gold">{open ? '−' : '+'}</span>
      </button>
      {open ? (
        <div className="space-y-3 border-t border-line px-4 py-4">
          <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed">
            {section.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          {section.tips?.length ? (
            <div className="rounded-xl bg-felt-2 px-3 py-3 text-sm text-gold-soft">
              {section.tips.map((tip) => (
                <div key={tip}>• {tip}</div>
              ))}
            </div>
          ) : null}
          {section.link ? (
            <Link
              to={section.link.to}
              className="inline-flex min-h-11 items-center rounded-xl bg-gold px-4 text-sm font-medium text-black"
            >
              {section.link.label}
            </Link>
          ) : null}
        </div>
      ) : null}
    </Card>
  )
}

export function HelpGuidePage() {
  const [openId, setOpenId] = useState<string | 'all' | null>('start')
  const allOpen = openId === 'all'

  return (
    <div className="space-y-4">
      <div>
        <div className="pd-title text-3xl text-gold">사용 설명서</div>
        <p className="mt-1 text-sm text-mute">
          POKER DIRECTOR를 현장에서 바로 쓰는 순서 안내입니다. 항목을 눌러 펼치세요.
        </p>
      </div>

      <Card className="space-y-3 border-gold/30">
        <h2 className="font-semibold">빠른 시작 (1분)</h2>
        <ol className="list-decimal space-y-1 pl-5 text-sm">
          <li>admin / 1234 로그인</li>
          <li>타이머 → 시작</li>
          <li>더보기 → 게임 금액 설정에서 바이인 수정</li>
          <li>참가자 등록 / 테이블 밸런싱 / TV 화면 확인</li>
        </ol>
        <div className="flex flex-wrap gap-2">
          <Link to="/timer" className="min-h-11 rounded-xl bg-gold px-4 py-3 text-sm font-medium text-black">
            타이머로 이동
          </Link>
          <Link to="/money" className="min-h-11 rounded-xl bg-panel-2 px-4 py-3 text-sm">
            금액 설정
          </Link>
        </div>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={allOpen ? 'gold' : 'secondary'}
          onClick={() => setOpenId(allOpen ? null : 'all')}
        >
          {allOpen ? '모두 접기' : '모두 펼치기'}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpenId('start')}>
          처음부터
        </Button>
      </div>

      <div className="space-y-2">
        {sections.map((section) => (
          <GuideSection
            key={section.id}
            section={section}
            open={allOpen || openId === section.id}
            onToggle={() =>
              setOpenId((prev) => {
                if (prev === 'all') return section.id
                return prev === section.id ? null : section.id
              })
            }
          />
        ))}
      </div>

      <Card className="space-y-2 text-sm">
        <h2 className="font-semibold">데모 계정</h2>
        <div className={clsx('rounded-xl bg-felt-2 px-3 py-3')}>
          <div>관리자: admin / 1234</div>
          <div>디렉터: director / 1234</div>
          <div>스태프: staff / 1234</div>
        </div>
        <p className="text-mute">
          전화번호 등 개인정보는 관리자 화면에서만 보입니다. 이 앱은 합법 토너먼트·이벤트 운영용입니다.
        </p>
      </Card>
    </div>
  )
}
