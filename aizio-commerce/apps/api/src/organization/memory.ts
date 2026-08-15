import type { Repository } from "../db/repository.ts";

export type MemoryScope = "global" | "market" | "product" | "supply" | "finance" | "cs" | "risk" | "strategy";

/**
 * Structured DB memory. Vector search is a later adapter.
 */
export function remember(
  repo: Repository,
  scope: MemoryScope,
  kind: string,
  key: string,
  value: string,
): void {
  repo.insertMemory(scope, kind, key, value);
}
