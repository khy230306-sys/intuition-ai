import { allAliases, matchRelation, primaryLabel } from './catalog'
import type { RelationshipParse } from './types'

function cleanName(s: string): string | null {
  const n = s
    .replace(/^(?:우리|내|저의?)\s*/g, '')
    .replace(/(?:이야|예요|이에요|입니다|야|다)$/g, '')
    .replace(/[은는이가을를의]\s*$/g, '')
    .replace(/님$/g, '')
    .trim()
  if (!n || n.length < 2 || n.length > 24) return null
  if (/전화|번호|주소|비밀번호|계좌|병원|일정|예약|진찰|치과/.test(n)) return null
  // Reject time/date fragments mistaken as names (“시에”, “분에”…)
  if (/^(시|분|오늘|내일|모레|오전|오후|아침|저녁|매주)$/.test(n)) return null
  if (/^\d+$/.test(n)) return null
  return n
}

export function parseRelationshipUtterance(raw: string): RelationshipParse | null {
  const text = String(raw || '').trim()
  if (!text || text.length > 120) return null

  if (/가족\s*(관계\s*)?(목록|보여|전부)|관계\s*(목록|보여)/i.test(text)) {
    return { kind: 'list' }
  }

  if (/(기억에서\s*)?지워|삭제|잊어|잊어줘|forget/i.test(text) && matchRelation(text)) {
    const rel = matchRelation(text)!
    return { kind: 'forget', relationship: rel.code, query: rel.display }
  }

  // “엄마 이름 뭐였지?”
  const ask =
    text.match(/(엄마|어머니|아빠|아버지|아들|딸|동생|형|오빠|누나|언니|할머니|할아버지|이모|고모|삼촌|친구|배우자|남편|아내)\s*(이름\s*)?(뭐|뭔|알려|기억)/i) ||
    text.match(/(?:이름\s*)?(뭐였|뭐야|기억나).*(엄마|어머니|아빠|아버지)/i)
  if (ask) {
    const rel = matchRelation(ask[1] || ask[2] || text)
    if (rel) return { kind: 'ask_name', relationship: rel.code, displayRelation: rel.display }
  }

  // “우리 엄마 이름은 김영희야”
  const mNameAfterRel = text.match(
    /(?:우리|내|저의?)?\s*(엄마|어머니|아빠|아버지|아들|딸|동생|형|오빠|누나|언니|할머니|할아버지|이모|고모|삼촌|친구|배우자|남편|아내)\s*(?:의\s*)?(?:이름(?:은|는)?|성함(?:은|는)?)\s*([가-힣A-Za-z·]{2,12})/i,
  )
  if (mNameAfterRel) {
    const rel = matchRelation(mNameAfterRel[1]!)!
    const name = cleanName(mNameAfterRel[2]!)
    if (name) {
      return {
        kind: 'remember',
        relationship: rel.code,
        displayRelation: rel.display,
        name,
        aliases: allAliases(rel.code),
      }
    }
  }

  // “김철수는 내 아빠야” — require 은/는 after the name (avoids “시에 엄마”)
  const mNameBeforeRel = text.match(
    /([가-힣A-Za-z·]{2,12})\s*(?:은|는)\s*(?:내|저의?)?\s*(엄마|어머니|아빠|아버지|아들|딸|동생|형|오빠|누나|언니|할머니|할아버지|이모|고모|삼촌|친구|배우자|남편|아내)\s*(?:야|이야|예요|이에요|입니다)?/i,
  )
  if (mNameBeforeRel) {
    const rel = matchRelation(mNameBeforeRel[2]!)!
    const name = cleanName(mNameBeforeRel[1]!)
    if (name) {
      return {
        kind: 'remember',
        relationship: rel.code,
        displayRelation: primaryLabel(rel.code),
        name,
        aliases: allAliases(rel.code),
      }
    }
  }

  const mShort = text.match(
    /(?:내|저의?)?\s*(동생|아들|딸|친구)\s*(?:이름(?:은|는)?)\s*([가-힣A-Za-z·]{2,12})/i,
  )
  if (mShort) {
    const rel = matchRelation(mShort[1]!)!
    const name = cleanName(mShort[2]!)
    if (name) {
      return {
        kind: 'remember',
        relationship: rel.code,
        displayRelation: rel.display,
        name,
        aliases: allAliases(rel.code),
      }
    }
  }

  // Name change: “엄마 이름 바꿔줘 박영희”
  const mRename = text.match(
    /(엄마|어머니|아빠|아버지|아들|딸|동생)\s*이름\s*(?:을\s*)?(?:바꿔|변경|고쳐)\s*([가-힣A-Za-z·]{2,12})/i,
  )
  if (mRename) {
    const rel = matchRelation(mRename[1]!)!
    const name = cleanName(mRename[2]!)
    if (name) {
      return {
        kind: 'update',
        relationship: rel.code,
        displayRelation: rel.display,
        name,
        aliases: allAliases(rel.code),
      }
    }
  }

  return null
}

export function wantsRelationshipSkill(text: string): boolean {
  return parseRelationshipUtterance(text) !== null
}
