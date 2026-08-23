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
import { dirname, join, relative } from "node:path";
import { resolvePages, PAGE_META } from "../src/lib/pages.mjs";
import { legalPageState } from "../src/lib/legal.mjs";
import { allAreas, areaPageState, duplicatePairs, buildableAreas } from "../src/lib/areas.mjs";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const argv = process.argv.slice(2);
const STRICT = argv.includes("--strict");
const iArg = argv.indexOf("--intake");
const INTAKE = iArg > -1 ? argv[iArg + 1] : join(root, "client-intake.json");

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

for (const path of unread) {
  warnings.push(
    `${path} — no reader in src/. This content is in the intake and will NOT ` +
      `appear on the page. Either wire it up or delete it from the intake so the ` +
      `file stops implying it does something.`
  );
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

/* Photos in the intake with the photo gate closed. */
if (has(intake.gallery?.images) && intake.features?.hasPhotos !== true) {
  errors.push(
    `gallery.images has ${intake.gallery.images.length} photo(s) but ` +
      `features.hasPhotos is not true, so none of them render. Set it to true ` +
      `once the files are actually in public/images.`
  );
}
if (sections.includes("gallery") && !has(intake.gallery?.images)) {
  warnings.push(`sections includes "gallery" but gallery.images is empty — the section self-hides.`);
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
    const block = intake[key];
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
if (has(intake.hero?.image) && !/^https?:\/\//i.test(intake.hero.image) &&
    !existsSync(join(root, "public", intake.hero.image.replace(/^\//, "")))) {
  errors.push(
    `hero.image "${intake.hero.image}" does not exist in public/. It is the ` +
      `largest element above the fold and the og:image fallback.`
  );
}

/* The two noindex mistakes, in both directions. Forgetting to turn it OFF is the
   expensive one: a client's real site invisible to Google for however long it
   takes someone to notice. */
{
  const domain = str(intake._meta?.domain) || str(intake.seo?.siteUrl);
  const isDemo = /vercel\.app|netlify\.app|pages\.dev|localhost/i.test(domain);
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
{
  const { built, suppressed } = resolvePages(intake);
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
