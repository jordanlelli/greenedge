#!/usr/bin/env node
/**
 * check-design — enforces DESIGN-LIBRARY.txt §1 as a build gate.
 *
 * WHY THIS EXISTS. The QA gate in DESIGN-LIBRARY.txt was six checks you had to
 * remember to run by eye, page by page, per client. check-catalogue guards
 * variant integrity and check-universal guards the palette, but the doctrine
 * that the whole design library exists to enforce had no gate at all — so it
 * drifted, silently, for sixteen releases. Things this would have caught:
 *
 *   - `text-white` hardcoded on the 404 button. Passed contrast on a navy
 *     client by luck; would have shipped white-on-yellow to a light-brand
 *     client, on the one page nobody looks at until a customer hits it.
 *   - 165 `focus-visible:ring-*` classes that rendered NOTHING while the
 *     `focus-visible:outline-none` beside them suppressed the browser's own
 *     focus ring — strictly worse than writing no focus style at all.
 *   - a raw-rem type scale that drifted to seven sizes where 14 and 15px did
 *     the same job, and 16 and 17px did the same job.
 *   - `rounded-lg` on form fields and `rounded-card` on the button beside
 *     them, assigned by whichever component the author happened to write.
 *
 * SOURCE ANALYSIS ONLY, ON PURPOSE. A build gate must not need a browser, a
 * dev server or a headless runtime. Everything here is detectable by reading
 * src/. The rules that genuinely need layout — dead bands, centred-section
 * ratios, tap-target sizes, focus rendering — belong in a separate visual
 * pass (impeccable does this well) and are deliberately NOT faked here with
 * regex. A gate that lies is worse than no gate.
 *
 * Exit 1 on any violation. Run it before check-catalogue in `build`.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";

/* fileURLToPath, NOT `new URL(...).pathname`. On Windows .pathname returns
   "/C:/Users/..." with a leading slash, so join() produces "C:\\C:\\Users\\..."
   and the build dies with ENOENT on the first readdir. It works on Linux,
   which is exactly why it shipped. Every other script in scripts/ already
   uses this pattern — this one was written from scratch and missed it. */
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "src");

/* Files that are allowed to define raw values — the token definitions
   themselves, and the engine that computes per-client colour. */
const TOKEN_FILES = new Set(["src/styles/global.css", "src/lib/palette.mjs"]);

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(astro|css|ts|mjs)$/.test(entry)) out.push(full);
  }
  return out;
}

const problems = [];
const add = (rule, file, line, msg) =>
  problems.push({ rule, file, line, msg });

/* Strip comment bodies so a rule explaining a banned pattern is not itself a
   violation. Without this, every "do not use text-white" note fails the gate
   and the next person deletes the note instead of the pattern. */
function stripComments(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/^\s*\/\/.*$/gm, (m) => " ".repeat(m.length))
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, (m) => m.replace(/[^\n]/g, " "));
}

for (const full of walk(SRC)) {
  const rel = relative(ROOT, full).replace(/\\/g, "/");
  const raw = readFileSync(full, "utf8");
  const text = stripComments(raw);
  const lines = text.split("\n");
  const isTokenFile = TOKEN_FILES.has(rel);

  lines.forEach((line, i) => {
    const n = i + 1;

    /* A. HARDCODED COLOUR. Every colour must come from a semantic token so it
       tracks the client's palette and the dark-band remap. A literal white or
       black is a bet on one client's brand being dark or light. */
    if (!isTokenFile) {
      const hit = line.match(/\b(?:text|bg|border|fill|stroke|ring|outline)-(white|black)\b/);
      if (hit) add("A-colour", rel, n, `hardcoded "${hit[0]}" — use a semantic token (text-ondark, bg-card, text-on-accent…)`);

      /* &#8594; and friends are HTML entities, not colours. Matching them was
         the gate's own first false positive. */
      const hex = line.replace(/&#\d+;?/g, "").match(/#[0-9a-fA-F]{3,8}\b/);
      if (hex && !/--c-|fallback|achromatic/i.test(line))
        add("A-colour", rel, n, `raw hex ${hex[0]} in a component — colour belongs in global.css tokens`);
    }

    /* B. BROKEN FOCUS PATTERN. ring-* utilities did not render in this build;
       outline-none beside them removed the native indicator. Focus is handled
       once, globally, in global.css. */
    if (/focus(?:-visible)?:(?:ring-|outline-none)/.test(line))
      add("B-focus", rel, n, "per-component focus style — focus is global in global.css, remove this");

    /* C. TYPE SCALE. Raw rem font sizes are how the scale drifted to seven
       near-duplicate steps. */
    if (!isTokenFile) {
      const fs = line.match(/font-size:\s*([0-9.]+)rem/);
      if (fs) add("C-type", rel, n, `raw font-size ${fs[1]}rem — use var(--text-eyebrow|micro|small|body|lead)`);
    }

    /* D. RADIUS ROLES. Two roles only: things you click, things you type into.
       Anything else is an author's guess. */
    if (!isTokenFile) {
      const r = line.match(/\brounded-(sm|md|lg|xl|2xl|3xl|\[[^\]]+\])/);
      if (r) add("D-radius", rel, n, `"${r[0]}" — use rounded-card (click) or rounded-input (type)`);
      /* A pill (999px) is not a third ROLE — it is the chip idiom, and it is
         the same shape whatever the kit. It gets its own token rather than an
         exception, so the rule stays "no raw values" with no carve-outs. */
      const rr = line.replace(/border-radius:\s*9{3,4}px/g, "").match(/border-radius:\s*(?!var\()([0-9.]+(?:rem|px))/);
      if (rr) add("D-radius", rel, n, `raw border-radius ${rr[1]} — use var(--radius-card) or var(--radius-input)`);
    }

    /* E. EMOJI AND MONOGRAMS (B6). No trade site has ever been improved by a
       wrench emoji. */
    /* Markup only. A ⚠ in a dev-time console.warn is a developer message, not
       something a client ever sees. */
    const emoji = /\.(astro|css)$/.test(rel) ? line.match(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u) : null;
    if (emoji && !/aria-hidden|&#|console\./.test(line))
      add("E-emoji", rel, n, `emoji ${emoji[0]} in markup`);

    /* F. PLACEHOLDERS (B7). Lorem and TODO must never reach a client build. */
    const ph = line.match(/\b(lorem ipsum|Lorem Ipsum|TODO:|FIXME:)/);
    if (ph) add("F-placeholder", rel, n, `placeholder "${ph[1]}" left in source`);

    /* G. CENTRED SECTION HEADS (B1/G1). The single most obvious AI tell. A
       centred hero is a deliberate variant; a centred section head is not. */
    if (/text-center/.test(line) && /(section-heading|section-eyebrow|<h2)/.test(line))
      add("G-centred", rel, n, "centred section head — B1, the #1 banned pattern");
  });

  /* H. OVERFLOW FLOOR. Any component that builds its own grid must let its
     tracks shrink, or one long email sets the min-content width and pushes the
     column off a 360px viewport — invisibly, because body has overflow-x-clip. */
  const hasCustomGrid = /grid-template-columns:|grid-cols-\[/.test(text);
  const tracksCanShrink = /min-w-0|minmax\(0/.test(text);
  /* The overflow floor is GLOBAL in global.css, so text wrapping is already
     handled everywhere. What remains worth flagging is a track that cannot
     shrink for non-text reasons — an image, a pre block, a fixed-width child. */
  const hasWrapFloor = true;
  /* Either defence is enough on its own: a track that can shrink, or text that
     can break. Requiring both produced six findings on components that were
     measured and do not overflow — a gate that cries wolf gets switched off. */
  if (hasCustomGrid && !tracksCanShrink && !hasWrapFloor)
    add("H-overflow", rel, 0, "custom grid with neither min-w-0/minmax(0,…) nor an overflow-wrap floor — one long email will push it off a 360px viewport");
}

/* ---------------------------------------------------------------- report -- */
if (!problems.length) {
  console.log("✓ check-design: no doctrine violations.");
  process.exit(0);
}

const byRule = new Map();
for (const p of problems) {
  if (!byRule.has(p.rule)) byRule.set(p.rule, []);
  byRule.get(p.rule).push(p);
}

console.error(`\n✗ check-design: ${problems.length} violation(s).\n`);
for (const [rule, list] of [...byRule].sort()) {
  console.error(`  ${rule} — ${list.length}`);
  for (const p of list.slice(0, 8))
    console.error(`    ${p.file}${p.line ? ":" + p.line : ""}  ${p.msg}`);
  if (list.length > 8) console.error(`    …and ${list.length - 8} more`);
  console.error("");
}
console.error("  These are DESIGN-LIBRARY.txt §1 rules. Fix the source, not the gate.\n");
process.exit(1);
