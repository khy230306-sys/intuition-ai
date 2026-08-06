import {
  callPhone,
  copyText,
  openApp,
  openMail,
  openMaps,
  openSearch,
  openUrl,
  openWeather,
  resolveAppIntent,
  sendSms,
  shareText,
} from './actions'
import { tryHandleNavigation } from './navigation'
import { tryHandleNavigationV2 } from './navigationV2'
import { tryHandleCustomers } from './customers'
import {
  analyzeHolding,
  compound,
  dcaPlan,
  fetchQuote,
  formatMoney,
  formatQuote,
  investChecklist,
  marketSessionNow,
  openFinance,
  parseKrwNumber,
  positionSize,
  riskProfileAdvice,
} from './finance'
import {
  buildColdRecommendations,
  buildPortfolioReport,
  buildStockAnalysis,
  wantsStockAnalysis,
  wantsStockRecommend,
  STOCK_ENGINE_VERSION,
} from './stockEngine'
import { buildLifestyleReply, detectLifestyleRecommend } from './lifestyleRecommend'
import {
  convertUnit,
  decide,
  holidayToday,
  mealIdea,
  morningBriefing,
  nextHoliday,
  nowText,
  safeEvalMath,
  tipSplit,
} from './smart'
import { answerFx } from './fx'
import { parseExpenseLine } from './expenseParse'
import { buildAlarmFromText, formatWhenAt, wantsLocalAlarm } from './notify'
import { getAppLocale } from './i18n'
import { tryHandleMusicSkill } from './music'
import { coreResultToBrainReply, processCoreBrain, stripWakeWord } from './core-brain'
import {
  aieEnrichAnswer,
  aieFormatMultiTaskCombined,
  aiePrepare,
  buildAieDailyBriefChat,
  formatActionPlanSummary,
  type AiePrepareResult,
} from './aie'
import {
  addExpense,
  addHabit,
  addJournal,
  addReminder,
  addShoppingItems,
  addTradeNote,
  addWatch,
  checkHabit,
  clearDoneShopping,
  expenseTotals,
  findMemory,
  lifeContextBlock,
  loadHoldings,
  loadMemory,
  loadProfile,
  loadReminders,
  loadSettings,
  loadShopping,
  loadTrades,
  loadWatchlist,
  removeHolding,
  removeWatch,
  saveProfile,
  setHolding,
  upsertHolding,
  upsertMemory,
} from './storage'
import { extractTickerFromText, resolveTicker } from './tickers'
import { handleGeo } from './geo'
import { handleStats } from './statsBrain'
import { handleTranslate, isTranslateEscapeCommand, loadInterpretMode, wantsTranslate } from './translateBrain'
import { getLocationReport } from './location'
import {
  addFamilyNotice,
  createFamilyRoom,
  loadFamilyRoom,
  upcomingFamilyEvents,
} from './familyStore'
import { broadcastFamilyPacket } from './familySyncLazy'
import {
  addFriendsNotice,
  createFriendsRoom,
  loadFriendsRoom,
  upcomingFriendsEvents,
} from './friendsStore'
import { broadcastFriendsPacket } from './friendsSyncLazy'
import { openShareUi, shareBackupFile } from './shareKit'
import { aiEngineErrorText } from './ai'
import {
  hasAnyConfiguredProvider,
  hybridNoProviderMessage,
  runHybridChat,
} from './ai-providers'
import type { BrainReply, JarvisSettings } from './types'
import {
  detectEverydayIntent,
  isCasualChatText,
  localCasualReply,
  looksLikeSttGarbage,
  wantsWeatherCommand,
} from './spokenCommand'
import { userGuideText, wantsUserGuide } from './userGuide'
import { formatWeatherLine, loadCachedWeather, weatherPlaceMatches } from './weather'
import { localFunReply } from './localFun'
import { answerEncyclopedia, isKnowledgeQuestion } from './encyclopedia/encyclopediaEngine'
import { tryHandleLifeAssistant } from './life-assistant'

function helpText(name: string): string {
  return [
    `${name}, AIZIO 명령어 목록입니다.`,
    '앱이 뭔지 먼저 보고 싶으면 「사용설명서」를 입력하세요.',
    '',
    '【일상】 오늘 날씨 알려줘 · 브리핑 · 「서울 무슨 뜻이야」 · 할 일 · 로또 · 장바구니 · 지출 · 습관 · 일기 · 환율 · 로컬 알림 · 앱공유',
    '【가족】 단체대화 · 공지 · 일정 (하단 가족 탭 / 코드 공유)',
    '【친구】 단체대화 · 공지 · 일정 (하단 친구 탭 / 코드 공유)',
    '【투자】 시세 · 냉정 종목추천 · 관심종목 · 포트폴리오 · 포지션 · 적립식 · 장시간',
    '【세계】 국가·도시·지리·시차 · 실시간 다국어 통역',
    '【통계】 실시간 데이터 입력 → 평균/분산/확률/회귀 해답',
    '',
    '예시',
    '• 오늘 날씨 알려줘 / 서울 날씨 / 우산 챙길까',
    '• 브리핑 / 오늘 뭐하지 / 지금 몇 시야',
    '• 대화 초기화 / 지난 대화 삭제 / 대화 삭제해줘',
    '• 멤버 / 가족 공지 / 가족 일정',
    '• 친구 공간 / 친구 공지 / 친구 일정',
    '• 앱 공유 / QR / 백업 공유',
    '• 100달러 환율 / 엔화 10000엔 / 환율',
    '• 커피 4500 / 지출 택시 12000 / 지출 현황',
    '• 알림 30분 뒤 약 / 오후 3시에 알려줘 회의',
    '• 장시간 / 장 열렸어',
    '• 주식 종목 추천 / 미국 보수 추천 / 냉정하게 추천',
    '• 프랑스 정보 / 도쿄 시차 / 에베레스트 / 대륙 목록',
    '• 앱 업데이트 / 게임 / 벽돌깨기 / 스페이스 / 스페이스2 / 플래피 / 지오대시 / 닷지 / 퐁 / 스윽 / 게임 순위',
    '• 내 위치 / 지금 어디야',
    '• 영어 통역 모드 / 일본어로 번역해 안녕하세요 / 통역 종료',
    '• 삼성전자 시세 / 애플 주가',
    '• 데이터 수익률 1.2 -0.5 3.1 → 통계',
    '• 추가 0.8 / 확률 0 이상 / 시세기록 삼성전자',
    '• 관심종목 엔비디아 추가',
    '• 보유 삼성전자 10주 평단 70000',
    '• 포트폴리오 / 장시간',
    '• 포지션 자본 1000만 리스크 1% 진입 70000 손절 65000',
    '• 적립식 매달 50만 10년 연7%',
    '• 삼성전자 투자체크',
    '',
    '날씨·시세·환율·브리핑·통역·통계·메모·일정·알림은 API 키 없이 동작합니다. 자유 대화는 설정에서 무료 AI(OpenRouter/Gemini/Groq) 또는 OpenAI를 연결하세요.',
    '로컬 알림은 앱/탭이 열려 있을 때 가장 확실합니다(iOS 백그라운드 제한).',
    '면책: 투자 조언이 아니며 손실 책임은 본인에게 있습니다.',
  ].join('\n')
}

/** Cloud free-chat via Hybrid AI Provider System (local commands stay above this). */
async function callCloudLLM(
  userText: string,
  settings: JarvisSettings,
  history: { role: string; text: string }[],
): Promise<string | null> {
  if (!hasAnyConfiguredProvider()) return null
  const profile = loadProfile()
  const result = await runHybridChat({
    message: userText,
    history,
    displayName: settings.displayName,
    lifeContext: lifeContextBlock(),
    riskTolerance: profile.riskTolerance,
    investHorizon: profile.investHorizon,
    locale: 'ko-KR',
  })
  return result.text || null
}

async function handleInvest(text: string): Promise<BrainReply | null> {
  if (wantsStockRecommend(text)) {
    const report = await buildColdRecommendations(text)
    return { text: report, speak: true }
  }

  if (wantsStockAnalysis(text)) {
    const report = await buildStockAnalysis(text)
    return { text: report || '종목분석에 실패했습니다.', speak: true }
  }

  if (/주식\s*엔진|엔진\s*버전|stock\s*engine/i.test(text)) {
    return {
      text: [
        `【AIZIO 주식엔진 v${STOCK_ENGINE_VERSION}】`,
        '· AI퀀트 스크리닝: 모멘텀·평균회귀·상대강도·52주·거래량·섹터',
        '· 추천: 매력도% · 목표가 · 손절가 · 매도가 / 종목분석 / 포트폴리오',
        '· 국내 코스피·코스닥 우선 (미국은「미국 종목 추천」)',
        '',
        '예: 「주식 종목 추천」 「반도체 종목 추천」 「삼성전자 종목분석」 「포트폴리오」',
        '최종 결정·손실 책임은 본인에게 있습니다.',
      ].join('\n'),
      speak: true,
    }
  }

  if (
    /장\s*시간|시장\s*개장|장중|마켓\s*아워|market\s*hours|장\s*열렸|개장했|개장\s*했|휴장|장\s*마감|거래\s*시간|개장\s*시간/i.test(
      text,
    )
  ) {
    return { text: marketSessionNow(), speak: true }
  }

  if (/포트폴리오|보유\s*현황|내\s*주식|자산\s*현황/i.test(text)) {
    const report = await buildPortfolioReport()
    return { text: report, speak: false }
  }

  if (/관심\s*종목\s*(목록|보여|리스트)|워치\s*리스트|watchlist/i.test(text)) {
    const list = loadWatchlist()
    if (!list.length) return { text: '관심종목이 비어 있습니다. "관심종목 삼성전자 추가"' }
    const lines: string[] = ['【관심종목】']
    const slice = list.slice(0, 15)
    const quotes = await Promise.all(
      slice.map(async (w) => {
        try {
          return await fetchQuote(w.symbol, { allowProxy: false, timeoutMs: 2200 })
        } catch {
          return null
        }
      }),
    )
    slice.forEach((w, i) => {
      const q = quotes[i]
      lines.push(q ? formatQuote(q) : `${w.name} (${w.symbol})`)
      if (w.targetPrice) lines.push(`목표가 ${formatMoney(w.targetPrice, q?.currency || 'KRW')}`)
      lines.push('')
    })
    return { text: lines.join('\n').trim() + '\n면책: 참고용 시세입니다.', speak: false }
  }

  const addWatchMatch =
    text.match(/(?:관심(?:종목)?|워치)\s*(.+?)\s*(?:추가|넣어|등록)/i) ||
    text.match(/(.+?)\s*(?:관심종목|워치)\s*(?:추가|등록)/i)
  if (addWatchMatch) {
    const ticker = extractTickerFromText(addWatchMatch[1])
    if (!ticker) return { text: '종목을 인식하지 못했습니다. 예: 삼성전자, AAPL, 005930' }
    const target = text.match(/목표가?\s*([\d,.]+)/)
    const item = addWatch(
      ticker.symbol,
      ticker.name,
      target ? parseFloat(target[1].replace(/,/g, '')) : undefined,
    )
    return {
      text: `관심종목 추가: ${item.name} (${item.symbol})` + (item.targetPrice ? `\n목표가 ${item.targetPrice}` : ''),
      speak: true,
    }
  }

  const removeWatchMatch = text.match(/(?:관심(?:종목)?|워치)\s*(.+?)\s*(?:삭제|제거|빼)/i)
  if (removeWatchMatch) {
    const ticker = extractTickerFromText(removeWatchMatch[1])
    if (!ticker) return { text: '삭제할 종목을 찾지 못했습니다.' }
    removeWatch(ticker.symbol)
    return { text: `${ticker.name} 관심종목에서 제거했습니다.`, speak: true }
  }

  // 보유 삼성전자 10주 평단 70000
  const holdMatch = text.match(
    /(?:보유|매수기록|포트에)\s*(.+?)\s*([\d.]+)\s*주\s*(?:평단|단가|평균)?\s*([\d,.]+)?/i,
  )
  if (holdMatch || /보유\s*.+\s*주/.test(text)) {
    const m =
      holdMatch ||
      text.match(/보유\s*(.+?)\s*([\d.]+)\s*주(?:\s*(?:평단|단가)?\s*([\d,.]+))?/i)
    if (m) {
      const ticker = extractTickerFromText(m[1])
      const shares = parseFloat(m[2])
      let avg = m[3] ? parseFloat(m[3].replace(/,/g, '')) : NaN
      if (!ticker) return { text: '종목을 인식하지 못했습니다.' }
      if (!Number.isFinite(shares) || shares === 0) return { text: '주식 수를 확인해 주세요.' }
      if (!Number.isFinite(avg)) {
        const q = await fetchQuote(ticker.symbol)
        avg = q?.price ?? 0
        if (!avg) return { text: '평단가를 입력해 주세요. 예: 보유 삼성전자 10주 평단 70000' }
      }
      const h = setHolding({
        symbol: ticker.symbol,
        name: ticker.name,
        shares,
        avgPrice: avg,
        currency: ticker.currency,
      })
      addTradeNote(ticker.symbol, shares > 0 ? 'buy' : 'sell', `보유 설정 ${shares}주 @ ${avg}`)
      const q = await fetchQuote(ticker.symbol)
      return {
        text: `보유 반영 완료\n${analyzeHolding(h, q)}\n면책: 참고용 기록입니다.`,
        speak: true,
      }
    }
  }

  const buyMore = text.match(/(?:추가매수|더\s*샀)\s*(.+?)\s*([\d.]+)\s*주\s*(?:@|평단|단가)?\s*([\d,.]+)/i)
  if (buyMore) {
    const ticker = extractTickerFromText(buyMore[1])
    if (!ticker) return { text: '종목을 인식하지 못했습니다.' }
    const shares = parseFloat(buyMore[2])
    const avg = parseFloat(buyMore[3].replace(/,/g, ''))
    const h = upsertHolding({
      symbol: ticker.symbol,
      name: ticker.name,
      shares,
      avgPrice: avg,
      currency: ticker.currency,
    })
    addTradeNote(ticker.symbol, 'buy', `추가매수 ${shares}주 @ ${avg}`)
    return { text: `추가매수 반영\n${analyzeHolding(h, await fetchQuote(ticker.symbol))}`, speak: true }
  }

  const dropHold = text.match(/(?:보유\s*)?(.+?)\s*(?:보유\s*)?(?:삭제|제거|전량\s*매도\s*기록)/i)
  if (dropHold && /보유|포트|매도\s*기록/i.test(text)) {
    const ticker = extractTickerFromText(dropHold[1])
    if (ticker && removeHolding(ticker.symbol)) {
      addTradeNote(ticker.symbol, 'sell', '보유 삭제')
      return { text: `${ticker.name} 보유 목록에서 삭제했습니다.`, speak: true }
    }
  }

  const thesis =
    text.match(/(.+?)\s*(?:매수(?:아이디어|이유)|투자아이디어|매매노트)\s*(.+)$/i) ||
    text.match(/(?:매수이유|투자논리)\s*(.+?)\s*[:：]\s*(.+)$/i)
  if (thesis) {
    const ticker = extractTickerFromText(thesis[1]) || extractTickerFromText(text)
    if (ticker) {
      const note = addTradeNote(ticker.symbol, 'idea', thesis[2] || thesis[1])
      return { text: `매매노트 저장: ${ticker.name}\n${note.thesis}`, speak: true }
    }
  }

  if (/매매\s*노트|투자\s*일기|트레이드\s*로그/i.test(text)) {
    const notes = loadTrades().slice(0, 12)
    if (!notes.length) return { text: '매매노트가 없습니다. "삼성전자 매수아이디어 반도체 회복"' }
    return {
      text: notes
        .map(
          (n) =>
            `• [${n.side}] ${n.symbol} — ${n.thesis} (${new Date(n.createdAt).toLocaleDateString('ko-KR')})`,
        )
        .join('\n'),
    }
  }

  if (/투자\s*체크|체크리스트/i.test(text)) {
    const ticker = extractTickerFromText(text)
    return { text: investChecklist(ticker?.name || '이 종목') }
  }

  if (/투자\s*성향|리스크\s*성향/i.test(text)) {
    const profile = loadProfile()
    if (/보수/.test(text)) profile.riskTolerance = 'conservative'
    else if (/공격/.test(text)) profile.riskTolerance = 'aggressive'
    else if (/균형|중립/.test(text)) profile.riskTolerance = 'balanced'
    saveProfile(profile)
    return {
      text: `투자 성향: ${profile.riskTolerance}\n${riskProfileAdvice(profile.riskTolerance)}`,
      speak: true,
    }
  }

  const pos = text.match(
    /포지션(?:사이즈|크기)?\s*(?:자본|시드)?\s*([\d만억,.]+)\s*(?:만\s*원|원)?.*?리스크\s*([\d.]+)\s*%?.*?진입\s*([\d,.]+).*?손절\s*([\d,.]+)/i,
  )
  if (pos || /포지션/.test(text)) {
    const m =
      pos ||
      text.match(/자본\s*([\d만억,.]+).*리스크\s*([\d.]+).*진입\s*([\d,.]+).*손절\s*([\d,.]+)/i)
    if (m) {
      let capital = parseKrwNumber(m[1]) ?? parseFloat(m[1].replace(/,/g, ''))
      if (/만/.test(text) && capital < 100000) capital *= 10000
      const riskPct = parseFloat(m[2])
      const entry = parseFloat(m[3].replace(/,/g, ''))
      const stop = parseFloat(m[4].replace(/,/g, ''))
      const r = positionSize({ capital, riskPct, entry, stop })
      return {
        text: [
          '【포지션 사이징】',
          `자본 ${formatMoney(capital, 'KRW')} · 리스크 ${riskPct}%`,
          `진입 ${entry.toLocaleString('ko-KR')} / 손절 ${stop.toLocaleString('ko-KR')}`,
          `권장 수량 ${r.shares}주`,
          `위험금액 ${formatMoney(r.riskAmount, 'KRW')} · 포지션 ${formatMoney(r.positionValue, 'KRW')}`,
          r.advice,
          '면책: 교육용 계산입니다.',
        ].join('\n'),
      }
    }
  }

  const dca = text.match(
    /적립(?:식)?\s*(?:매달|매월)?\s*([\d만억,.]+).*?(\d+)\s*년.*?연\s*([\d.]+)\s*%/i,
  )
  if (dca || (/적립/.test(text) && /년/.test(text))) {
    const m =
      dca ||
      text.match(/([\d만억,.]+).*?(\d+)\s*년.*?([\d.]+)\s*%/)
    if (m) {
      let monthly = parseKrwNumber(m[1]) ?? parseFloat(m[1].replace(/,/g, ''))
      if (/만/.test(m[1]) || (/만/.test(text) && monthly < 100000)) monthly = parseKrwNumber(m[1] + '만') ?? monthly * 10000
      const years = parseInt(m[2], 10)
      const ret = parseFloat(m[3])
      return { text: dcaPlan(monthly, years * 12, ret) }
    }
  }

  const comp = text.match(/복리\s*(?:원금)?\s*([\d만억,.]+).*?연\s*([\d.]+)\s*%.*?(\d+)\s*년/i)
  if (comp) {
    let principal = parseKrwNumber(comp[1]) ?? parseFloat(comp[1].replace(/,/g, ''))
    if (/만/.test(comp[1])) principal = parseKrwNumber(comp[1]) ?? principal
    return { text: compound(principal, parseFloat(comp[2]), parseInt(comp[3], 10)) }
  }

  // Quote: 삼성전자 시세 / 주가 / 가격
  if (/시세|주가|현재가|얼마야|차트|호가/.test(text) || extractTickerFromText(text)) {
    const ticker = extractTickerFromText(text)
    if (ticker && (/시세|주가|현재가|얼마|차트|호가|분석|뉴스/.test(text) || resolveTicker(text.trim()))) {
      if (/뉴스/.test(text)) {
        return {
          text: `${ticker.name} 관련 뉴스를 검색합니다.`,
          action: () => openSearch(`${ticker.name} 주가 뉴스`),
        }
      }
      if (/차트|트레이딩뷰|tradingview/i.test(text)) {
        return {
          text: `${ticker.name} 차트를 엽니다.`,
          action: () => {
            openFinance(ticker.symbol, 'tradingview')
            return { ok: true, message: 'TradingView 열림' }
          },
        }
      }
      if (/네이버\s*금융|상세/.test(text)) {
        return {
          text: `${ticker.name} 네이버 금융을 엽니다.`,
          action: () => {
            openFinance(ticker.symbol, 'naver')
            return { ok: true, message: '네이버 금융 열림' }
          },
        }
      }
      try {
        const q = await fetchQuote(ticker.symbol)
        if (!q) {
          return {
            text: `${ticker.name} 시세를 가져오지 못했습니다. 네이버/야후로 엽니다.`,
            action: () => {
              openFinance(ticker.symbol, ticker.currency === 'KRW' ? 'naver' : 'yahoo')
              return { ok: true, message: '금융 페이지 열림' }
            },
          }
        }
        const watch = loadWatchlist().find((w) => w.symbol === q.symbol)
        let extra = ''
        if (watch?.targetPrice) {
          const diff = ((watch.targetPrice - q.price) / q.price) * 100
          extra = `\n목표가 ${formatMoney(watch.targetPrice, q.currency)} (현재 대비 ${diff >= 0 ? '+' : ''}${diff.toFixed(1)}%)`
        }
        const holding = loadHoldings().find((h) => h.symbol === q.symbol)
        if (holding) extra += `\n\n${analyzeHolding(holding, q)}`
        return {
          text: `${formatQuote(q)}${extra}\n\n더보기: "${ticker.name} 차트" / "${ticker.name} 뉴스" / "${ticker.name} 투자체크"\n면책: 시세는 참고용이며 지연될 수 있습니다.`,
          speak: true,
        }
      } catch {
        return { text: '시세 조회 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.' }
      }
    }
  }

  // bare ticker only
  if (resolveTicker(text.trim())) {
    const ticker = resolveTicker(text.trim())!
    const q = await fetchQuote(ticker.symbol)
    if (q) return { text: formatQuote(q) + '\n면책: 참고용 시세입니다.', speak: true }
  }

  return null
}

async function handleLife(text: string): Promise<BrainReply | null> {
  const settings = loadSettings()
  const name = settings.displayName

  if (/브리핑|오늘\s*뭐하지|모닝|아침\s*보고|하루\s*요약/i.test(text)) {
    // AIE Daily Brief (Context-based) — legacy morningBriefing still available inside Life OS brief
    try {
      return { text: buildAieDailyBriefChat(), speak: true }
    } catch {
      return { text: morningBriefing(), speak: true }
    }
  }

  if (/공휴일|휴일/.test(text)) {
    const today = holidayToday()
    return {
      text: today ? `오늘은 ${today}입니다.\n다음: ${nextHoliday()}` : `오늘은 평일 캘린더 기준입니다.\n다음 공휴일: ${nextHoliday()}`,
      speak: true,
    }
  }

  if (/몇\s*시|지금\s*시간|현재\s*시간/.test(text)) {
    return { text: `지금은 ${nowText()}입니다.`, speak: true }
  }

  if (/날짜|오늘\s*며칠|요일/.test(text)) {
    return { text: `오늘은 ${nowText()}입니다.`, speak: true }
  }

  // Local timed alarms before generic reminders
  if (wantsLocalAlarm(text)) {
    const built = buildAlarmFromText(text)
    if (built) {
      const whenStr = formatWhenAt(built.alarm.whenAt)
      addReminder(built.alarm.body, whenStr, built.alarm.whenAt)
      return {
        text: `알림 예약: ${built.alarm.body}\n시간: ${whenStr} (${built.whenLabel})\n앱이 열려 있으면 알림·진동으로 알려 드립니다.`,
        speak: true,
      }
    }
    return {
      text: '시간을 함께 말해 주세요.\n예: "알림 30분 뒤 약" · "오후 3시에 알려줘 회의"',
      speak: true,
    }
  }

  const fx = await answerFx(text)
  if (fx) return { text: fx, speak: true }

  const converted = convertUnit(text)
  if (converted) return { text: converted, speak: true }

  const tip = tipSplit(text)
  if (tip) return { text: tip, speak: true }

  if (/메뉴|뭐\s*먹지|식사\s*추천|야식/.test(text)) {
    return { text: mealIdea(), speak: true }
  }

  if (/코인\s*토스|앞면|뒷면|골라줘|뭐가\s*나아|결정\s*못/.test(text) || /(?:vs|또는).*(골라|선택)/i.test(text)) {
    return { text: decide(text), speak: true }
  }

  const calcMatch =
    text.match(/^(?:계산|계산해|계산해줘)\s*(.+)$/i) ||
    text.match(/^([0-9+\-*/().%\s×÷x]+)=?$/i)
  if (calcMatch) {
    const result = safeEvalMath(calcMatch[1])
    if (result !== null) return { text: `계산 결과: ${result}`, speak: true }
  }

  const shopAdd =
    text.match(/(?:장바구니|장보기)\s*(?:추가)?\s*(.+)$/i) ||
    text.match(/^(.+?)\s*(?:장바구니|장보기)\s*(?:추가|넣어)/i)
  if (shopAdd && !/목록|보여|리스트/.test(text)) {
    const names = shopAdd[1].split(/[,，、과와랑및\s]+/).filter(Boolean)
    const created = addShoppingItems(names)
    return {
      text: created.length
        ? `장바구니에 추가: ${created.map((c) => c.name).join(', ')}`
        : '이미 들어 있거나 추가할 항목이 없습니다.',
      speak: true,
    }
  }

  if (/장바구니\s*(목록|보여|리스트)|장보기\s*목록/.test(text)) {
    const items = loadShopping().filter((s) => !s.done)
    return {
      text: items.length ? `장바구니:\n${items.map((s, i) => `${i + 1}. ${s.name}`).join('\n')}` : '장바구니가 비어 있습니다.',
    }
  }

  if (/장바구니\s*(비우|완료\s*삭제|구매\s*완료)/.test(text)) {
    const n = clearDoneShopping()
    return { text: `완료 항목 ${n}개를 정리했습니다.` }
  }

  const parsedExpense = parseExpenseLine(text)
  if (parsedExpense) {
    const item = addExpense(parsedExpense.amount, parsedExpense.category, parsedExpense.note)
    const totals = expenseTotals()
    return {
      text: `지출 기록: ${item.category} ${formatMoney(item.amount, 'KRW')}${
        item.note && item.note !== item.category ? ` (${item.note})` : ''
      }\n오늘 ${formatMoney(totals.today, 'KRW')} · 이번달 ${formatMoney(totals.month, 'KRW')}`,
      speak: true,
    }
  }

  if (/지출\s*(현황|합계|통계|보여)/.test(text)) {
    const t = expenseTotals()
    const cats = Object.entries(t.byCategory)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([k, v]) => `• ${k}: ${formatMoney(v, 'KRW')}`)
      .join('\n')
    return {
      text: `오늘 ${formatMoney(t.today, 'KRW')}\n이번달 ${formatMoney(t.month, 'KRW')}\n${cats || '카테고리 없음'}`,
    }
  }

  const habitAdd = text.match(/습관\s*(?:추가|등록)\s*(.+)$/i)
  if (habitAdd) {
    const h = addHabit(habitAdd[1])
    return { text: `습관 등록: ${h.name}`, speak: true }
  }

  const habitDone = text.match(/습관\s*(?:완료|체크)\s*(.+)$/i) || text.match(/^(.+?)\s*습관\s*(?:완료|했어|지킴)/i)
  if (habitDone) {
    const h = checkHabit(habitDone[1])
    if (!h) return { text: '습관을 찾지 못했습니다. "습관 추가 운동" 후 체크하세요.' }
    return { text: `${h.name} 완료! 연속 ${h.streak}일`, speak: true }
  }

  const journal = text.match(/(?:일기|저널)\s*(.+)$/i)
  if (journal) {
    addJournal(journal[1])
    return { text: '일기를 저장했습니다.', speak: true }
  }

  const remember =
    text.match(/^(?:기억해|기억해줘|메모해|메모해줘)\s*(.+)$/i) ||
    text.match(/^(.+?)(?:을|를|은|는)?\s*(?:기억해|기억해줘)$/i)
  if (remember) {
    const body = remember[1].trim()
    const parts = body.split(/\s*(?:는|은|:|=)\s*/)
    if (parts.length >= 2) {
      upsertMemory(parts[0].trim(), parts.slice(1).join(' ').trim())
      return { text: `"${parts[0].trim()}" 기억했습니다.`, speak: true }
    }
    upsertMemory(`메모 ${new Date().toLocaleString('ko-KR')}`, body)
    return { text: `메모 저장: ${body}`, speak: true }
  }

  const recall =
    text.match(/^(?:뭐였지|알려줘|찾아줘)\s*(.+)$/i) ||
    text.match(/^(.+?)\s*(?:뭐였지|뭐야)$/i)
  if (recall && !/할\s*일|시세|주가/.test(text)) {
    const hits = findMemory(recall[1].replace(/기억/g, '').trim())
    if (!hits.length) return { text: '기억이 없습니다. "기억해 키는 값"으로 저장하세요.' }
    return { text: hits.slice(0, 5).map((h) => `• ${h.key}: ${h.value}`).join('\n'), speak: true }
  }

  const remind =
    text.match(/^(?:리마인더|할\s*일|기억시켜)\s*(.+)$/i) ||
    text.match(/^(.+?)\s*(?:기억시켜|할\s*일에\s*넣어)$/i)
  if (remind && !/장바구니|습관/.test(text)) {
    const item = addReminder(remind[1])
    return { text: `할 일 추가: ${item.text}`, speak: true }
  }

  if (/할\s*일\s*(목록|보여|리스트)/.test(text)) {
    const items = loadReminders().filter((r) => !r.done)
    return {
      text: items.length ? items.map((r, i) => `${i + 1}. ${r.text}`).join('\n') : '남은 할 일이 없습니다.',
    }
  }

  if (/기억\s*(목록|보여)/.test(text)) {
    const items = loadMemory()
    return {
      text: items.length ? items.slice(0, 12).map((m) => `• ${m.key}: ${m.value}`).join('\n') : '저장된 기억이 없습니다.',
    }
  }

  if (wantsUserGuide(text)) {
    return { text: userGuideText(name), speak: true }
  }

  if (/^(도움말|헬프|help|기능)$/i.test(text) || text.includes('도움말')) {
    return { text: helpText(name) }
  }

  if (/안녕|하이|헬로|hello|hi\b/.test(text)) {
    return {
      text: `안녕하세요, ${name}. AIZIO입니다. "브리핑" 또는 "삼성전자 시세"로 시작해 보세요.`,
      speak: true,
    }
  }

  return null
}

async function replyWeather(
  city: string,
  settings: JarvisSettings,
  umbrella = false,
): Promise<BrainReply> {
  const askCity = city || settings.city || ''
  const cached = loadCachedWeather()
  if (cached && weatherPlaceMatches(cached.place, askCity)) {
    const line = formatWeatherLine(cached)
    const tip =
      umbrella && cached.precipProb != null
        ? cached.precipProb >= 30
          ? '\n우산을 챙기는 편이 좋겠어요.'
          : '\n우산은 필수는 아니어 보여요.'
        : ''
    return {
      text: `${cached.place || askCity || '현재 위치'} 날씨예요. ${line}${tip}`,
      speak: true,
      action: () => openWeather(askCity || cached.place),
    }
  }
  return {
    text: askCity ? `${askCity} 날씨를 확인합니다.` : '오늘 날씨를 확인합니다.',
    speak: true,
    action: () => openWeather(askCity),
  }
}

export async function think(
  input: string,
  history: { role: string; text: string }[] = [],
  opts?: {
    source?: 'text' | 'voice' | 'system'
    /** Internal: skip AIE multi-task split (executing a planned segment). */
    skipAieMultiTask?: boolean
    /** Internal: skip recommendation append. */
    skipAieEnrich?: boolean
  },
): Promise<BrainReply> {
  const settings = loadSettings()
  const name = settings.displayName
  const raw = input.trim()
  if (!raw) return { text: `${name}, 무엇을 도와드릴까요?` }

  // Continuous translate lock owns the turn before AIE / Core Brain.
  // Prevents Core translation skill + legacy handleTranslate both answering
  // (online bubble + cached offline bubble) for the same utterance.
  {
    const strippedEarly = stripWakeWord(raw).text || raw
    const lockedEarly = loadInterpretMode().active
    if (
      lockedEarly &&
      strippedEarly &&
      !isTranslateEscapeCommand(strippedEarly)
    ) {
      const tr = await handleTranslate(strippedEarly)
      if (tr) return tr
    }
  }

  // AIZIO Intelligence Engine — orchestrator only (never replaces Core Brain)
  let aiePrep: AiePrepareResult | null = null
  try {
    if (!opts?.skipAieMultiTask) {
      const strippedForAie = stripWakeWord(raw).text || raw
      aiePrep = aiePrepare({
        text: strippedForAie,
        history,
        source: opts?.source || 'text',
        skipMultiTask: false,
        skipRecommend: Boolean(opts?.skipAieEnrich),
      })
      if (aiePrep.shouldRunMultiTask) {
        const parts: Array<{ label: string; text: string }> = []
        let last: BrainReply | null = null
        for (const task of aiePrep.plan.tasks) {
          const r = await think(task.text, history, {
            source: opts?.source || 'text',
            skipAieMultiTask: true,
            skipAieEnrich: true,
          })
          parts.push({ label: task.reason, text: r.text })
          last = r
        }
        const combined = aieFormatMultiTaskCombined(
          formatActionPlanSummary(aiePrep.plan),
          parts,
        )
        return {
          text: combined,
          speak: true,
          view: last?.view,
          action: last?.action,
          musicShowMiniPlayer: last?.musicShowMiniPlayer,
          musicNeedsGesture: last?.musicNeedsGesture,
          musicPlayUrl: last?.musicPlayUrl,
        }
      }
    } else {
      aiePrep = aiePrepare({
        text: stripWakeWord(raw).text || raw,
        history,
        source: opts?.source || 'text',
        skipMultiTask: true,
        skipRecommend: true,
      })
    }
  } catch {
    aiePrep = null
  }

  const enrich = (reply: BrainReply): BrainReply => {
    if (!aiePrep || opts?.skipAieEnrich) return reply
    try {
      const text = aieEnrichAnswer(reply.text, aiePrep, {
        appendPlan: false,
        appendRecs: true,
      })
      return text === reply.text ? reply : { ...reply, text }
    } catch {
      return reply
    }
  }

  // AI Life Assistant — natural-language everyday commands (additive; falls through on miss)
  try {
    const strippedLife = stripWakeWord(raw).text || raw
    const lifeAsst = await tryHandleLifeAssistant(strippedLife)
    if (lifeAsst) return enrich(lifeAsst)
  } catch {
    /* never block Core Brain / legacy */
  }

  // AIZIO Core Brain — classify & run registered Skills; otherwise continue legacy pipeline
  let text = raw
  let coreClaimedMusic = false
  let coreFailedMusicOrTranslate = false
  try {
    const stripped = stripWakeWord(raw).text
    if (stripped) text = stripped
    const core = await processCoreBrain({
      text: raw,
      history,
      locale: getAppLocale(),
      source: opts?.source || 'text',
    })
    coreClaimedMusic = core.intent === 'play_music' || core.intent === 'control_music'
    const handled = coreResultToBrainReply(core)
    if (handled) return enrich(handled)
    // onlyFailed music/translate sets fallbackLegacy=true so legacy may retry once
    coreFailedMusicOrTranslate =
      core.fallbackLegacy &&
      (core.intent === 'play_music' ||
        core.intent === 'control_music' ||
        core.intent === 'translate') &&
      core.selectedSkills.some((id) => id === 'music' || id === 'translation')
    // Use wake-stripped text for the rest of the legacy handlers
    if (stripped) text = stripped
  } catch {
    /* Core Brain must never block legacy commands */
    text = stripWakeWord(raw).text || raw
  }

  if (!text) return { text: `${name}, 무엇을 도와드릴까요?` }

  // Enable / one-shot translate commands (lock already handled above).
  {
    const locked = loadInterpretMode().active
    const escape = locked && isTranslateEscapeCommand(text)
    if (!escape && (locked || wantsTranslate(text))) {
      const tr = await handleTranslate(text)
      if (tr) return enrich(tr)
    }
  }

  // Local fun (lotto / dice) — never blocked by a dead cloud model
  {
    const fun = localFunReply(text)
    if (fun) return enrich({ text: fun, speak: true })
  }

  // Encyclopedia / dictionary (Wikipedia) — answers even when cloud model is down
  if (isKnowledgeQuestion(text)) {
    try {
      const wiki = await answerEncyclopedia(text)
      if (wiki) return enrich({ text: wiki, speak: true })
    } catch {
      /* fall through to cloud */
    }
  }


  // AI 길안내 v2 — internal map / candidates (never auto-open external apps)
  try {
    const nav2 = await tryHandleNavigationV2(text)
    if (nav2?.handled) {
      if (typeof sessionStorage !== 'undefined' && nav2.candidates?.length) {
        sessionStorage.setItem(
          'aizio.navV2.chatCards.v1',
          JSON.stringify({
            query: nav2.query || text,
            candidates: nav2.candidates.slice(0, 5),
            catalogOnly: Boolean(nav2.catalogOnly),
          }),
        )
      }
      return {
        text: nav2.text,
        speak: nav2.speak !== false,
        view: nav2.view || (nav2.openNav ? 'navigation' : undefined),
        action:
          nav2.mapsQuery || nav2.searchQuery
            ? () => {
                if (nav2.mapsQuery) return openMaps(nav2.mapsQuery)
                if (nav2.searchQuery) return openSearch(nav2.searchQuery)
                return { ok: true, message: '검색' }
              }
            : undefined,
      }
    }
  } catch {
    /* nav v2 must never block other skills */
  }

  // External map apps — only when user explicitly names Kakao/TMAP/Naver/Apple/Google
  try {
    if (/(카카오\s*맵|티\s*맵|티맵|T\s*맵|네이버\s*지도|애플\s*지도|구글\s*지도)\s*(으로|로)?/.test(text)) {
      const nav = await tryHandleNavigation(text)
      if (nav?.handled) {
        return {
          text: `${nav.text} (보조: 외부 지도 앱)`,
          speak: nav.speak !== false,
          action: nav.action,
          view: nav.openSettings ? 'settings' : undefined,
        }
      }
    }
  } catch {
    /* external handoff optional */
  }

  // 손님관리 — local CRM (name / birthday lookup)
  try {
    const cust = await tryHandleCustomers(text)
    if (cust?.handled) {
      return {
        text: cust.text,
        speak: cust.speak !== false,
        view: cust.view,
      }
    }
  } catch {
    /* customers must never block other skills */
  }

  // Bare stop always handled (even if lock was cleared / old session)
  if (/^(스톱|스탑|stop|그만|종료)$/i.test(text.trim())) {
    const locked = await handleTranslate(text)
    if (locked) return locked
  }

  // Everyday voice commands (weather/time/…) — API key not required
  const everyday = detectEverydayIntent(text)
  if (everyday?.kind === 'weather' || everyday?.kind === 'umbrella') {
    return replyWeather(everyday.city, settings, everyday.kind === 'umbrella')
  }
  if (everyday?.kind === 'time') {
    return { text: `지금은 ${nowText()}입니다.`, speak: true }
  }
  if (everyday?.kind === 'date') {
    const d = new Date()
    const label = d.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    })
    return { text: `오늘은 ${label}입니다.`, speak: true }
  }
  if (everyday?.kind === 'briefing') {
    try {
      return { text: buildAieDailyBriefChat(), speak: true }
    } catch {
      return { text: morningBriefing(), speak: true }
    }
  }
  if (everyday?.kind === 'userGuide') {
    return { text: userGuideText(name), speak: true }
  }
  if (everyday?.kind === 'help') {
    return { text: helpText(name), speak: true }
  }
  if (everyday?.kind === 'clearChat') {
    return {
      text: '대화를 초기화했습니다. 지난 기록이 삭제되었습니다.',
      speak: true,
      clearChat: true,
    }
  }
  if (everyday?.kind === 'location') {
    try {
      const report = await getLocationReport()
      const fixMatch = report.match(/좌표:\s*([-\d.]+),\s*([-\d.]+)/)
      return {
        text: `【내 위치】\n${report}`,
        speak: true,
        action: fixMatch ? () => openMaps(`${fixMatch[1]},${fixMatch[2]}`) : undefined,
      }
    } catch (err) {
      return {
        text: err instanceof Error ? err.message : '위치를 가져오지 못했습니다.',
        speak: true,
      }
    }
  }

  // Music: Core Brain is the primary path. Legacy runs only if Core did not claim
  // music, or Core claimed it and failed (retry once). Avoid double music handling.
  if (!coreClaimedMusic || coreFailedMusicOrTranslate) {
    try {
      const music = await tryHandleMusicSkill(text, getAppLocale())
      if (music) {
        const show =
          music.showMiniPlayer !== false &&
          music.session.status !== 'stopped' &&
          music.session.status !== 'idle'
        return {
          text: music.text,
          speak: music.speak !== false,
          musicNeedsGesture: music.needsGesture,
          musicPlayUrl: music.playUrl,
          musicShowMiniPlayer: show,
        }
      }
    } catch {
      /* never block normal AI on music classifier errors */
    }
  }

  // App update — UI button lives only in Settings; chat can still trigger the same flow
  if (/^(앱\s*)?업데이트$|최신\s*(판|버전)\s*(받아|업데이트)|앱\s*새로고침|캐시\s*새로고침/i.test(text) && text.length < 28) {
    return {
      text: '최신판 업데이트를 실행합니다. 캐시를 비운 뒤 서버에서 다시 불러옵니다. (버튼은 설정 탭에 있습니다)',
      speak: true,
      action: async () => {
        window.dispatchEvent(new Event('aizio-app-update'))
        return { ok: true, message: '업데이트 시작' }
      },
    }
  }

  // Offline games shortcut
  if (/벽돌|브레이크아웃|breakout/i.test(text) && text.length < 24) {
    return { text: '벽돌깨기 아케이드를 엽니다.', speak: true, view: 'games', arcadeId: 'breakout' }
  }
  if (/스페이스\s*2|스페이스2|격파|세로\s*슈팅|gyeokpa|space\s*2/i.test(text) && text.length < 28) {
    return {
      text: '스페이스2 세로 슈팅을 엽니다. 웨이브와 보스가 나오고, 무기 아이템으로 펄스→트윈→스프레드로 강화됩니다. 라이프·실드·폭탄도 있습니다.',
      speak: true,
      view: 'games',
      arcadeId: 'gyeokpa',
    }
  }
  if (/스페이스|비행기\s*게임/i.test(text) && text.length < 24) {
    return { text: '스페이스 슈팅을 엽니다. 아이템으로 미사일을 진화시키세요.', speak: true, view: 'games', arcadeId: 'shooter' }
  }
  if (/플래피|플래피버드|flappy/i.test(text) && text.length < 24) {
    return { text: '플래피 아케이드를 엽니다.', speak: true, view: 'games', arcadeId: 'flappy' }
  }
  if (/지오\s*대시|지오메트리|geometry\s*dash|대시\s*게임|dash/i.test(text) && text.length < 28) {
    return {
      text: '지오대시를 엽니다. 자동으로 스크롤되니 탭으로 점프해 가시와 블록을 피하세요.',
      speak: true,
      view: 'games',
      arcadeId: 'dash',
    }
  }
  if (/닷지|dodge|장애물\s*피하/i.test(text) && text.length < 24) {
    return { text: '닷지 아케이드를 엽니다.', speak: true, view: 'games', arcadeId: 'dodge' }
  }
  if (/^퐁$|핑퐁|pong/i.test(text) && text.length < 24) {
    return { text: '퐁 아케이드를 엽니다.', speak: true, view: 'games', arcadeId: 'pong' }
  }
  if (/스윽|슬라이딩|슬라이드\s*퍼즐|숫자\s*퍼즐|밀어서\s*맞/i.test(text) && text.length < 28) {
    return {
      text: '스윽 슬라이딩 퍼즐을 엽니다. 빈칸으로 타일을 밀어 숫자를 맞추세요.',
      speak: true,
      view: 'games',
      arcadeId: 'slide',
    }
  }
  if (/과일\s*받|캐치|catch|두더지|mole|차\s*피하|레인|lanes|차선/i.test(text) && text.length < 28) {
    return {
      text: '그 게임은 삭제되었습니다. 스페이스 · 스페이스2 · 플래피 · 지오대시 · 닷지 · 퐁 · 벽돌깨기 · 스윽을 이용해 주세요.',
      speak: true,
      view: 'games',
      arcadeId: 'shooter',
    }
  }
  if (/게임\s*순위|아케이드\s*순위|점수\s*순위|친구\s*순위|랭킹/.test(text)) {
    return {
      text: '게임 순위판을 엽니다. 닉네임을 정하고 친구 기록 코드를 받아 순위를 만드세요.',
      speak: true,
      view: 'games',
    }
  }
  if (/게임\s*기록\s*공유|점수\s*공유|아케이드\s*(?:기록\s*)?공유/.test(text)) {
    return {
      text: '내 아케이드 기록 공유 화면을 엽니다.',
      speak: true,
      view: 'games',
      action: async () => ({ ok: true, message: await openShareUi('arcade') }),
    }
  }
  if (/^(게임|미니게임|오프라인\s*게임|아케이드)/i.test(text) || /게임\s*(할래|하자|열어)/.test(text)) {
    return {
      text: '아케이드 게임 탭으로 이동합니다.\n· 벽돌깨기 · 스페이스(미사일 진화) · 스페이스2\n· 플래피 · 지오대시 · 닷지 · 퐁 · 스윽(슬라이딩)\n기록 공유로 친구 순위도 만들 수 있습니다.',
      speak: true,
      view: 'games',
    }
  }

  if (/멤버|맴버|가족\s*(공간|채팅|대화|탭)|패밀리|family\s*space/i.test(text)) {
    const room = loadFamilyRoom()
    return {
      text: room
        ? `멤버「${room.name}」코드 ${room.code}로 이동합니다.\n참여자 ${room.members.length}명 · 메시지 ${room.messages.length} · 공지 ${room.notices.length} · 일정 ${room.events.length}`
        : '멤버로 이동합니다. 새로 만들거나 초대 코드로 참여하세요.',
      speak: true,
      view: 'family',
    }
  }

  if (/가족\s*공지/.test(text)) {
    const room = loadFamilyRoom()
    if (!room) {
      return { text: '먼저 멤버를 만들어 주세요.', view: 'family', speak: true }
    }
    const m = text.match(/가족\s*공지\s*(.+)$/)
    if (m) {
      const notice = addFamilyNotice(m[1].slice(0, 40), m[1])
      if (notice) void broadcastFamilyPacket({ type: 'notice', notice })
      return {
        text: notice ? `공지 등록: ${notice.title}` : '공지 등록에 실패했습니다.',
        speak: true,
        view: 'family',
      }
    }
    const lines = room.notices.slice(0, 5).map((n) => `• ${n.pinned ? '[고정] ' : ''}${n.title}`)
    return {
      text: lines.length ? `【가족 공지】\n${lines.join('\n')}` : '등록된 가족 공지가 없습니다.',
      speak: true,
      view: 'family',
    }
  }

  if (/가족\s*일정/.test(text)) {
    const room = loadFamilyRoom()
    if (!room) return { text: '먼저 멤버를 만들어 주세요.', view: 'family', speak: true }
    const upcoming = upcomingFamilyEvents(5)
    return {
      text: upcoming.length
        ? `【가족 일정】\n${upcoming.map((e) => `• ${e.date}${e.time ? ' ' + e.time : ''} ${e.title}`).join('\n')}`
        : '다가오는 가족 일정이 없습니다. 가족 탭에서 추가하세요.',
      speak: true,
      view: 'family',
    }
  }

  if (/가족\s*(만들|생성)/.test(text)) {
    const settings = loadSettings()
    const existing = loadFamilyRoom()
    if (existing) {
      return {
        text: `이미 멤버「${existing.name}」코드 ${existing.code}이 있습니다. 새로 만들려면 멤버에서 «나가기» 후 다시 만드세요.`,
        speak: true,
        view: 'family',
      }
    }
    const room = createFamilyRoom('멤버', settings.displayName)
    return {
      text: `멤버 생성: ${room.name}\n초대 코드: ${room.code}\n멤버 → 초대 공유로 알려 주세요.`,
      speak: true,
      view: 'family',
    }
  }

  if (/친구\s*(공간|채팅|대화|탭)|프렌즈|friends?\s*space/i.test(text)) {
    const room = loadFriendsRoom()
    return {
      text: room
        ? `친구 공간「${room.name}」코드 ${room.code}로 이동합니다.\n멤버 ${room.members.length}명 · 메시지 ${room.messages.length} · 공지 ${room.notices.length} · 일정 ${room.events.length}`
        : '친구 탭으로 이동합니다. 새 공간을 만들거나 초대 코드로 참여하세요.',
      speak: true,
      view: 'friends',
    }
  }

  if (/친구\s*공지/.test(text)) {
    const room = loadFriendsRoom()
    if (!room) {
      return { text: '먼저 친구 공간을 만들어 주세요.', view: 'friends', speak: true }
    }
    const m = text.match(/친구\s*공지\s*(.+)$/)
    if (m) {
      const notice = addFriendsNotice(m[1].slice(0, 40), m[1])
      if (notice) void broadcastFriendsPacket({ type: 'notice', notice })
      return {
        text: notice ? `공지 등록: ${notice.title}` : '공지 등록에 실패했습니다.',
        speak: true,
        view: 'friends',
      }
    }
    const lines = room.notices.slice(0, 5).map((n) => `• ${n.pinned ? '[고정] ' : ''}${n.title}`)
    return {
      text: lines.length ? `【친구 공지】\n${lines.join('\n')}` : '등록된 친구 공지가 없습니다.',
      speak: true,
      view: 'friends',
    }
  }

  if (/친구\s*일정/.test(text)) {
    const room = loadFriendsRoom()
    if (!room) return { text: '먼저 친구 공간을 만들어 주세요.', view: 'friends', speak: true }
    const upcoming = upcomingFriendsEvents(5)
    return {
      text: upcoming.length
        ? `【친구 일정】\n${upcoming.map((e) => `• ${e.date}${e.time ? ' ' + e.time : ''} ${e.title}`).join('\n')}`
        : '다가오는 친구 일정이 없습니다. 친구 탭에서 추가하세요.',
      speak: true,
      view: 'friends',
    }
  }

  if (/친구\s*(만들|생성)|친구\s*공간\s*(만들|생성)/.test(text)) {
    const settings = loadSettings()
    const existing = loadFriendsRoom()
    if (existing) {
      return {
        text: `이미 친구 공간「${existing.name}」코드 ${existing.code}이 있습니다. 새로 만들려면 친구 탭에서 «나가기» 후 다시 만드세요.`,
        speak: true,
        view: 'friends',
      }
    }
    const room = createFriendsRoom('우리 친구', settings.displayName)
    return {
      text: `친구 공간 생성: ${room.name}\n초대 코드: ${room.code}\n친구 탭 → 초대 공유로 알려 주세요.`,
      speak: true,
      view: 'friends',
    }
  }

  // Translate lock must win over stocks/stats/life until user says 스톱
  if (loadInterpretMode().active) {
    const locked = await handleTranslate(text)
    if (locked) return locked
  }

  const stats = await handleStats(text)
  if (stats) return stats

  // Lifestyle recommends (food / travel / movies / …) before stock screening
  const lifestyleKind = detectLifestyleRecommend(text)
  if (lifestyleKind) {
    const life = buildLifestyleReply(text, lifestyleKind)
    return {
      text: life.text,
      speak: true,
      action: () => {
        if (life.youtubeQuery) {
          return openUrl(
            `https://www.youtube.com/results?search_query=${encodeURIComponent(life.youtubeQuery)}`,
            'YouTube',
          )
        }
        if (life.mapsQuery) return openMaps(life.mapsQuery)
        if (life.searchQuery) return openSearch(life.searchQuery)
        return { ok: true, message: '추천' }
      },
    }
  }

  const invest = await handleInvest(text)
  if (invest) return invest

  const translated = await handleTranslate(text)
  if (translated) return translated

  // Device GPS — before handleGeo so "현재 위치/위치 알려" is not wiki-hijacked
  if (
    /^(내\s*위치|지금\s*어디|현재\s*위치|위치\s*알려|where\s*am\s*i)/i.test(text) ||
    /내\s*위치|지금\s*어디야|현재\s*위치|위치\s*알려\s*줘?/.test(text)
  ) {
    try {
      const report = await getLocationReport()
      const fixMatch = report.match(/좌표:\s*([-\d.]+),\s*([-\d.]+)/)
      return {
        text: `【내 위치】\n${report}`,
        speak: true,
        action: fixMatch ? () => openMaps(`${fixMatch[1]},${fixMatch[2]}`) : undefined,
      }
    } catch (err) {
      return {
        text: err instanceof Error ? err.message : '위치를 가져오지 못했습니다.',
        speak: true,
      }
    }
  }

  const geo = await handleGeo(text)
  if (geo) return geo

  const life = await handleLife(text)
  if (life) return life

  const appIntent = resolveAppIntent(text)
  if (appIntent) {
    return { text: appIntent.message, speak: true, action: () => appIntent }
  }

  // Legacy short map patterns → internal Navigation v2 (no auto external open)
  const mapMatch = text.match(/^(?:지도|길찾기)\s*(.+)$/i) || text.match(/^(.+?)\s*(?:지도|길찾기)$/i)
  if (mapMatch) {
    const q = mapMatch[1].trim()
    try {
      const nav2 = await tryHandleNavigationV2(`${q} 안내해 줘`)
      if (nav2?.handled) {
        return { text: nav2.text, speak: true, view: nav2.view || 'navigation' }
      }
    } catch {
      /* fall through */
    }
    return { text: `「${q}」장소를 AIZIO 길안내에서 검색해 보세요.`, speak: true, view: 'navigation' }
  }

  if (wantsWeatherCommand(text)) {
    const intent = detectEverydayIntent(text)
    const city = intent && (intent.kind === 'weather' || intent.kind === 'umbrella') ? intent.city : ''
    return replyWeather(city, settings, intent?.kind === 'umbrella')
  }

  const searchMatch = text.match(/^(?:검색|찾아|구글)\s*(.+)$/i)
  if (searchMatch) {
    return {
      text: `"${searchMatch[1]}" 검색을 엽니다.`,
      speak: true,
      action: () => openSearch(searchMatch[1]),
    }
  }

  const translateMatch = text.match(/^(?:번역|영어로)\s*(.+)$/i) || text.match(/^(.+?)\s*번역해?$/)
  if (translateMatch) {
    // handled earlier by handleTranslate; keep Google fallback only for leftover
    return {
      text: '통역 엔진으로 처리합니다. 예: "영어 통역 모드" 또는 "일본어로 번역해 안녕하세요"',
      speak: true,
    }
  }

  const phoneMatch = text.match(/(?:전화|콜)\s*([0-9+\- ]{4,})/i)
  if (phoneMatch) {
    return { text: '전화를 겁니다.', speak: true, action: () => callPhone(phoneMatch[1]) }
  }

  const smsMatch = text.match(/(?:문자|메시지)\s*([0-9+\- ]{4,})\s*(.*)$/i)
  if (smsMatch) {
    return { text: '문자를 엽니다.', speak: true, action: () => sendSms(smsMatch[1], smsMatch[2] || '') }
  }

  const mailMatch = text.match(/(?:메일|이메일)\s*([^\s]+@[^\s]+)\s*(.*)$/i)
  if (mailMatch) {
    return { text: '메일을 엽니다.', speak: true, action: () => openMail(mailMatch[1], '', mailMatch[2] || '') }
  }

  if (/복사해|클립보드/.test(text)) {
    const payload = text.replace(/.*(?:복사해|복사해줘)\s*/i, '').trim() || text
    return { text: '클립보드에 복사합니다.', action: () => copyText(payload) }
  }

  if (/^(?:앱\s*공유|공유\s*QR|QR\s*공유|친구에게\s*공유)$/i.test(text) || /앱\s*공유|QR\s*코드|큐알/.test(text)) {
    return {
      text: '앱 공유 QR을 엽니다.',
      speak: true,
      action: async () => ({ ok: true, message: await openShareUi('app') }),
    }
  }

  if (/백업\s*(?:공유|QR|보내)|데이터\s*공유|백업\s*내보내/.test(text)) {
    return {
      text: '백업 공유 화면을 엽니다.',
      speak: true,
      action: async () => ({ ok: true, message: await openShareUi('backup') }),
    }
  }

  if (/^공유해?$|^공유해\s*줘$/.test(text)) {
    return {
      text: '앱 공유 QR을 엽니다.',
      speak: true,
      action: async () => ({ ok: true, message: await openShareUi('app') }),
    }
  }

  if (/공유해/.test(text)) {
    const payload = text.replace(/공유해(?:줘)?/gi, '').trim() || text
    if (/백업|데이터/.test(payload)) {
      return {
        text: '백업을 공유합니다.',
        action: async () => shareBackupFile(),
      }
    }
    return { text: '공유 시트를 엽니다.', action: () => shareText(payload) }
  }

  if (/유튜브|youtube/i.test(text) && /열어|실행|켜/.test(text)) {
    return { text: 'YouTube를 엽니다.', speak: true, action: () => openApp('유튜브') }
  }

  if (hasAnyConfiguredProvider()) {
    try {
      const cloud = await callCloudLLM(text, settings, history)
      if (cloud) return enrich({ text: cloud, speak: true })
    } catch (err) {
      // Never hard-stop the app on a dead model — local fun/casual/wiki still work
      const fun = localFunReply(text)
      if (fun) return enrich({ text: fun, speak: true })
      if (isKnowledgeQuestion(text)) {
        try {
          const wiki = await answerEncyclopedia(text)
          if (wiki) return enrich({ text: wiki, speak: true })
        } catch {
          /* ignore */
        }
      }
      const casual = localCasualReply(text)
      if (casual) return enrich({ text: casual, speak: true })
      return enrich({
        text: [
          aiEngineErrorText(err),
          '',
          '그동안 로컬로 바로 쓸 수 있는 예:',
          '· 로또번호 추천해줘 · 주사위 · 브리핑 · 오늘 날씨 · 할 일 · 집중 시작',
          '설정 → AI 에서 다른 모델/무료 AI(OpenRouter·Gemini·Groq)로 바꿔 보세요.',
        ].join('\n'),
        speak: true,
      })
    }
  }

  // Soft fallback: if looks like ticker, try quote
  const maybe = extractTickerFromText(text)
  if (maybe && text.length < 40) {
    try {
      const q = await fetchQuote(maybe.symbol)
      if (q) return { text: formatQuote(q) + '\n면책: 참고용입니다.', speak: true }
    } catch {
      /* ignore */
    }
  }

  // Readable casual chat (compliment / thanks / emotion) — never STT-error path
  const casual = localCasualReply(text)
  if (casual) return enrich({ text: casual, speak: true })

  // STT garbage only for true gibberish — not for unknown-but-readable chat
  if (looksLikeSttGarbage(text)) {
    const lines = ['음성을 잘 듣지 못했어요. 다시 말해 주세요.']
    if (loadInterpretMode().active) {
      lines.push('통역 중이면 «스톱»을 누른 뒤 다시 말해 주세요.')
    }
    return { text: lines.join('\n'), speak: true }
  }

  if (isCasualChatText(text)) {
    return {
      text: '말씀 감사해요. 필요한 일이 있으면 편하게 말해 주세요.',
      speak: true,
    }
  }

  return {
    text: [
      '잘 이해하지 못했어요. 조금 다르게 말해 주시겠어요?',
      '예: 오늘 날씨 알려줘 · 브리핑 · 지금 몇 시야 · 삼성전자 시세 · 통계 · 도움말',
      hasAnyConfiguredProvider() ? '' : hybridNoProviderMessage(),
    ]
      .filter(Boolean)
      .join('\n'),
    speak: true,
  }
}
