/**
 * variants.mjs — the variant ENGINE (single source of truth, plain JS so both
 * Astro/Vite (config.ts) and the Node persist script can import it).
 *
 * HOW SELECTION WORKS (this is the answer to "how do we pick and maintain it"):
 *   resolveSite(site) is a PURE, DETERMINISTIC function. It seeds a PRNG from the
 *   business name + domain (or _brief.variantSeed), so the same client always
 *   resolves to the same kit / variants / section order — across every build,
 *   forever. Different clients seed differently, so the portfolio looks varied.
 *
 *   Precedence per axis:
 *     1. Explicit value in _brief (designKit / layoutVariants[section]) — always wins.
 *     2. Filter the section's list by DATA PREREQUISITES (no photos -> drop photo
 *        variants; no pairs -> drop contrast-pair; etc.) so we never pick a variant the
 *        client's data can't fill.
 *     3. Seeded random pick from whatever survives.
 *
 *   "Random at first build, locked thereafter" is automatic because the seed is
 *   stable. scripts/pick-variants.mjs additionally WRITES the resolved picks back
 *   into client-intake.json so they're visible and hand-editable — but it's
 *   optional; the site is already deterministic without it.
 */

import { resolveStoryCredentials, resolveDocketRows, DOCKET_MIN_ROWS } from "./content.mjs";
import { resolveType } from "./stylepicks.mjs";
import { collectAreas, buildableAreas } from "./areas.mjs";

/* ----------------------------- catalogue ------------------------------ */
/* Built on the project VARIANTS.txt (hero/services/story). testimonials + whyUs
   are new alternative layouts added in this rebuild — specced + built in later
   segments. The first entry in each list is the safe DEFAULT. */
/* CATALOGUE — sections with REAL, RENDERING layout variants.
 *
 * Trimmed in v3.7 from 7 sections / 24 variants to 2 / 7. The other five were
 * resolved by the engine, written into every client intake and validated by
 * verify-lock, and no component read any of them: `services: "carousel"` was
 * recorded in the intake as a decision that had been made, and the page rendered
 * the same single layout it always had.
 *
 * The rule going forward: a section enters this catalogue when its variants
 * render, not when they are designed. An intake that records choices the build
 * did not make is worse than an intake with fewer knobs — it is a false record,
 * and it is what made the same bugs keep "not landing".
 *
 * Removed, available in git history if they get built:
 *   services     split-scroll | grid-icons | carousel | list-detail
 *   whyUs        ruled-rows | icon-grid | contrast-pair | process-rail
 *   (testimonials and footer have ONE layout each — no variant axis.
 *    check-catalogue.mjs enforces that this comment, CATALOGUE and the
 *    components stay in agreement.)
 *
 * v3.17 added the STORY axis. Until then About was the only core page type with
 * no structural variation at all: every client's About section shared one set
 * of bones, which is the exact tell DESIGN-LIBRARY exists to stop. Its draw is
 * appended at the END of the RNG stream (see LATE_DRAW) so adding it did not
 * shift any already-built client's kit, variants, order, surface or band.
 */
export const CATALOGUE = {
  hero:     ["typographic", "split-media", "fullbleed", "docket", "index", "stat-lede"],
  services: ["grid-icons", "ledger", "split-scroll", "feature-lead", "list-detail"],
  whyUs:    ["ruled-rows", "icon-grid", "contrast-pair", "process-rail"],
  header:   ["standard", "minimal", "centered"],
  story:    ["ruled-cards", "credentials-panel", "portrait-lede"],
  faqs:     ["accordion", "open-columns", "grouped"],
  areas:    ["chips", "zoned", "directory"],
  /* /services PAGE layout (v3.19). MANUAL axis — see MANUAL below. */
  servicesPage: ["stacked", "grouped", "featured", "index"],
};

/* MANUAL axes are chosen by a person, never by the seeded engine.
 *
 * The /services page layout depends on how many services a client has and
 * how they naturally group — facts a seed cannot know. Four services in a
 * searchable index look broken; eighteen in a stacked list is 21 phone
 * screens. So the engine never draws it: it takes _brief.layoutVariants
 * .servicesPage when set, otherwise the first (safe) entry. It also consumes
 * NO RNG, so adding the axis shifted nothing for any already-built client.
 * check-intake warns when a long catalogue is left on the default. */
export const MANUAL = new Set(["servicesPage"]);

/* Sections whose variant is drawn AFTER order / surface / band.
 *
 * The per-section loop in resolveSite consumes one RNG value per section, so
 * adding a key to CATALOGUE normally shifts every draw that follows it — every
 * existing client would wake up with a different section order, surface and
 * band. CURSOR-CONTEXT §13 states the rule: keep new draws appended at the end.
 * A section listed here is a first-class axis in every other respect; only its
 * POSITION in the stream differs. Add new sections here, not to the main loop. */
const LATE_DRAW = new Set(["story", "faqs", "areas"]);

/* Default homepage sections when an intake doesn't state them. Previously
   derived from CATALOGUE's keys, which silently became ["hero"] the moment the
   catalogue was trimmed. */
const DEFAULT_SECTIONS = [
  "hero", "services", "whyUs", "areas", "story", "testimonials", "faqs", "contact",
];

/* Variants that need data the client may not have. Key = "section/variant". */
const PREREQS = {
  "hero/split-media":       "heroImage",
  "hero/fullbleed":         "heroImage",
  "hero/docket":            "docketRows",
  "hero/index":             "fourServices",
  "hero/stat-lede":         "heroStats",
  "services/split-scroll":  "serviceImages",
  "services/feature-lead":  "leadImage",
  "services/list-detail":   "serviceDetail",
  "whyUs/contrast-pair":    "whyPairs",
  "whyUs/process-rail":     "whyProcess",
  "story/credentials-panel": "storyCredentials",
  "story/portrait-lede":     "storyPortrait",
  "faqs/open-columns":       "faqsEnough",
  "faqs/grouped":            "faqsGrouped",
  "areas/zoned":             "areasZoned",
  "areas/directory":         "areasMany",
};

/* ------------------------------- kits -------------------------------- */
/* Kits set TYPE + RADIUS + SHADOW + RHYTHM personality (see global.css .kit-*).
   Colour is NOT here — it comes from each client's `style` block, so no kit can
   impose a clichéd palette. Each `href` loads that kit's Google Fonts. */
export const KITS = ["ledger", "workshop", "coast", "press", "signal"];

/* surface = page-level background treatment (subtle, colour-safe). Picked LAST
   in resolveSite so adding it does not shift any existing kit/variant/order
   draw for already-built clients. Override with _brief.surface. */
export const SURFACES = ["flat", "tint", "warm"];

/* NOTE: the `divider` axis was removed in v3.4. It was resolved here, written
   into every client intake, validated by verify-lock and documented across four
   files that disagreed with each other about its valid values — and no component
   ever read it. A knob that renders nothing is worse than no knob: it makes the
   intake a false record of what was built. */

/* Sections eligible to become the single dark "colour band". Only sections
   that render through Section.astro qualify, so the token-remap flips cleanly.
   Hero/Services/FAQ/Contact are deliberately excluded. */
const BAND_ELIGIBLE = ["tiers", "usage", "areas", "story", "testimonials"];

/* ---- KIT FONT FACES — the SINGLE source of truth for which typefaces load ---
   Consumed by astro.config.mjs, which resolves this client's kit and declares
   the matching families through the Astro Fonts API (Fontsource). Because the
   API sets --font-display / --font-body (read by global.css), the rendered type
   ALWAYS matches the active kit. Do NOT re-declare font-family in .kit-* CSS —
   that path is dead and caused every non-coast kit to silently render Archivo.
   v3.18: every kit now loads a 700 body weight (eyebrows, labels) and coast
   gained Archivo 700 for h2/h3 — see --weight-display / --weight-heading in
   global.css. That changes coast's font-cache key; an offline machine needs
   one online build to refresh .astro/fonts. */
/* v3.28: NO KIT LOADS INTER OR SPACE GROTESK ANY MORE. Three of the five kits
   set their body in Inter (or Inter Tight) and signal set its headings in
   Space Grotesk: the two faces a generated site reaches for first, so a kit
   that was meant to be a personality opened with the default. Measured on a
   signal build: 95 of 131 text elements in Inter. Each kit keeps its
   character and its display face except signal; only the defaults went.
     ledger  body Inter Tight -> Public Sans
     press   body Inter       -> DM Sans   (the Style Picker's "warm" pairing)
     signal  Space Grotesk + Inter -> Bricolage Grotesque + DM Sans
   Every family here was already a dependency. To change a kit's type, edit
   this table and the matching --weight-* tokens in global.css; to change ONE
   client's type, set _brief.stylePicks instead (it overrides the kit). */
export const KIT_FONT_FACES = {
  ledger:   { display: { name: "Newsreader",          weights: [400, 600, 700] }, body: { name: "Public Sans",   weights: [400, 500, 600, 700] } },
  workshop: { display: { name: "Archivo",             weights: [600, 700, 800] }, body: { name: "Public Sans",   weights: [400, 500, 600, 700] } },
  coast:    { display: { name: "Archivo",             weights: [600, 700, 800] }, body: { name: "Source Sans 3", weights: [400, 600, 700] } },
  press:    { display: { name: "Fraunces",            weights: [400, 600, 700] }, body: { name: "DM Sans",       weights: [400, 500, 600, 700] } },
  signal:   { display: { name: "Bricolage Grotesque", weights: [600, 700, 800] }, body: { name: "DM Sans",       weights: [400, 500, 600, 700] } },
};

/* Legacy Google-Fonts <link> hrefs — retained for reference/back-compat only.
   Rendering no longer uses these; astro.config + Fontsource own font loading. */
export const KIT_FONTS = {
  ledger:   { display: "Newsreader",          body: "Public Sans",  href: "" },
  workshop: { display: "Archivo",             body: "Public Sans",  href: "https://fonts.googleapis.com/css2?family=Archivo:wght@600;700;800;900&family=Public+Sans:wght@400;500;600;700&display=swap" },
  coast:    { display: "Archivo",             body: "Source Sans 3", href: "" },
  press:    { display: "Fraunces",            body: "DM Sans",      href: "" },
  signal:   { display: "Bricolage Grotesque", body: "DM Sans",      href: "" },
};

/* --------------------------- section order --------------------------- */
const TOP_ANCHORS = ["hero", "services"];        // pinned near the top, in this order
const BOTTOM_ANCHORS = ["faq", "faqs", "contact"]; // pinned to the bottom

/* ------------------------- seeded PRNG utils ------------------------- */
function cyrb53(str, seed = 0) {
  let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = (rng, list) => list[Math.floor(rng() * list.length)];
function shuffle(rng, arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ----------------------- data prerequisite checks ------------------- */
/* Photos are EXPLICIT only. Intakes routinely carry placeholder image paths
   (/images/services/x.jpg) for files that don't exist, so presence of a path
   proves nothing. The operator sets features.hasPhotos:true once real photos
   are in place — until then, photo-dependent variants are filtered out. */
function hasHeroImage(site) {
  /* Hero variants need a HERO image, not owned work photography. */
  return Boolean(site.hero?.image);
}
function hasImages(site) {
  return site.features?.hasPhotos === true;
}
/* ---- services prerequisites -----------------------------------------------
   Per-service imagery asserts the client did THAT job, so it is gated on
   features.hasPhotos as well as a path. A path alone proves nothing: intakes
   routinely carry /images/services/x.jpg for files that were never supplied. */
function serviceItems(site) {
  const list = site.services?.items;
  return Array.isArray(list) ? list.filter((it) => it && typeof it === "object") : [];
}
function hasServiceImages(site) {
  const items = serviceItems(site);
  return hasImages(site) && items.length > 0 && items.every((it) => Boolean(it.image));
}
/* feature-lead needs a photo on the LEAD service only, not on all of them. */
function hasLeadImage(site) {
  const items = serviceItems(site);
  if (!hasImages(site) || !items.length) return false;
  const lead = items.find((it) => it.featured === true) || items[0];
  return Boolean(lead?.image);
}
/* list-detail is the most content-hungry variant. Without real depth on every
   service it renders a panel of whitespace, so the bar is deliberately high. */
function hasServiceDetail(site) {
  const items = serviceItems(site);
  return (
    items.length > 0 &&
    items.every(
      (it) =>
        typeof it.longDescription === "string" &&
        it.longDescription.trim().length > 0 &&
        Array.isArray(it.includes) &&
        it.includes.filter(Boolean).length >= 2
    )
  );
}

/* stat-lede has no placeholder state: no real stat, no variant. */
function hasHeroStats(site) {
  const list = site.hero?.stats;
  if (!Array.isArray(list)) return false;
  return list.some((s) => s && String(s.value || "").trim() && String(s.label || "").trim());
}

/* contrast-pair needs paired them/us statements — a different intake shape from
   whyUs.items[], and not derivable from it. */
function hasWhyPairs(site) {
  const raw = site.whyUs;
  const pairs = Array.isArray(raw) ? null : raw?.pairs;
  if (!Array.isArray(pairs)) return false;
  return pairs.filter((p) => p && String(p.them || "").trim() && String(p.us || "").trim()).length >= 2;
}
/* process-rail is the only variant that asserts a SEQUENCE. It is gated on the
   intake declaring one, never inferred: numbering a list of benefits claims an
   order the content does not have. */
function isWhyProcess(site) {
  const raw = site.whyUs;
  if (Array.isArray(raw)) return false;
  const items = Array.isArray(raw?.items) ? raw.items : [];
  return raw?.type === "process" && items.length >= 2;
}

/* ---- story prerequisites ---------------------------------------------------
   credentials-panel renders a ruled panel of the business's own credentials.
   The rows come from resolveStoryCredentials (content.mjs) so the gate and the
   render can never disagree. Two is the floor, the same threshold as
   hero/docket and for the same reason: a one-row panel reads as a mistake. */
function hasStoryCredentials(site) {
  return resolveStoryCredentials(site).length >= 2;
}
/* portrait-lede leads the section with a photograph of the operator. It needs
   BOTH the explicit hasPhotos flag and a story image — a path alone proves
   nothing, because intakes routinely carry paths for files never supplied. */
function hasStoryPortrait(site) {
  return hasImages(site) && Boolean(site.story?.image);
}

/* ---- faq prerequisites -------------------------------------------------
   open-columns prints every answer open in the DOM. Below six questions a
   two-column open list is shorter than the heading above it and reads as a
   layout that ran out of content, so the accordion is the better default. */
function faqItems(site) {
  const items = site.faqs?.items;
  return Array.isArray(items) ? items.filter((f) => f && f.question && f.answer) : [];
}
function hasEnoughFaqs(site) {
  return faqItems(site).length >= 6;
}
/* grouped needs the client to have actually categorised the questions. Two
   distinct groups is the floor: one group is not a grouping, it is a heading
   with everything under it. Questions with no group are NOT auto-assigned to
   an "Other" bucket — inventing a category is the same class of error as
   inventing a credential row. */
function hasFaqGroups(site) {
  const groups = new Set(
    faqItems(site).map((f) => String(f.group || "").trim()).filter(Boolean)
  );
  return groups.size >= 2;
}

/* ---- areas prerequisites -----------------------------------------------
   zoned groups the coverage the way the client described it: "northern
   suburbs", "Adelaide Hills", "south of the river". It needs the client to
   have actually drawn those lines. Two named zones with at least one suburb
   each is the floor — one zone is a heading, not a grouping, and zones are
   NEVER derived from suburb names, because guessing that Reynella is "south"
   is inventing a coverage claim the client never made. */
function hasAreaZones(site) {
  const zones = Array.isArray(site.usage?.zones) ? site.usage.zones : [];
  const real = zones.filter(
    (z) => z && String(z.name || "").trim() &&
      Array.isArray(z.areas) && z.areas.filter(Boolean).length > 0
  );
  return real.length >= 2;
}
/* directory is the index layout. Below a dozen suburbs a chip row is shorter,
   friendlier and reads better; past a dozen the chip wall becomes a blob and a
   ruled alphabetical index is easier to scan and to link from. */
function hasManyAreas(site) {
  return collectAreas(site).length >= 12;
}

function prereqOk(section, variant, site) {
  const need = PREREQS[`${section}/${variant}`];
  if (!need) return true;
  if (need === "heroImage") return hasHeroImage(site);
  if (need === "images") return hasImages(site);
  if (need === "serviceImages") return hasServiceImages(site);
  if (need === "leadImage") return hasLeadImage(site);
  if (need === "serviceDetail") return hasServiceDetail(site);
  if (need === "docketRows") return resolveDocketRows(site).length >= DOCKET_MIN_ROWS;
  if (need === "fourServices") return serviceItems(site).filter((it) => it.title).length >= 4;
  if (need === "heroStats") return hasHeroStats(site);
  if (need === "whyPairs") return hasWhyPairs(site);
  if (need === "whyProcess") return isWhyProcess(site);
  if (need === "storyCredentials") return hasStoryCredentials(site);
  if (need === "storyPortrait") return hasStoryPortrait(site);
  if (need === "faqsEnough") return hasEnoughFaqs(site);
  if (need === "faqsGrouped") return hasFaqGroups(site);
  if (need === "areasZoned") return hasAreaZones(site);
  if (need === "areasMany") return hasManyAreas(site);
  return true;
}

/* --------------------- contrast guard (colour band) ------------------ */
/* WCAG relative luminance. A section may invert to a dark brand band ONLY if
   white text on that brand clears ~4.5:1 (luminance <= 0.183). This stops
   light-branded clients getting unreadable white-on-pale bands. */
function _hexToRgbL(hex) {
  const h = String(hex || "").replace("#", "").trim();
  if (h.length === 3) return [0, 1, 2].map((i) => parseInt(h[i] + h[i], 16));
  if (h.length === 6) return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  return null;
}
function relLuminance(hex) {
  const rgb = _hexToRgbL(hex);
  if (!rgb) return null;
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function canInvert(site) {
  const hex = site.style?.brandDark || site.style?.brand;
  const L = relLuminance(hex);
  return L != null && L <= 0.183;
}

/* ------------------------------ resolver ---------------------------- */
export function resolveSite(site = {}) {
  const brief = site._brief || {};
  const seedStr =
    brief.variantSeed ||
    `${site.business?.name || "client"}|${site._meta?.domain || ""}`;
  const rng = mulberry32(cyrb53(String(seedStr)));

  // --- draw order is FIXED so results stay deterministic across runs ---
  // 1) design kit
  const kit = brief.designKit && KITS.includes(brief.designKit)
    ? brief.designKit
    : pick(rng, KITS);

  // 2) per-section layout variants
  const layoutVariants = {};
  const drawVariant = (section) => {
    const explicit = brief.layoutVariants?.[section];
    if (explicit) { layoutVariants[section] = explicit; return; }
    let list = CATALOGUE[section].filter((v) => prereqOk(section, v, site));
    if (!list.length) list = [CATALOGUE[section][0]]; // default fallback
    layoutVariants[section] = pick(rng, list);
  };
  /* LATE_DRAW sections are deliberately skipped here — see step 6. */
  for (const section of Object.keys(CATALOGUE)) {
    if (LATE_DRAW.has(section) || MANUAL.has(section)) continue;
    drawVariant(section);
  }

  // 3) section order: pin top + bottom, seeded-shuffle the middle —
  //    OR honor authored site.sections when _brief.sectionsLocked is true
  //    (verify-lock / crafted demos; shuffle would reseed the belief ladder).
  const NON_SECTIONS = ["header", "footer"];
  const present = (site.sections && site.sections.length)
    ? site.sections.slice()
    : DEFAULT_SECTIONS.filter((k) => !NON_SECTIONS.includes(k));
  let order;
  if (brief.sectionsLocked === true && site.sections?.length) {
    order = site.sections.filter((s) => !NON_SECTIONS.includes(s));
  } else {
    const top = TOP_ANCHORS.filter((s) => present.includes(s));
    const bottom = BOTTOM_ANCHORS.filter((s) => present.includes(s));
    const middle = present.filter((s) => !top.includes(s) && !bottom.includes(s));
    order = [...top, ...shuffle(rng, middle), ...bottom];
  }

  // 4) surface — drawn after the axes above.
  const surface = brief.surface && SURFACES.includes(brief.surface)
    ? brief.surface
    : pick(rng, SURFACES);

  // 5) colour band — pick one eligible mid section, then gate on contrast.
  //
  //    whyUs is NOT eligible: it renders as a permanent dark band by design, so
  //    seeding it changes nothing. Its neighbours are excluded too, because two
  //    dark blocks back to back reads as a mistake rather than as rhythm.
  const whyIdx = order.indexOf("whyUs");
  const bandEligible = order.filter(
    (sec, i) => BAND_ELIGIBLE.includes(sec) && (whyIdx < 0 || Math.abs(i - whyIdx) > 1)
  );

  //    The draw ALWAYS runs, even when an explicit brief value overrides it, so
  //    the RNG stream stays stable and a brief edit can't reseed everything after
  //    it. canInvert is applied last and applies to the explicit value too: a
  //    hand-picked band on a pale brand is still an unreadable band.
  const drawn = bandEligible.length ? pick(rng, bandEligible) : null;
  let bandSection = drawn;
  if (brief.bandSection === "none") bandSection = null;
  else if (brief.bandSection && bandEligible.includes(brief.bandSection)) {
    bandSection = brief.bandSection;
  }
  if (!canInvert(site)) bandSection = null;

  // 6) LATE-DRAW axes — appended to the END of the stream so that introducing
  //    them left every earlier draw byte-identical for already-built clients.
  //    Anything added after this point goes here too, never in step 2.
  for (const section of Object.keys(CATALOGUE)) {
    if (LATE_DRAW.has(section)) drawVariant(section);
  }

  // 7) MANUAL axes — explicit or the safe default. No RNG, ever.
  for (const section of MANUAL) {
    const explicit = brief.layoutVariants?.[section];
    layoutVariants[section] = CATALOGUE[section].includes(explicit) ? explicit : CATALOGUE[section][0];
  }

  /* Style Picker type (src/lib/stylepicks.mjs). null when the intake has no
     _brief.stylePicks, and then the kit's own fonts load as before. */
  const type = resolveType(site);

  return { kit, kitFonts: KIT_FONTS[kit], layoutVariants, order, surface, bandSection, seed: String(seedStr), type };
}
