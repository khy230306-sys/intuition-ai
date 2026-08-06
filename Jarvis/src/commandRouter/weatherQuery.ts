/**
 * Clear weather *query* intent — shared by AizioCommandRouter and spokenCommand.
 * Casual mentions / narratives must never match.
 */

export function isClearWeatherQuery(text: string): boolean {
  const t = text.trim()
  if (!t) return false
  if (/번역|통역|translate/i.test(t)) return false
  if (/['"「『].*(날씨|기온|비).*(['"」』])/.test(t)) return false
  // Statements / opinions — never treat as weather API queries
  if (
    /(좋네|좋다고|좋아서|같아서|것\s*같아|같네|춥다|덥다|챙길게|늦었어|때문에|정말\s*좋)/i.test(t) &&
    !/(알려|어때|어때요|확인|필요해\s*\?|와\s*\?|올까\s*\?|챙길까)/i.test(t)
  ) {
    return false
  }
  // Explicit ask / forecast forms
  if (/날씨\s*(알려|어때|어때요|확인|좀\s*봐)|기온\s*(알려|어때|은|이\s*몇)|미세먼지\s*(어때|알려)/i.test(t))
    return true
  if (/^(오늘|내일|모레|지금|이번\s*주)\s*(날씨|기온|미세먼지)\s*[?？]?$/i.test(t)) return true
  if (
    /^(서울|부산|대구|인천|광주|대전|울산|제주|수원|창원)\s*(오늘|내일|지금)?\s*(날씨|기온)\s*[?？]?$/i.test(t)
  )
    return true
  if (/울산\s*오늘\s*기온|오늘\s*우산\s*필요|우산\s*(필요해|챙길까)|이번\s*주\s*날씨/i.test(t)) return true
  if (/(오늘|내일|모레|지금)?\s*비\s*(와\s*\?|와\?|와$|올까|오나)/i.test(t)) return true
  if (/(모레|내일|오늘)\s*(비|우산)/i.test(t) && /(오|와|올|필요|챙)/i.test(t)) return true
  return false
}
