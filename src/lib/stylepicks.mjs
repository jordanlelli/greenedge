/**
 * stylepicks.mjs — the Kova Style Picker, as the template understands it.
 *
 * The picker is a page a client is sent before the build. They choose a
 * headline font, a base (the rest of the site's type), a colour set and a
 * headline size, and send back a code such as `anton.heavy.harbour.100`.
 * That code goes in `_brief.stylePicks`:
 *
 *   TYPE    resolved from the code on every build (resolveType below).
 *           astro.config.mjs loads the fonts, Layout.astro sets the CSS vars.
 *   COLOUR  written into the intake's `style` block ONCE by
 *           `npm run picks -- <code>` (scripts/apply-picks.mjs), so the
 *           palette stays ordinary, editable hex values and every existing
 *           palette check keeps working.
 *
 * No code means no change: resolveType returns null and the kit's own two
 * typefaces load exactly as before.
 *
 * THE TABLES BELOW MIRROR THE PICKER PAGE. A font, base or palette added to
 * the picker must be added here in the same change, with the same id, or a
 * client can send a code the template cannot build (check-intake fails on it).
 *
 * Code grammar, tokens joined by ".", any order:
 *   <face id>     headline font        optional (none = the base's own heading font)
 *   <base id>     heavy|warm|friendly  optional (default = the face's suggested base)
 *   <palette id>  colour set           optional (`custom` = colours come from the notes)
 *   <70-140>      headline size, %     optional (default 100)
 *   hh            section headings use the headline font
 * Plain JS so astro.config.mjs and the Node check scripts can both import it.
 */

const pkgFile = (pkg, file) => `${pkg}/files/${file}`;
const stat = (slug, weight, style = "normal") => ({
  weight,
  style,
  src: pkgFile(`@fontsource/${slug}`, `${slug}-latin-${weight}-${style}.woff2`),
});

/* Variable files: one file covers the whole weight range. Archivo's `wdth`
   file carries the width axis too (the picker sets headings at 88% width);
   Fraunces' `full` file carries SOFT and WONK. */
const ARCHIVO = {
  name: "Archivo",
  generic: "sans-serif",
  variants: [{ weight: "100 900", style: "normal", stretch: "62% 125%", src: pkgFile("@fontsource-variable/archivo", "archivo-latin-wdth-normal.woff2") }],
};
const FRAUNCES = {
  name: "Fraunces",
  generic: "serif",
  variants: [{ weight: "100 900", style: "normal", src: pkgFile("@fontsource-variable/fraunces", "fraunces-latin-full-normal.woff2") }],
};
const DM_SANS = { name: "DM Sans", generic: "sans-serif", variants: [400, 500, 600, 700].map((w) => stat("dm-sans", w)) };
const BRICOLAGE = { name: "Bricolage Grotesque", generic: "sans-serif", variants: [700, 800].map((w) => stat("bricolage-grotesque", w)) };

/* BASES — headings and body for everything outside the hero line.
   `kit` is the design kit whose radius/shadow suits the base; apply-picks
   writes it to _brief.designKit only when that is still empty. */
export const PICK_BASES = {
  heavy: {
    label: "Strong sans", kit: "workshop", display: ARCHIVO, body: ARCHIVO,
    heading: { weight: 850, stretch: "88%", tracking: "-0.03em" },
    hero: { weight: 850, stretch: "88%", tracking: "-0.03em", leading: 1, k: 1 },
  },
  warm: {
    label: "Classic serif", kit: "press", display: FRAUNCES, body: DM_SANS,
    heading: { weight: 600, stretch: "100%", tracking: "-0.02em" },
    hero: { weight: 700, stretch: "100%", tracking: "-0.02em", leading: 1.05, k: 1 },
  },
  friendly: {
    label: "Friendly sans", kit: "coast", display: BRICOLAGE, body: DM_SANS,
    heading: { weight: 800, stretch: "100%", tracking: "-0.025em" },
    hero: { weight: 800, stretch: "100%", tracking: "-0.025em", leading: 1.05, k: 1 },
  },
};

/* FACES — the headline fonts. `k` is the optical size factor from the picker
   (a condensed face is set larger so it fills the same space). */
const face = (id, label, font, base, head, o = {}) => ({
  id, label, font, base, head,
  weight: o.weight || 400, stretch: "100%", style: o.style || "normal", caseT: o.caseT || "none",
  tracking: o.tracking || "0em", leading: o.leading || 1, k: o.k || 1, vs: o.vs || "normal",
});
const one = (name, slug, generic, weight = 400, style = "normal") => ({ name, generic, variants: [stat(slug, weight, style)] });

export const PICK_FACES = [
  face("anton", "Anton", one("Anton", "anton", "sans-serif"), "heavy", "base", { caseT: "uppercase", tracking: "0.005em", leading: 1.04, k: 1.15 }),
  face("big-shoulders", "Big Shoulders", one("Big Shoulders", "big-shoulders", "sans-serif", 900), "heavy", "base", { weight: 900, caseT: "uppercase", tracking: "0.01em", leading: 0.98, k: 1.2 }),
  face("sofia", "Sofia Sans", one("Sofia Sans Extra Condensed", "sofia-sans-extra-condensed", "sans-serif", 900, "italic"), "heavy", "base", { weight: 900, style: "italic", caseT: "uppercase", leading: 0.98, k: 1.25 }),
  face("kanit", "Kanit", one("Kanit", "kanit", "sans-serif", 800, "italic"), "heavy", "base", { weight: 800, style: "italic", caseT: "uppercase", tracking: "-0.01em", leading: 1.02, k: 0.82 }),
  face("jaro", "Jaro", one("Jaro", "jaro", "sans-serif"), "friendly", "base", { leading: 1.02, k: 1.1 }),
  face("protest", "Protest Strike", one("Protest Strike", "protest-strike", "sans-serif"), "friendly", "base", { leading: 1.02, k: 0.98 }),
  face("fraunces", "Fraunces", FRAUNCES, "warm", "base", { weight: 900, tracking: "-0.025em", leading: 1.02, k: 0.94, vs: '"SOFT" 100, "WONK" 1' }),
  face("abril", "Abril Fatface", one("Abril Fatface", "abril-fatface", "serif"), "warm", "base", { tracking: "-0.01em", leading: 1.04, k: 0.95 }),
  face("young", "Young Serif", one("Young Serif", "young-serif", "serif"), "warm", "hero", { tracking: "-0.02em", leading: 1.06, k: 0.92 }),
  face("shrikhand", "Shrikhand", one("Shrikhand", "shrikhand", "serif"), "friendly", "base", { leading: 1.1, k: 0.9 }),
  face("saira", "Saira Stencil", one("Saira Stencil One", "saira-stencil-one", "sans-serif"), "heavy", "base", { caseT: "uppercase", tracking: "0.01em", leading: 1.04, k: 0.86 }),
];

/* PALETTE IDS — the picker's colour sets, by id only. The colours themselves
   live in scripts/pick-palettes.mjs: nothing under src/ may hold a colour
   literal (check-design), and only `npm run picks` ever reads them. */
export const PICK_PALETTE_IDS = ["harbour","site","workshop","paddock","hivis","mains","copper","heritage","clearwater","evergreen","custom"];

/** Parse a picker code. Returns { face, base, palette, size, head, unknown[] }
    (ids, or null where the code names nothing), or null for an empty code. */
export function parseStylePicks(code) {
  const tokens = String(code || "").trim().toLowerCase().split(".").filter(Boolean);
  if (!tokens.length) return null;
  const out = { face: null, base: null, palette: null, size: 100, head: null, unknown: [] };
  for (const tok of tokens) {
    const f = PICK_FACES.find((x) => x.id === tok);
    if (f) out.face = f.id;
    else if (PICK_BASES[tok]) out.base = tok;
    else if (PICK_PALETTE_IDS.includes(tok)) out.palette = tok;
    else if (tok === "hh") out.head = "hero";
    else if (/^\d{2,3}$/.test(tok)) out.size = Math.min(140, Math.max(70, Math.round(+tok / 5) * 5));
    else out.unknown.push(tok);
  }
  const f = PICK_FACES.find((x) => x.id === out.face);
  if (!out.base) out.base = f ? f.base : "heavy";
  if (!out.head) out.head = "base";
  if (!f) out.head = "base"; // "match the headline" means nothing without a headline font
  return out;
}

/**
 * resolveType(intake) → null when the intake has no picks, otherwise
 *   { code, picks, display, body, hero, vars }
 * display (headings, buttons) / body / hero are font faces ({ name, generic, variants[] }) for
 * astro.config.mjs; hero is null when the headline uses the display family.
 * vars are CSS custom properties for <html>, read by global.css.
 */
export function resolveType(intake = {}) {
  const code = intake._brief?.stylePicks;
  const picks = parseStylePicks(code);
  if (!picks) return null;

  const base = PICK_BASES[picks.base];
  const f = PICK_FACES.find((x) => x.id === picks.face) || null;
  const headingsUseFace = f && picks.head === "hero";

  /* --font-display stays the base's heading family even when section headings
     use the headline font: buttons and the header wordmark are set in it at
     700, and most headline fonts ship one weight. h1-h3 switch through
     --font-headings instead. */
  const display = base.display;
  const body = base.body;
  const hero = f && f.font.name !== display.name ? f.font : null;
  const h = f || base.hero;
  const heading = headingsUseFace
    ? { weight: f.weight, stretch: f.stretch, tracking: f.tracking, style: f.style, caseT: f.caseT, vs: f.vs }
    : { ...base.heading, style: "normal", caseT: "none", vs: "normal" };
  const scale = +((h.k || 1) * (picks.size / 100)).toFixed(3);

  const vars = {
    ...(headingsUseFace && hero ? { "--font-headings": "var(--font-hero)" } : {}),
    "--weight-heading": heading.weight,
    "--stretch-heading": heading.stretch,
    "--kit-tracking": heading.tracking,
    "--style-heading": heading.style,
    "--case-heading": heading.caseT,
    "--vs-heading": heading.vs,
    "--weight-display": h.weight,
    "--hero-stretch": h.stretch || "100%",
    "--hero-style": h.style || "normal",
    "--hero-case": h.caseT || "none",
    "--tracking-display": h.tracking,
    "--hero-leading": h.leading,
    "--hero-vs": h.vs || "normal",
    "--hero-scale": scale,
  };
  return { code: String(code), picks, display, body, hero, vars };
}

/** Every weight/style a resolved face must ship, for check-fonts. */
export const faceVariants = (f) => f.variants.map((v) => ({ weight: String(v.weight), style: v.style || "normal" }));
