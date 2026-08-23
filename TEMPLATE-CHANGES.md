# Universal template — regeneration notes

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
