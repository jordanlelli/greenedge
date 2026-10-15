#!/usr/bin/env node
/**
 * check-fonts — runs AFTER `astro build`. Fails if the built site would render
 * in the wrong typeface.
 *
 * WHY THIS EXISTS. Up to v3.19 fonts were fetched from the Fontsource API at
 * build time. When that fetch failed (blocked network, API outage) Astro only
 * WARNED, fell back to system-ui and the build "passed" — the site shipped in
 * Arial-ish fallbacks and nothing said so. v3.20 vendors the fonts from npm,
 * which removes the network dependency; this gate makes sure the output
 * actually contains what the kit asked for, whatever changes upstream.
 *
 * CHECKS, for this client's kit (resolved exactly as the build resolves it):
 *   - every weight in KIT_FONT_FACES[kit].display and .body has an
 *     @font-face in the built homepage,
 *   - every @font-face src points at a file that exists in dist/,
 *   - --font-display and --font-body point at those families.
 *
 * Zero dependencies. Exit 0 = fonts shipped, exit 1 = they did not.
 */
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveSite, KIT_FONT_FACES } from "../src/lib/variants.mjs";
import { intakePath } from "./intake-path.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(ROOT, "dist");
const intake = JSON.parse(readFileSync(intakePath(), "utf8"));
const { kit, type } = resolveSite(intake);
/* v3.24: with _brief.stylePicks the fonts come from the Style Picker
   (src/lib/stylepicks.mjs), not the kit: heading, body and, when the headline
   font differs, a third --font-hero. Same checks, different expected list. */
const asKitFace = (f) => ({ name: f.name, weights: f.variants.map((v) => String(v.weight)) });
const faces = type
  ? { display: asKitFace(type.display), body: asKitFace(type.body), ...(type.hero ? { hero: asKitFace(type.hero) } : {}) }
  : KIT_FONT_FACES[kit] || KIT_FONT_FACES.coast;
const source = type ? `style picks "${type.code}"` : `kit "${kit}"`;

const errors = [];
const home = join(DIST, "index.html");
if (!existsSync(home)) {
  console.error("✗ check-fonts: dist/index.html not found — run after `astro build`.");
  process.exit(1);
}

/* @font-face rules can land inline in the HTML or in an emitted stylesheet. */
let css = readFileSync(home, "utf8");
const astroDir = join(DIST, "_astro");
if (existsSync(astroDir)) {
  for (const f of readdirSync(astroDir)) if (f.endsWith(".css")) css += readFileSync(join(astroDir, f), "utf8");
}

const rules = [...css.matchAll(/@font-face\s*\{([^}]*)\}/g)].map((m) => {
  const body = m[1];
  const family = (/font-family:\s*["']?([^;"']+)["']?/.exec(body) || [])[1] || "";
  const weight = (/font-weight:\s*([^;]+)/.exec(body) || [])[1]?.trim() || "";
  const srcs = [...body.matchAll(/url\(["']?([^"')]+)["']?\)/g)].map((u) => u[1]);
  return { family: family.trim(), base: family.trim().replace(/-[0-9a-f]{8,}$/, ""), weight, srcs };
});

const vars = {
  display: (/--font-display:\s*([^;,]+)/.exec(css) || [])[1]?.trim().replace(/["']/g, ""),
  body: (/--font-body:\s*([^;,]+)/.exec(css) || [])[1]?.trim().replace(/["']/g, ""),
  hero: (/--font-hero:\s*([^;,]+)/.exec(css) || [])[1]?.trim().replace(/["']/g, ""),
};

for (const role of Object.keys(faces)) {
  const face = faces[role];
  const own = rules.filter((r) => r.base === face.name);
  if (!own.length) {
    errors.push(`${role} font "${face.name}" (${source}) has NO @font-face in the build — the site would render in system-ui.`);
    continue;
  }
  for (const w of face.weights) {
    if (!own.some((r) => r.weight === String(w) || r.weight.split(/s+/).includes(String(w)))) {
      errors.push(`${face.name} ${w} is expected for ${source} but missing from the build — text set at ${w} will be faked or snapped.`);
    }
  }
  for (const r of own) for (const src of r.srcs) {
    if (src.startsWith("/") && !existsSync(join(DIST, src))) errors.push(`${face.name} ${r.weight}: ${src} is referenced but not in dist/.`);
  }
  if (!vars[role] || vars[role].replace(/-[0-9a-f]{8,}$/, "") !== face.name) {
    errors.push(`--font-${role} resolves to "${vars[role] || "(unset)"}", expected the ${face.name} family.`);
  }
}

if (errors.length) {
  console.error(`\n✗ check-fonts: ${errors.length} problem(s) for ${source}.\n`);
  errors.forEach((e) => console.error("  • " + e));
  console.error("\n  Fonts are vendored from @fontsource/* (astro.config.mjs). Run npm install, then rebuild.\n");
  process.exit(1);
}
const n = (f) => `${f.name} ${f.weights.join("/")}`;
console.log(`✓ check-fonts: ${source} shipped ${Object.values(faces).map(n).join(" + ")}.`);
