# Architecture — how the template turns one JSON file into a site

Read this before changing shared code. The binding rules are in
`CURSOR-CONTEXT.txt`. This file is the map: where things live, how data flows,
and which file to change for which job.

## 1. The pipeline

```
client-intake.json ──► src/config.ts ──► components / pages ──► astro build ──► dist/ (static HTML)
        │                  │
        │                  ├─ site    = intake with every _-prefixed key stripped (safe to render)
        │                  ├─ layout  = resolveSite(raw intake)   ← src/lib/variants.mjs
        │                  └─ helpers: pageSeo, builtPages, headerNavLinks, legalLinks, …
        │
        ├─ _brief (never rendered) ─► engine overrides: designKit, layoutVariants, surface, variantSeed, sectionsLocked
        └─ style.{brand,brandDark,accent} ─► src/lib/palette.mjs ─► every colour token (Layout injects --c-*)

src/data/*.ts (gallery, services, recent-jobs, testimonials) ─► data only, typed by src/lib/types.ts, astro:assets images
```

`client-intake.json` is the default. The `INTAKE` env var swaps in another file
for the whole pipeline (scripts/intake-path.mjs; `@intake` alias in
astro.config.mjs). The template builds itself that way: `npm run demo` /
`npm run qa:demo` read `client-intake.demo.json`, an invented business.

Everything is decided at build time. Output is plain static HTML + CSS + a few
small vanilla scripts. Crawlers get the full content without running JS (the
reveal animation adds its hidden state from JS only, so no-JS = visible).

## 2. Build gates (npm run build)

In order, each a hard fail:

| gate | file | stops |
|---|---|---|
| check-design | scripts/check-design.mjs | DESIGN-LIBRARY §1 breaches in src (focus rings, type scale, radius classes — only `rounded-card`/token radii, hardcoded colour) |
| check-catalogue | scripts/check-catalogue.mjs | a variant in the engine CATALOGUE that is undocumented, un-rendered or missing from VARIANTS.txt |
| check-universal | scripts/check-universal.mjs | any colour literal in shared code; the client palette failing AA |
| check-intake | scripts/check-intake.mjs | intake content the template would silently drop; missing images; public images >400KB not in src/assets |
| check-service-prices | scripts/check-service-prices.mjs | placeholder prices, photos, jobs or unsourced reviews on a production build |
| astro build | — | type/template errors |
| check-fonts | scripts/check-fonts.mjs | the kit's font files/weights not present in dist/ |

After build: `npm run qa` (scripts/qa.mjs) serves dist/ and runs impeccable's
URL engine in headless Chrome over every page. Exit 0 = clean. It refuses to
run (exit 1) when dist/ is missing or older than src/, the intake,
package-lock.json or astro.config.mjs, so it cannot pass a build that failed.

**Fix the source, never the gate.** A gate that is wrong gets a template
release with a TEMPLATE-CHANGES entry explaining why.

## 3. The variant engine (src/lib/variants.mjs)

- `resolveSite(intake)` → `{ kit, kitFonts, layoutVariants, order, surface, bandSection }`.
- Seed: `cyrb53(business.name + _meta.domain)` or `_brief.variantSeed` → `mulberry32` PRNG.
- Per axis: explicit `_brief.layoutVariants.<axis>` → prerequisite filter
  (`PREREQS`: e.g. `split-media` hero needs a real hero image, `list-detail`
  services needs detail on every item) → seeded pick.
- `CATALOGUE` axes: hero (typographic, split-media, fullbleed, docket, index,
  stat-lede) · services (grid-icons, ledger, split-scroll, feature-lead,
  list-detail) · whyUs (ruled-rows, icon-grid, contrast-pair, process-rail) ·
  header (standard, minimal, centered) · story (ruled-cards, credentials-panel,
  portrait-lede) · faqs (accordion, open-columns, grouped) · areas (chips, zoned,
  directory) · servicesPage
  (stacked, grouped, featured, index — **MANUAL**, never seeded).
- `KITS`: ledger, workshop, coast, press, signal. Kit = typefaces
  (`KIT_FONTS` / `KIT_FONT_FACES`), radius, shadow, rhythm, eyebrow treatment.
- `SURFACES`: flat, tint, warm (page background when `style.bg` is unset).
- Section order: `hero`, `services` pinned top; `faq(s)`, `contact` pinned
  bottom; middle shuffled unless `_brief.sectionsLocked`.
- One band section (`BAND_ELIGIBLE`) inverts via `.band-dark`, only if the
  brandDark luminance passes the gate.
- **Adding a draw:** append it at the end of `resolveSite` so existing clients'
  RNG sequence (and therefore their look) does not shift. `LATE_DRAW` exists for
  exactly this reason.
- `npm run variants` persists picks into the intake (idempotent);
  `npm run verify:lock` asserts a crafted build is fully pinned.

## 4. File map — what to change for which job

### src/lib (plain JS, shared with the Node check scripts)
| file | owns |
|---|---|
| variants.mjs | the engine (above) |
| palette.mjs | 3 input colours → full palette, contrast-picked on-colours, `decream` (pulls warm near-whites off impeccable's cream band), `paletteToStyleAttr` |
| content.mjs | normalises every content block: testimonials (sourcing rules), gallery, trust marks, hero image, form fields, opening hours, business JSON-LD (`resolveBusinessSchema`, `SCHEMA_TYPES`, `toE164AU`), `/services` data (`resolveServicesPage`), story credentials |
| pages.mjs | which secondary pages ship (`resolvePages`, `pageIsBuilt`), nav meta |
| areas.mjs | service-area pages + the doorway guard (min intro words, min anchors, near-duplicate detection) |
| legal.mjs / privacy.mjs / terms.mjs | whether legal pages exist, and their text assembled from the intake as clauses |
| credit.mjs | footer build credit (Kova Digital), anchor text varied per client deterministically; `agency.credit.enabled:false` removes it |
| motif.mjs | the typographic hero's SVG motif (no-photo clients) — open impeccable finding, see BACKLOG `hero-motif` |
| types.ts / data.ts | record types for `src/data/*.ts` (`Service`, `GalleryEntry`, `RecentJob`, `Testimonial`) and the lookups over them (`getServiceBySlug`, `formatServicePrice`, `getRecentGalleryEntries`, `getGalleryByService`, `getRecentJobs`). Shared, so they sync; the data files are client-owned and hold records only |
| images.ts | `localImage(path)`: intake path `/images/x.webp` → `src/assets/images/x.webp` metadata if it exists, else null (public/ fallback); `widthsFor` never upscales |

### src/components
- Switch components pick a variant and delegate: `Header` → `header/*`,
  `Hero` → `hero/*` (+ `HeroCopy` shared), `Services` → `services/*`,
  `WhyUs` → `whyus/*`; `Story`, `FAQ`, `Areas` contain their variants inline.
- `/services` page: `servicespage/ServicesPage{Stacked,Grouped,Featured,Index}`
  + shared `Head`, `QuoteBand`, `Includes`, `More`. Every service's long
  description stays in the HTML in every layout (compact ones use `<details>`).
- Primitives: `Section`, `Container`, `SectionHead`, `Img` (always use `Img` for
  intake images, with a real `sizes`).
- Other sections: `BeforeAfter`, `RecentJobs*`, `WorkGallery`, `GalleryEntries`,
  `Testimonials`, `Tiers`, `Usage`, `HeroStats`, `Contact`, `FAQ`.
- Chrome: `Footer`, `StickyPhoneBar` (mobile quote + call), `ConsentBanner`,
  `Analytics` (Vercel Web Analytics + Speed Insights always; Plausible/Umami
  cookieless; GA4 under Consent Mode v2),
  `TodoBanner` (lists unfilled intake fields; dev server only, never on the live site).

### src/layouts/Layout.astro
Head: title/description from `pageSeo`, canonical, OG/Twitter (share image
auto-derived from hero/service image at 1200w when `seo.ogImage` unset), JSON-LD,
fonts, palette style attribute, kit class. Body end: reveal observer
(reduced-motion aware) and the post-load image warmer (flips every lazy image
to eager on idle; skipped under Save-Data).

### src/pages
`index.astro` assembles the homepage from `layout.order` via `MAP` (every
section component must be in MAP). Secondary: `services`, `services/[slug]`
(from src/data/services.ts), `gallery`, `faq`, `areas`, `areas/[slug]`,
`privacy`, `terms`, `404`; `about`/`contact` redirect to homepage anchors;
`llms.txt.ts`, `robots.txt.ts` (mirrors `seo.noindex`). Sitemap reads dist/,
so it lists only pages actually shipped.

### src/styles/global.css
All tokens under `@theme`; colours read `--c-*` (per client), type/radius/shadow
read `--kit-*` (per kit class). Kit-scoped rules for `.section-eyebrow` /
`.section-heading`. Base rule caps running text (`p, dd, blockquote,
figcaption`) at `40em`. Heading weights come from `--weight-heading` /
`--weight-display` (unlayered, so utility weight classes on headings do nothing).

### astro.config.mjs
Fonts API with the LOCAL provider over vendored `@fontsource/*` files, loading
only the active kit's faces. `vite.build.cssTarget` pinned (Vite 8 range-syntax
media queries otherwise break older Safari). `prefetch: { prefetchAll: true,
defaultStrategy: "load" }`. Sitemap integration.

## 5. Images (v3.21)

- Intake paths stay public-style: `"/images/services/raft-slab.webp"`.
- If the same path exists under `src/assets/` the `Img` component renders an
  astro:assets `<Image>`: WebP srcset at 480/800/1200/1600/2400 (capped at the
  source width), quality 72. Otherwise a plain `<img>` from `public/`.
- Gallery "open full image" links to a 1600w WebP, not the master.
- Masters: rotate upright (bake EXIF), strip metadata incl. GPS, cap ~2400px
  (1600px is plenty for service images), keyword filenames, **always encode from
  the original** — re-encoding an already-lossy WebP compounds artefacts.
- LCP: photo heroes (fullbleed, split-media) load eager + `fetchpriority=high`; everything else lazy, then warmed
  after load. Hidden panels (`display:none`) never fetch lazy images on their own
  — that is why ServicesPageIndex warms a panel on hover/focus/touch.

## 6. Adding things — checklists

**New layout variant:** add to `CATALOGUE` (append; do not reorder), add
`PREREQS` if it needs data, implement the component, add to VARIANTS.txt and
VARIANT-CHEAT-SHEET.txt, check-catalogue passes, qa clean on a build forced to
that variant (`_brief.layoutVariants`), TEMPLATE-CHANGES entry, minor bump.

**New intake field:** skeleton + INTAKE-SPEC.txt + a reader in content.mjs (or
the component) + check-intake coverage so it cannot be silently dropped; default
must keep existing clients' output identical.

**New section:** component, `MAP` entry in index.astro, engine section list /
anchors, check-intake coverage, docs.

**New dependency:** don't. If truly unavoidable: template only, flagged to
Jordan first, lockfile regenerated, all clients get it via pull.
