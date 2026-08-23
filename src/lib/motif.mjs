/**
 * motif.mjs — the "no photos" answer.
 *
 * Most trades hand you a phone number, a suburb list and nothing else. Mitchell
 * White's brief says it outright: no photos, no logo, no domain. Until now that
 * produced a hero with a 36rem column of text and half the viewport empty,
 * because the only hero we shipped was built around a photo slot.
 *
 * The reference that unlocked this is the painting landing page whose hero art
 * is a flat-colour composition rather than a job photo. That approach doesn't
 * need photography, doesn't need a stock library, and doesn't lie about work the
 * client hasn't shown you. It just needs a considered arrangement of the client's
 * own colours.
 *
 * So: a geometric motif, generated as SVG, painted ENTIRELY from the palette
 * tokens Layout.astro injects. No literals — scripts/check-universal.mjs would
 * reject them, and correctly, because a motif with a hardcoded hue is one
 * client's identity smuggled into shared code.
 *
 * Trade selection uses `business.trade`, which until now was an intake key with
 * no reader.
 */

/* Which motif suits which trade. Unknown trades get `strata`, which reads as
   considered without claiming any specific craft. */
const TRADE_MOTIF = {
  painter: "swatch",
  painting: "swatch",
  decorator: "swatch",
  plasterer: "swatch",
  tiler: "grid",
  tiling: "grid",
  concreter: "grid",
  paver: "grid",
  bricklayer: "grid",
  landscaper: "contour",
  landscaping: "contour",
  gardener: "contour",
  arborist: "contour",
  electrician: "circuit",
  sparky: "circuit",
  plumber: "circuit",
  roofer: "strata",
  carpenter: "strata",
  builder: "strata",
};

export function motifFor(site = {}) {
  const trade = String(site.business?.trade || "").toLowerCase().trim();
  if (site.hero?.motif) return String(site.hero.motif);
  for (const [key, motif] of Object.entries(TRADE_MOTIF)) {
    if (trade.includes(key)) return motif;
  }
  return "strata";
}

/* Palette tokens only. Ordered light -> dark so a motif reads as depth. */
const FILLS = [
  "var(--c-brand-100)",
  "var(--c-accent-100)",
  "var(--c-brand-200)",
  "var(--c-accent-50)",
  "var(--c-brand-50)",
];

/**
 * Deterministic per client: the same business always gets the same arrangement,
 * so a rebuild never silently reshuffles the artwork. Seeded from the name
 * rather than Math.random for exactly that reason.
 */
function seedFrom(str) {
  let h = 2166136261;
  for (let i = 0; i < String(str).length; i += 1) {
    h ^= String(str).charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * heroMotifSvg(site) -> SVG markup string for the typographic hero.
 * viewBox is 0 0 600 640, designed to sit in a tall right-hand column and to
 * crop gracefully — nothing meaningful lives in the outer 40px.
 */
export function heroMotifSvg(site = {}) {
  const kind = motifFor(site);
  const rnd = seedFrom(site.business?.name || "client");
  const p = [];

  if (kind === "swatch") {
    /* A fanned set of paint chips. The one motif that actually says "painter"
       without a photograph. */
    for (let i = 0; i < 5; i += 1) {
      const angle = -22 + i * 11 + rnd() * 3;
      const x = 120 + i * 62;
      const y = 150 + Math.abs(i - 2) * 26;
      p.push(
        `<g transform="translate(${x} ${y}) rotate(${angle.toFixed(1)})">` +
          `<rect x="-52" y="-104" width="104" height="208" rx="10" fill="${FILLS[i % FILLS.length]}"/>` +
          `<rect x="-52" y="46" width="104" height="58" rx="10" fill="var(--c-brand)" opacity="0.10"/>` +
          `</g>`
      );
    }
    p.push(
      `<rect x="96" y="392" width="376" height="150" rx="18" fill="var(--c-accent)" opacity="0.14"/>`
    );
  } else if (kind === "grid") {
    /* Offset tile / paver field. */
    for (let row = 0; row < 6; row += 1) {
      for (let col = 0; col < 5; col += 1) {
        const off = row % 2 ? 42 : 0;
        p.push(
          `<rect x="${70 + col * 90 + off}" y="${86 + row * 78}" width="80" height="68" rx="6" ` +
            `fill="${FILLS[(row + col) % FILLS.length]}" opacity="${(0.5 + rnd() * 0.5).toFixed(2)}"/>`
        );
      }
    }
  } else if (kind === "contour") {
    /* Topographic lines — the landscape/garden read. */
    for (let i = 0; i < 9; i += 1) {
      const y = 90 + i * 54;
      const amp = 26 + rnd() * 22;
      p.push(
        `<path d="M40 ${y} C 180 ${y - amp}, 300 ${y + amp}, 560 ${y - amp / 2}" ` +
          `fill="none" stroke="var(--c-brand-200)" stroke-width="${(2 + (i % 3)).toFixed(0)}" ` +
          `opacity="${(0.35 + i * 0.06).toFixed(2)}"/>`
      );
    }
    p.push(`<circle cx="430" cy="228" r="92" fill="var(--c-accent)" opacity="0.16"/>`);
  } else if (kind === "circuit") {
    /* Orthogonal runs and junctions — services that route through a building. */
    for (let i = 0; i < 7; i += 1) {
      const x = 80 + i * 72;
      const y = 90 + Math.floor(rnd() * 5) * 90;
      p.push(
        `<path d="M${x} 70 L${x} ${y} L${x + 72} ${y} L${x + 72} 560" fill="none" ` +
          `stroke="var(--c-brand-200)" stroke-width="3" opacity="0.55"/>`,
        `<circle cx="${x}" cy="${y}" r="9" fill="var(--c-accent)" opacity="0.8"/>`
      );
    }
  } else {
    /* strata — stacked bands with one accent seam. Neutral, works for anyone. */
    let y = 70;
    for (let i = 0; i < 7; i += 1) {
      const h = 46 + rnd() * 44;
      p.push(
        `<rect x="60" y="${y.toFixed(0)}" width="480" height="${h.toFixed(0)}" rx="12" ` +
          `fill="${FILLS[i % FILLS.length]}"/>`
      );
      y += h + 10;
    }
    p.push(`<rect x="60" y="248" width="480" height="14" rx="7" fill="var(--c-accent)" opacity="0.85"/>`);
  }

  return (
    `<svg viewBox="0 0 600 640" fill="none" xmlns="http://www.w3.org/2000/svg" ` +
    `class="h-full w-full" aria-hidden="true" focusable="false">${p.join("")}</svg>`
  );
}
