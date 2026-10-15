# Universal template — regeneration notes

## Unreleased

(Backlog branches add notes here; moved under a version heading at release.)

## v3.34.0 — docket and index heroes balanced against the copy

This changes how some built sites look. After pulling: build, then `npm run
qa`.

### docket-min-rows: the docket hero needs four spec rows, and both heroes centre their panel

The v3.33 layout check flagged this template's own demo: a docket hero with
three spec rows (services, areas, hours) beside a four-line heading left the
right column mostly empty from 1024px up. Recon demos built from Facebook pages
usually have exactly those three rows, so they would ship the same thing.

- `resolveDocketRows(site)` and `DOCKET_MIN_ROWS` (4) are new in
  `src/lib/content.mjs`, shared by the engine and `HeroDocket.astro`, like
  `resolveStoryCredentials`. The rows and their order are unchanged.
- The engine has a new prerequisite, `hero/docket` → `docketRows`: it no
  longer picks docket for an intake with fewer than four rows.
- `Hero.astro`: a docket pinned by hand that is too thin renders the index
  hero when there are four or more services, otherwise typographic.
- `HeroDocket.astro`: from 64rem the rows sit centred against the copy (the
  divider still runs the full height) and each row has 1.2rem of padding
  instead of 0.9rem.
- `HeroIndex.astro`: the service rail is centred against the copy instead of
  top-aligned (`align-self: center` from 64rem).
- `client-intake.demo.json`: the demo's hero is pinned to `index`, since the
  invented business has three docket rows.
- `scripts/check-layout.mjs`: a column that is itself a visible panel (a fill,
  or an outline on two or more sides) counts as content when it stops short of
  the full row, and a block centred against a taller one counts only the larger
  of its two edge gaps. Both were false readings on the index rail.

Who sees a change: a site whose hero is docket with three or fewer rows now
gets the index hero (or typographic). Every docket and index hero is centred
against its copy on desktop. Checked: the demo (index), and docket with four
and with five rows, pass impeccable and the layout check at all ten widths.

## v3.33.0 — layout check at ten screen widths

### layout-check: layout faults measured at ten screen widths

New script `scripts/check-layout.mjs`, run by `npm run qa` after impeccable
and on its own by `npm run qa:layout`. It serves `dist/`, opens every built
page in headless Edge or Chrome (whichever is installed, over the browser's
own debugging protocol, so nothing is added to package.json) at 360, 390,
768, 1024, 1280, 1366, 1440, 1536, 1707 and 1920px, and fails on:

- `overflow`: the page scrolls sideways.
- `column-gap`: side-by-side blocks where one leaves a large empty area (over
  160px and over 20% of the row) beside the other. Photos beside text,
  sticky rails, header, footer and nav are skipped.
- `table-space`: a table column far wider than anything in it.
- `table-cells`: a table row with a different cell count from its header.
- `adblock`: an id or class that common ad-block lists hide.

What changes on a built site: nothing. What changes for a build: `npm run
qa` can now fail on layout. Fix the layout or the intake; mark a deliberately
uneven block with `data-layout-check="ignore"` only after asking.

Found on the demo by its first run: the docket hero with three spec rows
(services, areas, hours) leaves the right column mostly empty at 1024px and
up. Not fixed in this change.

## v3.32.0 — Vercel Web Analytics and Speed Insights

### vercel-analytics: Web Analytics and Speed Insights on every page

Two new dependencies: `@vercel/analytics` and `@vercel/speed-insights`. After
pulling: `npm ci` (the lockfile changed).

`Analytics.astro` now always renders Vercel's `<Analytics />` and
`<SpeedInsights />` alongside whatever `analytics.provider` selects. Both are
cookieless, so the consent banner logic is unchanged. There is no intake flag:
every site is hosted on Vercel.

What changes on a built site: two deferred scripts in the head of every page
(`/_vercel/insights/script.js`, `/_vercel/speed-insights/script.js`). Nothing
visible changes.

Per project, once, in the Vercel dashboard: enable Web Analytics and Speed
Insights. Until then the scripts load and report nothing.

A&J and GreenEdge already carry this change by hand (same edit to
`Analytics.astro`), so it will not show as drift once they are on this release.

## v3.31.0 — highlight text contrast, stale-build guard, audit clean

One item changes how some built sites look (eyebrow-contrast: text that
failed WCAG AA is darkened to pass). The other two change no built output.
After pulling: `npm ci` (the lockfile changed), then build before running qa.

### eyebrow-contrast: highlight used as text is now fitted for text

This one changes how some built sites look. It is a fix: text that failed
WCAG AA now passes.

`style.highlight` is a fill. Two kit rules and five utilities used it as a
TEXT colour without any contrast fitting, so a pale highlight (`#5DB3D6`)
rendered eyebrows at 2.1:1 while check-universal printed "palette clears AA".

- **`--c-highlight-ink` / `--color-highlight-ink`** (palette.mjs, global.css):
  the highlight walked toward the ink only as far as 4.5:1 needs, against
  the page and the alt surface. A highlight that already passes is unchanged.
  `text-highlight-ink` is the utility.
- **coast and press eyebrows** use it. An eyebrow on a dark photo hero keeps
  its on-dark colour (the kit rule steps aside for `.text-accent-ondark`);
  before, the kit rule forced the raw highlight there too.
- **FAQ, tiers and gallery eyebrows on every kit**, and the price line and
  step markers on `/services/<slug>`, used the `text-highlight` utility:
  same failure, reached without a kit rule (3 findings on signal with the
  same pale highlight). They now use `text-highlight-ink`. This goes beyond
  the backlog item, which named only the two kit rules.
- **Inside the colour band** `--color-highlight-ink` and `--color-accent-ink`
  step to the band's text colour. `--color-accent-ink` had no remap at all:
  with the band on story, the step numbers were dark on dark (1.0:1), on any
  kit. Review stars inside a banded testimonials section used the same token
  and are now the band text colour.
- **check-universal section D**: every colour a `.kit-*` rule sets as text,
  and `text-highlight-ink`, is contrast-checked on the page and alt surface,
  with the client's palette and with a pale probe highlight, so a rule that
  goes back to an unfitted token fails every build. `text-highlight` on
  anything but an `<svg>` is an error.

What changes on a built site:
- Every page's palette `style` attribute gains `--c-highlight-ink`, and the
  CSS file changes. On the demo (signal) the homepage HTML is otherwise
  byte-identical.
- Looks different only where the highlight (or accent, when no highlight is
  set) fails 4.5:1 on the page: those eyebrows get a darker step of the same
  hue. And where the colour band lands on story or testimonials: step numbers
  and stars become readable.

Verified: the demo intake with highlight `#5DB3D6`, an eyebrow on every
section and the band forced onto story passes `npm run qa` on all five kits
(coast and press had 17 findings each before). Not verified in a built page:
the dark-photo-hero eyebrow, because the demo has no photo. The selector was
checked in the browser by adding the class.

After pulling: nothing. No new intake key.

### qa-stale-dist: qa refuses a build that is older than the source

No change to any built site.

`npm run qa` scans whatever is in `dist/`. When a client's `npm ci` failed and
`astro build` could not run, qa scanned the previous build and printed
"0 findings".

- **scripts/qa.mjs** exits 1, before starting Chrome, when `dist/index.html`
  is missing or older than the newest file in `src/`, `client-intake.json`,
  `client-intake.demo.json`, the `INTAKE` file if one is set,
  `package-lock.json` or `astro.config.mjs`. The message names the file that
  changed and both times. `--keep-going` does not override it.
- docs/LESSONS.md records both halves: the false pass, and the cause of the
  failed install (a leftover `astro preview` holding a native binary open).

After pulling: nothing. Expect qa to refuse once straight after the pull
(the pull changes `src/`): build, then qa, as always. `astro.config.mjs` and
the demo intake are checked in addition to the three inputs the backlog item
lists.

### deps-pass: audit clean, three unused font packages removed

No change to any built site: Hanson's intake (65 files) and the demo build
are byte-identical before and after, including asset filenames.

`npm audit` reported 2 high-severity findings on the v3.30.0 lockfile. Both
are in packages the build uses on the build machine; neither ships in
`dist/`. `npm audit` now reports 0.

- **Removed** `@fontsource/inter`, `@fontsource/inter-tight`,
  `@fontsource/space-grotesk`. No kit and no Style Picker face or base has
  loaded them since v3.28.0.
- **`http-cache-semantics` 4.2.0 → 4.3.0** (via astro). GHSA-ch52-4w7c-c8xp:
  a shared HTTP cache can serve one user's cached response to another through
  `max-stale`. Caveat: the advisory lists no patched version, the project
  publishes no release notes for 4.3.0, and the code diff (a `status()`
  accessor, stricter `Vary` matching) does not visibly change max-stale
  handling. The update takes the lockfile out of the flagged range; whether
  the flaw itself is fixed is not confirmed. Astro uses the package for its
  own build-time cache, not a shared one.
- **`source-map-js` 1.2.1 → 1.2.2** (via postcss, tailwind, svgo, magicast).
  GHSA-68fv-2mgg-jv7q: a crafted indexed source map can block the event loop.
  Fixed in 1.2.2 per its release notes.

Each change is its own commit. No direct dependency moved (`npm outdated` is
empty) and nothing was added.

Verified: `npm ci` from the new lockfile installs; check-fonts passes on all
five kits and the three picker bases (heavy, warm, friendly); `npm run
qa:demo` 0 findings.

After pulling: `npm ci` (the pull prints the reminder), then build as usual.

## v3.30.0 — demo intake, sync tests, data types split

No change to any built site. Three backlog items, all tooling and structure.
After pulling: nothing is required (details under each item).

### sync-tests: `npm run test:sync`

No change to any built site, and no change to `template-sync.mjs` itself.

- **`scripts/test-template-sync.mjs`** (no dependencies). Builds a throwaway
  template repo (v1.0.0 then v1.1.0), a bare remote and a client repo with no
  shared history under the OS temp dir, and runs the real script against
  them. 20 cases: every row of docs/SYNC.md §1 for `status` and `pull` (take,
  keep + drift, clean 3-way merge, overlapping conflict with markers, template
  delete, restore missing, deleted upstream but edited here), no-base pulls
  with and without `--theirs`, CRLF-only differences, client-owned and
  template-only files, the launch lock, `init` by tag / by package.json
  history / `--base`, `import` dry run, `--apply`, `--only`, `--include-new`
  and no-base, and `release`. Git's system and global config are ignored so
  local settings cannot change the result.
- **`npm run test:sync -- --mutants`** breaks the script one branch at a time
  in a temp copy (26 mutations across `classifyClient`, `cmdImport`, the lock
  and `release`) and fails if any of them leaves every case passing, or if a
  mutation no longer matches the script's text.

After pulling: nothing. Run `npm run test:sync -- --mutants` before releasing
a change to `template-sync.mjs` (added to the SYNC.md release checklist).

### demo-intake: the template can build and qa itself

No change to any built site: a client build (Hanson's intake, 65 files) is
byte-identical before and after.

- **`client-intake.demo.json`**: an invented business, "Example Concreting Co
  (demo)" on `example.com.au`, `seo.noindex: true`, no reviews, no photos, the
  services, FAQ and areas pages on, grouped services and FAQs. The phone number
  is one ACMA publishes for use in fiction (cited in `_meta.notes`, written
  from memory: the ACMA page could not be fetched during the run, so check it).
  Hero is pinned to `docket` because the typographic motif is an open
  impeccable finding (BACKLOG hero-motif).
- **`npm run demo`** (gated build) and **`npm run qa:demo`** (build + qa) read
  it. `client-intake.json` is never touched.
- **`INTAKE` env var**, default `client-intake.json`. `scripts/intake-path.mjs`
  resolves it for check-fonts, check-intake, check-universal, pick-variants,
  verify-lock and apply-picks; `astro.config.mjs` reads the same file and
  aliases `@intake` to it, which is what `src/config.ts` now imports
  (`tsconfig.json` maps `@intake` for the editor). `--intake` on check-intake
  and check-universal still wins over the env var.
- **`scripts/with-intake.mjs <file> <command>`** sets `INTAKE` for a command on
  any shell.
- **check-intake**: `example.com(.au)`, `example.org/.net` and the `.example`,
  `.test`, `.invalid` TLDs now count as demo hosts in the noindex check, beside
  vercel.app and friends. Before, the demo's `noindex: true` on
  `example.com.au` was an error. Side effect: an intake still on the skeleton's
  `example.com.au` with noindex off now gets the "demo host is indexable"
  warning. A real domain behaves as before.
- `pick-variants` and `verify-lock` now find the intake from the repo root, not
  the current directory. Same file when run through npm.

After pulling: nothing. `client-intake.demo.json` arrives in client repos as a
shared file so `npm run qa:demo` works there too; it is never built unless
asked for.

### split-data-types: record types and helpers out of src/data

No change to any built site. Checked three ways with Hanson's intake plus one
service record: main, this change with the old data files, and this change
with migrated data files all build byte-identical output (66 files).

`src/data/*.ts` is client-owned and never synced, but it also held the record
types and five helper functions, so a change to either never reached a client.

- **`src/lib/types.ts`**: `Service`, `ServiceImage`, `PriceUnit`,
  `GalleryEntry`, `GalleryImage`, `GalleryImageKind`, `GalleryService`,
  `RecentJob`, `Testimonial`. Unchanged shapes.
- **`src/lib/data.ts`**: `getServiceBySlug`, `formatServicePrice`,
  `getRecentGalleryEntries`, `getGalleryByService`, `getRecentJobs`. Unchanged
  bodies.
- The template's four data files now hold records and an `import type` only.
  Components and pages import types and helpers from `src/lib`.

After pulling: nothing is required. A client's own data files are not touched
by the pull and keep working; the types and helpers still declared in them
are simply no longer used. To tidy a client's data file (optional, per file):
delete its `export type …` blocks and helper functions and replace the
`import type { ImageMetadata } from "astro"` line with
`import type { Service } from "../lib/types";` (`GalleryEntry`, `RecentJob` or
`Testimonial` for the other three). Keep the `export const …: Type[] = [` line
exactly as it is: check-intake and check-service-prices read it.

Not done: `astro check`. `npx @astrojs/check` will not run without being
installed in the project (it prompts to add it and typescript to
package.json), and adding a dependency is not this item's call. `tsc --noEmit`
over the .ts files reports the same two errors before and after
(src/config.ts, src/pages/llms.txt.ts), none in the new or changed files;
.astro files are type-checked only by the build.

## v3.29.0 — launch lock

No change to any built site. Tooling and rules only.

A launched site must never take a template update as a side effect. v3.28
showed why: one release changed fonts, motion and four sections, and during
that rollout a pull into the live A&J site was offered alongside the demos.

- **`template-sync.mjs lock` / `unlock`** (`npm run template:lock`,
  `template:unlock`). `lock` writes `"locked": true` (plus `lockedAt` and an
  optional `--note`) into the client-owned `.template-sync.json`.
- **`pull` refuses on a locked site**, before it creates a branch or writes a
  file (exit 1). `--dry-run` and `status` still work and print LOCKED.
  `init` and `pull` keep the lock when they rewrite the state file. There is
  deliberately no flag that pulls through it.
- **Rules**: CLAUDE.md "Launched sites are frozen", docs/SYNC.md §4c-0, the
  release checklist, and step 0 of the `/sync-template` skill.

After pulling: nothing. At each site's launch: `npm run template:lock`, commit
`.template-sync.json`, note it in CLIENT.md. For a site already live on an
older template, lock it with the template's copy of the script:
`node ../universal-template/scripts/template-sync.mjs lock`.

## v3.28.0 — de-box pass, review cards, kit fonts

THIS ONE CHANGES HOW BUILT SITES LOOK. Every client that pulls it gets the
revised sections below; no intake edit is needed and no intake key changed
meaning. Check each client at 1440 and 390 after `template:pull`.

Why: an audit of three real builds (Hanson, Cove, A&J) at 1440 and 390. The
pipeline demos measured FIVE boxed sections out of nine (services, why us,
reviews, about, contact), the phone number four times above the fold, and
every section opening with the same heading + grey line + grid of bordered
boxes. DESIGN-LIBRARY G2 already said "max 2 card-grid sections"; nothing
enforced it, and the default variants broke it on their own.

- **Hero / header: one call action.** When the primary (or secondary) hero
  CTA is a `tel:` link, the trailing "Call 04xx" text link is dropped. When
  the header CTA is a `tel:` link, the plain number beside it (and the second
  "Call" button in the mobile menu) is dropped. Quote-first sites are
  unchanged.
- **services/grid-icons: one ruled sheet.** Cells share a frame and a
  hairline instead of each being a bordered card. The quote card is now a
  full-width accent row closing the sheet; on a call-first site it is the one
  link (plus `contact.hours` if set) and never prints the number twice.
  Icons take the brand colour, not the accent (accent is for action).
  Ordinals take `muted`: accent-ink at 11px measured 3.2:1 on a yellow-accent
  palette and failed `npm run qa`, on `main` as well.
- **whyUs/icon-grid: ruled checklist.** No boxes, no tick-in-a-circle badge.
  Hanging tick, title and sentence on one edge, hairline above each entry.
- **story/ruled-cards: copy first.** Lede left, remaining copy right, then
  `story.cards` as one ruled strip. credentials-panel prints the same strip.
- **Testimonials: review cards, still scrollable.** Same sideways scroller
  as before (three across on desktop, more than three scroll), restyled as
  platform-style review cards: initial, name, Google / Facebook mark linked
  to the source, then the text. Added: previous / next buttons on desktop,
  keyboard scrolling, "Read more" on reviews over seven lines (JS only), and
  a link to the review profile in the section head. The section sits on the
  tint surface.
  NEW OPTIONAL INTAKE FIELDS, all real-data-only: `items[].rating` (1 to 5,
  the reviewer's own stars), `items[].date`, and `testimonials.rating
  { score, count }` copied from the profile. No value, no stars. check-intake
  fails on a rating outside 1 to 5 or a half-filled block rating. No
  AggregateRating JSON-LD is emitted (unchanged).
  (An editorial "one review leads" layout was built first and dropped at
  Jordan's request.)
- **Kit fonts: Inter and Space Grotesk retired.** ledger body Inter Tight ->
  Public Sans; press body Inter -> DM Sans; signal Space Grotesk + Inter ->
  Bricolage Grotesque + DM Sans (signal's hero weight 700 -> 800, display
  tracking -0.035em -> -0.025em). workshop and coast unchanged. No new
  packages: every family was already installed. CLIENTS AFFECTED: any site
  on ledger, press or signal with no `_brief.stylePicks` (today: Cove
  Electrical). Sites with stylePicks, and workshop sites, do not change.
  `@fontsource/inter`, `inter-tight` and `space-grotesk` are now unused and
  can come out in the next dependency pass.
  To change it: KIT_FONT_FACES in src/lib/variants.mjs plus the kit's
  --weight-* tokens in global.css; per client, `_brief.stylePicks`.
- **Motion: "standard" eased.** 20px / 0.6s -> 12px / 0.4s (items 16px ->
  10px). "subtle" and "bold" render as before (bold now states its own item
  distance, which it used to inherit from standard). Affects every site
  that has not set `features.motion` to subtle, bold or off.
  To change it: the three --rv-* tokens in global.css, or `features.motion`.
- **Suburbs: a line of place names, not pills.** areas/chips, the suburbs
  inside areas/zoned, and /areas all set suburbs as a ruled line of names.
  NEW OPTIONAL KEY `usage.areaStyle: "pills"` puts the chips back for a
  client. Affects every site on areas chips or zoned, and /areas.
- **Homepage gallery: mosaic.** First image leads at 2x2; shapes for every
  count 1 to 6 with no hole; two columns on a phone (it was six full-width
  photos, about 1700px of scrolling). "View the full gallery" sits in the
  section head on desktop.
- **Contact.** Form has no box and sits on the section's left edge. Field
  borders are `ink/55` (about 3.6:1; the old border token was about 1.2:1,
  under WCAG 1.4.11). The details panel's dividers no longer curl (the rule
  was on a rounded link). With no form endpoint the phone number is set at
  display size and the panel shows only address and hours.
- **Footer.** With `footer.columns` empty, link columns are derived from
  `services.items` and the header nav. Authored columns still win.
- **check-intake.** New warning when `hero.eyebrow` repeats the business
  name (the header already shows it).
- **DESIGN-LIBRARY.** New banned patterns B10 to B15, three QA lines, and a
  note that the section 3 presets carry stock Tailwind swatches and
  default-stack fonts (use the picker palettes and the kit table instead).

Verified: build gates and `npm run qa` clean on Hanson (split-media,
grid-icons, icon-grid, ruled-cards; and with `usage.areaStyle: "pills"`),
Cove on signal (docket, ledger, ruled-rows; grid-icons + icon-grid forced on
an earlier pass of this branch) and again forced to the ledger kit, and A&J
(fullbleed, split-scroll, portrait-lede, authored footer, /areas). Gallery
checked at 3, 5 and 6 photos. Review cards checked with and without ratings;
previous / next, keyboard scrolling and "Read more" exercised in headless
Chrome, with and without reduced motion.
Known and NOT from this branch: Cove forced to press (and coast) fails qa on
the hero eyebrow, 2.4:1, because those kits colour the eyebrow with the
client's highlight. Same result on `main`.
NOT verified: the tiers and before-after sections, a dark-theme client, and
phone width for A&J.

## v3.27.0 — sample-content tag, service icons

No change to any site that sets neither field.

### demo.sampleSections — NEW
A demo built before the owner has been spoken to has empty sections, which
hides what a finished site looks like. The demo pipeline now fills them with
example copy and lists them here; Layout.astro tags each listed section
`data-sample` and global.css draws a small red "Sample content" label on it.
check-intake fails when sampleSections is non-empty and seo.noindex is not
true. Reviews, ratings, licence and ABN numbers are never sample content:
that rule lives in the pipeline's gate, not here.

### services.items[].icon — NEW (src/lib/icons.mjs)
24 single-path line icons in currentColor. ServicesGridIcons shows the icon
in place of the card's number when the name is known. check-intake rejects
an unknown name and lists the valid ones.

## v3.26.0 — side entrances (features.motion "bold")

No change to any site unless its intake sets features.motion to "bold".
- New level `bold`: standard, slightly longer, plus side entrances. The two
  halves of a two-part section are marked `data-reveal-from="left|right"`
  and slide in from that side: Contact (form / details panel), Story
  (credentials-panel and portrait splits), BeforeAfter pairs,
  WhyUsContrastPair, ServicesSplitScroll rows (alternating with the flip).
- Each half is observed on its own, so a row deep in a long section moves
  when it arrives. From 64rem up only; stacked, the halves use the normal
  rise. Distance is the --rv-side token in global.css.
- The hero is not included: it is above the fold, and starting its photo
  hidden would delay the largest paint.
- To give another component a side entrance, add data-reveal-from to the
  element. Nothing else is needed.

## v3.25.0 — scroll motion

CHANGES BUILT PAGES: every client gets the staggered grids on its next pull,
and every fullbleed-hero client gets the pinned hero. Both can be turned off
in the intake.

### Staggered grids
The opt-in stagger (data-reveal="stagger" + data-reveal-item) existed since
v3.x and no component used it. Now on: services (grid-icons, feature-lead,
ledger), the homepage gallery and testimonials. Section.astro takes
`reveal="stagger"`. A stagger section now also fades in as a whole, so the
heading no longer sits alone before its grid arrives.

### features.motion — NEW (standard | subtle | off)
Layout.astro sets `<html data-motion>`; the reveal distance and duration are
tokens in global.css (--rv-dist, --rv-item-dist, --rv-dur). `off` skips the
observer entirely. Missing or unknown = standard = the old values, except the
item transition, which moved from 0.55s to the shared 0.6s.

### Pinned fullbleed hero — NEW (hero.cover, default true)
HeroFullbleed is `position: sticky` and everything after it is lifted above
it, so the next section slides up over the photo. A small script sets where
it sticks: under the header, or, when the hero is taller than the screen,
late enough that its last line is seen first. The section that slides over is
not faded in (the hero would show through it). Off under reduced motion and
with features.motion "off". Other hero variants are untouched.

## v3.24.0 — Kova Style Picker

### Style Picker wired in (src/lib/stylepicks.mjs, scripts/apply-picks.mjs — NEW)
No change to any site without `_brief.stylePicks`.
- The picker page gives a client a code such as `anton.heavy.harbour.100`
  (headline font, base, colour set, headline size, optional `hh`).
  `npm run picks -- <code>` writes it to `_brief.stylePicks`, writes the
  colour set into `style` as plain hex, and sets `designKit` when blank.
- Type is resolved from the code on every build: astro.config.mjs loads the
  picked fonts in place of the kit's (plus `--font-hero` when the headline
  font differs), Layout.astro sets the weight/width/case/scale vars on
  `<html>`, global.css reads them with the old values as fallbacks.
- 14 font packages added (11 headline fonts, Bricolage Grotesque, DM Sans,
  variable Archivo and Fraunces). Only the picked ones reach a build.
- New optional `hero.displayLine`: a short line in the headline font with
  `hero.heading` small beneath it, both inside the one h1.
- The homepage hero sets its size through `--hero-size` so the picker's
  size factor can multiply it; rendered size is unchanged without picks.
- check-fonts verifies the picked faces; check-intake rejects a code with
  an id the template does not list. The tables in stylepicks.mjs and
  scripts/pick-palettes.mjs mirror the picker page and must change with it.
- Known gap: with `hh` (section headings match the headline), h2/h3 take the
  headline font but not its optical size factor.

## v3.23.1 — backlog ready for unattended runs

No change to any built page.
- BACKLOG.md: rules made explicit (build fixture, "unchanged for existing
  clients", Unreleased notes, S/M/L sizes), items re-ordered so dependencies
  come first (demo-intake unblocks build/qa in the template itself), every
  item given concrete acceptance checks and implementation pointers. New
  "Run log" section.
- `/backlog-run`: preflight, never asks questions mid-run (logs assumptions),
  dependency-aware branching, local runs leave branches unpushed unless
  `--push`, budget rule, final report with push commands.
- docs/CLAUDE-CODE.md §5: usage-reset timing, `settings.local.json` allow list
  and the exact command for an unattended local run, cloud-run notes.

## v3.23.0 — git-based template sync, Claude Code knowledge files

No change to any built page. This release is about how the template reaches
clients and how changes come back.

### Template ↔ client sync (scripts/template-sync.mjs, template.config.json — NEW)
Client repos started as zip copies and share no git history with the template,
so `git merge` cannot relate them, and A&J's first repo drifted (~34 shared
files) with nothing reaching the template. The sync works per file with a
recorded base commit, i.e. a real three-way merge without shared history:
- `template.config.json` — ownership manifest. Client-owned: intake, CLIENT.md,
  src/data/**, src/assets/**, public/**, .vercelignore. Template-only:
  BACKLOG.md, .github/**. Everything else is shared.
- `npm run template:status | init | pull` in a client; `template:import` and
  `template:release` in the template. `.template-sync.json` (client-owned,
  committed) records the base. Details and workflows: docs/SYNC.md.
- Tested on a copy of AandJ-v2 against a simulated remote: take, keep-and-report
  drift, clean 3-way merge, overlapping conflict with markers, restore missing
  shared file, import with `--only`, release bump of package.json and both
  package-lock.json fields.
- First real finding: AandJ-v2 ships `api/quote.js`, which the template's
  privacy.mjs references but the template lacks (BACKLOG `port-api-quote`).

### Claude Code knowledge
- `CLAUDE.md` rewritten: imports CURSOR-CONTEXT.txt and the new `CLIENT.md`;
  template-vs-client rules tied to the sync; skills; communication rules.
- `CLIENT.md` (client-owned stub): per-client facts, scope, decisions, open items.
- `docs/ARCHITECTURE.md` (pipeline, engine, file map, add-a-thing checklists),
  `docs/SYNC.md`, `docs/LESSONS.md` (past failures → rules),
  `docs/CLAUDE-CODE.md` (machine setup, what loads where, weekly run).
- `.claude/skills/`: `verify`, `sync-template`, `port-to-template`,
  `new-client`, `backlog-run`.
- `.claude/settings.json`: routine build/git commands allowed; push, merge,
  tag, `npm install`/`update` ask; force-push and `npm audit fix` denied.
- CURSOR-CONTEXT §16 (repo roles), README quick start + "Template sync".

### After pulling (existing clients)
First time only, from the client folder:
`git remote add template https://github.com/jordanlelli/universal-template.git`,
`node ../universal-template/scripts/template-sync.mjs init --base v3.22.1`
(or the tag matching the client's version), `npm run template:status`, then
`template:pull`. Fill in `CLIENT.md`. If `.gitattributes` is new to the repo,
`git add --renormalize .` as its own commit.

## v3.22.1 — CLAUDE.md

Claude Code reads CLAUDE.md at the project root on every session. It imports
CURSOR-CONTEXT.txt (so the rules have one source, not two copies that drift)
and adds what Claude needs on top: tell template repo from client repo, treat
shared-code edits in a client repo as template changes, diff before writing
shared code, verify with build + qa + screenshots, the image checklist, and
where the reference docs are. .gitignore also skips .claude/skills/impeccable/,
.claude/settings.local.json and CLAUDE.local.md (per-machine). No code change.

## v3.22.0 — impeccable-clean by default, real-browser QA, dependencies refreshed

Tested: five builds covering every kit and every layout variant at least once
(A&J content, derived palette, FAQ page on), each scanned with the new
`npm run qa`. Four scan clean; the fifth has one finding — the typographic
hero's motif (see "Still open"). Baseline before this version on the same
builds: 81 static findings on A&J alone, 30 of them real.

### QA runs in a real browser (scripts/qa.mjs — NEW)
`npm run qa` serves dist/, scans every built page in headless Chrome through
impeccable's URL engine and exits 2 on findings. The old `impeccable detect
dist` (kept as `qa:static`) reads HTML with jsdom, which cannot resolve
Tailwind v4 spacing (calc(var(--spacing) * n) -> 0px): 68 of A&J's 81
findings were false cramped-padding. `qa:src` is the static pass over src/.
No dependency added; npx fetches impeccable + puppeteer on first run.

### .impeccable/config.json actually applies
The ignores were a flat `ignoreRules` array of objects; impeccable reads
`detector.ignoreValues`, so none of them ever matched. Rewritten to the real
schema; `qa:src` now exits 0.

### Eyebrows: sentence case, optional (global.css + 16 components)
The 11-12px tracked-uppercase label above a heading tripped three rules
(kicker-above-heading, hero-eyebrow-chip, all-caps-body). `.section-eyebrow`
now owns the type: 15px, sentence case, untracked; components carry only a
colour. Kit treatments that were themselves flagged are gone (workshop's
3px accent side-bar = side-tab; ledger's accent lead-rule = dash-prefix
eyebrow; signal's "+" prefix and 0.2em tracking). Kits now vary the eyebrow
by face/weight/style/colour. Skeleton eyebrows are empty and the hardcoded
"FAQ" / "Plans" / "See the difference" / "Services" fallbacks are removed:
an eyebrow renders only when the intake sets one.

### Measure: 40em everywhere (global.css base layer)
p, dd, blockquote, figcaption cap at 40em (~72-80 characters, scales with
the element's own size). Every ch-based width is gone — 70ch in Inter or
Source Sans is ~88 characters, which is why signal/press legal pages failed
line-length while other kits passed.

### Hero headline size is length-aware (HeroCopy.astro)
Large heroes cap at 68px once heading + tint pass 40 characters (80px for
short ones). A long headline at 75-80px filled ~40% of a laptop screen
(oversized-h1). Location line and trust labels are sentence case.

### Smaller fixes
- services/index: "What's included" lost its accent side-bar (side-tab); the
  side list's active item is a tinted row, not a left bar; the list card has
  real inner padding; titles over 50 characters step to 34px/1.3.
- servicesPage/featured: accent top-border on rounded cards removed.
- services/ledger: row rules moved to the top of each row, so a title
  belongs to its own row (heading-rhythm).
- services/grid-icons: card titles leading-snug.
- Filled CTAs get vertical padding, not just min-height.
- FAQ questions are one level below the section heading (h1 -> h2 on /faq).
- Gallery: the "PHOTO" chip only appears on before/after pairs.
- Palette: a DERIVED light paper is held out of the cream band (warm
  surface, and tint on warm brands). A client's style.bg is never changed.

### Dependencies
astro ^7.3.5, @astrojs/sitemap ^3.7.4 (lockfile regenerated). The v3.20/21
lockfile pinned astro 7.1.3 with 8 advisories (1 critical: astro itself;
high: sharp, svgo, nanoid, js-yaml, smol-toml). Now 0. Every platform's
native binaries are still in the lockfile. README "Dependencies" documents
`npm ci` for clients and the update procedure for the template;
Quick start and the Vercel install command are now `npm ci`.

### Still open (a design decision, not a bug)
The typographic hero's palette motif is an 8-shape, 6-colour SVG — exactly
what impeccable's shape-assembled-illustration rule targets. It is the
default hero for no-photo clients, so it is left in place pending a call.

## v3.21.0 — images optimised by default, everything fetched after load

Measured on A&J (same content, before vs after, Chromium, throttled 4G phone):
homepage LCP 7.3 s -> 0.76 s, bytes before first paint 5.6 MB -> 0.33 MB;
/services desktop, panel image already loaded on click: 4 of 14 -> 14 of 14.

### Intake images get the astro:assets pipeline (src/lib/images.ts, Img.astro — NEW)
Every intake image (hero, services, story portrait, before/after,
gallery.images) rendered as a plain <img> from public/, which Astro never
touches: one size, the uploaded bytes, on every device. A&J's hero was a
5.3 MB JPEG loaded eager + fetchpriority=high on every homepage view.
Intake paths are unchanged. If the same path exists under src/assets/
("/hero.jpg" -> src/assets/hero.jpg, "/images/services/x.webp" ->
src/assets/images/services/x.webp) the new <Img> renders it through
astro:assets: WebP srcset 480/800/1200/1600/2400 (never upscaled) with a
per-component `sizes`. A file only in public/ renders exactly as before, so
no existing client breaks. Moving the file IS the opt-in.
Swapped in: HeroFullbleed, HeroSplit, ServicesFeatureLead,
ServicesSplitScroll, ServicesPage{Featured,Grouped,Index,Stacked}, Story,
WorkGallery, BeforeAfter, pages/gallery. Header logo left alone (often SVG).
Keep in public/: seo.ogImage, favicons — anything needing a stable URL.

### Everything is fetched once the page has loaded (Layout.astro)
loading="lazy" defers an image until it nears the viewport, and an image in a
hidden panel until it is shown — so every click or scroll paid a round trip.
After `load` + idle, every lazy image is flipped to eager and fetched in the
background. It cannot delay first paint or LCP. Skipped only under Save-Data.
Cost: the rest of the page's images on first visit (A&J homepage on a phone:
~3 MB total, 0.33 MB of it before first paint).

### services/index: warm on intent (ServicesPageIndex.astro)
Hover, focus or touch on a service link/toggle starts that panel's image
100-300 ms before the click — covers the window before the idle warm runs.

### Page prefetch (astro.config.mjs)
prefetch: { prefetchAll: true, defaultStrategy: "load" } — every internal
page's HTML is fetched after load, so navigation is served from cache.

### Gallery "open full image" (GalleryEntries.astro)
Linked the untouched master (3-5 MB phone photos). Now a 1600px WebP.

### og:image fallback (Layout.astro)
A hero/service fallback that lives in src/assets has no public URL, so the
share image is a generated 1200px JPEG. seo.ogImage is untouched.

### check-intake
hero.image may live in src/assets/ or public/. New warning: an intake image
over 400 KB still served unoptimised from public/, with the one-line fix.

### Docs
INTAKE-SPEC §6 (where photos go), BUILD-PLAYBOOK step 0, workflow
cheat-sheet 4H (manual ImageMagick step retired), CURSOR-CONTEXT §2 (use
<Img>, never a bare <img>, for intake images), skeleton hasPhotos comment.

### Crawlability (audited, unchanged)
output: "static" — every page is prerendered HTML at build; zero client
islands. All 18 A&J services, headings and JSON-LD are in the raw HTML with
JS disabled. Hidden service panels are display:none in the HTML Google
indexes; Google treats tab/accordion content as indexable.

## v3.20.0 — vendored fonts + font gate, honest sitemap, no blank service panels, docs

### Fonts are vendored (astro.config.mjs, package.json)
The fontsource provider fetched each kit's typefaces at build. When that
fetch failed, Astro warned and shipped system-ui with a PASSING build —
reproduced here: blocked network, green build, wrong typeface. Fonts now come
from the eight @fontsource/* npm packages through the local provider (latin,
static weights: the same files as before). No network at build beyond npm ci.

### scripts/check-fonts.mjs (NEW — runs after astro build)
Fails the build unless every weight in KIT_FONT_FACES for this client's kit
has an @font-face in dist/ whose file exists, and --font-display/--font-body
point at those families. Verified on all five kits; verified it fails when a
font file is removed.

### Sitemap reads the build (astro.config.mjs)
The filter re-derived page content from the intake, which cannot see
src/data/gallery.ts — so /gallery was built, linked and missing from every
gallery client's sitemap (A&J included). It now reads dist/: a page is out
only if it is a meta-refresh redirect or noindex.

### services/split-scroll: no blank panel
A service without a photo was an empty grey 4:3 box. It is now a full-width
text row: copy left; "What's included", price and a quote link (or the
detail link) right. Left/right alternation counts photo rows only.

### Business schema (Layout.astro + resolveBusinessSchema in content.mjs)
- @type from business.schemaType (GeneralContractor, Plumber, Electrician,
  ...; check-intake warns when empty or invalid) instead of generic
  LocalBusiness.
- telephone in E.164 (+61...), sameAs from socials + business.
  googleBusinessUrl, logo, image, openingHoursSpecification from the new
  contact.openingHoursSpec[], and every service as an Offer in
  hasOfferCatalog linked to /services#<anchor>.
- FAQPage markup only on pages that SHOW the FAQs (homepage with "faqs" in
  sections, or /faq). It was emitted site-wide whenever the intake had FAQ
  items, which breaks Google's rule that markup must match visible content.
  Tested in all three configurations.

### Share image
og:image skips a hero flagged imageIsStock and falls back to the first
owned service photo. A stock photo is never the link preview.

### /areas
"Not sure we cover your area?" H2 now reads usage.notCoveredHeading.

### Docs
INTAKE-SPEC §11 (schema + share image). CURSOR-CONTEXT §4 + §10 updated and new §14 (widths, kit weight tokens,
vendored fonts, /services components, live headings, build gate order);
BUILD-PLAYBOOK (setting servicesPage, SEO QA, sitemap check, new common
mistakes); workflow-cheat-sheet (servicesPage, groups, anchors, seo.pages;
fixed the invalid `hero: "editorial"` example); README (gate list, fonts).

## v3.19.0 — /services page layouts, keyword headings, per-page SEO

Built for A&J (18 services, 5 photos), whose /services page was 11,451px on
desktop and ~21 phone screens, zig-zagging because photo-less rows sat in half
the width. Verified in headless Chromium at 360/390/430/768/1024/1440/1920 on
all four layouts, five kits and small/large catalogues: 0 horizontal
overflow, 0 tap targets under 44px, every heading and anchor resolved.

### New MANUAL axis: `servicesPage` (stacked | grouped | featured | index)
- Picked by hand in `_brief.layoutVariants.servicesPage`; unset = stacked.
  MANUAL set in variants.mjs: the seeded engine never draws it and it
  consumes no RNG. Checked: 20 seeds resolve identically to v3.18.
- stacked: the original, fixed — photo-less rows run full width as two text
  columns; rows separated by a rule, not a full section pad each.
- grouped: jump chips + per-group sticky rail (H2, intro, photo, quote
  button) + 2-col cards. Odd groups: last card spans both columns.
- featured: photo cards (hole-free spans) + full-bleed dark quote band +
  3-col catalogue with "Details" disclosures.
- index: grouped list + detail panel on desktop, accordion below 1024px,
  deep links (/services#anchor) open the right service, no-JS shows all.
- All four: full-bleed accent quote band closes the page; every service's
  full longDescription stays in the HTML; acronyms survive mid-sentence
  ("(UST)", not "(ust)").
- Heights on A&J's 18 services, desktop / phone: index 2,222 / 2,955;
  featured 3,986 / 7,495; grouped ~5,000 / 9,070 (was 11,451 / 17,510).

### Intake
- `services.page {eyebrow, heading, subhead, quoteHeading, quoteBody,
  featuredHeading, moreHeading, midHeading, midBody}`.
- `services.groups[] {id, heading, intro, image, imageAlt}` +
  `items[].group`. Group headings are live H2s. Blank = no grouping.
- `items[].anchor` — keyworded URL fragment; default = slugified title.
- `seo.pages.{services|areas|gallery|faq}.{title, description}` via the new
  `pageSeo()` in config.ts. Those pages used to hardcode "FAQ | Name".
- Skeleton: `_seoRules` at the top and `_seo*` guidance beside every heading
  field. INTAKE-SPEC §9 (services page) and §10 (headings are keywords).
- check-intake: new keys registered; advisories for 7+ services on stacked,
  grouped with no groups, and items pointing at an unknown group id.

### Also
- Gallery: section H2s use gallerySectionCopy / galleryServiceNames instead
  of title-casing the key ("Ust"); section intros render; job H3s are
  "<service> in <suburb>" or an optional per-entry `title`; empty
  monthCompleted no longer prints a stray "·" (from A&J). Gallery ends with
  the same keyworded quote band as /services.
- Footer (from A&J): business info left on the site's left edge, link
  columns pushed to the right edge, bottom bar split the same way.
- HeroStats (from A&J): values sized per breakpoint so the longest 8-char
  value fits a third of a 360px screen; weight from --weight-display.
- VARIANT-CHEAT-SHEET §4 rewritten: all 31 variants across 8 sections,
  including story, faqs and areas, which were missing.

## v3.18.0 — bold trade type, one left edge, fuller desktop

Source: the A&J v2 pass (24 Sep), which pulled AJM's hand-tuned workshop type
onto v3.17, then generalised here to every kit and every layout variant.
Verified in headless Chromium at 1440 and 390 across six kit/variant builds
covering all 6 heroes, 3 headers, 5 services, 4 whyUs, 3 story, 3 faqs and
3 areas variants, on real client content. 0 horizontal overflow; every
section h2 starts at the same x (80px at 1440) in all six builds.

### Why
AJM read bigger than A&J while its h1 was actually SMALLER (68px vs 72px).
The difference was weight (800 vs 600), tracking, and layout: A&J's header sat
in a 72rem container and its hero in an 80rem one, so logo and headline
started 64px apart, and the page sat in a 1088px column on a 1440 screen.

### global.css — widths
--w-content 72rem -> 84rem, --w-wide 80rem -> 84rem (deliberately equal; at
90rem the "wide" services layouts sat 32px from the edge while header/hero sat
at 80px). All hero variants and HeaderMinimal moved from --w-wide to
--w-content. HeroSplit's copy-column inset now tracks --w-content.

### global.css + variants.mjs — per-kit weight tokens
New per-kit tokens --weight-display / --weight-heading / --tracking-display:
workshop 800/700, coast 800/700, signal 700/700, ledger 700/600, press 700/600.
Values are capped by what each kit's font actually ships — Newsreader,
Fraunces and Space Grotesk stop at 700. h1-h3 take --weight-heading globally
(unlayered, so font-semibold utilities on headings are now dead code — change
the token, not the class). .hero-display takes --weight-display.
KIT_FONT_FACES: every kit now loads a 700 body weight (eyebrows were asking
for 800 on body fonts that ship 400-600, so the browser snapped them to 600),
and coast loads Archivo 700. Coast's font-cache key changes as a result.
body line-height 1.65 for all kits (was workshop-only in AJM).

### Hero (HeroCopy, all six variants)
- h1: large clamp(2.5rem .. 5rem), default clamp(2.25rem .. 3.75rem). Mobile
  large = 40px, default = 36px (was 44px/600 and 36px/600).
- Eyebrow + location line: 12px bold, 0.16em (0.1em on mobile so a typical
  "Trade · Suburb, SA" eyebrow holds one line at 390).
- .hero-lede: 18px mobile, 20px desktop, 40-42rem measure.
- CTAs: heading font, bold, 15px -> 16px and 52px tall on desktop.
- HeroFullbleed: copy anchored lower (pt < pb) so the CTA row clears the fold
  at 1440x900. HeroTypographic: copy column 1.15fr -> 1.3fr, lg:py-24 -> 16.
- HeroIndex rail: eyebrow now uses .section-eyebrow; list items 16px at lg.
- HeroStatLede strip: values 30px at lg, labels 12px bold.

### HeroStats — AJM's single-row strip
One row at every breakpoint (column count = stats.length), values on a shared
top line, labels centred in the remaining height so wrap count cannot move
the numbers. Sits on --w-content.

### Header (HeaderParts + all three variants)
Desktop only: 15px nav, phone and CTA; 22px wordmark; lg:py-4. Quote button
in the heading font, bold. Mobile header unchanged.

### Sections
- SectionHead: h2 44px at lg (was 36px); 12px bold eyebrow; subhead 17px at
  lg with a 40rem measure; head block max-w-3xl at lg.
- The components that hand-roll their section h2/eyebrow instead of using
  SectionHead got the same scale (Story, WorkGallery, Contact, Usage,
  Testimonials, FAQ, Tiers, BeforeAfter, RecentJobs, WhyUs band, Areas).
- Card/row titles step up one size at lg (text-lg -> xl, xl -> 2xl,
  2xl -> 28px) across all services variants, gallery, FAQ and footer.
- Areas group headings 36px at lg. Press kit's .section-heading override
  gains a 44px lg step so it does not pin press sites at 36px.
- Coast eyebrow (sentence case) 14px — 12px sentence case disappeared next
  to 800-weight display type.

### Not changed
Palette, section variants, section padding rhythm (v3.17 values kept), mobile
header, form fields.

## v3.17.0 — design audit: focus, tap targets, rhythm, radius, type scale

Measured in headless Chromium against DESIGN-LIBRARY.txt §1, not eyeballed.
The template already beat the big AI tells (0/7 centred sections, 2 card grids,
near-zero shadows, no emoji, no dead bands). What follows is what was actually
broken underneath that.

### scripts/check-design.mjs (NEW — runs FIRST in `build`)

The §1 QA gate was six checks you had to remember to run by eye, per client,
page by page. check-catalogue guarded variant integrity and check-universal
guarded the palette; the doctrine itself had no gate, and drifted for sixteen
releases. Now enforced: hardcoded colour, per-component focus styles, raw-rem
type sizes, off-role radius, emoji, placeholders, centred section heads, and
grids that cannot shrink. Source analysis only — a build gate must not need a
browser. Rules that genuinely need layout stay in a visual pass.

### global.css — keyboard focus, one rule for the whole site

165 `focus-visible:ring-*` classes across 21 files rendered NOTHING. The ring
custom properties resolved correctly (--tw-ring-shadow was
"0 0 0 calc(2px + 2px) #123A5E") but the composed box-shadow came out as three
transparent segments — while `focus-visible:outline-none` in the same class
string DID apply and removed the browser default. Net effect was worse than no
focus style at all. Replaced with one global `outline` rule. Verified by
pressing Tab through every page: 0 failures, was 13 on mobile.

### global.css — .tap-target, and the header

At 390px the header was the only place under the 44px floor: wordmark 28px,
phone link and menu links 40px, burger a hardcoded h-10. The first fix —
min-h-11 on each part — was measured and REJECTED: it grew the header 57px to
89px and wrapped the right-hand group. .tap-target uses a centred ::after, so
hit area and visual size stay separate concerns. Footer contact links too. The
inline credit link is deliberately exempt (WCAG 2.5.8 exempts links in prose).

### global.css — section rhythm, sec-pad-tight 3.5rem -> 4.5rem

The gap a reader sees is A.padding-bottom + B.padding-top, so the SPREAD
matters more than any one value. Two tokens produced four gaps spanning 2:1 —
88/176/144/112/144/176px — and no section was individually wrong. That
sequence is what reads as amateur. Text-to-text spread is now 1.23:1.

### global.css — radius has exactly two roles

--radius-card (things you CLICK, kit-driven) and --radius-input (things you
TYPE INTO, fixed across every kit: a form field is a utility, not a place to
express the brand). Plus --radius-pill for chips, an idiom rather than a role.
Before: 12px on 13 elements, 8px on 6, assigned by whichever component the
author happened to write — a text field and the Send button beside it had
different corners for no nameable reason.

### global.css — named 5-step type scale

--text-eyebrow/micro/small/body/lead. 32 raw rem values across 16 files had
drifted to seven sizes where 14 and 15px did the same job, as did 16 and 17px.
15px merged into 14px, 17px into 18px. 12 distinct sizes on a rendered page
down to 9.

### global.css — global overflow floor

One unbreakable token (a client email, a URL in About copy) sets the
MIN-CONTENT width of its column; a grid track cannot shrink below it, so the
column runs off the viewport. body has overflow-x-clip, so nothing scrolls and
the text is silently cut — which is why this survived so long. Measured: a
548px URL in a 328px Story column at 360px, and the contact grid rendering
348px inside a 328px container. Fixed globally plus minmax(0,…) on five
components with bare fr tracks.

### src/pages/404.astro — rewritten

The least-audited page broke the house rules more than any other: the whole
content block was text-center (B1, and the only centred page on the site),
`text-white` was hardcoded on the primary button (passed contrast on a navy
client by luck, would have shipped white-on-yellow to a light-brand client),
padding was a one-off 80/80 outside the scale, and it carried shadow-card. Now
left-aligned, on Section.astro, with the phone and email as sourced ruled rows
— a person who has hit a dead end wants a human, not a sitemap.

### src/components/Contact.astro

Grid blowout at 360px: `lg:col-span-3` had min-width:auto, so the client email
set the track minimum and pushed the column 4px off-screen. min-w-0 on both
children.

### src/pages/faq.astro

The CTA strip shipped with pb only in the step-2 consolidation, putting the
button flush against the section above. Same defect class as a heading jammed
to the top of a band.

## v3.17.0 — About, FAQ and Areas get a variant axis

Until now three of the five core page types had no structural variation at all.
Hero had six skeletons and Services five, while Story, FAQ, Areas, Contact and
Testimonials had one each — so every client's About and FAQ shared one set of
bones. That is the exact tell DESIGN-LIBRARY §1 names as the whole game.

### src/lib/variants.mjs — two new axes, drawn LAST

    story: ruled-cards | credentials-panel | portrait-lede
    faqs:  accordion   | open-columns      | grouped

New `LATE_DRAW` set. The per-section loop consumes one RNG value per section,
so appending a key to CATALOGUE normally shifts every draw after it — every
built client would wake up with a different kit, order, surface and band. Both
new axes are drawn after the band instead (step 6 of `resolveSite`). Verified
against four client fixtures: kit, hero, services, whyUs, header, order,
surface and band are byte-identical before and after. ADD FUTURE SECTIONS HERE,
NOT TO THE STEP-2 LOOP.

### src/lib/content.mjs — resolveStoryCredentials()

One implementation of the credential rows, shared by the engine (which gates
credentials-panel on 2+ rows) and by Story.astro (which renders them), so the
gate and the render cannot disagree. Every row sourced; an empty field is
omitted, never filled with "Contact us".

### src/components/Story.astro, src/components/FAQ.astro

Three branches each, with the original layout preserved unchanged as the
default so no built client shifts. Every branch re-checks its own prerequisite
and degrades to the default: an explicit `_brief.layoutVariants` value skips
the engine's filter, so a hand-set variant can otherwise arrive on a client
whose data cannot fill it. All ten fallback paths verified.

### src/pages/faq.astro — now renders FAQ.astro

The page carried its own copy of the accordion markup and the two had drifted:
a plus icon against a chevron, py-4 against py-5, divide-border against
divide-brand/10. Same questions, two behaviours, neither canonical. The page
now renders the component with `headingLevel="h1"`, so the variant applies in
both places and there is one implementation to maintain.

### Overflow fix (PRE-EXISTING BUG, affects every shipped client)

A long URL or unhyphenated word in Story body copy set the min-content width of
its column: measured at 548px inside a 328px column at 360px viewport. It never
produced a visible scrollbar because `body` carries `overflow-x-clip` — the
text was simply cut off, which is why it went unnoticed for sixteen releases.
Fixed with `overflow-wrap: anywhere` (not `break-word`, which does not shrink
min-content size and so does not fix the grid track).

SCOPING TRAP, worth knowing: the first fix hung off `.story-areas` and matched
nothing. That class is passed as a PROP to Section.astro, so the `<section>` it
lands on belongs to Section's scope and never carries the calling component's
`data-astro-cid`. Any ancestor selector built on it compiles to a dead rule.
Scope off classes declared in the component's own markup.

### src/components/Areas.astro — third axis

    areas: chips | zoned | directory

`zoned` needs 2+ entries in the new optional `usage.zones[]`, each NAMED and
holding at least one suburb. Zones are read from the intake and never derived
from suburb names: deciding that Reynella is "southern" is a coverage claim the
client did not make. Suburbs listed but not placed in a zone render last
without a label, never swept into an invented "Other".

`directory` needs 12+ areas collected through areas.mjs, so the homepage index
and /areas cannot disagree about what is covered. A suburb that clears
areaPageState links to /areas/<slug>; one that does not renders as plain text,
never a dead link. This is the first place the per-suburb pages are linked from
anywhere but /areas. Uses CSS column-count rather than a grid, unlike
faqs/open-columns: each entry is one short line with no pair to split across the
gutter, and column flow reads top-to-bottom, which is how an index is scanned.

The axis is on the HOMEPAGE section only. Usage.astro still renders the /areas
list and has no axis — /areas is off by default in PAGE_DEFAULTS, so the
homepage section is the half that ships on a basic build. Consolidating the two
the way faq.astro was consolidated remains open.

### VARIANTS.txt parser trap (found while writing the AREAS block)

check-catalogue parses a variant line as `/^ {2}([a-z][a-z0-9-]*)\s+(?=\[|[A-Z])/`.
A prose line that happens to start with two spaces, a lowercase word and then a
capital letter parses as a variant name and fails the build — "  still
Usage.astro and has…" was read as a variant called `still`. Indent prose
continuations four spaces, or keep the second word lowercase.

### client-intake.skeleton.json

`layoutVariants` gains `story`, `faqs` and `areas`. `usage` gains optional
`zones[]`. `business` gains optional
`insurance` and `memberships[]`. `story` gains `imageAlt`. `faqs.items[]` gains
optional `group`. Two stale comments corrected: `_layoutVariantsNote` claimed
only hero and header had variants and listed a ghost `editorial` hero that has
never existed in CATALOGUE.

### scripts/check-catalogue.mjs

`faqs` added to HEADING_TO_KEY and SECTION_SOURCES. Gate now reports
7 sections / 27 variants, up from 4 / 18.

### Responsive verification

Every variant measured in headless Chromium at 320, 360, 375, 390, 414, 480,
640, 768, 834, 1024, 1180, 1280, 1440 and 1920px, with hostile content (a
68-character licence string, a three-body membership list, a long URL in body
copy), across kits ledger/workshop/coast/press/signal and with the section
inside the dark colour band (13.92:1 contrast, token remap held). Zero
horizontal overflow, zero collapsed frames.

## v3.16.0 — the variant catalogue becomes real

### scripts/check-catalogue.mjs (new, runs first in `build`)

Cross-checks VARIANTS.txt against CATALOGUE against the actual component
branches. Any variant present in some but not all three fails the build.

Why: v3.7 trimmed CATALOGUE from 7 sections / 24 variants to 2 / 7 and
VARIANTS.txt was never updated. For nine releases the reference document
advertised seventeen layouts that could not render, and every intake recorded a
`services: "carousel"` decision the build never made. Three sources of truth
with no gate between them will drift again.

VARIANTS.txt trimmed to reality (268 -> 201 lines). Orphan PREREQS removed:
services/carousel, story/founder, story/stat-bar, story/timeline.

### Services extracted from Hero.astro

The service-card row lived at the bottom of Hero.astro, so `services` had no
variant axis: every client, on every kit, behind every hero, got one identical
row — and it is the largest block on the page. Five variants: **grid-icons**
(default), **ledger**, **split-scroll**, **feature-lead**, **list-detail**.

Ordering is unchanged. TOP_ANCHORS still pins hero then services.

The grid now WRAPS. It used `grid-auto-flow: column`, so five services plus the
CTA card meant six desktop columns at roughly 180px each. Column count comes
from `gridShape()`, sized for services PLUS the CTA card so no row is left with
a hole; on awkward totals the CTA card spans two columns. The subgrid alignment
went with it — it only worked because the grid was a single row.

A real service is never dropped to even up a row, and the CTA card is a grid
item rather than a filler: it is a mid-page conversion point.

### Hero: 4 variants -> 6

Added **docket** (ruled spec panel, no assets), **index** (numbered service
rail, needs 4+ services), **stat-lede** (oversized figure, needs hero.stats).
Deleted **editorial**.

stat-lede absorbs the HeroStats strip, which is suppressed while it is active —
rendering both printed the same numbers twice on one screen.

### whyUs: 1 fixed layout -> 4 variants

**ruled-rows** (default), **icon-grid**, **contrast-pair**, **process-rail**.

All four render inside the dark band. whyUs is the only permanent mid-page
inverted section and the engine relies on it: whyUs and its immediate
neighbours are excluded from BAND_ELIGIBLE. A light whyUs variant would
silently invalidate that for every existing client, so the band engine has to
change in the same commit if one is ever wanted.

ruled-rows drops the ordinals the old layout carried. They implied a sequence
the content does not have — "fixed written quotes" does not come before "site
left clean". Numbering now lives only in process-rail, gated on
`whyUs.type: "process"`, i.e. on content that actually is a sequence. The test
is whether the items can be reordered without losing meaning.

contrast-pair reads `whyUs.pairs[]`, a different shape from items[]. The "them"
column is not derivable from a list of benefits and must never be invented.

### Areas is its own section

The homepage coverage block lived inside Story.astro, so switching story off
silently removed the suburb list — a live local SEO signal on every one of
these sites, and nothing to do with the About copy. New `areas` section reading
the same `usage` block. Intakes listing the legacy `usage` still mount it.

### Fixed-section repairs

- Story cards no longer render `card.emoji`. Emoji as section icons is banned
  by the library's own B6 and was live in the component.
- Story's process strip is suppressed when whyUs renders process-rail. Two
  numbered sequences on one page read as a mistake.
- Testimonials lost `min-h-72`, which forced every card to 288px and left a
  large empty band above the attribution on short reviews (B8). Cards size to
  content; above three, a CSS scroll-snap carousel replaces the uneven 3-col
  row. No library.

### Design library

**B5 deleted.** "Serif display as a default" measured the wrong thing: remove
the serif from the offending pattern and the pattern survives; keep the serif
and change the background, alignment and accent and it is gone.

**B4 widened** from a palette rule to a typeface-agnostic combination rule:
pale-warm background + centred heading block + warm-earth accent. The `press`
kit stays.

### Doc reconciliation

- workflow-cheat-sheet claimed service-area landing pages were removed. Both
  `areas.astro` and `areas/[slug].astro` ship. Same class of stale constraint
  as the Rolldown note.
- Contact endpoint was named as Formspree, Web3Forms and FormSubmit across
  three files. FormSubmit is now stated as the default in all of them.
- New intake keys documented in INTAKE-SPEC.txt and added to the skeleton:
  `services.items[].featured`, `whyUs.type`, `whyUs.pairs[]`,
  `whyUs.themLabel`, `whyUs.usLabel`.
- `hasDecorativeImagery` was specced and NOT built. v3.8 already split hero
  imagery from owned photos — `resolveHeroImage` ignores `hasPhotos` and
  `hero.imageIsStock` records the rest. A fourth flag meaning "image" would
  have been the knob-with-no-reader mistake again.

### /areas had no h1

Pre-existing, at least since v3.15: /services and /faq each emitted an h1 and
/areas emitted none, because it mounts Usage.astro which is written as a
section and hardcoded h2. A page with no h1 is an accessibility and SEO defect,
not a style choice. Usage.astro takes an `as` prop; /areas passes `as="h1"`.

Every real page now has exactly one h1. The /about, /contact and /gallery stubs
have none by design — they are noindex refresh redirects to homepage anchors.

### Pre-existing bugs found by running a real client intake

None of these were introduced by v3.16. All surfaced only when the GreenEdge
intake exercised paths the synthetic test data never touched.

- **llms.txt omitted the Services section for every ordinary client.** It read
  `src/data/services.ts`, which is empty by default and only populated for
  clients warranting full per-service detail pages. The homepage and /services
  read `services.items[]` from the intake; llms.txt did not. The single most
  important fact about a business was missing from the one file models treat as
  ground truth. Now falls back to the intake.
- **The licence number never appeared anywhere.** Both llms.txt and
  HeaderCentered read `site.contact.licence`. Every intake and every skeleton
  stores it at `business.licence`. The path was never populated, so the field
  silently rendered nothing. Now reads business first, contact as fallback.
- **verify-lock treated `_comment` as a section name.** The shipped skeleton
  carries a `_comment` inside `_brief.layoutVariants`, so every client built
  from the skeleton failed the lock check with
  "`layoutVariants._comment` is not a catalogue section".
- **/areas redirected to a dead anchor.** When the page is off it redirects to
  the homepage block, which was `#usage` and is `#areas` from v3.16.
- **Stale variant list inside variants.mjs.** The engine's own docblock still
  listed story/testimonials/footer variants and the wrong whyUs set. The
  catalogue gate reads VARIANTS.txt, not code comments, so it could not catch
  this. Rewritten, and the dead `hasStats`/`hasHistory` prereq helpers removed
  with their unreachable branches.

### Skeleton rebuilt

The shipped skeleton was still the pre-v3.16 file and taught the wrong shape to
every client built from it: `layoutVariants` missing `services` and `whyUs`,
`story.cards[].emoji` still present, no `featured`/`longDescription`/`image` on
service items, no `hero.stats`, `whyUs` as a bare array with nowhere to put
`type` or `pairs`, no `pages` block, no `legal.terms`, and `seo.ogImage`
pointing at a file that does not exist.

A skeleton filled with only a business name, phone, email, palette and legal
dates now builds clean.

### Result

hero 6 x services 5 x whyUs 4 x header 3 = **360 structural combinations**,
from 12. Times 5 kits and 3 surfaces. Across 500 random client seeds the engine
produced 480 distinct configurations.

The shipped intake now builds with **zero warnings**.

## v3.12 — the last unread keys, and two real bugs behind them

**Six intake keys wired.** `usage.eyebrow`, `story.eyebrow`,
`contactSection.eyebrow` and `faqs.eyebrow` now render — four components each
had their own heading block and only some read an eyebrow, so a line every
client fills in went nowhere. `services.heading` / `eyebrow` / `subhead` render
above the service-card row, which previously had **no heading of any kind** and
sat under the hero as an unlabelled grid. `story.cards[].badges` renders as a
chip list. `business.logoMarkText` renders as a short-form wordmark below the
`sm:` breakpoint, for clients whose legal name will not fit a header — the full
name stays in the aria-label.

**Footer contrast.** `text-ondark/60` and `/45` were fixed opacities picked
against one client's brand-dark. On the electrician preset the address line
measured **3.84:1** and on the landscaper preset **4.09:1** — both fail AA. They
now use `--c-ondark-soft`, which is fitted per client, and measure 8.52:1 and
9.53:1 on the same palettes.

**`<meta name="keywords">` removed.** Google stopped using it in 2009 and has
said so publicly; Bing treats stuffing it as a negative signal. Its only real
effect was showing competitors the terms you were targeting. The intake key
stays, because a client's keyword list is useful input for writing copy and
choosing service-area pages — it just does not belong in a tag.

**Two guard fixes.** The unread-key scan cannot follow resolvers that take the
whole `site` object, so `pages.*`, `agency.credit.*` and `legal.*` were being
reported as unread when they are read — a false warning is worse than none,
because it trains you to skim the list, which is how the real ones get missed.

And a new check for the opposite failure: a content block filled in for a
section that is not in `sections`. The scan cannot see this — `story` HAS a
reader, it is simply never mounted — so the client's entire About block, three
cards and a set of credential badges, vanished with nothing reported. That is
exactly what the first Mitchell White intake did.

---

## v3.11 — service-area pages, and a doorway guard

`/areas/[slug]` exists. Local SEO Foundation sells 2-4 service area pages a
quarter and there was no route that produced one; `/areas` rendered a flat list
of suburb names and that was the whole module.

**The route is not a loop over usage.items, deliberately.** Generating a page per
suburb from a template with the name swapped is a doorway site. Google names it,
filters it, and issues manual actions for it — and the Kova terms already say so
to clients in writing. Shipping the exact thing you warned the client about would
be worse than shipping nothing.

**The rule:** a suburb gets a page only when it carries content that could not be
pasted onto the next suburb — an intro of 60+ words, plus at least one anchor: a
job, a 20+ word note about local housing stock, or a review from that suburb with
a source URL. `getStaticPaths` returns only suburbs that pass, so a thin page is
not something you have to remember not to publish; it cannot be built. Everything
else stays a list entry on `/areas`, which is the honest treatment.

**The doorway detector** compares every pair of area-page intros on shared word
bags and fails the build at 70%+ similarity. This is the check that matters,
because two pages can each clear the length and anchor floors and still be the
same paragraph with the name swapped — and that is invisible when you look at
either page on its own. Verified: two intros differing only in suburb name scored
98% and blocked the build; rewriting one to describe actual local conditions
cleared it.

`check-intake` prints the area pages it will build and warns per suburb that has
content but falls short, naming what is missing.

---

## v3.10 — terms that say something

The old terms page was seven fixed paragraphs any free generator produces:
information, quotes, IP, links, liability, governing law, contact. It said
nothing about the trade, and for a tradie the disputes are never about the
website — they are about scope, deposits, variations, access, and what
"prepared properly" meant.

**Two documents, not one.** Conflating them is why these pages end up useless.
*Website terms* govern a visitor browsing and enquiring; they need no facts and
always render. *Terms of trade* govern a customer who books work — and they
cannot be generated, because a deposit percentage or a warranty period the
client did not give you is a term you invented and their customers can hold them
to. So terms of trade are **off by default**, and every clause is gated on a
fact in the intake. A blank field omits its clause; nothing is guessed.

**Trade packs** add what a generic set misses, keyed off `business.trade`:
painter (substrate condition, colour and sheen variation, pre-1970 lead paint),
roofer (concealed defects, height access), electrician (existing wiring and
compliance), plumber (concealed services), tiler (substrates, waterproofing,
batch variation), landscaper (plant establishment, underground services),
concreter (shrinkage cracking, colour variation), carpenter (timber movement).
These are unconditional because they describe limits rather than commercial
commitments — "we don't warrant a substrate we weren't allowed to prepare"
invents nothing on the client's behalf.

Also added: a weather-and-delays clause that defaults on for outdoor trades only,
an ACL clause that leads the general section rather than trailing the liability
one, and a "tell us first" resolution clause — the single most useful sentence in
a trade terms page, because it gives the business the right to inspect and
rectify before a customer escalates.

`legal.terms.extraClauses[]` takes `{heading, body}` for anything specific.
`check-intake` fails the build when terms of trade are enabled with every
commercial field blank, and warns per missing field.

---

## v3.9 — one legal gate

Three files answered "does this legal page exist?" three different ways:

```
privacy.astro   privacy.enabled === false   -> redirect     default ON
terms.astro     terms.enabled !== true      -> redirect     default OFF
config.ts       if (legal.privacy.enabled)  -> push link    truthy
```

So an intake with no `legal` block built a live `/privacy` that nothing linked
to — the orphan page the first Mitchell White build shipped — and an intake with
`enabled: "yes"` satisfied the footer's truthy check while failing terms.astro's
strict `!== true`, producing a footer link to a page that redirects home.

`src/lib/legal.mjs` is now the single gate, used by both pages and the footer.
Anything that is not an explicit `false` counts as enabled, but a page only goes
live once it has the facts that make it valid: privacy needs `entityName`,
`contactEmail` and `lastUpdated`; terms needs `entityName` and `lastUpdated`.
Both fall back to `business.legalName` / `business.name` / `contact.email` before
declaring anything missing. Publishing a policy with `[SET legal.privacy.
entityName]` in the body is worse than not publishing one, so a page short of its
facts redirects and `check-intake` fails the build naming the exact key.

Default-on is deliberate: a live site collecting names, phone numbers and email
addresses through a third-party form endpoint should carry a privacy policy, and
forgetting to set a flag is not a decision to omit one. Switching it explicitly
off now emits a warning rather than passing in silence.

---

## v3.8 — the photo flag split, and the privacy page told the truth

**`features.hasPhotos` no longer gates the hero.** It was one flag doing two
incompatible jobs, which forced a bad trade on every demo: set it true for a
stock hero image and you silently unlocked the gallery, before/after and
recent-jobs sections — all of which present images as *this client's completed
work* — or leave it false and lose the photo hero variants entirely.

The split follows what the page CLAIMS. A hero image is decorative; it sets a
tone, it does not assert authorship, so it renders from `hero.image` alone. The
gallery, before/after, recent jobs and per-service photos still require
`features.hasPhotos`, because a stock photo under an "Our work" heading on a site
carrying the client's ABN is a misrepresentation and it lands on them.
`hero.imageIsStock: true` records the fact and makes `check-intake` keep saying
so on every build. Hero variant prerequisites moved from `images` to `heroImage`.
`check-intake` also now hard-fails when `hero.image` points at a file that isn't
in `public/`.

**The privacy page's collection list was wrong.** It was built from
`contactSection.form.fields`, while `Contact.astro` rendered name, phone and
email unconditionally and gated only suburb, enquiryType and message. Trim the
field list for a client who wants a shorter form and the site published a policy
that understated what it collected — a form still posting an email address to a
third-party endpoint, beside a policy saying it didn't.

Both now read one function, `resolveFormFields`. `name` is always present and at
least one of phone/email is always present, because an enquiry that can't be
answered is worse than a long form — and when the resolver restores them, the
privacy page says so. Verified across four field configurations: form and policy
agree exactly in all of them.

---

## v3.7 — header variants, and the catalogue finally tells the truth

**Three header arrangements**, built on one shared parts file so a fix lands in
all three: `standard` (wordmark left, nav right, phone + CTA hard right),
`centered` (nav split either side of a centred mark, thin utility strip above
carrying the phone and licence), `minimal` (short nav, one filled pill, no
border — pairs with the fullbleed hero, where a hairline would cut across the
photo).

**A mobile conversion bug fixed on the way through.** The old single header hid
BOTH the phone number and the CTA behind `sm:` breakpoints, so at 375px — where
most trade traffic lands — the bar rendered a wordmark and a hamburger, with the
number one tap away inside a menu. `features.stickyPhoneBar` was supposed to
cover that and ships `false`. Every variant now renders a tap-to-call pill below
the breakpoint where the text number drops out. The rule is written into the
switch: **phone and CTA stay reachable at 375px and in the scrolled state, in
every variant.** A variant that can't hold that isn't a variant, it's a
regression.

**CATALOGUE trimmed from 7 sections / 24 variants to 2 / 7.** services, story,
testimonials, whyUs and footer were resolved by the engine, written into every
client intake and validated by verify-lock — and read by nothing. An intake
recording `services: "carousel"` as a decision that was made, against a page that
rendered the same single layout it always had, is a false record. The rule now:
a section enters the catalogue when its variants RENDER, not when they are
designed. The removed names are listed in a comment above the catalogue and in
git history.

**Note:** trimming the catalogue changes the number of draws in the RNG stream,
so kit / surface / order reseed for clients built before this. Nothing that was
rendering changes meaning; the axes that moved were never read.

---

## v3.6 — hero variants (the layout axis finally does something)

`layout.layoutVariants` has been resolved by the engine, written into every
client intake, validated by `verify-lock` and documented across 270 lines of
VARIANTS.txt since v3.0 — and read by nothing. Two clients on the same kit got
different fonts and different colours on a structurally identical page. This is
the axis's first real consumer, and the hero is where it matters, because it is
the only part of the page a visitor reliably looks at.

**Four compositions**, sharing one `HeroCopy` block so they differ in layout
only — duplicating the headline and CTAs per variant is how variants drift until
three of the four are missing whatever was added last.

- `typographic` — no photo. Type carries the page; a palette-derived SVG motif
  holds the right column.
- `split-media` — the original composition, copy left, photo bleeding right.
- `fullbleed` — photo behind, copy over a two-stop scrim in the client's own
  brand-dark. The scrim is not a taste decision: text over a photograph fails
  contrast the moment the photo is bright.
- `editorial` — asymmetric, rule-led, with an oversized rating numeral as the
  anchor. For a trade whose pitch is "5.0 across 20 reviews" that beats a stock
  photo and needs no photography.

**Routing**: the seeded variant wins unless its prerequisite is missing. A photo
variant with no photo falls back to `typographic` rather than rendering the empty
right-hand column that the old single hero produced.

**`src/lib/motif.mjs`** — the "no photos" answer, and the first reader of
`business.trade`. Generates a deterministic SVG motif (swatch / grid / contour /
circuit / strata) painted entirely from palette tokens, so it carries the
client's colours and no literals. Seeded from the business name: the same client
always gets the same artwork, and a rebuild never reshuffles it.

**`HeroStats`** — the strongest single idea in the reference set: four hard
numbers immediately under the fold, before any sales copy. Reads `hero.stats[]`
and nothing else. Nothing derived, nothing rounded up — a fabricated
"200+ projects" on a site carrying a real ABN is an ACCC problem, not a
flourish. No stats in the intake, no strip on the page.

Verified: all four variants render with exactly one `<h1>`; a painter intake with
`hasPhotos: false` routes to `typographic` and gets the swatch motif.

---

## v3.5 — a defined page set

**Default: home + /services + /gallery + /faq**, plus /privacy and /terms.
The contact section stays at the bottom of the home page; `/contact` and
`/about` remain permanent redirects to the homepage anchors, because splitting
the conversion path across two pages costs more leads than it wins. `/areas` is
now **off by default** (`pages.areas: true` to bring it back).

The pages already existed. What did not exist was any relationship between a
page and whether it had anything on it:

- **`/services` rendered from `src/data/services.ts`, which ships empty.** Every
  client got a heading and nothing under it, in the nav and in the sitemap. The
  block every client actually fills — `services.items[]`, including the
  `longDescription` they wrote — fed the homepage cards and nothing else. It now
  builds the page, with rich records from `services.ts` still winning where a
  client warrants them.
- **`/gallery` looped a hardcoded `["gardening","pressure-washing",
  "gutter-cleaning"]`** — the first client's service keys, in a universal
  template — read only the empty `gallery.ts`, and its body copy was the literal
  string *"PLACEHOLDER gallery. These images are placeholders, not completed
  work, and must be replaced before launch."* That was live copy on a production
  page, not a build warning. It now renders the client's real photos and groups
  richer entries by whatever services this client actually has.
- **The nav hardcoded** `services: always has a page` and `usage: always has a
  page`, so every build shipped links to a blank /services and an unwanted
  /areas.

**`src/lib/pages.mjs`** is now the single source of truth. A page ships only if
it is switched on in intake `pages` AND has content; content wins, because
turning a page on cannot conjure photos. A page with nothing on it **redirects
home rather than emitting an empty 200** — a blank 200 is a soft 404 to a crawler
and a dead end to a visitor.

Nav and sitemap both derive from the same resolver. The sitemap also stops
submitting `/about`, `/contact`, `/privacy` and `/terms`, which were being listed
while carrying `noindex` or a redirect — that combination fills Search Console
with "Excluded by noindex" on the first report you show the client.

`check-intake` now prints the page set on every build, and warns when a page is
switched on but empty. A page vanishing because its content is empty is correct
behaviour, but silent correct behaviour is how the first demo went out without a
gallery.

---

## v3.4 — the colour band, and one axis deleted

**`divider` is gone.** It was resolved by the engine, written into every client
intake, validated by `verify-lock`, and documented across four files that
disagreed with each other about its valid values (`brief-presets` recommended
`wave` for painters; `wave` is not in `DIVIDERS`; `DESIGN-LIBRARY` banned wave
dividers outright). No component ever read it. Removed from the engine, the lock
verifier, `pick-variants`, both intakes and six docs. A knob that renders nothing
is worse than no knob: it makes the intake a false record of what was built.

**`bandSection` is wired.** It has been resolved since v3.0 and applied never.
Fixing it turned up why nobody noticed:

- `.band-dark` set `background-color: var(--color-brand-dark)` and then
  redeclared `--color-brand-dark: #ffffff` two lines below. Custom properties
  declared on an element apply to that element's own `var()` lookups, so the band
  resolved to **white on white text**. It had never rendered, so it had never
  been seen.
- The band now paints from `--c-band`, which is derived per client and separate
  from `--c-brand` precisely because the two roles diverge on a dark theme.
- Everything inside the band is a token remap for the subtree: components keep
  using `text-ink` / `bg-card` / `border-border` and get band-appropriate values
  without knowing they are in a band.
- `--c-on-band`, `--c-on-band-card/-soft/-rule` and `--c-on-accent-ondark` are
  all derived and contrast-measured. The muted ink's ALPHA is fitted rather than
  fixed: a flat 0.76 reads fine on a deep navy and fails at 3.79:1 on a bright
  blue.
- `WhyUs` painted from `--c-brand` and would have inverted on a dark theme; it
  now paints from `--c-band` too.

**Eligibility reworked.** `whyUs` is out of `BAND_ELIGIBLE` — it is a permanent
dark band by design, so seeding it changes nothing — and so are its immediate
neighbours in the resolved order, because two dark blocks back to back reads as a
mistake rather than as rhythm. The seeded draw always runs even when a brief
value overrides it, so a brief edit cannot reseed everything after it. The WCAG
luminance gate now applies to explicitly-chosen bands too; previously a
hand-picked band on a pale brand skipped the check entirely.

**Guards extended.** `check-universal` and `check-presets` now measure band text,
band muted ink and the in-band CTA label, compositing translucent inks over their
background first — measuring an `#rrggbbaa` value directly reads the alpha
channel as part of the colour and reports nonsense. 480 contrast pairs across 48
preset/theme/surface combinations, all clear AA.

**Note:** removing the divider draw shifts the RNG stream, so `bandSection`
reseeds for existing clients. Nothing visible changes for sites built before
this, because the band never rendered.

---

## v3.3 — content universality (this pass)

v3.2 fixed colour. This fixes the other half of the same failure: intake blocks
with **no reader**. The Mitchell White demo intake carried six real Google
reviews, six real job photos, hero trust marks, a second CTA and a six-field
contact form. It passed every check and built with exit 0. None of it reached
the page. Nothing failed, so nothing said so.

**Wired up**
- `testimonials` — now read from the intake (bare array OR a block with
  `items[]`), merged with `src/data/testimonials.ts`. Attribution rule preserved
  and moved into `src/lib/content.mjs`: a quote renders only if it resolves to a
  `sourceUrl`, per item or block-level. One block-level line pointing at the
  client's Google reviews covers the whole set.
- `gallery.images[]` — `WorkGallery.astro` previously rendered a heading-less
  section containing one link and no images, whatever the intake said. It now
  renders the client's photos (public paths, fixed aspect boxes so adding photos
  never shifts layout), still gated on `features.hasPhotos`, and self-hides when
  there is nothing real to show.
- `hero.trustMarks[]` and `hero.secondaryCtaLabel/Href`.

**Guard added** — `scripts/check-intake.mjs`, wired into `npm run build`.
It works out which intake paths `src/` actually reads (following alias chains
like `site.contactSection` -> `cs.form` -> `form.submitLabel`), reports any
content key with no reader, and hard-fails on the silent failures:
unsourced testimonials, photos with the photo gate shut, a form block with no
endpoint, a missing `legal` block leaving `/privacy` an orphan, sections with no
component, and analytics provider typos.

Unread keys are warnings, not errors: the scan is good rather than perfect, and
a guard with false positives is a guard you stop reading.

**Removed** — `products`, `stockists`, `ingredients` and the
`showServiceAreas` / `googleMapsEmbed` / `mapEmbedUrl` / `bookingPlatformUrl` /
`areasPage` feature flags. Nothing read any of them. An intake key that does
nothing is a promise the build does not keep.

**Still unread, deliberately left as warnings** (content-shaped, deserves wiring
rather than deletion): `business.trade`, `services.heading`, `usage.eyebrow`,
`story.eyebrow`, `contactSection.eyebrow`, `story.cards[].badges`.

---

## v3.2 — colour universality (this pass)

The v3.1 template was stripped out of a landscaping build, but the colour
FALLBACKS came with it. Because they were fallbacks they never showed up in
review; they only fired when an intake left those keys empty, which is exactly
what the skeleton told you to do.

**What was leaking**
- `Layout.astro` set `--c-forest-secondary-ink` to `#0F3E22` unconditionally,
  which made the `|| shade(brand)` on the next line unreachable. Result:
  `--c-brand-700` was that green on **every** client. It paints the hero
  location line, and `text-forest-secondary-ink` paints the hero heading tail.
- Light-theme neutrals fell back to `#f6efe6` paper and `#14532d` ink.
- `@theme` in `global.css` carried ten more of them, plus `--color-ondark:
  #f0fdf4` with no var at all — a green-tinted white on every footer.
- `surface: "warm"` was `#f4f7f2`, a green-grey, so every "warm" client
  looked landscaped.
- `BeforeAfter.astro` placeholder frames, `WhyUs.astro` band ink
  (`rgb(240 253 244 / 0.12)`, invisible to any hex scan), `Header.astro`
  scrolled bar, five `Story.astro` fallbacks.
- `GalleryEntries.astro` keyed its placeholder tone off three landscaping
  service names, so every other trade got `background-color:undefined`, and an
  empty `galleryServiceNames` rendered the literal string `undefined` as the
  section eyebrow.

**What replaced it**
- `src/lib/palette.mjs` — the palette as a pure, testable function. Every colour
  is either stated in the intake or derived from `brand`/`accent`. The only
  literals are four achromatic anchors.
- Text colours are **fitted** to the background the surface treatment actually
  produced, and against both the page and the alternating band, so `muted` and
  the dark-theme heading colour hold AA on any brand.
- `--c-on-accent` / `--c-on-highlight` / `--c-on-band` are chosen by measured
  contrast. The 11 CTAs that hardcoded `text-white` now use `text-on-accent`.
  On the painter preset accent that is a move from ~3.3:1 to 5.26:1.
- `--c-band` is separate from `--c-brand` because the roles diverge on a dark
  theme (`--c-brand` is a text colour in 83 places and a background in one).
- `--c-surface-alt` is now guaranteed to differ from `--c-bg`, so `bg="tint"`
  sections are visible. They were previously aliased to the same value.
- Dark theme now resolves correctly instead of rendering dark-on-dark.

**Guards added** (both wired into `npm run build`)
- `scripts/check-universal.mjs` — fails on any non-achromatic hex, `rgb()` or
  var-fallback in `src/`, and on any AA failure in this client's palette.
  `--report` prints the resolved palette and the contrast table.
- `scripts/check-presets.mjs` — all 8 trade presets x 2 themes x 3 surfaces,
  336 contrast pairs. Currently all pass.

**Also**
- Default intake reduced to the three required colours so the default build
  exercises the derivation path every client uses. That it did not is why this
  survived.
- `brief-presets.txt` painter + landscaper `divider: wave` -> `contour`
  (`wave` is not in `DIVIDERS` and fails `verify:lock`). `VARIANTS.txt`
  documented `wave` as valid two lines above the override line saying `contour`.

---

What changed when GreenEdge was stripped to the universal template. Every build
below was verified with `npm run build` (exit 0, 10 pages) on this exact tree.

## Stripped (client particulars removed)
- **Data layer emptied:** `src/data/services.ts`, `recent-jobs.ts`, `gallery.ts`
  now export `[]` (types + helpers kept). `testimonials.ts` was already empty.
  `GalleryService` generalised from the landscaping union to `string`.
- **Hero rewritten** (`src/components/Hero.astro`) to be config-driven: service
  cards read `services.items[]` from the intake (not three hardcoded slugs);
  the "$180", "Serving Newton and eastern Adelaide", and `FACTS-greenedge.md`
  references are gone; the photo is optional (brand panel when none).
- **Genericised hardcoded copy** in `Story`, `RecentJobs`, `RecentJobsDemoNotice`,
  `WhyUs` (trust strip now config-driven, `whyUs.trust[]`), `Usage`, `Contact`
  (email subject + placeholder + FAQ line), and pages `services/areas/faq/gallery/[slug]`
  (removed `|| "GreenEdge"` fallbacks and landscaping descriptions).
- **Removed files:** `DESIGN.md`, `HANDOFF.txt`, `PRODUCT.md`,
  `content/FACTS-greenedge.md`, `tmp-contrast.txt`, all `scripts/tmp-*`,
  `scripts/generate-gallery-placeholders.mjs`, all GreenEdge images in
  `public/` and `src/assets/`.
- **Intake:** `client-intake.json` replaced with a **neutral, buildable default**
  (generic trade business, `coast` kit, slate/blue palette). `client-intake.skeleton.json`
  extended with the new knobs + legal/analytics blocks.
- `favicon.png` replaced with a neutral placeholder (replace per client).

## Added — legal (your request)
- **Privacy policy** (`/privacy`) — genericised, provider-aware (Plausible / GA4 /
  Umami / form provider auto-detected), adds a cookies clause when consent is required.
- **Terms of service** (`/terms`, new) — plain-language website terms of use,
  config-driven, gated on `legal.terms.enabled`.
- **Optional consent banner** (`ConsentBanner.astro`, new) — shows **only** when
  required: `legal.consent.enabled` is `"auto"` (default → only for cookie-based
  analytics like GA4), `true` (always), or `false` (never). Cookieless analytics
  (Plausible/Umami) never trigger it. Implements **Google Consent Mode v2**:
  GA4 storage defaults to *denied* until the visitor accepts.
- **Footer legal links** — `config.ts` exposes `legalLinks`; the footer renders a
  Privacy / Terms row, each link appearing only when that policy is enabled.
- Verified: GA4 → banner + `defaultConsent="denied"`; `consent:false` → no banner.

## Fixed — latent font bug (judgment call, flagged)
Before this, only the fonts hardcoded in `astro.config.mjs` (Archivo + Source
Sans 3) ever loaded; `global.css` read `--font-display`/`--font-body` (the Fonts
API vars), **not** the `--kit-font-*` vars the kits declared. So any kit other
than `coast` silently rendered the wrong typeface. Fix: `astro.config.mjs` now
derives the loaded families from the resolved kit (`KIT_FONT_FACES` in
`variants.mjs`), and the dead `--kit-font-*` declarations were removed from
`global.css`. Verified end-to-end on the `coast` path; other kits are correct by
construction but fetch their family from Fontsource at build (needs network once;
this sandbox blocks `api.fontsource.org`, so only `coast` was build-tested here).

## Also corrected
- Stale docs: `divider: wave` → `contour` (the real engine value; `wave` fails
  `verify:lock`) in `CURSOR-CONTEXT/VARIANTS/INTAKE-SPEC`; `Astro 5` → `Astro 7`
  in the cheat-sheet. `README.md` rewritten for the universal v3.
- `.impeccable/config.json` seeded with the three standing false-positive ignores
  from IMPECCABLE-RETRO (confirm the key schema against your impeccable version —
  see `.impeccable/README.txt`).
- `DESIGN-LIBRARY.txt` added so the template is self-contained.

## Stack note
This build is **Astro 7.1.3 + Rolldown/Vite**, not Astro 5. `node_modules` is not
shipped — run `npm install` (the vendored one was Windows-only; the lockfile is
unchanged and correct).
