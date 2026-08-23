/**
 * legal.mjs — one answer to "does this legal page exist?"
 *
 * There were three different answers before v3.9, for the same decision:
 *
 *   privacy.astro   `if (privacy.enabled === false) return redirect`   default ON
 *   terms.astro     `if (terms.enabled !== true) return redirect`      default OFF
 *   config.ts       `if (cleaned.legal?.privacy?.enabled) push(link)`  truthy
 *
 * An intake with no `legal` block therefore built a live /privacy page that
 * nothing linked to — an orphan legal page, which is exactly what the first
 * Mitchell White build shipped. And an intake setting `enabled: "yes"` or
 * `enabled: 1` satisfied config.ts's truthy check while failing terms.astro's
 * strict `!== true`, producing a footer link to a page that redirects home.
 *
 * THE RULE NOW, one function, used by both pages and the footer:
 *   explicit `false`  ->  off
 *   explicit `true`   ->  on
 *   anything else     ->  on, IF the page has the facts it needs to be valid
 *
 * "Default on" is the right default because a live site collecting names, phone
 * numbers and email addresses through a third-party form endpoint should have a
 * privacy policy, and forgetting to set a flag is not a decision to omit one.
 * Gating on required facts is what stops that default publishing a page with
 * "[SET legal.privacy.entityName]" in the body.
 */

const str = (v) => (typeof v === "string" ? v.trim() : "");

/* Facts each page cannot be published without. lastUpdated matters more than it
   looks: a policy with no date is unverifiable, and it is the first thing anyone
   assessing a complaint asks for. */
export const REQUIRED_FIELDS = {
  privacy: ["entityName", "contactEmail", "lastUpdated"],
  terms: ["entityName", "lastUpdated"],
};

/** Fall back to business-level facts before declaring a field missing. */
function resolveField(kind, field, site) {
  const block = (site.legal && site.legal[kind]) || {};
  const business = site.business || {};
  const contact = site.contact || {};
  if (str(block[field])) return str(block[field]);
  if (field === "entityName") return str(business.legalName) || str(business.name);
  if (field === "contactEmail") return str(contact.email);
  return "";
}

/** Which required fields are missing for this page. */
export function missingFields(kind, site = {}) {
  return REQUIRED_FIELDS[kind].filter((f) => !resolveField(kind, f, site));
}

/**
 * legalPageState(kind, site) -> { enabled, ready, live, missing, reason }
 *   enabled  what the intake asked for
 *   ready    has the facts to be a valid page
 *   live     what actually happens — this is the ONLY thing pages and the
 *            footer consult, so they cannot disagree
 */
export function legalPageState(kind, site = {}) {
  const block = (site.legal && site.legal[kind]) || {};
  const explicit = block.enabled;

  if (explicit === false) {
    return { enabled: false, ready: false, live: false, missing: [], reason: "turned off in the intake" };
  }

  const missing = missingFields(kind, site);
  const ready = missing.length === 0;

  /* Anything that isn't an explicit false counts as on. Treating `enabled:"yes"`
     as OFF would be the same class of bug this file exists to remove: a value
     that reads as consent in the intake and silently means the opposite. If the
     author typed something, they wanted the page; if the facts are missing,
     check-intake says which ones. */
  const enabled = explicit !== false;

  return {
    enabled,
    ready,
    live: enabled && ready,
    missing,
    reason: !enabled ? "turned off in the intake"
      : ready ? ""
      : `missing legal.${kind}.${missing.join(", legal." + kind + ".")}`,
  };
}

/** Footer links. Same source as the pages, so no orphans and no dead links. */
export function legalNavLinks(site = {}) {
  const links = [];
  if (legalPageState("privacy", site).live) links.push({ label: "Privacy policy", href: "/privacy" });
  if (legalPageState("terms", site).live) links.push({ label: "Terms of service", href: "/terms" });
  return links;
}
