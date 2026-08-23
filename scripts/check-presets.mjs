/**
 * check-presets.mjs — runs EVERY trade preset in brief-presets.txt through the
 * palette engine on EVERY surface treatment and asserts the result is readable.
 *
 * This is the actual definition of "universal": not that the code compiles for
 * any trade, but that a sparky's amber, a concreter's safety orange and a
 * landscaper's forest green all produce a legible page with no per-client
 * intervention. Run it after touching src/lib/palette.mjs, and add a row here
 * whenever you add a trade to brief-presets.txt.
 *
 *   node scripts/check-presets.mjs
 *   node scripts/check-presets.mjs --verbose
 */
import { resolvePalette, contrast, flatten } from "../src/lib/palette.mjs";

const VERBOSE = process.argv.includes("--verbose");

/* Keep in sync with brief-presets.txt. */
const PRESETS = [
  { trade: "painter",     brand: "#1E4C8A", brandDark: "#0E2A50", accent: "#E07A2F", highlight: "#2FA36B" },
  { trade: "tiler",       brand: "#3A3F45", brandDark: "#1B1E22", accent: "#C08A4E", highlight: "#4C9A8E" },
  { trade: "plumber",     brand: "#0B5CAD", brandDark: "#06294E", accent: "#E4572E", highlight: "#2FA36B" },
  { trade: "electrician", brand: "#1466C7", brandDark: "#0A2B54", accent: "#F2B01E", highlight: "#2FA36B" },
  { trade: "landscaper",  brand: "#1F3D2B", brandDark: "#0F2417", accent: "#C2410C", highlight: "#65A30D" },
  { trade: "carpenter",   brand: "#6B4A2E", brandDark: "#2E1F13", accent: "#B07A3C", highlight: "#7A8B3C" },
  { trade: "roofer",      brand: "#3E4A54", brandDark: "#1E262C", accent: "#C4432B", highlight: "#4C9A8E" },
  { trade: "concreter",   brand: "#4A4E52", brandDark: "#23262A", accent: "#E08A1E", highlight: "#6C8EA8" },
];

const SURFACES = ["flat", "tint", "warm"];
const THEMES = ["light", "dark"];

const CHECKS = [
  ["body on page",     (p) => [p["--c-ink"], p["--c-bg"]], 4.5],
  ["muted on page",    (p) => [p["--c-muted"], p["--c-bg"]], 4.5],
  ["heading on page",  (p) => [p["--c-brand"], p["--c-bg"]], 4.5],
  ["heading on alt",   (p) => [p["--c-brand"], p["--c-surface-alt"]], 4.5],
  ["CTA on accent",    (p) => [p["--c-on-accent"], p["--c-accent"]], 4.5],
  ["eyebrow on page",  (p) => [p["--c-brand-secondary-ink"], p["--c-bg"]], 4.5],
  ["footer on dark",   (p) => [p["--c-ondark"], p["--c-brand-dark"]], 4.5],
  ["band text",        (p) => [p["--c-on-band"], p["--c-band"]], 4.5],
  ["band muted",       (p) => [p["--c-on-band-soft"], p["--c-band"]], 4.5],
  ["band CTA label",   (p) => [p["--c-on-accent-ondark"], p["--c-accent-ondark"]], 4.5],
];

let failed = 0;
let ran = 0;

for (const preset of PRESETS) {
  const { trade, ...style } = preset;
  for (const theme of THEMES) {
    for (const surface of SURFACES) {
      const p = resolvePalette({ style, theme }, surface);
      const problems = [];
      for (const [label, get, min] of CHECKS) {
        const [fg, bg] = get(p);
        if (!fg || !bg) continue;
        ran += 1;
        const ratio = contrast(flatten(fg, bg), bg);
        if (ratio < min) problems.push(`${label} ${ratio.toFixed(2)}:1 (${fg} on ${bg})`);
      }
      const tag = `${trade}/${theme}/${surface}`;
      if (problems.length) {
        failed += 1;
        console.error(`  ✗ ${tag.padEnd(28)} ${problems.join("; ")}`);
      } else if (VERBOSE) {
        console.log(`  ✓ ${tag.padEnd(28)} bg ${p["--c-bg"]}  on-accent ${p["--c-on-accent"]}`);
      }
    }
  }
}

const combos = PRESETS.length * THEMES.length * SURFACES.length;
if (failed) {
  console.error(`\n✗ check-presets: ${failed}/${combos} preset/theme/surface combinations fail AA.\n`);
  process.exit(1);
}
console.log(`✓ check-presets: ${combos} combinations, ${ran} contrast pairs, all clear AA.`);
process.exit(0);
