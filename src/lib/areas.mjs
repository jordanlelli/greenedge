/**
 * areas.mjs — service-area pages, and the rule that stops them being a doorway.
 *
 * WHY THIS EXISTS
 * Local SEO Foundation sells 2–4 service area pages a quarter, and there was no
 * route that produced one. `/areas` rendered a flat list of suburb names and
 * that was the whole module.
 *
 * WHY IT IS NOT JUST A LOOP OVER usage.items
 * Generating a page per suburb from a template with the name swapped is a
 * doorway site. Google's own guidance names it, filters it, and issues manual
 * actions for it — and the Kova terms already say this to clients in writing:
 * "thirty near-identical suburb pages is a doorway site, Google filters them,
 * and it would not help you." Shipping the thing you warned the client about
 * would be worse than shipping nothing.
 *
 * THE RULE
 * A suburb gets a page only when it carries content that could not be
 * copy-pasted to the next suburb. Concretely: an intro of real length, plus at
 * least one anchor — a local job, a review from that suburb, or a specific note
 * about the housing stock. Suburbs without that stay as list entries on /areas,
 * which is the honest treatment: they ARE served, there just isn't a page's
 * worth to say yet.
 *
 * That makes the module deliverable at a real cadence: 2–4 suburbs a quarter is
 * about how fast you can write genuinely local copy anyway.
 */

const str = (v) => (typeof v === "string" ? v.trim() : "");
const arr = (v) => (Array.isArray(v) ? v : []);
const words = (v) => str(v).split(/\s+/).filter(Boolean).length;

export const slugify = (s) =>
  String(s || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/* Thresholds. Deliberately not high — this is the floor for "a human wrote
   something about this suburb", not an SEO target. A page that clears these and
   is still thin is a writing problem the guard can't solve. */
export const MIN_INTRO_WORDS = 60;
export const MIN_ANCHORS = 1;

/**
 * Normalise whatever shape the intake uses.
 *   usage.items: ["Reynella", "Morphett Vale"]           -> names only, no page
 *   serviceAreas: [{ name, intro, jobs, note, ... }]     -> page candidates
 */
export function collectAreas(site = {}) {
  const out = new Map();

  for (const raw of arr(site.usage?.items)) {
    const name = str(typeof raw === "string" ? raw : raw?.name);
    if (name) out.set(slugify(name), { name, slug: slugify(name), listedOnly: true });
  }

  for (const raw of arr(site.serviceAreas)) {
    const name = str(typeof raw === "string" ? raw : raw?.name);
    if (!name) continue;
    const a = typeof raw === "string" ? {} : raw;
    const slug = str(a.slug) || slugify(name);
    out.set(slug, {
      name,
      slug,
      listedOnly: false,
      intro: str(a.intro),
      /* Anchors — the things that cannot be copy-pasted to the next suburb. */
      jobs: arr(a.jobs).map((j) => ({
        title: str(j?.title),
        detail: str(j?.detail),
        street: str(j?.street),
      })).filter((j) => j.title || j.detail),
      note: str(a.note),
      testimonialQuote: str(a.testimonialQuote),
      testimonialName: str(a.testimonialName),
      testimonialSourceUrl: str(a.testimonialSourceUrl),
      services: arr(a.services).map(str).filter(Boolean),
      nearby: arr(a.nearby).map(str).filter(Boolean),
      heading: str(a.heading),
      metaDescription: str(a.metaDescription),
    });
  }

  return [...out.values()];
}

/** How many non-transferable anchors this area carries. */
export function anchorCount(area = {}) {
  let n = 0;
  if (arr(area.jobs).length) n += 1;
  if (words(area.note) >= 20) n += 1;
  /* A quote only counts if it is attributable — same rule as the testimonials
     section. An unsourced quote is not evidence, it is filler. */
  if (str(area.testimonialQuote) && str(area.testimonialSourceUrl)) n += 1;
  return n;
}

/**
 * areaPageState(area) -> { buildable, reason, introWords, anchors }
 * The single gate, used by the route, the /areas links and check-intake.
 */
export function areaPageState(area = {}) {
  if (area.listedOnly) {
    return { buildable: false, reason: "listed in usage.items only — no page content supplied", introWords: 0, anchors: 0 };
  }
  const introWords = words(area.intro);
  const anchors = anchorCount(area);

  if (introWords < MIN_INTRO_WORDS) {
    return { buildable: false, anchors, introWords, reason: `intro is ${introWords} words, needs ${MIN_INTRO_WORDS}` };
  }
  if (anchors < MIN_ANCHORS) {
    return {
      buildable: false, anchors, introWords,
      reason: "no local anchor — needs a job, a sourced review from the suburb, or a note about the local housing stock",
    };
  }
  return { buildable: true, anchors, introWords, reason: "" };
}

/** Areas that get their own page. */
export function buildableAreas(site = {}) {
  return collectAreas(site).filter((a) => areaPageState(a).buildable);
}

/** Every area, page or not — this is what /areas lists. */
export function allAreas(site = {}) {
  return collectAreas(site).sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Similarity between two intros, 0–1, on shared word bags.
 *
 * The doorway detector. Two suburb pages can each clear the length and anchor
 * floors and still be the same paragraph with the name swapped — which is the
 * exact failure mode this whole file exists to prevent, and the one you cannot
 * catch by looking at either page on its own.
 */
export function similarity(a = "", b = "") {
  const bag = (s) =>
    new Set(String(s).toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length > 3));
  const A = bag(a);
  const B = bag(b);
  if (!A.size || !B.size) return 0;
  let shared = 0;
  for (const w of A) if (B.has(w)) shared += 1;
  return shared / Math.min(A.size, B.size);
}

/** Pairs of area pages too similar to publish. */
export function duplicatePairs(site = {}, threshold = 0.7) {
  const areas = buildableAreas(site);
  const pairs = [];
  for (let i = 0; i < areas.length; i += 1) {
    for (let j = i + 1; j < areas.length; j += 1) {
      const score = similarity(areas[i].intro, areas[j].intro);
      if (score >= threshold) pairs.push({ a: areas[i].name, b: areas[j].name, score });
    }
  }
  return pairs;
}
