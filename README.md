# Universal Trade Template (v3)

A single Astro + Tailwind v4 static template that produces **visually distinct**
sites per client from one `client-intake.json`. A deterministic engine picks each
site's design kit, per-section layout variants, and section order — seeded by the
business name + domain — so every client is unique but stable across rebuilds.

## Stack
- **Astro 7** (static output, Vercel), Rolldown/Vite
- **Tailwind CSS v4** via `@tailwindcss/vite` (no `tailwind.config.js`, no PostCSS — tokens live in `src/styles/global.css`)
- **Astro Fonts API** (local provider, files vendored from `@fontsource/*` npm packages) — fonts are loaded **per design kit** from `astro.config.mjs`
- **Vanilla JS** only
- `@astrojs/sitemap` + `llms.txt` + `robots.txt`

## Quick start (new client)
Every client is its own repo cloned from this one and kept in step with
`npm run template:*` (docs/SYNC.md). In Claude Code: `/new-client "Business
Name" --trade "Painting"`. By hand:
```
git clone https://github.com/jordanlelli/universal-template.git <slug>
cd <slug> && git remote rename origin template && git rm -q BACKLOG.md
node scripts/new-client.mjs "Business Name" --trade "Painting" --force
npm run template:init   # records which template commit this client is on
npm ci                  # NOT npm install — see "Dependencies" below
#   fill client-intake.json (paste a vertical preset from brief-presets.txt into _brief) and CLIENT.md
npm run variants        # optional: lock in the random picks so they're visible/editable
npm run dev             # preview
npm run build && npm run qa
```
The template ships with `client-intake.json` = the blank skeleton, so `npm run build`
stops at `check-universal` until `style.brand` / `brandDark` / `accent` are filled.
That is the gate working, not a broken template.

## Template sync (v3.23)
- **Client repo:** `npm run template:status` (what changed on each side),
  `npm run template:pull` (three-way merge of the latest release on a new
  branch), `npm run template:init` (record the base, once).
- **Template repo:** `npm run template:import -- ../<client>` (port a client's
  shared-code change back), `npm run template:release -- <x.y.z>` (version bump).
- Ownership (which files are shared vs client-owned) is `template.config.json`.
  Full workflows, first-time setup of existing clients and troubleshooting:
  **docs/SYNC.md**. Claude Code skills wrap each flow (`CLAUDE.md`).

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
- The `src/data` files hold records only. Their types are in `src/lib/types.ts` and the lookups in `src/lib/data.ts` (shared code, so they sync).

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
- `analytics.provider`: `""` | `plausible` | `umami` | `ga4`. Vercel Web Analytics and Speed Insights load on every site regardless; enable both on the Vercel project.
- `services.page`, `services.groups[]`, `services.items[].group` / `.anchor`: the /services page (v3.19). Layout via `_brief.layoutVariants.servicesPage` — picked by hand.
- `business.schemaType`, `business.googleBusinessUrl`, `contact.openingHoursSpec[]`: business JSON-LD (v3.20, INTAKE-SPEC §11).
- `seo.pages.{services,areas,gallery,faq}.{title,description}`: per-page title + meta. Headings and titles follow the keyword rules in `INTAKE-SPEC.txt` §10.

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
`npm run build` runs five gates before Astro and one after:
```
check-design      DESIGN-LIBRARY §1 doctrine (focus, type scale, radius, colour)
check-catalogue   every variant documented, catalogued and rendering
check-universal   no client colour in shared code; this palette clears AA
check-intake      every content key in the intake reaches the page
check-prices      no placeholder prices, photos, jobs or unsourced reviews
astro build
check-fonts       the kit's typefaces and weights are actually in dist/
```
Run them alone with `npm run check:universal` / `check:intake` / `check:presets` / `check:fonts`.

## Demo intake
The template's own `client-intake.json` is the blank skeleton, so `npm run build`
stops at check-universal here by design. To build and test the template itself:
```
npm run demo       # every gate + astro build, reading client-intake.demo.json
npm run qa:demo    # the same, then impeccable in a real browser
```
`client-intake.demo.json` is an invented business ("Example Concreting Co
(demo)", noindex, no reviews, no photos). Never copy it into a client intake.
The switch is the `INTAKE` environment variable, read by `scripts/intake-path.mjs`
for every script and by `astro.config.mjs`, which points the `@intake` import in
`src/config.ts` at the same file. Unset, everything reads `client-intake.json`
exactly as before. To run anything else against another intake:
`node scripts/with-intake.mjs <file.json> <command>` (works in cmd, PowerShell
and sh, where `INTAKE=x npm run …` does not).

## Scripts
`dev` · `build` (runs the placeholder guard first) · `demo` / `qa:demo` (build and qa the template's demo intake) · `preview` · `variants` (lock picks) · `verify:lock` (assert a crafted build is pinned) · `clean` / `regen` / `fresh` · `qa` (impeccable in a real browser over every built page — run after `build`) · `qa:src` (impeccable static pass over `src/`) · `qa:static` (old static pass over `dist/`, false-positive heavy; comparison only) · `template:status` / `template:init` / `template:pull` / `template:import` / `template:release` (docs/SYNC.md) · `test:sync` (tests for the sync script against throwaway repos; add `-- --mutants` after changing `template-sync.mjs`).

## Dependencies
Every client runs the same code, so every client should run the same
`package.json` + `package-lock.json`. The lockfile is the contract.

**In a client repo — install only, never update**
- `npm ci` (Vercel: set Install Command to `npm ci`). It installs exactly the
  lockfile and fails if `package.json` disagrees with it, which is the point.
- Never `npm install`, `npm update` or `npm audit fix` in a client repo:
  each one rewrites the lockfile inside the `^` ranges, and that client
  silently drifts from the template.

**In the template repo — deliberate updates, then roll out**
1. `npm outdated` and `npm audit` — see what moved and what's flagged.
2. Minor/patch (safe inside `^`): `npm update`, then raise the floors so the
   lockfile and `package.json` agree, e.g.
   `npm install astro@^7.3.5 @astrojs/sitemap@^3.7.4`.
3. Majors one at a time, release notes first. Never `npm audit fix --force`
   (it jumps majors).
4. `npm run build` and `npm run qa` on a real client intake. `npm ci` from a
   clean `node_modules` to prove the lockfile installs.
5. Bump `version`, add a `TEMPLATE-CHANGES.md` entry, commit both files.
6. Roll out: tag the release, then in each client `npm run template:pull`,
   `npm ci`, `npm run build`, commit. (Never hand-copy the files — the sync
   records which release each client is on. The lockfile carries every
   platform's native binaries — Windows, macOS, Linux — so it installs on your
   PC and on Vercel alike.)

## Deploy (Vercel)
Framework: Astro · Build: `npm run build` · Install: `npm ci` · Output: `dist`.
Fonts are vendored from the `@fontsource/*` npm packages (v3.20), so the build needs no network beyond `npm ci`. `check-fonts` fails the build if the kit's fonts did not ship.

## Notes
- `favicon.png` is a neutral placeholder — replace with the client's real favicon; add an OG image at `public/images/og.jpg` (or set `seo.ogImage`).
- `client-intake.skeleton.json` is the annotated blank to copy per client.
