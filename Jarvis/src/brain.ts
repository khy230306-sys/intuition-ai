import {
  callPhone,
  copyText,
  openApp,
  openMail,
  openMaps,
  openSearch,
  openTranslate,
  openWeather,
  resolveAppIntent,
  sendSms,
  shareText,
} from './actions'
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
import { buildColdRecommendations, wantsStockRecommend } from './recommend'
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
import { handleStats } from './statsBrain'
import type { BrainReply, JarvisSettings } from './types'

function helpText(name: string): string {
  return [
    `${name}, JARVIS 만능 비서입니다.`,
    '',
    '【일상】 브리핑 · 할 일 · 장바구니 · 지출 · 습관 · 일기 · 계산 · 변환',
    '【투자】 시세 · 냉정 종목추천 · 관심종목 · 포트폴리오 · 포지션 · 적립식',
    '【통계】 실시간 데이터 입력 → 평균/분산/확률/회귀 해답',
    '',
    '예시',
    '• 브리핑 / 오늘 뭐하지',
    '• 주식 종목 추천 / 미국 보수 추천 / 냉정하게 추천',
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
    '종목 추천은 API 키 없이 동작합니다. 심화 자유대화만 설정 API 키가 필요합니다.',
    '면책: 투자 조언이 아니며 손실 책임은 본인에게 있습니다.',
  ].join('\n')
}

async function callCloudLLM(
  userText: string,
  settings: JarvisSettings,
  history: { role: string; text: string }[],
): Promise<string | null> {
  if (!settings.apiKey.trim()) return null
  const base = settings.apiBase.replace(/\/$/, '')
  const profile = loadProfile()
  const messages = [
    {
      role: 'system',
      content: [
        `당신은 iPhone용 만능 비서 JARVIS입니다. 호칭: "${settings.displayName}".`,
        '한국어로 명확·실용적으로 답하고, 실행 가능한 다음 행동을 제안하세요.',
        '주식/투자: 교육·분석 프레임·리스크 관점을 제공하되, 매수/매도 강요 금지. 반드시 면책 한 줄.',
        `투자 성향: ${profile.riskTolerance}, horizon: ${profile.investHorizon}.`,
        '사용자 컨텍스트:',
        lifeContextBlock(),
      ].join('\n'),
    },
    ...history.slice(-14).map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.text,
    })),
    { role: 'user', content: userText },
  ]

  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${settings.apiKey.trim()}`,
    },
    body: JSON.stringify({
      model: settings.model || 'gpt-4o-mini',
      messages,
      temperature: 0.45,
    }),
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`API 오류 (${res.status}): ${errText.slice(0, 180)}`)
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  return data.choices?.[0]?.message?.content?.trim() || null
}

async function handleInvest(text: string): Promise<BrainReply | null> {
  if (wantsStockRecommend(text)) {
    const report = await buildColdRecommendations(text)
    return { text: report, speak: true }
  }

  if (/장\s*시간|시장\s*개장|장중|마켓\s*아워|market\s*hours/i.test(text)) {
    return { text: marketSessionNow(), speak: true }
  }

  if (/포트폴리오|보유\s*현황|내\s*주식|자산\s*현황/i.test(text)) {
    const holdings = loadHoldings()
    if (holdings.length === 0) {
      return {
        text: '보유 종목이 없습니다.\n예: "보유 삼성전자 10주 평단 70000"',
      }
    }
    const lines: string[] = ['【포트폴리오】']
    let totalKrw = 0
    let totalUsd = 0
    for (const h of holdings) {
      try {
        const q = await fetchQuote(h.symbol)
        lines.push(analyzeHolding(h, q))
        lines.push('')
        if (q) {
          if (h.currency === 'KRW') totalKrw += q.price * h.shares
          else totalUsd += q.price * h.shares
        } else if (h.currency === 'KRW') totalKrw += h.avgPrice * h.shares
        else totalUsd += h.avgPrice * h.shares
      } catch {
        lines.push(analyzeHolding(h, null))
        lines.push('')
      }
    }
    if (totalKrw) lines.push(`KRW 합계(추정) ${formatMoney(totalKrw, 'KRW')}`)
    if (totalUsd) lines.push(`USD 합계(추정) ${formatMoney(totalUsd, 'USD')}`)
    lines.push('면책: 시세 지연·오류 가능. 투자 결정 책임은 본인에게 있습니다.')
    return { text: lines.join('\n'), speak: false }
  }

  if (/관심\s*종목\s*(목록|보여|리스트)|워치\s*리스트|watchlist/i.test(text)) {
    const list = loadWatchlist()
    if (!list.length) return { text: '관심종목이 비어 있습니다. "관심종목 삼성전자 추가"' }
    const lines: string[] = ['【관심종목】']
    for (const w of list.slice(0, 15)) {
      try {
        const q = await fetchQuote(w.symbol)
        lines.push(q ? formatQuote(q) : `${w.name} (${w.symbol})`)
        if (w.targetPrice) lines.push(`목표가 ${formatMoney(w.targetPrice, q?.currency || 'KRW')}`)
        lines.push('')
      } catch {
        lines.push(`${w.name} (${w.symbol})`)
      }
    }
    return { text: lines.join('\n') }
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
    return { text: morningBriefing(), speak: true }
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

  const expenseMatch =
    text.match(/(?:지출|썼어|결제)\s*(.+?)\s*([\d,]+)\s*원/) ||
    text.match(/([\d,]+)\s*원\s*(?:지출|썼|결제)\s*(.*)/)
  if (expenseMatch) {
    let category = '기타'
    let amount = 0
    let note = ''
    if (/원/.test(expenseMatch[2] || '')) {
      amount = parseFloat(expenseMatch[1].replace(/,/g, ''))
      note = (expenseMatch[2] || '').trim()
    } else {
      category = expenseMatch[1].replace(/\s*([\d,]+).*/, '').trim() || expenseMatch[1].trim()
      const num = expenseMatch[0].match(/([\d,]+)\s*원/)
      amount = num ? parseFloat(num[1].replace(/,/g, '')) : parseFloat((expenseMatch[2] || '0').replace(/,/g, ''))
      note = expenseMatch[1]
      if (/([\d,]+)/.test(expenseMatch[1])) {
        const parts = expenseMatch[1].split(/\s+/)
        category = parts[0]
      }
    }
    const item = addExpense(amount, category || '기타', note)
    const totals = expenseTotals()
    return {
      text: `지출 기록: ${item.category} ${formatMoney(item.amount, 'KRW')}\n오늘 ${formatMoney(totals.today, 'KRW')} · 이번달 ${formatMoney(totals.month, 'KRW')}`,
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

  if (/^(도움말|헬프|help|기능)$/i.test(text) || text.includes('도움말')) {
    return { text: helpText(name) }
  }

  if (/안녕|하이|헬로|hello|hi\b/.test(text)) {
    return {
      text: `안녕하세요, ${name}. JARVIS입니다. "브리핑" 또는 "삼성전자 시세"로 시작해 보세요.`,
      speak: true,
    }
  }

  return null
}

export async function think(
  input: string,
  history: { role: string; text: string }[] = [],
): Promise<BrainReply> {
  const text = input.trim()
  const settings = loadSettings()
  const name = settings.displayName

  if (!text) return { text: `${name}, 무엇을 도와드릴까요?` }

  const stats = await handleStats(text)
  if (stats) return stats

  const invest = await handleInvest(text)
  if (invest) return invest

  const life = await handleLife(text)
  if (life) return life

  const appIntent = resolveAppIntent(text)
  if (appIntent) {
    return { text: appIntent.message, speak: true, action: () => appIntent }
  }

  const mapMatch = text.match(/^(?:지도|길찾기)\s*(.+)$/i) || text.match(/^(.+?)\s*(?:지도|길찾기)$/i)
  if (mapMatch) {
    const q = mapMatch[1].trim()
    return { text: `"${q}" 지도를 엽니다.`, speak: true, action: () => openMaps(q) }
  }

  const weatherMatch = text.match(/^(?:날씨)\s*(.*)$/i) || text.match(/^(.+?)\s*날씨$/i)
  if (weatherMatch || /날씨/.test(text)) {
    const city = weatherMatch?.[1]?.trim() || settings.city || ''
    return {
      text: city ? `${city} 날씨를 확인합니다.` : '날씨를 엽니다.',
      speak: true,
      action: () => openWeather(city),
    }
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
    return {
      text: '번역을 엽니다.',
      speak: true,
      action: () => openTranslate(translateMatch[1]),
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

  if (/공유해/.test(text)) {
    const payload = text.replace(/공유해(?:줘)?/gi, '').trim() || text
    return { text: '공유 시트를 엽니다.', action: () => shareText(payload) }
  }

  if (/유튜브|youtube/i.test(text) && /열어|실행|켜/.test(text)) {
    return { text: 'YouTube를 엽니다.', speak: true, action: () => openApp('유튜브') }
  }

  if (settings.apiKey.trim()) {
    try {
      const cloud = await callCloudLLM(text, settings, history)
      if (cloud) return { text: cloud, speak: true }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'API 호출 실패'
      return { text: `${msg}\n로컬 명령은 "도움말"을 참고하세요.` }
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

  return {
    text: [
      '명령을 이해하지 못했습니다.',
      '예: 브리핑 · 삼성전자 시세 · 데이터 1.2 -0.5 3 · 통계 · 도움말',
      settings.apiKey.trim() ? '' : '설정에 API 키를 넣으면 자유 대화·심화 분석이 가능합니다.',
    ]
      .filter(Boolean)
      .join('\n'),
  }
}
