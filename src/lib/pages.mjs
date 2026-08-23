/**
 * pages.mjs — which secondary pages this build ships, and what goes in the nav.
 *
 * WHY THIS FILE EXISTS
 * The page set used to be implicit: every .astro file in src/pages/ built,
 * always, regardless of whether the client had anything to put on it. That gave
 * every build a /services page rendering from an empty data file, a /gallery
 * page whose body text read "PLACEHOLDER gallery... must be replaced before
 * launch", and an /areas page nobody asked for — all of them in the sitemap,
 * all of them in the nav.
 *
 * Thin pages are worse than absent pages. Four pages that each say something is
 * a better site, and a better crawl, than seven where three are empty shells.
 *
 * THE RULE: a page ships only if it is (a) switched on in intake `pages` AND
 * (b) has real content to show. Content wins over the switch — turning a page on
 * cannot conjure photos. check-intake.mjs reports the difference so a page
 * silently vanishing is never a surprise.
 *
 * DEFAULT PAGE SET: home (with the contact section at the bottom), /services,
 * /gallery, /faq, plus /privacy and /terms. /areas is off by default. /about and
 * /contact are permanent redirects to the homepage anchors — the contact form
 * lives at the bottom of the homepage and a separate contact page just splits
 * the conversion path in two.
 */

const arr = (v) => (Array.isArray(v) ? v : []);
const has = (v) => arr(v).length > 0;

/** Page switches, in nav order. `false` here means "never build". */
export const PAGE_DEFAULTS = {
  services: true,
  gallery: true,
  faq: true,
  areas: false,
};

export const PAGE_META = {
  services: { path: "/services", label: "Services" },
  gallery: { path: "/gallery", label: "Our work" },
  faq: { path: "/faq", label: "FAQ" },
  areas: { path: "/areas", label: "Service areas" },
};

/**
 * Does this page have anything real on it?
 * Mirrors exactly what each page component renders, so the answer here and the
 * answer on the page can't drift apart.
 */
export function pageHasContent(key, site = {}, extra = {}) {
  switch (key) {
    case "services":
      /* Rich records in src/data/services.ts, or the simple intake block. */
      return has(extra.serviceRecords) || has(site.services?.items);
    case "gallery":
      /* Photos must be real: the hasPhotos gate is what stops a half-filled
         intake shipping a page of broken image icons. */
      return (
        (site.features?.hasPhotos === true && has(site.gallery?.images)) ||
        has(extra.galleryEntries) ||
        has(extra.recentJobs)
      );
    case "faq":
      return has(site.faqs?.items);
    case "areas":
      /* Either a plain suburb list or full area records. The per-suburb pages
         are gated separately in src/lib/areas.mjs. */
      return has(site.usage?.items) || has(site.serviceAreas);
    default:
      return false;
  }
}

/**
 * resolvePages(site, extra) -> { enabled, built, suppressed, nav }
 *   enabled     switched on in the intake (or by default)
 *   built       enabled AND has content — these are the pages that exist
 *   suppressed  enabled but empty — reported, not shipped
 *   nav         [{ key, label, href }] for the header and footer
 */
export function resolvePages(site = {}, extra = {}) {
  const cfg = site.pages || {};
  const keys = Object.keys(PAGE_DEFAULTS);

  const enabled = keys.filter((k) => (cfg[k] === undefined ? PAGE_DEFAULTS[k] : cfg[k] === true));
  const built = enabled.filter((k) => pageHasContent(k, site, extra));
  const suppressed = enabled.filter((k) => !built.includes(k));

  const nav = built.map((k) => ({
    key: k,
    label: (cfg.labels && cfg.labels[k]) || PAGE_META[k].label,
    href: PAGE_META[k].path,
  }));

  return { enabled, built, suppressed, nav };
}

/** True when the page should render; every gated page calls this first. */
export function pageIsBuilt(key, site = {}, extra = {}) {
  return resolvePages(site, extra).built.includes(key);
}
