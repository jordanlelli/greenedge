/**
 * scripts/verify-lock.mjs — OPT-IN guard for LOCKED builds (demos, T2/T3).
 * Asserts the engine axes in _brief are pinned so a rebuild can't reseed a
 * crafted look. DO NOT wire into prebuild (seeded T1 builds leave axes empty).
 *   npm run verify:lock && npm run build
 */
import { readFileSync, existsSync } from "node:fs";
import { KITS, SURFACES, CATALOGUE } from "../src/lib/variants.mjs";
import { intakePath, intakeName } from "./intake-path.mjs";

const FILE = intakePath();
if (!existsSync(FILE)) { console.error(`✗ ${intakeName()} not found`); process.exit(1); }

const site = JSON.parse(readFileSync(FILE, "utf8"));
const brief = site._brief || {};
const lv = brief.layoutVariants || {};
const sections = Array.isArray(site.sections) ? site.sections : [];
const ALWAYS = ["header", "footer"];
const wanted = Object.keys(lv).filter((k) => ALWAYS.includes(k) || sections.includes(k));

const fail = [];
const warn = [];
const need = (cond, msg) => { if (!cond) fail.push(msg); };
const isSet = (v) => typeof v === "string" && v.trim() !== "";

need(isSet(brief.designKit), "_brief.designKit is empty (kit not locked)");
need(isSet(brief.surface),   "_brief.surface is empty");
need(brief.bandSection !== undefined, "_brief.bandSection is undefined (set a section key or \"none\")");
need(brief.sectionsLocked === true, "_brief.sectionsLocked is not true (run `npm run variants` to lock section order)");
for (const k of wanted) need(isSet(lv[k]), `_brief.layoutVariants.${k} is empty`);

/* MEMBERSHIP: a locked value must exist in the engine catalogue. Six invented
   variant names passed the old check and silently resolved to nothing. */
need(!isSet(brief.designKit) || KITS.includes(brief.designKit),
  `_brief.designKit "${brief.designKit}" is not one of: ${KITS.join(" | ")}`);
need(!isSet(brief.surface) || SURFACES.includes(brief.surface),
  `_brief.surface "${brief.surface}" is not one of: ${SURFACES.join(" | ")}`);
for (const [k, v] of Object.entries(lv)) {
  /* _-prefixed keys are stripped by config.ts and never reach the engine. The
     shipped skeleton carries a _comment inside layoutVariants, so treating one
     as a section name failed the lock on every client built from it. */
  if (k.startsWith("_")) continue;
  if (!isSet(v)) continue;
  const list = CATALOGUE[k];
  if (!list) { fail.push(`_brief.layoutVariants.${k} is not a catalogue section`); continue; }
  need(list.includes(v), `_brief.layoutVariants.${k} "${v}" is not one of: ${list.join(" | ")}`);
}
if (!isSet(brief.variantSeed)) warn.push("_brief.variantSeed is empty — look is pinned only while domain + business.name are unchanged. Set an explicit seed for a true lock.");

const name = (site.business && site.business.name) || "(unnamed)";
if (fail.length) {
  console.error(`✗ ${name}: intake is NOT fully locked — a rebuild could reseed.\n`);
  fail.forEach((m) => console.error("  • " + m));
  console.error("\n  Fix: run `npm run variants`, or hand-set the axes in _brief, then re-run verify:lock.");
  if (warn.length) { console.error(""); warn.forEach((m) => console.error("  ! " + m)); }
  process.exit(1);
}
console.log(`✓ ${name}: intake is locked and reproducible.`);
if (warn.length) warn.forEach((m) => console.log("  ! " + m));
process.exit(0);
