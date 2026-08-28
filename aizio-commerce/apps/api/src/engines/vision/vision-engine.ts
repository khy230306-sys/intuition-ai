import type { ProviderRegistry } from "../manager/provider-registry.ts";
import type { VisionAnalysis } from "../../shared/types.ts";

const VISION_PROMPT = `Analyze this product photo. Return JSON only with:
{
  "category": string|null,
  "confidence": number,
  "productType": string|null,
  "features": string[],
  "estimatedCategory": string|null,
  "material": string|null,
  "colors": string[],
  "designTraits": string[],
  "brandVisible": boolean,
  "possibleBrand": string|null,
  "modelNameCandidates": string[],
  "supplierSearchKeywords": string[],
  "domesticMarketKeywords": string[],
  "similarProductQuery": string|null
}
Do not invent a specific SKU or claim exact identity. confidence must reflect uncertainty.
If a brand logo is unclear, possibleBrand=null and brandVisible=false.`;

export class VisionEngine {
  constructor(private readonly registry: ProviderRegistry) {}

  async analyzeImage(imageBase64: string, mimeType: string): Promise<{
    status: string;
    analysis: VisionAnalysis | null;
    error: string | null;
    provider: string | null;
  }> {
    const result = await this.registry.vision(imageBase64, mimeType, VISION_PROMPT);
    return {
      status: result.status,
      analysis: result.analysis,
      error: result.error,
      provider: result.provider,
    };
  }
}
