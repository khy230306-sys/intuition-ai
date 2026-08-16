/**
 * Locked ShipStatic public hosts.
 *
 * Production:  jarvis-app.shipstatic.com
 * Preview:     light-lab.shipstatic.com  (canonical fixed Preview; free-plan slot)
 * Desired:     lightlab-92m8bq7.shipstatic.com (recreate when a domain slot frees)
 *
 * Standing policy: after a green shippable change, deploy BOTH Preview and
 * Production (see DEPLOY_POLICY.md). Do not leave Production stale unless
 * the user explicitly asks to hold it.
 *
 * Note: snapshot hostnames like light-lab-92m8bq7.shipstatic.com cannot be
 * claimed as platform domains ("Resembles a deployment ID").
 */
export const PRODUCTION_HOST = 'jarvis-app.shipstatic.com'

/** Canonical fixed Preview — currently claimable on free plan. */
export const PREVIEW_HOST = 'light-lab.shipstatic.com'

/**
 * Preferred Preview id when an extra domain slot is available.
 * deploy:preview tries this first but soft-skips on domain-limit errors.
 */
export const PREVIEW_DESIRED_HOST = 'lightlab-92m8bq7.shipstatic.com'

/** Extra Preview aliases that deploy:preview also repoints. */
export const PREVIEW_ALIAS_HOSTS = []

/** Historical Preview snapshot the user bookmarked — not claimable as a domain. */
export const LEGACY_PREVIEW_SNAPSHOT = 'light-lab-92m8bq7.shipstatic.com'

export const PRODUCTION_URL = `https://${PRODUCTION_HOST}`
export const PREVIEW_URL = `https://${PREVIEW_HOST}`

/** Domains whose linked snapshots must never be pruned. */
export const PROTECTED_DOMAIN_HOSTS = [
  PRODUCTION_HOST,
  PREVIEW_HOST,
  PREVIEW_DESIRED_HOST,
  ...PREVIEW_ALIAS_HOSTS,
]

/** All Preview hosts that deploy:preview must attempt to repoint each release. */
export const PREVIEW_REPOINT_HOSTS = [PREVIEW_DESIRED_HOST, PREVIEW_HOST, ...PREVIEW_ALIAS_HOSTS]
