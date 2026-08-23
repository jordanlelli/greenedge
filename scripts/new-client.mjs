#!/usr/bin/env node
/**
 * new-client.mjs — start a client intake from the CURRENT skeleton.
 *
 * WHY THIS EXISTS
 * The first Mitchell White intake was copied from an earlier client's file, so
 * it inherited `products`, `stockists`, `features.showServiceAreas`,
 * `googleMapsEmbed` and `hero.graphic` — five keys from a business that sold
 * chilli oil. Every one of them showed up as a warning on a painter's build.
 * Copy-and-edit propagates dead keys forward forever; this does not.
 *
 *   node scripts/new-client.mjs "Mitchell White Painting" --trade "Painting & Decorating"
 *   node scripts/new-client.mjs "Reynella Tiling" --out ../reynella/client-intake.json
 *
 * It writes the skeleton with the name and trade filled in and nothing else, so
 * every remaining REQUIRED value is one you consciously supply.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const name = argv.find((a) => !a.startsWith("--"));
const flag = (f) => {
  const i = argv.indexOf(f);
  return i > -1 ? argv[i + 1] : "";
};

if (!name) {
  console.error('Usage: node scripts/new-client.mjs "Business Name" [--trade "Painting"] [--out path]');
  process.exit(1);
}

const out = resolve(root, flag("--out") || "client-intake.json");
if (existsSync(out) && !argv.includes("--force")) {
  console.error(`✗ ${out} already exists. Pass --force to overwrite.`);
  process.exit(1);
}

const d = JSON.parse(readFileSync(join(root, "client-intake.skeleton.json"), "utf8"));
d.business = d.business || {};
d.business.name = name;
if (flag("--trade")) d.business.trade = flag("--trade");
if (flag("--domain")) (d._meta = d._meta || {}).domain = flag("--domain");

writeFileSync(out, JSON.stringify(d, null, 2) + "\n");

console.log(`\n✓ Wrote ${out} from the current skeleton.\n`);
console.log("  Next:");
console.log("    1. node scripts/check-intake.mjs      # tells you exactly what is missing");
console.log("    2. fill the REQUIRED values it names");
console.log("    3. npm run build\n");
console.log("  Do NOT copy another client's intake to start a new one — that is how");
console.log("  dead keys from a previous business propagate forward.\n");
