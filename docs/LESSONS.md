# Lessons — things that already went wrong, and the rule each one produced

Each entry: what happened → root cause → the rule now in force (and where it is
enforced). Add to this file whenever a mistake costs more than an hour. Newest
first within each group.

## Process and repos

- **Layout faults no gate measured (Oct 2026).** The Kova site went live with a
  short pricing card whose button sat far below its copy, a two-column block
  with one side mostly empty, and a pricing table row that lost its name cell
  for anyone running an ad blocker, because the cell had `id="google-ads"`
  (EasyList hides it). Every build gate and impeccable passed; Jordan found
  them on his own laptop at 90% zoom. → `scripts/check-layout.mjs` (v3.33)
  measures the built pages at ten widths from 360 to 1920 and fails on side
  scrolling, column-gap, table-space, table-cells and ad-block names. `npm run
  qa` runs it, so `/verify`, the demo pipeline's qa stage and every skill that
  calls qa get it. Its first run on this template's own demo flagged the docket
  hero with only three spec rows.

- **A&J's first repo drifted beyond repair.** A Cursor session asked to add one
  image touched ~34 files, including the shared variant engine. Nothing reached
  the template; the repo was rebuilt as AandJ-v2 from the AJM codebase.
  → Shared code edited in a client repo is a template change: announce it, then
  port it back or revert it. `npm run template:status` makes drift visible
  (docs/SYNC.md). Scope every prompt tightly; review the file list before accepting.
- **`api/quote.js` exists in A&J (via AJM) but not in the template**, although
  the template's `privacy.mjs` already describes it as the first-party endpoint.
  Found by the first `template:status` run (Sep 2026). → Exactly the class of drift
  the sync exists to catch; see BACKLOG `port-api-quote`.
- **Zip-file handoffs lost track of versions**: it was unclear whether client
  changes were already in the latest template. → Git only. Template = one repo, tagged releases;
  clients pull by tag.
- **Syncing a project through Google Drive broke node_modules** (partial syncs of
  thousands of small files, platform binaries). → Code lives in git; Drive is for
  documents. Never sync `node_modules`.
- **CRLF drift produced full-file diffs** between Windows and Linux copies.
  → `.gitattributes` forces LF; after adding it to an old repo, run
  `git add --renormalize .` as its own commit.
- **The Mitchell White intake was copied from Chelli's**, inheriting five dead
  keys (`products`, `stockists`, …) that warned on a painter's build.
  → New intakes start from the skeleton only: `npm run new-client`.

## Dependencies

- **v3.20 lockfile pinned astro 7.1.3 with 8 vulnerabilities (1 critical)**;
  `npm ci` in a client then needed a round of manual updates.
  → Dependencies are updated only in the template (README "Dependencies"),
  released, and reach clients as package.json + package-lock.json via
  `template:pull`. Clients run `npm ci` only.
- **`npm audit fix --force` jumps majors** and has broken the build before.
  → Never run it. Majors one at a time, release notes first.

## Build and fonts

- **The Fontsource remote provider failed a fetch and shipped system fonts with
  a green build.** → Fonts vendored from `@fontsource/*` with the local provider
  (v3.20); `check-fonts` fails the build if the kit's faces aren't in dist/.
- **Vite 8 emitted `@media (width>=40rem)` range syntax**, which older
  Safari/Chrome ignore, dropping every breakpoint. → `vite.build.cssTarget` is
  pinned in astro.config.mjs; do not remove it.
- **Colour leaked from the first client** (unset tokens fell back to its cream
  and forest green). → Three-colour palette engine; `check-universal` fails on any
  colour literal in shared code.

## Images and performance

- **A 5.3 MB hero JPEG in `public/` was served byte-for-byte, eager, on every
  homepage view** (phone LCP 7.3 s). → Intake images go in `src/assets/` at the
  same path and render through `Img` (srcset WebP). After the fix: 0.76 s.
  `check-intake` warns on public images over 400 KB.
- **Service panel images loaded only on click** in the index layout: lazy images
  inside `display:none` are never fetched. → Warm a panel's images on
  hover/focus/touch; Layout flips all lazy images to eager on idle after load
  (skipped under Save-Data).
- **Re-encoding already-lossy WebPs compounded artefacts.** → Always encode from
  the original camera file.
- **Centre crops lost the subject** (the Clarence Gardens 2:1 crop showed only
  gravel). → Check every crop visually; set the focal point per image.
- **Phone photos carry EXIF rotation and GPS.** → Bake orientation, strip all
  metadata before committing.

## impeccable / QA

- **The static engine (`impeccable detect dist`) reported ~70 false
  cramped-padding findings per site**: jsdom can't resolve Tailwind v4's
  `calc(var(--spacing) * n)` and reads 0px. → The verdict is `npm run qa`
  (real browser). Never change padding because the static pass says so.
- **`.impeccable/config.json` ignores never applied**: the file used a flat
  `ignoreRules` array; impeccable reads `detector.ignoreValues`
  (`{rule, value, files, reason}`). Wrong keys are silently ignored.
- **Signal/press legal pages failed line-length at `68ch`**: `ch` in Inter is wide
  (~680 px). → Measures in `em` (running text capped at 40em).
- **Eyebrow labels tripped three rules** (11–12 px tracked caps = kicker, chip,
  all-caps body). → Eyebrows are optional, sentence case, 15 px, untracked; kits
  vary colour/weight/style only.
- **Rule gates worth knowing** (impeccable 3.6.1): oversized-h1 = ≥72 px AND ≥40
  chars AND ≥28vh; line-length = width/(font-size×0.5) > 85; tight-leading
  < 1.3 on >50 chars of non-heading text; cream = warm light colour with
  r−b between 6 and 48; shape-assembled-illustration = ≥8 primitives, ≥3 fills,
  ≥200 px.
- **impeccable needs Node ≥ 22.18** (the site needs 22.12). Check `node -v` first.
- **Headless Chrome as root needs `--no-sandbox`** (cloud/CI containers only).
- **`npm run qa` passed a build that never happened.** A client's `npm ci`
  failed, so `astro build` could not run; `qa` then scanned the previous
  `dist/` and printed "0 findings". → `qa` exits 1 before starting Chrome when
  `dist/index.html` is missing or older than `src/`, the intake,
  `package-lock.json` or `astro.config.mjs` (scripts/qa.mjs). A green qa line
  now means "this code", not "some build".
- **Why that `npm ci` failed: a leftover `astro preview` was still running**
  and held a native binary in `node_modules` open, so `npm ci` stopped half-way
  through deleting `node_modules` and left it unusable. → Stop every preview
  and dev server before `npm ci`. If an install dies part-way, close them and
  run `npm ci` again; do not build on a half-deleted `node_modules`.

## Content and SEO

- Never invent testimonials, stats, licences, ABNs, suburbs or review counts —
  explicit TODOs instead. `check-service-prices` blocks placeholders on
  production builds.
- `features.hasPhotos` is true only when the files exist on disk.
- Every heading is intake content carrying a real keyword; slugs carry the
  target keyword (INTAKE-SPEC §10). No filler headings.
- Never emit JSON-LD for content that isn't on the page (FAQPage only where FAQs
  render).
- Footer credit anchor text varies per client on purpose (Google link-spam
  footprint); don't "tidy" it into one string.

## Working with AI tools

- **Claims about tool behaviour must be verified** before they go in a doc (an
  unverified "editor hook runs on changed files" line was removed from
  CURSOR-CONTEXT). If a doc says a tool does X, it was tested or it cites the docs.
- **Critique output is advice, not orders.** impeccable/skill suggestions never
  override CURSOR-CONTEXT, DESIGN-LIBRARY or the intake.
- **One change at a time with a review gate** beats large multi-file prompts:
  the A&J drift happened in a single oversized session.
