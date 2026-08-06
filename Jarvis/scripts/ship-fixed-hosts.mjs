/**
 * Locked ShipStatic public hosts.
 *
 * Production:  jarvis-app.shipstatic.com
 * Preview:     light-lab.shipstatic.com
 *
 * Note: snapshot hostnames like light-lab-92m8bq7.shipstatic.com cannot be
 * claimed as platform domains ("Resembles a deployment ID"). The fixed Preview
 * host is light-lab.shipstatic.com; legacy snapshot bookmarks migrate via
 * in-app update to that host.
 */
export const PRODUCTION_HOST = 'jarvis-app.shipstatic.com'
export const PREVIEW_HOST = 'light-lab.shipstatic.com'

/** Historical Preview snapshot the user bookmarked — not claimable as a domain. */
export const LEGACY_PREVIEW_SNAPSHOT = 'light-lab-92m8bq7.shipstatic.com'

export const PRODUCTION_URL = `https://${PRODUCTION_HOST}`
export const PREVIEW_URL = `https://${PREVIEW_HOST}`

/** Domains whose linked snapshots must never be pruned. */
export const PROTECTED_DOMAIN_HOSTS = [PRODUCTION_HOST, PREVIEW_HOST]
