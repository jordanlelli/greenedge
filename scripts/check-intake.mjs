/**
 * check-intake.mjs — catches content the client gave you that the template
 * silently throws away, and the conditions where a whole section quietly
 * disappears.
 *
 * WHY THIS EXISTS
 * The Mitchell White demo intake carried six real Google reviews, six real job
 * photos, a six-field contact form and a set of hero trust marks. It passed
 * every check and built with exit 0. None of that content reached the page,
 * because those blocks had no reader. Nothing failed, so nothing said so — and
 * the demo went out without the strongest asset the business had.
 *
 * A build that drops a third of the client's content should not be a green build.
 *
 * WHAT IT DOES
 *   1. Works out which intake paths the template actually reads, by scanning
 *      src/ for `site.x.y` and for the local aliases components make
 *      (`const h = site.hero` then `h.trustMarks`).
 *   2. Walks the intake and reports any content key with no reader.
 *   3. Runs targeted checks on the failure modes that are silent by design —
 *      a section that self-hides is correct behaviour and invisible feedback.
 *
 * Unread keys are WARNINGS: the scan is good, not perfect, and a guard that
 * cries wolf gets ignored. The silent-failure checks are ERRORS.
 *
 *   node scripts/check-intake.mjs
 *   node scripts/check-intake.mjs --strict    # unread keys fail the build too
 *   node scripts/check-intake.mjs --intake path/to/client-intake.json
 */
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { parseStylePicks } from "../src/lib/stylepicks.mjs";
import { ICON_NAMES, iconPath } from "../src/lib/icons.mjs";
import { dirname, join, relative } from "node:path";
import { resolvePages, PAGE_META } from "../src/lib/pages.mjs";

/* src/data/gallery.ts is a SECOND source of gallery content, alongside the
   intake's gallery.images. pageIsBuilt() already accepts it as
   extra.galleryEntries — but this script called resolvePages() with no extra,
   so a client whose gallery lives entirely in the data file was told on every
   single build that /gallery "has no content" while /gallery was sitting there
   with six entries in it. A warning that is always wrong trains you to skim
   the warnings, which is worse than having none. Counted by regex rather than
   imported because this file is TypeScript with Astro image imports and Node
   cannot load it directly. */
function countGalleryEntries() {
  const tsPath = new URL("../src/data/gallery.ts", import.meta.url);
  try {
    const src = readFileSync(tsPath, "utf8");
    const body = src.slice(src.indexOf("galleryEntries: GalleryEntry[] = ["));
    return (body.match(/\bid:\s*"/g) || []).length;
  } catch {
    return 0;
  }
}
const galleryEntryCount = countGalleryEntries();
const pageExtra = {
  galleryEntries: galleryEntryCount ? new Array(galleryEntryCount).fill(1) : [],
};
import { legalPageState } from "../src/lib/legal.mjs";
import { allAreas, areaPageState, duplicatePairs, buildableAreas } from "../src/lib/areas.mjs";
import { fileURLToPath } from "node:url";
import { intakePath } from "./intake-path.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const argv = process.argv.slice(2);
const STRICT = argv.includes("--strict");
const iArg = argv.indexOf("--intake");
const INTAKE = iArg > -1 ? argv[iArg + 1] : intakePath();

const errors = [];
const warnings = [];

/* ── 1. what does the template read? ────────────────────────────────────── */
const walk = (dir, out = []) => {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(astro|ts|tsx|mjs|js)$/.test(name)) out.push(full);
  }
  return out;
};

const readPaths = new Set();
const addPath = (p) => {
  /* Register every ancestor too: reading `hero.image` means `hero` is read. */
  const parts = p.split(".");
  for (let i = 1; i <= parts.length; i += 1) readPaths.add(parts.slice(0, i).join("."));
};

for (const file of walk(join(root, "src"))) {
  const src = readFileSync(file, "utf8");

  /* direct: site.hero.image / site?.hero?.image */
  for (const m of src.matchAll(/\bsite\s*\??\.\s*([A-Za-z_$][\w$]*(?:\s*\??\.\s*[A-Za-z_$][\w$]*)*)/g)) {
    addPath(m[1].replace(/[\s?]/g, ""));
  }

  /* aliased: `const h = site.hero || {}` then `h.trustMarks`.
     Resolved ITERATIVELY, because components alias in chains:
       const cs = site.contactSection;  const form = cs.form;  form.submitLabel
     A single pass misses `form.submitLabel` and reports a false positive — and a
     guard with false positives is a guard you stop reading. */
  const aliases = new Map();
  for (const m of src.matchAll(
    /\bconst\s+([A-Za-z_$][\w$]*)\s*=\s*site\s*\??\.\s*([A-Za-z_$][\w$]*(?:\s*\??\.\s*[A-Za-z_$][\w$]*)*)/g
  )) {
    aliases.set(m[1], m[2].replace(/[\s?]/g, ""));
  }
  for (let pass = 0; pass < 4; pass += 1) {
    let grew = false;
    for (const m of src.matchAll(
      /\bconst\s+([A-Za-z_$][\w$]*)\s*=\s*([A-Za-z_$][\w$]*)\s*\??\.\s*([A-Za-z_$][\w$]*(?:\s*\??\.\s*[A-Za-z_$][\w$]*)*)/g
    )) {
      const [, name, obj, rest] = m;
      if (name === "site" || !aliases.has(obj) || aliases.has(name)) continue;
      aliases.set(name, `${aliases.get(obj)}.${rest.replace(/[\s?]/g, "")}`);
      grew = true;
    }
    if (!grew) break;
  }
  for (const [alias, base] of aliases) {
    addPath(base);
    const re = new RegExp(`\\b${alias}\\s*\\??\\.\\s*([A-Za-z_$][\\w$]*)`, "g");
    for (const m of src.matchAll(re)) addPath(`${base}.${m[1]}`);
  }

  /* destructured: `const { items, heading } = resolveTestimonials(site, ...)`
     is covered because the normaliser itself reads site.testimonials. */
}

/* Paths reached through the content normalisers, which take the whole `site`
   object and pick keys out of nested blocks. Listed explicitly because a static
   scan cannot follow them. Keep in sync with src/lib/content.mjs. */
[
  "testimonials.items",
  "testimonials.sourceUrl",
  "testimonials.source",
  "testimonials.heading",
  "testimonials.eyebrow",
  "testimonials.subhead",
  "gallery.images",
  "gallery.eyebrow",
  "gallery.heading",
  "hero.trustMarks",
  "hero.stats",
  /* v3.16 — reached through resolveServices(site) and the WhyUs two-hop
     destructure (`raw = site.whyUs` then `block = ... raw || {}`). The static
     alias scan follows one hop, not two. */
  "services.items", "services.eyebrow", "services.heading", "services.subhead",
  "whyUs.items", "whyUs.heading", "whyUs.trust", "whyUs.type",
  "whyUs.pairs", "whyUs.themLabel", "whyUs.usLabel",
  "usage.items", "usage.featured", "usage.areasLine", "usage.travelLine",
  "usage.notCoveredLine", "usage.eyebrow", "usage.heading", "usage.subhead",
  "usage.areaStyle",
  "hero.secondaryCtaLabel",
  "hero.secondaryCtaHref",
  "style",
  "theme",
  "sections",
  /* Reached through resolvers that take the whole `site` object. A static scan
     cannot follow those, and a false "no reader" warning is worse than none —
     it trains you to skim the list, which is how the real ones get missed. */
  "pages.services", "pages.gallery", "pages.faq", "pages.areas", "pages.labels",
  "agency.credit.enabled", "agency.credit.name", "agency.credit.url",
  "agency.credit.rel", "agency.credit.label",
  "legal.privacy.enabled", "legal.terms.enabled", "legal.terms.tradeTerms",
  "legal.terms.tradePack", "legal.terms.extraClauses",
  "serviceAreas",
  "contact.instagram", "contact.facebook", "contact.tiktok",
  /* v3.19 — /services page model (resolveServicesPage) and per-page SEO
     (pageSeo in config.ts, keyed by a variable so the scan cannot see it). */
  "services.page", "services.page.eyebrow", "services.page.heading", "services.page.subhead",
  "services.page.quoteHeading", "services.page.quoteBody", "services.page.featuredHeading",
  "services.page.moreHeading", "services.page.midHeading", "services.page.midBody",
  "services.groups", "services.pageEyebrow", "services.pageHeading",
  "business.schemaType", "business.googleBusinessUrl", "contact.openingHoursSpec", "contact.linkedin",
  "usage.notCoveredHeading",
  "seo.pages",
  ...["services", "areas", "gallery", "faq"].flatMap((k) => [`seo.pages.${k}`, `seo.pages.${k}.title`, `seo.pages.${k}.description`]),
].forEach(addPath);

/* ── 2. walk the intake ─────────────────────────────────────────────────── */
if (!existsSync(INTAKE)) {
  console.error(`✗ intake not found: ${INTAKE}`);
  process.exit(1);
}
const intake = JSON.parse(readFileSync(INTAKE, "utf8"));

/* Leaf-ish paths only: report the deepest key that has no reader, not every
   ancestor, or one unread block produces twenty lines of noise. */
const unread = [];
const visit = (obj, prefix = "") => {
  for (const [key, val] of Object.entries(obj)) {
    if (key.startsWith("_")) continue;
    const path = prefix ? `${prefix}.${key}` : key;
    if (!readPaths.has(path)) {
      const empty =
        val == null ||
        val === "" ||
        (Array.isArray(val) && val.length === 0) ||
        (typeof val === "object" && !Array.isArray(val) && Object.keys(val).length === 0);
      if (!empty) unread.push(path);
      continue; // don't descend into an unread branch
    }
    if (val && typeof val === "object" && !Array.isArray(val)) visit(val, path);
  }
};
visit(intake);

/* v3.20 — LocalBusiness schema inputs. */
{
  const TYPES = ["LocalBusiness", "HomeAndConstructionBusiness", "GeneralContractor", "Electrician", "Plumber",
    "RoofingContractor", "HousePainter", "HVACBusiness", "Locksmith", "MovingCompany", "AutomotiveBusiness",
    "AutoRepair", "ProfessionalService"];
  const t = intake.business?.schemaType;
  if (t && !TYPES.includes(t)) {
    warnings.push(`business.schemaType "${t}" is not a supported schema.org type, so the schema falls back to LocalBusiness. Use one of: ${TYPES.join(", ")}.`);
  } else if (!t) {
    warnings.push(`business.schemaType is empty — the schema says generic LocalBusiness. Set the trade type (Plumber, Electrician, GeneralContractor, ...).`);
  }
  const hours = Array.isArray(intake.contact?.openingHoursSpec) ? intake.contact.openingHoursSpec : [];
  hours.forEach((r, i) => {
    const ok = r && Array.isArray(r.days) && r.days.length && /^([01]\d|2[0-3]):[0-5]\d$/.test(r.opens || "") && /^([01]\d|2[0-3]):[0-5]\d$/.test(r.closes || "");
    if (!ok) warnings.push(`contact.openingHoursSpec[${i}] needs days ["Mo".."Su"], opens and closes as HH:MM (24h) — it is dropped from the schema.`);
  });
}

/* v3.19 — /services layout sanity. Advisory only: the layout is a manual
   choice, so this nudges rather than blocks. */
{
  const items = Array.isArray(intake.services?.items) ? intake.services.items.filter((it) => it && it.title) : [];
  const layoutPick = intake._brief?.layoutVariants?.servicesPage || "stacked";
  const groups = Array.isArray(intake.services?.groups) ? intake.services.groups.filter((g) => g && g.id && g.heading) : [];
  const ids = new Set(groups.map((g) => String(g.id).toLowerCase()));
  if (layoutPick === "stacked" && items.length > 6) {
    warnings.push(
      `services — ${items.length} services on the stacked /services layout. Stacked is built for 1-6; ` +
        `set _brief.layoutVariants.servicesPage to grouped, featured or index (VARIANT-CHEAT-SHEET §4).`
    );
  }
  if (layoutPick === "grouped" && groups.length === 0) {
    warnings.push(`services — servicesPage is "grouped" but services.groups[] is empty, so it renders as one ungrouped card grid.`);
  }
  for (const it of items) {
    if (it.group && !ids.has(String(it.group).toLowerCase())) {
      warnings.push(`services.items "${it.title}" — group "${it.group}" matches no services.groups[].id; it will render ungrouped.`);
    }
  }
}

for (const path of unread) {
  warnings.push(
    `${path} — no reader in src/. This content is in the intake and will NOT ` +
      `appear on the page. Either wire it up or delete it from the intake so the ` +
      `file stops implying it does something.`
  );
}

/* ── Style Picker code (v3.24) ──────────────────────────────────────────── */
{
  const code = intake._brief?.stylePicks;
  const picks = parseStylePicks(code);
  if (picks?.unknown.length) {
    errors.push(
      `_brief.stylePicks "${code}" has part(s) the template does not know: ${picks.unknown.join(", ")}. ` +
        `The picker page and src/lib/stylepicks.mjs must list the same fonts, bases and colour sets. Run "npm run picks -- <code>" to see the valid ids.`
    );
  }
}

/* ── service icons + sample sections (v3.27) ────────────────────────────── */
{
  const badIcons = (intake.services?.items || [])
    .map((it) => (typeof it?.icon === "string" ? it.icon.trim() : ""))
    .filter((name) => name && !iconPath(name));
  if (badIcons.length) {
    errors.push(
      `services.items[].icon names ${[...new Set(badIcons)].map((n) => `"${n}"`).join(", ")}, which the icon set does not have, so those cards fall back to a number. ` +
        `Available: ${ICON_NAMES.join(", ")}.`
    );
  }
  const sample = Array.isArray(intake.demo?.sampleSections) ? intake.demo.sampleSections : [];
  if (sample.length && intake.seo?.noindex !== true) {
    errors.push(
      `demo.sampleSections marks ${sample.join(", ")} as sample content, but seo.noindex is not true. ` +
        `A page carrying sample content must not be indexable: set seo.noindex to true, or replace the sample copy and empty demo.sampleSections.`
    );
  }
}

/* ── 3. the silent failures ─────────────────────────────────────────────── */
const has = (v) => v != null && v !== "" && !(Array.isArray(v) && v.length === 0);
const str = (v) => (typeof v === "string" ? v.trim() : "");
const sections = Array.isArray(intake.sections) ? intake.sections : [];

/* Testimonials that cannot be attributed are dropped at render — correctly, but
   invisibly. This is the single highest-value block on a trade site. */
const tBlock = intake.testimonials;
const tItems = Array.isArray(tBlock) ? tBlock : Array.isArray(tBlock?.items) ? tBlock.items : [];
const tBlockSource = Array.isArray(tBlock) ? "" : tBlock?.sourceUrl || "";
const unsourced = tItems.filter((t) => t?.quote && !(t.sourceUrl || tBlockSource));
if (unsourced.length) {
  errors.push(
    `${unsourced.length} testimonial(s) have no sourceUrl and will NOT render. ` +
      `Fix in one line: add "sourceUrl" to the testimonials block pointing at the ` +
      `client's Google reviews link, or per item. Quotes render only when they are ` +
      `attributable — that rule is deliberate.`
  );
}

/* REVIEW RATINGS (v3.28). A star row is a claim about what a reviewer gave,
   so it renders only for a value from 1 to 5 and anything else is ignored at
   render. Ignored is right for the page and wrong for the build log: "five"
   or 10 would simply show no stars and nobody would know why. */
{
  const badStars = (v) => v !== undefined && v !== "" && v !== null && !(Number(v) >= 1 && Number(v) <= 5);
  const badItems = tItems.filter((t) => t && badStars(t.rating));
  if (badItems.length) {
    errors.push(
      `${badItems.length} testimonial(s) have a rating that is not a number from 1 to 5, so no stars render for them. ` +
        `Use the reviewer's own star rating, or remove the field (a Facebook recommendation has no stars).`
    );
  }
  const r = Array.isArray(tBlock) ? null : tBlock?.rating;
  if (r && typeof r === "object" && (has(r.score) || has(r.count))) {
    const countOk = Number.isInteger(Number(r.count)) && Number(r.count) > 0;
    if (badStars(r.score) || !has(r.score) || !countOk) {
      errors.push(
        `testimonials.rating needs BOTH score (1 to 5) and count (a whole number), copied from the review ` +
          `profile itself. It is the profile's rating, never an average of the reviews on this page.`
      );
    }
  }
}

/* Photos in the intake with the photo gate closed. */
if (has(intake.gallery?.images) && intake.features?.hasPhotos !== true) {
  errors.push(
    `gallery.images has ${intake.gallery.images.length} photo(s) but ` +
      `features.hasPhotos is not true, so none of them render. Set it to true ` +
      `once the files are actually in public/images.`
  );
}
if (sections.includes("gallery") && !has(intake.gallery?.images) && !galleryEntryCount) {
  warnings.push(`sections includes "gallery" but neither gallery.images nor src/data/gallery.ts has content — the section self-hides.`);
}

/* A form block with no endpoint silently degrades to the phone-first card, so
   every field the client asked for disappears without a word. */
if (intake.contactSection?.form?.enabled !== false && !has(intake.contact?.formEndpoint)) {
  const fields = intake.contactSection?.form?.fields?.length || 0;
  errors.push(
    `contact.formEndpoint is empty, so the contact form does not render and the ` +
      `phone-first fallback shows instead${fields ? ` — the ${fields} configured field(s) are dropped` : ""}. ` +
      `Add a Formspree/Web3Forms/FormSubmit endpoint, or set ` +
      `contactSection.form.enabled to false to make phone-first a decision rather than an accident.`
  );
}

/* Legal pages: one gate, so the only failure left is missing facts. Reported as
   an error rather than a warning because a live site that collects names, phone
   numbers and email addresses through a third-party endpoint and publishes no
   privacy policy is a compliance problem, not a polish item. */
for (const kind of ["privacy", "terms"]) {
  const state = legalPageState(kind, intake);
  if (state.enabled && !state.ready) {
    errors.push(
      `/${kind} is enabled but ${state.reason}, so it redirects home instead of ` +
        `building and the footer link disappears with it.`
    );
  }
}
if (legalPageState("privacy", intake).live === false && intake.legal?.privacy?.enabled === false) {
  warnings.push(
    `legal.privacy is switched off. A site collecting names, phone numbers and ` +
      `email addresses through a third-party form endpoint should carry a privacy ` +
      `policy — confirm this is deliberate.`
  );
}

/* Terms of trade are a commitment the client's customers can hold them to, so a
   half-filled set is worse than none. */
{
  const tt = intake.legal?.terms?.tradeTerms || {};
  if (tt.enabled === true) {
    const core = ["quoteValidityDays", "depositTerms", "paymentTerms", "workmanshipWarranty"];
    const blank = core.filter((k) => !has(tt[k]));
    if (blank.length === core.length) {
      errors.push(
        `legal.terms.tradeTerms is enabled but every commercial field is blank, so the ` +
          `"Terms of trade" section renders only generic clauses. Fill ${core.join(", ")} ` +
          `or set enabled to false.`
      );
    } else if (blank.length) {
      warnings.push(
        `legal.terms.tradeTerms is missing ${blank.join(", ")} — those clauses are omitted ` +
          `rather than guessed. Confirm with the client and fill them in.`
      );
    }
    if (!has(intake.business?.trade)) {
      warnings.push(
        `business.trade is empty, so no trade-specific terms clauses are added. For a painter ` +
          `that means no substrate, colour or lead-paint clause — the ones that matter most.`
      );
    }
  }
}

/* Service-area pages. The module sells 2-4 a quarter, so the failure mode that
   matters is not "too few" — it is publishing near-identical pages and earning a
   doorway penalty for a client who is paying you to protect them from that. */
{
  const areas = allAreas(intake);
  const pages = buildableAreas(intake);
  const nearlyThere = areas
    .map((a) => ({ a, st: areaPageState(a) }))
    .filter(({ a, st }) => !st.buildable && !a.listedOnly);

  if (pages.length) {
    console.log(`\n  SERVICE AREA PAGES (${pages.length} of ${areas.length} suburbs):`);
    pages.forEach((a) => console.log(`    /areas/${a.slug}`));
  }
  for (const { a, st } of nearlyThere) {
    warnings.push(`serviceAreas "${a.name}" has content but no page: ${st.reason}.`);
  }

  const dupes = duplicatePairs(intake);
  for (const d of dupes) {
    errors.push(
      `service area pages "${d.a}" and "${d.b}" are ${Math.round(d.score * 100)}% the same text. ` +
        `Near-identical suburb pages are a doorway site — Google filters them and can issue a ` +
        `manual action. Rewrite one, or drop it to a list entry in usage.items.`
    );
  }
}

/* Content blocks the client filled in for a section they are not rendering.
   The unread-key scan cannot catch this: `story` HAS a reader, it is just never
   mounted, so a full About block with three cards vanishes silently. */
{
  const SECTION_BLOCKS = {
    story: "story", whyUs: "whyUs", areas: "usage", testimonials: "testimonials",
    faqs: "faqs", tiers: "tiers", gallery: "gallery", beforeAfter: "beforeAfter",
  };
  for (const [sec, key] of Object.entries(SECTION_BLOCKS)) {
    let block = intake[key];
    /* Rendered elsewhere, not by the homepage section: beforeAfter items with
       a `service` go on that /services/<slug> page, and gallery.images go on
       /gallery when that page is on. */
    if (key === "beforeAfter" && block && Array.isArray(block.items)) {
      block = { ...block, items: block.items.filter((it) => !(it && it.service)) };
      if (!has(block.items)) block = null;
    }
    if (key === "gallery" && intake.pages?.gallery !== false) continue;
    const filled = block && (Array.isArray(block) ? block.length : Object.keys(block).filter((k) => !k.startsWith("_")).some((k) => has(block[k])));
    if (filled && !sections.includes(sec)) {
      warnings.push(
        `"${key}" has content but "${sec}" is not in sections, so none of it renders. ` +
          `Add it to sections or delete the block.`
      );
    }
  }
}

/* Sections listed that cannot render.
   v3.16: `services` now has its own component (extracted from Hero), and the
   homepage coverage block moved out of Story into `areas`. Both `areas` and the
   legacy `usage` name are accepted so existing intakes keep building. */
const RENDERABLE = new Set([
  "hero", "services", "beforeAfter", "whyUs", "recentJobs", "gallery",
  "story", "areas", "usage", "tiers", "testimonials", "faqs", "contact",
]);
for (const sec of sections) {
  if (!RENDERABLE.has(sec)) {
    errors.push(`sections includes "${sec}", which has no component — it renders nothing.`);
  }
}

/* Without a site URL there is no canonical, no og:url, no absolute og:image and
   a sitemap full of https://example.com. Everything social and everything
   crawlable depends on this one field. */
if (!has(intake.seo?.siteUrl) && !has(intake._meta?.domain)) {
  errors.push(
    `neither seo.siteUrl nor _meta.domain is set. Canonical URLs, og:url, the ` +
      `absolute og:image and the sitemap all derive from it — without it the ` +
      `sitemap ships pointing at https://example.com.`
  );
}

/* A share image that isn't a real file is worse than none: the scraper caches a
   404 and the link preview stays broken for days. */
const og = intake.seo?.ogImage;
if (has(og) && !/^https?:\/\//i.test(og) && !existsSync(join(root, "public", og.replace(/^\//, "")))) {
  errors.push(
    `seo.ogImage "${og}" does not exist in public/. Social scrapers cache a 404 ` +
      `hard, so a wrong path breaks the link preview for days after you fix it.`
  );
}

/* A stock hero is fine in a demo and fine on a live site. It is NOT fine
   anywhere the page claims the work is the client's, so keep saying so until
   the flag is cleared. */
if (intake.hero?.imageIsStock === true) {
  warnings.push(
    `hero.imageIsStock is true — the hero is a stock photo. Fine for the demo and ` +
      `fine to keep, but it must never appear in the gallery, before/after or ` +
      `recent jobs, which present images as this client's completed work.`
  );
}
/* v3.21: an intake image path resolves to src/assets/<path> (optimised,
   srcset) or public/<path> (served as-is). Either location is valid. */
const imageExists = (p) => {
  const rel = String(p).replace(/^\//, "");
  return existsSync(join(root, "src", "assets", rel)) || existsSync(join(root, "public", rel));
};
if (has(intake.hero?.image) && !/^https?:\/\//i.test(intake.hero.image) && !imageExists(intake.hero.image)) {
  errors.push(
    `hero.image "${intake.hero.image}" exists in neither src/assets/ nor public/. It is the ` +
      `largest element above the fold and the og:image fallback.`
  );
}
/* A public/ image that could be optimised isn't. Warn above ~400 KB: that is
   a file being sent full-size to every phone. */
const publicHeavy = [];
const pubImages = [intake.hero?.image, intake.story?.image, ...(intake.services?.items || []).map((it) => it?.image)]
  .filter((p) => has(p) && !/^https?:\/\//i.test(p));
for (const p of new Set(pubImages)) {
  const rel = String(p).replace(/^\//, "");
  const pub = join(root, "public", rel);
  if (!existsSync(join(root, "src", "assets", rel)) && existsSync(pub) && statSync(pub).size > 400 * 1024) {
    publicHeavy.push(`${p} (${Math.round(statSync(pub).size / 1024)} KB)`);
  }
}
if (publicHeavy.length) {
  warnings.push(
    `${publicHeavy.length} image(s) are served unoptimised from public/: ${publicHeavy.join(", ")}. ` +
      `Move each to the same path under src/assets/ (no intake change) to get a resized WebP srcset.`
  );
}

/* The two noindex mistakes, in both directions. Forgetting to turn it OFF is the
   expensive one: a client's real site invisible to Google for however long it
   takes someone to notice. */
{
  const domain = str(intake._meta?.domain) || str(intake.seo?.siteUrl);
  /* example.com(.au), example.org/net and the .example/.test/.invalid TLDs are
     reserved for documentation: nothing live is served from them, so an intake
     on one (the template's own client-intake.demo.json) is a demo. */
  const isDemo =
    /vercel\.app|netlify\.app|pages\.dev|localhost/i.test(domain) ||
    /(^|[./])example\.(com|org|net)(\.au)?(\/|$)|\.(example|test|invalid)(\/|$)/i.test(domain);
  if (intake.seo?.noindex === true && domain && !isDemo) {
    errors.push(
      `seo.noindex is true but the domain is "${domain}", which is not a demo host. ` +
        `The whole site would ship with noindex + Disallow. Set it to false before go-live.`
    );
  }
  if (intake.seo?.noindex !== true && isDemo) {
    warnings.push(
      `building on ${domain} with seo.noindex off — a cold-outreach demo carrying the ` +
        `client's real name, reviews and unapproved copy would be indexable.`
    );
  }
}

/* Analytics provider typos render nothing rather than erroring. */
/* "none"/"off"/"false" all clearly mean off and were being reported as typos.
   A warning that fires on the correct intent is noise, and noise is what makes
   the list get skimmed. */
const OFF_VALUES = ["none", "off", "false", "no", "disabled"];
const provider = str(intake.analytics?.provider).toLowerCase();
if (provider && !OFF_VALUES.includes(provider) && !["plausible", "ga4", "umami"].includes(provider)) {
  warnings.push(
    `analytics.provider "${provider}" is not one of plausible|ga4|umami — no analytics will load. ` +
      `Use "" for none.`
  );
}

/* ── page set ───────────────────────────────────────────────────────────
   Print what this build actually ships. A page vanishing because its content
   is empty is correct behaviour, but silent correct behaviour is how the demo
   went out without a gallery — so it gets said out loud, every build. */
/* WHY US vs ABOUT: SHARED SENTENCES. The two sections answer different
   questions (INTAKE-SPEC.txt), and the fastest way to make a site read as
   generated is to answer both with the same words. Facts may legitimately
   appear in both — the same 35 years can back a method claim in Why Us and
   be reassurance in About — so this looks for repeated PHRASING, not repeated
   subjects: a run of five or more consecutive words present in both.

   A warning, not a failure. Copy is judgement, and a five-word run can be
   coincidence ("across Adelaide and regional South Australia"). It is there to
   make the duplication visible while it is still cheap to fix. */
{
  const norm = (t) =>
    String(t || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
  const shingles = (t, n = 5) => {
    const w = norm(t).split(" ").filter(Boolean);
    const out = new Set();
    for (let i = 0; i + n <= w.length; i++) out.add(w.slice(i, i + n).join(" "));
    return out;
  };
  const whyText = [
    ...(Array.isArray(intake.whyUs) ? intake.whyUs : intake.whyUs?.items || []),
  ].map((i) => `${i?.title || ""} ${i?.description || ""}`).join(" ");
  const storyText = [
    intake.story?.body || "",
    ...(intake.story?.cards || []).map((c) => `${c?.title || ""} ${c?.description || ""}`),
  ].join(" ");

  if (whyText && storyText) {
    const a = shingles(whyText);
    const shared = [...shingles(storyText)].filter((s) => a.has(s));
    if (shared.length) {
      warnings.push(
        `whyUs and story share ${shared.length} phrase(s) of 5+ words, e.g. "${shared[0]}". ` +
          `Why Us is the TECHNICAL section (method, standards, what gets checked) and About is the ` +
          `CONVERSATIONAL one (who they are, who turns up). Shared facts are fine; shared sentences ` +
          `mean one of the two sections is not doing its job. See INTAKE-SPEC.txt.`
      );
    }
  }
}

/* HERO EYEBROW RESTATING THE HEADER (DESIGN-LIBRARY B11). The business name
   is already in the header wordmark a few lines above the eyebrow. An eyebrow
   that opens with it ("Hanson Fencing & Gate · Athol Park") spends the first
   line of the page repeating the logo. The eyebrow earns its place with a
   fact the heading does not carry: trade + suburb, a licence class, "Family
   run since 1998". A warning, not a failure: copy is judgement. */
{
  const flat = (t) => String(t || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const eb = flat(intake.hero?.eyebrow);
  const nm = flat(intake.business?.name);
  if (eb && nm && nm.length >= 4 && eb.includes(nm)) {
    warnings.push(
      `hero.eyebrow repeats the business name ("${intake.hero.eyebrow}"). The header already shows it ` +
        `directly above. Use the eyebrow for a fact the heading does not carry (trade + suburb, ` +
        `licence class), or leave it empty.`
    );
  }
}

/* DEAD INTERNAL LINKS. footer.columns[].links[] and any other hand-authored
   href in the intake is NOT validated by anything else: nav is generated from
   resolvePages, but these are typed by hand and survive every change to what
   the build actually ships.

   Caught in the wild on A&J v3: the footer carried "About Us -> /about" from a
   build where /about was a real page, plus five links to /services/<slug>
   detail pages that only existed in the previous repo. Six dead links in the
   footer of every page on the site, and nothing failed. A visitor clicking
   "About Us" got a 2-second meta-refresh to /#story, which reads as a broken
   site rather than a deliberate redirect. */
{
  const redirectOnly = new Set(["/about", "/contact", "/gallery"]);
  const livePaths = new Set(["/", "/services", "/faq", "/areas", "/gallery", "/privacy", "/terms"]);
  const { built: builtNow } = resolvePages(intake, pageExtra);
  for (const k of Object.keys(PAGE_META)) {
    if (!builtNow.includes(k)) livePaths.delete(PAGE_META[k].path);
  }
  if (intake.legal?.privacy?.enabled === false) livePaths.delete("/privacy");
  if (intake.legal?.terms?.enabled !== true) livePaths.delete("/terms");

  const serviceSlugs = new Set();
  try {
    const src = readFileSync(new URL("../src/data/services.ts", import.meta.url), "utf8");
    for (const m of src.matchAll(/slug:\s*"([^"]+)"/g)) serviceSlugs.add(m[1]);
  } catch {}

  const hrefs = [];
  for (const col of intake.footer?.columns || [])
    for (const l of col.links || []) hrefs.push([`footer."${col.heading}"`, l.label, l.href]);

  for (const [where, label, href] of hrefs) {
    if (!href || !href.startsWith("/")) continue;
    const path = href.split("#")[0].replace(/\/$/, "") || "/";
    if (path.startsWith("/services/")) {
      const slug = path.slice("/services/".length);
      if (!serviceSlugs.has(slug))
        warnings.push(
          `${where} link "${label}" points at ${href}, but no service with slug "${slug}" exists in ` +
            `src/data/services.ts, so that page is never built. Point it at /services or add the service.`
        );
      continue;
    }
    if (redirectOnly.has(path) && !livePaths.has(path)) {
      warnings.push(
        `${where} link "${label}" points at ${href}, which only redirects home. ` +
          `Point it at the section anchor instead (e.g. /#story) so it does not read as a broken page.`
      );
      continue;
    }
    if (!livePaths.has(path))
      warnings.push(`${where} link "${label}" points at ${href}, which this build does not ship.`);
  }
}

{
  const { built, suppressed } = resolvePages(intake, pageExtra);
  const lines = ["/  (home, contact section at the bottom)"];
  for (const k of built) lines.push(`${PAGE_META[k].path}  (${PAGE_META[k].label})`);
  if (intake.legal?.privacy?.enabled !== false) lines.push("/privacy  (noindex, not in sitemap)");
  if (intake.legal?.terms?.enabled === true) lines.push("/terms  (noindex, not in sitemap)");
  console.log(`\n  PAGES THIS BUILD SHIPS (${lines.length}):`);
  lines.forEach((l) => console.log("    " + l));
  for (const k of suppressed) {
    warnings.push(
      `pages.${k} is on but has no content, so ${PAGE_META[k].path} redirects home ` +
        `instead of building. Fill it or set pages.${k} to false.`
    );
  }
}

/* ── output ─────────────────────────────────────────────────────────────── */
const rel = relative(root, INTAKE) || INTAKE;

/* The five things that block a demo, in the order they cost you time. Printed
   as a checklist rather than left inside the error list, because the errors are
   sorted by the code that raises them, not by what you have to go and get. */
if (errors.length) {
  const needs = [];
  const t = intake.testimonials;
  const tItems = Array.isArray(t) ? t : Array.isArray(t?.items) ? t.items : [];
  if (tItems.length && !(Array.isArray(t) ? false : t?.sourceUrl))
    needs.push("Google reviews permalink  -> testimonials.sourceUrl  (ask the client, or open their GBP)");
  if (!has(intake.contact?.formEndpoint) && intake.contactSection?.form?.enabled !== false)
    needs.push("Form endpoint             -> contact.formEndpoint    (Formspree/Web3Forms, 2 min to create)");
  if (!has(intake.legal?.privacy?.lastUpdated) || !has(intake.legal?.terms?.lastUpdated))
    needs.push("Today's date              -> legal.*.lastUpdated     (you already know this one)");
  if (has(intake.seo?.ogImage))
    needs.push("1200x630 share card       -> public/ + seo.ogImage   (or clear it and let hero.image cover it)");
  if (needs.length) {
    console.log("\n  BEFORE YOU BUILD — what you actually have to go and get:");
    needs.forEach((n) => console.log("    [ ] " + n));
  }
}
if (warnings.length) {
  console.log(`\n  ${warnings.length} warning(s) for ${rel}:\n`);
  warnings.forEach((w) => console.log("  ! " + w));
}
if (errors.length) {
  console.error(`\n✗ check-intake: ${errors.length} problem(s) in ${rel}.\n`);
  errors.forEach((e) => console.error("  • " + e));
  console.error("");
  process.exit(1);
}
if (STRICT && warnings.length) {
  console.error(`\n✗ check-intake: --strict, and ${warnings.length} key(s) have no reader.\n`);
  process.exit(1);
}
console.log(`\n✓ check-intake: every content key in ${rel} reaches the page.`);
process.exit(0);
