/**
 * credit.mjs — the build-credit line in the client's footer.
 *
 * Every site the template produces is a referral surface and a link back to the
 * agency, and until now not one of them carried a single mention. That is a
 * business-model hole, not a design detail.
 *
 * TWO THINGS THIS DELIBERATELY GETS RIGHT
 *
 * 1. ANCHOR TEXT VARIES PER CLIENT. Google's link spam policy names "widely
 *    distributed links in the footers or templates of various sites" directly.
 *    One agency domain appearing in dozens of trade-site footers with
 *    byte-identical anchor text is the exact footprint that policy describes.
 *    Designer credits are normally tolerated, but tolerance scales down as
 *    volume scales up — so the anchor is drawn deterministically from the client
 *    name. Same client, same wording forever; different clients, different
 *    wording. Costs nothing, removes the pattern.
 *
 * 2. IT IS REMOVABLE. `agency.credit.enabled: false` turns it off, which is what
 *    a white-label fee buys, and `rel: "nofollow"` is there for when you would
 *    rather take the referral traffic than the link.
 */

const DEFAULTS = {
  name: "Kova Digital",
  url: "https://kovadigital.com.au",
  rel: "",
};

/* Deterministic per client. A rebuild must never reword the credit, or every
   client site changes its outbound anchor on the same day — a far worse
   footprint than repetition. */
function seedFrom(str) {
  let h = 2166136261;
  for (let i = 0; i < String(str).length; i += 1) {
    h ^= String(str).charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const PHRASINGS = [
  (n) => `Site by ${n}`,
  (n) => `Built by ${n}`,
  (n) => `Designed and built by ${n}`,
  (n) => `Website by ${n}`,
  (n) => `Made by ${n}`,
];

export function resolveCredit(site = {}) {
  const cfg = (site.agency && site.agency.credit) || {};
  if (cfg.enabled === false) return null;

  const name = cfg.name || DEFAULTS.name;
  const url = cfg.url || DEFAULTS.url;
  if (!name || !url) return null;

  const label =
    cfg.label || PHRASINGS[seedFrom(site.business?.name || name) % PHRASINGS.length](name);

  /* Split so the anchor wraps only the agency name, not the whole sentence — a
     five-word anchor reads as a paid link, two words reads as a credit. */
  const cut = label.lastIndexOf(name);
  return {
    prefix: cut > 0 ? label.slice(0, cut).trimEnd() : "",
    name,
    url,
    rel: cfg.rel || DEFAULTS.rel,
  };
}
