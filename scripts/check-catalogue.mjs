#!/usr/bin/env node
/**
 * check-catalogue.mjs — the variant drift gate.
 *
 * WHY THIS EXISTS
 * v3.7 trimmed CATALOGUE from 7 sections / 24 variants to 2 / 7 because no
 * component read the other five sections. VARIANTS.txt was never updated. For
 * nine releases the reference doc advertised seventeen layouts that could not
 * render, and every client intake recorded a `services: "carousel"` decision
 * the build never made.
 *
 * A variant is only real when all THREE of these agree:
 *   1. it is documented in VARIANTS.txt
 *   2. it is listed in CATALOGUE in src/lib/variants.mjs
 *   3. a component actually branches on its name
 *
 * Any variant present in some but not all three fails the build. This is the
 * gate that makes "documented but non-rendering" unreachable.
 *
 * Zero dependencies. Exit 0 = clean, exit 1 = drift.
 */

import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { CATALOGUE } from "../src/lib/variants.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/* VARIANTS.txt section headings -> CATALOGUE keys. A heading not listed here is
   treated as prose (KITS, SURFACE, ADDING A NEW VARIANT, etc.) and skipped. */
const HEADING_TO_KEY = {
  HERO: "hero",
  SERVICES: "services",
  "STORY / ABOUT": "story",
  STORY: "story",
  TESTIMONIALS: "testimonials",
  "WHY US": "whyUs",
  HEADER: "header",
  FOOTER: "footer",
  AREAS: "areas",
  FAQS: "faqs",
  FAQ: "faqs",
  "SERVICES PAGE": "servicesPage",
};

/* Where each section's variant names must literally appear. First existing
   path wins; a section with no file here cannot be verified and is reported. */
const SECTION_SOURCES = {
  hero: ["src/components/Hero.astro"],
  services: ["src/components/Services.astro"],
  whyUs: ["src/components/WhyUs.astro"],
  story: ["src/components/Story.astro"],
  testimonials: ["src/components/Testimonials.astro"],
  header: ["src/components/Header.astro"],
  footer: ["src/components/Footer.astro"],
  areas: ["src/components/Areas.astro", "src/components/Usage.astro"],
  faqs: ["src/components/FAQ.astro"],
  servicesPage: ["src/pages/services.astro"],
};

const errors = [];
const warnings = [];

/* ------------------------- parse VARIANTS.txt ------------------------- */
function parseVariantsDoc() {
  const path = join(ROOT, "VARIANTS.txt");
  if (!existsSync(path)) {
    errors.push("VARIANTS.txt is missing. The catalogue cannot be verified.");
    return {};
  }
  const lines = readFileSync(path, "utf8").split(/\r?\n/);
  const found = {};
  let key = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    /* A heading is a 2-space-indented ALL-CAPS title sandwiched between rules. */
    if (/^=+\s*$/.test(line)) {
      const next = lines[i + 1] || "";
      const after = lines[i + 2] || "";
      if (/^=+\s*$/.test(after)) {
        /* Strip any trailing parenthetical, e.g. "HERO   (axis 3 — ...)". */
        const title = next.replace(/\(.*$/, "").trim().toUpperCase();
        key = Object.prototype.hasOwnProperty.call(HEADING_TO_KEY, title)
          ? HEADING_TO_KEY[title]
          : null;
        if (key && !found[key]) found[key] = [];
        i += 2;
      }
      continue;
    }
    if (!key) continue;

    /* Variant line: exactly two spaces, a lowercase identifier, whitespace,
       then either a "[gate]" marker or a capitalised description. Continuation
       lines are indented four or more and so never match. Prose bullets such
       as "ledger   — editorial/..." are excluded by the lookahead. */
    const m = /^ {2}([a-z][a-z0-9-]*)\s+(?=\[|[A-Z])/.exec(line);
    if (m && !found[key].includes(m[1])) found[key].push(m[1]);
  }
  return found;
}

/* ------------------- does a component branch on it? ------------------- */
function componentHasBranch(section, variant) {
  const candidates = SECTION_SOURCES[section] || [];
  for (const rel of candidates) {
    const p = join(ROOT, rel);
    if (!existsSync(p)) continue;
    const src = readFileSync(p, "utf8");
    /* The name must appear as a quoted string or a bare object key — that is
       what a real switch looks like. A mention inside a comment does not
       count, so comments are stripped first. */
    const code = src
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "")
      .replace(/^\s*\*.*$/gm, "");
    const q = variant.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(`["'\`]${q}["'\`]`).test(code)) return true;
    if (!variant.includes("-") && new RegExp(`(^|[{,\\s])${q}\\s*:`, "m").test(code)) return true;
  }
  return false;
}
function componentExists(section) {
  return (SECTION_SOURCES[section] || []).some((rel) => existsSync(join(ROOT, rel)));
}

/* ------------------------------ compare ------------------------------- */
const doc = parseVariantsDoc();
const cat = CATALOGUE || {};

const allKeys = new Set([...Object.keys(doc), ...Object.keys(cat)]);

for (const section of [...allKeys].sort()) {
  const docList = doc[section] || [];
  const catList = cat[section] || [];

  if (docList.length && !catList.length) {
    errors.push(
      `VARIANTS.txt documents section "${section}" (${docList.join(", ")}) but ` +
        `CATALOGUE has no entry for it. Nothing here renders. Either build the ` +
        `variants or delete the block from VARIANTS.txt.`
    );
    continue;
  }
  if (catList.length && !docList.length) {
    errors.push(
      `CATALOGUE lists section "${section}" (${catList.join(", ")}) but ` +
        `VARIANTS.txt has no block for it. Document it or remove it.`
    );
    continue;
  }

  for (const v of docList) {
    if (!catList.includes(v)) {
      errors.push(
        `${section}/${v} is documented in VARIANTS.txt but is not in CATALOGUE. ` +
          `The engine can never select it.`
      );
    }
  }
  for (const v of catList) {
    if (!docList.includes(v)) {
      errors.push(
        `${section}/${v} is in CATALOGUE but undocumented in VARIANTS.txt. ` +
          `Add it, or the next person will not know it exists.`
      );
    }
  }

  if (!componentExists(section)) {
    warnings.push(
      `No component found for section "${section}" (looked in ` +
        `${(SECTION_SOURCES[section] || ["<unmapped>"]).join(", ")}). ` +
        `Its variants cannot be verified against real branches.`
    );
    continue;
  }
  for (const v of catList) {
    if (!componentHasBranch(section, v)) {
      errors.push(
        `${section}/${v} is in CATALOGUE but no component branches on it. ` +
          `The engine will select a layout that does not exist.`
      );
    }
  }
}

/* ------------------------------- report ------------------------------- */
const total = Object.values(cat).reduce((n, l) => n + l.length, 0);

if (warnings.length) {
  console.log(`\n  ${warnings.length} warning(s) for the variant catalogue:\n`);
  for (const w of warnings) console.log(`  ! ${w}`);
  console.log("");
}

if (errors.length) {
  console.error(`\n  ${errors.length} catalogue error(s):\n`);
  for (const e of errors) console.error(`  ✗ ${e}`);
  console.error(
    "\n  A variant is real when VARIANTS.txt, CATALOGUE and the component all " +
      "agree.\n  Fix all three together or remove it from all three.\n"
  );
  process.exit(1);
}

console.log(
  `✓ check-catalogue: ${Object.keys(cat).length} section(s), ${total} variant(s) ` +
    `— documented, catalogued and rendering.`
);
