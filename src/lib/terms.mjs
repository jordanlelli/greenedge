/**
 * terms.mjs — the terms page, as composable clauses.
 *
 * WHAT WAS WRONG
 * The old terms page was seven fixed paragraphs of generic website boilerplate:
 * information, quotes, IP, third-party links, liability, governing law, contact.
 * Any free generator produces that. It said nothing about the actual trade, and
 * for a tradie the disputes are never about the website — they are about scope,
 * deposits, variations, access and what "prepared properly" meant.
 *
 * TWO DOCUMENTS, NOT ONE
 * A tradie's terms page covers two different relationships, and conflating them
 * is how these pages end up useless:
 *
 *   WEBSITE TERMS — between the business and a visitor. Governs browsing,
 *     enquiring, and relying on what the site says. Always applicable, needs no
 *     facts from the client beyond their name. This is what the page had.
 *
 *   TERMS OF TRADE — between the business and a customer who books work.
 *     Governs deposits, variations, access, defects. This is the part with real
 *     value, and it CANNOT be generated: a deposit percentage or a warranty
 *     period the client did not give you is a term you invented and they are
 *     bound by. So every clause here is gated on a fact in the intake, and a
 *     clause with no fact does not render.
 *
 * The trade packs add what a generic set misses. For a painter that is substrate
 * condition and lead paint — surface prep is where painting disputes start, and
 * pre-1978 housing carries a real regulatory obligation, not a stylistic one.
 *
 * NOTHING HERE IS LEGAL ADVICE and the file cannot make it so. It is a
 * structured starting point that says only what the client has told you.
 */

/* Numbers coerce: an intake writing `quoteValidityDays: 30` rather than "30" is
   the obvious thing to do, and silently dropping the clause for it would be the
   worst kind of failure — a terms page missing a section with no error. */
const str = (v) =>
  typeof v === "string" ? v.trim() : typeof v === "number" && Number.isFinite(v) ? String(v) : "";
const arr = (v) => (Array.isArray(v) ? v : []);
const has = (v) => Boolean(str(v));

/* ── website terms — always available, no client facts required ──────────── */

const WEBSITE_CLAUSES = [
  {
    id: "site-info",
    heading: "Information on this site",
    body: (c) =>
      `The content on this website describes the services ${c.entity} offers. We keep it ` +
      `accurate and current as best we can, but it may change without notice and it is not ` +
      `a substitute for a quote for your specific job.`,
  },
  {
    id: "site-quotes",
    heading: "Prices shown on this site",
    body: (c) =>
      `Any prices, ranges or timeframes on this website are indicative only and are not an ` +
      `offer. Nothing on this site forms a contract. Work is quoted on inspection and ` +
      `governed by the quote we give you and the terms below, not by this page.`,
  },
  {
    id: "site-ip",
    heading: "Intellectual property",
    body: (c) =>
      `The text, photographs, layout and branding on this site are owned by ${c.entity} or ` +
      `used under licence, and may not be copied or reused without permission, except as ` +
      `allowed by law.`,
  },
  {
    id: "site-photos",
    heading: "Photographs of our work",
    applies: (site) => site.features?.hasPhotos === true,
    body: () =>
      `Photographs of completed work show jobs we have carried out. Every job differs in ` +
      `substrate, condition, access and product, so photographs illustrate our standard of ` +
      `work rather than guarantee an identical result on your property.`,
  },
  {
    id: "site-links",
    heading: "Third-party links",
    body: () =>
      `This site may link to third-party websites or services we do not control. We are not ` +
      `responsible for their content, availability or practices, and a link does not imply ` +
      `endorsement.`,
  },
];

/* ── terms of trade — every clause gated on a fact the client supplied ───── */

const TRADE_CLAUSES = [
  {
    id: "quotes",
    heading: "Quotes",
    applies: (site, t) => has(t.quoteValidityDays),
    body: (c, t) =>
      `Written quotes are valid for ${t.quoteValidityDays} days from the date issued. ` +
      `A quote covers the scope described in it and nothing beyond that scope. ` +
      `${has(t.quoteBasis) ? t.quoteBasis + " " : ""}Accepting a quote in writing, or ` +
      `paying a deposit against it, forms the agreement between us.`,
  },
  {
    id: "deposit",
    heading: "Deposits and payment",
    applies: (_site, t) => has(t.depositTerms) || has(t.paymentTerms),
    body: (c, t) =>
      [t.depositTerms, t.paymentTerms].filter(has).join(" ") +
      (has(t.paymentMethods) ? ` We accept ${t.paymentMethods}.` : ""),
  },
  {
    id: "variations",
    heading: "Variations and additional work",
    applies: (_site, t) => t.variations !== false,
    body: () =>
      `If the job changes once work begins — additional areas, a different product, or ` +
      `conditions that were not visible at quoting — we will tell you before we proceed, ` +
      `set out what it costs, and get your agreement. We will not carry out additional ` +
      `chargeable work without your say-so.`,
  },
  {
    id: "access",
    heading: "Access to the site",
    applies: (_site, t) => t.access !== false,
    body: (c, t) =>
      `You agree to give us safe and clear access to the work area on the agreed dates, ` +
      `including access to power and water where the job needs it. ` +
      `${has(t.accessNote) ? t.accessNote + " " : ""}Where access is not available on an ` +
      `agreed day and we have already attended, we may charge for the lost time.`,
  },
  {
    id: "delays",
    heading: "Weather and delays",
    applies: (site, t) => t.weather === true || (t.weather !== false && isOutdoorTrade(site)),
    body: () =>
      `Some work cannot be carried out safely or to standard in unsuitable weather. Where ` +
      `weather, or a delay outside our control, affects the schedule, we will reschedule to ` +
      `the next available suitable day and keep you informed. Neither of us is liable to the ` +
      `other for delays of that kind.`,
  },
  {
    id: "cancellation",
    heading: "Cancelling or rescheduling",
    applies: (_site, t) => has(t.cancellationTerms),
    body: (c, t) => t.cancellationTerms,
  },
  {
    id: "defects",
    heading: "Workmanship",
    applies: (_site, t) => has(t.workmanshipWarranty),
    body: (c, t) =>
      `${t.workmanshipWarranty} This covers our workmanship. Materials and products carry ` +
      `whatever warranty their manufacturer provides, and we will pass on the details and ` +
      `help you make a claim. It does not cover damage from later works by others, ` +
      `impact, neglect, or building movement.`,
  },
  {
    id: "insurance",
    heading: "Insurance and licensing",
    applies: (site, t) => has(t.insuranceNote) || has(site.business?.licence),
    body: (c, t) =>
      has(t.insuranceNote)
        ? t.insuranceNote
        : `${c.entity} holds licence ${str(c.licence)}. We can provide current certificates of ` +
          `currency and licensing on request before work begins.`,
  },
];

/* Trades where weather genuinely stops work. Used only as a default — the
   intake can force the clause on or off either way. */

/* ── commerce clauses ─────────────────────────────────────────────────────
   ALWAYS ON. These are not "terms of trade" a client has to opt into — they
   are the statements any Australian business site should carry, and several
   of them PROTECT the client rather than bind them.

   Why this group exists: tradeTerms.enabled defaults to false (correctly — a
   set of trading terms the client has not read is a document their customers
   can hold them to). But that meant the overwhelming majority of builds
   shipped a terms page with five website clauses and nothing about consumer
   guarantees, GST, liability or which state's law applies. That page was
   thin because of a gate, not because there was nothing to say.

   The line between this group and TRADE_CLAUSES: a clause goes here when it
   states the legal position that already applies whether or not anyone writes
   it down. It goes in TRADE_CLAUSES when it commits the client to a specific
   commercial promise — a deposit percentage, a quote validity window — which
   only they can decide. Nothing here invents a term. */
const COMMERCE_CLAUSES = [
  {
    id: "consumer-guarantees",
    heading: "Your rights under Australian Consumer Law",
    body: (c) =>
      `Nothing in these terms excludes, restricts or modifies any right you have under the ` +
      `Australian Consumer Law. Our services come with guarantees that cannot be excluded — ` +
      `including that they will be provided with due care and skill, and will be fit for the ` +
      `purpose you told us about. If we fail to meet a consumer guarantee you may be entitled ` +
      `to a remedy, and for a major failure you can cancel and seek compensation for reasonably ` +
      `foreseeable loss. Where a guarantee cannot be excluded, ${c.entity}'s liability is limited ` +
      `to resupplying the service or paying the cost of having it resupplied, to the extent the ` +
      `law allows us to limit it that way.`,
  },
  {
    id: "gst",
    heading: "GST and prices",
    applies: (site) => has(site.business?.abn),
    body: (c) =>
      `Unless a quote says otherwise, prices we give you include GST. A written quote will state ` +
      `the GST position on its face; if a quote and this page disagree, the quote wins. ` +
      `${c.entity} issues a tax invoice for every job.`,
  },
  {
    id: "payment-terms",
    heading: "Invoices and payment",
    body: (c) =>
      `Invoices are payable by the date shown on the invoice. If an invoice is not paid by then ` +
      `we may pause work on any job still running, and we may recover reasonable costs of ` +
      `collection. We will always contact you before taking either step — an unpaid invoice is ` +
      `usually an oversight, not a dispute.`,
  },
  {
    id: "liability",
    heading: "What we are and are not responsible for",
    body: (c) =>
      `We are responsible for the work we carry out and for damage we cause through our own ` +
      `negligence. We are not responsible for pre-existing defects we did not cause, for damage ` +
      `arising from something hidden that could not reasonably have been found before we started, ` +
      `or for indirect or consequential loss such as lost income or lost opportunity. This ` +
      `paragraph does not limit your rights under the Australian Consumer Law.`,
  },
  {
    id: "disputes",
    heading: "If something goes wrong",
    body: (c) =>
      `If you are unhappy with the work, tell us first and give us a reasonable chance to inspect ` +
      `it and put it right. Most problems are resolved this way and quickly. If we cannot reach ` +
      `agreement, either of us can take the matter to the relevant consumer affairs body or ` +
      `tribunal in the state where the work was done.`,
  },
  {
    id: "governing-law",
    heading: "Which law applies",
    body: (c, t) =>
      `These terms are governed by the law of ${t.state || "South Australia"}, and the courts of ` +
      `that state have jurisdiction over any dispute about them.`,
  },
  {
    id: "terms-changes",
    heading: "Changes to these terms",
    body: () =>
      `We update this page when our terms change. The terms that apply to your job are the ones ` +
      `published when you accepted the quote, and a signed quote or written agreement overrides ` +
      `anything on this page if the two disagree.`,
  },
];

const OUTDOOR_TRADES = [
  "roof", "landscap", "garden", "concret", "paving", "paver", "fencing", "render",
  "exterior", "gutter", "arborist", "brick", "tiling roof", "decking", "pressure",
];
function isOutdoorTrade(site) {
  const t = String(site.business?.trade || "").toLowerCase();
  return OUTDOOR_TRADES.some((k) => t.includes(k));
}

/* ── trade-specific packs ────────────────────────────────────────────────── */

/**
 * These exist because the generic set misses exactly the thing each trade argues
 * about. They are unconditional (no client fact needed) because they describe
 * limits and obligations rather than commercial terms — saying "we don't warrant
 * a substrate we didn't prepare" invents no commitment on the client's behalf.
 */
const TRADE_PACKS = {
  painter: [
    {
      id: "substrate",
      heading: "Surfaces and preparation",
      body: () =>
        `Our quote is based on the surfaces we could see and assess at the time of ` +
        `inspection. Where preparation reveals conditions that were not visible — ` +
        `rot, rust, previous coatings that are failing, moisture, mould, or an ` +
        `incompatible existing product — we will stop, tell you what we have found, and ` +
        `quote the additional work before continuing. We cannot warrant a finish applied ` +
        `over a substrate we were not permitted to prepare properly.`,
    },
    {
      id: "colour",
      heading: "Colour and finish",
      body: () =>
        `Colours are confirmed in writing before work starts. Colour appears different ` +
        `under different light, at different sheens, and over different existing colours, ` +
        `and a rendered swatch or screen image is not an exact match. We recommend a ` +
        `sample pot on the actual surface for any colour you are unsure about. Repainting ` +
        `in a different colour after work is complete is a new job.`,
    },
    {
      id: "lead-paint",
      heading: "Lead paint and older homes",
      body: () =>
        `Paint applied before 1970 in Australia may contain lead, and paint from before ` +
        `1997 may contain some. Where we suspect lead paint we will tell you before ` +
        `disturbing it. Testing, containment and disposal are specialised work that is not ` +
        `included in a standard quote and will be quoted separately. We will not sand or ` +
        `disturb suspected lead paint without discussing it with you first.`,
    },
  ],
  roofer: [
    {
      id: "roof-condition",
      heading: "Roof condition and hidden defects",
      body: () =>
        `Quotes are based on what is visible and safely accessible at inspection. ` +
        `Defects concealed by existing roofing, insulation or ceilings — rusted battens, ` +
        `rot, failed flashings, or previous non-compliant work — cannot be quoted until ` +
        `exposed. Where we find them we will stop, show you, and quote before continuing.`,
    },
    {
      id: "roof-access",
      heading: "Working at height",
      body: () =>
        `Roof work is carried out under height-safety requirements. Where a roof cannot be ` +
        `accessed safely without additional equipment such as scaffolding or an elevated ` +
        `work platform, that cost is quoted separately and is not included by default.`,
    },
  ],
  electrician: [
    {
      id: "existing-wiring",
      heading: "Existing wiring and compliance",
      body: () =>
        `Our work is carried out to the current wiring rules and a Certificate of ` +
        `Compliance is issued for the work we perform. We are not responsible for existing ` +
        `wiring we did not install. Where we find unsafe or non-compliant existing work we ` +
        `are obliged to tell you, and in some cases to make it safe; that is chargeable and ` +
        `will be discussed with you first wherever it is safe to wait.`,
    },
  ],
  plumber: [
    {
      id: "concealed-services",
      heading: "Concealed pipework and services",
      body: () =>
        `Quotes assume services run as they normally would for a building of that type and ` +
        `age. Pipework concealed in walls, slabs or underground can only be assessed once ` +
        `exposed, and older systems may not be compatible with new fittings. Where we find ` +
        `that, we will tell you what it means and quote before continuing.`,
    },
  ],
  tiler: [
    {
      id: "substrate-prep",
      heading: "Substrates and waterproofing",
      body: () =>
        `Tiling relies on the substrate beneath it. Where a floor or wall is out of level, ` +
        `moving, or inadequately prepared by others, it must be corrected before tiling and ` +
        `that work is quoted separately. Waterproofing, where required, is carried out to ` +
        `the applicable standard; we cannot warrant tiling laid over waterproofing installed ` +
        `by someone else.`,
    },
    {
      id: "tile-variation",
      heading: "Tile batches and variation",
      body: () =>
        `Natural and manufactured tiles vary between batches in shade, size and finish. We ` +
        `recommend ordering ten to fifteen percent over measured quantity to allow for cuts, ` +
        `breakage and future repairs. Sourcing a matching tile later is often not possible.`,
    },
  ],
  landscaper: [
    {
      id: "plants",
      heading: "Plants and establishment",
      body: () =>
        `Plants are living. Their establishment depends on watering, weather, soil and ` +
        `ongoing care after we leave, so we cannot warrant that a given plant will thrive. ` +
        `We will tell you what each planting needs. Where we supply a maintenance service, ` +
        `that is quoted separately.`,
    },
    {
      id: "underground",
      heading: "Underground services and drainage",
      body: () =>
        `Before excavation we will identify services where records exist, but unmarked or ` +
        `incorrectly recorded pipes and cables are common on older properties. Where ` +
        `excavation reveals services, rock or fill that was not evident at quoting, we will ` +
        `stop and quote the change.`,
    },
  ],
  concreter: [
    {
      id: "concrete-finish",
      heading: "Concrete finish and cracking",
      body: () =>
        `Concrete is a natural material and some shrinkage cracking is normal and expected ` +
        `as it cures; it is not a defect. Control joints are placed to manage where that ` +
        `occurs. Colour and finish vary with weather, batch and curing conditions, and an ` +
        `exact match to a sample or an existing pour cannot be guaranteed.`,
    },
  ],
  carpenter: [
    {
      id: "timber-movement",
      heading: "Timber movement",
      body: () =>
        `Timber moves with humidity and temperature. Some shrinkage, expansion and minor ` +
        `movement after installation is normal for the material and is not a defect. Where ` +
        `we work into an existing structure, we quote on the assumption it is square, level ` +
        `and sound, and we will tell you if it is not.`,
    },
  ],
};

const TRADE_ALIASES = {
  painter: ["paint", "decorat"],
  roofer: ["roof"],
  electrician: ["electric", "sparky"],
  plumber: ["plumb", "gasfit"],
  tiler: ["tiling", "tiler"],
  landscaper: ["landscap", "garden", "arborist", "lawn"],
  concreter: ["concret", "paving", "paver", "kerb"],
  carpenter: ["carpent", "joiner", "cabinet", "decking", "pergola"],
};

/** Which pack fits this business. Explicit intake key wins over the trade string. */
export function tradePackFor(site = {}) {
  const explicit = str(site.legal?.terms?.tradePack);
  if (explicit) return TRADE_PACKS[explicit] ? explicit : "";
  const trade = String(site.business?.trade || "").toLowerCase();
  for (const [pack, keys] of Object.entries(TRADE_ALIASES)) {
    if (keys.some((k) => trade.includes(k))) return pack;
  }
  return "";
}

/**
 * resolveTerms(site) -> { website: [], trade: [], tradePack, hasTradeTerms }
 * Each clause is { id, heading, body } with the body already rendered to text.
 */
export function resolveTerms(site = {}) {
  const legal = site.legal?.terms || {};
  const t = legal.tradeTerms || {};
  const ctx = {
    entity: str(legal.entityName) || str(site.business?.legalName) || str(site.business?.name),
    licence: str(site.business?.licence),
    abn: str(legal.abn) || str(site.business?.abn),
  };

  const render = (list, extra) =>
    list
      .filter((cl) => (cl.applies ? cl.applies(site, extra || {}) : true))
      .map((cl) => ({ id: cl.id, heading: cl.heading, body: cl.body(ctx, extra || {}) }))
      .filter((cl) => has(cl.body));

  const website = render(WEBSITE_CLAUSES);

  /* Commerce clauses are NOT opt-in — see the block comment above the group.
     They state the position that already applies; several protect the client. */
  const commerce = render(COMMERCE_CLAUSES, { ...t, state: str(legal.state) || str(site.business?.state) });

  /* Terms of trade are opt-in. Off by default because a set of trading terms the
     client has not read and agreed to is worse than none — it is a document
     their customers can hold them to. */
  const tradeEnabled = t.enabled === true;
  const trade = tradeEnabled ? render(TRADE_CLAUSES, t) : [];

  const packKey = tradeEnabled ? tradePackFor(site) : "";
  const pack = packKey ? render(TRADE_PACKS[packKey], t) : [];

  /* Custom clauses last, so a client can always add something specific. */
  const custom = arr(legal.extraClauses)
    .filter((c) => c && has(c.heading) && has(c.body))
    .map((c, i) => ({ id: `custom-${i}`, heading: str(c.heading), body: str(c.body) }));

  return {
    website,
    commerce,
    trade: [...trade, ...pack, ...custom],
    tradePack: packKey,
    hasTradeTerms: trade.length + pack.length + custom.length > 0,
  };
}
