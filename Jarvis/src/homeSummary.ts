import { expenseTotals, loadReminders, loadSettings } from './storage'
import { loadAlarms } from './notify'
import { formatWeatherLine, loadCachedWeather, type WeatherSnap } from './weather'
import { formatMoney } from './finance'

export type HomeSummary = {
  weatherLine: string
  todos: string[]
  spendToday: number
  spendLabel: string
  nextAlarm: string | null
  city: string
}

export function buildHomeSummary(weather?: WeatherSnap | null): HomeSummary {
  const settings = loadSettings()
  const w = weather ?? loadCachedWeather()
  const todos = loadReminders()
    .filter((r) => !r.done)
    .slice(0, 2)
    .map((r) => r.text)
  const spend = expenseTotals()
  const now = Date.now()
  const alarms = loadAlarms()
    .filter((a) => !a.fired && a.whenAt > now)
    .sort((a, b) => a.whenAt - b.whenAt)
  const next = alarms[0]
  const nextFromReminders = loadReminders()
    .filter((r) => !r.done && r.whenAt && r.whenAt > now)
    .sort((a, b) => (a.whenAt || 0) - (b.whenAt || 0))[0]

  let nextAlarm: string | null = null
  if (next) {
    const d = new Date(next.whenAt)
    nextAlarm = `${d.getHours().toString().padStart(2, '0')}:${d
      .getMinutes()
      .toString()
      .padStart(2, '0')} ${next.body}`
  } else if (nextFromReminders?.whenAt) {
    const d = new Date(nextFromReminders.whenAt)
    nextAlarm = `${d.getHours().toString().padStart(2, '0')}:${d
      .getMinutes()
      .toString()
      .padStart(2, '0')} ${nextFromReminders.text}`
  }

  return {
    weatherLine: w ? formatWeatherLine(w) : '날씨 불러오는 중…',
    todos,
    spendToday: spend.today,
    spendLabel: formatMoney(spend.today, 'KRW'),
    nextAlarm,
    city: settings.city || '서울',
  }
}
