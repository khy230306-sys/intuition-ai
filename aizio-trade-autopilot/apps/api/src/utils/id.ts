import { randomUUID } from 'node:crypto';

export function newId(prefix = ''): string {
  const id = randomUUID().replace(/-/g, '');
  return prefix ? `${prefix}_${id.slice(0, 24)}` : id;
}

/** Toss clientOrderId: max 36, [a-zA-Z0-9-_] */
export function newClientOrderId(prefix = 'az'): string {
  return `${prefix}-${randomUUID().replace(/-/g, '').slice(0, 28)}`.slice(0, 36);
}
