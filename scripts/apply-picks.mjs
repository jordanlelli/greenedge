#!/usr/bin/env node
/**
 * apply-picks — copy a client's Kova Style Picker choices into the intake.
 *
 *   npm run picks -- anton.heavy.harbour.100
 *   npm run picks -- "<the whole pasted summary, it contains a Code: line>"
 *   npm run picks -- --show            what the intake's current code resolves to
 *   npm run picks -- <code> --dry-run  print the changes, write nothing
 *
 * WHAT IT WRITES in client-intake.json:
 *   _brief.stylePicks   the code. Type (fonts, weights, headline size) is
 *                       resolved from it on every build (src/lib/stylepicks.mjs).
 *   _brief.designKit    only when empty: the kit whose corners and shadows
 *                       suit the chosen base. An existing kit is left alone.
 *   style.*             the chosen colour set, as plain hex. brand/brandDark/
 *                       accent plus the page, text and line colours the client
 *                       saw in the picker. `custom` leaves style untouched:
 *                       the client's colours are in their notes.
 *
 * It edits those values in place and leaves the rest of the file byte for
 * byte as it was. Run `npm run preflight` afterwards for the contrast report.
 * Zero dependencies.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { parseStylePicks, resolveType, PICK_BASES, PICK_FACES } from "../src/lib/stylepicks.mjs";
import { PICK_PALETTES } from "./pick-palettes.mjs";
import { shade, relLuminance } from "../src/lib/palette.mjs";
import { intakePath, intakeName } from "./intake-path.mjs";

const INTAKE = intakePath();
const args = process.argv.slice(2);
const dry = args.includes("--dry-run");
const show = args.includes("--show");
const input = args.filter((a) => !a.startsWith("--")).join(" ").trim();

const raw = readFileSync(INTAKE, "utf8");
const intake = JSON.parse(raw);

const describe = (code) => {
  const p = parseStylePicks(code);
  const t = resolveType({ _brief: { stylePicks: code } });
  const f = PICK_FACES.find((x) => x.id === p.face);
  const pal = p.palette ? PICK_PALETTES[p.palette] : null;
  return [
    `  Headline font     ${f ? f.label : `${PICK_BASES[p.base].display.name} (the base's own heading font)`}`,
    `  Rest of the site  ${PICK_BASES[p.base].label}: ${t.display.name} headings, ${t.body.name} text`,
    `  Section headings  ${p.head === "hero" ? "match the headline" : "match the site"}`,
    `  Headline size     ${p.size}%`,
    `  Colours           ${pal ? (pal.custom ? "Something else (from the client's notes)" : `${pal.label} (${pal.sub})`) : "not in the code, style left as it is"}`,
  ].join("\n");
};

if (show) {
  const code = intake._brief?.stylePicks;
  if (!code) { console.log("No _brief.stylePicks in this intake. The kit's own fonts are in use."); process.exit(0); }
  console.log(`_brief.stylePicks = ${code}\n${describe(code)}`);
  process.exit(0);
}

if (!input) {
  console.error('Usage: npm run picks -- <code>      e.g.  npm run picks -- anton.heavy.harbour.100\n       npm run picks -- --show');
  process.exit(1);
}

/* Accept the bare code or the whole summary the client pasted back. */
const fromSummary = /code:\s*([a-z0-9.\-]+)/i.exec(input);
const code = (fromSummary ? fromSummary[1] : input).toLowerCase();
const picks = parseStylePicks(code);
if (!picks || picks.unknown.length) {
  console.error(`✗ "${code}" is not a Style Picker code${picks ? ` (unknown: ${picks.unknown.join(", ")})` : ""}.`);
  console.error(`  Fonts:    ${PICK_FACES.map((f) => f.id).join(" ")}`);
  console.error(`  Bases:    ${Object.keys(PICK_BASES).join(" ")}`);
  console.error(`  Colours:  ${Object.keys(PICK_PALETTES).join(" ")}`);
  process.exit(1);
}

/* ── the values to write ─────────────────────────────────────────────── */
const changes = []; // [path[], value]
changes.push([["_brief", "stylePicks"], code]);
const kitNow = intake._brief?.designKit;
if (!kitNow) changes.push([["_brief", "designKit"], PICK_BASES[picks.base].kit]);

const pal = picks.palette ? PICK_PALETTES[picks.palette] : null;
if (pal && !pal.custom) {
  /* brandDark paints the dark band and must be genuinely dark (luminance
     <= 0.183, see check-universal). The picker's heading colours already
     are; shade until it holds in case a future palette is lighter. */
  let dark = shade(pal.head, 0.3);
  for (let p = 0.4; relLuminance(dark) > 0.183 && p <= 0.9; p += 0.1) dark = shade(pal.head, p);
  const style = {
    brand: pal.head, brandDark: dark, accent: pal.cta,
    bg: pal.bg, surfaceAlt: pal.alt, ink: pal.text, muted: pal.muted, border: pal.line,
  };
  for (const [k, v] of Object.entries(style)) changes.push([["style", k], v]);
}

/* ── write in place, touching only those values ──────────────────────── */
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
function setValue(text, path, value) {
  const [objKey, key] = path;
  const objAt = new RegExp(`\\n( *)"${esc(objKey)}": \\{`).exec(text);
  if (!objAt) throw new Error(`"${objKey}" block not found in ${intakeName()}`);
  const indent = objAt[1];
  const start = objAt.index + objAt[0].length;
  const end = text.indexOf(`\n${indent}}`, start);
  const body = text.slice(start, end);
  const line = new RegExp(`(\\n${indent}  "${esc(key)}": )("(?:[^"\\\\]|\\\\.)*"|null)`);
  const json = JSON.stringify(value);
  let next;
  if (line.test(body)) next = body.replace(line, (_, pre) => pre + json);
  else {
    /* New key: after the block's last top-level entry. */
    const trimmed = body.replace(/\s+$/, "");
    next = `${trimmed},\n${indent}  "${key}": ${json}`;
  }
  return text.slice(0, start) + next + text.slice(end);
}

let out = raw;
const report = [];
for (const [path, value] of changes) {
  const before = path.reduce((o, k) => (o == null ? o : o[k]), intake);
  if (before === value) continue;
  out = setValue(out, path, value);
  report.push(`  ${path.join(".")}: ${before === undefined || before === "" ? "(empty)" : before} → ${value}`);
}
JSON.parse(out); // never write a file that no longer parses

console.log(`Style picks: ${code}\n${describe(code)}\n`);
if (!report.length) console.log("Nothing to change. The intake already matches.");
else console.log(`${dry ? "Would change" : "Changed"} in ${intakeName()}:\n${report.join("\n")}`);
if (kitNow && kitNow !== PICK_BASES[picks.base].kit) {
  console.log(`\nNote: _brief.designKit stays "${kitNow}". The suggested kit for ${PICK_BASES[picks.base].label} is "${PICK_BASES[picks.base].kit}" (corners and shadows only; fonts come from the picks).`);
}
if (pal?.custom) console.log("\nNote: the client chose their own colours. Set style.brand, style.brandDark and style.accent from their notes.");
if (!dry && report.length) { writeFileSync(INTAKE, out); console.log("\nNext: npm run preflight, then npm run build."); }
