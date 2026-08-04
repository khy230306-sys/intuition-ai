/** Local customer (손님) records for small-business CRM — device only. */

export type CustomerRecord = {
  id: string
  name: string
  /** ISO date YYYY-MM-DD, or MM-DD when year unknown */
  birthday: string | null
  phone: string | null
  memo: string
  createdAt: string
  updatedAt: string
}

export type CustomerParse =
  | { kind: 'open' }
  | { kind: 'list' }
  | { kind: 'birthdays_today' }
  | { kind: 'search'; query: string }
  | { kind: 'add'; name: string; birthday?: string | null; memo?: string; phone?: string }
  | { kind: 'delete'; query: string }
  | { kind: 'help' }
