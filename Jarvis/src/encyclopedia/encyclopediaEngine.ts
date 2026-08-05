import { extractKnowledgeTopic, isKnowledgeQuestion } from './queryParse'
import { formatWikiAnswer, lookupEncyclopedia } from './wikiClient'

export { extractKnowledgeTopic, isKnowledgeQuestion } from './queryParse'
export { lookupEncyclopedia, formatWikiAnswer } from './wikiClient'

/** Full encyclopedia reply, or null if not a knowledge ask / no article. */
export async function answerEncyclopedia(text: string): Promise<string | null> {
  if (!isKnowledgeQuestion(text) && !extractKnowledgeTopic(text)) return null
  const topic = extractKnowledgeTopic(text)
  if (!topic) return null
  const hit = await lookupEncyclopedia(topic)
  if (!hit) {
    return [
      `「${topic}」에 대한 백과사전 항목을 바로 찾지 못했어요.`,
      '철자·띄어쓰기를 바꿔 다시 물어보거나, 설정에서 AI가 연결되어 있으면 더 자세히 설명해 드릴 수 있어요.',
    ].join('\n')
  }
  return formatWikiAnswer(topic, hit)
}
