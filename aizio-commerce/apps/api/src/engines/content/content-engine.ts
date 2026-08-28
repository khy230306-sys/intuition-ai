import type { ProviderRegistry } from "../manager/provider-registry.ts";

export interface SourceFacts {
  title: string;
  description?: string | null;
  material?: string | null;
  colors?: string[];
  features?: string[];
  brand?: string | null;
  specs?: Record<string, string>;
}

export interface GroundedClaim {
  text: string;
  sourceField: string;
  sourceValue: string;
}

export interface ProductContent {
  koreanTitle: string;
  seoTitle: string;
  keywords: string[];
  highlights: GroundedClaim[];
  description: string;
  optionNames: string[];
  faq: Array<{ q: string; a: string; sourceField: string }>;
  csQuestions: string[];
  imagePlan: string[];
  detailPagePlan: string[];
  channelTitles: Record<string, string>;
  rejectedClaims: string[];
  source: "AI" | "CODE";
}

const FORBIDDEN = ["완전방수", "방수", "의료급", "기적의", "100%", "무적", "평생보장", "FDA 승인", "KC 인증"];

function factBag(facts: SourceFacts): string {
  return JSON.stringify(facts).toLowerCase();
}

export function groundContent(facts: SourceFacts, draft: Partial<ProductContent>): ProductContent {
  const bag = factBag(facts);
  const rejectedClaims: string[] = [];
  const keepClaim = (text: string, sourceField: string, sourceValue: string): GroundedClaim | null => {
    for (const word of FORBIDDEN) {
      if (text.includes(word) && !bag.includes(word.toLowerCase())) {
        rejectedClaims.push(text);
        return null;
      }
    }
    if (sourceValue && !bag.includes(String(sourceValue).toLowerCase()) && sourceField !== "title") {
      rejectedClaims.push(text);
      return null;
    }
    return { text, sourceField, sourceValue };
  };

  const highlights = (draft.highlights ?? [])
    .map((h) => keepClaim(h.text, h.sourceField, h.sourceValue))
    .filter((x): x is GroundedClaim => Boolean(x));

  return {
    koreanTitle: draft.koreanTitle || facts.title,
    seoTitle: draft.seoTitle || facts.title,
    keywords: draft.keywords ?? [facts.title],
    highlights: highlights.length
      ? highlights
      : [{ text: facts.title, sourceField: "title", sourceValue: facts.title }],
    description: draft.description || facts.description || facts.title,
    optionNames: draft.optionNames ?? facts.colors ?? [],
    faq: draft.faq ?? [],
    csQuestions: draft.csQuestions ?? ["배송은 얼마나 걸리나요?", "반품은 어떻게 하나요?"],
    imagePlan: draft.imagePlan ?? ["대표 이미지", "옵션 이미지", "실사용 컷"],
    detailPagePlan: draft.detailPagePlan ?? ["핵심 스펙", "구성품", "주의사항"],
    channelTitles: {
      coupang: (draft.channelTitles?.coupang ?? facts.title).slice(0, 100),
      naver: (draft.channelTitles?.naver ?? facts.title).slice(0, 100),
    },
    rejectedClaims,
    source: draft.source ?? "CODE",
  };
}

export async function generateContent(
  registry: ProviderRegistry,
  facts: SourceFacts,
): Promise<ProductContent> {
  const result = await registry.chatWithFallback(
    [
      {
        role: "system",
        content:
          "한국어 판매 콘텐츠 JSON을 만드세요. 원본 facts에 없는 성능/인증/방수 주장을 만들지 마세요. 각 highlight는 sourceField/sourceValue를 가집니다.",
      },
      { role: "user", content: JSON.stringify(facts) },
    ],
    { json: true },
  );
  if (result.status !== "READY" || !result.text) {
    return groundContent(facts, { source: "CODE" });
  }
  try {
    const parsed = JSON.parse(result.text) as Partial<ProductContent>;
    return groundContent(facts, { ...parsed, source: "AI" });
  } catch {
    return groundContent(facts, { source: "CODE" });
  }
}
