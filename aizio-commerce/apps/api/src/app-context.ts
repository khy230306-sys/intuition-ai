import type { Repository } from "./db/repository.ts";
import type { ProviderRegistry } from "./engines/manager/provider-registry.ts";
import type { ManagerAi } from "./engines/manager/manager-ai.ts";
import type { VisionEngine } from "./engines/vision/vision-engine.ts";
import type { CjDropshippingAdapter } from "./adapters/suppliers/cjdropshipping.ts";
import type { CoupangAdapter } from "./adapters/marketplaces/coupang.ts";
import type { NaverCommerceAdapter } from "./adapters/marketplaces/naver.ts";

export interface AppServices {
  repo: Repository;
  providers: ProviderRegistry;
  manager: ManagerAi;
  vision: VisionEngine;
  cj: CjDropshippingAdapter;
  coupang: CoupangAdapter;
  naver: NaverCommerceAdapter;
}
