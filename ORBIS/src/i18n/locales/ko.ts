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
    demoEnergy: string
    freeNotice: string
    stageLabel: string
    chooseOrb: string
    orbBlue: string
    orbGold: string
    orbViolet: string
    selectHint: string
    readyHint: string
    runningHint: string
    startRound: string
    syncNow: string
    playAgain: string
    roundLabel: string
    energyUnit: string
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
    play: '체험',
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
    kicker: 'Orbit Sync',
    title: 'ORBIS 체험 라운드',
    subtitle: 'Orb를 선택하고, 마커가 목표 궤도에 왔을 때 SYNC 하세요.',
    demoEnergy: '데모 에너지',
    freeNotice: '무료 체험용 점수입니다. 실제 금전 거래, 입출금, 환전, 결제는 없습니다.',
    stageLabel: 'ORBIS 라운드 무대',
    chooseOrb: 'Orb 선택',
    orbBlue: 'BLUE',
    orbGold: 'GOLD',
    orbViolet: 'VIOLET',
    selectHint: '먼저 BLUE, GOLD, VIOLET 중 하나를 선택하세요.',
    readyHint: '준비가 되면 라운드 시작을 누르세요.',
    runningHint: '빛나는 마커가 선택한 Orb에 가까워지면 SYNC!',
    startRound: '라운드 시작',
    syncNow: 'SYNC',
    playAgain: '다시 플레이',
    roundLabel: '라운드',
    energyUnit: 'Energy',
  },
  brand: {
    title: '브랜드 세계관',
    subtitle: '궤도 위의 이야기',
    worldviewTitle: 'ORBIS의 세계관',
    worldviewBody:
      'ORBIS는 매 라운드마다 새로운 궤도가 열리는 세계입니다. 우아한 에너지와 깊은 우주감으로, 단순한 게임 화면이 아닌 브랜드 경험 경험을 만듭니다.',
    coreTitle: 'CORE의 의미',
    coreBody:
      'CORE는 ORBIS의 중심 에너지입니다. 느리게 호흡하며 빛나고, 모든 Orb가 돌아오는 기준점 역할을 합니다.',
    orbsTitle: 'Orb의 상징',
    blueTitle: 'BLUE',
    blueBody: '집중과 흐름. 차분한 통찰과 선명한 궤도를 상징합니다.',
    goldTitle: 'GOLD',
    goldBody: '균형과 가치. 고급스러운 리듬과 안정된 중심을 상징합니다.',
    violetTitle: 'VIOLET',
    violetBody: '직관과 변화. 신비로운 전환과 새로운 가능성을 상징합니다.',
    philosophyTitle: '디자인 철학',
    philosophyBody:
      '싸구려 카지노 복제 대신, 미래적이고 미니멀한 우주 미학을 추구합니다. 빛, 궤도, 깊이감으로 브랜드의 품격을 전달합니다.',
    futureTitle: '향후 확장 방향',
    futureBody:
      '체험 라운드는 Orbit Sync로 시작됩니다. 이후 더 풍부한 스토리와 연출이 이어질 예정입니다.',
  },
  about: {
    title: '프로토타입 소개',
    subtitle: '무료 체험용 ORBIS',
    purposeTitle: '목적',
    purposeBody:
      'ORBIS Prototype은 브랜드 아이덴티티와 실행 가능한 무료 체험 라운드(Orbit Sync)를 검증하기 위한 프로토타입입니다.',
    freeTitle: '무료 체험 안내',
    freeBody:
      '본 프로젝트는 무료 체험용입니다. 실제 금전 거래, 입금, 출금, 환전, 결제를 지원하지 않습니다.',
    disclaimerTitle: '중요 안내',
    disclaimerBody:
      '데모 에너지는 로컬 점수일 뿐입니다. 외부 베팅 사이트 연결이나 현금화는 없습니다.',
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
    stage2Title: '체험 라운드 안내',
    stage2Body: 'Orbit Sync 체험을 바로 시작할 수 있습니다.',
    stage2Detail:
      'Orb를 선택하고 마커를 동기화하세요. 실제 금전 거래 없이 무료 데모 에너지만 쌓입니다.',
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
