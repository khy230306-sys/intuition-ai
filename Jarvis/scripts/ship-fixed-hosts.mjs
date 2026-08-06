/**
 * Locked ShipStatic public hosts.
 *
 * Production:  jarvis-app.shipstatic.com
 * Preview:     lightlab-92m8bq7.shipstatic.com  (canonical fixed Preview)
 * Alias:       light-lab.shipstatic.com
 *
 * Note: snapshot hostnames like light-lab-92m8bq7.shipstatic.com cannot be
 * claimed as platform domains ("Resembles a deployment ID"). The closest
 * claimable fixed Preview host keeps the same id: lightlab-92m8bq7.
 * Legacy hyphenated snapshot bookmarks migrate via in-app / boot update.
 */
export const PRODUCTION_HOST = 'jarvis-app.shipstatic.com'

/** Canonical fixed Preview — claimable platform domain (no hyphen after light). */
export const PREVIEW_HOST = 'lightlab-92m8bq7.shipstatic.com'

/** Extra Preview aliases that deploy:preview also repoints. */
export const PREVIEW_ALIAS_HOSTS = ['light-lab.shipstatic.com']

/** Historical Preview snapshot the user bookmarked — not claimable as a domain. */
export const LEGACY_PREVIEW_SNAPSHOT = 'light-lab-92m8bq7.shipstatic.com'

export const PRODUCTION_URL = `https://${PRODUCTION_HOST}`
export const PREVIEW_URL = `https://${PREVIEW_HOST}`

/** Domains whose linked snapshots must never be pruned. */
export const PROTECTED_DOMAIN_HOSTS = [PRODUCTION_HOST, PREVIEW_HOST, ...PREVIEW_ALIAS_HOSTS]

/** All Preview hosts that deploy:preview must repoint each release. */
export const PREVIEW_REPOINT_HOSTS = [PREVIEW_HOST, ...PREVIEW_ALIAS_HOSTS]
