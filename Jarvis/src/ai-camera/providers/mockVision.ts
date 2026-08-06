import type { VisionAnalyzeInput, VisionAnalyzeResult, VisionProvider } from '../types'

export const mockVisionProvider: VisionProvider = {
  id: 'mock',
  label: 'Demo Vision',
  isAvailable: () => true,
  async analyzeImage(input: VisionAnalyzeInput): Promise<VisionAnalyzeResult> {
    const mode = input.mode === 'auto' ? 'document' : input.mode
    const base: VisionAnalyzeResult = {
      ok: true,
      mode,
      provider: 'mock',
      model: 'demo-vision',
      summary: '데모 분석 결과입니다. (API 키 없이 UI 흐름 검증용)',
      subjects: ['데모 대상'],
      confidence: 0.62,
      detail: '실제 Vision API가 연결되면 사진 내용에 맞는 결과가 표시됩니다.',
      warnings: ['데모 모드 — 실제 식별이 아닙니다.'],
      followUps: ['일정으로 만들기', '할 일 추가', '번역 대화로 보내기'],
      sensitive: false,
    }
    if (mode === 'ocr' || mode === 'document') {
      base.ocrText =
        '준비물 안내\n1. 스케치북\n2. 색연필\n제출: 내일까지\n문의: 담임 선생님'
      base.document = {
        docType: '학교 안내문',
        keyPoints: ['스케치북·색연필 준비', '제출 기한 내일'],
        fields: [
          { label: '날짜', value: '내일' },
          { label: '준비물', value: '스케치북, 색연필' },
        ],
        suggestedTasks: ['스케치북 준비', '색연필 준비'],
        masked: false,
      }
      base.summary = '학교 준비물 안내문으로 추정됩니다.'
      base.subjects = ['안내문', '준비물']
    }
    if (mode === 'translate') {
      base.translation = {
        sourceLang: 'en',
        sourceText: 'Please bring your sketchbook tomorrow.',
        translatedText: '내일 스케치북을 가져와 주세요.',
      }
      base.summary = '영어 문구를 번역했습니다.'
    }
    if (mode === 'food') {
      base.food = {
        name: '비빔밥(추정)',
        ingredients: ['밥', '나물', '고추장'],
        allergens: ['참깨 가능'],
        nutritionNote: '영양 정보는 추정치이며 의료·영양 상담이 아닙니다.',
      }
      base.summary = '비빔밥으로 보이는 음식입니다(추정).'
    }
    if (mode === 'product') {
      base.product = {
        name: '무선 이어폰(추정)',
        brand: '미상',
        features: ['충전 케이스'],
        keywords: ['무선 이어폰', '블루투스 이어폰'],
      }
      base.summary = '무선 이어폰류로 추정됩니다. 가격·판매처는 외부 검색이 필요합니다.'
    }
    if (mode === 'nature') {
      base.nature = {
        candidates: ['민들레(추정)', '개나리(유사)'],
        traits: ['노란 꽃'],
        lookalikes: ['개나리'],
        riskNote: '불확실합니다. 확정적으로 말하지 않습니다.',
      }
      base.summary = '노란 꽃 식물 후보입니다(불확실).'
    }
    if (mode === 'medicine') {
      base.medicine = {
        labelName: '라벨에서 읽은 이름(데모)',
        labelLines: ['용법: 라벨 문구만 표시', '주의: 의료진 확인'],
        disclaimer: '약은 사진만으로 확정하지 마세요. 약사 또는 의료진에게 확인하세요.',
      }
      base.warnings.push('복용 결정을 대신하지 않습니다.')
      base.summary = '약 포장 라벨 데모 결과'
    }
    if (input.question) {
      base.detail += `\n질문: ${input.question}`
    }
    return base
  },
}
