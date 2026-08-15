import type { ClassifiedCommand, DepartmentId } from "./types.ts";

const ALL: DepartmentId[] = [
  "strategy",
  "market",
  "product",
  "supply",
  "sales",
  "marketing",
  "cs",
  "finance",
  "risk",
  "data_ai",
  "audit",
  "watch",
];

/** Dynamic department routing — never fan-out to every HQ unit. */
export function selectDepartments(cmd: ClassifiedCommand): DepartmentId[] {
  const selected = [...new Set(cmd.departments)];
  if (selected.length === ALL.length) {
    return cmd.requiredDepartments.length ? cmd.requiredDepartments : selected.slice(0, 8);
  }
  return selected;
}

export function unusedDepartments(cmd: ClassifiedCommand): DepartmentId[] {
  const used = new Set(selectDepartments(cmd));
  return ALL.filter((d) => !used.has(d));
}
