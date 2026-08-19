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
    level: string
    time: string
    score: string
    bestScore: string
    gain: string
    freeNotice: string
    rules: string
    stageLabel: string
    chooseRing: string
    alignment: string
    readyHint: string
    playingHint: string
    startAlign: string
    nextLevel: string
    retry: string
    reset: string
    cleared: string
    failed: string
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
    play: '정렬',
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
    kicker: 'ORBIS ALIGN',
    title: 'ORBIS 궤도 정렬',
    subtitle: '세 궤도의 게이트를 CORE 광선에 직접 맞춰보세요.',
    level: '레벨',
    time: '남은 시간',
    score: '점수',
    bestScore: '최고 점수',
    gain: '획득',
    freeNotice: '스킬형 무료 체험입니다. 베팅/추첨이 아니라 직접 조작하는 게임입니다.',
    rules:
      '방법: BLUE/GOLD/VIOLET 궤도를 선택하고 각도를 돌려, 모든 게이트를 위쪽 CORE 광선에 정렬하세요. 시간이 끝나기 전에 맞추면 클리어합니다.',
    stageLabel: '궤도 정렬 무대',
    chooseRing: '궤도 선택',
    alignment: '정렬 오차',
    readyHint: '정렬 시작을 누른 뒤, 궤도를 선택하고 각도를 조정하세요.',
    playingHint: '선택한 궤도를 돌려 게이트를 광선에 겹치세요.',
    startAlign: '정렬 시작',
    nextLevel: '다음 레벨',
    retry: '다시 도전',
    reset: '진행 초기화',
    cleared: 'ALIGNMENT COMPLETE',
    failed: 'TIME OVER',
  },
  brand: {
    title: '브랜드 세계관',
    subtitle: '궤도 위의 이야기',
    worldviewTitle: 'ORBIS의 세계관',
    worldviewBody:
      'ORBIS는 예측 게임이 아니라, 궤도를 직접 조율하는 세계입니다. ALIGN은 손끝으로 CORE와 공명하는 스킬 체험입니다.',
    coreTitle: 'CORE의 의미',
    coreBody:
      'CORE 광선은 정렬의 기준축입니다. 모든 게이트가 이 축에 모일 때 새로운 라운드가 열립니다.',
    orbsTitle: '궤도의 상징',
    blueTitle: 'BLUE',
    blueBody: '외곽 궤도. 큰 흐름을 조정하는 감각을 상징합니다.',
    goldTitle: 'GOLD',
    goldBody: '중간 궤도. 균형과 정밀한 보정을 상징합니다.',
    violetTitle: 'VIOLET',
    violetBody: '내곽 궤도. 미세한 직관적 조율을 상징합니다.',
    philosophyTitle: '디자인 철학',
    philosophyBody:
      '바카라/파워볼식 선택-공개 구조를 쓰지 않습니다. ORBIS는 조작과 정렬, 공간 감각으로 긴장감을 만듭니다.',
    futureTitle: '향후 확장 방향',
    futureBody:
      '더 많은 궤도, 장애 드리프트, 스와이프 제스처, 도전 모드로 확장할 수 있습니다.',
  },
  about: {
    title: '프로토타입 소개',
    subtitle: '무료 체험용 ORBIS',
    purposeTitle: '목적',
    purposeBody:
      'ORBIS Prototype은 브랜드 UI와 독창 스킬 게임 ALIGN을 검증하기 위한 프로젝트입니다.',
    freeTitle: '무료 체험 안내',
    freeBody:
      '본 프로젝트는 무료 체험용입니다. 실제 금전 거래, 입금, 출금, 환전, 결제를 지원하지 않습니다.',
    disclaimerTitle: '중요 안내',
    disclaimerBody:
      '점수와 레벨은 로컬에만 저장됩니다. 외부 베팅 사이트 연결이나 현금화는 없습니다.',
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
    reduceMotionHint: '켜면 궤도 자동 드리프트를 줄입니다.',
    savedHint: '설정은 이 기기의 localStorage에 저장됩니다.',
  },
  modal: {
    stage2Title: 'ALIGN 체험 안내',
    stage2Body: '궤도를 직접 돌려 CORE에 정렬하는 스킬 게임을 시작합니다.',
    stage2Detail: '베팅이나 추첨이 아닙니다. 손맛과 정렬 정확도로 클리어하세요.',
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
