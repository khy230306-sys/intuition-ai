import type { BrainReply } from '../types'
import { addReminder, loadReminders } from '../storage'
import { upcomingFamilyEvents, addFamilyEvent, loadFamilyRoom } from '../familyStore'
import { broadcastFamilyPacket } from '../familySyncLazy'
import { handleSmartReminderText } from '../smartReminder'
import { listActiveReminders } from '../smartReminder'
import { saveInterpretMode, loadInterpretMode } from '../translateBrain'
import { requestCurrentPosition } from '../navigationV2/geolocationService'
import { offsetToWhenAt } from './datetimeParse'
import { clearParkingMemory, loadParkingMemory, saveParkingMemory } from './storage'
import { buildLifeBriefing, formatBriefingText } from './briefing'
import { looksLikeLifeAssistantCommand, routeLifeAssistantIntent } from './intentRouter'
import type { LifeAssistantIntentResult } from './types'
import {
  addFamilyHelperSchedule,
  listFamilyHelperSchedules,
  listFamilyMembers,
} from '../family-helper/store'

function mergeMissing(r: LifeAssistantIntentResult): string[] {
  const missing = [...(r.missingFields || [])]
  if (r.intent === 'calendar.create' && !r.title && !r.extractedEntities.title) {
    if (!missing.includes('title')) missing.push('title')
  }
  if (r.intent === 'reminder.create' && !r.reminderOffset && !r.time) {
    if (!missing.includes('time')) missing.push('time')
  }
  return missing
}

async function executeIntent(r: LifeAssistantIntentResult): Promise<BrainReply | null> {
  const missing = mergeMissing(r)
  if (missing.length && r.requiresConfirmation) {
    return {
      text: `조금 더 알려주세요. 필요한 정보: ${missing.join(', ')}\n예: 「내일 오후 3시 병원 예약 추가해줘」`,
      speak: true,
    }
  }

  switch (r.intent) {
    case 'calendar.read': {
      const family = upcomingFamilyEvents(14)
      const helper = listFamilyHelperSchedules({ days: 14 })
      const lines: string[] = []
      if (r.extractedEntities.missedOnly) {
        const today = new Date().toISOString().slice(0, 10)
        const missed = [...family.filter((e) => e.date < today), ...helper.filter((e) => e.date < today && !e.done)]
        if (!missed.length) return { text: '놓친 일정은 없어요.', speak: true }
        lines.push('【놓친 일정】')
        for (const e of missed.slice(0, 8)) {
          lines.push(`· ${e.date} ${'title' in e ? e.title : (e as { title: string }).title}`)
        }
        return { text: lines.join('\n'), speak: true, view: 'family-helper' }
      }
      const important = r.extractedEntities.importantOnly
      lines.push(r.date ? `【${r.date} 일정】` : '【다가오는 일정】')
      const famLines = family
        .filter((e) => !important || /병원|예방|생일|기념|시험|면접/.test(e.title))
        .slice(0, 8)
        .map((e) => `· ${e.date}${e.time ? ` ${e.time}` : ''} ${e.title} (가족)`)
      const helpLines = helper
        .filter((e) => !e.done)
        .filter((e) => !important || /병원|예방|생일|기념|시험|면접|하원|등교/.test(e.title))
        .slice(0, 8)
        .map((e) => `· ${e.date}${e.time ? ` ${e.time}` : ''} ${e.title} (가족도우미)`)
      if (!famLines.length && !helpLines.length) {
        return { text: '등록된 일정이 거의 없어요. 「내일 오후 3시 병원 예약 추가해줘」로 넣을 수 있어요.', speak: true }
      }
      return { text: [...lines, ...famLines, ...helpLines].join('\n'), speak: true, view: 'family-helper' }
    }

    case 'calendar.create':
    case 'family.schedule.create': {
      const title = (r.title || r.extractedEntities.title || '일정').trim()
      const date = r.date || r.extractedEntities.date
      // Never invent a wall-clock time — only use what the user said.
      const time = r.time || r.extractedEntities.time
      if (!date) {
        return {
          text: '날짜를 알려 주세요. 예: 「내일 오후 3시 병원 일정 추가해줘」',
          speak: true,
        }
      }
      const person = r.person || r.extractedEntities.person
      const members = listFamilyMembers()
      const member = person
        ? members.find((m) => m.name.includes(person) || m.relation.includes(person))
        : undefined
      const conflicts = listFamilyHelperSchedules({ days: 4000, includeDone: true }).filter(
        (s) =>
          s.date === date &&
          s.title === title &&
          (s.time || '') === (time || '') &&
          !s.done,
      )
      if (conflicts.length) {
        return {
          text: `같은 일정이 이미 있어요.\n· ${date}${time ? ` ${time}` : ''} ${title}\n중복으로 넣지 않았어요.`,
          speak: true,
          view: 'family-helper',
        }
      }
      const sched = addFamilyHelperSchedule({
        title,
        date,
        time,
        memberId: member?.id,
        category: /병원|접종/.test(title) ? 'hospital' : /하원|하교/.test(title) ? 'pickup' : 'general',
        note: r.extractedEntities.note,
        notifyMinutesBefore: 30,
      })
      // Also mirror into family room calendar when a room exists
      if (loadFamilyRoom()) {
        const ev = addFamilyEvent(title, date, time, person ? `${person}` : undefined)
        if (ev) void broadcastFamilyPacket({ type: 'event', event: ev })
      }
      return {
        text: `일정을 추가했어요.\n· ${sched.date}${sched.time ? ` ${sched.time}` : ''} ${sched.title}${
          member ? ` · ${member.name}` : ''
        }`,
        speak: true,
        view: 'family-helper',
      }
    }

    case 'calendar.update':
    case 'calendar.delete':
      return {
        text:
          r.intent === 'calendar.delete'
            ? '일정 삭제는 가족 도우미 화면에서 해당 일정을 선택한 뒤 삭제해 주세요.'
            : '일정 수정은 가족 도우미 화면에서 해당 일정을 열어 주세요.',
        speak: true,
        view: 'family-helper',
      }

    case 'task.read': {
      const todos = loadReminders().filter((x) => !x.done)
      if (!todos.length) return { text: '남은 할 일이 없어요.', speak: true, view: 'life' }
      const sorted = r.extractedEntities.priority
        ? [...todos].sort((a, b) => (a.whenAt || 0) - (b.whenAt || 0))
        : todos
      return {
        text: `【할 일${r.extractedEntities.priority ? ' · 우선순위' : ''}】\n${sorted
          .slice(0, 12)
          .map((t, i) => `${i + 1}. ${t.text}`)
          .join('\n')}`,
        speak: true,
        view: 'life',
      }
    }

    case 'task.create': {
      const title = (r.title || r.extractedEntities.title || '').trim()
      if (!title) {
        return { text: '어떤 할 일을 추가할까요? 예: 「할 일 추가 우체국 가기」', speak: true }
      }
      const item = addReminder(title)
      return { text: `할 일에 추가했어요: ${item.text}`, speak: true, view: 'life' }
    }

    case 'reminder.create': {
      // Prefer smart reminder pipeline (local alarm + push sync)
      const smart = await handleSmartReminderText(r.sourceText)
      if (smart?.text) return { text: smart.text, speak: true }
      const title = (r.title || r.extractedEntities.title || '알림').trim()
      const offset = r.reminderOffset || r.extractedEntities.reminderOffset
      const whenAt = offset ? offsetToWhenAt(offset) : null
      if (!whenAt) {
        return {
          text: '언제 알려드릴까요? 예: 「30분 뒤에 약 먹으라고 알려줘」',
          speak: true,
        }
      }
      addReminder(title, offset || undefined, whenAt)
      return {
        text: `알림을 준비했어요: ${title}\n(앱이 열려 있을 때 로컬 알림이 가장 확실해요.)`,
        speak: true,
      }
    }

    case 'family.schedule.read': {
      const person = r.person || r.extractedEntities.person
      const helper = listFamilyHelperSchedules({ days: 14, person })
      const room = upcomingFamilyEvents(14)
      const lines = [
        ...helper.map((e) => `· ${e.date}${e.time ? ` ${e.time}` : ''} ${e.title}`),
        ...room.map((e) => `· ${e.date}${e.time ? ` ${e.time}` : ''} ${e.title}`),
      ]
      if (!lines.length) {
        return {
          text: person
            ? `${person} 관련 가족 일정이 아직 없어요.`
            : '가족 일정이 아직 없어요. 가족 도우미에서 추가하거나 말해 주세요.',
          speak: true,
          view: 'family-helper',
        }
      }
      return {
        text: `【가족 일정${person ? ` · ${person}` : ''}】\n${lines.slice(0, 12).join('\n')}`,
        speak: true,
        view: 'family-helper',
      }
    }

    case 'translation.enable': {
      const prev = loadInterpretMode()
      saveInterpretMode({
        ...prev,
        active: true,
        langA: prev.langA || 'ko',
        langB: prev.langB || 'en',
        listening: prev.listening || 'ko',
        live: true,
        lockUntilStop: true,
        showOriginal: true,
      })
      return {
        text: '번역 모드로 전환했어요. 말하고 스톱하면 번역합니다. 「번역 그만」으로 종료할 수 있어요.',
        speak: true,
        view: 'chat',
      }
    }

    case 'reply.suggest': {
      const source =
        r.extractedEntities.replySource ||
        r.title ||
        r.sourceText.replace(/이\s*문장을?\s*|자연스럽게\s*|답장해줘|답장\s*추천해줘/g, '').trim()
      if (!source) {
        return {
          text: '답장할 문장을 알려주세요. 예: 「이 문장을 자연스럽게 답장해줘: 내일 가능하신가요?」',
          speak: true,
        }
      }
      return {
        text: [
          '【답장 추천】',
          `원문: ${source}`,
          '',
          '1) 네, 내일 괜찮습니다. 몇 시가 좋으세요?',
          '2) 내일은 조금 어렵고, 모레는 어떠세요?',
          '3) 확인했습니다. 일정 맞춰서 다시 연락드릴게요.',
          '',
          '원하는 톤이 있으면 말해 주세요 (짧은/정중/친근).',
        ].join('\n'),
        speak: true,
      }
    }

    case 'daily.summary': {
      const brief = buildLifeBriefing()
      return { text: formatBriefingText(brief), speak: true }
    }

    case 'parking.save': {
      const manual = (r.location || r.extractedEntities.location || r.extractedEntities.note || '')
        .trim()
        .replace(/^(해줘|주세요)\s*/, '')
      const prev = loadParkingMemory()
      let lat: number | null = null
      let lng: number | null = null
      let accuracyM: number | null = null
      let source: 'gps' | 'manual' = 'manual'
      // Only request GPS when user asked to save parking (not on screen open).
      try {
        const loc = await requestCurrentPosition({ timeoutMs: 5000 })
        if (loc.ok && loc.fix) {
          lat = loc.fix.coords.lat
          lng = loc.fix.coords.lng
          accuracyM = loc.fix.accuracyM ?? null
          source = 'gps'
        }
      } catch {
        /* manual ok — never wipe previous parking on GPS failure */
      }
      if (source === 'manual' && !manual) {
        return {
          text:
            '위치 권한이 없거나 GPS를 못 읽었어요. 기존 주차 메모는 그대로 둡니다.\n' +
            '장소·층·구역을 말해 주세요. 예: 「주차 위치 기억해줘 B2-15 기둥 옆」',
          speak: true,
        }
      }
      const saved = saveParkingMemory({
        label: manual || '현재 위치 주차',
        note: manual || prev?.note || '',
        lat: lat ?? (manual ? null : prev?.lat ?? null),
        lng: lng ?? (manual ? null : prev?.lng ?? null),
        accuracyM,
        source: lat != null ? source : 'manual',
      })
      const acc =
        saved.accuracyM != null
          ? `\n· 정확도 약 ${Math.round(saved.accuracyM)}m${saved.accuracyM > 80 ? ' (다소 낮음)' : ''}`
          : ''
      return {
        text: `주차 위치를 기억했어요.\n· ${saved.label}${
          saved.lat != null ? `\n· 좌표 ${saved.lat.toFixed(5)}, ${saved.lng?.toFixed(5)}` : ''
        }${acc}`,
        speak: true,
      }
    }

    case 'parking.read': {
      const p = loadParkingMemory()
      if (!p) {
        return {
          text: '저장된 주차 위치가 없어요. 「주차 위치 기억해줘」로 저장할 수 있어요.',
          speak: true,
        }
      }
      const when = new Date(p.savedAt).toLocaleString('ko-KR')
      return {
        text: `마지막 주차 위치\n· ${p.label}${p.note && p.note !== p.label ? `\n· 메모: ${p.note}` : ''}${
          p.lat != null ? `\n· ${p.lat.toFixed(5)}, ${p.lng?.toFixed(5)}` : ''
        }\n· ${when}`,
        speak: true,
        action:
          p.lat != null && p.lng != null
            ? async () => {
                const { openMaps } = await import('../actions')
                return openMaps(`${p.lat},${p.lng}`)
              }
            : undefined,
      }
    }

    case 'camera.open':
      return {
        text: 'AI 만능 카메라로 이동할게요. 사진 촬영·선택 후 분석 모드를 골라 주세요.',
        speak: true,
        view: 'ai-camera',
      }

    case 'general.chat':
    case 'unknown':
      return null

    default:
      return null
  }
}

/**
 * Try to handle as life-assistant. Returns null to fall through to existing brain paths.
 */
export async function tryHandleLifeAssistant(text: string): Promise<BrainReply | null> {
  if (!looksLikeLifeAssistantCommand(text)) return null
  const routed = await routeLifeAssistantIntent(text, { allowAi: false })
  if (routed.intent === 'unknown' || routed.intent === 'general.chat') return null
  if (routed.confidence < 0.8) return null
  return executeIntent(routed)
}

/** Test helper — execute a prebuilt intent. */
export async function executeLifeAssistantIntent(
  r: LifeAssistantIntentResult,
): Promise<BrainReply | null> {
  return executeIntent(r)
}

export function forgetParkingForTests(): void {
  clearParkingMemory()
}

export function peekActiveReminderCount(): number {
  return listActiveReminders().length
}
