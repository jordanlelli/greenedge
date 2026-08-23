/**
 * palette.mjs — the client colour system, as a pure function.
 *
 * WHY THIS FILE EXISTS
 * The palette used to be inlined in Layout.astro with a table of literal
 * fallbacks lifted from the first client the template was built for. Any intake
 * that filled only the four REQUIRED colours silently inherited that business's
 * cream page, forest-green body text and ochre accent ink. Pulling the maths out
 * here does three things: it makes every colour DERIVED rather than borrowed, it
 * makes the result testable without a browser (scripts/check-palette.mjs), and it
 * gives one place to answer "where did this colour come from?".
 *
 * THE CONTRACT
 *   Every returned colour is either (a) stated by the client in intake.style,
 *   or (b) derived from style.brand / style.accent. There is no third case.
 *   The only literals below are ACHROMATIC anchors — zero chroma, so they
 *   cannot carry any business's identity.
 *
 * Pure JS (not .ts) so Node scripts and Astro can share it, same as variants.mjs.
 */

/* ── achromatic anchors ─────────────────────────────────────────────────── */
export const NEUTRAL = {
  paperLight: "#ffffff",
  paperDark: "#101215",
  inkLight: "#16181b",
  inkDark: "#f4f5f6",
};

/* ── colour maths ───────────────────────────────────────────────────────── */
export const hexToRgb = (hex) => {
  const h = String(hex || "").replace("#", "").trim();
  if (h.length === 3) return [0, 1, 2].map((i) => parseInt(h[i] + h[i], 16));
  if (h.length === 6) return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  return null;
};

export const rgbToHex = (rgb) => {
  const c = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${c(rgb[0])}${c(rgb[1])}${c(rgb[2])}`;
};

/** p of b mixed into a. Mixing, not HSL lightness — saturated brands keep their hue. */
export const mix = (a, b, p) => {
  const ra = hexToRgb(a);
  const rb = hexToRgb(b);
  return ra && rb ? rgbToHex(ra.map((c, i) => c + (rb[i] - c) * p)) : undefined;
};

export const tint = (hex, p) => {
  const rgb = hexToRgb(hex);
  return rgb ? rgbToHex(rgb.map((c) => c + (255 - c) * p)) : undefined;
};

export const shade = (hex, p) => {
  const rgb = hexToRgb(hex);
  return rgb ? rgbToHex(rgb.map((c) => c * (1 - p))) : undefined;
};

/** WCAG 2.x relative luminance. */
export const relLuminance = (hex) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const [r, g, b] = rgb.map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/**
 * Composite an #rrggbbaa colour over an opaque background.
 * Contrast maths is only meaningful on opaque colours: measuring a translucent
 * ink directly reads its alpha channel as part of the hex and reports nonsense
 * (the band's muted text scored 1.43:1 when it is actually fine).
 */
export const flatten = (hex, bg) => {
  const h = String(hex || "").replace("#", "");
  if (h.length !== 8) return hex;
  const fg = hexToRgb(`#${h.slice(0, 6)}`);
  const a = parseInt(h.slice(6, 8), 16) / 255;
  const back = hexToRgb(bg);
  if (!fg || !back) return `#${h.slice(0, 6)}`;
  return rgbToHex(fg.map((c, i) => c * a + back[i] * (1 - a)));
};

/** WCAG contrast ratio, 1–21. */
export const contrast = (a, b) => {
  const la = relLuminance(a);
  const lb = relLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
};

/** How far a colour is from grey. Used by the guard to catch smuggled brand hex. */
export const chroma = (hex) => {
  const rgb = hexToRgb(hex);
  return rgb ? Math.max(...rgb) - Math.min(...rgb) : 0;
};

/**
 * Text colour for a filled surface, chosen by MEASUREMENT not by habit.
 * Trade brands are often light (amber sparkies, safety-orange concreters,
 * warm-clay painters); a hardcoded white lands at 2–3:1 on those and fails AA
 * on the single most important element on the page — the quote button.
 */
export const onColourFor = (bg) => {
  if (!bg) return undefined;
  const light = tint(bg, 0.97) || NEUTRAL.paperLight;
  const hueDark = shade(bg, 0.82) || NEUTRAL.inkLight;
  const dark = contrast(bg, hueDark) >= contrast(bg, NEUTRAL.inkLight) ? hueDark : NEUTRAL.inkLight;
  return contrast(bg, light) >= contrast(bg, dark) ? light : dark;
};

/**
 * resolvePalette(site, surface) -> { "--c-*": value }
 *
 * @param {object} site     the cleaned intake (needs .style and .theme)
 * @param {string} surface  engine-resolved surface: "flat" | "tint" | "warm"
 */
/**
 * Fit a derived colour to a contrast target by walking a mix ratio.
 * Returns the FIRST (i.e. softest / most subtle) step that clears `target`, so
 * derived colours stay quiet rather than being slammed to max contrast.
 */
function fitAgainst(from, toward, bgs, target, { start = 0, end = 1, step = 0.02 } = {}) {
  /* A derived text colour has to survive EVERY surface the template can put it
     on — page background and the alternating band both. Fitting against one
     and hoping was how "heading on alt surface" landed at 4.1:1. */
  const list = (Array.isArray(bgs) ? bgs : [bgs]).filter(Boolean);
  const worst = (c) => Math.min(...list.map((bg) => contrast(c, bg)));
  const dir = end >= start ? 1 : -1;
  for (let p = start; dir > 0 ? p <= end : p >= end; p += step * dir) {
    const c = mix(from, toward, p);
    if (c && worst(c) >= target) return c;
  }
  return mix(from, toward, end) || from;
}

/**
 * resolvePalette(site, surface) -> { "--c-*": value }
 *
 * Order matters here. The page background is settled FIRST, because every text
 * colour below is fitted against it — that is what makes the same intake work
 * on a white page, a brand-washed page and a dark theme without per-client
 * fiddling.
 *
 * @param {object} site     the cleaned intake (needs .style and .theme)
 * @param {string} surface  engine-resolved surface: "flat" | "tint" | "warm"
 */
export function resolvePalette(site = {}, surface = "flat") {
  const s = site.style || {};
  const dark = site.theme === "dark";

  /* Brand is the seed for everything. With no brand we stay strictly greyscale
     rather than inventing a hue for the client. */
  const brand = s.brand || "";
  const accent = s.accent || brand;
  const seed = brand || (dark ? NEUTRAL.inkDark : NEUTRAL.inkLight);

  const inkBase = dark ? NEUTRAL.inkDark : NEUTRAL.inkLight;
  const paperBase = dark ? NEUTRAL.paperDark : NEUTRAL.paperLight;

  /* ── 1. PAGE BACKGROUND ─────────────────────────────────────────────────
     Surface treatment is applied ONLY when the client hasn't set style.bg, so
     client intent always wins.
       flat  neutral paper
       tint  washed in this client's own brand
       warm  paper warmed toward this client's accent (was a hardcoded
             green-grey, which made every "warm" site look landscaped)
     In dark themes a "wash" is a mix TOWARD the brand from dark paper, not a
     light tint — otherwise the page inverts and nothing is readable. */
  const wash = (p) => mix(paperBase, seed, p);
  const surfaceBg = {
    flat: undefined,
    tint: wash(dark ? 0.1 : 0.06),
    warm: accent ? mix(paperBase, accent, dark ? 0.08 : 0.05) : undefined,
  };
  const pageBg = s.bg ?? (surfaceBg[surface] || paperBase);

  /* Alternating section surface, settled here rather than at the end because
     every text colour below must be legible on BOTH it and the page. It must
     also differ from --c-bg, or `bg-tint` sections are invisible — which is why
     the tint background option looked broken. */
  const altWash = wash(dark ? 0.18 : 0.05);
  const altBg =
    s.surfaceAlt ??
    (altWash && altWash.toLowerCase() !== String(pageBg).toLowerCase()
      ? altWash
      : mix(paperBase, seed, dark ? 0.07 : 0) || paperBase);
  const textBgs = [pageBg, altBg];

  /* ── 2. TEXT COLOURS, FITTED TO THAT BACKGROUND ─────────────────────────
     `--c-brand` is used as a TEXT colour in 83 places and as a section
     background in one, so the text role wins: on a dark theme it resolves to a
     light step of the client's brand rather than the raw (dark) brand, which is
     unreadable on dark paper. The band gets its own token below. */
  const derivedInk = mix(inkBase, seed, dark ? 0.06 : 0.1) || inkBase;
  const brandText = !brand
    ? derivedInk
    : dark
      ? fitAgainst(brand, NEUTRAL.inkDark, textBgs, 4.5, { start: 0.2, end: 1 })
      : brand;
  const secondaryInk = !brand
    ? undefined
    : dark
      ? fitAgainst(brandText, pageBg, textBgs, 4.5, { start: 0.4, end: 0, step: 0.02 })
      : shade(brand, 0.22);

  const derivedBorder = mix(paperBase, seed, dark ? 0.16 : 0.14) || paperBase;
  const derivedCard = mix(paperBase, seed, dark ? 0.07 : 0) || paperBase;

  const v = {
    "--c-brand": brandText,
    "--c-brand-dark": s.brandDark || (brand ? shade(brand, 0.35) : NEUTRAL.paperDark),
    /* Secondary brand ink: eyebrows, hero heading tail, location line.
       `forestSecondaryInk` is the pre-v3.2 key name, still honoured. */
    "--c-brand-secondary-ink": s.brandSecondaryInk || s.forestSecondaryInk || secondaryInk,
    "--c-accent": accent || undefined,
    "--c-accent-ink": s.accentInk || (accent ? shade(accent, 0.34) : undefined),
    "--c-accent-ondark": s.accentOndark || (accent ? tint(accent, 0.52) : undefined),
    "--c-highlight": s.highlight || accent || undefined,
    "--c-bg": pageBg,
    "--c-card": s.card ?? derivedCard,
    "--c-ink": s.ink ?? derivedInk,
    "--c-border": s.border ?? derivedBorder,
    /* Text on the dark brand band and in the footer. Was a hardcoded
       green-tinted white; now a near-white pulled toward this client's brand. */
    "--c-ondark": s.onDark || (brand ? tint(brand, 0.95) : "#f7f7f8"),
  };

  /* On-dark hairline + soft ink, precomputed with alpha. These used to live in
     WhyUs.astro as literal `rgb(240 253 244 / 0.12)` — a green-tinted white that
     no hex-based check would ever catch. Derived here, they follow the client. */
  const withAlpha = (hex, a) => {
    const rgb = hexToRgb(hex);
    if (!rgb) return undefined;
    const alpha = Math.round(a * 255).toString(16).padStart(2, "0");
    return `${rgbToHex(rgb)}${alpha}`;
  };
  v["--c-ondark-soft"] = withAlpha(v["--c-ondark"], 0.78);
  v["--c-ondark-rule"] = withAlpha(v["--c-ondark"], 0.12);

  /* Section band background. Kept separate from --c-brand precisely because the
     two roles diverge on a dark theme: the band must stay dark enough for
     on-dark text while the heading colour goes light. */
  v["--c-band"] = s.band || (dark ? mix(paperBase, seed, 0.3) : brand || NEUTRAL.inkLight);

  /* ── 3. RAMP ────────────────────────────────────────────────────────── */
  if (brand) {
    v["--c-brand-50"] = tint(brand, 0.94);
    v["--c-brand-100"] = tint(brand, 0.85);
    v["--c-brand-200"] = tint(brand, 0.7);
    v["--c-brand-700"] = v["--c-brand-secondary-ink"] || shade(brand, 0.25);
    v["--c-brand-900"] = shade(brand, 0.5);
  }
  if (accent) {
    v["--c-accent-50"] = tint(accent, 0.9);
    v["--c-accent-100"] = tint(accent, 0.82);
  }

  /* ── 4. TEXT ON FILLED SURFACES (measured, see onColourFor) ───────────── */
  if (accent) v["--c-on-accent"] = onColourFor(accent);
  if (v["--c-highlight"]) v["--c-on-highlight"] = onColourFor(v["--c-highlight"]);
  if (v["--c-band"]) {
    v["--c-on-band"] = onColourFor(v["--c-band"]);
    /* Card / muted / hairline INSIDE the band. Precomputed with alpha rather
       than written as literals in the band CSS, which is where the old
       `rgba(255,255,255,0.06)` set lived — those forced the band to be white-on-
       something regardless of what the client's band colour actually was. */
    v["--c-on-band-card"] = withAlpha(v["--c-on-band"], 0.08);
    /* Muted ink in the band is body copy, so it is FITTED rather than fixed at a
       nice-looking alpha. A flat 0.76 reads fine on a deep navy and fails on a
       bright blue (the electrician preset lands at 3.79:1). Walk the alpha up
       until the composited result clears AA, so it stays as soft as it can. */
    const fitAlpha = (ink, bg, target = 4.6) => {
      for (let a = 0.6; a <= 1.001; a += 0.02) {
        const c = withAlpha(ink, Math.min(a, 1));
        if (c && contrast(flatten(c, bg), bg) >= target) return c;
      }
      return ink;
    };
    v["--c-on-band-soft"] = fitAlpha(v["--c-on-band"], v["--c-band"]);
    v["--c-on-band-rule"] = withAlpha(v["--c-on-band"], 0.2);
  }
  /* CTA text inside the band. The band's accent steps up to --c-accent-ondark,
     so the label on it must be MEASURED against that tint, not assumed to be the
     band colour — on mid-tone brands (the roofer preset is the clear case) the
     band colour lands at 4.37:1 on its own accent tint. */
  if (v["--c-accent-ondark"]) v["--c-on-accent-ondark"] = onColourFor(v["--c-accent-ondark"]);

  /* ── 5. ALTERNATING SECTION SURFACE (settled in step 1) ──────────────── */
  v["--c-surface-alt"] = altBg;

  /* ── 6. MUTED TEXT, FITTED LAST ───────────────────────────────────────
     Muted carries subheads and service copy, so it is body text and must clear
     AA — on whichever background steps 1 and 5 actually produced. Walk from the
     softest step down until it passes. */
  v["--c-muted"] =
    s.muted ??
    fitAgainst(derivedInk, pageBg, textBgs, 4.6, { start: 0.5, end: 0, step: 0.02 });

  return v;
}

/** Serialise to an inline style attribute, dropping anything undefined. */
export function paletteToStyleAttr(vars) {
  return Object.entries(vars)
    .filter(([, val]) => val)
    .map(([k, val]) => `${k}:${val}`)
    .join(";");
}
