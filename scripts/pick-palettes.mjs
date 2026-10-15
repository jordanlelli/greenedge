/**
 * pick-palettes.mjs — the Kova Style Picker's colour sets.
 *
 * head = headings and the dark band, cta = buttons. `npm run picks`
 * (apply-picks.mjs) maps these onto the intake's `style` keys. They mirror
 * the picker page: a palette added there is added here with the same id, and
 * its id is added to PICK_PALETTE_IDS in src/lib/stylepicks.mjs.
 */
export const PICK_PALETTES = {
  harbour:    { label: "Harbour",    sub: "teal and orange",        bg: "#ffffff", alt: "#f2f6f7", head: "#1b4756", text: "#1f2b31", muted: "#54656e", line: "#e3e8ea", cta: "#d2621c" },
  site:       { label: "Site",       sub: "navy and yellow",        bg: "#ffffff", alt: "#f3f5f8", head: "#14233b", text: "#1e2733", muted: "#566273", line: "#e2e6ec", cta: "#f2b705" },
  workshop:   { label: "Workshop",   sub: "charcoal and red",       bg: "#ffffff", alt: "#f4f4f3", head: "#1f2326", text: "#24282b", muted: "#5d6368", line: "#e4e5e5", cta: "#c62f1d" },
  paddock:    { label: "Paddock",    sub: "forest green and ochre", bg: "#fcfbf7", alt: "#f1f0e8", head: "#1f3d2b", text: "#25302a", muted: "#5a665e", line: "#e2e2d6", cta: "#c98a1b" },
  hivis:      { label: "Hi-vis",     sub: "black and orange",       bg: "#ffffff", alt: "#f3f3f2", head: "#141617", text: "#232627", muted: "#5c6062", line: "#e3e3e2", cta: "#ff6a13" },
  mains:      { label: "Mains",      sub: "royal blue",             bg: "#ffffff", alt: "#f1f5fb", head: "#12305e", text: "#1c2a40", muted: "#566580", line: "#dfe6f0", cta: "#1d5fd1" },
  copper:     { label: "Copper",     sub: "slate and copper",       bg: "#ffffff", alt: "#f4f5f6", head: "#2c3640", text: "#262d33", muted: "#5b656e", line: "#e2e5e8", cta: "#a8562a" },
  heritage:   { label: "Heritage",   sub: "burgundy and brass",     bg: "#fbf8f3", alt: "#f2ece2", head: "#4a1f24", text: "#2e2424", muted: "#6a5b59", line: "#e6dccf", cta: "#b9852f" },
  clearwater: { label: "Clearwater", sub: "deep teal and aqua",     bg: "#ffffff", alt: "#eef7f8", head: "#0f3a4a", text: "#1c2f36", muted: "#50676f", line: "#dbe8eb", cta: "#12b3c7" },
  evergreen:  { label: "Evergreen",  sub: "deep green",             bg: "#ffffff", alt: "#f1f6f2", head: "#17301f", text: "#1f2b23", muted: "#55665a", line: "#dfe7e1", cta: "#1c7f45" },
  custom:     { label: "Something else", custom: true },
};
