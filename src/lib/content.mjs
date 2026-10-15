/**
 * content.mjs — normalises the CONTENT blocks of client-intake.json into the
 * shapes components render, and enforces the sourcing rules in one place.
 *
 * WHY THIS FILE EXISTS
 * Several blocks in the intake had no reader. A client intake could carry six
 * real Google reviews, six real job photos and a full set of hero trust marks,
 * pass every check, build with exit 0 — and put none of it on the page. Nothing
 * failed, so nothing told you. The demo just quietly shipped without the single
 * strongest asset the business had.
 *
 * Two rules survive from the old data-file approach and are enforced here
 * instead, because the rule matters and the file location doesn't:
 *
 *   1. TESTIMONIALS MUST BE ATTRIBUTABLE. A quote renders only if it resolves
 *      to a sourceUrl — per item, or a block-level one (your Google Business
 *      Profile reviews link covers the whole set). Unsourced quotes are dropped
 *      and reported, never invented and left live.
 *   2. PHOTOS MUST BE REAL — where the page CLAIMS they are the client's work.
 *      features.hasPhotos gates the gallery, before/after and recent jobs: those
 *      sections present images as completed jobs, and a stock photo under an
 *      "Our work" heading on a site carrying the client's ABN is a
 *      misrepresentation and their exposure, not yours.
 *      The HERO is different. A hero image is decorative — it sets a tone, it
 *      does not assert authorship — so it renders from hero.image alone and is
 *      NOT gated on hasPhotos. That split is what lets a demo ship with a
 *      licensed stock hero while the gallery stays honestly empty.
 *
 * Pure JS so the Node check scripts and Astro share one implementation.
 */

const str = (v) => (typeof v === "string" ? v.trim() : "");
const arr = (v) => (Array.isArray(v) ? v : []);

/* ── testimonials ───────────────────────────────────────────────────────── */

/**
 * Accepts either shape the intake has used:
 *   testimonials: [ { name|firstName, location|suburb, quote, sourceUrl? } ]
 *   testimonials: { sourceUrl?, heading?, eyebrow?, items: [ ... ] }
 * plus anything already in src/data/testimonials.ts, which wins on shape.
 *
 * @returns {{ items: Array, dropped: Array, heading: string, eyebrow: string }}
 */
export function resolveTestimonials(site = {}, fromDataFile = []) {
  const block = site.testimonials;
  const isBlock = block && !Array.isArray(block);
  const raw = isBlock ? arr(block.items) : arr(block);
  const blockSource = isBlock ? str(block.sourceUrl) : "";

  const items = [];
  const dropped = [];

  for (const t of raw) {
    if (!t || typeof t !== "object") continue;
    const quote = str(t.quote);
    if (!quote) continue;
    const name = str(t.firstName) || str(t.name);
    const sourceUrl = str(t.sourceUrl) || blockSource;
    if (!sourceUrl) {
      dropped.push(name || quote.slice(0, 40));
      continue;
    }
    const sourceLabel = str(t.source) || (isBlock ? str(block.source) : "") || "";
    items.push({
      name,
      /* suburb/location and service are optional — the caption omits whatever
         is missing rather than printing "undefined ·". */
      meta: [str(t.suburb) || str(t.location), str(t.service)].filter(Boolean).join(" · "),
      quote,
      sourceUrl,
      sourceLabel,
      /* v3.28 review cards. rating and date render ONLY when the intake
         states them: a star row is a claim about what the reviewer gave, and
         a Facebook recommendation has no stars to show. */
      rating: reviewStars(t.rating),
      date: str(t.date),
      platform: reviewPlatform(sourceLabel, sourceUrl),
    });
  }

  /* Records already in src/data/testimonials.ts keep working unchanged. */
  for (const t of arr(fromDataFile)) {
    const quote = str(t.quote);
    const sourceUrl = str(t.sourceUrl);
    if (!quote) continue;
    if (!sourceUrl) {
      dropped.push(str(t.firstName) || quote.slice(0, 40));
      continue;
    }
    items.push({
      name: str(t.firstName),
      meta: [str(t.suburb), str(t.service)].filter(Boolean).join(" · "),
      quote,
      sourceUrl,
      sourceLabel: "",
      rating: reviewStars(t.rating),
      date: str(t.date),
      platform: reviewPlatform("", sourceUrl),
    });
  }

  /* Block-level summary: where the reviews live and, ONLY if the intake
     states it, the profile's own score and review count. Never computed from
     the items shown — six excerpts on a page are not the business's rating. */
  const blockRating = isBlock && block.rating && typeof block.rating === "object" ? block.rating : {};
  const count = Number(blockRating.count);

  return {
    items,
    dropped,
    heading: (isBlock && str(block.heading)) || "What clients say",
    eyebrow: (isBlock && str(block.eyebrow)) || "",
    subhead: (isBlock && str(block.subhead)) || "",
    sourceUrl: blockSource,
    platform: reviewPlatform(isBlock ? str(block.source) : "", blockSource),
    rating: {
      score: reviewStars(blockRating.score),
      count: Number.isInteger(count) && count > 0 ? count : 0,
    },
  };
}

/* A rating is 1-5 or it is nothing. Anything else (0, 11, "five", empty) is
   treated as not stated, so a typo can never print a wrong number of stars. */
export function reviewStars(value) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 1 && n <= 5 ? Math.round(n * 10) / 10 : 0;
}

/* Which review platform a source belongs to, read from its label and URL.
   Only the two a trade actually collects reviews on; anything else gets no
   platform mark rather than a guessed one. */
export function reviewPlatform(label, url) {
  const s = `${label || ""} ${url || ""}`.toLowerCase();
  const has = (...needles) => needles.some((n) => s.includes(n));
  if (has("facebook", "fb.com", "fb.me")) return "facebook";
  if (has("google", "g.page", "goo.gl", "maps.app")) return "google";
  return "";
}

/* ── gallery ────────────────────────────────────────────────────────────── */

/**
 * Flat photo list from the intake (`gallery.images[]`, public/ paths — what a
 * client actually sends you), kept separate from the richer before/after
 * entries in src/data/gallery.ts, which use the astro:assets pipeline.
 *
 * Gated on features.hasPhotos so a half-filled intake can never render a
 * broken-image grid.
 */
export function resolveGalleryImages(site = {}) {
  if (site.features?.hasPhotos !== true) return [];
  return arr(site.gallery?.images)
    .map((img) => ({
      src: str(img?.src),
      alt: str(img?.alt),
    }))
    .filter((img) => img.src);
}

/** Copy for the gallery section, independent of which source the photos came from. */
export function galleryCopy(site = {}) {
  const g = site.gallery || {};
  return {
    eyebrow: str(g.eyebrow),
    heading: str(g.heading) || "Our work",
    subhead: str(g.subhead),
  };
}

/* ── hero ───────────────────────────────────────────────────────────────── */

/**
 * Short factual chips under the hero CTA row (rating, review count,
 * owner-operated, free quotes). Same discipline as whyUs.trust: SHORT, real,
 * never fabricated — the intake is the only source, and an empty array omits
 * the row entirely.
 */
export function resolveTrustMarks(site = {}) {
  return arr(site.hero?.trustMarks).map(str).filter(Boolean).slice(0, 5);
}

/** Optional secondary hero CTA. Renders only when both label and href exist. */
export function resolveSecondaryCta(site = {}) {
  const h = site.hero || {};
  const label = str(h.secondaryCtaLabel);
  const href = str(h.secondaryCtaHref);
  return label && href ? { label, href } : null;
}

/* ── story cards ────────────────────────────────────────────────────────── */

/**
 * story.cards[] accepts two card types:
 *   { title, emoji?, description }            -> a normal card
 *   { title, type: "badges", badges: [...] }  -> a chip list
 * Anything else is passed through as a normal card so an unknown type degrades
 * to readable text rather than disappearing.
 */
export function resolveStoryCards(site = {}) {
  return arr(site.story?.cards)
    .filter((c) => c && typeof c === "object" && (str(c.title) || str(c.description)))
    .map((c) => ({
      title: str(c.title),
      emoji: str(c.emoji),
      description: str(c.description),
      badges: c.type === "badges" ? arr(c.badges).map(str).filter(Boolean) : [],
    }));
}


/* ── hero imagery ───────────────────────────────────────────────────────── */

/**
 * The hero image renders whenever one is set, INDEPENDENT of features.hasPhotos.
 *
 * Those were one flag until v3.8, which forced a bad trade on every demo: either
 * set hasPhotos true for a stock hero and silently unlock the gallery,
 * before/after and recent-jobs sections — all of which present images as this
 * client's completed work — or lose the photo hero variants entirely and ship
 * the typographic one whether it suited the brand or not.
 */
export function resolveHeroImage(site = {}) {
  const src = str(site.hero?.image);
  if (!src) return null;
  return {
    src,
    alt: str(site.hero?.imageAlt) || str(site.business?.name),
    /* Recorded so check-intake can keep reminding you before go-live. Stock is
       fine for a demo and fine in a hero forever; it is not fine anywhere the
       page says "our work". */
    isStock: site.hero?.imageIsStock === true,
  };
}

/**
 * Images that assert the client did the work. Gallery, before/after, recent
 * jobs, per-service photos. Stock must never reach these.
 */
export function hasOwnedPhotos(site = {}) {
  return site.features?.hasPhotos === true;
}


/* ── contact form fields ────────────────────────────────────────────────── */

export const FORM_FIELD_LABELS = {
  name: "name",
  phone: "phone number",
  email: "email address",
  suburb: "suburb",
  enquiryType: "enquiry type",
  message: "message",
};

const DEFAULT_FORM_FIELDS = ["name", "phone", "email", "message"];

/**
 * resolveFormFields(site) -> string[]  — the fields the form ACTUALLY renders.
 *
 * WHY THIS EXISTS
 * The privacy page built its "information we collect" list from
 * contactSection.form.fields, while Contact.astro rendered name, phone and email
 * unconditionally and gated only suburb, enquiryType and message. Trim the field
 * list for a client who wants a shorter form and the privacy policy quietly
 * understated what the site collected — a form still posting an email address to
 * a third-party endpoint, next to a published policy saying it didn't.
 *
 * Of everything on a legal page, the collection list is the part that has to be
 * true. So both the form and the policy now read this one function.
 *
 * `name` is always present: an enquiry with no name cannot be answered. At least
 * one of phone/email is always present for the same reason — if a config lists
 * neither, both are restored rather than shipping an unanswerable form.
 */
export function resolveFormFields(site = {}) {
  const configured = arr(site.contactSection?.form?.fields).map(str).filter(Boolean);
  const requested = configured.length ? configured : DEFAULT_FORM_FIELDS;

  const out = ["name"];
  for (const key of ["phone", "email", "suburb", "enquiryType", "message"]) {
    if (requested.includes(key)) out.push(key);
  }
  if (!out.includes("phone") && !out.includes("email")) out.push("phone", "email");
  return out;
}


/* ── services ───────────────────────────────────────────────────────────── */

/**
 * Normalises `services` into the shape every services variant renders.
 *
 * Until v3.16 there was no Services component: the card row lived inside
 * Hero.astro, so `services` had no variant axis and every client on every kit
 * got the identical single row. Extracting it is what makes the section
 * addressable by the engine, the intake and the catalogue gate.
 *
 * `featured` marks the one service that leads in the feature-lead variant.
 * First `true` wins; absent, the first item leads. Trades almost always have
 * one service that pays the bills and several that fill gaps, and a layout
 * that pretends otherwise is a layout that ignores the business.
 *
 * Per-service imagery asserts the client did that work, so it is gated on
 * hasOwnedPhotos — not on the presence of a path, which proves nothing.
 */
/* HOMEPAGE CAP. The landing page shows a SHORTLIST, never the full catalogue.
   A&J shipped 18 services in a card grid: eighteen numbered cards, six rows
   deep, on the page whose job is to get someone to call. Nobody reads card
   fourteen, and a visitor scrolling past six rows of near-identical cards has
   already decided the page is a directory rather than a pitch.

   Six is the ceiling, four the floor for the grid to look deliberate. WHICH
   six is the client's call via `featured: true`; HOW MANY is the template's,
   because "show everything" is never the right answer on a landing page and
   no client will trim their own list.

   /services is the catalogue and is deliberately uncapped — that page exists
   precisely so the landing page does not have to carry all of it. */
export const HOMEPAGE_SERVICE_CAP = 6;

/**
 * @param {object} site
 * @param {{ limit?: number }} [opts] — pass { limit: HOMEPAGE_SERVICE_CAP }
 *   from the homepage section. Omit on /services to get the full catalogue.
 */
/* ------------------------------------------------------------------ */
/* LocalBusiness JSON-LD — resolveBusinessSchema (v3.20)               */
/* ------------------------------------------------------------------ */

/* schema.org types a trade business can declare. business.schemaType must be
   one of these; anything else falls back to LocalBusiness (check-intake warns).
   A trade with no specific type (landscaper, concreter, tiler, fencer) uses
   HomeAndConstructionBusiness or GeneralContractor. */
export const SCHEMA_TYPES = [
  "LocalBusiness", "HomeAndConstructionBusiness", "GeneralContractor",
  "Electrician", "Plumber", "RoofingContractor", "HousePainter", "HVACBusiness",
  "Locksmith", "MovingCompany", "AutomotiveBusiness", "AutoRepair", "ProfessionalService",
];

const DAY_NAMES = { mo: "Monday", tu: "Tuesday", we: "Wednesday", th: "Thursday", fr: "Friday", sa: "Saturday", su: "Sunday" };
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Australian number -> E.164 ("0419 313 985" -> "+61419313985"). */
export function toE164AU(phone) {
  const d = str(phone).replace(/\D/g, "");
  if (!d) return "";
  if (d.startsWith("61")) return `+${d}`;
  if (d.startsWith("0") && d.length === 10) return `+61${d.slice(1)}`;
  if (d.startsWith("1") && (d.length === 6 || d.length === 10)) return `+61${d}`; // 13xxxx / 1300 / 1800
  return str(phone);
}

/** contact.openingHoursSpec[] -> OpeningHoursSpecification[]; invalid rows dropped. */
export function resolveOpeningHours(site = {}) {
  return arr(site.contact?.openingHoursSpec)
    .map((r) => {
      const days = arr(r?.days).map((d) => DAY_NAMES[str(d).slice(0, 2).toLowerCase()]).filter(Boolean);
      const opens = str(r?.opens), closes = str(r?.closes);
      if (!days.length || !HHMM.test(opens) || !HHMM.test(closes)) return null;
      return { "@type": "OpeningHoursSpecification", dayOfWeek: days, opens, closes };
    })
    .filter(Boolean);
}

/**
 * The LocalBusiness object Layout.astro prints. Everything is sourced from the
 * intake; a field with no value is omitted, never guessed.
 *   @type        business.schemaType (SCHEMA_TYPES) — default LocalBusiness
 *   telephone    contact.phone in E.164
 *   sameAs       contact.facebook / instagram / tiktok / linkedin,
 *                business.googleBusinessUrl (the GBP share link)
 *   image/logo   the share image and business.logo (absolute URLs)
 *   openingHoursSpecification   contact.openingHoursSpec[]
 *   hasOfferCatalog             every services.items[] entry, linked to
 *                               /services#<anchor> when that page is built
 */
export function resolveBusinessSchema(site = {}, opts = {}) {
  const b = site.business || {};
  const c = site.contact || {};
  const type = SCHEMA_TYPES.includes(str(b.schemaType)) ? str(b.schemaType) : "LocalBusiness";
  const out = {
    "@context": "https://schema.org",
    "@type": type,
    name: str(b.name),
    description: str(b.shortDescription) || str(b.tagline),
    url: str(opts.siteUrl),
  };
  const tel = toE164AU(c.phone);
  if (tel) out.telephone = tel;
  if (str(c.email)) out.email = str(c.email);
  if (str(b.established)) out.foundingDate = str(b.established);
  if (str(opts.imageUrl)) out.image = str(opts.imageUrl);
  if (str(opts.logoUrl)) out.logo = str(opts.logoUrl);
  const sameAs = [c.facebook, c.instagram, c.tiktok, c.linkedin, b.googleBusinessUrl]
    .map(str).filter((u) => /^https?:\/\//i.test(u));
  if (sameAs.length) out.sameAs = [...new Set(sameAs)];
  const hours = resolveOpeningHours(site);
  if (hours.length) out.openingHoursSpecification = hours;
  const items = resolveServicesPage(site).items;
  if (items.length) {
    const base = str(opts.servicesUrl).replace(/\/$/, "");
    out.hasOfferCatalog = {
      "@type": "OfferCatalog",
      name: `${str(b.name)} services`.trim(),
      itemListElement: items.map((it) => ({
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: it.title,
          ...(it.description ? { description: it.description } : {}),
          ...(base ? { url: `${base}#${it.anchor}` } : {}),
        },
      })),
    };
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* /services PAGE — resolveServicesPage (v3.19)                        */
/* ------------------------------------------------------------------ */

/** Lower-case a service name for use mid-sentence, keeping acronyms ("UST",
 *  "(UST)", "CCTV") as written. "Get a quote for underground storage tank
 *  (ust) removal" is the bug this exists to prevent. */
export const midSentence = (s) =>
  String(s || "").split(" ").map((w) => (/^[(\[]?[A-Z0-9]{2,}[)\],.]?$/.test(w) ? w : w.toLowerCase())).join(" ");

/** URL-fragment slug. Same rule everywhere so a link and its target agree. */
export const slugifyAnchor = (s) =>
  String(s || "").toLowerCase().trim().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/**
 * Detail pages built from the intake: one /services/<slug> page for every
 * `services.items[]` entry that sets `slug`.
 *
 * Only when src/data/services.ts is EMPTY. Rich records own those routes when
 * a client has them, and they replace the intake list everywhere, so mixing
 * the two would hide every service without a record. This path gives one
 * service a page of its own while the rest stay intake cards.
 *
 * Before/after sliders for the page are `beforeAfter.items[]` whose `service`
 * equals the slug. The homepage beforeAfter section still renders every item.
 */
export function resolveServiceDetailPages(site = {}, records = []) {
  if (arr(records).length) return [];
  const pairs = arr(site.beforeAfter?.items).filter((b) => b && typeof b === "object");
  const seen = new Set();
  return arr(site.services?.items)
    .filter((it) => it && typeof it === "object" && str(it.slug) && str(it.title))
    .map((it) => {
      const slug = slugifyAnchor(it.slug);
      return {
        slug,
        name: str(it.title),
        heading: str(it.pageHeading) || str(it.title),
        shortLine: str(it.description),
        longDescription: str(it.longDescription),
        includes: arr(it.includes).map(str).filter(Boolean),
        price: str(it.price),
        seoTitle: str(it.seoTitle),
        seoDescription: str(it.seoDescription),
        beforeAfterHeading: str(it.beforeAfterHeading),
        beforeAfterSubhead: str(it.beforeAfterSubhead),
        beforeAfter: pairs.filter((b) => slugifyAnchor(str(b.service)) === slug),
      };
    })
    .filter((p) => p.slug && !seen.has(p.slug) && seen.add(p.slug));
}

/**
 * The /services page model, shared by all four servicesPage variants.
 *
 * GROUPS ARE OPTIONAL AND INTAKE-DRIVEN. `services.groups[]` defines them
 * ({ id, heading, intro, image, imageAlt }) and each item opts in with
 * `group: "<id>"`. The group heading IS the page H2, so renaming a group in
 * the intake renames the heading — nothing is hardcoded per trade. An item
 * whose group is blank or unknown is never swept into an invented "Other"
 * bucket: it lands in `ungrouped`, which variants render last WITHOUT a
 * label (same rule as faqs/grouped and story credentials).
 *
 * ANCHORS. Each service gets a URL fragment: `items[].anchor` if set (write
 * it as the search phrase, e.g. "core-drilling-adelaide"), else the title
 * slugified. Duplicates get -2, -3 so every anchor on the page is unique.
 * These are the deep links for ads, GBP posts and texts: /services#<anchor>.
 */
export function resolveServicesPage(site = {}, records = []) {
  const block = site.services || {};
  const owned = hasOwnedPhotos(site);
  const page = block.page && typeof block.page === "object" ? block.page : {};

  const raw = arr(records).length
    ? arr(records).map((r) => ({
        title: str(r.name), description: str(r.shortLine), longDescription: str(r.longDescription),
        includes: arr(r.inclusions).map(str).filter(Boolean), price: str(r.priceLabel), group: "",
        anchor: str(r.slug), featured: false, image: "", imageAlt: "",
      }))
    : arr(block.items)
        .filter((it) => it && typeof it === "object" && (str(it.title) || str(it.description)))
        .map((it) => ({
          title: str(it.title),
          description: str(it.description),
          longDescription: str(it.longDescription),
          includes: arr(it.includes).map(str).filter(Boolean),
          price: str(it.price),
          group: str(it.group),
          anchor: str(it.anchor),
          featured: it.featured === true,
          image: owned ? str(it.image) : "",
          imageAlt: str(it.imageAlt) || str(it.title),
        }));

  const seen = new Map();
  const items = raw.map((it) => {
    let a = slugifyAnchor(it.anchor || it.title) || "service";
    const n = (seen.get(a) || 0) + 1;
    seen.set(a, n);
    if (n > 1) a = `${a}-${n}`;
    return { ...it, anchor: a };
  });

  const defs = arr(block.groups)
    .filter((g) => g && typeof g === "object" && str(g.id) && str(g.heading))
    .map((g) => ({
      id: slugifyAnchor(g.id),
      heading: str(g.heading),
      intro: str(g.intro),
      image: owned ? str(g.image) : "",
      imageAlt: str(g.imageAlt) || str(g.heading),
    }));
  const groups = defs
    .map((g) => ({ ...g, items: items.filter((it) => slugifyAnchor(it.group) === g.id) }))
    .filter((g) => g.items.length > 0);
  const grouped = new Set(groups.flatMap((g) => g.items));
  const ungrouped = items.filter((it) => !grouped.has(it));

  /* A group without its own photo borrows the first photo among its items,
     so a grouped layout needs one photo per GROUP, not per service. */
  for (const g of groups) {
    if (!g.image) {
      const withImg = g.items.find((it) => it.image);
      if (withImg) { g.image = withImg.image; g.imageAlt = withImg.imageAlt; }
    }
  }

  return {
    items,
    groups,
    ungrouped,
    hasGroups: groups.length >= 2 || (groups.length === 1 && ungrouped.length > 0),
    withImages: items.filter((it) => it.image),
    eyebrow: str(page.eyebrow) || str(block.pageEyebrow),
    heading: str(page.heading) || str(block.pageHeading) || "Everything we do",
    subhead: str(page.subhead) || str(block.subhead),
    quoteHeading: str(page.quoteHeading) || "Not sure which service you need?",
    quoteBody: str(page.quoteBody) || "Tell us about the job and we'll work out the right approach with you.",
    featuredHeading: str(page.featuredHeading) || "Our most requested work",
    moreHeading: str(page.moreHeading) || "Everything else we do",
    midHeading: str(page.midHeading) || "Not sure what the job needs?",
    midBody: str(page.midBody),
  };
}

export function resolveServices(site = {}, opts = {}) {
  const block = site.services || {};
  const owned = hasOwnedPhotos(site);

  const items = arr(block.items)
    .filter((it) => it && typeof it === "object" && (str(it.title) || str(it.description)))
    .map((it) => ({
      title: str(it.title),
      description: str(it.description),
      longDescription: str(it.longDescription),
      includes: arr(it.includes).map(str).filter(Boolean),
      price: str(it.price),
      href: str(it.href),
      icon: str(it.icon),
      featured: it.featured === true,
      image: owned ? str(it.image) : "",
      imageAlt: str(it.imageAlt) || str(it.title),
    }));

  /* Apply the cap AFTER resolution so `total` is honest and the "view all"
     link knows there is more behind it. Featured items win; if the client
     flagged none, fall back to source order rather than guessing. */
  const total = items.length;
  const limit = Number.isFinite(opts.limit) && opts.limit > 0 ? opts.limit : 0;
  let shown = items;
  if (limit && total > limit) {
    const featured = items.filter((it) => it.featured);
    shown = (featured.length ? featured : items).slice(0, limit);
  }

  let leadIndex = shown.findIndex((it) => it.featured);
  if (leadIndex < 0) leadIndex = shown.length ? 0 : -1;
  const items_ = shown;

  return {
    items: items_,
    total,
    truncated: total > items_.length,
    leadIndex,
    eyebrow: str(block.eyebrow),
    heading: str(block.heading),
    subhead: str(block.subhead),
    /* Every item carries its own photo. Kept for anything that needs the
       strict answer; split-scroll no longer does. */
    everyItemHasImage: items_.length > 0 && items_.every((it) => it.image),
    /* MOST items carry a photo — the gate for split-scroll since v3.17.
       Requiring every item meant one service still waiting on a file knocked
       the whole section back to the card grid, which is a big layout change
       to hang on one missing JPG. Two thirds keeps the alternating rhythm
       reading as photography rather than as gaps, and the component draws a
       blank panel for the stragglers. */
    mostItemsHaveImage:
      items_.length > 0 &&
      items_.filter((it) => it.image).length >= Math.ceil(items_.length * (2 / 3)),
    /* Enough depth for the list-detail panel to not look hollow. */
    everyItemHasDetail:
      items_.length > 0 &&
      items_.every((it) => it.longDescription && it.includes.length >= 2),
    /* Any published rate at all — the ledger price column drops without one. */
    anyPrice: items_.some((it) => it.price),
  };
}

/**
 * Column count for the two card-grid variants.
 *
 * The CTA card is a real grid item, not a filler: it renders on every build and
 * removing it to tidy a row would cost the client a mid-page conversion point.
 * So the grid is sized for N services PLUS the CTA card, and the count that
 * matters is `total`.
 *
 * Awkward totals (5, 7) let the CTA card span two columns rather than leaving a
 * hole. A real service is never dropped to make a row even — the client sells
 * what they sell.
 *
 * @returns {{ cols: number, ctaSpan: number }}
 */
export function gridShape(serviceCount, withCta = true) {
  /* withCta=false is the OPT-OUT, not the default. The card is a mid-page
     conversion point and removing it costs the client a call; a build should
     only drop it when the client has explicitly said so, which is why the
     intake flag is services.showQuoteCard and defaults to true. */
  const total = serviceCount + (withCta ? 1 : 0);
  if (total <= 2) return { cols: 2, ctaSpan: 1 };
  if (total === 3) return { cols: 3, ctaSpan: 1 };
  if (total === 4) return { cols: 2, ctaSpan: 1 };
  if (total === 5) return { cols: 3, ctaSpan: 2 };
  if (total === 6) return { cols: 3, ctaSpan: 1 };
  if (total === 7) return { cols: 4, ctaSpan: 2 };
  if (total === 8) return { cols: 4, ctaSpan: 1 };
  return { cols: 3, ctaSpan: 1 };
}

/* ── story credentials ──────────────────────────────────────────────────── */

/**
 * The ruled credential rows behind story/credentials-panel.
 *
 * ONE implementation, shared by the engine (which gates the variant on it) and
 * by Story.astro (which renders it). Duplicating the row logic would let the
 * two disagree — the engine selecting a panel the component then renders with
 * one row, which is exactly the "documented but non-rendering" class of bug
 * check-catalogue.mjs exists to prevent.
 *
 * EVERY ROW IS SOURCED, same rule as hero/docket: a field with no value is
 * omitted, never rendered empty and never filled with "Contact us". Under two
 * resolved rows the panel drops and the copy runs full width, because a
 * one-row panel reads as a mistake.
 *
 * insurance and memberships[] are OPTIONAL additions (v3.17). A client with
 * neither still reaches two rows on licence/ABN/established alone.
 *
 * @returns {{ label: string, value: string }[]}
 */
export function resolveStoryCredentials(site = {}) {
  const b = site.business || {};
  const memberships = arr(b.memberships).map(str).filter(Boolean);
  return [
    { label: "Licence", value: str(b.licence) },
    { label: "ABN", value: str(b.abn) },
    { label: "Established", value: str(b.established) },
    { label: "Insurance", value: str(b.insurance) },
    { label: memberships.length === 1 ? "Member of" : "Memberships", value: memberships.join(" · ") },
  ].filter((row) => row.value);
}

/**
 * The hero/docket spec panel's rows. ONE implementation, shared by the engine
 * (which gates the variant on it) and by HeroDocket.astro (which renders it),
 * for the same reason as resolveStoryCredentials above.
 *
 * EVERY ROW IS SOURCED: a field with no value is omitted. The docket needs
 * DOCKET_MIN_ROWS of them (v3.34). With three or fewer the panel sits beside a
 * hero heading that is twice its height and the right column reads as empty
 * (check-layout.mjs reported it on the template's own demo at 1024px and up),
 * so the engine does not pick docket and Hero.astro falls back.
 *
 * Areas prefer the featured suburbs, then the client's own sentence; never an
 * invented radius or travel fee.
 *
 * @returns {{ label: string, value: string }[]}
 */
export const DOCKET_MIN_ROWS = 4;
export function resolveDocketRows(site = {}) {
  const b = site.business || {};
  const usage = site.usage || {};
  /* String() as HeroDocket always did: an intake may hold established or abn as a number. */
  const text = (v) => (v == null ? "" : String(v).trim());
  const services = arr(site.services?.items).map((it) => text(it?.title)).filter(Boolean);
  const featured = arr(usage.featured).map(text).filter(Boolean);
  const areas = featured.length > 0 ? featured.slice(0, 4).join(" · ") : text(usage.areasLine);
  return [
    { label: "Services", value: services.slice(0, 3).join(" · ") },
    { label: "Areas", value: areas },
    { label: "Hours", value: text(site.contact?.hours) },
    { label: b.licence ? "Licence" : "ABN", value: text(b.licence || b.abn) },
    { label: "Established", value: text(b.established) },
  ].filter((row) => row.value);
}
