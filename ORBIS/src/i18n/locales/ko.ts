export type Dictionary = {
  brandName: string
  slogan: string
  tagline: string
  nav: {
    home: string
    play: string
    brand: string
    about: string
    settings: string
    menu: string
    closeMenu: string
  }
  actions: {
    startExperience: string
    brandIntro: string
    demoPrototype: string
    backHome: string
    openSettings: string
    soundOn: string
    soundOff: string
    confirm: string
    close: string
  }
  home: {
    title: string
    stageLabel: string
  }
  play: {
    kicker: string
    title: string
    subtitle: string
    balance: string
    currentBet: string
    freeNotice: string
    player: string
    banker: string
    tie: string
    chooseSide: string
    chooseChip: string
    oddsPlayer: string
    oddsBanker: string
    oddsTie: string
    selected: string
    stake: string
    deal: string
    needChips: string
    dealing: string
    nextRound: string
    reset: string
    road: string
    resultPlayer: string
    resultBanker: string
    resultTie: string
    youWin: string
    youLose: string
    stakeReturned: string
    payout: string
  }
  brand: {
    title: string
    subtitle: string
    worldviewTitle: string
    worldviewBody: string
    coreTitle: string
    coreBody: string
    orbsTitle: string
    blueTitle: string
    blueBody: string
    goldTitle: string
    goldBody: string
    violetTitle: string
    violetBody: string
    philosophyTitle: string
    philosophyBody: string
    futureTitle: string
    futureBody: string
  }
  about: {
    title: string
    subtitle: string
    purposeTitle: string
    purposeBody: string
    freeTitle: string
    freeBody: string
    disclaimerTitle: string
    disclaimerBody: string
  }
  settings: {
    title: string
    subtitle: string
    language: string
    languageKo: string
    languageEn: string
    sound: string
    soundEnabled: string
    soundDisabled: string
    animationQuality: string
    qualityLow: string
    qualityMedium: string
    qualityHigh: string
    reduceMotion: string
    reduceMotionHint: string
    savedHint: string
  }
  modal: {
    stage2Title: string
    stage2Body: string
    stage2Detail: string
  }
  notFound: {
    title: string
    body: string
  }
  a11y: {
    openMobileMenu: string
    closeMobileMenu: string
    skipToContent: string
  }
}

export const ko: Dictionary = {
  brandName: 'ORBIS',
  slogan: 'Every Round Creates a New Story',
  tagline: '새로운 세계를 체험하세요',
  nav: {
    home: '홈',
    play: '테이블',
    brand: '브랜드 소개',
    about: '소개',
    settings: '설정',
    menu: '메뉴',
    closeMenu: '메뉴 닫기',
  },
  actions: {
    startExperience: '체험 시작',
    brandIntro: '브랜드 소개',
    demoPrototype: '데모 프로토타입',
    backHome: '홈으로 돌아가기',
    openSettings: '설정 열기',
    soundOn: '사운드 켜기',
    soundOff: '사운드 끄기',
    confirm: '확인',
    close: '닫기',
  },
  home: {
    title: 'ORBIS',
    stageLabel: '중앙 궤도 무대',
  },
  play: {
    kicker: 'ORBIS Table',
    title: 'ORBIS 바카라 테이블',
    subtitle: 'Player / Banker / Tie를 선택하고 카드를 공개하세요.',
    balance: '데모 칩',
    currentBet: '현재 베팅',
    freeNotice: '무료 데모 칩입니다. 실제 입금·출금·환전·결제는 없습니다.',
    player: 'PLAYER',
    banker: 'BANKER',
    tie: 'TIE',
    chooseSide: '사이드 선택',
    chooseChip: '칩 선택',
    oddsPlayer: '1 : 1',
    oddsBanker: '1 : 0.95',
    oddsTie: '1 : 8',
    selected: '선택',
    stake: '금액',
    deal: '카드 공개',
    needChips: '칩이 부족합니다',
    dealing: '카드를 공개하는 중...',
    nextRound: '다음 라운드',
    reset: '칩 초기화',
    road: '로드맵',
    resultPlayer: 'PLAYER 승리',
    resultBanker: 'BANKER 승리',
    resultTie: 'TIE',
    youWin: '획득',
    youLose: '패배',
    stakeReturned: '원금 반환',
    payout: '정산',
  },
  brand: {
    title: '브랜드 세계관',
    subtitle: '궤도 위의 이야기',
    worldviewTitle: 'ORBIS의 세계관',
    worldviewBody:
      'ORBIS는 매 라운드마다 새로운 궤도가 열리는 세계입니다. 우아한 에너지와 깊은 우주감으로, 단순한 게임 화면이 아닌 브랜드 경험 경험을 만듭니다.',
    coreTitle: 'CORE의 의미',
    coreBody:
      'CORE는 ORBIS의 중심 에너지입니다. 느리게 호흡하며 빛나고, 모든 라운드가 돌아오는 기준점 역할을 합니다.',
    orbsTitle: '테이블의 상징',
    blueTitle: 'PLAYER',
    blueBody: '흐름과 도전. 플레이어 사이드의 선명한 궤도를 상징합니다.',
    goldTitle: 'BANKER',
    goldBody: '균형과 안정. 뱅커 사이드의 중심 리듬을 상징합니다.',
    violetTitle: 'TIE',
    violetBody: '공명과 희귀 순간. 무승부의 신비로운 정렬을 상징합니다.',
    philosophyTitle: '디자인 철학',
    philosophyBody:
      '싸구려 카지노 복제 대신, 미래적이고 미니멀한 우주 미학을 추구합니다. 바카라형 라운드를 ORBIS 감성으로 재해석합니다.',
    futureTitle: '향후 확장 방향',
    futureBody:
      '현재는 무료 데모 테이블입니다. 이후 연출과 스토리 레이어를 더 풍부하게 확장할 수 있습니다.',
  },
  about: {
    title: '프로토타입 소개',
    subtitle: '무료 체험용 ORBIS',
    purposeTitle: '목적',
    purposeBody:
      'ORBIS Prototype은 브랜드 UI와 실행 가능한 바카라형 무료 데모 테이블을 검증하기 위한 프로젝트입니다.',
    freeTitle: '무료 체험 안내',
    freeBody:
      '본 프로젝트는 무료 체험용입니다. 실제 금전 거래, 입금, 출금, 환전, 결제를 지원하지 않습니다.',
    disclaimerTitle: '중요 안내',
    disclaimerBody:
      '데모 칩과 로드맵은 로컬에만 저장됩니다. 외부 베팅 사이트 연결이나 현금화는 없습니다.',
  },
  settings: {
    title: '설정',
    subtitle: 'ORBIS 경험 조절',
    language: '언어',
    languageKo: '한국어',
    languageEn: '영어',
    sound: '사운드',
    soundEnabled: '켜기',
    soundDisabled: '끄기',
    animationQuality: '애니메이션 품질',
    qualityLow: '낮음',
    qualityMedium: '보통',
    qualityHigh: '높음',
    reduceMotion: '모션 감소',
    reduceMotionHint: '움직임에 민감한 경우 애니메이션을 줄입니다.',
    savedHint: '설정은 이 기기의 localStorage에 저장됩니다.',
  },
  modal: {
    stage2Title: '테이블 체험 안내',
    stage2Body: 'ORBIS 바카라 테이블을 바로 시작할 수 있습니다.',
    stage2Detail: 'Player / Banker / Tie를 고르고 카드를 공개하세요. 실제 돈이 오가지 않는 무료 데모입니다.',
  },
  notFound: {
    title: '궤도를 벗어났습니다',
    body: '요청하신 페이지를 찾을 수 없습니다. CORE로 다시 돌아가 새로운 이야기를 이어가세요.',
  },
  a11y: {
    openMobileMenu: '모바일 메뉴 열기',
    closeMobileMenu: '모바일 메뉴 닫기',
    skipToContent: '본문으로 건너뛰기',
  },
}
