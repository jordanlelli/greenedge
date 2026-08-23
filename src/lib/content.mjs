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
    items.push({
      name,
      /* suburb/location and service are optional — the caption omits whatever
         is missing rather than printing "undefined ·". */
      meta: [str(t.suburb) || str(t.location), str(t.service)].filter(Boolean).join(" · "),
      quote,
      sourceUrl,
      sourceLabel: str(t.source) || (isBlock ? str(block.source) : "") || "",
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
    });
  }

  return {
    items,
    dropped,
    heading: (isBlock && str(block.heading)) || "What clients say",
    eyebrow: (isBlock && str(block.eyebrow)) || "",
    subhead: (isBlock && str(block.subhead)) || "",
  };
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
export function resolveServices(site = {}) {
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
      featured: it.featured === true,
      image: owned ? str(it.image) : "",
      imageAlt: str(it.imageAlt) || str(it.title),
    }));

  let leadIndex = items.findIndex((it) => it.featured);
  if (leadIndex < 0) leadIndex = items.length ? 0 : -1;

  return {
    items,
    leadIndex,
    eyebrow: str(block.eyebrow),
    heading: str(block.heading),
    subhead: str(block.subhead),
    /* Every item carries its own photo — the gate for split-scroll. */
    everyItemHasImage: items.length > 0 && items.every((it) => it.image),
    /* Enough depth for the list-detail panel to not look hollow. */
    everyItemHasDetail:
      items.length > 0 &&
      items.every((it) => it.longDescription && it.includes.length >= 2),
    /* Any published rate at all — the ledger price column drops without one. */
    anyPrice: items.some((it) => it.price),
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
export function gridShape(serviceCount) {
  const total = serviceCount + 1;
  if (total <= 2) return { cols: 2, ctaSpan: 1 };
  if (total === 3) return { cols: 3, ctaSpan: 1 };
  if (total === 4) return { cols: 2, ctaSpan: 1 };
  if (total === 5) return { cols: 3, ctaSpan: 2 };
  if (total === 6) return { cols: 3, ctaSpan: 1 };
  if (total === 7) return { cols: 4, ctaSpan: 2 };
  if (total === 8) return { cols: 4, ctaSpan: 1 };
  return { cols: 3, ctaSpan: 1 };
}
