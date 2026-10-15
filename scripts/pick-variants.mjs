/**
 * scripts/pick-variants.mjs
 *
 * Run ONCE per new client, after copying the template:
 *     node scripts/pick-variants.mjs
 *
 * It resolves this client's kit / layout variants / section order from the seed
 * and WRITES them into client-intake.json so they're locked, visible, and
 * hand-editable. It is idempotent: it never overwrites a value you've already set.
 * Re-run it any time — only empty slots get filled.
 *
 * To deliberately reshuffle a client: set "_brief": { "variantSeed": "anything-new" }
 * and delete the picks you want re-rolled, then run again.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolveSite } from "../src/lib/variants.mjs";
import { intakePath, intakeName } from "./intake-path.mjs";

const FILE = intakePath();

const site = JSON.parse(readFileSync(FILE, "utf8"));
const r = resolveSite(site);

site._brief = site._brief || {};
site._brief.layoutVariants = site._brief.layoutVariants || {};

let changed = [];

// design kit
if (!site._brief.designKit) {
  site._brief.designKit = r.kit;
  changed.push(`designKit -> ${r.kit}`);
}

// layout variants (fill only missing sections)
for (const [section, variant] of Object.entries(r.layoutVariants)) {
  if (!site._brief.layoutVariants[section]) {
    site._brief.layoutVariants[section] = variant;
    changed.push(`${section} -> ${variant}`);
  }
}

// surface (fill only if missing)
if (!site._brief.surface) {
  site._brief.surface = r.surface;
  changed.push(`surface -> ${r.surface}`);
}


// colour band (fill only if missing; "none" is a valid persisted value)
if (site._brief.bandSection === undefined) {
  site._brief.bandSection = r.bandSection || "none";
  changed.push(`bandSection -> ${r.bandSection || "none"}`);
}

// section order (lock once)
if (!site._brief.sectionsLocked) {
  site.sections = r.order;
  site._brief.sectionsLocked = true;
  changed.push(`order -> [${r.order.join(", ")}]`);
}

if (changed.length) {
  writeFileSync(FILE, JSON.stringify(site, null, 2) + "\n", "utf8");
  console.log(`✓ ${intakeName()} updated (seed: ${r.seed})`);
  changed.forEach((c) => console.log(`  • ${c}`));
} else {
  console.log("✓ Nothing to do — all picks already set.");
}
