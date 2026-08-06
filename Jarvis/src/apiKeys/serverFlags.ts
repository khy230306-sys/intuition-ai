/** Local flags: provider configured on server (no secret material). */

const KEY = 'aizio_provider_server_flags_v1'

type Flags = Record<string, { configured: boolean; source?: string; updatedAt?: string }>

function load(): Flags {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}') as Flags
  } catch {
    return {}
  }
}

function save(f: Flags): void {
  localStorage.setItem(KEY, JSON.stringify(f))
}

export function markServerConfigured(provider: string, configured: boolean, source?: string): void {
  const f = load()
  if (!configured) {
    delete f[provider]
  } else {
    f[provider] = { configured: true, source, updatedAt: new Date().toISOString() }
  }
  save(f)
}

export function isServerConfigured(provider: string): boolean {
  return Boolean(load()[provider]?.configured)
}

export function clearServerConfigured(provider: string): void {
  markServerConfigured(provider, false)
}

export function listServerConfigured(): string[] {
  return Object.keys(load()).filter((k) => load()[k]?.configured)
}
