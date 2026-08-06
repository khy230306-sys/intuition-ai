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
    rules: string
    stageLabel: string
    blue: string
    gold: string
    violet: string
    void: string
    chooseSide: string
    chooseChip: string
    oddsColor: string
    oddsVoid: string
    selected: string
    stake: string
    openCore: string
    needChips: string
    drawing: string
    nextRound: string
    reset: string
    road: string
    draws: string
    patternMajority: string
    patternTrinity: string
    patternVoid: string
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
    play: '트리니티',
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
    kicker: 'CORE TRINITY',
    title: 'ORBIS 코어 트리니티',
    subtitle: 'CORE가 세 개의 Orb를 공개합니다. 다수 색 또는 VOID를 예측하세요.',
    balance: '데모 에너지',
    currentBet: '현재 선택',
    freeNotice: '무료 데모 에너지입니다. 실제 입금·출금·환전·결제는 없습니다.',
    rules:
      '규칙: 3개 Orb를 순서대로 공개합니다. 같은 색이 2개 이상이면 그 색 승리(x2). 3개 모두 같으면 TRINITY(x5). 세 색이 모두 다르면 VOID(x4).',
    stageLabel: 'CORE TRINITY 추첨 무대',
    blue: 'BLUE',
    gold: 'GOLD',
    violet: 'VIOLET',
    void: 'VOID',
    chooseSide: '공명 선택',
    chooseChip: '에너지 선택',
    oddsColor: '다수 x2 / 트리니티 x5',
    oddsVoid: 'VOID x4',
    selected: '선택',
    stake: '에너지',
    openCore: 'CORE 열기',
    needChips: '에너지가 부족합니다',
    drawing: 'CORE가 Orb를 정렬하는 중...',
    nextRound: '다음 라운드',
    reset: '에너지 초기화',
    road: '공명 로드',
    draws: '공개 결과',
    patternMajority: 'MAJORITY',
    patternTrinity: 'TRINITY',
    patternVoid: 'VOID',
    youWin: '획득',
    youLose: '공명 실패',
    stakeReturned: '에너지 반환',
    payout: '정산',
  },
  brand: {
    title: '브랜드 세계관',
    subtitle: '궤도 위의 이야기',
    worldviewTitle: 'ORBIS의 세계관',
    worldviewBody:
      'ORBIS는 매 라운드마다 새로운 궤도가 열리는 세계입니다. CORE TRINITY는 바카라 복제가 아닌, ORBIS만의 삼중 공명 추첨 규칙입니다.',
    coreTitle: 'CORE의 의미',
    coreBody:
      'CORE는 세 개의 Orb를 정렬하는 중심입니다. 다수 공명, 완전 트리니티, 또는 공허(VOID)가 탄생합니다.',
    orbsTitle: 'Orb의 상징',
    blueTitle: 'BLUE',
    blueBody: '집중과 흐름. 선명한 다수 공명을 상징합니다.',
    goldTitle: 'GOLD',
    goldBody: '균형과 가치. 안정된 중심 공명을 상징합니다.',
    violetTitle: 'VIOLET',
    violetBody: '직관과 변화. 신비로운 전환 공명을 상징합니다.',
    philosophyTitle: '디자인 철학',
    philosophyBody:
      '기존 카지노 장르를 그대로 옮기지 않습니다. 익숙한 긴장감은 유지하되, ORBIS만의 규칙과 세계관으로 재창조합니다.',
    futureTitle: '향후 확장 방향',
    futureBody:
      'CORE TRINITY를 기반으로 특수 패턴, 연출, 스토리 레이어를 확장할 수 있습니다.',
  },
  about: {
    title: '프로토타입 소개',
    subtitle: '무료 체험용 ORBIS',
    purposeTitle: '목적',
    purposeBody:
      'ORBIS Prototype은 브랜드 UI와 독창 규칙의 CORE TRINITY 무료 체험을 검증하기 위한 프로젝트입니다.',
    freeTitle: '무료 체험 안내',
    freeBody:
      '본 프로젝트는 무료 체험용입니다. 실제 금전 거래, 입금, 출금, 환전, 결제를 지원하지 않습니다.',
    disclaimerTitle: '중요 안내',
    disclaimerBody:
      '데모 에너지와 공명 로드는 로컬에만 저장됩니다. 외부 베팅 사이트 연결이나 현금화는 없습니다.',
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
    stage2Title: 'CORE TRINITY 안내',
    stage2Body: 'ORBIS만의 신종 공명 추첨을 바로 시작할 수 있습니다.',
    stage2Detail:
      'BLUE / GOLD / VIOLET / VOID를 고르고 CORE를 여세요. 실제 돈이 오가지 않는 무료 데모입니다.',
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
