# Universal Trade Template (v3)

A single Astro + Tailwind v4 static template that produces **visually distinct**
sites per client from one `client-intake.json`. A deterministic engine picks each
site's design kit, per-section layout variants, and section order — seeded by the
business name + domain — so every client is unique but stable across rebuilds.

## Stack
- **Astro 7** (static output, Vercel), Rolldown/Vite
- **Tailwind CSS v4** via `@tailwindcss/vite` (no `tailwind.config.js`, no PostCSS — tokens live in `src/styles/global.css`)
- **Astro Fonts API** (Fontsource) — fonts are loaded **per design kit** from `astro.config.mjs`
- **Vanilla JS** only
- `@astrojs/sitemap` + `llms.txt` + `robots.txt`

## Quick start (new client)
```
npm install
# 1. Copy the skeleton over the working intake and fill it in:
cp client-intake.skeleton.json client-intake.json
#    (paste a vertical preset from brief-presets.txt into _brief, then fill content)
# 2. (optional) lock in the random picks so they're visible/editable:
npm run variants
# 3. preview:
npm run dev
# 4. build:
npm run build
```
The template ships with a **neutral, buildable default** `client-intake.json` (a
generic trade business) so `npm run build` works out of the box. Replace it per client.

## How variant selection works
- `src/lib/variants.mjs` is a **pure, deterministic** resolver. It seeds a PRNG from `business.name` + `_meta.domain` (or `_brief.variantSeed`).
- Per axis it resolves: **explicit `_brief` value → data-prerequisite filter → seeded pick.**
- `npm run variants` writes the resolved kit/variants/order back into `client-intake.json` (idempotent — only fills empty slots).
- **Reshuffle a client:** set `_brief.variantSeed` to a new string, delete the picks you want re-rolled, re-run.

## Two axes of variation
1. **Design kit** (type + radius + shadow + rhythm): `ledger`, `workshop`, `coast`, `press`, `signal`. The kit also selects the two typefaces, which `astro.config.mjs` loads via the Fonts API (so the rendered type always matches the kit). Colour is *not* part of the kit — it comes from the client's `style` block.
2. **Per-section layout variant** + **section order** (hero/services pinned top, faq/contact pinned bottom, middle shuffled unless `_brief.sectionsLocked`).

See `VARIANTS.txt`, `DESIGN-LIBRARY.txt` (vertical presets + guardrails), and `CURSOR-CONTEXT.txt`.

## Content model (where things live)
- **Homepage hero service cards** → `services.items[]` in `client-intake.json` (title, description, includes[], optional price/href).
- **Rich per-service detail pages** (`/services/[slug]`) → records in `src/data/services.ts` (empty by default).
- **Recent-jobs strip / work gallery** → `src/data/recent-jobs.ts` / `src/data/gallery.ts` (empty by default; real photos only).
- **Testimonials** → `src/data/testimonials.ts` (empty; real, sourced reviews only).

## Legal (privacy, terms, consent)
Config-driven, wired into the footer:
- `legal.privacy.enabled` / `legal.terms.enabled` → render `/privacy` and `/terms` and their footer links. Fill `entityName` / `contactEmail` / `lastUpdated` (and optional `abn`, `governingState`) before launch. **These are plain-language boilerplate, not legal advice — have the client review them.**
- `legal.consent.enabled`: `"auto"` (default) shows the cookie banner **only** when analytics is cookie-based (`ga4`); `true` = always; `false` = never. Cookieless analytics (Plausible/Umami) never show a banner.
- With GA4, the banner runs under **Google Consent Mode v2**: storage defaults to *denied* until the visitor accepts.

## Colour: three inputs, whole palette out
`style` needs exactly **three** colours — `brand`, `brandDark` (powers the dark
colour band + luminance guard, keep it genuinely dark) and `accent`. Everything
else the site paints (page paper, body ink, muted text, borders, card, eyebrow
ink, on-dark text, the section band, and the text colour on every CTA) is
**derived** from those by `src/lib/palette.mjs` and contrast-checked at build
time. `highlight` is optional; so are the overrides listed in the skeleton.

Two things this buys you:
- **No inherited identity.** Before v3.2 the unset colours fell back to literals
  carried over from the first client the template was built for, so an intake
  that filled only the required keys silently rendered another business's cream
  and forest green. `npm run build` now refuses to start if any coloured literal
  exists in `src/`.
- **CTAs that are readable on light brands.** The quote button used to be a
  hardcoded white on `accent`. On amber, safety-orange and warm-clay trade
  palettes that lands at 2–3:1. The text colour is now chosen by measured
  contrast per client.

```
npm run check:universal   # resolved palette + contrast report for this client
npm run check:presets     # every trade preset x theme x surface, all must pass AA
```

## Key intake fields
- `sections`: which sections render and the base order.
- `features.hasPhotos`: **set `true` only when real photos exist** — gates photo-dependent variants and the hero photo.
- `contact.formEndpoint`: a POST endpoint to enable the contact form. **FormSubmit is the template default**; Web3Forms and Formspree also work. Without it the contact section shows a phone-first fallback.
- `analytics.provider`: `""` | `plausible` | `umami` | `ga4`.

## Pages
Default set: `/` (home, with the contact section at the bottom), `/services`,
`/gallery`, `/faq`, plus `/privacy` and `/terms`. `/about` and `/contact`
redirect to the homepage anchors. `/areas` is off unless you switch it on.

```jsonc
"pages": { "services": true, "gallery": true, "faq": true, "areas": false }
```
A page switched on still won't build without content — it redirects home instead
of shipping an empty 200. `npm run check:intake` prints the exact page set.

## Guards
`npm run build` runs three gates before Astro:
```
check-universal   no client colour in shared code; this palette clears AA
check-intake      every content key in the intake reaches the page
check-prices      no placeholder prices, photos, jobs or unsourced reviews
```
Run them alone with `npm run check:universal` / `check:intake` / `check:presets`.

## Scripts
`dev` · `build` (runs the placeholder guard first) · `preview` · `variants` (lock picks) · `verify:lock` (assert a crafted build is pinned) · `clean` / `regen` / `fresh` · `qa` (impeccable detect on `dist`).

## Deploy (Vercel)
Framework: Astro · Build: `npm run build` · Install: `npm install` · Output: `dist`.
Note: the Fonts API fetches the kit's typefaces from Fontsource **at build time** — the build machine needs network access the first time (then it's cached in `.astro`).

## Notes
- `favicon.png` is a neutral placeholder — replace with the client's real favicon; add an OG image at `public/images/og.jpg` (or set `seo.ogImage`).
- `client-intake.skeleton.json` is the annotated blank to copy per client.
