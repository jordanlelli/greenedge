/**
 * check-universal.mjs — stops the template from quietly inheriting one client's
 * identity, and stops a client's own palette from shipping unreadable.
 *
 * BACKGROUND
 * v3.1 was stripped out of a landscaping build, but the colour fallbacks came
 * with it: cream paper, forest-green body ink, ochre accent ink, a green-tinted
 * on-dark white. Because they were FALLBACKS they never showed up in review —
 * they only fired when an intake left those keys empty, which is exactly what
 * the skeleton told you to do. Two painters built from that template both got
 * a landscaper's greens in the hero.
 *
 * WHAT IT CHECKS
 *   A. STRUCTURE — no coloured (non-achromatic) hex literal anywhere in src/.
 *      Achromatic is fine: greys carry no identity. Anything with chroma is
 *      somebody's brand, and it does not belong in shared code.
 *   B. FALLBACKS — no `var(--x, <coloured hex>)`. That is the exact shape of
 *      the bug: invisible until an intake omits the key.
 *   C. CONTRAST — for THIS client's resolved palette, the combinations the
 *      template actually paints must clear WCAG AA.
 *
 * USAGE
 *   node scripts/check-universal.mjs            # guard, exits 1 on failure
 *   node scripts/check-universal.mjs --report   # also print the resolved palette
 *   node scripts/check-universal.mjs --intake path/to/client-intake.json
 */
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { resolvePalette, contrast, chroma, hexToRgb, flatten } from "../src/lib/palette.mjs";
import { resolveSite } from "../src/lib/variants.mjs";
import { intakePath } from "./intake-path.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const argv = process.argv.slice(2);
const REPORT = argv.includes("--report");
const intakeArg = argv.indexOf("--intake");
const INTAKE = intakeArg > -1 ? argv[intakeArg + 1] : intakePath();

/* A hex is "achromatic enough" to be shared code if its channels are close
   together. 12/255 tolerance allows the slightly-cool greys designers use
   without allowing anything that reads as a hue. */
const CHROMA_TOLERANCE = 12;
/* #rrggbbaa / #rgba carry a hue too — drop the alpha before measuring, or an
   8-digit literal walks straight past the check. */
const stripAlpha = (hex) => {
  const h = hex.replace("#", "");
  if (h.length === 8) return `#${h.slice(0, 6)}`;
  if (h.length === 4) return `#${h.slice(0, 3)}`;
  return hex;
};
/* Negative lookbehind: HTML numeric entities (&#8594;) are not colours, and
   flagging them trains you to ignore the guard. */
const HEX = /(?<!&)#[0-9a-fA-F]{3,8}\b/g;
const VAR_FALLBACK = /var\(\s*--[a-z0-9-]+\s*,\s*(#[0-9a-fA-F]{3,8})\b/gi;
/* Hex is not the only way to smuggle a colour in. The on-dark hairline in
   WhyUs.astro was `rgb(240 253 244 / 0.12)` — a green-tinted white that every
   hex-based scan walked straight past. */
const RGB_FN = /\brgba?\(\s*([0-9.]+)[\s,]+([0-9.]+)[\s,]+([0-9.]+)/gi;

const failures = [];
const notes = [];

/* ── A + B: no client colour in shared code ─────────────────────────────── */
const walk = (dir, out = []) => {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(astro|css|ts|tsx|mjs|js)$/.test(name)) out.push(full);
  }
  return out;
};

const files = walk(join(root, "src"));
for (const file of files) {
  const rel = relative(root, file);
  const src = readFileSync(file, "utf8");

  /* Comments are exempt: the docs deliberately name the colours that leaked, in
     order to explain what went wrong. Track block-comment state properly rather
     than sniffing the first character: a continuation line inside a multi-line
     comment need not start with an asterisk, and that false positive is worse than the
     bug, because it trains you to ignore the guard. */
  let inBlockComment = false;
  src.split("\n").forEach((line, i) => {
    const trimmed = line.trim();
    const opens = (line.match(/\/\*/g) || []).length;
    const closes = (line.match(/\*\//g) || []).length;
    /* `universal-ok: <reason>` on a line is the one sanctioned exception: a
       colour that is deliberately the same on every client (the red
       "Sample content" tag). It must state its reason. */
    if (/universal-ok:s*S/.test(line)) return;
    const startedInComment = inBlockComment;
    if (opens > closes) inBlockComment = true;
    else if (closes > opens) inBlockComment = false;
    if (startedInComment || opens > 0) return;
    if (trimmed.startsWith("*") || trimmed.startsWith("//")) return;

    for (const raw of line.match(HEX) || []) {
      const hex = stripAlpha(raw);
      if (hexToRgb(hex) && chroma(hex) > CHROMA_TOLERANCE) {
        failures.push(
          `A. ${rel}:${i + 1} — coloured literal ${raw} (chroma ${chroma(hex)}). ` +
            `Shared code takes colour from the intake, never from a hex.`
        );
      }
    }

    for (const m of line.matchAll(RGB_FN)) {
      const ch = [+m[1], +m[2], +m[3]];
      if (ch.every((c) => c <= 255) && Math.max(...ch) - Math.min(...ch) > CHROMA_TOLERANCE) {
        failures.push(
          `A. ${rel}:${i + 1} — coloured rgb() literal ${m[0]}). ` +
            `Same rule as hex: shared code takes colour from the intake.`
        );
      }
    }

    for (const m of line.matchAll(VAR_FALLBACK)) {
      const hex = stripAlpha(m[1]);
      if (hexToRgb(hex) && chroma(hex) > CHROMA_TOLERANCE) {
        failures.push(
          `B. ${rel}:${i + 1} — coloured var fallback ${m[1]}. ` +
            `Fallbacks must be achromatic: they fire only when an intake omits a key, ` +
            `which is precisely when a previous client's colour leaks in.`
        );
      }
    }
  });
}

/* ── C: this client's palette must be readable ──────────────────────────── */
if (!existsSync(INTAKE)) {
  failures.push(`C. intake not found: ${INTAKE}`);
} else {
  const intake = JSON.parse(readFileSync(INTAKE, "utf8"));
  const style = intake.style || {};
  for (const key of ["brand", "brandDark", "accent"]) {
    const val = style[key];
    if (!val || String(val).includes("REQUIRED")) {
      failures.push(`C. style.${key} is not set — the whole palette derives from it.`);
    }
  }

  const surface = resolveSite(intake).surface || "flat";
  const p = resolvePalette(intake, surface);

  /* The pairs the template actually paints. Large-text pairs use the AA large
     threshold (3.0); body pairs use 4.5. */
  const pairs = [
    ["body text on page", p["--c-ink"], p["--c-bg"], 4.5],
    ["muted text on page", p["--c-muted"], p["--c-bg"], 4.5],
    ["body text on card", p["--c-ink"], p["--c-card"], 4.5],
    ["headings on page", p["--c-brand"], p["--c-bg"], 4.5],
    ["headings on alt surface", p["--c-brand"], p["--c-surface-alt"], 4.5],
    ["CTA label on accent", p["--c-on-accent"], p["--c-accent"], 4.5],
    ["eyebrow on page", p["--c-brand-secondary-ink"], p["--c-bg"], 4.5],
    ["footer text on brand-dark", p["--c-ondark"], p["--c-brand-dark"], 4.5],
    ["accent-on-dark on brand-dark", p["--c-accent-ondark"], p["--c-brand-dark"], 3.0],
    ["text in the colour band", p["--c-on-band"], p["--c-band"], 4.5],
    ["muted text in the band", p["--c-on-band-soft"], p["--c-band"], 4.5],
    ["CTA label in the band", p["--c-on-accent-ondark"], p["--c-accent-ondark"], 4.5],
  ];

  const rows = [];
  for (const [label, rawFg, bg, min] of pairs) {
    if (!rawFg || !bg) continue;
    /* Translucent inks (the band's muted text, hairlines) must be composited
       over their background before the ratio means anything. */
    const fg = flatten(rawFg, bg);
    const ratio = contrast(fg, bg);
    const pass = ratio >= min;
    rows.push({ label, fg, bg, ratio, min, pass });
    if (!pass) {
      failures.push(
        `C. ${label}: ${fg} on ${bg} = ${ratio.toFixed(2)}:1, needs ${min}:1. ` +
          `Adjust style.${label.includes("accent") ? "accent" : "brand"} in the intake.`
      );
    }
  }

  /* ── D: colours a KIT RULE uses as text ──────────────────────────────────
     The pairs above are the ones the components paint. Kit rules in global.css
     can also set `color`, and they outrank the utility on the markup, so they
     need the same check. `.kit-coast .section-eyebrow` and the press one used
     --color-highlight, a fill taken straight from style.highlight: 2.1:1 for a
     pale highlight, on every page, while this script printed "clears AA".
     Each token is tested on the page and the alt surface, with this client's
     palette and again with a pale probe highlight, so a rule that goes back to
     an unfitted token fails on every build and not only for the unlucky
     client. A failure here is a template bug, never an intake problem. */
  const css = readFileSync(join(root, "src", "styles", "global.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  const kitText = new Map();
  for (const rule of css.matchAll(/\.kit-([a-z]+)\b[^{}]*\{([^{}]*)\}/g)) {
    for (const decl of rule[2].matchAll(/(?:^|;)\s*color\s*:\s*var\(\s*--color-([a-z0-9-]+)/g)) {
      if (!kitText.has(decl[1])) kitText.set(decl[1], new Set());
      kitText.get(decl[1]).add(rule[1]);
    }
  }
  /* The same fill reaches text through the `text-highlight` utility. On an
     <svg> it colours an icon, which is fine; on anything else it is text and
     must be `text-highlight-ink`. (FAQ, tiers and gallery eyebrows did this
     on every kit.) */
  for (const file of files) {
    if (!file.endsWith(".astro")) continue;
    readFileSync(file, "utf8").split("\n").forEach((line, i) => {
      if (/\btext-highlight\b(?!-)/.test(line) && !/<svg/.test(line)) {
        failures.push(
          `D. ${relative(root, file)}:${i + 1} — \`text-highlight\` on text. style.highlight is a fill and is not ` +
            `fitted for text; use \`text-highlight-ink\`.`
        );
      }
    });
  }
  kitText.set("highlight-ink", (kitText.get("highlight-ink") || new Set()).add("text-highlight-ink utility"));

  const probe = resolvePalette({ ...intake, style: { ...style, highlight: "#cfe8f3" } }, surface);
  for (const [token, kits] of kitText) {
    for (const [which, pal] of [["this palette", p], ["a pale highlight", probe]]) {
      const fgRaw = pal[`--c-${token}`];
      if (!fgRaw) {
        failures.push(`D. kit rule (${[...kits].join(", ")}) colours text with --color-${token}, but the palette has no --c-${token} to check.`);
        break;
      }
      for (const [where, bg] of [["page", pal["--c-bg"]], ["alt surface", pal["--c-surface-alt"]]]) {
        if (!bg) continue;
        const fg = flatten(fgRaw, bg);
        const ratio = contrast(fg, bg);
        const pass = ratio >= 4.5;
        if (which === "this palette") rows.push({ label: `kit text --color-${token} on ${where}`, fg, bg, ratio, min: 4.5, pass });
        if (!pass) {
          failures.push(
            `D. kit rule (${[...kits].join(", ")}) colours text with --color-${token}: ${fg} on ${bg} (${where}, ${which}) = ` +
              `${ratio.toFixed(2)}:1, needs 4.5:1. Kit text colours must use a token fitted for text in palette.mjs (an -ink token), not a fill.`
          );
        }
      }
    }
  }

  if (REPORT) {
    notes.push(`\n  Intake:${relative(root, INTAKE)}   surface: ${surface}\n`);
    notes.push("  RESOLVED PALETTE");
    for (const [k, v] of Object.entries(p)) {
      if (v) notes.push(`    ${k.padEnd(26)} ${v}`);
    }
    notes.push("\n  CONTRAST");
    for (const r of rows) {
      notes.push(
        `    ${r.pass ? "ok  " : "FAIL"} ${r.label.padEnd(30)} ${r.ratio.toFixed(2)}:1 ` +
          `(min ${r.min})  ${r.fg} on ${r.bg}`
      );
    }
  }
}

/* ── output ─────────────────────────────────────────────────────────────── */
if (notes.length) console.log(notes.join("\n"));

if (failures.length) {
  console.error(`\n✗ check-universal: ${failures.length} problem(s).\n`);
  failures.forEach((f) => console.error("  • " + f));
  console.error(
    "\n  A/B/D failures are TEMPLATE bugs — fix the code.\n" +
      "  C failures are CLIENT palette problems — fix client-intake.json style{}.\n"
  );
  process.exit(1);
}

console.log("✓ check-universal: no client colour in shared code; palette clears AA.");
process.exit(0);
