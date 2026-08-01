import {
  answerStatQuestion,
  formatDescriptive,
  formatProbabilityAnswer,
  formatRegression,
  parseNumbers,
} from './stats'
import {
  appendSeriesValues,
  clearSeries,
  deleteSeries,
  getActiveSeriesName,
  getSeries,
  loadSeriesList,
  replaceSeriesValues,
  setActiveSeriesName,
} from './storage'
import { extractTickerFromText } from './tickers'
import { fetchQuote } from './finance'
import type { BrainReply } from './types'

function resolveSeriesName(raw?: string): string {
  const n = (raw || '').trim()
  if (!n || /^(기본|데이터|통계|현재)$/.test(n)) return getActiveSeriesName()
  return n
}

function recentPreview(values: number[], n = 8): string {
  if (!values.length) return '(비어 있음)'
  const slice = values.slice(-n)
  const more = values.length > n ? ` …외 ${values.length - n}개` : ''
  return `${slice.join(', ')}${more}`
}

export async function handleStats(text: string): Promise<BrainReply | null> {
  const t = text.trim()

  // Live quote sample into series: "시세기록 삼성전자" / "삼성전자 통계기록"
  const quoteLog =
    t.match(/(?:시세\s*기록|통계\s*기록|데이터\s*기록)\s*(.+)$/i) ||
    t.match(/^(.+?)\s*(?:시세\s*기록|통계\s*기록)$/i)
  if (quoteLog) {
    const ticker = extractTickerFromText(quoteLog[1])
    if (!ticker) return { text: '종목을 인식하지 못했습니다. 예: 시세기록 삼성전자' }
    try {
      const q = await fetchQuote(ticker.symbol)
      if (!q) return { text: `${ticker.name} 시세를 가져오지 못했습니다.` }
      const seriesName = `${ticker.name}시세`
      const series = appendSeriesValues(seriesName, [q.price])
      return {
        text: [
          `실시간 시세 기록 → 데이터셋 "${seriesName}"`,
          `추가값 ${q.price.toLocaleString('ko-KR')} ${q.currency} (n=${series.values.length})`,
          formatDescriptive(seriesName, series.values),
        ].join('\n\n'),
        speak: true,
      }
    } catch {
      return { text: '시세 기록 중 오류가 발생했습니다.' }
    }
  }

  // Create / switch dataset
  const useSet =
    t.match(/^(?:데이터셋|데이터\s*이름|통계\s*세트)\s*(?:선택|전환|사용)?\s*(.+)$/i) ||
    t.match(/^(.+?)\s*데이터셋\s*(?:선택|사용|전환)$/i)
  if (useSet && !/추가|넣|기록|삭제|초기화|통계|평균/.test(t)) {
    const name = useSet[1].replace(/^(만들기|생성|새)\s*/, '').trim()
    setActiveSeriesName(name)
    const s = getSeries(name)
    return {
      text: `활성 데이터셋: "${s.name}" (n=${s.values.length})\n최근: ${recentPreview(s.values)}`,
      speak: true,
    }
  }

  // Replace / set many numbers at once
  // "데이터 수익률 1.2 -0.3 2.1" OR "데이터 1 2 3 4"
  const dataSet =
    t.match(/^(?:데이터|통계\s*데이터|입력)\s*(?:셋\s*)?(?:[:：])?\s*(.+)$/i) ||
    t.match(/^(?:실시간\s*데이터|관측값)\s*(.+)$/i)
  if (dataSet) {
    const body = dataSet[1].trim()
    const nums = parseNumbers(body)
    // Named: first token is name if not a number-only start
    const nameMatch = body.match(/^([^\d\-\s.,]+)\s+(.+)$/)
    let name = getActiveSeriesName()
    let numbers = nums
    if (nameMatch && parseNumbers(nameMatch[1]).length === 0) {
      name = nameMatch[1].trim()
      numbers = parseNumbers(nameMatch[2])
    }
    if (!numbers.length) {
      // maybe only switching name with no numbers: "데이터 수익률"
      if (nameMatch && !parseNumbers(body).length) {
        setActiveSeriesName(nameMatch[1].trim())
        const s = getSeries(nameMatch[1].trim())
        return { text: `활성 데이터셋 "${s.name}" (n=${s.values.length})` }
      }
      return { text: '숫자를 찾지 못했습니다. 예: 데이터 수익률 1.2 -0.5 3.0' }
    }
    // If user said "추가" in same phrase, append; else if dataset empty append/replace both ok — default REPLACE when many, APPEND when "추가"
    const append = /추가|이어|append|실시간/.test(t)
    const series = append ? appendSeriesValues(name, numbers) : replaceSeriesValues(name, numbers)
    return {
      text: [
        `${append ? '데이터 추가' : '데이터 저장'} 완료: "${series.name}"`,
        `이번에 ${numbers.length}개 · 총 n=${series.values.length}`,
        `최근: ${recentPreview(series.values)}`,
        '',
        formatDescriptive(series.name, series.values),
      ].join('\n'),
      speak: true,
    }
  }

  // Append only: "추가 1.5 2.0" / "수익률에 1.2 추가"
  if (/관심\s*종목|워치|보유|매수|할\s*일|장바구니|습관/.test(t)) {
    return null
  }
  const appendMatch =
    t.match(/^(?:추가|데이터\s*추가|관측\s*추가)\s*(.+)$/i) ||
    t.match(/^(.+?)(?:에|데이터에)?\s*(?:값\s*)?(-?[\d.,\s]+)\s*추가$/i) ||
    t.match(/^(.+?)에\s*(-?[\d.]+(?:\s+-?[\d.]+)*)\s*(?:넣어|입력)$/i)
  if (appendMatch) {
    let name = getActiveSeriesName()
    let nums = parseNumbers(appendMatch[1])
    if (appendMatch[2]) {
      name = resolveSeriesName(appendMatch[1].replace(/에$/, '').trim())
      nums = parseNumbers(appendMatch[2])
    } else if (/[^\d\s.,\-]/.test(appendMatch[1]) && nums.length) {
      // "추가 수익률 1 2" unlikely; "추가 1 2" ok
      const named = appendMatch[1].match(/^([^\d\-\s.,]+)\s+(.+)$/)
      if (named && parseNumbers(named[1]).length === 0) {
        name = named[1]
        nums = parseNumbers(named[2])
      }
    }
    if (!nums.length) return { text: '추가할 숫자를 알려 주세요. 예: 추가 1.25' }
    const series = appendSeriesValues(name, nums)
    const d = formatDescriptive(series.name, series.values)
    return {
      text: `실시간 반영: "${series.name}" +[${nums.join(', ')}] → n=${series.values.length}\n\n${d}`,
      speak: true,
    }
  }

  // Clear / delete
  if (/^(?:데이터|통계)\s*(?:초기화|리셋|비우)/i.test(t) || /^초기화\s*데이터/.test(t)) {
    const name = getActiveSeriesName()
    clearSeries(name)
    return { text: `"${name}" 데이터를 비웠습니다.`, speak: true }
  }
  const del = t.match(/^(?:데이터셋|데이터)\s*(.+?)\s*(?:삭제|제거)$/i)
  if (del) {
    deleteSeries(del[1].trim())
    return { text: `데이터셋 "${del[1].trim()}"을(를) 삭제했습니다.` }
  }

  // List datasets
  if (/데이터셋\s*목록|통계\s*목록|데이터\s*목록/.test(t)) {
    const list = loadSeriesList()
    if (!list.length) return { text: '저장된 데이터셋이 없습니다. "데이터 점수 80 90 70"으로 시작하세요.' }
    const active = getActiveSeriesName()
    return {
      text: list
        .map((s) => `${s.name === active ? '▶' : '•'} ${s.name} (n=${s.values.length})`)
        .join('\n'),
    }
  }

  // Correlation / regression: "상관 A B" / "회귀 광고 매출"
  const corr = t.match(/^(?:상관|상관관계|회귀)\s*(.+?)\s+(?:와|과|,)?\s*(.+)$/i)
  if (corr) {
    const a = getSeries(corr[1].trim())
    const b = getSeries(corr[2].trim())
    return { text: formatRegression(a.name, a.values, b.name, b.values) }
  }

  // Probability: "확률 80 이상" / "수익률 0 이상 확률"
  const prob =
    t.match(/(?:확률|가능성).*?(-?[\d.]+)\s*(이상|초과|이하|미만)/i) ||
    t.match(/(-?[\d.]+)\s*(이상|초과|이하|미만).*?(?:확률|가능성)/i)
  if (prob || /확률|가능성/.test(t)) {
    const series = getSeries()
    const m =
      prob ||
      t.match(/(-?[\d.]+)\s*(이상|초과|이하|미만)/)
    if (!m) {
      return { text: '예: 확률 80 이상 / 0 이하 확률' }
    }
    const thr = parseFloat(m[1])
    const mode = /이상|초과/.test(m[2]) ? 'above' : 'below'
    return {
      text: formatProbabilityAnswer(series.name, series.values, thr, mode),
      speak: true,
    }
  }

  // Full report
  if (/^(?:통계|통계\s*분석|통계\s*요약|분석해|분석해줘)(?:\s+(.+))?$/i.test(t) || /통계\s*보여/.test(t)) {
    const m = t.match(/(?:통계|분석)(?:\s*분석|\s*요약|\s*보여(?:줘)?)?(?:\s+(.+))?$/i)
    const name = resolveSeriesName(m?.[1])
    const series = getSeries(name)
    setActiveSeriesName(series.name)
    return { text: formatDescriptive(series.name, series.values), speak: true }
  }

  // Specific questions against active or named series
  if (/평균|중앙값|표준\s*편차|분산|최대|최소|합계|승률|사분위|신뢰\s*구간|이상치|표본|변동성/.test(t)) {
    // optional name at start: "수익률 평균"
    const named = t.match(/^([^\s]+)\s+(평균|중앙값|표준편차|분산|최대|최소|합계|승률|사분위|신뢰구간|이상치|표본|변동성)/)
    const name = named ? resolveSeriesName(named[1]) : getActiveSeriesName()
    const series = getSeries(name)
    const ans = answerStatQuestion(series.name, series.values, t)
    if (ans) return { text: ans, speak: true }
  }

  // Bare number stream while in "stats mood": if message is only numbers, append to active
  if (/^[\d\s.,\-]+$/.test(t) && parseNumbers(t).length >= 1) {
    const nums = parseNumbers(t)
    // Only auto-append if active series already has data OR user sent 3+ numbers
    const active = getSeries()
    if (active.values.length > 0 || nums.length >= 3) {
      const series = appendSeriesValues(active.name, nums)
      return {
        text: `실시간 수신 "${series.name}" +[${nums.join(', ')}] → n=${series.values.length}\n평균 ${series.values.reduce((a, b) => a + b, 0) / series.values.length}`,
        speak: true,
      }
    }
  }

  if (/통계\s*도움말|데이터\s*도움말|통계\s*사용법/.test(t)) {
    return {
      text: [
        '【실시간 통계 사용법】',
        '1) 데이터 넣기: 데이터 수익률 1.2 -0.5 3.1',
        '2) 실시간 추가: 추가 0.8  /  또는 숫자만 입력',
        '3) 분석: 통계  /  평균  /  표준편차  /  승률',
        '4) 확률: 확률 0 이상',
        '5) 상관: 상관 광고 매출',
        '6) 시세 기록: 시세기록 삼성전자',
        '7) 데이터셋 목록 / 데이터 초기화',
      ].join('\n'),
    }
  }

  return null
}
